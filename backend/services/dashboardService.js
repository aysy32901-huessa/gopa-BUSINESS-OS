
import mongoose from "mongoose";

import Client from "../models/Client.js";
import Department from "../models/Department.js";
import Lead from "../models/Lead.js";
import Project from "../models/Project.js";
import Sale from "../models/Sale.js";
import Task from "../models/Task.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";

// ==================================================
// KEMETIX CRM - DASHBOARD SERVICE
// Role-Based Dashboard Overview
// Multi-Tenant Analytics
// ==================================================

const OPEN_STATUSES = ["todo", "in_progress", "review"];
const CLOSED_STATUSES = ["completed", "cancelled"];

const toObjectId = (id) =>
  new mongoose.Types.ObjectId(String(id));

// ==================================================
// AGGREGATION HELPERS
// ==================================================

// Checks whether a task is not completed or cancelled.
// This is an aggregation expression, not a query filter.
const isTaskNotClosed = {
  $not: [
    {
      $in: ["$status", CLOSED_STATUSES],
    },
  ],
};

// Checks whether a task is overdue.
const isTaskOverdue = (now) => ({
  $and: [
    {
      $ne: ["$dueDate", null],
    },
    {
      $lt: ["$dueDate", now],
    },
    isTaskNotClosed,
  ],
});

// ==================================================
// MAIN DASHBOARD SERVICE
// ==================================================

