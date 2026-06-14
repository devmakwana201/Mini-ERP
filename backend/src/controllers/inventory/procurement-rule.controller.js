const db = require("../../config/db");
const procurementService = require("../../services/procurement.service");
const auditService = require("../../services/audit.service");
const ResponseFormatter = require("../../utils/responseFormatter");
const winston = require("../../config/winston");

const procurementRuleController = {
    async list(req, res) {
        try {
            const { product_id, strategy, is_active } = req.query;
            const conditions = ["pr.is_deleted = FALSE"];
            const params = [];
            if (product_id) { conditions.push("pr.product_id = ?"); params.push(product_id); }
            if (strategy) { conditions.push("pr.strategy = ?"); params.push(strategy); }
            if (is_active !== undefined) { conditions.push("pr.is_active = ?"); params.push(is_active === "true" ? 1 : 0); }

            const rows = await db.getResults(`
                SELECT pr.*, p.product_name, p.product_code, p.on_hand_qty, p.reserved_qty, p.free_to_use_qty,
                       pa.name AS preferred_vendor_name
                FROM procurement_rules pr
                JOIN products p ON p.product_id = pr.product_id
                LEFT JOIN partners pa ON pa.partner_id = pr.preferred_vendor_id
                WHERE ${conditions.join(" AND ")}
                ORDER BY p.product_name ASC
            `, params);
            return res.status(200).json(ResponseFormatter.success(rows, "Procurement rules fetched"));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    async getById(req, res) {
        try {
            const rows = await db.getResults(`
                SELECT pr.*, p.product_name, p.product_code, pa.name AS preferred_vendor_name
                FROM procurement_rules pr
                JOIN products p ON p.product_id = pr.product_id
                LEFT JOIN partners pa ON pa.partner_id = pr.preferred_vendor_id
                WHERE pr.rule_id = ? AND pr.is_deleted = FALSE
            `, [req.params.id]);
            if (!rows.length) return res.status(404).json(ResponseFormatter.notFound("Procurement Rule"));
            return res.status(200).json(ResponseFormatter.success(rows[0]));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    async create(req, res) {
        try {
            const { product_id, strategy = "MTS", min_stock_qty = 0, reorder_qty = 0, preferred_vendor_id = null, is_active = true } = req.body;

            // Only one active rule per product
            const existing = await db.getResults(
                `SELECT rule_id FROM procurement_rules WHERE product_id = ? AND is_deleted = FALSE AND is_active = TRUE LIMIT 1`,
                [product_id]
            );
            if (existing.length > 0) {
                return res.status(409).json(ResponseFormatter.conflict("An active procurement rule already exists for this product"));
            }

            const result = await db.getResults(
                `INSERT INTO procurement_rules (product_id, strategy, min_stock_qty, reorder_qty, preferred_vendor_id, is_active, is_deleted, created_by) VALUES (?, ?, ?, ?, ?, ?, FALSE, ?)`,
                [product_id, strategy, min_stock_qty, reorder_qty, preferred_vendor_id, is_active ? 1 : 0, req.user?.userId]
            );

            // Also update product's procurement_strategy
            await db.getResults(`UPDATE products SET procurement_strategy = ? WHERE product_id = ?`, [strategy, product_id]);

            await auditService.logAudit({ user_id: req.user?.userId, table_name: "procurement_rules", record_id: result.insertId, action: "INSERT", new_values: req.body, ip_address: req.ip });
            return res.status(201).json(ResponseFormatter.created({ rule_id: result.insertId }, "Procurement rule created"));
        } catch (err) {
            if (err.message.includes("already exists")) return res.status(409).json(ResponseFormatter.conflict(err.message));
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    async update(req, res) {
        try {
            const rule_id = parseInt(req.params.id);
            const { strategy, min_stock_qty, reorder_qty, preferred_vendor_id, is_active } = req.body;
            await db.getResults(
                `UPDATE procurement_rules SET strategy = ?, min_stock_qty = ?, reorder_qty = ?, preferred_vendor_id = ?, is_active = ?, updated_by = ? WHERE rule_id = ? AND is_deleted = FALSE`,
                [strategy, min_stock_qty, reorder_qty, preferred_vendor_id || null, is_active ? 1 : 0, req.user?.userId, rule_id]
            );
            return res.status(200).json(ResponseFormatter.updated({ rule_id }));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    async softDelete(req, res) {
        try {
            await db.getResults(`UPDATE procurement_rules SET is_deleted = TRUE, updated_by = ? WHERE rule_id = ?`, [req.user?.userId, req.params.id]);
            return res.status(200).json(ResponseFormatter.deleted("Procurement rule deleted"));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // POST /procurement-rules/run — manual trigger
    async runCheck(req, res) {
        try {
            winston.info(`Manual procurement check triggered by user ${req.user?.userId}`);
            const result = await procurementService.checkAndTriggerProcurement(req.user?.userId);
            return res.status(200).json(ResponseFormatter.success(result, "Procurement check completed"));
        } catch (err) {
            winston.error(`procurementRuleController.runCheck: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },
};

module.exports = procurementRuleController;
