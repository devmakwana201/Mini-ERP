const db = require("../config/db");
const winston = require("../config/winston");
const auditService = require("./audit.service");

/**
 * Procurement Automation Service
 * Triggered:
 *  1. On SO confirm when stock is insufficient (MTS shortage)
 *  2. Via node-cron daily job
 *  3. Via manual API endpoint POST /procurement-rules/run
 */
const procurementService = {
    /**
     * Run full procurement check across all active rules.
     * Returns { posCreated, mosCreated }
     */
    async checkAndTriggerProcurement(triggered_by = null) {
        let posCreated = 0;
        let mosCreated = 0;

        try {
            // Fetch all active procurement rules with product details
            const rules = await db.getResults(`
                SELECT
                    pr.rule_id, pr.product_id, pr.strategy,
                    pr.min_stock_qty, pr.reorder_qty, pr.preferred_vendor_id,
                    p.product_name, p.product_code,
                    p.on_hand_qty, p.reserved_qty,
                    (p.on_hand_qty - p.reserved_qty) AS free_to_use_qty,
                    p.procurement_type, p.bom_id
                FROM procurement_rules pr
                JOIN products p ON p.product_id = pr.product_id AND p.is_deleted = FALSE AND p.is_active = TRUE
                WHERE pr.is_active = TRUE AND pr.is_deleted = FALSE
            `);

            for (const rule of rules) {
                if (rule.strategy === 'MTO') continue; // MTO triggered per SO only

                const free = parseFloat(rule.free_to_use_qty);
                const min = parseFloat(rule.min_stock_qty);

                if (free <= min) {
                    const shortage_qty = parseFloat(rule.reorder_qty);
                    const result = await procurementService.triggerReplenishment(rule, shortage_qty, null, triggered_by);
                    if (result.type === 'PO') posCreated++;
                    if (result.type === 'MO') mosCreated++;
                }
            }

            winston.info(`Procurement check complete: ${posCreated} POs, ${mosCreated} MOs created`, {
                source: "procurement.service.js",
                function: "checkAndTriggerProcurement",
            });

            return { posCreated, mosCreated };
        } catch (error) {
            winston.error(`Procurement check failed: ${error.message}`, {
                source: "procurement.service.js",
                function: "checkAndTriggerProcurement",
                error: error.message,
            });
            throw error;
        }
    },

    /**
     * Trigger replenishment for an MTS shortage.
     * Called during SO confirm and cron job.
     */
    async triggerReplenishment(product, shortage_qty, so_id = null, created_by = null) {
        const { product_id, procurement_type, bom_id } = product;

        // Deduplication: check existing open orders
        if (procurement_type === 'buy' || procurement_type === 'both') {
            const existingPO = await db.getResults(
                `SELECT po.po_id FROM purchase_orders po
                 JOIN purchase_order_lines pol ON pol.po_id = po.po_id AND pol.product_id = ?
                 WHERE po.status IN ('draft','sent','confirmed') AND po.is_deleted = FALSE
                 LIMIT 1`,
                [product_id]
            );
            if (existingPO.length > 0) {
                winston.info(`Skipping auto PO for product ${product_id} — open PO exists`);
                return { type: 'SKIPPED', reason: 'existing_po' };
            }
        }

        if (procurement_type === 'manufacture' || procurement_type === 'both') {
            const existingMO = await db.getResults(
                `SELECT mo_id FROM manufacturing_orders
                 WHERE product_id = ? AND status IN ('confirmed','in_progress') AND is_deleted = FALSE
                 LIMIT 1`,
                [product_id]
            );
            if (existingMO.length > 0) {
                winston.info(`Skipping auto MO for product ${product_id} — active MO exists`);
                return { type: 'SKIPPED', reason: 'existing_mo' };
            }
        }

        // Decision tree
        if (procurement_type === 'buy') {
            return await procurementService.createAutoPurchaseOrder(product, shortage_qty, so_id, created_by);
        }

        if (procurement_type === 'manufacture') {
            return await procurementService.createAutoManufacturingOrder(product, shortage_qty, so_id, 'MTS', created_by);
        }

        if (procurement_type === 'both') {
            // Prefer manufacture if BOM available
            if (bom_id) {
                return await procurementService.createAutoManufacturingOrder(product, shortage_qty, so_id, 'MTS', created_by);
            } else {
                return await procurementService.createAutoPurchaseOrder(product, shortage_qty, so_id, created_by);
            }
        }

        return { type: 'NONE' };
    },

    /**
     * Trigger MTO replenishment when SO qty exceeds available stock.
     */
    async triggerMTOReplenishment(product, qty, so_id, created_by = null) {
        const { product_id, procurement_type, bom_id } = product;

        if (procurement_type === 'manufacture' || (procurement_type === 'both' && bom_id)) {
            return await procurementService.createAutoManufacturingOrder(product, qty, so_id, 'MTO', created_by);
        } else {
            return await procurementService.createAutoPurchaseOrder(product, qty, so_id, created_by);
        }
    },

    /**
     * Create an automatic Purchase Order.
     */
    async createAutoPurchaseOrder(product, qty, so_id = null, created_by = null) {
        try {
            const { product_id } = product;

            // Find preferred vendor
            let vendor_id = product.preferred_vendor_id || null;
            if (!vendor_id) {
                const [pvRows] = await db.connection.query(
                    `SELECT partner_id FROM product_vendors
                     WHERE product_id = ? AND is_preferred = TRUE AND is_active = TRUE
                     LIMIT 1`,
                    [product_id]
                );
                if (pvRows.length > 0) vendor_id = pvRows[0].partner_id;
            }

            // Get unit_cost from product_vendors
            let unit_cost = 0;
            if (vendor_id) {
                const [costRows] = await db.connection.query(
                    `SELECT unit_cost FROM product_vendors
                     WHERE product_id = ? AND partner_id = ? AND is_active = TRUE
                     LIMIT 1`,
                    [product_id, vendor_id]
                );
                if (costRows.length > 0) unit_cost = parseFloat(costRows[0].unit_cost) || 0;
            }

            // Create PO
            const [poResult] = await db.connection.query(
                `INSERT INTO purchase_orders
                    (vendor_id, status, notes, created_by)
                 VALUES (?, 'draft', 'Auto-generated by procurement engine', ?)`,
                [vendor_id || null, created_by]
            );
            const po_id = poResult.insertId;

            // Create PO line
            await db.connection.query(
                `INSERT INTO purchase_order_lines
                    (po_id, product_id, qty_ordered, qty_received, unit_cost, created_by)
                 VALUES (?, ?, ?, 0, ?, ?)`,
                [po_id, product_id, qty, unit_cost, created_by]
            );

            // Update PO total
            await db.connection.query(
                `UPDATE purchase_orders SET total_amount = ? WHERE po_id = ?`,
                [qty * unit_cost, po_id]
            );

            await auditService.logAudit({
                user_id: created_by,
                table_name: 'purchase_orders',
                record_id: po_id,
                action: 'INSERT',
                new_values: { po_id, vendor_id, product_id, qty, auto_generated: true },
            });

            winston.info(`Auto PO created: po_id=${po_id}, product=${product_id}, qty=${qty}`);
            return { type: 'PO', po_id };
        } catch (error) {
            winston.error(`Auto PO creation failed: ${error.message}`, {
                source: "procurement.service.js",
                function: "createAutoPurchaseOrder",
                product_id: product.product_id,
                error: error.message,
            });
            return { type: 'ERROR', error: error.message };
        }
    },

    /**
     * Create an automatic Manufacturing Order.
     */
    async createAutoManufacturingOrder(product, qty, so_id = null, mo_type = 'MTS', created_by = null) {
        try {
            const { product_id, bom_id } = product;

            if (!bom_id) {
                winston.warn(`Cannot auto-create MO for product ${product_id} — no BOM linked`);
                return { type: 'ERROR', error: 'No BOM linked to product' };
            }

            // Create MO in draft
            const [moResult] = await db.connection.query(
                `INSERT INTO manufacturing_orders
                    (product_id, bom_id, so_id, mo_type, status, qty_planned, qty_produced, created_by)
                 VALUES (?, ?, ?, ?, 'draft', ?, 0, ?)`,
                [product_id, bom_id, so_id || null, mo_type, qty, created_by]
            );
            const mo_id = moResult.insertId;

            await auditService.logAudit({
                user_id: created_by,
                table_name: 'manufacturing_orders',
                record_id: mo_id,
                action: 'INSERT',
                new_values: { mo_id, product_id, bom_id, so_id, mo_type, qty, auto_generated: true },
            });

            winston.info(`Auto MO created: mo_id=${mo_id}, product=${product_id}, qty=${qty}, type=${mo_type}`);
            return { type: 'MO', mo_id };
        } catch (error) {
            winston.error(`Auto MO creation failed: ${error.message}`, {
                source: "procurement.service.js",
                function: "createAutoManufacturingOrder",
                product_id: product.product_id,
                error: error.message,
            });
            return { type: 'ERROR', error: error.message };
        }
    },
};

module.exports = procurementService;
