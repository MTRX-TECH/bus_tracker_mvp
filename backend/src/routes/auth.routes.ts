import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth";
import { validateRequest } from "../middleware/validate";
import { authRateLimiter } from "../middleware/rateLimiter";
import { z } from "zod";

const router = Router();

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/login", authRateLimiter, validateRequest(LoginSchema), AuthController.login);
router.post("/refresh", AuthController.refreshToken);
router.post("/logout", authenticate, AuthController.logout);
router.get("/profile", authenticate, AuthController.getProfile);
router.post("/consent", authenticate, AuthController.submitConsent);
router.post("/change-password", authenticate, AuthController.changePassword);
router.post("/reset-password", authRateLimiter, AuthController.resetPassword);

export default router;
