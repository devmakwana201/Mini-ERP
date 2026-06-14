const db = require("../../config/db");
const winston = require("../../config/winston");

/**
 * Product Model — v4 schema
 * Table: products, product_vendors
 * CRITICAL: Never INSERT/UPDATE free_to_use_qty (GENERATED ALWAYS column)
 */
const productModel = {
    /**
     * List products with filters and pagination.
     */
    async findAll({ page = 1, limit = 20, product_type, procurement_strategy, is_active, search, low_stock_only } = {}) {
        const offset = (page - 1) * limit;
        const conditions = ["p.is_deleted = FALSE"];
        const params = [];

        if (product_type) { conditions.push("p.product_type = ?"); params.push(product_type); }
        if (procurement_strategy) { conditions.push("p.procurement_strategy = ?"); params.push(procurement_strategy); }
        if (is_active !== undefined) { conditions.push("p.is_active = ?"); params.push(is_active ? 1 : 0); }
        if (low_stock_only) { conditions.push("p.on_hand_qty <= p.min_stock_qty"); }
        if (search) {
            conditions.push("(p.product_name LIKE ? OR p.product_code LIKE ?)");
            const s = `%${search}%`;
            params.push(s, s);
        }

        const whereClause = `WHERE ${conditions.join(" AND ")}`;

        const countSql = `SELECT COUNT(*) as total FROM products p ${whereClause}`;
        const dataSql = `
            SELECT
                p.product_id, p.product_code, p.product_name, p.product_type,
                p.procurement_type, p.procurement_strategy,
                p.uom, p.sales_price, p.cost_price,
                p.on_hand_qty, p.reserved_qty, p.free_to_use_qty,
                p.min_stock_qty, p.bom_id, p.vendor_id,
                p.is_active, p.is_deleted,
                p.created_at, p.updated_at,
                CASE WHEN p.on_hand_qty <= p.min_stock_qty THEN TRUE ELSE FALSE END AS is_low_stock
            FROM products p
            ${whereClause}
            ORDER BY p.product_name ASC
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
     * Get product by ID with vendors list and BOM header.
     */
    async findById(product_id) {
        const [productRows] = await db.connection.query(
            `SELECT
                p.*,
                b.bom_name, b.bom_type, b.is_active AS bom_is_active
             FROM products p
             LEFT JOIN bom b ON b.bom_id = p.bom_id AND b.is_deleted = FALSE
             WHERE p.product_id = ? AND p.is_deleted = FALSE`,
            [product_id]
        );

        if (!productRows || productRows.length === 0) return null;

        const product = productRows[0];

        // Fetch vendor links
        const [vendors] = await db.connection.query(
            `SELECT pv.pv_id, pv.partner_id, pv.unit_cost, pv.lead_time_days,
                    pv.is_preferred, pv.is_active,
                    pa.name AS vendor_name
             FROM product_vendors pv
             JOIN partners pa ON pa.partner_id = pv.partner_id AND pa.is_deleted = FALSE
             WHERE pv.product_id = ?
             ORDER BY pv.is_preferred DESC, pa.name ASC`,
            [product_id]
        );

        product.vendors = vendors;
        return product;
    },

    /**
     * Get low-stock products.
     */
    async getLowStock({ page = 1, limit = 20 } = {}) {
        return productModel.findAll({ page, limit, low_stock_only: true });
    },

    /**
     * Create a new product.
     * NEVER includes free_to_use_qty in INSERT — it's a GENERATED ALWAYS column.
     */
    async create({
        product_code, product_name, product_type = "storable",
        procurement_type = "buy", procurement_strategy = "MTS",
        uom = "Pcs", sales_price = 0, cost_price = 0,
        on_hand_qty = 0, reserved_qty = 0, min_stock_qty = 0,
        bom_id = null, vendor_id = null,
        description = null, is_active = true, created_by,
    }) {
        const sql = `
            INSERT INTO products
                (product_code, product_name, product_type, procurement_type,
                 procurement_strategy, uom, sales_price, cost_price,
                 on_hand_qty, reserved_qty, min_stock_qty,
                 bom_id, vendor_id, description, is_active, is_deleted, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, ?)
        `;
        const result = await db.getResults(sql, [
            product_code, product_name, product_type, procurement_type,
            procurement_strategy, uom, sales_price, cost_price,
            on_hand_qty, reserved_qty, min_stock_qty,
            bom_id, vendor_id, description, is_active ? 1 : 0, created_by,
        ]);
        return { product_id: result.insertId };
    },

    /**
     * Update product.
     * Never touches free_to_use_qty (generated column).
     */
    async update(product_id, updates, updated_by) {
        const allowed = [
            "product_code", "product_name", "product_type", "procurement_type",
            "procurement_strategy", "uom", "sales_price", "cost_price",
            "min_stock_qty", "bom_id", "vendor_id", "description", "is_active",
        ];
        const setClauses = [];
        const params = [];

        for (const field of allowed) {
            if (updates[field] !== undefined) {
                setClauses.push(`${field} = ?`);
                params.push(updates[field]);
            }
        }

        if (setClauses.length === 0) return { affected: 0 };
        setClauses.push("updated_by = ?");
        params.push(updated_by, product_id);

        const sql = `UPDATE products SET ${setClauses.join(", ")} WHERE product_id = ? AND is_deleted = FALSE`;
        const result = await db.getResults(sql, params);
        return { affected: result.affectedRows };
    },

    /**
     * Manual stock adjustment.
     * Creates an inventory_transaction of type ADJUST.
     * adjustment can be positive (add) or negative (subtract).
     */
    async adjustStock(product_id, adjustment, reason, adjusted_by, connection) {
        const [rows] = await connection.query(
            `SELECT on_hand_qty FROM products WHERE product_id = ? AND is_deleted = FALSE FOR UPDATE`,
            [product_id]
        );
        if (!rows || rows.length === 0) throw new Error("Product not found");

        const qty_before = parseFloat(rows[0].on_hand_qty);
        const qty_after = qty_before + parseFloat(adjustment);

        if (qty_after < 0) throw new Error("Stock adjustment would result in negative on_hand_qty");

        await connection.query(
            `UPDATE products SET on_hand_qty = ?, updated_by = ? WHERE product_id = ?`,
            [qty_after, adjusted_by, product_id]
        );

        // Record ledger entry
        await connection.query(
            `INSERT INTO inventory_transactions
                (product_id, txn_type, reference_type, qty, qty_before, qty_after, notes, created_by)
             VALUES (?, 'ADJUST', 'ADJUSTMENT', ?, ?, ?, ?, ?)`,
            [product_id, Math.abs(adjustment), qty_before, qty_after, reason || "Manual adjustment", adjusted_by]
        );

        return { qty_before, qty_after, adjustment };
    },

    /**
     * Soft delete product.
     * Blocked if referenced in active order lines.
     */
    async softDelete(product_id, deleted_by) {
        const [soCheck] = await db.connection.query(
            `SELECT sol.sol_id FROM sales_order_lines sol
             JOIN sales_orders so ON so.so_id = sol.so_id
             WHERE sol.product_id = ? AND so.status NOT IN ('done','cancelled') AND so.is_deleted = FALSE
             LIMIT 1`,
            [product_id]
        );
        if (soCheck.length > 0) throw new Error("Cannot delete product with active sales orders");

        const result = await db.getResults(
            `UPDATE products SET is_deleted = TRUE, updated_by = ? WHERE product_id = ?`,
            [deleted_by, product_id]
        );
        return { affected: result.affectedRows };
    },

    // --- product_vendors sub-resource ---

    async getVendors(product_id) {
        const sql = `
            SELECT pv.*, pa.name AS vendor_name, pa.lead_time_days AS partner_lead_time
            FROM product_vendors pv
            JOIN partners pa ON pa.partner_id = pv.partner_id AND pa.is_deleted = FALSE
            WHERE pv.product_id = ?
            ORDER BY pv.is_preferred DESC, pa.name ASC
        `;
        return db.getResults(sql, [product_id]);
    },

    async addVendor({ product_id, partner_id, unit_cost = 0, lead_time_days = 0, is_preferred = false }, created_by) {
        if (is_preferred) {
            await db.getResults(
                `UPDATE product_vendors SET is_preferred = FALSE WHERE product_id = ?`, [product_id]
            );
        }
        const sql = `
            INSERT INTO product_vendors
                (product_id, partner_id, unit_cost, lead_time_days, is_preferred, is_active, created_by)
            VALUES (?, ?, ?, ?, ?, TRUE, ?)
            ON DUPLICATE KEY UPDATE
                unit_cost = VALUES(unit_cost),
                lead_time_days = VALUES(lead_time_days),
                is_preferred = VALUES(is_preferred),
                is_active = TRUE
        `;
        const result = await db.getResults(sql, [product_id, partner_id, unit_cost, lead_time_days, is_preferred ? 1 : 0, created_by]);
        return { pv_id: result.insertId };
    },

    async updateVendor(pv_id, { unit_cost, lead_time_days, is_preferred }, updated_by) {
        if (is_preferred) {
            // First, get product_id for this pv
            const [pvRows] = await db.connection.query(
                `SELECT product_id FROM product_vendors WHERE pv_id = ?`, [pv_id]
            );
            if (pvRows.length > 0) {
                await db.getResults(
                    `UPDATE product_vendors SET is_preferred = FALSE WHERE product_id = ?`,
                    [pvRows[0].product_id]
                );
            }
        }
        const result = await db.getResults(
            `UPDATE product_vendors SET unit_cost = ?, lead_time_days = ?, is_preferred = ?, updated_by = ?
             WHERE pv_id = ?`,
            [unit_cost, lead_time_days, is_preferred ? 1 : 0, updated_by, pv_id]
        );
        return { affected: result.affectedRows };
    },

    async deactivateVendor(pv_id, updated_by) {
        const result = await db.getResults(
            `UPDATE product_vendors SET is_active = FALSE, updated_by = ? WHERE pv_id = ?`,
            [updated_by, pv_id]
        );
        return { affected: result.affectedRows };
    },
};

module.exports = productModel;
