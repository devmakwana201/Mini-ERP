const db = require("../../config/db");
const winston = require("../../config/winston");
const moment = require("moment");
const { retryTransaction } = require("../../utils/dbRetry");

module.exports = {
    /**
     * Save customers data - equivalent to saveCustomers in PHP
     */
    saveCustomers: async (customers) => {
        try {
            return await retryTransaction(
                async (connection) => {
                    const customersRes = [];

                    for (let i = 0; i < customers.length; i++) {
                        const customer = customers[i];
                        const thisOrder = {
                            customerid: customer.customerid,
                            companyid: customer.companyid,
                        };

                        try {
                            // Format dates
                            const clientCreatedDate = customer.createddate
                                ? moment(customer.createddate).format("YYYY-MM-DD HH:mm:ss")
                                : null;

                            const clientModifiedDate =
                                customer.modifieddate && customer.modifieddate !== ""
                                    ? moment(customer.modifieddate).format("YYYY-MM-DD HH:mm:ss")
                                    : null;

                            let existingCustomer;
                            if (customer.uniquekey) {
                                try {
                                    [existingCustomer] = await connection.execute(
                                        `SELECT customerid FROM customermaster
                                         WHERE uniquekey = ? AND isdeleted = 0 FOR UPDATE NOWAIT`,
                                        [customer.uniquekey]
                                    );
                                } catch (err) {
                                    if (err.errno === 3572) { // ER_LOCK_NOWAIT
                                        [existingCustomer] = await connection.execute(
                                            `SELECT customerid FROM customermaster
                                             WHERE uniquekey = ? AND isdeleted = 0 FOR UPDATE`,
                                            [customer.uniquekey]
                                        );
                                    } else {
                                        throw err;
                                    }
                                }
                            } else {
                                try {
                                    [existingCustomer] = await connection.execute(
                                        `SELECT customerid FROM customermaster
                                         WHERE customerid = ? AND companyid = ? AND isdeleted = 0 FOR UPDATE NOWAIT`,
                                        [customer.customerid, customer.companyid]
                                    );
                                } catch (err) {
                                    if (err.errno === 3572) { // ER_LOCK_NOWAIT
                                        [existingCustomer] = await connection.execute(
                                            `SELECT customerid FROM customermaster
                                             WHERE customerid = ? AND companyid = ? AND isdeleted = 0 FOR UPDATE`,
                                            [customer.customerid, customer.companyid]
                                        );
                                    } else {
                                        throw err;
                                    }
                                }
                            }

                    if (existingCustomer && existingCustomer.length > 0) {
                        const updateQuery = `
                            UPDATE customermaster SET
                                customeruniquekey = ?, name = ?, phoneno = ?, email = ?,
                                outstandingamt = ?, overduelimit = ?, birthdate = ?, anniversarydate = ?,
                                panno = ?, gstno = ?, isdeleted = ?, pincodeno = ?,
                                contactpersonname = ?, smsalert = ?, iscompany = ?, stateid = ?,
                                cityid = ?, countryid = ?, address = ?, countrycode = ?,
                                residencedocument = ?, iddocument = ?, aadharnum = ?, agrilanddata = ?,
                                cropgrown1 = ?, cropgrown2 = ?, cropgrown3 = ?, uniquekey = ?,
                                issync = ?, modifiedby = ?, modifieddate = ?, clientmodifiedby = ?,
                                clientmodifieddate = ?
                            WHERE ${customer.uniquekey ? "uniquekey = ?" : "customerid = ? AND companyid = ?"}
                        `;

                        const updateParams = [
                            customer.customeruniquekey || null,
                            customer.name || null,
                            customer.phoneno || null,
                            customer.email || null,
                            customer.outstandingamt || 0,
                            customer.overduelimit || 0,
                            customer.birthdate || null,
                            customer.anniversarydate || null,
                            customer.panno || null,
                            customer.gstno || null,
                            customer.isdeleted || 0,
                            customer.pincodeno || null,
                            customer.contactpersonname || null,
                            customer.smsalert || 0,
                            customer.iscompany || 0,
                            customer.stateid || null,
                            customer.cityid || null,
                            customer.countryid || null,
                            customer.address || null,
                            customer.countrycode || null,
                            customer.residencedocument || null,
                            customer.iddocument || null,
                            customer.aadharnum || null,
                            customer.agrilanddata || null,
                            customer.cropgrown1 || null,
                            customer.cropgrown2 || null,
                            customer.cropgrown3 || null,
                            customer.uniquekey || null,
                            customer.issync || 0,
                            null,
                            null,
                            customer.modifiedby || null,
                            clientModifiedDate,
                        ];

                        if (customer.uniquekey) {
                            updateParams.push(customer.uniquekey);
                        } else {
                            updateParams.push(customer.customerid, customer.companyid);
                        }

                        await connection.execute(updateQuery, updateParams);

                        thisOrder.issynced = 1;
                        thisOrder.isnew = 0;
                        thisOrder.phoneno = customer.phoneno;
                        thisOrder.name = customer.name;
                    } else {
                        const insertQuery = `INSERT INTO customermaster (
                            customerid, customeruniquekey, name, phoneno, email, outstandingamt, overduelimit, birthdate, anniversarydate, panno, gstno, isdeleted, companyid, pincodeno, contactpersonname, smsalert, iscompany, stateid, cityid, countryid, address, countrycode, residencedocument, iddocument, aadharnum, agrilanddata, cropgrown1, cropgrown2, cropgrown3, uniquekey, issync, clientcreatedby, clientcreateddate, clientmodifiedby, clientmodifieddate, createdby, createddate, modifiedby, modifieddate
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

                        const insertParams = [
                            customer.customerid,
                            customer.customeruniquekey || null,
                            customer.name || null,
                            customer.phoneno || null,
                            customer.email || null,
                            customer.outstandingamt || 0,
                            customer.overduelimit || 0,
                            customer.birthdate || null,
                            customer.anniversarydate || null,
                            customer.panno || null,
                            customer.gstno || null,
                            customer.isdeleted || 0,
                            customer.companyid,
                            customer.pincodeno || null,
                            customer.contactpersonname || null,
                            customer.smsalert || 0,
                            customer.iscompany || 0,
                            customer.stateid || null,
                            customer.cityid || null,
                            customer.countryid || null,
                            customer.address || null,
                            customer.countrycode || null,
                            customer.residencedocument || null,
                            customer.iddocument || null,
                            customer.aadharnum || null,
                            customer.agrilanddata || null,
                            customer.cropgrown1 || null,
                            customer.cropgrown2 || null,
                            customer.cropgrown3 || null,
                            customer.uniquekey || null,
                            customer.issync || 0,
                            customer.createdby || null,
                            clientCreatedDate,
                            customer.modifiedby || null,
                            clientModifiedDate,
                            null,
                            null,
                            null,
                            null,
                        ];

                        const [insertResult] = await connection.execute(insertQuery, insertParams);
                        thisOrder.issynced = insertResult.insertId ? 1 : 0;
                        thisOrder.isnew = 1;
                        thisOrder.phoneno = customer.phoneno;
                        thisOrder.name = customer.name;
                    }
                } catch (dbError) {
                    winston.error(`Failed to save customer ${customer.customerid}: ${dbError.message}`, {
                        source: "customer.model.js",
                        function: "saveCustomers",
                        error: dbError.message,
                        code: dbError.code,
                        errno: dbError.errno,
                        stack: dbError.stack,
                        customerid: customer.customerid,
                        companyid: customer.companyid
                    });
                    thisOrder.issynced = 0;
                    thisOrder.error = dbError.message;
                    thisOrder.phoneno = customer.phoneno;
                    thisOrder.name = customer.name;
                }

                        customersRes.push(thisOrder);
                    }

                    return { success: true, data: customersRes };
                },
                {
                    maxRetries: 3,
                    operationName: `Customer save (batch of ${customers.length})`,
                }
            );
        } catch (error) {
            winston.error(`Error in saveCustomers: ${error.message}`, {
                source: "customer.model.js",
                function: "saveCustomers",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                customersCount: customers.length
            });
            const failedResults = customers.map(c => ({
                customerid: c.customerid,
                companyid: c.companyid,
                issynced: 0,
                error: error.message
            }));
            return { success: false, data: failedResults, message: error.message };
        }
    },

    saveCustomerDetails: async (customerDetails) => {
        try {
            return await retryTransaction(
                async (connection) => {
                    const customersDetRes = [];

                    for (let i = 0; i < customerDetails.length; i++) {
                        const customerDetail = customerDetails[i];
                        const thisOrder = {
                            uniquekey: customerDetail.uniquekey,
                        };

                        try {
                            let existingRecord;
                            try {
                                [existingRecord] = await connection.execute(
                                    `SELECT uniquekey FROM customeraccountdetails
                                     WHERE uniquekey = ? AND isdeleted = 0 FOR UPDATE NOWAIT`,
                                    [customerDetail.uniquekey]
                                );
                            } catch (err) {
                                if (err.errno === 3572) { // ER_LOCK_NOWAIT
                                    [existingRecord] = await connection.execute(
                                        `SELECT uniquekey FROM customeraccountdetails
                                         WHERE uniquekey = ? AND isdeleted = 0 FOR UPDATE`,
                                        [customerDetail.uniquekey]
                                    );
                                } else {
                                    throw err;
                                }
                            }

                    if (existingRecord && existingRecord.length > 0) {
                        thisOrder.issynced = 1;
                    } else {
                        const clientCreatedDate = customerDetail.createddate
                            ? moment(customerDetail.createddate).format("YYYY-MM-DD HH:mm:ss")
                            : null;

                        const clientModifiedDate =
                            customerDetail.modifieddate && customerDetail.modifieddate !== ""
                                ? moment(customerDetail.modifieddate).format("YYYY-MM-DD HH:mm:ss")
                                : null;

                        const paymentDate =
                            customerDetail.paymentdate && customerDetail.paymentdate !== ""
                                ? moment(customerDetail.paymentdate).format("YYYY-MM-DD HH:mm:ss")
                                : null;

                        const insertQuery = `INSERT INTO customeraccountdetails (
                            customeraccountid, customerid, creditamount, debitamount, balance, paymentdate, datekey, locationid, clientcreatedby, clientcreateddate, clientmodifiedby, clientmodifieddate, isdeleted, companyid, createdby, createddate, modifiedby, modifieddate, description, paymodeid, uniquekey, cmuniquekey
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

                        const insertParams = [
                            customerDetail.customeraccountid,
                            customerDetail.customerid,
                            customerDetail.creditamount || 0,
                            customerDetail.debitamount || 0,
                            customerDetail.balance || 0,
                            paymentDate,
                            customerDetail.datekey || null,
                            customerDetail.locationid,
                            customerDetail.createdby || null,
                            clientCreatedDate,
                            customerDetail.modifiedby || null,
                            clientModifiedDate,
                            customerDetail.isdeleted || 0,
                            customerDetail.companyid,
                            null,
                            null,
                            null,
                            null,
                            customerDetail.description || null,
                            customerDetail.paymodeid || null,
                            customerDetail.uniquekey,
                            customerDetail.cmuniquekey || null,
                        ];

                        const [insertResult] = await connection.execute(insertQuery, insertParams);
                        thisOrder.issynced = insertResult.insertId ? 1 : 0;
                    }
                } catch (dbError) {
                    winston.error(`Failed to save customer detail ${customerDetail.uniquekey}: ${dbError.message}`, {
                        source: "customer.model.js",
                        function: "saveCustomerDetails",
                        error: dbError.message,
                        code: dbError.code,
                        errno: dbError.errno,
                        stack: dbError.stack,
                        uniquekey: customerDetail.uniquekey
                    });
                    thisOrder.issynced = 0;
                }

                        customersDetRes.push(thisOrder);
                    }

                    return { success: true, data: customersDetRes };
                },
                {
                    maxRetries: 3,
                    operationName: `Customer details save (batch of ${customerDetails.length})`,
                }
            );
        } catch (error) {
            winston.error(`Error in saveCustomerDetails: ${error.message}`, {
                source: "customer.model.js",
                function: "saveCustomerDetails",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                customerDetailsCount: customerDetails.length
            });
            const failedResults = customerDetails.map(cd => ({ uniquekey: cd.uniquekey, issynced: 0, error: error.message }));
            return { success: false, data: failedResults, message: error.message };
        }
    },

    /**
     * Get customer by ID and company
     */
    getCustomerById: async (customerId, companyId) => {
        try {
            const query = `
                SELECT * FROM customermaster
                WHERE customerid = ? AND companyid = ? AND isdeleted = 0
            `;
            const result = await db.getResults(query, [customerId, companyId]);
            return result && result.length > 0 ? result[0] : null;
        } catch (error) {
            winston.error(`Error in getCustomerById: ${error.message}`, {
                source: "customer.model.js",
                function: "getCustomerById",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                customerId: customerId,
                companyId: companyId
            });
            throw error;
        }
    },

    /**
     * Get customers by company
     */
    getCustomersByCompany: async (companyId, modifiedDate = null) => {
        try {
            let query = `
                SELECT * FROM customermaster
                WHERE companyid = ? AND isdeleted = 0
            `;
            const params = [companyId];

            if (modifiedDate) {
                query += ` AND (createddate > ? OR modifieddate > ?)`;
                params.push(modifiedDate, modifiedDate);
            }

            query += ` ORDER BY customerid`;

            const result = await db.getResults(query, params);
            return result || [];
        } catch (error) {
            winston.error(`Error in getCustomersByCompany: ${error.message}`, {
                source: "customer.model.js",
                function: "getCustomersByCompany",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                companyId: companyId,
                modifiedDate: modifiedDate
            });
            throw error;
        }
    },

    /**
     * Get customer account details by customer ID
     */
    getCustomerAccountDetails: async (customerId, locationId) => {
        try {
            const query = `
                SELECT * FROM customeraccountdetails 
                WHERE customerid = ? AND locationid = ? AND isdeleted = 0
                ORDER BY createddate DESC
            `;
            const result = await db.getResults(query, [customerId, locationId]);
            return result || [];
        } catch (error) {
            winston.error(`Error in getCustomerAccountDetails: ${error.message}`, {
                source: "customer.model.js",
                function: "getCustomerAccountDetails",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                customerId: customerId,
                locationId: locationId
            });
            throw error;
        }
    },

    /**
     * Get customer statistics by company
     */
    getCustomerStats: async (companyId) => {
        try {
            const query = `
                SELECT
                    COUNT(*) as total_customers,
                    COUNT(CASE WHEN iscompany = 1 THEN 1 END) as company_customers,
                    COUNT(CASE WHEN iscompany = 0 THEN 1 END) as individual_customers,
                    SUM(outstandingamt) as total_outstanding,
                    AVG(outstandingamt) as avg_outstanding,
                    COUNT(CASE WHEN outstandingamt > 0 THEN 1 END) as customers_with_outstanding
                FROM customermaster
                WHERE companyid = ? AND isdeleted = 0
            `;
            const result = await db.getResults(query, [companyId]);
            return result && result.length > 0 ? result[0] : null;
        } catch (error) {
            winston.error(`Error in getCustomerStats: ${error.message}`, {
                source: "customer.model.js",
                function: "getCustomerStats",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                companyId: companyId
            });
            throw error;
        }
    },
};