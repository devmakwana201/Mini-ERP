const companyAddonModel = require("../../../models/masters/subscription-mgmt/companyaddon.model");
const addonsModel = require("../../../models/masters/subscription-mgmt/addons.model");
const companyModel = require("../../../models/masters/subscription-mgmt/company.model");
const moment = require("moment");
const winston = require("../../../config/winston");
const ResponseFormatter = require("../../../utils/responseFormatter");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { NotFoundError, BadRequestError, ConflictError } = require("../../../utils/customErrors");

module.exports = {
    /**
     * Add addon to company
     */
    addAddonToCompany: asyncHandler(async (req, res) => {
        const { companyid } = req.params;
        const { addonid, customPrice, duration, planid } = req.body;

        if (!companyid || isNaN(companyid)) {
            throw new BadRequestError("Invalid company ID");
        }


        // Check if company exists
        const company = await companyModel.getData(companyid);
        if (!company || company.length === 0) {
            throw new NotFoundError("Company");
        }

        // Check if addon exists and is active
        const addon = await addonsModel.getData(addonid);
        if (!addon || addon.length === 0) {
            throw new NotFoundError("Addon");
        }

        if (!addon[0].isactive) {
            throw new BadRequestError("Selected addon is not active");
        }

        // Check if company already has this addon active
        const alreadyExists = await companyAddonModel.checkCompanyAddonExists(companyid, addonid);
        if (alreadyExists) {
            throw new ConflictError("Company already has this addon active");
        }


        const data = {
            companyid: parseInt(companyid),
            addonid,
            planid: planid || null,
            customPrice,
            duration
        };

        const result = await companyAddonModel.addAddonToCompany(data);

        winston.info(`Addon ${addonid} added to company ${companyid}`, {
            source: "companyaddon.controller.js",
            function: "addAddonToCompany",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            addonid,
            companyid
        });

        res.status(201).json(
            ResponseFormatter.success(
                result,
                "Addon added to company successfully"
            )
        );
    }),

    /**
     * Get company addons
     */
    getCompanyAddons: asyncHandler(async (req, res) => {
        const { companyid } = req.params;

        if (!companyid || isNaN(companyid)) {
            throw new BadRequestError("Invalid company ID");
        }

        // Check if company exists
        const company = await companyModel.getData(companyid);
        if (!company || company.length === 0) {
            throw new NotFoundError("Company");
        }

        const result = await companyAddonModel.getCompanyAddons(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res.status(200).json(ResponseFormatter.success([], "No company addons found"));
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
                        "Company addons retrieved successfully"
                    )
                );
        }

        res.status(200).json(ResponseFormatter.success(result, "Company addons retrieved successfully"));
    }),

    /**
     * Get all company addons (admin view)
     */
    getAllCompanyAddons: asyncHandler(async (req, res) => {
        const result = await companyAddonModel.getAllCompanyAddons(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res.status(200).json(ResponseFormatter.success([], "No company addons found"));
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
                        "All company addons retrieved successfully"
                    )
                );
        }

        res.status(200).json(ResponseFormatter.success(result, "All company addons retrieved successfully"));
    }),

    /**
     * Get company addon by ID
     */
    getCompanyAddonById: asyncHandler(async (req, res) => {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            throw new BadRequestError("Invalid company addon ID");
        }

        const result = await companyAddonModel.getCompanyAddonById(id);

        if (!result || result.length === 0) {
            throw new NotFoundError("Company addon");
        }

        res.status(200).json(
            ResponseFormatter.success(result[0], "Company addon retrieved successfully")
        );
    }),

    /**
     * Update company addon
     */
    updateCompanyAddon: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { price, enddate, isactive } = req.body;

        if (!id || isNaN(id)) {
            throw new BadRequestError("Invalid company addon ID");
        }

        // Check if company addon exists
        const existingAddon = await companyAddonModel.getCompanyAddonById(id);
        if (!existingAddon || existingAddon.length === 0) {
            throw new NotFoundError("Company addon");
        }

        // Validate price if provided
        if (price !== undefined && price < 0) {
            throw new BadRequestError("Price cannot be negative");
        }

        // Validate end date if provided
        if (enddate && !moment(enddate).isValid()) {
            throw new BadRequestError("Invalid end date format");
        }

        const updateData = {};
        if (price !== undefined) updateData.price = price;
        if (enddate !== undefined) updateData.enddate = enddate;
        if (isactive !== undefined) updateData.isactive = isactive;

        const result = await companyAddonModel.updateCompanyAddon(id, updateData);

        if (result.affectedRows > 0) {
            const updatedAddon = await companyAddonModel.getCompanyAddonById(id);

            winston.info(`Company addon updated: ID ${id}`, {
                source: "companyaddon.controller.js",
                function: "updateCompanyAddon",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                companyaddonId: id
            });

            res.status(200).json(
                ResponseFormatter.success(
                    updatedAddon[0],
                    "Company addon updated successfully"
                )
            );
        } else {
            res.status(200).json(
                ResponseFormatter.success(
                    existingAddon[0],
                    "No changes made to company addon"
                )
            );
        }
    }),

    /**
     * Renew/extend company addon
     */
    renewCompanyAddon: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { extensionDays } = req.body;

        if (!id || isNaN(id)) {
            throw new BadRequestError("Invalid company addon ID");
        }

        if (!extensionDays || extensionDays <= 0) {
            throw new BadRequestError("Extension days must be positive");
        }

        // Check if company addon exists
        const existingAddon = await companyAddonModel.getCompanyAddonById(id);
        if (!existingAddon || existingAddon.length === 0) {
            throw new NotFoundError("Company addon");
        }

        const result = await companyAddonModel.renewCompanyAddon(id, extensionDays);

        if (result.affectedRows > 0) {
            const renewedAddon = await companyAddonModel.getCompanyAddonById(id);

            winston.info(`Company addon renewed: ID ${id}, extended by ${extensionDays} days`, {
                source: "companyaddon.controller.js",
                function: "renewCompanyAddon",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                companyaddonId: id,
                extensionDays
            });

            res.status(200).json(
                ResponseFormatter.success(
                    renewedAddon[0],
                    `Company addon renewed for ${extensionDays} days successfully`
                )
            );
        } else {
            throw new BadRequestError("Failed to renew company addon");
        }
    }),

    /**
     * Deactivate company addon
     */
    deactivateCompanyAddon: asyncHandler(async (req, res) => {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            throw new BadRequestError("Invalid company addon ID");
        }

        // Check if company addon exists
        const existingAddon = await companyAddonModel.getCompanyAddonById(id);
        if (!existingAddon || existingAddon.length === 0) {
            throw new NotFoundError("Company addon");
        }

        const result = await companyAddonModel.deactivateCompanyAddon(id);

        if (result.affectedRows > 0) {
            winston.info(`Company addon deactivated: ID ${id}`, {
                source: "companyaddon.controller.js",
                function: "deactivateCompanyAddon",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                companyaddonId: id
            });

            res.status(200).json(
                ResponseFormatter.success(
                    { companyaddonid: id },
                    "Company addon deactivated successfully"
                )
            );
        } else {
            throw new BadRequestError("Failed to deactivate company addon");
        }
    }),

    /**
     * Get available addons for a company
     */
    getAvailableAddonsForCompany: asyncHandler(async (req, res) => {
        const { companyid } = req.params;

        if (!companyid || isNaN(companyid)) {
            throw new BadRequestError("Invalid company ID");
        }

        // Check if company exists
        const company = await companyModel.getData(companyid);
        if (!company || company.length === 0) {
            throw new NotFoundError("Company");
        }

        const result = await companyAddonModel.getAvailableAddonsForCompany(companyid);

        res.status(200).json(
            ResponseFormatter.success(
                result,
                "Available addons for company retrieved successfully"
            )
        );
    }),

    /**
     * Get expiring company addons
     */
    getExpiringCompanyAddons: asyncHandler(async (req, res) => {
        const days = req.query.days || 7;

        if (days < 1 || days > 365) {
            throw new BadRequestError("Days must be between 1 and 365");
        }

        const result = await companyAddonModel.getExpiringCompanyAddons(days);

        res.status(200).json(
            ResponseFormatter.success(
                result,
                `Company addons expiring in ${days} days retrieved successfully`
            )
        );
    }),

    /**
     * Bulk operations for company addons
     */
    bulkDeactivateCompanyAddons: asyncHandler(async (req, res) => {
        const { companyaddonIds } = req.body;

        if (!companyaddonIds || !Array.isArray(companyaddonIds) || companyaddonIds.length === 0) {
            throw new BadRequestError("Company addon IDs array is required");
        }

        let deactivatedCount = 0;
        const errors = [];

        for (const id of companyaddonIds) {
            try {
                const result = await companyAddonModel.deactivateCompanyAddon(id);
                if (result.affectedRows > 0) {
                    deactivatedCount++;
                }
            } catch (error) {
                errors.push({ id, error: error.message });
            }
        }

        winston.info(`Bulk deactivation completed: ${deactivatedCount} addons deactivated`, {
            source: "companyaddon.controller.js",
            function: "bulkDeactivateCompanyAddons",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            deactivatedCount
        });

        res.status(200).json(
            ResponseFormatter.success(
                {
                    deactivatedCount,
                    totalRequested: companyaddonIds.length,
                    errors: errors.length > 0 ? errors : null
                },
                `${deactivatedCount} company addons deactivated successfully`
            )
        );
    })
};