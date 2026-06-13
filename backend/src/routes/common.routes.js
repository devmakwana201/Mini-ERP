const express = require('express');
const { authMiddleware } = require("../middlewares/auth.middleware.js");
const controller = require("../controllers/common.controller.js");
const { validateBody, validationRules } = require("../middlewares/validation.js");
const router = express.Router();

router.get("/getsubcategory/:id?", controller.subcategory);
router.get("/getbrand", controller.getbrand);
router.get("/getitemtypes", controller.getitemtype);
router.get("/getuom", controller.getuom);
router.get("/dropdown/:key?", controller.getdropdowndata);

module.exports ={
    path: "/common",
    router: router,
}

