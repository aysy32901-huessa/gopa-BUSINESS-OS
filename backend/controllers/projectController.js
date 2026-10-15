
import mongoose from "mongoose";

import Project from "../models/Project.js";
import Client from "../models/Client.js";
import User from "../models/User.js";

import asyncHandler from "../utils/asyncHandler.js";

import { getClientAccessFilter } from "../middleware/tenantOwnership.js";

// ==================================================
// CONSTANTS
// ==================================================

const editableFields = [
  "name",
  "description",
  "client",
  "manager",
  "team",
  "status",
  "priority",
  "startDate",
  "dueDate",
  "budget",
  "contractValue",
  "currency",
  "progress",
];

const allowedStatuses = [
  "planning",
  "active",
  "on_hold",
  "completed",
  "cancelled",
];

const allowedPriorities = [
  "low",
  "medium",
  "high",
  "urgent",
];

// ==================================================
// ERROR HELPER
// ==================================================

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// ==================================================
// VALIDATION HELPERS
// ==================================================

const validateProjectId = (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw createError("Invalid project ID.");
  }
};

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePagination = (page, limit) => {
  const currentPage = Math.max(
    1,
    Number.parseInt(page, 10) || 1
  );

  const pageLimit = Math.min(
    100,
    Math.max(1, Number.parseInt(limit, 10) || 10)
  );

  return {
    currentPage,
    pageLimit,
    skip: (currentPage - 1) * pageLimit,
  };
};

const validateDate = (value, fieldName) => {
  if (value === null || value === "") {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw createError(`Invalid ${fieldName}.`);
  }

  return date;
};

const validateProjectDates = (startDate, dueDate) => {
  if (startDate && dueDate && dueDate < startDate) {
    throw createError(
      "Project due date cannot be earlier than start date."
    );
  }
};

// ==================================================
// PROJECT VALUE VALIDATION
// ==================================================

const validateProjectValues = (data) => {
  if (
    data.name !== undefined &&
    (
      typeof data.name !== "string" ||
      !data.name.trim()
    )
  ) {
    throw createError("Project name is required.");
  }

  if (
    data.status !== undefined &&
    !allowedStatuses.includes(data.status)
  ) {
    throw createError("Invalid project status.");
  }

  if (
    data.priority !== undefined &&
    !allowedPriorities.includes(data.priority)
  ) {
    throw createError("Invalid project priority.");
  }

  if (
    data.budget !== undefined &&
    (
      typeof data.budget !== "number" ||
      !Number.isFinite(data.budget) ||
      data.budget < 0
    )
  ) {
    throw createError(
      "Project budget must be a valid non-negative number."
    );
  }

  if (
    data.contractValue !== undefined &&
    (
      typeof data.contractValue !== "number" ||
      !Number.isFinite(data.contractValue) ||
      data.contractValue < 0
    )
  ) {
    throw createError(
      "Contract value must be a valid non-negative number."
    );
  }

  if (
    data.paidAmount !== undefined &&
    (
      typeof data.paidAmount !== "number" ||
      !Number.isFinite(data.paidAmount) ||
      data.paidAmount < 0
    )
  ) {
    throw createError(
      "Paid amount must be a valid non-negative number."
    );
  }

  if (
    data.progress !== undefined &&
    (
      typeof data.progress !== "number" ||
      !Number.isFinite(data.progress) ||
      data.progress < 0 ||
      data.progress > 100
    )
  ) {
    throw createError(
      "Project progress must be between 0 and 100."
    );
  }
};

// ==================================================
// PROJECT STATUS SYNCHRONIZATION
// ==================================================

const synchronizeProjectStatus = (project) => {
  if (project.status === "completed") {
    project.progress = 100;
    project.completedAt =
      project.completedAt || new Date();

    return;
  }

  if (project.progress === 100) {
    project.status = "completed";
    project.completedAt =
      project.completedAt || new Date();

    return;
  }

  project.completedAt = null;
};

// ==================================================
// PROJECT ACCESS FILTER
// ==================================================

