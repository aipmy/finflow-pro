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

  createMovement: async ({ itemId, type, quantity, note, actorId, createdAt }) => {
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
          actorId,
          createdAt: createdAt ? new Date(createdAt) : undefined
        }
      });

      return movement;
    });
  }
};
