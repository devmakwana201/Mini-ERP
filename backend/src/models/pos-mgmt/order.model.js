const db = require("../../config/db");
const winston = require("../../config/winston");
const { retryTransaction } = require("../../utils/dbRetry");

// Helper function to convert undefined to null for MySQL binding
const toNull = (value) => (value === undefined ? null : value);

const orderModel = {
    async saveOrder(orderData) {        
        // Use retry logic for deadlock handling
        try {
            return await retryTransaction(
                async (connection) => {
                    const currDate = new Date().toISOString().slice(0, 19).replace("T", " ");

                    // Check if order already exists with NOWAIT to fail fast on lock
                    let existingOrder;
                    try {
                        [existingOrder] = await connection.execute(
                            "SELECT uniquekey FROM ordermaster WHERE uniquekey = ? AND isdeleted = 0 FOR UPDATE NOWAIT",
                            [orderData.uniquekey]
                        );
                    } catch (err) {
                        // If NOWAIT fails, fall back to regular FOR UPDATE with timeout
                        if (err.errno === 3572) { // ER_LOCK_NOWAIT
                            [existingOrder] = await connection.execute(
                                "SELECT uniquekey FROM ordermaster WHERE uniquekey = ? AND isdeleted = 0 FOR UPDATE",
                                [orderData.uniquekey]
                            );
                        } else {
                            throw err;
                        }
                    }

                    if (existingOrder.length > 0) {
                        // Update existing order                        
                        const updateResult = await this.updateOrder(connection, orderData, currDate);
                        return { success: true, msg: "Order updated successfully", issynced: updateResult };
                    } else {
                        // Insert new order                        
                        await this.insertOrder(connection, orderData, currDate);
                        return { success: true, msg: "Order saved successfully", issynced: 1 };
                    }
                },
                {
                    maxRetries: 3,
                    operationName: `Order save (${orderData.uniquekey})`,
                }
            );
        } catch (error) {
            winston.error(`Error saving order: ${error.message}`, {
                source: "order.model.js",
                function: "saveOrder",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                uniquekey: orderData.uniquekey
            });
            return { success: false, msg: "Failed to save order", error: error.message };
        }
    },

    async insertOrder(connection, order, currDate) {
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
        // Insert order master - with dual ID system (client timestamp columns not yet in schema)
        const orderQuery = `
            INSERT INTO ordermaster (
                orderid, billno, customerid, customeruniquekey, homedeliveryaddress,
                orderdate, amount, discountamount, taxableamount, totaltaxamount,
                roundoff, billprintcount, totalcharges,
                grandtotal, ordertype, remarks,
                shiftid, createdby, createddate, modifiedby, modifieddate,
                isdeleted, posid, locationid, companyid,
                discountreasonid, ipaddress,
                datekey, uniquekey, isreturn, ismodified, isadvance, reservationdate, isonline,
                onlineorderid, channel, reprintremark
            ) VALUES (?, ?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%sZ'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // Prepare values array - updated for new payload structure
        const orderValues = [
            order.orderid ?? null, // Client order ID
            order.billno ?? null,
            order.customerid && order.customerid !== 0 ? order.customerid : null, // Convert 0 to null
            order.customeruniquekey ?? 0,
            order.homedeliveryaddress ?? null,
            order.orderdate ?? null,
            order.amount ?? null,
            order.discountamount ?? null,
            order.taxableamount ?? null,
            order.totaltaxamount ?? null,
            order.roundoff ?? null,
            order.billprintcount ?? null,
            order.totalcharges ?? null,
            order.grandtotal ?? null,
            order.ordertype ?? null,
            order.remarks ?? null,
            order.shiftid ?? null,
            order.createdby ?? 1, // Use client createdby or default to 1
            currDate, // Server createddate
            order.modifiedby ?? null,
            currDate, // Server modifieddate
            order.isdeleted ?? 0,
            order.posid ?? null,
            order.locationid ?? null,
            order.companyid ?? null,
            order.discountreasonid ?? null,
            order.ipaddress ?? null,
            order.datekey ?? null,
            order.uniquekey ?? null,
            order.isreturn ?? 0,
            order.ismodified ?? null,
            order.isadvance ?? 0,
            order.reservationdate ?? null,
            order.isonline ?? 0,
            order.onlineorderid ?? null,
            order.channel ?? null,
            order.reprintremark ?? null,
        ];

        [orderResult] = await connection.execute(orderQuery, orderValues);

        const serverOrderId = orderResult.insertId;

        // Insert order invoice if provided
        if (order.orderInvoice && order.orderInvoice.length > 0) {
            for (const invoice of order.orderInvoice) {
                const invoiceQuery = `
                    INSERT INTO orderinvoice (
                        invoiceid, serverorderid, orderid, uniquekey, invoicenumber, amount, discountamt, taxableamt, taxamt, grandtotal,
                        createdby, createddate, modifiedby, modifieddate, datekey, isdeleted, formatid
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                await connection.execute(invoiceQuery, [
                    invoice.invoiceid ?? null,
                    serverOrderId, // Server auto-increment ID
                    order.orderid ?? null, // Client order ID
                    invoice.uniquekey ?? null,
                    invoice.invoicenumber ?? null,
                    invoice.amount ?? null,
                    invoice.discountamt ?? null,
                    invoice.taxableamt ?? null,
                    invoice.taxamt ?? null,
                    invoice.grandtotal ?? null,
                    invoice.createdby ?? 1, // Use client createdby or default to 1
                    currDate, // Server createddate
                    invoice.modifiedby ?? null,
                    currDate, // Server modifieddate
                    invoice.datekey ?? null,
                    invoice.isdeleted ?? 0,
                    invoice.formatid ?? null,
                ]);
            }
        }

        // Insert payment details - accept both paymentMaster and paymentDetails field names
        const paymentData = order.paymentMaster || order.paymentDetails;
        if (paymentData && paymentData.length > 0) {
            // Sort payments by isdeleted
            paymentData.sort((a, b) => a.isdeleted - b.isdeleted);

            for (const payment of paymentData) {
                const paymentQuery = `
                    INSERT INTO paymentmaster (
                        serverorderid, paymentid, customerid, orderid, paymentdate, orderamount, paymentamount, dueamount,
                        shiftid, createdby, createddate, modifiedby, modifieddate,
                        isdeleted, locationid, companyid, ipaddress,
                        datekey, uniquekey
                    ) VALUES (?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%sZ'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                await connection.execute(paymentQuery, [
                    serverOrderId, // Server order ID reference
                    payment.paymentid ?? null, // Client payment ID
                    payment.customerid && payment.customerid !== 0 ? payment.customerid : null, // Convert 0 to null
                    order.orderid ?? null, // Client order ID
                    payment.paymentdate ?? null,
                    payment.orderamount ?? null,
                    payment.paymentamount ?? null,
                    payment.dueamount ?? null,
                    payment.shiftid ?? null,
                    payment.createdby ?? 1, // Use client createdby or default to 1
                    currDate, // Server createddate
                    payment.modifiedby ?? null,
                    currDate, // Server modifieddate
                    payment.isdeleted ?? 0,
                    payment.locationid ?? null,
                    payment.companyid ?? null,
                    payment.ipaddress ?? null,
                    payment.datekey ?? null,
                    payment.uniquekey ?? null,
                ]);
            }

            const [lastPaymentResult] = await connection.execute("SELECT LAST_INSERT_ID() as id");
            const serverPaymentId = lastPaymentResult[0].id;

            // Insert payment transaction details - accept both field names
            const transactionData =
                order.paymentTransactionMaster || order.paymentTransactionDetails;
            if (transactionData && transactionData.length > 0) {
                for (const transaction of transactionData) {
                    const transactionQuery = `
                        INSERT INTO paymenttransactionmaster (
                            serverpaymentid, paymenttransactionid, customerid, paymodeid, paymentid, creditamount,
                            payref, remarks, paymentdate, createdby, createddate,
                            modifiedby, modifieddate, isdeleted, locationid, companyid,
                            ipaddress, datekey, uniquekey
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%sZ'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;

                    await connection.execute(transactionQuery, [
                        serverPaymentId, // Server payment ID reference
                        transaction.paymenttransactionid ?? null, // Client transaction ID
                        transaction.customerid && transaction.customerid !== 0
                            ? transaction.customerid
                            : null, // Convert 0 to null
                        transaction.paymodeid ?? null,
                        transaction.paymentid ?? null, // Client payment ID
                        transaction.creditamount ?? null,
                        transaction.payref ?? null,
                        transaction.remarks ?? null,
                        transaction.paymentdate ?? null,
                        transaction.createdby ?? 1, // Use client createdby or default to 1
                        currDate, // Server createddate
                        transaction.modifiedby ?? null,
                        currDate, // Server modifieddate
                        transaction.isdeleted ?? 0,
                        transaction.locationid ?? null,
                        transaction.companyid ?? null,
                        transaction.ipaddress ?? null,
                        transaction.datekey ?? null,
                        transaction.uniquekey ?? null,
                    ]);
                }
            }
        }

        // Insert ticket details - accept both field names
        /*const ticketData = order.ticketMaster || order.ticketDetails;
        if (ticketData && ticketData.length > 0) {
            for (const ticket of ticketData) {
                const ticketQuery = `
                    INSERT INTO ticketmaster (
                        ticketnumber, kotprintcount, uniqueid, orderid, kitchenid, status,
                        createdby, createddate, modifiedby, modifieddate, isdeleted, locationid,
                        issync, companyid, datekey, uniquekey
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                await connection.execute(ticketQuery, [
                    ticket.ticketnumber,
                    ticket.kotprintcount,
                    ticket.uniqueid,
                    serverOrderId,
                    ticket.kitchenid,
                    ticket.status,
                    ticket.createdby,
                    currDate,
                    ticket.modifiedby,
                    ticket.modifieddate,
                    ticket.isdeleted || 0,
                    ticket.locationid,
                    0,
                    ticket.companyid,
                    ticket.datekey,
                    ticket.uniquekey,
                ]);
            }
        }*/

        // Insert order products - accept both field names
        const productData = order.orderProductDetails || order.orderProducts;
        if (productData && productData.length > 0) {
            for (const product of productData) {
                const productQuery = `
                    INSERT INTO orderproductdetails (
                        serverorderid, orderproductid, orderid, invoiceid, productid, productportionid, taxprofileid, discounttype,
                        price, purchaseprice, quantity, totalamount, discount, discountamount,
                        taxableamount, taxamount, totaltaxamount, offertypeid, batchid, batchdate,
                        createdby, offerid, createddate, modifiedby, modifieddate, isdeleted,
                        locationid, companyid, offerfrom, remarks,
                        datekey, uniquekey, discountreasonid, pmuniquekey
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                const [productResult] = await connection.execute(productQuery, [
                    serverOrderId, // Server order ID reference
                    product.orderproductid ?? null, // Client product ID
                    order.orderid ?? null, // Client order ID
                    product.invoiceid ?? null,
                    product.productid ?? null,
                    product.productportionid ?? null,
                    product.taxprofileid ?? null,
                    product.discounttype ?? null,
                    product.price ?? null,
                    product.purchaseprice ?? null,
                    product.quantity ?? null,
                    product.totalamount ?? null,
                    product.discount ?? 0,
                    product.discountamount ?? 0,
                    product.taxableamount ?? null,
                    product.taxamount ?? null,
                    product.totaltaxamount ?? null,
                    product.offertypeid ?? null,
                    product.batchid ?? null,
                    // product.batchdate ?? null,
                    convertDateToMySQL(product.batchdate),

                    1, // Server createdby
                    product.offerid ?? null,
                    currDate, // Server createddate
                    1, // Server modifiedby
                    currDate, // Server modifieddate
                    product.isdeleted ?? 0,
                    product.locationid ?? null,
                    product.companyid ?? null,
                    product.offerfrom ?? null,
                    product.remarks ?? null,
                    product.datekey ?? null,
                    product.uniquekey ?? null,
                    product.discountreasonid ?? null,
                    product.pmuniquekey ?? null,
                ]);

                const serverOrderProductId = productResult.insertId;

                // Insert product tax details - handle both nested and root level tax details
                let taxDetails = product.orderProductTaxDetails;
                if (!taxDetails && order.orderProductTaxDetails) {
                    // Filter tax details for this specific product
                    taxDetails = order.orderProductTaxDetails.filter(
                        (tax) => tax.orderproductid === product.orderproductid
                    );
                }

                // Batch insert tax details for better performance
                if (taxDetails && taxDetails.length > 0) {
                    const taxValues = [];
                    const taxParams = [];

                    for (const taxDetail of taxDetails) {
                        taxValues.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                        taxParams.push(
                            serverOrderProductId, // Server order product ID
                            taxDetail.orderproducttaxdetailsid ?? null, // Client tax detail ID
                            serverOrderId, // Server order ID
                            taxDetail.orderid ?? null, // Client order ID
                            product.orderproductid ?? null, // Client order product ID
                            taxDetail.taxprofiledetailsid ?? null,
                            taxDetail.taxid ?? null,
                            taxDetail.taxpercentage ?? 0,
                            taxDetail.taxamount ?? 0,
                            1, // Server createdby
                            currDate, // Server createddate
                            1, // Server modifiedby
                            currDate, // Server modifieddate
                            taxDetail.isdeleted ?? 0,
                            taxDetail.locationid ?? null,
                            taxDetail.companyid ?? null,
                            taxDetail.ipaddress ?? null,
                            taxDetail.uniquekey ?? null,
                            taxDetail.datekey ?? null
                        );
                    }

                    if (taxValues.length > 0) {
                        const taxQuery = `
                            INSERT INTO orderproducttaxdetails (
                                serverorderproductid, orderproducttaxdetailsid, serverorderid, orderid, orderproductid, taxprofiledetailsid, taxid, taxpercentage,
                                taxamount, createdby, createddate, modifiedby, modifieddate, isdeleted,
                                locationid, companyid, ipaddress, uniquekey, datekey
                            ) VALUES ${taxValues.join(', ')}
                        `;

                        await connection.execute(taxQuery, taxParams);
                    }
                }

                // Note: orderproductmodifiers table not included in provided schema
            }
        }
    },

    async updateOrder(connection, order, currDate) {
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
        // Update order master
        const updateOrderQuery = `
            UPDATE ordermaster 
            SET totaltaxamount = ?, grandtotal = ?, roundoff = ?, billno = ?, remarks = ?,
                ordertype = ?, billprintcount = ?, isreturn = ?, ismodified = ?, 
                modifiedby = ?, modifieddate = ?, isdeleted = ?
            WHERE uniquekey = ?
        `;

        await connection.execute(updateOrderQuery, [
            order.totaltaxamount,
            order.grandtotal,
            order.roundoff,
            order.billno,
            order.remarks,
            order.ordertype,
            order.billprintcount,
            order.isreturn,
            order.ismodified,
            order.modifiedby,
            currDate,
            order.isdeleted,
            order.uniquekey,
        ]);

        // Update order invoices if provided
        // if (order.orderInvoice && order.orderInvoice.length > 0) {
        //     for (const invoice of order.orderInvoice) {
        //         const updateInvoiceQuery = `
        //             UPDATE orderinvoice
        //             SET invoiceid = ?, invoicenumber = ?, amount = ?, discountamt = ?, taxableamt = ?,
        //                 taxamt = ?, grandtotal = ?, modifiedby = ?, modifieddate = ?, isdeleted = ?
        //             WHERE serverorderid = (SELECT id FROM ordermaster WHERE uniquekey = ?)
        //             AND invoiceid = ?
        //         `;

        //         await connection.execute(updateInvoiceQuery, [
        //             invoice.invoiceid || null,
        //             invoice.invoicenumber || null,
        //             invoice.amount || null,
        //             invoice.discountamt || null,
        //             invoice.taxableamt || null,
        //             invoice.taxamt || null,
        //             invoice.grandtotal || null,
        //             invoice.modifiedby || null,
        //             currDate,
        //             invoice.isdeleted || 0,
        //             order.uniquekey,
        //             invoice.invoiceid || null,
        //         ]);
        //     }
        // }

        // Update order products
        if (order.orderProducts && order.orderProducts.length > 0) {
            for (const product of order.orderProducts) {
                const updateProductQuery = `
                    UPDATE orderproductdetails 
                    SET totaltaxamount = ?, taxamount = ?, modifiedby = ?, 
                        modifieddate = ?, isdeleted = ?
                    WHERE uniquekey = ? AND orderproductid = ? AND orderid = ? AND locationid = ?
                `;

                await connection.execute(updateProductQuery, [
                    product.totaltaxamount,
                    product.taxamount,
                    product.modifiedby,
                    currDate,
                    product.isdeleted,
                    order.uniquekey,
                    product.orderproductid,
                    product.orderid,
                    product.locationid,
                ]);

                // Update product tax details
                if (product.orderProductTaxDetails && product.orderProductTaxDetails.length > 0) {
                    for (const taxDetail of product.orderProductTaxDetails) {
                        const updateTaxQuery = `
                            UPDATE orderproducttaxdetails 
                            SET modifiedby = ?, modifieddate = ?, isdeleted = ?
                            WHERE uniquekey = ? AND orderproducttaxdetailsid = ? AND orderproductid = ? AND locationid = ?
                        `;

                        await connection.execute(updateTaxQuery, [
                            taxDetail.modifiedby,
                            currDate,
                            taxDetail.isdeleted,
                            order.uniquekey,
                            taxDetail.orderproducttaxdetailsid,
                            taxDetail.orderproductid,
                            taxDetail.locationid,
                        ]);
                    }
                }

                // Note: Product modifiers not in provided schema
            }
        }

        // Update payment details
        if (order.paymentDetails && order.paymentDetails.length > 0) {
            for (const payment of order.paymentDetails) {
                const updatePaymentQuery = `
                    UPDATE paymentmaster 
                    SET orderamount = ?, paymentamount = ?, modifiedby = ?, 
                        modifieddate = ?, isdeleted = ?
                    WHERE uniquekey = ?
                `;

                await connection.execute(updatePaymentQuery, [
                    payment.orderamount,
                    payment.paymentamount,
                    payment.modifiedby,
                    currDate,
                    payment.isdeleted,
                    payment.uniquekey,
                ]);
            }
        }

        // Update payment transaction details
        if (order.paymentTransactionDetails && order.paymentTransactionDetails.length > 0) {
            for (const transaction of order.paymentTransactionDetails) {
                const updateTransactionQuery = `
                    UPDATE paymenttransactionmaster 
                    SET creditamount = ?, remarks = ?, payref = ?, paymodeid = ?, 
                        modifiedby = ?, modifieddate = ?, isdeleted = ?
                    WHERE uniquekey = ? AND paymenttransactionid = ? AND paymentid = ? AND locationid = ?
                `;

                await connection.execute(updateTransactionQuery, [
                    transaction.creditamount,
                    transaction.remarks,
                    transaction.payref,
                    transaction.paymodeid,
                    transaction.modifiedby,
                    currDate,
                    transaction.isdeleted,
                    order.uniquekey,
                    transaction.paymenttransactionid,
                    transaction.paymentid,
                    transaction.locationid,
                ]);
            }
        }

        // Update ticket details
        if (order.ticketDetails && order.ticketDetails.length > 0) {
            for (const ticket of order.ticketDetails) {
                const updateTicketQuery = `
                    UPDATE ticketmaster 
                    SET modifiedby = ?, modifieddate = ?, isdeleted = ?
                    WHERE uniquekey = ? AND ticketid = ? AND orderid = ? AND locationid = ?
                `;

                await connection.execute(updateTicketQuery, [
                    ticket.modifiedby,
                    currDate,
                    ticket.isdeleted,
                    order.uniquekey,
                    ticket.ticketid,
                    ticket.orderid,
                    ticket.locationid,
                ]);
            }
        }

        return 1;
    },
};

module.exports = orderModel;
