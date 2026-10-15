
import crypto from "crypto";

import Sale from "../models/Sale.js";
import Client from "../models/Client.js";
import Lead from "../models/Lead.js";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import asyncHandler from "../utils/asyncHandler.js";

// ==================================================
// HELPERS
// ==================================================

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getTenantId = (req) =>
  req.tenantId || req.user?.tenantId;

const validateObjectId = (id, fieldName = "ID") => {
  if (id && !/^[a-f\d]{24}$/i.test(String(id))) {
    throw createError(`${fieldName} is invalid.`);
  }
};

const getSaleScope = async (req) => {
  const tenantId = getTenantId(req);
  const role = req.user.role;

  const filter = { tenantId };

  if (role === "general_admin") {
    return filter;
  }

  if (role === "employee") {
    filter.assignedTo = req.user.userId;
    return filter;
  }

  if (role === "department_manager") {
    if (!req.user.department) {
      filter._id = { $in: [] };
      return filter;
    }

    const members = await User.find({
      tenantId,
      department: req.user.department,
      isActive: true,
    }).select("_id");

    filter.assignedTo = {
      $in: [
        ...members.map((member) => member._id),
        req.user.userId,
      ],
    };

    return filter;
  }

  throw createError("You are not authorized.", 403);
};

const populateSale = (query) =>
  query
    .populate("client", "companyName contactName email")
    .populate("lead", "name companyName email")
    .populate("assignedTo", "firstName lastName email")
    .populate("createdBy", "firstName lastName");

const validateReference = async ({
  Model,
  id,
  tenantId,
  fieldName,
}) => {
  if (!id) return null;

  validateObjectId(id, fieldName);

  const record = await Model.findOne({
    _id: id,
    tenantId,
  }).select("_id");

  if (!record) {
    throw createError(`${fieldName} was not found in this company.`, 404);
  }

  return record._id;
};

const getSaleFinancials = async (saleId, tenantId) => {
  const result = await Transaction.aggregate([
    {
      $match: {
        tenantId,
        sale: saleId,
        category: {
          $in: ["sale_payment", "sale_refund"],
        },
      },
    },
    {
      $group: {
        _id: "$category",
        total: { $sum: "$amount" },
      },
    },
  ]);

  const income =
    result.find((item) => item._id === "sale_payment")?.total || 0;

  const refunds =
    result.find((item) => item._id === "sale_refund")?.total || 0;

  return {
    paidAmount: Math.max(0, income - refunds),
    collectedAmount: income,
    refundedAmount: refunds,
  };
};

