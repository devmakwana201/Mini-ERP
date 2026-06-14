const db = require("../../config/db");
const auditService = require("../../services/audit.service");
const ResponseFormatter = require("../../utils/responseFormatter");

const warehouseController = {
    // GET /warehouses
    async list(req, res) {
        try {
            const rows = await db.getResults(`
                SELECT w.*, COUNT(sl.location_id) AS location_count
                FROM warehouses w
                LEFT JOIN stock_locations sl ON sl.warehouse_id = w.warehouse_id AND sl.is_deleted = FALSE
                WHERE w.is_deleted = FALSE
                GROUP BY w.warehouse_id
                ORDER BY w.warehouse_name ASC
            `);
            return res.status(200).json(ResponseFormatter.success(rows, "Warehouses fetched"));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    async getById(req, res) {
        try {
            const wh_id = parseInt(req.params.id);
            const [wh] = await db.connection.query(`SELECT * FROM warehouses WHERE warehouse_id = ? AND is_deleted = FALSE`, [wh_id]);
            if (!wh.length) return res.status(404).json(ResponseFormatter.notFound("Warehouse"));
            const [locations] = await db.connection.query(`SELECT * FROM stock_locations WHERE warehouse_id = ? AND is_deleted = FALSE ORDER BY name ASC`, [wh_id]);
            return res.status(200).json(ResponseFormatter.success({ ...wh[0], locations }, "Warehouse fetched"));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    async create(req, res) {
        try {
            const { warehouse_name, code, address, is_active = true } = req.body;
            const result = await db.getResults(
                `INSERT INTO warehouses (warehouse_name, code, address, is_active, is_deleted, created_by) VALUES (?, ?, ?, ?, FALSE, ?)`,
                [warehouse_name, code || null, address || null, is_active ? 1 : 0, req.user?.userId]
            );
            await auditService.logAudit({ user_id: req.user?.userId, table_name: "warehouses", record_id: result.insertId, action: "INSERT", new_values: req.body, ip_address: req.ip });
            return res.status(201).json(ResponseFormatter.created({ warehouse_id: result.insertId }, "Warehouse created"));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    async update(req, res) {
        try {
            const wh_id = parseInt(req.params.id);
            const { warehouse_name, code, address, is_active } = req.body;
            await db.getResults(`UPDATE warehouses SET warehouse_name = ?, code = ?, address = ?, is_active = ?, updated_by = ? WHERE warehouse_id = ? AND is_deleted = FALSE`,
                [warehouse_name, code || null, address || null, is_active ? 1 : 0, req.user?.userId, wh_id]);
            return res.status(200).json(ResponseFormatter.updated({ warehouse_id: wh_id }));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    async softDelete(req, res) {
        try {
            const wh_id = parseInt(req.params.id);
            const [loc] = await db.connection.query(`SELECT location_id FROM stock_locations WHERE warehouse_id = ? AND is_deleted = FALSE LIMIT 1`, [wh_id]);
            if (loc.length > 0) return res.status(422).json(ResponseFormatter.error("Cannot delete warehouse with existing locations", 422));
            await db.getResults(`UPDATE warehouses SET is_deleted = TRUE, updated_by = ? WHERE warehouse_id = ?`, [req.user?.userId, wh_id]);
            return res.status(200).json(ResponseFormatter.deleted("Warehouse deleted"));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // Stock Locations
    async listLocations(req, res) {
        try {
            const { warehouse_id, location_type } = req.query;
            const conditions = ["sl.is_deleted = FALSE"];
            const params = [];
            if (warehouse_id) { conditions.push("sl.warehouse_id = ?"); params.push(warehouse_id); }
            if (location_type) { conditions.push("sl.location_type = ?"); params.push(location_type); }
            const rows = await db.getResults(`SELECT sl.*, w.warehouse_name FROM stock_locations sl JOIN warehouses w ON w.warehouse_id = sl.warehouse_id WHERE ${conditions.join(" AND ")} ORDER BY w.warehouse_name, sl.name`, params);
            return res.status(200).json(ResponseFormatter.success(rows, "Locations fetched"));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    async createLocation(req, res) {
        try {
            const { warehouse_id, name, code, location_type = "storage" } = req.body;
            const result = await db.getResults(
                `INSERT INTO stock_locations (warehouse_id, name, code, location_type, is_deleted, created_by) VALUES (?, ?, ?, ?, FALSE, ?)`,
                [warehouse_id, name, code || null, location_type, req.user?.userId]
            );
            return res.status(201).json(ResponseFormatter.created({ location_id: result.insertId }, "Location created"));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    async updateLocation(req, res) {
        try {
            const loc_id = parseInt(req.params.id);
            const { name, code, location_type } = req.body;
            await db.getResults(`UPDATE stock_locations SET name = ?, code = ?, location_type = ?, updated_by = ? WHERE location_id = ? AND is_deleted = FALSE`,
                [name, code || null, location_type, req.user?.userId, loc_id]);
            return res.status(200).json(ResponseFormatter.updated({ location_id: loc_id }));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    async deleteLocation(req, res) {
        try {
            await db.getResults(`UPDATE stock_locations SET is_deleted = TRUE, updated_by = ? WHERE location_id = ?`, [req.user?.userId, req.params.id]);
            return res.status(200).json(ResponseFormatter.deleted("Location deleted"));
        } catch (err) {
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },
};

module.exports = warehouseController;
