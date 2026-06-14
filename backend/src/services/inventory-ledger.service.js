const db = require("../config/db");
const winston = require("../config/winston");

/**
 * Inventory Ledger Service
 * GOLDEN RULES:
 *  1. inventory_transactions rows are IMMUTABLE — never UPDATE or DELETE them.
 *  2. qty_before + qty = qty_after  (for IN, RESERVE, UNRESERVE)
 *     qty_after = qty_before - qty  (for OUT)
 *  3. txn_type determines direction, not the sign of qty (qty is always positive).
 */
const inventoryLedgerService = {
    /**
     * Record a stock transaction.
     * Caller is responsible for updating products.on_hand_qty / reserved_qty
     * BEFORE calling this (so qty_before/qty_after are correct at call time).
     *
     * @param {Object} params
     * @param {number}  params.product_id
     * @param {'IN'|'OUT'|'RESERVE'|'UNRESERVE'|'ADJUST'} params.txn_type
     * @param {'SO'|'PO'|'MO'|'ADJUSTMENT'|'RETURN'|'OPENING'} params.reference_type
     * @param {number|null}  params.reference_id
     * @param {number}  params.qty           — always positive
     * @param {number}  params.qty_before    — stock BEFORE this transaction
     * @param {number}  params.qty_after     — stock AFTER this transaction
     * @param {string|null}  params.notes
     * @param {number|null}  params.location_id
     * @param {number|null}  params.created_by
     */
    async record({
        product_id,
        txn_type,
        reference_type,
        reference_id = null,
        qty,
        qty_before,
        qty_after,
        notes = null,
        location_id = null,
        created_by = null,
    }) {
        try {
            const sql = `
                INSERT INTO inventory_transactions
                    (product_id, txn_type, reference_type, reference_id,
                     qty, qty_before, qty_after, notes, location_id, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const result = await db.getResults(sql, [
                product_id,
                txn_type,
                reference_type,
                reference_id,
                qty,
                qty_before,
                qty_after,
                notes,
                location_id,
                created_by,
            ]);
            return result.insertId || null;
        } catch (error) {
            winston.error(`Inventory ledger record failed: ${error.message}`, {
                source: "inventory-ledger.service.js",
                function: "record",
                product_id,
                txn_type,
                reference_type,
                error: error.message,
            });
            throw error;
        }
    },

    /**
     * Get current on_hand_qty for a product (for qty_before calculation)
     * Uses FOR UPDATE lock if inside a transaction.
     */
    async getCurrentStock(product_id, connection = null) {
        const sql = `
            SELECT product_id, on_hand_qty, reserved_qty,
                   (on_hand_qty - reserved_qty) AS free_to_use_qty
            FROM products
            WHERE product_id = ? AND is_deleted = FALSE
            FOR UPDATE
        `;
        const conn = connection || db;
        let rows;
        if (connection) {
            [rows] = await connection.query(sql, [product_id]);
        } else {
            rows = await db.getResults(sql, [product_id]);
        }
        return rows[0] || null;
    },
};

module.exports = inventoryLedgerService;
