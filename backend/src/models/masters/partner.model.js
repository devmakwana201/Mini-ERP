const db = require("../../config/db");
const winston = require("../../config/winston");

/**
 * Partner Model — unified vendors + customers (v4 schema)
 * Table: partners
 * A partner can be is_vendor=TRUE, is_customer=TRUE, or BOTH.
 */
const partnerModel = {
    /**
     * List partners with filters and pagination.
     */
    async findAll({ page = 1, limit = 20, is_vendor, is_customer, is_active, search } = {}) {
        const offset = (page - 1) * limit;
        const conditions = ["p.is_deleted = FALSE"];
        const params = [];

        if (is_vendor !== undefined) {
            conditions.push("p.is_vendor = ?");
            params.push(is_vendor ? 1 : 0);
        }
        if (is_customer !== undefined) {
            conditions.push("p.is_customer = ?");
            params.push(is_customer ? 1 : 0);
        }
        if (is_active !== undefined) {
            conditions.push("p.is_active = ?");
            params.push(is_active ? 1 : 0);
        }
        if (search) {
            conditions.push("(p.name LIKE ? OR p.email LIKE ? OR p.phone LIKE ?)");
            const s = `%${search}%`;
            params.push(s, s, s);
        }

        const whereClause = `WHERE ${conditions.join(" AND ")}`;

        const countSql = `SELECT COUNT(*) as total FROM partners p ${whereClause}`;
        const dataSql = `
            SELECT
                p.partner_id, p.name, p.email, p.phone,
                p.address, p.city, p.state, p.country,
                p.gstin, p.is_vendor, p.is_customer, p.is_active,
                p.lead_time_days, p.payment_terms,
                p.created_at, p.created_by, p.updated_at
            FROM partners p
            ${whereClause}
            ORDER BY p.created_at DESC
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
     * Find partner by ID.
     */
    async findById(partner_id) {
        const sql = `
            SELECT
                p.*,
                JSON_ARRAYAGG(
                    IF(pv.pv_id IS NULL, NULL,
                        JSON_OBJECT(
                            'pv_id', pv.pv_id,
                            'product_id', pv.product_id,
                            'product_name', pr.product_name,
                            'product_code', pr.product_code,
                            'unit_cost', pv.unit_cost,
                            'lead_time_days', pv.lead_time_days,
                            'is_preferred', pv.is_preferred,
                            'is_active', pv.is_active
                        )
                    )
                ) AS product_links
            FROM partners p
            LEFT JOIN product_vendors pv ON pv.partner_id = p.partner_id AND pv.is_active = TRUE
            LEFT JOIN products pr ON pr.product_id = pv.product_id
            WHERE p.partner_id = ? AND p.is_deleted = FALSE
            GROUP BY p.partner_id
        `;
        const rows = await db.getResults(sql, [partner_id]);
        if (!rows || rows.length === 0) return null;

        const row = rows[0];
        // Clean up JSON_ARRAYAGG nulls
        try {
            const links = JSON.parse(row.product_links || "[]");
            row.product_links = links.filter(l => l !== null);
        } catch {
            row.product_links = [];
        }
        return row;
    },

    /**
     * Create a new partner.
     */
    async create({ name, email, phone, address, city, state, country, gstin,
        is_vendor = false, is_customer = false, lead_time_days = 0,
        payment_terms = null, is_active = true, created_by }) {
        const sql = `
            INSERT INTO partners
                (name, email, phone, address, city, state, country, gstin,
                 is_vendor, is_customer, lead_time_days, payment_terms,
                 is_active, is_deleted, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, ?)
        `;
        const result = await db.getResults(sql, [
            name, email || null, phone || null,
            address || null, city || null, state || null, country || null,
            gstin || null,
            is_vendor ? 1 : 0, is_customer ? 1 : 0,
            lead_time_days || 0, payment_terms || null,
            is_active ? 1 : 0,
            created_by,
        ]);
        return { partner_id: result.insertId };
    },

    /**
     * Update partner.
     */
    async update(partner_id, updates, updated_by) {
        const allowed = [
            "name", "email", "phone", "address", "city", "state", "country",
            "gstin", "is_vendor", "is_customer", "lead_time_days",
            "payment_terms", "is_active",
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
        params.push(updated_by);
        params.push(partner_id);

        const sql = `UPDATE partners SET ${setClauses.join(", ")} WHERE partner_id = ? AND is_deleted = FALSE`;
        const result = await db.getResults(sql, params);
        return { affected: result.affectedRows };
    },

    /**
     * Soft delete partner.
     * Blocked if active SOs or POs exist.
     */
    async softDelete(partner_id, deleted_by) {
        // Check active orders
        const [soCheck] = await db.connection.query(
            `SELECT so_id FROM sales_orders
             WHERE customer_id = ? AND status NOT IN ('done','cancelled') AND is_deleted = FALSE
             LIMIT 1`,
            [partner_id]
        );
        if (soCheck.length > 0) {
            throw new Error("Cannot delete partner with active sales orders");
        }

        const [poCheck] = await db.connection.query(
            `SELECT po_id FROM purchase_orders
             WHERE vendor_id = ? AND status NOT IN ('received','cancelled') AND is_deleted = FALSE
             LIMIT 1`,
            [partner_id]
        );
        if (poCheck.length > 0) {
            throw new Error("Cannot delete partner with active purchase orders");
        }

        const result = await db.getResults(
            `UPDATE partners SET is_deleted = TRUE, updated_by = ? WHERE partner_id = ?`,
            [deleted_by, partner_id]
        );
        return { affected: result.affectedRows };
    },

    /**
     * Get products linked to a vendor via product_vendors.
     */
    async getVendorProducts(partner_id) {
        const sql = `
            SELECT
                pv.pv_id, pv.product_id, pv.unit_cost, pv.lead_time_days,
                pv.is_preferred, pv.is_active,
                p.product_name, p.product_code, p.product_type, p.uom
            FROM product_vendors pv
            JOIN products p ON p.product_id = pv.product_id AND p.is_deleted = FALSE
            WHERE pv.partner_id = ?
            ORDER BY pv.is_preferred DESC, p.product_name ASC
        `;
        return db.getResults(sql, [partner_id]);
    },

    /**
     * Add vendor-product link.
     * Enforces: only one is_preferred per product.
     */
    async addProductVendorLink({ partner_id, product_id, unit_cost = 0, lead_time_days = 0, is_preferred = false }, created_by) {
        // Validate partner is_vendor
        const [partnerRows] = await db.connection.query(
            `SELECT is_vendor FROM partners WHERE partner_id = ? AND is_deleted = FALSE`,
            [partner_id]
        );
        if (!partnerRows.length || !partnerRows[0].is_vendor) {
            throw new Error("Partner must be a vendor to link products");
        }

        if (is_preferred) {
            // Clear existing preferred for this product
            await db.getResults(
                `UPDATE product_vendors SET is_preferred = FALSE WHERE product_id = ?`,
                [product_id]
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
        const result = await db.getResults(sql, [
            product_id, partner_id, unit_cost, lead_time_days,
            is_preferred ? 1 : 0, created_by,
        ]);
        return { pv_id: result.insertId || null };
    },

    /**
     * Remove vendor-product link (set is_active = FALSE).
     */
    async removeProductVendorLink(partner_id, product_id) {
        const result = await db.getResults(
            `UPDATE product_vendors SET is_active = FALSE WHERE partner_id = ? AND product_id = ?`,
            [partner_id, product_id]
        );
        return { affected: result.affectedRows };
    },

    // Convenience helpers for routes
    async findVendors(params) { return partnerModel.findAll({ ...params, is_vendor: true }); },
    async findCustomers(params) { return partnerModel.findAll({ ...params, is_customer: true }); },
};

module.exports = partnerModel;
