const db = require("../../config/db");
const winston = require("../../config/winston");
const { retryTransaction } = require("../../utils/dbRetry");

const moComponentModel = {
    /**
     * Get all components for a given Manufacturing Order
     */
    async getMOComponents(moId) {
        try {
            const sql = `
                SELECT
                    moc.mo_component_id,
                    moc.mo_id,
                    moc.product_id,
                    p.product_name,
                    p.product_code,
                    p.uom AS product_uom,
                    moc.bom_line_id,
                    moc.qty_planned,
                    moc.qty_consumed,
                    moc.uom,
                    moc.is_available,
                    moc.notes,
                    moc.created_at,
                    moc.created_by,
                    moc.updated_at
                FROM mo_components moc
                LEFT JOIN products p ON moc.product_id = p.product_id AND p.is_deleted = FALSE
                WHERE moc.mo_id = ?
                ORDER BY moc.mo_component_id ASC
            `;
            const rows = await db.getResults(sql, [moId]);
            return { success: true, data: rows };
        } catch (error) {
            winston.error(`Error fetching MO Components: ${error.message}`, {
                source: "mo-component.model.js", function: "getMOComponents",
                error: error.message, stack: error.stack, moId,
            });
            return { success: false, message: "Failed to fetch MO Components", error: error.message };
        }
    },

    /**
     * Get single MO Component by ID
     */
    async getMOComponentById(componentId) {
        try {
            const sql = `
                SELECT
                    moc.mo_component_id,
                    moc.mo_id,
                    moc.product_id,
                    p.product_name,
                    p.product_code,
                    moc.bom_line_id,
                    moc.qty_planned,
                    moc.qty_consumed,
                    moc.uom,
                    moc.is_available,
                    moc.notes,
                    moc.created_at,
                    moc.updated_at
                FROM mo_components moc
                LEFT JOIN products p ON moc.product_id = p.product_id AND p.is_deleted = FALSE
                WHERE moc.mo_component_id = ?
            `;
            const rows = await db.getResults(sql, [componentId]);

            if (!rows || rows.length === 0) {
                return { success: false, message: "MO Component not found" };
            }

            return { success: true, data: rows[0] };
        } catch (error) {
            winston.error(`Error fetching MO Component by ID: ${error.message}`, {
                source: "mo-component.model.js", function: "getMOComponentById",
                error: error.message, stack: error.stack, componentId,
            });
            return { success: false, message: "Failed to fetch MO Component", error: error.message };
        }
    },

    /**
     * Create a single MO component manually
     */
    async createMOComponent(moId, payload) {
        try {
            return await retryTransaction(async (connection) => {
                const {
                    product_id, qty_planned, uom = "Unit",
                    bom_line_id = null, notes = null,
                    is_available = false, created_by,
                } = payload;

                // Validate MO exists
                const [mo] = await connection.execute(
                    `SELECT mo_id, status FROM manufacturing_orders WHERE mo_id = ? AND is_deleted = FALSE`,
                    [moId]
                );
                if (!mo.length) {
                    throw new Error("Manufacturing Order not found");
                }

                // Prevent adding components to done/cancelled MO
                if (["done", "cancelled"].includes(mo[0].status)) {
                    throw new Error(`Cannot add components to an MO with status '${mo[0].status}'`);
                }

                // Check for duplicate product in this MO
                const [dup] = await connection.execute(
                    `SELECT mo_component_id FROM mo_components WHERE mo_id = ? AND product_id = ?`,
                    [moId, product_id]
                );
                if (dup.length > 0) {
                    throw new Error("This product is already a component of this Manufacturing Order");
                }

                const [result] = await connection.execute(
                    `INSERT INTO mo_components
                        (mo_id, product_id, bom_line_id, qty_planned, qty_consumed, uom, is_available, notes, created_by)
                     VALUES (?, ?, ?, ?, 0.000, ?, ?, ?, ?)`,
                    [moId, product_id, bom_line_id, qty_planned, uom, is_available ? 1 : 0, notes, created_by || null]
                );

                winston.info("MO Component created successfully", {
                    source: "mo-component.model.js", function: "createMOComponent",
                    mo_component_id: result.insertId, moId, product_id,
                });

                return {
                    success: true,
                    message: "MO Component added successfully",
                    data: { mo_component_id: result.insertId, mo_id: moId, product_id },
                };
            }, { maxRetries: 3, operationName: "MO Component Creation" });
        } catch (error) {
            winston.error(`Error creating MO Component: ${error.message}`, {
                source: "mo-component.model.js", function: "createMOComponent",
                error: error.message, stack: error.stack, moId,
            });
            return { success: false, message: error.message || "Failed to create MO Component", error: error.message };
        }
    },

    /**
     * Explode BOM into mo_components for a Manufacturing Order
     * Reads from bom_lines table and bulk-inserts into mo_components
     */
    async explodeBOM(moId, createdBy) {
        try {
            return await retryTransaction(async (connection) => {
                // Get MO details
                const [mos] = await connection.execute(
                    `SELECT mo_id, bom_id, qty_planned, status FROM manufacturing_orders WHERE mo_id = ? AND is_deleted = FALSE`,
                    [moId]
                );
                if (!mos.length) {
                    throw new Error("Manufacturing Order not found");
                }

                const mo = mos[0];
                if (["done", "cancelled"].includes(mo.status)) {
                    throw new Error(`Cannot explode BOM for an MO with status '${mo.status}'`);
                }

                // Get BOM lines
                const [bomLines] = await connection.execute(
                    `SELECT bl.bom_line_id, bl.component_id, bl.qty, bl.uom, bl.operation_id
                     FROM bom_lines bl
                     INNER JOIN bom b ON bl.bom_id = b.bom_id AND b.is_deleted = FALSE
                     WHERE bl.bom_id = ?`,
                    [mo.bom_id]
                );

                if (!bomLines.length) {
                    throw new Error("No BOM lines found for this BOM");
                }

                // Remove existing auto-generated components (those with a bom_line_id)
                await connection.execute(
                    `DELETE FROM mo_components WHERE mo_id = ? AND bom_line_id IS NOT NULL`,
                    [moId]
                );

                // Insert new components from BOM
                const insertedComponents = [];
                for (const line of bomLines) {
                    const scaledQty = parseFloat((line.qty * mo.qty_planned).toFixed(3));

                    const [res] = await connection.execute(
                        `INSERT INTO mo_components
                            (mo_id, product_id, bom_line_id, qty_planned, qty_consumed, uom, is_available, notes, created_by)
                         VALUES (?, ?, ?, ?, 0.000, ?, FALSE, NULL, ?)`,
                        [moId, line.component_id, line.bom_line_id, scaledQty, line.uom || "Unit", createdBy || null]
                    );
                    insertedComponents.push({ mo_component_id: res[0].insertId, product_id: line.component_id, qty_planned: scaledQty });
                }

                winston.info("BOM exploded into MO Components successfully", {
                    source: "mo-component.model.js", function: "explodeBOM",
                    moId, bomId: mo.bom_id, componentsCount: insertedComponents.length,
                });

                return {
                    success: true,
                    message: `BOM exploded successfully. ${insertedComponents.length} component(s) created.`,
                    data: { mo_id: moId, components_count: insertedComponents.length },
                };
            }, { maxRetries: 3, operationName: "BOM Explosion" });
        } catch (error) {
            winston.error(`Error exploding BOM: ${error.message}`, {
                source: "mo-component.model.js", function: "explodeBOM",
                error: error.message, stack: error.stack, moId,
            });
            return { success: false, message: error.message || "Failed to explode BOM", error: error.message };
        }
    },

    /**
     * Update qty_consumed for an MO component (record actual material usage)
     */
    async updateConsumedQty(componentId, qtyConsumed) {
        try {
            const existing = await db.getResults(
                `SELECT mo_component_id, qty_planned FROM mo_components WHERE mo_component_id = ?`,
                [componentId]
            );

            if (!existing || existing.length === 0) {
                return { success: false, message: "MO Component not found" };
            }

            await db.getResults(
                `UPDATE mo_components SET qty_consumed = ?, is_available = (? <= qty_planned) WHERE mo_component_id = ?`,
                [qtyConsumed, qtyConsumed, componentId]
            );

            winston.info("MO Component consumed qty updated", {
                source: "mo-component.model.js", function: "updateConsumedQty",
                componentId, qtyConsumed,
            });

            return { success: true, message: "Consumed quantity updated successfully", data: { mo_component_id: componentId, qty_consumed: qtyConsumed } };
        } catch (error) {
            winston.error(`Error updating consumed qty: ${error.message}`, {
                source: "mo-component.model.js", function: "updateConsumedQty",
                error: error.message, stack: error.stack, componentId,
            });
            return { success: false, message: "Failed to update consumed quantity", error: error.message };
        }
    },

    /**
     * Delete a single MO component (hard delete — allowed by schema)
     */
    async deleteMOComponent(componentId) {
        try {
            const existing = await db.getResults(
                `SELECT mo_component_id FROM mo_components WHERE mo_component_id = ?`,
                [componentId]
            );

            if (!existing || existing.length === 0) {
                return { success: false, message: "MO Component not found" };
            }

            await db.getResults(
                `DELETE FROM mo_components WHERE mo_component_id = ?`,
                [componentId]
            );

            winston.info("MO Component deleted successfully", {
                source: "mo-component.model.js", function: "deleteMOComponent", componentId,
            });

            return { success: true, message: "MO Component deleted successfully" };
        } catch (error) {
            winston.error(`Error deleting MO Component: ${error.message}`, {
                source: "mo-component.model.js", function: "deleteMOComponent",
                error: error.message, stack: error.stack, componentId,
            });
            return { success: false, message: "Failed to delete MO Component", error: error.message };
        }
    },
};

module.exports = moComponentModel;
