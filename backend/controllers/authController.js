
import AuthService from "../services/authService.js";
import asyncHandler from "../utils/asyncHandler.js";

// Register a new company and its General Admin
const register = asyncHandler(async (req, res) => {
  const result = await AuthService.registerTenant(req.body);

  const safeUser = result.user.toObject();
  delete safeUser.password;

  res.status(201).json({
    success: true,
    message: "Company registered successfully.",
    data: {
      tenant: result.tenant,
      user: safeUser,
      token: result.token,
    },
  });
});

// Login an existing user
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await AuthService.login({
    email,
    password,
  });

  const safeUser = result.user.toObject();
  delete safeUser.password;

  res.status(200).json({
    success: true,
    message: "Login successful.",
    data: {
      user: safeUser,
      token: result.token,
    },
  });
});

export default {
  register,
  login,
};
