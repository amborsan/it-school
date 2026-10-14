// Test credentials are isolated from .env and never used by the running API.
process.env.CSRF_SECRET = "test-only-csrf-secret-0123456789abcdef";
process.env.CORS_ORIGINS = "http://localhost:5173";
process.env.NODE_ENV = "test";
delete process.env.TRUSTED_PROXIES;
process.env.PORT = "3000";
process.env.HOST = "127.0.0.1";
process.env.API_RATE_LIMIT = "300";
process.env.WRITE_RATE_LIMIT = "60";
process.env.AUTH_RATE_LIMIT = "10";
process.env.RATE_LIMIT_WINDOW_MS = "900000";
