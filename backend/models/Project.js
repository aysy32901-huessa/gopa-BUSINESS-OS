
import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      maxlength: 150,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },

    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    team: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    status: {
      type: String,
      enum: [
        "planning",
        "active",
        "on_hold",
        "completed",
        "cancelled",
      ],
      default: "planning",
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    startDate: {
      type: Date,
      default: null,
    },

    dueDate: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    // Internal estimated execution cost
    budget: {
      type: Number,
      min: 0,
      default: 0,
    },

    // Amount agreed with the client
    contractValue: {
      type: Number,
      min: 0,
      default: 0,
    },

    // Total amount received from the client
    paidAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    // Automatically calculated payment status
    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial", "paid"],
      default: "unpaid",
    },

    currency: {
      type: String,
      uppercase: true,
      trim: true,
      default: "EGP",
    },

    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// ==================================================
// AUTOMATIC PAYMENT STATUS
// ==================================================

projectSchema.pre("validate", function () {
  const contractValue = this.contractValue ?? 0;
  const paidAmount = this.paidAmount ?? 0;

  if (
    !Number.isFinite(contractValue) ||
    !Number.isFinite(paidAmount)
  ) {
    this.invalidate(
      "paidAmount",
      "Contract value and paid amount must be valid numbers."
    );
    return;
  }

  if (contractValue < 0 || paidAmount < 0) {
    this.invalidate(
      "paidAmount",
      "Financial amounts cannot be negative."
    );
    return;
  }

  if (paidAmount > contractValue) {
    this.invalidate(
      "paidAmount",
      "Paid amount cannot exceed the contract value."
    );
    return;
  }

  if (paidAmount === 0) {
    this.paymentStatus = "unpaid";
  } else if (paidAmount < contractValue) {
    this.paymentStatus = "partial";
  } else if (contractValue > 0) {
    this.paymentStatus = "paid";
  }
});

// ==================================================
// INDEXES
// ==================================================

projectSchema.index({ tenantId: 1, status: 1 });
projectSchema.index({ tenantId: 1, manager: 1 });
projectSchema.index({ tenantId: 1, createdAt: -1 });
projectSchema.index({ tenantId: 1, dueDate: 1 });
projectSchema.index({ tenantId: 1, paymentStatus: 1 });

// ==================================================
// MODEL
// ==================================================

const Project =
  mongoose.models.Project ||
  mongoose.model("Project", projectSchema);

export default Project;
