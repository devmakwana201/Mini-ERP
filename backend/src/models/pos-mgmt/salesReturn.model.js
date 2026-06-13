const db = require("../../config/db");
const winston = require("../../config/winston");
const { retryTransaction } = require("../../utils/dbRetry");

const salesReturnModel = {
    async saveSalesReturn(returnData) {
        // Use retry logic for deadlock handling
        try {
            return await retryTransaction(
                async (connection) => {
                    // Check if sales return already exists with NOWAIT
                    let existingReturn;
                    try {
                        [existingReturn] = await connection.execute(
                            "SELECT uniquekey FROM returnsaleordermaster WHERE uniquekey = ? AND isdeleted = 0 FOR UPDATE NOWAIT",
                            [returnData.uniquekey]
                        );
                    } catch (err) {
                        // If NOWAIT fails, fall back to regular FOR UPDATE
                        if (err.errno === 3572) { // ER_LOCK_NOWAIT
                            [existingReturn] = await connection.execute(
                                "SELECT uniquekey FROM returnsaleordermaster WHERE uniquekey = ? AND isdeleted = 0 FOR UPDATE",
                                [returnData.uniquekey]
                            );
                        } else {
                            throw err;
                        }
                    }

                    if (existingReturn.length > 0) {
                        // Update existing sales return
                        const updateResult = await this.updateSalesReturn(connection, returnData);
                        return {
                            success: true,
                            msg: "Sales return updated successfully",
                            issynced: updateResult,
                        };
                    } else {
                        // Insert new sales return
                        await this.insertSalesReturn(connection, returnData);
                        return { success: true, msg: "Sales return saved successfully", issynced: 1 };
                    }
                },
                {
                    maxRetries: 3,
                    operationName: `Sales return save (${returnData.uniquekey})`,
                }
            );
        } catch (error) {
            winston.error(`Error saving sales return: ${error.message}`, {
                source: "salesReturn.model.js",
                function: "saveSalesReturn",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                uniquekey: returnData.uniquekey
            });
            return { success: false, msg: "Failed to save sales return", error: error.message };
        }
    },

    async insertSalesReturn(connection, returnData) {
        const convertDateToMySQL = (dateStr) => {
            if (!dateStr || dateStr.toString().trim() === "") return null;

            const str = dateStr.toString().trim();

            // Check if already in YYYY-MM-DD format
            if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

            // Handle ISO 8601 datetime format (YYYY-MM-DDTHH:mm:ss.sssZ)
            if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
                return str.split("T")[0]; // Extract just the date part
            }

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
        let serverOrderId = null;
        if (returnData.orderid) {
            const [orderMaster] = await connection.execute(
                "SELECT id FROM ordermaster WHERE orderid = ? AND companyid = ?",
                [returnData.orderid, returnData.companyid]
            );
            if (orderMaster.length > 0) {
                serverOrderId = orderMaster[0].id;
            }
        }

        // Insert sales return master
        const returnQuery = `
            INSERT INTO returnsaleordermaster (
                returnorderid, orderid, serverorderid, creditnumber, customerid,
                returndate, amount, taxableamount, discountamount, totaltaxamount, roundoff,
                grandtotal, remarks, gtbeforesalereturn, gtaftersalereturn, companyid, locationid,
                uniquekey, omuniquekey, datekey, isdeleted, type, isexchange, issync, clientcreateddate,
                clientmodifieddate, clientcreatedby, clientmodifiedby, createdby, createddate,
                modifiedby, modifieddate
            ) VALUES (?, ?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), ?, ?, ?, ?, ?, ?)
        `;

        // Prepare values array
        const returnValues = [
            returnData.returnorderid,
            returnData.orderid || null,
            serverOrderId,
            returnData.creditnumber || null,
            returnData.customerid || null,
            returnData.returndate,
            returnData.amount || null,
            returnData.taxableamount || null,
            returnData.discountamount || null,
            returnData.totaltaxamount,
            returnData.roundoff || null,
            returnData.grandtotal || null,
            returnData.remarks || null,
            returnData.gtbeforesalereturn || null,
            returnData.gtaftersalereturn || null,
            returnData.companyid || null,
            returnData.locationid || null,
            returnData.uniquekey,
            returnData.omuniquekey || null,
            returnData.datekey || null,
            returnData.isdeleted || 0,
            returnData.type || null,
            returnData.isexchange || null,
            returnData.issync || 0,
            returnData.createddate || null,
            returnData.modifieddate || null,
            returnData.createdby || null,
            returnData.modifiedby || null,
            null,
            null, // Server createddate
            null,
            null, // Server modifieddate
        ];

        const [returnResult] = await connection.execute(returnQuery, returnValues);
        const serverReturnSaleOrderId = returnResult.insertId;

        // Insert sales return product details
        const productsData = returnData.salesReturnProductDetails;
        if (productsData && productsData.length > 0) {
            for (const product of productsData) {
                const productQuery = `
                    INSERT INTO returnsaleorderproductdetails (
                        returnsaleorderproductid, serverreturnsaleorderid, returnsaleorderid, productid,
                        unitprice, orderedquantity, returnquantity, wastagequantity, totalamount,
                        discountamount, taxableamount, taxamount, totaltaxamount, batchid, batchdate,
                        locationid, uniquekey, pmuniquekey, datekey, companyid, isdeleted, clientcreateddate,
                        clientmodifieddate, clientcreatedby, clientmodifiedby, createdby, createddate,
                        modifiedby, modifieddate
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), ?, ?, ?, ?, ?, ?)
                `;

                const [productResult] = await connection.execute(productQuery, [
                    product.returnsaleorderproductid,
                    serverReturnSaleOrderId, // Server return ID reference
                    returnData.returnorderid, // Client return ID
                    product.productid || null,
                    product.unitprice || null,
                    product.orderedquantity || null,
                    product.returnquantity || null,
                    product.wastagequantity || null,
                    product.totalamount || null,
                    product.discountamount || null,
                    product.taxableamount || null,
                    product.taxamount || null,
                    product.totaltaxamount || null,
                    product.batchid || null,
                    // product.batchdate || null,
                    convertDateToMySQL(product.batchdate),
                    product.locationid || null,
                    product.uniquekey || returnData.uniquekey,
                    product.pmuniquekey || null,
                    product.datekey || null,
                    product.companyid || returnData.companyid || null,
                    product.isdeleted || 0,
                    product.createddate || null,
                    product.modifieddate || null,
                    product.createdby || null,
                    product.modifiedby || null,
                    null,
                    null, // Server createddate
                    null,
                    null, // Server modifieddate
                ]);

                const serverReturnSaleOrderProductId = productResult.insertId;

                // Insert product tax details for this product
                const taxDetails = returnData.salesReturnProductTaxDetails;
                if (taxDetails && taxDetails.length > 0) {
                    // Filter tax details for this specific product (use == for type coercion)
                    const productTaxDetails = taxDetails.filter(
                        (tax) => tax.returnsaleorderproductid == product.returnsaleorderproductid
                    );

                    for (const taxDetail of productTaxDetails) {
                        const taxQuery = `
                            INSERT INTO returnorderproducttaxdetails (
                                returnorderproducttaxdetailsid, returnsaleorderid, serverreturnsaleorderid,
                                returnsaleorderproductid, serverreturnsaleorderproductid,
                                returnorderproducttaxdetailscol, taxprofiledetailsid, taxid, taxpercentage,
                                taxamount, locationid, companyid, uniquekey, datekey, isdeleted,
                                clientcreateddate, clientmodifieddate, clientcreatedby, clientmodifiedby,
                                createdby, createddate, modifiedby, modifieddate
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), ?, ?, ?, ?, ?, ?)
                        `;

                        await connection.execute(taxQuery, [
                            taxDetail.returnorderproducttaxdetailsid || null,
                            returnData.returnorderid, // Client return ID
                            serverReturnSaleOrderId, // Server return ID
                            product.returnsaleorderproductid, // Client product ID
                            serverReturnSaleOrderProductId, // Server product ID
                            taxDetail.returnorderproducttaxdetailscol || null,
                            taxDetail.taxprofiledetailsid || null,
                            taxDetail.taxid || null,
                            taxDetail.taxpercentage || null,
                            taxDetail.taxamount || null,
                            taxDetail.locationid || null,
                            taxDetail.companyid || returnData.companyid || null,
                            taxDetail.uniquekey || returnData.uniquekey,
                            taxDetail.datekey || null,
                            taxDetail.isdeleted || 0,
                            taxDetail.createddate || null,
                            taxDetail.modifieddate || null,
                            taxDetail.createdby || null,
                            taxDetail.modifiedby || null,
                            null,
                            null, // Server createddate
                            null,
                            null, // Server modifieddate
                        ]);
                    }
                }
            }
        }

        const paymentsData = returnData.salesReturnPayments;
        if (paymentsData && paymentsData.length > 0) {
            for (const payment of paymentsData) {
                const paymentQuery = `
                    INSERT INTO returnpaymentmaster (
                        returnpaymentid, returnorderid, serverreturnorderid, paymentmodeid,
                        returnorderamount, returnpaymentamount, returnremarks, locationid,
                        companyid, datekey, uniquekey, isdeleted, clientcreateddate,
                        clientmodifieddate, clientcreatedby, clientmodifiedby, createdby, createddate,
                        modifiedby, modifieddate
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), ?, ?, ?, ?, ?, ?)
                `;

                await connection.execute(paymentQuery, [
                    payment.returnpaymentid,
                    payment.returnorderid,
                    serverReturnSaleOrderId, // Server return ID reference
                    payment.paymentmodeid || null,
                    payment.returnorderamount || null,
                    payment.returnpaymentamount || null,
                    payment.returnremarks || null,
                    payment.locationid || null,
                    payment.companyid || null,
                    payment.datekey || null,
                    payment.uniquekey || null,
                    payment.isdeleted || 0,
                    payment.createddate || null,
                    payment.modifieddate || null,
                    payment.createdby || null,
                    payment.modifiedby || null,
                    null, // server createdby
                    null, // server createddate
                    null, // server modifiedby
                    null, // server modifieddate
                ]);
            }
        }
    },

    async updateSalesReturn(connection, returnData) {
        const convertDateToMySQL = (dateStr) => {
            if (!dateStr || dateStr.toString().trim() === "") return null;

            const str = dateStr.toString().trim();

            // Check if already in YYYY-MM-DD format
            if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

            // Handle ISO 8601 datetime format (YYYY-MM-DDTHH:mm:ss.sssZ)
            if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
                return str.split("T")[0]; // Extract just the date part
            }

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
        // Update sales return master
        const updateReturnQuery = `
            UPDATE returnsaleordermaster
            SET amount = ?, taxableamount = ?, discountamount = ?, totaltaxamount = ?,
                roundoff = ?, grandtotal = ?, remarks = ?, gtbeforesalereturn = ?,
                gtaftersalereturn = ?, creditnumber = ?, type = ?, isexchange = ?,
                returndate = STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), modifiedby = ?, modifieddate = ?,
                clientmodifiedby = ?, clientmodifieddate = STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), isdeleted = ?
            WHERE uniquekey = ?
        `;

        await connection.execute(updateReturnQuery, [
            returnData.amount || null,
            returnData.taxableamount || null,
            returnData.discountamount || null,
            returnData.totaltaxamount,
            returnData.roundoff || null,
            returnData.grandtotal || null,
            returnData.remarks || null,
            returnData.gtbeforesalereturn || null,
            returnData.gtaftersalereturn || null,
            returnData.creditnumber || null,
            returnData.type || null,
            returnData.isexchange || null,
            returnData.returndate || null,
            null,
            null,
            returnData.modifiedby || null,
            returnData.modifieddate || null,
            returnData.isdeleted || 0,
            returnData.uniquekey,
        ]);

        // Get server return id
        const [returnResult] = await connection.execute(
            "SELECT id FROM returnsaleordermaster WHERE uniquekey = ?",
            [returnData.uniquekey]
        );
        const serverReturnSaleOrderId = returnResult[0].id;

        // Update sales return products
        const productsData = returnData.salesReturnProductDetails;
        if (productsData && productsData.length > 0) {
            for (const product of productsData) {
                // Check if product exists
                const [existingProduct] = await connection.execute(
                    "SELECT id FROM returnsaleorderproductdetails WHERE uniquekey = ? AND returnsaleorderproductid = ?",
                    [returnData.uniquekey, product.returnsaleorderproductid]
                );

                if (existingProduct.length > 0) {
                    // Update existing product
                    const updateProductQuery = `
                        UPDATE returnsaleorderproductdetails
                        SET unitprice = ?, orderedquantity = ?, returnquantity = ?, wastagequantity = ?,
                            totalamount = ?, discountamount = ?, taxableamount = ?, taxamount = ?,
                            totaltaxamount = ?, batchid = ?, batchdate = ?, modifiedby = ?,
                            modifieddate = ?, clientmodifiedby = ?, clientmodifieddate = STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'),
                            isdeleted = ?
                        WHERE uniquekey = ? AND returnsaleorderproductid = ?
                    `;

                    await connection.execute(updateProductQuery, [
                        product.unitprice || null,
                        product.orderedquantity || null,
                        product.returnquantity || null,
                        product.wastagequantity || null,
                        product.totalamount || null,
                        product.discountamount || null,
                        product.taxableamount || null,
                        product.taxamount || null,
                        product.totaltaxamount || null,
                        product.batchid || null,
                        // product.batchdate || null,
                        convertDateToMySQL(product.batchdate),
                        null,
                        null,
                        product.modifiedby || null,
                        product.modifieddate || null,
                        product.isdeleted || 0,
                        returnData.uniquekey,
                        product.returnsaleorderproductid,
                    ]);

                    const serverReturnSaleOrderProductId = existingProduct[0].id;

                    // Update product tax details
                    const taxDetails = returnData.salesReturnProductTaxDetails;
                    if (taxDetails && taxDetails.length > 0) {
                        // Filter tax details for this specific product
                        const productTaxDetails = taxDetails.filter(
                            (tax) =>
                                tax.returnsaleorderproductid == product.returnsaleorderproductid
                        );

                        for (const taxDetail of productTaxDetails) {
                            const taxId = taxDetail.returnorderproducttaxdetailsid;

                            // Check if tax detail exists
                            const [existingTax] = await connection.execute(
                                "SELECT id FROM returnorderproducttaxdetails WHERE uniquekey = ? AND returnorderproducttaxdetailsid = ? AND returnsaleorderproductid = ?",
                                [returnData.uniquekey, taxId, product.returnsaleorderproductid]
                            );

                            if (existingTax.length > 0) {
                                // Update existing tax detail
                                const updateTaxQuery = `
                                    UPDATE returnorderproducttaxdetails
                                    SET taxpercentage = ?, taxamount = ?, modifiedby = ?, modifieddate = ?,
                                        clientmodifiedby = ?, clientmodifieddate = STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'),
                                        isdeleted = ?
                                    WHERE uniquekey = ? AND returnorderproducttaxdetailsid = ? AND returnsaleorderproductid = ?
                                `;

                                await connection.execute(updateTaxQuery, [
                                    taxDetail.taxpercentage || null,
                                    taxDetail.taxamount || null,
                                    null,
                                    null,
                                    taxDetail.modifiedby || null,
                                    taxDetail.modifieddate || null,
                                    taxDetail.isdeleted || 0,
                                    returnData.uniquekey,
                                    taxId,
                                    product.returnsaleorderproductid,
                                ]);
                            } else {
                                // Insert new tax detail
                                const insertTaxQuery = `
                                    INSERT INTO returnorderproducttaxdetails (
                                        returnorderproducttaxdetailsid, returnsaleorderid, serverreturnsaleorderid,
                                        returnsaleorderproductid, serverreturnsaleorderproductid,
                                        returnorderproducttaxdetailscol, taxprofiledetailsid, taxid, taxpercentage,
                                        taxamount, locationid, companyid, uniquekey, datekey, isdeleted,
                                        clientcreateddate, clientmodifieddate, clientcreatedby, clientmodifiedby,
                                        createdby, createddate, modifiedby, modifieddate
                                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), ?, ?, ?, ?, ?, ?)
                                `;

                                await connection.execute(insertTaxQuery, [
                                    taxId,
                                    returnData.returnorderid,
                                    serverReturnSaleOrderId,
                                    product.returnsaleorderproductid,
                                    serverReturnSaleOrderProductId,
                                    taxDetail.returnorderproducttaxdetailscol || null,
                                    taxDetail.taxprofiledetailsid || null,
                                    taxDetail.taxid || null,
                                    taxDetail.taxpercentage || null,
                                    taxDetail.taxamount || null,
                                    taxDetail.locationid || null,
                                    taxDetail.companyid || returnData.companyid || null,
                                    taxDetail.uniquekey || returnData.uniquekey,
                                    taxDetail.datekey || null,
                                    taxDetail.isdeleted || 0,
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
                    // Insert new product
                    const insertProductQuery = `
                        INSERT INTO returnsaleorderproductdetails (
                            returnsaleorderproductid, serverreturnsaleorderid, returnsaleorderid, productid,
                            unitprice, orderedquantity, returnquantity, wastagequantity, totalamount,
                            discountamount, taxableamount, taxamount, totaltaxamount, batchid, batchdate,
                            locationid, uniquekey, pmuniquekey, datekey, companyid, isdeleted, clientcreateddate,
                            clientmodifieddate, clientcreatedby, clientmodifiedby, createdby, createddate,
                            modifiedby, modifieddate
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), ?, ?, ?, ?, ?, ?)
                    `;

                    const [newProductResult] = await connection.execute(insertProductQuery, [
                        product.returnsaleorderproductid,
                        serverReturnSaleOrderId,
                        returnData.returnorderid,
                        product.productid || null,
                        product.unitprice || null,
                        product.orderedquantity || null,
                        product.returnquantity || null,
                        product.wastagequantity || null,
                        product.totalamount || null,
                        product.discountamount || null,
                        product.taxableamount || null,
                        product.taxamount || null,
                        product.totaltaxamount || null,
                        product.batchid || null,
                        // product.batchdate || null,
                        convertDateToMySQL(product.batchdate),
                        product.locationid || null,
                        product.uniquekey || returnData.uniquekey,
                        product.pmuniquekey || null,
                        product.datekey || null,
                        product.companyid || returnData.companyid || null,
                        product.isdeleted || 0,
                        product.createddate || null,
                        product.modifieddate || null,
                        product.createdby || null,
                        product.modifiedby || null,
                        null,
                        null,
                        null,
                        null,
                    ]);

                    const serverReturnSaleOrderProductId = newProductResult.insertId;

                    // Insert tax details for new product
                    const taxDetails = returnData.salesReturnProductTaxDetails;
                    if (taxDetails && taxDetails.length > 0) {
                        const productTaxDetails = taxDetails.filter(
                            (tax) =>
                                tax.returnsaleorderproductid == product.returnsaleorderproductid
                        );

                        for (const taxDetail of productTaxDetails) {
                            const taxQuery = `
                                INSERT INTO returnorderproducttaxdetails (
                                    returnorderproducttaxdetailsid, returnsaleorderid, serverreturnsaleorderid,
                                    returnsaleorderproductid, serverreturnsaleorderproductid,
                                    returnorderproducttaxdetailscol, taxprofiledetailsid, taxid, taxpercentage,
                                    taxamount, locationid, companyid, uniquekey, datekey, isdeleted,
                                    clientcreateddate, clientmodifieddate, clientcreatedby, clientmodifiedby,
                                    createdby, createddate, modifiedby, modifieddate
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), ?, ?, ?, ?, ?, ?)
                            `;

                            await connection.execute(taxQuery, [
                                taxDetail.returnorderproducttaxdetailsid || null,
                                returnData.returnorderid,
                                serverReturnSaleOrderId,
                                product.returnsaleorderproductid,
                                serverReturnSaleOrderProductId,
                                taxDetail.returnorderproducttaxdetailscol || null,
                                taxDetail.taxprofiledetailsid || null,
                                taxDetail.taxid || null,
                                taxDetail.taxpercentage || null,
                                taxDetail.taxamount || null,
                                taxDetail.locationid || null,
                                taxDetail.companyid || returnData.companyid || null,
                                taxDetail.uniquekey || returnData.uniquekey,
                                taxDetail.datekey || null,
                                taxDetail.isdeleted || 0,
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

        const paymentsData = returnData.salesReturnPayments;
        if (paymentsData && paymentsData.length > 0) {
            for (const payment of paymentsData) {
                const [existingPayment] = await connection.execute(
                    "SELECT id FROM returnpaymentmaster WHERE uniquekey = ? AND returnpaymentid = ?",
                    [returnData.uniquekey, payment.returnpaymentid]
                );

                if (existingPayment.length > 0) {
                    const updatePaymentQuery = `
                        UPDATE returnpaymentmaster
                        SET returnorderamount = ?, returnpaymentamount = ?, returnremarks = ?,
                            modifiedby = ?, modifieddate = ?, clientmodifiedby = ?,
                            clientmodifieddate = STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), isdeleted = ?
                        WHERE uniquekey = ? AND returnpaymentid = ?
                    `;
                    await connection.execute(updatePaymentQuery, [
                        payment.returnorderamount || null,
                        payment.returnpaymentamount || null,
                        payment.returnremarks || null,
                        null, // server modifiedby
                        null, // server modifieddate
                        payment.modifiedby || null,
                        payment.modifieddate || null,
                        payment.isdeleted || 0,
                        returnData.uniquekey,
                        payment.returnpaymentid,
                    ]);
                } else {
                    const insertPaymentQuery = `
                        INSERT INTO returnpaymentmaster (
                            returnpaymentid, returnorderid, serverreturnorderid, paymentmodeid,
                            returnorderamount, returnpaymentamount, returnremarks, locationid,
                            companyid, datekey, uniquekey, isdeleted, clientcreateddate,
                            clientmodifieddate, clientcreatedby, clientmodifiedby, createdby, createddate,
                            modifiedby, modifieddate
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'), ?, ?, ?, ?, ?, ?)
                    `;
                    await connection.execute(insertPaymentQuery, [
                        payment.returnpaymentid,
                        payment.returnorderid,
                        serverReturnSaleOrderId, // Server return ID reference
                        payment.paymentmodeid || null,
                        payment.returnorderamount || null,
                        payment.returnpaymentamount || null,
                        payment.returnremarks || null,
                        payment.locationid || null,
                        payment.companyid || null,
                        payment.datekey || null,
                        payment.uniquekey || null,
                        payment.isdeleted || 0,
                        payment.createddate || null,
                        payment.modifieddate || null,
                        payment.createdby || null,
                        payment.modifiedby || null,
                        null, // server createdby
                        null, // server createddate
                        null, // server modifiedby
                        null, // server modifieddate
                    ]);
                }
            }
        }

        return 1;
    },
};

module.exports = salesReturnModel;
