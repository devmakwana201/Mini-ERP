const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsapp.controller');
const { validateBody } = require('../middlewares/validation');
const Joi = require('joi');

// Validation schemas
const testNotificationSchema = Joi.object({
    phoneNumber: Joi.string().required(),
    templateType: Joi.string().required(),
    testData: Joi.object().optional()
});

const genericNotificationSchema = Joi.object({
    phoneNumber: Joi.string().required(),
    message: Joi.string().required(),
    companyName: Joi.string().optional()
});

const resendOrderNotificationSchema = Joi.object({
    phoneNumber: Joi.string().optional(),
    companyName: Joi.string().optional()
});

const testAllTemplatesSchema = Joi.object({
    phoneNumber: Joi.string().required()
});

// Routes
router.get('/status', whatsappController.getStatus);

router.get('/test-connection', whatsappController.testConnection);

router.get('/templates', whatsappController.getTemplates);

router.post('/test-notification',
    validateBody(testNotificationSchema),
    whatsappController.sendTestNotification
);

router.post('/send-generic-notification',
    validateBody(genericNotificationSchema),
    whatsappController.sendGenericNotification
);

router.post('/resend-order/:uniquekey',
    validateBody(resendOrderNotificationSchema),
    whatsappController.resendOrderNotification
);

router.post('/test-all-templates',
    validateBody(testAllTemplatesSchema),
    whatsappController.testAllTemplates
);

module.exports = {
    path: '/whatsapp',
    router
};