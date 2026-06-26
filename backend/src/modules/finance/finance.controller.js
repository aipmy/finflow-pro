import { financeService } from "./finance.service.js";

export const financeController = {
  realize: async (req, res, next) => {
    try {
      const { requestId } = req.params;
      const { realizedAmount, receiptUrl, receiptSize, notes } = req.body;
      const ipAddress = req.ip || req.headers["x-forwarded-for"] || "";

      const result = await financeService.realize({
        requestId,
        realizedAmount,
        receiptUrl,
        receiptSize,
        notes,
        user: req.user,
        ipAddress
      });
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  getPettyCash: async (req, res, next) => {
    try {
      const result = await financeService.getPettyCash(req.user);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  topUpPettyCash: async (req, res, next) => {
    try {
      const { amount, description, type, date } = req.body;
      const result = await financeService.topUpPettyCash({
        amount,
        description,
        type,
        date,
        user: req.user
      });
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  updatePettyCashTransaction: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { amount, description, type, date } = req.body;
      const result = await financeService.updatePettyCashTransaction({
        id,
        amount,
        description,
        type,
        date,
        user: req.user
      });
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  deletePettyCashTransaction: async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await financeService.deletePettyCashTransaction({
        id,
        user: req.user
      });
      return res.json({ success: true, deleted: result });
    } catch (err) {
      next(err);
    }
  },

  submitProof: async (req, res, next) => {
    try {
      const { requestId } = req.params;
      const { proofs, actualAmount } = req.body;
      const ipAddress = req.ip || req.headers["x-forwarded-for"] || "";

      const result = await financeService.submitProof({
        requestId,
        proofs,
        actualAmount,
        user: req.user,
        ipAddress
      });
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  verifyRealization: async (req, res, next) => {
    try {
      const { requestId } = req.params;
      const { note } = req.body;
      const ipAddress = req.ip || req.headers["x-forwarded-for"] || "";

      const result = await financeService.verifyRealization({
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

  rejectVerification: async (req, res, next) => {
    try {
      const { requestId } = req.params;
      const { note } = req.body;
      const ipAddress = req.ip || req.headers["x-forwarded-for"] || "";

      const result = await financeService.rejectVerification({
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
