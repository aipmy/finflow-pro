import { Router } from "express";
import { prisma } from "../../core/database.js";
import { requireAuth } from "../../middlewares/authMiddleware.js";
import { requirePermission } from "../../middlewares/permissionMiddleware.js";

const router = Router();

router.use(requireAuth);

router.get("/roles", async (req, res, next) => {
  try {
    const data = await prisma.role.findMany({ orderBy: { name: "asc" } });
    return res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/departments", async (req, res, next) => {
  try {
    const data = await prisma.department.findMany({ orderBy: { name: "asc" } });
    return res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/sites", async (req, res, next) => {
  try {
    const data = await prisma.site.findMany({ orderBy: { name: "asc" } });
    return res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/categories", async (req, res, next) => {
  try {
    const data = await prisma.expenseCategory.findMany({ orderBy: { name: "asc" } });
    return res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/units", async (req, res, next) => {
  try {
    const data = await prisma.unit.findMany({ orderBy: { name: "asc" } });
    return res.json(data);
  } catch (err) {
    next(err);
  }
});

// Create, Update, Delete Departments
router.post("/departments", requirePermission("settings:manage"), async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: { message: "Nama departemen harus diisi" } });
    const department = await prisma.department.create({ data: { name } });
    return res.status(201).json(department);
  } catch (err) {
    next(err);
  }
});

router.put("/departments/:id", requirePermission("settings:manage"), async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: { message: "Nama departemen harus diisi" } });
    const department = await prisma.department.update({
      where: { id: req.params.id },
      data: { name }
    });
    return res.json(department);
  } catch (err) {
    next(err);
  }
});

router.delete("/departments/:id", requirePermission("settings:manage"), async (req, res, next) => {
  try {
    await prisma.department.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Create, Update, Delete Sites
router.post("/sites", requirePermission("settings:manage"), async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: { message: "Nama site harus diisi" } });
    const site = await prisma.site.create({ data: { name } });
    return res.status(201).json(site);
  } catch (err) {
    next(err);
  }
});

router.put("/sites/:id", requirePermission("settings:manage"), async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: { message: "Nama site harus diisi" } });
    const site = await prisma.site.update({
      where: { id: req.params.id },
      data: { name }
    });
    return res.json(site);
  } catch (err) {
    next(err);
  }
});

router.delete("/sites/:id", requirePermission("settings:manage"), async (req, res, next) => {
  try {
    await prisma.site.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Create, Update, Delete Categories
router.post("/categories", requirePermission("settings:manage"), async (req, res, next) => {
  try {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: { message: "Nama kategori harus diisi" } });
    const category = await prisma.expenseCategory.create({
      data: { name, color: color || "primary" }
    });
    return res.status(201).json(category);
  } catch (err) {
    next(err);
  }
});

router.put("/categories/:id", requirePermission("settings:manage"), async (req, res, next) => {
  try {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: { message: "Nama kategori harus diisi" } });
    const category = await prisma.expenseCategory.update({
      where: { id: req.params.id },
      data: { name, color }
    });
    return res.json(category);
  } catch (err) {
    next(err);
  }
});

router.delete("/categories/:id", requirePermission("settings:manage"), async (req, res, next) => {
  try {
    await prisma.expenseCategory.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
