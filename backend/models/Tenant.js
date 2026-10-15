
import mongoose from "mongoose";

const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    contactEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
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

    status: {
      type: String,
      enum: ["trial", "active", "suspended"],
      default: "trial",
    },

    plan: {
      type: String,
      enum: ["starter", "professional", "enterprise"],
      default: "starter",
    },

    settings: {
      currency: {
        type: String,
        default: "EGP",
      },

      language: {
        type: String,
        enum: ["ar", "en"],
        default: "ar",
      },

      timezone: {
        type: String,
        default: "Africa/Cairo",
      },
    },
  },
  {
    timestamps: true,
  }
);

tenantSchema.index({ status: 1 });

const Tenant = mongoose.model("Tenant", tenantSchema);

export default Tenant;
