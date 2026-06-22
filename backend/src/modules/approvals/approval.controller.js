import { approvalService } from "./approval.service.js";

export const approvalController = {
  approve: async (req, res, next) => {
    try {
      const { requestId } = req.params;
      const { note } = req.body;
      const ipAddress = req.ip || req.headers["x-forwarded-for"] || "";

      const result = await approvalService.approve({
        requestId,
        note,
        user: req.user,
        ipAddress
      });
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  reject: async (req, res, next) => {
    try {
      const { requestId } = req.params;
      const { note } = req.body;
      const ipAddress = req.ip || req.headers["x-forwarded-for"] || "";

      const result = await approvalService.reject({
        requestId,
        note,
        user: req.user,
        ipAddress
      });
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  revise: async (req, res, next) => {
    try {
      const { requestId } = req.params;
      const { note } = req.body;
      const ipAddress = req.ip || req.headers["x-forwarded-for"] || "";

      const result = await approvalService.revise({
        requestId,
        note,
        user: req.user,
        ipAddress
      });
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
};
