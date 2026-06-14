const db = require("../../config/db");
const auditService = require("../../services/audit.service");
const ResponseFormatter = require("../../utils/responseFormatter");
const winston = require("../../config/winston");

const inventoryController = {
    // GET /inventory/transactions
    async listTransactions(req, res) {
        try {
            const { page = 1, limit = 20, product_id, txn_type, reference_type, date_from, date_to } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const conditions = [];
            const params = [];
            if (product_id) { conditions.push("it.product_id = ?"); params.push(product_id); }
            if (txn_type) { conditions.push("it.txn_type = ?"); params.push(txn_type); }
            if (reference_type) { conditions.push("it.reference_type = ?"); params.push(reference_type); }
            if (date_from) { conditions.push("DATE(it.created_at) >= ?"); params.push(date_from); }
            if (date_to) { conditions.push("DATE(it.created_at) <= ?"); params.push(date_to); }
            const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

            const countResult = await db.getResults(`SELECT COUNT(*) as total FROM inventory_transactions it ${whereClause}`, params);
            const rows = await db.getResults(`
                SELECT it.*, p.product_name, p.product_code, u.name AS created_by_name,
                       sl.name AS location_name
                FROM inventory_transactions it
                LEFT JOIN products p ON p.product_id = it.product_id
                LEFT JOIN users u ON u.user_id = it.created_by
                LEFT JOIN stock_locations sl ON sl.location_id = it.location_id
                ${whereClause}
                ORDER BY it.created_at DESC
                LIMIT ? OFFSET ?
            `, [...params, parseInt(limit), offset]);

            return res.status(200).json(ResponseFormatter.paginated(rows, parseInt(page), parseInt(limit), countResult[0]?.total || 0));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // GET /inventory/transactions/:id
    async getTransaction(req, res) {
        try {
            const rows = await db.getResults(`
                SELECT it.*, p.product_name, p.product_code, u.name AS created_by_name
                FROM inventory_transactions it
                LEFT JOIN products p ON p.product_id = it.product_id
                LEFT JOIN users u ON u.user_id = it.created_by
                WHERE it.txn_id = ?
            `, [req.params.id]);
            if (!rows.length) return res.status(404).json(ResponseFormatter.notFound("Transaction"));
            return res.status(200).json(ResponseFormatter.success(rows[0]));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // GET /inventory/ledger/:productId
    async getLedger(req, res) {
        try {
            const product_id = parseInt(req.params.productId);
            const rows = await db.getResults(`
                SELECT it.txn_id, it.reference_type, it.reference_id, it.txn_type,
                       it.qty, it.qty_before, it.qty_after, it.notes, it.created_at,
                       u.name AS created_by_name, sl.name AS location_name
                FROM inventory_transactions it
                LEFT JOIN users u ON u.user_id = it.created_by
                LEFT JOIN stock_locations sl ON sl.location_id = it.location_id
                WHERE it.product_id = ?
                ORDER BY it.created_at ASC
            `, [product_id]);

            // Get current stock summary
            const [product] = await db.connection.query(
                `SELECT product_name, product_code, on_hand_qty, reserved_qty, free_to_use_qty, uom FROM products WHERE product_id = ?`,
                [product_id]
            );

            return res.status(200).json(ResponseFormatter.success({
                product: product[0] || null,
                ledger: rows,
            }, "Stock ledger fetched"));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // GET /inventory/reservations
    async listReservations(req, res) {
        try {
            const { product_id, so_id, status } = req.query;
            const conditions = [];
            const params = [];
            if (product_id) { conditions.push("sr.product_id = ?"); params.push(product_id); }
            if (so_id) { conditions.push("sr.so_id = ?"); params.push(so_id); }
            if (status) { conditions.push("sr.status = ?"); params.push(status); }
            const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

            const rows = await db.getResults(`
                SELECT sr.*, p.product_name, p.product_code, CONCAT('SO-', LPAD(so.so_id, 4, '0')) AS so_number
                FROM stock_reservations sr
                LEFT JOIN products p ON p.product_id = sr.product_id
                LEFT JOIN sales_orders so ON so.so_id = sr.so_id
                ${whereClause}
                ORDER BY sr.created_at DESC
            `, params);

            return res.status(200).json(ResponseFormatter.success(rows, "Reservations fetched"));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },
};

module.exports = inventoryController;
