const db = require("../../config/db");
const winston = require("../../config/winston");

module.exports = {
    /**
     * Get all locations
     */
    async getLocations() {
        try {
            const query = `
                SELECT locationid, locationname 
                FROM locationmaster 
                WHERE isdeleted = 0
                ORDER BY locationname ASC
            `;
            const result = await db.getResults(query);
            return result || [];
        } catch (error) {
            winston.error(`Error in getLocations: ${error.message}`, {
                source: "warehouseItemMapping.model.js",
                function: "getLocations",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            throw error;
        }
    },

    /**
     * Get warehouses by location IDs
     */
    async getWarehousesByLocations(locationIds) {
        try {
            if (!locationIds || locationIds.length === 0) {
                return [];
            }

            const placeholders = locationIds.map(() => '?').join(',');
            const query = `
                SELECT warehouseid, warehousename, locationid
                FROM warehousemaster 
                WHERE isdeleted = 0 AND locationid IN (${placeholders})
                ORDER BY warehousename ASC
            `;
            const result = await db.getResults(query, locationIds);
            return result || [];
        } catch (error) {
            winston.error(`Error in getWarehousesByLocations: ${error.message}`, {
                source: "warehouseItemMapping.model.js",
                function: "getWarehousesByLocations",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                locationIds
            });
            throw error;
        }
    },

    /**
     * Get all categories
     */
    async getCategories() {
        try {
            const query = `
                SELECT itemcategoryid, itemcategoryname 
                FROM itemcategorymaster 
                WHERE isdeleted = 0
                ORDER BY itemcategoryname ASC
            `;
            const result = await db.getResults(query);
            return result || [];
        } catch (error) {
            winston.error(`Error in getCategories: ${error.message}`, {
                source: "warehouseItemMapping.model.js",
                function: "getCategories",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            throw error;
        }
    },

    /**
     * Get items by category IDs
     */
    async getItemsByCategories(categoryIds) {
        try {
            if (!categoryIds || categoryIds.length === 0) {
                return [];
            }

            const placeholders = categoryIds.map(() => '?').join(',');
            const query = `
                SELECT itemid, itemname, itemcategoryid
                FROM itemmaster 
                WHERE isdeleted = 0 AND itemcategoryid IN (${placeholders})
                ORDER BY itemname ASC
            `;
            const result = await db.getResults(query, categoryIds);
            return result || [];
        } catch (error) {
            winston.error(`Error in getItemsByCategories: ${error.message}`, {
                source: "warehouseItemMapping.model.js",
                function: "getItemsByCategories",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                categoryIds
            });
            throw error;
        }
    },

    /**
     * Map multiple items to multiple warehouses
     */
    async mapItemsToWarehouses(data) {
        try {
            const { items, warehouses, createdBy } = data;
            let addedMappings = 0;

            for (const itemId of items) {
                // Get existing warehouse mappings for this item
                const existingQuery = `
                    SELECT warehouseid 
                    FROM itemwarehousemapping 
                    WHERE isdeleted = 0 AND itemid = ?
                `;
                const existingMappings = await db.getResults(existingQuery, [itemId]);
                const existingWarehouseIds = existingMappings.map(row => row.warehouseid);

                // Find warehouses to add
                const warehousesToAdd = warehouses.filter(wid => !existingWarehouseIds.includes(wid));
                
                for (const warehouseId of warehousesToAdd) {
                    // Get location ID for this warehouse
                    const locationQuery = `
                        SELECT locationid 
                        FROM warehousemaster 
                        WHERE isdeleted = 0 AND warehouseid = ?
                    `;
                    const locationResult = await db.getResults(locationQuery, [warehouseId]);
                    
                    if (locationResult && locationResult.length > 0) {
                        const locationId = locationResult[0].locationid;

                        // Check if mapping already exists but is deleted
                        const deletedMappingQuery = `
                            SELECT wimid 
                            FROM itemwarehousemapping 
                            WHERE warehouseid = ? AND itemid = ?
                        `;
                        const deletedMapping = await db.getResults(deletedMappingQuery, [warehouseId, itemId]);

                        if (deletedMapping && deletedMapping.length > 0) {
                            // Restore deleted mapping
                            const restoreData = {
                                isdeleted: 0,
                                modifiedby: createdBy,
                                modifieddate: new Date(),
                                ipaddress: db.getIp()
                            };
                            
                            const result = await db.update('itemwarehousemapping', restoreData, `wimid = ${deletedMapping[0].wimid}`);
                            if (result && result.affectedRows > 0) {
                                addedMappings++;
                            }
                        } else {
                            // Create new mapping
                            const mappingData = {
                                warehouseid: warehouseId,
                                locationid: locationId,
                                itemid: itemId,
                                isdeleted: 0,
                                ipaddress: db.getIp(),
                                createdby: createdBy,
                                createddate: new Date()
                            };
                            
                            const insertResult = await db.insert('itemwarehousemapping', mappingData);
                            if (insertResult) {
                                addedMappings++;
                            }
                        }
                    }
                }
            }

            if (addedMappings === 0) {
                throw new Error('No changes found in warehouse mapping.');
            }

            return { addedMappings, message: 'Mapping done successfully!' };
        } catch (error) {
            winston.error(`Error in mapItemsToWarehouses: ${error.message}`, {
                source: "warehouseItemMapping.model.js",
                function: "mapItemsToWarehouses",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                items: data.items,
                warehouses: data.warehouses,
                createdBy: data.createdBy
            });
            throw error;
        }
    },

    /**
     * Get warehouse item mapping list with pagination and filters
     */
    async getWarehouseItemMappingList(params) {
        try {
            const {
                locationIds = [],
                warehouseIds = [],
                categoryIds = [],
                itemIds = [],
                start = 0,
                length = 25,
                orderColumn = 1,
                orderDir = 'desc',
                searchValue = ''
            } = params;

            let whereConditions = ['iwm.isdeleted = 0'];
            let queryParams = [];

            // Location filter
            if (locationIds && locationIds.length > 0) {
                const placeholders = locationIds.map(() => '?').join(',');
                whereConditions.push(`iwm.locationid IN (${placeholders})`);
                queryParams.push(...locationIds);
            }

            // Warehouse filter
            if (warehouseIds && warehouseIds.length > 0) {
                const placeholders = warehouseIds.map(() => '?').join(',');
                whereConditions.push(`iwm.warehouseid IN (${placeholders})`);
                queryParams.push(...warehouseIds);
            }

            // Category filter
            if (categoryIds && categoryIds.length > 0) {
                const placeholders = categoryIds.map(() => '?').join(',');
                whereConditions.push(`icm.itemcategoryid IN (${placeholders})`);
                queryParams.push(...categoryIds);
            }

            // Item filter
            if (itemIds && itemIds.length > 0) {
                const placeholders = itemIds.map(() => '?').join(',');
                whereConditions.push(`iwm.itemid IN (${placeholders})`);
                queryParams.push(...itemIds);
            }

            // Search filter with case-insensitive comparison
            if (searchValue) {
                whereConditions.push(`(
                    LOWER(im.itemname) LIKE LOWER(?) OR 
                    LOWER(icm.itemcategoryname) LIKE LOWER(?) OR 
                    LOWER(whm.warehousename) LIKE LOWER(?) OR 
                    LOWER(lm.locationname) LIKE LOWER(?)
                )`);
                const searchTerm = `%${searchValue}%`;
                queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
            }

            const whereClause = whereConditions.join(' AND ');

            // Count total records
            const countQuery = `
                SELECT COUNT(*) as total
                FROM itemwarehousemapping iwm
                INNER JOIN warehousemaster whm ON iwm.warehouseid = whm.warehouseid AND whm.isdeleted = 0
                INNER JOIN itemmaster im ON im.itemid = iwm.itemid AND im.isdeleted = 0
                INNER JOIN itemcategorymaster icm ON icm.itemcategoryid = im.itemcategoryid AND icm.isdeleted = 0
                INNER JOIN locationmaster lm ON whm.locationid = lm.locationid AND lm.isdeleted = 0
                WHERE ${whereClause}
            `;

            const totalResult = await db.getResults(countQuery, queryParams);
            const totalRecords = totalResult[0]?.total || 0;

            // Get paginated data
            const orderColumns = ['iwm.wimid', 'im.itemname', 'icm.itemcategoryname', 'whm.warehousename', 'lm.locationname'];
            const orderBy = orderColumns[orderColumn] || 'iwm.wimid';
            const orderDirection = orderDir === 'asc' ? 'ASC' : 'DESC';

            const dataQuery = `
                SELECT 
                    iwm.wimid,
                    iwm.itemid,
                    iwm.warehouseid,
                    iwm.locationid,
                    im.itemname,
                    icm.itemcategoryname,
                    whm.warehousename,
                    lm.locationname,
                    iwm.createddate
                FROM itemwarehousemapping iwm
                INNER JOIN warehousemaster whm ON iwm.warehouseid = whm.warehouseid AND whm.isdeleted = 0
                INNER JOIN itemmaster im ON im.itemid = iwm.itemid AND im.isdeleted = 0
                INNER JOIN itemcategorymaster icm ON icm.itemcategoryid = im.itemcategoryid AND icm.isdeleted = 0
                INNER JOIN locationmaster lm ON whm.locationid = lm.locationid AND lm.isdeleted = 0
                WHERE ${whereClause}
                ORDER BY ${orderBy} ${orderDirection}
                LIMIT ?, ?
            `;

            queryParams.push(parseInt(start), parseInt(length));
            const records = await db.getResults(dataQuery, queryParams);

            return {
                records: records || [],
                totalRecords,
                filteredRecords: totalRecords
            };
        } catch (error) {
            winston.error(`Error in getWarehouseItemMappingList: ${error.message}`, {
                source: "warehouseItemMapping.model.js",
                function: "getWarehouseItemMappingList",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                locationIds: params.locationIds,
                warehouseIds: params.warehouseIds,
                categoryIds: params.categoryIds,
                itemIds: params.itemIds
            });
            throw error;
        }
    },

    /**
     * Delete warehouse item mapping by ID
     */
    async deleteWarehouseItemMapping(mappingId, userId) {
        try {
            const updateData = {
                isdeleted: 1,
                modifiedby: userId,
                modifieddate: new Date(),
                ipaddress: db.getIp()
            };

            const result = await db.update('itemwarehousemapping', updateData, `wimid = ${mappingId}`);
            
            if (result && result.affectedRows > 0) {
                return { message: 'Mapping deleted successfully' };
            } else {
                throw new Error('Failed to delete mapping');
            }
        } catch (error) {
            winston.error(`Error in deleteWarehouseItemMapping: ${error.message}`, {
                source: "warehouseItemMapping.model.js",
                function: "deleteWarehouseItemMapping",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                mappingId,
                userId
            });
            throw error;
        }
    },

    /**
     * Delete multiple warehouse item mappings
     */
    async deleteMultipleWarehouseItemMappings(mappingIds, userId) {
        try {
            if (!mappingIds || mappingIds.length === 0) {
                throw new Error('No mapping IDs provided');
            }

            const placeholders = mappingIds.map(() => '?').join(',');
            const query = `
                UPDATE itemwarehousemapping 
                SET isdeleted = 1, modifiedby = ?, modifieddate = NOW(), ipaddress = ?
                WHERE wimid IN (${placeholders})
            `;

            const result = await db.getResults(query, [userId, db.getIp(), ...mappingIds]);
            
            if (result && result.affectedRows > 0) {
                return { deletedCount: result.affectedRows, message: 'Mappings deleted successfully' };
            } else {
                throw new Error('Failed to delete mappings');
            }
        } catch (error) {
            winston.error(`Error in deleteMultipleWarehouseItemMappings: ${error.message}`, {
                source: "warehouseItemMapping.model.js",
                function: "deleteMultipleWarehouseItemMappings",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                mappingIds,
                userId
            });
            throw error;
        }
    },

    /**
     * Get warehouses mapped to specific item
     */
    async getWarehousesByItem(itemId) {
        try {
            const query = `
                SELECT iwm.warehouseid, iwm.itemid, wm.warehousename
                FROM itemwarehousemapping iwm
                INNER JOIN warehousemaster wm ON iwm.warehouseid = wm.warehouseid AND wm.isdeleted = 0
                WHERE iwm.isdeleted = 0 AND iwm.itemid = ?
            `;
            const result = await db.getResults(query, [itemId]);
            return result || [];
        } catch (error) {
            winston.error(`Error in getWarehousesByItem: ${error.message}`, {
                source: "warehouseItemMapping.model.js",
                function: "getWarehousesByItem",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                itemId
            });
            throw error;
        }
    }
};