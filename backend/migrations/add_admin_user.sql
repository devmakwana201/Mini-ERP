-- ============================================================
-- MIGRATION: Add admin@gmail.com as primary admin
-- Run against MINI_ERP1 database
-- ============================================================

USE MINI_ERP1;

-- Option A: INSERT the admin user (for fresh databases)
-- If user_id=1 already exists this will be skipped by ON DUPLICATE KEY
INSERT INTO users
    (user_id, role_id, name, email, password_hash, status, is_deleted, created_by, updated_by)
VALUES
    (1, 1, 'Admin', 'admin@gmail.com',
     '$2b$10$45Co.l9RKkoRHAZ/08PvGe7CE6wGklnOgkArH.zVtjNt7h1UdnWfm',
     'active', FALSE, NULL, NULL)
ON DUPLICATE KEY UPDATE
    name          = 'Admin',
    email         = 'admin@gmail.com',
    password_hash = '$2b$10$45Co.l9RKkoRHAZ/08PvGe7CE6wGklnOgkArH.zVtjNt7h1UdnWfm',
    status        = 'active',
    role_id       = 1;

-- Verify
SELECT user_id, role_id, name, email, status FROM users WHERE email = 'admin@gmail.com';