const getDashboardOverview = async ({ user, tenantId }) => {
  const now = new Date();

  const nextSevenDays = new Date(now);
  nextSevenDays.setDate(nextSevenDays.getDate() + 7);

  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );

  const tenantObjectId = toObjectId(tenantId);

  // --------------------------------------------------
  // 1. USER ROLE AND ACCESS SCOPE
  // --------------------------------------------------

  const isGeneralAdmin = user.role === "general_admin";
  const isDepartmentManager = user.role === "department_manager";
  const isEmployee = user.role === "employee";

  const departmentId = user.department || null;

  let memberIds = [];

  if (isDepartmentManager && departmentId) {
    const members = await User.find({
      tenantId,
      department: departmentId,
      isActive: true,
    }).select("_id");

    memberIds = members.map((member) => member._id);
  }

  if (isEmployee) {
    memberIds = [user.userId];
  }

  // --------------------------------------------------
  // 2. TENANT-SCOPED FILTERS
  // --------------------------------------------------

  const clientFilter = { tenantId };
  const leadFilter = { tenantId };
  const saleFilter = { tenantId };
  const projectFilter = { tenantId };
  const taskFilter = { tenantId };

  if (!isGeneralAdmin) {
    clientFilter.assignedTo = { $in: memberIds };
    leadFilter.assignedTo = { $in: memberIds };
    saleFilter.assignedTo = { $in: memberIds };

    projectFilter.$or = [
      { manager: { $in: memberIds } },
      { team: { $in: memberIds } },
    ];

    if (isDepartmentManager) {
      if (departmentId) {
        taskFilter.department = departmentId;
      } else {
        taskFilter._id = { $in: [] };
      }
    }

    if (isEmployee) {
      taskFilter.assignedTo = user.userId;
    }
  }

  // Aggregation pipelines do not automatically cast IDs.
  const taskAnalyticsFilter = {
    tenantId: tenantObjectId,
  };

  const saleAnalyticsFilter = {
    tenantId: tenantObjectId,
  };

  if (isDepartmentManager) {
    if (departmentId) {
      taskAnalyticsFilter.department = toObjectId(departmentId);
    } else {
      taskAnalyticsFilter._id = { $in: [] };
    }
  }

  if (isEmployee) {
    taskAnalyticsFilter.assignedTo = toObjectId(user.userId);
  }

  if (!isGeneralAdmin) {
    saleAnalyticsFilter.assignedTo = {
      $in: memberIds.map((id) => toObjectId(id)),
    };
  }

  // --------------------------------------------------
  // 3. MAIN DASHBOARD STATISTICS
  // --------------------------------------------------

  const [
    totalClients,
    newClients,
    totalLeads,
    newLeads,
    totalProjects,
    activeProjects,

    totalTasks,
    openTasks,
    overdueTasks,
    completedTasks,
    cancelledTasks,
    dueSoonTasks,

    salesCount,
    salesByCurrency,
    incomeByCurrency,
    expensesByCurrency,
  ] = await Promise.all([
    Client.countDocuments(clientFilter),

    Client.countDocuments({
      ...clientFilter,
      createdAt: { $gte: monthStart },
    }),

    Lead.countDocuments(leadFilter),

    Lead.countDocuments({
      ...leadFilter,
      createdAt: { $gte: monthStart },
    }),

    Project.countDocuments(projectFilter),

    Project.countDocuments({
      ...projectFilter,
      status: "active",
    }),

    Task.countDocuments(taskFilter),

    Task.countDocuments({
      ...taskFilter,
      status: { $in: OPEN_STATUSES },
    }),

    Task.countDocuments({
      ...taskFilter,
      dueDate: { $lt: now },
      status: { $nin: CLOSED_STATUSES },
    }),

    Task.countDocuments({
      ...taskFilter,
      status: "completed",
    }),

    Task.countDocuments({
      ...taskFilter,
      status: "cancelled",
    }),

    Task.countDocuments({
      ...taskFilter,
      dueDate: {
        $gte: now,
        $lte: nextSevenDays,
      },
      status: { $nin: CLOSED_STATUSES },
    }),

    Sale.countDocuments({
      ...saleFilter,
      status: "confirmed",
    }),

    Sale.aggregate([
      {
        $match: {
          ...saleAnalyticsFilter,
          status: "confirmed",
        },
      },
      {
        $group: {
          _id: "$currency",
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]),

    isGeneralAdmin
      ? Transaction.aggregate([
          {
            $match: {
              tenantId: tenantObjectId,
              type: "income",
            },
          },
          {
            $group: {
              _id: "$currency",
              amount: { $sum: "$amount" },
            },
          },
        ])
      : Promise.resolve([]),

    isGeneralAdmin
      ? Transaction.aggregate([
          {
            $match: {
              tenantId: tenantObjectId,
              type: "expense",
            },
          },
          {
            $group: {
              _id: "$currency",
              amount: { $sum: "$amount" },
            },
          },
        ])
      : Promise.resolve([]),
  ]);

  // --------------------------------------------------
  // 4. TASK COMPLETION RATE
  // --------------------------------------------------

  const activeTasks = totalTasks - cancelledTasks;

  const completionRate =
    activeTasks > 0
      ? Number(
          ((completedTasks / activeTasks) * 100).toFixed(1)
        )
      : 0;

  // --------------------------------------------------
  // 5. TASK STATUS, PRIORITY AND EMPLOYEE WORKLOAD
  // --------------------------------------------------

  const [
    statusDistribution,
    priorityDistribution,
    employeeWorkload,
  ] = await Promise.all([
    // Task status distribution
    Task.aggregate([
      {
        $match: taskAnalyticsFilter,
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),

    // Task priority distribution
    Task.aggregate([
      {
        $match: taskAnalyticsFilter,
      },
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 },
        },
      },
    ]),

    // Employee workload and performance
    Task.aggregate([
      {
        $match: taskAnalyticsFilter,
      },
      {
        $group: {
          _id: "$assignedTo",

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
                { $in: ["$status", OPEN_STATUSES] },
                1,
                0,
              ],
            },
          },

          overdueTasks: {
            $sum: {
              $cond: [
                isTaskOverdue(now),
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
  ]);

  // --------------------------------------------------
  // 6. EMPLOYEE PERFORMANCE
  // --------------------------------------------------

  const employeeIds = employeeWorkload
    .map((item) => item._id)
    .filter(Boolean);

  const employees = employeeIds.length
    ? await User.find({
        _id: { $in: employeeIds },
        tenantId,
      }).select("firstName lastName department")
    : [];

  const employeeMap = new Map(
    employees.map((employee) => [
      employee._id.toString(),
      employee,
    ])
  );

  const employeePerformance = employeeWorkload
    .filter((item) => item._id)
    .map((item) => {
      const employee = employeeMap.get(
        item._id.toString()
      );

      return {
        employeeId: item._id,

        employeeName: employee
          ? `${employee.firstName || ""} ${employee.lastName || ""}`.trim()
          : "Unknown",

        departmentId: employee?.department || null,

        totalTasks: item.totalTasks,
        completedTasks: item.completedTasks,
        openTasks: item.openTasks,
        overdueTasks: item.overdueTasks,

        completionRate:
          item.totalTasks > 0
            ? Number(
                (
                  (item.completedTasks / item.totalTasks) *
                  100
                ).toFixed(1)
              )
            : 0,
      };
    })
    .sort(
      (a, b) =>
        b.completionRate - a.completionRate ||
        b.completedTasks - a.completedTasks
    );

  const unassignedTasks =
    employeeWorkload.find(
      (item) => item._id === null
    )?.totalTasks || 0;

  // --------------------------------------------------
  // 7. DEPARTMENT PERFORMANCE
  // --------------------------------------------------

  let departmentPerformance = [];

  if (isGeneralAdmin || isDepartmentManager) {
    const departmentMatch = {
      tenantId: tenantObjectId,
    };

    if (isDepartmentManager) {
      if (departmentId) {
        departmentMatch.department = toObjectId(departmentId);
      } else {
        departmentMatch._id = { $in: [] };
      }
    }

    const departmentTasks = await Task.aggregate([
      {
        $match: departmentMatch,
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
                { $in: ["$status", OPEN_STATUSES] },
                1,
                0,
              ],
            },
          },

          overdueTasks: {
            $sum: {
              $cond: [
                isTaskOverdue(now),
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const departmentIds = departmentTasks
      .map((item) => item._id)
      .filter(Boolean);

    const departments = departmentIds.length
      ? await Department.find({
          tenantId,
          _id: { $in: departmentIds },
        }).select("name")
      : [];

    const departmentNames = new Map(
      departments.map((department) => [
        department._id.toString(),
        department.name,
      ])
    );

    departmentPerformance = departmentTasks.map((item) => ({
      departmentId: item._id,

      departmentName:
        departmentNames.get(item._id?.toString()) || "Unknown",

      totalTasks: item.totalTasks,
      completedTasks: item.completedTasks,
      openTasks: item.openTasks,
      overdueTasks: item.overdueTasks,

      completionRate:
        item.totalTasks > 0
          ? Number(
              (
                (item.completedTasks / item.totalTasks) *
                100
              ).toFixed(1)
            )
          : 0,
    }));
  }

  // --------------------------------------------------
  // 8. FORMAT TASK ANALYTICS
  // --------------------------------------------------

  const taskAnalytics = {
    completionRate,

    activeTasks,
    unassignedTasks,

    dueSoon: dueSoonTasks,

    statusDistribution: statusDistribution.map((item) => ({
      status: item._id,
      count: item.count,
    })),

    priorityDistribution: priorityDistribution.map((item) => ({
      priority: item._id,
      count: item.count,
    })),

    employeePerformance,

    topPerformers: employeePerformance
      .filter((item) => item.completedTasks > 0)
      .slice(0, 5),
  };

  // --------------------------------------------------
  // 9. RETURN DASHBOARD RESPONSE
  // --------------------------------------------------

  return {
    period: {
      from: monthStart,
      to: now,
    },

    scope: {
      role: user.role,
      departmentId,
    },

    overview: {
      clients: {
        total: totalClients,
        newThisMonth: newClients,
      },

      leads: {
        total: totalLeads,
        newThisMonth: newLeads,
      },

      projects: {
        total: totalProjects,
        active: activeProjects,
      },

      tasks: {
        total: totalTasks,
        open: openTasks,
        overdue: overdueTasks,
        completed: completedTasks,
        dueSoon: dueSoonTasks,
        completionRate,
      },

      sales: {
        confirmedCount: salesCount,

        byCurrency: salesByCurrency.map((item) => ({
          currency: item._id || "EGP",
          amount: item.amount,
          count: item.count,
        })),
      },
    },

    taskAnalytics,

    finance: {
      available: isGeneralAdmin,

      incomeByCurrency: incomeByCurrency.map((item) => ({
        currency: item._id || "EGP",
        amount: item.amount,
      })),

      expensesByCurrency: expensesByCurrency.map((item) => ({
        currency: item._id || "EGP",
        amount: item.amount,
      })),
    },

    departmentPerformance,
  };
};

export default {
  getDashboardOverview,
};
