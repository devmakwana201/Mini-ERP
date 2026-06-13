const stockAdjustmentReportModel = require("../../../models/reports/stock/stockAdjustmentReport.model");
const { asyncHandler } = require("../../../utils/asyncHandler");
const ResponseFormatter = require("../../../utils/responseFormatter");

module.exports = {
    /**
     * Get Stock Adjustment Report
     * @route GET /api/reports/stock/stock-adjustment-report
     * @access Private
     */
    getStockAdjustmentReport: asyncHandler(async (req, res) => {
        const result = await stockAdjustmentReportModel.getStockAdjustmentReport(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res
                .status(200)
                .json(ResponseFormatter.success([], "No stock adjustment data found"));
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
                        "Stock adjustment report retrieved successfully"
                    )
                );
        }

        // Fallback (shouldn't happen)
        res.status(200).json(
            ResponseFormatter.success(result, "Stock adjustment report retrieved successfully")
        );
    }),
};
