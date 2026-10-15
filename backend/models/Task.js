
import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxlength: 200,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },

    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
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

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },

    status: {
      type: String,
      enum: [
        "todo",
        "in_progress",
        "review",
        "completed",
        "cancelled",
      ],
      default: "todo",
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
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
  },
  {
    timestamps: true,
  }
);

// ==================================================
// KEMETIX CRM - TASK INDEXES
// ==================================================

taskSchema.index({ tenantId: 1, status: 1 });
taskSchema.index({ tenantId: 1, assignedTo: 1 });
taskSchema.index({ tenantId: 1, dueDate: 1 });
taskSchema.index({ tenantId: 1, project: 1 });
taskSchema.index({ tenantId: 1, department: 1 });
taskSchema.index({ tenantId: 1, priority: 1 });
taskSchema.index({ tenantId: 1, createdAt: -1 });

const Task =
  mongoose.models.Task ||
  mongoose.model("Task", taskSchema);

export default Task;
