const nodemailer = require("nodemailer");
const config = require("../config/config");
const winston = require("../config/winston");
const whatsAppService = require("../services/whatsapp.service");

/**
 * Company Registration Notification Helper
 */
const companyNotificationHelper = {
    /**
     * Create nodemailer transporter
     */
    createTransporter: () => {
        return nodemailer.createTransport({
            host: config.email.host || 'smtp.gmail.com',
            port: config.email.port || 587,
            secure: config.email.secure || false,
            auth: {
                user: config.email.auth.user,
                pass: config.email.auth.pass,
            },
            tls: {
                rejectUnauthorized: false,
            }
        });
    },

    /**
     * Send company registration email with serial key details
     */
    sendRegistrationEmail: async (companyData, serialKeyData, planData) => {
        try {
            if (!companyData.companyemailid || !/\S+@\S+\.\S+/.test(companyData.companyemailid)) {
                return { success: 0, msg: "Invalid Email Id" };
            }

            const transporter = companyNotificationHelper.createTransporter();

            const mailOptions = {
                from: config.email.from,
                to: companyData.companyemailid,
                subject: `🎉 Welcome to ${config.app.name} - Your Registration is Complete!`,
                html: companyNotificationHelper.getRegistrationEmailTemplate({
                    companyName: companyData.companyname,
                    contactNumber: companyData.companycontactnumber,
                    email: companyData.companyemailid,
                    productKey: serialKeyData.product_key,
                    serialNumber: serialKeyData.serial_number,
                    mysqlPassword: serialKeyData.client_mysql_password,
                    planName: planData.planname || 'Selected Plan',
                    planPrice: planData.planprice || planData.price,
                    planDuration: planData.duration,
                    expiryDate: planData.expiryDate,
                    registrationDate: new Date().toLocaleDateString('en-IN')
                })
            };

            await transporter.sendMail(mailOptions);

            winston.info(`Registration email sent to: ${companyData.companyemailid}`, {
                source: "companyNotificationHelper.js",
                function: "sendRegistrationEmail",
                email: companyData.companyemailid,
                companyName: companyData.companyname
            });

            return { success: 1, msg: "Registration email sent successfully" };
        } catch (error) {
            winston.error(`Failed to send registration email: ${error.message}`, {
                source: "companyNotificationHelper.js",
                function: "sendRegistrationEmail",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                email: companyData?.companyemailid
            });
            return { success: 0, msg: "Failed to send registration email", error: error.message };
        }
    },

    /**
     * Send WhatsApp notification with serial key details
     */
    sendRegistrationWhatsApp: async (companyData, serialKeyData, planData) => {
        try {
            if (!companyData.companycontactnumber) {
                return { success: 0, msg: "Phone number is required" };
            }

            // Clean phone number (remove spaces, dashes, etc.)
            let phoneNumber = companyData.companycontactnumber.replace(/[\s\-\(\)]/g, '');

            // Add country code if not present
            if (!phoneNumber.startsWith('+')) {
                phoneNumber = '+91' + phoneNumber; // Default to India
            }

            const whatsappData = {
                companyName: companyData.companyname,
                contactNumber: companyData.companycontactnumber,
                productKey: serialKeyData.product_key,
                serialNumber: serialKeyData.serial_number,
                mysqlPassword: serialKeyData.client_mysql_password,
                planName: planData.planname || 'Selected Plan',
                planPrice: planData.planprice || planData.price,
                expiryDate: planData.expiryDate
            };

            // Send WhatsApp notification using existing service
            const result = await whatsAppService.sendNotification(
                phoneNumber,
                'companyRegistered', // Template type
                whatsappData
            );

            if (result.success) {
                winston.info(`Registration WhatsApp sent to: ${phoneNumber}`, {
                    source: "companyNotificationHelper.js",
                    function: "sendRegistrationWhatsApp",
                    phoneNumber: phoneNumber,
                    companyName: companyData.companyname
                });
                return { success: 1, msg: "WhatsApp notification sent successfully" };
            } else {
                winston.warn(`Failed to send WhatsApp to ${phoneNumber}: ${result.message}`, {
                    source: "companyNotificationHelper.js",
                    function: "sendRegistrationWhatsApp",
                    phoneNumber: phoneNumber,
                    resultMessage: result.message,
                    companyName: companyData.companyname
                });
                return { success: 0, msg: result.message || "Failed to send WhatsApp notification" };
            }

        } catch (error) {
            winston.error(`Failed to send registration WhatsApp: ${error.message}`, {
                source: "companyNotificationHelper.js",
                function: "sendRegistrationWhatsApp",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                phoneNumber: companyData?.companycontactnumber
            });
            return { success: 0, msg: "Failed to send WhatsApp notification", error: error.message };
        }
    },

    /**
     * Send admin notification about company registration
     */
    sendAdminRegistrationNotification: async (companyData, serialKeyData, planData) => {
        try {
            const transporter = companyNotificationHelper.createTransporter();
            const registrationDate = new Date().toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            });

            const mailOptions = {
                from: config.email.from,
                to: config.pos.activationAlertEmail || config.email.from,
                subject: `🎉 New Company Registration: ${companyData.companyname}`,
                html: companyNotificationHelper.getAdminRegistrationEmailTemplate({
                    companyName: companyData.companyname,
                    contactNumber: companyData.companycontactnumber,
                    email: companyData.companyemailid,
                    productKey: serialKeyData.product_key,
                    serialNumber: serialKeyData.serial_number,
                    planName: planData.planname || 'Selected Plan',
                    planPrice: planData.planprice || planData.price,
                    planDuration: planData.duration,
                    registrationDate: registrationDate
                })
            };

            await transporter.sendMail(mailOptions);

            winston.info(`Admin registration notification sent for company: ${companyData.companyname}`, {
                source: "companyNotificationHelper.js",
                function: "sendAdminRegistrationNotification",
                companyName: companyData.companyname,
                email: companyData.companyemailid
            });

            return { success: 1, msg: "Admin notification sent successfully" };
        } catch (error) {
            winston.error(`Failed to send admin registration notification: ${error.message}`, {
                source: "companyNotificationHelper.js",
                function: "sendAdminRegistrationNotification",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                companyName: companyData?.companyname
            });
            return { success: 0, msg: "Failed to send admin notification", error: error.message };
        }
    },

    /**
     * Send both email and WhatsApp notifications
     */
    sendRegistrationNotifications: async (companyData, serialKeyData, planData) => {
        const results = {
            email: { success: 0, msg: "Not attempted" },
            whatsapp: { success: 0, msg: "Not attempted" },
            adminNotification: { success: 0, msg: "Not attempted" }
        };

        try {
            // Send email notification to customer
            results.email = await companyNotificationHelper.sendRegistrationEmail(
                companyData,
                serialKeyData,
                planData
            );

            // Send admin notification
            results.adminNotification = await companyNotificationHelper.sendAdminRegistrationNotification(
                companyData,
                serialKeyData,
                planData
            );

            // Send WhatsApp notification
            // results.whatsapp = await companyNotificationHelper.sendRegistrationWhatsApp(
            //     companyData,
            //     serialKeyData,
            //     planData
            // );

            winston.info('Company registration notifications sent', {
                source: "companyNotificationHelper.js",
                function: "sendRegistrationNotifications",
                companyId: companyData.companyid,
                companyName: companyData.companyname,
                email: results.email.success === 1 ? 'sent' : 'failed',
                adminEmail: results.adminNotification.success === 1 ? 'sent' : 'failed',
                whatsapp: results.whatsapp.success === 1 ? 'sent' : 'failed'
            });

            return {
                success: 1,
                msg: "Notifications processed",
                results
            };

        } catch (error) {
            winston.error(`Error sending registration notifications: ${error.message}`, {
                source: "companyNotificationHelper.js",
                function: "sendRegistrationNotifications",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                companyId: companyData?.companyid,
                companyName: companyData?.companyname
            });
            return {
                success: 0,
                msg: "Failed to send notifications",
                error: error.message,
                results
            };
        }
    },

    /**
     * Get registration email HTML template
     */
    getRegistrationEmailTemplate: (data) => {
        const logoUrl = `https://agropos.s3.ap-south-1.amazonaws.com/logo/appLogo.png`;

        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to ${config.app.name}</title>
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
                    .email-wrapper { padding: 5px 0; min-height: auto; }
                    .email-container { width: 100% !important; margin: 0 !important; border-radius: 0 !important; }
                    .email-content { padding: 12px !important; }
                    .header-content { padding: 15px 12px !important; }
                    .header-logo { width: 35px !important; height: 35px !important; }
                    .card-section { padding: 12px !important; margin: 10px 0 !important; }
                    .detail-table { display: block !important; }
                    .detail-row { display: block !important; margin-bottom: 10px !important; border-bottom: 1px solid #E0E0E0 !important; padding-bottom: 6px !important; }
                    .detail-cell { display: block !important; padding: 3px 0 !important; width: 100% !important; }
                }
            </style>
        </head>
        <body>
        <div class="email-wrapper">
            <div class="email-container" style='width: 100%; max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); overflow: hidden; border: 1px solid #E0E0E0;'>

                <!-- Header -->
                <div class="header-content" style='background: linear-gradient(135deg, #2E7D32 0%, #4CAF50 50%, #66BB6A 100%); color: white; padding: 35px 15px; text-align: center;'>
                    <div style='background: white; width: 90px; height: 90px; border-radius: 50%; display: block; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.25); margin: 0 auto 20px;'>
                        <img src="${logoUrl}" alt="${config.app.name} Logo" class="header-logo" style='width: 90px; height: 90px; object-fit: cover; display: block; border: 0;'>
                    </div>
                    <h1 style='margin: 0; font-size: 24px; font-weight: 600;'>Welcome to ${config.app.name}!</h1>
                    <p style='margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;'>Your agricultural business is now registered</p>
                </div>

                <!-- Content -->
                <div class="email-content" style='padding: 20px;'>

                    <!-- Welcome Message -->
                    <div style='text-align: center; margin-bottom: 25px;'>
                        <h2 style='color: #2E7D32; font-size: 20px; font-weight: bold; margin-bottom: 10px;'>
                            🎉 Registration Successful!
                        </h2>
                        <p style='color: #666; font-size: 14px; line-height: 1.5; margin: 0;'>
                            Dear <strong>${data.companyName}</strong>, your agricultural business has been successfully registered with our platform. Here are your important credentials and subscription details.
                        </p>
                    </div>

                    <!-- Company Details -->
                    <div class="card-section" style='background: #FAFAFA; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #4CAF50;'>
                        <h3 style='color: #2E7D32; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;'>
                            🏢 Company Information
                        </h3>
                        <table class="detail-table" style='width: 100%; border-collapse: collapse;'>
                            <tr class="detail-row">
                                <td class="detail-cell" style='padding: 10px; border-bottom: 1px solid #E0E0E0; width: 40%; font-weight: 500; color: #555;'>
                                    Company Name:
                                </td>
                                <td class="detail-cell" style='padding: 10px; border-bottom: 1px solid #E0E0E0; color: #2E7D32; font-weight: 600;'>
                                    ${data.companyName}
                                </td>
                            </tr>
                            <tr class="detail-row">
                                <td class="detail-cell" style='padding: 10px; border-bottom: 1px solid #E0E0E0; font-weight: 500; color: #555;'>
                                    Contact Number:
                                </td>
                                <td class="detail-cell" style='padding: 10px; border-bottom: 1px solid #E0E0E0; color: #2E7D32; font-weight: 600;'>
                                    ${data.contactNumber}
                                </td>
                            </tr>
                            <tr class="detail-row">
                                <td class="detail-cell" style='padding: 10px; font-weight: 500; color: #555;'>
                                    Email:
                                </td>
                                <td class="detail-cell" style='padding: 10px; color: #2E7D32; font-weight: 600;'>
                                    ${data.email}
                                </td>
                            </tr>
                        </table>
                    </div>

                    <!-- Serial Key Details (Most Important) -->
                    <div class="card-section" style='background: #E8F5E8; border-radius: 8px; padding: 20px; margin: 20px 0; border: 2px solid #4CAF50;'>
                        <h3 style='color: #2E7D32; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;'>
                            🔐 Your Software Credentials (IMPORTANT)
                        </h3>
                        <div style='background: white; padding: 15px; border-radius: 6px; margin: 10px 0;'>
                            <table class="detail-table" style='width: 100%; border-collapse: collapse;'>
                                <tr class="detail-row">
                                    <td class="detail-cell" style='padding: 12px 10px; border-bottom: 2px solid #E0E0E0; font-weight: 600; color: #2E7D32; font-size: 14px;'>
                                        Product Key:
                                    </td>
                                    <td class="detail-cell" style='padding: 12px 10px; border-bottom: 2px solid #E0E0E0; font-family: monospace; background: #F5F5F5; border-radius: 4px; font-size: 16px; font-weight: bold; color: #1B5E20; word-break: break-all;'>
                                        ${data.productKey}
                                    </td>
                                </tr>
                                <tr class="detail-row">
                                    <td class="detail-cell" style='padding: 12px 10px; border-bottom: 2px solid #E0E0E0; font-weight: 600; color: #2E7D32; font-size: 14px;'>
                                        Serial Number:
                                    </td>
                                    <td class="detail-cell" style='padding: 12px 10px; border-bottom: 2px solid #E0E0E0; font-family: monospace; background: #F5F5F5; border-radius: 4px; font-size: 16px; font-weight: bold; color: #1B5E20; word-break: break-all;'>
                                        ${data.serialNumber}
                                    </td>
                                </tr>
                            </table>
                        </div>
                    </div>

                    <!-- Subscription Details -->
                    <div class="card-section" style='background: #F0F8F0; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #8BC34A;'>
                        <h3 style='color: #2E7D32; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;'>
                            📋 Subscription Details
                        </h3>
                        <table class="detail-table" style='width: 100%; border-collapse: collapse;'>
                            <tr class="detail-row">
                                <td class="detail-cell" style='padding: 10px; border-bottom: 1px solid #E0E0E0; width: 40%; font-weight: 500; color: #555;'>
                                    Plan:
                                </td>
                                <td class="detail-cell" style='padding: 10px; border-bottom: 1px solid #E0E0E0; color: #2E7D32; font-weight: 600;'>
                                    ${data.planName}
                                </td>
                            </tr>
                            <tr class="detail-row">
                                <td class="detail-cell" style='padding: 10px; border-bottom: 1px solid #E0E0E0; font-weight: 500; color: #555;'>
                                    Price:
                                </td>
                                <td class="detail-cell" style='padding: 10px; border-bottom: 1px solid #E0E0E0; color: #2E7D32; font-weight: 600;'>
                                    ₹${data.planPrice}
                                </td>
                            </tr>
                            <tr class="detail-row">
                                <td class="detail-cell" style='padding: 10px; border-bottom: 1px solid #E0E0E0; font-weight: 500; color: #555;'>
                                    Duration:
                                </td>
                                <td class="detail-cell" style='padding: 10px; border-bottom: 1px solid #E0E0E0; color: #2E7D32; font-weight: 600;'>
                                    ${data.planDuration} days
                                </td>
                            </tr>
                            <tr class="detail-row">
                                <td class="detail-cell" style='padding: 10px; border-bottom: 1px solid #E0E0E0; font-weight: 500; color: #555;'>
                                    Valid Until:
                                </td>
                                <td class="detail-cell" style='padding: 10px; border-bottom: 1px solid #E0E0E0; color: #2E7D32; font-weight: 600;'>
                                    ${data.expiryDate}
                                </td>
                            </tr>
                            <tr class="detail-row">
                                <td class="detail-cell" style='padding: 10px; font-weight: 500; color: #555;'>
                                    Registration Date:
                                </td>
                                <td class="detail-cell" style='padding: 10px; color: #2E7D32; font-weight: 600;'>
                                    ${data.registrationDate}
                                </td>
                            </tr>
                        </table>
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
                        © 2025 ${config.app.name}. All rights reserved. | This is an automated message, please do not reply.
                    </p>
                </div>
            </div>
        </div>
        </body>
        </html>`;
    },

    /**
     * Get admin registration notification email HTML template
     */
    getAdminRegistrationEmailTemplate: (data) => {
        const logoUrl = `https://agropos.s3.ap-south-1.amazonaws.com/logo/appLogo.png`;

        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Company Registration - ${config.app.name}</title>
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
                @media only screen and (max-width: 600px) {
                    .email-wrapper { padding: 5px 0; min-height: auto; }
                    .card-section { padding: 12px !important; margin: 10px 0 !important; }
                    .detail-table { display: block !important; }
                    .detail-row { display: block !important; margin-bottom: 10px !important; }
                    .detail-cell { display: block !important; padding: 3px 0 !important; width: 100% !important; }
                }
            </style>
        </head>
        <body>
        <div class="email-wrapper">
            <div style='width: 100%; max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); overflow: hidden; border: 1px solid #E0E0E0;'>

                <!-- Header -->
                <div style='background: linear-gradient(135deg, #2E7D32 0%, #4CAF50 50%, #66BB6A 100%); color: white; padding: 35px 15px; text-align: center;'>
                    <div style='background: white; width: 90px; height: 90px; border-radius: 50%; display: block; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.25); margin: 0 auto 20px;'>
                        <img src="${logoUrl}" alt="${config.app.name} Logo" style='width: 90px; height: 90px; object-fit: cover; display: block; border: 0;'>
                    </div>
                    <h1 style='margin: 0; font-size: 24px; font-weight: 600;'>New Company Registration Alert</h1>
                    <p style='margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;'>A new company has been registered on the platform</p>
                </div>

                <!-- Content -->
                <div style='padding: 20px;'>

                    <!-- Alert Message -->
                    <div style='text-align: center; margin-bottom: 25px; background: #E3F2FD; padding: 15px; border-radius: 8px; border-left: 4px solid #2196F3;'>
                        <h2 style='color: #1976D2; font-size: 20px; font-weight: bold; margin: 0 0 8px 0;'>
                            🎉 New Company Registered!
                        </h2>
                        <p style='color: #666; font-size: 14px; margin: 0;'>
                            Registration Date: <strong>${data.registrationDate}</strong>
                        </p>
                    </div>

                    <!-- Company Details -->
                    <div class="card-section" style='background: #FAFAFA; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #4CAF50;'>
                        <h3 style='color: #2E7D32; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;'>
                            🏢 Company Information
                        </h3>
                        <table class="detail-table" style='width: 100%; border-collapse: collapse;'>
                            <tr class="detail-row">
                                <td class="detail-cell" style='padding: 10px; border-bottom: 1px solid #E0E0E0; width: 40%; font-weight: 500; color: #555;'>
                                    Company Name:
                                </td>
                                <td class="detail-cell" style='padding: 10px; border-bottom: 1px solid #E0E0E0; color: #2E7D32; font-weight: 600;'>
                                    ${data.companyName}
                                </td>
                            </tr>
                            <tr class="detail-row">
                                <td class="detail-cell" style='padding: 10px; border-bottom: 1px solid #E0E0E0; font-weight: 500; color: #555;'>
                                    Contact Number:
                                </td>
                                <td class="detail-cell" style='padding: 10px; border-bottom: 1px solid #E0E0E0; color: #2E7D32; font-weight: 600;'>
                                    ${data.contactNumber}
                                </td>
                            </tr>
                            <tr class="detail-row">
                                <td class="detail-cell" style='padding: 10px; font-weight: 500; color: #555;'>
                                    Email:
                                </td>
                                <td class="detail-cell" style='padding: 10px; color: #2E7D32; font-weight: 600;'>
                                    ${data.email}
                                </td>
                            </tr>
                        </table>
                    </div>

                    <!-- License & Serial Key Details -->
                    <div class="card-section" style='background: #FFF9C4; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #FFC107;'>
                        <h3 style='color: #F57F17; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;'>
                            🔐 License & Credentials
                        </h3>
                        <table class="detail-table" style='width: 100%; border-collapse: collapse;'>
                            <tr class="detail-row">
                                <td class="detail-cell" style='padding: 12px 10px; border-bottom: 2px solid #E0E0E0; font-weight: 600; color: #F57F17; font-size: 14px;'>
                                    Product Key:
                                </td>
                                <td class="detail-cell" style='padding: 12px 10px; border-bottom: 2px solid #E0E0E0; font-family: monospace; background: white; border-radius: 4px; font-size: 14px; font-weight: bold; color: #F57F17; word-break: break-all;'>
                                    ${data.productKey}
                                </td>
                            </tr>
                            <tr class="detail-row">
                                <td class="detail-cell" style='padding: 12px 10px; font-weight: 600; color: #F57F17; font-size: 14px;'>
                                    Serial Number:
                                </td>
                                <td class="detail-cell" style='padding: 12px 10px; font-family: monospace; background: white; border-radius: 4px; font-size: 14px; font-weight: bold; color: #F57F17; word-break: break-all;'>
                                    ${data.serialNumber}
                                </td>
                            </tr>
                        </table>
                    </div>

                    <!-- Subscription Plan Details -->
                    <div class="card-section" style='background: #F0F8F0; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #8BC34A;'>
                        <h3 style='color: #2E7D32; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;'>
                            📋 Subscription Plan
                        </h3>
                        <table class="detail-table" style='width: 100%; border-collapse: collapse;'>
                            <tr class="detail-row">
                                <td class="detail-cell" style='padding: 10px; border-bottom: 1px solid #E0E0E0; width: 40%; font-weight: 500; color: #555;'>
                                    Plan Name:
                                </td>
                                <td class="detail-cell" style='padding: 10px; border-bottom: 1px solid #E0E0E0; color: #2E7D32; font-weight: 600;'>
                                    ${data.planName}
                                </td>
                            </tr>
                            <tr class="detail-row">
                                <td class="detail-cell" style='padding: 10px; border-bottom: 1px solid #E0E0E0; font-weight: 500; color: #555;'>
                                    Plan Price:
                                </td>
                                <td class="detail-cell" style='padding: 10px; border-bottom: 1px solid #E0E0E0; color: #2E7D32; font-weight: 600;'>
                                    ₹${data.planPrice}
                                </td>
                            </tr>
                            <tr class="detail-row">
                                <td class="detail-cell" style='padding: 10px; font-weight: 500; color: #555;'>
                                    Duration:
                                </td>
                                <td class="detail-cell" style='padding: 10px; color: #2E7D32; font-weight: 600;'>
                                    ${data.planDuration} days
                                </td>
                            </tr>
                        </table>
                    </div>

                    <!-- Action Required -->
                    <div style='background: #E8F5E8; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center;'>
                        <p style='color: #2E7D32; font-size: 14px; margin: 0; font-weight: 500;'>
                            ✅ Registration completed successfully. Customer welcome email has been sent.
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
                        © 2025 ${config.app.name}. All rights reserved. | This is an automated admin notification.
                    </p>
                </div>
            </div>
        </div>
        </body>
        </html>`;
    }
};

module.exports = companyNotificationHelper;