
import express from "express";
import AuthController from "../controllers/authController.js";
import {
  validateRegister,
  validateLogin,
} from "../validators/authValidator.js";

const router = express.Router();

// Register a new company with its first General Admin
router.post(
  "/register",
  validateRegister,
  AuthController.register
);

// Login an existing user
router.post(
  "/login",
  validateLogin,
  AuthController.login
);

export default router;
