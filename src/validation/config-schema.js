import { z } from "zod";
import { isIP } from "node:net";
const list = z
  .string()
  .transform((value) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  )
  .prefault("");
const positive = (fallback, max) =>
  z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(max))
    .prefault(String(fallback));
const origin = z.string().refine((value) => {
  try {
    const u = new URL(value);
    return u.origin === value && ["http:", "https:"].includes(u.protocol);
  } catch {
    return false;
  }
});
const proxy = z.string().refine((value) => {
  const [address, prefix, extra] = value.split("/");
  const version = isIP(address);
  return (
    Boolean(version) &&
    extra === undefined &&
    (prefix === undefined ||
      (/^\d+$/.test(prefix) &&
        Number(prefix) >= 1 &&
        Number(prefix) <= (version === 4 ? 32 : 128)))
  );
});
export const ConfigSchema = z
  .looseObject({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    CSRF_SECRET: z.string().regex(/^[A-Za-z0-9_-]{32,256}$/),
    CORS_ORIGINS: list.pipe(z.array(origin)),
    TRUSTED_PROXIES: list.pipe(z.array(proxy)),
    PORT: positive(3000, 65535),
    HOST: z.string().min(1).default("127.0.0.1"),
    RATE_LIMIT_WINDOW_MS: positive(900000, 86400000),
    API_RATE_LIMIT: positive(300, 1000000),
    WRITE_RATE_LIMIT: positive(60, 1000000),
    AUTH_RATE_LIMIT: positive(10, 1000000),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") return;
    if (!env.TRUSTED_PROXIES.length)
      ctx.addIssue({
        code: "custom",
        path: ["TRUSTED_PROXIES"],
        message: "Production needs an HTTPS proxy.",
      });
    if (env.CORS_ORIGINS.some((value) => !value.startsWith("https://")))
      ctx.addIssue({
        code: "custom",
        path: ["CORS_ORIGINS"],
        message: "Production origins must use HTTPS.",
      });
  });
