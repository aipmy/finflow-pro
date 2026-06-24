import { prisma } from "../../core/database.js";

export const inventoryRepository = {
  listItems: async ({ search, lowStock, categoryId, locationId }) => {
    const where = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } }
      ];
    }
    
    if (categoryId) where.categoryId = categoryId;
    if (locationId) where.locationId = locationId;

    if (lowStock === "true" || lowStock === true) {
      // In Prisma we can check if stock is less than minStock using raw filters or logic.
      // Since MySQL supports direct column comparisons:
      where.AND = [
        { stock: { lte: prisma.item.minStock } } // Note: prisma doesn't support comparing two columns directly in standard queries easily without raw SQL, or we can fetch and filter.
      ];
    }

    const items = await prisma.item.findMany({
      where: (lowStock === "true" || lowStock === true) ? {
        categoryId,
        locationId,
        OR: search ? [
          { name: { contains: search } },
          { sku: { contains: search } }
        ] : undefined
      } : where,
      include: {
        category: true,
        unit: true,
        location: true
      },
      orderBy: { name: "asc" }
    });

    if (lowStock === "true" || lowStock === true) {
      return items.filter(item => item.stock < item.minStock);
    }

    return items;
  },

  getItemById: async (id) => {
    return prisma.item.findUnique({
      where: { id },
      include: { category: true, unit: true, location: true }
    });
  },

  createItem: async (data) => {
    return prisma.item.create({
      data: {
        name: data.name,
        sku: data.sku,
        categoryId: data.categoryId || null,
        unitId: data.unitId || null,
        locationId: data.locationId || null,
        stock: data.stock || 0,
        minStock: data.minStock || 0
      }
    });
  },

  updateItem: async (id, data) => {
    return prisma.item.update({
      where: { id },
      data: {
        name: data.name,
        sku: data.sku,
        categoryId: data.categoryId || null,
        unitId: data.unitId || null,
        locationId: data.locationId || null,
        stock: data.stock,
        minStock: data.minStock
      }
    });
  },

  deleteItem: async (id) => {
    return prisma.item.delete({
      where: { id }
    });
  },

  listMovements: async (filters = {}) => {
    const where = {};
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(`${filters.startDate}T00:00:00.000Z`);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(`${filters.endDate}T23:59:59.999Z`);
      }
    }
    return prisma.inventoryMovement.findMany({
      where,
      include: {
        item: { include: { unit: true } },
        actor: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });
  },

  createMovement: async ({ itemId, type, quantity, note, proofUrl, actorId, createdAt }) => {
    return prisma.$transaction(async (tx) => {
      // 1. Get the current item to adjust stock
      const item = await tx.item.findUnique({ where: { id: itemId } });
      if (!item) throw new Error("Item not found");

      let nextStock = item.stock;
      if (type === "IN") nextStock += quantity;
      else if (type === "OUT") {
        if (item.stock < quantity) {
          throw new Error(`Insufficient stock. Available: ${item.stock}`);
        }
        nextStock -= quantity;
      } else {
        throw new Error("Invalid movement type");
      }

      // 2. Update stock on Item
      await tx.item.update({
        where: { id: itemId },
        data: { stock: nextStock }
      });

      // 3. Create movement log
      const movement = await tx.inventoryMovement.create({
        data: {
          itemId,
          type,
          quantity,
          note,
          proofUrl,
          actorId,
          createdAt: createdAt ? new Date(createdAt) : undefined
        }
      });

      return movement;
    });
  },

  updateMovement: async (id, data) => {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryMovement.findUnique({ where: { id } });
      if (!existing) throw new Error("Movement not found");

      // Validasi: saat ini kita hanya support update jika itemId tidak berubah untuk mempermudah.
      // Jika memang itemId berubah, logikanya akan butuh update 2 item berbeda.
      // Demi simplisitas, kita asumsikan itemId tetap, hanya qty/type/note/date/proofUrl yang berubah.
      if (data.itemId && data.itemId !== existing.itemId) {
        throw new Error("Cannot change the Item of an existing movement. Delete and create a new one instead.");
      }

      const item = await tx.item.findUnique({ where: { id: existing.itemId } });
      if (!item) throw new Error("Item not found");

      let currentStock = item.stock;

      // 1. Revert existing movement
      if (existing.type === "IN") {
        currentStock -= existing.quantity;
      } else if (existing.type === "OUT") {
        currentStock += existing.quantity;
      }

      // 2. Apply new movement
      const newType = data.type || existing.type;
      const newQty = data.quantity !== undefined ? data.quantity : existing.quantity;

      if (newType === "IN") {
        currentStock += newQty;
      } else if (newType === "OUT") {
        currentStock -= newQty;
      }

      if (currentStock < 0) {
        throw new Error(`Insufficient stock after update. Resulting stock would be negative.`);
      }

      // 3. Update stock on Item
      await tx.item.update({
        where: { id: existing.itemId },
        data: { stock: currentStock }
      });

      // 4. Update movement log
      const movement = await tx.inventoryMovement.update({
        where: { id },
        data: {
          type: data.type,
          quantity: data.quantity,
          note: data.note,
          proofUrl: data.proofUrl,
          createdAt: data.createdAt ? new Date(data.createdAt) : undefined
        }
      });

      return movement;
    });
  },

  deleteMovement: async (id) => {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryMovement.findUnique({ where: { id } });
      if (!existing) throw new Error("Movement not found");

      const item = await tx.item.findUnique({ where: { id: existing.itemId } });
      if (!item) throw new Error("Item not found");

      let nextStock = item.stock;

      // Revert the movement
      if (existing.type === "IN") {
        nextStock -= existing.quantity;
      } else if (existing.type === "OUT") {
        nextStock += existing.quantity;
      }

      if (nextStock < 0) {
        throw new Error(`Cannot delete this IN movement because it would result in negative stock.`);
      }

      // Update item stock
      await tx.item.update({
        where: { id: existing.itemId },
        data: { stock: nextStock }
      });

      // Delete movement
      await tx.inventoryMovement.delete({
        where: { id }
      });

      return existing;
    });
  }
};
