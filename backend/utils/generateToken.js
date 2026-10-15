
import jwt from "jsonwebtoken";

const generateToken = ({ userId, tenantId, role }) => {
  return jwt.sign(
    {
      tenantId: tenantId.toString(),
      role,
    },
    process.env.JWT_SECRET,
    {
      subject: userId.toString(),
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};

export default generateToken;
