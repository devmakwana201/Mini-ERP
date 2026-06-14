const db = require("../../config/db");
const winston = require("../../config/winston");

/**
 * Sales Order Model — v4 schema
 * Tables: sales_orders, sales_order_lines, stock_reservations
 * Status machine: draft → confirmed → in_progress → done | cancelled
 */
const salesOrderModel = {
    /**
     * List sales orders with filters and pagination.
     */
    async findAll({ page = 1, limit = 20, status, so_type, customer_id, search, date_from, date_to } = {}) {
        const offset = (page - 1) * limit;
        const conditions = ["so.is_deleted = FALSE"];
        const params = [];

        if (status) { conditions.push("so.status = ?"); params.push(status); }
        if (so_type) { conditions.push("so.so_type = ?"); params.push(so_type); }
        if (customer_id) { conditions.push("so.customer_id = ?"); params.push(customer_id); }
        if (date_from) { conditions.push("DATE(so.created_at) >= ?"); params.push(date_from); }
        if (date_to) { conditions.push("DATE(so.created_at) <= ?"); params.push(date_to); }
        if (search) {
            conditions.push("(CONCAT('SO-', LPAD(so.so_id, 4, '0')) LIKE ? OR p.name LIKE ?)");
            const s = `%${search}%`;
            params.push(s, s);
        }

        const whereClause = `WHERE ${conditions.join(" AND ")}`;

        const countSql = `
            SELECT COUNT(*) as total
            FROM sales_orders so
            LEFT JOIN partners p ON p.partner_id = so.customer_id
            ${whereClause}
        `;
        const dataSql = `
            SELECT
                so.so_id, CONCAT('SO-', LPAD(so.so_id, 4, '0')) AS so_number,
                so.so_type, so.status,
                so.customer_id, p.name AS customer_name,
                so.total_amount, so.delivery_date,
                so.notes, so.created_at, so.updated_at,
                u.name AS created_by_name,
                COUNT(sol.sol_id) AS line_count
            FROM sales_orders so
            LEFT JOIN partners p ON p.partner_id = so.customer_id
            LEFT JOIN users u ON u.user_id = so.created_by
            LEFT JOIN sales_order_lines sol ON sol.so_id = so.so_id AND sol.is_deleted = FALSE
            ${whereClause}
            GROUP BY so.so_id
            ORDER BY so.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const [countResult, rows] = await Promise.all([
            db.getResults(countSql, params),
            db.getResults(dataSql, [...params, parseInt(limit), parseInt(offset)]),
        ]);

        return {
            data: rows,
            total: countResult[0]?.total || 0,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil((countResult[0]?.total || 0) / limit),
        };
    },

    /**
     * Get SO by ID with lines and reservation status.
     */
    async findById(so_id) {
        const [soRows] = await db.connection.query(
            `SELECT so.*,
                    p.name AS customer_name, p.phone AS customer_phone, p.email AS customer_email,
                    u.name AS created_by_name
             FROM sales_orders so
             LEFT JOIN partners p ON p.partner_id = so.customer_id
             LEFT JOIN users u ON u.user_id = so.created_by
             WHERE so.so_id = ? AND so.is_deleted = FALSE`,
            [so_id]
        );
        if (!soRows || soRows.length === 0) return null;

        const so = soRows[0];

        // Fetch lines
        const [lines] = await db.connection.query(
            `SELECT sol.*, pr.product_name, pr.product_code, pr.uom,
                    pr.on_hand_qty, pr.reserved_qty, pr.free_to_use_qty
             FROM sales_order_lines sol
             JOIN products pr ON pr.product_id = sol.product_id
             WHERE sol.so_id = ? AND sol.is_deleted = FALSE
             ORDER BY sol.sol_id ASC`,
            [so_id]
        );

        // Fetch reservations
        const [reservations] = await db.connection.query(
            `SELECT sr.*, pr.product_name, pr.product_code
             FROM stock_reservations sr
             JOIN products pr ON pr.product_id = sr.product_id
             WHERE sr.so_id = ?
             ORDER BY sr.reservation_id ASC`,
            [so_id]
        );

        so.lines = lines;
        so.reservations = reservations;
        return so;
    },

    /**
     * Get SO stats (for dashboard).
     */
    async getStats() {
        const [rows] = await db.connection.query(`
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
                SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
            FROM sales_orders
            WHERE is_deleted = FALSE
        `);
        return rows[0];
    },

    /**
     * Create a new SO in draft.
     */
    async create({ customer_id, so_type = "MTS", delivery_date, notes, lines = [], created_by }) {
        return db.runInTransaction(async (connection) => {
            const [soResult] = await connection.query(
                `INSERT INTO sales_orders
                    (customer_id, so_type, status, delivery_date, notes, total_amount, created_by)
                 VALUES (?, ?, 'draft', ?, ?, 0, ?)`,
                [customer_id, so_type, delivery_date || null, notes || null, created_by]
            );
            const so_id = soResult.insertId;
            const so_number = `SO-${String(so_id).padStart(4, "0")}`;

            let total = 0;
            for (const line of lines) {
                await connection.query(
                    `INSERT INTO sales_order_lines
                        (so_id, product_id, qty, unit_price, reserved_qty, delivered_qty, created_by)
                     VALUES (?, ?, ?, ?, 0, 0, ?)`,
                    [so_id, line.product_id, line.qty, line.unit_price, created_by]
                );
                total += parseFloat(line.qty) * parseFloat(line.unit_price);
            }

            await connection.query(
                `UPDATE sales_orders SET total_amount = ? WHERE so_id = ?`, [total, so_id]
            );

            return { so_id, so_number };
        });
    },

    /**
     * Update SO (only when draft).
     */
    async update(so_id, { customer_id, delivery_date, notes, so_type }, updated_by) {
        const [rows] = await db.connection.query(
            `SELECT status FROM sales_orders WHERE so_id = ? AND is_deleted = FALSE`, [so_id]
        );
        if (!rows || rows.length === 0) throw new Error("Sales order not found");
        if (rows[0].status !== "draft") throw new Error("Only draft sales orders can be updated");

        const result = await db.getResults(
            `UPDATE sales_orders SET customer_id = ?, delivery_date = ?, notes = ?, so_type = ?, updated_by = ?
             WHERE so_id = ?`,
            [customer_id, delivery_date || null, notes || null, so_type, updated_by, so_id]
        );
        return { affected: result.affectedRows };
    },

    /**
     * Add a line to a draft SO.
     */
    async addLine(so_id, { product_id, qty, unit_price }, created_by) {
        const [soRows] = await db.connection.query(
            `SELECT status FROM sales_orders WHERE so_id = ? AND is_deleted = FALSE`, [so_id]
        );
        if (!soRows || soRows.length === 0) throw new Error("Sales order not found");
        if (soRows[0].status !== "draft") throw new Error("Lines can only be added to draft orders");

        const [result] = await db.connection.query(
            `INSERT INTO sales_order_lines (so_id, product_id, qty, unit_price, reserved_qty, delivered_qty, created_by)
             VALUES (?, ?, ?, ?, 0, 0, ?)`,
            [so_id, product_id, qty, unit_price, created_by]
        );

        // Recalculate total
        await db.getResults(
            `UPDATE sales_orders SET total_amount = (SELECT COALESCE(SUM(subtotal), 0) FROM sales_order_lines WHERE so_id = ? AND is_deleted = FALSE)
             WHERE so_id = ?`,
            [so_id, so_id]
        );
        return { sol_id: result.insertId };
    },

    /**
     * Update an existing line (draft only).
     */
    async updateLine(so_id, sol_id, { qty, unit_price }, updated_by) {
        await db.getResults(
            `UPDATE sales_order_lines SET qty = ?, unit_price = ?, updated_by = ?
             WHERE sol_id = ? AND so_id = ?`,
            [qty, unit_price, updated_by, sol_id, so_id]
        );
        await db.getResults(
            `UPDATE sales_orders SET total_amount = (SELECT COALESCE(SUM(subtotal), 0) FROM sales_order_lines WHERE so_id = ? AND is_deleted = FALSE)
             WHERE so_id = ?`,
            [so_id, so_id]
        );
        return { sol_id };
    },

    /**
     * Remove a line (draft only).
     */
    async removeLine(so_id, sol_id, deleted_by) {
        await db.getResults(
            `UPDATE sales_order_lines SET is_deleted = TRUE, updated_by = ? WHERE sol_id = ? AND so_id = ?`,
            [deleted_by, sol_id, so_id]
        );
        await db.getResults(
            `UPDATE sales_orders SET total_amount = (SELECT COALESCE(SUM(subtotal), 0) FROM sales_order_lines WHERE so_id = ? AND is_deleted = FALSE)
             WHERE so_id = ?`,
            [so_id, so_id]
        );
    },

    /**
     * Soft delete SO (draft/cancelled only).
     */
    async softDelete(so_id, deleted_by) {
        const [rows] = await db.connection.query(
            `SELECT status FROM sales_orders WHERE so_id = ? AND is_deleted = FALSE`, [so_id]
        );
        if (!rows || rows.length === 0) throw new Error("Sales order not found");
        if (!["draft", "cancelled"].includes(rows[0].status)) {
            throw new Error("Only draft or cancelled orders can be deleted");
        }

        await db.getResults(
            `UPDATE sales_orders SET is_deleted = TRUE, updated_by = ? WHERE so_id = ?`,
            [deleted_by, so_id]
        );
        return { so_id };
    },

    /**
     * Create a Sales Order from an existing Purchase Order.
     */
    async createFromPO(po_id, created_by) {
        return db.runInTransaction(async (connection) => {
            // 1. Check if SO already exists for this PO
            const [existingSO] = await connection.query(
                `SELECT so_id, CONCAT('SO-', LPAD(so_id, 4, '0')) AS so_number
                 FROM sales_orders
                 WHERE po_id = ? AND is_deleted = FALSE`,
                [po_id]
            );
            if (existingSO && existingSO.length > 0) {
                throw new Error(`Sales Order ${existingSO[0].so_number} has already been generated from this Purchase Order.`);
            }

            // 2. Fetch the Purchase Order
            const [poRows] = await connection.query(
                `SELECT po.*, p.name AS vendor_name
                 FROM purchase_orders po
                 LEFT JOIN partners p ON p.partner_id = po.vendor_id
                 WHERE po.po_id = ? AND po.is_deleted = FALSE`,
                [po_id]
            );
            if (!poRows || poRows.length === 0) {
                throw new Error("Purchase Order not found");
            }
            const po = poRows[0];

            // 3. Fetch PO Lines
            const [poLines] = await connection.query(
                `SELECT pol.*, pr.sales_price
                 FROM purchase_order_lines pol
                 JOIN products pr ON pr.product_id = pol.product_id
                 WHERE pol.po_id = ? AND pol.is_deleted = FALSE`,
                [po_id]
            );
            if (!poLines || poLines.length === 0) {
                throw new Error("Cannot generate Sales Order from an empty Purchase Order");
            }

            // 4. Ensure partner is marked as customer
            await connection.query(
                `UPDATE partners SET is_customer = TRUE WHERE partner_id = ?`,
                [po.vendor_id]
            );

            // 5. Create Sales Order
            const delivery_date = po.expected_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const notes = `Generated from PO-${String(po_id).padStart(4, "0")}.${po.notes ? " Notes: " + po.notes : ""}`;
            
            const [soResult] = await connection.query(
                `INSERT INTO sales_orders
                    (customer_id, so_type, status, delivery_date, notes, total_amount, created_by, po_id)
                 VALUES (?, 'MTS', 'draft', ?, ?, 0, ?, ?)`,
                [po.vendor_id, delivery_date, notes, created_by, po_id]
            );
            const so_id = soResult.insertId;
            const so_number = `SO-${String(so_id).padStart(4, "0")}`;

            // 6. Create Sales Order Lines
            let total = 0;
            for (const line of poLines) {
                const qty = parseFloat(line.qty_ordered);
                const unit_price = parseFloat(line.sales_price) > 0 ? parseFloat(line.sales_price) : parseFloat(line.unit_cost);
                const subtotal = qty * unit_price;
                total += subtotal;

                await connection.query(
                    `INSERT INTO sales_order_lines
                        (so_id, product_id, qty, unit_price, reserved_qty, delivered_qty, created_by)
                     VALUES (?, ?, ?, ?, 0, 0, ?)`,
                    [so_id, line.product_id, qty, unit_price, created_by]
                );
            }

            // 7. Update SO total
            await connection.query(
                `UPDATE sales_orders SET total_amount = ? WHERE so_id = ?`,
                [total, so_id]
            );

            return { so_id, so_number };
        });
    },
};

module.exports = salesOrderModel;

