const productSummaryModel = require("../../../models/reports/sales/productSummary.model");
const { asyncHandler } = require("../../../utils/asyncHandler");
const ResponseFormatter = require("../../../utils/responseFormatter");

module.exports = {
    /**
     * Get Product Summary Report
     * @route GET /api/reports/sales/product-summary
     * @access Private
     */
    getProductSummary: asyncHandler(async (req, res) => {
        const result = await productSummaryModel.getProductSummary(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res.status(200).json(ResponseFormatter.success([], "No product summary data found"));
        }

        if (result.data && result.pagination) {
            return res
                .status(200)
                .json(
                    ResponseFormatter.paginated(
                        result.data,
                        result.pagination.start,
                        result.pagination.length,
                        result.pagination.total,
                        "Product summary report retrieved successfully"
                    )
                );
        }

        res.status(200).json(
            ResponseFormatter.success(result, "Product summary report retrieved successfully")
        );
    }),
};
