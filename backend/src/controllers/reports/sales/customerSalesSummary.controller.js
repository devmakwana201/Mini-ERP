const customerSalesSummaryModel = require("../../../models/reports/sales/customerSalesSummary.model");
const { asyncHandler } = require("../../../utils/asyncHandler");
const ResponseFormatter = require("../../../utils/responseFormatter");

module.exports = {
    /**
     * Get Customer Sales Summary Report
     * @route GET /api/reports/sales/customer-sales-summary
     * @access Private
     */
    getCustomerSalesSummary: asyncHandler(async (req, res) => {
        const result = await customerSalesSummaryModel.getCustomerSalesSummary(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res
                .status(200)
                .json(ResponseFormatter.success([], "No customer sales summary found"));
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
                        "Customer sales summary retrieved successfully"
                    )
                );
        }

        // Fallback (shouldn't happen)
        res.status(200).json(
            ResponseFormatter.success(result, "Customer sales summary retrieved successfully")
        );
    }),
};
