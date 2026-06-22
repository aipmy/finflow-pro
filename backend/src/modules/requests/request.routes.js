import { Router } from "express";
import { requestController } from "./request.controller.js";
import { requireAuth } from "../../middlewares/authMiddleware.js";
import { requirePermission } from "../../middlewares/permissionMiddleware.js";

const router = Router();

// Apply requireAuth to all requests routes
router.use(requireAuth);

router.get("/", requirePermission("request:read"), requestController.list);
router.get("/:id/export/pdf", requirePermission("request:read"), requestController.exportPdf);
router.get("/:id/export/excel", requirePermission("request:read"), requestController.exportExcel);
router.get("/:id", requirePermission("request:read"), requestController.get);
router.post("/", requirePermission("request:create"), requestController.create);
router.put("/:id", requirePermission("request:create"), requestController.update);
router.delete("/:id", requirePermission("request:create"), requestController.delete);

export default router;
