const purchaseOrderModel = require("../../models/transactions/purchase-order.model");
const auditService = require("../../services/audit.service");
const ResponseFormatter = require("../../utils/responseFormatter");
const winston = require("../../config/winston");
const db = require("../../config/db");

const poController = {
    async list(req, res) {
        try {
            const { page = 1, limit = 20, status, vendor_id, search, date_from, date_to } = req.query;
            const result = await purchaseOrderModel.findAll({
                page: parseInt(page), limit: parseInt(limit),
                status, vendor_id: vendor_id ? parseInt(vendor_id) : undefined,
                search, date_from, date_to,
            });
            return res.status(200).json(ResponseFormatter.paginated(result.data, result.page, result.limit, result.total));
        } catch (err) {
            winston.error(`poController.list: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    async getStats(req, res) {
        try {
            const stats = await purchaseOrderModel.getStats();
            return res.status(200).json(ResponseFormatter.success(stats));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    async getById(req, res) {
        try {
            const po = await purchaseOrderModel.findById(parseInt(req.params.id));
            if (!po) return res.status(404).json(ResponseFormatter.notFound("Purchase Order"));
            return res.status(200).json(ResponseFormatter.success(po));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    async create(req, res) {
        try {
            const { po_id, po_number } = await purchaseOrderModel.create({ ...req.body, created_by: req.user?.userId });
            await auditService.logAudit({ user_id: req.user?.userId, table_name: "purchase_orders", record_id: po_id, action: "INSERT", new_values: req.body, ip_address: req.ip });
            return res.status(201).json(ResponseFormatter.created({ po_id, po_number }, "Purchase order created"));
        } catch (err) {
            winston.error(`poController.create: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    async update(req, res) {
        try {
            const po_id = parseInt(req.params.id);
            await purchaseOrderModel.update(po_id, req.body, req.user?.userId);
            return res.status(200).json(ResponseFormatter.updated({ po_id }));
        } catch (err) {
            if (err.message.includes("Only draft")) return res.status(422).json(ResponseFormatter.error(err.message, 422));
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    async softDelete(req, res) {
        try {
            await purchaseOrderModel.softDelete(parseInt(req.params.id), req.user?.userId);
            return res.status(200).json(ResponseFormatter.deleted("Purchase order deleted"));
        } catch (err) {
            if (err.message.includes("Only draft")) return res.status(422).json(ResponseFormatter.error(err.message, 422));
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // POST /:id/send
    async send(req, res) {
        const po_id = parseInt(req.params.id);
        try {
            await db.runInTransaction(async (connection) => {
                const [rows] = await connection.query(`SELECT status FROM purchase_orders WHERE po_id = ? AND is_deleted = FALSE FOR UPDATE`, [po_id]);
                if (!rows.length) throw new Error("PO not found");
                if (rows[0].status !== "draft") throw new Error("Only draft POs can be sent");
                await connection.query(`UPDATE purchase_orders SET status = 'sent', updated_by = ? WHERE po_id = ?`, [req.user?.userId, po_id]);
                await auditService.logAudit({ user_id: req.user?.userId, table_name: "purchase_orders", record_id: po_id, action: "UPDATE", new_values: { status: "sent" }, ip_address: req.ip });
            });
            return res.status(200).json(ResponseFormatter.success({ po_id }, "PO marked as sent"));
        } catch (err) {
            if (err.message.includes("Only")) return res.status(422).json(ResponseFormatter.error(err.message, 422));
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // POST /:id/confirm
    async confirmPO(req, res) {
        const po_id = parseInt(req.params.id);
        try {
            await db.runInTransaction(async (connection) => {
                const [rows] = await connection.query(`SELECT status FROM purchase_orders WHERE po_id = ? AND is_deleted = FALSE FOR UPDATE`, [po_id]);
                if (!rows.length) throw new Error("PO not found");
                if (!["sent"].includes(rows[0].status)) throw new Error(`Cannot confirm a ${rows[0].status} PO`);
                await connection.query(`UPDATE purchase_orders SET status = 'confirmed', updated_by = ? WHERE po_id = ?`, [req.user?.userId, po_id]);
                await auditService.logAudit({ user_id: req.user?.userId, table_name: "purchase_orders", record_id: po_id, action: "UPDATE", new_values: { status: "confirmed" }, ip_address: req.ip });
            });
            return res.status(200).json(ResponseFormatter.success({ po_id }, "PO confirmed"));
        } catch (err) {
            if (err.message.includes("Cannot confirm")) return res.status(422).json(ResponseFormatter.error(err.message, 422));
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    /**
     * POST /:id/receive — CRITICAL: stock IN + satisfy waiting reservations
     */
    async receive(req, res) {
        const po_id = parseInt(req.params.id);
        const created_by = req.user?.userId;
        const receive_lines = req.body.lines || req.body.receive_lines;

        if (!receive_lines?.length) {
            return res.status(400).json(ResponseFormatter.error("receive_lines is required", 400));
        }

        try {
            await db.runInTransaction(async (connection) => {
                const [poRows] = await connection.query(
                    `SELECT status FROM purchase_orders WHERE po_id = ? AND is_deleted = FALSE FOR UPDATE`, [po_id]
                );
                if (!poRows.length) throw new Error("PO not found");
                if (poRows[0].status !== "confirmed") throw new Error("Only confirmed POs can be received");

                for (const rl of receive_lines) {
                    const { pol_id, product_id, qty_received } = rl;

                    // Validate qty
                    const [polRows] = await connection.query(
                        `SELECT qty_ordered, qty_received AS already_received FROM purchase_order_lines WHERE pol_id = ? AND po_id = ?`,
                        [pol_id, po_id]
                    );
                    if (!polRows.length) throw new Error(`PO line ${pol_id} not found`);
                    const remaining = parseFloat(polRows[0].qty_ordered) - parseFloat(polRows[0].already_received);
                    if (qty_received > remaining) {
                        throw new Error(`Receive qty (${qty_received}) exceeds remaining qty (${remaining}) for line ${pol_id}`);
                    }

                    // Lock product and get current stock
                    const [pRows] = await connection.query(
                        `SELECT on_hand_qty FROM products WHERE product_id = ? AND is_deleted = FALSE FOR UPDATE`,
                        [product_id]
                    );
                    if (!pRows.length) throw new Error(`Product ${product_id} not found`);
                    const qty_before = parseFloat(pRows[0].on_hand_qty);
                    const qty_after = qty_before + parseFloat(qty_received);

                    // Update stock
                    await connection.query(
                        `UPDATE products SET on_hand_qty = on_hand_qty + ?, updated_by = ? WHERE product_id = ?`,
                        [qty_received, created_by, product_id]
                    );

                    // Update PO line
                    await connection.query(
                        `UPDATE purchase_order_lines SET qty_received = qty_received + ?, updated_by = ? WHERE pol_id = ?`,
                        [qty_received, created_by, pol_id]
                    );

                    // Ledger IN entry
                    await connection.query(
                        `INSERT INTO inventory_transactions (product_id, txn_type, reference_type, reference_id, qty, qty_before, qty_after, notes, created_by)
                         VALUES (?, 'IN', 'PO', ?, ?, ?, ?, 'Stock received from PO', ?)`,
                        [product_id, po_id, qty_received, qty_before, qty_after, created_by]
                    );
                }

                // Check if all lines fully received
                const [lineCheck] = await connection.query(
                    `SELECT COUNT(*) AS not_done FROM purchase_order_lines
                     WHERE po_id = ? AND is_deleted = FALSE AND qty_ordered > qty_received`,
                    [po_id]
                );
                if (lineCheck[0].not_done === 0) {
                    await connection.query(`UPDATE purchase_orders SET status = 'received', updated_by = ? WHERE po_id = ?`, [created_by, po_id]);
                }

                await auditService.logAudit({ user_id: created_by, table_name: "purchase_orders", record_id: po_id, action: "UPDATE", new_values: { receive_lines }, ip_address: req.ip });
            });

            return res.status(200).json(ResponseFormatter.success({ po_id }, "Stock received successfully"));
        } catch (err) {
            if (err.message.includes("exceeds") || err.message.includes("confirmed")) {
                return res.status(422).json(ResponseFormatter.error(err.message, 422));
            }
            winston.error(`poController.receive: ${err.message}`, { po_id });
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // POST /:id/cancel
    async cancelPO(req, res) {
        const po_id = parseInt(req.params.id);
        try {
            await db.runInTransaction(async (connection) => {
                const [rows] = await connection.query(`SELECT status FROM purchase_orders WHERE po_id = ? AND is_deleted = FALSE FOR UPDATE`, [po_id]);
                if (!rows.length) throw new Error("PO not found");
                if (rows[0].status === "received") throw new Error("Cannot cancel a received PO");
                await connection.query(`UPDATE purchase_orders SET status = 'cancelled', updated_by = ? WHERE po_id = ?`, [req.user?.userId, po_id]);
                await auditService.logAudit({ user_id: req.user?.userId, table_name: "purchase_orders", record_id: po_id, action: "UPDATE", new_values: { status: "cancelled" }, ip_address: req.ip });
            });
            return res.status(200).json(ResponseFormatter.success({ po_id }, "PO cancelled"));
        } catch (err) {
            if (err.message.includes("Cannot cancel")) return res.status(422).json(ResponseFormatter.error(err.message, 422));
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },
};

module.exports = poController;
