import { Router } from "express";
import {
  getSimcardUsage,
  triggerManualSync,
  getSimcardHistory,
  getScraperStatus,
  updateScraperConfig,
  getSimcardOverview
} from "./simcard.controller.js";
import { requireAuth } from "../../middlewares/authMiddleware.js";

const router = Router();

// Apply requireAuth to all simcard routes
router.use(requireAuth);

router.get("/usage", getSimcardUsage);
router.get("/usage/:msisdn/history", getSimcardHistory);
router.get("/overview", getSimcardOverview);
router.get("/scraper-status", getScraperStatus);
router.post("/scraper-config", updateScraperConfig);
router.post("/sync", triggerManualSync);

export default router;
