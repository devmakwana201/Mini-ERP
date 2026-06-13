const dailyPurchaseSummaryModel = require("../../../models/reports/purchase/dailyPurchaseSummary.model");
const { asyncHandler } = require("../../../utils/asyncHandler");
const ResponseFormatter = require("../../../utils/responseFormatter");

module.exports = {
    /**
     * Get Daily Purchase Summary Report
     * @route GET /api/reports/purchase/daily-purchase-summary
     * @access Private
     */
    getDailyPurchaseSummary: asyncHandler(async (req, res) => {
        let parsedFilters = {};
        if (req.query.filters) {
            try {
                parsedFilters = JSON.parse(req.query.filters);
            } catch (err) {
                return res
                    .status(422)
                    .json(ResponseFormatter.validationError([{ field: "filters", message: "Invalid filters JSON" }]));
            }
        }

        const getFilterValue = (field) => {
            const val = parsedFilters[field];
            return typeof val === "object" ? val.value : val;
        };

        const numericFields = [
            "noofpos",
            "noofsuppliers",
            "totalquantity",
            "totalamount",
            "discountamount",
            "netamount",
            "totaltaxableamount",
            "cgst",
            "sgst",
            "igst",
            "totaltax",
            "additionalcharges",
            "roundoff",
            "grandtotal",
            "returnamount",
            "netpurchase",
            "averagepovalue",
        ];

        const errors = [];

        numericFields.forEach((field) => {
            const val = getFilterValue(field);
            if (val !== null && val !== undefined && val !== "") {
                const num = Number(val);
                if (!Number.isFinite(num)) {
                    errors.push({ field, message: "Numeric value required" });
                }
            }
        });

        const dateFilter = getFilterValue("purchaseorderdate");
        if (dateFilter) {
            const datePattern = /^[0-9/]+$/;
            if (!datePattern.test(dateFilter)) {
                errors.push({ field: "purchaseorderdate", message: "Only numbers and / allowed (DD/MM/YYYY)" });
            }
        }

        if (errors.length > 0) {
            return res.status(422).json(ResponseFormatter.validationError(errors));
        }

        const result = await dailyPurchaseSummaryModel.getDailyPurchaseSummary(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res
                .status(200)
                .json(ResponseFormatter.success([], "No daily purchase summary found"));
        }

        // If result has pagination info (which it should)
        if (result.data && result.pagination) {
            return res
                .status(200)
                .json(
                    ResponseFormatter.paginated(
                        result.data,
                        result.pagination.start,
                        result.pagination.length,
                        result.pagination.total,
                        "Daily purchase summary report retrieved successfully"
                    )
                );
        }

        // Fallback (shouldn't happen)
        res.status(200).json(
            ResponseFormatter.success(
                result,
                "Daily purchase summary report retrieved successfully"
            )
        );
    }),
};
