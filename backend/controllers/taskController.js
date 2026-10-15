
import mongoose from "mongoose";

import Task from "../models/Task.js";
import User from "../models/User.js";
import Department from "../models/Department.js";
import Project from "../models/Project.js";

import asyncHandler from "../utils/asyncHandler.js";

// ==================================================
// KEMETIX CRM - TASK CONTROLLER
// Multi-Tenant Task Management
// ==================================================

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const validateId = (id, fieldName = "ID") => {
  if (!mongoose.isValidObjectId(id)) {
    throw createError(`Invalid ${fieldName}.`);
  }
};

const getUserScope = (user) => {
  const role = user.role;
  const userId = user.userId;
  const departmentId = user.department || null;

  if (role === "general_admin") {
    return {};
  }

  if (role === "department_manager") {
    if (!departmentId) {
      return { _id: { $in: [] } };
    }

    return { department: departmentId };
  }

  if (role === "employee") {
    return { assignedTo: userId };
  }

  return { _id: { $in: [] } };
};

const getTaskFilter = (user, tenantId) => ({
  tenantId,
  ...getUserScope(user),
});

const populateTask = (query) =>
  query
    .populate("assignedTo", "firstName lastName email role")
    .populate("createdBy", "firstName lastName email")
    .populate("department", "name")
    .populate("project", "name status priority");

// ==================================================
// VALIDATION HELPERS
// ==================================================

const validateTaskDates = (startDate, dueDate) => {
  if (startDate && Number.isNaN(new Date(startDate).getTime())) {
    throw createError("Invalid start date.");
  }

  if (dueDate && Number.isNaN(new Date(dueDate).getTime())) {
    throw createError("Invalid due date.");
  }

  if (startDate && dueDate) {
    if (new Date(dueDate) < new Date(startDate)) {
      throw createError("Due date cannot be before start date.");
    }
  }
};

const validateTaskValues = ({
  title,
  status,
  priority,
  progress,
}) => {
  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      throw createError("Task title is required.");
    }

    if (title.trim().length > 200) {
      throw createError("Task title cannot exceed 200 characters.");
    }
  }

  const allowedStatuses = [
    "todo",
    "in_progress",
    "review",
    "completed",
    "cancelled",
  ];

  const allowedPriorities = [
    "low",
    "medium",
    "high",
    "urgent",
  ];

  if (status !== undefined && !allowedStatuses.includes(status)) {
    throw createError("Invalid task status.");
  }

  if (priority !== undefined && !allowedPriorities.includes(priority)) {
    throw createError("Invalid task priority.");
  }

  if (progress !== undefined) {
    if (
      typeof progress !== "number" ||
      !Number.isFinite(progress) ||
      progress < 0 ||
      progress > 100
    ) {
      throw createError("Progress must be between 0 and 100.");
    }
  }
};

const synchronizeTaskProgress = (task) => {
  if (task.status === "completed") {
    task.progress = 100;
    task.completedAt = task.completedAt || new Date();
    return;
  }

  task.completedAt = null;

  if (task.progress >= 100) {
    task.status = "completed";
    task.progress = 100;
    task.completedAt = new Date();
    return;
  }

  if (task.status === "todo" && task.progress > 0) {
    task.status = "in_progress";
  }
};

const validateDepartment = async ({
  departmentId,
  tenantId,
}) => {
  if (!departmentId) {
    return null;
  }

  validateId(departmentId, "department ID");

  const department = await Department.findOne({
    _id: departmentId,
    tenantId,
  }).select("_id");

  if (!department) {
    throw createError("Department is invalid or unavailable.");
  }

  return department._id;
};

const validateAssignee = async ({
  assignedTo,
  tenantId,
  departmentId,
  user,
}) => {
  if (!assignedTo) {
    return null;
  }

  validateId(assignedTo, "assigned user ID");

  const assignee = await User.findOne({
    _id: assignedTo,
    tenantId,
    isActive: true,
  }).select("_id department role");

  if (!assignee) {
    throw createError("Assigned user is invalid or unavailable.");
  }

  if (
    user.role === "department_manager" &&
    String(assignee.department) !== String(user.department)
  ) {
    throw createError(
      "You can only assign tasks to members of your department.",
      403
    );
  }

  if (
    departmentId &&
    String(assignee.department) !== String(departmentId)
  ) {
    throw createError(
      "Assigned user does not belong to the selected department."
    );
  }

  return assignee;
};

const validateProject = async ({
  projectId,
  tenantId,
}) => {
  if (!projectId) {
    return null;
  }

  validateId(projectId, "project ID");

  const project = await Project.findOne({
    _id: projectId,
    tenantId,
  }).select("_id");

  if (!project) {
    throw createError("Project is invalid or unavailable.");
  }

  return project._id;
};

const canManageTasks = (role) =>
  ["general_admin", "department_manager"].includes(role);

