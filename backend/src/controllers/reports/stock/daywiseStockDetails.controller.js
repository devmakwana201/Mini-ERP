const daywiseStockDetailsModel = require("../../../models/reports/stock/daywiseStockDetails.model");
const { asyncHandler } = require("../../../utils/asyncHandler");
const ResponseFormatter = require("../../../utils/responseFormatter");

module.exports = {
    /**
     * Get Daywise Stock Details Report
     * @route GET /api/reports/stock/daywise-stock-details
     * @access Private
     */
    getDaywiseStockDetails: asyncHandler(async (req, res) => {
        const result = await daywiseStockDetailsModel.getDaywiseStockDetails(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res
                .status(200)
                .json(ResponseFormatter.success([], "No daywise stock details found"));
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
                        "Daywise stock details report retrieved successfully"
                    )
                );
        }

        // Fallback (shouldn't happen)
        res.status(200).json(
            ResponseFormatter.success(result, "Daywise stock details report retrieved successfully")
        );
    }),
};
