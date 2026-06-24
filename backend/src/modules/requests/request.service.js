import { requestRepository } from "./request.repository.js";

export const requestService = {
  list: async (filters, user) => {
    return requestRepository.list(filters, user);
  },

  get: async (id, user) => {
    const request = await requestRepository.get(id);
    if (!request) {
      throw { status: 404, message: "Request not found" };
    }

    // Role-based visibility check
    // Only staff is restricted to viewing their own requests
    if (user.role === "staff" && request.requesterId !== user.userId) {
      throw { status: 403, message: "Access denied to view this request" };
    }

    return request;
  },

  create: async (payload, user, ipAddress) => {
    const { type, title, description, departmentId, siteId, categoryId, vendorId, amount, items, attachments, status } = payload;
    
    if (!type || !title || !departmentId || !siteId || !amount) {
      throw { status: 400, message: "Missing required fields (type, title, departmentId, siteId, amount)" };
    }

    const requestData = {
      type,
      title,
      description,
      departmentId,
      siteId,
      categoryId: categoryId || null,
      vendorId,
      amount,
      status: status || "DRAFT"
    };

    return requestRepository.create(requestData, items, attachments, user.userId, ipAddress);
  },

  update: async (id, payload, user, ipAddress) => {
    const existing = await requestRepository.get(id);
    if (!existing) {
      throw { status: 404, message: "Request not found" };
    }

    // Only requester can update and only if status is DRAFT or NEED_REVISION
    if (existing.requesterId !== user.userId) {
      throw { status: 403, message: "Forbidden: You are not the owner of this request" };
    }

    if (existing.status !== "DRAFT" && existing.status !== "NEED_REVISION") {
      throw { status: 400, message: `Cannot update request in ${existing.status} status` };
    }

    const { type, title, description, departmentId, siteId, categoryId, vendorId, amount, items, attachments, status } = payload;

    const requestData = {
      type: type || existing.type,
      title: title || existing.title,
      description: description || existing.description,
      departmentId: departmentId || existing.departmentId,
      siteId: siteId || existing.siteId,
      categoryId: categoryId || existing.categoryId,
      vendorId: vendorId !== undefined ? vendorId : existing.vendorId,
      amount: amount !== undefined ? amount : existing.amount,
      status: status || existing.status
    };

    return requestRepository.update(id, requestData, items, attachments, user.userId, ipAddress);
  },

  delete: async (id, user, ipAddress) => {
    const existing = await requestRepository.get(id);
    if (!existing) {
      throw { status: 404, message: "Request not found" };
    }

    const isAdmin = user.role === "admin";

    // If not admin, only requester can delete, and only if DRAFT
    if (!isAdmin) {
      if (existing.requesterId !== user.userId) {
        throw { status: 403, message: "Forbidden: You are not the owner of this request" };
      }

      if (existing.status !== "DRAFT") {
        throw { status: 400, message: "Only draft requests can be deleted" };
      }
    }

    return requestRepository.delete(id, user.userId, ipAddress);
  }
};
