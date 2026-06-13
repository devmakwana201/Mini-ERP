const db = require("../../config/db");
const winston = require("../../config/winston");
const moment = require("moment");

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

const generateProductKeys = (count, isNfs) => {
    const keys = [];

    for (let i = 0; i < count; i++) {
        const serialComponents = [];

        const productKey = generateRandomKey(16, true);
        serialComponents.push(productKey.toUpperCase());

        let serialNumber;
        if (isNfs) {
            const serialLength = 8;
            let snumber = generateRandomKey(serialLength, true);
            snumber += '3A';
            serialComponents.push(snumber.toUpperCase());
        } else {
            serialNumber = generateRandomKey(12, true);
            const keyArr = serialNumber.split('');
            if (keyArr[8] === '3' && keyArr[9] === 'A') {
                i--;
                continue;
            }
            serialComponents.push(serialNumber.toUpperCase());
        }

        const randomPassword = generateRandomPassword();
        serialComponents.push(randomPassword);

        keys.push(serialComponents);
    }

    return keys;
};

module.exports = {
    checkSerialExists: async (productKey) => {
        try {
            const sql = `SELECT id FROM serial_masters WHERE product_key = ? AND is_deleted = 0`;
            const res = await db.getResults(sql, [productKey]);
            return res && res.length > 0;
        } catch (error) {
            winston.error(`Error checking serial existence: ${error.message}`, {
                source: "serial.model.js",
                function: "checkSerialExists",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                productKey: productKey
            });
            return false;
        }
    },

    createSerials: async (data) => {
        const { addnumber, is_nfs, free_demo, userId, companyId, ipAddress } = data;

        try {
            await db.beginTransaction();

            const productKeys = generateProductKeys(addnumber, is_nfs === 1);
            const createdSerials = [];
            const currentDateTime = moment().format("YYYY-MM-DD HH:mm:ss");
            const itemId = is_nfs === 1 ? 48932 : 48931;

            for (const key of productKeys) {
                const serialData = {
                    serial_number: key[1],
                    product_key: key[0],
                    client_mysql_password: key[2],
                    is_nfs: is_nfs,
                    free_demo: free_demo,
                    itemid: itemId,
                    created_by: userId,
                    created_at: currentDateTime,
                    ip_address: ipAddress,
                    is_active: 0,
                    payment_pending: 0,
                    activation_count: 0,
                    max_activation_count: 3,
                    is_deleted: 0
                };

                const exists = await module.exports.checkSerialExists(serialData.product_key);
                if (!exists) {
                    const result = await db.insert('serial_masters', serialData);
                    if (result.insertId) {
                        createdSerials.push({
                            id: result.insertId,
                            ...serialData
                        });
                    }
                }
            }

            const stockDate = moment().format('YYYY-MM-DD');
            const dateKey = moment().format('YYYYMMDD');
            const stockItemId = is_nfs === 1 ? 2 : 1;
            
            const stockProcedure = `CALL addpostock(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const stockParams = [
                stockItemId, 1, userId, currentDateTime, companyId, ipAddress,
                '1', stockDate, 1, addnumber, 0, 1,
                0, 0, 0,
                0, 0,
                0, 0, 0,
                0, currentDateTime, dateKey, 1
            ];

            await db.callSP(stockProcedure, stockParams);

            await db.commit();

            return {
                status: 201,
                success: 1,
                msg: `${createdSerials.length} serial keys created successfully`,
                data: createdSerials
            };
        } catch (error) {
            await db.rollback();
            winston.error(`Error creating serials: ${error.message}`, {
                source: "serial.model.js",
                function: "createSerials",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                addnumber: data.addnumber,
                is_nfs: data.is_nfs,
                companyId: data.companyId
            });
            return {
                status: 500,
                success: 0,
                msg: error.message || "Failed to create serial keys"
            };
        }
    },

    getSerials: async (req) => {
        const { start = 0, length = 10, filters, sortField = 'id', sortOrder = 'desc' } = req.query;
        const { startDate, endDate, isnfs } = req.body;

        let sql = `
            SELECT sm.id, sm.serial_number, sm.product_key, sm.client_mysql_password, sm.is_nfs, 
                sm.free_demo, lm.locationname as location_name,
                sm.is_active, sm.payment_pending, sm.activation_date, sm.created_at
                FROM serial_masters sm
                left join locationmaster lm on sm.id = lm.serial_id and lm.isdeleted=0  
                WHERE sm.is_deleted = 0
        `;

        const params = [];

        // Add date range filtering
        if (startDate && endDate) {
            sql += ` AND DATE(sm.created_at) BETWEEN ? AND ?`;
            params.push(
                moment(startDate, 'MM/DD/YYYY').format('YYYY-MM-DD'),
                moment(endDate, 'MM/DD/YYYY').format('YYYY-MM-DD')
            );
        }
        
        // Add is_nfs filtering
        if (isnfs !== undefined && isnfs !== null) {
            // sql += ` AND sm.is_nfs = ?`;
            // params.push(parseInt(isnfs));
            const placeholders = isnfs.map(() => '?').join(',');
            sql += ` AND sm.is_nfs IN (${placeholders})`;
            params.push(...isnfs.map(val => parseInt(val)));
        }

        let parsedFilters = {};
        if (filters) {
            try {
                parsedFilters = JSON.parse(filters);
            } catch (err) {
                winston.warn("Invalid filters JSON received", {
                    source: "serial.model.js",
                    function: "getSerials",
                    error: err.message
                });
            }
        }

        const getFilterValue = (field) => {
            const val = parsedFilters[field];
            return typeof val === "object" ? val.value : val;
        };

        const serialNumber = getFilterValue("serial_number");
        if (serialNumber) {
            sql += ` AND serial_number LIKE ?`;
            params.push(`%${serialNumber}%`);
        }

        const productKey = getFilterValue("product_key");
        if (productKey) {
            sql += ` AND product_key LIKE ?`;
            params.push(`%${productKey}%`);
        }

        const queryIsNfs = getFilterValue("is_nfs");
        if (queryIsNfs !== undefined && queryIsNfs !== null && isnfs === undefined) {
            sql += ` AND is_nfs = ?`;
            params.push(queryIsNfs);
        }
        const queryFreeDemo = getFilterValue("free_demo");
        if (queryFreeDemo !== undefined && queryFreeDemo !== null && isnfs === undefined) {
            sql += ` AND free_demo = ?`;
            params.push(queryFreeDemo);
        }

        const isActive = getFilterValue("is_active");
        if (isActive !== undefined && isActive !== null) {
            sql += ` AND sm.is_active = ?`;
            params.push(isActive);
        }

        const paymentPending = getFilterValue("payment_pending");
        if (paymentPending !== undefined && paymentPending !== null) {
            sql += ` AND sm.payment_pending = ?`;
            params.push(paymentPending);
        }

        const global = getFilterValue("global");
        if (global) {
            sql += ` AND (serial_number LIKE ? OR product_key LIKE ?)`;
            const g = `%${global}%`;
            params.push(g, g);
        }

        const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        sql += ` ORDER BY ${sortField} ${order}`;

        const startNum = parseInt(start);
        const lengthNum = parseInt(length);
        
        if (lengthNum !== -1) {
            sql += ` LIMIT ?, ?`;
            params.push(startNum, lengthNum);
        }

        const data = await db.getResults(sql, params);

        let countSql = `SELECT COUNT(*) as total FROM serial_masters WHERE is_deleted = 0`;
        let countParams = [];

        // Add date range filtering to count query
        if (startDate && endDate) {
            countSql += ` AND DATE(created_at) BETWEEN ? AND ?`;
            countParams.push(
                moment(startDate, 'MM/DD/YYYY').format('YYYY-MM-DD'),
                moment(endDate, 'MM/DD/YYYY').format('YYYY-MM-DD')
            );
        }

        // Add is_nfs filtering to count query
        if (isnfs !== undefined && isnfs !== null) {
            const placeholders = isnfs.map(() => '?').join(',');
            countSql += ` AND sm.is_nfs IN (${placeholders})`;
            countParams.push(...isnfs.map(val => parseInt(val)));
        }

        if (serialNumber) {
            countSql += ` AND serial_number LIKE ?`;
            countParams.push(`%${serialNumber}%`);
        }

        if (productKey) {
            countSql += ` AND product_key LIKE ?`;
            countParams.push(`%${productKey}%`);
        }

        if (queryIsNfs !== undefined && queryIsNfs !== null && isnfs === undefined) {
            countSql += ` AND is_nfs = ?`;
            countParams.push(queryIsNfs);
        }

        if (queryFreeDemo !== undefined && queryFreeDemo !== null && isnfs === undefined) {
            countSql += ` AND free_demo = ?`;
            countParams.push(queryFreeDemo);
        }

        if (isActive !== undefined && isActive !== null) {
            countSql += ` AND sm.is_active = ?`;
            countParams.push(isActive);
        }

        if (paymentPending !== undefined && paymentPending !== null) {
            countSql += ` AND sm.payment_pending = ?`;
            countParams.push(paymentPending);
        }

        if (global) {
            countSql += ` AND (serial_number LIKE ? OR product_key LIKE ?)`;
            const g = `%${global}%`;
            countParams.push(g, g);
        }
        const totalResult = await db.getResults(countSql, countParams);
        const totalRecords = totalResult[0]?.total || 0;
        const totalPages = Math.ceil(totalRecords / lengthNum);

        return {
            data,
            pagination: {
                start: startNum,
                length: lengthNum,
                total: totalRecords,
                totalPages
            }
        };
    },

    getSerialReport: async (req) => {
        const { start = 0, length = 10, filters, sortField = 'id', sortOrder = 'desc'} = req.query;
        const { startDate, endDate, isnfs } = req.body;

        let sql = `
            SELECT sm.id as serialid, sm.is_nfs, lm.locationname , lm.contactno,
                   lm.createddate, lm.is_active, spm.suppliername,
                   sm.serial_number, sm.product_key, sm.activation_date, sm.activation_count
            FROM locationmaster lm
            INNER JOIN serial_masters sm ON lm.serial_id = sm.id 
            LEFT JOIN suppliermaster spm ON sm.supplierid = spm.supplierid 
            WHERE lm.isdeleted = 0
        `;

        const params = [];

        // Add date range filtering
        if (startDate && endDate) {
            sql += ` AND DATE(lm.createddate) BETWEEN ? AND ?`;
            params.push(
                moment(startDate, 'MM/DD/YYYY').format('YYYY-MM-DD'),
                moment(endDate, 'MM/DD/YYYY').format('YYYY-MM-DD')
            );
        }

        // Add is_nfs filtering (array support)
        if (isnfs && Array.isArray(isnfs) && isnfs.length > 0) {
            const placeholders = isnfs.map(() => '?').join(',');
            sql += ` AND sm.is_nfs IN (${placeholders})`;
            params.push(...isnfs.map(val => parseInt(val)));
        }

        // Parse filters from request body
        let parsedFilters = {};
        if (filters) {
            try {
                parsedFilters = typeof filters === 'string' ? JSON.parse(filters) : filters;
            } catch (err) {
                winston.warn("Invalid filters JSON received", {
                    source: "serial.model.js",
                    function: "getSerialReport",
                    error: err.message
                });
            }
        }

        const getFilterValue = (field) => {
            const val = parsedFilters[field];
            return typeof val === "object" ? val.value : val;
        };

        // Add individual field filtering (similar to getSerials)
        const serialNumber = getFilterValue("serial_number");
        if (serialNumber) {
            sql += ` AND sm.serial_number LIKE ?`;
            params.push(`%${serialNumber}%`);
        }

        const productKey = getFilterValue("product_key");
        if (productKey) {
            sql += ` AND sm.product_key LIKE ?`;
            params.push(`%${productKey}%`);
        }

        const locationname = getFilterValue("locationname");
        if (locationname) {
            sql += ` AND lm.locationname LIKE ?`;
            params.push(`%${locationname}%`);
        }

        const contactno = getFilterValue("contactno");
        if (contactno) {
            sql += ` AND lm.contactno LIKE ?`;
            params.push(`%${contactno}%`);
        }

        const suppliername = getFilterValue("suppliername");
        if (suppliername) {
            sql += ` AND spm.suppliername LIKE ?`;
            params.push(`%${suppliername}%`);
        }

        const queryIsNfs = getFilterValue("is_nfs");
        if (queryIsNfs !== undefined && queryIsNfs !== null && isnfs === undefined) {
            sql += ` AND sm.is_nfs = ?`;
            params.push(queryIsNfs);
        }

        const isActive = getFilterValue("is_active");
        if (isActive !== undefined && isActive !== null) {
            sql += ` AND lm.is_active = ?`;
            params.push(isActive);
        }

        const activationCount = getFilterValue("activation_count");
        if (activationCount !== undefined && activationCount !== null) {
            sql += ` AND sm.activation_count = ?`;
            params.push(activationCount);
        }

        const activationDate = getFilterValue("activation_date");
        if (activationDate !== undefined && activationDate !== null) {
            sql += ` AND sm.activation_date = ?`;
            params.push(activationDate);
        }

        const global = getFilterValue("global");
        if (global) {
            sql += ` AND (sm.serial_number LIKE ? OR sm.product_key LIKE ? OR lm.locationname LIKE ? OR lm.contactno LIKE ? OR spm.suppliername LIKE ?)`;
            const g = `%${global}%`;
            params.push(g, g, g, g, g);
        }

        const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        sql += ` ORDER BY ${sortField} ${order}`;

        // Get total count for pagination (using same filters)
        let countSql = `
            SELECT COUNT(*) as total
            FROM locationmaster lm
            INNER JOIN serial_masters sm ON lm.serial_id = sm.id 
            LEFT JOIN suppliermaster spm ON sm.supplierid = spm.supplierid 
            WHERE lm.isdeleted = 0
        `;
        let countParams = [];

        // Apply same filters to count query
        if (startDate && endDate) {
            countSql += ` AND DATE(lm.createddate) BETWEEN ? AND ?`;
            countParams.push(
                moment(startDate, 'MM/DD/YYYY').format('YYYY-MM-DD'),
                moment(endDate, 'MM/DD/YYYY').format('YYYY-MM-DD')
            );
        }

        if (isnfs && Array.isArray(isnfs) && isnfs.length > 0) {
            const placeholders = isnfs.map(() => '?').join(',');
            countSql += ` AND sm.is_nfs IN (${placeholders})`;
            countParams.push(...isnfs.map(val => parseInt(val)));
        }

        if (serialNumber) {
            countSql += ` AND sm.serial_number LIKE ?`;
            countParams.push(`%${serialNumber}%`);
        }

        if (productKey) {
            countSql += ` AND sm.product_key LIKE ?`;
            countParams.push(`%${productKey}%`);
        }

        if (locationname) {
            countSql += ` AND lm.locationname LIKE ?`;
            countParams.push(`%${locationname}%`);
        }

        if (contactno) {
            countSql += ` AND lm.contactno LIKE ?`;
            countParams.push(`%${contactno}%`);
        }

        if (suppliername) {
            countSql += ` AND spm.suppliername LIKE ?`;
            countParams.push(`%${suppliername}%`);
        }

        if (queryIsNfs !== undefined && queryIsNfs !== null && isnfs === undefined) {
            countSql += ` AND sm.is_nfs = ?`;
            countParams.push(queryIsNfs);
        }

        if (isActive !== undefined && isActive !== null) {
            countSql += ` AND lm.is_active = ?`;
            countParams.push(isActive);
        }

        if (activationCount !== undefined && activationCount !== null) {
            countSql += ` AND sm.activation_count = ?`;
            countParams.push(activationCount);
        }

        if (activationDate !== undefined && activationDate !== null) {
            countSql += ` AND sm.activation_date = ?`;
            countParams.push(activationDate);
        }

        if (global) {
            countSql += ` AND (sm.serial_number LIKE ? OR sm.product_key LIKE ? OR lm.locationname LIKE ? OR lm.contactno LIKE ? OR spm.suppliername LIKE ?)`;
            const g = `%${global}%`;
            countParams.push(g, g, g, g, g);
        }

        const totalResult = await db.getResults(countSql, countParams);
        const totalRecords = totalResult[0]?.total || 0;

        // Add pagination
        const startNum = parseInt(start);
        const lengthNum = parseInt(length);
        const totalPages = Math.ceil(totalRecords / lengthNum);

        if (lengthNum !== -1) {
            sql += ` LIMIT ?, ?`;
            params.push(startNum, lengthNum);
        }

        const data = await db.getResults(sql, params);

        return {
            data,
            pagination: {
                start: startNum,
                length: lengthNum,
                total: totalRecords,
                totalPages
            }
        };
    },

    serialkeyCount: async () => {
        try {
            const sql = `SELECT id FROM serial_masters WHERE is_deleted = 0`;
            const count = await db.getCount(sql);
            return count;
        } catch (error) {
            winston.error(`Error getting serial key count: ${error.message}`, {
                source: "serial.model.js",
                function: "serialkeyCount",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return 0;
        }
    },

    usedkeyCount: async () => {
        try {
            const sql = `SELECT id FROM locationmaster WHERE isdeleted = 0`;
            const count = await db.getCount(sql);
            return count;
        } catch (error) {
            winston.error(`Error getting used key count: ${error.message}`, {
                source: "serial.model.js",
                function: "usedkeyCount",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return 0;
        }
    }
}