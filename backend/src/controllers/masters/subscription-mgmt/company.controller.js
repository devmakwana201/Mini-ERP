const companyModel = require("../../../models/masters/subscription-mgmt/company.model");
const planMasterModel = require("../../../models/masters/subscription-mgmt/planmaster.model");
const companyNotificationHelper = require("../../../helpers/companyNotificationHelper");
const moment = require("moment");
const winston = require("../../../config/winston");
const ResponseFormatter = require("../../../utils/responseFormatter");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { NotFoundError, BadRequestError, ConflictError } = require("../../../utils/customErrors");

module.exports = {
    /**
     * Register new company with plan
     */
    register: asyncHandler(async (req, res) => {
        const {
            companyname,
            companycontactnumber,
            companyemailid,
            planid,
            offeredPrice,
            offeredAmcCharges,
            remarks,
            address
        } = req.body;

        // Check if email already exists
        const emailExists = await companyModel.checkCompanyExists(companyemailid);
        if (emailExists) {
            throw new ConflictError("Company with this email already exists");
        }

        // Check if company name already exists
        const nameExists = await companyModel.checkCompanyNameExists(companyname);
        if (nameExists) {
            throw new ConflictError("Company with this name already exists");
        }

        // Verify plan exists and is active
        const plan = await planMasterModel.getData(planid, false);
        if (!plan || plan.length === 0) {
            throw new NotFoundError("Selected plan");
        }

        if (!plan[0].isactive) {
            throw new BadRequestError("Selected plan is not active");
        }

        // Extract IP address from request
        const ipAddress =
            req.ip ||
            req.connection?.remoteAddress ||
            req.socket?.remoteAddress ||
            req.connection?.socket?.remoteAddress ||
            req.headers["x-forwarded-for"]?.split(",")[0] ||
            req.headers["x-real-ip"] ||
            "127.0.0.1";

        // Prepare company data
        const companyData = {
            companyname: companyname.trim(),
            companyemailid: companyemailid.trim().toLowerCase(),
            companycontactnumber: companycontactnumber.trim(),
            address: address || null,
            remarks: remarks || null,
            ipaddress: ipAddress,
            createdby: req.user?.userid || 1
        };

        // Prepare plan data
        const planData = {
            planid,
            offeredPrice: offeredPrice !== undefined ? offeredPrice : plan[0].price,
            offeredAmcCharges: offeredAmcCharges !== undefined ? offeredAmcCharges : plan[0].amc_charges,
            autorenewonoff: 0, // Default to no auto-renewal
            remarks: remarks || null
        };

        // Create company with plan
        const result = await companyModel.createWithPlan(companyData, planData);

        if (result.companyid) {
            const newCompany = await companyModel.getData(result.companyid);

            winston.info("New company registered", {
                source: "company.controller.js",
                function: "register",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.userid,
                companyname,
                companyid: result.companyid
            });

            // Send notifications if serial key was generated
            if (result.serialKeyGenerated && result.serialKey) {
                try {
                    // Prepare plan data for notifications
                    const notificationPlanData = {
                        planname: plan[0].planname,
                        planprice: planData.offeredPrice,
                        price: plan[0].price,
                        duration: plan[0].duration,
                        expiryDate: moment().add(plan[0].duration, 'days').format('DD/MM/YYYY')
                    };

                    // Prepare company data for notifications
                    const notificationCompanyData = {
                        companyid: result.companyid,
                        companyname: companyData.companyname,
                        companyemailid: companyData.companyemailid,
                        companycontactnumber: companyData.companycontactnumber
                    };

                    // Send notifications (email and WhatsApp)
                    const notificationResult = await companyNotificationHelper.sendRegistrationNotifications(
                        notificationCompanyData,
                        result.serialKey,
                        notificationPlanData
                    );

                    winston.info("Registration notifications sent", {
                        source: "company.controller.js",
                        function: "register",
                        endpoint: req.path,
                        method: req.method,
                        userId: req.user?.userid,
                        companyId: result.companyid,
                        emailSent: notificationResult.results.email.success === 1,
                        whatsappSent: notificationResult.results.whatsapp.success === 1
                    });

                } catch (notificationError) {
                    winston.error(`Failed to send registration notifications: ${notificationError.message}`, {
                        source: "company.controller.js",
                        function: "register",
                        endpoint: req.path,
                        method: req.method,
                        userId: req.user?.userid,
                        companyId: result.companyid,
                        error: notificationError.message,
                        stack: notificationError.stack
                    });
                    // Don't fail the registration if notifications fail
                }
            }

            res.status(201).json(
                ResponseFormatter.success(
                    {
                        company: newCompany[0],
                        planAssigned: true,
                        serialKeyGenerated: result.serialKeyGenerated,
                        // Include serial key in response for immediate use
                        serialKey: result.serialKey
                    },
                    "Company registered successfully with plan and serial key"
                )
            );
        } else {
            throw new BadRequestError("Failed to register company");
        }
    }),

    /**
     * Get companies list with pagination
     */
    getCompanies: asyncHandler(async (req, res) => {
        const result = await companyModel.getCompanies(req);

        if (!result || (Array.isArray(result) && result.length === 0)) {
            return res.status(200).json(ResponseFormatter.success([], "No companies found"));
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
                        "Companies retrieved successfully"
                    )
                );
        }

        res.status(200).json(ResponseFormatter.success(result, "Companies retrieved successfully"));
    }),

    /**
     * Get company by ID
     */
    getData: asyncHandler(async (req, res) => {
        const companyid = req.params.id;

        if (!companyid || isNaN(companyid)) {
            throw new BadRequestError("Invalid company ID");
        }

        const result = await companyModel.getData(companyid);

        if (!result || result.length === 0) {
            throw new NotFoundError("Company");
        }

        res.status(200).json(
            ResponseFormatter.success(result[0], "Company data retrieved successfully")
        );
    }),

    /**
     * Update company details
     */
    update: asyncHandler(async (req, res) => {
        const companyid = req.params.id;
        const {
            companyname,
            companyemailid,
            companycontactnumber,
            address,
            remarks
        } = req.body;

        if (!companyid || isNaN(companyid)) {
            throw new BadRequestError("Invalid company ID");
        }

        // Check if company exists
        const existingCompany = await companyModel.getData(companyid);
        if (!existingCompany || existingCompany.length === 0) {
            throw new NotFoundError("Company");
        }

        // If email is being changed, check if new email already exists
        if (companyemailid && companyemailid !== existingCompany[0].companyemailid) {
            const emailExists = await companyModel.checkCompanyExists(companyemailid, companyid);
            if (emailExists) {
                throw new ConflictError("Company with this email already exists");
            }
        }

        // If name is being changed, check if new name already exists
        if (companyname && companyname !== existingCompany[0].companyname) {
            const nameExists = await companyModel.checkCompanyNameExists(companyname, companyid);
            if (nameExists) {
                throw new ConflictError("Company with this name already exists");
            }
        }

        // Email format validation if provided
        if (companyemailid) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(companyemailid)) {
                throw new BadRequestError("Invalid email format");
            }
        }

        const updateData = {};
        if (companyname !== undefined) updateData.companyname = companyname.trim();
        if (companyemailid !== undefined) updateData.companyemailid = companyemailid.trim().toLowerCase();
        if (companycontactnumber !== undefined) updateData.companycontactnumber = companycontactnumber.trim();
        if (address !== undefined) updateData.address = address;
        if (remarks !== undefined) updateData.remarks = remarks;
        updateData.modifiedby = req.user?.userid || 1;

        const result = await companyModel.update(companyid, updateData);

        if (result.affectedRows > 0) {
            const updatedCompany = await companyModel.getData(companyid);

            winston.info("Company updated", {
                source: "company.controller.js",
                function: "update",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.userid,
                companyid
            });

            res.status(200).json(
                ResponseFormatter.success(
                    updatedCompany[0],
                    "Company updated successfully"
                )
            );
        } else {
            res.status(200).json(
                ResponseFormatter.success(
                    existingCompany[0],
                    "No changes made to company"
                )
            );
        }
    }),

    /**
     * Update company plan
     */
    updatePlan: asyncHandler(async (req, res) => {
        const companyid = req.params.id;
        const {
            planid,
            offeredPrice,
            offeredAmcCharges,
            autorenewonoff,
            remarks
        } = req.body;

        if (!companyid || isNaN(companyid)) {
            throw new BadRequestError("Invalid company ID");
        }

        if (!planid) {
            throw new BadRequestError("Plan ID is required");
        }

        // Check if company exists
        const existingCompany = await companyModel.getData(companyid);
        if (!existingCompany || existingCompany.length === 0) {
            throw new NotFoundError("Company");
        }

        // Verify plan exists and is active
        const plan = await planMasterModel.getData(planid, false);
        if (!plan || plan.length === 0) {
            throw new NotFoundError("Selected plan");
        }

        if (!plan[0].isactive) {
            throw new BadRequestError("Selected plan is not active");
        }

        // Validate offered prices if provided
        if (offeredPrice !== undefined && offeredPrice < 0) {
            throw new BadRequestError("Offered plan price cannot be negative");
        }

        if (offeredAmcCharges !== undefined && offeredAmcCharges < 0) {
            throw new BadRequestError("Offered AMC charges cannot be negative");
        }

        const planData = {
            planid,
            offeredPrice: offeredPrice !== undefined ? offeredPrice : plan[0].price,
            offeredAmcCharges: offeredAmcCharges !== undefined ? offeredAmcCharges : plan[0].amc_charges,
            autorenewonoff: autorenewonoff || 0,
            remarks: remarks || null
        };

        await companyModel.updateCompanyPlan(companyid, planData);

        const updatedCompany = await companyModel.getData(companyid);

        winston.info("Company plan updated", {
            source: "company.controller.js",
            function: "updatePlan",
            endpoint: req.path,
            method: req.method,
            userId: req.user?.userid,
            companyid,
            planid
        });

        res.status(200).json(
            ResponseFormatter.success(
                updatedCompany[0],
                "Company plan updated successfully"
            )
        );
    }),

    /**
     * Get company plan history
     */
    getPlanHistory: asyncHandler(async (req, res) => {
        const companyid = req.params.id;

        if (!companyid || isNaN(companyid)) {
            throw new BadRequestError("Invalid company ID");
        }

        // Check if company exists
        const existingCompany = await companyModel.getData(companyid);
        if (!existingCompany || existingCompany.length === 0) {
            throw new NotFoundError("Company");
        }

        const history = await companyModel.getCompanyPlanHistory(companyid);

        res.status(200).json(
            ResponseFormatter.success(
                history,
                "Company plan history retrieved successfully"
            )
        );
    }),

    /**
     * Delete company (soft delete)
     */
    delete: asyncHandler(async (req, res) => {
        const companyid = req.params.id;

        if (!companyid || isNaN(companyid)) {
            throw new BadRequestError("Invalid company ID");
        }

        // Check if company exists
        const existingCompany = await companyModel.getData(companyid);
        if (!existingCompany || existingCompany.length === 0) {
            throw new NotFoundError("Company");
        }

        const result = await companyModel.delete(companyid);

        if (result.affectedRows > 0) {
            winston.info("Company deleted", {
                source: "company.controller.js",
                function: "delete",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.userid,
                companyid
            });

            res.status(200).json(
                ResponseFormatter.success(
                    { companyid: companyid },
                    "Company deleted successfully"
                )
            );
        } else {
            throw new BadRequestError("Failed to delete company");
        }
    }),

    /**
     * Get companies with expiring plans (for dashboard/notifications)
     */
    getExpiringPlans: asyncHandler(async (req, res) => {
        const days = req.query.days || 30; // Default to 30 days

        const sql = `
            SELECT c.companyid, c.companyname, c.companyemailid,
                   c.companycontactnumber,
                   cp.planid, cp.expirydate, cp.autorenewonoff,
                   pm.planname,
                   DATEDIFF(cp.expirydate, CURDATE()) as days_remaining
            FROM companymaster c
            JOIN companyplandetails cp ON c.companyid = cp.companyid
            JOIN plan_master pm ON cp.planid = pm.planid
            WHERE c.isdeleted = 0
                AND cp.expirydate >= CURDATE()
                AND DATEDIFF(cp.expirydate, CURDATE()) <= ?
            ORDER BY cp.expirydate ASC
        `;

        const result = await db.getResults(sql, [days]);

        res.status(200).json(
            ResponseFormatter.success(
                result,
                `Companies with plans expiring in ${days} days retrieved successfully`
            )
        );
    })
};