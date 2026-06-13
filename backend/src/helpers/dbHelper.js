const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const winston = require("../config/winston");
const { database } = require("../config/config");

const isWindows = process.platform === "win32";
const MYSQLDUMP_PATH =
    process.env.MYSQLDUMP_PATH ||
    (isWindows ? `"D:/wamp/bin/mysql/mysql9.1.0/bin/mysqldump.exe"` : "/usr/bin/mysqldump");

// put backups at project root
const BACKUP_DIR = process.env.BACKUP_DIR || path.resolve(__dirname, "..", "..", "db_backups");
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

// helper to sanitize env values: trim, remove CR/LF, strip ONE pair of wrapping quotes
const envClean = (v = "") =>
    String(v)
        .replace(/\r/g, "")
        .replace(/\n/g, "")
        .trim()
        .replace(/^['"]|['"]$/g, "");

const DB_NAME = database.database;
const DB_USER = database.user;
const DB_PASS = database.password;
const DB_HOST = database.host;
const DB_PORT = database.port;

const buildPasswordPart = (pwd) => {
    if (!pwd) return "";
    return isWindows
        ? `-p"${pwd.replace(/"/g, '\\"')}"` // Windows: use double-quotes
        : "-p'" + pwd.replace(/'/g, "'\\''") + "'"; // Linux: single-quote, escape '
};

async function backupDatabase(source = "default") {
    return new Promise((resolve, reject) => {
        const now = new Date();
        const date = now.toISOString().split("T")[0];
        const time = now.toTimeString().split(" ")[0].replace(/:/g, "-");

        const fileName =
            source === "manual"
                ? `manual-backup-${date}-${time}.sql`
                : `backup-${date}-${time}.sql`;
        const filePath = path.join(BACKUP_DIR, fileName);

        // single-quote password to avoid $ expansion, escape any internal '
        // const passwordPart = DB_PASS ? "-p'" + DB_PASS.replace(/'/g, "'\\''") + "'" : "";
        const passwordPart = buildPasswordPart(DB_PASS);

        const cmd =
            `${MYSQLDUMP_PATH} ` +
            `-h "${DB_HOST}" -P "${DB_PORT}" ` +
            `--protocol=TCP ` + // <-- force TCP
            `-u "${DB_USER}" ${passwordPart} ` +
            `--no-tablespaces --single-transaction --routines --events --column-statistics=0 ` +
            `"${DB_NAME}" > "${filePath}"`;

        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                // mask password in logs
                const masked = cmd.replace(/-p'[^']*'/, "-p'***'").replace(/-p"[^"]*"/, '-p"***"');
                winston.error(`DB Backup failed: ${error.message}`, {
                    source: "dbHelper.js",
                    function: "backupDatabase",
                    cmd: masked,
                    code: error.code,
                    stderr: String(stderr || ""),
                    backupSource: source,
                });
                const err = new Error(
                    (stderr && String(stderr).trim()) || error.message || "mysqldump failed"
                );
                err.code = error.code;
                return reject(err);
            }

            winston.info(`DB Backup created: ${fileName}`, {
                source: "dbHelper.js",
                function: "backupDatabase",
                fileName,
                backupPath: filePath,
                backupSource: source,
            });

            fs.readdir(BACKUP_DIR, (err, files) => {
                if (err) {
                    winston.warn("⚠️ Backup cleanup failed:", err);
                    return resolve(fileName);
                }
                files
                    .filter((f) => f.startsWith("backup-") && f.endsWith(".sql"))
                    .sort()
                    .reverse()
                    .slice(3)
                    .forEach((f) => {
                        fs.unlink(path.join(BACKUP_DIR, f), (e) => {
                            if (e) winston.warn(`❌ Failed to delete old backup: ${f}`, e);
                            else winston.info(`🗑️ Deleted old backup: ${f}`);
                        });
                    });

                resolve(fileName);
            });
        });
    });
}

module.exports = { backupDatabase };
