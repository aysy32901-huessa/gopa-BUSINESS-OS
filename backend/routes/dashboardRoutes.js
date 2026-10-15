
import express from "express";

import DashboardController from "../controllers/dashboardController.js";
import protect from "../middleware/authMiddleware.js";
import verifyTenant from "../middleware/tenantMiddleware.js";

const router = express.Router();

// GET /api/dashboard/overview
router.get(
  "/overview",
  protect,
  verifyTenant,
  DashboardController.getOverview
);

export default router;
