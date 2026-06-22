import { recurringRepository } from "./recurring.repository.js";

export const recurringService = {
  list: async (user) => {
    return recurringRepository.list(user.userId);
  },

  get: async (id, user) => {
    const template = await recurringRepository.get(id);
    if (!template) {
      throw { status: 404, message: "Template not found" };
    }
    if (template.creatorId !== user.userId && user.role !== "admin") {
      throw { status: 403, message: "Forbidden" };
    }
    return template;
  },

  create: async (payload, user) => {
    const { title, description, type, amount, frequency, dayOfMonth, dayOfWeek, autoSubmit, items, active, departmentId, siteId } = payload;
    if (!title || !items || items.length === 0) {
      throw { status: 400, message: "Missing required fields (title, items)" };
    }
    const freq = frequency || "MONTHLY";
    if (freq === "MONTHLY" && !dayOfMonth) {
      throw { status: 400, message: "Missing dayOfMonth for monthly scheduling" };
    }
    if (freq === "WEEKLY" && !dayOfWeek) {
      throw { status: 400, message: "Missing dayOfWeek for weekly scheduling" };
    }

    const data = {
      title,
      description,
      type: type || "OPERASIONAL",
      amount: amount || 0,
      frequency: freq,
      dayOfMonth: dayOfMonth ? parseInt(dayOfMonth) : null,
      dayOfWeek: dayOfWeek ? parseInt(dayOfWeek) : null,
      autoSubmit: autoSubmit !== undefined ? autoSubmit : false,
      active: active !== undefined ? active : true,
      creatorId: user.userId,
      departmentId: departmentId || user.departmentId || null,
      siteId: siteId || user.siteId || null,
    };

    return recurringRepository.create(data, items);
  },

  update: async (id, payload, user) => {
    const existing = await recurringRepository.get(id);
    if (!existing) {
      throw { status: 404, message: "Template not found" };
    }
    if (existing.creatorId !== user.userId && user.role !== "admin") {
      throw { status: 403, message: "Forbidden" };
    }

    const { title, description, type, amount, frequency, dayOfMonth, dayOfWeek, autoSubmit, items, active, departmentId, siteId } = payload;

    const freq = frequency || existing.frequency;
    const data = {
      title: title || existing.title,
      description: description !== undefined ? description : existing.description,
      type: type || existing.type,
      amount: amount !== undefined ? amount : existing.amount,
      frequency: freq,
      dayOfMonth: dayOfMonth !== undefined ? (dayOfMonth ? parseInt(dayOfMonth) : null) : existing.dayOfMonth,
      dayOfWeek: dayOfWeek !== undefined ? (dayOfWeek ? parseInt(dayOfWeek) : null) : existing.dayOfWeek,
      autoSubmit: autoSubmit !== undefined ? autoSubmit : existing.autoSubmit,
      active: active !== undefined ? active : existing.active,
      departmentId: departmentId !== undefined ? departmentId : existing.departmentId,
      siteId: siteId !== undefined ? siteId : existing.siteId,
    };

    return recurringRepository.update(id, data, items);
  },

  delete: async (id, user) => {
    const existing = await recurringRepository.get(id);
    if (!existing) {
      throw { status: 404, message: "Template not found" };
    }
    if (existing.creatorId !== user.userId && user.role !== "admin") {
      throw { status: 403, message: "Forbidden" };
    }
    return recurringRepository.delete(id);
  },
};
