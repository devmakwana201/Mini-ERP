-- ============================================================
-- MIGRATION: Application Support Tables
-- Run this AFTER dbscript.sql
-- Tables: user_jwt_tokens, password_reset_tokens, login_logs
-- ============================================================

USE MINI_ERP1;

-- ============================================================
-- A. USER_JWT_TOKENS
--    Stores active JWT tokens per user (supports multi-device).
-- ============================================================
CREATE TABLE IF NOT EXISTS user_jwt_tokens (
    token_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id    INT UNSIGNED  NOT NULL,
    token      TEXT          NOT NULL,
    expiry     DATETIME      NOT NULL,

    created_at TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_jwt_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,

    INDEX idx_jwt_user   (user_id),
    INDEX idx_jwt_expiry (expiry)
) ENGINE=InnoDB;

-- ============================================================
-- B. PASSWORD_RESET_TOKENS
--    One active token per email; expires after 1 hour.
-- ============================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email      VARCHAR(150)  NOT NULL,
    token      VARCHAR(255)  NOT NULL UNIQUE,
    expiry     DATETIME      NOT NULL,

    created_at TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_prt_email  (email),
    INDEX idx_prt_token  (token),
    INDEX idx_prt_expiry (expiry)
) ENGINE=InnoDB;

-- ============================================================
-- C. LOGIN_LOGS
--    Tracks every login / logout event per user.
-- ============================================================
CREATE TABLE IF NOT EXISTS login_logs (
    log_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED  NOT NULL,
    login_at    DATETIME      NOT NULL,
    logout_at   DATETIME      NULL,
    ip_address  VARCHAR(45),
    user_agent  TEXT,

    CONSTRAINT fk_ll_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,

    INDEX idx_ll_user  (user_id),
    INDEX idx_ll_login (login_at)
) ENGINE=InnoDB;
