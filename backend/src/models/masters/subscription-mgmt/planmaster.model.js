const db = require("../../../config/db");
const moment = require("moment");
const winston = require("../../../config/winston");
const { retryTransaction } = require("../../../utils/dbRetry");

module.exports = {
    /**
     * Check if plan exists by name
     */
    checkPlanExists: async (planname, excludeId = null) => {
        try {
            let sql = `SELECT planid FROM plan_master WHERE LOWER(planname) = LOWER(?) AND isactive = 1`;
            const params = [planname];

            if (excludeId) {
                sql += ` AND planid != ?`;
                params.push(excludeId);
            }

            const res = await db.getResults(sql, params);
            return res && res.length > 0;
        } catch (error) {
            return false;
        }
    },

    /**
     * Get plans with pagination and filtering
     */
    getPlans: async (req) => {
        const { start = 0, length = 10, filters, sortField = 'planid', sortOrder = 'desc' } = req.query;

        let sql = `
            SELECT p.planid, p.planname, p.duration, p.description, p.price, p.isactive,
                   p.startdate, p.enddate, p.amc_charges, p.frequency, p.is_trial,
                   p.created_at, p.updated_at
            FROM plan_master p
            WHERE 1 = 1
        `;

        const params = [];

        let parsedFilters = {};
        if (filters) {
            try {
                parsedFilters = JSON.parse(filters);
            } catch (err) {
                winston.warn("Invalid filters JSON received", {
                    source: "planmaster.model.js",
                    function: "getPlans"
                });
            }
        }

        const getFilterValue = (field) => {
            const val = parsedFilters[field];
            return typeof val === "object" ? val.value : val;
        };

        // Apply filters
        const planname = getFilterValue("planname");
        if (planname) {
            sql += ` AND p.planname LIKE ?`;
            params.push(`%${planname}%`);
        }

        const isactive = getFilterValue("isactive");
        if (isactive !== undefined && isactive !== '') {
            sql += ` AND p.isactive = ?`;
            params.push(isactive);
        }

        const is_trial = getFilterValue("is_trial");
        if (is_trial !== undefined && is_trial !== '') {
            sql += ` AND p.is_trial = ?`;
            params.push(is_trial);
        }

        const frequency = getFilterValue("frequency");
        if (frequency) {
            sql += ` AND p.frequency = ?`;
            params.push(frequency);
        }

        const global = getFilterValue("global");
        if (global) {
            sql += ` AND (p.planname LIKE ? OR p.description LIKE ?)`;
            params.push(`%${global}%`, `%${global}%`);
        }

        // Sorting
        const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        sql += ` ORDER BY p.${sortField} ${order}`;

        // Pagination using start and length
        const startNum = parseInt(start);
        const lengthNum = parseInt(length);

        if (lengthNum !== -1) {
            sql += ` LIMIT ?, ?`;
            params.push(startNum, lengthNum);
        }

        const data = await db.getResults(sql, params);

        // Fetch plan details for each plan
        for (let plan of data) {
            const detailsSql = `
                SELECT pd.particularid, pd.limitation, pd.description, pm.name as particularname
                FROM plan_details pd
                LEFT JOIN particularmaster pm ON pd.particularid = pm.particularid
                WHERE pd.planid = ?
            `;
            const details = await db.getResults(detailsSql, [plan.planid]);
            plan.details = details || [];
        }

        // Count total records
        let countSql = `SELECT COUNT(*) as total FROM plan_master p WHERE 1 = 1`;
        let countParams = [];

        // Apply same filters for count
        if (planname) {
            countSql += ` AND p.planname LIKE ?`;
            countParams.push(`%${planname}%`);
        }

        if (isactive !== undefined && isactive !== '') {
            countSql += ` AND p.isactive = ?`;
            countParams.push(isactive);
        }

        if (is_trial !== undefined && is_trial !== '') {
            countSql += ` AND p.is_trial = ?`;
            countParams.push(is_trial);
        }

        if (frequency) {
            countSql += ` AND p.frequency = ?`;
            countParams.push(frequency);
        }

        if (global) {
            countSql += ` AND (p.planname LIKE ? OR p.description LIKE ?)`;
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
     * Get plan by ID with details
     */
    getData: async (planid, includeDetails = true) => {
        const sql = `
            SELECT planid, planname, duration, description, price, isactive,
                   startdate, enddate, amc_charges, frequency, is_trial,
                   created_at, updated_at
            FROM plan_master
            WHERE planid = ?
        `;
        const plan = await db.getResults(sql, [planid]);

        if (plan && plan.length > 0 && includeDetails) {
            // Get plan details with particular names
            const detailsSql = `
                SELECT pd.plandetailid, pd.planid, pd.particularid,
                       pd.limitation, pd.description, pd.created_at, pd.updated_at,
                       pm.name as particularname
                FROM plan_details pd
                LEFT JOIN particularmaster pm ON pd.particularid = pm.particularid
                WHERE pd.planid = ?
                ORDER BY pm.name
            `;
            const details = await db.getResults(detailsSql, [planid]);
            plan[0].details = details || [];
        }

        return plan;
    },

    /**
     * Create new plan with details (single transaction)
     */
    create: async (data) => {
        try {
            await db.beginTransaction();

            // Insert plan master using simple db.insert
            const planData = {
                planname: data.planname,
                duration: data.duration,
                description: data.description || null,
                price: data.price,
                isactive: data.isactive ?? 1,
                startdate: data.startdate || null,
                enddate: data.enddate || null,
                amc_charges: data.amc_charges || 0,
                frequency: data.frequency,
                is_trial: data.is_trial || 0
            };

            const planResult = await db.insert('plan_master', planData);
            const planid = planResult.insertId;

            // Insert plan details if provided
            if (data.details && data.details.length > 0) {
                for (const detail of data.details) {
                    const detailData = {
                        planid: planid,
                        particularid: detail.particularid,
                        limitation: detail.limitation || null,
                        description: detail.description || null
                    };
                    await db.insert('plan_details', detailData);
                }
            }

            await db.commit();
            return { insertId: planid };

        } catch (error) {
            await db.rollback();
            winston.error(`Error creating plan: ${error.message}`, {
                source: "planmaster.model.js",
                function: "createPlan",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            throw error;
        }
    },

    /**
     * Update plan with details (single transaction with replace strategy)
     */
    update: async (planid, data) => {
        try {
            await db.beginTransaction();

            // Update plan master using simple db.update pattern
            const updateData = {};
            if (data.planname !== undefined) updateData.planname = data.planname;
            if (data.duration !== undefined) updateData.duration = data.duration;
            if (data.description !== undefined) updateData.description = data.description;
            if (data.price !== undefined) updateData.price = data.price;
            if (data.isactive !== undefined) updateData.isactive = data.isactive;
            if (data.startdate !== undefined) updateData.startdate = data.startdate;
            if (data.enddate !== undefined) updateData.enddate = data.enddate;
            if (data.amc_charges !== undefined) updateData.amc_charges = data.amc_charges;
            if (data.frequency !== undefined) updateData.frequency = data.frequency;
            if (data.is_trial !== undefined) updateData.is_trial = data.is_trial;

            if (Object.keys(updateData).length > 0) {
                const updates = Object.keys(updateData).map(key => `${key} = ?`);
                const values = Object.values(updateData);
                const sql = `UPDATE plan_master SET ${updates.join(', ')} WHERE planid = ?`;
                await db.connection.query(sql, [...values, planid]);
            }

            // Update plan details using replace strategy
            if (data.details !== undefined) {
                // Step 1: Delete all existing details using simple SQL
                await db.connection.query('DELETE FROM plan_details WHERE planid = ?', [planid]);

                // Step 2: Insert new details if provided
                if (data.details && data.details.length > 0) {
                    for (const detail of data.details) {
                        const detailData = {
                            planid: planid,
                            particularid: detail.particularid,
                            limitation: detail.limitation || null,
                            description: detail.description || null
                        };
                        await db.insert('plan_details', detailData);
                    }
                }
            }

            await db.commit();
            return { affectedRows: 1 };

        } catch (error) {
            await db.rollback();
            winston.error(`Error updating plan: ${error.message}`, {
                source: "planmaster.model.js",
                function: "updatePlan",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                planid: id
            });
            throw error;
        }
    },

    /**
     * Delete plan (soft delete)
     */
    delete: async (planid) => {
        const sql = `UPDATE plan_master SET isactive = 0 WHERE planid = ?`;
        const [result] = await db.connection.query(sql, [planid]);
        return { affectedRows: result.affectedRows || 0 };
    },

    /**
     * Get active plans for dropdown
     */
    getActivePlans: async () => {
        const sql = `
            SELECT planid, planname, price, duration, frequency, is_trial, amc_charges
            FROM plan_master
            WHERE isactive = 1
            ORDER BY planname ASC
        `;
        return await db.getResults(sql, []);
    },

    /**
     * Get plan comparison (for showing multiple plans side by side)
     */
    getPlansComparison: async (planIds) => {
        if (!planIds || planIds.length === 0) {
            return [];
        }

        const placeholders = planIds.map(() => '?').join(',');
        const sql = `
            SELECT pm.*,
                   pd.particularid, pd.limitation, pd.description,
                   par.name as particularname
            FROM plan_master pm
            LEFT JOIN plan_details pd ON pm.planid = pd.planid
            LEFT JOIN particularmaster par ON pd.particularid = par.particularid
            WHERE pm.planid IN (${placeholders})
            ORDER BY pm.planid, par.name
        `;

        const results = await db.getResults(sql, planIds);

        // Group by plan
        const plans = {};
        results.forEach(row => {
            if (!plans[row.planid]) {
                plans[row.planid] = {
                    planid: row.planid,
                    planname: row.planname,
                    duration: row.duration,
                    description: row.description,
                    price: row.price,
                    frequency: row.frequency,
                    is_trial: row.is_trial,
                    details: []
                };
            }
            if (row.particularid) {
                plans[row.planid].details.push({
                    particularid: row.particularid,
                    particularname: row.particularname,
                    limitation: row.limitation,
                    description: row.description
                });
            }
        });

        return Object.values(plans);
    },

    /**
     * Duplicate a plan with new name
     */
    duplicatePlan: async (planid, newPlanName) => {
        try {
            return await retryTransaction(
                async (connection) => {

            // Get original plan
            const [originalPlan] = await connection.query(
                'SELECT * FROM plan_master WHERE planid = ?',
                [planid]
            );

            if (!originalPlan || originalPlan.length === 0) {
                throw new Error('Original plan not found');
            }

            // Create new plan with duplicated data
            const planSql = `
                INSERT INTO plan_master (
                    planname, duration, description, price, isactive,
                    startdate, enddate, amc_charges, frequency, is_trial
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const plan = originalPlan[0];
            const planParams = [
                newPlanName,
                plan.duration,
                plan.description,
                plan.price,
                1, // Set as active by default
                plan.startdate,
                plan.enddate,
                plan.amc_charges,
                plan.frequency,
                plan.is_trial
            ];

            const [newPlanResult] = await connection.query(planSql, planParams);
            const newPlanId = newPlanResult.insertId;

            // Duplicate plan details
            const [originalDetails] = await connection.query(
                'SELECT particularid, limitation, description FROM plan_details WHERE planid = ?',
                [planid]
            );

            if (originalDetails && originalDetails.length > 0) {
                const detailValues = originalDetails.map(detail => [
                    newPlanId,
                    detail.particularid,
                    detail.limitation,
                    detail.description
                ]);

                const detailsSql = `
                    INSERT INTO plan_details (planid, particularid, limitation, description)
                    VALUES ?
                `;
                await connection.query(detailsSql, [detailValues]);
            }

            return { insertId: newPlanId };
                },
                {
                    maxRetries: 3,
                    operationName: `Plan duplication (planid: ${planid})`,
                }
            );
        } catch (error) {
            winston.error(`Error duplicating plan: ${error.message}`, {
                source: "planmaster.model.js",
                function: "duplicatePlan",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                planid: planid
            });
            throw error;
        }
    }
};