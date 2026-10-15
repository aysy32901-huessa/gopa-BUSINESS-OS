
import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";
import Sale from "../models/Sale.js";
import asyncHandler from "../utils/asyncHandler.js";

const PAYMENT_METHODS = [
  "cash",
  "bank_transfer",
  "card",
  "online",
  "other",
];

const FINANCE_ROLE = "general_admin";

const getTenantId = (req) => {
  return req.tenantId || req.user?.tenantId;
};

const getUserId = (req) => {
  return req.user?.userId || req.user?._id;
};

const ensureFinanceAccess = (req) => {
  if (req.user?.role !== FINANCE_ROLE) {
    const error = new Error("You are not authorized to access financial records");
    error.statusCode = 403;
    throw error;
  }
};

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const validateObjectId = (id, fieldName = "ID") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError(`Invalid ${fieldName}`);
  }
};

const getFinancialSummary = async (saleId, tenantId, session = null) => {
  const pipeline = [
    {
      $match: {
        tenantId: new mongoose.Types.ObjectId(tenantId),
        sale: new mongoose.Types.ObjectId(saleId),
        category: { $in: ["sale_payment", "sale_refund"] },
      },
    },
    {
      $group: {
        _id: "$category",
        total: { $sum: "$amount" },
      },
    },
  ];

  const aggregate = Transaction.aggregate(pipeline);

  if (session) {
    aggregate.session(session);
  }

  const results = await aggregate;

  const collected = results.find(
    (item) => item._id === "sale_payment"
  )?.total || 0;

  const refunded = results.find(
    (item) => item._id === "sale_refund"
  )?.total || 0;

  const netPaid = Math.max(0, collected - refunded);

  return {
    collected,
    refunded,
    paidAmount: netPaid,
  };
};

const synchronizeSalePaymentStatus = async (
  sale,
  tenantId,
  session
) => {
  const financials = await getFinancialSummary(
    sale._id,
    tenantId,
    session
  );

  let paymentStatus = "unpaid";
  let saleStatus = sale.status;

  if (financials.refunded > 0 && financials.paidAmount === 0) {
    paymentStatus = "refunded";
    saleStatus = "refunded";
  } else if (financials.paidAmount >= sale.amount) {
    paymentStatus = "paid";
  } else if (financials.paidAmount > 0) {
    paymentStatus = "partially_paid";
  }

  await Sale.updateOne(
    {
      _id: sale._id,
      tenantId,
    },
    {
      $set: {
        paymentStatus,
        status: saleStatus,
      },
    },
    { session }
  );

  return {
    ...financials,
    remainingAmount: Math.max(0, sale.amount - financials.paidAmount),
    paymentStatus,
    saleStatus,
    saleAmount: sale.amount,
    currency: sale.currency,
  };
};

const populateTransaction = (query) => {
  return query
    .populate("createdBy", "firstName lastName email")
    .populate("sale", "saleNumber title amount currency status");
};

// ==========================================
// GET ALL TRANSACTIONS
// ==========================================

