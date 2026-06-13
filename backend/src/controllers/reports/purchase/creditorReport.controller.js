const creditorReportModel = require("../../../models/reports/purchase/creditorReport.model");
const { asyncHandler } = require("../../../utils/asyncHandler");
const ResponseFormatter = require("../../../utils/responseFormatter");

module.exports = {
    /**
     * Get Creditor Report
     * @route GET /api/reports/purchase/creditor-report
     * @access Private
     */
    getCreditorReport: asyncHandler(async (req, res) => {
        const result = await creditorReportModel.getCreditorReport(req);

        if (!result?.data?.length) {
            return res
                .status(200)
                .json(ResponseFormatter.success([], "No creditor report records found"));
        }

        return res
            .status(200)
            .json(
                ResponseFormatter.paginated(
                    result.data,
                    result.pagination.start,
                    result.pagination.length,
                    result.pagination.total,
                    "Creditor report retrieved successfully"
                )
            );
    }),
};
