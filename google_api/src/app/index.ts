import bodyParser from "body-parser";
import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import sampleRoutes from "@/routes/sample-route"; // Import the routes
import { googleServiceRoutes } from "@/routes/google-service";
import { userApiRoute } from "@/routes/user/user-api";
import { storageApi } from "@/routes/user/storage";
import fileRouter from "@/routes/user/files";
import { createServer } from "http";
import proxyRouter from "@/routes/user/proxy";
import { FileUploadService } from "@/lib/sockets/file-socket";
import { LogStreamService } from "@/lib/sockets/logs-sockets";
import { WebSocketManager } from "@/lib/sockets/sockets-manager";
import { UserAnalyticsService } from "@/lib/sockets/analytics-socket";
import { SystemSetting } from "@/lib/sockets/system-setting-socket";
import { allocate_router } from "@/routes/admin/allocate-storage";
import { UserApiService } from "@/lib/sockets/api-key-socket";
import { userProfileRouter } from "@/routes/user/profile";
import databaseRouter from "@/routes/admin/databases";
import admin_request_router from "@/routes/admin/request/admin-request";
// Initialize dotenv for environment variables
dotenv.config();

// Initialize the Express application
const app: Application = express();

// Middleware setup
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(bodyParser.json()); // Parse JSON request bodies
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded data

// Define a port from environment variables or use 3000 by default
const PORT = process.env.PORT || 5000;

// setup web socket
const server = createServer(app);
const wsManager = WebSocketManager.getInstance(server);
wsManager.registerService("/ws/file-upload", new FileUploadService());
wsManager.registerService("/admin/log-stream", new LogStreamService());
wsManager.registerService("/ws/analytics", new UserAnalyticsService());
wsManager.registerService("/ws/system-setting", new SystemSetting());
wsManager.registerService("/ws/api-key", new UserApiService());

const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}

app.use(cors(corsOptions))
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    next();
});

// Use the routes
app.use("/api", sampleRoutes); // All routes under '/api'
app.use("/api/admin/", allocate_router); // allocated the storage
app.use("/api/admin/request", admin_request_router); // request
app.use('/api/user', userApiRoute); // User API route
app.use('/api/user/storage', storageApi); // User Storage API route
app.use('/api/user/files', fileRouter); // User File API route
app.use('/api/user/profile', userProfileRouter); // User profile
app.use('/api/', proxyRouter); // reverse proxy route
app.use('/api/database', databaseRouter);
app.use(googleServiceRoutes);


// Sample route for testing
app.get("/", (req: Request, res: Response) => {
    res.json({ message: "Welcome to the Node.js API with TypeScript!" });
});



// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message });
});

// Process-level error handling to prevent exit on errors

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Optionally, log the error to an external service.
    // Do not exit the process
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Optionally, log the error to an external service.
    // Do not exit the process
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
