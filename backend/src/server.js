require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const path = require("path");
const morgan = require("morgan");
const winston = require("./config/winston");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const moment = require("moment-timezone");
const {
    server: serverConfig,
    database: dbConfig,
    security,
    rateLimiting,
    app: appConfig,
    upload,
} = require("./config/config");

const { initializeCleanup, stopCleanup } = require("./jobs/cleanup-cron");
const { initializeBackup, stopBackup } = require("./jobs/backup-db");
const { initializeTokenCleanup, stopTokenCleanup } = require("./jobs/token-cleanup");
const { initializeProcurementCron, stopProcurementCron } = require("./jobs/procurement-cron");

// Validate configuration on startup
const { validateConfig } = require("./config/config");
validateConfig();

moment.tz.setDefault(appConfig.timezone);
const app = express();

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Security middlewares
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
            },
        },
        crossOriginEmbedderPolicy: false,
    })
);

// Compression middleware
app.use(compression());

// Rate limiting - COMMENTED OUT FOR DEBUGGING
// const limiter = rateLimit({
//     windowMs: rateLimiting.windowMs,
//     max: rateLimiting.max,
//     message: "Too many requests from this IP, please try again later.",
//     standardHeaders: true,
//     legacyHeaders: false,
// });

// Apply rate limiting to API routes - COMMENTED OUT FOR DEBUGGING
// app.use("/api/", limiter);

// Strict rate limiting for auth endpoints - COMMENTED OUT FOR DEBUGGING
// const authLimiter = rateLimit({
//     windowMs: rateLimiting.authWindowMs,
//     max: rateLimiting.authMax,
//     message: "Too many authentication attempts, please try again later.",
//     skipSuccessfulRequests: true,
// });

// app.use("/api/v1/auth/userLogin", authLimiter);

// CORS configuration - SIMPLIFIED FOR DEBUGGING
app.use(
    cors({
        origin: "*",
        credentials: true,
        exposedHeaders: ["content-disposition", "x-filename"],
        optionsSuccessStatus: 200,
    })
);

// Body parsing middlewares with size limits
// Routes that handle large payloads (like image sync) will use their own parsers
const maxSizeMB = Math.round((upload.maxFileSize * 5) / 1024 / 1024) + "mb";

// Skip global body parser for routes that need larger limits
const skipBodyParserPaths = ['/api/v1/pos/item/sync'];
app.use((req, res, next) => {
    if (skipBodyParserPaths.some(path => req.path.startsWith(path))) {
        return next();
    }
    express.json({ limit: maxSizeMB })(req, res, next);
});
app.use((req, res, next) => {
    if (skipBodyParserPaths.some(path => req.path.startsWith(path))) {
        return next();
    }
    express.urlencoded({ extended: true, limit: maxSizeMB })(req, res, next);
});
app.use(cookieParser());

// Static files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/public", express.static(path.join(process.cwd(), "public")));

// Request logging with separate POS logging
app.use(
    morgan("combined", {
        stream: winston.stream,
        skip: function (req, res) {
            return res.statusCode < 400;
        },
    })
);

// Custom middleware to log POS requests separately
app.use((req, res, next) => {
    // Check if it's a POS request
    const isPOSRequest =
        req.path.includes("/pos") ||
        req.path.includes("/sync") ||
        req.path.includes("/installation") ||
        req.path.includes("/order") ||
        req.headers["x-pos-client"] || // Custom header for POS clients
        (req.headers.authorization && req.headers["x-device-id"]); // POS usually sends device ID

    if (isPOSRequest) {
        // Log POS requests with special formatting
        winston.info(`🏪 POS Request: ${req.method} ${req.path}`, {
            source: "server.js",
            function: "posRequestMiddleware",
            type: "POS_REQUEST",
            method: req.method,
            path: req.path,
            ip: req.ip || req.connection.remoteAddress,
            deviceId: req.headers["x-device-id"] || req.body?.deviceId,
            userAgent: req.headers["user-agent"]
        });
    }

    next();
});

