const discountReportModel = require("../../../models/reports/sales/discountReport.model");
const { asyncHandler } = require("../../../utils/asyncHandler");
const ResponseFormatter = require("../../../utils/responseFormatter");

const NUMERIC_FILTER_FIELDS = new Set([
    "ordertotal",
    "discount",
    "discount_percentage",
    "net_amount",
    "total_items",
    "taxamount",
    "total_sgst",
    "total_cgst",
    "total_igst",
    "roundoff",
    "grandtotal",
]);

const TEXT_ONLY_FILTER_FIELDS = new Set([
    "customer",
    "createdby",
    "discount_type",
    "payment_type",
]);

const FIELD_LABELS = {
    customer: "Customer",
    createdby: "Created By",
    date: "Date",
    discount_type: "Discount Type",
    payment_type: "Payment Type",
    ordertotal: "Order Total",
    discount: "Discount",
    discount_percentage: "Discount %",
    net_amount: "Net Amount",
    total_items: "Total Items",
    taxamount: "Tax Amount",
    total_sgst: "SGST",
    total_cgst: "CGST",
    total_igst: "IGST",
    roundoff: "Round Off",
    grandtotal: "Grand Total",
};

const getFilterValue = (filters, field) => {
    const val = filters?.[field];
    return typeof val === "object" ? val.value : val;
};

const isValidDateValue = (value) => {
    if (value == null || value === "") {
        return true;
    }

    const trimmedValue = String(value).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
        return false;
    }

    const [year, month, day] = trimmedValue.split("-").map(Number);
    const parsedDate = new Date(Date.UTC(year, month - 1, day));

    return (
        parsedDate.getUTCFullYear() === year &&
        parsedDate.getUTCMonth() === month - 1 &&
        parsedDate.getUTCDate() === day
    );
};

module.exports = {
    /**
     * Get Discount Report
     * @route GET /api/reports/sales/discount-report
     * @access Private
     */
    getDiscountReport: asyncHandler(async (req, res) => {
        let parsedFilters = {};
        if (req.query.filters) {
            try {
                parsedFilters = JSON.parse(req.query.filters);
            } catch (_error) {
                return res.status(400).json(
                    ResponseFormatter.error("Invalid filters payload", 400)
                );
            }
        }

        for (const field of NUMERIC_FILTER_FIELDS) {
            const value = getFilterValue(parsedFilters, field);
            if (value == null || String(value).trim() === "") {
                continue;
            }

            if (!/^-?\d+(\.\d+)?$/.test(String(value).trim())) {
                return res.status(400).json(
                    ResponseFormatter.error(
                        `Please enter a valid number in ${FIELD_LABELS[field] || field}`,
                        400
                    )
                );
            }
        }

        for (const field of TEXT_ONLY_FILTER_FIELDS) {
            const value = getFilterValue(parsedFilters, field);
            if (value == null || String(value).trim() === "") {
                continue;
            }

            if (!/^[A-Za-z\s]+$/.test(String(value).trim())) {
                return res.status(400).json(
                    ResponseFormatter.error(
                        `Please enter only text in ${FIELD_LABELS[field] || field}`,
                        400
                    )
                );
            }
        }

        const dateValue = getFilterValue(parsedFilters, "date");
        if (dateValue != null && String(dateValue).trim() !== "" && !isValidDateValue(dateValue)) {
            return res.status(400).json(
                ResponseFormatter.error(
                    "Please enter a valid date in Date using YYYY-MM-DD format",
                    400
                )
            );
        }

        const result = await discountReportModel.getDiscountReport(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res.status(200).json(ResponseFormatter.success([], "No discount data found"));
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
                        "Discount report retrieved successfully"
                    )
                );
        }

        // Fallback (shouldn't happen)
        res.status(200).json(
            ResponseFormatter.success(result, "Discount report retrieved successfully")
        );
    }),
};
