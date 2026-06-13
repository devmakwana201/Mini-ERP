const db = require("../../config/db");
const winston = require("../../config/winston");
const { retryTransaction } = require("../../utils/dbRetry");

const purchaseOrderModel = {
    async savePurchaseOrder(orderData) {
        // Use retry logic for deadlock handling
        try {
            return await retryTransaction(
                async (connection) => {
                    // Check if purchase order already exists with NOWAIT
                    let existingOrder;
                    try {
                        [existingOrder] = await connection.execute(
                            "SELECT uniquekey FROM purchaseordermaster WHERE uniquekey = ? AND isdeleted = 0 FOR UPDATE NOWAIT",
                            [orderData.uniquekey]
                        );
                    } catch (err) {
                        // If NOWAIT fails, fall back to regular FOR UPDATE
                        if (err.errno === 3572) { // ER_LOCK_NOWAIT
                            [existingOrder] = await connection.execute(
                                "SELECT uniquekey FROM purchaseordermaster WHERE uniquekey = ? AND isdeleted = 0 FOR UPDATE",
                                [orderData.uniquekey]
                            );
                        } else {
                            throw err;
                        }
                    }

                    if (existingOrder.length > 0) {
                        // Update existing purchase order
                        const updateResult = await this.updatePurchaseOrder(connection, orderData);
                        return {
                            success: true,
                            msg: "Purchase order updated successfully",
                            issynced: updateResult,
                        };
                    } else {
                        // Insert new purchase order
                        await this.insertPurchaseOrder(connection, orderData);
                        return { success: true, msg: "Purchase order saved successfully", issynced: 1 };
                    }
                },
                {
                    maxRetries: 3,
                    operationName: `Purchase order save (${orderData.uniquekey})`,
                }
            );
        } catch (error) {
            winston.error(`Error saving purchase order: ${error.message}`, {
                source: "purchaseOrder.model.js",
                function: "savePurchaseOrder",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                uniquekey: orderData.uniquekey
            });
            return { success: false, msg: "Failed to save purchase order", error: error.message };
        }
    },

    async insertPurchaseOrder(connection, order) {
        const convertDateToMySQL = (dateStr) => {
            if (!dateStr || dateStr.toString().trim() === "") return null;

            const str = dateStr.toString().trim();
            // Check if already in YYYY-MM-DD format
            if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

            // Convert DD/MM/YYYY to YYYY-MM-DD (with forward slash)
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
                const [day, month, year] = str.split("/");
                return `${year}-${month}-${day}`;
            }

            // Convert DD-MM-YYYY to YYYY-MM-DD (with hyphen)
            if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
                const [day, month, year] = str.split("-");
                return `${year}-${month}-${day}`;
            }

            return null;
        };
        // Insert purchase order master
        const orderQuery = `
            INSERT INTO purchaseordermaster (
                orderid, locationid, supplierid, smuniquekey, ordernumber, datekey, referencebillnumber,
                referencechallannumber, purchaseorderdate, expectedorderdate, remarks,
                totalamount, discounttype, discountpercentamt, totaltaxableamount, additionalcharge,
                roundoffamount, totalcessamt, totaltax, grandtotal, orderstatus, potype, isdeleted,
                ipaddress, companyid, uniquekey, clientcreateddate, clientmodifieddate,
                clientcreatedby, clientmodifiedby, createdby, createddate, modifiedby, modifieddate
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), ?, ?, ?, ?, ?, ?)
        `;

        // Prepare values array
        const orderValues = [
            order.orderid,
            order.locationid,
            order.supplierid,
            order.smuniquekey || null,
            order.ordernumber,
            order.datekey,
            order.referencebillnumber || "",
            order.referencechallannumber || "0",
            order.purchaseorderdate,
            order.expectedorderdate || null,
            order.remarks || "",
            order.totalamount,
            order.discounttype || 0,
            order.discountpercentamt || 0,
            order.totaltaxableamount,
            order.additionalcharge || 0,
            order.roundoffamount || 0,
            order.totalcessamt || 0,
            order.totaltax || 0,
            order.grandtotal,
            order.orderstatus || 0,
            order.potype || 0,
            order.isdeleted || 0,
            order.ipaddress,
            order.companyid || 0,
            order.uniquekey,
            order.createddate || null,
            order.modifieddate || null,
            order.createdby || null,
            order.modifiedby || null,
            null,
            null, // Server createddate
            null,
            null, // Server modifieddate
        ];

        const [orderResult] = await connection.execute(orderQuery, orderValues);
        const serverOrderId = orderResult.insertId;

        // Insert purchase order items details
        const itemsData = order.purchaseOrderItemsDetails;
        if (itemsData && itemsData.length > 0) {
            for (const item of itemsData) {
                const itemQuery = `
                    INSERT INTO purchaseorderitemsdetails (
                        orderitemsdetailsid, serverorderid, orderid, itemid, fatvalue, effectiveid,
                        productuniquekey, taxprofileid, locationid, uomid, lastprice, unitprice,
                        baseprice, quantity, totalamount, discountpercent, discountamount,
                        taxableamount, cessamount, cesspercent, taxamount, totaltaxamount,
                        expirydate, islabelprinted, isdeleted, ipaddress, remarks, batchid,
                        batchdate, uniquekey, companyid, clientcreateddate, clientmodifieddate,
                        clientcreatedby, clientmodifiedby, createdby, createddate, modifiedby, modifieddate
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), ?, ?, ?, ?, ?, ?)
                `;

                const [itemResult] = await connection.execute(itemQuery, [
                    item.orderitemsdetailsid,
                    serverOrderId, // Server order ID reference
                    order.orderid, // Client order ID
                    item.itemid,
                    item.fatvalue || null,
                    item.effectiveid || null,
                    item.productuniquekey || null,
                    item.taxprofileid || null,
                    item.locationid,
                    item.uomid || null,
                    item.lastprice || null,
                    item.unitprice,
                    item.baseprice || null,
                    item.quantity,
                    item.totalamount,
                    item.discountpercent || 0,
                    item.discountamount || 0,
                    item.taxableamount,
                    item.cessamount || null,
                    item.cesspercent || null,
                    item.taxamount || 0,
                    item.totaltaxamount || 0,
                    convertDateToMySQL(item.expirydate),
                    item.islabelprinted || null,
                    item.isdeleted || 0,
                    item.ipaddress || order.ipaddress,
                    item.remarks || "",
                    item.batchid || null,
                    convertDateToMySQL(item.batchdate),
                    item.uniquekey || order.uniquekey,
                    item.companyid || order.companyid || 0,
                    item.createddate || null,
                    item.modifieddate || null,
                    item.createdby || null,
                    item.modifiedby || null,
                    null,
                    null, // Server createddate
                    null,
                    null, // Server modifieddate
                ]);

                const serverOrderItemsDetailsId = itemResult.insertId;

                // Batch insert item tax details for better performance
                const taxDetails = item.purchaseOrderItemsTaxDetails;
                if (taxDetails && taxDetails.length > 0) {
                    const taxValues = [];
                    const taxParams = [];

                    for (const taxDetail of taxDetails) {
                        taxValues.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, STR_TO_DATE(?, \'%Y-%m-%dT%H:%i:%s.%fZ\'), STR_TO_DATE(?, \'%Y-%m-%dT%H:%i:%s.%fZ\'), ?, ?, ?, ?, ?, ?)');
                        taxParams.push(
                            taxDetail.id || taxDetail.orderitemstaxdetailsid,
                            item.orderitemsdetailsid, // Client item ID
                            serverOrderItemsDetailsId, // Server item ID
                            order.orderid, // Client order ID
                            serverOrderId, // Server order ID
                            taxDetail.locationid,
                            taxDetail.taxid,
                            taxDetail.taxamount,
                            taxDetail.taxpercentage,
                            taxDetail.isdeleted || 0,
                            taxDetail.uniquekey || order.uniquekey,
                            taxDetail.companyid || order.companyid || 0,
                            taxDetail.createddate || null,
                            taxDetail.modifieddate || null,
                            taxDetail.createdby || null,
                            taxDetail.modifiedby || null,
                            null,
                            null, // Server createddate
                            null,
                            null // Server modifieddate
                        );
                    }

                    if (taxValues.length > 0) {
                        const taxQuery = `
                            INSERT INTO purchaseorderitemstaxdetails (
                                orderitemstaxdetailsid, orderitemsdetailsid, serverorderitemsdetailsid,
                                orderid, serverorderid, locationid, taxid, taxamount, taxpercentage,
                                isdeleted, uniquekey, companyid, clientcreateddate, clientmodifieddate,
                                clientcreatedby, clientmodifiedby, createdby, createddate, modifiedby, modifieddate
                            ) VALUES ${taxValues.join(', ')}
                        `;

                        await connection.execute(taxQuery, taxParams);
                    }
                }
            }
        }
    },

    async updatePurchaseOrder(connection, order) {
        const convertDateToMySQL = (dateStr) => {
            if (!dateStr || dateStr.toString().trim() === "") return null;

            const str = dateStr.toString().trim();
            // Check if already in YYYY-MM-DD format
            if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

            // Convert DD/MM/YYYY to YYYY-MM-DD (with forward slash)
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
                const [day, month, year] = str.split("/");
                return `${year}-${month}-${day}`;
            }

            // Convert DD-MM-YYYY to YYYY-MM-DD (with hyphen)
            if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
                const [day, month, year] = str.split("-");
                return `${year}-${month}-${day}`;
            }

            return null;
        };
        // Update purchase order master
        const updateOrderQuery = `
            UPDATE purchaseordermaster
            SET totalamount = ?, discounttype = ?, discountpercentamt = ?, totaltaxableamount = ?,
                additionalcharge = ?, roundoffamount = ?, totalcessamt = ?, totaltax = ?,
                grandtotal = ?, orderstatus = ?, potype = ?, remarks = ?,
                referencebillnumber = ?, referencechallannumber = ?, expectedorderdate = STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'),
                modifiedby = ?, modifieddate = ?, clientmodifiedby = ?, clientmodifieddate = STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'),
                isdeleted = ?, smuniquekey = ?
            WHERE uniquekey = ?
        `;

        await connection.execute(updateOrderQuery, [
            order.totalamount,
            order.discounttype || 0,
            order.discountpercentamt || 0,
            order.totaltaxableamount,
            order.additionalcharge || 0,
            order.roundoffamount || 0,
            order.totalcessamt || 0,
            order.totaltax || 0,
            order.grandtotal,
            order.orderstatus || 0,
            order.potype || 0,
            order.remarks || "",
            order.referencebillnumber || "",
            order.referencechallannumber || "0",
            order.expectedorderdate || null,
            null,
            null,
            order.modifiedby || null,
            order.modifieddate || null,
            order.isdeleted || 0,
            order.smuniquekey || null,
            order.uniquekey,
        ]);

        // Get server order id
        const [orderResult] = await connection.execute(
            "SELECT id FROM purchaseordermaster WHERE uniquekey = ?",
            [order.uniquekey]
        );
        const serverOrderId = orderResult[0].id;

        // Update purchase order items
        const itemsData = order.purchaseOrderItemsDetails;
        if (itemsData && itemsData.length > 0) {
            for (const item of itemsData) {
                // Check if item exists
                const [existingItem] = await connection.execute(
                    "SELECT id FROM purchaseorderitemsdetails WHERE uniquekey = ? AND orderitemsdetailsid = ?",
                    [order.uniquekey, item.orderitemsdetailsid]
                );

                if (existingItem.length > 0) {
                    // Update existing item
                    const updateItemQuery = `
                        UPDATE purchaseorderitemsdetails
                        SET lastprice = ?, unitprice = ?, baseprice = ?, quantity = ?, totalamount = ?,
                            discountpercent = ?, discountamount = ?, taxableamount = ?, cessamount = ?,
                            cesspercent = ?, taxamount = ?, totaltaxamount = ?, expirydate = ?,
                            remarks = ?, batchid = ?, batchdate = ?, modifiedby = ?, modifieddate = ?,
                            clientmodifiedby = ?, clientmodifieddate = STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), isdeleted = ?,
                            fatvalue = ?, effectiveid = ?
                        WHERE uniquekey = ? AND orderitemsdetailsid = ?
                    `;

                    await connection.execute(updateItemQuery, [
                        item.lastprice || null,
                        item.unitprice,
                        item.baseprice || null,
                        item.quantity,
                        item.totalamount,
                        item.discountpercent || 0,
                        item.discountamount || 0,
                        item.taxableamount,
                        item.cessamount || null,
                        item.cesspercent || null,
                        item.taxamount || 0,
                        item.totaltaxamount || 0,
                        convertDateToMySQL(item.expirydate),
                        item.remarks || "",
                        item.batchid || null,
                        convertDateToMySQL(item.batchdate),
                        null,
                        null,
                        item.modifiedby || null,
                        item.modifieddate || null,
                        item.isdeleted || 0,
                        item.fatvalue || null,
                        item.effectiveid || null,
                        order.uniquekey,
                        item.orderitemsdetailsid,
                    ]);

                    const serverOrderItemsDetailsId = existingItem[0].id;

                    // Update item tax details
                    const taxDetails = item.purchaseOrderItemsTaxDetails;
                    if (taxDetails && taxDetails.length > 0) {
                        for (const taxDetail of taxDetails) {
                            const taxId = taxDetail.id || taxDetail.orderitemstaxdetailsid;

                            // Check if tax detail exists
                            const [existingTax] = await connection.execute(
                                "SELECT id FROM purchaseorderitemstaxdetails WHERE uniquekey = ? AND orderitemstaxdetailsid = ? AND orderitemsdetailsid = ?",
                                [order.uniquekey, taxId, item.orderitemsdetailsid]
                            );

                            if (existingTax.length > 0) {
                                // Update existing tax detail
                                const updateTaxQuery = `
                                    UPDATE purchaseorderitemstaxdetails
                                    SET taxamount = ?, taxpercentage = ?, modifiedby = ?, modifieddate = ?,
                                        clientmodifiedby = ?, clientmodifieddate = STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), isdeleted = ?
                                    WHERE uniquekey = ? AND orderitemstaxdetailsid = ? AND orderitemsdetailsid = ?
                                `;

                                await connection.execute(updateTaxQuery, [
                                    taxDetail.taxamount,
                                    taxDetail.taxpercentage,
                                    null,
                                    null,
                                    taxDetail.modifiedby || null,
                                    taxDetail.modifieddate || null,
                                    taxDetail.isdeleted || 0,
                                    order.uniquekey,
                                    taxId,
                                    item.orderitemsdetailsid,
                                ]);
                            } else {
                                // Insert new tax detail
                                const insertTaxQuery = `
                                    INSERT INTO purchaseorderitemstaxdetails (
                                        orderitemstaxdetailsid, orderitemsdetailsid, serverorderitemsdetailsid,
                                        orderid, serverorderid, locationid, taxid, taxamount, taxpercentage,
                                        isdeleted, uniquekey, companyid, clientcreateddate, clientmodifieddate,
                                        clientcreatedby, clientmodifiedby, createdby, createddate, modifiedby, modifieddate
                                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), ?, ?, ?, ?, ?, ?)
                                `;

                                await connection.execute(insertTaxQuery, [
                                    taxId,
                                    item.orderitemsdetailsid,
                                    serverOrderItemsDetailsId,
                                    order.orderid,
                                    serverOrderId,
                                    taxDetail.locationid,
                                    taxDetail.taxid,
                                    taxDetail.taxamount,
                                    taxDetail.taxpercentage,
                                    taxDetail.isdeleted || 0,
                                    taxDetail.uniquekey || order.uniquekey,
                                    taxDetail.companyid || order.companyid || 0,
                                    taxDetail.createddate || null,
                                    taxDetail.modifieddate || null,
                                    taxDetail.createdby || null,
                                    taxDetail.modifiedby || null,
                                    null,
                                    null,
                                    null,
                                    null,
                                ]);
                            }
                        }
                    }
                } else {
                    // Insert new item
                    const insertItemQuery = `
                        INSERT INTO purchaseorderitemsdetails (
                            orderitemsdetailsid, serverorderid, orderid, itemid, fatvalue, effectiveid,
                            productuniquekey, taxprofileid, locationid, uomid, lastprice, unitprice,
                            baseprice, quantity, totalamount, discountpercent, discountamount,
                            taxableamount, cessamount, cesspercent, taxamount, totaltaxamount,
                            expirydate, islabelprinted, isdeleted, ipaddress, remarks, batchid,
                            batchdate, uniquekey, companyid, clientcreateddate, clientmodifieddate,
                            clientcreatedby, clientmodifiedby, createdby, createddate, modifiedby, modifieddate
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), ?, ?, ?, ?, ?, ?)
                    `;

                    const [newItemResult] = await connection.execute(insertItemQuery, [
                        item.orderitemsdetailsid,
                        serverOrderId,
                        order.orderid,
                        item.itemid,
                        item.fatvalue || null,
                        item.effectiveid || null,
                        item.productuniquekey || null,
                        item.taxprofileid || null,
                        item.locationid,
                        item.uomid || null,
                        item.lastprice || null,
                        item.unitprice,
                        item.baseprice || null,
                        item.quantity,
                        item.totalamount,
                        item.discountpercent || 0,
                        item.discountamount || 0,
                        item.taxableamount,
                        item.cessamount || null,
                        item.cesspercent || null,
                        item.taxamount || 0,
                        item.totaltaxamount || 0,
                        // item.expirydate || null,
                        convertDateToMySQL(item.expirydate),

                        item.islabelprinted || null,
                        item.isdeleted || 0,
                        item.ipaddress || order.ipaddress,
                        item.remarks || "",
                        item.batchid || null,
                        // item.batchdate || null,
                        convertDateToMySQL(item.batchdate),
                        item.uniquekey || order.uniquekey,
                        item.companyid || order.companyid || 0,
                        item.createddate || null,
                        item.modifieddate || null,
                        item.createdby || null,
                        item.modifiedby || null,
                        null,
                        null,
                        null,
                        null,
                    ]);

                    const serverOrderItemsDetailsId = newItemResult.insertId;

                    // Insert tax details for new item
                    const taxDetails = order.purchaseOrderItemsTaxDetails;
                    if (taxDetails && taxDetails.length > 0) {
                        const itemTaxDetails = taxDetails.filter(
                            (tax) => tax.orderitemsdetailsid === item.orderitemsdetailsid
                        );

                        for (const taxDetail of itemTaxDetails) {
                            const taxQuery = `
                                INSERT INTO purchaseorderitemstaxdetails (
                                    orderitemstaxdetailsid, orderitemsdetailsid, serverorderitemsdetailsid,
                                    orderid, serverorderid, locationid, taxid, taxamount, taxpercentage,
                                    isdeleted, uniquekey, companyid, clientcreateddate, clientmodifieddate,
                                    clientcreatedby, clientmodifiedby, createdby, createddate, modifiedby, modifieddate
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), ?, ?, ?, ?, ?, ?)
                            `;

                            await connection.execute(taxQuery, [
                                taxDetail.id || taxDetail.orderitemstaxdetailsid,
                                item.orderitemsdetailsid,
                                serverOrderItemsDetailsId,
                                order.orderid,
                                serverOrderId,
                                taxDetail.locationid,
                                taxDetail.taxid,
                                taxDetail.taxamount,
                                taxDetail.taxpercentage,
                                taxDetail.isdeleted || 0,
                                taxDetail.uniquekey || order.uniquekey,
                                taxDetail.companyid || order.companyid || 0,
                                taxDetail.createddate || null,
                                taxDetail.modifieddate || null,
                                taxDetail.createdby || null,
                                taxDetail.modifiedby || null,
                                null,
                                null,
                                null,
                                null,
                            ]);
                        }
                    }
                }
            }
        }

        return 1;
    },
};

module.exports = purchaseOrderModel;
