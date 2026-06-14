const salesOrderModel = require("../../models/transactions/sales-order.model");
const stockReservation = require("../../services/stock-reservation.service");
const procurementService = require("../../services/procurement.service");
const auditService = require("../../services/audit.service");
const ResponseFormatter = require("../../utils/responseFormatter");
const winston = require("../../config/winston");
const db = require("../../config/db");

const soController = {
    // GET /sales-orders
    async list(req, res) {
        try {
            const { page = 1, limit = 20, status, so_type, customer_id, search, date_from, date_to } = req.query;
            const result = await salesOrderModel.findAll({
                page: parseInt(page), limit: parseInt(limit),
                status, so_type, customer_id: customer_id ? parseInt(customer_id) : undefined,
                search, date_from, date_to,
            });
            return res.status(200).json(ResponseFormatter.paginated(
                result.data, result.page, result.limit, result.total, "Sales orders fetched"
            ));
        } catch (err) {
            winston.error(`soController.list: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // GET /sales-orders/stats
    async getStats(req, res) {
        try {
            const stats = await salesOrderModel.getStats();
            return res.status(200).json(ResponseFormatter.success(stats, "SO stats fetched"));
        } catch (err) {
            winston.error(`soController.getStats: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // GET /sales-orders/:id
    async getById(req, res) {
        try {
            const so = await salesOrderModel.findById(parseInt(req.params.id));
            if (!so) return res.status(404).json(ResponseFormatter.notFound("Sales Order"));
            return res.status(200).json(ResponseFormatter.success(so, "Sales order fetched"));
        } catch (err) {
            winston.error(`soController.getById: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // POST /sales-orders
    async create(req, res) {
        try {
            const { so_id, so_number } = await salesOrderModel.create({
                ...req.body, created_by: req.user?.userId,
            });
            await auditService.logAudit({
                user_id: req.user?.userId, table_name: "sales_orders",
                record_id: so_id, action: "INSERT",
                new_values: { so_id, so_number, ...req.body }, ip_address: req.ip,
            });
            return res.status(201).json(ResponseFormatter.created({ so_id, so_number }, "Sales order created"));
        } catch (err) {
            winston.error(`soController.create: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // PUT /sales-orders/:id
    async update(req, res) {
        try {
            const so_id = parseInt(req.params.id);
            await salesOrderModel.update(so_id, req.body, req.user?.userId);
            return res.status(200).json(ResponseFormatter.updated({ so_id }, "Sales order updated"));
        } catch (err) {
            if (err.message.includes("Only draft")) {
                return res.status(422).json(ResponseFormatter.error(err.message, 422));
            }
            winston.error(`soController.update: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // DELETE /sales-orders/:id
    async softDelete(req, res) {
        try {
            const so_id = parseInt(req.params.id);
            await salesOrderModel.softDelete(so_id, req.user?.userId);
            return res.status(200).json(ResponseFormatter.deleted("Sales order deleted"));
        } catch (err) {
            if (err.message.includes("Only draft")) {
                return res.status(422).json(ResponseFormatter.error(err.message, 422));
            }
            winston.error(`soController.softDelete: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    /**
     * POST /sales-orders/:id/confirm
     * CRITICAL: Uses SELECT FOR UPDATE to prevent double-reservation.
     * Handles MTS (stock reservation) and MTO (procurement trigger).
     */
    async confirm(req, res) {
        const so_id = parseInt(req.params.id);
        const created_by = req.user?.userId;

        try {
            await db.runInTransaction(async (connection) => {
                // 1. Validate status
                const [soRows] = await connection.query(
                    `SELECT so.*, p.name AS customer_name
                     FROM sales_orders so
                     LEFT JOIN partners p ON p.partner_id = so.customer_id
                     WHERE so.so_id = ? AND so.is_deleted = FALSE FOR UPDATE`,
                    [so_id]
                );
                if (!soRows || soRows.length === 0) throw new Error("Sales order not found");
                const so = soRows[0];
                if (so.status !== "draft") throw new Error(`Cannot confirm a ${so.status} sales order`);

                // 2. Get all lines
                const [lines] = await connection.query(
                    `SELECT sol.*, p.product_name, p.procurement_type, p.procurement_strategy,
                            p.bom_id, p.on_hand_qty, p.reserved_qty
                     FROM sales_order_lines sol
                     JOIN products p ON p.product_id = sol.product_id
                     WHERE sol.so_id = ? AND sol.is_deleted = FALSE`,
                    [so_id]
                );
                if (!lines || lines.length === 0) throw new Error("Cannot confirm an empty sales order");

                // 3. Process each line
                for (const line of lines) {
                    const { sol_id, product_id, qty } = line;
                    const qty_needed = parseFloat(qty);

                    if (so.so_type === "MTS") {
                        // Reserve available stock
                        const { reserved_qty, was_partial } = await stockReservation.reserveForSO({
                            product_id, qty_requested: qty_needed, so_id, so_line_id: sol_id,
                            created_by, connection,
                        });

                        // If insufficient stock, trigger replenishment for shortage
                        if (was_partial) {
                            const shortage = qty_needed - reserved_qty;
                            const product = {
                                product_id,
                                procurement_type: line.procurement_type,
                                procurement_strategy: line.procurement_strategy,
                                bom_id: line.bom_id,
                            };
                            // Trigger outside transaction (creates PO/MO in draft)
                            setImmediate(() => procurementService.triggerReplenishment(product, shortage, null, created_by));
                        }

                    } else {
                        // MTO: Reserve whatever is available, trigger procurement for shortage
                        const { reserved_qty } = await stockReservation.reserveForSO({
                            product_id, qty_requested: qty_needed, so_id, so_line_id: sol_id,
                            created_by, connection,
                        });

                        const shortage = qty_needed - reserved_qty;
                        if (shortage > 0) {
                            const product = {
                                product_id,
                                procurement_type: line.procurement_type,
                                procurement_strategy: line.procurement_strategy,
                                bom_id: line.bom_id,
                            };
                            setImmediate(() => procurementService.triggerMTOReplenishment(product, shortage, so_id, created_by));
                        }
                    }
                }

                // 4. Update SO status
                await connection.query(
                    `UPDATE sales_orders SET status = 'confirmed', updated_by = ? WHERE so_id = ?`,
                    [created_by, so_id]
                );

                await auditService.logAudit({
                    user_id: created_by, table_name: "sales_orders",
                    record_id: so_id, action: "UPDATE",
                    old_values: { status: "draft" }, new_values: { status: "confirmed" },
                    ip_address: req.ip,
                });
            });

            return res.status(200).json(ResponseFormatter.success({ so_id }, "Sales order confirmed"));
        } catch (err) {
            if (err.message.includes("Cannot confirm") || err.message.includes("empty")) {
                return res.status(422).json(ResponseFormatter.error(err.message, 422));
            }
            winston.error(`soController.confirm: ${err.message}`, { so_id });
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    /**
     * POST /sales-orders/:id/deliver
     * Consume stock reservation and record OUT transaction.
     */
    async deliver(req, res) {
        const so_id = parseInt(req.params.id);
        const created_by = req.user?.userId;
        // deliverSchema validates 'lines' — controller reads same field name
        const delivery_lines = req.body.lines || req.body.delivery_lines;

        if (!delivery_lines || !Array.isArray(delivery_lines) || delivery_lines.length === 0) {
            return res.status(400).json(ResponseFormatter.error("delivery lines array is required", 400));
        }

        try {
            await db.runInTransaction(async (connection) => {
                const [soRows] = await connection.query(
                    `SELECT status FROM sales_orders WHERE so_id = ? AND is_deleted = FALSE FOR UPDATE`,
                    [so_id]
                );
                if (!soRows || soRows.length === 0) throw new Error("Sales order not found");
                if (!["confirmed", "in_progress"].includes(soRows[0].status)) {
                    throw new Error(`Cannot deliver from a ${soRows[0].status} sales order`);
                }

                for (const dl of delivery_lines) {
                    const { sol_id, product_id, qty_to_deliver } = dl;

                    // Validate delivery qty vs reservation
                    const [resRows] = await connection.query(
                        `SELECT SUM(reserved_qty) AS total_reserved
                         FROM stock_reservations
                         WHERE so_id = ? AND product_id = ? AND status = 'active'`,
                        [so_id, product_id]
                    );
                    const total_reserved = parseFloat(resRows[0]?.total_reserved || 0);
                    if (qty_to_deliver > total_reserved) {
                        throw new Error(`Delivery qty (${qty_to_deliver}) exceeds reserved quantity (${total_reserved}) for product ${product_id}`);
                    }

                    await stockReservation.consumeForDelivery({
                        so_id, product_id, qty_to_deliver, sol_id, created_by, connection,
                    });
                }

                // Check if all lines fully delivered
                const [lineCheck] = await connection.query(
                    `SELECT COUNT(*) AS undelivered
                     FROM sales_order_lines
                     WHERE so_id = ? AND is_deleted = FALSE AND qty > delivered_qty`,
                    [so_id]
                );

                const new_status = lineCheck[0].undelivered === 0 ? "done" : "in_progress";
                await connection.query(
                    `UPDATE sales_orders SET status = ?, updated_by = ? WHERE so_id = ?`,
                    [new_status, created_by, so_id]
                );

                await auditService.logAudit({
                    user_id: created_by, table_name: "sales_orders",
                    record_id: so_id, action: "UPDATE",
                    new_values: { status: new_status, delivery_lines },
                    ip_address: req.ip,
                });
            });

            return res.status(200).json(ResponseFormatter.success({ so_id }, "Delivery recorded"));
        } catch (err) {
            if (err.message.includes("exceeds")) {
                return res.status(422).json(ResponseFormatter.error(err.message, 422));
            }
            winston.error(`soController.deliver: ${err.message}`, { so_id });
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    /**
     * POST /sales-orders/:id/cancel
     * Releases all active stock reservations.
     */
    async cancel(req, res) {
        const so_id = parseInt(req.params.id);
        const created_by = req.user?.userId;

        try {
            await db.runInTransaction(async (connection) => {
                const [soRows] = await connection.query(
                    `SELECT status FROM sales_orders WHERE so_id = ? AND is_deleted = FALSE FOR UPDATE`,
                    [so_id]
                );
                if (!soRows || soRows.length === 0) throw new Error("Sales order not found");
                if (soRows[0].status === "done") throw new Error("Cannot cancel a completed sales order");
                if (soRows[0].status === "cancelled") throw new Error("Sales order is already cancelled");

                // Release all active reservations
                const { released } = await stockReservation.releaseSOReservation({ so_id, created_by, connection });

                await connection.query(
                    `UPDATE sales_orders SET status = 'cancelled', updated_by = ? WHERE so_id = ?`,
                    [created_by, so_id]
                );

                await auditService.logAudit({
                    user_id: created_by, table_name: "sales_orders",
                    record_id: so_id, action: "UPDATE",
                    new_values: { status: "cancelled", reservations_released: released },
                    ip_address: req.ip,
                });
            });

            return res.status(200).json(ResponseFormatter.success({ so_id }, "Sales order cancelled"));
        } catch (err) {
            if (err.message.includes("Cannot cancel")) {
                return res.status(422).json(ResponseFormatter.error(err.message, 422));
            }
            winston.error(`soController.cancel: ${err.message}`, { so_id });
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // POST /sales-orders/:id/lines
    async addLine(req, res) {
        try {
            const so_id = parseInt(req.params.id);
            const result = await salesOrderModel.addLine(so_id, req.body, req.user?.userId);
            return res.status(201).json(ResponseFormatter.created(result, "Line added to sales order"));
        } catch (err) {
            if (err.message.includes("Only draft")) {
                return res.status(422).json(ResponseFormatter.error(err.message, 422));
            }
            winston.error(`soController.addLine: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // PUT /sales-orders/:id/lines/:solId
    async updateLine(req, res) {
        try {
            const so_id = parseInt(req.params.id);
            const sol_id = parseInt(req.params.solId);
            const result = await salesOrderModel.updateLine(so_id, sol_id, req.body, req.user?.userId);
            return res.status(200).json(ResponseFormatter.updated(result, "Line updated"));
        } catch (err) {
            winston.error(`soController.updateLine: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // DELETE /sales-orders/:id/lines/:solId
    async removeLine(req, res) {
        try {
            const so_id = parseInt(req.params.id);
            const sol_id = parseInt(req.params.solId);
            await salesOrderModel.removeLine(so_id, sol_id, req.user?.userId);
            return res.status(200).json(ResponseFormatter.deleted("Line removed from sales order"));
        } catch (err) {
            winston.error(`soController.removeLine: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // POST /sales-orders/from-po/:poId
    async createFromPO(req, res) {
        try {
            const poId = parseInt(req.params.poId);
            const { so_id, so_number } = await salesOrderModel.createFromPO(poId, req.user?.userId);
            
            await auditService.logAudit({
                user_id: req.user?.userId, table_name: "sales_orders",
                record_id: so_id, action: "INSERT",
                new_values: { so_id, so_number, po_id: poId, note: "Created from PO" }, ip_address: req.ip,
            });

            return res.status(201).json(ResponseFormatter.created({ so_id, so_number }, "Sales order generated from PO"));
        } catch (err) {
            winston.error(`soController.createFromPO: ${err.message}`);
            if (err.message.includes("already") || err.message.includes("not found") || err.message.includes("empty")) {
                return res.status(422).json(ResponseFormatter.error(err.message, 422));
            }
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },
};

module.exports = soController;

