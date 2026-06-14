const db = require("../../config/db");
const winston = require("../../config/winston");

const manufacturingOrderModel = {
    async findAll({ page = 1, limit = 20, status, mo_type, product_id, search } = {}) {
        const offset = (page - 1) * limit;
        const conditions = ["mo.is_deleted = FALSE"];
        const params = [];

        if (status) { conditions.push("mo.status = ?"); params.push(status); }
        if (mo_type) { conditions.push("mo.mo_type = ?"); params.push(mo_type); }
        if (product_id) { conditions.push("mo.product_id = ?"); params.push(product_id); }
        if (search) {
            conditions.push("(CONCAT('MO-', LPAD(mo.mo_id, 4, '0')) LIKE ? OR p.product_name LIKE ?)");
            const s = `%${search}%`;
            params.push(s, s);
        }

        const whereClause = `WHERE ${conditions.join(" AND ")}`;
        const countSql = `SELECT COUNT(*) as total FROM manufacturing_orders mo LEFT JOIN products p ON p.product_id = mo.product_id ${whereClause}`;
        const dataSql = `
            SELECT mo.mo_id, CONCAT('MO-', LPAD(mo.mo_id, 4, '0')) AS mo_number,
                   mo.product_id, p.product_name, p.product_code,
                   mo.bom_id, mo.so_id, mo.mo_type, mo.status,
                   mo.qty_planned, mo.qty_produced, mo.scheduled_date,
                   mo.created_at, u.name AS created_by_name
            FROM manufacturing_orders mo
            LEFT JOIN products p ON p.product_id = mo.product_id
            LEFT JOIN users u ON u.user_id = mo.created_by
            ${whereClause}
            ORDER BY mo.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const [countResult, rows] = await Promise.all([
            db.getResults(countSql, params),
            db.getResults(dataSql, [...params, parseInt(limit), parseInt(offset)]),
        ]);
        return { data: rows, total: countResult[0]?.total || 0, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil((countResult[0]?.total || 0) / limit) };
    },

    async findById(mo_id) {
        const [moRows] = await db.connection.query(
            `SELECT mo.*, p.product_name, p.product_code, p.uom,
                    b.bom_name, u.name AS created_by_name
             FROM manufacturing_orders mo
             JOIN products p ON p.product_id = mo.product_id
             LEFT JOIN bom b ON b.bom_id = mo.bom_id
             LEFT JOIN users u ON u.user_id = mo.created_by
             WHERE mo.mo_id = ? AND mo.is_deleted = FALSE`,
            [mo_id]
        );
        if (!moRows || moRows.length === 0) return null;
        const mo = moRows[0];

        const [components] = await db.connection.query(
            `SELECT mc.*, pr.product_name AS component_name, pr.product_code AS component_code,
                    pr.on_hand_qty, pr.free_to_use_qty
             FROM mo_components mc
             JOIN products pr ON pr.product_id = mc.product_id
             WHERE mc.mo_id = ?`,
            [mo_id]
        );

        const [work_orders] = await db.connection.query(
            `SELECT wo.*, op.name AS op_name, wc.name AS work_center_name
             FROM work_orders wo
             LEFT JOIN operations op ON op.operation_id = wo.operation_id
             LEFT JOIN work_centers wc ON wc.work_center_id = wo.work_center_id
             WHERE wo.mo_id = ? AND wo.is_deleted = FALSE`,
            [mo_id]
        );

        mo.components = components;
        mo.work_orders = work_orders;
        return mo;
    },

    async getStats() {
        const [rows] = await db.connection.query(`
            SELECT COUNT(*) AS total,
                SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
                SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
            FROM manufacturing_orders WHERE is_deleted = FALSE
        `);
        return rows[0];
    },

    async create({ product_id, bom_id, so_id, mo_type = "MTS", qty_planned, scheduled_date, notes, created_by }) {
        return db.runInTransaction(async (connection) => {
            const [result] = await connection.query(
                `INSERT INTO manufacturing_orders (product_id, bom_id, so_id, mo_type, status, qty_planned, qty_produced, scheduled_date, created_by)
                 VALUES (?, ?, ?, ?, 'draft', ?, 0, ?, ?)`,
                [product_id, bom_id || null, so_id || null, mo_type, qty_planned, scheduled_date || null, created_by]
            );
            const mo_id = result.insertId;
            const mo_number = `MO-${String(mo_id).padStart(4, "0")}`;
            return { mo_id, mo_number };
        });
    },

    async update(mo_id, { qty_planned, scheduled_date, notes }, updated_by) {
        const [rows] = await db.connection.query(`SELECT status FROM manufacturing_orders WHERE mo_id = ? AND is_deleted = FALSE`, [mo_id]);
        if (!rows.length) throw new Error("Manufacturing order not found");
        if (rows[0].status !== "draft") throw new Error("Only draft MOs can be updated");
        await db.getResults(
            `UPDATE manufacturing_orders SET qty_planned = ?, scheduled_date = ?, notes = ?, updated_by = ? WHERE mo_id = ?`,
            [qty_planned, scheduled_date || null, notes || null, updated_by, mo_id]
        );
        return { mo_id };
    },

    async softDelete(mo_id, deleted_by) {
        const [rows] = await db.connection.query(`SELECT status FROM manufacturing_orders WHERE mo_id = ? AND is_deleted = FALSE`, [mo_id]);
        if (!rows.length) throw new Error("Manufacturing order not found");
        if (rows[0].status !== "draft") throw new Error("Only draft MOs can be deleted");
        await db.getResults(`UPDATE manufacturing_orders SET is_deleted = TRUE, updated_by = ? WHERE mo_id = ?`, [deleted_by, mo_id]);
        return { mo_id };
    },
};

module.exports = manufacturingOrderModel;
