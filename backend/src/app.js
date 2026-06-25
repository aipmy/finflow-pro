import express from "express";
import cors from "cors";

import path from "path";
import authRoutes from "./modules/auth/auth.routes.js";
import uploadRoutes from "./modules/uploads/upload.routes.js";
import requestRoutes from "./modules/requests/request.routes.js";
import approvalRoutes from "./modules/approvals/approval.routes.js";
import metaRoutes from "./modules/meta/meta.routes.js";
import financeRoutes from "./modules/finance/finance.routes.js";
import inventoryRoutes from "./modules/inventory/inventory.routes.js";
import reportsRoutes from "./modules/reports/reports.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import auditRoutes from "./modules/audit/audit.routes.js";
import recurringRoutes from "./modules/recurring/recurring.routes.js";
import notificationsRoutes from "./modules/notifications/notifications.routes.js";
import { initScheduler } from "./core/scheduler.js";

const app = express();

app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  res.on("finish", () => {
    console.log(`[RESPONSE] ${req.method} ${req.url} -> ${res.statusCode}`);
  });
  next();
});

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Serve frontend static assets
app.use(express.static(path.join(process.cwd(), "../frontend/dist")));

// Middlewares
app.use(cors({
  origin: "*", // Adjust in production to specific frontend domains
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/approvals", approvalRoutes);
app.use("/api/meta", metaRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/recurring-requests", recurringRoutes);
app.use("/api/notifications", notificationsRoutes);

// Initialize daily background scheduler
initScheduler();

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date() });
});

// Fallback to React SPA for any non-API routes
app.get("/*splat", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }
  res.sendFile(path.join(process.cwd(), "../frontend/dist/index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.stack || err.message || err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || "Internal Server Error",
      code: err.code || "INTERNAL_ERROR"
    }
  });
});

export default app;
