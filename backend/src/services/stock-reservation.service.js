const db = require("../config/db");
const winston = require("../config/winston");
const ledger = require("./inventory-ledger.service");

/**
 * Stock Reservation Service
 * All methods MUST be called inside an active DB transaction (connection param).
 * Uses SELECT ... FOR UPDATE to prevent concurrent double-reservation.
 */
const stockReservationService = {
    /**
     * Reserve stock for a Sales Order line.
     * Returns { reserved_qty, was_partial } — partial if free stock < requested qty.
     *
     * @param {Object} params
     * @param {number} params.product_id
     * @param {number} params.qty_requested
     * @param {number} params.so_id
     * @param {number} params.so_line_id
     * @param {number|null} params.created_by
     * @param {Object} params.connection - Active MySQL2 connection inside transaction
     */
    async reserveForSO({ product_id, qty_requested, so_id, so_line_id, created_by, connection }) {
        // Lock the product row
        const [productRows] = await connection.query(
            `SELECT product_id, on_hand_qty, reserved_qty,
                    (on_hand_qty - reserved_qty) AS free_to_use_qty
             FROM products
             WHERE product_id = ? AND is_deleted = FALSE AND is_active = TRUE
             FOR UPDATE`,
            [product_id]
        );

        if (!productRows || productRows.length === 0) {
            throw new Error(`Product ${product_id} not found or inactive`);
        }

        const product = productRows[0];
        const free = parseFloat(product.free_to_use_qty);
        const qty_to_reserve = Math.min(free, qty_requested);
        const was_partial = qty_to_reserve < qty_requested;

        if (qty_to_reserve > 0) {
            const qty_before = parseFloat(product.reserved_qty);
            const qty_after = qty_before + qty_to_reserve;

            // Update product reserved_qty
            await connection.query(
                `UPDATE products SET reserved_qty = reserved_qty + ? WHERE product_id = ?`,
                [qty_to_reserve, product_id]
            );

            // Insert stock_reservation row
            await connection.query(
                `INSERT INTO stock_reservations
                    (product_id, so_id, reserved_qty, status, created_by)
                 VALUES (?, ?, ?, 'active', ?)`,
                [product_id, so_id, qty_to_reserve, created_by]
            );

            // Record in ledger (RESERVE txn tracks reserved_qty changes)
            await connection.query(
                `INSERT INTO inventory_transactions
                    (product_id, txn_type, reference_type, reference_id,
                     qty, qty_before, qty_after, notes, created_by)
                 VALUES (?, 'RESERVE', 'SO', ?, ?, ?, ?, 'Stock reserved for SO', ?)`,
                [product_id, so_id, qty_to_reserve, qty_before, qty_after, created_by]
            );

            // Update the SO line reserved_qty
            await connection.query(
                `UPDATE sales_order_lines SET reserved_qty = reserved_qty + ? WHERE sol_id = ?`,
                [qty_to_reserve, so_line_id]
            );
        }

        return { reserved_qty: qty_to_reserve, was_partial };
    },

    /**
     * Reserve components for a Manufacturing Order (BOM explosion step).
     * Returns { reserved: boolean }
     */
    async reserveForMO({ product_id, qty_requested, mo_id, mo_component_id, created_by, connection }) {
        const [productRows] = await connection.query(
            `SELECT product_id, on_hand_qty, reserved_qty,
                    (on_hand_qty - reserved_qty) AS free_to_use_qty
             FROM products
             WHERE product_id = ? AND is_deleted = FALSE
             FOR UPDATE`,
            [product_id]
        );

        if (!productRows || productRows.length === 0) {
            throw new Error(`Component product ${product_id} not found`);
        }

        const product = productRows[0];
        const free = parseFloat(product.free_to_use_qty);

        if (free < qty_requested) {
            return { reserved: false };
        }

        const qty_before = parseFloat(product.reserved_qty);
        const qty_after = qty_before + qty_requested;

        await connection.query(
            `UPDATE products SET reserved_qty = reserved_qty + ? WHERE product_id = ?`,
            [qty_requested, product_id]
        );

        await connection.query(
            `INSERT INTO inventory_transactions
                (product_id, txn_type, reference_type, reference_id,
                 qty, qty_before, qty_after, notes, created_by)
             VALUES (?, 'RESERVE', 'MO', ?, ?, ?, ?, 'Component reserved for MO', ?)`,
            [product_id, mo_id, qty_requested, qty_before, qty_after, created_by]
        );

        // Mark component as available
        await connection.query(
            `UPDATE mo_components SET is_available = TRUE WHERE mo_component_id = ?`,
            [mo_component_id]
        );

        return { reserved: true };
    },

    /**
     * Release a reservation when SO is cancelled.
     */
    async releaseSOReservation({ so_id, created_by, connection }) {
        // Get all active reservations for this SO
        const [reservations] = await connection.query(
            `SELECT sr.reservation_id, sr.product_id, sr.reserved_qty
             FROM stock_reservations sr
             WHERE sr.so_id = ? AND sr.status = 'active'
             FOR UPDATE`,
            [so_id]
        );

        for (const reservation of reservations) {
            const { product_id, reserved_qty, reservation_id } = reservation;

            // Get current reserved_qty for ledger
            const [pRows] = await connection.query(
                `SELECT reserved_qty FROM products WHERE product_id = ? FOR UPDATE`,
                [product_id]
            );
            const qty_before = parseFloat(pRows[0].reserved_qty);
            const qty_after = qty_before - reserved_qty;

            // Reduce product reserved_qty
            await connection.query(
                `UPDATE products SET reserved_qty = reserved_qty - ? WHERE product_id = ?`,
                [reserved_qty, product_id]
            );

            // Mark reservation as released
            await connection.query(
                `UPDATE stock_reservations SET status = 'released', updated_by = ?
                 WHERE reservation_id = ?`,
                [created_by, reservation_id]
            );

            // Ledger UNRESERVE entry
            await connection.query(
                `INSERT INTO inventory_transactions
                    (product_id, txn_type, reference_type, reference_id,
                     qty, qty_before, qty_after, notes, created_by)
                 VALUES (?, 'UNRESERVE', 'SO', ?, ?, ?, ?, 'Reservation released on SO cancel', ?)`,
                [product_id, so_id, reserved_qty, qty_before, qty_after, created_by]
            );
        }

        return { released: reservations.length };
    },

    /**
     * Consume reservation on SO delivery (OUT stock).
     */
    async consumeForDelivery({ so_id, product_id, qty_to_deliver, sol_id, created_by, connection }) {
        // Lock product
        const [pRows] = await connection.query(
            `SELECT on_hand_qty, reserved_qty FROM products WHERE product_id = ? FOR UPDATE`,
            [product_id]
        );
        const { on_hand_qty, reserved_qty } = pRows[0];

        const oh_before = parseFloat(on_hand_qty);
        const res_before = parseFloat(reserved_qty);

        // Reduce on_hand_qty and reserved_qty
        await connection.query(
            `UPDATE products
             SET on_hand_qty = on_hand_qty - ?,
                 reserved_qty = reserved_qty - ?
             WHERE product_id = ?`,
            [qty_to_deliver, qty_to_deliver, product_id]
        );

        // Update SO line delivered_qty
        await connection.query(
            `UPDATE sales_order_lines SET delivered_qty = delivered_qty + ? WHERE sol_id = ?`,
            [qty_to_deliver, sol_id]
        );

        // Update reservation status (find matching active reservation)
        const [resRows] = await connection.query(
            `SELECT reservation_id, reserved_qty FROM stock_reservations
             WHERE so_id = ? AND product_id = ? AND status = 'active'
             ORDER BY reservation_id ASC LIMIT 1`,
            [so_id, product_id]
        );
        if (resRows.length > 0) {
            const res = resRows[0];
            const remaining = parseFloat(res.reserved_qty) - qty_to_deliver;
            if (remaining <= 0) {
                await connection.query(
                    `UPDATE stock_reservations SET status = 'consumed', updated_by = ?
                     WHERE reservation_id = ?`,
                    [created_by, res.reservation_id]
                );
            } else {
                await connection.query(
                    `UPDATE stock_reservations SET reserved_qty = ?, updated_by = ?
                     WHERE reservation_id = ?`,
                    [remaining, created_by, res.reservation_id]
                );
            }
        }

        // OUT transaction (on_hand_qty reduces)
        await connection.query(
            `INSERT INTO inventory_transactions
                (product_id, txn_type, reference_type, reference_id,
                 qty, qty_before, qty_after, notes, created_by)
             VALUES (?, 'OUT', 'SO', ?, ?, ?, ?, 'Stock out on SO delivery', ?)`,
            [product_id, so_id, qty_to_deliver, oh_before, oh_before - qty_to_deliver, created_by]
        );
    },
};

module.exports = stockReservationService;
