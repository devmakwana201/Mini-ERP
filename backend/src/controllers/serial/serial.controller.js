const serialModel = require("../../models/serial/serial.model.js");
const { asyncHandler } = require("../../utils/asyncHandler.js");
const { BadRequestError, NotFoundError } = require("../../utils/customErrors.js");
const ResponseFormatter = require("../../utils/responseFormatter.js");

module.exports = {
    createSerials: asyncHandler(async (req, res) => {
        const { addnumber, is_nfs, free_demo } = req.body;

        if (!addnumber || isNaN(addnumber) || addnumber <= 0) {
            throw new BadRequestError("Please provide a valid number of serial keys to generate");
        }

        if (addnumber > 100) {
            throw new BadRequestError("Cannot generate more than 100 serial keys at once");
        }

        const serialData = {
            addnumber: parseInt(addnumber),
            is_nfs: parseInt(is_nfs) || 0,
            free_demo: parseInt(free_demo) || 0,
            userId: req.user?.userId || 1,
            companyId: req.user?.companyId || 1,
            ipAddress: req.ip || req.connection.remoteAddress
        };

        const result = await serialModel.createSerials(serialData);

        if (result.success !== 1) {
            res.status(result.status).json(
                ResponseFormatter.error(result.msg)
            );
            return;
        }

        res.status(result.status).json(
            ResponseFormatter.success(result.data, result.msg)
        );
    }),

    getSerials: asyncHandler(async (req, res) => {
        const { startDate, endDate, isnfs } = req.body;

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                throw new BadRequestError("Invalid date format. Use MM/DD/YYYY format");
            }

            if (start > end) {
                throw new BadRequestError("Start date cannot be after end date");
            }
        }

        if (isnfs !== undefined && !Array.isArray(isnfs)) {
            throw new BadRequestError("isnfs must be an array of values [0, 1]");
        }

        if (isnfs && isnfs.some(val => ![0, 1].includes(parseInt(val)))) {
            throw new BadRequestError("isnfs values must be 0 or 1");
        }

        const result = await serialModel.getSerials(req);

        if (!result || result.length === 0) {
            throw new NotFoundError("Serial keys");
        }
        if (result.data && result.pagination) {
            return res
                .status(200)
                .json(
                    ResponseFormatter.paginated(
                        result.data,
                        result.pagination.start,
                        result.pagination.length,
                        result.pagination.total,
                        "Serial key retrieved successfully"
                    )
                );
        }
        res.status(200).json(
            ResponseFormatter.success(result.data, "Serial keys retrieved successfully")
        );
    }),

    getSerialReport: asyncHandler(async (req, res) => {
        const { startDate, endDate, isnfs } = req.body;

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                throw new BadRequestError("Invalid date format. Use MM/DD/YYYY format");
            }

            if (start > end) {
                throw new BadRequestError("Start date cannot be after end date");
            }
        }

        if (isnfs !== undefined && !Array.isArray(isnfs)) {
            throw new BadRequestError("isnfs must be an array of values [0, 1]");
        }

        if (isnfs && isnfs.some(val => ![0, 1].includes(parseInt(val)))) {
            throw new BadRequestError("isnfs values must be 0 or 1");
        }

        const result = await serialModel.getSerialReport(req);
        
        if (!result || result.length === 0) {
            throw new NotFoundError("Serial keys");
        }
        
        // if (result.data && result.pagination) {
            return res
                .status(200)
                .json(
                    ResponseFormatter.paginated(
                        result.data,
                        result.pagination.start,
                        result.pagination.length,
                        result.pagination.total,
                        "Serial report retrieved successfully"
                    )
                );
        // }
        
    }),

    getKeyCount: asyncHandler(async (req, res) => {
        const totalKeys = await serialModel.serialkeyCount();
        const usedKeys = await serialModel.usedkeyCount();
        const unusedKeys = totalKeys - usedKeys;

        res.status(200).json(
            ResponseFormatter.success({
                totalKeys,
                usedKeys,
                unusedKeys
            }, "Keys count retrieved successfully")
        );
    })
};