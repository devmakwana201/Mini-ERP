const particularMasterModel = require("../../../models/masters/subscription-mgmt/particularmaster.model");
const moment = require("moment");
const winston = require("../../../config/winston");
const ResponseFormatter = require("../../../utils/responseFormatter");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { NotFoundError, BadRequestError, ConflictError } = require("../../../utils/customErrors");

module.exports = {
    /**
     * Get particulars list with pagination and filtering
     */
    getParticulars: asyncHandler(async (req, res) => {
        const result = await particularMasterModel.getParticulars(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res.status(200).json(ResponseFormatter.success([], "No particulars found"));
        }

        // If result has pagination info
        if (result.data && result.pagination) {
            return res
                .status(200)
                .json(
                    ResponseFormatter.paginated(
                        result.data,
                        result.pagination.start,
                        result.pagination.length,
                        result.pagination.total,
                        "Particulars retrieved successfully"
                    )
                );
        }

        res.status(200).json(ResponseFormatter.success(result, "Particulars retrieved successfully"));
    }),

    /**
     * Get particular by ID
     */
    getData: asyncHandler(async (req, res) => {
        const particularid = req.params.id;

        if (!particularid || isNaN(particularid)) {
            throw new BadRequestError("Invalid particular ID");
        }

        const result = await particularMasterModel.getData(particularid);

        if (!result || result.length === 0) {
            throw new NotFoundError("Particular");
        }

        res.status(200).json(
            ResponseFormatter.success(result[0], "Particular data retrieved successfully")
        );
    }),

    /**
     * Create new particular
     */
    create: asyncHandler(async (req, res) => {
        const { name, isactive = 1 } = req.body;

        // Check if particular already exists
        const exists = await particularMasterModel.checkParticularExists(name);
        if (exists) {
            throw new ConflictError("Particular with this name already exists");
        }

        const data = {
            name: name.trim(),
            isactive: isactive
        };

        const result = await particularMasterModel.create(data);

        if (result.insertId) {
            const newParticular = await particularMasterModel.getData(result.insertId);

            winston.info(`New particular created: ${name} with ID: ${result.insertId}`, {
                source: "particularmaster.controller.js",
                function: "create",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                particularId: result.insertId,
                name
            });

            res.status(201).json(
                ResponseFormatter.success(
                    newParticular[0],
                    "Particular created successfully"
                )
            );
        } else {
            throw new BadRequestError("Failed to create particular");
        }
    }),

    /**
     * Update particular
     */
    update: asyncHandler(async (req, res) => {
        const particularid = req.params.id;
        const { name, isactive } = req.body;

        if (!particularid || isNaN(particularid)) {
            throw new BadRequestError("Invalid particular ID");
        }

        // Check if particular exists
        const existingParticular = await particularMasterModel.getData(particularid);
        if (!existingParticular || existingParticular.length === 0) {
            throw new NotFoundError("Particular");
        }

        // If name is being changed, check if new name already exists
        if (name && name !== existingParticular[0].name) {
            const exists = await particularMasterModel.checkParticularExists(name, particularid);
            if (exists) {
                throw new ConflictError("Particular with this name already exists");
            }
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name.trim();
        if (isactive !== undefined) updateData.isactive = isactive;

        const result = await particularMasterModel.update(particularid, updateData);

        if (result.affectedRows > 0) {
            const updatedParticular = await particularMasterModel.getData(particularid);

            winston.info(`Particular updated: ID ${particularid}`, {
                source: "particularmaster.controller.js",
                function: "update",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                particularid
            });

            res.status(200).json(
                ResponseFormatter.success(
                    updatedParticular[0],
                    "Particular updated successfully"
                )
            );
        } else {
            res.status(200).json(
                ResponseFormatter.success(
                    existingParticular[0],
                    "No changes made to particular"
                )
            );
        }
    }),

    /**
     * Delete particular (soft delete)
     */
    delete: asyncHandler(async (req, res) => {
        const particularid = req.params.id;

        if (!particularid || isNaN(particularid)) {
            throw new BadRequestError("Invalid particular ID");
        }

        // Check if particular exists
        const existingParticular = await particularMasterModel.getData(particularid);
        if (!existingParticular || existingParticular.length === 0) {
            throw new NotFoundError("Particular");
        }

        const result = await particularMasterModel.delete(particularid);

        if (result.affectedRows > 0) {
            winston.info(`Particular deleted: ID ${particularid}`, {
                source: "particularmaster.controller.js",
                function: "delete",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                particularid
            });

            res.status(200).json(
                ResponseFormatter.success(
                    { particularid: particularid },
                    "Particular deleted successfully"
                )
            );
        } else {
            throw new BadRequestError("Failed to delete particular");
        }
    }),

    /**
     * Get active particulars for dropdown
     */
    getActiveParticulars: asyncHandler(async (req, res) => {
        const result = await particularMasterModel.getActiveParticulars();

        res.status(200).json(
            ResponseFormatter.success(
                result,
                "Active particulars retrieved successfully"
            )
        );
    })
};