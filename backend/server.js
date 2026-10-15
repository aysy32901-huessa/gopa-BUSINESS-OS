import app from "./app.js";
import connectDatabase from "./config/database.js";
import { env } from "./config/env.js";

const startServer = async () => {
  try {
    await connectDatabase();

    app.listen(env.port, () => {
      console.log(`KEMETIX CRM server running on port ${env.port}`);
      console.log(`Environment: ${env.nodeEnv}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();