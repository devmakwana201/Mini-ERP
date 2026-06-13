const axios = require("axios");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const winston = require("../config/winston");
const config = require("../config/config");

/**
 * SMS/WhatsApp OTP Helper
 * Now uses WhatsApp for OTP delivery
 */
const smsHelper = {
    /**
     * Send OTP via WhatsApp
     * @param {string} mobile - Mobile number
     * @param {number} providedOTP - Optional OTP to use (for unified system)
     */
    sendOTP: async (mobile, providedOTP = null) => {
        try {
            // Use provided OTP or generate new one
            const otp = providedOTP || Math.floor(100000 + Math.random() * 900000);

            // Ensure mobile has country code (91 for India)
            let formattedMobile = mobile.toString().replace(/\D/g, "");
            if (formattedMobile.length === 10) {
                formattedMobile = "91" + formattedMobile;
            }

            winston.info(`Sending OTP via WhatsApp to: ${formattedMobile}, OTP: ${otp}`, {
                source: "posActivationHelper.js",
                function: "sendOTP",
                mobile: formattedMobile,
                otp: otp
            });

            // Use WhatsApp service for OTP delivery
            const whatsAppService = require("../services/whatsapp.service");

            if (!whatsAppService.isEnabled()) {
                winston.warn("WhatsApp service is disabled, OTP not sent", {
                    source: "posActivationHelper.js",
                    function: "sendOTP",
                    mobile: formattedMobile
                });
                return {
                    success: 0,
                    msg: "WhatsApp service is currently unavailable. Please use email OTP instead.",
                };
            }

            // Send OTP via WhatsApp template
            winston.info("Attempting to send OTP via WhatsApp", {
                source: "posActivationHelper.js",
                function: "sendOTP",
                mobile: formattedMobile,
                otp: otp,
                template: "agro_otp"
            });

            const result = await whatsAppService.sendNotification(
                formattedMobile,
                "otpVerification",
                { otp: String(otp) }
            );

            winston.info("WhatsApp OTP send result", {
                source: "posActivationHelper.js",
                function: "sendOTP",
                mobile: formattedMobile,
                otp: otp,
                success: result.success,
                message: result.message,
                error: result.error || null,
                statusCode: result.statusCode || null
            });

            if (result.success) {
                winston.info(`OTP sent successfully via WhatsApp to ${formattedMobile}`, {
                    source: "posActivationHelper.js",
                    function: "sendOTP",
                    mobile: formattedMobile,
                    otp: otp
                });
                return {
                    success: 1,
                    otp: otp,
                    msg: "OTP sent successfully via WhatsApp",
                    data: result,
                };
            } else {
                winston.error(`WhatsApp OTP failed: ${result.message}`, {
                    source: "posActivationHelper.js",
                    function: "sendOTP",
                    error: result.message,
                    mobile: formattedMobile,
                    resultData: result
                });
                return {
                    success: 0,
                    msg:
                        result.message ||
                        "Failed to send OTP via WhatsApp. Please use email OTP instead.",
                };
            }
        } catch (error) {
            winston.error(`Failed to send WhatsApp OTP: ${error.message}`, {
                source: "posActivationHelper.js",
                function: "sendOTP",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                mobile: mobile
            });
            return {
                success: 0,
                msg: "Failed to send OTP via WhatsApp. Please use email OTP instead.",
                error: error.message,
            };
        }
    },

    /**
     * Verify OTP - verification is done via database, not external service
     * This method is kept for backward compatibility but OTP verification
     * should be done through database lookup (verifyMobileOTPFromDB in installation.model)
     */
    verifyOTP: async (mobile, otp) => {
        winston.info("OTP verification should be done via database lookup", {
            source: "posActivationHelper.js",
            function: "verifyOTP",
            mobile: mobile
        });
        return {
            success: 1,
            msg: "Please verify OTP using database verification method",
        };
    },
};

/**
 * Email Helper for OTP and notifications
 */