const generateSaleNumber = () =>
  `SAL-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

// ==================================================
// GET ALL SALES
// GET /api/sales
// ==================================================

const getSales = asyncHandler(async (req, res) => {
  const scope = await getSaleScope(req);

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  const filter = { ...scope };

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.paymentStatus) {
    filter.paymentStatus = req.query.paymentStatus;
  }

  if (req.query.assignedTo) {
    validateObjectId(req.query.assignedTo, "Assigned user");
    filter.assignedTo = req.query.assignedTo;
  }

  if (req.query.search?.trim()) {
    const search = req.query.search.trim().slice(0, 100);
    const regex = new RegExp(
      search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i"
    );

    filter.$or = [
      { saleNumber: regex },
      { title: regex },
    ];
  }

  if (req.query.from || req.query.to) {
    filter.saleDate = {};

    if (req.query.from) {
      const from = new Date(req.query.from);
      if (Number.isNaN(from.getTime())) {
        throw createError("Invalid start date.");
      }
      filter.saleDate.$gte = from;
    }

    if (req.query.to) {
      const to = new Date(req.query.to);
      if (Number.isNaN(to.getTime())) {
        throw createError("Invalid end date.");
      }
      filter.saleDate.$lte = to;
    }
  }

  const [sales, total] = await Promise.all([
    populateSale(
      Sale.find(filter)
        .sort({ saleDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
    ),
    Sale.countDocuments(filter),
  ]);

  const salesWithFinancials = await Promise.all(
    sales.map(async (sale) => {
      const financials = await getSaleFinancials(
        sale._id,
        scope.tenantId
      );

      return {
        ...sale.toObject(),
        financials: {
          ...financials,
          remainingAmount: Math.max(
            0,
            sale.amount - financials.paidAmount
          ),
        },
      };
    })
  );

  res.status(200).json({
    success: true,
    data: {
      sales: salesWithFinancials,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

// ==================================================
// GET SALE BY ID
// GET /api/sales/:id
// ==================================================

const getSaleById = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id, "Sale ID");

  const scope = await getSaleScope(req);

  const sale = await populateSale(
    Sale.findOne({
      _id: req.params.id,
      ...scope,
    })
  );

  if (!sale) {
    throw createError("Sale not found.", 404);
  }

  const financials = await getSaleFinancials(
    sale._id,
    scope.tenantId
  );

  res.status(200).json({
    success: true,
    data: {
      sale: {
        ...sale.toObject(),
        financials: {
          ...financials,
          remainingAmount: Math.max(
            0,
            sale.amount - financials.paidAmount
          ),
        },
      },
    },
  });
});

// ==================================================
// CREATE SALE
// POST /api/sales
// ==================================================

const createSale = asyncHandler(async (req, res) => {
  const tenantId = getTenantId(req);

  const {
    title,
    amount,
    currency,
    client,
    lead,
    assignedTo,
    paymentMethod,
    saleDate,
    notes,
  } = req.body;

  if (!title?.trim()) {
    throw createError("Sale title is required.");
  }

  if (
    amount === undefined ||
    !Number.isFinite(Number(amount)) ||
    Number(amount) <= 0
  ) {
    throw createError("Sale amount must be greater than zero.");
  }

  if (client && lead) {
    throw createError("A sale can be linked to a client or a lead, not both.");
  }

  const clientId = await validateReference({
    Model: Client,
    id: client,
    tenantId,
    fieldName: "Client",
  });

  const leadId = await validateReference({
    Model: Lead,
    id: lead,
    tenantId,
    fieldName: "Lead",
  });

  const assignedToId = await validateReference({
    Model: User,
    id: assignedTo || req.user.userId,
    tenantId,
    fieldName: "Assigned user",
  });

  const assignedUser = await User.findOne({
    _id: assignedToId,
    tenantId,
    isActive: true,
  }).select("_id role department");

  if (!assignedUser) {
    throw createError("Assigned user is inactive or unavailable.");
  }

  if (
    req.user.role === "department_manager" &&
    String(assignedUser.department) !== String(req.user.department)
  ) {
    throw createError(
      "You can only assign sales to members of your department.",
      403
    );
  }

  const parsedDate = saleDate ? new Date(saleDate) : new Date();

  if (Number.isNaN(parsedDate.getTime())) {
    throw createError("Invalid sale date.");
  }

  const sale = await Sale.create({
    tenantId,
    saleNumber: generateSaleNumber(),
    title: title.trim(),
    amount: Number(amount),
    currency: currency || "EGP",
    client: clientId,
    lead: leadId,
    assignedTo: assignedToId,
    paymentMethod: paymentMethod || "other",
    saleDate: parsedDate,
    status: "pending",
    paymentStatus: "unpaid",
    createdBy: req.user.userId,
    notes: notes || "",
  });

  const populatedSale = await populateSale(
    Sale.findById(sale._id)
  );

  res.status(201).json({
    success: true,
    message: "Sale created successfully.",
    data: {
      sale: populatedSale,
      financials: {
        paidAmount: 0,
        refundedAmount: 0,
        remainingAmount: sale.amount,
      },
    },
  });
});

// ==================================================
// UPDATE SALE
// PUT /api/sales/:id
// ==================================================

const updateSale = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id, "Sale ID");

  const scope = await getSaleScope(req);

  const sale = await Sale.findOne({
    _id: req.params.id,
    ...scope,
  });

  if (!sale) {
    throw createError("Sale not found.", 404);
  }

  if (sale.status === "cancelled" || sale.status === "refunded") {
    throw createError("Cancelled or refunded sales cannot be edited.");
  }

  const {
    title,
    amount,
    currency,
    client,
    lead,
    assignedTo,
    status,
    paymentMethod,
    saleDate,
    notes,
  } = req.body;

  if (title !== undefined) {
    if (!title.trim()) throw createError("Sale title is required.");
    sale.title = title.trim();
  }

  if (amount !== undefined) {
    const value = Number(amount);

    if (!Number.isFinite(value) || value <= 0) {
      throw createError("Sale amount must be greater than zero.");
    }

    const financials = await getSaleFinancials(
      sale._id,
      sale.tenantId
    );

    if (value < financials.paidAmount) {
      throw createError(
        "Sale amount cannot be lower than the amount already collected."
      );
    }

    sale.amount = value;
  }

  if (currency !== undefined) {
  const hasTransactions = await Transaction.exists({
    tenantId: sale.tenantId,
    sale: sale._id,
  });

  if (hasTransactions && currency.toUpperCase() !== sale.currency) {
    throw createError(
      "Sale currency cannot be changed after financial transactions have been recorded."
    );
  }

  sale.currency = currency.toUpperCase();
}

  if (client !== undefined) {
    if (client && lead) {
      throw createError("A sale can be linked to a client or a lead, not both.");
    }

    sale.client = await validateReference({
      Model: Client,
      id: client,
      tenantId: sale.tenantId,
      fieldName: "Client",
    });
  }

  if (lead !== undefined) {
    if (lead && client) {
      throw createError("A sale can be linked to a client or a lead, not both.");
    }

    sale.lead = await validateReference({
      Model: Lead,
      id: lead,
      tenantId: sale.tenantId,
      fieldName: "Lead",
    });
  }

  if (assignedTo !== undefined) {
    const assignedToId = await validateReference({
      Model: User,
      id: assignedTo,
      tenantId: sale.tenantId,
      fieldName: "Assigned user",
    });

    const assignedUser = await User.findOne({
      _id: assignedToId,
      tenantId: sale.tenantId,
      isActive: true,
    }).select("_id department");

    if (!assignedUser) {
      throw createError("Assigned user is inactive or unavailable.");
    }

    if (
      req.user.role === "department_manager" &&
      String(assignedUser.department) !== String(req.user.department)
    ) {
      throw createError("You cannot assign this sale outside your department.", 403);
    }

    sale.assignedTo = assignedToId;
  }

  if (status !== undefined) {
    if (!["pending", "confirmed", "cancelled"].includes(status)) {
      throw createError("Invalid sale status.");
    }

    if (status === "cancelled") {
      const financials = await getSaleFinancials(
        sale._id,
        sale.tenantId
      );

      if (financials.paidAmount > 0) {
        throw createError(
          "A sale with collected payments cannot be cancelled. Record a refund first."
        );
      }
    }

    sale.status = status;
  }

  if (paymentMethod !== undefined) {
    sale.paymentMethod = paymentMethod;
  }

  if (saleDate !== undefined) {
    const parsedDate = new Date(saleDate);

    if (Number.isNaN(parsedDate.getTime())) {
      throw createError("Invalid sale date.");
    }

    sale.saleDate = parsedDate;
  }

  if (notes !== undefined) {
    sale.notes = notes;
  }

  // Payment status is controlled by the transaction ledger.
  await sale.save();

  const populatedSale = await populateSale(
    Sale.findById(sale._id)
  );

  const financials = await getSaleFinancials(
    sale._id,
    sale.tenantId
  );

  res.status(200).json({
    success: true,
    message: "Sale updated successfully.",
    data: {
      sale: populatedSale,
      financials: {
        ...financials,
        remainingAmount: Math.max(
          0,
          sale.amount - financials.paidAmount
        ),
      },
    },
  });
});

// ==================================================
// EXPORTS
// ==================================================

export {
  getSales,
  getSaleById,
  createSale,
  updateSale,
};