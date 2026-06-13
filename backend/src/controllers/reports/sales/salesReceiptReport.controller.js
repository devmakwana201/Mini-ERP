const salesReceiptReportModel = require("../../../models/reports/sales/salesReceiptReport.model");
const { asyncHandler } = require("../../../utils/asyncHandler");
const ResponseFormatter = require("../../../utils/responseFormatter");

module.exports = {
    /**
     * Get Sales Receipt Report
     * @route GET /api/v1/reports/sales/sales-receipt
     * @access Private
     */
    getSalesReceiptReport: asyncHandler(async (req, res) => {
        const result = await salesReceiptReportModel.getSalesReceiptReport(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res.status(200).json(ResponseFormatter.success([], "No sales receipts found"));
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
                        "Sales receipt report retrieved successfully"
                    )
                );
        }

        // Fallback (shouldn't happen)
        res.status(200).json(
            ResponseFormatter.success(result, "Sales receipt report retrieved successfully")
        );
    }),
};
