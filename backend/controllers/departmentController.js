
import mongoose from "mongoose";

import Department from "../models/Department.js";
import User from "../models/User.js";
import Task from "../models/Task.js";

// ==================================================
// KEMETIX BUSINESS OS
// DEPARTMENT CONTROLLER
// Multi-Tenant Department Management
// ==================================================

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getTenantId = (req) =>
  req.tenantId || req.user?.tenantId;

const getDepartmentScope = (req) => {
  const filter = {
    tenantId: getTenantId(req),
  };

  if (req.user.role === "department_manager") {
    if (!req.user.department) {
      filter._id = { $in: [] };
    } else {
      filter._id = req.user.department;
    }
  }

  if (req.user.role === "employee") {
    if (!req.user.department) {
      filter._id = { $in: [] };
    } else {
      filter._id = req.user.department;
    }
  }

  return filter;
};

const validateId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError("Invalid department ID", 400);
  }
};

const validateManager = async ({
  managerId,
  tenantId,
  departmentId = null,
}) => {
  if (!managerId) return null;

  if (!mongoose.Types.ObjectId.isValid(managerId)) {
    throw createError("Invalid manager ID", 400);
  }

  const manager = await User.findOne({
    _id: managerId,
    tenantId,
    role: "department_manager",
    isActive: true,
  });

  if (!manager) {
    throw createError(
      "Manager not found or is not an active department manager",
      404
    );
  }

  if (
    manager.department &&
    String(manager.department) !== String(departmentId)
  ) {
    throw createError(
      "This manager is already assigned to another department",
      409
    );
  }

  return manager;
};

// ==================================================
// DEPARTMENT ANALYTICS
// ==================================================

const getDepartmentAnalytics = async ({
  tenantId,
  departmentIds,
}) => {
  if (!departmentIds.length) {
    return new Map();
  }

  const now = new Date();

  const [employeeStats, taskStats] = await Promise.all([
    User.aggregate([
      {
        $match: {
          tenantId: new mongoose.Types.ObjectId(
            String(tenantId)
          ),
          department: { $in: departmentIds },
          isActive: true,
          role: "employee",
        },
      },
      {
        $group: {
          _id: "$department",
          employeeCount: { $sum: 1 },
        },
      },
    ]),

    Task.aggregate([
      {
        $match: {
          tenantId: new mongoose.Types.ObjectId(
            String(tenantId)
          ),
          department: { $in: departmentIds },
        },
      },
      {
        $group: {
          _id: "$department",

          totalTasks: {
            $sum: 1,
          },

          completedTasks: {
            $sum: {
              $cond: [
                { $eq: ["$status", "completed"] },
                1,
                0,
              ],
            },
          },

          openTasks: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    ["todo", "in_progress", "review"],
                  ],
                },
                1,
                0,
              ],
            },
          },

          overdueTasks: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$dueDate", null] },
                    { $lt: ["$dueDate", now] },
                    {
                      $not: [
                        {
                          $in: [
                            "$status",
                            ["completed", "cancelled"],
                          ],
                        },
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
  ]);

  const analyticsMap = new Map();

  for (const id of departmentIds) {
    analyticsMap.set(id.toString(), {
      employeeCount: 0,
      totalTasks: 0,
      completedTasks: 0,
      openTasks: 0,
      overdueTasks: 0,
      completionRate: 0,
    });
  }

  for (const item of employeeStats) {
    const key = item._id.toString();

    if (analyticsMap.has(key)) {
      analyticsMap.get(key).employeeCount =
        item.employeeCount;
    }
  }

  for (const item of taskStats) {
    const key = item._id.toString();

    if (!analyticsMap.has(key)) continue;

    const stats = analyticsMap.get(key);

    stats.totalTasks = item.totalTasks;
    stats.completedTasks = item.completedTasks;
    stats.openTasks = item.openTasks;
    stats.overdueTasks = item.overdueTasks;

    stats.completionRate =
      item.totalTasks > 0
        ? Number(
            (
              (item.completedTasks / item.totalTasks) *
              100
            ).toFixed(1)
          )
        : 0;
  }

  return analyticsMap;
};

// ==================================================
// GET ALL DEPARTMENTS
// GET /api/departments
// ==================================================

export const getDepartments = async (req, res) => {
  const tenantId = getTenantId(req);

  const {
    search = "",
    status = "all",
    page = 1,
    limit = 20,
    sort = "newest",
  } = req.query;

  const filter = getDepartmentScope(req);

  if (search.trim()) {
    filter.$or = [
      {
        name: {
          $regex: search.trim(),
          $options: "i",
        },
      },
      {
        description: {
          $regex: search.trim(),
          $options: "i",
        },
      },
    ];
  }

  if (status === "active") {
    filter.isActive = true;
  } else if (status === "inactive") {
    filter.isActive = false;
  }

  const pageNumber = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(limit) || 20)
  );

  const sortOption =
    sort === "oldest"
      ? { createdAt: 1 }
      : sort === "name"
        ? { name: 1 }
        : { createdAt: -1 };

  const [departments, total] = await Promise.all([
    Department.find(filter)
      .populate(
        "manager",
        "firstName lastName email"
      )
      .sort(sortOption)
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .lean(),

    Department.countDocuments(filter),
  ]);

  const departmentIds = departments.map(
    (department) => department._id
  );

  const analytics = await getDepartmentAnalytics({
    tenantId,
    departmentIds,
  });

  const result = departments.map((department) => ({
    ...department,
    analytics:
      analytics.get(department._id.toString()) || {},
  }));

  res.status(200).json({
    success: true,
    data: {
      departments: result,
      pagination: {
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    },
  });
};

