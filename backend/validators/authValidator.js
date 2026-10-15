
const validateRegister = (req, res, next) => {
  const {
    companyName,
    companyEmail,
    companyPhone,
    industry,
    firstName,
    lastName,
    email,
    password,
  } = req.body || {};

  const errors = [];

  if (typeof companyName !== "string" || companyName.trim().length < 2) {
    errors.push("Company name must contain at least 2 characters.");
  }

  if (
    typeof companyEmail !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyEmail.trim())
  ) {
    errors.push("A valid company email is required.");
  }

  if (companyPhone !== undefined && typeof companyPhone !== "string") {
    errors.push("Company phone must be a string.");
  }

  if (industry !== undefined && typeof industry !== "string") {
    errors.push("Industry must be a string.");
  }

  if (typeof firstName !== "string" || !firstName.trim()) {
    errors.push("First name is required.");
  }

  if (typeof lastName !== "string" || !lastName.trim()) {
    errors.push("Last name is required.");
  }

  if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    errors.push("A valid user email is required.");
  }

  if (typeof password !== "string" || password.length < 8) {
    errors.push("Password must contain at least 8 characters.");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors,
    });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body || {};
  const errors = [];

  if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    errors.push("A valid email is required.");
  }

  if (typeof password !== "string" || !password) {
    errors.push("Password is required.");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors,
    });
  }

  next();
};

export {
  validateRegister,
  validateLogin,
};