const getProjectAccessFilter = async (req) => {
  const { tenantId, user } = req;

  if (user.role === "general_admin") {
    return { tenantId };
  }

  if (user.role === "employee") {
    return {
      tenantId,
      $or: [
        { manager: user.userId },
        { team: user.userId },
      ],
    };
  }

  if (user.role === "department_manager") {
    const departmentId = user.department;

    if (!departmentId) {
      return {
        tenantId,
        $or: [
          { manager: user.userId },
          { team: user.userId },
        ],
      };
    }

    const departmentUsers = await User.find({
      tenantId,
      department: departmentId,
      isActive: true,
    }).distinct("_id");

    const allowedUsers = [
      ...departmentUsers.map((id) => id.toString()),
      user.userId.toString(),
    ];

    const uniqueUsers = [...new Set(allowedUsers)];

    return {
      tenantId,
      $or: [
        { manager: { $in: uniqueUsers } },
        { team: { $in: uniqueUsers } },
      ],
    };
  }

  return {
    tenantId,
    _id: null,
  };
};

// ==================================================
// PROJECT MANAGER & TEAM VALIDATION
// ==================================================

const validateProjectMembers = async (
  req,
  { manager, team }
) => {
  const tenantId = req.tenantId;
  const role = req.user.role;

  let validatedManager = manager ?? null;

  // Department managers manage their own projects by default.
  if (role === "department_manager" && !validatedManager) {
    validatedManager = req.user.userId;
  }

  // Validate manager.
  if (validatedManager) {
    if (!mongoose.isValidObjectId(validatedManager)) {
      throw createError("Invalid project manager ID.");
    }

    const managerUser = await User.findOne({
      _id: validatedManager,
      tenantId,
      isActive: true,
    }).select("_id department");

    if (!managerUser) {
      throw createError(
        "The selected project manager does not belong to this company or is inactive."
      );
    }

    if (role === "department_manager") {
      const isSelf =
        managerUser._id.toString() ===
        req.user.userId.toString();

      const isSameDepartment =
        req.user.department &&
        managerUser.department &&
        managerUser.department.toString() ===
          req.user.department.toString();

      if (!isSelf && !isSameDepartment) {
        throw createError(
          "You can only select a project manager from your department.",
          403
        );
      }
    }
  }

  // Validate team array.
  if (team !== undefined && !Array.isArray(team)) {
    throw createError("Project team must be an array.");
  }

  const teamIds = team || [];

  if (
    teamIds.some((id) => !mongoose.isValidObjectId(id))
  ) {
    throw createError(
      "One or more project team IDs are invalid."
    );
  }

  const uniqueTeamIds = [
    ...new Set(teamIds.map((id) => id.toString())),
  ];

  let validatedTeam = [];

  if (uniqueTeamIds.length > 0) {
    const teamUsers = await User.find({
      _id: { $in: uniqueTeamIds },
      tenantId,
      isActive: true,
    }).select("_id department");

    if (teamUsers.length !== uniqueTeamIds.length) {
      throw createError(
        "One or more team members do not belong to this company or are inactive."
      );
    }

    if (role === "department_manager") {
      const invalidMember = teamUsers.some((member) => {
        const isSelf =
          member._id.toString() ===
          req.user.userId.toString();

        const isSameDepartment =
          req.user.department &&
          member.department &&
          member.department.toString() ===
            req.user.department.toString();

        return !isSelf && !isSameDepartment;
      });

      if (invalidMember) {
        throw createError(
          "You can only add employees from your department to the project team.",
          403
        );
      }
    }

    validatedTeam = teamUsers.map((member) => member._id);
  }

  return {
    manager: validatedManager,
    team: validatedTeam,
  };
};

// ==================================================
// CLIENT VALIDATION
// ==================================================

const validateProjectClient = async (req, clientId) => {
  if (!clientId) {
    return null;
  }

  if (!mongoose.isValidObjectId(clientId)) {
    throw createError("Invalid client ID.");
  }

  const clientAccessFilter = await getClientAccessFilter(req);

  const client = await Client.findOne({
    _id: clientId,
    ...clientAccessFilter,
  }).select("_id");

  if (!client) {
    throw createError(
      "The selected client was not found or you do not have access to it."
    );
  }

  return client._id;
};

// ==================================================
// POPULATE PROJECT
// ==================================================

const populateProject = (query) =>
  query
    .populate(
      "client",
      "companyName contactName email phone"
    )
    .populate(
      "manager",
      "firstName lastName email department"
    )
    .populate(
      "team",
      "firstName lastName email department"
    )
    .populate(
      "createdBy",
      "firstName lastName email"
    );

// ==================================================
// GET ALL PROJECTS
// GET /api/projects
// ==================================================

