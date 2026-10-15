
import express from "express";

import {
  getTasks,
  getTaskById,
  getTaskOptions,
  createTask,
  updateTask,
  updateTaskProgress,
  deleteTask,
} from "../controllers/taskController.js";

import protect from "../middleware/authMiddleware.js";
import verifyTenant from "../middleware/tenantMiddleware.js";

// ==================================================
// KEMETIX CRM - TASK ROUTES
// Multi-Tenant Task Management
// ==================================================

const router = express.Router();

// ==================================================
// AUTHENTICATION & TENANT PROTECTION
// ==================================================

router.use(protect, verifyTenant);

// ==================================================
// TASK FORM OPTIONS
// ==================================================

// GET /api/tasks/options
// Employees, departments and projects for task forms.
router.get("/options", getTaskOptions);

// ==================================================
// TASK CRUD
// ==================================================

// GET /api/tasks
router.get("/", getTasks);

// GET /api/tasks/:id
router.get("/:id", getTaskById);

// POST /api/tasks
router.post("/", createTask);

// PUT /api/tasks/:id
router.put("/:id", updateTask);

// ==================================================
// TASK PROGRESS
// ==================================================

// PATCH /api/tasks/:id/progress
router.patch("/:id/progress", updateTaskProgress);

// ==================================================
// DELETE TASK
// ==================================================

// DELETE /api/tasks/:id
router.delete("/:id", deleteTask);

export default router;
