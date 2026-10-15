
import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import Client from "../models/Client.js";
import asyncHandler from "../utils/asyncHandler.js";

import {
  getClientAccessFilter,
  validateClientAssignee,
} from "../middleware/tenantOwnership.js";

const editableFields = [
  "name",
  "companyName",
  "email",
  "phone",
  "source",
  "status",
  "estimatedValue",
  "currency",
  "expectedCloseDate",
  "notes",
];

const validStatuses = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const validateLeadId = (id) => {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error("Invalid lead ID.");
    error.statusCode = 400;
    throw error;
  }
};

// GET /api/leads
export const getLeads = asyncHandler(async (req, res) => {
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
    if (!validStatuses.includes(status)) {
      res.status(400);
      throw new Error("Invalid lead status.");
    }

    filter.status = status;
  }

  if (assignedTo) {
    if (!mongoose.isValidObjectId(assignedTo)) {
      res.status(400);
      throw new Error("Invalid employee ID.");
    }

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
      { name: searchRegex },
      { companyName: searchRegex },
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

  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .populate("assignedTo", "firstName lastName email")
      .populate("createdBy", "firstName lastName")
      .populate("convertedClient", "companyName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit)
      .lean(),

    Lead.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      leads,
      pagination: {
        total,
        page: currentPage,
        limit: pageLimit,
        totalPages: Math.ceil(total / pageLimit),
      },
    },
  });
});

// GET /api/leads/:id
export const getLeadById = asyncHandler(async (req, res) => {
  validateLeadId(req.params.id);

  const accessFilter = await getClientAccessFilter(req);

  const lead = await Lead.findOne({
    _id: req.params.id,
    ...accessFilter,
  })
    .populate("assignedTo", "firstName lastName email department")
    .populate("createdBy", "firstName lastName")
    .populate("convertedClient", "companyName email phone")
    .lean();

  if (!lead) {
    res.status(404);
    throw new Error("Lead not found.");
  }

  res.status(200).json({
    success: true,
    data: { lead },
  });
});

// POST /api/leads
export const createLead = asyncHandler(async (req, res) => {
  const {
    name,
    companyName,
    email,
    phone,
    source,
    status,
    estimatedValue,
    currency,
    expectedCloseDate,
    assignedTo,
    notes,
  } = req.body;

  if (typeof name !== "string" || !name.trim()) {
    res.status(400);
    throw new Error("Lead name is required.");
  }

  if (status && !validStatuses.includes(status)) {
    res.status(400);
    throw new Error("Invalid lead status.");
  }

  let finalAssignee = assignedTo;

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

  const lead = await Lead.create({
    tenantId: req.tenantId,
    name: name.trim(),
    companyName,
    email,
    phone,
    source,
    status,
    estimatedValue,
    currency,
    expectedCloseDate,
    assignedTo: validatedAssignee,
    notes,
    createdBy: req.user.userId,
  });

  const populatedLead = await Lead.findOne({
    _id: lead._id,
    tenantId: req.tenantId,
  })
    .populate("assignedTo", "firstName lastName email")
    .populate("createdBy", "firstName lastName");

  res.status(201).json({
    success: true,
    message: "Lead created successfully.",
    data: { lead: populatedLead },
  });
});

// PUT /api/leads/:id
export const updateLead = asyncHandler(async (req, res) => {
  validateLeadId(req.params.id);

  const accessFilter = await getClientAccessFilter(req);

  const lead = await Lead.findOne({
    _id: req.params.id,
    ...accessFilter,
  });

  if (!lead) {
    res.status(404);
    throw new Error("Lead not found.");
  }

  for (const field of editableFields) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      lead[field] = req.body[field];
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(req.body, "name") &&
    (
      typeof req.body.name !== "string" ||
      !req.body.name.trim()
    )
  ) {
    res.status(400);
    throw new Error("Lead name cannot be empty.");
  }

  if (
    Object.prototype.hasOwnProperty.call(req.body, "status") &&
    !validStatuses.includes(req.body.status)
  ) {
    res.status(400);
    throw new Error("Invalid lead status.");
  }

  if (
    Object.prototype.hasOwnProperty.call(req.body, "assignedTo")
  ) {
    lead.assignedTo = await validateClientAssignee(
      req,
      req.body.assignedTo
    );
  }

  await lead.save();

  const updatedLead = await Lead.findOne({
    _id: lead._id,
    tenantId: req.tenantId,
  })
    .populate("assignedTo", "firstName lastName email")
    .populate("createdBy", "firstName lastName")
    .populate("convertedClient", "companyName");

  res.status(200).json({
    success: true,
    message: "Lead updated successfully.",
    data: { lead: updatedLead },
  });
});

// POST /api/leads/:id/convert
// Convert a won lead into a real client.
export const convertLead = asyncHandler(async (req, res) => {
  validateLeadId(req.params.id);

  const accessFilter = await getClientAccessFilter(req);

  const lead = await Lead.findOne({
    _id: req.params.id,
    ...accessFilter,
  });

  if (!lead) {
    res.status(404);
    throw new Error("Lead not found.");
  }

  // Prevent creating duplicate clients.
  if (lead.convertedClient) {
    const existingClient = await Client.findOne({
      _id: lead.convertedClient,
      tenantId: req.tenantId,
    });

    if (existingClient) {
      res.status(200);
      return res.json({
        success: true,
        message: "This lead has already been converted.",
        data: { client: existingClient },
      });
    }
  }

  if (lead.status !== "won") {
    res.status(400);
    throw new Error(
      "Only won leads can be converted into clients."
    );
  }

  // Use a transaction so the lead and client are updated together.
  const session = await mongoose.startSession();

  let clientId;

  try {
    await session.withTransaction(async () => {
      const [client] = await Client.create(
        [
          {
            tenantId: req.tenantId,
            companyName: (
              lead.companyName || lead.name
            ).trim(),
            contactName: lead.name,
            email: lead.email,
            phone: lead.phone,
            source: lead.source,
            status: "active",
            assignedTo: lead.assignedTo,
            notes: lead.notes,
            createdBy: req.user.userId,
          },
        ],
        { session }
      );

      lead.convertedClient = client._id;
      await lead.save({ session });

      clientId = client._id;
    });
  } finally {
    await session.endSession();
  }

  const convertedClient = await Client.findOne({
    _id: clientId,
    tenantId: req.tenantId,
  })
    .populate("assignedTo", "firstName lastName email")
    .populate("createdBy", "firstName lastName");

  res.status(201).json({
    success: true,
    message: "Lead converted into a client successfully.",
    data: { client: convertedClient },
  });
});

// DELETE /api/leads/:id
export const deleteLead = asyncHandler(async (req, res) => {
  validateLeadId(req.params.id);

  const accessFilter = await getClientAccessFilter(req);

  const lead = await Lead.findOneAndDelete({
    _id: req.params.id,
    ...accessFilter,
  });

  if (!lead) {
    res.status(404);
    throw new Error("Lead not found.");
  }

  res.status(200).json({
    success: true,
    message: "Lead deleted successfully.",
  });
});
