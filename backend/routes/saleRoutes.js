
import express from "express";

import {
  getSales,
  getSaleById,
  createSale,
  updateSale,
} from "../controllers/saleController.js";

import {
  getSaleTransactions,
  recordSalePayment,
  refundSalePayment,
} from "../controllers/transactionController.js";

import protect from "../middleware/authMiddleware.js";
import verifyTenant from "../middleware/tenantMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";

const router = express.Router();

// All sale routes require authentication and tenant verification.
router.use(protect, verifyTenant);

// Sale listing and details
router.get("/", getSales);
router.get("/:id", getSaleById);

// Create and update sales
router.post(
  "/",
  authorizeRoles("general_admin", "department_manager"),
  createSale
);

router.put(
  "/:id",
  authorizeRoles("general_admin", "department_manager"),
  updateSale
);

// Sale financial operations
router.get(
  "/:saleId/transactions",
  authorizeRoles("general_admin"),
  getSaleTransactions
);

router.post(
  "/:saleId/payments",
  authorizeRoles("general_admin"),
  recordSalePayment
);

router.post(
  "/:saleId/refunds",
  authorizeRoles("general_admin"),
  refundSalePayment
);

export default router;
