const jwt = require("jsonwebtoken");
const user = require("../models/masters/user-mgmt/user.model");
const jwtUtils = require("../utils/jwtToken.utils");
const winston = require("../config/winston");
const ResponseFormatter = require("../utils/responseFormatter");
const { asyncHandler } = require("../utils/asyncHandler");
const { AuthenticationError, ValidationError } = require("../utils/customErrors");
const { validateBody, validationRules } = require("../middlewares/validation");
const config = require("../config/config");

module.exports = {
    /**
     * User login endpoint
     * Validates credentials and returns JWT tokens
     */
    userLogin: asyncHandler(async (req, res) => {
        const { password } = req.body;
        const email = req.body.email.toLowerCase();

        // Find user and validate credentials
        const userResp = await user.findUser(email, password);
        if (userResp.success === 0) {
            throw new AuthenticationError(userResp.msg || "Invalid email or password");
        }

        // Generate tokens
        const tokenPayload = {
            userId: userResp.data.userId,
            email: userResp.data.email,
        };

        const accessToken = jwtUtils.generateToken(tokenPayload);
        const refreshToken = jwtUtils.generateRefreshToken(tokenPayload);
        
        // Update user token in database
        const tokenResp = await user.updateToken(userResp.data.userId, accessToken);
        
        if (!tokenResp.success) {
            winston.error("Failed to update user token", {
                source: "auth.controller.js",
                function: "userLogin",
                endpoint: req.path,
                method: req.method,
                userId: userResp.data.userId,
                error: "Token update failed"
            });
            throw new Error("Login failed. Please try again");
        }

        // Save login logs
        const clientIp = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers["user-agent"];
        await user.saveLogs(clientIp, userResp.data.userId, userAgent);

        // Prepare response data
        const responseData = {
            token: accessToken,
            refreshToken: refreshToken,
            user: {
                userId: userResp.data.userId,
                email: userResp.data.email,
                userName: userResp.data.userName,
                firstName: userResp.data.firstName,
                lastName: userResp.data.lastName,
                name: `${userResp.data.firstName || ''} ${userResp.data.lastName || ''}`.trim() || userResp.data.userName,
            },
            expiresIn: config.jwt.expiresIn,
        };

        winston.info("User logged in successfully", {
            source: "auth.controller.js",
            function: "userLogin",
            endpoint: req.path,
            method: req.method,
            userId: userResp.data.userId,
            email: userResp.data.email
        });

        res.status(200).json(
            ResponseFormatter.success(responseData, "Login successful")
        );
    }),

    /**
     * User logout endpoint
     * Invalidates the current JWT token
     */
    userLogout: asyncHandler(async (req, res) => {
        const token = req.headers.authorization?.split(" ")[1];
        
        if (!token) {
            throw new AuthenticationError("No token provided");
        }

        // Remove token from database
        await user.removeToken(token);
        
        // Update logout time in logs
        if (req.user && req.user.userId) {
            await user.updateLogs(req.user.userId);
            winston.info("User logged out", {
                source: "auth.controller.js",
                function: "userLogout",
                endpoint: req.path,
                method: req.method,
                userId: req.user.userId
            });
        }

        res.status(200).json(
            ResponseFormatter.success(null, "Logged out successfully")
        );
    }),

    /**
     * Refresh access token using refresh token
     */
    refreshToken: asyncHandler(async (req, res) => {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            throw new AuthenticationError("Refresh token is required");
        }

        // Verify refresh token
        const decoded = jwtUtils.verifyRefreshToken(refreshToken);
        
        if (!decoded) {
            throw new AuthenticationError("Invalid refresh token");
        }

        // Generate new access token
        const tokenPayload = {
            userId: decoded.userId,
            email: decoded.email,
        };

        const newAccessToken = jwtUtils.generateToken(tokenPayload);

        // Update token in database
        await user.updateToken(decoded.userId, newAccessToken);

        res.status(200).json(
            ResponseFormatter.success(
                { 
                    token: newAccessToken,
                    expiresIn: config.jwt.expiresIn,
                },
                "Token refreshed successfully"
            )
        );
    }),

    /**
     * Verify current token validity
     */
    verifyToken: asyncHandler(async (req, res) => {
        // If request reaches here, token is valid (verified by auth middleware)
        res.status(200).json(
            ResponseFormatter.success(
                {
                    valid: true,
                    user: req.user,
                },
                "Token is valid"
            )
        );
    }),

    /**
     * Request password reset
     * Sends reset token via email
     */
    forgotPassword: asyncHandler(async (req, res) => {
        const { email } = req.body;

        // Check if user exists
        const userExists = await user.checkUserExists(email);
        
        if (!userExists) {
            // Don't reveal if user exists or not for security
            res.status(200).json(
                ResponseFormatter.success(
                    null,
                    "If the email exists, a password reset link has been sent"
                )
            );
            return;
        }
        
        // Generate password reset token
        const resetToken = jwtUtils.generatePasswordResetToken(email);
        
        // Save reset token to database
        await user.savePasswordResetToken(email, resetToken);
        
        // TODO: Send email with reset link
        // await emailService.sendPasswordResetEmail(email, resetToken);

        winston.info("Password reset requested", {
            source: "auth.controller.js",
            function: "forgotPassword",
            endpoint: req.path,
            method: req.method,
            email
        });

        res.status(200).json(
            ResponseFormatter.success(
                "If the email exists, a password reset link has been sent"
            )
        );
    }),

    /**
     * Reset password using reset token
     */
    resetPassword: asyncHandler(async (req, res) => {
        const { token, newPassword } = req.body;

        // Verify reset token from database
        const tokenData = await user.verifyPasswordResetToken(token);
        
        if (!tokenData) {
            throw new AuthenticationError("Invalid or expired reset token");
        }

        // Update password
        const updateResult = await user.updatePassword(tokenData.email, newPassword);
        
        if (!updateResult.success) {
            throw new Error("Failed to reset password");
        }

        // Clear reset token
        await user.clearPasswordResetToken(tokenData.email);

        winston.info("Password reset successful", {
            source: "auth.controller.js",
            function: "resetPassword",
            endpoint: req.path,
            method: req.method,
            email: tokenData.email
        });

        res.status(200).json(
            ResponseFormatter.success(null, "Password reset successful")
        );
    }),

    /**
     * Change user password (requires current password)
     */
    changePassword: asyncHandler(async (req, res) => {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.userId;

        // Verify current password
        const isValidPassword = await user.verifyPassword(userId, currentPassword);
        
        if (!isValidPassword) {
            throw new AuthenticationError("Current password is incorrect");
        }

        // Update password
        const updateResult = await user.updatePasswordById(userId, newPassword);
        
        if (!updateResult.success) {
            throw new Error("Failed to change password");
        }

        winston.info("Password changed successfully", {
            source: "auth.controller.js",
            function: "changePassword",
            endpoint: req.path,
            method: req.method,
            userId
        });

        res.status(200).json(
            ResponseFormatter.success(null, "Password changed successfully")
        );
    }),

    /**
     * POST /api/v1/auth/signup
     * Self-service user registration
     * Validates: Login ID (unique, 6-12 chars), Email (unique), Password strength, Confirm match
     */
    userSignup: asyncHandler(async (req, res) => {
        const { username, email, password } = req.body;

        winston.info("User signup attempt", {
            source: "auth.controller.js",
            function: "userSignup",
            endpoint: req.path,
            method: req.method,
            username,
            email,
        });

        const result = await user.signupUser({ username, email, password });

        if (result.success === 0) {
            const statusCode = result.status || 400;
            return res.status(statusCode).json(
                ResponseFormatter.error(result.msg || "Signup failed", statusCode)
            );
        }

        winston.info("User signup successful", {
            source: "auth.controller.js",
            function: "userSignup",
            userId: result.data?.userId,
            username,
            email,
        });

        res.status(201).json(
            ResponseFormatter.success(result.data, result.msg || "Account created successfully")
        );
    }),
};