// Health check endpoints
app.get("/health", (req, res) => {
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: serverConfig.environment,
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + " MB",
        },
    });
});

app.get("/health/ready", async (req, res) => {
    try {
        // Check database connection
        const db = require("./config/db");
        await db.getResults("SELECT 1 as test");

        res.json({
            status: "ready",
            timestamp: new Date().toISOString(),
            checks: {
                database: "connected",
            },
        });
    } catch (error) {
        res.status(503).json({
            status: "not ready",
            timestamp: new Date().toISOString(),
            error: error.message,
            checks: {
                database: "disconnected",
            },
        });
    }
});

app.get("/health/live", (req, res) => {
    res.json({
        status: "alive",
        timestamp: new Date().toISOString(),
    });
});

// Metrics endpoint
app.get("/metrics", (req, res) => {
    const metrics = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        pid: process.pid,
        version: process.version,
        environment: {
            NODE_ENV: serverConfig.environment,
            SERVER_PORT: serverConfig.port,
        },
    };
    res.json(metrics);
});

// Function to load routes dynamically
const loadRoutes = (dir) => {
    fs.readdirSync(dir).forEach((file) => {
        const filePath = path.join(dir, file);
        if (fs.lstatSync(filePath).isDirectory()) {
            loadRoutes(filePath);
        } else if (file.endsWith(".js")) {
            try {
                const route = require(filePath);
                if (route.path && route.router) {
                    const fullPath = `/api/v1${route.path}`;
                    app.use(fullPath, route.router);

                    // Check if it's a POS route and log differently
                    const isPOSRoute =
                        filePath.includes("pos-mgmt") ||
                        route.path.toLowerCase().includes("pos") ||
                        route.path.toLowerCase().includes("sync") ||
                        route.path.toLowerCase().includes("installation");

                    if (isPOSRoute) {
                        console.log(`🏪 POS Route registered: ${fullPath}`);
                        winston.info(`POS Route registered: ${fullPath}`, {
                            source: "server.js",
                            function: "loadRoutes",
                            routePath: fullPath,
                            routeType: "POS"
                        });
                    } else {
                        console.log(`✅ Route registered: ${fullPath}`);
                        winston.info(`Route registered: ${fullPath}`, {
                            source: "server.js",
                            function: "loadRoutes",
                            routePath: fullPath,
                            routeType: "standard"
                        });
                    }
                } else {
                    console.warn(`⚠️  Invalid route file (missing path/router): ${filePath}`);
                }
            } catch (err) {
                console.error(`❌ Error loading route file: ${filePath}`);
                console.error(err);
            }
        }
    });
};

// Load all routes from the 'routes' directory
console.log(`------------------------------------------------------------------------------`);
console.log(`📂 Loading Routes...`);
console.log(`------------------------------------------------------------------------------`);
loadRoutes(path.join(__dirname, "routes"));
console.log(`------------------------------------------------------------------------------`);

// Database backup UI routes
app.get("/db-backup", (req, res) => {
    res.render("db-backups", { isAuthenticated: false });
});

app.post("/db-backup", (req, res) => {
    const token = req.body.token;
    const BACKUP_DIR = path.join(__dirname, "../db_backups");
    const VALID_TOKEN = security.dbBackupToken;

    if (token === VALID_TOKEN) {
        const files = fs
            .readdirSync(BACKUP_DIR)
            .filter((f) => f.endsWith(".sql"))
            .sort(
                (a, b) =>
                    fs.statSync(path.join(BACKUP_DIR, b)).mtime -
                    fs.statSync(path.join(BACKUP_DIR, a)).mtime
            );

        res.render("db-backups", { isAuthenticated: true, backups: files, token });
    } else {
        res.status(401).send("❌ Invalid token.");
    }
});

