import { Router, json } from "express";
import { getCsrf, register, login, logout, me } from "../controllers/auth.js";
import { requireUser } from "../middleware/authenticate.js";
import { requireCsrf } from "../auth/csrf.js";
export function authRouter(authLimiter) {
  const router = Router();
  router.get("/csrf", getCsrf);
  router.post(
    "/register",
    authLimiter,
    requireCsrf,
    json({ limit: "10kb" }),
    register,
  );
  router.post(
    "/login",
    authLimiter,
    requireCsrf,
    json({ limit: "10kb" }),
    login,
  );
  router.get("/me", requireUser, me);
  router.post("/logout", requireUser, requireCsrf, logout);
  return router;
}
