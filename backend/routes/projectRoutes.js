
import express from "express";

import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  updateProjectProgress,
  updateProjectPayment,
  deleteProject,
} from "../controllers/projectController.js";

import protect from "../middleware/authMiddleware.js";
import verifyTenant from "../middleware/tenantMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";

const router = express.Router();

// ==================================================
// GLOBAL MIDDLEWARE
// ==================================================

router.use(protect, verifyTenant);

// ==================================================
// PROJECT ROUTES
// ==================================================

// GET all projects
router.get("/", getProjects);

// GET single project
router.get("/:id", getProjectById);

// CREATE project
router.post(
  "/",
  authorizeRoles("general_admin", "department_manager"),
  createProject
);

// UPDATE project
router.put(
  "/:id",
  authorizeRoles("general_admin", "department_manager"),
  updateProject
);

// UPDATE project progress
router.patch(
  "/:id/progress",
  updateProjectProgress
);

// UPDATE project payment
router.patch(
  "/:id/payment",
  authorizeRoles("general_admin"),
  updateProjectPayment
);

// DELETE project
router.delete(
  "/:id",
  authorizeRoles("general_admin"),
  deleteProject
);

export default router;
