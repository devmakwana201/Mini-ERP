const productWisePurchaseModel = require("../../../models/reports/purchase/productWisePurchase.model");
const { asyncHandler } = require("../../../utils/asyncHandler");
const ResponseFormatter = require("../../../utils/responseFormatter");

module.exports = {
    /**
     * Get Product Wise Purchase Report
     * @route GET /api/reports/purchase/product-wise-purchase
     * @access Private
     */
    getProductWisePurchase: asyncHandler(async (req, res) => {
        const result = await productWisePurchaseModel.getProductWisePurchase(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res
                .status(200)
                .json(ResponseFormatter.success([], "No product-wise purchase data found"));
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
                        "Product-wise purchase report retrieved successfully"
                    )
                );
        }

        // Fallback (shouldn't happen)
        res.status(200).json(
            ResponseFormatter.success(result, "Product-wise purchase report retrieved successfully")
        );
    }),
};
