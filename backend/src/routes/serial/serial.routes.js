const express = require('express');
const { authMiddleware } = require("../../middlewares/auth.middleware");
const controller = require("../../controllers/serial/serial.controller");
const { validateBody, validationRules } = require("../../middlewares/validation");
const router = express.Router();

router.post(
    "/create",
    authMiddleware,
    controller.createSerials
);

router.get(
    "/list",
    authMiddleware,
    controller.getSerials
);


router.get(
    "/report",
    authMiddleware,
    controller.getSerialReport

);

router.get(
    "/keycount",
    authMiddleware,
    controller.getKeyCount

);

module.exports = {
    path: "/serial",
    router: router,
};