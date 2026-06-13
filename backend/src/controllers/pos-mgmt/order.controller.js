const orderModel = require("../../models/pos-mgmt/order.model");
const installationModel = require("../../models/pos-mgmt/installation.model");
const ResponseFormatter = require("../../utils/responseFormatter");
const { asyncHandler } = require("../../utils/asyncHandler");
const { BadRequestError } = require("../../utils/customErrors");
const winston = require("../../config/winston");
const whatsAppService = require("../../services/whatsapp.service");
const db = require("../../config/db");
const { executeWithRetry } = require("../../utils/concurrency");

/**
 * Send order notification to customer
 * @param {Object} orderData - Order data
 * @param {Object} options - Additional options
 */
const sendOrderNotification = async (orderData, options = {}) => {
    if (!whatsAppService.isEnabled()) {
        winston.debug("WhatsApp service disabled, skipping order notification", {
            source: "pos-mgmt/order.controller.js",
            function: "sendOrderNotification",
        });
        return;
    }

    try {
        // The caller should ensure customerid exists. We still check if the customer is found in the DB.
        let customerData = null;
        const [customers] = await db.getResults(
            "SELECT customerid, name, phoneno FROM customermaster WHERE customerid = ? AND isdeleted = 0",
            [orderData.customerid]
        );

        if (customers.length > 0) {
            customerData = customers[0];
        }

        // Skip if no customer data found in DB
        if (!customerData) {
            winston.debug("Customer not found in database for order notification", {
                source: "order.controller.js",
                function: "sendOrderNotification",
                uniquekey: orderData.uniquekey,
                customerid: orderData.customerid
            });
            return;
        }

        // Send invoice notification
        const result = await whatsAppService.sendOrderNotification(orderData, customerData, {
            companyName: options.companyName || "AgriPOS",
            baseUrl: options.baseUrl,
        });

        if (result.success) {
            winston.info("Order notification sent successfully", {
                source: "order.controller.js",
                function: "sendOrderNotification",
                uniquekey: orderData.uniquekey,
                customerName: customerData.name,
                phone: customerData.phoneno
            });
        } else {
            winston.warn("Failed to send order notification", {
                source: "order.controller.js",
                function: "sendOrderNotification",
                uniquekey: orderData.uniquekey,
                error: result.message
            });
        }
    } catch (error) {
        winston.error(`Error sending order notification: ${error.message}`, {
            source: "order.controller.js",
            function: "sendOrderNotification",
            uniquekey: orderData.uniquekey,
            error: error.message,
            stack: error.stack
        });
    }
};

/**
 * Send payment confirmations for order payments
 * @param {Object} orderData - Order data
 * @param {Array} payments - Payment data array
 * @param {Object} options - Additional options
 */