export const getTransactions = asyncHandler(async (req, res) => {
  ensureFinanceAccess(req);

  const tenantId = getTenantId(req);

  const {
    type,
    category,
    paymentMethod,
    currency,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = req.query;

  const filter = { tenantId };

  if (type) {
    if (!["income", "expense"].includes(type)) {
      throw createError("Invalid transaction type");
    }

    filter.type = type;
  }

  if (category) {
    filter.category = category;
  }

  if (paymentMethod) {
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      throw createError("Invalid payment method");
    }

    filter.paymentMethod = paymentMethod;
  }

  if (currency) {
    filter.currency = currency.toUpperCase();
  }

  if (startDate || endDate) {
    filter.transactionDate = {};

    if (startDate) {
      const start = new Date(startDate);

      if (Number.isNaN(start.getTime())) {
        throw createError("Invalid start date");
      }

      filter.transactionDate.$gte = start;
    }

    if (endDate) {
      const end = new Date(endDate);

      if (Number.isNaN(end.getTime())) {
        throw createError("Invalid end date");
      }

      end.setHours(23, 59, 59, 999);
      filter.transactionDate.$lte = end;
    }

    if (
      filter.transactionDate.$gte &&
      filter.transactionDate.$lte &&
      filter.transactionDate.$gte > filter.transactionDate.$lte
    ) {
      throw createError("Start date must be before end date");
    }
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (safePage - 1) * safeLimit;

  const [transactions, total] = await Promise.all([
    populateTransaction(
      Transaction.find(filter)
        .sort({ transactionDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
    ),
    Transaction.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: transactions.length,
    total,
    pagination: {
      page: safePage,
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit),
    },
    transactions,
  });
});

// ==========================================
// CREATE GENERAL INCOME / EXPENSE
// ==========================================

export const createTransaction = asyncHandler(async (req, res) => {
  ensureFinanceAccess(req);

  const tenantId = getTenantId(req);
  const createdBy = getUserId(req);

  const {
    type,
    category,
    description,
    amount,
    currency = "EGP",
    transactionDate,
    paymentMethod = "other",
    notes,
    sale,
  } = req.body;

  if (!["income", "expense"].includes(type)) {
    throw createError("Transaction type must be income or expense");
  }

  if (!category || !category.trim()) {
    throw createError("Transaction category is required");
  }

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw createError("Transaction amount must be greater than zero");
  }

  if (sale) {
    throw createError(
      "Sale transactions must be recorded through the sale payment or refund endpoints"
    );
  }

  if (
    category.trim() === "sale_payment" ||
    category.trim() === "sale_refund"
  ) {
    throw createError(
      "This category is reserved for sale payment operations"
    );
  }

  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    throw createError("Invalid payment method");
  }

  const date = transactionDate
    ? new Date(transactionDate)
    : new Date();

  if (Number.isNaN(date.getTime())) {
    throw createError("Invalid transaction date");
  }

  const transaction = await Transaction.create({
    tenantId,
    type,
    category: category.trim(),
    description,
    amount: numericAmount,
    currency: String(currency).toUpperCase(),
    transactionDate: date,
    paymentMethod,
    createdBy,
    notes,
    sale: null,
  });

  const populatedTransaction = await populateTransaction(
    Transaction.findById(transaction._id)
  );

  res.status(201).json({
    success: true,
    message: "Transaction created successfully",
    transaction: populatedTransaction,
  });
});

// ==========================================
// GET TRANSACTIONS FOR A SPECIFIC SALE
// ==========================================

export const getSaleTransactions = asyncHandler(async (req, res) => {
  ensureFinanceAccess(req);

  const tenantId = getTenantId(req);
  const { saleId } = req.params;

  validateObjectId(saleId, "sale ID");

  const sale = await Sale.findOne({
    _id: saleId,
    tenantId,
  });

  if (!sale) {
    throw createError("Sale not found", 404);
  }

  const transactions = await populateTransaction(
    Transaction.find({
      tenantId,
      sale: saleId,
    }).sort({ transactionDate: -1, createdAt: -1 })
  );

  const financials = await getFinancialSummary(saleId, tenantId);

  res.status(200).json({
    success: true,
    sale: {
      _id: sale._id,
      saleNumber: sale.saleNumber,
      title: sale.title,
      amount: sale.amount,
      currency: sale.currency,
      status: sale.status,
      paymentStatus: sale.paymentStatus,
    },
    financials: {
      ...financials,
      remainingAmount: Math.max(
        0,
        sale.amount - financials.paidAmount
      ),
    },
    transactions,
  });
});

// ==========================================
// RECORD SALE PAYMENT
// ==========================================

