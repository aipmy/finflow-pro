import { Router } from "express";
import { requireAuth } from "../../middlewares/authMiddleware.js";
import { requirePermission } from "../../middlewares/permissionMiddleware.js";
import { usersController } from "./users.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission("users:read"), usersController.list);
router.post("/", requirePermission("users:manage"), usersController.create);
router.put("/:id", requirePermission("users:manage"), usersController.update);
router.delete("/:id", requirePermission("users:manage"), usersController.delete);

export default router;
