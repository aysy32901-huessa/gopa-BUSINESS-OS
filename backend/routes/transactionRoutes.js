
import express from "express";

import {
  getTransactions,
  createTransaction,
} from "../controllers/transactionController.js";

import protect from "../middleware/authMiddleware.js";
import verifyTenant from "../middleware/tenantMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";

const router = express.Router();

// Authentication and tenant isolation
router.use(protect, verifyTenant);

// Finance access is restricted to general admin
router.use(authorizeRoles("general_admin"));

// Get all financial transactions
router.get("/", getTransactions);

// Create a general income or expense transaction
router.post("/", createTransaction);

export default router;