export const recordSalePayment = asyncHandler(async (req, res) => {
  ensureFinanceAccess(req);

  const tenantId = getTenantId(req);
  const createdBy = getUserId(req);
  const { saleId } = req.params;

  const {
    amount,
    paymentMethod = "other",
    transactionDate,
    description,
    notes,
  } = req.body;

  validateObjectId(saleId, "sale ID");

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw createError("Payment amount must be greater than zero");
  }

  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    throw createError("Invalid payment method");
  }

  const date = transactionDate
    ? new Date(transactionDate)
    : new Date();

  if (Number.isNaN(date.getTime())) {
    throw createError("Invalid transaction date");
  }

  const session = await mongoose.startSession();

  let result;

  try {
    await session.withTransaction(async () => {
      const sale = await Sale.findOne({
        _id: saleId,
        tenantId,
      }).session(session);

      if (!sale) {
        throw createError("Sale not found", 404);
      }

      if (sale.status !== "confirmed") {
        throw createError(
          "Payments can only be recorded for confirmed sales"
        );
      }

      const financials = await getFinancialSummary(
        saleId,
        tenantId,
        session
      );

      const remainingAmount = sale.amount - financials.paidAmount;

      if (numericAmount > remainingAmount + 0.000001) {
        throw createError(
          `Payment exceeds the remaining amount (${Math.max(0, remainingAmount)})`
        );
      }

      const [transaction] = await Transaction.create(
        [
          {
            tenantId,
            type: "income",
            category: "sale_payment",
            description: description || `Payment for ${sale.saleNumber}`,
            amount: numericAmount,
            currency: sale.currency,
            transactionDate: date,
            paymentMethod,
            sale: sale._id,
            createdBy,
            notes,
          },
        ],
        { session }
      );

      const updatedFinancials = await synchronizeSalePaymentStatus(
        sale,
        tenantId,
        session
      );

      result = {
        transactionId: transaction._id,
        financials: updatedFinancials,
      };
    });
  } finally {
    await session.endSession();
  }

  const transaction = await populateTransaction(
    Transaction.findById(result.transactionId)
  );

  res.status(201).json({
    success: true,
    message: "Sale payment recorded successfully",
    transaction,
    financials: result.financials,
  });
});

// ==========================================
// REFUND SALE PAYMENT
// ==========================================

export const refundSalePayment = asyncHandler(async (req, res) => {
  ensureFinanceAccess(req);

  const tenantId = getTenantId(req);
  const createdBy = getUserId(req);
  const { saleId } = req.params;

  const {
    amount,
    paymentMethod = "other",
    transactionDate,
    description,
    notes,
  } = req.body;

  validateObjectId(saleId, "sale ID");

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw createError("Refund amount must be greater than zero");
  }

  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    throw createError("Invalid payment method");
  }

  const date = transactionDate
    ? new Date(transactionDate)
    : new Date();

  if (Number.isNaN(date.getTime())) {
    throw createError("Invalid refund date");
  }

  const session = await mongoose.startSession();

  let result;

  try {
    await session.withTransaction(async () => {
      const sale = await Sale.findOne({
        _id: saleId,
        tenantId,
      }).session(session);

      if (!sale) {
        throw createError("Sale not found", 404);
      }

      const financials = await getFinancialSummary(
        saleId,
        tenantId,
        session
      );

      if (numericAmount > financials.paidAmount + 0.000001) {
        throw createError(
          `Refund exceeds the available collected amount (${financials.paidAmount})`
        );
      }

      if (financials.paidAmount <= 0) {
        throw createError("There is no collected amount to refund");
      }

      const [transaction] = await Transaction.create(
        [
          {
            tenantId,
            type: "expense",
            category: "sale_refund",
            description: description || `Refund for ${sale.saleNumber}`,
            amount: numericAmount,
            currency: sale.currency,
            transactionDate: date,
            paymentMethod,
            sale: sale._id,
            createdBy,
            notes,
          },
        ],
        { session }
      );

      const updatedFinancials = await synchronizeSalePaymentStatus(
        sale,
        tenantId,
        session
      );

      result = {
        transactionId: transaction._id,
        financials: updatedFinancials,
      };
    });
  } finally {
    await session.endSession();
  }

  const transaction = await populateTransaction(
    Transaction.findById(result.transactionId)
  );

  res.status(201).json({
    success: true,
    message: "Sale refund recorded successfully",
    transaction,
    financials: result.financials,
  });
});
