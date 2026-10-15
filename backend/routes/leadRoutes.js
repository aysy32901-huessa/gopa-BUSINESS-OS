
import express from "express";

import protect from "../middleware/authMiddleware.js";
import verifyTenant from "../middleware/tenantMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";

import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  convertLead,
  deleteLead,
} from "../controllers/leadController.js";

const router = express.Router();

// All routes require authentication and company verification.
router.use(protect, verifyTenant);

// View leads according to each user's access scope.
router.get("/", getLeads);
router.get("/:id", getLeadById);

// Create leads.
router.post(
  "/",
  authorizeRoles("general_admin", "department_manager"),
  createLead
);

// Update leads.
router.put(
  "/:id",
  authorizeRoles("general_admin", "department_manager"),
  updateLead
);

// Convert a won lead into a client.
router.post(
  "/:id/convert",
  authorizeRoles("general_admin", "department_manager"),
  convertLead
);

// Delete leads: general admin only.
router.delete(
  "/:id",
  authorizeRoles("general_admin"),
  deleteLead
);

export default router;
