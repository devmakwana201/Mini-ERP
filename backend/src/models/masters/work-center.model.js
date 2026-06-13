const db = require("../../config/db");
const winston = require("../../config/winston");
const { retryTransaction } = require("../../utils/dbRetry");

const workCenterModel = {
    /**
     * Get all work centers with pagination, filtering and sorting
     */
    async getWorkCenters({ filters = {}, start = 0, length = 10, sortField = "wc.created_at", sortOrder = "desc" } = {}) {
        try {
            const allowedSortFields = {
                name: "wc.name",
                code: "wc.code",
                capacity_per_day: "wc.capacity_per_day",
                cost_per_hour: "wc.cost_per_hour",
                is_active: "wc.is_active",
                created_at: "wc.created_at",
            };

            const safeSortField = allowedSortFields[sortField] || "wc.created_at";
            const safeSortOrder = sortOrder?.toLowerCase() === "asc" ? "ASC" : "DESC";

            const conditions = ["wc.is_deleted = FALSE"];
            const params = [];

            // Global search
            if (filters?.global?.value) {
                const search = `%${filters.global.value}%`;
                conditions.push(`(wc.name LIKE ? OR wc.code LIKE ?)`);
                params.push(search, search);
            }

            // Field-specific filters
            const fieldMap = {
                name: "wc.name",
                code: "wc.code",
            };

            for (const [key, col] of Object.entries(fieldMap)) {
                if (filters?.[key]?.value) {
                    conditions.push(`${col} LIKE ?`);
                    params.push(`%${filters[key].value}%`);
                }
            }

            if (filters?.is_active?.value !== undefined && filters.is_active.value !== "") {
                conditions.push(`wc.is_active = ?`);
                params.push(filters.is_active.value);
            }

            const whereClause = `WHERE ${conditions.join(" AND ")}`;

            const baseQuery = `FROM work_centers wc ${whereClause}`;

            const countSql = `SELECT COUNT(*) as total ${baseQuery}`;
            const dataSql = `
                SELECT
                    wc.work_center_id,
                    wc.name,
                    wc.code,
                    wc.description,
                    wc.capacity_per_day,
                    wc.cost_per_hour,
                    wc.is_active,
                    wc.created_at,
                    wc.created_by,
                    wc.updated_at,
                    wc.updated_by
                ${baseQuery}
                ORDER BY ${safeSortField} ${safeSortOrder}
                LIMIT ? OFFSET ?
            `;

            const [countResult, rows] = await Promise.all([
                db.getResults(countSql, params),
                db.getResults(dataSql, [...params, parseInt(length), parseInt(start)]),
            ]);

            return {
                success: true,
                data: rows,
                total: countResult[0]?.total || 0,
            };
        } catch (error) {
            winston.error(`Error fetching Work Centers: ${error.message}`, {
                source: "work-center.model.js", function: "getWorkCenters",
                error: error.message, stack: error.stack,
            });
            return { success: false, message: "Failed to fetch Work Centers", error: error.message };
        }
    },

    /**
     * Get active work centers for dropdown
     */
    async getActiveWorkCenters() {
        try {
            const sql = `
                SELECT work_center_id, name, code, capacity_per_day, cost_per_hour
                FROM work_centers
                WHERE is_deleted = FALSE AND is_active = TRUE
                ORDER BY name ASC
            `;
            const rows = await db.getResults(sql, []);
            return { success: true, data: rows };
        } catch (error) {
            winston.error(`Error fetching active Work Centers: ${error.message}`, {
                source: "work-center.model.js", function: "getActiveWorkCenters",
                error: error.message, stack: error.stack,
            });
            return { success: false, message: "Failed to fetch active Work Centers", error: error.message };
        }
    },

    /**
     * Get single work center by ID
     */
    async getWorkCenterById(workCenterId) {
        try {
            const sql = `
                SELECT
                    wc.work_center_id,
                    wc.name,
                    wc.code,
                    wc.description,
                    wc.capacity_per_day,
                    wc.cost_per_hour,
                    wc.is_active,
                    wc.created_at,
                    wc.created_by,
                    wc.updated_at,
                    wc.updated_by
                FROM work_centers wc
                WHERE wc.work_center_id = ? AND wc.is_deleted = FALSE
            `;
            const rows = await db.getResults(sql, [workCenterId]);

            if (!rows || rows.length === 0) {
                return { success: false, message: "Work Center not found" };
            }

            return { success: true, data: rows[0] };
        } catch (error) {
            winston.error(`Error fetching Work Center by ID: ${error.message}`, {
                source: "work-center.model.js", function: "getWorkCenterById",
                error: error.message, stack: error.stack, workCenterId,
            });
            return { success: false, message: "Failed to fetch Work Center", error: error.message };
        }
    },

    /**
     * Create a new work center
     */
    async createWorkCenter(payload) {
        try {
            return await retryTransaction(async (connection) => {
                const {
                    name, code, description,
                    capacity_per_day = 8.00, cost_per_hour = 0.00,
                    is_active = true,
                    created_by,
                } = payload;

                // Check for duplicate code
                const [existing] = await connection.execute(
                    `SELECT work_center_id FROM work_centers WHERE code = ? AND is_deleted = FALSE`,
                    [code]
                );
                if (existing.length > 0) {
                    throw new Error(`Work Center code '${code}' already exists`);
                }

                // Check for duplicate name
                const [existingName] = await connection.execute(
                    `SELECT work_center_id FROM work_centers WHERE name = ? AND is_deleted = FALSE`,
                    [name]
                );
                if (existingName.length > 0) {
                    throw new Error(`Work Center name '${name}' already exists`);
                }

                const [result] = await connection.execute(
                    `INSERT INTO work_centers
                        (name, code, description, capacity_per_day, cost_per_hour, is_active, is_deleted, created_by, updated_by)
                     VALUES (?, ?, ?, ?, ?, ?, FALSE, ?, ?)`,
                    [name, code, description || null, capacity_per_day, cost_per_hour, is_active ? 1 : 0, created_by || null, created_by || null]
                );

                winston.info("Work Center created successfully", {
                    source: "work-center.model.js", function: "createWorkCenter",
                    work_center_id: result.insertId, name,
                });

                return {
                    success: true,
                    message: "Work Center created successfully",
                    data: { work_center_id: result.insertId, name, code },
                };
            }, { maxRetries: 3, operationName: "Work Center Creation" });
        } catch (error) {
            winston.error(`Error creating Work Center: ${error.message}`, {
                source: "work-center.model.js", function: "createWorkCenter",
                error: error.message, stack: error.stack,
            });
            return { success: false, message: error.message || "Failed to create Work Center", error: error.message };
        }
    },

    /**
     * Update an existing work center
     */
    async updateWorkCenter(workCenterId, payload) {
        try {
            return await retryTransaction(async (connection) => {
                const {
                    name, code, description,
                    capacity_per_day, cost_per_hour,
                    is_active,
                    updated_by,
                } = payload;

                // Check exists
                const [existing] = await connection.execute(
                    `SELECT work_center_id FROM work_centers WHERE work_center_id = ? AND is_deleted = FALSE`,
                    [workCenterId]
                );
                if (!existing.length) {
                    throw new Error("Work Center not found");
                }

                // Check duplicate code (exclude self)
                if (code) {
                    const [dupCode] = await connection.execute(
                        `SELECT work_center_id FROM work_centers WHERE code = ? AND work_center_id != ? AND is_deleted = FALSE`,
                        [code, workCenterId]
                    );
                    if (dupCode.length > 0) {
                        throw new Error(`Work Center code '${code}' already exists`);
                    }
                }

                // Check duplicate name (exclude self)
                if (name) {
                    const [dupName] = await connection.execute(
                        `SELECT work_center_id FROM work_centers WHERE name = ? AND work_center_id != ? AND is_deleted = FALSE`,
                        [name, workCenterId]
                    );
                    if (dupName.length > 0) {
                        throw new Error(`Work Center name '${name}' already exists`);
                    }
                }

                await connection.execute(
                    `UPDATE work_centers
                     SET name = ?, code = ?, description = ?, capacity_per_day = ?, cost_per_hour = ?, is_active = ?, updated_by = ?
                     WHERE work_center_id = ?`,
                    [name, code, description || null, capacity_per_day, cost_per_hour, is_active ? 1 : 0, updated_by || null, workCenterId]
                );

                winston.info("Work Center updated successfully", {
                    source: "work-center.model.js", function: "updateWorkCenter", workCenterId,
                });

                return { success: true, message: "Work Center updated successfully", data: { work_center_id: workCenterId } };
            }, { maxRetries: 3, operationName: "Work Center Update" });
        } catch (error) {
            winston.error(`Error updating Work Center: ${error.message}`, {
                source: "work-center.model.js", function: "updateWorkCenter",
                error: error.message, stack: error.stack, workCenterId,
            });
            return { success: false, message: error.message || "Failed to update Work Center", error: error.message };
        }
    },

    /**
     * Soft delete a work center
     */
    async deleteWorkCenter(workCenterId, updatedBy) {
        try {
            const existing = await db.getResults(
                `SELECT work_center_id FROM work_centers WHERE work_center_id = ? AND is_deleted = FALSE`,
                [workCenterId]
            );

            if (!existing || existing.length === 0) {
                return { success: false, message: "Work Center not found" };
            }

            // Check if any active operations use this work center
            const usedByOps = await db.getResults(
                `SELECT operation_id FROM operations WHERE work_center_id = ? AND is_deleted = FALSE LIMIT 1`,
                [workCenterId]
            );
            if (usedByOps && usedByOps.length > 0) {
                return { success: false, message: "Cannot delete Work Center: it is used by active Operations. Please remove or reassign those first." };
            }

            await db.getResults(
                `UPDATE work_centers SET is_deleted = TRUE, updated_by = ? WHERE work_center_id = ?`,
                [updatedBy || null, workCenterId]
            );

            winston.info("Work Center deleted successfully", {
                source: "work-center.model.js", function: "deleteWorkCenter", workCenterId,
            });

            return { success: true, message: "Work Center deleted successfully" };
        } catch (error) {
            winston.error(`Error deleting Work Center: ${error.message}`, {
                source: "work-center.model.js", function: "deleteWorkCenter",
                error: error.message, stack: error.stack, workCenterId,
            });
            return { success: false, message: "Failed to delete Work Center", error: error.message };
        }
    },
};

module.exports = workCenterModel;
