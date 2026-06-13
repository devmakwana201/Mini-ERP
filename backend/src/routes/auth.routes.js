const express = require("express");
const { authMiddleware } = require("../middlewares/auth.middleware.js");
const auth = require("../controllers/auth.controller.js");
const { validateBody, validationRules } = require("../middlewares/validation");
const router = express.Router();


// Login route with validation
router.post("/userLogin", 
    validateBody(validationRules.login),
    auth.userLogin
);

// Logout route (keeping original endpoint name for compatibility)
router.get("/userLogout", 
    authMiddleware, 
    auth.userLogout
);

// Additional auth routes with new features
router.post("/refresh", 
    validateBody(validationRules.refreshToken),
    auth.refreshToken
);

router.get("/verify", 
    authMiddleware, 
    auth.verifyToken
);

router.post("/forgot-password", 
    validateBody(validationRules.forgotPassword),
    auth.forgotPassword
);

router.post("/reset-password", 
    validateBody(validationRules.resetPassword),
    auth.resetPassword
);

router.post("/change-password", 
    authMiddleware,
    validateBody(validationRules.changePassword),
    auth.changePassword
);

module.exports = {
    path: "/auth",
    router: router,
};