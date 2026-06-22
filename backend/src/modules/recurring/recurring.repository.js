import { prisma } from "../../core/database.js";

export const recurringRepository = {
  list: async (creatorId) => {
    return prisma.recurringRequest.findMany({
      where: { creatorId },
      include: {
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  get: async (id) => {
    return prisma.recurringRequest.findUnique({
      where: { id },
      include: {
        items: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            departmentId: true,
            siteId: true,
          }
        }
      },
    });
  },

  create: async (data, items) => {
    return prisma.recurringRequest.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        amount: data.amount,
        frequency: data.frequency ?? "MONTHLY",
        dayOfMonth: data.dayOfMonth,
        dayOfWeek: data.dayOfWeek,
        autoSubmit: data.autoSubmit ?? false,
        active: data.active ?? true,
        creatorId: data.creatorId,
        departmentId: data.departmentId,
        siteId: data.siteId,
        items: {
          create: items.map(item => ({
            name: item.name,
            qty: item.qty,
            unit: item.unit,
            price: item.price,
          })),
        },
      },
      include: {
        items: true,
      },
    });
  },

  update: async (id, data, items) => {
    return prisma.$transaction(async (tx) => {
      if (items) {
        await tx.recurringRequestItem.deleteMany({
          where: { recurringRequestId: id },
        });
      }

      return tx.recurringRequest.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description,
          type: data.type,
          amount: data.amount,
          frequency: data.frequency,
          dayOfMonth: data.dayOfMonth,
          dayOfWeek: data.dayOfWeek,
          autoSubmit: data.autoSubmit,
          active: data.active,
          departmentId: data.departmentId,
          siteId: data.siteId,
          items: items ? {
            create: items.map(item => ({
              name: item.name,
              qty: item.qty,
              unit: item.unit,
              price: item.price,
            })),
          } : undefined,
        },
        include: {
          items: true,
        },
      });
    });
  },

  delete: async (id) => {
    return prisma.recurringRequest.delete({
      where: { id },
    });
  },

  listAllActiveForSchedule: async (dayOfMonth, dayOfWeek) => {
    return prisma.recurringRequest.findMany({
      where: {
        active: true,
        OR: [
          {
            frequency: "MONTHLY",
            dayOfMonth: dayOfMonth,
          },
          {
            frequency: "WEEKLY",
            dayOfWeek: dayOfWeek,
          }
        ]
      },
      include: {
        items: true,
        creator: true,
      },
    });
  },
};
