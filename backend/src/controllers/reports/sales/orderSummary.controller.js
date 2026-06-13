const orderSummaryModel = require("../../../models/reports/sales/orderSummary.model");
const { asyncHandler } = require("../../../utils/asyncHandler");
const ResponseFormatter = require("../../../utils/responseFormatter");

module.exports = {
    /**
     * Get Order Summary Report
     * @route GET /api/reports/sales/order-summary
     * @access Private
     */
    getOrderSummary: asyncHandler(async (req, res) => {
        const result = await orderSummaryModel.getOrderSummary(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res.status(200).json(ResponseFormatter.success([], "No order summary found"));
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
                        "Order summary retrieved successfully"
                    )
                );
        }

        // Fallback (shouldn't happen)
        res.status(200).json(
            ResponseFormatter.success(result, "Order summary retrieved successfully")
        );
    }),
};
