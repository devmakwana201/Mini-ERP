const db = require("../../config/db");
const winston = require("../../config/winston");
const { retryTransaction } = require("../../utils/dbRetry");

const bomModel = {
    /**
     * Get all BOMs with pagination, filtering and sorting
     */
    async getBOMs({ filters = {}, start = 0, length = 10, sortField = "bom.createddate", sortOrder = "desc" } = {}) {
        try {
            const allowedSortFields = {
                bomname: "bom.bomname",
                bomcode: "bom.bomcode",
                finisheditemname: "im.itemname",
                bomtype: "bom.bomtype",
                quantity: "bom.quantity",
                status: "bom.status",
                createddate: "bom.createddate",
            };

            const safeSortField = allowedSortFields[sortField] || "bom.createddate";
            const safeSortOrder = sortOrder?.toLowerCase() === "asc" ? "ASC" : "DESC";

            const conditions = ["bom.isdeleted = 0"];
            const params = [];

            // Global search filter
            if (filters?.global?.value) {
                const search = `%${filters.global.value}%`;
                conditions.push(`(bom.bomname LIKE ? OR bom.bomcode LIKE ? OR im.itemname LIKE ?)`);
                params.push(search, search, search);
            }

            // Field-specific filters
            const fieldMap = {
                bomname: "bom.bomname",
                bomcode: "bom.bomcode",
                finisheditemname: "im.itemname",
                bomtype: "bom.bomtype",
                status: "bom.status",
            };

            for (const [key, col] of Object.entries(fieldMap)) {
                if (filters?.[key]?.value) {
                    conditions.push(`${col} LIKE ?`);
                    params.push(`%${filters[key].value}%`);
                }
            }

            const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

            const baseQuery = `
                FROM bom_master bom
                LEFT JOIN itemmaster im ON bom.finisheditemid = im.itemid AND im.isdeleted = 0
                LEFT JOIN uommaster uom ON bom.uomid = uom.uomid
                ${whereClause}
            `;

            const countSql = `SELECT COUNT(*) as total ${baseQuery}`;
            const dataSql = `
                SELECT
                    bom.bomid,
                    bom.bomname,
                    bom.bomcode,
                    bom.bomtype,
                    bom.finisheditemid,
                    im.itemname AS finisheditemname,
                    im.itemcode AS finisheditemcode,
                    im.imgpath AS finisheditemimg,
                    bom.quantity,
                    bom.uomid,
                    uom.uomname,
                    bom.status,
                    bom.description,
                    bom.effectivedate,
                    bom.expirydate,
                    bom.createdby,
                    bom.createddate,
                    bom.modifiedby,
                    bom.modifieddate
                ${baseQuery}
                ORDER BY ${safeSortField} ${safeSortOrder}
                LIMIT ? OFFSET ?
            `;

            const [countResult, rows] = await Promise.all([
                db.getResults(countSql, params),
                db.getResults(dataSql, [...params, parseInt(length), parseInt(start)]),
            ]);

            return {
                success: true,
                data: rows,
                total: countResult[0]?.total || 0,
            };
        } catch (error) {
            winston.error(`Error fetching BOMs: ${error.message}`, {
                source: "bom.model.js", function: "getBOMs",
                error: error.message, stack: error.stack,
            });
            return { success: false, message: "Failed to fetch BOMs", error: error.message };
        }
    },

    /**
     * Get BOM by ID with all components
     */
    async getBOMById(bomid) {
        try {
            const bomSql = `
                SELECT
                    bom.bomid, bom.bomname, bom.bomcode, bom.bomtype,
                    bom.finisheditemid,
                    im.itemname AS finisheditemname,
                    im.itemcode AS finisheditemcode,
                    im.imgpath AS finisheditemimg,
                    bom.quantity, bom.uomid,
                    uom.uomname,
                    bom.status, bom.description,
                    bom.effectivedate, bom.expirydate,
                    bom.createdby, bom.createddate,
                    bom.modifiedby, bom.modifieddate
                FROM bom_master bom
                LEFT JOIN itemmaster im ON bom.finisheditemid = im.itemid
                LEFT JOIN uommaster uom ON bom.uomid = uom.uomid
                WHERE bom.bomid = ? AND bom.isdeleted = 0
            `;

            const componentsSql = `
                SELECT
                    bc.bomcomponentid,
                    bc.bomid,
                    bc.componentitemid,
                    im.itemname AS componentname,
                    im.itemcode AS componentcode,
                    im.imgpath AS componentimg,
                    bc.quantity,
                    bc.uomid,
                    uom.uomname,
                    bc.scrap_percentage,
                    bc.notes,
                    bc.isoptional,
                    bc.sortorder
                FROM bom_components bc
                LEFT JOIN itemmaster im ON bc.componentitemid = im.itemid
                LEFT JOIN uommaster uom ON bc.uomid = uom.uomid
                WHERE bc.bomid = ? AND bc.isdeleted = 0
                ORDER BY bc.sortorder ASC, bc.bomcomponentid ASC
            `;

            const [boms, components] = await Promise.all([
                db.getResults(bomSql, [bomid]),
                db.getResults(componentsSql, [bomid]),
            ]);

            if (!boms || boms.length === 0) {
                return { success: false, message: "BOM not found" };
            }

            return {
                success: true,
                data: { ...boms[0], components },
            };
        } catch (error) {
            winston.error(`Error fetching BOM by ID: ${error.message}`, {
                source: "bom.model.js", function: "getBOMById",
                error: error.message, stack: error.stack, bomid,
            });
            return { success: false, message: "Failed to fetch BOM", error: error.message };
        }
    },

    /**
     * Create a new BOM with components
     */
    async createBOM(payload) {
        try {
            return await retryTransaction(async (connection) => {
                const currDate = new Date().toISOString().slice(0, 19).replace("T", " ");
                const {
                    bomname, bomcode, bomtype = "manufacturing",
                    finisheditemid, quantity = 1, uomid,
                    status = "active", description,
                    effectivedate, expirydate,
                    createdby, ipaddress,
                    components = [],
                } = payload;

                // Check for duplicate BOM code
                if (bomcode) {
                    const [existing] = await connection.execute(
                        `SELECT bomid FROM bom_master WHERE bomcode = ? AND isdeleted = 0`,
                        [bomcode]
                    );
                    if (existing.length > 0) {
                        throw new Error(`BOM code '${bomcode}' already exists`);
                    }
                }

                // Insert BOM header
                const insertBomSql = `
                    INSERT INTO bom_master (
                        bomname, bomcode, bomtype, finisheditemid,
                        quantity, uomid, status, description,
                        effectivedate, expirydate,
                        createdby, createddate, modifiedby, modifieddate,
                        ipaddress, isdeleted
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
                `;

                const [bomResult] = await connection.execute(insertBomSql, [
                    bomname, bomcode || null, bomtype, finisheditemid,
                    quantity, uomid || null, status, description || null,
                    effectivedate || null, expirydate || null,
                    createdby || 1, currDate, createdby || 1, currDate,
                    ipaddress || null,
                ]);

                const newBomId = bomResult.insertId;

                // Insert components
                const insertedComponents = [];
                for (let i = 0; i < components.length; i++) {
                    const comp = components[i];
                    const insertCompSql = `
                        INSERT INTO bom_components (
                            bomid, componentitemid, quantity, uomid,
                            scrap_percentage, notes, isoptional, sortorder,
                            createdby, createddate, modifiedby, modifieddate, isdeleted
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
                    `;

                    const [compResult] = await connection.execute(insertCompSql, [
                        newBomId,
                        comp.componentitemid,
                        comp.quantity || 1,
                        comp.uomid || null,
                        comp.scrap_percentage || 0,
                        comp.notes || null,
                        comp.isoptional ? 1 : 0,
                        comp.sortorder ?? i + 1,
                        createdby || 1, currDate, createdby || 1, currDate,
                    ]);

                    insertedComponents.push({
                        bomcomponentid: compResult.insertId,
                        componentitemid: comp.componentitemid,
                    });
                }

                winston.info("BOM created successfully", {
                    source: "bom.model.js", function: "createBOM",
                    bomid: newBomId, bomname, componentsCount: components.length,
                });

                return {
                    success: true,
                    message: "BOM created successfully",
                    data: { bomid: newBomId, bomname, componentsCount: insertedComponents.length },
                };
            }, { maxRetries: 3, operationName: "BOM Creation" });
        } catch (error) {
            winston.error(`Error creating BOM: ${error.message}`, {
                source: "bom.model.js", function: "createBOM",
                error: error.message, stack: error.stack,
            });
            return { success: false, message: error.message || "Failed to create BOM", error: error.message };
        }
    },

    /**
     * Update BOM and its components
     */
    async updateBOM(bomid, payload) {
        try {
            return await retryTransaction(async (connection) => {
                const currDate = new Date().toISOString().slice(0, 19).replace("T", " ");
                const {
                    bomname, bomcode, bomtype,
                    finisheditemid, quantity, uomid,
                    status, description,
                    effectivedate, expirydate,
                    modifiedby, ipaddress,
                    components,
                } = payload;

                // Check BOM exists
                const [existing] = await connection.execute(
                    `SELECT bomid FROM bom_master WHERE bomid = ? AND isdeleted = 0`,
                    [bomid]
                );
                if (!existing.length) {
                    throw new Error("BOM not found");
                }

                // Check duplicate code (exclude self)
                if (bomcode) {
                    const [dupCode] = await connection.execute(
                        `SELECT bomid FROM bom_master WHERE bomcode = ? AND bomid != ? AND isdeleted = 0`,
                        [bomcode, bomid]
                    );
                    if (dupCode.length > 0) {
                        throw new Error(`BOM code '${bomcode}' already exists`);
                    }
                }

                // Update BOM header
                const updateBomSql = `
                    UPDATE bom_master SET
                        bomname = ?, bomcode = ?, bomtype = ?,
                        finisheditemid = ?, quantity = ?, uomid = ?,
                        status = ?, description = ?,
                        effectivedate = ?, expirydate = ?,
                        modifiedby = ?, modifieddate = ?, ipaddress = ?
                    WHERE bomid = ?
                `;

                await connection.execute(updateBomSql, [
                    bomname, bomcode || null, bomtype,
                    finisheditemid, quantity, uomid || null,
                    status, description || null,
                    effectivedate || null, expirydate || null,
                    modifiedby || 1, currDate, ipaddress || null,
                    bomid,
                ]);

                // Update components if provided
                if (Array.isArray(components)) {
                    // Soft delete existing components
                    await connection.execute(
                        `UPDATE bom_components SET isdeleted = 1, modifieddate = ?, modifiedby = ? WHERE bomid = ?`,
                        [currDate, modifiedby || 1, bomid]
                    );

                    // Re-insert components
                    for (let i = 0; i < components.length; i++) {
                        const comp = components[i];
                        await connection.execute(`
                            INSERT INTO bom_components (
                                bomid, componentitemid, quantity, uomid,
                                scrap_percentage, notes, isoptional, sortorder,
                                createdby, createddate, modifiedby, modifieddate, isdeleted
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
                        `, [
                            bomid,
                            comp.componentitemid,
                            comp.quantity || 1,
                            comp.uomid || null,
                            comp.scrap_percentage || 0,
                            comp.notes || null,
                            comp.isoptional ? 1 : 0,
                            comp.sortorder ?? i + 1,
                            modifiedby || 1, currDate, modifiedby || 1, currDate,
                        ]);
                    }
                }

                winston.info("BOM updated successfully", {
                    source: "bom.model.js", function: "updateBOM", bomid,
                });

                return { success: true, message: "BOM updated successfully", data: { bomid } };
            }, { maxRetries: 3, operationName: "BOM Update" });
        } catch (error) {
            winston.error(`Error updating BOM: ${error.message}`, {
                source: "bom.model.js", function: "updateBOM",
                error: error.message, stack: error.stack, bomid,
            });
            return { success: false, message: error.message || "Failed to update BOM", error: error.message };
        }
    },

    /**
     * Soft delete a BOM
     */
    async deleteBOM(bomid, modifiedby) {
        try {
            const currDate = new Date().toISOString().slice(0, 19).replace("T", " ");

            const existing = await db.getResults(
                `SELECT bomid FROM bom_master WHERE bomid = ? AND isdeleted = 0`, [bomid]
            );

            if (!existing || existing.length === 0) {
                return { success: false, message: "BOM not found" };
            }

            await db.getResults(
                `UPDATE bom_master SET isdeleted = 1, modifiedby = ?, modifieddate = ? WHERE bomid = ?`,
                [modifiedby || 1, currDate, bomid]
            );

            await db.getResults(
                `UPDATE bom_components SET isdeleted = 1, modifiedby = ?, modifieddate = ? WHERE bomid = ?`,
                [modifiedby || 1, currDate, bomid]
            );

            winston.info("BOM deleted successfully", {
                source: "bom.model.js", function: "deleteBOM", bomid,
            });

            return { success: true, message: "BOM deleted successfully" };
        } catch (error) {
            winston.error(`Error deleting BOM: ${error.message}`, {
                source: "bom.model.js", function: "deleteBOM",
                error: error.message, stack: error.stack, bomid,
            });
            return { success: false, message: "Failed to delete BOM", error: error.message };
        }
    },

    /**
     * Get items available as finished goods or components (for dropdowns)
     */
    async getItemsForBOM(search = "") {
        try {
            const sql = `
                SELECT itemid, itemname, itemcode, imgpath
                FROM itemmaster
                WHERE isdeleted = 0 AND isapproved = 1
                    AND (itemname LIKE ? OR itemcode LIKE ?)
                ORDER BY itemname ASC
                LIMIT 50
            `;
            const searchVal = `%${search}%`;
            const items = await db.getResults(sql, [searchVal, searchVal]);
            return { success: true, data: items };
        } catch (error) {
            winston.error(`Error fetching items for BOM: ${error.message}`, {
                source: "bom.model.js", function: "getItemsForBOM",
                error: error.message, stack: error.stack,
            });
            return { success: false, message: "Failed to fetch items", error: error.message };
        }
    },

    /**
     * Get BOM cost analysis
     */
    async getBOMCost(bomid) {
        try {
            const componentsSql = `
                SELECT
                    bc.bomcomponentid,
                    im.itemname AS componentname,
                    im.sellingprice,
                    im.purchaseprice,
                    im.netcost,
                    bc.quantity,
                    bc.scrap_percentage,
                    uom.uomname,
                    (bc.quantity * (1 + IFNULL(bc.scrap_percentage, 0)/100)) AS effective_qty,
                    (bc.quantity * (1 + IFNULL(bc.scrap_percentage, 0)/100) * IFNULL(im.purchaseprice, 0)) AS total_cost
                FROM bom_components bc
                LEFT JOIN itemmaster im ON bc.componentitemid = im.itemid
                LEFT JOIN uommaster uom ON bc.uomid = uom.uomid
                WHERE bc.bomid = ? AND bc.isdeleted = 0
            `;

            const components = await db.getResults(componentsSql, [bomid]);
            const totalCost = components.reduce((sum, c) => sum + parseFloat(c.total_cost || 0), 0);

            return {
                success: true,
                data: {
                    components,
                    totalMaterialCost: parseFloat(totalCost.toFixed(4)),
                },
            };
        } catch (error) {
            winston.error(`Error getting BOM cost: ${error.message}`, {
                source: "bom.model.js", function: "getBOMCost",
                error: error.message, stack: error.stack, bomid,
            });
            return { success: false, message: "Failed to get BOM cost", error: error.message };
        }
    },
};

module.exports = bomModel;
