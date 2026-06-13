const express = require("express");
const temp = require("../controllers/temp.controller");
const router = express.Router();

router.post("/backupdb", temp.backupdb);
router.post("/testmail", temp.testmail);
router.post("/test-whatsapp-otp", temp.testWhatsAppOTP);
router.get("/check-email-config", temp.checkEmailConfig);

// ✅ Properly export path and router
module.exports = {
    path: "/temp",
    router,
};