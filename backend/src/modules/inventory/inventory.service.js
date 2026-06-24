import { inventoryRepository } from "./inventory.repository.js";
import { auditService } from "../audit/audit.service.js";

export const inventoryService = {
  listItems: async (filters) => {
    return inventoryRepository.listItems(filters);
  },

  createItem: async (data, user, ipAddress) => {
    if (user.role !== "admin" && user.role !== "staff" && user.role !== "finance") {
      throw { status: 403, message: "Forbidden: You do not have permission to manage inventory" };
    }

    if (!data.name || !data.sku) {
      throw { status: 400, message: "Item name and SKU are required" };
    }

    const item = await inventoryRepository.createItem(data);

    await auditService.log({
      userId: user.userId,
      module: "INVENTORY",
      action: "CREATE_ITEM",
      target: item.sku,
      ipAddress
    });

    return item;
  },

  updateItem: async (id, data, user, ipAddress) => {
    if (user.role !== "admin" && user.role !== "staff" && user.role !== "finance") {
      throw { status: 403, message: "Forbidden: You do not have permission to manage inventory" };
    }

    const existing = await inventoryRepository.getItemById(id);
    if (!existing) {
      throw { status: 404, message: "Item not found" };
    }

    const item = await inventoryRepository.updateItem(id, {
      ...existing,
      ...data
    });

    await auditService.log({
      userId: user.userId,
      module: "INVENTORY",
      action: "UPDATE_ITEM",
      target: item.sku,
      ipAddress
    });

    return item;
  },

  deleteItem: async (id, user, ipAddress) => {
    if (user.role !== "admin" && user.role !== "finance") {
      throw { status: 403, message: "Forbidden: Only Admin or Finance can delete items" };
    }

    const existing = await inventoryRepository.getItemById(id);
    if (!existing) {
      throw { status: 404, message: "Item not found" };
    }

    await inventoryRepository.deleteItem(id);

    await auditService.log({
      userId: user.userId,
      module: "INVENTORY",
      action: "DELETE_ITEM",
      target: existing.sku,
      ipAddress
    });

    return { success: true };
  },

  listMovements: async (filters, user) => {
    return inventoryRepository.listMovements(filters);
  },

  createMovement: async ({ itemId, type, quantity, note, proofUrl, createdAt }, user, ipAddress) => {
    if (user.role !== "admin" && user.role !== "staff" && user.role !== "finance") {
      throw { status: 403, message: "Forbidden: You do not have permission to log stock movements" };
    }

    if (!itemId || !type || !quantity || quantity <= 0) {
      throw { status: 400, message: "Invalid parameters (itemId, type, quantity)" };
    }

    const movement = await inventoryRepository.createMovement({
      itemId,
      type,
      quantity,
      note,
      proofUrl,
      actorId: user.userId,
      createdAt
    });

    const item = await inventoryRepository.getItemById(itemId);

    await auditService.log({
      userId: user.userId,
      module: "INVENTORY",
      action: `STOCK_${type}`,
      target: item ? item.sku : itemId,
      ipAddress
    });

    return movement;
  },

  updateMovement: async (id, data, user, ipAddress) => {
    if (user.role !== "admin" && user.role !== "staff" && user.role !== "finance") {
      throw { status: 403, message: "Forbidden: You do not have permission to log stock movements" };
    }

    const existing = await inventoryRepository.listMovements(); // This is just for simple validation, better to rely on repo's error
    const movement = await inventoryRepository.updateMovement(id, data);

    await auditService.log({
      userId: user.userId,
      module: "INVENTORY",
      action: `UPDATE_STOCK_MOVEMENT`,
      target: id,
      ipAddress
    });

    return movement;
  },

  deleteMovement: async (id, user, ipAddress) => {
    if (user.role !== "admin" && user.role !== "finance") {
      throw { status: 403, message: "Forbidden: Only Admin or Finance can delete stock movements" };
    }

    const existing = await inventoryRepository.deleteMovement(id);

    await auditService.log({
      userId: user.userId,
      module: "INVENTORY",
      action: "DELETE_STOCK_MOVEMENT",
      target: id,
      ipAddress
    });

    return { success: true };
  }
};