export const getProjects = asyncHandler(async (req, res) => {
  const accessFilter = await getProjectAccessFilter(req);

  const filter = { ...accessFilter };

  const {
    search = "",
    status,
    priority,
    paymentStatus,
    manager,
    page = 1,
    limit = 10,
  } = req.query;

  if (status) {
    if (!allowedStatuses.includes(status)) {
      throw createError("Invalid project status.");
    }

    filter.status = status;
  }

  if (priority) {
    if (!allowedPriorities.includes(priority)) {
      throw createError("Invalid project priority.");
    }

    filter.priority = priority;
  }

  if (paymentStatus) {
    if (!["unpaid", "partial", "paid"].includes(paymentStatus)) {
      throw createError("Invalid payment status.");
    }

    filter.paymentStatus = paymentStatus;
  }

  if (manager) {
    if (!mongoose.isValidObjectId(manager)) {
      throw createError("Invalid manager ID.");
    }

    filter.$and = [
      ...(filter.$and || []),
      {
        $or: [
          { manager },
          { team: manager },
        ],
      },
    ];
  }

  if (search.trim()) {
    const searchRegex = new RegExp(
      escapeRegex(search.trim()),
      "i"
    );

    filter.$and = [
      ...(filter.$and || []),
      {
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { currency: searchRegex },
        ],
      },
    ];
  }

  const { currentPage, pageLimit, skip } =
    parsePagination(page, limit);

  const [projects, total] = await Promise.all([
    populateProject(
      Project.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit)
    ).lean(),

    Project.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      projects,
      pagination: {
        total,
        page: currentPage,
        limit: pageLimit,
        totalPages: Math.ceil(total / pageLimit),
      },
    },
  });
});

// ==================================================
// GET SINGLE PROJECT
// GET /api/projects/:id
// ==================================================

export const getProjectById = asyncHandler(async (req, res) => {
  validateProjectId(req.params.id);

  const accessFilter = await getProjectAccessFilter(req);

  const project = await populateProject(
    Project.findOne({
      _id: req.params.id,
      ...accessFilter,
    })
  ).lean();

  if (!project) {
    res.status(404);
    throw new Error("Project not found.");
  }

  res.status(200).json({
    success: true,
    data: { project },
  });
});

// ==================================================
// CREATE PROJECT
// POST /api/projects
// ==================================================

export const createProject = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    client,
    manager,
    team,
    status,
    priority,
    startDate,
    dueDate,
    budget,
    contractValue,
    paidAmount,
    currency,
    progress,
  } = req.body;

  validateProjectValues({
    name,
    status,
    priority,
    budget,
    contractValue,
    paidAmount,
    progress,
  });

  const finalStartDate = validateDate(
    startDate,
    "start date"
  );

  const finalDueDate = validateDate(
    dueDate,
    "due date"
  );

  validateProjectDates(
    finalStartDate,
    finalDueDate
  );

  const finalContractValue = contractValue ?? 0;
  const finalPaidAmount = paidAmount ?? 0;

  if (finalPaidAmount > finalContractValue) {
    throw createError(
      "Paid amount cannot exceed the contract value."
    );
  }

  const validatedClient = await validateProjectClient(
    req,
    client
  );

  const validatedMembers = await validateProjectMembers(
    req,
    { manager, team }
  );

  const project = new Project({
    tenantId: req.tenantId,
    name: name.trim(),
    description,
    client: validatedClient,
    manager: validatedMembers.manager,
    team: validatedMembers.team,
    status: status || "planning",
    priority: priority || "medium",
    startDate: finalStartDate,
    dueDate: finalDueDate,
    budget: budget ?? 0,
    contractValue: finalContractValue,
    paidAmount: finalPaidAmount,
    currency: currency || "EGP",
    progress: progress ?? 0,
    createdBy: req.user.userId,
  });

  synchronizeProjectStatus(project);

  await project.save();

  const populatedProject = await populateProject(
    Project.findOne({
      _id: project._id,
      tenantId: req.tenantId,
    })
  );

  res.status(201).json({
    success: true,
    message: "Project created successfully.",
    data: { project: populatedProject },
  });
});

// ==================================================
// UPDATE PROJECT
// PUT /api/projects/:id
// ==================================================