const sendPaymentNotifications = async (orderData, payments = [], options = {}) => {
    if (!whatsAppService.isEnabled() || !payments || payments.length === 0) {
        winston.debug("WhatsApp service disabled or no payments, skipping payment notifications", {
            source: "order.controller.js",
            function: "sendPaymentNotifications",
            uniquekey: orderData?.uniquekey
        });
        return;
    }

    try {
        // The caller should ensure customerid exists. We still check if the customer is found in the DB.
        let customerData = null;
        const [customers] = await db.getResults(
            "SELECT customerid, name, phoneno FROM customermaster WHERE customerid = ? AND isdeleted = 0",
            [orderData.customerid]
        );

        if (customers.length > 0) {
            customerData = customers[0];
        }

        // Skip if no customer data found
        if (!customerData) {
            winston.debug("Customer not found in database for payment notifications", {
                source: "order.controller.js",
                function: "sendPaymentNotifications",
                uniquekey: orderData.uniquekey,
                customerid: orderData.customerid
            });
            return;
        }

        // Send payment notification for each payment
        for (const payment of payments) {
            try {
                const result = await whatsAppService.sendPaymentNotification(
                    payment,
                    customerData,
                    orderData,
                    {
                        companyName: options.companyName || "AgriPOS",
                        paymentMethod: payment.paymenttype || "Cash",
                    }
                );

                if (result.success) {
                    winston.info("Payment notification sent successfully", {
                        source: "order.controller.js",
                        function: "sendPaymentNotifications",
                        uniquekey: orderData.uniquekey,
                        paymentAmount: payment.paymentamount,
                        customerName: customerData.name,
                        phone: customerData.phoneno
                    });
                } else {
                    winston.warn("Failed to send payment notification", {
                        source: "order.controller.js",
                        function: "sendPaymentNotifications",
                        uniquekey: orderData.uniquekey,
                        paymentAmount: payment.paymentamount,
                        error: result.message
                    });
                }
            } catch (error) {
                winston.error(`Error sending payment notification: ${error.message}`, {
                    source: "order.controller.js",
                    function: "sendPaymentNotifications",
                    uniquekey: orderData.uniquekey,
                    paymentAmount: payment.paymentamount,
                    error: error.message,
                    stack: error.stack
                });
            }
        }
    } catch (error) {
        winston.error(`Error in payment notifications setup: ${error.message}`, {
            source: "order.controller.js",
            function: "sendPaymentNotifications",
            uniquekey: orderData.uniquekey,
            error: error.message,
            stack: error.stack
        });
    }
};

