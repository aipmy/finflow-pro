import { Router } from "express";
import { requireAuth } from "../../middlewares/authMiddleware.js";
import { requirePermission } from "../../middlewares/permissionMiddleware.js";
import { auditController } from "./audit.controller.js";

const router = Router();

router.use(requireAuth);
router.use(requirePermission("audit:read"));

router.get("/", auditController.list);

export default router;
