import { Router } from "express";
import { requireAuth } from "../../middlewares/authMiddleware.js";
import { requirePermission } from "../../middlewares/permissionMiddleware.js";
import * as reportsController from "./reports.controller.js";

const router = Router();

router.use(requireAuth);
router.use(requirePermission("reports:read"));

router.get("/aggregates", reportsController.getAggregates);
router.get("/user-detail/:userId", reportsController.getUserDetail);
router.get("/export/excel", reportsController.exportExcel);
router.get("/export/pdf", reportsController.exportPdf);
router.get("/export/docx", reportsController.exportDocx);

export default router;
