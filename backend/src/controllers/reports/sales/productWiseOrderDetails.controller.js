const productWiseOrderDetailsModel = require("../../../models/reports/sales/productWiseOrderDetails.model");
const { asyncHandler } = require("../../../utils/asyncHandler");
const ResponseFormatter = require("../../../utils/responseFormatter");

module.exports = {
    /**
     * Get Product Wise Order Details Report
     * @route GET /api/reports/sales/product-wise-order-details
     * @access Private
     */
    getProductWiseOrderDetails: asyncHandler(async (req, res) => {
        const result = await productWiseOrderDetailsModel.getProductWiseOrderDetails(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res
                .status(200)
                .json(ResponseFormatter.success([], "No product-wise order details found"));
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
                        "Product-wise order details retrieved successfully"
                    )
                );
        }

        // Fallback (shouldn't happen)
        res.status(200).json(
            ResponseFormatter.success(result, "Product-wise order details retrieved successfully")
        );
    }),
};
