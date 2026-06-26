import { Router } from "express";
import { getSimcardUsage } from "./simcard.controller.js";
import { requireAuth } from "../../middlewares/authMiddleware.js";

const router = Router();

// Apply requireAuth to all simcard routes
router.use(requireAuth);

router.get("/usage", getSimcardUsage);

export default router;
