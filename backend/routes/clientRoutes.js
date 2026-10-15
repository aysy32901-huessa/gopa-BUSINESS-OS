import express from "express";

import protect from "../middleware/authMiddleware.js";
import verifyTenant from "../middleware/tenantMiddleware.js";
import authorizeRoles from "../middleware/roleMiddleware.js";

import {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
} from "../controllers/clientController.js";

const router = express.Router();

// جميع المسارات تتطلب تسجيل الدخول والتحقق من الشركة.
router.use(protect, verifyTenant);

// جميع الأدوار تستطيع مشاهدة العملاء ضمن نطاق صلاحياتها.
router.get("/", getClients);
router.get("/:id", getClientById);

// الإدارة فقط تستطيع إضافة وتعديل العملاء.
router.post(
  "/",
  authorizeRoles("general_admin", "department_manager"),
  createClient
);

router.put(
  "/:id",
  authorizeRoles("general_admin", "department_manager"),
  updateClient
);

// حذف العملاء للمدير العام فقط في الإصدار الأول.
router.delete(
  "/:id",
  authorizeRoles("general_admin"),
  deleteClient
);

export default router;