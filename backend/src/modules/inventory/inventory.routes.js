import { Router } from "express";
import { inventoryController } from "./inventory.controller.js";
import { requireAuth } from "../../middlewares/authMiddleware.js";
import { requirePermission } from "../../middlewares/permissionMiddleware.js";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission("inventory:read"), inventoryController.listItems);
router.post("/", requirePermission("inventory:write"), inventoryController.createItem);
router.put("/:id", requirePermission("inventory:write"), inventoryController.updateItem);
router.delete("/:id", requirePermission("inventory:write"), inventoryController.deleteItem);

router.get("/movements", requirePermission("inventory:read"), inventoryController.listMovements);
router.post("/movements", requirePermission("inventory:write"), inventoryController.createMovement);
router.put("/movements/:id", requirePermission("inventory:write"), inventoryController.updateMovement);
router.delete("/movements/:id", requirePermission("inventory:write"), inventoryController.deleteMovement);

export default router;
