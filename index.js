import "dotenv/config";
import express from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import passport from "passport";

// Database and configuration imports
import dbConnection from "./config/db.js";
import { corsOptions } from "./config/cors.js"; // Import your CORS config
import "./config/passport.js"; // This imports and registers your Google strategy

// Route and middleware imports
import router from "./routes/index.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Database connection
dbConnection();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy:
      process.env.NODE_ENV === "production" ? undefined : false,
  })
);

// Performance middleware
app.use(compression());

// Use your custom CORS configuration
app.use(cors(corsOptions));

// Trust proxy (important if behind reverse proxy)
app.set("trust proxy", 1);

// Parsers
app.use(cookieParser());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// Logging
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Passport initialization
app.use(passport.initialize());

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use("/api/v1/", router);

// Bypass SSL verification for development (due to Kaspersky)
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; 

// Error handling middleware (should be last)
app.use(notFound);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT} in ${
      process.env.NODE_ENV || "development"
    } mode`
  );
});

export default app;
