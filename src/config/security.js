import { ConfigSchema } from "../validation/config-schema.js";
export function readSecurityConfig(env = process.env) {
  const result = ConfigSchema.safeParse(env);
  if (!result.success)
    throw new Error(
      `Invalid security configuration: ${[...new Set(result.error.issues.map((issue) => issue.path.join(".")))].join(", ")}.`,
    );
  const e = result.data;
  return {
    production: e.NODE_ENV === "production",
    csrfSecret: e.CSRF_SECRET,
    origins: e.CORS_ORIGINS,
    trustedProxies: e.TRUSTED_PROXIES,
    port: e.PORT,
    host: e.HOST,
    rateLimitWindowMs: e.RATE_LIMIT_WINDOW_MS,
    apiRateLimit: e.API_RATE_LIMIT,
    writeRateLimit: e.WRITE_RATE_LIMIT,
    authRateLimit: e.AUTH_RATE_LIMIT,
  };
}
