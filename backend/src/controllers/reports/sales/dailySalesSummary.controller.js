const dailySalesSummaryModel = require("../../../models/reports/sales/dailySalesSummary.model");
const { asyncHandler } = require("../../../utils/asyncHandler");
const ResponseFormatter = require("../../../utils/responseFormatter");

module.exports = {
    /**
     * Get Daily Sales Summary Report
     * @route GET /api/reports/sales/daily-sales-summary
     * @access Private
     */
    getDailySalesSummary: asyncHandler(async (req, res) => {
        const result = await dailySalesSummaryModel.getDailySalesSummary(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res
                .status(200)
                .json(ResponseFormatter.success([], "No daily sales summary found"));
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
                        "Daily sales summary retrieved successfully"
                    )
                );
        }

        // Fallback (shouldn't happen)
        res.status(200).json(
            ResponseFormatter.success(result, "Daily sales summary retrieved successfully")
        );
    }),
};
