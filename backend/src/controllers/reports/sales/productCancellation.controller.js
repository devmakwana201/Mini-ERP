const productCancellationModel = require("../../../models/reports/sales/productCancellation.model");
const { asyncHandler } = require("../../../utils/asyncHandler");
const ResponseFormatter = require("../../../utils/responseFormatter");

module.exports = {
    /**
     * Get Product Cancellation Report
     * @route GET /api/reports/sales/product-cancellation
     * @access Private
     */
    getProductCancellation: asyncHandler(async (req, res) => {
        const result = await productCancellationModel.getProductCancellation(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res.status(200).json(ResponseFormatter.success([], "No product cancellations found"));
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
                        "Product cancellation report retrieved successfully"
                    )
                );
        }

        res.status(200).json(
            ResponseFormatter.success(result, "Product cancellation report retrieved successfully")
        );
    }),
};
