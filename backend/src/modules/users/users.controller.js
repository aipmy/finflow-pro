import { usersService } from "./users.service.js";

export const usersController = {
  list: async (req, res, next) => {
    try {
      const users = await usersService.list();
      return res.json(users);
    } catch (error) {
      next(error);
    }
  },

  create: async (req, res, next) => {
    try {
      const user = await usersService.create(req.body);
      return res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      const user = await usersService.update(req.params.id, req.body);
      return res.json(user);
    } catch (error) {
      next(error);
    }
  },

  delete: async (req, res, next) => {
    try {
      await usersService.delete(req.params.id);
      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
};
