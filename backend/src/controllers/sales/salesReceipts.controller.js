const salesReceipts = require("../../models/sales/salesReceipts.model.js");
const { asyncHandler } = require("../../utils/asyncHandler");
const { BadRequestError, NotFoundError } = require("../../utils/customErrors");
const ResponseFormatter = require("../../utils/responseFormatter.js");

module.exports = {
    ebill: asyncHandler(async(req, res) => {
        const billId = req.params.id;
        const formatid = req.body.formatid;

        if(!billId) {
            throw new BadRequestError("Invalid Bill ID");
        }

        const result = await salesReceipts.ebill(billId, formatid);

        // if (!result || result.length === 0) {
        //     throw new NotFoundError("ebill");
        // }
        res.status(200).json(
            ResponseFormatter.success(result, "E-Bill Retrived Succefullly!")
        )
    }),

    ebillSeed: asyncHandler(async(req, res) => {
        const billId = req.params.id;

        if(!billId) {
            throw new BadRequestError("Invalid Bill ID");
        }

        const result = await salesReceipts.ebillSeed(billId);

        res.status(200).json(
            ResponseFormatter.success(result, "Seed E-Bill Retrived Successfully!")
        )
    }),

    ebillFertilizer: asyncHandler(async(req, res) => {
        const billId = req.params.id;

        if(!billId) {
            throw new BadRequestError("Invalid Bill ID");
        }

        const result = await salesReceipts.ebillFertilizer(billId);

        res.status(200).json(
            ResponseFormatter.success(result, "Fertilizer E-Bill Retrived Successfully!")
        )
    }),

    ebillPesticide: asyncHandler(async(req, res) => {
        const billId = req.params.id;

        if(!billId) {
            throw new BadRequestError("Invalid Bill ID");
        }

        const result = await salesReceipts.ebillPesticide(billId);

        res.status(200).json(
            ResponseFormatter.success(result, "Pesticide E-Bill Retrived Successfully!")
        )
    }),
}