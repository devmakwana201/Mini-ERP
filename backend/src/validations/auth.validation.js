// validations/auth.validation.js
// Joi schemas for all /api/v1/auth endpoints
// MASTER_PROMPT Section 6 — Auth routes

const Joi = require('joi');

/** POST /auth/login */
const loginSchema = Joi.object({
    email:    Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
    }),
    password: Joi.string().min(6).required().messages({
        'string.min': 'Password must be at least 6 characters',
        'any.required': 'Password is required',
    }),
});

/** POST /auth/signup */
const signupSchema = Joi.object({
    name:     Joi.string().alphanum().min(6).max(12).required().messages({
        'string.alphanum': 'Username must contain only letters and numbers',
        'string.min': 'Username must be 6–12 characters',
        'string.max': 'Username must be 6–12 characters',
        'any.required': 'Username is required',
    }),
    email:    Joi.string().email().required(),
    password: Joi.string().min(8).max(64).required().messages({
        'string.min': 'Password must be at least 8 characters',
    }),
    role_id:  Joi.number().integer().min(1).optional(),
});

/** POST /auth/forgot-password */
const forgotPasswordSchema = Joi.object({
    email: Joi.string().email().required(),
});

/** POST /auth/reset-password */
const resetPasswordSchema = Joi.object({
    token:        Joi.string().required(),
    new_password: Joi.string().min(8).max(64).required(),
});

/** PUT /auth/change-password */
const changePasswordSchema = Joi.object({
    current_password: Joi.string().required(),
    new_password:     Joi.string().min(8).max(64).required()
        .invalid(Joi.ref('current_password'))
        .messages({
            'any.invalid': 'New password must be different from current password',
        }),
});

/** POST /auth/refresh */
const refreshSchema = Joi.object({
    refreshToken: Joi.string().required(),
});

module.exports = {
    loginSchema,
    signupSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    changePasswordSchema,
    refreshSchema,
};
