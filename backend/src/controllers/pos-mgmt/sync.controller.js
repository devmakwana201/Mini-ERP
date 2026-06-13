const syncModel = require("../../models/pos-mgmt/sync.model");
const ResponseFormatter = require("../../utils/responseFormatter");
const { asyncHandler } = require("../../utils/asyncHandler");
const { BadRequestError } = require("../../utils/customErrors");
const winston = require("../../config/winston");

module.exports = {
    getMasterData: asyncHandler(async (req, res) => {
        const { lastsyncdates } = req.body;

        let lastSyncDatesObj = {};
        if (lastsyncdates) {
            lastsyncdates.forEach((item) => {
                lastSyncDatesObj[item.tablename] = item.lastsyncdate;
            });
        }

        const posData = {};

        if (lastSyncDatesObj.brandmst) {
            posData.brandmst = await syncModel.getBrandMaster(lastSyncDatesObj.brandmst);
        } else {
            posData.brandmst = [];
        }

        if (lastSyncDatesObj.itemcategorymst) {
            posData.itemcategorymst = await syncModel.getItemCategoryMaster(
                lastSyncDatesObj.itemcategorymst
            );
        } else {
            posData.itemcategorymst = [];
        }
        if (lastSyncDatesObj.itemtypemst) {
            posData.itemtypemst = await syncModel.getItemTypeMaster(lastSyncDatesObj.itemtypemst);
        } else {
            posData.itemtypemst = [];
        }

        // if (lastSyncDatesObj.itemmst) {
        //     posData.itemmst = await syncModel.getItemMaster(lastSyncDatesObj.itemmst);
        // } else {
        //     posData.itemmst = [];
        // }

        if (lastSyncDatesObj.suppliermst) {
            posData.suppliermst = await syncModel.getSupplierMaster(lastSyncDatesObj.suppliermst);
        } else {
            posData.suppliermst = [];
        }

        if (lastSyncDatesObj.uommst) {
            posData.uommst = await syncModel.getUOMMaster(lastSyncDatesObj.uommst);
        } else {
            posData.uommst = [];
        }

        if (lastSyncDatesObj.taxmst) {
            posData.taxmst = await syncModel.getTaxMaster(lastSyncDatesObj.taxmst);
        } else {
            posData.taxmst = [];
        }

        if (lastSyncDatesObj.taxprofilemst) {
            posData.taxprofilemst = await syncModel.getTaxProfileMaster(
                lastSyncDatesObj.taxprofilemst
            );
        } else {
            posData.taxprofilemst = [];
        }

        if (lastSyncDatesObj.taxprofiledetails) {
            posData.taxprofiledetails = await syncModel.getTaxProfileDetails(
                lastSyncDatesObj.taxprofiledetails
            );
        } else {
            posData.taxprofiledetails = [];
        }

        if (lastSyncDatesObj.reasonmst) {
            posData.reasonmst = await syncModel.getReasonMaster(lastSyncDatesObj.reasonmst);
        } else {
            posData.reasonmst = [];
        }

        if (lastSyncDatesObj.reasontypemst) {
            posData.reasontypemst = await syncModel.getReasonTypeMaster(lastSyncDatesObj.reasontypemst);
        } else {
            posData.reasontypemst = [];
        }

        if (lastSyncDatesObj.paymenttype) {
            posData.paymenttype = await syncModel.getPaymentType(lastSyncDatesObj.paymenttype);
        } else {
            posData.paymenttype = [];
        }

        if (lastSyncDatesObj.planmst) {
            posData.planmst = await syncModel.getPlanMaster(lastSyncDatesObj.planmst);
        } else {
            posData.planmst = [];
        }

        if (lastSyncDatesObj.plandetails) {
            posData.plandetails = await syncModel.getPlanDetails(lastSyncDatesObj.plandetails);
        } else {
            posData.plandetails = [];
        }

        if (lastSyncDatesObj.addons) {
            posData.addons = await syncModel.getAddons(lastSyncDatesObj.addons);
        } else {
            posData.addons = [];
        }

        winston.debug(`POS sync data fetched`, {
            source: "pos-mgmt/sync.controller.js",
            function: "syncPOSMasterData",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
        });
        return res
            .status(200)
            .json(ResponseFormatter.success(posData, "POS master data retrieved successfully"));
    }),
    getItems: asyncHandler(async (req, res) => {
        const {
            categoryids,
            mastercategoryids,
            subcategoryids,
            brandids,
            start = 0,
            length = 20,
            search = "",
            companyId: bodyCompanyId
        } = req.body;

        if (!categoryids && !mastercategoryids && !subcategoryids) {
            throw new BadRequestError(
                "At least one of categoryids, mastercategoryids, or subcategoryids is required"
            );
        }

        // Get companyId from POS token OR request body
        const companyId = req.pos?.companyId || req.installation?.companyId || bodyCompanyId;

        if (!companyId) {
            throw new BadRequestError("Company ID is required. Either provide POS token or companyId in request body");
        }

        const result = await syncModel.getItems({
            mastercategoryids: mastercategoryids || [],
            categoryids: categoryids || [],
            subcategoryids: subcategoryids || [],
            brandids: brandids || [],
            companyid: companyId,
            start: parseInt(start),
            length: parseInt(length),
            search: search.trim(),
        });

        winston.debug(`Items fetched for company ${companyId}, page: ${Math.floor(start / length) + 1}`, {
            source: "pos-mgmt/sync.controller.js",
            function: "getItems",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
        });
        return res
            .status(200)
            .json(ResponseFormatter.success(result, "Items retrieved successfully"));
    }),

    /**
     * Get company-specific item overrides for incremental sync
     * Returns pricing and customization data from company_itemmaster table
     */
    getCompanyItemMaster: asyncHandler(async (req, res) => {
        const { modifiedDate, companyId: bodyCompanyId } = req.body;

        // Get companyId from POS token OR request body
        const companyId = req.pos?.companyId || req.installation?.companyId || bodyCompanyId;

        if (!companyId) {
            throw new BadRequestError("Company ID is required. Either provide POS token or companyId in request body");
        }

        if (!modifiedDate) {
            throw new BadRequestError("modifiedDate is required for incremental sync");
        }

        const companyItems = await syncModel.getCompanyItemMaster(modifiedDate, companyId);

        winston.debug(`Company item overrides fetched for company ${companyId}, count: ${companyItems.length}`, {
            source: "pos-mgmt/sync.controller.js",
            function: "getCompanyItemMaster",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
        });
        return res
            .status(200)
            .json(ResponseFormatter.success({
                companyitemmst: companyItems
            }, "Company item overrides retrieved successfully"));
    }),
};
