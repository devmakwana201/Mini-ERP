const express = require('express');
const router = express.Router();
const settlementController = require('../../controllers/pos-mgmt/settlement.controller');
const { validateBody, validationRules } = require('../../middlewares/validation');
const { verifyPOSToken } = require('../../middlewares/pos.middleware');

/**
 * @route POST /api/v1/pos/settlement/sync
 * @desc Sync settlement data from POS to server
 * @access Public (should be secured in production)
 * @param {Object} body - Request body containing settlements array
 * @param {Array} body.settlements - Array of settlement objects to sync
 */
router.post(
    '/sync',
    verifyPOSToken,
    validateBody(validationRules.syncSettlement),
    settlementController.syncSettlement
);

module.exports = {
    path: "/pos/settlement",
    router: router,
};