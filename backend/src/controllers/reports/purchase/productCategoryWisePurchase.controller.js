const productCategoryWisePurchaseModel = require("../../../models/reports/purchase/productCategoryWisePurchase.model");
const { asyncHandler } = require("../../../utils/asyncHandler");
const ResponseFormatter = require("../../../utils/responseFormatter");

module.exports = {
    /**
     * Get Product Category Wise Purchase Report
     * @route GET /api/reports/purchase/product-category-wise-purchase
     * @access Private
     */
    getProductCategoryWisePurchase: asyncHandler(async (req, res) => {
        const result = await productCategoryWisePurchaseModel.getProductCategoryWisePurchase(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res
                .status(200)
                .json(
                    ResponseFormatter.success([], "No product category-wise purchase data found")
                );
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
                        "Product category-wise purchase report retrieved successfully"
                    )
                );
        }

        // Fallback (shouldn't happen)
        res.status(200).json(
            ResponseFormatter.success(
                result,
                "Product category-wise purchase report retrieved successfully"
            )
        );
    }),
};
