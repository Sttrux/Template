import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { authRateLimiter } from "../middlewares/rate-limit.middleware.js";
import { authenticateJWT, authenticateSession } from "../middlewares/auth.middleware.js";
import { requireCsrfToken } from "../middlewares/csrf.middleware.js";
import { validateRequest } from "../middlewares/validation.middleware.js";
import { loginValidators, registerValidators } from "../validators/auth.validators.js";

const router = Router();

router.post(
  "/register",
  authRateLimiter,
  registerValidators,
  validateRequest,
  authController.register,
);
router.get("/session/csrf", authController.sessionCsrf);
router.post(
  "/session/login",
  authRateLimiter,
  loginValidators,
  validateRequest,
  requireCsrfToken,
  authController.authenticateLocal,
  authController.sessionLogin,
);
router.post(
  "/session/logout",
  authenticateSession,
  requireCsrfToken,
  authController.sessionLogout,
);
router.get("/session/me", authenticateSession, authController.sessionMe);

router.post("/token", authRateLimiter, loginValidators, validateRequest, authController.createToken);
router.get("/token/me", authenticateJWT, authController.tokenMe);

export default router;
