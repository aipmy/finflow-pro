import { requestService } from "./request.service.js";
import { generateSingleRequestPdf, generateSingleRequestExcel } from "./request.generator.js";

export const requestController = {
  list: async (req, res, next) => {
    try {
      const filters = {
        status: req.query.status,
        type: req.query.type,
        categoryId: req.query.categoryId,
        siteId: req.query.siteId,
        departmentId: req.query.departmentId,
        search: req.query.search,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const result = await requestService.list(filters, req.user);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  get: async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await requestService.get(id, req.user);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  create: async (req, res, next) => {
    try {
      const ipAddress = req.ip || req.headers["x-forwarded-for"] || "";
      const result = await requestService.create(req.body, req.user, ipAddress);
      return res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const ipAddress = req.ip || req.headers["x-forwarded-for"] || "";
      const result = await requestService.update(id, req.body, req.user, ipAddress);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  delete: async (req, res, next) => {
    try {
      const { id } = req.params;
      const ipAddress = req.ip || req.headers["x-forwarded-for"] || "";
      await requestService.delete(id, req.user, ipAddress);
      return res.json({ success: true, message: "Request deleted successfully" });
    } catch (err) {
      next(err);
    }
  },

  exportPdf: async (req, res, next) => {
    try {
      const { id } = req.params;
      const requestData = await requestService.get(id, req.user);
      const buffer = await generateSingleRequestPdf(requestData);
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${requestData.code}.pdf"`);
      return res.send(buffer);
    } catch (err) {
      next(err);
    }
  },

  exportExcel: async (req, res, next) => {
    try {
      const { id } = req.params;
      const requestData = await requestService.get(id, req.user);
      const buffer = await generateSingleRequestExcel(requestData);
      
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${requestData.code}.xlsx"`);
      return res.send(buffer);
    } catch (err) {
      next(err);
    }
  }
};
