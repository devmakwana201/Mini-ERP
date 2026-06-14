const db = require("../../config/db");
const winston = require("../../config/winston");

const purchaseOrderModel = {
    async findAll({ page = 1, limit = 20, status, vendor_id, search, date_from, date_to } = {}) {
        const offset = (page - 1) * limit;
        const conditions = ["po.is_deleted = FALSE"];
        const params = [];

        if (status) { conditions.push("po.status = ?"); params.push(status); }
        if (vendor_id) { conditions.push("po.vendor_id = ?"); params.push(vendor_id); }
        if (date_from) { conditions.push("DATE(po.created_at) >= ?"); params.push(date_from); }
        if (date_to) { conditions.push("DATE(po.created_at) <= ?"); params.push(date_to); }
        if (search) {
            conditions.push("(CONCAT('PO-', LPAD(po.po_id, 4, '0')) LIKE ? OR p.name LIKE ?)");
            const s = `%${search}%`;
            params.push(s, s);
        }

        const whereClause = `WHERE ${conditions.join(" AND ")}`;
        const countSql = `SELECT COUNT(*) as total FROM purchase_orders po LEFT JOIN partners p ON p.partner_id = po.vendor_id ${whereClause}`;
        const dataSql = `
            SELECT po.po_id, CONCAT('PO-', LPAD(po.po_id, 4, '0')) AS po_number,
                   po.vendor_id, p.name AS vendor_name,
                   po.status, po.total_amount, po.expected_date, po.notes,
                   po.created_at, u.name AS created_by_name,
                   COUNT(DISTINCT pol.pol_id) AS line_count,
                   so.so_id AS linked_so_id,
                   CONCAT('SO-', LPAD(so.so_id, 4, '0')) AS linked_so_number,
                   so.status AS linked_so_status
            FROM purchase_orders po
            LEFT JOIN partners p ON p.partner_id = po.vendor_id
            LEFT JOIN users u ON u.user_id = po.created_by
            LEFT JOIN purchase_order_lines pol ON pol.po_id = po.po_id AND pol.is_deleted = FALSE
            LEFT JOIN sales_orders so ON so.po_id = po.po_id AND so.is_deleted = FALSE
            ${whereClause}
            GROUP BY po.po_id, so.so_id, so.status
            ORDER BY po.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const [countResult, rows] = await Promise.all([
            db.getResults(countSql, params),
            db.getResults(dataSql, [...params, parseInt(limit), parseInt(offset)]),
        ]);

        return {
            data: rows, total: countResult[0]?.total || 0,
            page: parseInt(page), limit: parseInt(limit),
            totalPages: Math.ceil((countResult[0]?.total || 0) / limit),
        };
    },

    async findById(po_id) {
        const [poRows] = await db.connection.query(
            `SELECT po.*, p.name AS vendor_name, p.phone AS vendor_phone,
                    u.name AS created_by_name
             FROM purchase_orders po
             LEFT JOIN partners p ON p.partner_id = po.vendor_id
             LEFT JOIN users u ON u.user_id = po.created_by
             WHERE po.po_id = ? AND po.is_deleted = FALSE`,
            [po_id]
        );
        if (!poRows || poRows.length === 0) return null;
        const po = poRows[0];

        const [lines] = await db.connection.query(
            `SELECT pol.*, pr.product_name, pr.product_code, pr.uom
             FROM purchase_order_lines pol
             JOIN products pr ON pr.product_id = pol.product_id
             WHERE pol.po_id = ? AND pol.is_deleted = FALSE
             ORDER BY pol.pol_id ASC`,
            [po_id]
        );
        po.lines = lines;
        return po;
    },

    async getStats() {
        const [rows] = await db.connection.query(`
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft,
                SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
                SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END) AS received,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
            FROM purchase_orders WHERE is_deleted = FALSE
        `);
        return rows[0];
    },

    async create({ vendor_id, expected_date, notes, lines = [], created_by }) {
        return db.runInTransaction(async (connection) => {
            const [poResult] = await connection.query(
                `INSERT INTO purchase_orders (vendor_id, status, expected_date, notes, total_amount, created_by)
                 VALUES (?, 'draft', ?, ?, 0, ?)`,
                [vendor_id || null, expected_date || null, notes || null, created_by]
            );
            const po_id = poResult.insertId;
            const po_number = `PO-${String(po_id).padStart(4, "0")}`;

            let total = 0;
            for (const line of lines) {
                const qty = parseFloat(line.qty_ordered || line.qty_required || 0);
                await connection.query(
                    `INSERT INTO purchase_order_lines (po_id, product_id, qty_ordered, qty_received, unit_cost, created_by)
                     VALUES (?, ?, ?, 0, ?, ?)`,
                    [po_id, line.product_id, qty, line.unit_cost || 0, created_by]
                );
                total += qty * parseFloat(line.unit_cost || 0);
            }

            await connection.query(`UPDATE purchase_orders SET total_amount = ? WHERE po_id = ?`, [total, po_id]);
            return { po_id, po_number };
        });
    },

    async update(po_id, { vendor_id, expected_date, notes }, updated_by) {
        const [rows] = await db.connection.query(
            `SELECT status FROM purchase_orders WHERE po_id = ? AND is_deleted = FALSE`, [po_id]
        );
        if (!rows || rows.length === 0) throw new Error("Purchase order not found");
        if (!["draft", "sent"].includes(rows[0].status)) throw new Error("Only draft or sent orders can be updated");

        await db.getResults(
            `UPDATE purchase_orders SET vendor_id = ?, expected_date = ?, notes = ?, updated_by = ? WHERE po_id = ?`,
            [vendor_id || null, expected_date || null, notes || null, updated_by, po_id]
        );
        return { po_id };
    },

    async softDelete(po_id, deleted_by) {
        const [rows] = await db.connection.query(
            `SELECT status FROM purchase_orders WHERE po_id = ? AND is_deleted = FALSE`, [po_id]
        );
        if (!rows || rows.length === 0) throw new Error("Purchase order not found");
        if (rows[0].status !== "draft") throw new Error("Only draft purchase orders can be deleted");

        await db.getResults(
            `UPDATE purchase_orders SET is_deleted = TRUE, updated_by = ? WHERE po_id = ?`,
            [deleted_by, po_id]
        );
        return { po_id };
    },
};

module.exports = purchaseOrderModel;
