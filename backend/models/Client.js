
import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    companyName: {
      type: String,
      required: [true, "Client name is required"],
      trim: true,
      maxlength: 150,
    },

    contactName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
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

    industry: {
      type: String,
      trim: true,
      default: "Other",
    },

    source: {
      type: String,
      trim: true,
      default: "Other",
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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

clientSchema.index({ tenantId: 1, createdAt: -1 });
clientSchema.index({ tenantId: 1, status: 1 });
clientSchema.index({ tenantId: 1, assignedTo: 1 });

const Client =
  mongoose.models.Client ||
  mongoose.model("Client", clientSchema);

export default Client;
