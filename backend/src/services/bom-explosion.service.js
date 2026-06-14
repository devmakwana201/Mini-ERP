const db = require("../config/db");
const winston = require("../config/winston");
const stockReservation = require("./stock-reservation.service");

/**
 * BOM Explosion Service
 * Core algorithm: Confirm MO → explode BOM → create mo_components → reserve components → create work orders
 */
const bomExplosionService = {
    /**
     * Explode BOM for a Manufacturing Order.
     * MUST be called inside an active DB transaction.
     *
     * @param {Object} params
     * @param {number} params.mo_id
     * @param {number} params.bom_id
     * @param {number} params.qty_planned   — MO planned production qty
     * @param {string|null} params.scheduled_date
     * @param {number|null} params.created_by
     * @param {Object} params.connection    — Active MySQL2 transaction connection
     * @returns {{ components: Array, work_orders: Array }}
     */
    async explodeBOM({ mo_id, bom_id, qty_planned, scheduled_date, created_by, connection }) {
        // STEP 1: Fetch BOM header (for base qty)
        const [bomRows] = await connection.query(
            `SELECT bom_id, product_id, qty, bom_type
             FROM bom
             WHERE bom_id = ? AND is_deleted = FALSE`,
            [bom_id]
        );

        if (!bomRows || bomRows.length === 0) {
            throw new Error(`BOM ${bom_id} not found`);
        }

        const bom = bomRows[0];
        const bom_base_qty = parseFloat(bom.qty) || 1;
        const scale_factor = parseFloat(qty_planned) / bom_base_qty;

        // STEP 2: Fetch all BOM lines with component details
        const [bomLines] = await connection.query(
            `SELECT bl.bom_line_id, bl.component_id, bl.qty, bl.uom,
                    bl.operation_id,
                    p.product_name AS component_name,
                    p.product_code AS component_code
             FROM bom_lines bl
             JOIN products p ON p.product_id = bl.component_id AND p.is_deleted = FALSE
             WHERE bl.bom_id = ? AND bl.is_deleted = FALSE`,
            [bom_id]
        );

        if (!bomLines || bomLines.length === 0) {
            throw new Error(`BOM ${bom_id} has no component lines`);
        }

        // STEP 3: Calculate planned qty per component and insert mo_components
        const components = [];
        for (const line of bomLines) {
            const qty_planned_component = parseFloat(line.qty) * scale_factor;

            const [insertResult] = await connection.query(
                `INSERT INTO mo_components
                    (mo_id, product_id, bom_line_id, qty_planned, qty_consumed,
                     uom, is_available, created_by)
                 VALUES (?, ?, ?, ?, 0, ?, FALSE, ?)
                 ON DUPLICATE KEY UPDATE
                    qty_planned = qty_planned + VALUES(qty_planned)`,
                [mo_id, line.component_id, line.bom_line_id,
                 qty_planned_component, line.uom || null, created_by]
            );

            components.push({
                mo_component_id: insertResult.insertId,
                product_id: line.component_id,
                component_name: line.component_name,
                qty_planned: qty_planned_component,
                uom: line.uom,
                operation_id: line.operation_id,
                is_available: false,
            });
        }

        // STEP 4: Attempt to reserve components (SELECT FOR UPDATE per component)
        // Re-fetch mo_components (handles ON DUPLICATE KEY merged rows)
        const [moComponents] = await connection.query(
            `SELECT mc.mo_component_id, mc.product_id, mc.qty_planned
             FROM mo_components mc
             WHERE mc.mo_id = ?`,
            [mo_id]
        );

        for (const comp of moComponents) {
            try {
                const { reserved } = await stockReservation.reserveForMO({
                    product_id: comp.product_id,
                    qty_requested: parseFloat(comp.qty_planned),
                    mo_id,
                    mo_component_id: comp.mo_component_id,
                    created_by,
                    connection,
                });
                // Update is_available in our local result
                const localComp = components.find(c => c.product_id === comp.product_id);
                if (localComp) localComp.is_available = reserved;
            } catch (err) {
                winston.warn(`Could not reserve component ${comp.product_id} for MO ${mo_id}: ${err.message}`);
                // Not fatal — is_available stays FALSE
            }
        }

        // STEP 5: Create Work Orders from unique operations in BOM lines
        const uniqueOperationIds = [...new Set(
            bomLines.map(l => l.operation_id).filter(id => id != null)
        )];

        const work_orders = [];
        for (const operation_id of uniqueOperationIds) {
            // Fetch operation details
            const [opRows] = await connection.query(
                `SELECT o.operation_id, o.name AS operation_name, o.work_center_id,
                        o.duration_minutes,
                        wc.name AS work_center_name
                 FROM operations o
                 JOIN work_centers wc ON wc.work_center_id = o.work_center_id
                 WHERE o.operation_id = ? AND o.is_deleted = FALSE`,
                [operation_id]
            );

            if (!opRows || opRows.length === 0) continue;

            const op = opRows[0];
            const duration_hours = (parseFloat(op.duration_minutes) || 0) / 60;

            const [woResult] = await connection.query(
                `INSERT INTO work_orders
                    (mo_id, operation_id, work_center_id, operation_name,
                     status, duration_hours, scheduled_date, created_by)
                 VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`,
                [mo_id, operation_id, op.work_center_id, op.operation_name,
                 duration_hours, scheduled_date || null, created_by]
            );

            work_orders.push({
                work_order_id: woResult.insertId,
                operation_id,
                operation_name: op.operation_name,
                work_center_id: op.work_center_id,
                work_center_name: op.work_center_name,
                duration_hours,
                status: 'pending',
            });
        }

        winston.info(`BOM explosion complete for MO ${mo_id}`, {
            source: "bom-explosion.service.js",
            function: "explodeBOM",
            mo_id, bom_id, qty_planned,
            components_count: components.length,
            work_orders_count: work_orders.length,
        });

        return { components, work_orders };
    },
};

module.exports = bomExplosionService;
