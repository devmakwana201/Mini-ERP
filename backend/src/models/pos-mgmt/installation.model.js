const db = require("../../config/db");
const moment = require("moment");
const winston = require("../../config/winston");
const crypto = require("crypto");
const installationJwtUtils = require("../../utils/installationJwt.utils");
const {
    smsHelper,
    emailHelper,
    scriptHelper,
    validationHelper,
} = require("../../helpers/posActivationHelper");

module.exports = {
    // ========================================
    // MASTER DATA FUNCTIONS (Supporting APIs)
    // ========================================

    /**
     * Get countries
     */
    getCountries: async () => {
        try {
            const sql = "SELECT countryid, countryname FROM countrymst";
            const result = await db.getResults(sql);

            if (!result || result.length === 0) {
                return {
                    success: 0,
                    msg: "No Country Found",
                    countries: [],
                };
            }

            return {
                success: 1,
                msg: "Countries retrieved successfully",
                countries: result,
            };
        } catch (error) {
            winston.error(`Failed to get countries: ${error.message}`, {
                source: "installation.model.js",
                function: "getCountries",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
            });
            return {
                success: 0,
                msg: error.message,
                countries: [],
            };
        }
    },

    /**
     * Get states by country ID
     */
    getStates: async () => {
        try {
            const sql =
                "SELECT stateid, statename FROM statemaster WHERE isdeleted = 0 AND countryid = ?";
            const result = await db.getResults(sql, [101]); //101 : India

            if (!result || result.length === 0) {
                return {
                    success: 0,
                    msg: "No State Found With This Country",
                    states: [],
                };
            }

            return {
                success: 1,
                msg: "States retrieved successfully",
                states: result,
            };
        } catch (error) {
            winston.error(`Failed to get states: ${error.message}`, {
                source: "installation.model.js",
                function: "getStates",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return {
                success: 0,
                msg: error.message,
                states: [],
            };
        }
    },

    /**
     * Get cities by state ID
     */
    getCities: async (stateId) => {
        try {
            const sql =
                "SELECT cityid, cityname FROM citymaster WHERE isdeleted = 0 AND stateid = ?";
            const result = await db.getResults(sql, [stateId]);

            if (!result || result.length === 0) {
                return {
                    success: 0,
                    msg: "No City Found With This State",
                    cities: [],
                };
            }

            return {
                success: 1,
                msg: "Cities retrieved successfully",
                cities: result,
            };
        } catch (error) {
            winston.error(`Failed to get cities: ${error.message}`, {
                source: "installation.model.js",
                function: "getCities",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return {
                success: 0,
                msg: error.message,
                cities: [],
            };
        }
    },

    /**
     * Get companies
     */
    getCompanies: async () => {
        try {
            const sql = `
                SELECT DISTINCT cm.companyid, cm.companyname
                FROM companymaster cm
                WHERE cm.isdeleted = 0
                ORDER BY cm.companyname
            `;
            const result = await db.getResults(sql);

            if (!result || result.length === 0) {
                return {
                    success: 0,
                    msg: "No companies found",
                    companies: [],
                };
            }

            return {
                success: 1,
                msg: "Companies retrieved successfully",
                companies: result,
            };
        } catch (error) {
            winston.error(`Failed to get companies: ${error.message}`, {
                source: "installation.model.js",
                function: "getCompanies",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return {
                success: 0,
                msg: error.message || "Failed to retrieve companies",
                companies: [],
            };
        }
    },

    /**
     * Get company data by product key (for token generation before location creation)
     */
    getCompanyByProductKey: async (productKey) => {
        try {
            const sql = `
                SELECT
                    cm.companyid,
                    cm.companyname,
                    cm.companyemailid,
                    cm.companycontactnumber,
                    cm.serialid,
                    cm.ipaddress as ip_address,
                    sm.product_key,
                    sm.serial_number,
                    sm.id as serial_id,
                    sm.is_active,
                    sm.activation_count,
                    sm.max_activation_count,
                    dd.hardware_id,
                    pm.planname as plan_name
                FROM companymaster cm
                INNER JOIN serial_masters sm ON cm.serialid = sm.id
                INNER JOIN devicedetails dd ON sm.id = dd.serial_id AND dd.product_key = ?
                LEFT JOIN companyplandetails cpd ON cm.companyid = cpd.companyid
                LEFT JOIN plan_master pm ON cpd.planid = pm.planid
                WHERE sm.product_key = ? AND cm.isdeleted = 0 AND sm.is_deleted = 0
                ORDER BY dd.device_id DESC
                LIMIT 1
            `;
            const result = await db.getResults(sql, [productKey, productKey]);

            if (!result || result.length === 0) {
                return {
                    success: 0,
                    msg: "No company found for the given product key",
                };
            }

            return {
                success: 1,
                data: result[0],
                msg: "Company data retrieved successfully",
            };
        } catch (error) {
            winston.error(`Failed to get company by product key: ${error.message}`, {
                source: "installation.model.js",
                function: "getCompanyByProductKey",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return {
                success: 0,
                msg: error.message || "Failed to retrieve company data",
            };
        }
    },

    // ========================================
    // OTP FUNCTIONS (Unified System)
    // ========================================

    /**
     * Send OTP to Email and/or Mobile
     * Generates ONE OTP and sends to both channels using existing helpers
     * User can verify with OTP from either channel
     */
    sendOTP: async (email, mobile, purpose = "activation", ipAddress = null) => {
        try {
            // Validate inputs
            if (!email && !mobile) {
                return {
                    success: 0,
                    msg: "Email or mobile number is required",
                };
            }

            // Check if email and mobile exist in companymaster table
            let checkSql = `
                SELECT companyid, companyname, companyemailid, companycontactnumber
                FROM companymaster
                WHERE isdeleted = 0
            `;
            const checkParams = [];

            if (email && mobile) {
                checkSql += ` AND companyemailid = ? AND companycontactnumber = ?`;
                checkParams.push(email, mobile);
            } else if (email) {
                checkSql += ` AND companyemailid = ?`;
                checkParams.push(email);
            } else if (mobile) {
                checkSql += ` AND companycontactnumber = ?`;
                checkParams.push(mobile);
            }

            const companyResult = await db.getResults(checkSql, checkParams);

            if (!companyResult || companyResult.length === 0) {
                return {
                    success: 0,
                    msg: "You are not registered. Please contact support to register your company.",
                };
            }

            const companyData = companyResult[0];

            // Additional validation: if both email and mobile provided, both must match
            if (email && mobile) {
                const emailMatch =
                    companyData.companyemailid &&
                    companyData.companyemailid.toLowerCase() === email.toLowerCase();
                const mobileMatch =
                    companyData.companycontactnumber && companyData.companycontactnumber === mobile;

                if (!emailMatch || !mobileMatch) {
                    return {
                        success: 0,
                        msg: "Email or mobile number does not match our records.",
                    };
                }
            }

            winston.info("Company verified for OTP", {
                source: "installation.model.js",
                function: "sendOTP",
                companyId: companyData.companyid,
                companyName: companyData.companyname,
                email: email || "not provided",
                mobile: mobile || "not provided",
            });

            // Generate a single OTP for both channels
            const otp = Math.floor(100000 + Math.random() * 900000);

            winston.info("Sending OTP", {
                source: "installation.model.js",
                function: "sendOTP",
                email: email || "not provided",
                mobile: mobile || "not provided",
                otp: otp,
                purpose: purpose,
            });

            // Invalidate previous OTPs for this user and purpose
            const whereClauses = [];
            const whereParams = [];
            if (email) {
                whereClauses.push("email = ?");
                whereParams.push(email);
            }
            if (mobile) {
                whereClauses.push("mobile = ?");
                whereParams.push(mobile);
            }

            if (whereClauses.length > 0) {
                const invalidateSql = `
                    UPDATE otp_verification
                    SET is_deleted = 1, updated_at = NOW()
                    WHERE (${whereClauses.join(" OR ")})
                    AND purpose = ? AND is_verified = 0 AND is_deleted = 0
                `;
                const invalidateParams = [...whereParams, purpose];
                await db.getResults(invalidateSql, invalidateParams);
                winston.info("Invalidated previous OTPs", {
                    source: "installation.model.js",
                    function: "sendOTP",
                    email: email || "not provided",
                    mobile: mobile || "not provided",
                    purpose: purpose,
                });
            }

            // Save OTP to database FIRST
            const saveResult = await module.exports.saveOTP(email, mobile, otp, purpose, ipAddress);
            if (!saveResult.success) {
                return {
                    success: 0,
                    msg: "Failed to save OTP to database",
                };
            }

            const results = {
                email: { success: false, msg: "Not attempted" },
                mobile: { success: false, msg: "Not attempted" },
            };

            // Send to email if provided (using emailHelper with same OTP)
            if (email) {
                const emailResult = await emailHelper.sendOTP(email, otp);
                results.email = {
                    success: emailResult.success === 1,
                    msg: emailResult.msg,
                };
                winston.info(`${emailResult.success === 1 ? "✓" : "✗"} OTP email to: ${email}`, {
                    source: "installation.model.js",
                    function: "sendOTP"
                });
            }

            // Send to mobile if provided (using smsHelper with same OTP)
            if (mobile) {
                const mobileResult = await smsHelper.sendOTP(mobile, otp);
                results.mobile = {
                    success: mobileResult.success === 1,
                    msg: mobileResult.msg,
                };
                winston.info(
                    `${mobileResult.success === 1 ? "✓" : "✗"} OTP WhatsApp to: ${mobile}`,
                    {
                        source: "installation.model.js",
                        function: "sendOTP"
                    }
                );
            }

            // Success if at least ONE channel succeeded
            const anySuccess = results.email.success || results.mobile.success;
            const bothSuccess = results.email.success && results.mobile.success;

            // Build user-friendly message
            let message = "";
            if (bothSuccess) {
                message = "OTP sent to your email and WhatsApp";
            } else if (results.email.success) {
                message = "OTP sent to your email";
            } else if (results.mobile.success) {
                message = "OTP sent to your WhatsApp";
            } else {
                message = "Failed to send OTP. Please try again.";
            }

            return {
                success: anySuccess ? 1 : 0,
                msg: message,
                data: {
                    sentVia: {
                        email: results.email.success,
                        mobile: results.mobile.success,
                    },
                    otpId: saveResult.otpId,
                },
            };
        } catch (error) {
            winston.error(`Failed to send OTP: ${error.message}`, {
                source: "installation.model.js",
                function: "sendOTP",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return {
                success: 0,
                msg: "Failed to send OTP. Please try again.",
                error: error.message,
            };
        }
    },

    /**
     * Save OTP to database (for both email and mobile)
     */
    saveOTP: async (email, mobile, otp, purpose = "activation", ipAddress = null) => {
        try {
            const sql = `
                INSERT INTO otp_verification
                (email, mobile, otp, purpose, ip_address, created_at, expires_at)
                VALUES (?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 10 MINUTE))
            `;
            const result = await db.getResults(sql, [email, mobile, otp, purpose, ipAddress]);

            if (result && result.insertId) {
                winston.info("OTP saved successfully", {
                    source: "installation.model.js",
                    function: "saveOTP",
                    otpId: result.insertId,
                    email: email || "null",
                    mobile: mobile || "null",
                    purpose: purpose,
                });
                return {
                    success: true,
                    otpId: result.insertId,
                };
            }

            return { success: false };
        } catch (error) {
            winston.error(`Failed to save OTP: ${error.message}`, {
                source: "installation.model.js",
                function: "saveOTP",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return { success: false, error: error.message };
        }
    },

    /**
     * Verify OTP
     * Can verify with EITHER email OR mobile - whichever the user provides
     * Supports verification via either channel using the SAME OTP
     */
    verifyOTP: async (email, mobile, otp, purpose = "activation") => {
        try {
            // Build dynamic query based on what's provided
            let sql = `
                SELECT id, email, mobile, otp, purpose, verified_via, attempt_count, max_attempts
                FROM otp_verification
                WHERE otp = ?
                AND purpose = ?
                AND expires_at > NOW()
                AND is_verified = 0
                AND is_deleted = 0
            `;
            const params = [otp, purpose];

            // Add email or mobile condition
            if (email && mobile) {
                sql += ` AND (email = ? OR mobile = ?)`;
                params.push(email, mobile);
            } else if (email) {
                sql += ` AND email = ?`;
                params.push(email);
            } else if (mobile) {
                sql += ` AND mobile = ?`;
                params.push(mobile);
            } else {
                return {
                    success: 0,
                    msg: "Email or mobile is required for OTP verification",
                };
            }

            sql += ` ORDER BY created_at DESC LIMIT 1`;

            const result = await db.getResults(sql, params);

            if (result && result.length > 0) {
                const otpRecord = result[0];

                // Check if max attempts exceeded
                if (otpRecord.attempt_count >= otpRecord.max_attempts) {
                    return {
                        success: 0,
                        msg: "Maximum OTP verification attempts exceeded. Please request a new OTP.",
                    };
                }

                const otpId = otpRecord.id;

                // Determine which channel was used for verification
                let verifiedVia = "both";
                if (email && !mobile) verifiedVia = "email";
                else if (mobile && !email) verifiedVia = "mobile";
                else if (email && mobile) {
                    // Both provided - check which one matched
                    if (otpRecord.email === email) verifiedVia = "email";
                    else if (otpRecord.mobile === mobile) verifiedVia = "mobile";
                }

                // Mark OTP as verified
                const updateSql = `
                    UPDATE otp_verification
                    SET is_verified = 1,
                        verified_via = ?,
                        verified_at = NOW(),
                        updated_at = NOW()
                    WHERE id = ?
                `;
                await db.getResults(updateSql, [verifiedVia, otpId]);

                winston.info("OTP verified successfully", {
                    source: "installation.model.js",
                    function: "verifyOTP",
                    otpId: otpId,
                    verifiedVia: verifiedVia,
                    email: email || "null",
                    mobile: mobile || "null",
                });

                return {
                    success: 1,
                    msg: "OTP verified successfully",
                    data: {
                        id: otpRecord.id,
                        email: otpRecord.email,
                        mobile: otpRecord.mobile,
                        verifiedVia: verifiedVia,
                    },
                };
            } else {
                // Increment attempt count for all matching OTPs
                const incrementSql = `
                    UPDATE otp_verification
                    SET attempt_count = attempt_count + 1,
                        updated_at = NOW()
                    WHERE otp = ?
                    AND purpose = ?
                    AND expires_at > NOW()
                    AND is_verified = 0
                    AND is_deleted = 0
                `;
                await db.getResults(incrementSql, [otp, purpose]);

                return {
                    success: 0,
                    msg: "Invalid or expired OTP. Please try again or request a new OTP.",
                };
            }
        } catch (error) {
            winston.error(`Failed to verify OTP: ${error.message}`, {
                source: "installation.model.js",
                function: "verifyOTP",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return {
                success: 0,
                msg: error.message,
            };
        }
    },

    // ========================================
    // INSTALLATION FLOW FUNCTIONS (Step-by-Step)
    // ========================================

    /**(1)
     * Validate company and OTP - First API (validates company, device, OTP, and returns plan data)
     */
    validateCompanyAndOTP: async (
        phone,
        email,
        productKey,
        deviceId,
        otp,
        countryId = 101,
        ipAddress = "127.0.0.1"
    ) => {
        try {
            // Validate inputs
            if (!phone || !email || !productKey || !deviceId || !otp) {
                return {
                    success: 0,
                    msg: "Phone, email, product key, device ID and OTP are required",
                };
            }

            // Step 0: Verify OTP first using unified verification system
            const otpVerifyResult = await module.exports.verifyOTP(email, phone, otp, "activation");

            if (!otpVerifyResult || otpVerifyResult.success !== 1) {
                return {
                    success: 0,
                    msg: otpVerifyResult?.msg || "OTP verification failed",
                };
            }

            // Step 1: Validate if serial key exists
            const serialSql = `
                SELECT
                    sm.id as serial_id,
                    sm.product_key,
                    sm.is_active,
                    sm.activation_count,
                    sm.max_activation_count,
                    sm.is_nfs,
                    sm.free_demo,
                    sm.client_mysql_password,
                    sm.created_at as serial_created
                FROM serial_masters sm
                WHERE sm.product_key = ? AND sm.is_deleted = 0
            `;

            const serialResult = await db.getResults(serialSql, [productKey]);

            if (!serialResult || serialResult.length === 0) {
                return {
                    success: 0,
                    msg: "Invalid product key - serial key not found",
                };
            }

            const serialData = serialResult[0];

            // Step 2: Validate if serial key is mapped with company and check phone/email match
            const companySql = `
                SELECT
                    cm.companyid,
                    cm.companyname,
                    cm.companyemailid,
                    cm.companycontactnumber,
                    cm.createddate as company_created
                FROM companymaster cm
                WHERE cm.serialid = ? AND cm.isdeleted = 0
            `;
            const companyResult = await db.getResults(companySql, [serialData.serial_id]);

            if (!companyResult || companyResult.length === 0) {
                return {
                    success: 0,
                    msg: "Serial key is not mapped to any company",
                };
            }

            const companyData = companyResult[0];

            // Step 3: Validate phone and email match with company records
            const isPhoneMatch =
                companyData.companycontactnumber && companyData.companycontactnumber === phone;
            const isEmailMatch =
                companyData.companyemailid &&
                companyData.companyemailid.toLowerCase() === email.toLowerCase();

            if (!isPhoneMatch || !isEmailMatch) {
                return {
                    success: 0,
                    msg: "Phone or email does not match company records",
                };
            }

            // Step 4: Validate device ID - check if already registered for this company
            const deviceCheckSql = `
                SELECT dd.device_id, cm.companyid, cm.companyname
                FROM devicedetails dd
                JOIN companymaster cm ON dd.company_id = cm.companyid
                WHERE dd.hardware_id = ? AND cm.companyid = ? AND cm.isdeleted = 0
            `;
            const existingDevice = await db.getResults(deviceCheckSql, [
                deviceId,
                companyData.companyid,
            ]);

            if (existingDevice && existingDevice.length > 0) {
                return {
                    success: 0,
                    msg: `Device is already registered with company: ${existingDevice[0].companyname}`,
                };
            }

            // Step 5: Validate plan status - check if company plan is active and not expired
            const planSql = `
                SELECT
                    cpd.companyplanid,
                    cpd.planid,
                    cpd.expirydate,
                    cpd.planstartdate,
                    cpd.planprice,
                    cpd.amc_charges,
                    pm.planname,
                    pm.duration,
                    pm.description as plandescription,
                    pm.price,
                    pm.frequency,
                    pm.amc_charges as plan_amc_charges,
                    pm.is_trial,
                    pm.isactive as plan_active
                FROM companyplandetails cpd
                INNER JOIN plan_master pm ON cpd.planid = pm.planid
                WHERE cpd.companyid = ? AND pm.isactive = 1
                ORDER BY cpd.created_at DESC
                LIMIT 1
            `;
            const planResult = await db.getResults(planSql, [companyData.companyid]);

            if (!planResult || planResult.length === 0) {
                return {
                    success: 0,
                    msg: "No active plan found for this company",
                };
            }

            const planData = planResult[0];
            // Check if plan is expired
            const currentDate = new Date();
            const expiryDate = new Date(planData.expirydate);

            if (expiryDate < currentDate) {
                return {
                    success: 0,
                    msg: `Company plan expired on ${planData.expirydate}. Please renew your subscription.`,
                };
            }

            // Step 6: Get plan features/details
            let planFeatures = [];
            if (planData.planid) {
                const planDetailsSql = `
                    SELECT
                        pd.plandetailid,
                        pd.particularid,
                        pd.limitation,
                        pd.description as detail_description,
                        pm.name as particularname,
                        pm.particularid
                    FROM plan_details pd
                    INNER JOIN particularmaster pm ON pd.particularid = pm.particularid
                    WHERE pd.planid = ? AND pm.isactive = 1
                    ORDER BY pm.name
                `;
                const planDetailsResult = await db.getResults(planDetailsSql, [planData.planid]);
                planFeatures = planDetailsResult || [];
            }

            // Step 7: Get company addons
            let companyAddons = [];
            const addonsSql = `
                SELECT
                    cam.companyaddonid,
                    cam.addonid,
                    cam.price as addon_price,
                    cam.startdate as addon_startdate,
                    cam.enddate as addon_enddate,
                    cam.isactive as addon_active,
                    a.addonname,
                    a.description as addon_description,
                    a.limitation as addon_limitation,
                    a.duration as addon_duration,
                    a.price as original_price
                FROM companyaddonsmaster cam
                INNER JOIN addons a ON cam.addonid = a.addonid
                WHERE cam.companyid = ? AND cam.planid = ?
                    AND cam.isactive = 1 AND a.isactive = 1
                ORDER BY a.addonname
            `;
            const addonsResult = await db.getResults(addonsSql, [
                companyData.companyid,
                planData.planid,
            ]);
            companyAddons = addonsResult || [];

            // Step 8: Get database script
            const dbScript = module.exports.getDbScript();

            // Step 9: Generate installation JWT token for next steps
            const installationToken = installationJwtUtils.generateInstallationToken({
                companyId: companyData.companyid,
                productKey: serialData.product_key,
                deviceId: deviceId,
                phone: phone,
                email: email,
                companyName: companyData.companyname,
                step: 1, // Step 1 completed
            });

            return {
                success: 1,
                msg: "Company validation and OTP verification successful",
                data: {
                    installationToken: installationToken,
                    validation: {
                        otpVerified: true,
                        serialKeyValid: true,
                        companyMapped: true,
                        contactMatched: true,
                        deviceAvailable: true,
                        planActive: true,
                        verificationType: countryId == 101 ? "mobile" : "email",
                    },
                    company: {
                        companyId: companyData.companyid,
                        companyName: companyData.companyname,
                        companyEmail: companyData.companyemailid,
                        companyContact: companyData.companycontactnumber,
                        companyPincode: companyData.postalcode,
                        companyGst: companyData.gstno,
                        companyPan: companyData.panno,
                        companyCreated: companyData.company_created,
                    },
                    serialInfo: {
                        serialId: serialData.serial_id,
                        productKey: serialData.product_key,
                        maxActivations: serialData.max_activation_count || 0,
                        currentActivations: serialData.activation_count || 0,
                        availableActivations: Math.max(
                            0,
                            (serialData.max_activation_count || 0) -
                                (serialData.activation_count || 0)
                        ),
                        isActive: serialData.is_active === 1,
                        isNfs: serialData.is_nfs,
                        freeDemo: serialData.free_demo,
                        clientPassword: serialData.client_mysql_password,
                        serialCreated: serialData.serial_created,
                    },
                    subscription: {
                        planId: planData.planid,
                        planName: planData.planname,
                        planPrice: planData.planprice || planData.price,
                        planDescription: planData.plandescription,
                        duration: planData.duration,
                        frequency: planData.frequency,
                        amcCharges: planData.amc_charges || planData.plan_amc_charges,
                        isTrial: planData.is_trial,
                        startDate: planData.planstartdate,
                        endDate: planData.expirydate,
                        isActive: planData.plan_active === 1,
                        daysRemaining: Math.ceil(
                            (expiryDate - currentDate) / (1000 * 60 * 60 * 24)
                        ),
                        features: planFeatures.map((feature) => ({
                            featureId: feature.plandetailid,
                            particularId: feature.particularid,
                            particularName: feature.particularname,
                            limitation: feature.limitation,
                            description: feature.detail_description,
                        })),
                    },
                    addons: companyAddons.map((addon) => ({
                        companyaddonid: addon.companyaddonid,
                        addonid: addon.addonid,
                        addonname: addon.addonname,
                        description: addon.addon_description,
                        limitation: addon.addon_limitation,
                        duration: addon.addon_duration,
                        price: addon.addon_price,
                        originalPrice: addon.original_price,
                        startDate: addon.addon_startdate,
                        endDate: addon.addon_enddate,
                        isActive: addon.addon_active === 1,
                    })),
                    permissions: planFeatures.reduce((permissions, feature) => {
                        const particularName = feature.particularname.toLowerCase();
                        permissions[particularName] = {
                            allowed: true,
                            limitation: feature.limitation,
                            description: feature.detail_description,
                        };
                        return permissions;
                    }, {}),
                    dbScript: dbScript,
                    deviceId: deviceId,
                    ipAddress: ipAddress,
                },
            };
        } catch (error) {
            winston.error(`Failed to validate company and OTP: ${error.message}`, {
                source: "installation.model.js",
                function: "validateCompanyAndOTP",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return {
                success: 0,
                msg: error.message || "Failed to validate company and OTP",
            };
        }
    },

    /**(2)
     * Register user and activate serial - Second API (creates user and activates serial)
     */
    registerUserAndActivateSerial: async (
        companyId,
        productKey,
        deviceId,
        username,
        pinNumber,
        ipAddress = "127.0.0.1"
    ) => {
        let serialId = null;
        let activationStarted = false;

        try {
            // Validate inputs
            if (!companyId || !productKey || !deviceId || !username || !pinNumber) {
                return {
                    success: 0,
                    msg: "Company ID, Product Key, Device ID, Username and Pin Number are required",
                };
            }

            // Clean up any incomplete activations first
            await module.exports.deleteInactiveProduct(productKey);

            // Get company and serial information
            const validationSql = `
                SELECT
                    sm.id as serial_id,
                    sm.product_key,
                    sm.activation_count,
                    sm.max_activation_count,
                    sm.is_active,
                    sm.is_nfs,
                    sm.client_mysql_password,
                    cm.companyid,
                    cm.companyname,
                    cm.companyemailid,
                    cm.companycontactnumber
                FROM serial_masters sm
                INNER JOIN companymaster cm ON sm.id = cm.serialid
                WHERE cm.companyid = ? AND sm.product_key = ?
                    AND sm.is_deleted = 0 AND cm.isdeleted = 0
            `;
            const validationResult = await db.getResults(validationSql, [companyId, productKey]);

            if (!validationResult || validationResult.length === 0) {
                return {
                    success: 0,
                    msg: "Invalid company ID and product key combination",
                };
            }

            const serialData = validationResult[0];
            serialId = serialData.serial_id;

            // Check if serial is already active
            if (serialData.is_active === 1) {
                return {
                    success: 0,
                    msg: "Serial key is already active",
                };
            }

            // Check activation limits
            if (
                serialData.max_activation_count &&
                serialData.activation_count >= serialData.max_activation_count
            ) {
                return {
                    success: 0,
                    msg: `Maximum activation limit (${serialData.max_activation_count}) reached for this serial key`,
                };
            }

            // Check if device is already registered with this company
            const deviceCheckSql = `
                SELECT dd.device_id, lm.locationid
                FROM devicedetails dd
                JOIN locationmaster lm ON dd.location_id = lm.locationid
                WHERE dd.hardware_id = ? AND lm.companyid = ? AND lm.isdeleted = 0
            `;
            const existingDevice = await db.getResults(deviceCheckSql, [deviceId, companyId]);

            if (existingDevice && existingDevice.length > 0) {
                return {
                    success: 0,
                    msg: "Device is already registered with this company",
                };
            }

            // Step 1: Create or update user
            const userInput = {
                username: username,
                email: serialData.companyemailid,
                contactNumber: serialData.companycontactnumber,
                pinnumber: pinNumber,
                ipAddress: ipAddress,
            };

            const userData = await module.exports.createOrUpdateUser(userInput, companyId);

            // Step 2: Activate the serial key
            activationStarted = true;

            const activateSerialSql = `
                UPDATE serial_masters
                SET is_active = 1, activation_count = activation_count + 1,
                    activation_date = NOW(), updated_at = NOW()
                WHERE id = ? AND product_key = ? AND is_deleted = 0
            `;
            const activateResult = await db.getResults(activateSerialSql, [serialId, productKey]);

            if (!activateResult || activateResult.affectedRows === 0) {
                throw new Error("Failed to activate serial key");
            }

            const planUpdateResult = await module.exports.updateCompanyPlanExpiry(companyId);

            if (planUpdateResult.success) {
                winston.info(`Plan expiry updated for company: ${companyId}`, {
                    source: "installation.model.js",
                    function: "registerUserAndActivateSerial"
                });
            } else {
                winston.warn(
                    `Failed to update plan expiry for company: ${companyId}, reason: ${planUpdateResult.msg}`,
                    {
                        source: "installation.model.js",
                        function: "registerUserAndActivateSerial"
                    }
                );
            }

            // Step 3: Update hardware details - create device record
            const hardwareUpdateSuccess = await module.exports.updateHardwareDetails(
                productKey,
                deviceId,
                serialId,
                companyId,
                1 // installation_type = 1 for new activation
            );

            if (!hardwareUpdateSuccess) {
                throw new Error("Failed to update hardware details");
            }

            // Get dbScript for installation
            const dbScript = module.exports.getDbScript();

            // Get company details
            const companyDataSql = `
                SELECT
                    companyid,
                    serialid,
                    companyname,
                    companyemailid,
                    companycontactnumber,
                    remarks,
                    createdby,
                    createddate,
                    modifiedby,
                    modifieddate,
                    isdeleted,
                    ipaddress,
                    batchwisededuct,
                    stockdeduction
                FROM companymaster
                WHERE companyid = ? AND isdeleted = 0
            `;
            const companyResult = await db.getResults(companyDataSql, [companyId]);
            const companyData = companyResult?.[0] || null;

            // Get plan and addon data after successful activation
            const planDataSql = `
                SELECT
                    cpd.companyplanid,
                    cpd.planid,
                    cpd.expirydate,
                    cpd.planstartdate,
                    cpd.planprice,
                    cpd.amc_charges,
                    pm.planname,
                    pm.duration,
                    pm.description as plandescription,
                    pm.price,
                    pm.frequency,
                    pm.amc_charges as plan_amc_charges,
                    pm.is_trial,
                    pm.isactive as plan_active
                FROM companyplandetails cpd
                INNER JOIN plan_master pm ON cpd.planid = pm.planid
                WHERE cpd.companyid = ? AND pm.isactive = 1
                ORDER BY cpd.created_at DESC
                LIMIT 1
            `;
            const planResult = await db.getResults(planDataSql, [companyId]);
            const planData = planResult?.[0] || null;

            // Get plan features (plan_details)
            let planFeatures = [];
            let particulars = [];
            if (planData?.planid) {
                const planDetailsSql = `
                    SELECT
                        pd.plandetailid,
                        pd.planid,
                        pd.particularid,
                        pd.limitation,
                        pd.description,
                        pd.created_at,
                        pd.updated_at,
                        pm.name as particularname,
                        pm.isactive as particular_active
                    FROM plan_details pd
                    INNER JOIN particularmaster pm ON pd.particularid = pm.particularid
                    WHERE pd.planid = ? AND pm.isactive = 1
                    ORDER BY pm.name
                `;
                const planDetailsResult = await db.getResults(planDetailsSql, [planData.planid]);
                planFeatures = planDetailsResult || [];

                // Get unique particulars from plan features
                const particularIds = [...new Set(planFeatures.map((f) => f.particularid))];
                if (particularIds.length > 0) {
                    const particularsSql = `
                        SELECT
                            particularid,
                            name,
                            isactive,
                            created_at,
                            updated_at
                        FROM particularmaster
                        WHERE particularid IN (${particularIds.map(() => "?").join(",")})
                        AND isactive = 1
                        ORDER BY name
                    `;
                    const particularsResult = await db.getResults(particularsSql, particularIds);
                    particulars = particularsResult || [];
                }
            }

            // Get company addons and addon master data
            let companyAddons = [];
            let addonsMaster = [];
            if (planData?.planid) {
                const companyAddonsSql = `
                    SELECT
                        cam.companyaddonid,
                        cam.companyid,
                        cam.addonid,
                        cam.planid,
                        cam.price,
                        cam.startdate,
                        cam.enddate,
                        cam.isactive,
                        cam.created_at,
                        cam.updated_at,
                        a.addonname,
                        a.description as addon_description,
                        a.limitation as addon_limitation,
                        a.duration as addon_duration,
                        a.price as addon_original_price,
                        a.particularid as addon_particularid
                    FROM companyaddonsmaster cam
                    INNER JOIN addons a ON cam.addonid = a.addonid
                    WHERE cam.companyid = ? AND cam.planid = ?
                        AND cam.isactive = 1 AND a.isactive = 1
                    ORDER BY a.addonname
                `;
                const companyAddonsResult = await db.getResults(companyAddonsSql, [
                    companyId,
                    planData.planid,
                ]);
                companyAddons = companyAddonsResult || [];

                // Get unique addon IDs and fetch addon master data
                const addonIds = [...new Set(companyAddons.map((ca) => ca.addonid))];
                if (addonIds.length > 0) {
                    const addonsMasterSql = `
                        SELECT
                            addonid,
                            addonname,
                            description,
                            limitation,
                            isactive,
                            duration,
                            particularid,
                            price,
                            created_at,
                            updated_at
                        FROM addons
                        WHERE addonid IN (${addonIds.map(() => "?").join(",")})
                        AND isactive = 1
                        ORDER BY addonname
                    `;
                    const addonsMasterResult = await db.getResults(addonsMasterSql, addonIds);
                    addonsMaster = addonsMasterResult || [];
                }
            }

            winston.info(
                `User registered and serial activated for company: ${companyId}, user: ${username}, product: ${productKey}`,
                {
                    source: "installation.model.js",
                    function: "registerUserAndActivateSerial"
                }
            );

            // Generate updated installation token for Step 3
            const installationToken = installationJwtUtils.generateInstallationToken({
                companyId: companyId,
                productKey: productKey,
                deviceId: deviceId,
                phone: serialData.companycontactnumber,
                email: serialData.companyemailid,
                companyName: serialData.companyname,
                step: 2, // Step 2 completed
            });

            return {
                success: 1,
                msg: "User registered and serial activated successfully",
                data: {
                    installationToken: installationToken,
                    dbScript: dbScript,
                    isnfs: serialData.is_nfs,
                    client_mysql_password: serialData.client_mysql_password,
                    user: {
                        userId: userData.userId,
                        username: userData.username,
                        pinnumber: userData.pinnumber,
                    },
                    serial: {
                        serialId: serialId,
                        productKey: productKey,
                        companyId: companyId,
                        companyName: serialData.companyname,
                        activationCount: serialData.activation_count + 1,
                        maxActivationCount: serialData.max_activation_count,
                        isActive: true,
                    },
                    device: {
                        deviceId: deviceId,
                        registered: true,
                    },
                    // Company data in table format for direct insertion into POS database
                    companymaster: companyData
                        ? {
                              companyid: companyData.companyid,
                              serialid: companyData.serialid,
                              companyname: companyData.companyname,
                              companyemailid: companyData.companyemailid,
                              companycontactnumber: companyData.companycontactnumber,
                              remarks: companyData.remarks,
                              createdby: companyData.createdby,
                              createddate: companyData.createddate,
                              modifiedby: companyData.modifiedby,
                              modifieddate: companyData.modifieddate,
                              isdeleted: companyData.isdeleted,
                              ipaddress: companyData.ipaddress,
                              batchwisededuct: companyData.batchwisededuct,
                              stockdeduction: companyData.stockdeduction,
                          }
                        : null,
                    // Plan data in table format for direct insertion into POS database
                    planTables: planData
                        ? {
                              // plan_master table data
                              plan_master: {
                                  planid: planData.planid,
                                  planname: planData.planname,
                                  duration: planData.duration,
                                  description: planData.plandescription,
                                  price: planData.price,
                                  isactive: planData.plan_active,
                                  startdate: null, // Set by POS
                                  enddate: null, // Set by POS
                                  amc_charges: planData.plan_amc_charges,
                                  frequency: planData.frequency,
                                  is_trial: planData.is_trial,
                                  created_at: null, // Auto-generated
                                  updated_at: null, // Auto-generated
                              },
                              // companyplandetails table data
                              companyplandetails: {
                                  companyplanid: planData.companyplanid,
                                  companyid: companyId,
                                  planid: planData.planid,
                                  expirydate: planData.expirydate,
                                  autorenewonoff: 0, // Default
                                  autorenew_at: null,
                                  planprice: planData.planprice,
                                  amc_charges: planData.amc_charges,
                                  planstartdate: planData.planstartdate,
                                  remarks: null,
                                  created_at: null, // Auto-generated
                                  updated_at: null, // Auto-generated
                              },
                              // plan_details table data (array)
                              plan_details: planFeatures.map((feature) => ({
                                  plandetailid: feature.plandetailid,
                                  planid: feature.planid,
                                  particularid: feature.particularid,
                                  limitation: feature.limitation,
                                  description: feature.description,
                                  created_at: feature.created_at,
                                  updated_at: feature.updated_at,
                              })),
                              // particularmaster table data (array)
                              particularmaster: particulars.map((particular) => ({
                                  particularid: particular.particularid,
                                  name: particular.name,
                                  isactive: particular.isactive,
                                  created_at: particular.created_at,
                                  updated_at: particular.updated_at,
                              })),
                              // addons table data (array)
                              addons: addonsMaster.map((addon) => ({
                                  addonid: addon.addonid,
                                  addonname: addon.addonname,
                                  description: addon.description,
                                  limitation: addon.limitation,
                                  isactive: addon.isactive,
                                  duration: addon.duration,
                                  particularid: addon.particularid,
                                  price: addon.price,
                                  created_at: addon.created_at,
                                  updated_at: addon.updated_at,
                              })),
                              // companyaddonsmaster table data (array)
                              companyaddonsmaster: companyAddons.map((addon) => ({
                                  companyaddonid: addon.companyaddonid,
                                  companyid: addon.companyid,
                                  addonid: addon.addonid,
                                  planid: addon.planid,
                                  price: addon.price,
                                  startdate: addon.startdate,
                                  enddate: addon.enddate,
                                  isactive: addon.isactive,
                                  created_at: addon.created_at,
                                  updated_at: addon.updated_at,
                              })),
                          }
                        : null,
                    // Permissions for quick access
                    permissions: planFeatures.reduce((permissions, feature) => {
                        const particularName = feature.particularname?.toLowerCase();
                        if (particularName) {
                            permissions[particularName] = {
                                allowed: true,
                                limitation: feature.limitation,
                                description: feature.description,
                            };
                        }
                        return permissions;
                    }, {}),
                },
            };
        } catch (error) {
            winston.error(`Failed to register user and activate serial: ${error.message}`, {
                source: "installation.model.js",
                function: "registerUserAndActivateSerial",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });

            // Rollback activation if it was started but failed
            if (activationStarted && serialId && productKey) {
                try {
                    winston.info(`Rolling back activation for product key: ${productKey}`, {
                        source: "installation.model.js",
                        function: "registerUserAndActivateSerial"
                    });

                    // Reset activation and active status
                    const rollbackSql = `
                        UPDATE serial_masters
                        SET is_active = 0,
                            activation_count = GREATEST(activation_count - 1, 0),
                            updated_at = NOW()
                        WHERE id = ? AND product_key = ?
                    `;
                    await db.getResults(rollbackSql, [serialId, productKey]);

                    // Delete any incomplete device records
                    const deleteDeviceSql = `
                        DELETE FROM devicedetails
                        WHERE serial_id = ? AND product_key = ? AND is_activate = 0
                    `;
                    await db.getResults(deleteDeviceSql, [serialId, productKey]);

                    winston.info("User registration and activation rollback completed", {
                        source: "installation.model.js",
                        function: "registerUserAndActivateSerial"
                    });
                } catch (rollbackError) {
                    winston.error(`Failed to rollback activation: ${rollbackError.message}`, {
                        source: "installation.model.js",
                        function: "registerUserAndActivateSerial",
                        error: rollbackError.message,
                        code: rollbackError.code,
                        errno: rollbackError.errno,
                        stack: rollbackError.stack
                    });
                }
            }

            return {
                success: 0,
                msg: error.message || "Failed to register user and activate serial",
            };
        }
    },

    /**(3)
     * Confirm activation
     */
    confirmActivation: async (input) => {
        try {
            const productKey = input.productKey;
            const query = `
                SELECT MAX(device_id) AS max_device_id
                FROM devicedetails
                WHERE product_key = ? AND is_activate = 0
            `;
            const result = await db.getResults(query, [productKey]);

            if (result && result.length > 0 && result[0].max_device_id) {
                const updateSql = "UPDATE devicedetails SET is_activate = 1 WHERE device_id = ?";
                const updateResult = await db.getResults(updateSql, [result[0].max_device_id]);

                if (updateResult && updateResult.affectedRows > 0) {
                    // Now set serial_masters to active and send email
                    const activateSerialSql = `
                        UPDATE serial_masters sm
                        JOIN devicedetails dd ON sm.id = dd.serial_id
                        SET sm.is_active = 1, sm.updated_at = NOW()
                        WHERE dd.device_id = ? AND dd.product_key = ?
                    `;
                    await db.getResults(activateSerialSql, [result[0].max_device_id, productKey]);

                    // Send activation email
                    try {
                        const companyResult = await module.exports.getCompanyByProductKey(
                            productKey
                        );
                        if (companyResult.success && companyResult.data) {
                            const companyData = companyResult.data;

                            // Determine if this is a reactivation
                            const isReactivation = companyData.activation_count > 1;

                            // Prepare serialKeyData object
                            const serialKeyData = {
                                product_key: companyData.product_key,
                                serial_number: companyData.serial_number,
                            };

                            await emailHelper.sendPOSActivationNotifications(
                                companyData,
                                serialKeyData,
                                moment().format("YYYY-MM-DD HH:mm:ss"),
                                isReactivation
                            );
                        }
                    } catch (emailError) {
                        winston.error(
                            `Failed to send activation email in confirmActivation: ${emailError.message}`,
                            {
                                source: "installation.model.js",
                                function: "confirmActivation",
                                error: emailError.message,
                                code: emailError.code,
                                errno: emailError.errno,
                                stack: emailError.stack
                            }
                        );
                        // Don't fail the confirmation if email fails
                    }

                    return {
                        success: 1,
                        deviceId: result[0].max_device_id,
                        activated: true,
                        msg: "Activation confirmed successfully",
                    };
                }
            }
            return {
                success: 0,
                msg: "POS Already active or not found!",
            };
        } catch (error) {
            winston.error(`Failed to confirm activation: ${error.message}`, {
                source: "installation.model.js",
                function: "confirmActivation",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return {
                success: 0,
                msg: error.message || "Failed to confirm activation",
            };
        }
    },

    /**(4)
     * Create or Update location for company
     * Works ONLY with POS token (logged-in flow)
     * Checks if location exists to differentiate:
     * - No location exists: Registration flow (creates location + updates plan expiry)
     * - Location exists: Logged-in flow (creates/updates location, no plan update)
     */
    createLocationForCompany: async (input) => {
        try {
            const sanitizedInput = validationHelper.sanitizeInput(input);
            const locationId = sanitizedInput.locationId; // Optional - present only for UPDATE
            const isUpdate = !!locationId;

            winston.info("createLocationForCompany called", {
                source: "installation.model.js",
                function: "createLocationForCompany",
                isUpdate,
                locationId,
                companyId: sanitizedInput.companyId,
            });

            // Get company's serial information using companyId
            const companySerialSql = `
                SELECT
                    sm.id as serial_id,
                    sm.product_key,
                    sm.is_active,
                    sm.activation_count,
                    cm.companyid,
                    cm.companyname
                FROM companymaster cm
                INNER JOIN serial_masters sm ON cm.serialid = sm.id
                WHERE cm.companyid = ? AND cm.isdeleted = 0 AND sm.is_deleted = 0
            `;
            const companyResult = await db.getResults(companySerialSql, [sanitizedInput.companyId]);

            if (!companyResult || companyResult.length === 0) {
                return {
                    success: 0,
                    msg: "Invalid company ID or no serial key associated",
                };
            }

            const companyData = companyResult[0];
            const serialId = companyData.serial_id;

            // Check if location exists for this company to determine if registration or existing flow
            const locationCheckSql = `
                SELECT COUNT(*) as location_count
                FROM locationmaster
                WHERE companyid = ? AND isdeleted = 0
            `;
            const locationCheckResult = await db.getResults(locationCheckSql, [
                sanitizedInput.companyId,
            ]);
            const locationCount = locationCheckResult?.[0]?.location_count || 0;
            const isRegistration = locationCount === 0; // No location = registration flow

            winston.info("Location check for company", {
                source: "installation.model.js",
                function: "createLocationForCompany",
                companyId: sanitizedInput.companyId,
                locationCount,
                isRegistration,
                flowDetermined: isRegistration ? "registration" : "existing-company",
            });
            // Get deviceId (hardware_id) from database using companyId and serialId
            winston.info("Fetching deviceId from database", {
                source: "installation.model.js",
                function: "createLocationForCompany",
                companyId: sanitizedInput.companyId,
                serialId,
            });

            const deviceSql = `
                SELECT hardware_id
                FROM devicedetails
                WHERE company_id = ? AND serial_id = ? AND is_deleted = 0
                ORDER BY created_at DESC
                LIMIT 1
            `;
            const deviceResult = await db.getResults(deviceSql, [
                sanitizedInput.companyId,
                serialId,
            ]);

            let deviceId = null;
            if (deviceResult && deviceResult.length > 0) {
                deviceId = deviceResult[0].hardware_id;
                winston.info(`deviceId fetched from database: ${deviceId}`, {
                    source: "installation.model.js",
                    function: "createLocationForCompany"
                });
            } else {
                // For registration flow, deviceId is mandatory
                if (isRegistration) {
                    return {
                        success: 0,
                        msg: "No device found for this company. Device ID is required for registration.",
                    };
                }
                // For logged-in flow, we might not have a device yet
                winston.warn(`No device found for company ${sanitizedInput.companyId}`, {
                    source: "installation.model.js",
                    function: "createLocationForCompany"
                });
            }

            // Add fetched deviceId to sanitizedInput
            sanitizedInput.deviceId = deviceId;

            // UPDATE EXISTING LOCATION (logged-in user editing)
            if (isUpdate) {
                winston.info(`Update location flow: locationId ${locationId}`, {
                    source: "installation.model.js",
                    function: "createLocationForCompany"
                });

                // Verify location belongs to this company
                const locationCheckSql = `
                    SELECT locationid, companyid
                    FROM locationmaster
                    WHERE locationid = ? AND companyid = ? AND isdeleted = 0
                `;
                const locationCheck = await db.getResults(locationCheckSql, [
                    locationId,
                    sanitizedInput.companyId,
                ]);

                if (!locationCheck || locationCheck.length === 0) {
                    return {
                        success: 0,
                        msg: "Location not found or does not belong to this company",
                    };
                }

                const locationData = await module.exports.updateLocation(
                    locationId,
                    sanitizedInput
                );

                return {
                    success: 1,
                    locationdata: [locationData],
                    msg: "Location updated successfully",
                };
            }

            // CREATE NEW LOCATION (both registration and logged-in flows)
            winston.info("Creating new location", {
                source: "installation.model.js",
                function: "createLocationForCompany",
                isRegistration,
                flowType: isRegistration ? "registration" : "existing-company",
            });

            // For registration flow, verify that the serial is already active
            if (isRegistration && companyData.is_active !== 1) {
                return {
                    success: 0,
                    msg: "Serial key is not activated. Please register user and activate serial first",
                };
            }

            // Create location using insertLocationOnly (no serial_masters update)
            const locationData = await module.exports.insertLocationOnly(
                serialId,
                sanitizedInput.deviceId,
                sanitizedInput
            );

            // For registration flow
            if (isRegistration) {
                return {
                    success: 1,
                    locationdata: [locationData],
                    // planUpdate: planUpdateResult,
                    msg: "Location created successfully (registration completed)",
                };
            }

            // For logged-in flow, just return the location data
            return {
                success: 1,
                locationdata: [locationData],
                msg: "Location created successfully",
            };
        } catch (error) {
            winston.error(`Failed to create/update location: ${error.message}`, {
                source: "installation.model.js",
                function: "createLocationForCompany",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return {
                success: 0,
                msg: error.message || "Failed to create/update location",
            };
        }
    },

    // ========================================
    // HELPER FUNCTIONS (Used by Installation Flow)
    // ========================================

    createOrUpdateUser: async (input, companyId) => {
        try {
            const hashedPin = crypto
                .createHash("md5")
                .update(input.pinnumber || "123456")
                .digest("hex");

            const safeIp =
                input.ipAddress && input.ipAddress.trim() !== "" ? input.ipAddress : "127.0.0.1";

            // Check if user already exists (username + email + companyId combination)
            // Since all POS users have "admin" as username, we need to check all three
            const checkUserSql = `
                SELECT userid FROM usermaster
                WHERE username = ? AND email = ? AND companyid = ? AND isdeleted = 0
            `;
            const existingUser = await db.getResults(checkUserSql, [
                input.username,
                input.email,
                companyId,
            ]);

            let userId;

            if (existingUser && existingUser.length > 0) {
                // Update existing user
                userId = existingUser[0].userid;
                const updateUserSql = `
                UPDATE usermaster
                SET pinnumber = ?, email = ?, usermobileno = ?,
                    modifieddate = NOW(), ipaddress = ?, companyid = ?
                WHERE userid = ?
            `;
                await db.getResults(updateUserSql, [
                    hashedPin,
                    input.email,
                    input.contactNumber,
                    safeIp,
                    companyId,
                    userId,
                ]);

                winston.info(`Updated existing user: ${input.username} (ID: ${userId})`, {
                    source: "installation.model.js",
                    function: "createOrUpdateUser"
                });
            } else {
                // Create new user
                const insertUserSql = `
                INSERT INTO usermaster (
                    username, firstname, lastname, email, password, pinnumber,
                    roleid, policyid, createdby, createddate, modifedby, modifieddate,
                    isdeleted, usermobileno, companyid, ipaddress
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), 1, NOW(), 0, ?, ?, ?)
            `;

                const userResult = await db.getResults(insertUserSql, [
                    input.username,
                    input.username, // firstname
                    "", // lastname
                    input.email,
                    hashedPin, // password
                    hashedPin, // pinnumber
                    2, // roleid
                    2, // policyid
                    input.contactNumber,
                    companyId,
                    safeIp,
                ]);

                userId = userResult.insertId;
                winston.info(`Created new user: ${input.username} (ID: ${userId})`, {
                    source: "installation.model.js",
                    function: "createOrUpdateUser"
                });
            }

            return {
                userId,
                username: input.username,
                pinnumber: hashedPin,
            };
        } catch (error) {
            winston.error(`Failed to create/update user: ${error.message}`, {
                source: "installation.model.js",
                function: "createOrUpdateUser",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            throw error;
        }
    },

    /**(3.1)
     * Update company plan expiry date based on plan duration
     */
    updateCompanyPlanExpiry: async (companyId) => {
        try {
            // Get company's current plan details
            const planSql = `
                SELECT
                    cpd.companyplanid,
                    cpd.planid,
                    pm.duration,
                    pm.planname
                FROM companyplandetails cpd
                INNER JOIN plan_master pm ON cpd.planid = pm.planid
                WHERE cpd.companyid = ?
                ORDER BY cpd.created_at DESC
                LIMIT 1
            `;
            const planResult = await db.getResults(planSql, [companyId]);

            if (!planResult || planResult.length === 0) {
                winston.warn(`No plan found for company ID: ${companyId}`, {
                    source: "installation.model.js",
                    function: "updateCompanyPlanExpiry"
                });
                return { success: 0, msg: "No plan found for this company" };
            }

            const planData = planResult[0];
            const planDuration = planData.duration; // Duration in days

            // Calculate expiry date by adding duration to current date
            const currentDate = new Date();
            const expiryDate = new Date(currentDate);
            expiryDate.setDate(currentDate.getDate() + planDuration);

            // Update company plan with new start and expiry dates
            const updateSql = `
                UPDATE companyplandetails
                SET planstartdate = CURDATE(),
                    expirydate = DATE_ADD(CURDATE(), INTERVAL ? DAY),
                    updated_at = NOW()
                WHERE companyplanid = ?
            `;
            const updateResult = await db.getResults(updateSql, [
                planDuration,
                planData.companyplanid,
            ]);

            if (updateResult && updateResult.affectedRows > 0) {
                winston.info(
                    `Plan expiry updated for company: ${companyId}, plan: ${planData.planname}, duration: ${planDuration} days`,
                    {
                        source: "installation.model.js",
                        function: "updateCompanyPlanExpiry"
                    }
                );
                return {
                    success: 1,
                    msg: "Plan expiry date updated successfully",
                    data: {
                        planName: planData.planname,
                        duration: planDuration,
                        startDate: currentDate.toISOString().split("T")[0],
                        expiryDate: expiryDate.toISOString().split("T")[0],
                    },
                };
            } else {
                return { success: 0, msg: "Failed to update plan expiry date" };
            }
        } catch (error) {
            winston.error(`Failed to update company plan expiry: ${error.message}`, {
                source: "installation.model.js",
                function: "updateCompanyPlanExpiry",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return { success: 0, msg: error.message || "Failed to update plan expiry" };
        }
    },

    /**
     * Insert location only (for logged-in users creating new location)
     * Does NOT update serial_masters
     */
    insertLocationOnly: async (serialId, deviceId, input) => {
        try {
            winston.info(`Inserting new location for serialId: ${serialId} (logged-in user flow)`, {
                source: "installation.model.js",
                function: "insertLocationOnly",
                ipaddress: input.ipaddress,
                seedLicenseDate: input.seedLicenseDate,
                fertilizerLicenseDate: input.fertilizerLicenseDate,
                pesticidesLicenseDate: input.pesticidesLicenseDate,
            });

            // Helper function to convert DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD
            const convertDateToMySQL = (dateStr) => {
                if (!dateStr || dateStr.toString().trim() === "") return null;

                const str = dateStr.toString().trim();
                // Check if already in YYYY-MM-DD format
                if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

                // Convert DD/MM/YYYY to YYYY-MM-DD (with forward slash)
                if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
                    const [day, month, year] = str.split("/");
                    return `${year}-${month}-${day}`;
                }

                // Convert DD-MM-YYYY to YYYY-MM-DD (with hyphen)
                if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
                    const [day, month, year] = str.split("-");
                    return `${year}-${month}-${day}`;
                }

                return null;
            };

            // Convert empty date strings to null for database DATE columns and convert format
            const seedLicenseDate = convertDateToMySQL(input.seedLicenseDate);
            const fertilizerLicenseDate = convertDateToMySQL(input.fertilizerLicenseDate);
            const pesticidesLicenseDate = convertDateToMySQL(input.pesticidesLicenseDate);

            winston.info("Dates converted for MySQL", {
                source: "installation.model.js",
                function: "insertLocationOnly",
                seedLicenseDate,
                fertilizerLicenseDate,
                pesticidesLicenseDate,
            });

            const insertSql = `
                INSERT INTO locationmaster (
                    locationname, gstno, panno, licensetype, seedslicensenumber, seedslicensedate,
                    fertilizerlicensenumber, fertilizerlicensedate, pesticideslicensenumber,
                    pesticideslicensedate, contactno, serial_id, emailid, address, countryid,
                    stateid, cityid, postalcode, companyid, ipaddress, hardware_profile, gstnotregistered, createddate, isdeleted
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0)
            `;

            const insertParams = [
                input.locationName,
                input.gstNumber,
                input.panNumber,
                input.licenseType,
                input.seedLicenseNumber,
                seedLicenseDate,
                input.fertilizerLicenseNumber,
                fertilizerLicenseDate,
                input.pesticidesLicenseNumber,
                pesticidesLicenseDate,
                input.contactNumber,
                serialId,
                input.email,
                input.address,
                101,
                input.stateId,
                input.cityId,
                input.areaCode,
                input.companyId,
                input.ipaddress,
                deviceId, // hardware_profile value
                input.gstNotRegistered === 1 || input.gstNotRegistered === "1" ? 1 : 0,
            ];

            const result = await db.getResults(insertSql, insertParams);

            if (result && result.insertId) {
                winston.info(
                    `Location created successfully (ID: ${result.insertId}) without serial_masters update`,
                    {
                        source: "installation.model.js",
                        function: "insertLocationOnly"
                    }
                );
                return await module.exports.getLocationById(result.insertId);
            }

            throw new Error("Failed to insert location");
        } catch (error) {
            winston.error(`Failed to insert location only: ${error.message}`, {
                source: "installation.model.js",
                function: "insertLocationOnly",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            throw error;
        }
    },

    /**
     * Update existing location (for logged-in users editing location)
     * Does NOT update serial_masters
     */
    updateLocation: async (locationId, input) => {
        try {
            winston.info(`Updating location ID: ${locationId} (logged-in user flow)`, {
                source: "installation.model.js",
                function: "updateLocation"
            });

            // Helper function to convert DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD
            const convertDateToMySQL = (dateStr) => {
                if (!dateStr || dateStr.toString().trim() === "") return null;

                const str = dateStr.toString().trim();
                // Check if already in YYYY-MM-DD format
                if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

                // Convert DD/MM/YYYY to YYYY-MM-DD (with forward slash)
                if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
                    const [day, month, year] = str.split("/");
                    return `${year}-${month}-${day}`;
                }

                // Convert DD-MM-YYYY to YYYY-MM-DD (with hyphen)
                if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
                    const [day, month, year] = str.split("-");
                    return `${year}-${month}-${day}`;
                }

                return null;
            };

            // Convert empty date strings to null for database DATE columns and convert format
            const seedLicenseDate = convertDateToMySQL(input.seedLicenseDate);
            const fertilizerLicenseDate = convertDateToMySQL(input.fertilizerLicenseDate);
            const pesticidesLicenseDate = convertDateToMySQL(input.pesticidesLicenseDate);

            const updateSql = `
                UPDATE locationmaster
                SET locationname = ?, gstno = ?, panno = ?, licensetype = ?,
                    seedslicensenumber = ?, seedslicensedate = ?,
                    fertilizerlicensenumber = ?, fertilizerlicensedate = ?,
                    pesticideslicensenumber = ?, pesticideslicensedate = ?,
                    contactno = ?, emailid = ?, address = ?,
                    countryid = ?, stateid = ?, cityid = ?, postalcode = ?,
                    ipaddress = ?, hardware_profile = ?, gstnotregistered = ?, modifieddate = NOW()
                WHERE locationid = ? AND isdeleted = 0
            `;

            const updateParams = [
                input.locationName,
                input.gstNumber,
                input.panNumber,
                input.licenseType,
                input.seedLicenseNumber,
                seedLicenseDate,
                input.fertilizerLicenseNumber,
                fertilizerLicenseDate,
                input.pesticidesLicenseNumber,
                pesticidesLicenseDate,
                input.contactNumber,
                input.email,
                input.address,
                101,
                input.stateId,
                input.cityId,
                input.areaCode,
                input.ipaddress,
                input.deviceId, // hardware_profile
                input.gstNotRegistered === 1 || input.gstNotRegistered === "1" ? 1 : 0,
                locationId,
            ];

            const result = await db.getResults(updateSql, updateParams);

            if (result && result.affectedRows > 0) {
                winston.info(`Location updated successfully (ID: ${locationId})`, {
                    source: "installation.model.js",
                    function: "updateLocation"
                });
                return await module.exports.getLocationById(locationId);
            }

            throw new Error("Failed to update location or location not found");
        } catch (error) {
            winston.error(`Failed to update location: ${error.message}`, {
                source: "installation.model.js",
                function: "updateLocation",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            throw error;
        }
    },

    /**
     * Get location by ID
     */
    getLocationById: async (locationId) => {
        try {
            const sql = `
                SELECT lm.locationid, lm.locationname, lm.serial_id, lm.gstno, lm.panno,
                       lm.gstnotregistered, lm.licensetype, lm.seedslicensenumber, lm.seedslicensedate,
                       lm.fertilizerlicensenumber, lm.fertilizerlicensedate,
                       lm.pesticideslicensenumber, lm.pesticideslicensedate,
                       lm.contactno, lm.emailid, lm.address, lm.countryid, lm.stateid,
                       sm.statename, lm.cityid, cm.cityname, lm.postalcode,
                       lm.companyid, lm.hardware_profile, lm.ipaddress,
                       serial.is_nfs, serial.free_demo, serial.activation_count,
                       serial.client_mysql_password, supplier.suppliername
                FROM locationmaster lm
                LEFT JOIN statemaster sm ON lm.stateid = sm.stateid
                LEFT JOIN citymaster cm ON lm.cityid = cm.cityid
                LEFT JOIN serial_masters serial ON lm.serial_id = serial.id
                LEFT JOIN suppliermaster supplier ON serial.supplierid = supplier.supplierid
                WHERE lm.locationid = ? AND lm.isdeleted = 0
            `;
            const result = await db.getResults(sql, [locationId]);

            if (result && result.length > 0) {
                const location = result[0];
                location.isnfs = location.is_nfs;
                location.freedemo = location.free_demo;
                location.supplier_name = location.suppliername || "-";
                return location;
            }

            return null;
        } catch (error) {
            winston.error(`Failed to get location by ID: ${error.message}`, {
                source: "installation.model.js",
                function: "getLocationById",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            throw error;
        }
    },

    // ========================================
    // VALIDATION FUNCTIONS
    // ========================================

    /**
     * Check hardware validation for product key
     */
    checkHardwareValidate: async (productKey) => {
        try {
            const sql = `
                SELECT COUNT(sm.id) AS valid_hW
                FROM serial_masters sm
                JOIN locationmaster AS lm ON sm.id = lm.serial_id AND lm.isdeleted = 0
                WHERE sm.product_key = ? AND sm.is_deleted = 0
            `;
            const result = await db.getResults(sql, [productKey]);

            const validHW = result?.[0]?.valid_hW || 0;

            if (validHW === 0) {
                return {
                    success: 0,
                    msg: "Product Key Is Invalid For This Hardware",
                };
            }

            return {
                success: 1,
                data: result,
                msg: "Hardware validation successful",
            };
        } catch (error) {
            winston.error(`Failed to check hardware validation: ${error.message}`, {
                source: "installation.model.js",
                function: "checkHardwareValidate",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return {
                success: 0,
                msg: error.message || "Failed to check hardware validation",
            };
        }
    },

    /**
     * Validate activation hardware count
     */
    validActivationHardwareCount: async (productKey, hardwareId) => {
        try {
            const serialSql = `
                SELECT id, max_activation_count, activation_count
                FROM serial_masters
                WHERE product_key = ? AND is_deleted = 0
            `;
            const serialResult = await db.getResults(serialSql, [productKey]);

            if (!serialResult || serialResult.length === 0) {
                return {
                    success: 0,
                    msg: "Invalid product key.",
                };
            }

            const serialData = serialResult[0];
            const serialId = serialData.id;
            const maxActivationCount = serialData.max_activation_count;
            const currentActivationCount = serialData.activation_count;

            if (currentActivationCount >= maxActivationCount) {
                return {
                    success: 0,
                    msg: `Activation limit (${maxActivationCount}) exceeded for this product key.`,
                };
            }

            const hardwareCheckSql = `
                SELECT COUNT(*) AS existing_count
                FROM devicedetails
                WHERE serial_id = ? AND hardware_id = ?
            `;
            const hardwareResult = await db.getResults(hardwareCheckSql, [serialId, hardwareId]);

            // Return the hardware check result with additional metadata
            const result = {
                serialData,
                hardwareExists: hardwareResult?.[0]?.existing_count > 0,
                hardwareResult,
            };

            return {
                success: 1,
                data: result,
                msg: "Hardware activation count validation successful",
            };
        } catch (error) {
            winston.error(`Failed to validate activation hardware count: ${error.message}`, {
                source: "installation.model.js",
                function: "validActivationHardwareCount",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return {
                success: 0,
                msg: error.message || "Failed to validate activation hardware count",
            };
        }
    },

    /**
     * Update hardware details
     */
    updateHardwareDetails: async (
        productKey,
        hardwareId,
        serialId,
        companyId,
        installationType
    ) => {
        try {
            const sql = `
                INSERT INTO devicedetails (
                    hardware_id, product_key, serial_id, company_id,
                    datekey, installation_type, created_at
                ) VALUES (?, ?, ?, ?, DATE_FORMAT(NOW(),'%Y%m%d'), ?, NOW())
            `;

            const result = await db.getResults(sql, [
                hardwareId,
                productKey,
                serialId,
                companyId,
                installationType,
            ]);
            return result ? 1 : 0;
        } catch (error) {
            winston.error(`Failed to update hardware details: ${error.message}`, {
                source: "installation.model.js",
                function: "updateHardwareDetails",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return 0;
        }
    },

    // ========================================
    // INFORMATION & UTILITY FUNCTIONS
    // ========================================

    /**
     * Get location by product key
     */
    getCustomers: async (productKey) => {
        try {
            const serialSql = `
                SELECT id, is_nfs, client_mysql_password, is_active, activation_count,
                       activation_date, max_activation_count
                FROM serial_masters
                WHERE product_key = ?
            `;
            const serialResult = await db.getResults(serialSql, [productKey]);

            if (serialResult && serialResult.length > 0) {
                const serialData = serialResult[0];
                const serialId = serialData.id;

                const locationSql = `
                    SELECT lm.locationid, lm.locationname, lm.serial_id, lm.countryid, lm.contactno, lm.emailid,
                           lm.gstno, lm.panno, lm.gstnotregistered, lm.seedslicensenumber, lm.seedslicensedate,
                           lm.fertilizerlicensenumber, lm.fertilizerlicensedate, lm.pesticideslicensenumber,
                           lm.pesticideslicensedate, lm.address, lm.stateid, lm.cityid, lm.postalcode, lm.companyid,
                           lm.hardware_profile, lm.ipaddress,
                           sm.statename, cm.cityname
                    FROM locationmaster lm
                    LEFT JOIN statemaster sm ON lm.stateid = sm.stateid
                    LEFT JOIN citymaster cm ON lm.cityid = cm.cityid
                    WHERE lm.serial_id = ? AND lm.isdeleted = 0
                    ORDER BY lm.createddate DESC
                    LIMIT 1
                `;
                const locationResult = await db.getResults(locationSql, [serialId]);

                if (locationResult && locationResult.length > 0) {
                    const location = locationResult[0];
                    location.is_nfs = serialData.is_nfs;
                    location.client_mysql_password = serialData.client_mysql_password;
                    location.is_active = serialData.is_active;
                    location.activation_count = serialData.activation_count;
                    location.max_activation_count = serialData.max_activation_count;
                    location.activation_date = serialData.activation_date;
                    location.supplier_name = "-"; // Default value as supplier name is commented

                    const deviceSql = `
                        SELECT hardware_id, MAX(device_id) AS device_id, product_key,
                               serial_id, location_id, MAX(datekey) AS datekey
                        FROM devicedetails
                        WHERE serial_id = ?
                        GROUP BY hardware_id, product_key, serial_id, location_id
                    `;
                    const deviceResult = await db.getResults(deviceSql, [serialId]);
                    location.device_details = deviceResult || [];

                    return {
                        success: 1,
                        data: location,
                        msg: "Customer data retrieved successfully",
                    };
                } else {
                    return {
                        success: 0,
                        msg: "No location data found for the given serial key",
                    };
                }
            } else {
                return {
                    success: 0,
                    msg: "Invalid product key",
                };
            }
        } catch (error) {
            winston.error(`Failed to get location: ${error.message}`, {
                source: "installation.model.js",
                function: "getCustomers",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return {
                success: 0,
                msg: error.message || "Failed to retrieve customer data",
            };
        }
    },

    /**
     * Get database script
     */
    getDbScript: () => {
        return scriptHelper.getDbScript();
    },

    /**
     * Send POS activation email
     */
    sendPOSActivationEmail: async (data, productKey, activationDate, isReactivation = false) => {
        return await emailHelper.sendActivationNotification(
            data,
            productKey,
            activationDate,
            isReactivation
        );
    },

    // ========================================
    // CLEANUP FUNCTIONS
    // ========================================

    /**
     * Delete inactive products and handle orphaned activations
     */
    deleteInactiveProduct: async (productKey) => {
        try {
            // First, check for inactive device records
            const countSql = `
                SELECT product_key, COUNT(*) as count
                FROM devicedetails
                WHERE is_activate = 0 AND product_key = ?
                GROUP BY product_key
            `;
            const countResult = await db.getResults(countSql, [productKey]);

            let deletedCount = 0;

            if (countResult && countResult.length > 0) {
                // Delete inactive device records
                const deleteSql = `
                    DELETE FROM devicedetails
                    WHERE is_activate = 0 AND product_key = ?
                `;
                await db.getResults(deleteSql, [productKey]);
                deletedCount = countResult[0].count;

                winston.info(
                    `Deleted ${deletedCount} inactive device records for product key: ${productKey}`,
                    {
                        source: "installation.model.js",
                        function: "deleteInactiveProduct"
                    }
                );
            }

            // Check for orphaned activations (activation started but no device records exist)
            const orphanCheckSql = `
                SELECT sm.id, sm.activation_count, sm.is_active
                FROM serial_masters sm
                LEFT JOIN devicedetails dd ON sm.id = dd.serial_id AND dd.is_activate = 1
                WHERE sm.product_key = ?
                AND sm.activation_count > 0
                AND dd.device_id IS NULL
                AND sm.is_deleted = 0
            `;
            const orphanResult = await db.getResults(orphanCheckSql, [productKey]);

            if (orphanResult && orphanResult.length > 0) {
                const orphanData = orphanResult[0];

                // Reset orphaned activation - this handles the case where activation started but failed
                const resetSql = `
                    UPDATE serial_masters
                    SET activation_count = 0,
                        is_active = 0,
                        updated_at = NOW()
                    WHERE product_key = ? AND id = ?
                `;
                await db.getResults(resetSql, [productKey, orphanData.id]);

                winston.info(
                    `Reset orphaned activation for product key: ${productKey}, was count: ${orphanData.activation_count}`,
                    {
                        source: "installation.model.js",
                        function: "deleteInactiveProduct"
                    }
                );
                deletedCount += orphanData.activation_count;
            } else if (deletedCount > 0) {
                // Update activation count for deleted inactive records
                const updateSql = `
                    UPDATE serial_masters
                    SET activation_count = activation_count - ?,
                        is_active = CASE WHEN (activation_count - ?) = 0 THEN 0 ELSE is_active END,
                        updated_at = NOW()
                    WHERE product_key = ?
                `;
                await db.getResults(updateSql, [deletedCount, deletedCount, productKey]);
            }

            return deletedCount;
        } catch (error) {
            winston.error(`Failed to delete inactive products: ${error.message}`, {
                source: "installation.model.js",
                function: "deleteInactiveProduct",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            throw error;
        }
    },

    // ========================================
    // TESTING & DEVELOPMENT
    // ========================================

    /**
     * DEVELOPMENT ONLY: Reset activation for testing
     * Resets serial_masters activation status and deletes related data
     */
    resetActivation: async (productKey) => {
        try {
            winston.warn(`🔧 DEV RESET: Resetting activation for product key: ${productKey}`, {
                source: "installation.model.js",
                function: "resetActivation"
            });

            // Get serial_id first
            const serialSql = `
                SELECT id, product_key, activation_count, is_active
                FROM serial_masters
                WHERE product_key = ? AND is_deleted = 0
            `;
            const serialResult = await db.getResults(serialSql, [productKey]);

            if (!serialResult || serialResult.length === 0) {
                return {
                    success: 0,
                    msg: "Product key not found",
                };
            }

            const serialId = serialResult[0].id;
            const oldActivationCount = serialResult[0].activation_count;
            const oldIsActive = serialResult[0].is_active;

            // Hard delete locations associated with this serial
            const deleteLocationsSql = `
                DELETE FROM locationmaster
                WHERE serial_id = ?
            `;
            const locationsDeleted = await db.getResults(deleteLocationsSql, [serialId]);

            // Hard delete device details
            const deleteDevicesSql = `
                DELETE FROM devicedetails
                WHERE serial_id = ?
            `;
            const devicesDeleted = await db.getResults(deleteDevicesSql, [serialId]);

            // Reset serial_masters
            const resetSerialSql = `
                UPDATE serial_masters
                SET activation_count = 0,
                    is_active = 0,
                    activation_date = NULL,
                    updated_at = NOW()
                WHERE id = ? AND product_key = ?
            `;
            const serialReset = await db.getResults(resetSerialSql, [serialId, productKey]);

            winston.info("🔧 DEV RESET COMPLETED", {
                source: "installation.model.js",
                function: "resetActivation",
                productKey,
                serialId,
                oldActivationCount,
                oldIsActive,
                locationsDeleted: locationsDeleted.affectedRows,
                devicesDeleted: devicesDeleted.affectedRows,
                serialReset: serialReset.affectedRows,
            });

            return {
                success: 1,
                msg: "Activation reset successfully",
                data: {
                    productKey,
                    serialId,
                    oldActivationCount,
                    oldIsActive,
                    locationsDeleted: locationsDeleted.affectedRows,
                    devicesDeleted: devicesDeleted.affectedRows,
                },
            };
        } catch (error) {
            winston.error(`Failed to reset activation: ${error.message}`, {
                source: "installation.model.js",
                function: "resetActivation",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            return {
                success: 0,
                msg: error.message || "Failed to reset activation",
            };
        }
    },
};
