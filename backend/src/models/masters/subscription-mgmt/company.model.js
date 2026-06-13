const db = require("../../../config/db");
const moment = require("moment");
const winston = require("../../../config/winston");
const { retryTransaction } = require("../../../utils/dbRetry");

// Serial key generation functions (from serial.model.js)
const generateRandomKey = (length, excludeNfs = false) => {
    const characters = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijklmnpqrstuvwxyz';
    let randomKey = '';

    for (let i = 0; i < length; i++) {
        randomKey += characters[Math.floor(Math.random() * characters.length)];
    }

    if (excludeNfs && randomKey.substring(8, 10) === '3A') {
        return generateRandomKey(length, excludeNfs);
    }

    return randomKey;
};

const generateRandomPassword = () => {
    const capitalLetters = 'ABCDEFGHIJKLMNPQRSTUVWXYZ';
    const smallLetters = 'abcdefghijklmnpqrstuvwxyz';
    const numbers = '123456789';
    const specialChars = '&@$*!';

    const allChars = capitalLetters + smallLetters + numbers + specialChars;

    let password = '';
    password += capitalLetters[Math.floor(Math.random() * capitalLetters.length)];
    password += smallLetters[Math.floor(Math.random() * smallLetters.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += specialChars[Math.floor(Math.random() * specialChars.length)];

    for (let i = 0; i < 5; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    const passwordArray = password.split('');
    for (let i = passwordArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
    }

    return passwordArray.join('');
};

const generateSingleProductKey = (isNfs) => {
    const productKey = generateRandomKey(16, true);

    let serialNumber;
    if (isNfs) {
        const serialLength = 8;
        let snumber = generateRandomKey(serialLength, true);
        snumber += '3A';
        serialNumber = snumber.toUpperCase();
    } else {
        serialNumber = generateRandomKey(12, true);
        const keyArr = serialNumber.split('');
        if (keyArr[8] === '3' && keyArr[9] === 'A') {
            return generateSingleProductKey(isNfs); // Regenerate if conflicts
        }
        serialNumber = serialNumber.toUpperCase();
    }

    const randomPassword = generateRandomPassword();

    return [productKey.toUpperCase(), serialNumber, randomPassword];
};

module.exports = {
    /**
     * Check if company exists by email
     */
    checkCompanyExists: async (companyemailid, excludeId = null) => {
        try {
            let sql = `SELECT companyid FROM companymaster WHERE LOWER(companyemailid) = LOWER(?) AND isdeleted = 0`;
            const params = [companyemailid];

            if (excludeId) {
                sql += ` AND companyid != ?`;
                params.push(excludeId);
            }

            const res = await db.getResults(sql, params);
            return res && res.length > 0;
        } catch (error) {
            return false;
        }
    },

    /**
     * Check if company name exists
     */
    checkCompanyNameExists: async (companyname, excludeId = null) => {
        try {
            let sql = `SELECT companyid FROM companymaster WHERE LOWER(companyname) = LOWER(?) AND isdeleted = 0`;
            const params = [companyname];

            if (excludeId) {
                sql += ` AND companyid != ?`;
                params.push(excludeId);
            }

            const res = await db.getResults(sql, params);
            return res && res.length > 0;
        } catch (error) {
            return false;
        }
    },

    /**
     * Create new company with plan assignment (single transaction)
     */
    createWithPlan: async (companyData, planData) => {
        try {
            return await retryTransaction(
                async (connection) => {

            // Step 1: Insert company
            const companySql = `
                INSERT INTO companymaster (
                    companyname, companyemailid, companycontactnumber,
                    remarks, ipaddress, createdby, createddate,
                    modifieddate, isdeleted
                ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)
            `;

            const companyParams = [
                companyData.companyname,
                companyData.companyemailid,
                companyData.companycontactnumber,
                companyData.remarks || null,
                companyData.ipaddress || null,
                companyData.createdby || 1  // Default to system user
            ];

            const [companyResult] = await connection.query(companySql, companyParams);
            const companyid = companyResult.insertId;

            // Step 2: Get plan details for calculating dates
            const [planDetails] = await connection.query(
                'SELECT duration, price, amc_charges FROM plan_master WHERE planid = ?',
                [planData.planid]
            );

            if (!planDetails || planDetails.length === 0) {
                throw new Error('Invalid plan selected');
            }

            const plan = planDetails[0];
            const startDate = moment().format('YYYY-MM-DD');
            const expiryDate = moment().add(plan.duration, 'days').format('YYYY-MM-DD');

            // Step 3: Insert company plan details
            const planSql = `
                INSERT INTO companyplandetails (
                    companyid, planid, expirydate, autorenewonoff,
                    autorenew_at, planprice, amc_charges, planstartdate,
                    remarks
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const planParams = [
                companyid,
                planData.planid,
                expiryDate,
                planData.autorenewonoff || 0,
                null,
                planData.offeredPrice || plan.price,
                planData.offeredAmcCharges || plan.amc_charges || 0,
                startDate,
                planData.remarks || null
            ];

            await connection.query(planSql, planParams);

            // Step 4: Generate and create serial key for the company
            const serialKey = generateSingleProductKey(false); // Default to non-NFS
            const currentDateTime = moment().format("YYYY-MM-DD HH:mm:ss");
            const itemId = 48931; // Non-NFS item ID

            const serialData = {
                serial_number: serialKey[1],
                product_key: serialKey[0],
                client_mysql_password: serialKey[2],
                is_nfs: 0, // Default to non-NFS for company registration
                free_demo: 0,
                itemid: itemId,
                created_by: companyData.createdby || 1,
                created_at: currentDateTime,
                ip_address: companyData.ipAddress || null,
                is_active: 0,
                payment_pending: 0,
                activation_count: 0,
                max_activation_count: 3,
                is_deleted: 0
            };

            // Check if serial key already exists (unlikely but safe)
            const [existingSerial] = await connection.query(
                'SELECT id FROM serial_masters WHERE product_key = ? AND is_deleted = 0',
                [serialData.product_key]
            );

            let serialId = null;
            if (!existingSerial || existingSerial.length === 0) {
                // Insert serial key
                const serialSql = `
                    INSERT INTO serial_masters (
                        serial_number, product_key, client_mysql_password,
                        is_nfs, free_demo, itemid, created_by, created_at,
                        ip_address, is_active, payment_pending, activation_count,
                        max_activation_count, is_deleted
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                const serialParams = [
                    serialData.serial_number,
                    serialData.product_key,
                    serialData.client_mysql_password,
                    serialData.is_nfs,
                    serialData.free_demo,
                    serialData.itemid,
                    serialData.created_by,
                    serialData.created_at,
                    serialData.ip_address,
                    serialData.is_active,
                    serialData.payment_pending,
                    serialData.activation_count,
                    serialData.max_activation_count,
                    serialData.is_deleted
                ];

                const [serialResult] = await connection.query(serialSql, serialParams);
                serialId = serialResult.insertId;
            }

            // Step 5: Update company master table with serial key mapping
            if (serialId) {
                const updateCompanySql = `UPDATE companymaster SET serialid = ? WHERE companyid = ?`;
                await connection.query(updateCompanySql, [serialId, companyid]);
            }

            winston.info(`Company created with ID: ${companyid}, plan assigned: ${planData.planid}, serial key generated: ${serialData.product_key}`, {
                source: "company.model.js",
                function: "createCompanyWithPlan"
            });

            return {
                companyid: companyid,
                planAssigned: true,
                serialKeyGenerated: serialId ? true : false,
                serialKey: serialId ? {
                    id: serialId,
                    product_key: serialData.product_key,
                    serial_number: serialData.serial_number,
                    client_mysql_password: serialData.client_mysql_password
                } : null
            };
                },
                {
                    maxRetries: 3,
                    operationName: `Company creation with plan (${companyData.companyname})`,
                }
            );
        } catch (error) {
            winston.error(`Error creating company with plan: ${error.message}`, {
                source: "company.model.js",
                function: "createCompanyWithPlan",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            throw error;
        }
    },

    /**
     * Get company by ID
     */
    getData: async (companyid) => {
        const sql = `
            SELECT c.*,
                   cp.planid, cp.expirydate, cp.autorenewonoff,
                   cp.planprice, cp.amc_charges, cp.planstartdate,
                   pm.planname, pm.duration, pm.frequency,
                   sm.serial_number, sm.product_key, sm.is_active as serial_active
            FROM companymaster c
            LEFT JOIN companyplandetails cp ON c.companyid = cp.companyid
                AND cp.expirydate >= CURDATE()
            LEFT JOIN plan_master pm ON cp.planid = pm.planid
            LEFT JOIN serial_masters sm ON c.serialid = sm.id
            WHERE c.companyid = ? AND c.isdeleted = 0
        `;
        return await db.getResults(sql, [companyid]);
    },

    /**
     * Get companies with pagination
     */
    getCompanies: async (req) => {
        const { start = 0, length = 10, filters, sortField = 'companyid', sortOrder = 'desc' } = req.query;

        let sql = `
            SELECT c.companyid, c.companyname, c.companyemailid,
                   c.companycontactnumber, c.remarks,
                   c.createddate, c.isdeleted, c.serialid,
                   cp.planid, cp.expirydate, cp.planstartdate,
                   pm.planname,
                   sm.serial_number, sm.product_key, sm.is_active as serial_active
            FROM companymaster c
            LEFT JOIN companyplandetails cp ON c.companyid = cp.companyid
                AND cp.expirydate >= CURDATE()
            LEFT JOIN plan_master pm ON cp.planid = pm.planid
            LEFT JOIN serial_masters sm ON c.serialid = sm.id
            WHERE c.isdeleted = 0
        `;

        const params = [];

        let parsedFilters = {};
        if (filters) {
            try {
                parsedFilters = JSON.parse(filters);
            } catch (err) {
                winston.warn("Invalid filters JSON received", {
                    source: "company.model.js",
                    function: "getCompanies"
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

        const companyemailid = getFilterValue("companyemailid");
        if (companyemailid) {
            sql += ` AND c.companyemailid LIKE ?`;
            params.push(`%${companyemailid}%`);
        }

        const planid = getFilterValue("planid");
        if (planid) {
            sql += ` AND cp.planid = ?`;
            params.push(planid);
        }

        const global = getFilterValue("global");
        if (global) {
            sql += ` AND (c.companyname LIKE ? OR c.companyemailid LIKE ? OR c.companycontactnumber LIKE ?)`;
            params.push(`%${global}%`, `%${global}%`, `%${global}%`);
        }

        // Sorting
        const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        sql += ` ORDER BY c.${sortField} ${order}`;

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
            SELECT COUNT(DISTINCT c.companyid) as total
            FROM companymaster c
            LEFT JOIN companyplandetails cp ON c.companyid = cp.companyid
                AND cp.expirydate >= CURDATE()
            WHERE c.isdeleted = 0
        `;
        let countParams = [];

        if (companyname) {
            countSql += ` AND c.companyname LIKE ?`;
            countParams.push(`%${companyname}%`);
        }

        if (companyemailid) {
            countSql += ` AND c.companyemailid LIKE ?`;
            countParams.push(`%${companyemailid}%`);
        }

        if (planid) {
            countSql += ` AND cp.planid = ?`;
            countParams.push(planid);
        }

        if (global) {
            countSql += ` AND (c.companyname LIKE ? OR c.companyemailid LIKE ? OR c.companycontactnumber LIKE ?)`;
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
     * Update company
     */
    update: async (companyid, data) => {
        const updates = [];
        const params = [];

        if (data.companyname !== undefined) {
            updates.push('companyname = ?');
            params.push(data.companyname);
        }

        if (data.companyemailid !== undefined) {
            updates.push('companyemailid = ?');
            params.push(data.companyemailid);
        }

        if (data.companycontactnumber !== undefined) {
            updates.push('companycontactnumber = ?');
            params.push(data.companycontactnumber);
        }

        if (data.remarks !== undefined) {
            updates.push('remarks = ?');
            params.push(data.remarks);
        }

        if (updates.length === 0) {
            return { affectedRows: 0 };
        }

        updates.push('modifieddate = NOW()');
        if (data.modifiedby) {
            updates.push('modifiedby = ?');
            params.push(data.modifiedby);
        }

        params.push(companyid);

        const sql = `
            UPDATE companymaster
            SET ${updates.join(', ')}
            WHERE companyid = ? AND isdeleted = 0
        `;

        const [result] = await db.connection.query(sql, params);
        return { affectedRows: result.affectedRows || 0 };
    },

    /**
     * Update company plan
     */
    updateCompanyPlan: async (companyid, planData) => {
        try {
            return await retryTransaction(
                async (connection) => {

            // Check if company has existing active plan
            const [existingPlan] = await connection.query(
                `SELECT companyplanid FROM companyplandetails
                 WHERE companyid = ? AND expirydate >= CURDATE()
                 ORDER BY companyplanid DESC LIMIT 1`,
                [companyid]
            );

            // Get plan details
            const [planDetails] = await connection.query(
                'SELECT duration, price, amc_charges FROM plan_master WHERE planid = ?',
                [planData.planid]
            );

            if (!planDetails || planDetails.length === 0) {
                throw new Error('Invalid plan selected');
            }

            const plan = planDetails[0];
            const startDate = moment().format('YYYY-MM-DD');
            const expiryDate = moment().add(plan.duration, 'days').format('YYYY-MM-DD');

            if (existingPlan && existingPlan.length > 0) {
                // Update existing plan
                const updateSql = `
                    UPDATE companyplandetails
                    SET planid = ?, expirydate = ?, autorenewonoff = ?,
                        autorenew_at = ?, planprice = ?, amc_charges = ?,
                        planstartdate = ?, remarks = ?
                    WHERE companyplanid = ?
                `;

                const updateParams = [
                    planData.planid,
                    expiryDate,
                    planData.autorenewonoff || 0,
                    null,
                    planData.offeredPrice || plan.price,
                    planData.offeredAmcCharges || plan.amc_charges || 0,
                    startDate,
                    planData.remarks || null,
                    existingPlan[0].companyplanid
                ];

                await connection.query(updateSql, updateParams);
            } else {
                // Insert new plan
                const insertSql = `
                    INSERT INTO companyplandetails (
                        companyid, planid, expirydate, autorenewonoff,
                        autorenew_at, planprice, amc_charges, planstartdate,
                        remarks
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                const insertParams = [
                    companyid,
                    planData.planid,
                    expiryDate,
                    planData.autorenewonoff || 0,
                    null,
                    planData.offeredPrice || plan.price,
                    planData.offeredAmcCharges || plan.amc_charges || 0,
                    startDate,
                    planData.remarks || null
                ];

                await connection.query(insertSql, insertParams);
            }

            return { success: true };
                },
                {
                    maxRetries: 3,
                    operationName: `Company plan update (companyid: ${companyid})`,
                }
            );
        } catch (error) {
            winston.error(`Error updating company plan: ${error.message}`, {
                source: "company.model.js",
                function: "updateCompanyPlan",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                companyid: companyid
            });
            throw error;
        }
    },

    /**
     * Get company plan history
     */
    getCompanyPlanHistory: async (companyid) => {
        const sql = `
            SELECT cp.*, pm.planname, pm.duration, pm.frequency
            FROM companyplandetails cp
            JOIN plan_master pm ON cp.planid = pm.planid
            WHERE cp.companyid = ?
            ORDER BY cp.planstartdate DESC
        `;
        return await db.getResults(sql, [companyid]);
    },

    /**
     * Delete company (soft delete)
     */
    delete: async (companyid) => {
        const sql = `UPDATE companymaster SET isdeleted = 1 WHERE companyid = ?`;
        const [result] = await db.connection.query(sql, [companyid]);
        return { affectedRows: result.affectedRows || 0 };
    }
};