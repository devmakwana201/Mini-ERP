const moModel = require("../../models/transactions/manufacturing-order.model");
const bomExplosion = require("../../services/bom-explosion.service");
const auditService = require("../../services/audit.service");
const ResponseFormatter = require("../../utils/responseFormatter");
const winston = require("../../config/winston");
const db = require("../../config/db");

const moController = {
    async list(req, res) {
        try {
            const { page = 1, limit = 20, status, mo_type, product_id, search } = req.query;
            const result = await moModel.findAll({
                page: parseInt(page), limit: parseInt(limit),
                status, mo_type,
                product_id: product_id ? parseInt(product_id) : undefined,
                search,
            });
            return res.status(200).json(ResponseFormatter.paginated(result.data, result.page, result.limit, result.total));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    async getStats(req, res) {
        try {
            return res.status(200).json(ResponseFormatter.success(await moModel.getStats()));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    async getById(req, res) {
        try {
            const mo = await moModel.findById(parseInt(req.params.id));
            if (!mo) return res.status(404).json(ResponseFormatter.notFound("Manufacturing Order"));
            return res.status(200).json(ResponseFormatter.success(mo));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    async create(req, res) {
        try {
            const { mo_id, mo_number } = await moModel.create({ ...req.body, created_by: req.user?.userId });
            await auditService.logAudit({ user_id: req.user?.userId, table_name: "manufacturing_orders", record_id: mo_id, action: "INSERT", new_values: req.body, ip_address: req.ip });
            return res.status(201).json(ResponseFormatter.created({ mo_id, mo_number }, "Manufacturing order created"));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    async update(req, res) {
        try {
            const mo_id = parseInt(req.params.id);
            await moModel.update(mo_id, req.body, req.user?.userId);
            return res.status(200).json(ResponseFormatter.updated({ mo_id }));
        } catch (err) {
            if (err.message.includes("Only draft")) return res.status(422).json(ResponseFormatter.error(err.message, 422));
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    async softDelete(req, res) {
        try {
            await moModel.softDelete(parseInt(req.params.id), req.user?.userId);
            return res.status(200).json(ResponseFormatter.deleted("Manufacturing order deleted"));
        } catch (err) {
            if (err.message.includes("Only draft")) return res.status(422).json(ResponseFormatter.error(err.message, 422));
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    /**
     * POST /:id/confirm — BOM Explosion
     * Creates mo_components, reserves stock, creates work orders.
     */
    async confirm(req, res) {
        const mo_id = parseInt(req.params.id);
        const created_by = req.user?.userId;

        try {
            const result = await db.runInTransaction(async (connection) => {
                const [moRows] = await connection.query(
                    `SELECT mo.*, p.product_name FROM manufacturing_orders mo JOIN products p ON p.product_id = mo.product_id WHERE mo.mo_id = ? AND mo.is_deleted = FALSE FOR UPDATE`,
                    [mo_id]
                );
                if (!moRows.length) throw new Error("Manufacturing order not found");
                const mo = moRows[0];
                if (mo.status !== "draft") throw new Error(`Cannot confirm a ${mo.status} MO`);
                if (!mo.bom_id) throw new Error("Manufacturing order has no BOM assigned");

                // BOM Explosion
                const { components, work_orders } = await bomExplosion.explodeBOM({
                    mo_id, bom_id: mo.bom_id, qty_planned: mo.qty_planned,
                    scheduled_date: mo.scheduled_date, created_by, connection,
                });

                await connection.query(
                    `UPDATE manufacturing_orders SET status = 'confirmed', updated_by = ? WHERE mo_id = ?`,
                    [created_by, mo_id]
                );

                await auditService.logAudit({
                    user_id: created_by, table_name: "manufacturing_orders",
                    record_id: mo_id, action: "UPDATE",
                    new_values: { status: "confirmed", components_count: components.length, work_orders_count: work_orders.length },
                    ip_address: req.ip,
                });

                return { components, work_orders };
            });

            return res.status(200).json(ResponseFormatter.success({ mo_id, ...result }, "Manufacturing order confirmed — BOM exploded"));
        } catch (err) {
            if (err.message.includes("Cannot confirm") || err.message.includes("no BOM")) {
                return res.status(422).json(ResponseFormatter.error(err.message, 422));
            }
            winston.error(`moController.confirm: ${err.message}`, { mo_id });
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // POST /:id/start
    async start(req, res) {
        const mo_id = parseInt(req.params.id);
        try {
            await db.runInTransaction(async (connection) => {
                const [rows] = await connection.query(`SELECT status FROM manufacturing_orders WHERE mo_id = ? AND is_deleted = FALSE FOR UPDATE`, [mo_id]);
                if (!rows.length) throw new Error("MO not found");
                if (rows[0].status !== "confirmed") throw new Error(`Cannot start a ${rows[0].status} MO`);
                await connection.query(`UPDATE manufacturing_orders SET status = 'in_progress', updated_by = ? WHERE mo_id = ?`, [req.user?.userId, mo_id]);
                await auditService.logAudit({ user_id: req.user?.userId, table_name: "manufacturing_orders", record_id: mo_id, action: "UPDATE", new_values: { status: "in_progress" }, ip_address: req.ip });
            });
            return res.status(200).json(ResponseFormatter.success({ mo_id }, "MO started"));
        } catch (err) {
            if (err.message.includes("Cannot start")) return res.status(422).json(ResponseFormatter.error(err.message, 422));
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    /**
     * POST /:id/produce — Record production qty
     * Consumes components (OUT), adds finished goods (IN).
     */
    async produce(req, res) {
        const mo_id = parseInt(req.params.id);
        const created_by = req.user?.userId;
        const { qty_to_produce } = req.body;

        if (!qty_to_produce || qty_to_produce <= 0) {
            return res.status(400).json(ResponseFormatter.error("qty_to_produce must be > 0", 400));
        }

        try {
            await db.runInTransaction(async (connection) => {
                const [moRows] = await connection.query(
                    `SELECT mo.*, p.on_hand_qty AS fg_on_hand FROM manufacturing_orders mo JOIN products p ON p.product_id = mo.product_id WHERE mo.mo_id = ? AND mo.is_deleted = FALSE FOR UPDATE`,
                    [mo_id]
                );
                if (!moRows.length) throw new Error("MO not found");
                const mo = moRows[0];
                if (mo.status !== "in_progress") throw new Error(`Can only produce from in_progress MO (current: ${mo.status})`);

                const remaining = parseFloat(mo.qty_planned) - parseFloat(mo.qty_produced);
                if (qty_to_produce > remaining) throw new Error(`qty_to_produce (${qty_to_produce}) exceeds remaining (${remaining})`);

                const scale = parseFloat(qty_to_produce) / parseFloat(mo.qty_planned);

                // Fetch components
                const [components] = await connection.query(
                    `SELECT mc.*, p.on_hand_qty, p.reserved_qty FROM mo_components mc JOIN products p ON p.product_id = mc.product_id WHERE mc.mo_id = ?`,
                    [mo_id]
                );

                // Consume each component proportionally
                for (const comp of components) {
                    const qty_to_consume = parseFloat(comp.qty_planned) * scale;
                    const [cRows] = await connection.query(`SELECT on_hand_qty, reserved_qty FROM products WHERE product_id = ? FOR UPDATE`, [comp.product_id]);
                    const oh_before = parseFloat(cRows[0].on_hand_qty);
                    const res_before = parseFloat(cRows[0].reserved_qty);

                    await connection.query(
                        `UPDATE products SET on_hand_qty = on_hand_qty - ?, reserved_qty = GREATEST(0, reserved_qty - ?), updated_by = ? WHERE product_id = ?`,
                        [qty_to_consume, qty_to_consume, created_by, comp.product_id]
                    );
                    await connection.query(
                        `UPDATE mo_components SET qty_consumed = qty_consumed + ? WHERE mo_component_id = ?`,
                        [qty_to_consume, comp.mo_component_id]
                    );
                    // OUT ledger for component
                    await connection.query(
                        `INSERT INTO inventory_transactions (product_id, txn_type, reference_type, reference_id, qty, qty_before, qty_after, notes, created_by)
                         VALUES (?, 'OUT', 'MO', ?, ?, ?, ?, 'Component consumed in MO production', ?)`,
                        [comp.product_id, mo_id, qty_to_consume, oh_before, oh_before - qty_to_consume, created_by]
                    );
                }

                // Add finished goods to stock (IN)
                const [fgRows] = await connection.query(`SELECT on_hand_qty FROM products WHERE product_id = ? FOR UPDATE`, [mo.product_id]);
                const fg_before = parseFloat(fgRows[0].on_hand_qty);
                const fg_after = fg_before + parseFloat(qty_to_produce);

                await connection.query(
                    `UPDATE products SET on_hand_qty = on_hand_qty + ?, updated_by = ? WHERE product_id = ?`,
                    [qty_to_produce, created_by, mo.product_id]
                );
                await connection.query(
                    `INSERT INTO inventory_transactions (product_id, txn_type, reference_type, reference_id, qty, qty_before, qty_after, notes, created_by)
                     VALUES (?, 'IN', 'MO', ?, ?, ?, ?, 'Finished goods produced', ?)`,
                    [mo.product_id, mo_id, qty_to_produce, fg_before, fg_after, created_by]
                );

                // Update MO qty_produced and status
                const new_produced = parseFloat(mo.qty_produced) + parseFloat(qty_to_produce);
                const new_status = new_produced >= parseFloat(mo.qty_planned) ? "done" : "in_progress";
                await connection.query(
                    `UPDATE manufacturing_orders SET qty_produced = ?, status = ?, ${new_status === "done" ? "completed_at = NOW()," : ""} updated_by = ? WHERE mo_id = ?`,
                    [new_produced, new_status, created_by, mo_id]
                );

                await auditService.logAudit({ user_id: created_by, table_name: "manufacturing_orders", record_id: mo_id, action: "UPDATE", new_values: { qty_to_produce, new_status }, ip_address: req.ip });
            });

            return res.status(200).json(ResponseFormatter.success({ mo_id }, "Production recorded"));
        } catch (err) {
            if (err.message.includes("exceeds") || err.message.includes("in_progress")) {
                return res.status(422).json(ResponseFormatter.error(err.message, 422));
            }
            winston.error(`moController.produce: ${err.message}`, { mo_id });
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // POST /:id/cancel
    async cancel(req, res) {
        const mo_id = parseInt(req.params.id);
        const created_by = req.user?.userId;

        try {
            await db.runInTransaction(async (connection) => {
                const [rows] = await connection.query(`SELECT status FROM manufacturing_orders WHERE mo_id = ? AND is_deleted = FALSE FOR UPDATE`, [mo_id]);
                if (!rows.length) throw new Error("MO not found");
                if (rows[0].status === "done") throw new Error("Cannot cancel a completed MO");
                if (rows[0].status === "cancelled") throw new Error("MO is already cancelled");

                // Release component reservations (UNRESERVE)
                const [components] = await connection.query(`SELECT mc.product_id, mc.qty_planned FROM mo_components mc WHERE mc.mo_id = ?`, [mo_id]);
                for (const comp of components) {
                    const [pRows] = await connection.query(`SELECT reserved_qty FROM products WHERE product_id = ? FOR UPDATE`, [comp.product_id]);
                    const qty_before = parseFloat(pRows[0].reserved_qty);
                    const qty_release = Math.min(parseFloat(comp.qty_planned), qty_before);
                    const qty_after = qty_before - qty_release;

                    if (qty_release > 0) {
                        await connection.query(`UPDATE products SET reserved_qty = GREATEST(0, reserved_qty - ?), updated_by = ? WHERE product_id = ?`, [qty_release, created_by, comp.product_id]);
                        await connection.query(
                            `INSERT INTO inventory_transactions (product_id, txn_type, reference_type, reference_id, qty, qty_before, qty_after, notes, created_by)
                             VALUES (?, 'UNRESERVE', 'MO', ?, ?, ?, ?, 'Component reservation released on MO cancel', ?)`,
                            [comp.product_id, mo_id, qty_release, qty_before, qty_after, created_by]
                        );
                    }
                }

                await connection.query(`UPDATE manufacturing_orders SET status = 'cancelled', updated_by = ? WHERE mo_id = ?`, [created_by, mo_id]);
                await auditService.logAudit({ user_id: created_by, table_name: "manufacturing_orders", record_id: mo_id, action: "UPDATE", new_values: { status: "cancelled" }, ip_address: req.ip });
            });

            return res.status(200).json(ResponseFormatter.success({ mo_id }, "MO cancelled — component reservations released"));
        } catch (err) {
            if (err.message.includes("Cannot cancel")) return res.status(422).json(ResponseFormatter.error(err.message, 422));
            winston.error(`moController.cancel: ${err.message}`, { mo_id });
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },
};

module.exports = moController;
