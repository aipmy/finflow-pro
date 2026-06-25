import { prisma } from "../../core/database.js";

export const notificationsService = {
  list: async (userId) => {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20
    });
  },

  markRead: async (id, userId) => {
    // Ensure we only mark the notification if it belongs to the logged-in user
    const notification = await prisma.notification.findFirst({
      where: { id, userId }
    });

    if (!notification) {
      throw { status: 404, message: "Notifikasi tidak ditemukan atau akses ditolak" };
    }

    return prisma.notification.update({
      where: { id },
      data: { read: true }
    });
  },

  markAllRead: async (userId) => {
    return prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true }
    });
  },

  create: async ({ userId, title, message }) => {
    return prisma.notification.create({
      data: {
        userId,
        title,
        message,
        read: false
      }
    });
  }
};
