const db = require("../../config/db");
const auditService = require("../../services/audit.service");
const ResponseFormatter = require("../../utils/responseFormatter");
const winston = require("../../config/winston");

const workOrderController = {
    async list(req, res) {
        try {
            const { page = 1, limit = 20, status, mo_id, work_center_id } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const conditions = ["wo.is_deleted = FALSE"];
            const params = [];
            if (status) { conditions.push("wo.status = ?"); params.push(status); }
            if (mo_id) { conditions.push("wo.mo_id = ?"); params.push(mo_id); }
            if (work_center_id) { conditions.push("wo.work_center_id = ?"); params.push(work_center_id); }
            const whereClause = `WHERE ${conditions.join(" AND ")}`;

            const countResult = await db.getResults(`SELECT COUNT(*) as total FROM work_orders wo ${whereClause}`, params);
            const rows = await db.getResults(`
                SELECT wo.*, CONCAT('MO-', LPAD(mo.mo_id, 4, '0')) AS mo_number, op.name AS operation_name, wc.name AS work_center_name,
                       p.product_name AS mo_product_name
                FROM work_orders wo
                LEFT JOIN manufacturing_orders mo ON mo.mo_id = wo.mo_id
                LEFT JOIN products p ON p.product_id = mo.product_id
                LEFT JOIN operations op ON op.operation_id = wo.operation_id
                LEFT JOIN work_centers wc ON wc.work_center_id = wo.work_center_id
                ${whereClause}
                ORDER BY wo.created_at DESC
                LIMIT ? OFFSET ?
            `, [...params, parseInt(limit), offset]);

            return res.status(200).json(ResponseFormatter.paginated(rows, parseInt(page), parseInt(limit), countResult[0]?.total || 0));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    async getById(req, res) {
        try {
            const rows = await db.getResults(`
                SELECT wo.*, CONCAT('MO-', LPAD(mo.mo_id, 4, '0')) AS mo_number, op.name AS operation_name, wc.name AS work_center_name
                FROM work_orders wo
                LEFT JOIN manufacturing_orders mo ON mo.mo_id = wo.mo_id
                LEFT JOIN operations op ON op.operation_id = wo.operation_id
                LEFT JOIN work_centers wc ON wc.work_center_id = wo.work_center_id
                WHERE wo.work_order_id = ? AND wo.is_deleted = FALSE
            `, [req.params.id]);
            if (!rows.length) return res.status(404).json(ResponseFormatter.notFound("Work Order"));
            return res.status(200).json(ResponseFormatter.success(rows[0]));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    async update(req, res) {
        try {
            const wo_id = req.params.id;
            const { scheduled_date, duration_hours } = req.body;
            await db.getResults(
                `UPDATE work_orders SET scheduled_date = ?, duration_hours = ?, updated_by = ? WHERE work_order_id = ? AND is_deleted = FALSE`,
                [scheduled_date || null, duration_hours || null, req.user?.userId, wo_id]
            );
            return res.status(200).json(ResponseFormatter.updated({ work_order_id: wo_id }));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    async start(req, res) {
        const wo_id = parseInt(req.params.id);
        try {
            await db.runInTransaction(async (connection) => {
                const [rows] = await connection.query(
                    `SELECT wo.status, mo.status AS mo_status FROM work_orders wo JOIN manufacturing_orders mo ON mo.mo_id = wo.mo_id WHERE wo.work_order_id = ? AND wo.is_deleted = FALSE FOR UPDATE`,
                    [wo_id]
                );
                if (!rows.length) throw new Error("Work order not found");
                if (rows[0].status !== "pending") throw new Error(`Cannot start a ${rows[0].status} work order`);
                if (!["confirmed", "in_progress"].includes(rows[0].mo_status)) throw new Error("Parent MO must be confirmed or in_progress");
                await connection.query(
                    `UPDATE work_orders SET status = 'in_progress', started_at = NOW(), updated_by = ? WHERE work_order_id = ?`,
                    [req.user?.userId, wo_id]
                );
                await auditService.logAudit({ user_id: req.user?.userId, table_name: "work_orders", record_id: wo_id, action: "UPDATE", new_values: { status: "in_progress" } });
            });
            return res.status(200).json(ResponseFormatter.success({ work_order_id: wo_id }, "Work order started"));
        } catch (err) {
            if (err.message.includes("Cannot start") || err.message.includes("Parent MO")) return res.status(422).json(ResponseFormatter.error(err.message, 422));
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    async complete(req, res) {
        const wo_id = parseInt(req.params.id);
        try {
            await db.runInTransaction(async (connection) => {
                const [rows] = await connection.query(`SELECT status FROM work_orders WHERE work_order_id = ? AND is_deleted = FALSE FOR UPDATE`, [wo_id]);
                if (!rows.length) throw new Error("Work order not found");
                if (rows[0].status !== "in_progress") throw new Error(`Can only complete an in_progress work order`);
                await connection.query(
                    `UPDATE work_orders SET status = 'done', completed_at = NOW(), updated_by = ? WHERE work_order_id = ?`,
                    [req.user?.userId, wo_id]
                );
                await auditService.logAudit({ user_id: req.user?.userId, table_name: "work_orders", record_id: wo_id, action: "UPDATE", new_values: { status: "done" } });
            });
            return res.status(200).json(ResponseFormatter.success({ work_order_id: wo_id }, "Work order completed"));
        } catch (err) {
            if (err.message.includes("Can only complete")) return res.status(422).json(ResponseFormatter.error(err.message, 422));
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    async cancel(req, res) {
        const wo_id = parseInt(req.params.id);
        try {
            await db.runInTransaction(async (connection) => {
                const [rows] = await connection.query(`SELECT status FROM work_orders WHERE work_order_id = ? AND is_deleted = FALSE FOR UPDATE`, [wo_id]);
                if (!rows.length) throw new Error("Work order not found");
                if (rows[0].status === "done") throw new Error("Cannot cancel a completed work order");
                await connection.query(`UPDATE work_orders SET status = 'cancelled', updated_by = ? WHERE work_order_id = ?`, [req.user?.userId, wo_id]);
            });
            return res.status(200).json(ResponseFormatter.success({ work_order_id: wo_id }, "Work order cancelled"));
        } catch (err) {
            if (err.message.includes("Cannot cancel")) return res.status(422).json(ResponseFormatter.error(err.message, 422));
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },
};

module.exports = workOrderController;
