const db = require("../../../config/db");
const moment = require("moment");
const winston = require("../../../config/winston");
const { retryTransaction } = require("../../../utils/dbRetry");

module.exports = {
    /**
     * Check if company already has the addon active
     */
    checkCompanyAddonExists: async (companyid, addonid) => {
        try {
            const sql = `
                SELECT companyaddonid
                FROM companyaddonsmaster
                WHERE companyid = ? AND addonid = ? AND isactive = 1
                AND (enddate IS NULL OR enddate >= CURDATE())
            `;
            const res = await db.getResults(sql, [companyid, addonid]);
            return res && res.length > 0;
        } catch (error) {
            winston.error(`Error checking company addon existence: ${error.message}`, {
                source: "companyaddon.model.js",
                function: "checkCompanyAddonExists",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                companyid: companyid,
                addonid: addonid
            });
            return false;
        }
    },

    /**
     * Add addon to company
     */
    addAddonToCompany: async (data) => {
        try {
            return await retryTransaction(
                async (connection) => {
                    const { companyid, addonid, planid, customPrice, duration } = data;

            // Get addon details
            const [addonDetails] = await connection.query(
                'SELECT price, duration as default_duration FROM addons WHERE addonid = ? AND isactive = 1',
                [addonid]
            );

            if (!addonDetails || addonDetails.length === 0) {
                throw new Error('Addon not found or inactive');
            }

            // Get current company plan
            const [companyPlan] = await connection.query(
                'SELECT planid FROM companyplandetails WHERE companyid = ? AND expirydate >= CURDATE() ORDER BY companyplanid DESC LIMIT 1',
                [companyid]
            );

            const addon = addonDetails[0];
            const startDate = moment().format('YYYY-MM-DD');
            const addonDuration = duration || addon.default_duration || 30; // Default 30 days if no duration
            const endDate = moment().add(addonDuration, 'days').format('YYYY-MM-DD');
            const finalPrice = customPrice !== undefined ? customPrice : addon.price;
            const finalPlanId = planid || (companyPlan && companyPlan.length > 0 ? companyPlan[0].planid : null);

            // Insert company addon
            const sql = `
                INSERT INTO companyaddonsmaster (
                    companyid, addonid, planid, price, startdate, enddate, isactive
                ) VALUES (?, ?, ?, ?, ?, ?, 1)
            `;

            const params = [
                companyid,
                addonid,
                finalPlanId,
                finalPrice,
                startDate,
                endDate
            ];

            const [result] = await connection.query(sql, params);

            winston.info(`Addon ${addonid} added to company ${companyid} with ID: ${result.insertId}`, {
                source: "companyaddon.model.js",
                function: "addAddonToCompany"
            });

            return {
                companyaddonid: result.insertId,
                companyid,
                addonid,
                planid: finalPlanId,
                price: finalPrice,
                startdate: startDate,
                enddate: endDate,
                duration: addonDuration
            };
                },
                {
                    maxRetries: 3,
                    operationName: `Add addon to company (companyid: ${data.companyid}, addonid: ${data.addonid})`,
                }
            );
        } catch (error) {
            winston.error(`Error adding addon to company: ${error.message}`, {
                source: "companyaddon.model.js",
                function: "addAddonToCompany",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                companyid: data.companyid,
                addonid: data.addonid
            });
            throw error;
        }
    },

    /**
     * Get company addons with pagination
     */
    getCompanyAddons: async (req) => {
        const { start = 0, length = 10, filters, sortField = 'companyaddonid', sortOrder = 'desc' } = req.query;
        const { companyid } = req.params;

        let sql = `
            SELECT ca.companyaddonid, ca.companyid, ca.addonid, ca.planid,
                   ca.price, ca.startdate, ca.enddate, ca.isactive,
                   ca.created_at, ca.updated_at,
                   a.addonname, a.description as addon_description,
                   pm.planname,
                   c.companyname,
                   CASE
                       WHEN ca.enddate < CURDATE() THEN 'Expired'
                       WHEN ca.enddate >= CURDATE() AND ca.isactive = 1 THEN 'Active'
                       ELSE 'Inactive'
                   END as status,
                   DATEDIFF(ca.enddate, CURDATE()) as days_remaining
            FROM companyaddonsmaster ca
            JOIN addons a ON ca.addonid = a.addonid
            LEFT JOIN plan_master pm ON ca.planid = pm.planid
            LEFT JOIN companymaster c ON ca.companyid = c.companyid
            WHERE ca.companyid = ?
        `;

        const params = [companyid];

        let parsedFilters = {};
        if (filters) {
            try {
                parsedFilters = JSON.parse(filters);
            } catch (err) {
                winston.warn("Invalid filters JSON received", {
                    source: "companyaddon.model.js",
                    function: "getCompanyAddons"
                });
            }
        }

        const getFilterValue = (field) => {
            const val = parsedFilters[field];
            return typeof val === "object" ? val.value : val;
        };

        // Apply filters
        const isactive = getFilterValue("isactive");
        if (isactive !== undefined && isactive !== '') {
            sql += ` AND ca.isactive = ?`;
            params.push(isactive);
        }

        const status = getFilterValue("status");
        if (status) {
            if (status === 'Active') {
                sql += ` AND ca.enddate >= CURDATE() AND ca.isactive = 1`;
            } else if (status === 'Expired') {
                sql += ` AND ca.enddate < CURDATE()`;
            } else if (status === 'Inactive') {
                sql += ` AND ca.isactive = 0`;
            }
        }

        const addonname = getFilterValue("addonname");
        if (addonname) {
            sql += ` AND a.addonname LIKE ?`;
            params.push(`%${addonname}%`);
        }

        const global = getFilterValue("global");
        if (global) {
            sql += ` AND (a.addonname LIKE ? OR a.description LIKE ?)`;
            params.push(`%${global}%`, `%${global}%`);
        }

        // Sorting
        const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        sql += ` ORDER BY ca.${sortField} ${order}`;

        // Pagination
        const startNum = parseInt(start);
        const lengthNum = parseInt(length);

        if (lengthNum !== -1) {
            sql += ` LIMIT ?, ?`;
            params.push(startNum, lengthNum);
        }

        const data = await db.getResults(sql, params);

        // Count query
        let countSql = `
            SELECT COUNT(*) as total
            FROM companyaddonsmaster ca
            JOIN addons a ON ca.addonid = a.addonid
            WHERE ca.companyid = ?
        `;
        let countParams = [companyid];

        // Apply same filters for count
        if (isactive !== undefined && isactive !== '') {
            countSql += ` AND ca.isactive = ?`;
            countParams.push(isactive);
        }

        if (status) {
            if (status === 'Active') {
                countSql += ` AND ca.enddate >= CURDATE() AND ca.isactive = 1`;
            } else if (status === 'Expired') {
                countSql += ` AND ca.enddate < CURDATE()`;
            } else if (status === 'Inactive') {
                countSql += ` AND ca.isactive = 0`;
            }
        }

        if (addonname) {
            countSql += ` AND a.addonname LIKE ?`;
            countParams.push(`%${addonname}%`);
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
     * Get all company addons (for admin view)
     */
    getAllCompanyAddons: async (req) => {
        const { start = 0, length = 10, filters, sortField = 'companyaddonid', sortOrder = 'desc' } = req.query;

        let sql = `
            SELECT ca.companyaddonid, ca.companyid, ca.addonid, ca.planid,
                   ca.price, ca.startdate, ca.enddate, ca.isactive,
                   ca.created_at, ca.updated_at,
                   a.addonname, a.description as addon_description,
                   pm.planname,
                   c.companyname, c.companyemailid,
                   CASE
                       WHEN ca.enddate < CURDATE() THEN 'Expired'
                       WHEN ca.enddate >= CURDATE() AND ca.isactive = 1 THEN 'Active'
                       ELSE 'Inactive'
                   END as status,
                   DATEDIFF(ca.enddate, CURDATE()) as days_remaining
            FROM companyaddonsmaster ca
            JOIN addons a ON ca.addonid = a.addonid
            LEFT JOIN plan_master pm ON ca.planid = pm.planid
            LEFT JOIN companymaster c ON ca.companyid = c.companyid
            WHERE 1 = 1
        `;

        const params = [];

        let parsedFilters = {};
        if (filters) {
            try {
                parsedFilters = JSON.parse(filters);
            } catch (err) {
                winston.warn("Invalid filters JSON received", {
                    source: "companyaddon.model.js",
                    function: "getCompanyAddons"
                });
            }
        }

        const getFilterValue = (field) => {
            const val = parsedFilters[field];
            return typeof val === "object" ? val.value : val;
        };

        // Apply filters
        const companyname = getFilterValue("companyname");
        if (companyname) {
            sql += ` AND c.companyname LIKE ?`;
            params.push(`%${companyname}%`);
        }

        const addonname = getFilterValue("addonname");
        if (addonname) {
            sql += ` AND a.addonname LIKE ?`;
            params.push(`%${addonname}%`);
        }

        const isactive = getFilterValue("isactive");
        if (isactive !== undefined && isactive !== '') {
            sql += ` AND ca.isactive = ?`;
            params.push(isactive);
        }

        const status = getFilterValue("status");
        if (status) {
            if (status === 'Active') {
                sql += ` AND ca.enddate >= CURDATE() AND ca.isactive = 1`;
            } else if (status === 'Expired') {
                sql += ` AND ca.enddate < CURDATE()`;
            } else if (status === 'Inactive') {
                sql += ` AND ca.isactive = 0`;
            }
        }

        const global = getFilterValue("global");
        if (global) {
            sql += ` AND (a.addonname LIKE ? OR c.companyname LIKE ? OR c.companyemailid LIKE ?)`;
            params.push(`%${global}%`, `%${global}%`, `%${global}%`);
        }

        // Sorting
        const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        sql += ` ORDER BY ca.${sortField} ${order}`;

        // Pagination
        const startNum = parseInt(start);
        const lengthNum = parseInt(length);

        if (lengthNum !== -1) {
            sql += ` LIMIT ?, ?`;
            params.push(startNum, lengthNum);
        }

        const data = await db.getResults(sql, params);

        // Count query
        let countSql = `
            SELECT COUNT(*) as total
            FROM companyaddonsmaster ca
            JOIN addons a ON ca.addonid = a.addonid
            LEFT JOIN companymaster c ON ca.companyid = c.companyid
            WHERE 1 = 1
        `;
        let countParams = [];

        // Apply same filters for count
        if (companyname) {
            countSql += ` AND c.companyname LIKE ?`;
            countParams.push(`%${companyname}%`);
        }

        if (addonname) {
            countSql += ` AND a.addonname LIKE ?`;
            countParams.push(`%${addonname}%`);
        }

        if (isactive !== undefined && isactive !== '') {
            countSql += ` AND ca.isactive = ?`;
            countParams.push(isactive);
        }

        if (status) {
            if (status === 'Active') {
                countSql += ` AND ca.enddate >= CURDATE() AND ca.isactive = 1`;
            } else if (status === 'Expired') {
                countSql += ` AND ca.enddate < CURDATE()`;
            } else if (status === 'Inactive') {
                countSql += ` AND ca.isactive = 0`;
            }
        }

        if (global) {
            countSql += ` AND (a.addonname LIKE ? OR c.companyname LIKE ? OR c.companyemailid LIKE ?)`;
            countParams.push(`%${global}%`, `%${global}%`, `%${global}%`);
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
     * Update company addon
     */
    updateCompanyAddon: async (companyaddonid, data) => {
        const updates = [];
        const params = [];

        if (data.price !== undefined) {
            updates.push('price = ?');
            params.push(data.price);
        }

        if (data.enddate !== undefined) {
            updates.push('enddate = ?');
            params.push(data.enddate);
        }

        if (data.isactive !== undefined) {
            updates.push('isactive = ?');
            params.push(data.isactive);
        }

        if (updates.length === 0) {
            return { affectedRows: 0 };
        }

        params.push(companyaddonid);

        const sql = `
            UPDATE companyaddonsmaster
            SET ${updates.join(', ')}
            WHERE companyaddonid = ?
        `;

        const [result] = await db.connection.query(sql, params);
        return { affectedRows: result.affectedRows || 0 };
    },

    /**
     * Renew/extend company addon
     */
    renewCompanyAddon: async (companyaddonid, extensionDays) => {
        const sql = `
            UPDATE companyaddonsmaster
            SET enddate = DATE_ADD(enddate, INTERVAL ? DAY),
                isactive = 1
            WHERE companyaddonid = ?
        `;
        const [result] = await db.connection.query(sql, [extensionDays, companyaddonid]);
        return { affectedRows: result.affectedRows || 0 };
    },

    /**
     * Deactivate company addon
     */
    deactivateCompanyAddon: async (companyaddonid) => {
        const sql = `UPDATE companyaddonsmaster SET isactive = 0 WHERE companyaddonid = ?`;
        const [result] = await db.connection.query(sql, [companyaddonid]);
        return { affectedRows: result.affectedRows || 0 };
    },

    /**
     * Get company addon by ID
     */
    getCompanyAddonById: async (companyaddonid) => {
        const sql = `
            SELECT ca.*, a.addonname, a.description as addon_description,
                   pm.planname, c.companyname
            FROM companyaddonsmaster ca
            JOIN addons a ON ca.addonid = a.addonid
            LEFT JOIN plan_master pm ON ca.planid = pm.planid
            LEFT JOIN companymaster c ON ca.companyid = c.companyid
            WHERE ca.companyaddonid = ?
        `;
        return await db.getResults(sql, [companyaddonid]);
    },

    /**
     * Get available addons for a company (not already active)
     */
    getAvailableAddonsForCompany: async (companyid) => {
        const sql = `
            SELECT a.addonid, a.addonname, a.description, a.price, a.duration,
                   pm.name as particularname
            FROM addons a
            LEFT JOIN particularmaster pm ON a.particularid = pm.particularid
            WHERE a.isactive = 1
            AND a.addonid NOT IN (
                SELECT addonid
                FROM companyaddonsmaster
                WHERE companyid = ? AND isactive = 1 AND (enddate IS NULL OR enddate >= CURDATE())
            )
            ORDER BY a.addonname
        `;
        return await db.getResults(sql, [companyid]);
    },

    /**
     * Get expiring company addons
     */
    getExpiringCompanyAddons: async (days = 7) => {
        const sql = `
            SELECT ca.companyaddonid, ca.companyid, ca.addonid,
                   ca.enddate, ca.price,
                   a.addonname,
                   c.companyname, c.companyemailid, c.companycontactnumber,
                   DATEDIFF(ca.enddate, CURDATE()) as days_remaining
            FROM companyaddonsmaster ca
            JOIN addons a ON ca.addonid = a.addonid
            JOIN companymaster c ON ca.companyid = c.companyid
            WHERE ca.isactive = 1
            AND ca.enddate >= CURDATE()
            AND DATEDIFF(ca.enddate, CURDATE()) <= ?
            ORDER BY ca.enddate ASC
        `;
        return await db.getResults(sql, [days]);
    }
};