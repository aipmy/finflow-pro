import { Router } from "express";
import { financeController } from "./finance.controller.js";
import { requireAuth } from "../../middlewares/authMiddleware.js";
import { requirePermission } from "../../middlewares/permissionMiddleware.js";

const router = Router();

router.use(requireAuth);

router.post("/realizations/:requestId", requirePermission("finance:realize"), financeController.realize);
router.post("/realizations/:requestId/proof", financeController.submitProof);
router.post("/realizations/:requestId/verify", requirePermission("finance:realize"), financeController.verifyRealization);
router.post("/realizations/:requestId/reject-verification", requirePermission("finance:realize"), financeController.rejectVerification);
router.get("/petty-cash", requirePermission("request:read"), financeController.getPettyCash);
router.post("/petty-cash/top-up", requirePermission("finance:realize"), financeController.topUpPettyCash);
router.put("/petty-cash/:id", requirePermission("finance:realize"), financeController.updatePettyCashTransaction);

export default router;