// ==================================================
// GET ALL TASKS
// GET /api/tasks
// ==================================================

export const getTasks = asyncHandler(async (req, res) => {
  const {
    search = "",
    status,
    priority,
    assignedTo,
    project,
    department,
    overdue,
    page = 1,
    limit = 20,
    sort = "newest",
  } = req.query;

  const filter = getTaskFilter(req.user, req.tenantId);

  if (status) {
    filter.status = status;
  }

  if (priority) {
    filter.priority = priority;
  }

  if (project) {
    validateId(project, "project ID");
    filter.project = project;
  }

  if (department) {
    validateId(department, "department ID");

    if (
      req.user.role === "department_manager" &&
      String(department) !== String(req.user.department)
    ) {
      throw createError("You cannot access another department.", 403);
    }

    filter.department = department;
  }

  if (assignedTo) {
    validateId(assignedTo, "assigned user ID");

    if (
      req.user.role === "employee" &&
      String(assignedTo) !== String(req.user.userId)
    ) {
      throw createError("You cannot access another employee's tasks.", 403);
    }

    filter.assignedTo = assignedTo;
  }

  if (search.trim()) {
    const searchRegex = new RegExp(
      search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i"
    );

    filter.$or = [
      { title: searchRegex },
      { description: searchRegex },
    ];
  }

  if (overdue === "true") {
    filter.dueDate = { $lt: new Date() };
    filter.status = { $nin: ["completed", "cancelled"] };
  }

  const currentPage = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (currentPage - 1) * pageSize;

  const sortOptions =
    sort === "oldest"
      ? { createdAt: 1 }
      : sort === "dueDate"
        ? { dueDate: 1, createdAt: -1 }
        : sort === "priority"
          ? { priority: -1, dueDate: 1 }
          : { createdAt: -1 };

  const [tasks, total] = await Promise.all([
    populateTask(
      Task.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(pageSize)
    ),
    Task.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    message: "Tasks retrieved successfully.",
    data: {
      tasks,
      pagination: {
        total,
        page: currentPage,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    },
  });
});

// ==================================================
// GET TASK BY ID
// GET /api/tasks/:id
// ==================================================

export const getTaskById = asyncHandler(async (req, res) => {
  validateId(req.params.id, "task ID");

  const task = await populateTask(
    Task.findOne({
      _id: req.params.id,
      ...getTaskFilter(req.user, req.tenantId),
    })
  );

  if (!task) {
    throw createError("Task not found or unavailable.", 404);
  }

  res.status(200).json({
    success: true,
    message: "Task retrieved successfully.",
    data: { task },
  });
});

// ==================================================
// CREATE TASK
// POST /api/tasks
// ==================================================

export const createTask = asyncHandler(async (req, res) => {
  if (!canManageTasks(req.user.role)) {
    throw createError("You are not allowed to create tasks.", 403);
  }

  const {
    title,
    description,
    project,
    assignedTo,
    department,
    status,
    priority,
    progress,
    startDate,
    dueDate,
  } = req.body;

  validateTaskValues({
    title,
    status,
    priority,
    progress,
  });

  validateTaskDates(startDate, dueDate);

  let finalDepartment = department || req.user.department || null;

  if (
    req.user.role === "department_manager" &&
    String(finalDepartment) !== String(req.user.department)
  ) {
    throw createError(
      "You can only create tasks for your department.",
      403
    );
  }

  finalDepartment = await validateDepartment({
    departmentId: finalDepartment,
    tenantId: req.tenantId,
  });

  const assignee = await validateAssignee({
    assignedTo,
    tenantId: req.tenantId,
    departmentId: finalDepartment,
    user: req.user,
  });

  const validProject = await validateProject({
    projectId: project,
    tenantId: req.tenantId,
  });

  const task = new Task({
    tenantId: req.tenantId,
    title: title.trim(),
    description,
    project: validProject,
    assignedTo: assignee?._id || null,
    department: finalDepartment,
    createdBy: req.user.userId,
    status: status || "todo",
    priority: priority || "medium",
    progress: progress ?? 0,
    startDate: startDate || null,
    dueDate: dueDate || null,
  });

  synchronizeTaskProgress(task);

  await task.save();

  const populatedTask = await populateTask(
    Task.findById(task._id)
  );

  res.status(201).json({
    success: true,
    message: "Task created successfully.",
    data: { task: populatedTask },
  });
});

// ==================================================
// UPDATE TASK
// PUT /api/tasks/:id
// ==================================================

export const updateTask = asyncHandler(async (req, res) => {
  if (!canManageTasks(req.user.role)) {
    throw createError("You are not allowed to edit task details.", 403);
  }

  validateId(req.params.id, "task ID");

  const task = await Task.findOne({
    _id: req.params.id,
    ...getTaskFilter(req.user, req.tenantId),
  });

  if (!task) {
    throw createError("Task not found or unavailable.", 404);
  }

  const editableFields = [
    "title",
    "description",
    "status",
    "priority",
    "progress",
    "startDate",
    "dueDate",
  ];

  for (const field of editableFields) {
    if (req.body[field] !== undefined) {
      task[field] = req.body[field];
    }
  }

  validateTaskValues({
    title: task.title,
    status: task.status,
    priority: task.priority,
    progress: task.progress,
  });

  validateTaskDates(task.startDate, task.dueDate);

  if (req.body.department !== undefined) {
    let departmentId = req.body.department || null;

    if (
      req.user.role === "department_manager" &&
      String(departmentId) !== String(req.user.department)
    ) {
      throw createError(
        "You can only assign tasks to your department.",
        403
      );
    }

    task.department = await validateDepartment({
      departmentId,
      tenantId: req.tenantId,
    });
  }

  if (req.body.assignedTo !== undefined) {
    const assignee = await validateAssignee({
      assignedTo: req.body.assignedTo,
      tenantId: req.tenantId,
      departmentId: task.department,
      user: req.user,
    });

    task.assignedTo = assignee?._id || null;
  }

  if (req.body.project !== undefined) {
    task.project = await validateProject({
      projectId: req.body.project,
      tenantId: req.tenantId,
    });
  }

  synchronizeTaskProgress(task);

  await task.save();

  const populatedTask = await populateTask(
    Task.findById(task._id)
  );

  res.status(200).json({
    success: true,
    message: "Task updated successfully.",
    data: { task: populatedTask },
  });
});

// ==================================================
// UPDATE TASK STATUS AND PROGRESS
// PATCH /api/tasks/:id/progress
// ==================================================

export const updateTaskProgress = asyncHandler(async (req, res) => {
  validateId(req.params.id, "task ID");

  const task = await Task.findOne({
    _id: req.params.id,
    ...getTaskFilter(req.user, req.tenantId),
  });

  if (!task) {
    throw createError("Task not found or unavailable.", 404);
  }

  const { status, progress } = req.body;

  if (
    status === undefined &&
    progress === undefined
  ) {
    throw createError("Provide a status or progress value.");
  }

  validateTaskValues({ status, progress });

  if (
    req.user.role === "employee" &&
    status === undefined &&
    progress === undefined
  ) {
    throw createError("No valid task update was provided.");
  }

  if (status !== undefined) {
    task.status = status;
  }

  if (progress !== undefined) {
    task.progress = progress;
  }

  synchronizeTaskProgress(task);

  await task.save();

  const populatedTask = await populateTask(
    Task.findById(task._id)
  );

  res.status(200).json({
    success: true,
    message: "Task progress updated successfully.",
    data: { task: populatedTask },
  });
});

// ==================================================
// DELETE TASK
// DELETE /api/tasks/:id
// ==================================================

export const deleteTask = asyncHandler(async (req, res) => {
  if (req.user.role !== "general_admin") {
    throw createError("Only the general admin can delete tasks.", 403);
  }

  validateId(req.params.id, "task ID");

  const task = await Task.findOneAndDelete({
    _id: req.params.id,
    tenantId: req.tenantId,
  });

  if (!task) {
    throw createError("Task not found or unavailable.", 404);
  }

  res.status(200).json({
    success: true,
    message: "Task deleted successfully.",
  });
});


// ==================================================
// GET TASK FORM OPTIONS
// GET /api/tasks/options
// ==================================================

export const getTaskOptions = asyncHandler(async (req, res) => {
  const { role, userId, department } = req.user;
  const tenantId = req.tenantId;

  let userFilter = {
    tenantId,
    isActive: true,
  };

  let departmentFilter = {
    tenantId,
  };

  let projectFilter = {
    tenantId,
  };

  if (role === "department_manager") {
    if (!department) {
      return res.status(200).json({
        success: true,
        data: {
          users: [],
          departments: [],
          projects: [],
        },
      });
    }

    userFilter.department = department;
    departmentFilter._id = department;

    const members = await User.find(userFilter).select("_id");
    const memberIds = members.map((member) => member._id);

    projectFilter.$or = [
      { manager: { $in: memberIds } },
      { team: { $in: memberIds } },
    ];
  }

  if (role === "employee") {
    userFilter._id = userId;

    if (department) {
      departmentFilter._id = department;
    } else {
      departmentFilter._id = { $in: [] };
    }

    projectFilter.$or = [
      { manager: userId },
      { team: userId },
    ];
  }

  const [users, departments, projects] = await Promise.all([
    User.find(userFilter)
      .select("firstName lastName email role department")
      .sort({ firstName: 1 }),

    Department.find(departmentFilter)
      .select("name")
      .sort({ name: 1 }),

    Project.find(projectFilter)
      .select("name status priority")
      .sort({ createdAt: -1 }),
  ]);

  res.status(200).json({
    success: true,
    message: "Task form options retrieved successfully.",
    data: {
      users,
      departments,
      projects,
    },
  });
});
