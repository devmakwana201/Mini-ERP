const db = require("../config/db");
const ResponseFormatter = require("../utils/responseFormatter");
const winston = require("../config/winston");

const dashboardController = {
    // GET /dashboard
    async getSummary(req, res) {
        try {
            const [
                soStats, poStats, moStats, inventoryAlerts,
                recentSO, recentPO, recentMO, lowStockProducts,
            ] = await Promise.all([
                // SO KPIs
                db.getResults(`SELECT
                    COUNT(*) AS total_so,
                    SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS open_so,
                    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_delivery,
                    SUM(CASE WHEN status = 'done' AND DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) AS done_today
                FROM sales_orders WHERE is_deleted = FALSE`),

                // PO KPIs
                db.getResults(`SELECT
                    COUNT(*) AS total_po,
                    SUM(CASE WHEN status IN ('sent','confirmed') THEN 1 ELSE 0 END) AS pending_po,
                    SUM(CASE WHEN status = 'received' AND DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS received_this_week
                FROM purchase_orders WHERE is_deleted = FALSE`),

                // MO KPIs
                db.getResults(`SELECT
                    COUNT(*) AS total_mo,
                    SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS pending_mo,
                    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS active_mo,
                    SUM(CASE WHEN status = 'done' AND DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS done_this_week
                FROM manufacturing_orders WHERE is_deleted = FALSE`),

                // Inventory alerts
                db.getResults(`SELECT COUNT(*) AS low_stock_count FROM products WHERE is_deleted = FALSE AND is_active = TRUE AND on_hand_qty <= min_stock_qty`),

                // Recent SOs
                db.getResults(`
                    SELECT so.so_id, CONCAT('SO-', LPAD(so.so_id, 4, '0')) AS so_number, so.status, so.total_amount, p.name AS customer_name, so.created_at
                    FROM sales_orders so LEFT JOIN partners p ON p.partner_id = so.customer_id
                    WHERE so.is_deleted = FALSE ORDER BY so.created_at DESC LIMIT 5
                `),

                // Recent POs
                db.getResults(`
                    SELECT po.po_id, CONCAT('PO-', LPAD(po.po_id, 4, '0')) AS po_number, po.status, po.total_amount, p.name AS vendor_name, po.created_at
                    FROM purchase_orders po LEFT JOIN partners p ON p.partner_id = po.vendor_id
                    WHERE po.is_deleted = FALSE ORDER BY po.created_at DESC LIMIT 5
                `),

                // Recent MOs
                db.getResults(`
                    SELECT mo.mo_id, CONCAT('MO-', LPAD(mo.mo_id, 4, '0')) AS mo_number, mo.status, mo.qty_planned, mo.qty_produced, pr.product_name, mo.created_at
                    FROM manufacturing_orders mo JOIN products pr ON pr.product_id = mo.product_id
                    WHERE mo.is_deleted = FALSE ORDER BY mo.created_at DESC LIMIT 5
                `),

                // Low stock products
                db.getResults(`
                    SELECT product_id, product_code, product_name, on_hand_qty, reserved_qty, free_to_use_qty, min_stock_qty, uom
                    FROM products
                    WHERE is_deleted = FALSE AND is_active = TRUE AND on_hand_qty <= min_stock_qty
                    ORDER BY (on_hand_qty / NULLIF(min_stock_qty, 0)) ASC
                    LIMIT 10
                `),
            ]);

            return res.status(200).json(ResponseFormatter.success({
                kpis: {
                    sales: soStats[0],
                    purchasing: poStats[0],
                    manufacturing: moStats[0],
                    inventory: inventoryAlerts[0],
                },
                recent: {
                    sales_orders: recentSO,
                    purchase_orders: recentPO,
                    manufacturing_orders: recentMO,
                },
                alerts: {
                    low_stock_products: lowStockProducts,
                },
            }, "Dashboard data fetched"));
        } catch (err) {
            winston.error(`dashboardController.getSummary: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // GET /dashboard/sales-chart
    async getSalesChart(req, res) {
        try {
            const { period = "30" } = req.query;
            const days = Math.min(parseInt(period) || 30, 365);

            const rows = await db.getResults(`
                SELECT DATE(so.created_at) AS date,
                       COUNT(*) AS order_count,
                       COALESCE(SUM(so.total_amount), 0) AS total_revenue
                FROM sales_orders so
                WHERE so.is_deleted = FALSE
                  AND so.status NOT IN ('cancelled')
                  AND so.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                GROUP BY DATE(so.created_at)
                ORDER BY date ASC
            `, [days]);

            return res.status(200).json(ResponseFormatter.success(rows, "Sales chart data fetched"));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // GET /dashboard/inventory-summary
    async getInventorySummary(req, res) {
        try {
            const rows = await db.getResults(`
                SELECT
                    p.product_id, p.product_name, p.product_code, p.uom,
                    p.on_hand_qty, p.reserved_qty, p.free_to_use_qty, p.min_stock_qty,
                    CASE
                        WHEN p.on_hand_qty = 0 THEN 'out_of_stock'
                        WHEN p.on_hand_qty <= p.min_stock_qty THEN 'low_stock'
                        WHEN p.free_to_use_qty <= 0 THEN 'fully_reserved'
                        ELSE 'ok'
                    END AS stock_status
                FROM products p
                WHERE p.is_deleted = FALSE AND p.is_active = TRUE
                ORDER BY p.on_hand_qty ASC
                LIMIT 50
            `);
            return res.status(200).json(ResponseFormatter.success(rows, "Inventory summary fetched"));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },
};

module.exports = dashboardController;
