const mysql2 = require("mysql2/promise");
const moment = require("moment");
const { AsyncLocalStorage } = require("async_hooks");
const { database } = require("./config");

// Thread-safe transaction storage using AsyncLocalStorage
const asyncLocalStorage = new AsyncLocalStorage();

const pool = mysql2.createPool({
    host: database.host,
    user: database.user,
    port: database.port,
    password: database.password,
    database: database.database,
    waitForConnections: database.waitForConnections,
    connectionLimit: database.connectionLimit,
    queueLimit: database.queueLimit,
    // Note: acquireTimeout is not a valid MySQL2 pool option - removed
    // Note: timeout is not a valid MySQL2 pool option - use connectTimeout instead
    connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || "30000"),
    multipleStatements: true,
    enableKeepAlive: database.enableKeepAlive,
    keepAliveInitialDelay: database.keepAliveInitialDelay,
    timezone: database.timezone,
    // Connection pool optimizations
    maxIdle: database.maxIdle,
    idleTimeout: database.idleTimeout,
});

// Monitor pool status - Enhanced with warnings
setInterval(() => {
    if (pool.pool._allConnections) {
        const stats = {
            all: pool.pool._allConnections.length,
            free: pool.pool._freeConnections.length,
            queued: pool.pool._connectionQueue.length,
            utilization: ((pool.pool._allConnections.length - pool.pool._freeConnections.length) / database.connectionLimit * 100).toFixed(2) + '%'
        };

        // Warn if utilization is high
        if (stats.all > database.connectionLimit * 0.8) {
            console.warn('⚠️  WARNING: High connection pool utilization!', stats);
        } else if (stats.all > 0) {
            console.log('Database Pool Status:', stats);
        }
    }
}, 60000); // Log every minute

// Helper to get current transaction connection from AsyncLocalStorage
const getTransactionConnection = () => asyncLocalStorage.getStore()?.connection || null;

module.exports = {
    connection: pool,

    getMaxDate: function (data) {
        return moment(
            new Date(
                Math.max.apply(
                    null,
                    data.map(function (e) {
                        return new Date(e.maxdate);
                    })
                )
            )
        ).format("YYYY-MM-DD H:m:s");
    },

    escapData: (data) => {
        return data.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
            switch (char) {
                case "\0": return "\\0";
                case "\x08": return "\\b";
                case "\x09": return "\\t";
                case "\x1a": return "\\z";
                case "\n": return "\\n";
                case "\r": return "\\r";
                case '"':
                case "'":
                case "/":
                case `"`:
                case "\\":
                case "%":
                    return "\\" + char;
            }
        });
    },

    beginTransaction: async () => {
        try {
            const connection = await pool.getConnection();
            await connection.query("SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED");
            await connection.beginTransaction();

            // Store connection in AsyncLocalStorage for thread-safe access
            const store = asyncLocalStorage.getStore() || {};
            store.connection = connection;

            return connection;
        } catch (err) {
            throw new Error("Failed to begin transaction: " + err.message);
        }
    },

    commit: async () => {
        try {
            const connection = getTransactionConnection();
            if (connection) {
                await connection.commit();
                connection.release();

                // Clear from AsyncLocalStorage
                const store = asyncLocalStorage.getStore();
                if (store) {
                    store.connection = null;
                }
            }
        } catch (err) {
            throw new Error("Failed to commit transaction: " + err.message);
        }
    },

    rollback: async () => {
        try {
            const connection = getTransactionConnection();
            if (connection) {
                await connection.rollback();
                connection.release();

                // Clear from AsyncLocalStorage
                const store = asyncLocalStorage.getStore();
                if (store) {
                    store.connection = null;
                }
            }
        } catch (err) {
            throw new Error("Failed to rollback transaction: " + err.message);
        }
    },

    // New helper method to run code within a transaction context
    runInTransaction: async (callback) => {
        return asyncLocalStorage.run({ connection: null }, async () => {
            const connection = await module.exports.beginTransaction();
            try {
                const result = await callback(connection);
                await module.exports.commit();
                return result;
            } catch (err) {
                await module.exports.rollback();
                throw err;
            }
        });
    },

    getRow: async (sql) => {
        try {
            const connection = getTransactionConnection();
            const [rows] = connection
                ? await connection.query(sql)
                : await pool.query(sql);
            return rows[0];
        } catch (err) {
            throw err;
        }
    },

    getResults: async (sql, params = []) => {
        try {
            const connection = getTransactionConnection();
            const [rows] = connection
                ? await connection.query(sql, params)
                : await pool.query(sql, params);
            return rows;
        } catch (err) {
            throw err;
        }
    },

    insert: async (table, data) => {
        try {
            const conn = getTransactionConnection() || pool;
            const [result] = await conn.query(`INSERT INTO ${table} SET ?`, data);
            return result;
        } catch (err) {
            throw err;
        }
    },

    update: async (table, data, where) => {
        try {
            const setClause = data.map(item => `${item.column} = ?`).join(", ");
            const whereClause = where.map(item => `${item.column} = ?`).join(" AND ");
            const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;

            const setValues = data.map(item => item.value);
            const whereValues = where.map(item => item.value);
            const params = [...setValues, ...whereValues];

            const conn = getTransactionConnection() || pool;
            const [result] = await conn.query(sql, params);
            return result;
        } catch (err) {
            throw err;
        }
    },

    array_diff: (a1, a2) => {
        const a = {}, diff = [];
        for (let i = 0; i < a1.length; i++) a[a1[i]] = true;
        for (let i = 0; i < a2.length; i++) {
            if (a[a2[i]]) delete a[a2[i]];
            else a[a2[i]] = true;
        }
        for (let k in a) diff.push(k);
        return diff;
    },

    callSP: async (procedure, params = []) => {
        try {
            const conn = getTransactionConnection() || pool;
            const placeholders = params.map(() => '?').join(', ');
            const sql = `${procedure}`;

            const [results] = await conn.query(sql, params);

            if (Array.isArray(results) && results.length > 0 && Array.isArray(results[0])) {
                return results[0];
            }

            return results;
        } catch (err) {
            throw new Error("Stored procedure execution failed: " + err.message);
        }
    },

    getCount: async (sql, params = []) => {
        try {
            // Convert the query to a COUNT query
            let countSql;

            // If the SQL already contains COUNT, use it as is
            if (sql.toUpperCase().includes('COUNT(')) {
                countSql = sql;
            } else {
                // Extract the FROM clause and WHERE clause from the original query
                // Replace SELECT ... FROM with SELECT COUNT(*) FROM
                countSql = sql.replace(/SELECT\s+.*?\s+FROM/is, 'SELECT COUNT(*) as count FROM');

                // Remove ORDER BY, LIMIT, and GROUP BY clauses for count query
                countSql = countSql.replace(/ORDER\s+BY\s+.*?(?=\s|$)/is, '');
                countSql = countSql.replace(/LIMIT\s+.*?(?=\s|$)/is, '');
                countSql = countSql.replace(/GROUP\s+BY\s+.*?(?=ORDER|LIMIT|$)/is, '');
            }

            const connection = getTransactionConnection();
            const [rows] = connection
                ? await connection.query(countSql, params)
                : await pool.query(countSql, params);

            return rows[0]?.count || rows[0]?.total || 0;
        } catch (err) {
            throw new Error("Failed to get count: " + err.message);
        }
    }
};
