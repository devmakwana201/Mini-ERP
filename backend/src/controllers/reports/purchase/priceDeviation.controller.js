const priceDeviationModel = require("../../../models/reports/purchase/priceDeviation.model");
const { asyncHandler } = require("../../../utils/asyncHandler");
const ResponseFormatter = require("../../../utils/responseFormatter");

module.exports = {
    /**
     * Get Price Deviation Report
     * @route GET /api/reports/purchase/price-deviation
     * @access Private
     */
    getPriceDeviation: asyncHandler(async (req, res) => {
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
            "minimumprice",
            "maximumprice",
            "averageprice",
            "lastpurchaseprice",
            "deviationpercent",
            "totalquantity",
            "purchasecount",
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

        const dateFields = ["firstpurchasedate", "lastpurchasedate"];
        dateFields.forEach((field) => {
            const val = getFilterValue(field);
            if (val) {
                const datePattern = /^[0-9/]+$/;
                if (!datePattern.test(val)) {
                    errors.push({ field, message: "Only numbers and / allowed (DD/MM/YYYY)" });
                }
            }
        });

        if (errors.length > 0) {
            return res.status(422).json(ResponseFormatter.validationError(errors));
        }

        const result = await priceDeviationModel.getPriceDeviation(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res
                .status(200)
                .json(ResponseFormatter.success([], "No price deviation data found"));
        }

        if (result.data && result.pagination) {
            return res.status(200).json(
                ResponseFormatter.paginated(
                    result.data,
                    result.pagination.start,
                    result.pagination.length,
                    result.pagination.total,
                    "Price deviation report retrieved successfully"
                )
            );
        }

        res.status(200).json(
            ResponseFormatter.success(
                result,
                "Price deviation report retrieved successfully"
            )
        );
    }),
};
