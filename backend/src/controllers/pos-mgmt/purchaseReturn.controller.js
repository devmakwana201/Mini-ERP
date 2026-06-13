const purchaseReturnModel = require("../../models/pos-mgmt/purchaseReturn.model");
const installationModel = require("../../models/pos-mgmt/installation.model");
const ResponseFormatter = require("../../utils/responseFormatter");
const { asyncHandler } = require("../../utils/asyncHandler");
const { BadRequestError } = require("../../utils/customErrors");
const winston = require("../../config/winston");
const db = require("../../config/db");

module.exports = {
    /**
     * Save Purchase Return
     * Handles both single purchase returns and bulk purchase returns
     */
    savePurchaseReturn: asyncHandler(async (req, res) => {
        const requestBody = req.body;

        // Check if this is a bulk purchase return request (array of returns) or single return
        const isBulkReturn = Array.isArray(requestBody);
        const returns = isBulkReturn ? requestBody : [requestBody];

        winston.info(`Processing ${isBulkReturn ? "bulk" : "single"} purchase return request`, {
            source: "pos-mgmt/purchaseReturn.controller.js",
            function: "savePurchaseReturn",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            returnCount: returns.length,
        });

        // Validate bulk return constraints
        if (isBulkReturn && returns.length === 0) {
            throw new BadRequestError("Bulk purchase return request cannot be empty");
        }

        if (isBulkReturn && returns.length > 100) {
            throw new BadRequestError("Maximum 100 purchase returns allowed in bulk request");
        }

        const results = [];
        const errors = [];

        // Process each purchase return
        for (let i = 0; i < returns.length; i++) {
            const returnData = returns[i];

            try {
                winston.debug(`Processing purchase return ${i + 1}/${returns.length}`, {
                    source: "pos-mgmt/purchaseReturn.controller.js",
                    function: "savePurchaseReturn",
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
                        `Purchase Return ${i + 1}: location does not match POS token location`
                    );
                }

                if (posCompanyId && posCompanyId != returnData.companyid) {
                    throw new BadRequestError(
                        `Purchase Return ${i + 1}: company does not match POS token company`
                    );
                }

                // If no token but productKey provided, validate the productKey belongs to the location
                if (!req.pos && returnData.productKey) {
                    const locationResult = await installationModel.getCustomers(
                        returnData.productKey
                    );

                    if (!locationResult.success || !locationResult.data) {
                        throw new BadRequestError(
                            `Purchase Return ${i + 1}: Invalid product key ${returnData.productKey}`
                        );
                    }

                    if (locationResult.data.locationid != returnData.locationid) {
                        throw new BadRequestError(
                            `Purchase Return ${i + 1}: Product key does not match return location`
                        );
                    }

                    if (locationResult.data.companyid != returnData.companyid) {
                        throw new BadRequestError(
                            `Purchase Return ${i + 1}: Product key does not match return company`
                        );
                    }
                }

                // If neither token nor productKey, log warning but allow (backward compatibility)
                if (!req.pos && !returnData.productKey) {
                    winston.warn("Purchase return saved without authentication", {
                        source: "pos-mgmt/purchaseReturn.controller.js",
                        function: "savePurchaseReturn",
                        endpoint: req.path,
                        method: req.method,
                        userId: req.user?.id,
                        uniquekey: returnData.uniquekey,
                        locationid: returnData.locationid,
                        ip: req.ip,
                    });
                }

                // Process individual purchase return
                const result = await purchaseReturnModel.savePurchaseReturn(returnData);

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
                    source: "purchaseReturn.controller.js",
                    function: "savePurchaseReturn",
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

        winston.info(`Purchase return processing completed: ${successfulReturns}/${totalReturns} successful`, {
            source: "pos-mgmt/purchaseReturn.controller.js",
            function: "savePurchaseReturn",
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
                            `All ${totalReturns} purchase returns processed successfully`
                        )
                    );
            } else if (successfulReturns === 0) {
                // All returns failed
                return res
                    .status(400)
                    .json(
                        ResponseFormatter.error(
                            `All ${totalReturns} purchase returns failed to process`,
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
                            `${successfulReturns}/${totalReturns} purchase returns processed successfully`
                        )
                    );
            }
        } else {
            // Single purchase return response (backward compatibility)
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
     * Get Purchase Return Status
     * Check if purchase return exists and get basic info
     */
    getPurchaseReturnStatus: asyncHandler(async (req, res) => {
        const { uniquekey } = req.params;

        if (!uniquekey) {
            throw new BadRequestError("Purchase return uniquekey is required");
        }

        // Get POS data from token for validation
        const posLocationId = req.pos?.locationId;
        const posCompanyId = req.pos?.companyId;

        try {
            let query = `
                SELECT id, returnid, locationid, supplierid, purchaseorderid, serverpurchaseorderid,
                       returnnumber, datekey, referencebillnumber, referencechallannumber,
                       debitnotenumber, purchaseorderreturndate, remarks, totalamount, discounttype,
                       discountpercentamt, totaltaxableamount, additionalcharge, roundoffamount,
                       totalcessamt, totaltax, grandtotal, isdeleted, ipaddress, companyid,
                       uniquekey, createddate, modifieddate
                FROM purchaseorderreturnmaster
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
                return res.status(404).json(ResponseFormatter.error("Purchase return not found"));
            }

            const returnData = returns[0];
            winston.debug(`Purchase return status retrieved`, {
                source: "pos-mgmt/purchaseReturn.controller.js",
                function: "getPurchaseReturnStatus",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                uniquekey,
                returnid: returnData.returnid,
            });

            return res
                .status(200)
                .json(ResponseFormatter.success(returnData, "Purchase return status retrieved successfully"));
        } catch (error) {
            winston.error(`Message: ${error.message}`, {
                source: "purchaseReturn.controller.js",
                function: "getPurchaseReturnStatus",
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
                .json(ResponseFormatter.serverError("Failed to get purchase return status"));
        }
    }),

    /**
     * Get Purchase Return Details
     * Get complete purchase return information including items and tax details
     */
    getPurchaseReturnDetails: asyncHandler(async (req, res) => {
        const { uniquekey } = req.params;

        if (!uniquekey) {
            throw new BadRequestError("Purchase return uniquekey is required");
        }

        // Get POS data from token for validation
        const posLocationId = req.pos?.locationId;
        const posCompanyId = req.pos?.companyId;

        try {
            // Get purchase return master
            let returnQuery = `
                SELECT * FROM purchaseorderreturnmaster
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
                return res.status(404).json(ResponseFormatter.error("Purchase return not found"));
            }

            const returnData = returns[0];

            // Get purchase return items
            const [items] = await db.getResults(
                `
                SELECT * FROM purchaseorderreturnitemsdetails
                WHERE uniquekey = ? AND isdeleted = 0
                ORDER BY returnitemsdetailsid
            `,
                [uniquekey]
            );

            // Get purchase return items tax details
            const [itemTaxes] = await db.qugetResultsery(
                `
                SELECT * FROM purchaseorderreturnitemstaxdetails
                WHERE uniquekey = ? AND isdeleted = 0
                ORDER BY returnitemsdetailsid, returnitemstaxdetailsid
            `,
                [uniquekey]
            );

            // Structure the response
            const purchaseReturnDetails = {
                return: returnData,
                items: items,
                itemTaxes: itemTaxes,
            };

            winston.debug(`Purchase return details retrieved`, {
                source: "pos-mgmt/purchaseReturn.controller.js",
                function: "getPurchaseReturnDetails",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                uniquekey,
                returnid: returnData.returnid,
            });

            return res
                .status(200)
                .json(
                    ResponseFormatter.success(purchaseReturnDetails, "Purchase return details retrieved successfully")
                );
        } catch (error) {
            winston.error(`Message: ${error.message}`, {
                source: "purchaseReturn.controller.js",
                function: "getPurchaseReturnDetails",
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
                .json(ResponseFormatter.serverError("Failed to get purchase return details"));
        }
    }),
};
