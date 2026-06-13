const supplierLedgerModel = require("../../../models/reports/purchase/supplierLedger.model");
const { asyncHandler } = require("../../../utils/asyncHandler");
const ResponseFormatter = require("../../../utils/responseFormatter");

module.exports = {
    /**
     * Get Supplier Ledger Report
     * @route GET /api/reports/purchase/supplier-ledger
     * @access Private
     */
    getSupplierLedger: asyncHandler(async (req, res) => {
        const result = await supplierLedgerModel.getSupplierLedger(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res
                .status(200)
                .json(ResponseFormatter.success([], "No supplier ledger records found"));
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
                        "Supplier ledger report retrieved successfully"
                    )
                );
        }

        // Fallback (shouldn't happen)
        res.status(200).json(
            ResponseFormatter.success(result, "Supplier ledger report retrieved successfully")
        );
    }),
};
