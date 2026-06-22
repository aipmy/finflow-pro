import { Router } from "express";
import { approvalController } from "./approval.controller.js";
import { requireAuth } from "../../middlewares/authMiddleware.js";
import { requirePermission } from "../../middlewares/permissionMiddleware.js";

const router = Router();

// Apply requireAuth and requirePermission("request:approve") to all approvals routes
router.use(requireAuth);
router.use(requirePermission("request:approve"));

router.post("/:requestId/approve", approvalController.approve);
router.post("/:requestId/reject", approvalController.reject);
router.post("/:requestId/revise", approvalController.revise);

export default router;
