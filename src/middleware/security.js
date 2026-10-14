import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";

export function installSecurity(app, config) {
  app.disable("x-powered-by");
  // Trust only the actual proxy peers, never arbitrary forwarded client headers.
  app.set(
    "trust proxy",
    config.trustedProxies.length ? config.trustedProxies : false,
  );
  app.use(
    helmet({
      strictTransportSecurity: config.production ? { maxAge: 31536000 } : false,
    }),
  );
  app.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (config.production && !req.secure) {
      return res.status(403).json({ error: "HTTPS is required." });
    }
    next();
  });

  const limiter = (limit) =>
    rateLimit({
      windowMs: config.rateLimitWindowMs,
      limit,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "Too many requests. Try again later." },
    });
  const allowedOrigins = new Set(config.origins);
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) return callback(null, true);
        callback(
          Object.assign(new Error("Origin is not allowed."), {
            status: 403,
            expose: true,
          }),
        );
      },
      methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "X-CSRF-Token"],
      exposedHeaders: [
        "Location",
        "RateLimit",
        "RateLimit-Policy",
        "Retry-After",
      ],
      credentials: true,
      maxAge: 600,
      preflightContinue: true,
    }),
  );

  // Attach CORS headers before rate-limit responses, and count preflights too.
  app.use(limiter(config.apiRateLimit));
  app.use((req, res, next) => {
    if (req.method === "OPTIONS") return res.status(204).end();
    next();
  });

  const writes = limiter(config.writeRateLimit);
  return {
    authLimiter: limiter(config.authRateLimit),
    limitWrites(req, res, next) {
      if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
      return writes(req, res, next);
    },
  };
}
