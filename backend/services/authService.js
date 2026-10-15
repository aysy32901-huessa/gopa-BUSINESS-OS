
import User from "../models/User.js";
import TenantService from "./tenantService.js";
import generateToken from "../utils/generateToken.js";

// Register a new company with its first General Admin
const registerTenant = async (data) => {
  try {
    const result = await TenantService.createTenantWithAdmin(data);

    const token = generateToken({
      userId: result.admin._id,
      tenantId: result.tenant._id,
      role: result.admin.role,
    });

    return {
      tenant: result.tenant,
      user: result.admin,
      token,
    };
  } catch (error) {
    if (error.code === 11000) {
      const duplicateError = new Error("Email is already registered");
      duplicateError.statusCode = 409;
      throw duplicateError;
    }

    throw error;
  }
};

// Login an existing user
const login = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({
    email: normalizedEmail,
  }).select("+password");

  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error("This account is deactivated");
    error.statusCode = 403;
    throw error;
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  user.lastLoginAt = new Date();
  await user.save();

  const token = generateToken({
    userId: user._id,
    tenantId: user.tenantId,
    role: user.role,
  });

  return {
    user,
    token,
  };
};

export default {
  registerTenant,
  login,
};
