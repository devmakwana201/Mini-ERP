const purchaseOrderModel = require("../../models/pos-mgmt/purchaseOrder.model");
const installationModel = require("../../models/pos-mgmt/installation.model");
const ResponseFormatter = require("../../utils/responseFormatter");
const { asyncHandler } = require("../../utils/asyncHandler");
const { BadRequestError } = require("../../utils/customErrors");
const winston = require("../../config/winston");
const db = require("../../config/db");

module.exports = {
    /**
     * Save Purchase Order
     * Handles both single purchase orders and bulk purchase orders
     */
    savePurchaseOrder: asyncHandler(async (req, res) => {
        const requestBody = req.body;

        // Check if this is a bulk purchase order request (array of orders) or single order
        const isBulkOrder = Array.isArray(requestBody);
        const orders = isBulkOrder ? requestBody : [requestBody];

        winston.info(`Processing ${isBulkOrder ? "bulk" : "single"} purchase order request`, {
            source: "pos-mgmt/purchaseOrder.controller.js",
            function: "savePurchaseOrder",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            orderCount: orders.length,
        });

        // Validate bulk order constraints
        if (isBulkOrder && orders.length === 0) {
            throw new BadRequestError("Bulk purchase order request cannot be empty");
        }

        if (isBulkOrder && orders.length > 100) {
            throw new BadRequestError("Maximum 100 purchase orders allowed in bulk request");
        }

        const results = [];
        const errors = [];

        // Process each purchase order
        for (let i = 0; i < orders.length; i++) {
            const orderData = orders[i];

            try {
                winston.debug(`Processing purchase order ${i + 1}/${orders.length}`, {
                    source: "pos-mgmt/purchaseOrder.controller.js",
                    function: "savePurchaseOrder",
                    endpoint: req.path,
                    method: req.method,
                    userId: req.user?.id,
                    uniquekey: orderData.uniquekey,
                    locationid: orderData.locationid,
                    companyid: orderData.companyid,
                });

                // Get POS data from token (if available)
                const posLocationId = req.pos?.locationId;
                const posCompanyId = req.pos?.companyId;
                const posProductKey = req.pos?.productKey;

                // If token is provided, validate it matches the order
                if (posLocationId && posLocationId != orderData.locationid) {
                    throw new BadRequestError(
                        `Purchase Order ${i + 1}: location does not match POS token location`
                    );
                }

                if (posCompanyId && posCompanyId != orderData.companyid) {
                    throw new BadRequestError(
                        `Purchase Order ${i + 1}: company does not match POS token company`
                    );
                }

                // If no token but productKey provided, validate the productKey belongs to the location
                if (!req.pos && orderData.productKey) {
                    const locationResult = await installationModel.getCustomers(
                        orderData.productKey
                    );

                    if (!locationResult.success || !locationResult.data) {
                        throw new BadRequestError(
                            `Purchase Order ${i + 1}: Invalid product key ${orderData.productKey}`
                        );
                    }

                    if (locationResult.data.locationid != orderData.locationid) {
                        throw new BadRequestError(
                            `Purchase Order ${i + 1}: Product key does not match order location`
                        );
                    }

                    if (locationResult.data.companyid != orderData.companyid) {
                        throw new BadRequestError(
                            `Purchase Order ${i + 1}: Product key does not match order company`
                        );
                    }
                }

                // If neither token nor productKey, log warning but allow (backward compatibility)
                if (!req.pos && !orderData.productKey) {
                    winston.warn("Purchase order saved without authentication", {
                        source: "pos-mgmt/purchaseOrder.controller.js",
                        function: "savePurchaseOrder",
                        endpoint: req.path,
                        method: req.method,
                        userId: req.user?.id,
                        uniquekey: orderData.uniquekey,
                        locationid: orderData.locationid,
                        ip: req.ip,
                    });
                }

                // Process individual purchase order
                const result = await purchaseOrderModel.savePurchaseOrder(orderData);

                if (result.success) {
                    results.push({
                        uniquekey: orderData.uniquekey,
                        success: true,
                        issynced: result.issynced,
                        message: result.msg,
                    });
                } else {
                    errors.push({
                        uniquekey: orderData.uniquekey,
                        success: false,
                        message: result.msg,
                        error: result.error,
                    });
                }
            } catch (error) {
                winston.error(`Message: ${error.message}`, {
                    source: "purchaseOrder.controller.js",
                    function: "savePurchaseOrder",
                    endpoint: req.path,
                    method: req.method,
                    userId: req.user?.id || req.userId,
                    uniquekey: orderData.uniquekey,
                    error: error.message,
                    code: error.code,
                    errno: error.errno,
                    stack: error.stack
                });

                errors.push({
                    uniquekey: orderData.uniquekey,
                    success: false,
                    message: error.message,
                    error: error.stack,
                });
            }
        }

        // Prepare response
        const totalOrders = orders.length;
        const successfulOrders = results.length;
        const failedOrders = errors.length;

        winston.info(`Purchase order processing completed: ${successfulOrders}/${totalOrders} successful`, {
            source: "pos-mgmt/purchaseOrder.controller.js",
            function: "savePurchaseOrder",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
        });

        // Return appropriate response based on results
        if (isBulkOrder) {
            const responseData = {
                summary: {
                    totalOrders: totalOrders,
                    successfulOrders: successfulOrders,
                    failedOrders: failedOrders,
                    processingType: "BULK",
                },
                results: results,
                errors: errors,
            };

            if (failedOrders === 0) {
                // All orders successful
                return res
                    .status(200)
                    .json(
                        ResponseFormatter.success(
                            responseData,
                            `All ${totalOrders} purchase orders processed successfully`
                        )
                    );
            } else if (successfulOrders === 0) {
                // All orders failed
                return res
                    .status(400)
                    .json(
                        ResponseFormatter.error(
                            `All ${totalOrders} purchase orders failed to process`,
                            400,
                            responseData
                        )
                    );
            } else {
                // Partial success
                return res
                    .status(207)
                    .json(
                        ResponseFormatter.multiStatus(
                            responseData,
                            `${successfulOrders}/${totalOrders} purchase orders processed successfully`
                        )
                    );
            }
        } else {
            // Single purchase order response (backward compatibility)
            if (results.length > 0) {
                return res.status(200).json(
                    ResponseFormatter.success(
                        {
                            uniquekey: results[0].uniquekey,
                            issynced: results[0].issynced,
                        },
                        results[0].message
                    )
                );
            } else {
                return res
                    .status(400)
                    .json(ResponseFormatter.error(errors[0].message, 400, errors[0].error));
            }
        }
    }),

    /**
     * Get Purchase Order Status
     * Check if purchase order exists and get basic info
     */
    getPurchaseOrderStatus: asyncHandler(async (req, res) => {
        const { uniquekey } = req.params;

        if (!uniquekey) {
            throw new BadRequestError("Purchase order uniquekey is required");
        }

        // Get POS data from token for validation
        const posLocationId = req.pos?.locationId;
        const posCompanyId = req.pos?.companyId;

        try {
            let query = `
                SELECT id, orderid, locationid, supplierid, ordernumber, datekey,
                       referencebillnumber, referencechallannumber, purchaseorderdate,
                       expectedorderdate, remarks, totalamount, discounttype,
                       discountpercentamt, totaltaxableamount, additionalcharge, roundoffamount,
                       totalcessamt, totaltax, grandtotal, orderstatus, potype, isdeleted,
                       ipaddress, companyid, uniquekey, createddate, modifieddate
                FROM purchaseordermaster
                WHERE uniquekey = ?
            `;
            let params = [uniquekey];

            // Add location/company filters if POS token is present
            if (posLocationId) {
                query += " AND locationid = ?";
                params.push(posLocationId);
            }

            if (posCompanyId) {
                query += " AND companyid = ?";
                params.push(posCompanyId);
            }

            const [orders] = await db.getResults(query, params);

            if (orders.length === 0) {
                return res.status(404).json(ResponseFormatter.error("Purchase order not found"));
            }

            const order = orders[0];
            winston.debug(`Purchase order status retrieved`, {
                source: "pos-mgmt/purchaseOrder.controller.js",
                function: "getPurchaseOrderStatus",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                uniquekey,
                orderid: order.orderid,
            });

            return res
                .status(200)
                .json(ResponseFormatter.success(order, "Purchase order status retrieved successfully"));
        } catch (error) {
            winston.error(`Message: ${error.message}`, {
                source: "purchaseOrder.controller.js",
                function: "getPurchaseOrderStatus",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id || req.userId,
                uniquekey: uniquekey,
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return res
                .status(500)
                .json(ResponseFormatter.serverError("Failed to get purchase order status"));
        }
    }),

    /**
     * Get Purchase Order Details
     * Get complete purchase order information including items and tax details
     */
    getPurchaseOrderDetails: asyncHandler(async (req, res) => {
        const { uniquekey } = req.params;

        if (!uniquekey) {
            throw new BadRequestError("Purchase order uniquekey is required");
        }

        // Get POS data from token for validation
        const posLocationId = req.pos?.locationId;
        const posCompanyId = req.pos?.companyId;

        try {
            // Get purchase order master
            let orderQuery = `
                SELECT * FROM purchaseordermaster
                WHERE uniquekey = ?
            `;
            let orderParams = [uniquekey];

            if (posLocationId) {
                orderQuery += " AND locationid = ?";
                orderParams.push(posLocationId);
            }

            if (posCompanyId) {
                orderQuery += " AND companyid = ?";
                orderParams.push(posCompanyId);
            }

            const [orders] = await db.getResults(orderQuery, orderParams);

            if (orders.length === 0) {
                return res.status(404).json(ResponseFormatter.error("Purchase order not found"));
            }

            const order = orders[0];

            // Get purchase order items
            const [items] = await db.getResults(
                `
                SELECT * FROM purchaseorderitemsdetails
                WHERE uniquekey = ? AND isdeleted = 0
                ORDER BY orderitemsdetailsid
            `,
                [uniquekey]
            );

            // Get purchase order items tax details
            const [itemTaxes] = await db.getResults(
                `
                SELECT * FROM purchaseorderitemstaxdetails
                WHERE uniquekey = ? AND isdeleted = 0
                ORDER BY orderitemsdetailsid, orderitemstaxdetailsid
            `,
                [uniquekey]
            );

            // Structure the response
            const purchaseOrderDetails = {
                order: order,
                items: items,
                itemTaxes: itemTaxes,
            };

            winston.debug(`Purchase order details retrieved`, {
                source: "pos-mgmt/purchaseOrder.controller.js",
                function: "getPurchaseOrderDetails",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                uniquekey,
                orderid: order.orderid,
            });

            return res
                .status(200)
                .json(
                    ResponseFormatter.success(purchaseOrderDetails, "Purchase order details retrieved successfully")
                );
        } catch (error) {
            winston.error(`Message: ${error.message}`, {
                source: "purchaseOrder.controller.js",
                function: "getPurchaseOrderDetails",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id || req.userId,
                uniquekey: uniquekey,
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return res
                .status(500)
                .json(ResponseFormatter.serverError("Failed to get purchase order details"));
        }
    }),
};
