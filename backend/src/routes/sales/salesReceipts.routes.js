const express = require('express');
const { authMiddleware } = require("../../middlewares/auth.middleware");
const salesReceipts = require("../../controllers/sales/salesReceipts.controller.js");
const { validateBody, validationRules } = require("../../middlewares/validation");
const router = express.Router();

router.post("/ebill/:id",
    salesReceipts.ebill
);

router.post("/ebill/seeds/:id",
    salesReceipts.ebillSeed
);

router.post("/ebill/fertilizers/:id",
    salesReceipts.ebillFertilizer
);

router.post("/ebill/pesticides/:id",
    salesReceipts.ebillPesticide
);

module.exports= {
    path: "/salesReceipts",
    router: router,
};