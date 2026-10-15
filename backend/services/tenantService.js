
import mongoose from "mongoose";
import Tenant from "../models/Tenant.js";
import User from "../models/User.js";

const createTenantWithAdmin = async ({
  companyName,
  companyEmail,
  companyPhone,
  industry,
  firstName,
  lastName,
  email,
  password,
}) => {
  const session = await mongoose.startSession();

  try {
    let createdTenant;
    let createdAdmin;

    await session.withTransaction(async () => {
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
      }).session(session);

      if (existingUser) {
        const error = new Error("Email is already registered");
        error.statusCode = 409;
        throw error;
      }

      const slug = `${companyName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}-${new mongoose.Types.ObjectId()
        .toString()
        .slice(-6)}`;

      const [tenant] = await Tenant.create(
        [
          {
            name: companyName,
            slug,
            contactEmail: companyEmail,
            phone: companyPhone || "",
            industry: industry || "Other",
          },
        ],
        { session }
      );

      const [admin] = await User.create(
        [
          {
            firstName,
            lastName,
            email: email.toLowerCase(),
            password,
            tenantId: tenant._id,
            role: "general_admin",
          },
        ],
        { session }
      );

      createdTenant = tenant;
      createdAdmin = admin;
    });

    return {
      tenant: createdTenant,
      admin: createdAdmin,
    };
  } finally {
    await session.endSession();
  }
};

export default {
  createTenantWithAdmin,
};
