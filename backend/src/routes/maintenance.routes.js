const express = require('express');
const { features } = require('../config/config');
const ResponseFormatter = require('../utils/responseFormatter');
const winston = require('../config/winston');
const router = express.Router();

router.get('/status', (req, res) => {
    try {
        const isMaintenanceMode = features.enableMaintenance;
        
        res.json(ResponseFormatter.success({
            maintenanceMode: isMaintenanceMode,
            message: isMaintenanceMode ? 'System is under maintenance' : 'System is operational'
        }, 'Maintenance status retrieved successfully'));
    } catch (error) {
        winston.error(`Error checking maintenance status: ${error.message}`, {
            source: "maintenance.routes.js",
            function: "GET /status",
            error: error.message,
            code: error.code,
            errno: error.errno,
            stack: error.stack
        });
        res.status(500).json(
            ResponseFormatter.serverError('Error checking maintenance status', error.message)
        );
    }
});

module.exports = {
    path: '/maintenance',
    router: router,
};