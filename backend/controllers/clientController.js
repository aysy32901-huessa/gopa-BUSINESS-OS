
import mongoose from "mongoose";
import Client from "../models/Client.js";
import asyncHandler from "../utils/asyncHandler.js";

import {
  getClientAccessFilter,
  validateClientAssignee,
} from "../middleware/tenantOwnership.js";

const editableFields = [
  "companyName",
  "contactName",
  "email",
  "phone",
  "industry",
  "source",
  "status",
  "notes",
];

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const validateClientId = (id) => {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error("Invalid client ID.");
    error.statusCode = 400;
    throw error;
  }
};

// GET /api/clients
export const getClients = asyncHandler(async (req, res) => {
  const accessFilter = await getClientAccessFilter(req);
  const filter = { ...accessFilter };

  const {
    search = "",
    status,
    assignedTo,
    page = 1,
    limit = 10,
  } = req.query;

  if (status) {
    if (!["active", "inactive"].includes(status)) {
      res.status(400);
      throw new Error("Invalid client status.");
    }

    filter.status = status;
  }

  if (assignedTo) {
    if (!mongoose.isValidObjectId(assignedTo)) {
      res.status(400);
      throw new Error("Invalid employee ID.");
    }

    // Preserve the user's existing access restrictions.
    if (accessFilter.assignedTo) {
      filter.$and = [
        ...(filter.$and || []),
        { assignedTo },
      ];
    } else {
      filter.assignedTo = assignedTo;
    }
  }

  if (search.trim()) {
    const searchRegex = new RegExp(
      escapeRegex(search.trim()),
      "i"
    );

    filter.$or = [
      { companyName: searchRegex },
      { contactName: searchRegex },
      { email: searchRegex },
      { phone: searchRegex },
    ];
  }

  const currentPage = Math.max(
    1,
    Number.parseInt(page, 10) || 1
  );

  const pageLimit = Math.min(
    100,
    Math.max(1, Number.parseInt(limit, 10) || 10)
  );

  const skip = (currentPage - 1) * pageLimit;

  const [clients, total] = await Promise.all([
    Client.find(filter)
      .populate("assignedTo", "firstName lastName email")
      .populate("createdBy", "firstName lastName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit)
      .lean(),

    Client.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      clients,
      pagination: {
        total,
        page: currentPage,
        limit: pageLimit,
        totalPages: Math.ceil(total / pageLimit),
      },
    },
  });
});

// GET /api/clients/:id
export const getClientById = asyncHandler(async (req, res) => {
  validateClientId(req.params.id);

  const accessFilter = await getClientAccessFilter(req);

  const client = await Client.findOne({
    _id: req.params.id,
    ...accessFilter,
  })
    .populate("assignedTo", "firstName lastName email department")
    .populate("createdBy", "firstName lastName")
    .lean();

  if (!client) {
    res.status(404);
    throw new Error("Client not found.");
  }

  res.status(200).json({
    success: true,
    data: { client },
  });
});

// POST /api/clients
export const createClient = asyncHandler(async (req, res) => {
  const {
    companyName,
    contactName,
    email,
    phone,
    industry,
    source,
    status,
    assignedTo,
    notes,
  } = req.body;

  if (
    typeof companyName !== "string" ||
    !companyName.trim()
  ) {
    res.status(400);
    throw new Error("Client company name is required.");
  }

  if (
    status !== undefined &&
    !["active", "inactive"].includes(status)
  ) {
    res.status(400);
    throw new Error("Invalid client status.");
  }

  let finalAssignee = assignedTo;

  // Department managers assign new clients to themselves by default.
  if (
    req.user.role === "department_manager" &&
    !finalAssignee
  ) {
    finalAssignee = req.user.userId;
  }

  const validatedAssignee = await validateClientAssignee(
    req,
    finalAssignee
  );

  const client = await Client.create({
    tenantId: req.tenantId,
    companyName: companyName.trim(),
    contactName,
    email,
    phone,
    industry,
    source,
    status,
    assignedTo: validatedAssignee,
    notes,
    createdBy: req.user.userId,
  });

  const populatedClient = await Client.findOne({
    _id: client._id,
    tenantId: req.tenantId,
  })
    .populate("assignedTo", "firstName lastName email")
    .populate("createdBy", "firstName lastName");

  res.status(201).json({
    success: true,
    message: "Client created successfully.",
    data: { client: populatedClient },
  });
});

// PUT /api/clients/:id
export const updateClient = asyncHandler(async (req, res) => {
  validateClientId(req.params.id);

  const accessFilter = await getClientAccessFilter(req);

  const client = await Client.findOne({
    _id: req.params.id,
    ...accessFilter,
  });

  if (!client) {
    res.status(404);
    throw new Error("Client not found.");
  }

  for (const field of editableFields) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      client[field] = req.body[field];
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(req.body, "companyName") &&
    (
      typeof req.body.companyName !== "string" ||
      !req.body.companyName.trim()
    )
  ) {
    res.status(400);
    throw new Error("Client company name cannot be empty.");
  }

  if (
    Object.prototype.hasOwnProperty.call(req.body, "status") &&
    !["active", "inactive"].includes(req.body.status)
  ) {
    res.status(400);
    throw new Error("Invalid client status.");
  }

  if (
    Object.prototype.hasOwnProperty.call(req.body, "assignedTo")
  ) {
    client.assignedTo = await validateClientAssignee(
      req,
      req.body.assignedTo
    );
  }

  await client.save();

  const updatedClient = await Client.findOne({
    _id: client._id,
    tenantId: req.tenantId,
  })
    .populate("assignedTo", "firstName lastName email")
    .populate("createdBy", "firstName lastName");

  res.status(200).json({
    success: true,
    message: "Client updated successfully.",
    data: { client: updatedClient },
  });
});

// DELETE /api/clients/:id
export const deleteClient = asyncHandler(async (req, res) => {
  validateClientId(req.params.id);

  const accessFilter = await getClientAccessFilter(req);

  const client = await Client.findOneAndDelete({
    _id: req.params.id,
    ...accessFilter,
  });

  if (!client) {
    res.status(404);
    throw new Error("Client not found.");
  }

  res.status(200).json({
    success: true,
    message: "Client deleted successfully.",
  });
});
