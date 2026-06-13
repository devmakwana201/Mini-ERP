const db = require("../../../config/db");
const moment = require("moment");
const winston = require("../../../config/winston");
const { retryTransaction } = require("../../../utils/dbRetry");

module.exports = {
    /**
     * Check if addon exists by name
     */
    checkAddonExists: async (addonname, excludeId = null) => {
        try {
            let sql = `SELECT addonid FROM addons WHERE LOWER(addonname) = LOWER(?) AND isactive = 1`;
            const params = [addonname];

            if (excludeId) {
                sql += ` AND addonid != ?`;
                params.push(excludeId);
            }

            const res = await db.getResults(sql, params);
            return res && res.length > 0;
        } catch (error) {
            return false;
        }
    },

    /**
     * Get addons with pagination and filtering
     */
    getAddons: async (req) => {
        const { start = 0, length = 10, filters, sortField = 'addonid', sortOrder = 'desc' } = req.query;

        let sql = `
            SELECT a.addonid, a.addonname, a.description, a.limitation,
                   a.isactive, a.duration, a.particularid, a.price,
                   a.created_at, a.updated_at,
                   pm.name as particularname
            FROM addons a
            LEFT JOIN particularmaster pm ON a.particularid = pm.particularid
            WHERE 1 = 1
        `;

        const params = [];

        let parsedFilters = {};
        if (filters) {
            try {
                parsedFilters = JSON.parse(filters);
            } catch (err) {
                winston.warn("Invalid filters JSON received", {
                    source: "addons.model.js",
                    function: "getAddons",
                    error: err.message
                });
            }
        }

        const getFilterValue = (field) => {
            const val = parsedFilters[field];
            return typeof val === "object" ? val.value : val;
        };

        // Apply filters
        const addonname = getFilterValue("addonname");
        if (addonname) {
            sql += ` AND a.addonname LIKE ?`;
            params.push(`%${addonname}%`);
        }

        const isactive = getFilterValue("isactive");
        if (isactive !== undefined && isactive !== '') {
            sql += ` AND a.isactive = ?`;
            params.push(isactive);
        }

        const particularid = getFilterValue("particularid");
        if (particularid) {
            sql += ` AND a.particularid = ?`;
            params.push(particularid);
        }

        const minPrice = getFilterValue("minPrice");
        if (minPrice !== undefined && minPrice !== '') {
            sql += ` AND a.price >= ?`;
            params.push(minPrice);
        }

        const maxPrice = getFilterValue("maxPrice");
        if (maxPrice !== undefined && maxPrice !== '') {
            sql += ` AND a.price <= ?`;
            params.push(maxPrice);
        }

        const global = getFilterValue("global");
        if (global) {
            sql += ` AND (a.addonname LIKE ? OR a.description LIKE ?)`;
            params.push(`%${global}%`, `%${global}%`);
        }

        // Sorting
        const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        sql += ` ORDER BY a.${sortField} ${order}`;

        // Pagination using start and length
        const startNum = parseInt(start);
        const lengthNum = parseInt(length);

        if (lengthNum !== -1) {
            sql += ` LIMIT ?, ?`;
            params.push(startNum, lengthNum);
        }

        const data = await db.getResults(sql, params);

        // Count total records
        let countSql = `SELECT COUNT(*) as total FROM addons a WHERE 1 = 1`;
        let countParams = [];

        // Apply same filters for count
        if (addonname) {
            countSql += ` AND a.addonname LIKE ?`;
            countParams.push(`%${addonname}%`);
        }

        if (isactive !== undefined && isactive !== '') {
            countSql += ` AND a.isactive = ?`;
            countParams.push(isactive);
        }

        if (particularid) {
            countSql += ` AND a.particularid = ?`;
            countParams.push(particularid);
        }

        if (minPrice !== undefined && minPrice !== '') {
            countSql += ` AND a.price >= ?`;
            countParams.push(minPrice);
        }

        if (maxPrice !== undefined && maxPrice !== '') {
            countSql += ` AND a.price <= ?`;
            countParams.push(maxPrice);
        }

        if (global) {
            countSql += ` AND (a.addonname LIKE ? OR a.description LIKE ?)`;
            countParams.push(`%${global}%`, `%${global}%`);
        }

        const totalResult = await db.getResults(countSql, countParams);
        const total = totalResult[0].total;

        if (lengthNum === -1) {
            return data;
        }

        return {
            data,
            pagination: {
                start: startNum,
                length: lengthNum,
                total
            }
        };
    },

    /**
     * Get addon by ID
     */
    getData: async (addonid) => {
        const sql = `
            SELECT a.addonid, a.addonname, a.description, a.limitation,
                   a.isactive, a.duration, a.particularid, a.price,
                   a.created_at, a.updated_at,
                   pm.name as particularname
            FROM addons a
            LEFT JOIN particularmaster pm ON a.particularid = pm.particularid
            WHERE a.addonid = ?
        `;
        return await db.getResults(sql, [addonid]);
    },

    /**
     * Create new addon
     */
    create: async (data) => {
        const insertData = {
            addonname: data.addonname,
            description: data.description || null,
            limitation: data.limitation || null,
            isactive: data.isactive ?? 1,
            duration: data.duration || null,
            particularid: data.particularid || null,
            price: data.price
        };
        return await db.insert('addons', insertData);
    },

    /**
     * Update addon
     */
    update: async (addonid, data) => {
        const updateData = {};

        if (data.addonname !== undefined) {
            updateData.addonname = data.addonname;
        }

        if (data.description !== undefined) {
            updateData.description = data.description;
        }

        if (data.limitation !== undefined) {
            updateData.limitation = data.limitation;
        }

        if (data.isactive !== undefined) {
            updateData.isactive = data.isactive;
        }

        if (data.duration !== undefined) {
            updateData.duration = data.duration;
        }

        if (data.particularid !== undefined) {
            updateData.particularid = data.particularid;
        }

        if (data.price !== undefined) {
            updateData.price = data.price;
        }

        if (Object.keys(updateData).length === 0) {
            return { affectedRows: 0 };
        }

        const updates = Object.keys(updateData).map(key => `${key} = ?`);
        const values = Object.values(updateData);
        const sql = `UPDATE addons SET ${updates.join(', ')} WHERE addonid = ?`;
        const [result] = await db.connection.query(sql, [...values, addonid]);
        return { affectedRows: result.affectedRows || 0 };
    },

    /**
     * Delete addon (soft delete)
     */
    delete: async (addonid) => {
        const sql = `UPDATE addons SET isactive = 0 WHERE addonid = ?`;
        const [result] = await db.connection.query(sql, [addonid]);
        return { affectedRows: result.affectedRows || 0 };
    },

    /**
     * Get active addons for dropdown
     */
    getActiveAddons: async () => {
        const sql = `
            SELECT a.addonid, a.addonname, a.price, a.duration,
                   pm.name as particularname
            FROM addons a
            LEFT JOIN particularmaster pm ON a.particularid = pm.particularid
            WHERE a.isactive = 1
            ORDER BY a.addonname ASC
        `;
        return await db.getResults(sql, []);
    },

    /**
     * Get addons by particular
     */
    getAddonsByParticular: async (particularid) => {
        const sql = `
            SELECT a.addonid, a.addonname, a.description, a.limitation,
                   a.price, a.duration, pm.name as particularname
            FROM addons a
            LEFT JOIN particularmaster pm ON a.particularid = pm.particularid
            WHERE a.particularid = ? AND a.isactive = 1
            ORDER BY a.addonname ASC
        `;
        return await db.getResults(sql, [particularid]);
    },

    /**
     * Get addons grouped by particular (for UI display)
     */
    getAddonsGroupedByParticular: async () => {
        const sql = `
            SELECT
                pm.particularid,
                pm.name as particularname,
                JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'addonid', a.addonid,
                        'addonname', a.addonname,
                        'description', a.description,
                        'limitation', a.limitation,
                        'price', a.price,
                        'duration', a.duration
                    )
                ) as addons
            FROM particularmaster pm
            LEFT JOIN addons a ON pm.particularid = a.particularid AND a.isactive = 1
            WHERE pm.isactive = 1
            GROUP BY pm.particularid, pm.name
            ORDER BY pm.name
        `;

        try {
            const results = await db.getResults(sql, []);
            // Parse the JSON string returned by JSON_ARRAYAGG
            return results.map(row => ({
                particularid: row.particularid,
                particularname: row.particularname,
                addons: JSON.parse(row.addons || '[]').filter(addon => addon.addonid !== null)
            }));
        } catch (error) {
            winston.error(`Error getting grouped addons: ${error.message}`, {
                source: "addons.model.js",
                function: "getAddonsGroupedByParticular",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            // Fallback for older MySQL versions without JSON_ARRAYAGG
            return await this.getAddonsGroupedByParticularFallback();
        }
    },

    /**
     * Fallback method for older MySQL versions
     */
    getAddonsGroupedByParticularFallback: async () => {
        const sql = `
            SELECT
                pm.particularid,
                pm.name as particularname,
                a.addonid,
                a.addonname,
                a.description,
                a.limitation,
                a.price,
                a.duration
            FROM particularmaster pm
            LEFT JOIN addons a ON pm.particularid = a.particularid AND a.isactive = 1
            WHERE pm.isactive = 1
            ORDER BY pm.name, a.addonname
        `;

        const results = await db.getResults(sql, []);

        // Group results manually
        const grouped = {};
        results.forEach(row => {
            if (!grouped[row.particularid]) {
                grouped[row.particularid] = {
                    particularid: row.particularid,
                    particularname: row.particularname,
                    addons: []
                };
            }

            if (row.addonid) {
                grouped[row.particularid].addons.push({
                    addonid: row.addonid,
                    addonname: row.addonname,
                    description: row.description,
                    limitation: row.limitation,
                    price: row.price,
                    duration: row.duration
                });
            }
        });

        return Object.values(grouped);
    },

    /**
     * Bulk update addon prices (useful for price adjustments)
     */
    bulkUpdatePrices: async (updates) => {
        try {
            return await retryTransaction(
                async (connection) => {
                    for (const update of updates) {
                        const sql = `UPDATE addons SET price = ? WHERE addonid = ?`;
                        await connection.query(sql, [update.price, update.addonid]);
                    }

                    return { success: true, updated: updates.length };
                },
                {
                    maxRetries: 3,
                    operationName: `Addon bulk price update (${updates.length} items)`,
                }
            );
        } catch (error) {
            winston.error(`Error bulk updating addon prices: ${error.message}`, {
                source: "addons.model.js",
                function: "bulkUpdatePrices",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                updatesCount: updates.length
            });
            throw error;
        }
    },

    /**
     * Duplicate an addon
     */
    duplicateAddon: async (addonid, newAddonName) => {
        // First get the original addon
        const sql = `SELECT * FROM addons WHERE addonid = ?`;
        const originalAddons = await db.getResults(sql, [addonid]);

        if (!originalAddons || originalAddons.length === 0) {
            throw new Error('Original addon not found');
        }

        const original = originalAddons[0];

        // Create new addon with duplicated data
        const insertData = {
            addonname: newAddonName,
            description: original.description,
            limitation: original.limitation,
            isactive: 1, // Set as active by default
            duration: original.duration,
            particularid: original.particularid,
            price: original.price
        };

        return await db.insert('addons', insertData);
    }
};