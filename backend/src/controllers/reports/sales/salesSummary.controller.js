const salesSummaryModel = require("../../../models/reports/sales/salesSummary.model");
const { asyncHandler } = require("../../../utils/asyncHandler");
const ResponseFormatter = require("../../../utils/responseFormatter");

module.exports = {
    /**
     * Get Sales Summary Report
     * @route GET /api/reports/sales/sales-summary
     * @access Private
     */
    getSalesSummary: asyncHandler(async (req, res) => {
        const result = await salesSummaryModel.getSalesSummary(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res.status(200).json(ResponseFormatter.success([], "No sales summary found"));
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
                        "Sales summary retrieved successfully"
                    )
                );
        }

        // Fallback (shouldn't happen)
        res.status(200).json(
            ResponseFormatter.success(result, "Sales summary retrieved successfully")
        );
    }),
};