module.exports = {
    /**
     * Save Order
     * Handles both single orders and bulk orders
     */
    saveOrder: asyncHandler(async (req, res) => {
        const requestBody = req.body;

        // Check if this is a bulk order request (array of orders) or single order
        const isBulkOrder = Array.isArray(requestBody);
        const orders = isBulkOrder ? requestBody : [requestBody];

        winston.info(`Processing ${isBulkOrder ? "bulk" : "single"} order request`, {
            source: "order.controller.js",
            function: "saveOrder",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id || req.userId,
            orderCount: orders.length
        });

        // Validate bulk order constraints
        if (isBulkOrder && orders.length === 0) {
            throw new BadRequestError("Bulk order request cannot be empty");
        }

        if (isBulkOrder && orders.length > 100) {
            throw new BadRequestError("Maximum 100 orders allowed in bulk request");
        }

        // Get POS data from token (if available) - validate once before processing
        const posLocationId = req.pos?.locationId;
        const posCompanyId = req.pos?.companyId;
        const posProductKey = req.pos?.productKey;

        // Process orders with concurrency control (max 10 concurrent orders)
        // This prevents overwhelming the database connection pool
        const concurrencyLimit = Math.min(10, Math.floor(db.connection.pool.config.connectionLimit / 2));

        winston.info(`Processing ${orders.length} orders with concurrency limit: ${concurrencyLimit}`, {
            source: "order.controller.js",
            function: "saveOrder",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id || req.userId,
            orderCount: orders.length,
            concurrencyLimit
        });

        const processOrder = async (orderData, index) => {
            try {
                winston.debug(`Processing order ${index + 1}/${orders.length}`, {
                    source: "order.controller.js",
                    function: "saveOrder",
                    endpoint: req.path,
                    method: req.method,
                    userId: req.user?.id || req.userId,
                    uniquekey: orderData.uniquekey,
                    locationid: orderData.locationid,
                    companyid: orderData.companyid
                });

                // Validate token matches the order
                if (posLocationId && posLocationId != orderData.locationid) {
                    throw new BadRequestError(
                        `Order ${index + 1}: location does not match POS token location`
                    );
                }

                if (posCompanyId && posCompanyId != orderData.companyid) {
                    throw new BadRequestError(
                        `Order ${index + 1}: company does not match POS token company`
                    );
                }

                // Process individual order
                const result = await orderModel.saveOrder(orderData);

                if (result.success) {
                    // Send WhatsApp notifications asynchronously (don't wait)
                    if (result.issynced === 1) {
                        const notificationOptions = {
                            companyName: req.pos?.companyName || "AgriPOS",
                            baseUrl: process.env.FRONTEND_BASE_URL || "https://localhost:3000",
                        };

                        // Send notifications in sequence: order first, then payment
                        setImmediate(async () => {
                            try {
                                // Only send notifications if a customer is associated with the order
                                if (orderData.customerid) {
                                    winston.info("Customer found for order, attempting to send notifications", {
                                        source: "order.controller.js",
                                        function: "saveOrder",
                                        uniquekey: orderData.uniquekey
                                    });
                                    // 1. Send order notification first
                                    await sendOrderNotification(orderData, notificationOptions);

                                    // 2. Wait a moment to ensure order arrives first
                                    await new Promise(resolve => setTimeout(resolve, 2000));

                                    // 3. Send payment notifications if payments exist
                                    const payments = orderData.paymentMaster || orderData.paymentDetails || [];
                                    if (payments && payments.length > 0) {
                                        await sendPaymentNotifications(
                                            orderData,
                                            payments,
                                            notificationOptions
                                        );
                                    }
                                    winston.info("Notification process completed for customer order", {
                                        source: "order.controller.js",
                                        function: "saveOrder",
                                        uniquekey: orderData.uniquekey
                                    });
                                } else {
                                    winston.debug("Order has no customer, skipping notifications", {
                                        source: "order.controller.js",
                                        function: "saveOrder",
                                        uniquekey: orderData.uniquekey
                                    });
                                }
                            } catch (error) {
                                winston.error(`Error sending notifications: ${error.message}`, {
                                    source: "order.controller.js",
                                    function: "saveOrder",
                                    uniquekey: orderData.uniquekey,
                                    error: error.message,
                                    stack: error.stack
                                });
                            }
                        });
                    }

                    return {
                        uniquekey: orderData.uniquekey,
                        success: true,
                        issynced: result.issynced,
                        message: result.msg,
                    };
                } else {
                    return {
                        uniquekey: orderData.uniquekey,
                        success: false,
                        message: result.msg,
                        error: result.error,
                    };
                }
            } catch (error) {
                winston.error(`Error processing order ${index + 1}: ${error.message}`, {
                    source: "order.controller.js",
                    function: "saveOrder",
                    endpoint: req.path,
                    method: req.method,
                    userId: req.user?.id || req.userId,
                    uniquekey: orderData.uniquekey,
                    error: error.message,
                    stack: error.stack
                });

                return {
                    uniquekey: orderData.uniquekey,
                    success: false,
                    message: error.message,
                    error: error.stack,
                };
            }
        };

        // Execute with concurrency limit and retry logic
        const { successes, failures } = await executeWithRetry(
            orders,
            processOrder,
            {
                concurrencyLimit: concurrencyLimit,
                maxRetries: 1, // Retry once on failure
            }
        );

        // Map results
        const results = successes.map(s => s.result).filter(r => r.success);
        const errors = [
            ...successes.map(s => s.result).filter(r => !r.success),
            ...failures.map(f => ({
                uniquekey: f.item.uniquekey,
                success: false,
                message: f.error.message,
                error: f.error.stack,
            }))
        ];

        // Prepare response
        const totalOrders = orders.length;
        const successfulOrders = results.length;
        const failedOrders = errors.length;

        winston.info(`Order processing completed: ${successfulOrders}/${totalOrders} successful`, {
            source: "order.controller.js",
            function: "saveOrder",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id || req.userId,
            totalOrders,
            successfulOrders,
            failedOrders
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
                            `All ${totalOrders} orders processed successfully`
                        )
                    );
            } else if (successfulOrders === 0) {
                // All orders failed
                return res
                    .status(400)
                    .json(
                        ResponseFormatter.error(
                            `All ${totalOrders} orders failed to process`,
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
                            `${successfulOrders}/${totalOrders} orders processed successfully`
                        )
                    );
            }
        } else {
            // Single order response (backward compatibility)
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
     * Get Order Status
     * Check if order exists and get basic info
     */
    getOrderStatus: asyncHandler(async (req, res) => {
        const { uniquekey } = req.params;

        if (!uniquekey) {
            throw new BadRequestError("Order uniquekey is required");
        }

        // Get POS data from token for validation
        const posLocationId = req.pos?.locationId;
        const posCompanyId = req.pos?.companyId;

        try {
            let query = `
                SELECT uniquekey, orderid, billno, orderdate, grandtotal, ordertype,
                       isdeleted, locationid, companyid, createddate, modifieddate
                FROM ordermaster
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
                return res.status(404).json(ResponseFormatter.error("Order not found"));
            }

            const order = orders[0];
            winston.debug("Order status retrieved", {
                source: "order.controller.js",
                function: "getOrderStatus",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id || req.userId,
                uniquekey,
                orderid: order.orderid
            });

            return res
                .status(200)
                .json(ResponseFormatter.success(order, "Order status retrieved successfully"));
        } catch (error) {
            winston.error(`Error getting order status: ${error.message}`, {
                source: "order.controller.js",
                function: "getOrderStatus",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id || req.userId,
                uniquekey,
                error: error.message,
                stack: error.stack
            });
            return res
                .status(500)
                .json(ResponseFormatter.serverError("Failed to get order status"));
        }
    }),

    /**
     * Get Order Details
     * Get complete order information including products, payments, etc.
     */
    getOrderDetails: asyncHandler(async (req, res) => {
        const { uniquekey } = req.params;

        if (!uniquekey) {
            throw new BadRequestError("Order uniquekey is required");
        }

        // Get POS data from token for validation
        const posLocationId = req.pos?.locationId;
        const posCompanyId = req.pos?.companyId;

        try {
            // Get order master
            let orderQuery = `
                SELECT * FROM ordermaster
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
                return res.status(404).json(ResponseFormatter.error("Order not found"));
            }

            const order = orders[0];

            // Get order products
            const [products] = await db.getResults(
                `
                SELECT * FROM orderproductdetails
                WHERE uniquekey = ? AND isdeleted = 0
                ORDER BY orderproductid
            `,
                [uniquekey]
            );

            // Get product tax details
            const [productTaxes] = await db.getResults(
                `
                SELECT * FROM orderproducttaxdetails
                WHERE uniquekey = ? AND isdeleted = 0
                ORDER BY orderproductid, orderproducttaxdetailsid
            `,
                [uniquekey]
            );

            // Get payments
            const [payments] = await db.getResults(
                `
                SELECT * FROM paymentmaster
                WHERE uniquekey = ? AND isdeleted = 0
                ORDER BY paymentid
            `,
                [uniquekey]
            );

            // Get payment transactions
            const [transactions] = await db.getResults(
                `
                SELECT * FROM paymenttransactionmaster
                WHERE uniquekey = ? AND isdeleted = 0
                ORDER BY paymentid, paymenttransactionid
            `,
                [uniquekey]
            );

            // Get tickets
            const [tickets] = await db.getResults(
                `
                SELECT * FROM ticketmaster
                WHERE uniquekey = ? AND isdeleted = 0
                ORDER BY ticketid
            `,
                [uniquekey]
            );

            // Structure the response
            const orderDetails = {
                order: order,
                products: products,
                productTaxes: productTaxes,
                payments: payments,
                transactions: transactions,
                tickets: tickets,
            };

            winston.debug("Order details retrieved", {
                source: "order.controller.js",
                function: "getOrderDetails",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id || req.userId,
                uniquekey,
                orderid: order.orderid
            });

            return res
                .status(200)
                .json(
                    ResponseFormatter.success(orderDetails, "Order details retrieved successfully")
                );
        } catch (error) {
            winston.error(`Error getting order details: ${error.message}`, {
                source: "order.controller.js",
                function: "getOrderDetails",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id || req.userId,
                uniquekey,
                error: error.message,
                stack: error.stack
            });
            return res
                .status(500)
                .json(ResponseFormatter.serverError("Failed to get order details"));
        }
    }),
};
