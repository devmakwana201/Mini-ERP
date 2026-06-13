const db = require("../../config/db");
const winston = require("../../config/winston");
const { hashPassword } = require("../../utils/passwordVerify.utils");
const { security } = require("../../config/config");
const { retryTransaction } = require("../../utils/dbRetry");

const userModel = {
    /**
     * Save users (insert or update)
     * @param {Array} users - Array of user objects
     * @returns {Object} Result object with success status and data
     */
    async saveUsers(users) {
        try {
            return await retryTransaction(
                async (connection) => {
                    const results = [];

                    for (const user of users) {
                        try {
                            const currDate = new Date().toISOString().slice(0, 19).replace("T", " ");

                            let hashedPin = null;
                            if (user.pinnumber) {
                                hashedPin = await hashPassword(
                                    user.pinnumber.toString(),
                                    security.bcryptRounds
                                );
                            }

                            if (user.userid) {
                                let existingUser;
                                try {
                                    [existingUser] = await connection.execute(
                                        "SELECT userid FROM usermaster WHERE userid = ? AND isdeleted = 0 FOR UPDATE NOWAIT",
                                        [user.userid]
                                    );
                                } catch (err) {
                                    if (err.errno === 3572) { // ER_LOCK_NOWAIT
                                        [existingUser] = await connection.execute(
                                            "SELECT userid FROM usermaster WHERE userid = ? AND isdeleted = 0 FOR UPDATE",
                                            [user.userid]
                                        );
                                    } else {
                                        throw err;
                                    }
                                }

                        if (existingUser.length > 0) {
                            const updateQuery = `
                                UPDATE usermaster
                                SET firstname = ?, lastname = ?, email = ?,
                                    pinnumber = ?, password = ?, roleid = ?, usermobileno = ?,
                                    username = ?, modifedby = ?, modifieddate = ?
                                WHERE userid = ? AND isdeleted = 0
                            `;
                            await connection.execute(updateQuery, [
                                user.firstname || null,
                                user.lastname || null,
                                user.email || null,
                                hashedPin,
                                hashedPin,
                                user.role || user.roleid || null,
                                user.usermobileno || null,
                                user.username || null,
                                user.modifiedby || user.createdby || 1,
                                currDate,
                                user.userid
                            ]);
                            results.push({
                                username: user.username,
                                userid: user.userid,
                                issynced: 1,
                                message: "User updated successfully"
                            });
                        } else {
                            results.push({
                                username: user.username,
                                userid: user.userid,
                                issynced: 0,
                                message: "User with this userid does not exist"
                            });
                        }
                    } else {
                        const insertQuery = `
                            INSERT INTO usermaster (
                                username, firstname, lastname, email, pinnumber, password,
                                roleid, usermobileno, companyid, isdeleted,
                                createdby, createddate, modifedby, modifieddate, ipaddress
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `;
                        const [insertResult] = await connection.execute(insertQuery, [
                            user.username,
                            user.firstname || null,
                            user.lastname || null,
                            user.email || null,
                            hashedPin,
                            hashedPin,
                            user.role || user.roleid || null,
                            user.usermobileno || null,
                            user.companyid || 0,
                            user.isdeleted || 0,
                            user.createdby || 1,
                            currDate,
                            user.modifiedby || user.createdby || 1,
                            currDate,
                            user.ipaddress || null,
                        ]);
                        results.push({
                            username: user.username,
                            userid: insertResult.insertId,
                            issynced: 1,
                            message: "User saved successfully",
                        });
                    }
                } catch (error) {
                    winston.error(`Error processing user`, {
                        source: "user.model.js",
                        function: "saveUsers",
                        username: user.username,
                        error: error.message,
                        code: error.code,
                        errno: error.errno,
                        stack: error.stack
                    });
                    results.push({
                        username: user.username,
                        issynced: 0,
                        message: "Failed to save user",
                        error: error.message,
                    });
                }
                    }

                    return { success: true, data: results };
                },
                {
                    maxRetries: 3,
                    operationName: `User save (batch of ${users.length})`,
                }
            );
        } catch (error) {
            winston.error(`Error saving users`, {
                source: "user.model.js",
                function: "saveUsers",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            const failedResults = users.map(u => ({
                username: u.username,
                issynced: 0,
                message: 'Transaction failed',
                error: error.message
            }));
            return { success: false, data: failedResults, error: error.message };
        }
    },
};

module.exports = userModel;