const searchModel = require("../../models/pos-mgmt/search.model");
const winston = require("../../config/winston");
const ResponseFormatter = require("../../utils/responseFormatter");
const { asyncHandler } = require("../../utils/asyncHandler");
const { BadRequestError } = require("../../utils/customErrors");

module.exports = {
    /**
     * Universal search endpoint
     * Filter types and required params:
     * - product/brand: searchKeyword, mastercategoryId (optional)
     * - supplier/customer/company: mobile, gst
     */
    universalSearch: asyncHandler(async (req, res) => {
        const {
            filterType,
            searchKeyword,     // For product/brand
            mobile,            // For supplier/customer/company
            gst,               // For supplier/customer/company
            panno,
            mastercategoryId,  // Optional for product/brand
            companyId: bodyCompanyId
        } = req.body;

        // Validate required fields
        if (!filterType) {
            throw new BadRequestError("filterType is required");
        }

        // Get companyId and locationId from POS token OR request body
        const companyId = req.pos?.companyId || bodyCompanyId;

        if (!companyId) {
            throw new BadRequestError("Company ID is required. Either provide POS token or companyId in request body");
        }

        // Build search parameters based on filter type
        const searchParams = {};

        const filterTypeLower = filterType.toLowerCase();
        if (filterTypeLower === 'product' || filterTypeLower === 'item' || filterTypeLower === 'brand') {
            // Product/Brand search expects: searchKeyword, mastercategoryId (optional)
            searchParams.searchKeyword = searchKeyword;
            searchParams.mastercategoryId = mastercategoryId;
        } else if (filterTypeLower === 'supplier' || filterTypeLower === 'customer' || filterTypeLower === 'company') {
            // Supplier/Customer/Company search expects: mobile, gst
            searchParams.mobile = mobile;
            searchParams.gst = gst;
            searchParams.panno = panno;
        }

        winston.info(`Universal search request`, {
            source: "search.controller.js",
            function: "universalSearch",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            filterType,
            searchParams,
            companyId,
            hasToken: !!req.pos,
        });

        const result = await searchModel.universalSearch(
            filterType,
            searchParams,
            companyId
        );

        if (result.success) {
            res.status(200).json(
                ResponseFormatter.success(
                    {
                        results: result.data,
                        count: result.count,
                        filterType: result.filterType,
                    },
                    result.msg
                )
            );
        } else {
            res.status(400).json(ResponseFormatter.error(result.msg));
        }
    }),
};