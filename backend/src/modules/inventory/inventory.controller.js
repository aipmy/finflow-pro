import { inventoryService } from "./inventory.service.js";

export const inventoryController = {
  listItems: async (req, res, next) => {
    try {
      const filters = {
        search: req.query.search,
        lowStock: req.query.lowStock,
        categoryId: req.query.categoryId,
        locationId: req.query.locationId
      };
      const result = await inventoryService.listItems(filters);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  createItem: async (req, res, next) => {
    try {
      const ipAddress = req.ip || req.headers["x-forwarded-for"] || "";
      const result = await inventoryService.createItem(req.body, req.user, ipAddress);
      return res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  updateItem: async (req, res, next) => {
    try {
      const { id } = req.params;
      const ipAddress = req.ip || req.headers["x-forwarded-for"] || "";
      const result = await inventoryService.updateItem(id, req.body, req.user, ipAddress);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  deleteItem: async (req, res, next) => {
    try {
      const { id } = req.params;
      const ipAddress = req.ip || req.headers["x-forwarded-for"] || "";
      const result = await inventoryService.deleteItem(id, req.user, ipAddress);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  listMovements: async (req, res, next) => {
    try {
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };
      const result = await inventoryService.listMovements(filters, req.user);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  createMovement: async (req, res, next) => {
    try {
      const ipAddress = req.ip || req.headers["x-forwarded-for"] || "";
      const result = await inventoryService.createMovement(req.body, req.user, ipAddress);
      return res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
};
