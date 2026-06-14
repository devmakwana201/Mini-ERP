const db = require("../config/db");
const ResponseFormatter = require("../utils/responseFormatter");

const auditController = {
    // GET /audit-logs
    async list(req, res) {
        try {
            const { page = 1, limit = 20, table_name, action, user_id, date_from, date_to } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const conditions = [];
            const params = [];
            if (table_name) { conditions.push("al.table_name = ?"); params.push(table_name); }
            if (action) { conditions.push("al.action = ?"); params.push(action); }
            if (user_id) { conditions.push("al.user_id = ?"); params.push(user_id); }
            if (date_from) { conditions.push("DATE(al.created_at) >= ?"); params.push(date_from); }
            if (date_to) { conditions.push("DATE(al.created_at) <= ?"); params.push(date_to); }
            const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

            const countResult = await db.getResults(`SELECT COUNT(*) as total FROM audit_logs al ${whereClause}`, params);
            const rows = await db.getResults(`
                SELECT al.*, u.name AS user_name, u.email AS user_email
                FROM audit_logs al
                LEFT JOIN users u ON u.user_id = al.user_id
                ${whereClause}
                ORDER BY al.created_at DESC
                LIMIT ? OFFSET ?
            `, [...params, parseInt(limit), offset]);

            return res.status(200).json(ResponseFormatter.paginated(rows, parseInt(page), parseInt(limit), countResult[0]?.total || 0));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // GET /audit-logs/:id
    async getById(req, res) {
        try {
            const rows = await db.getResults(`
                SELECT al.*, u.name AS user_name, u.email AS user_email
                FROM audit_logs al LEFT JOIN users u ON u.user_id = al.user_id
                WHERE al.log_id = ?
            `, [req.params.id]);
            if (!rows.length) return res.status(404).json(ResponseFormatter.notFound("Audit Log"));
            return res.status(200).json(ResponseFormatter.success(rows[0]));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },
};

module.exports = auditController;