export const updateProject = asyncHandler(async (req, res) => {
  validateProjectId(req.params.id);

  const accessFilter = await getProjectAccessFilter(req);

  const project = await Project.findOne({
    _id: req.params.id,
    ...accessFilter,
  });

  if (!project) {
    res.status(404);
    throw new Error("Project not found.");
  }

  const updates = {};

  for (const field of editableFields) {
    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        field
      )
    ) {
      updates[field] = req.body[field];
    }
  }

  validateProjectValues(updates);

  if (updates.name !== undefined) {
    updates.name = updates.name.trim();
  }

  const nextStartDate =
    updates.startDate !== undefined
      ? validateDate(updates.startDate, "start date")
      : project.startDate;

  const nextDueDate =
    updates.dueDate !== undefined
      ? validateDate(updates.dueDate, "due date")
      : project.dueDate;

  validateProjectDates(
    nextStartDate,
    nextDueDate
  );

  if (updates.startDate !== undefined) {
    updates.startDate = nextStartDate;
  }

  if (updates.dueDate !== undefined) {
    updates.dueDate = nextDueDate;
  }

  const nextContractValue =
    updates.contractValue !== undefined
      ? updates.contractValue
      : project.contractValue;

  if (project.paidAmount > nextContractValue) {
    throw createError(
      "Contract value cannot be less than the amount already paid."
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      updates,
      "client"
    )
  ) {
    updates.client = await validateProjectClient(
      req,
      updates.client
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      updates,
      "manager"
    ) ||
    Object.prototype.hasOwnProperty.call(
      updates,
      "team"
    )
  ) {
    const validatedMembers =
      await validateProjectMembers(req, {
        manager:
          updates.manager !== undefined
            ? updates.manager
            : project.manager,

        team:
          updates.team !== undefined
            ? updates.team
            : project.team,
      });

    if (updates.manager !== undefined) {
      updates.manager = validatedMembers.manager;
    }

    if (updates.team !== undefined) {
      updates.team = validatedMembers.team;
    }
  }

  Object.assign(project, updates);

  synchronizeProjectStatus(project);

  await project.save();

  const updatedProject = await populateProject(
    Project.findOne({
      _id: project._id,
      tenantId: req.tenantId,
    })
  );

  res.status(200).json({
    success: true,
    message: "Project updated successfully.",
    data: { project: updatedProject },
  });
});

// ==================================================
// UPDATE PROJECT PROGRESS
// PATCH /api/projects/:id/progress
// ==================================================

export const updateProjectProgress = asyncHandler(
  async (req, res) => {
    validateProjectId(req.params.id);

    const { progress } = req.body;

    validateProjectValues({ progress });

    const accessFilter = await getProjectAccessFilter(req);

    const project = await Project.findOne({
      _id: req.params.id,
      ...accessFilter,
    });

    if (!project) {
      res.status(404);
      throw new Error("Project not found.");
    }

    project.progress = progress;

    synchronizeProjectStatus(project);

    await project.save();

    const updatedProject = await populateProject(
      Project.findOne({
        _id: project._id,
        tenantId: req.tenantId,
      })
    );

    res.status(200).json({
      success: true,
      message: "Project progress updated successfully.",
      data: { project: updatedProject },
    });
  }
);

// ==================================================
// UPDATE PROJECT PAYMENT
// PATCH /api/projects/:id/payment
// ==================================================

export const updateProjectPayment = asyncHandler(
  async (req, res) => {
    validateProjectId(req.params.id);

    const { paidAmount } = req.body;

    validateProjectValues({ paidAmount });

    const project = await Project.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    });

    if (!project) {
      res.status(404);
      throw new Error("Project not found.");
    }

    if (paidAmount > project.contractValue) {
      throw createError(
        "Paid amount cannot exceed the contract value."
      );
    }

    project.paidAmount = paidAmount;

    await project.save();

    const updatedProject = await populateProject(
      Project.findOne({
        _id: project._id,
        tenantId: req.tenantId,
      })
    );

    res.status(200).json({
      success: true,
      message: "Project payment updated successfully.",
      data: {
        project: updatedProject,
      },
    });
  }
);

// ==================================================
// DELETE PROJECT
// DELETE /api/projects/:id
// ==================================================

export const deleteProject = asyncHandler(async (req, res) => {
  validateProjectId(req.params.id);

  const accessFilter = await getProjectAccessFilter(req);

  const project = await Project.findOneAndDelete({
    _id: req.params.id,
    ...accessFilter,
  });

  if (!project) {
    res.status(404);
    throw new Error("Project not found.");
  }

  res.status(200).json({
    success: true,
    message: "Project deleted successfully.",
  });
});
