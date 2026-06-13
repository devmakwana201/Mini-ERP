const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const { backupDatabase } = require("../helpers/dbHelper");
const winston = require("../config/winston");
const ResponseFormatter = require("../utils/responseFormatter");
const { security } = require("../config/config");

const BACKUP_DIR = path.join(__dirname, "../../db_backups");
const VALID_TOKEN = security.dbBackupToken;

router.get("/list", (req, res) => {
    const token = req.query.token;
    if (token !== VALID_TOKEN) return res.status(403).json(ResponseFormatter.forbidden("Invalid backup token"));

    const files = fs
        .readdirSync(BACKUP_DIR)
        .filter((f) => f.endsWith(".sql"))
        .sort(
            (a, b) =>
                fs.statSync(path.join(BACKUP_DIR, b)).mtime -
                fs.statSync(path.join(BACKUP_DIR, a)).mtime
        );

    return res.json(ResponseFormatter.success({ backups: files }, "Backup files retrieved successfully"));
});

router.get("/download/:filename", (req, res) => {
    const token = req.query.token;
    if (token !== VALID_TOKEN) return res.status(403).json(ResponseFormatter.forbidden("Invalid backup token"));

    const file = path.basename(req.params.filename);
    const filePath = path.join(BACKUP_DIR, file);

    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).json(ResponseFormatter.notFound("Backup file"));
    }
});

router.post("/backupdb", async (req, res) => {
    const token = req.query.token;
    if (token !== VALID_TOKEN) return res.status(403).json(ResponseFormatter.forbidden("Invalid backup token"));

    try {
        const fileName = await backupDatabase("manual");
        res.status(200).json(ResponseFormatter.success({ fileName }, "Database backup created successfully"));
    } catch (error) {
        winston.error(`Backup error: ${error.message}`, {
            source: "db-backup.routes.js",
            function: "POST /backupdb",
            error: error.message,
            code: error.code,
            errno: error.errno,
            stack: error.stack,
            stderr: error.stderr,
            stdout: error.stdout
        });
        res.status(500).json(
            ResponseFormatter.serverError(
                error.message || "Database backup failed",
                error.stderr || error.stdout || "No additional details"
            )
        );
    }
});

module.exports = {
    path: "/db-backup",
    router,
};
