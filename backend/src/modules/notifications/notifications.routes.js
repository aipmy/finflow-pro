import { Router } from "express";
import { requireAuth } from "../../middlewares/authMiddleware.js";
import { notificationsController } from "./notifications.controller.js";

const router = Router();

// Require auth for all notification endpoints
router.use(requireAuth);

router.get("/", notificationsController.list);
router.patch("/:id/read", notificationsController.markRead);
router.post("/read-all", notificationsController.markAllRead);

export default router;
