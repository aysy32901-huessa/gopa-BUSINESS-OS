
import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },

    category: {
      type: String,
      required: [true, "Transaction category is required"],
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    currency: {
      type: String,
      uppercase: true,
      trim: true,
      default: "EGP",
    },

    transactionDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "bank_transfer", "card", "online", "other"],
      default: "other",
    },

    sale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ tenantId: 1, type: 1 });
transactionSchema.index({ tenantId: 1, transactionDate: -1 });
transactionSchema.index({ tenantId: 1, category: 1 });

const Transaction =
  mongoose.models.Transaction ||
  mongoose.model("Transaction", transactionSchema);

export default Transaction;
