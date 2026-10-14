import "dotenv/config";
import { bootstrapAdmin } from "../src/auth/bootstrap-admin.js";
import { RegisterSchema } from "../src/validation/school-schema.js";
let prisma;
try {
  const input = RegisterSchema.parse({
    email: process.env.BOOTSTRAP_ADMIN_EMAIL,
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
    fullName: process.env.BOOTSTRAP_ADMIN_NAME,
  });
  ({ prisma } = await import("../src/prisma.js"));
  await bootstrapAdmin(prisma, input);
  console.log("Initial administrator created. Sign in through /auth/login.");
} catch {
  console.error(
    "Administrator bootstrap failed. Check input, migrations, database access, and whether an administrator already exists.",
  );
  process.exitCode = 1;
} finally {
  if (prisma) await prisma.$disconnect();
}
