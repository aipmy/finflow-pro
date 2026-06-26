import { Router } from "express";
import { getSimcardUsage, triggerManualSync } from "./simcard.controller.js";
import { requireAuth } from "../../middlewares/authMiddleware.js";

const router = Router();

// Apply requireAuth to all simcard routes
router.use(requireAuth);

router.get("/usage", getSimcardUsage);
router.post("/sync", triggerManualSync);

export default router;
