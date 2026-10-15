
import mongoose from "mongoose";
import Tenant from "../models/Tenant.js";
import asyncHandler from "../utils/asyncHandler.js";

export const verifyTenant = asyncHandler(async (req, res, next) => {
  // Check authentication
  if (!req.user || !req.user.tenantId) {
    res.status(401);
    throw new Error("Company authentication required.");
  }

  // Validate Tenant ID
  if (!mongoose.isValidObjectId(req.user.tenantId)) {
    res.status(401);
    throw new Error("Invalid company identifier.");
  }

  // Find company
  const tenant = await Tenant.findById(req.user.tenantId);

  if (!tenant) {
    res.status(404);
    throw new Error("Company not found.");
  }

  // Check company status
  if (tenant.status === "suspended") {
    res.status(403);
    throw new Error("This company account has been suspended.");
  }

  if (tenant.status === "deleted") {
    res.status(403);
    throw new Error("This company account has been deleted.");
  }

  // Attach tenant information to request
  req.tenant = tenant;
  req.tenantId = tenant._id;

  next();
});

// Support both named and default imports
export default verifyTenant;
