const addonsModel = require("../../../models/masters/subscription-mgmt/addons.model");
const moment = require("moment");
const winston = require("../../../config/winston");
const ResponseFormatter = require("../../../utils/responseFormatter");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { NotFoundError, BadRequestError, ConflictError } = require("../../../utils/customErrors");

module.exports = {
    /**
     * Get addons list with pagination and filtering
     */
    getAddons: asyncHandler(async (req, res) => {
        const result = await addonsModel.getAddons(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res.status(200).json(ResponseFormatter.success([], "No addons found"));
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
                        "Addons retrieved successfully"
                    )
                );
        }

        res.status(200).json(ResponseFormatter.success(result, "Addons retrieved successfully"));
    }),

    /**
     * Get addon by ID
     */
    getData: asyncHandler(async (req, res) => {
        const addonid = req.params.id;

        if (!addonid || isNaN(addonid)) {
            throw new BadRequestError("Invalid addon ID");
        }

        const result = await addonsModel.getData(addonid);

        if (!result || result.length === 0) {
            throw new NotFoundError("Addon");
        }

        res.status(200).json(
            ResponseFormatter.success(result[0], "Addon data retrieved successfully")
        );
    }),

    /**
     * Create new addon
     */
    create: asyncHandler(async (req, res) => {
        const {
            addonname,
            description,
            limitation,
            isactive = 1,
            duration,
            particularid,
            price
        } = req.body;

        // Check if addon already exists
        const exists = await addonsModel.checkAddonExists(addonname);
        if (exists) {
            throw new ConflictError("Addon with this name already exists");
        }

        const data = {
            addonname: addonname.trim(),
            description: description || null,
            limitation: limitation || null,
            isactive,
            duration: duration || null,
            particularid: particularid || null,
            price
        };

        const result = await addonsModel.create(data);

        if (result.insertId) {
            const newAddon = await addonsModel.getData(result.insertId);

            winston.info(`New addon created: ${addonname} with ID: ${result.insertId}`, {
                source: "addons.controller.js",
                function: "create",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                addonId: result.insertId,
                addonname
            });

            res.status(201).json(
                ResponseFormatter.success(
                    newAddon[0],
                    "Addon created successfully"
                )
            );
        } else {
            throw new BadRequestError("Failed to create addon");
        }
    }),

    /**
     * Update addon
     */
    update: asyncHandler(async (req, res) => {
        const addonid = req.params.id;
        const {
            addonname,
            description,
            limitation,
            isactive,
            duration,
            particularid,
            price
        } = req.body;

        if (!addonid || isNaN(addonid)) {
            throw new BadRequestError("Invalid addon ID");
        }

        // Check if addon exists
        const existingAddon = await addonsModel.getData(addonid);
        if (!existingAddon || existingAddon.length === 0) {
            throw new NotFoundError("Addon");
        }

        // If name is being changed, check if new name already exists
        if (addonname && addonname !== existingAddon[0].addonname) {
            const exists = await addonsModel.checkAddonExists(addonname, addonid);
            if (exists) {
                throw new ConflictError("Addon with this name already exists");
            }
        }


        const updateData = {};
        if (addonname !== undefined) updateData.addonname = addonname.trim();
        if (description !== undefined) updateData.description = description;
        if (limitation !== undefined) updateData.limitation = limitation;
        if (isactive !== undefined) updateData.isactive = isactive;
        if (duration !== undefined) updateData.duration = duration;
        if (particularid !== undefined) updateData.particularid = particularid;
        if (price !== undefined) updateData.price = price;

        const result = await addonsModel.update(addonid, updateData);

        if (result.affectedRows > 0) {
            const updatedAddon = await addonsModel.getData(addonid);

            winston.info(`Addon updated: ID ${addonid}`, {
                source: "addons.controller.js",
                function: "update",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                addonid
            });

            res.status(200).json(
                ResponseFormatter.success(
                    updatedAddon[0],
                    "Addon updated successfully"
                )
            );
        } else {
            res.status(200).json(
                ResponseFormatter.success(
                    existingAddon[0],
                    "No changes made to addon"
                )
            );
        }
    }),

    /**
     * Delete addon (soft delete)
     */
    delete: asyncHandler(async (req, res) => {
        const addonid = req.params.id;

        if (!addonid || isNaN(addonid)) {
            throw new BadRequestError("Invalid addon ID");
        }

        // Check if addon exists
        const existingAddon = await addonsModel.getData(addonid);
        if (!existingAddon || existingAddon.length === 0) {
            throw new NotFoundError("Addon");
        }

        const result = await addonsModel.delete(addonid);

        if (result.affectedRows > 0) {
            winston.info(`Addon deleted: ID ${addonid}`, {
                source: "addons.controller.js",
                function: "delete",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                addonid
            });

            res.status(200).json(
                ResponseFormatter.success(
                    { addonid: addonid },
                    "Addon deleted successfully"
                )
            );
        } else {
            throw new BadRequestError("Failed to delete addon");
        }
    }),

    /**
     * Get active addons for dropdown
     */
    getActiveAddons: asyncHandler(async (req, res) => {
        const result = await addonsModel.getActiveAddons();

        res.status(200).json(
            ResponseFormatter.success(
                result,
                "Active addons retrieved successfully"
            )
        );
    }),

    /**
     * Get addons by particular
     */
    getAddonsByParticular: asyncHandler(async (req, res) => {
        const particularid = req.params.particularid;

        if (!particularid || isNaN(particularid)) {
            throw new BadRequestError("Invalid particular ID");
        }

        const result = await addonsModel.getAddonsByParticular(particularid);

        res.status(200).json(
            ResponseFormatter.success(
                result,
                "Addons retrieved successfully"
            )
        );
    }),

    /**
     * Get addons grouped by particular
     */
    getAddonsGroupedByParticular: asyncHandler(async (req, res) => {
        const result = await addonsModel.getAddonsGroupedByParticular();

        res.status(200).json(
            ResponseFormatter.success(
                result,
                "Grouped addons retrieved successfully"
            )
        );
    }),

    /**
     * Bulk update addon prices
     */
    bulkUpdatePrices: asyncHandler(async (req, res) => {
        const { updates } = req.body;



        const result = await addonsModel.bulkUpdatePrices(updates);

        winston.info(`Bulk price update: ${result.updated} addons updated`, {
            source: "addons.controller.js",
            function: "bulkUpdatePrices",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            updatedCount: result.updated
        });

        res.status(200).json(
            ResponseFormatter.success(
                result,
                `${result.updated} addon prices updated successfully`
            )
        );
    }),

    /**
     * Duplicate an addon
     */
    duplicateAddon: asyncHandler(async (req, res) => {
        const addonid = req.params.id;
        const { newAddonName } = req.body;

        if (!addonid || isNaN(addonid)) {
            throw new BadRequestError("Invalid addon ID");
        }


        // Check if addon exists
        const existingAddon = await addonsModel.getData(addonid);
        if (!existingAddon || existingAddon.length === 0) {
            throw new NotFoundError("Addon to duplicate");
        }

        // Check if new name already exists
        const exists = await addonsModel.checkAddonExists(newAddonName);
        if (exists) {
            throw new ConflictError("Addon with this name already exists");
        }

        const result = await addonsModel.duplicateAddon(addonid, newAddonName.trim());

        if (result.insertId) {
            const newAddon = await addonsModel.getData(result.insertId);

            winston.info(`Addon duplicated: Original ID ${addonid}, New ID: ${result.insertId}`, {
                source: "addons.controller.js",
                function: "duplicateAddon",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                originalId: addonid,
                newId: result.insertId
            });

            res.status(201).json(
                ResponseFormatter.success(
                    newAddon[0],
                    "Addon duplicated successfully"
                )
            );
        } else {
            throw new BadRequestError("Failed to duplicate addon");
        }
    })
};