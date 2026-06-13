const db = require("../../config/db");
const winston = require("../../config/winston");

module.exports = {
    /**
     * Get all suppliers
     */
    async getSuppliers() {
        try {
            const query = `
                SELECT DISTINCT lsm.supplierid, sm.suppliername 
                FROM locationsuppliermapping as lsm 
                INNER JOIN suppliermaster as sm ON lsm.supplierid = sm.supplierid AND sm.isdeleted = 0 
                WHERE lsm.isdeleted = 0
                GROUP BY lsm.supplierid
            `;
            const result = await db.getResults(query);
            return result || [];
        } catch (error) {
            winston.error(`Error in getSuppliers: ${error.message}`, {
                source: "itemSupplierMapping.model.js",
                function: "getSuppliers",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
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
            `;
            const result = await db.getResults(query);
            return result || [];
        } catch (error) {
            winston.error(`Error in getCategories: ${error.message}`, {
                source: "itemSupplierMapping.model.js",
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
     * Get items by category ID
     */
    async getItemsByCategory(categoryId) {
        try {
            const query = `
                SELECT itemid, itemname 
                FROM itemmaster 
                WHERE isdeleted = 0 AND itemcategoryid = ?
            `;
            const result = await db.getResults(query, [categoryId]);
            return result || [];
        } catch (error) {
            winston.error(`Error in getItemsByCategory: ${error.message}`, {
                source: "itemSupplierMapping.model.js",
                function: "getItemsByCategory",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                categoryId
            });
            throw error;
        }
    },

    /**
     * Map multiple suppliers to item
     */
    async mapMultipleSuppliersToItem(data) {
        try {
            const { suppliers, itemId, createdBy } = data;
            let savedCount = 0;

            for (const supplierId of suppliers) {
                // Get locations for this supplier
                const locationQuery = `
                    SELECT locationid 
                    FROM locationsuppliermapping 
                    WHERE isdeleted = 0 AND supplierid = ?
                `;
                const locationsResult = await db.getResults(locationQuery, [supplierId]);
                
                if (locationsResult && locationsResult.length > 0) {
                    // For each location, create mapping if not exists
                    for (const location of locationsResult) {
                        const locationId = location.locationid;
                        
                        // Check if mapping already exists
                        const checkQuery = `
                            SELECT productsuppliermapid 
                            FROM itemsuppliermapping 
                            WHERE isdeleted = 0 AND locationid = ? AND supplierid = ? AND itemid = ?
                        `;
                        const existingMapping = await db.getResults(checkQuery, [locationId, supplierId, itemId]);
                        
                        if (!existingMapping || existingMapping.length === 0) {
                            // Create new mapping
                            const mappingData = {
                                locationid: locationId,
                                supplierid: supplierId,
                                itemid: itemId,
                                isdeleted: 0,
                                ipaddress: db.getIp(),
                                createdby: createdBy,
                                createddate: new Date()
                            };
                            
                            const insertResult = await db.insert('itemsuppliermapping', mappingData);
                            if (insertResult) {
                                savedCount++;
                            }
                        }
                    }
                }
            }

            if (savedCount === 0) {
                throw new Error('Data is already mapped.');
            }

            return { savedCount, message: 'Mapping updated successfully.' };
        } catch (error) {
            winston.error(`Error in mapMultipleSuppliersToItem: ${error.message}`, {
                source: "itemSupplierMapping.model.js",
                function: "mapMultipleSuppliersToItem",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                itemId: data.itemId,
                suppliers: data.suppliers,
                createdBy: data.createdBy
            });
            throw error;
        }
    },

    /**
     * Get item supplier mapping list with pagination and filters
     */
    async getItemSupplierMappingList(params) {
        try {
            const {
                locationIds = [],
                warehouseIds = [],
                supplierIds = [],
                categoryIds = [],
                itemIds = [],
                start = 0,
                length = 25,
                orderColumn = 1,
                orderDir = 'desc',
                searchValue = ''
            } = params;

            let whereConditions = ['ism.isdeleted = 0'];
            let queryParams = [];

            // Location filter
            if (locationIds && locationIds.length > 0) {
                const placeholders = locationIds.map(() => '?').join(',');
                whereConditions.push(`ism.locationid IN (${placeholders})`);
                queryParams.push(...locationIds);
            }

            // Supplier filter
            if (supplierIds && supplierIds.length > 0) {
                const placeholders = supplierIds.map(() => '?').join(',');
                whereConditions.push(`ism.supplierid IN (${placeholders})`);
                queryParams.push(...supplierIds);
            }

            // Category filter
            if (categoryIds && categoryIds.length > 0) {
                const placeholders = categoryIds.map(() => '?').join(',');
                whereConditions.push(`ic.itemcategoryid IN (${placeholders})`);
                queryParams.push(...categoryIds);
            }

            // Item filter
            if (itemIds && itemIds.length > 0) {
                const placeholders = itemIds.map(() => '?').join(',');
                whereConditions.push(`ism.itemid IN (${placeholders})`);
                queryParams.push(...itemIds);
            }

            // Search filter
            if (searchValue) {
                whereConditions.push(`(
                    sm.suppliername LIKE ? OR 
                    lm.locationname LIKE ? OR 
                    ic.itemcategoryname LIKE ? OR 
                    im.itemname LIKE ?
                )`);
                const searchTerm = `%${searchValue}%`;
                queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
            }

            const whereClause = whereConditions.join(' AND ');

            // Count total records
            const countQuery = `
                SELECT COUNT(*) as total
                FROM itemsuppliermapping ism
                LEFT JOIN suppliermaster sm ON ism.supplierid = sm.supplierid
                LEFT JOIN locationmaster lm ON ism.locationid = lm.locationid
                LEFT JOIN itemmaster im ON ism.itemid = im.itemid
                LEFT JOIN itemcategorymaster ic ON im.itemcategoryid = ic.itemcategoryid
                WHERE ${whereClause}
            `;

            const totalResult = await db.getResults(countQuery, queryParams);
            const totalRecords = totalResult[0]?.total || 0;

            // Get paginated data
            const orderColumns = ['ism.productsuppliermapid', 'sm.suppliername', 'lm.locationname', 'ic.itemcategoryname', 'im.itemname'];
            const orderBy = orderColumns[orderColumn] || 'ism.productsuppliermapid';
            const orderDirection = orderDir === 'asc' ? 'ASC' : 'DESC';

            const dataQuery = `
                SELECT 
                    ism.productsuppliermapid,
                    ism.supplierid,
                    ism.locationid,
                    ism.itemid,
                    sm.suppliername,
                    lm.locationname,
                    ic.itemcategoryname,
                    im.itemname,
                    ism.createddate
                FROM itemsuppliermapping ism
                LEFT JOIN suppliermaster sm ON ism.supplierid = sm.supplierid
                LEFT JOIN locationmaster lm ON ism.locationid = lm.locationid
                LEFT JOIN itemmaster im ON ism.itemid = im.itemid
                LEFT JOIN itemcategorymaster ic ON im.itemcategoryid = ic.itemcategoryid
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
            winston.error(`Error in getItemSupplierMappingList: ${error.message}`, {
                source: "itemSupplierMapping.model.js",
                function: "getItemSupplierMappingList",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                locationIds: params.locationIds,
                warehouseIds: params.warehouseIds,
                supplierIds: params.supplierIds,
                categoryIds: params.categoryIds,
                itemIds: params.itemIds
            });
            throw error;
        }
    },

    /**
     * Delete item supplier mapping by ID
     */
    async deleteItemSupplierMapping(mappingId, userId) {
        try {
            const updateData = {
                isdeleted: 1,
                modifiedby: userId,
                modifieddate: new Date()
            };

            const result = await db.update('itemsuppliermapping', updateData, `productsuppliermapid = ${mappingId}`);
            
            if (result && result.affectedRows > 0) {
                return { message: 'Mapping deleted successfully' };
            } else {
                throw new Error('Failed to delete mapping');
            }
        } catch (error) {
            winston.error(`Error in deleteItemSupplierMapping: ${error.message}`, {
                source: "itemSupplierMapping.model.js",
                function: "deleteItemSupplierMapping",
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
     * Delete multiple item supplier mappings
     */
    async deleteMultipleItemSupplierMappings(mappingIds, userId) {
        try {
            if (!mappingIds || mappingIds.length === 0) {
                throw new Error('No mapping IDs provided');
            }

            const placeholders = mappingIds.map(() => '?').join(',');
            const query = `
                UPDATE itemsuppliermapping 
                SET isdeleted = 1, modifiedby = ?, modifieddate = NOW()
                WHERE productsuppliermapid IN (${placeholders})
            `;

            const result = await db.getResults(query, [userId, ...mappingIds]);
            
            if (result && result.affectedRows > 0) {
                return { deletedCount: result.affectedRows, message: 'Mappings deleted successfully' };
            } else {
                throw new Error('Failed to delete mappings');
            }
        } catch (error) {
            winston.error(`Error in deleteMultipleItemSupplierMappings: ${error.message}`, {
                source: "itemSupplierMapping.model.js",
                function: "deleteMultipleItemSupplierMappings",
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
     * Get locations by supplier IDs
     */
    async getLocationsBySuppliers(supplierIds) {
        try {
            if (!supplierIds || supplierIds.length === 0) {
                return [];
            }

            const placeholders = supplierIds.map(() => '?').join(',');
            const query = `
                SELECT DISTINCT lm.locationid, lm.locationname
                FROM locationsuppliermapping lsm
                LEFT JOIN locationmaster lm ON lsm.locationid = lm.locationid
                WHERE lsm.isdeleted = 0 AND lm.isdeleted = 0 AND lsm.supplierid IN (${placeholders})
            `;

            const result = await db.getResults(query, supplierIds);
            return result || [];
        } catch (error) {
            winston.error(`Error in getLocationsBySuppliers: ${error.message}`, {
                source: "itemSupplierMapping.model.js",
                function: "getLocationsBySuppliers",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                supplierIds
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
                SELECT DISTINCT wm.warehouseid, wm.warehousename
                FROM locationwarehousemapping lwm
                LEFT JOIN warehousemaster wm ON lwm.warehouseid = wm.warehouseid
                WHERE lwm.isdeleted = 0 AND wm.isdeleted = 0 AND lwm.locationid IN (${placeholders})
            `;

            const result = await db.getResults(query, locationIds);
            return result || [];
        } catch (error) {
            winston.error(`Error in getWarehousesByLocations: ${error.message}`, {
                source: "itemSupplierMapping.model.js",
                function: "getWarehousesByLocations",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                locationIds
            });
            throw error;
        }
    }
};