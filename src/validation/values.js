import { z } from "zod";

const controls = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
export const Text = z
  .string()
  .max(4000)
  .refine(
    (value) => !controls.test(value),
    "Control characters are not allowed.",
  )
  .transform((value) => value.trim());
export const RequiredText = Text.refine(
  (value) => value.length > 0,
  "Must not be blank.",
);
export const Email = z
  .string()
  .max(254)
  .refine((value) => !controls.test(value))
  .transform((value) => value.trim().toLowerCase())
  .pipe(z.email());
export const Password = z
  .string()
  .min(12)
  .max(128)
  .refine((value) => /\S/.test(value), "Password must not be blank.");
export const IdSchema = z.uuid();
export const Integer = z.number().int().min(0).max(2147483647);
export const Timestamp = z.iso
  .datetime({ offset: true })
  .refine((value) =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ),
  )
  .transform((value) => new Date(value));
export const HttpUrl = Text.pipe(z.url()).refine((value) => {
  const url = new URL(value);
  return (
    ["http:", "https:"].includes(url.protocol) && !url.username && !url.password
  );
}, "Expected an HTTP(S) URL without credentials.");

// Count digits without rounding through Number: PostgreSQL DECIMAL(65,30).
function fitsMoney(value) {
  if (
    value.length > 100 ||
    !/^\+?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value)
  )
    return false;
  const [mantissa, exp = "0"] = value
    .replace(/^\+/, "")
    .toLowerCase()
    .split("e");
  const shift = Number(exp);
  if (!Number.isSafeInteger(shift)) return false;
  const digits = mantissa.replace(".", "");
  if (!/[1-9]/.test(digits)) return true;
  const position =
    (mantissa.includes(".") ? mantissa.indexOf(".") : mantissa.length) + shift;
  return (
    Math.max(0, position - /^0*/.exec(digits)[0].length) <= 35 &&
    Math.max(0, digits.length - /0*$/.exec(digits)[0].length - position) <= 30
  );
}
export const Decimal = z
  .union([z.string(), z.number().finite()])
  .transform(String)
  .refine(fitsMoney, "Amount must fit nonnegative DECIMAL(65,30).");