// Global error handling for unhandled rejections
process.on("unhandledRejection", async (reason, promise) => {
    winston.error(`Unhandled Rejection: ${reason?.message || reason}`, {
        source: "server.js",
        function: "unhandledRejection",
        error: reason?.message || String(reason),
        code: reason?.code,
        errno: reason?.errno,
        stack: reason?.stack
    });

    if (serverConfig.isProduction) {
        // Send alert to monitoring service
        console.error("Unhandled rejection:", reason);
    } else {
        console.error("Unhandled rejection at:", promise, "reason:", reason);
    }
});

// Express error handler middleware
app.use(async function (err, req, res, next) {
    winston.error(`Express error: ${err.message}`, {
        source: "server.js",
        function: "expressErrorHandler",
        error: err.message,
        code: err.code,
        errno: err.errno,
        stack: err.stack,
        method: req.method,
        path: req.path,
        statusCode: err.statusCode || err.status || 500
    });

    const isDevelopment = serverConfig.isDevelopment;
    const status = err.statusCode || err.status || 500;

    res.status(status).json({
        success: 0,
        error: {
            message: err.message || "Internal Server Error",
            status: status,
            ...(isDevelopment && { stack: err.stack }),
        },
    });
});

// 404 handler
app.use(function (req, res, next) {
    res.status(404).json({
        success: 0,
        error: {
            message: "Resource not found",
            path: req.path,
            method: req.method,
        },
    });
});

const server = app.listen(serverConfig.port, () => {
    console.log(`------------------------------------------------------------------------------`);
    console.log(`🚀 Server started successfully`);
    console.log(`🌎 Environment: ${serverConfig.environment}`);
    console.log(`🛢️  DB Host: ${dbConfig.host}`);
    console.log(`🗄️  DB Name: ${dbConfig.database}`);
    console.log(`🌐 Base URL: ${serverConfig.baseUrl}`);
    console.log(`🔌 Port: ${serverConfig.port}`);
    console.log(
        `🔗 API Endpoint: ${serverConfig.baseUrl}:${serverConfig.port}${serverConfig.apiPrefix}`
    );
    console.log(
        `🏥 Health Check: ${serverConfig.baseUrl}:${serverConfig.port}/health`
    );
    console.log(`------------------------------------------------------------------------------`);
});

// Initialize cron jobs
let cleanupTask = null;
let backupTask = null;
let tokenCleanupTask = null;
let procurementTask = null;

try {
    cleanupTask = initializeCleanup();
    console.log("✅ Cleanup cron initialized - runs daily at 2:00 AM");
    winston.info("Cleanup cron initialized - runs daily at 2:00 AM", {
        source: "server.js",
        function: "initializeCleanup"
    });
} catch (error) {
    console.error("❌ Failed to initialize cleanup cron:", error);
    winston.error(`Failed to initialize cleanup cron: ${error.message}`, {
        source: "server.js",
        function: "initializeCleanup",
        error: error.message,
        code: error.code,
        errno: error.errno,
        stack: error.stack
    });
}

try {
    backupTask = initializeBackup();
    console.log("✅ DB Backup cron initialized - runs daily at 2:00 AM");
    winston.info("DB Backup cron initialized - runs daily at 2:00 AM", {
        source: "server.js",
        function: "initializeBackup"
    });
} catch (error) {
    console.error("❌ Failed to initialize DB backup cron:", error);
    winston.error(`Failed to initialize DB backup cron: ${error.message}`, {
        source: "server.js",
        function: "initializeBackup",
        error: error.message,
        code: error.code,
        errno: error.errno,
        stack: error.stack
    });
}

try {
    tokenCleanupTask = initializeTokenCleanup();
    console.log("✅ Token cleanup cron initialized - runs every hour");
    winston.info("Token cleanup cron initialized - runs every hour", {
        source: "server.js",
        function: "initializeTokenCleanup"
    });
} catch (error) {
    console.error("❌ Failed to initialize token cleanup cron:", error);
    winston.error(`Failed to initialize token cleanup cron: ${error.message}`, {
        source: "server.js",
        function: "initializeTokenCleanup",
        error: error.message,
        code: error.code,
        errno: error.errno,
        stack: error.stack
    });
}

