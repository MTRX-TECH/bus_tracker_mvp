import express, { Application } from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import { config } from "./config/env";
import { connectDB } from "./config/db";
import { initSocketIO } from "./socket";
import { errorHandler } from "./middleware/errorHandler";
import { apiRateLimiter } from "./middleware/rateLimiter";
import { Logger } from "./utils/logger";
import { WatchdogService } from "./services/watchdogService";
import apiRoutes from "./routes";

const app: Application = express();
const server = http.createServer(app);

// 1. Initialize Real-time Socket.IO Engine
initSocketIO(server);

// 2. Security & Middleware Configuration
app.use(helmet({
  contentSecurityPolicy: false, // Edge CDN and OpenStreetMap tiles friendly
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Request logging via Morgan
app.use(morgan("combined", {
  stream: { write: (message) => Logger.info(message.trim()) }
}));

// Apply DDoS and spam rate limiter
app.use("/api", apiRateLimiter);

// 3. Mount Enterprise API Gateway
app.use("/api", apiRoutes);

// Root greeting
app.get("/", (req, res) => {
  res.status(200).send("🚀 RIT Bus Tracker API Gateway Running — Developed by RIT ");
});

// 4. Global Exception Handler Middleware
app.use(errorHandler);

// 5. Start Server & MongoDB Initialization
const startServer = async () => {
  try {
    await connectDB();
    WatchdogService.start();
    const port = config.PORT || 5000;
    server.listen(port, () => {
      Logger.info(`========================================================`);
      Logger.info(`🏆 RIT Bus Tracker ENTERPRISE SERVER ACTIVE ON PORT ${port}`);
      Logger.info(`Developed by: RIT `);
      Logger.info(`========================================================`);
    });
  } catch (error: any) {
    Logger.error(`❌ Server boot failure: ${error.message}`);
    process.exit(1);
  }
};

if (config.NODE_ENV !== "test") {
  startServer();
}

export { app, server };
