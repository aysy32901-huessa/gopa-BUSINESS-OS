
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      return next(new Error("Authentication required."));
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403);
      return next(
        new Error("You do not have permission to perform this action.")
      );
    }

    next();
  };
};

export default authorizeRoles;
