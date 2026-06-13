const winston = require("winston");
const fs = require("fs");
const path = require("path");
require("winston-daily-rotate-file");
const { logging } = require("./config");

// Define logs folder in project root
const logDirectory = path.resolve(process.cwd(), "logs");

// Ensure logs directory exists
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory, { recursive: true });
}

// Custom format for better readability
const customFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.printf((info) => {
        const { timestamp, level, message, stack, source, function: func, ...meta } = info;

        // Build the log line
        let logLine = `[${timestamp}] [${level.toUpperCase()}]`;

        // Add source file and function if available
        if (source || func) {
            logLine += ` [${source || 'unknown'}${func ? `::${func}` : ''}]`;
        }

        // Add the main message
        logLine += ` ${message}`;

        // Add metadata if present (excluding common fields)
        const metaKeys = Object.keys(meta).filter(
            key => !['level', 'timestamp', 'source', 'function'].includes(key)
        );

        if (metaKeys.length > 0) {
            logLine += `\n  → Meta: ${JSON.stringify(meta, null, 2)}`;
        }

        // Add stack trace if present (for errors)
        if (stack) {
            logLine += `\n  → Stack Trace:\n${stack.split('\n').map(line => `    ${line}`).join('\n')}`;
        }

        return logLine;
    })
);

// Console format for development (colored)
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.colorize(),
    winston.format.printf((info) => {
        const { timestamp, level, message, source, function: func } = info;
        let logLine = `[${timestamp}] ${level}`;

        if (source || func) {
            logLine += ` [${source || 'unknown'}${func ? `::${func}` : ''}]`;
        }

        logLine += `: ${message}`;
        return logLine;
    })
);

// Daily rotating file transport for general app logs
const fileRotateTransport = new winston.transports.DailyRotateFile({
    dirname: logDirectory,
    filename: "app_%DATE%.log",
    datePattern: logging.datePattern,
    maxSize: logging.maxSize,
    maxFiles: logging.maxFiles,
    zippedArchive: true,
    level: logging.level,
    format: customFormat,
});

// Daily rotating file transport for warning/error logs
const errorRotateTransport = new winston.transports.DailyRotateFile({
    dirname: logDirectory,
    filename: "error_%DATE%.log",
    datePattern: logging.datePattern,
    maxSize: logging.maxSize,
    maxFiles: logging.maxFiles,
    zippedArchive: true,
    level: "warn",
    format: customFormat,
});

// Console transport for development (optional, only if not in production)
const consoleTransport = new winston.transports.Console({
    level: "debug",
    format: consoleFormat,
});

// Create logger
const transports = [fileRotateTransport, errorRotateTransport];

// Add console logging in development
// if (process.env.NODE_ENV !== "production") {
    transports.push(consoleTransport);
// }

const logger = winston.createLogger({
    transports: transports,
    exitOnError: false,
});

logger.stream = {
    write: function (message) {
        logger.info(message.trim());
    },
};

module.exports = logger;
