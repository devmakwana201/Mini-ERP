
const itemtype = require("../models/masters/inventory/itemtype.model.js");
const itemcategory = require("../models/masters/inventory/itemcategory.model.js");
const brand = require("../models/masters/inventory/brand.model.js");
const uom = require("../models/masters/inventory/uom.model.js");
const common = require("../models/common.model.js");
const { asyncHandler } = require("../utils/asyncHandler");
const { BadRequestError, NotFoundError } = require("../utils/customErrors");
const ResponseFormatter = require("../utils/responseFormatter.js");

module.exports = {
    subcategory: asyncHandler(async (req, res) => {
        const parentCategoryId = req.params.id;
        let result;
        if(!parentCategoryId || isNaN(parentCategoryId)){
            result = await itemcategory.getSubCategory();
        }else{
            result = await itemcategory.getSubCategory(parentCategoryId);
        }
        
        if(!result || result.length === 0) {
            return res.status(200).json(
                ResponseFormatter.success([], "No item subcategories found")
            )
        }
        res.status(200).json(
            ResponseFormatter.success(result, "Item category data retrieved successfully")
        )
    }),
    getbrand: asyncHandler(async (req, res) => {
        const result = await brand.getBrand();
        
        if(!result || result.length === 0) {
            throw new NotFoundError("brand")
        }
        res.status(200).json(
            ResponseFormatter.success(result, "brand data retrieved successfully")
        )
    }),
    getitemtype: asyncHandler(async (req, res) => {
        const result = await itemtype.getItemType();
        
        if(!result || result.length === 0) {
            throw new NotFoundError("item type")
        }
        res.status(200).json(
            ResponseFormatter.success(result, "item type data retrieved successfully")
        )
    }),

    getuom: asyncHandler(async (req, res) => {
        const result = await uom.getUOM();
        
        if(!result || result.length === 0) {
            throw new NotFoundError("UOM")
        }
        res.status(200).json(
            ResponseFormatter.success(result, "UOM data retrieved successfully")
        )
    }),
    getdropdowndata: asyncHandler(async (req, res) => {
        const key = req.params.key;
        const id = req.query?.id;
        if (!key) {
            return res.status(400).json(
                ResponseFormatter.error("Key parameter is required")
            );
        }
        
        let result = null;
        let message = "";

        switch (key) {
            case "brand":
                result = await brand.getBrand();
                message = "Brand data retrieved successfully";
                break;
            case "itemtype":
                result = await itemtype.getItemType();
                message = "Item type data retrieved successfully";
                break;
            case "uom":
                result = await uom.getUOM();
                message = "UOM data retrieved successfully";
                break;
            case "itemcategory":
                result = await itemcategory.getItemCategory();
                message = "item category data retrieved successfully";
                break;
            case "country":
                result = await common.getCountry();
                message = "Country data retrieved successfully";
                break;
            case "state":
                result = await common.getState(id);
                message = "State data retrieved successfully";
                break;
            case "city":
                result = await common.getCity(id);
                message = "City data retrieved successfully";
                break;
            case "location":
                result = await common.getLocation();
                message = "Location data retrieved successfully";
                break;
            case "taxprofile":
                result = await common.getTaxProfile();
                message = "Taxprofile data retrieved successfully";
                break;
            default:
                return res.status(400).json(
                    ResponseFormatter.error("Invalid key provided. Use: brand, itemtype, uom, itemcategory, country, state, city, or location")
                );
        }

        if (!result || result.length === 0) {
            throw new NotFoundError(`${key} data`);
        }

        res.status(200).json(
            ResponseFormatter.success(result, message)
        );
    })


}