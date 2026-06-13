const path = require("path");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Environment
const ENV = process.env.NODE_ENV || "development";
const isDevelopment = ENV === "development";
const isProduction = ENV === "production";
const isTest = ENV === "test";

// Server configuration
const server = {
    port: parseInt(process.env.SERVER_PORT || "8001"),
    host: process.env.HOST || "localhost",
    baseUrl: process.env.BASE_URL || "http://localhost",
    apiPrefix: "/api/v1",
    environment: ENV,
    isDevelopment,
    isProduction,
    isTest,
};

// Database configuration
const database = {
    host: process.env.DB_HOST || process.env.DBHOST || "localhost",
    port: parseInt(process.env.DB_PORT || process.env.DBPORT || "3306"),
    user: process.env.DB_USER || process.env.DBUSER || "root",
    password: process.env.DB_PASSWORD || process.env.DB_PASS || process.env.DBPASS || "",
    database: process.env.DB_NAME || process.env.DBNAME || "agripos",
    // Increased connection limit for high concurrency (100 connections)
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || "100"),
    waitForConnections: true,
    // Limited queue to fail fast instead of waiting indefinitely
    queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || "50"),
    // Connection timeout - time to establish database connection (30 seconds)
    connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || "30000"),
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    timezone: "+05:30",
    // Additional pool optimizations
    maxIdle: parseInt(process.env.DB_MAX_IDLE || "10"),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || "60000"),
};

// JWT configuration
const jwt = {
    secret: process.env.JWT_SECRET || "your-secret-key-change-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    refreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
};

// POS JWT configuration (separate from regular user JWT)
const posJwt = {
    secret: process.env.POS_JWT_SECRET || (process.env.JWT_SECRET + "_POS"),
    expiresIn: process.env.POS_JWT_EXPIRES_IN || "365d",
};

// Installation JWT configuration (for 3-step installation flow)
const installationJwt = {
    secret: process.env.INSTALLATION_JWT_SECRET || (process.env.JWT_SECRET + "_INSTALLATION"),
    expiresIn: process.env.INSTALLATION_JWT_EXPIRES_IN || "1h",
};

// AWS S3 configuration
const aws = {
    s3: {
        enabled: process.env.AWS_S3_ENABLED === "true",
    },
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || "ap-south-1",
    bucketName: process.env.AWS_BUCKET_NAME,
    cloudFrontUrl: process.env.AWS_CLOUDFRONT_URL,
};

// Email configuration
const email = {
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
    from: process.env.EMAIL_FROM || "noreply@agripos.com",
};

// Redis configuration (if using Redis for caching/sessions)
const redis = {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || "0"),
    ttl: parseInt(process.env.REDIS_TTL || "3600"),
};

// Security configuration
const security = {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || "10"),
    allowedOrigins: process.env.ALLOWED_ORIGINS 
        ? process.env.ALLOWED_ORIGINS.split(",")
        : ["http://localhost:3000", "http://localhost:3001"],
    dbBackupToken: process.env.DB_BACKUP_TOKEN || "change-this-token",
    apiKey: process.env.API_KEY,
};

// POS Activation configuration
const pos = {
    activationAlertEmail: process.env.ACTIVATION_ALERT_EMAIL || "sales@accreteinfo.com",
    dbScriptPath: process.env.DB_SCRIPT_PATH || "dbscript.sql",
    maxActivationCount: parseInt(process.env.MAX_ACTIVATION_COUNT || "3"),
    deviceInactivityMinutes: parseInt(process.env.DEVICE_INACTIVITY_MINUTES || "15"),
};

