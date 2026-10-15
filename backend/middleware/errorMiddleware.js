
const errorMiddleware = (err, req, res, next) => {
  let statusCode =
    err.statusCode ||
    (res.statusCode >= 400 ? res.statusCode : 500);

  let message = err.message || "Internal Server Error";

  // Handle MongoDB duplicate key errors
  if (err.code === 11000) {
    statusCode = 409;
    message = "A record with this information already exists.";
  }

  // Handle invalid MongoDB ObjectId
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource identifier.";
  }

  // Handle MongoDB validation errors
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((item) => item.message)
      .join(", ");
  }

  // Handle invalid JWT errors
  if (
    err.name === "JsonWebTokenError" ||
    err.name === "TokenExpiredError"
  ) {
    statusCode = 401;
    message =
      err.name === "TokenExpiredError"
        ? "Authentication token has expired."
        : "Invalid authentication token.";
  }

  const response = {
    success: false,
    message,
  };

  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export default errorMiddleware;
