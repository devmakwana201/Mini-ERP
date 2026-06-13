const planMasterModel = require("../../../models/masters/subscription-mgmt/planmaster.model");
const moment = require("moment");
const winston = require("../../../config/winston");
const ResponseFormatter = require("../../../utils/responseFormatter");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { NotFoundError, BadRequestError, ConflictError } = require("../../../utils/customErrors");

module.exports = {
    /**
     * Get plans list with pagination and filtering
     */
    getPlans: asyncHandler(async (req, res) => {
        const result = await planMasterModel.getPlans(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res.status(200).json(ResponseFormatter.success([], "No plans found"));
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
                        "Plans retrieved successfully"
                    )
                );
        }

        res.status(200).json(ResponseFormatter.success(result, "Plans retrieved successfully"));
    }),

    /**
     * Get plan by ID with details
     */
    getData: asyncHandler(async (req, res) => {
        const planid = req.params.id;

        if (!planid || isNaN(planid)) {
            throw new BadRequestError("Invalid plan ID");
        }

        const result = await planMasterModel.getData(planid, true);

        if (!result || result.length === 0) {
            throw new NotFoundError("Plan");
        }

        res.status(200).json(
            ResponseFormatter.success(result[0], "Plan data retrieved successfully")
        );
    }),

    /**
     * Create new plan with details
     */
    create: asyncHandler(async (req, res) => {
        const {
            planname,
            duration,
            description,
            price,
            isactive = 1,
            startdate,
            enddate,
            amc_charges,
            frequency,
            is_trial,
            details = []
        } = req.body;

        // Check if plan already exists
        const exists = await planMasterModel.checkPlanExists(planname);
        if (exists) {
            throw new ConflictError("Plan with this name already exists");
        }

        const data = {
            planname: planname.trim(),
            duration,
            description: description || null,
            price,
            isactive,
            startdate: startdate || null,
            enddate: enddate || null,
            amc_charges: amc_charges || 0,
            frequency,
            is_trial: is_trial || 0,
            details
        };

        const result = await planMasterModel.create(data);

        if (result.insertId) {
            const newPlan = await planMasterModel.getData(result.insertId, true);

            winston.info(`New plan created: ${planname} with ID: ${result.insertId}`, {
                source: "planmaster.controller.js",
                function: "create",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                planId: result.insertId,
                planname
            });

            res.status(201).json(
                ResponseFormatter.success(
                    newPlan[0],
                    "Plan created successfully"
                )
            );
        } else {
            throw new BadRequestError("Failed to create plan");
        }
    }),

    /**
     * Update plan with details
     */
    update: asyncHandler(async (req, res) => {
        const planid = req.params.id;
        const {
            planname,
            duration,
            description,
            price,
            isactive,
            startdate,
            enddate,
            amc_charges,
            frequency,
            is_trial,
            details
        } = req.body;

        if (!planid || isNaN(planid)) {
            throw new BadRequestError("Invalid plan ID");
        }

        // Check if plan exists
        const existingPlan = await planMasterModel.getData(planid, false);
        if (!existingPlan || existingPlan.length === 0) {
            throw new NotFoundError("Plan");
        }

        // If name is being changed, check if new name already exists
        if (planname && planname !== existingPlan[0].planname) {
            const exists = await planMasterModel.checkPlanExists(planname, planid);
            if (exists) {
                throw new ConflictError("Plan with this name already exists");
            }
        }

        const updateData = {};
        if (planname !== undefined) updateData.planname = planname.trim();
        if (duration !== undefined) updateData.duration = duration;
        if (description !== undefined) updateData.description = description;
        if (price !== undefined) updateData.price = price;
        if (isactive !== undefined) updateData.isactive = isactive;
        if (startdate !== undefined) updateData.startdate = startdate;
        if (enddate !== undefined) updateData.enddate = enddate;
        if (amc_charges !== undefined) updateData.amc_charges = amc_charges;
        if (frequency !== undefined) updateData.frequency = frequency;
        if (is_trial !== undefined) updateData.is_trial = is_trial;
        if (details !== undefined) updateData.details = details;

        const result = await planMasterModel.update(planid, updateData);

        if (result.affectedRows > 0) {
            const updatedPlan = await planMasterModel.getData(planid, true);

            winston.info(`Plan updated: ID ${planid}`, {
                source: "planmaster.controller.js",
                function: "update",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                planid
            });

            res.status(200).json(
                ResponseFormatter.success(
                    updatedPlan[0],
                    "Plan updated successfully"
                )
            );
        } else {
            res.status(200).json(
                ResponseFormatter.success(
                    existingPlan[0],
                    "No changes made to plan"
                )
            );
        }
    }),

    /**
     * Delete plan (soft delete)
     */
    delete: asyncHandler(async (req, res) => {
        const planid = req.params.id;

        if (!planid || isNaN(planid)) {
            throw new BadRequestError("Invalid plan ID");
        }

        // Check if plan exists
        const existingPlan = await planMasterModel.getData(planid, false);
        if (!existingPlan || existingPlan.length === 0) {
            throw new NotFoundError("Plan");
        }

        const result = await planMasterModel.delete(planid);

        if (result.affectedRows > 0) {
            winston.info(`Plan deleted: ID ${planid}`, {
                source: "planmaster.controller.js",
                function: "delete",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                planid
            });

            res.status(200).json(
                ResponseFormatter.success(
                    { planid: planid },
                    "Plan deleted successfully"
                )
            );
        } else {
            throw new BadRequestError("Failed to delete plan");
        }
    }),

    /**
     * Get active plans for dropdown
     */
    getActivePlans: asyncHandler(async (req, res) => {
        const result = await planMasterModel.getActivePlans();

        res.status(200).json(
            ResponseFormatter.success(
                result,
                "Active plans retrieved successfully"
            )
        );
    }),

    /**
     * Compare multiple plans
     */
    comparePlans: asyncHandler(async (req, res) => {
        const { planIds } = req.body;

        if (!planIds || !Array.isArray(planIds) || planIds.length === 0) {
            throw new BadRequestError("Plan IDs array is required");
        }

        if (planIds.length > 5) {
            throw new BadRequestError("Maximum 5 plans can be compared at once");
        }

        // Validate all plan IDs are numbers
        for (const id of planIds) {
            if (isNaN(id)) {
                throw new BadRequestError(`Invalid plan ID: ${id}`);
            }
        }

        const result = await planMasterModel.getPlansComparison(planIds);

        res.status(200).json(
            ResponseFormatter.success(
                result,
                "Plans comparison retrieved successfully"
            )
        );
    }),

    /**
     * Duplicate a plan
     */
    duplicatePlan: asyncHandler(async (req, res) => {
        const planid = req.params.id;
        const { newPlanName } = req.body;

        if (!planid || isNaN(planid)) {
            throw new BadRequestError("Invalid plan ID");
        }

        if (!newPlanName || newPlanName.trim() === "") {
            throw new BadRequestError("New plan name is required");
        }

        // Check if plan exists
        const existingPlan = await planMasterModel.getData(planid, false);
        if (!existingPlan || existingPlan.length === 0) {
            throw new NotFoundError("Plan to duplicate");
        }

        // Check if new name already exists
        const exists = await planMasterModel.checkPlanExists(newPlanName);
        if (exists) {
            throw new ConflictError("Plan with this name already exists");
        }

        const result = await planMasterModel.duplicatePlan(planid, newPlanName.trim());

        if (result.insertId) {
            const newPlan = await planMasterModel.getData(result.insertId, true);

            winston.info(`Plan duplicated: Original ID ${planid}, New ID: ${result.insertId}`, {
                source: "planmaster.controller.js",
                function: "duplicatePlan",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                originalId: planid,
                newId: result.insertId
            });

            res.status(201).json(
                ResponseFormatter.success(
                    newPlan[0],
                    "Plan duplicated successfully"
                )
            );
        } else {
            throw new BadRequestError("Failed to duplicate plan");
        }
    }),

    /**
     * Update only plan details (without modifying plan master)
     */
    updatePlanDetails: asyncHandler(async (req, res) => {
        const planid = req.params.id;
        const { details } = req.body;

        if (!planid || isNaN(planid)) {
            throw new BadRequestError("Invalid plan ID");
        }

        // Check if plan exists
        const existingPlan = await planMasterModel.getData(planid, false);
        if (!existingPlan || existingPlan.length === 0) {
            throw new NotFoundError("Plan");
        }

        // Update only details using the replace strategy
        const result = await planMasterModel.update(planid, { details });

        const updatedPlan = await planMasterModel.getData(planid, true);

        winston.info(`Plan details updated: ID ${planid}`, {
            source: "planmaster.controller.js",
            function: "updatePlanDetails",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.id,
            planid
        });

        res.status(200).json(
            ResponseFormatter.success(
                updatedPlan[0],
                "Plan details updated successfully"
            )
        );
    })
};