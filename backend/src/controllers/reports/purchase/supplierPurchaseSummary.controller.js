const supplierPurchaseSummaryModel = require("../../../models/reports/purchase/supplierPurchaseSummary.model");
const { asyncHandler } = require("../../../utils/asyncHandler");
const ResponseFormatter = require("../../../utils/responseFormatter");

module.exports = {
    /**
     * Get Supplier Purchase Summary Report
     * @route GET /api/reports/purchase/supplier-purchase-summary
     * @access Private
     */
    getSupplierPurchaseSummary: asyncHandler(async (req, res) => {
        const result = await supplierPurchaseSummaryModel.getSupplierPurchaseSummary(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res
                .status(200)
                .json(ResponseFormatter.success([], "No supplier purchase summary found"));
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
                        "Supplier purchase summary report retrieved successfully"
                    )
                );
        }

        // Fallback (shouldn't happen)
        res.status(200).json(
            ResponseFormatter.success(
                result,
                "Supplier purchase summary report retrieved successfully"
            )
        );
    }),
};
