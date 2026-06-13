const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
const { backupDatabase } = require("../helpers/dbHelper");
const { emailHelper } = require("../helpers/posActivationHelper");
const companyNotificationHelper = require("../helpers/companyNotificationHelper");
const winston = require("../config/winston");
const moment = require("moment");

module.exports = {
    testWhatsAppOTP: async (req, res) => {
        try {
            const { mobile } = req.body;

            if (!mobile) {
                return res.status(400).json({ success: 0, msg: "Mobile number is required" });
            }

            winston.info('Testing WhatsApp OTP', {
                source: "temp.controller.js",
                function: "testWhatsAppOTP",
                mobile,
            });

            // Get template details
            const notificationTemplates = require('../helpers/notificationTemplates');
            const templateConfig = notificationTemplates.otpVerification;
            const testOTP = '123456';
            const templateData = notificationTemplates.getTemplate('otpVerification', { otp: testOTP });

            winston.info('Template configuration', {
                source: "temp.controller.js",
                function: "testWhatsAppOTP",
                templateName: templateConfig.templateName,
                languageCode: templateConfig.languageCode,
                fullTemplate: JSON.stringify(templateData, null, 2)
            });

            // Send OTP
            const smsHelper = require('../helpers/posActivationHelper').smsHelper;
            const result = await smsHelper.sendOTP(mobile);

            res.status(200).json({
                success: result.success ? 1 : 0,
                message: result.msg,
                otp: result.otp,
                whatsappResponse: result.data || null,
                error: result.error || null,
                templateConfiguration: {
                    name: templateConfig.templateName,
                    languageCode: templateConfig.languageCode,
                    parameters: templateConfig.getParameters({ otp: testOTP }),
                    fullPayload: templateData
                },
                serviceStatus: {
                    whatsappEnabled: require('../services/whatsapp.service').isEnabled(),
                    mobile: mobile
                },
                troubleshooting: {
                    checkTemplate: "Verify 'agro_otp' template exists in WhatsApp Business Manager",
                    checkLanguage: `Verify template language is '${templateConfig.languageCode}'`,
                    checkApproval: "Verify template status is APPROVED (not pending/rejected)",
                    checkParams: "Verify template has only ONE parameter: {{1}}",
                    logs: "Check server logs and WhatsApp queue logs for detailed error"
                }
            });
        } catch (error) {
            winston.error(`WhatsApp OTP test error: ${error.message}`, {
                source: "temp.controller.js",
                function: "testWhatsAppOTP",
                endpoint: req.path,
                method: req.method,
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            res.status(500).json({
                success: 0,
                msg: "Failed to test WhatsApp OTP",
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    },

    backupdb: async (req, res) => {
        try {
            const fileName = await backupDatabase("manual");
            res.status(200).json({ success: 1, msg: `Backup created: ${fileName}` });
        } catch (error) {
            winston.error(`Backup database failed: ${error.message}`, {
                source: "temp.controller.js",
                function: "backupdb",
                endpoint: req.path,
                method: req.method,
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            res.status(error.statusCode || 500).json({ msg: error.message });
        }
    },

    checkEmailConfig: async (req, res) => {
        const config = require("../config/config");
        res.json({
            host: config.email.host,
            port: config.email.port,
            secure: config.email.secure,
            user: config.email.auth.user,
            passwordLength: config.email.auth.pass ? config.email.auth.pass.length : 0,
            passwordFirst4: config.email.auth.pass ? config.email.auth.pass.substring(0, 4) : "not set",
            from: config.email.from,
            envVars: {
                EMAIL_USER: process.env.EMAIL_USER,
                EMAIL_PASSWORD_LENGTH: process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD.length : 0,
                EMAIL_PASSWORD_FIRST4: process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD.substring(0, 4) : "not set"
            }
        });
    },

    testmail: async (req, res) => {
        try {
            const {
                email,
                templateType = "simple", // simple | activation | registration | admin-registration | pos-activation | admin-pos-activation
                isReactivation = false,
                // Custom data for dynamic templates
                companyname,
                contactnumber,
                productKey,
                serialNumber,
                mysqlPassword,
                planName,
                planPrice,
                planDuration
            } = req.body;

            if (!email) {
                return res.status(400).json({ success: 0, msg: "Email is required" });
            }

            // Email validation
            const emailRegex = /\S+@\S+\.\S+/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ success: 0, msg: "Invalid email format" });
            }

            let result;

            switch (templateType) {
                case "activation":
                    // Test POS activation notification template
                    const mockCompanyData = {
                        companyname: companyname || "Test Agricultural Company",
                        companyemailid: email,
                        companycontactnumber: contactnumber || "+91-9876543210",
                        location_count: 1,
                        plan_name: planName || "Professional Plan",
                        ip_address: "192.168.1.100"
                    };

                    const mockSerialKeyData = {
                        product_key: productKey || "TEST-POS-KEY-12345",
                        serial_number: serialNumber || "SN-TEST-2024-001"
                    };

                    const activationDate = moment().format("YYYY-MM-DD HH:mm:ss");

                    winston.info(`Testing POS activation email to: ${email}`, {
                source: "temp.controller.js",
                function: "testmail",
            });

                    result = await emailHelper.sendActivationNotification(
                        mockCompanyData,
                        mockSerialKeyData,
                        activationDate,
                        isReactivation
                    );
                    break;

                case "registration":
                    // Test company registration template
                    const companyData = {
                        companyid: 999,
                        companyname: companyname || "Test Agricultural Company",
                        companyemailid: email,
                        companycontactnumber: contactnumber || "+91 9876543210"
                    };

                    const serialKeyData = {
                        product_key: productKey || "TEST-XXXX-XXXX-XXXX-XXXX",
                        serial_number: serialNumber || "SN-TEST-2024-001",
                        client_mysql_password: mysqlPassword || "TestPassword@123"
                    };

                    const planData = {
                        planname: planName || "Professional Plan (Test)",
                        planprice: planPrice || 9999,
                        price: planPrice || 9999,
                        duration: planDuration || 365,
                        expiryDate: moment().add(planDuration || 365, 'days').format('DD/MM/YYYY')
                    };

                    winston.info(`Testing company registration email to: ${email}`, {
                        source: "temp.controller.js",
                        function: "testmail",
                    });

                    result = await companyNotificationHelper.sendRegistrationEmail(
                        companyData,
                        serialKeyData,
                        planData
                    );
                    break;

                case "admin-registration":
                    // Test admin notification for company registration
                    const adminCompanyData = {
                        companyid: 999,
                        companyname: companyname || "Test Agricultural Company",
                        companyemailid: email,
                        companycontactnumber: contactnumber || "+91 9876543210"
                    };

                    const adminSerialKeyData = {
                        product_key: productKey || "TEST-XXXX-XXXX-XXXX-XXXX",
                        serial_number: serialNumber || "SN-TEST-2024-001"
                    };

                    const adminPlanData = {
                        planname: planName || "Professional Plan (Test)",
                        planprice: planPrice || 9999,
                        price: planPrice || 9999,
                        duration: planDuration || 365
                    };

                    winston.info(`Testing admin registration notification email to: ${email}`, {
                        source: "temp.controller.js",
                        function: "testmail",
                    });

                    result = await companyNotificationHelper.sendAdminRegistrationNotification(
                        adminCompanyData,
                        adminSerialKeyData,
                        adminPlanData
                    );
                    break;

                case "pos-activation":
                case "admin-pos-activation": {
                    // Test POS activation emails (both customer and admin)
                    const posCompanyData = {
                        companyname: companyname || "Test Agricultural Company",
                        companyemailid: email,
                        companycontactnumber: contactnumber || "+91 9876543210",
                        location_count: 1,
                        plan_name: planName || "Professional Plan",
                        ip_address: "192.168.1.100"
                    };

                    const posSerialKeyData = {
                        product_key: productKey || "TEST-XXXX-XXXX-XXXX-XXXX",
                        serial_number: serialNumber || "SN-TEST-2024-001"
                    };

                    const posActivationDate = new Date().toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                    });

                    if (templateType === "pos-activation") {
                        winston.info(`Testing POS activation email to customer: ${email}`, {
                            source: "temp.controller.js",
                            function: "testmail",
                        });
                        result = await emailHelper.sendActivationNotification(
                            posCompanyData,
                            posSerialKeyData,
                            posActivationDate,
                            isReactivation
                        );
                    } else {
                        winston.info(`Testing admin POS activation notification email to: ${email}`, {
                            source: "temp.controller.js",
                            function: "testmail",
                        });
                        result = await emailHelper.sendAdminPOSActivationNotification(
                            posCompanyData,
                            posSerialKeyData,
                            posActivationDate,
                            isReactivation
                        );
                    }
                    break;
                }

                case "simple":
                default:
                    // Test simple email
                    const transporter = emailHelper.createTransporter();
                    const config = require("../config/config");

                    const mailOptions = {
                        from: config.email.from,
                        to: email,
                        subject: `${config.app.name} - Test Email`,
                        html: `
                            <div style='font-family: Arial, sans-serif; background-color: #F0F4FD; padding: 20px;'>
                                <div style='max-width: 600px; margin: auto; background: #FFFFFF; border-radius: 10px; box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1); overflow: hidden;'>
                                    <div style='background: #2A3D93; color: white; padding: 15px; text-align: center; font-size: 18px; font-weight: bold;'>
                                        ${config.app.name} - Test Email
                                    </div>
                                    <div style='padding: 20px;'>
                                        <p style='font-size: 16px; color: #2A3D93;'><b>Hello!</b></p>
                                        <p style='font-size: 14px; color: #555;'>This is a test email to verify that the email configuration is working properly.</p>
                                        <p style='font-size: 14px; color: #555;'>Email sent at: <b>${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</b></p>
                                        <p style='font-size: 14px; color: #555;'>Best Regards,<br><b>${config.app.name} Team</b></p>
                                    </div>
                                    <div style='background: #2A3D93; text-align: center; padding: 10px; font-size: 12px; color: #FFFFFF;'>
                                        This is a test email. Please do not reply.
                                    </div>
                                </div>
                            </div>
                        `
                    };

                    await transporter.sendMail(mailOptions);
                    result = { success: 1, msg: "Test email sent successfully" };
                    break;
            }

            res.status(200).json(result);
        } catch (error) {
            winston.error(`Test mail error: ${error.message}`, {
                source: "temp.controller.js",
                function: "testMail",
                endpoint: req.path,
                method: req.method,
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            res.status(500).json({
                success: 0,
                msg: "Failed to send test email",
                error: error.message,
                stack: error.stack
            });
        }
    }
};
