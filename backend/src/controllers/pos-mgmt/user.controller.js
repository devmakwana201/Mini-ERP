const userModel = require("../../models/pos-mgmt/user.model");
const ResponseFormatter = require("../../utils/responseFormatter");
const { asyncHandler } = require("../../utils/asyncHandler");
const { BadRequestError } = require("../../utils/customErrors");
const winston = require("../../config/winston");

module.exports = {
    /**
     * Sync users from POS
     * POST /api/v1/pos/user/sync
     */
    syncUsers: asyncHandler(async (req, res) => {
        const { users } = req.body;

        if (!users || !Array.isArray(users) || users.length === 0) {
            throw new BadRequestError("Users array is required and cannot be empty");
        }

        // Validate required fields for each user
        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            if (!user.username) {
                throw new BadRequestError(`User at index ${i} missing required field: username`);
            }
            if (!user.firstname) {
                throw new BadRequestError(`User at index ${i} missing required field: firstname`);
            }
            if (!user.lastname) {
                throw new BadRequestError(`User at index ${i} missing required field: lastname`);
            }
            if (!user.role && !user.roleid) {
                throw new BadRequestError(`User at index ${i} missing required field: role or roleid`);
            }
            if (!user.usermobileno) {
                throw new BadRequestError(`User at index ${i} missing required field: usermobileno`);
            }
            if (!user.pinnumber) {
                throw new BadRequestError(`User at index ${i} missing required field: pinnumber`);
            }
        }

        // Log the sync request
        if (req.pos) {
            winston.debug(`User sync request with token`, {
                source: "pos-mgmt/user.controller.js",
                function: "syncUsers",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                locationId: req.pos.locationId,
                usersCount: users.length,
                productKey: req.pos.productKey
            });
        } else {
            winston.debug(`User sync request without token`, {
                source: "pos-mgmt/user.controller.js",
                function: "syncUsers",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
                usersCount: users.length,
                ip: req.ip
            });
        }

        const result = await userModel.saveUsers(users);

        if (result.success) {
            const syncedCount = result.data.filter(u => u.issynced === 1).length;

            winston.debug(`User sync completed: ${syncedCount}/${users.length} users synced`, {
                source: "pos-mgmt/user.controller.js",
                function: "syncUsers",
                endpoint: req.path,
                method: req.method,
                userId: req.user?.id,
            });

            res.status(200).json(
                ResponseFormatter.success(
                    result.data,
                    `Successfully synced ${syncedCount}/${users.length} users.`
                )
            );
        } else {
            res.status(400).json(ResponseFormatter.error("Failed to sync users"));
        }
    })
};
