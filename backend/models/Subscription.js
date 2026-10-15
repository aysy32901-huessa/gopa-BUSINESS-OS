
import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      unique: true,
      index: true,
    },

    plan: {
      type: String,
      enum: ["starter", "professional", "enterprise"],
      default: "starter",
    },

    status: {
      type: String,
      enum: ["trial", "active", "past_due", "cancelled", "expired"],
      default: "trial",
    },

    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
    },

    amount: {
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

    startDate: {
      type: Date,
      default: Date.now,
    },

    trialEndsAt: {
      type: Date,
      default: null,
    },

    currentPeriodStart: {
      type: Date,
      default: Date.now,
    },

    currentPeriodEnd: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    externalCustomerId: {
      type: String,
      trim: true,
      default: null,
    },

    externalSubscriptionId: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Subscription =
  mongoose.models.Subscription ||
  mongoose.model("Subscription", subscriptionSchema);

export default Subscription;
