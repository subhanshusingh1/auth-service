// Import Modules
const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const { clerkMiddleware } = require("@clerk/express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

// Load Environment Variables
dotenv.config();

// Import Local Modules
const authRoutes = require("./routes/auth.js");
const webhookRoutes = require("./routes/webhookRoutes.js");
const connectDB = require("./config/db.js");
const { errorHandler, notFound } = require("./middlewares/errorMiddleware.js");

// App Initialization
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
const corsOptions = {
  origin: process.env.CLIENT_URL, // Change this to the actual frontend URL
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));
if (process.env.NODE_ENV === "production") {
  app.use(helmet());
}

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Initialize Clerk Middleware for Authentication
app.use(clerkMiddleware());

// User Routes
app.use("/api/v1/users", authRoutes);
app.use("/api/v1/webhook", webhookRoutes);

// Handle Undefined Routes
app.use(notFound);

// Global Error Handler
app.use(errorHandler);

// Database Connection
const connectDatabase = async () => {
  try {
    await connectDB();
    console.log("Database connected successfully.");
  } catch (error) {
    console.error(`Database connection failed: ${error.message}`);
    process.exit(1);
  }
};

// Start the Application (No need for app.listen in Vercel)
const startApp = async () => {
  try {
    await connectDatabase();
    console.log("App is initialized and ready.");
  } catch (error) {
    console.error(`Error initializing app: ${error.message}`);
    process.exit(1);
  }
};

startApp();

// Export the Express app to Vercel
module.exports = app;
