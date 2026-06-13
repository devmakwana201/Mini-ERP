const db = require("../../config/db");
const winston = require("../../config/winston");
const { retryTransaction } = require("../../utils/dbRetry");

const operationModel = {
    /**
     * Get all operations with pagination, filtering and sorting
     */
    async getOperations({ filters = {}, start = 0, length = 10, sortField = "op.created_at", sortOrder = "desc" } = {}) {
        try {
            const allowedSortFields = {
                name: "op.name",
                code: "op.code",
                work_center_name: "wc.name",
                duration_minutes: "op.duration_minutes",
                is_active: "op.is_active",
                created_at: "op.created_at",
            };

            const safeSortField = allowedSortFields[sortField] || "op.created_at";
            const safeSortOrder = sortOrder?.toLowerCase() === "asc" ? "ASC" : "DESC";

            const conditions = ["op.is_deleted = FALSE"];
            const params = [];

            // Global search
            if (filters?.global?.value) {
                const search = `%${filters.global.value}%`;
                conditions.push(`(op.name LIKE ? OR op.code LIKE ? OR wc.name LIKE ?)`);
                params.push(search, search, search);
            }

            // Field-specific filters
            if (filters?.name?.value) {
                conditions.push(`op.name LIKE ?`);
                params.push(`%${filters.name.value}%`);
            }
            if (filters?.code?.value) {
                conditions.push(`op.code LIKE ?`);
                params.push(`%${filters.code.value}%`);
            }
            if (filters?.work_center_id?.value) {
                conditions.push(`op.work_center_id = ?`);
                params.push(filters.work_center_id.value);
            }
            if (filters?.is_active?.value !== undefined && filters.is_active.value !== "") {
                conditions.push(`op.is_active = ?`);
                params.push(filters.is_active.value);
            }

            const whereClause = `WHERE ${conditions.join(" AND ")}`;

            const baseQuery = `
                FROM operations op
                LEFT JOIN work_centers wc ON op.work_center_id = wc.work_center_id AND wc.is_deleted = FALSE
                ${whereClause}
            `;

            const countSql = `SELECT COUNT(*) as total ${baseQuery}`;
            const dataSql = `
                SELECT
                    op.operation_id,
                    op.work_center_id,
                    wc.name AS work_center_name,
                    wc.code AS work_center_code,
                    op.name,
                    op.code,
                    op.description,
                    op.duration_minutes,
                    op.is_active,
                    op.created_at,
                    op.created_by,
                    op.updated_at,
                    op.updated_by
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
            winston.error(`Error fetching Operations: ${error.message}`, {
                source: "operation.model.js", function: "getOperations",
                error: error.message, stack: error.stack,
            });
            return { success: false, message: "Failed to fetch Operations", error: error.message };
        }
    },

    /**
     * Get active operations for dropdown (optionally filtered by work_center_id)
     */
    async getActiveOperations(workCenterId = null) {
        try {
            const params = [];
            let whereClause = `WHERE op.is_deleted = FALSE AND op.is_active = TRUE`;

            if (workCenterId) {
                whereClause += ` AND op.work_center_id = ?`;
                params.push(workCenterId);
            }

            const sql = `
                SELECT
                    op.operation_id,
                    op.name,
                    op.code,
                    op.duration_minutes,
                    op.work_center_id,
                    wc.name AS work_center_name
                FROM operations op
                LEFT JOIN work_centers wc ON op.work_center_id = wc.work_center_id AND wc.is_deleted = FALSE
                ${whereClause}
                ORDER BY op.name ASC
            `;
            const rows = await db.getResults(sql, params);
            return { success: true, data: rows };
        } catch (error) {
            winston.error(`Error fetching active Operations: ${error.message}`, {
                source: "operation.model.js", function: "getActiveOperations",
                error: error.message, stack: error.stack,
            });
            return { success: false, message: "Failed to fetch active Operations", error: error.message };
        }
    },

    /**
     * Get single operation by ID
     */
    async getOperationById(operationId) {
        try {
            const sql = `
                SELECT
                    op.operation_id,
                    op.work_center_id,
                    wc.name AS work_center_name,
                    wc.code AS work_center_code,
                    op.name,
                    op.code,
                    op.description,
                    op.duration_minutes,
                    op.is_active,
                    op.created_at,
                    op.created_by,
                    op.updated_at,
                    op.updated_by
                FROM operations op
                LEFT JOIN work_centers wc ON op.work_center_id = wc.work_center_id AND wc.is_deleted = FALSE
                WHERE op.operation_id = ? AND op.is_deleted = FALSE
            `;
            const rows = await db.getResults(sql, [operationId]);

            if (!rows || rows.length === 0) {
                return { success: false, message: "Operation not found" };
            }

            return { success: true, data: rows[0] };
        } catch (error) {
            winston.error(`Error fetching Operation by ID: ${error.message}`, {
                source: "operation.model.js", function: "getOperationById",
                error: error.message, stack: error.stack, operationId,
            });
            return { success: false, message: "Failed to fetch Operation", error: error.message };
        }
    },

    /**
     * Create a new operation
     */
    async createOperation(payload) {
        try {
            return await retryTransaction(async (connection) => {
                const {
                    work_center_id, name, code, description,
                    duration_minutes = 0.00,
                    is_active = true,
                    created_by,
                } = payload;

                // Validate work center exists
                const [wc] = await connection.execute(
                    `SELECT work_center_id FROM work_centers WHERE work_center_id = ? AND is_deleted = FALSE AND is_active = TRUE`,
                    [work_center_id]
                );
                if (!wc.length) {
                    throw new Error("Work Center not found or inactive");
                }

                // Check duplicate code
                const [existingCode] = await connection.execute(
                    `SELECT operation_id FROM operations WHERE code = ? AND is_deleted = FALSE`,
                    [code]
                );
                if (existingCode.length > 0) {
                    throw new Error(`Operation code '${code}' already exists`);
                }

                const [result] = await connection.execute(
                    `INSERT INTO operations
                        (work_center_id, name, code, description, duration_minutes, is_active, is_deleted, created_by, updated_by)
                     VALUES (?, ?, ?, ?, ?, ?, FALSE, ?, ?)`,
                    [work_center_id, name, code, description || null, duration_minutes, is_active ? 1 : 0, created_by || null, created_by || null]
                );

                winston.info("Operation created successfully", {
                    source: "operation.model.js", function: "createOperation",
                    operation_id: result.insertId, name,
                });

                return {
                    success: true,
                    message: "Operation created successfully",
                    data: { operation_id: result.insertId, name, code },
                };
            }, { maxRetries: 3, operationName: "Operation Creation" });
        } catch (error) {
            winston.error(`Error creating Operation: ${error.message}`, {
                source: "operation.model.js", function: "createOperation",
                error: error.message, stack: error.stack,
            });
            return { success: false, message: error.message || "Failed to create Operation", error: error.message };
        }
    },

    /**
     * Update an existing operation
     */
    async updateOperation(operationId, payload) {
        try {
            return await retryTransaction(async (connection) => {
                const {
                    work_center_id, name, code, description,
                    duration_minutes, is_active,
                    updated_by,
                } = payload;

                // Check exists
                const [existing] = await connection.execute(
                    `SELECT operation_id FROM operations WHERE operation_id = ? AND is_deleted = FALSE`,
                    [operationId]
                );
                if (!existing.length) {
                    throw new Error("Operation not found");
                }

                // Check duplicate code (exclude self)
                if (code) {
                    const [dupCode] = await connection.execute(
                        `SELECT operation_id FROM operations WHERE code = ? AND operation_id != ? AND is_deleted = FALSE`,
                        [code, operationId]
                    );
                    if (dupCode.length > 0) {
                        throw new Error(`Operation code '${code}' already exists`);
                    }
                }

                await connection.execute(
                    `UPDATE operations
                     SET work_center_id = ?, name = ?, code = ?, description = ?, duration_minutes = ?, is_active = ?, updated_by = ?
                     WHERE operation_id = ?`,
                    [work_center_id, name, code, description || null, duration_minutes, is_active ? 1 : 0, updated_by || null, operationId]
                );

                winston.info("Operation updated successfully", {
                    source: "operation.model.js", function: "updateOperation", operationId,
                });

                return { success: true, message: "Operation updated successfully", data: { operation_id: operationId } };
            }, { maxRetries: 3, operationName: "Operation Update" });
        } catch (error) {
            winston.error(`Error updating Operation: ${error.message}`, {
                source: "operation.model.js", function: "updateOperation",
                error: error.message, stack: error.stack, operationId,
            });
            return { success: false, message: error.message || "Failed to update Operation", error: error.message };
        }
    },

    /**
     * Soft delete an operation
     */
    async deleteOperation(operationId, updatedBy) {
        try {
            const existing = await db.getResults(
                `SELECT operation_id FROM operations WHERE operation_id = ? AND is_deleted = FALSE`,
                [operationId]
            );

            if (!existing || existing.length === 0) {
                return { success: false, message: "Operation not found" };
            }

            // Check if used in work orders
            const usedInWO = await db.getResults(
                `SELECT wo_id FROM work_orders WHERE operation_id = ? AND is_deleted = FALSE LIMIT 1`,
                [operationId]
            );
            if (usedInWO && usedInWO.length > 0) {
                return { success: false, message: "Cannot delete Operation: it is linked to active Work Orders." };
            }

            await db.getResults(
                `UPDATE operations SET is_deleted = TRUE, updated_by = ? WHERE operation_id = ?`,
                [updatedBy || null, operationId]
            );

            winston.info("Operation deleted successfully", {
                source: "operation.model.js", function: "deleteOperation", operationId,
            });

            return { success: true, message: "Operation deleted successfully" };
        } catch (error) {
            winston.error(`Error deleting Operation: ${error.message}`, {
                source: "operation.model.js", function: "deleteOperation",
                error: error.message, stack: error.stack, operationId,
            });
            return { success: false, message: "Failed to delete Operation", error: error.message };
        }
    },
};

module.exports = operationModel;
