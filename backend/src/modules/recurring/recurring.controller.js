import { recurringService } from "./recurring.service.js";
import { generateRecurringRequests } from "../../core/scheduler.js";

export const recurringController = {
  list: async (req, res, next) => {
    try {
      const result = await recurringService.list(req.user);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  get: async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await recurringService.get(id, req.user);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  create: async (req, res, next) => {
    try {
      const result = await recurringService.create(req.body, req.user);
      return res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await recurringService.update(id, req.body, req.user);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  delete: async (req, res, next) => {
    try {
      const { id } = req.params;
      await recurringService.delete(id, req.user);
      return res.json({ success: true, message: "Template deleted successfully" });
    } catch (err) {
      next(err);
    }
  },

  trigger: async (req, res, next) => {
    try {
      const { day } = req.body;
      const targetDay = day !== undefined ? parseInt(day) : new Date().getDate();
      await generateRecurringRequests(targetDay);
      return res.json({ success: true, message: `Recurring requests generated for day ${targetDay}` });
    } catch (err) {
      next(err);
    }
  },
};
