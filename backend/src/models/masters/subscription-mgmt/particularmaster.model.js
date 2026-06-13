const db = require("../../../config/db");
const moment = require("moment");
const winston = require("../../../config/winston");

module.exports = {
    /**
     * Check if particular exists by name
     */
    checkParticularExists: async (name, excludeId = null) => {
        try {
            let sql = `SELECT particularid FROM particularmaster WHERE LOWER(name) = LOWER(?) AND isactive = 1`;
            const params = [name];

            if (excludeId) {
                sql += ` AND particularid != ?`;
                params.push(excludeId);
            }

            const res = await db.getResults(sql, params);
            return res && res.length > 0;
        } catch (error) {
            return false;
        }
    },

    /**
     * Get particulars with pagination and filtering
     */
    getParticulars: async (req) => {
        const { start = 0, length = 10, filters, sortField = 'particularid', sortOrder = 'desc' } = req.query;

        let sql = `
            SELECT particularid, name, isactive, created_at, updated_at
            FROM particularmaster
            WHERE 1 = 1
        `;

        const params = [];

        let parsedFilters = {};
        if (filters) {
            try {
                parsedFilters = JSON.parse(filters);
            } catch (err) {
                winston.warn("Invalid filters JSON received", {
                    source: "particularmaster.model.js",
                    function: "getParticulars"
                });
            }
        }

        const getFilterValue = (field) => {
            const val = parsedFilters[field];
            return typeof val === "object" ? val.value : val;
        };

        // Apply filters
        const name = getFilterValue("name");
        if (name) {
            sql += ` AND name LIKE ?`;
            params.push(`%${name}%`);
        }

        const isactive = getFilterValue("isactive");
        if (isactive !== undefined && isactive !== '') {
            sql += ` AND isactive = ?`;
            params.push(isactive);
        }

        const global = getFilterValue("global");
        if (global) {
            sql += ` AND name LIKE ?`;
            params.push(`%${global}%`);
        }

        // Sorting
        const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        sql += ` ORDER BY ${sortField} ${order}`;

        // Pagination using start and length
        const startNum = parseInt(start);
        const lengthNum = parseInt(length);

        if (lengthNum !== -1) {
            sql += ` LIMIT ?, ?`;
            params.push(startNum, lengthNum);
        }

        const data = await db.getResults(sql, params);

        // Count total records
        let countSql = `SELECT COUNT(*) as total FROM particularmaster WHERE 1 = 1`;
        let countParams = [];

        // Apply same filters for count
        if (name) {
            countSql += ` AND name LIKE ?`;
            countParams.push(`%${name}%`);
        }

        if (isactive !== undefined && isactive !== '') {
            countSql += ` AND isactive = ?`;
            countParams.push(isactive);
        }

        if (global) {
            countSql += ` AND name LIKE ?`;
            countParams.push(`%${global}%`);
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
     * Get particular by ID
     */
    getData: async (particularid) => {
        const sql = `
            SELECT particularid, name, isactive, created_at, updated_at
            FROM particularmaster
            WHERE particularid = ?
        `;
        return await db.getResults(sql, [particularid]);
    },

    /**
     * Create new particular
     */
    create: async (data) => {
        const insertData = {
            name: data.name,
            isactive: data.isactive ?? 1
        };
        return await db.insert('particularmaster', insertData);
    },

    /**
     * Update particular
     */
    update: async (particularid, data) => {
        const updateData = {};

        if (data.name !== undefined) {
            updateData.name = data.name;
        }

        if (data.isactive !== undefined) {
            updateData.isactive = data.isactive;
        }

        if (Object.keys(updateData).length === 0) {
            return { affectedRows: 0 };
        }

        const updates = Object.keys(updateData).map(key => `${key} = ?`);
        const values = Object.values(updateData);
        const sql = `UPDATE particularmaster SET ${updates.join(', ')} WHERE particularid = ?`;
        const [result] = await db.connection.query(sql, [...values, particularid]);
        return { affectedRows: result.affectedRows || 0 };
    },

    /**
     * Delete particular (soft delete by setting isactive = 0)
     */
    delete: async (particularid) => {
        const sql = `UPDATE particularmaster SET isactive = 0 WHERE particularid = ?`;
        const [result] = await db.connection.query(sql, [particularid]);
        return { affectedRows: result.affectedRows || 0 };
    },

    /**
     * Get active particulars for dropdown
     */
    getActiveParticulars: async () => {
        const sql = `
            SELECT particularid, name
            FROM particularmaster
            WHERE isactive = 1
            ORDER BY name ASC
        `;
        return await db.getResults(sql, []);
    }
};