const emailHelper = {
    /**
     * Create nodemailer transporter
     */
    createTransporter: () => {
        const transportConfig = {
            host: config.email.host,
            port: config.email.port,
            secure: config.email.secure,
            auth: {
                user: config.email.auth.user,
                pass: config.email.auth.pass
            },
            tls: { rejectUnauthorized: false }
        };

        // Add additional options for port 587 (STARTTLS)
        if (config.email.port === 587) {
            transportConfig.requireTLS = true;
            transportConfig.tls = {
                ciphers: 'SSLv3',
                rejectUnauthorized: false
            };
        }

        return nodemailer.createTransport(transportConfig);
    },

    /**
     * Send OTP via email
     * @param {string} email - Email address
     * @param {number} providedOTP - Optional OTP to use (for unified system)
     */
    sendOTP: async (email, providedOTP = null) => {
        // Use provided OTP or generate new one
        const randOTP = providedOTP || Math.floor(100000 + Math.random() * 900000);

        try {
            if (!email || !/\S+@\S+\.\S+/.test(email)) {
                return { success: 0, msg: "Invalid Email Id" };
            }

            const transporter = emailHelper.createTransporter();

            const mailOptions = {
                from: config.email.from,
                to: email,
                subject: `${config.app.name} - OTP Verification`,
                html: emailHelper.getOTPEmailTemplate(randOTP),
            };

            await transporter.sendMail(mailOptions);

            winston.info(`OTP email sent successfully to: ${email}`, {
                source: "posActivationHelper.js",
                function: "sendOTP",
                email: email,
                otp: randOTP
            });

            return { success: 1, msg: "OTP Sent Successfully", otp: randOTP };
        } catch (error) {
            winston.error(`Failed to send email OTP: ${error.message}`, {
                source: "posActivationHelper.js",
                function: "sendOTP",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                email: email
            });
            return { success: 0, msg: "Failed to send OTP" };
        }
    },

    /**
     * Get OTP email HTML template
     */
    getOTPEmailTemplate: (otp) => {
        const config = require("../config/config");
        const logoUrl = `https://agropos.s3.ap-south-1.amazonaws.com/logo/appLogo.png`;

        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${config.app.name} OTP Verification</title>
        </head>
        <body style='margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #F0F4FD;'>
            <div style='background-color: #F0F4FD; padding: 20px; min-height: 100vh;'>
                <div style='max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 10px; box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1); overflow: hidden;'>

                    <!-- Header -->
                    <div style='background: linear-gradient(135deg, #2E7D32 0%, #4CAF50 50%, #66BB6A 100%); color: white; padding: 30px 20px; text-align: center;'>
                        <div style='background: white; width: 80px; height: 80px; border-radius: 50%; display: inline-block; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.25); margin-bottom: 15px;'>
                            <img src="${logoUrl}" alt="${config.app.name} Logo" style='width: 80px; height: 80px; object-fit: cover; display: block; border: 0;'>
                        </div>
                        <h1 style='margin: 0; font-size: 24px; font-weight: 600;'>OTP Verification</h1>
                        <p style='margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;'>${config.app.name}</p>
                    </div>

                    <!-- Content -->
                    <div style='padding: 30px 20px;'>
                        <p style='font-size: 16px; color: #333; margin-bottom: 20px; line-height: 1.6;'>
                            Dear User,
                        </p>
                        <p style='font-size: 14px; color: #555; margin-bottom: 25px; line-height: 1.6;'>
                            Your One-Time Password (OTP) for email verification is:
                        </p>

                        <!-- OTP Box -->
                        <div style='background: linear-gradient(135deg, #E8F5E8 0%, #F0F8F0 100%); border-radius: 10px; padding: 25px; text-align: center; margin: 25px 0; border: 2px dashed #4CAF50;'>
                            <div style='font-size: 36px; font-weight: bold; color: #2E7D32; letter-spacing: 8px; font-family: "Courier New", monospace;'>
                                ${otp}
                            </div>
                            <p style='margin: 15px 0 0 0; font-size: 12px; color: #666;'>
                                This OTP is valid for <strong>10 minutes</strong>
                            </p>
                        </div>

                        <div style='background: #FFF9C4; border-left: 4px solid #FFC107; padding: 15px; margin: 20px 0; border-radius: 4px;'>
                            <p style='margin: 0; font-size: 13px; color: #333; line-height: 1.5;'>
                                <strong>⚠️ Security Notice:</strong><br>
                                • Do not share this OTP with anyone<br>
                                • ${config.app.name} will never ask for your OTP<br>
                                • If you didn't request this OTP, please ignore this email
                            </p>
                        </div>

                        <p style='font-size: 14px; color: #555; margin-top: 25px; line-height: 1.6;'>
                            If you have any questions or need assistance, please contact our support team.
                        </p>

                        <div style='text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #E0E0E0;'>
                            <p style='color: #2E7D32; font-size: 16px; font-weight: 600; margin: 0;'>
                                🌾 Growing Together, Harvesting Success! 🌾
                            </p>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style='background: linear-gradient(135deg, #1B5E20, #2E7D32); text-align: center; padding: 15px; color: #FFFFFF;'>
                        <div style='margin-bottom: 8px;'>
                            <span style='font-size: 16px; margin: 0 6px;'>🌾</span>
                            <span style='font-size: 16px; margin: 0 6px;'>🚜</span>
                            <span style='font-size: 16px; margin: 0 6px;'>🌱</span>
                            <span style='font-size: 16px; margin: 0 6px;'>🏪</span>
                        </div>
                        <p style='margin: 0; font-size: 11px; opacity: 0.9;'>
                            © 2025 ${config.app.name}. All rights reserved. | This is an automated message, please do not reply.
                        </p>
                    </div>
                </div>
            </div>
        </body>
        </html>`;
    },

    /**
     * Send POS activation notification email to customer (company)
     */
    sendActivationNotification: async (
        companyData,
        serialKeyData,
        activationDate,
        isReactivation = false
    ) => {
        try {
            if (!companyData.companyemailid || !/\S+@\S+\.\S+/.test(companyData.companyemailid)) {
                return { success: 0, msg: "Invalid company email address" };
            }

            const transporter = emailHelper.createTransporter();

            const mailOptions = {
                from: config.email.from,
                to: companyData.companyemailid,
                subject: `${config.app.name} - POS System ${
                    isReactivation ? "Reactivated" : "Activated"
                } Successfully!`,
                html: emailHelper.getActivationEmailTemplate({
                    companyName: companyData.companyname,
                    contactNumber: companyData.companycontactnumber,
                    email: companyData.companyemailid,
                    productKey: serialKeyData.product_key,
                    serialNumber: serialKeyData.serial_number,
                    activationDate: activationDate,
                    isReactivation: isReactivation,
                }),
            };

            await transporter.sendMail(mailOptions);

            winston.info(`POS activation email sent to customer: ${companyData.companyemailid}`, {
                source: "posActivationHelper.js",
                function: "sendActivationNotification",
                email: companyData.companyemailid,
                companyName: companyData.companyname,
                isReactivation: isReactivation
            });

            return {
                success: 1,
                msg: `${isReactivation ? "Reactivation" : "Activation"} Email Sent Successfully`,
            };
        } catch (error) {
            winston.error(`Failed to send activation email to customer: ${error.message}`, {
                source: "posActivationHelper.js",
                function: "sendActivationNotification",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                email: companyData?.companyemailid,
                companyName: companyData?.companyname,
                isReactivation: isReactivation
            });
            return { success: 0, msg: "Failed to send activation email", error: error.message };
        }
    },

    /**
     * Send POS activation notification to admin
     */
    sendAdminPOSActivationNotification: async (
        companyData,
        serialKeyData,
        activationDate,
        isReactivation = false
    ) => {
        try {
            const transporter = emailHelper.createTransporter();

            const mailOptions = {
                from: config.email.from,
                to: config.pos.activationAlertEmail || config.email.from,
                subject: `${
                    isReactivation ? "🔄 POS Reactivation Alert" : "🎉 New POS Activation Alert"
                }: ${companyData.companyname}`,
                html: emailHelper.getAdminPOSActivationEmailTemplate({
                    companyName: companyData.companyname,
                    contactNumber: companyData.companycontactnumber,
                    email: companyData.companyemailid,
                    productKey: serialKeyData.product_key,
                    serialNumber: serialKeyData.serial_number,
                    activationDate: activationDate,
                    isReactivation: isReactivation,
                    planName: companyData.plan_name || "N/A",
                    ipAddress: companyData.ip_address || "-",
                }),
            };

            await transporter.sendMail(mailOptions);

            winston.info(`Admin POS activation notification sent for company: ${companyData.companyname}`, {
                source: "posActivationHelper.js",
                function: "sendAdminPOSActivationNotification",
                companyName: companyData.companyname,
                email: companyData.companyemailid,
                isReactivation: isReactivation
            });

            return { success: 1, msg: "Admin notification sent successfully" };
        } catch (error) {
            winston.error(`Failed to send admin POS activation notification: ${error.message}`, {
                source: "posActivationHelper.js",
                function: "sendAdminPOSActivationNotification",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                companyName: companyData?.companyname,
                isReactivation: isReactivation
            });
            return { success: 0, msg: "Failed to send admin notification", error: error.message };
        }
    },

    /**
     * Send both customer and admin POS activation notifications
     */
    sendPOSActivationNotifications: async (
        companyData,
        serialKeyData,
        activationDate,
        isReactivation = false
    ) => {
        const results = {
            customer: { success: 0, msg: "Not attempted" },
            admin: { success: 0, msg: "Not attempted" },
        };

        try {
            // Send email to customer
            results.customer = await emailHelper.sendActivationNotification(
                companyData,
                serialKeyData,
                activationDate,
                isReactivation
            );

            // Send email to admin
            results.admin = await emailHelper.sendAdminPOSActivationNotification(
                companyData,
                serialKeyData,
                activationDate,
                isReactivation
            );

            winston.info("POS activation notifications sent", {
                source: "posActivationHelper.js",
                function: "sendPOSActivationNotifications",
                companyName: companyData.companyname,
                customerEmail: results.customer.success === 1 ? "sent" : "failed",
                adminEmail: results.admin.success === 1 ? "sent" : "failed",
                isReactivation: isReactivation
            });

            return {
                success: 1,
                msg: "POS activation notifications processed",
                results,
            };
        } catch (error) {
            winston.error(`Error sending POS activation notifications: ${error.message}`, {
                source: "posActivationHelper.js",
                function: "sendPOSActivationNotifications",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                companyName: companyData?.companyname,
                isReactivation: isReactivation
            });
            return {
                success: 0,
                msg: "Failed to send POS activation notifications",
                error: error.message,
                results,
            };
        }
    },

    /**
     * Get customer POS activation email HTML template (company-based)
     */
    getActivationEmailTemplate: (data) => {
        const config = require("../config/config");
        const logoUrl = `https://agropos.s3.ap-south-1.amazonaws.com/logo/appLogo.png`;
        const activationType = data.isReactivation ? "Reactivated" : "Activated";

        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>AgriPOS System Activation</title>
            <style>
                body, html {
                    margin: 0;
                    padding: 0;
                    height: 100%;
                    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
                }
                .email-wrapper {
                    background: linear-gradient(135deg, #E8F5E8 0%, #F0F8F0 100%);
                    min-height: 100vh;
                    padding: 15px;
                    display: flex;
                    align-items: flex-start;
                    justify-content: center;
                }
                .email-container {
                    margin: 0 auto;
                }
                @media only screen and (max-width: 600px) {
                    .email-wrapper {
                        padding: 5px 0;
                        min-height: auto;
                    }
                    .email-container {
                        width: 100% !important;
                        margin: 0 !important;
                        border-radius: 0 !important;
                        max-height: none !important;
                    }
                    .email-content {
                        padding: 12px !important;
                    }
                    .header-content {
                        padding: 15px 12px !important;
                    }
                    .header-logo {
                        width: 35px !important;
                        height: 35px !important;
                    }
                    .header-title {
                        font-size: 18px !important;
                    }
                    .header-subtitle {
                        font-size: 11px !important;
                    }
                    .card-section {
                        padding: 12px !important;
                        margin: 10px 0 !important;
                    }
                    .detail-table {
                        display: block !important;
                    }
                    .detail-row {
                        display: block !important;
                        margin-bottom: 10px !important;
                        border-bottom: 1px solid #E0E0E0 !important;
                        padding-bottom: 6px !important;
                    }
                    .detail-cell {
                        display: block !important;
                        padding: 3px 0 !important;
                        width: 100% !important;
                        border-bottom: none !important;
                    }
                    .detail-label {
                        font-weight: 600 !important;
                        color: #2E7D32 !important;
                        margin-bottom: 2px !important;
                        font-size: 12px !important;
                    }
                    .detail-value {
                        font-weight: 500 !important;
                        color: #333 !important;
                        font-size: 13px !important;
                    }
                    .footer-content {
                        padding: 12px !important;
                    }
                    .footer-icons {
                        margin-bottom: 6px !important;
                    }
                    .footer-icons span {
                        font-size: 14px !important;
                        margin: 0 3px !important;
                    }
                    .footer-text {
                        font-size: 10px !important;
                    }
                    .action-section {
                        padding: 12px !important;
                        margin: 15px 0 !important;
                    }
                    .welcome-title {
                        font-size: 16px !important;
                    }
                    .welcome-text {
                        font-size: 12px !important;
                    }
                    .section-title {
                        font-size: 14px !important;
                    }
                }
            </style>
        </head>
        <body>
        <div class="email-wrapper">
            <div class="email-container" style='width: 100%; max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); overflow: hidden; border: 1px solid #E0E0E0;'>
                
                <!-- Header -->
                <div style='background: linear-gradient(135deg, #2E7D32 0%, #4CAF50 50%, #66BB6A 100%); color: white; padding: 35px 15px; text-align: center;'>
                    <div style='background: white; width: 90px; height: 90px; border-radius: 50%; display: block; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.25); margin: 0 auto 20px;'>
                        <img src="${logoUrl}" alt="${
            config.app.name
        } Logo" style='width: 90px; height: 90px; object-fit: cover; display: block; border: 0;'>
                    </div>
                    <h1 style='margin: 0; font-size: 24px; font-weight: 600;'>POS System ${activationType}!</h1>
                    <p style='margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;'>Your POS system has been ${activationType.toLowerCase()} successfully</p>
                </div>

                <!-- Content -->
                <div style='padding: 20px;'>

                    <!-- Success Message -->
                    <div style='text-align: center; margin-bottom: 25px;'>
                        <h2 style='color: #2E7D32; font-size: 20px; font-weight: bold; margin-bottom: 10px;'>
                            🎉 ${data.isReactivation ? "Welcome Back!" : "Congratulations!"}
                        </h2>
                        <p style='color: #666; font-size: 14px; line-height: 1.5; margin: 0;'>
                            Dear <strong>${
                                data.companyName
                            }</strong>, your POS system has been successfully ${activationType.toLowerCase()}. You can now start using all the features of your ${
            config.app.name
        } system.
                        </p>
                    </div>

                    <!-- Company Details -->
                    <div style='background: #FAFAFA; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #4CAF50;'>
                        <h3 style='color: #2E7D32; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;'>
                            🏢 Company Information
                        </h3>
                        <table style='width: 100%; border-collapse: collapse;'>
                            <tr>
                                <td style='padding: 10px; border-bottom: 1px solid #E0E0E0; width: 40%; font-weight: 500; color: #555;'>
                                    Company Name:
                                </td>
                                <td style='padding: 10px; border-bottom: 1px solid #E0E0E0; color: #2E7D32; font-weight: 600;'>
                                    ${data.companyName}
                                </td>
                            </tr>
                            <tr>
                                <td style='padding: 10px; border-bottom: 1px solid #E0E0E0; font-weight: 500; color: #555;'>
                                    Contact Number:
                                </td>
                                <td style='padding: 10px; border-bottom: 1px solid #E0E0E0; color: #2E7D32; font-weight: 600;'>
                                    ${data.contactNumber}
                                </td>
                            </tr>
                            <tr>
                                <td style='padding: 10px; font-weight: 500; color: #555;'>
                                    Email:
                                </td>
                                <td style='padding: 10px; color: #2E7D32; font-weight: 600;'>
                                    ${data.email}
                                </td>
                            </tr>
                        </table>
                    </div>

                    <!-- Activation Details -->
                    <div style='background: #E8F5E8; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #66BB6A;'>
                        <h3 style='color: #2E7D32; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;'>
                            🔐 Activation Details
                        </h3>
                        <table style='width: 100%; border-collapse: collapse;'>
                            <tr>
                                <td style='padding: 10px; border-bottom: 1px solid #D0E8D0; width: 40%; font-weight: 500; color: #555;'>
                                    Product Key:
                                </td>
                                <td style='padding: 10px; border-bottom: 1px solid #D0E8D0; font-family: monospace; background: white; border-radius: 4px; font-size: 14px; font-weight: bold; color: #2E7D32; word-break: break-all;'>
                                    ${data.productKey}
                                </td>
                            </tr>
                            <tr>
                                <td style='padding: 10px; border-bottom: 1px solid #D0E8D0; font-weight: 500; color: #555;'>
                                    Serial Number:
                                </td>
                                <td style='padding: 10px; border-bottom: 1px solid #D0E8D0; font-family: monospace; background: white; border-radius: 4px; font-size: 14px; font-weight: bold; color: #2E7D32; word-break: break-all;'>
                                    ${data.serialNumber}
                                </td>
                            </tr>
                            <tr>
                                <td style='padding: 10px; border-bottom: 1px solid #D0E8D0; font-weight: 500; color: #555;'>
                                    Activated On:
                                </td>
                                <td style='padding: 10px; border-bottom: 1px solid #D0E8D0; color: #2E7D32; font-weight: 600;'>
                                    ${data.activationDate}
                                </td>
                            </tr>
                        </table>
                    </div>

                    <!-- Next Steps -->
                    <div style='background: #E3F2FD; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #2196F3;'>
                        <h3 style='color: #1976D2; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;'>
                            🚀 ${data.isReactivation ? "Continue Using" : "Getting Started"}
                        </h3>
                        <ul style='color: #333; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;'>
                            <li style='margin-bottom: 8px;'>Login to your ${
                                config.app.name
                            } system using your credentials</li>
                            <li style='margin-bottom: 8px;'>Configure your business settings and preferences</li>
                            <li style='margin-bottom: 8px;'>Add products, manage inventory, and track sales</li>
                            <li>Contact support if you need any assistance</li>
                        </ul>
                    </div>

                    <!-- Support Information -->
                    <div style='text-align: center; margin-top: 25px; padding-top: 20px; border-top: 2px solid #E0E0E0;'>
                        <p style='color: #666; font-size: 14px; line-height: 1.5; margin-bottom: 10px;'>
                            Need help? Contact our support team at
                            <a href="mailto:support@agripos.com" style='color: #4CAF50; text-decoration: none; font-weight: 600;'>support@agripos.com</a>
                        </p>
                        <p style='color: #2E7D32; font-size: 16px; font-weight: 600; margin: 0;'>
                            🌾 Growing Together, Harvesting Success! 🌾
                        </p>
                    </div>
                </div>

                <!-- Footer -->
                <div style='background: linear-gradient(135deg, #1B5E20, #2E7D32); text-align: center; padding: 15px; color: #FFFFFF;'>
                    <div style='margin-bottom: 8px;'>
                        <span style='font-size: 16px; margin: 0 6px;'>🌾</span>
                        <span style='font-size: 16px; margin: 0 6px;'>🚜</span>
                        <span style='font-size: 16px; margin: 0 6px;'>🌱</span>
                        <span style='font-size: 16px; margin: 0 6px;'>🏪</span>
                    </div>
                    <p style='margin: 0; font-size: 11px; opacity: 0.9;'>
                        © 2025 ${
                            config.app.name
                        }. All rights reserved. | This is an automated message, please do not reply.
                    </p>
                </div>
            </div>
        </div>
        </body>
        </html>`;
    },

    /**
     * Get admin POS activation email HTML template (company-based)
     */
    getAdminPOSActivationEmailTemplate: (data) => {
        const config = require("../config/config");
        const logoUrl = `https://agropos.s3.ap-south-1.amazonaws.com/logo/appLogo.png`;
        const activationType = data.isReactivation ? "Reactivated" : "Activated";

        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>POS ${activationType} Alert - ${config.app.name}</title>
        </head>
        <body style='margin: 0; padding: 0; font-family: Arial, sans-serif;'>
            <div style='background: linear-gradient(135deg, #E8F5E8 0%, #F0F8F0 100%); min-height: 100vh; padding: 15px;'>
                <div style='width: 100%; max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); overflow: hidden; border: 1px solid #E0E0E0;'>

                    <!-- Header -->
                    <div style='background: linear-gradient(135deg, #2E7D32 0%, #4CAF50 50%, #66BB6A 100%); color: white; padding: 35px 15px; text-align: center;'>
                        <div style='background: white; width: 90px; height: 90px; border-radius: 50%; display: block; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.25); margin: 0 auto 20px;'>
                            <img src="${logoUrl}" alt="${
            config.app.name
        } Logo" style='width: 90px; height: 90px; object-fit: cover; display: block; border: 0;'>
                        </div>
                        <h1 style='margin: 0; font-size: 24px; font-weight: 600;'>${
                            data.isReactivation
                                ? "POS Reactivation Alert"
                                : "New POS Activation Alert"
                        }</h1>
                        <p style='margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;'>A company has ${activationType.toLowerCase()} their POS system</p>
                    </div>

                    <!-- Content -->
                    <div style='padding: 20px;'>

                        <!-- Alert Message -->
                        <div style='text-align: center; margin-bottom: 25px; background: ${
                            data.isReactivation ? "#FFF9C4" : "#E3F2FD"
                        }; padding: 15px; border-radius: 8px; border-left: 4px solid ${
            data.isReactivation ? "#FFC107" : "#2196F3"
        };'>
                            <h2 style='color: ${
                                data.isReactivation ? "#F57F17" : "#1976D2"
                            }; font-size: 20px; font-weight: bold; margin: 0 0 8px 0;'>
                                ${data.isReactivation ? "🔄" : "🎉"} POS ${activationType}!
                            </h2>
                            <p style='color: #666; font-size: 14px; margin: 0;'>
                                Activation Date: <strong>${data.activationDate}</strong>
                            </p>
                        </div>

                        <!-- Company Details -->
                        <div style='background: #FAFAFA; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #4CAF50;'>
                            <h3 style='color: #2E7D32; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;'>
                                🏢 Company Information
                            </h3>
                            <table style='width: 100%; border-collapse: collapse;'>
                                <tr>
                                    <td style='padding: 10px; border-bottom: 1px solid #E0E0E0; width: 40%; font-weight: 500; color: #555;'>
                                        Company Name:
                                    </td>
                                    <td style='padding: 10px; border-bottom: 1px solid #E0E0E0; color: #2E7D32; font-weight: 600;'>
                                        ${data.companyName}
                                    </td>
                                </tr>
                                <tr>
                                    <td style='padding: 10px; border-bottom: 1px solid #E0E0E0; font-weight: 500; color: #555;'>
                                        Contact Number:
                                    </td>
                                    <td style='padding: 10px; border-bottom: 1px solid #E0E0E0; color: #2E7D32; font-weight: 600;'>
                                        ${data.contactNumber}
                                    </td>
                                </tr>
                                <tr>
                                    <td style='padding: 10px; font-weight: 500; color: #555;'>
                                        Email:
                                    </td>
                                    <td style='padding: 10px; color: #2E7D32; font-weight: 600;'>
                                        ${data.email}
                                    </td>
                                </tr>
                            </table>
                        </div>

                        <!-- Activation & License Details -->
                        <div style='background: #FFF9C4; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #FFC107;'>
                            <h3 style='color: #F57F17; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;'>
                                🔐 Activation & License Details
                            </h3>
                            <table style='width: 100%; border-collapse: collapse;'>
                                <tr>
                                    <td style='padding: 10px; border-bottom: 1px solid #FFE082; width: 40%; font-weight: 500; color: #555;'>
                                        Product Key:
                                    </td>
                                    <td style='padding: 10px; border-bottom: 1px solid #FFE082; font-family: monospace; background: white; border-radius: 4px; font-size: 14px; font-weight: bold; color: #F57F17; word-break: break-all;'>
                                        ${data.productKey}
                                    </td>
                                </tr>
                                <tr>
                                    <td style='padding: 10px; border-bottom: 1px solid #FFE082; font-weight: 500; color: #555;'>
                                        Serial Number:
                                    </td>
                                    <td style='padding: 10px; border-bottom: 1px solid #FFE082; font-family: monospace; background: white; border-radius: 4px; font-size: 14px; font-weight: bold; color: #F57F17; word-break: break-all;'>
                                        ${data.serialNumber}
                                    </td>
                                </tr>
                                <tr>
                                    <td style='padding: 10px; border-bottom: 1px solid #FFE082; font-weight: 500; color: #555;'>
                                        Subscription Plan:
                                    </td>
                                    <td style='padding: 10px; border-bottom: 1px solid #FFE082; color: #F57F17; font-weight: 600;'>
                                        ${data.planName}
                                    </td>
                                </tr>
                            </table>
                        </div>

                        <!-- Technical Details -->
                        <div style='background: #F0F8F0; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #8BC34A;'>
                            <h3 style='color: #2E7D32; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;'>
                                📡 Technical Information
                            </h3>
                            <table style='width: 100%; border-collapse: collapse;'>
                                <tr>
                                    <td style='padding: 10px; border-bottom: 1px solid #C8E6C9; width: 40%; font-weight: 500; color: #555;'>
                                        IP Address:
                                    </td>
                                    <td style='padding: 10px; border-bottom: 1px solid #C8E6C9; font-family: monospace; color: #2E7D32; font-weight: 600;'>
                                        ${data.ipAddress}
                                    </td>
                                </tr>
                                <tr>
                                    <td style='padding: 10px; font-weight: 500; color: #555;'>
                                        Activation Type:
                                    </td>
                                    <td style='padding: 10px; color: #2E7D32; font-weight: 600;'>
                                        ${data.isReactivation ? "Reactivation" : "New Activation"}
                                    </td>
                                </tr>
                            </table>
                        </div>

                        <!-- Status -->
                        <div style='background: #E8F5E8; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center;'>
                            <p style='color: #2E7D32; font-size: 14px; margin: 0; font-weight: 500;'>
                                ✅ Customer welcome email has been sent successfully
                            </p>
                        </div>

                        <!-- Footer Message -->
                        <div style='text-align: center; margin-top: 25px; padding-top: 20px; border-top: 2px solid #E0E0E0;'>
                            <p style='color: #2E7D32; font-size: 16px; font-weight: 600; margin: 0;'>
                                🌾 Growing Together, Harvesting Success! 🌾
                            </p>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style='background: linear-gradient(135deg, #1B5E20, #2E7D32); text-align: center; padding: 15px; color: #FFFFFF;'>
                        <div style='margin-bottom: 8px;'>
                            <span style='font-size: 16px; margin: 0 6px;'>🌾</span>
                            <span style='font-size: 16px; margin: 0 6px;'>🚜</span>
                            <span style='font-size: 16px; margin: 0 6px;'>🌱</span>
                            <span style='font-size: 16px; margin: 0 6px;'>🏪</span>
                        </div>
                        <p style='margin: 0; font-size: 11px; opacity: 0.9;'>
                            © 2025 ${
                                config.app.name
                            }. All rights reserved. | This is an automated admin notification.
                        </p>
                    </div>
                </div>
            </div>
        </body>
        </html>`;
    },
};

/**
 * Database script helper
 */
const scriptHelper = {
    /**
     * Get database script content
     */
    getDbScript: () => {
        try {
            const scriptPath = path.join(process.cwd(), config.pos.dbScriptPath);
            if (fs.existsSync(scriptPath)) {
                return fs.readFileSync(scriptPath, "utf8");
            }
            return "";
        } catch (error) {
            winston.error(`Failed to read database script: ${error.message}`, {
                source: "posActivationHelper.js",
                function: "getDbScript",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                scriptPath: path.join(process.cwd(), config.pos.dbScriptPath)
            });
            return "";
        }
    },
};

/**
 * Validation helpers for POS activation
 */
const validationHelper = {
    /**
     * Validate product key format
     */
    isValidProductKey: (productKey) => {
        return productKey && typeof productKey === "string" && productKey.trim().length > 0;
    },

    /**
     * Validate mobile number
     */
    isValidMobile: (mobile) => {
        const mobileRegex = /^[+]?[0-9]{10,15}$/;
        return mobileRegex.test(mobile);
    },

    /**
     * Validate email
     */
    isValidEmail: (email) => {
        const emailRegex = /\S+@\S+\.\S+/;
        return emailRegex.test(email);
    },

    /**
     * Validate OTP format
     */
    isValidOTP: (otp) => {
        const otpRegex = /^[0-9]{6}$/;
        return otpRegex.test(otp);
    },

    /**
     * Sanitize input data
     */
    sanitizeInput: (input) => {
        const sanitized = {};
        Object.keys(input).forEach((key) => {
            if (typeof input[key] === "string") {
                sanitized[key] = input[key].trim();
            } else {
                sanitized[key] = input[key];
            }
        });
        return sanitized;
    },
};

module.exports = {
    smsHelper,
    emailHelper,
    scriptHelper,
    validationHelper,
};
