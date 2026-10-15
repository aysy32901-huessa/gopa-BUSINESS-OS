
import mongoose from "mongoose";

const saleSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    saleNumber: {
      type: String,
      required: true,
      trim: true,
    },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },

    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },

    title: {
      type: String,
      required: [true, "Sale title is required"],
      trim: true,
      maxlength: 200,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      uppercase: true,
      trim: true,
      default: "EGP",
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "refunded"],
      default: "pending",
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "partially_paid", "paid", "refunded"],
      default: "unpaid",
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "bank_transfer", "card", "online", "other"],
      default: "other",
    },

    saleDate: {
      type: Date,
      default: Date.now,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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

saleSchema.index(
  { tenantId: 1, saleNumber: 1 },
  { unique: true }
);

saleSchema.index({ tenantId: 1, status: 1 });
saleSchema.index({ tenantId: 1, saleDate: -1 });
saleSchema.index({ tenantId: 1, assignedTo: 1 });

const Sale =
  mongoose.models.Sale ||
  mongoose.model("Sale", saleSchema);

export default Sale;
