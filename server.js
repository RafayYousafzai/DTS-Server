import express from "express";
import cors from "cors"; // Import the cors middleware
import locations from "./routes/locations.js";
import notifications from "./routes/notifications.js";
import signals from "./routes/signals.js";
import chat from "./routes/chat.js";
import pdf from "./routes/pdf.js";
import email from "./routes/email.js";
import logger from "./middleware/logger.js";
import errorHandler from "./middleware/error.js";
import notFound from "./middleware/not-found.js";

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"], // Allowed HTTP methods
    credentials: false,
  })
);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Custom logger middleware
app.use(logger);

// API routes
app.use("/api/locations", locations);
app.use("/api/notifications", notifications);
app.use("/api/online_signal", signals);
app.use("/api/chat", chat);
app.use("/api/pdf", pdf);
app.use("/api/email", email);

// 404 Middleware for routes not found
app.use(notFound);

// Global Error Handler
app.use(errorHandler);

// Export the app for Vercel's serverless function
export default app;
