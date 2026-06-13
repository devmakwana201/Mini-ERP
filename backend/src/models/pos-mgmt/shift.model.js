const db = require("../../config/db");
const winston = require("../../config/winston");
const { retryTransaction } = require("../../utils/dbRetry");

function normalizeDate(value) {
    if (!value) return null;
    const dt = new Date(value);
    return isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 19).replace("T", " ");
}

const shiftModel = {
    async saveShift(shiftData) {
        try {
            return await retryTransaction(
                async (connection) => {
                    // Check if shift exists with NOWAIT for fail-fast locking
                    let existingShift;
                    try {
                        [existingShift] = await connection.execute(
                            "SELECT uniquekey FROM shiftmaster WHERE uniquekey = ? AND isdeleted = 0 FOR UPDATE NOWAIT",
                            [shiftData.uniquekey]
                        );
                    } catch (err) {
                        // If lock is not available immediately, fall back to regular FOR UPDATE
                        if (err.errno === 3572) { // ER_LOCK_NOWAIT
                            [existingShift] = await connection.execute(
                                "SELECT uniquekey FROM shiftmaster WHERE uniquekey = ? AND isdeleted = 0 FOR UPDATE",
                                [shiftData.uniquekey]
                            );
                        } else {
                            throw err;
                        }
                    }

                    if (existingShift.length > 0) {
                        await this.updateShift(connection, shiftData);
                        return { success: true, msg: "Shift updated successfully", issynced: 1 };
                    } else {
                        await this.insertShift(connection, shiftData);
                        return { success: true, msg: "Shift saved successfully", issynced: 1 };
                    }
                },
                {
                    maxRetries: 3,
                    operationName: `Shift save (${shiftData.uniquekey})`,
                }
            );
        } catch (error) {
            winston.error(`Error saving shift: ${error.message}`, {
                source: "shift.model.js",
                function: "saveShift",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                uniquekey: shiftData.uniquekey
            });
            return { success: false, msg: "Failed to save shift", error: error.message };
        }
    },

    async insertShift(connection, shift) {
        const clientCreatedDate = normalizeDate(shift.createddate);
        const clientModifiedDate = normalizeDate(shift.modifieddate);
        const startDateTime = normalizeDate(shift.startdatetime);
        const endDateTime = normalizeDate(shift.enddatetime);

        // Insert into shiftmaster
        const shiftQuery = `
            INSERT INTO shiftmaster (
                shiftid, userid, posid, startdatetime, enddatetime,
                openingbalance, totalpaymentamount, salereturn, closingbalance, dueamount,
                startdescription, enddescription, isactive, createdby, createddate, modifiedby,
                modifieddate, isdeleted, issync, companyid, datekey, uniquekey,
                totalbills, cancelledbills, clientcreatedby, clientcreateddate,
                clientmodifiedby, clientmodifieddate
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            shift.shiftid ?? null,
            shift.userid ?? null,
            shift.posid ?? null,
            startDateTime,
            endDateTime,
            shift.openingbalance ?? null,
            shift.totalpaymentamount ?? null,
            shift.salereturn ?? null,
            shift.closingbalance ?? null,
            shift.dueamount ?? null,
            shift.startdescription ?? null,
            shift.enddescription ?? null,
            shift.isactive ?? null,
            null, // createdby (server)
            null, // createddate (server)
            null, // modifiedby (server)
            null, // modifieddate (server)
            shift.isdeleted ?? 0,
            shift.issync ?? 0,
            shift.companyid ?? null,
            shift.datekey ?? null,
            shift.uniquekey ?? null,
            shift.totalbills ?? null,
            shift.cancelledbills ?? null,
            shift.createdby ?? null, // clientcreatedby (from client)
            clientCreatedDate, // clientcreateddate (from client)
            shift.modifiedby ?? null, // clientmodifiedby (from client)
            clientModifiedDate, // clientmodifieddate (from client)
        ];


        const [result] = await connection.execute(shiftQuery, values);
        const serverShiftId = result.insertId;

        // Insert shift details - Batch INSERT for better performance
        if (shift.shiftDetails && shift.shiftDetails.length > 0) {
            const detailValues = [];
            const detailParams = [];

            for (const detail of shift.shiftDetails) {
                const clientCreatedDateDetail = normalizeDate(detail.createddate);
                const clientModifiedDateDetail = normalizeDate(detail.modifieddate);

                detailValues.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                detailParams.push(
                    detail.shiftdetailid ?? null,
                    shift.shiftid ?? null,
                    detail.exchangedbyuserid ?? null,
                    detail.exchangedtouserid ?? null,
                    detail.currentbalance ?? null,
                    detail.drawerbalance ?? null,
                    detail.differenceamount ?? null,
                    detail.remarks ?? null,
                    detail.uniquekey ?? null,
                    detail.datekey ?? null,
                    detail.posid ?? null,
                    detail.locationid ?? null,
                    detail.companyid ?? null,
                    null, // createdby (server)
                    null, // createddate (server)
                    null, // modifiedby (server)
                    null, // modifieddate (server)
                    detail.isdeleted ?? 0,
                    detail.createdby ?? null, // clientcreatedby (from client)
                    clientCreatedDateDetail, // clientcreateddate (from client)
                    detail.modifiedby ?? null, // clientmodifiedby (from client)
                    clientModifiedDateDetail // clientmodifieddate (from client)
                );
            }

            const detailQuery = `
                INSERT INTO shiftdetails (
                    shiftdetailid, shiftid, exchangedbyuserid, exchangedtouserid,
                    currentbalance, drawerbalance, differenceamount, remarks, uniquekey,
                    datekey, posid, locationid, companyid, createdby, createddate, modifiedby,
                    modifieddate, isdeleted, clientcreatedby, clientcreateddate,
                    clientmodifiedby, clientmodifieddate
                ) VALUES ${detailValues.join(', ')}
            `;
            await connection.execute(detailQuery, detailParams);
        }

        return serverShiftId;
    },

    async updateShift(connection, shift) {
        const clientModifiedDate = normalizeDate(shift.modifieddate);
        const startDateTime = normalizeDate(shift.startdatetime);
        const endDateTime = normalizeDate(shift.enddatetime);

        const updateQuery = `
            UPDATE shiftmaster SET
                totalbills = ?, cancelledbills = ?, userid = ?, posid = ?, startdatetime = ?, enddatetime = ?,
                openingbalance = ?, totalpaymentamount = ?, closingbalance = ?, dueamount = ?,
                startdescription = ?, enddescription = ?, isactive = ?, modifiedby = ?,
                modifieddate = ?, clientmodifiedby = ?, clientmodifieddate = ?, isdeleted = ?
            WHERE uniquekey = ?
        `;

        await connection.execute(updateQuery, [
            shift.totalbills ?? null,
            shift.cancelledbills ?? null,
            shift.userid ?? null,
            shift.posid ?? null,
            startDateTime,
            endDateTime,
            shift.openingbalance ?? null,
            shift.totalpaymentamount ?? null,
            shift.closingbalance ?? null,
            shift.dueamount ?? null,
            shift.startdescription ?? null,
            shift.enddescription ?? null,
            shift.isactive ?? null,
            null, // modifiedby (server)
            null, // modifieddate (server)
            shift.modifiedby ?? null, // clientmodifiedby (from client)
            clientModifiedDate, // clientmodifieddate (from client)
            shift.isdeleted ?? 0,
            shift.uniquekey,
        ]);

        // Update shiftdetails
        if (shift.shiftDetails && shift.shiftDetails.length > 0) {
            for (const detail of shift.shiftDetails) {
                const clientModifiedDateDetail = normalizeDate(detail.modifieddate);

                await connection.execute(
                    `
                    UPDATE shiftdetails SET
                        exchangedbyuserid = ?, exchangedtouserid = ?, currentbalance = ?, drawerbalance = ?,
                        differenceamount = ?, remarks = ?, posid = ?, datekey = ?, modifiedby = ?,
                        modifieddate = ?, clientmodifiedby = ?, clientmodifieddate = ?, isdeleted = ?
                    WHERE shiftid = ? AND shiftdetailid = ? AND locationid = ? AND companyid = ?
                    `,
                    [
                        detail.exchangedbyuserid ?? null,
                        detail.exchangedtouserid ?? null,
                        detail.currentbalance ?? null,
                        detail.drawerbalance ?? null,
                        detail.differenceamount ?? null,
                        detail.remarks ?? null,
                        detail.posid ?? null,
                        detail.datekey ?? null,
                        null, // modifiedby (server)
                        null, // modifieddate (server)
                        detail.modifiedby ?? null, // clientmodifiedby (from client)
                        clientModifiedDateDetail, // clientmodifieddate (from client)
                        detail.isdeleted ?? 0,
                        detail.shiftid ?? null,
                        detail.shiftdetailid ?? null,
                        detail.locationid ?? null,
                        detail.companyid ?? null,
                    ]
                );
            }
        }
        return 1;
    },
};

module.exports = shiftModel;
