const db = require("../../config/db");
const auditService = require("../../services/audit.service");
const ResponseFormatter = require("../../utils/responseFormatter");
const winston = require("../../config/winston");

/**
 * v4 BOM Controller — uses `bom` and `bom_lines` tables (NOT legacy bom_master)
 * Exposes plan-compliant endpoints at /api/v1/bom-v4
 */
const bomV4Controller = {
    // GET /bom-v4
    async list(req, res) {
        try {
            const { page = 1, limit = 20, bom_type, is_active, product_id, search } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const conditions = ["b.is_deleted = FALSE"];
            const params = [];

            if (bom_type) { conditions.push("b.bom_type = ?"); params.push(bom_type); }
            if (is_active !== undefined) { conditions.push("b.is_active = ?"); params.push(is_active === "true" ? 1 : 0); }
            if (product_id) { conditions.push("b.product_id = ?"); params.push(product_id); }
            if (search) {
                conditions.push("(b.bom_name LIKE ? OR p.product_name LIKE ?)");
                const s = `%${search}%`;
                params.push(s, s);
            }

            const whereClause = `WHERE ${conditions.join(" AND ")}`;
            const countResult = await db.getResults(`SELECT COUNT(*) as total FROM bom b LEFT JOIN products p ON p.product_id = b.product_id ${whereClause}`, params);
            const rows = await db.getResults(`
                SELECT b.bom_id, b.bom_name, b.bom_type, b.product_id, p.product_name, p.product_code,
                       b.qty, b.is_active, b.is_deleted, b.created_at,
                       (SELECT COUNT(*) FROM bom_lines bl WHERE bl.bom_id = b.bom_id AND bl.is_deleted = FALSE) AS line_count
                FROM bom b
                LEFT JOIN products p ON p.product_id = b.product_id
                ${whereClause}
                ORDER BY b.created_at DESC
                LIMIT ? OFFSET ?
            `, [...params, parseInt(limit), offset]);

            return res.status(200).json(ResponseFormatter.paginated(rows, parseInt(page), parseInt(limit), countResult[0]?.total || 0, "BOMs fetched"));
        } catch (err) {
            winston.error(`bomV4.list: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // GET /bom-v4/product/:productId
    async getByProduct(req, res) {
        try {
            const rows = await db.getResults(`
                SELECT b.*, p.product_name, p.product_code
                FROM bom b
                JOIN products p ON p.product_id = b.product_id
                WHERE b.product_id = ? AND b.is_active = TRUE AND b.is_deleted = FALSE
                LIMIT 1
            `, [req.params.productId]);

            if (!rows.length) return res.status(404).json(ResponseFormatter.notFound("Active BOM for this product"));

            const bom = rows[0];
            const [lines] = await db.connection.query(`
                SELECT bl.*, cp.product_name AS component_name, cp.product_code AS component_code, cp.uom AS component_uom,
                       op.name AS operation_name, wc.name AS work_center_name
                FROM bom_lines bl
                JOIN products cp ON cp.product_id = bl.component_id
                LEFT JOIN operations op ON op.operation_id = bl.operation_id
                LEFT JOIN work_centers wc ON wc.work_center_id = op.work_center_id
                WHERE bl.bom_id = ? AND bl.is_deleted = FALSE
                ORDER BY bl.bom_line_id ASC
            `, [bom.bom_id]);

            bom.lines = lines;
            return res.status(200).json(ResponseFormatter.success(bom, "BOM fetched"));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // GET /bom-v4/:id
    async getById(req, res) {
        try {
            const [rows] = await db.connection.query(`
                SELECT b.*, p.product_name, p.product_code
                FROM bom b
                JOIN products p ON p.product_id = b.product_id
                WHERE b.bom_id = ? AND b.is_deleted = FALSE
            `, [req.params.id]);

            if (!rows.length) return res.status(404).json(ResponseFormatter.notFound("BOM"));
            const bom = rows[0];

            const [lines] = await db.connection.query(`
                SELECT bl.*, cp.product_name AS component_name, cp.product_code AS component_code,
                       cp.uom AS component_uom, cp.on_hand_qty, cp.free_to_use_qty,
                       op.name AS operation_name, wc.name AS work_center_name
                FROM bom_lines bl
                JOIN products cp ON cp.product_id = bl.component_id
                LEFT JOIN operations op ON op.operation_id = bl.operation_id
                LEFT JOIN work_centers wc ON wc.work_center_id = op.work_center_id
                WHERE bl.bom_id = ? AND bl.is_deleted = FALSE
                ORDER BY bl.bom_line_id ASC
            `, [bom.bom_id]);

            bom.lines = lines;
            return res.status(200).json(ResponseFormatter.success(bom, "BOM fetched"));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // POST /bom-v4
    async create(req, res) {
        try {
            const { product_id, bom_name, bom_type = "manufacture", qty = 1, is_active = true, lines = [] } = req.body;
            const created_by = req.user?.userId;

            const result = await db.runInTransaction(async (connection) => {
                // If is_active, deactivate existing active BOMs for this product
                if (is_active) {
                    await connection.query(`UPDATE bom SET is_active = FALSE WHERE product_id = ? AND is_deleted = FALSE`, [product_id]);
                }

                const [bomResult] = await connection.query(
                    `INSERT INTO bom (product_id, bom_name, bom_type, qty, is_active, is_deleted, created_by) VALUES (?, ?, ?, ?, ?, FALSE, ?)`,
                    [product_id, bom_name, bom_type, qty, is_active ? 1 : 0, created_by]
                );
                const bom_id = bomResult.insertId;

                for (const line of lines) {
                    // Circular reference check
                    if (line.component_id == product_id) {
                        throw new Error(`Component ${line.component_id} cannot be the same as the finished product — circular reference!`);
                    }
                    await connection.query(
                        `INSERT INTO bom_lines (bom_id, component_id, qty, uom, operation_id, notes, is_deleted, created_by) VALUES (?, ?, ?, ?, ?, ?, FALSE, ?)`,
                        [bom_id, line.component_id, line.qty, line.uom || null, line.operation_id || null, line.notes || null, created_by]
                    );
                }

                // Link BOM to product if active
                if (is_active) {
                    await connection.query(`UPDATE products SET bom_id = ? WHERE product_id = ?`, [bom_id, product_id]);
                }

                return { bom_id };
            });

            await auditService.logAudit({ user_id: req.user?.userId, table_name: "bom", record_id: result.bom_id, action: "INSERT", new_values: req.body, ip_address: req.ip });
            return res.status(201).json(ResponseFormatter.created(result, "BOM created"));
        } catch (err) {
            if (err.message.includes("circular")) return res.status(422).json(ResponseFormatter.error(err.message, 422));
            if (err.code === "ER_DUP_ENTRY") return res.status(409).json(ResponseFormatter.conflict("Component already exists in this BOM"));
            winston.error(`bomV4.create: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // PUT /bom-v4/:id
    async update(req, res) {
        try {
            const bom_id = parseInt(req.params.id);
            const { bom_name, bom_type, qty, is_active } = req.body;
            const updated_by = req.user?.userId;

            await db.runInTransaction(async (connection) => {
                // Check if MOs reference this BOM in non-cancelled status
                const [moRows] = await connection.query(
                    `SELECT mo_id FROM manufacturing_orders WHERE bom_id = ? AND status NOT IN ('cancelled', 'done') AND is_deleted = FALSE LIMIT 1`,
                    [bom_id]
                );
                if (moRows.length > 0) throw new Error("Cannot modify BOM while it is referenced by active manufacturing orders");

                if (is_active) {
                    const [bomRow] = await connection.query(`SELECT product_id FROM bom WHERE bom_id = ?`, [bom_id]);
                    if (bomRow.length > 0) {
                        await connection.query(`UPDATE bom SET is_active = FALSE WHERE product_id = ? AND bom_id != ? AND is_deleted = FALSE`, [bomRow[0].product_id, bom_id]);
                    }
                }

                await connection.query(
                    `UPDATE bom SET bom_name = ?, bom_type = ?, qty = ?, is_active = ?, updated_by = ? WHERE bom_id = ? AND is_deleted = FALSE`,
                    [bom_name, bom_type, qty, is_active ? 1 : 0, updated_by, bom_id]
                );
            });

            return res.status(200).json(ResponseFormatter.updated({ bom_id }, "BOM updated"));
        } catch (err) {
            if (err.message.includes("Cannot modify")) return res.status(422).json(ResponseFormatter.error(err.message, 422));
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // DELETE /bom-v4/:id
    async softDelete(req, res) {
        try {
            const bom_id = parseInt(req.params.id);
            const [moRows] = await db.connection.query(
                `SELECT mo_id FROM manufacturing_orders WHERE bom_id = ? AND status NOT IN ('cancelled') AND is_deleted = FALSE LIMIT 1`,
                [bom_id]
            );
            if (moRows.length > 0) throw new Error("BOM is referenced by manufacturing orders and cannot be deleted");

            await db.getResults(`UPDATE bom SET is_deleted = TRUE, updated_by = ? WHERE bom_id = ?`, [req.user?.userId, bom_id]);
            return res.status(200).json(ResponseFormatter.deleted("BOM deleted"));
        } catch (err) {
            if (err.message.includes("referenced")) return res.status(422).json(ResponseFormatter.error(err.message, 422));
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // ── BOM Lines ──────────────────────────────────────────────────────

    // POST /bom-v4/:id/lines
    async addLine(req, res) {
        try {
            const bom_id = parseInt(req.params.id);
            const { component_id, qty, uom, operation_id, notes } = req.body;
            const created_by = req.user?.userId;

            // Circular check
            const [bRow] = await db.connection.query(`SELECT product_id FROM bom WHERE bom_id = ?`, [bom_id]);
            if (bRow.length > 0 && bRow[0].product_id == component_id) {
                return res.status(422).json(ResponseFormatter.error("Cannot use finished product as a component of its own BOM", 422));
            }

            const result = await db.getResults(
                `INSERT INTO bom_lines (bom_id, component_id, qty, uom, operation_id, notes, is_deleted, created_by) VALUES (?, ?, ?, ?, ?, ?, FALSE, ?)`,
                [bom_id, component_id, qty, uom || null, operation_id || null, notes || null, created_by]
            );
            return res.status(201).json(ResponseFormatter.created({ bom_line_id: result.insertId }, "BOM line added"));
        } catch (err) {
            if (err.code === "ER_DUP_ENTRY") return res.status(409).json(ResponseFormatter.conflict("Component already in this BOM"));
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // PUT /bom-v4/:id/lines/:lineId
    async updateLine(req, res) {
        try {
            const { lineId } = req.params;
            const { qty, uom, operation_id, notes } = req.body;
            await db.getResults(
                `UPDATE bom_lines SET qty = ?, uom = ?, operation_id = ?, notes = ?, updated_by = ? WHERE bom_line_id = ? AND is_deleted = FALSE`,
                [qty, uom || null, operation_id || null, notes || null, req.user?.userId, lineId]
            );
            return res.status(200).json(ResponseFormatter.updated({ bom_line_id: parseInt(lineId) }, "BOM line updated"));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // DELETE /bom-v4/:id/lines/:lineId
    async removeLine(req, res) {
        try {
            await db.getResults(`UPDATE bom_lines SET is_deleted = TRUE, updated_by = ? WHERE bom_line_id = ?`, [req.user?.userId, req.params.lineId]);
            return res.status(200).json(ResponseFormatter.deleted("BOM line removed"));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },
};

module.exports = bomV4Controller;
