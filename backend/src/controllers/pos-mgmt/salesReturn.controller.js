const salesReturnModel = require("../../models/pos-mgmt/salesReturn.model");
const installationModel = require("../../models/pos-mgmt/installation.model");
const ResponseFormatter = require("../../utils/responseFormatter");
const { asyncHandler } = require("../../utils/asyncHandler");
const { BadRequestError } = require("../../utils/customErrors");
const winston = require("../../config/winston");
const db = require("../../config/db");

module.exports = {
    /**
     * Save Sales Return
     * Handles both single sales returns and bulk sales returns
     */
    saveSalesReturn: asyncHandler(async (req, res) => {
        const requestBody = req.body;

        // Check if this is a bulk sales return request (array of returns) or single return
        const isBulkReturn = Array.isArray(requestBody);
        const returns = isBulkReturn ? requestBody : [requestBody];
        

        winston.info(`Processing ${isBulkReturn ? "bulk" : "single"} sales return request`, {
            source: "pos-mgmt/salesReturn.controller.js",
            function: "saveSalesReturn",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            returnCount: returns.length,
        });

        // Validate bulk return constraints
        if (isBulkReturn && returns.length === 0) {
            throw new BadRequestError("Bulk sales return request cannot be empty");
        }

        if (isBulkReturn && returns.length > 100) {
            throw new BadRequestError("Maximum 100 sales returns allowed in bulk request");
        }

        const results = [];
        const errors = [];

        // Process each sales return
        for (let i = 0; i < returns.length; i++) {
            const returnData = returns[i];

            try {
                winston.debug(`Processing sales return ${i + 1}/${returns.length}`, {
                    source: "pos-mgmt/salesReturn.controller.js",
                    function: "saveSalesReturn",
                    endpoint: req.path,
                    method: req.method,
                    userId: req.user?.id,
                    uniquekey: returnData.uniquekey,
                    locationid: returnData.locationid,
                    companyid: returnData.companyid,
                });

                // Get POS data from token (if available)
                const posLocationId = req.pos?.locationId;
                const posCompanyId = req.pos?.companyId;
                const posProductKey = req.pos?.productKey;

                // If token is provided, validate it matches the return
                if (posLocationId && posLocationId != returnData.locationid) {
                    throw new BadRequestError(
                        `Sales Return ${i + 1}: location does not match POS token location`
                    );
                }

                if (posCompanyId && posCompanyId != returnData.companyid) {
                    throw new BadRequestError(
                        `Sales Return ${i + 1}: company does not match POS token company`
                    );
                }

                // If no token but productKey provided, validate the productKey belongs to the location
                if (!req.pos && returnData.productKey) {
                    const locationResult = await installationModel.getCustomers(
                        returnData.productKey
                    );

                    if (!locationResult.success || !locationResult.data) {
                        throw new BadRequestError(
                            `Sales Return ${i + 1}: Invalid product key ${returnData.productKey}`
                        );
                    }

                    if (locationResult.data.locationid != returnData.locationid) {
                        throw new BadRequestError(
                            `Sales Return ${i + 1}: Product key does not match return location`
                        );
                    }

                    if (locationResult.data.companyid != returnData.companyid) {
                        throw new BadRequestError(
                            `Sales Return ${i + 1}: Product key does not match return company`
                        );
                    }
                }

                // If neither token nor productKey, log warning but allow (backward compatibility)
                if (!req.pos && !returnData.productKey) {
                    winston.warn("Sales return saved without authentication", {
                        source: "pos-mgmt/salesReturn.controller.js",
                        function: "saveSalesReturn",
                        endpoint: req.path,
                        method: req.method,
                        userId: req.user?.id,
                        uniquekey: returnData.uniquekey,
                        locationid: returnData.locationid,
                        ip: req.ip,
                    });
                }

                // Process individual sales return
                const result = await salesReturnModel.saveSalesReturn(returnData);

                if (result.success) {
                    results.push({
                        uniquekey: returnData.uniquekey,
                        success: true,
                        issynced: result.issynced,
                        message: result.msg,
                    });
                } else {
                    errors.push({
                        uniquekey: returnData.uniquekey,
                        success: false,
                        message: result.msg,
                        error: result.error,
                    });
                }
            } catch (error) {
                winston.error(`Message: ${error.message}`, {
                    source: "salesReturn.controller.js",
                    function: "saveSalesReturn",
                    endpoint: req.path,
                    method: req.method,
                    userId: req.user?.id || req.userId,
                    uniquekey: returnData.uniquekey,
                    error: error.message,
                    code: error.code,
                    errno: error.errno,
                    stack: error.stack
                });

                errors.push({
                    uniquekey: returnData.uniquekey,
                    success: false,
                    message: error.message,
                    error: error.stack,
                });
            }
        }

        // Prepare response
        const totalReturns = returns.length;
        const successfulReturns = results.length;
        const failedReturns = errors.length;

        winston.info(`Sales return processing completed: ${successfulReturns}/${totalReturns} successful`, {
            source: "pos-mgmt/salesReturn.controller.js",
            function: "saveSalesReturn",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
        });

        // Return appropriate response based on results
        if (isBulkReturn) {
            const responseData = {
                summary: {
                    totalReturns: totalReturns,
                    successfulReturns: successfulReturns,
                    failedReturns: failedReturns,
                    processingType: "BULK",
                },
                results: results,
                errors: errors,
            };

            if (failedReturns === 0) {
                // All returns successful
                return res
                    .status(200)
                    .json(
                        ResponseFormatter.success(
                            responseData,
                            `All ${totalReturns} sales returns processed successfully`
                        )
                    );
            } else if (successfulReturns === 0) {
                // All returns failed
                return res
                    .status(400)
                    .json(
                        ResponseFormatter.error(
                            `All ${totalReturns} sales returns failed to process`,
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
                            `${successfulReturns}/${totalReturns} sales returns processed successfully`
                        )
                    );
            }
        } else {
            // Single sales return response (backward compatibility)
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
     * Get Sales Return Status
     * Check if sales return exists and get basic info
     */
    getSalesReturnStatus: asyncHandler(async (req, res) => {
        const { uniquekey } = req.params;

        if (!uniquekey) {
            throw new BadRequestError("Sales return uniquekey is required");
        }

        // Get POS data from token for validation
        const posLocationId = req.pos?.locationId;
        const posCompanyId = req.pos?.companyId;

        try {
            let query = `
                SELECT id, returnorderid, orderid, serverorderid, creditnumber, customerid,
                       tableid, returndate, amount, taxableamount, discountamount, totaltaxamount,
                       roundoff, grandtotal, remarks, gtbeforesalereturn, gtaftersalereturn,
                       companyid, locationid, uniquekey, datekey, isdeleted, type, isexchange,
                       issync, createddate, modifieddate
                FROM returnsaleordermaster
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

            const [returns] = await db.getResults(query, params);

            if (returns.length === 0) {
                return res.status(404).json(ResponseFormatter.error("Sales return not found"));
            }

            const returnData = returns[0];
            winston.debug(`Sales return status retrieved`, {
                source: "pos-mgmt/salesReturn.controller.js",
                function: "getSalesReturnStatus",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                uniquekey,
                returnorderid: returnData.returnorderid,
            });

            return res
                .status(200)
                .json(ResponseFormatter.success(returnData, "Sales return status retrieved successfully"));
        } catch (error) {
            winston.error(`Message: ${error.message}`, {
                source: "salesReturn.controller.js",
                function: "getSalesReturnStatus",
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
                .json(ResponseFormatter.serverError("Failed to get sales return status"));
        }
    }),

    /**
     * Get Sales Return Details
     * Get complete sales return information including products and tax details
     */
    getSalesReturnDetails: asyncHandler(async (req, res) => {
        const { uniquekey } = req.params;

        if (!uniquekey) {
            throw new BadRequestError("Sales return uniquekey is required");
        }

        // Get POS data from token for validation
        const posLocationId = req.pos?.locationId;
        const posCompanyId = req.pos?.companyId;

        try {
            // Get sales return master
            let returnQuery = `
                SELECT * FROM returnsaleordermaster
                WHERE uniquekey = ?
            `;
            let returnParams = [uniquekey];

            if (posLocationId) {
                returnQuery += " AND locationid = ?";
                returnParams.push(posLocationId);
            }

            if (posCompanyId) {
                returnQuery += " AND companyid = ?";
                returnParams.push(posCompanyId);
            }

            const [returns] = await db.getResults(returnQuery, returnParams);

            if (returns.length === 0) {
                return res.status(404).json(ResponseFormatter.error("Sales return not found"));
            }

            const returnData = returns[0];

            // Get sales return products
            const [products] = await db.getResults(
                `
                SELECT * FROM returnsaleorderproductdetails
                WHERE uniquekey = ? AND isdeleted = 0
                ORDER BY returnsaleorderproductid
            `,
                [uniquekey]
            );

            // Get sales return product tax details
            const [productTaxes] = await db.getResults(
                `
                SELECT * FROM returnorderproducttaxdetails
                WHERE uniquekey = ? AND isdeleted = 0
                ORDER BY returnsaleorderproductid, returnorderproducttaxdetailsid
            `,
                [uniquekey]
            );

            // Structure the response
            const salesReturnDetails = {
                return: returnData,
                products: products,
                productTaxes: productTaxes,
            };

            winston.debug(`Sales return details retrieved`, {
                source: "pos-mgmt/salesReturn.controller.js",
                function: "getSalesReturnDetails",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                uniquekey,
                returnorderid: returnData.returnorderid,
            });

            return res
                .status(200)
                .json(
                    ResponseFormatter.success(salesReturnDetails, "Sales return details retrieved successfully")
                );
        } catch (error) {
            winston.error(`Message: ${error.message}`, {
                source: "salesReturn.controller.js",
                function: "getSalesReturnDetails",
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
                .json(ResponseFormatter.serverError("Failed to get sales return details"));
        }
    }),
};
