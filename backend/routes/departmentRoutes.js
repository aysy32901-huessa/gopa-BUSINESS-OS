
import express from "express";

// Controllers
import {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "../controllers/departmentController.js";

// Middleware
import protect from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";
import verifyTenant from "../middleware/tenantMiddleware.js";

const router = express.Router();

// ==========================================
// GLOBAL MIDDLEWARE
// ==========================================

// Authentication
router.use(protect);

// Company / Tenant verification
router.use(verifyTenant);

// ==========================================
// DEPARTMENTS ROUTES
// ==========================================

// GET ALL DEPARTMENTS
router.get(
  "/",
  authorizeRoles(
    "general_admin",
    "department_manager",
    "employee"
  ),
  getDepartments
);

// GET SINGLE DEPARTMENT
router.get(
  "/:id",
  authorizeRoles(
    "general_admin",
    "department_manager",
    "employee"
  ),
  getDepartmentById
);

// CREATE DEPARTMENT
router.post(
  "/",
  authorizeRoles("general_admin"),
  createDepartment
);

// UPDATE DEPARTMENT
router.put(
  "/:id",
  authorizeRoles("general_admin"),
  updateDepartment
);

// DELETE / DEACTIVATE DEPARTMENT
router.delete(
  "/:id",
  authorizeRoles("general_admin"),
  deleteDepartment
);

// ==========================================
// EXPORT ROUTER
// ==========================================

export default router;
