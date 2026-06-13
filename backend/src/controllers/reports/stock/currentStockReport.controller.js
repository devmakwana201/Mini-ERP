const currentStockReportModel = require("../../../models/reports/stock/currentStockReport.model");
const { asyncHandler } = require("../../../utils/asyncHandler");
const ResponseFormatter = require("../../../utils/responseFormatter");

module.exports = {
    /**
     * Get Current Stock Report
     * @route GET /api/reports/stock/current-stock-report
     * @access Private
     */
    getCurrentStockReport: asyncHandler(async (req, res) => {
        const result = await currentStockReportModel.getCurrentStockReport(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res
                .status(200)
                .json(ResponseFormatter.success([], "No current stock data found"));
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
                        "Current stock report retrieved successfully"
                    )
                );
        }

        // Fallback (shouldn't happen)
        res.status(200).json(
            ResponseFormatter.success(result, "Current stock report retrieved successfully")
        );
    }),
};
