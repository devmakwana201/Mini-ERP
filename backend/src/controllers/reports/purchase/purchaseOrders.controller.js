const purchaseOrdersModel = require("../../../models/reports/purchase/purchaseOrders.model");
const { asyncHandler } = require("../../../utils/asyncHandler");
const ResponseFormatter = require("../../../utils/responseFormatter");

module.exports = {
    /**
     * Get Purchase Orders Report
     * @route GET /api/reports/purchase/purchase-orders
     * @access Private
     */
    getPurchaseOrders: asyncHandler(async (req, res) => {
        const result = await purchaseOrdersModel.getPurchaseOrders(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res.status(200).json(ResponseFormatter.success([], "No purchase orders found"));
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
                        "Purchase orders report retrieved successfully"
                    )
                );
        }

        // Fallback (shouldn't happen)
        res.status(200).json(
            ResponseFormatter.success(result, "Purchase orders report retrieved successfully")
        );
    }),
};
