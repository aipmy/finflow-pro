import { Router } from "express";
import { authController } from "./auth.controller.js";
import { requireAuth } from "../../middlewares/authMiddleware.js";

const router = Router();

router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.get("/setup-status", authController.getSetupStatus);
router.post("/setup", authController.setup);
router.post("/change-password", requireAuth, authController.changePassword);

export default router;
