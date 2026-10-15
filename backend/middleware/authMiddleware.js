
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";

const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Read token from Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    res.status(401);
    throw new Error("Authentication required. Please log in.");
  }

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    res.status(401);
    throw new Error("Invalid or expired authentication token.");
  }

  const user = await User.findById(decoded.sub);

  if (!user) {
    res.status(401);
    throw new Error("User account no longer exists.");
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error("Your account has been deactivated.");
  }

  // Ensure the token belongs to the user's current company
  if (user.tenantId.toString() !== decoded.tenantId) {
    res.status(401);
    throw new Error("Invalid company access.");
  }

  req.user = {
    userId: user._id,
    tenantId: user.tenantId,
    role: user.role,
    department: user.department,
  };

  next();
});

export default protect;
