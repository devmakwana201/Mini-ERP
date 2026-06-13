const productSalesSummaryModel = require("../../../models/reports/sales/productSalesSummary.model");
const { asyncHandler } = require("../../../utils/asyncHandler");
const ResponseFormatter = require("../../../utils/responseFormatter");

module.exports = {
    /**
     * Get Product Sales Summary Report
     * @route GET /api/reports/sales/product-sales-summary
     * @access Private
     */
    getProductSalesSummary: asyncHandler(async (req, res) => {
        const result = await productSalesSummaryModel.getProductSalesSummary(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res.status(200).json(ResponseFormatter.success([], "No product sales found"));
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
                        "Product sales summary report retrieved successfully"
                    )
                );
        }

        res.status(200).json(
            ResponseFormatter.success(result, "Product sales summary report retrieved successfully")
        );
    }),
};
