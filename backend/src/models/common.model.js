const db = require("../config/db");
const winston = require("../config/winston");

module.exports = {
    /**
    * Get all countries
    * @returns {Promise<Array>}
    */
    getCountry: async () => {
        try {
            const rows = await db.getResults(
                `SELECT countryid as id, countryname as name FROM countrymst 
                    WHERE isdeleted = 0`
            );
            return rows;
        } catch (error) {
            winston.error(`Error fetching countries: ${error.message}`, {
                source: "common.model.js",
                function: "getCountry",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            throw error;
        }
    },

    /**
     * Get all states
     * @returns {Promise<Array>}
     */
    getState: async (id = null) => {
        try {
            let sql = `SELECT stateid as id, statename as name FROM statemaster 
                        WHERE isdeleted = 0`;
            const params = [];
            if (id) {
                sql += ` AND countryid = ?`;
                params.push(id);
            }
            const rows = await db.getResults(sql, params);
            return rows;
        } catch (error) {
            winston.error(`Error fetching states: ${error.message}`, {
                source: "common.model.js",
                function: "getState",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                countryId: id
            });
            throw error;
        }
    },

    /**
     * Get all cities
     * @returns {Promise<Array>}
     */
    getCity: async (id = null) => {
        try {
            let sql = `SELECT cityid as id, cityname as name FROM citymaster 
                            WHERE isdeleted = 0`;
            const params = [];
            if (id) {
                sql += ` AND stateid = ?`;
                params.push(id);
            }
            const rows = await db.getResults(sql, params);
            return rows;
        } catch (error) {
            winston.error(`Error fetching cities: ${error.message}`, {
                source: "common.model.js",
                function: "getCity",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                stateId: id
            });
            throw error;
        }
    },

    /**
     * Get all locations
     * @returns {Promise<Array>}
     */
    getLocation: async () => {
        try {
            const rows = await db.getResults(
                `SELECT locationid as id, locationname as name FROM locationmaster 
                                WHERE isdeleted = 0`
            );
            return rows;
        } catch (error) {
            winston.error(`Error fetching locations: ${error.message}`, {
                source: "common.model.js",
                function: "getLocation",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack
            });
            throw error;
        }
    },

    /**
     * Get all cities
     * @returns {Promise<Array>}
     */
    getTaxProfile: async (id = null) => {
        try {
            let sql = `SELECT taxprofileid as id, taxprofilename as name FROM taxprofilemaster 
                                    WHERE isdeleted = 0`;
            const params = [];
            if (id) {
                sql += ` AND stateid = ?`;
                params.push(id);
            }
            const rows = await db.getResults(sql, params);
            return rows;
        } catch (error) {
            winston.error(`Error fetching taxprofiles: ${error.message}`, {
                source: "common.model.js",
                function: "getTaxProfile",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                stateId: id
            });
            throw error;
        }
    }
}