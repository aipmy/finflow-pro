import { Router } from "express";
import { recurringController } from "./recurring.controller.js";
import { requireAuth } from "../../middlewares/authMiddleware.js";
import { requirePermission } from "../../middlewares/permissionMiddleware.js";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission("request:create"), recurringController.list);
router.get("/:id", requirePermission("request:create"), recurringController.get);
router.post("/trigger", requirePermission("request:create"), recurringController.trigger);
router.post("/", requirePermission("request:create"), recurringController.create);
router.put("/:id", requirePermission("request:create"), recurringController.update);
router.delete("/:id", requirePermission("request:create"), recurringController.delete);

export default router;
