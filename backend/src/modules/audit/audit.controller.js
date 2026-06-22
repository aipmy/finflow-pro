import { auditService } from "./audit.service.js";

export const auditController = {
  list: async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit || "50", 10);
      const offset = parseInt(req.query.offset || "0", 10);
      const logs = await auditService.list({ limit, offset });
      return res.json(logs);
    } catch (error) {
      next(error);
    }
  }
};