// WhatsApp configuration (External Service)
const whatsapp = {
    enabled: process.env.WHATSAPP_ENABLED === "true",
    apiUrl: process.env.WHATSAPP_API_URL || "http://localhost:3000/api/messages/send",
    maxRetries: parseInt(process.env.WHATSAPP_MAX_RETRIES || "3"),
    timeout: parseInt(process.env.WHATSAPP_TIMEOUT || "30000"),
    frontendBaseUrl: process.env.FRONTEND_BASE_URL || process.env.BASE_URL || "http://localhost:3000",
    companyName: process.env.COMPANY_NAME || "AgriPOS",
    // External service specific settings
    retryDelay: parseInt(process.env.WHATSAPP_RETRY_DELAY || "1000"), // 1 second
    connectionTimeout: parseInt(process.env.WHATSAPP_CONNECTION_TIMEOUT || "10000"), // 10 seconds
};

// Rate limiting configuration
const rateLimiting = {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || "100"),
    authWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || "900000"),
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX || "5"),
};

// File upload configuration
const upload = {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "20971520"), // 20MB (increased from 10MB)
    allowedMimeTypes: process.env.ALLOWED_MIME_TYPES 
        ? process.env.ALLOWED_MIME_TYPES.split(",")
        : ["image/jpeg", "image/png", "image/gif", "application/pdf"],
    uploadDir: path.join(process.cwd(), "uploads"),
    tempDir: path.join(process.cwd(), "temp"),
};

// Logging configuration
const logging = {
    level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),
    maxFiles: process.env.LOG_MAX_FILES || "14d",
    maxSize: process.env.LOG_MAX_SIZE || "20m",
    datePattern: "YYYY-MM-DD",
};

// Cron job configuration
const cron = {
    backupSchedule: process.env.BACKUP_SCHEDULE || "0 2 * * *", // 2:00 AM daily
    cleanupSchedule: process.env.CLEANUP_SCHEDULE || "0 2 * * *", // 2:00 AM daily
    cleanupAge: parseInt(process.env.CLEANUP_AGE_HOURS || "48"), // 48 hours
};

// Pagination defaults
const pagination = {
    defaultPage: 1,
    defaultLimit: 10,
    maxLimit: 100,
};

// Application configuration
const app = {
    name: process.env.APP_NAME || "Agri POS",
    version: process.env.APP_VERSION || "1.0.0",
    description: process.env.APP_DESCRIPTION || "Backend for Agri POS System",
    supportEmail: process.env.SUPPORT_EMAIL || "support@agripos.com",
    timezone: process.env.TZ || "Asia/Kolkata",
};

// Feature flags
const features = {
    enableMetrics: process.env.ENABLE_METRICS !== "false",
    enableHealthChecks: process.env.ENABLE_HEALTH_CHECKS !== "false",
    enableBackups: process.env.ENABLE_BACKUPS !== "false",
    enableCleanup: process.env.ENABLE_CLEANUP !== "false",
    enableMaintenance: process.env.ENABLE_MAINTENANCE === "true",
};

// Validate required configuration
const validateConfig = () => {
    const errors = [];
    
    // Check required environment variables
    if (isProduction) {
        if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "your-secret-key-change-in-production") {
            errors.push("JWT_SECRET must be set in production");
        }

        if (!process.env.INSTALLATION_JWT_SECRET) {
            errors.push("INSTALLATION_JWT_SECRET must be set in production");
        }

        if (!process.env.DB_PASS) {
            errors.push("DB_PASSWORD must be set in production");
        }

        if (!process.env.ALLOWED_ORIGINS) {
            errors.push("ALLOWED_ORIGINS must be set in production");
        }
    }
    
    // Check database configuration
    if (!database.database) {
        errors.push("DB_NAME is required");
    }
    
    if (errors.length > 0) {
        console.error("Configuration errors:");
        errors.forEach(error => console.error(`  - ${error}`));
        process.exit(1);
    }
};

// Export configuration
module.exports = {
    server,
    database,
    jwt,
    posJwt,
    installationJwt,
    aws,
    email,
    redis,
    security,
    pos,
    whatsapp,
    rateLimiting,
    upload,
    logging,
    cron,
    pagination,
    app,
    features,
    validateConfig,
    
    // Helper functions
    isDevelopment: () => isDevelopment,
    isProduction: () => isProduction,
    isTest: () => isTest,
};