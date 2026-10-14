import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma CLI uses this URL for migrations and Studio.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js",
  },
  datasource: { url: env("DATABASE_URL") },
});