try {
    procurementTask = initializeProcurementCron();
    console.log("✅ Procurement cron initialized - runs daily at 6:00 AM IST");
    winston.info("Procurement cron initialized - runs daily at 6:00 AM IST", {
        source: "server.js",
        function: "initializeProcurementCron"
    });
} catch (error) {
    console.error("❌ Failed to initialize procurement cron:", error);
    winston.error(`Failed to initialize procurement cron: ${error.message}`, {
        source: "server.js",
        function: "initializeProcurementCron",
        error: error.message
    });
}

// Graceful shutdown handling
let isShuttingDown = false;

const gracefulShutdown = (signal) => {
    if (isShuttingDown) {
        console.log("🔴 Force shutdown...");
        process.exit(1);
    }

    isShuttingDown = true;
    console.log(`🟡 Received ${signal}, starting graceful shutdown...`);
    winston.info(`Received ${signal}, starting graceful shutdown...`, {
        source: "server.js",
        function: "gracefulShutdown",
        signal: signal
    });

    // Stop cron jobs
    if (cleanupTask) {
        try {
            stopCleanup(cleanupTask);
            console.log("✅ Cleanup cron stopped");
        } catch (error) {
            console.error("❌ Error stopping cleanup cron:", error);
            winston.error(`Error stopping cleanup cron: ${error.message}`, {
                source: "server.js",
                function: "gracefulCleanupShutdown",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
        }
    }

    if (backupTask) {
        try {
            stopBackup(backupTask);
            console.log("✅ DB Backup cron stopped");
        } catch (error) {
            console.error("❌ Error stopping backup cron:", error);
            winston.error(`Error stopping backup cron: ${error.message}`, {
                source: "server.js",
                function: "gracefulBackupShutdown",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
        }
    }

    if (procurementTask) {
        try {
            stopProcurementCron(procurementTask);
            console.log("✅ Procurement cron stopped");
        } catch (error) {
            console.error("❌ Error stopping procurement cron:", error);
        }
    }

    if (tokenCleanupTask) {
        try {
            stopTokenCleanup(tokenCleanupTask);
            console.log("✅ Token cleanup cron stopped");
        } catch (error) {
            console.error("❌ Error stopping token cleanup cron:", error);
            winston.error(`Error stopping token cleanup cron: ${error.message}`, {
                source: "server.js",
                function: "gracefulTokenCleanupShutdown",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
        }
    }

    // Close server
    server.close((err) => {
        if (err) {
            console.error("❌ Error closing server:", err);
            winston.error(`Error closing server: ${err.message}`, {
                source: "server.js",
                function: "gracefulServerShutdown",
                error: err.message,
                code: err.code,
                errno: err.errno,
                stack: err.stack
            });
            process.exit(1);
        }

        console.log("✅ Server closed");
        winston.info("Server closed successfully", {
            source: "server.js",
            function: "gracefulServerShutdown"
        });

        // Close database connections
        const db = require("./config/db");
        if (db && db.end) {
            db.end(() => {
                console.log("✅ Database connections closed");
                winston.info("Database connections closed", {
                    source: "server.js",
                    function: "gracefulDBShutdown"
                });
                process.exit(0);
            });
        } else {
            process.exit(0);
        }
    });

    // Force shutdown after timeout
    setTimeout(() => {
        console.log("🔴 Force shutdown after timeout");
        winston.error("Force shutdown after timeout", {
            source: "server.js",
            function: "gracefulTimeoutShutdown"
        });
        process.exit(1);
    }, 10000);
};

// Handle termination signals
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGHUP", () => gracefulShutdown("SIGHUP"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
    console.error("🔴 Uncaught Exception:", error);
    winston.error(`Uncaught Exception: ${error.message}`, {
        source: "server.js",
        function: "uncaughtException",
        error: error.message,
        code: error.code,
        errno: error.errno,
        stack: error.stack
    });
    gracefulShutdown("UNCAUGHT_EXCEPTION");
});

module.exports = { app, server };
