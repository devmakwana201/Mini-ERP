const orderCancellationModel = require("../../../models/reports/sales/orderCancellation.model");
const { asyncHandler } = require("../../../utils/asyncHandler");
const ResponseFormatter = require("../../../utils/responseFormatter");

module.exports = {
    /**
     * Get Order Cancellation Report
     * @route GET /api/reports/sales/order-cancellation
     * @access Private
     */
    getOrderCancellation: asyncHandler(async (req, res) => {
        const result = await orderCancellationModel.getOrderCancellation(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res
                .status(200)
                .json(ResponseFormatter.success([], "No order cancellation records found"));
        }

        if (result.data && result.pagination) {
            return res.status(200).json(
                ResponseFormatter.paginated(
                    result.data,
                    result.pagination.start,
                    result.pagination.length,
                    result.pagination.total,
                    "Order cancellation report retrieved successfully"
                )
            );
        }

        return res.status(200).json(
            ResponseFormatter.success(
                result,
                "Order cancellation report retrieved successfully"
            )
        );
    }),
};
