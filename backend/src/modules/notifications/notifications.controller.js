import { notificationsService } from "./notifications.service.js";

export const notificationsController = {
  list: async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const notifications = await notificationsService.list(userId);
      return res.json(notifications);
    } catch (error) {
      next(error);
    }
  },

  markRead: async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const id = req.params.id;
      const notification = await notificationsService.markRead(id, userId);
      return res.json(notification);
    } catch (error) {
      next(error);
    }
  },

  markAllRead: async (req, res, next) => {
    try {
      const userId = req.user.userId;
      await notificationsService.markAllRead(userId);
      return res.json({ success: true, message: "Semua notifikasi ditandai telah dibaca" });
    } catch (error) {
      next(error);
    }
  }
};
