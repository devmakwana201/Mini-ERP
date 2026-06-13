const db = require("../../config/db");
const winston = require("../../config/winston");
const { retryTransaction } = require("../../utils/dbRetry");

function normalizeDate(value) {
    if (!value) return null;
    const dt = new Date(value);
    return isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 19).replace("T", " ");
}

const settlementModel = {
    async saveSettlement(settlementData) {
        try {
            return await retryTransaction(
                async (connection) => {
                    // Check if settlement exists with NOWAIT for fail-fast locking
                    let existingSettlement;
                    try {
                        [existingSettlement] = await connection.execute(
                            "SELECT uniquekey FROM settlementmaster WHERE uniquekey = ? AND isdeleted = 0 FOR UPDATE NOWAIT",
                            [settlementData.uniquekey]
                        );
                    } catch (err) {
                        // If lock is not available immediately, fall back to regular FOR UPDATE
                        if (err.errno === 3572) { // ER_LOCK_NOWAIT
                            [existingSettlement] = await connection.execute(
                                "SELECT uniquekey FROM settlementmaster WHERE uniquekey = ? AND isdeleted = 0 FOR UPDATE",
                                [settlementData.uniquekey]
                            );
                        } else {
                            throw err;
                        }
                    }

                    if (existingSettlement.length > 0) {
                        await this.updateSettlement(connection, settlementData);
                        return { success: true, msg: "Settlement updated successfully", issynced: 1 };
                    } else {
                        await this.insertSettlement(connection, settlementData);
                        return { success: true, msg: "Settlement saved successfully", issynced: 1 };
                    }
                },
                {
                    maxRetries: 3,
                    operationName: `Settlement save (${settlementData.uniquekey})`,
                }
            );
        } catch (error) {
            winston.error(`Error saving settlement: ${error.message}`, {
                source: "settlement.model.js",
                function: "saveSettlement",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return { success: false, msg: "Failed to save settlement", error: error.message };
        }
    },

    async insertSettlement(connection, settlement) {
        const clientCreatedDate = normalizeDate(settlement.createddate);
        const clientModifiedDate = normalizeDate(settlement.modifieddate);
        const settlementDate = normalizeDate(settlement.date);

        // Insert into settlementmaster
        const settlementQuery = `
            INSERT INTO settlementmaster (
                settlementid, userid, date, shiftamount, withdrawalamount,
                settledbalance, cashdiff, description, shiftid, posid, createdby, createddate,
                modifiedby, modifieddate, isdeleted, companyid, issync,
                datekey, uniquekey, clientcreatedby, clientcreateddate, clientmodifiedby, clientmodifieddate
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            settlement.settlementid,
            settlement.userid || null,
            settlementDate,
            settlement.shiftamount || 0,
            settlement.withdrawalamount || 0,
            settlement.settledbalance || 0,
            settlement.cashdiff || 0,
            settlement.description || null,
            settlement.shiftid || null,
            settlement.posid || null,
            null, // createdby (server)
            null, // createddate (server)
            null, // modifiedby (server)
            null, // modifieddate (server)
            settlement.isdeleted || 0,
            settlement.companyid,
            settlement.issync || 0,
            settlement.datekey,
            settlement.uniquekey,
            settlement.createdby || null, // clientcreatedby (from client)
            clientCreatedDate, // clientcreateddate (from client)
            settlement.modifiedby || null, // clientmodifiedby (from client)
            clientModifiedDate // clientmodifieddate (from client)
        ];

        const [result] = await connection.execute(settlementQuery, values);
        const serverSettlementId = result.insertId;

        // Insert settlement details - Batch INSERT for better performance
        if (settlement.settlementDetails && settlement.settlementDetails.length > 0) {
            const detailValues = [];
            const detailParams = [];

            for (const detail of settlement.settlementDetails) {
                const clientCreatedDateDetail = normalizeDate(detail.createddate);
                const clientModifiedDateDetail = normalizeDate(detail.modifieddate);

                detailValues.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                detailParams.push(
                    detail.settlementdetailsid,
                    settlement.settlementid,
                    detail.settlementtype || null,
                    detail.denominationid || null,
                    detail.denomination || null,
                    detail.qty || 0,
                    detail.total || 0,
                    null, // createdby (server)
                    null, // createddate (server)
                    null, // modifiedby (server)
                    null, // modifieddate (server)
                    detail.isdeleted || 0,
                    detail.posid || null,
                    detail.datekey || null,
                    detail.uniquekey || null,
                    detail.companyid || null,
                    detail.createdby || null, // clientcreatedby (from client)
                    clientCreatedDateDetail, // clientcreateddate (from client)
                    detail.modifiedby || null, // clientmodifiedby (from client)
                    clientModifiedDateDetail // clientmodifieddate (from client)
                );
            }

            const detailQuery = `
                INSERT INTO settlementdetails (
                    settlementdetailsid, settlementid, settlementtype, denominationid,
                    denomination, qty, total, createdby, createddate, modifiedby,
                    modifieddate, isdeleted, posid, datekey, uniquekey,
                    companyid, clientcreatedby, clientcreateddate, clientmodifiedby, clientmodifieddate
                ) VALUES ${detailValues.join(', ')}
            `;
            await connection.execute(detailQuery, detailParams);
        }

        return serverSettlementId;
    },

    async updateSettlement(connection, settlement) {
        const clientModifiedDate = normalizeDate(settlement.modifieddate);
        const settlementDate = normalizeDate(settlement.date);

        const updateQuery = `
            UPDATE settlementmaster SET
                settlementid = ?, userid = ?, date = ?, shiftamount = ?,
                withdrawalamount = ?, settledbalance = ?, cashdiff = ?, description = ?, shiftid = ?,
                posid = ?, datekey = ?, modifiedby = ?, modifieddate = ?,
                clientmodifiedby = ?, clientmodifieddate = ?, isdeleted = ?
            WHERE uniquekey = ?
        `;

        await connection.execute(updateQuery, [
            settlement.settlementid,
            settlement.userid || null,
            settlementDate,
            settlement.shiftamount || 0,
            settlement.withdrawalamount || 0,
            settlement.settledbalance || 0,
            settlement.cashdiff || 0,
            settlement.description || null,
            settlement.shiftid || null,
            settlement.posid || null,
            settlement.datekey,
            null, // modifiedby (server)
            null, // modifieddate (server)
            settlement.modifiedby || null, // clientmodifiedby (from client)
            clientModifiedDate, // clientmodifieddate (from client)
            settlement.isdeleted || 0,
            settlement.uniquekey
        ]);

        // Update settlement details
        if (settlement.settlementDetails && settlement.settlementDetails.length > 0) {
            for (const detail of settlement.settlementDetails) {
                const clientModifiedDateDetail = normalizeDate(detail.modifieddate);

                // Check if detail exists
                const [existingDetail] = await connection.execute(
                    `SELECT id FROM settlementdetails
                     WHERE settlementdetailsid = ? AND settlementid = ?`,
                    [detail.settlementdetailsid, detail.settlementid]
                );

                if (existingDetail.length > 0) {
                    // Update existing detail
                    await connection.execute(
                        `
                        UPDATE settlementdetails SET
                            settlementtype = ?, denominationid = ?, denomination = ?, qty = ?,
                            total = ?, posid = ?, datekey = ?, modifiedby = ?, modifieddate = ?,
                            clientmodifiedby = ?, clientmodifieddate = ?, isdeleted = ?
                        WHERE settlementdetailsid = ? AND settlementid = ?
                        `,
                        [
                            detail.settlementtype || null,
                            detail.denominationid || null,
                            detail.denomination || null,
                            detail.qty || 0,
                            detail.total || 0,
                            detail.posid || null,
                            detail.datekey || null,
                            null, // modifiedby (server)
                            null, // modifieddate (server)
                            detail.modifiedby || null, // clientmodifiedby (from client)
                            clientModifiedDateDetail, // clientmodifieddate (from client)
                            detail.isdeleted || 0,
                            detail.settlementdetailsid,
                            detail.settlementid
                        ]
                    );
                } else {
                    // Insert new detail
                    const clientCreatedDateDetail = normalizeDate(detail.createddate);

                    await connection.execute(
                        `
                        INSERT INTO settlementdetails (
                            settlementdetailsid, settlementid, settlementtype, denominationid,
                            denomination, qty, total, createdby, createddate, modifiedby,
                            modifieddate, isdeleted, posid, datekey, uniquekey,
                            companyid, clientcreatedby, clientcreateddate, clientmodifiedby, clientmodifieddate
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `,
                        [
                            detail.settlementdetailsid,
                            detail.settlementid,
                            detail.settlementtype || null,
                            detail.denominationid || null,
                            detail.denomination || null,
                            detail.qty || null,
                            detail.total || null,
                            null, // createdby (server)
                            null, // createddate (server)
                            null, // modifiedby (server)
                            null, // modifieddate (server)
                            detail.isdeleted || 0,
                            detail.posid || null,
                            detail.datekey || null,
                            detail.uniquekey || null,
                            detail.companyid || null,
                            detail.createdby || null, // clientcreatedby (from client)
                            clientCreatedDateDetail, // clientcreateddate (from client)
                            detail.modifiedby || null, // clientmodifiedby (from client)
                            clientModifiedDateDetail // clientmodifieddate (from client)
                        ]
                    );
                }
            }
        }

        return 1;
    },

    async getSettlementByUniqueKey(uniquekey) {
        try {
            const [settlement] = await db.getResults(
                `SELECT * FROM settlementmaster WHERE uniquekey = ? AND isdeleted = 0`,
                [uniquekey]
            );

            if (settlement.length > 0) {
                const [settlementDetails] = await db.getResults(
                    `SELECT * FROM settlementdetails
                     WHERE settlementid = ? AND companyid = ? AND isdeleted = 0`,
                    [settlement[0].settlementid, settlement[0].companyid]
                );

                return {
                    settlement: settlement[0],
                    settlementDetails: settlementDetails
                };
            }

            return null;
        } catch (error) {
            winston.error(`Error getting settlement: ${error.message}`, {
                source: "settlement.model.js",
                function: "getSettlementByUniqueKey",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            throw error;
        }
    },

    async getSettlementsByDateRange(companyid, startDate, endDate) {
        try {
            const [settlements] = await db.getResults(
                `SELECT sm.*,
                        GROUP_CONCAT(
                            CONCAT(sd.settlementdetailsid, ':', sd.settlementtype, ':', sd.denomination, ':', sd.qty, ':', sd.total)
                        ) as settlement_details
                 FROM settlementmaster sm
                 LEFT JOIN settlementdetails sd ON sm.settlementid = sd.settlementid
                    AND sm.companyid = sd.companyid
                    AND sd.isdeleted = 0
                 WHERE sm.companyid = ?
                    AND sm.date BETWEEN ? AND ?
                    AND sm.isdeleted = 0
                 GROUP BY sm.id
                 ORDER BY sm.date DESC`,
                [companyid, startDate, endDate]
            );

            return settlements;
        } catch (error) {
            winston.error(`Error getting settlements by date range: ${error.message}`, {
                source: "settlement.model.js",
                function: "getSettlementsByDateRange",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            throw error;
        }
    }
};

module.exports = settlementModel;