
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";

// ROUTES
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import departmentRoutes from "./routes/departmentRoutes.js";
import saleRoutes from "./routes/saleRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";

// MIDDLEWARE
import errorMiddleware from "./middleware/errorMiddleware.js";
import notFoundMiddleware from "./middleware/notFoundMiddleware.js";

import { env } from "./config/env.js";

const app = express();

let databaseConnection = null;

// SECURITY
app.use(helmet());

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);

// BODY PARSING
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

// API RATE LIMITER
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

app.use("/api", apiLimiter);

// HEALTH CHECK
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "KEMETIX CRM API is running",
  });
});

// DATABASE CONNECTION FOR VERCEL
const ensureDatabaseConnection = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState === 1) {
      return next();
    }

    if (!databaseConnection) {
      databaseConnection = mongoose
        .connect(env.mongoUri)
        .then(() => {
          console.log("MongoDB connected successfully");
        })
        .catch((error) => {
          databaseConnection = null;
          throw error;
        });
    }

    await databaseConnection;
    next();
  } catch (error) {
    next(error);
  }
};

app.use("/api", ensureDatabaseConnection);

// API ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/transactions", transactionRoutes);

// ERROR HANDLING
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
