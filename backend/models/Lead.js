
import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: [true, "Lead name is required"],
      trim: true,
      maxlength: 150,
    },

    companyName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 150,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    source: {
      type: String,
      trim: true,
      default: "Other",
    },

    status: {
      type: String,
      enum: [
        "new",
        "contacted",
        "qualified",
        "proposal",
        "negotiation",
        "won",
        "lost",
      ],
      default: "new",
    },

    estimatedValue: {
      type: Number,
      min: 0,
      default: 0,
    },

    currency: {
      type: String,
      uppercase: true,
      trim: true,
      default: "EGP",
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    convertedClient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },

    expectedCloseDate: {
      type: Date,
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
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

leadSchema.index({ tenantId: 1, status: 1 });
leadSchema.index({ tenantId: 1, assignedTo: 1 });
leadSchema.index({ tenantId: 1, createdAt: -1 });

const Lead =
  mongoose.models.Lead ||
  mongoose.model("Lead", leadSchema);

export default Lead;