// ==================================================
// GET DEPARTMENT BY ID
// GET /api/departments/:id
// ==================================================

export const getDepartmentById = async (req, res) => {
  validateId(req.params.id);

  const department = await Department.findOne({
    _id: req.params.id,
    ...getDepartmentScope(req),
  }).populate(
    "manager",
    "firstName lastName email"
  );

  if (!department) {
    throw createError("Department not found", 404);
  }

  const analytics = await getDepartmentAnalytics({
    tenantId: getTenantId(req),
    departmentIds: [department._id],
  });

  res.status(200).json({
    success: true,
    data: {
      department: {
        ...department.toObject(),
        analytics:
          analytics.get(department._id.toString()) || {},
      },
    },
  });
};

// ==================================================
// CREATE DEPARTMENT
// POST /api/departments
// GENERAL ADMIN ONLY
// ==================================================

export const createDepartment = async (req, res) => {
  const tenantId = getTenantId(req);

  const {
    name,
    description = "",
    manager = null,
  } = req.body;

  if (!name || name.trim().length < 2) {
    throw createError(
      "Department name must contain at least 2 characters"
    );
  }

  const normalizedName = name.trim();

  const existingDepartment = await Department.findOne({
    tenantId,
    name: {
      $regex: `^${normalizedName.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      )}$`,
      $options: "i",
    },
  });

  if (existingDepartment) {
    throw createError(
      "A department with this name already exists",
      409
    );
  }

  const managerUser = await validateManager({
    managerId: manager,
    tenantId,
  });

  const department = await Department.create({
    tenantId,
    name: normalizedName,
    description,
    manager: managerUser?._id || null,
    createdBy: req.user.userId,
  });

  // Keep the manager's department assignment synchronized.
  if (managerUser) {
    managerUser.department = department._id;
    await managerUser.save();
  }

  await department.populate(
    "manager",
    "firstName lastName email"
  );

  res.status(201).json({
    success: true,
    message: "Department created successfully",
    data: {
      department,
    },
  });
};

// ==================================================
// UPDATE DEPARTMENT
// PUT /api/departments/:id
// GENERAL ADMIN ONLY
// ==================================================

export const updateDepartment = async (req, res) => {
  validateId(req.params.id);

  const tenantId = getTenantId(req);

  const department = await Department.findOne({
    _id: req.params.id,
    tenantId,
  });

  if (!department) {
    throw createError("Department not found", 404);
  }

  const {
    name,
    description,
    manager,
    isActive,
  } = req.body;

  if (name !== undefined) {
    if (!name || name.trim().length < 2) {
      throw createError(
        "Department name must contain at least 2 characters"
      );
    }

    const duplicate = await Department.findOne({
      tenantId,
      _id: { $ne: department._id },
      name: {
        $regex: `^${name.trim().replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        )}$`,
        $options: "i",
      },
    });

    if (duplicate) {
      throw createError(
        "A department with this name already exists",
        409
      );
    }

    department.name = name.trim();
  }

  if (description !== undefined) {
    department.description = description;
  }

  if (isActive !== undefined) {
    if (typeof isActive !== "boolean") {
      throw createError("isActive must be a boolean");
    }

    department.isActive = isActive;
  }

  let newManager = null;

  if (manager !== undefined) {
    if (manager) {
      newManager = await validateManager({
        managerId: manager,
        tenantId,
        departmentId: department._id,
      });
    }

    const oldManagerId = department.manager
      ? String(department.manager)
      : null;

    const newManagerId = newManager
      ? String(newManager._id)
      : null;

    if (oldManagerId !== newManagerId) {
      if (oldManagerId) {
        await User.updateOne(
          {
            _id: oldManagerId,
            tenantId,
            department: department._id,
          },
          {
            $set: { department: null },
          }
        );
      }

      if (newManager) {
        newManager.department = department._id;
        await newManager.save();
      }
    }

    department.manager = newManager?._id || null;
  }

  await department.save();

  await department.populate(
    "manager",
    "firstName lastName email"
  );

  res.status(200).json({
    success: true,
    message: "Department updated successfully",
    data: {
      department,
    },
  });
};

// ==================================================
// DEACTIVATE DEPARTMENT
// DELETE /api/departments/:id
// GENERAL ADMIN ONLY
// ==================================================

export const deleteDepartment = async (req, res) => {
  validateId(req.params.id);

  const tenantId = getTenantId(req);

  const department = await Department.findOne({
    _id: req.params.id,
    tenantId,
  });

  if (!department) {
    throw createError("Department not found", 404);
  }

  if (!department.isActive) {
    throw createError(
      "Department is already inactive",
      400
    );
  }

  // Soft delete to preserve employee and task references.
  department.isActive = false;

  await department.save();

  res.status(200).json({
    success: true,
    message: "Department deactivated successfully",
    data: {
      departmentId: department._id,
      isActive: department.isActive,
    },
  });
};
