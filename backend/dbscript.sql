-- ============================================================
-- MINI ERP SYSTEM — DATABASE INITIALIZATION SCRIPT (v4 — CONSOLIDATED)
-- Company  : Shiv Furniture Works, Vadodara, Gujarat
-- Domain   : Furniture Manufacturing (MTS + MTO)
-- Database : MINI_ERP1
-- ============================================================

CREATE DATABASE IF NOT EXISTS MINI_ERP1
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE MINI_ERP1;

SET FOREIGN_KEY_CHECKS = 0;

-- Drop existing tables if they exist to start fresh
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS procurement_rules;
DROP TABLE IF EXISTS stock_reservations;
DROP TABLE IF EXISTS inventory_transactions;
DROP TABLE IF EXISTS stock_locations;
DROP TABLE IF EXISTS warehouses;
DROP TABLE IF EXISTS mo_components;
DROP TABLE IF EXISTS work_orders;
DROP TABLE IF EXISTS manufacturing_orders;
DROP TABLE IF EXISTS purchase_order_lines;
DROP TABLE IF EXISTS purchase_orders;
DROP TABLE IF EXISTS sales_order_lines;
DROP TABLE IF EXISTS sales_orders;
DROP TABLE IF EXISTS bom_lines;
DROP TABLE IF EXISTS bom;
DROP TABLE IF EXISTS operations;
DROP TABLE IF EXISTS work_centers;
DROP TABLE IF EXISTS product_vendors;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS partners;
DROP TABLE IF EXISTS logmst;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS user_jwt_tokens;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS vendors;
DROP TABLE IF EXISTS customers;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 1. ROLES
-- ============================================================
CREATE TABLE roles (
    role_id     INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(50)   NOT NULL UNIQUE,
    permissions JSON,
    is_deleted  BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  INT UNSIGNED  NULL,
    updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by  INT UNSIGNED  NULL,
    INDEX idx_roles_deleted (is_deleted)
) ENGINE=InnoDB;

-- ============================================================
-- 2. USERS
-- ============================================================
CREATE TABLE users (
    user_id       INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    role_id       INT UNSIGNED  NOT NULL,
    name          VARCHAR(100)  NOT NULL,
    email         VARCHAR(150)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    status        ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
    is_deleted    BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by    INT UNSIGNED  NULL,
    updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by    INT UNSIGNED  NULL,
    CONSTRAINT fk_users_role       FOREIGN KEY (role_id)    REFERENCES roles (role_id),
    CONSTRAINT fk_users_created_by FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE SET NULL,
    CONSTRAINT fk_users_updated_by FOREIGN KEY (updated_by) REFERENCES users (user_id) ON DELETE SET NULL,
    INDEX idx_users_email   (email),
    INDEX idx_users_role    (role_id),
    INDEX idx_users_status  (status),
    INDEX idx_users_deleted (is_deleted)
) ENGINE=InnoDB;

-- ============================================================
-- 3. USER JWT TOKENS (Used by Auth Middleware)
-- ============================================================
CREATE TABLE user_jwt_tokens (
    id         INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    userid     INT UNSIGNED  NOT NULL,
    token      TEXT          NOT NULL,
    expiry     DATETIME      NOT NULL,
    created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_jwt_user FOREIGN KEY (userid) REFERENCES users (user_id) ON DELETE CASCADE,
    INDEX idx_jwt_userid (userid)
) ENGINE=InnoDB;

-- ============================================================
-- 4. PASSWORD RESET TOKENS
-- ============================================================
CREATE TABLE password_reset_tokens (
    id         INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    email      VARCHAR(150)  NOT NULL,
    token      VARCHAR(255)  NOT NULL,
    expiry     DATETIME      NOT NULL,
    created_at DATETIME      NOT NULL,
    INDEX idx_reset_email (email)
) ENGINE=InnoDB;

-- ============================================================
-- 5. LOG MST (Login Logs Table used by user model / controller)
-- ============================================================
CREATE TABLE logmst (
    logId     INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    userid    INT UNSIGNED  NOT NULL,
    login     DATETIME      NOT NULL,
    logOut    DATETIME      NULL,
    ip        VARCHAR(45)   NULL,
    userAgent TEXT          NULL,
    CONSTRAINT fk_logmst_user FOREIGN KEY (userid) REFERENCES users (user_id) ON DELETE CASCADE,
    INDEX idx_logmst_userid (userid)
) ENGINE=InnoDB;

-- ============================================================
-- 6. PARTNERS
-- ============================================================
CREATE TABLE partners (
    partner_id     INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    name           VARCHAR(150)  NOT NULL,
    email          VARCHAR(150)  NULL,
    phone          VARCHAR(20)   NULL,
    address        TEXT          NULL,
    city           VARCHAR(100)  NULL,
    state          VARCHAR(100)  NULL,
    country        VARCHAR(100)  NULL DEFAULT 'India',
    gstin          VARCHAR(20)   NULL,
    payment_terms  VARCHAR(100)  NULL,
    lead_time_days INT UNSIGNED  NOT NULL DEFAULT 0,
    is_customer    BOOLEAN       NOT NULL DEFAULT FALSE,
    is_vendor      BOOLEAN       NOT NULL DEFAULT FALSE,
    is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
    is_deleted     BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by     INT UNSIGNED  NULL,
    updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by     INT UNSIGNED  NULL,
    CONSTRAINT fk_partners_created_by FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE SET NULL,
    CONSTRAINT fk_partners_updated_by FOREIGN KEY (updated_by) REFERENCES users (user_id) ON DELETE SET NULL,
    INDEX idx_partners_name      (name),
    INDEX idx_partners_vendor    (is_vendor),
    INDEX idx_partners_customer  (is_customer),
    INDEX idx_partners_active    (is_active),
    INDEX idx_partners_deleted   (is_deleted)
) ENGINE=InnoDB;

-- ============================================================
-- 7. PRODUCTS
-- ============================================================
CREATE TABLE products (
    product_id           INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    product_code         VARCHAR(50)   NOT NULL UNIQUE,
    product_name         VARCHAR(200)  NOT NULL,
    description          TEXT,
    product_type         ENUM('storable','consumable','service') NOT NULL DEFAULT 'storable',
    procurement_type     ENUM('buy','manufacture','both')         NOT NULL DEFAULT 'buy',
    procurement_strategy ENUM('MTS','MTO','MTS_MTO')              NOT NULL DEFAULT 'MTS',
    vendor_id            INT UNSIGNED  NULL,
    bom_id               INT UNSIGNED  NULL,
    sales_price          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    cost_price           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    uom                  VARCHAR(20)   NOT NULL DEFAULT 'Unit',
    on_hand_qty          DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    reserved_qty         DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    free_to_use_qty      DECIMAL(12,3) GENERATED ALWAYS AS (on_hand_qty - reserved_qty) STORED,
    min_stock_qty        DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    is_active            BOOLEAN       NOT NULL DEFAULT TRUE,
    is_deleted           BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by           INT UNSIGNED  NULL,
    updated_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by           INT UNSIGNED  NULL,
    CONSTRAINT fk_products_partner    FOREIGN KEY (vendor_id)  REFERENCES partners (partner_id) ON DELETE SET NULL,
    CONSTRAINT fk_products_created_by FOREIGN KEY (created_by) REFERENCES users    (user_id)    ON DELETE SET NULL,
    CONSTRAINT fk_products_updated_by FOREIGN KEY (updated_by) REFERENCES users    (user_id)    ON DELETE SET NULL,
    INDEX idx_products_code      (product_code),
    INDEX idx_products_name      (product_name),
    INDEX idx_products_type      (product_type),
    INDEX idx_products_strategy  (procurement_strategy),
    INDEX idx_products_vendor    (vendor_id),
    INDEX idx_products_active    (is_active),
    INDEX idx_products_deleted   (is_deleted)
) ENGINE=InnoDB;

-- ============================================================
-- 8. PRODUCT VENDORS (Patch — multi-vendor mapping)
-- ============================================================
CREATE TABLE product_vendors (
    pv_id               INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    product_id          INT UNSIGNED  NOT NULL,
    partner_id          INT UNSIGNED  NOT NULL,
    vendor_product_code VARCHAR(100)  NULL,
    unit_cost           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    lead_time_days      INT UNSIGNED  NOT NULL DEFAULT 0,
    min_order_qty       DECIMAL(12,3) NOT NULL DEFAULT 1.000,
    is_preferred        BOOLEAN       NOT NULL DEFAULT FALSE,
    is_active           BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by          INT UNSIGNED  NULL,
    updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by          INT UNSIGNED  NULL,
    UNIQUE KEY uq_product_vendor (product_id, partner_id),
    CONSTRAINT fk_pv_product    FOREIGN KEY (product_id) REFERENCES products (product_id) ON DELETE CASCADE,
    CONSTRAINT fk_pv_partner    FOREIGN KEY (partner_id) REFERENCES partners (partner_id) ON DELETE CASCADE,
    CONSTRAINT fk_pv_created_by FOREIGN KEY (created_by) REFERENCES users    (user_id)    ON DELETE SET NULL,
    CONSTRAINT fk_pv_updated_by FOREIGN KEY (updated_by) REFERENCES users    (user_id)    ON DELETE SET NULL,
    INDEX idx_pv_product    (product_id),
    INDEX idx_pv_partner    (partner_id),
    INDEX idx_pv_preferred  (product_id, is_preferred),
    INDEX idx_pv_active     (is_active)
) ENGINE=InnoDB;

-- ============================================================
-- 9. BOM (Bill of Materials — header)
-- ============================================================
CREATE TABLE bom (
    bom_id     INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED  NOT NULL,
    bom_name   VARCHAR(200)  NOT NULL,
    qty        DECIMAL(12,3) NOT NULL DEFAULT 1.000,
    bom_type   ENUM('manufacture','kit','subcontract') NOT NULL DEFAULT 'manufacture',
    is_active  BOOLEAN       NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT UNSIGNED  NULL,
    updated_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT UNSIGNED  NULL,
    CONSTRAINT fk_bom_product    FOREIGN KEY (product_id) REFERENCES products (product_id) ON DELETE CASCADE,
    CONSTRAINT fk_bom_created_by FOREIGN KEY (created_by) REFERENCES users    (user_id)    ON DELETE SET NULL,
    CONSTRAINT fk_bom_updated_by FOREIGN KEY (updated_by) REFERENCES users    (user_id)    ON DELETE SET NULL,
    INDEX idx_bom_product  (product_id),
    INDEX idx_bom_active   (is_active),
    INDEX idx_bom_deleted  (is_deleted)
) ENGINE=InnoDB;

-- Resolve circular FK: products.bom_id → bom
ALTER TABLE products
    ADD CONSTRAINT fk_products_bom
    FOREIGN KEY (bom_id) REFERENCES bom (bom_id) ON DELETE SET NULL;

-- ============================================================
-- 10. WORK CENTERS
-- ============================================================
CREATE TABLE work_centers (
    work_center_id   INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    name             VARCHAR(150)  NOT NULL UNIQUE,
    code             VARCHAR(50)   NOT NULL UNIQUE,
    description      TEXT,
    capacity_per_day DECIMAL(8,2)  NOT NULL DEFAULT 8.00,
    cost_per_hour    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
    is_deleted       BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by       INT UNSIGNED  NULL,
    updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by       INT UNSIGNED  NULL,
    CONSTRAINT fk_wc_created_by FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE SET NULL,
    CONSTRAINT fk_wc_updated_by FOREIGN KEY (updated_by) REFERENCES users (user_id) ON DELETE SET NULL,
    INDEX idx_wc_code    (code),
    INDEX idx_wc_active  (is_active),
    INDEX idx_wc_deleted (is_deleted)
) ENGINE=InnoDB;

-- ============================================================
-- 11. OPERATIONS
-- ============================================================
CREATE TABLE operations (
    operation_id     INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    work_center_id   INT UNSIGNED  NOT NULL,
    name             VARCHAR(150)  NOT NULL,
    code             VARCHAR(50)   NOT NULL UNIQUE,
    description      TEXT,
    duration_minutes DECIMAL(8,2)  NOT NULL DEFAULT 0.00,
    is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
    is_deleted       BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by       INT UNSIGNED  NULL,
    updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by       INT UNSIGNED  NULL,
    CONSTRAINT fk_op_work_center FOREIGN KEY (work_center_id) REFERENCES work_centers (work_center_id),
    CONSTRAINT fk_op_created_by  FOREIGN KEY (created_by)     REFERENCES users        (user_id) ON DELETE SET NULL,
    CONSTRAINT fk_op_updated_by  FOREIGN KEY (updated_by)     REFERENCES users        (user_id) ON DELETE SET NULL,
    INDEX idx_op_work_center (work_center_id),
    INDEX idx_op_code        (code),
    INDEX idx_op_active      (is_active),
    INDEX idx_op_deleted     (is_deleted)
) ENGINE=InnoDB;

-- ============================================================
-- 12. BOM LINES
-- ============================================================
CREATE TABLE bom_lines (
    bom_line_id  INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    bom_id       INT UNSIGNED  NOT NULL,
    component_id INT UNSIGNED  NOT NULL,
    qty          DECIMAL(12,3) NOT NULL DEFAULT 1.000,
    uom          VARCHAR(20)   NOT NULL DEFAULT 'Unit',
    operation_id INT UNSIGNED  NULL,
    is_deleted   BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by   INT UNSIGNED  NULL,
    updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by   INT UNSIGNED  NULL,
    CONSTRAINT fk_bomlines_bom       FOREIGN KEY (bom_id)       REFERENCES bom        (bom_id)        ON DELETE CASCADE,
    CONSTRAINT fk_bomlines_component FOREIGN KEY (component_id) REFERENCES products    (product_id),
    CONSTRAINT fk_bomlines_op        FOREIGN KEY (operation_id) REFERENCES operations  (operation_id)  ON DELETE SET NULL,
    CONSTRAINT fk_bomlines_createdby FOREIGN KEY (created_by)   REFERENCES users       (user_id)       ON DELETE SET NULL,
    CONSTRAINT fk_bomlines_updatedby FOREIGN KEY (updated_by)   REFERENCES users       (user_id)       ON DELETE SET NULL,
    UNIQUE KEY uq_bom_component (bom_id, component_id),
    INDEX idx_bomlines_bom       (bom_id),
    INDEX idx_bomlines_component (component_id),
    INDEX idx_bomlines_operation (operation_id)
) ENGINE=InnoDB;

-- ============================================================
-- 13. SALES ORDERS
-- ============================================================
CREATE TABLE sales_orders (
    so_id         INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    customer_id   INT UNSIGNED  NOT NULL,
    po_id         INT UNSIGNED  NULL,
    so_type       ENUM('MTS','MTO')                                              NOT NULL DEFAULT 'MTS',
    status        ENUM('draft','confirmed','in_progress','done','cancelled')     NOT NULL DEFAULT 'draft',
    total_amount  DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    delivery_date DATE,
    notes         TEXT,
    is_deleted    BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by    INT UNSIGNED  NOT NULL,
    updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by    INT UNSIGNED  NULL,
    CONSTRAINT fk_so_partner    FOREIGN KEY (customer_id) REFERENCES partners (partner_id),
    CONSTRAINT fk_so_po         FOREIGN KEY (po_id)       REFERENCES purchase_orders (po_id) ON DELETE SET NULL,
    CONSTRAINT fk_so_created_by FOREIGN KEY (created_by)  REFERENCES users    (user_id),
    CONSTRAINT fk_so_updated_by FOREIGN KEY (updated_by)  REFERENCES users    (user_id) ON DELETE SET NULL,
    INDEX idx_so_customer (customer_id),
    INDEX idx_so_po       (po_id),
    INDEX idx_so_status   (status),
    INDEX idx_so_type     (so_type),
    INDEX idx_so_created  (created_at),
    INDEX idx_so_deleted  (is_deleted)
) ENGINE=InnoDB;

-- ============================================================
-- 14. SALES ORDER LINES
-- ============================================================
CREATE TABLE sales_order_lines (
    sol_id        INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    so_id         INT UNSIGNED  NOT NULL,
    product_id    INT UNSIGNED  NOT NULL,
    qty           DECIMAL(12,3) NOT NULL,
    unit_price    DECIMAL(12,2) NOT NULL,
    subtotal      DECIMAL(14,2) GENERATED ALWAYS AS (qty * unit_price) STORED,
    reserved_qty  DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    delivered_qty DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    is_deleted    BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by    INT UNSIGNED  NULL,
    updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by    INT UNSIGNED  NULL,
    CONSTRAINT fk_sol_so         FOREIGN KEY (so_id)      REFERENCES sales_orders (so_id)      ON DELETE CASCADE,
    CONSTRAINT fk_sol_product    FOREIGN KEY (product_id) REFERENCES products     (product_id),
    CONSTRAINT fk_sol_created_by FOREIGN KEY (created_by) REFERENCES users        (user_id)    ON DELETE SET NULL,
    CONSTRAINT fk_sol_updated_by FOREIGN KEY (updated_by) REFERENCES users        (user_id)    ON DELETE SET NULL,
    INDEX idx_sol_so      (so_id),
    INDEX idx_sol_product (product_id)
) ENGINE=InnoDB;

-- ============================================================
-- 15. PURCHASE ORDERS
-- ============================================================
CREATE TABLE purchase_orders (
    po_id         INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    vendor_id     INT UNSIGNED  NOT NULL,
    status        ENUM('draft','sent','confirmed','received','cancelled') NOT NULL DEFAULT 'draft',
    total_amount  DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    expected_date DATE,
    notes         TEXT,
    is_deleted    BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by    INT UNSIGNED  NOT NULL,
    updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by    INT UNSIGNED  NULL,
    CONSTRAINT fk_po_partner    FOREIGN KEY (vendor_id)  REFERENCES partners (partner_id),
    CONSTRAINT fk_po_created_by FOREIGN KEY (created_by) REFERENCES users    (user_id),
    CONSTRAINT fk_po_updated_by FOREIGN KEY (updated_by) REFERENCES users    (user_id) ON DELETE SET NULL,
    INDEX idx_po_vendor  (vendor_id),
    INDEX idx_po_status  (status),
    INDEX idx_po_created (created_at),
    INDEX idx_po_deleted (is_deleted)
) ENGINE=InnoDB;

-- ============================================================
-- 16. PURCHASE ORDER LINES
-- ============================================================
CREATE TABLE purchase_order_lines (
    pol_id       INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    po_id        INT UNSIGNED  NOT NULL,
    product_id   INT UNSIGNED  NOT NULL,
    qty_ordered  DECIMAL(12,3) NOT NULL,
    qty_received DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    unit_cost    DECIMAL(12,2) NOT NULL,
    subtotal     DECIMAL(14,2) GENERATED ALWAYS AS (qty_ordered * unit_cost) STORED,
    is_deleted   BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by   INT UNSIGNED  NULL,
    updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by   INT UNSIGNED  NULL,
    CONSTRAINT fk_pol_po         FOREIGN KEY (po_id)      REFERENCES purchase_orders (po_id)      ON DELETE CASCADE,
    CONSTRAINT fk_pol_product    FOREIGN KEY (product_id) REFERENCES products        (product_id),
    CONSTRAINT fk_pol_created_by FOREIGN KEY (created_by) REFERENCES users           (user_id)    ON DELETE SET NULL,
    CONSTRAINT fk_pol_updated_by FOREIGN KEY (updated_by) REFERENCES users           (user_id)    ON DELETE SET NULL,
    INDEX idx_pol_po      (po_id),
    INDEX idx_pol_product (product_id)
) ENGINE=InnoDB;

-- ============================================================
-- 17. MANUFACTURING ORDERS
-- ============================================================
CREATE TABLE manufacturing_orders (
    mo_id          INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    product_id     INT UNSIGNED  NOT NULL,
    bom_id         INT UNSIGNED  NOT NULL,
    so_id          INT UNSIGNED  NULL,
    mo_type        ENUM('MTS','MTO')                                           NOT NULL DEFAULT 'MTS',
    status         ENUM('draft','confirmed','in_progress','done','cancelled')   NOT NULL DEFAULT 'draft',
    qty_planned    DECIMAL(12,3) NOT NULL,
    qty_produced   DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    scheduled_date DATE,
    completed_at   TIMESTAMP     NULL,
    is_deleted     BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by     INT UNSIGNED  NOT NULL,
    updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by     INT UNSIGNED  NULL,
    CONSTRAINT fk_mo_product    FOREIGN KEY (product_id) REFERENCES products             (product_id),
    CONSTRAINT fk_mo_bom        FOREIGN KEY (bom_id)     REFERENCES bom                  (bom_id),
    CONSTRAINT fk_mo_so         FOREIGN KEY (so_id)      REFERENCES sales_orders         (so_id)   ON DELETE SET NULL,
    CONSTRAINT fk_mo_created_by FOREIGN KEY (created_by) REFERENCES users                (user_id),
    CONSTRAINT fk_mo_updated_by FOREIGN KEY (updated_by) REFERENCES users                (user_id) ON DELETE SET NULL,
    INDEX idx_mo_product  (product_id),
    INDEX idx_mo_so       (so_id),
    INDEX idx_mo_status   (status),
    INDEX idx_mo_type     (mo_type),
    INDEX idx_mo_schedule (scheduled_date),
    INDEX idx_mo_deleted  (is_deleted)
) ENGINE=InnoDB;

-- ============================================================
-- 18. WORK ORDERS
-- ============================================================
CREATE TABLE work_orders (
    wo_id          INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    mo_id          INT UNSIGNED  NOT NULL,
    operation_id   INT UNSIGNED  NULL,
    work_center_id INT UNSIGNED  NULL,
    operation_name VARCHAR(150)  NOT NULL,
    status         ENUM('pending','in_progress','done','cancelled') NOT NULL DEFAULT 'pending',
    duration_hours DECIMAL(8,2),
    scheduled_date DATE,
    started_at     TIMESTAMP     NULL,
    completed_at   TIMESTAMP     NULL,
    is_deleted     BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by     INT UNSIGNED  NULL,
    updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by     INT UNSIGNED  NULL,
    CONSTRAINT fk_wo_mo          FOREIGN KEY (mo_id)          REFERENCES manufacturing_orders (mo_id)          ON DELETE CASCADE,
    CONSTRAINT fk_wo_operation   FOREIGN KEY (operation_id)   REFERENCES operations           (operation_id)   ON DELETE SET NULL,
    CONSTRAINT fk_wo_work_center FOREIGN KEY (work_center_id) REFERENCES work_centers         (work_center_id) ON DELETE SET NULL,
    CONSTRAINT fk_wo_created_by  FOREIGN KEY (created_by)     REFERENCES users                (user_id)        ON DELETE SET NULL,
    CONSTRAINT fk_wo_updated_by  FOREIGN KEY (updated_by)     REFERENCES users                (user_id)        ON DELETE SET NULL,
    INDEX idx_wo_mo           (mo_id),
    INDEX idx_wo_operation    (operation_id),
    INDEX idx_wo_work_center  (work_center_id),
    INDEX idx_wo_status       (status),
    INDEX idx_wo_deleted      (is_deleted)
) ENGINE=InnoDB;

-- ============================================================
-- 19. MO COMPONENTS (BOM Explosion Components list)
-- ============================================================
CREATE TABLE mo_components (
    mo_component_id INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    mo_id           INT UNSIGNED  NOT NULL,
    product_id      INT UNSIGNED  NOT NULL,
    bom_line_id     INT UNSIGNED  NULL,
    qty_planned     DECIMAL(12,3) NOT NULL,
    qty_consumed    DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    uom             VARCHAR(20)   NOT NULL DEFAULT 'Unit',
    is_available    BOOLEAN       NOT NULL DEFAULT FALSE,
    notes           TEXT,
    is_deleted      BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by      INT UNSIGNED  NULL,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by      INT UNSIGNED  NULL,
    CONSTRAINT fk_moc_mo         FOREIGN KEY (mo_id)       REFERENCES manufacturing_orders (mo_id)        ON DELETE CASCADE,
    CONSTRAINT fk_moc_product    FOREIGN KEY (product_id)  REFERENCES products             (product_id),
    CONSTRAINT fk_moc_bom_line   FOREIGN KEY (bom_line_id) REFERENCES bom_lines            (bom_line_id)  ON DELETE SET NULL,
    CONSTRAINT fk_moc_created_by FOREIGN KEY (created_by)  REFERENCES users                (user_id)      ON DELETE SET NULL,
    CONSTRAINT fk_moc_updated_by FOREIGN KEY (updated_by)  REFERENCES users                (user_id)      ON DELETE SET NULL,
    UNIQUE KEY uq_mo_component (mo_id, product_id),
    INDEX idx_moc_mo        (mo_id),
    INDEX idx_moc_product   (product_id),
    INDEX idx_moc_bom_line  (bom_line_id),
    INDEX idx_moc_available (is_available)
) ENGINE=InnoDB;

-- ============================================================
-- 20. WAREHOUSES
-- ============================================================
CREATE TABLE warehouses (
    warehouse_id INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(150)  NOT NULL UNIQUE,
    address      TEXT,
    is_active    BOOLEAN       NOT NULL DEFAULT TRUE,
    is_deleted   BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by   INT UNSIGNED  NULL,
    updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by   INT UNSIGNED  NULL,
    CONSTRAINT fk_wh_created_by FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE SET NULL,
    CONSTRAINT fk_wh_updated_by FOREIGN KEY (updated_by) REFERENCES users (user_id) ON DELETE SET NULL,
    INDEX idx_wh_active  (is_active),
    INDEX idx_wh_deleted (is_deleted)
) ENGINE=InnoDB;

-- ============================================================
-- 21. STOCK LOCATIONS
-- ============================================================
CREATE TABLE stock_locations (
    location_id   INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    warehouse_id  INT UNSIGNED  NOT NULL,
    name          VARCHAR(100)  NOT NULL,
    code          VARCHAR(50)   NOT NULL UNIQUE,
    location_type ENUM('input','storage','output','quality','scrap') NOT NULL DEFAULT 'storage',
    is_deleted    BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by    INT UNSIGNED  NULL,
    updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by    INT UNSIGNED  NULL,
    CONSTRAINT fk_loc_warehouse  FOREIGN KEY (warehouse_id) REFERENCES warehouses (warehouse_id) ON DELETE CASCADE,
    CONSTRAINT fk_loc_created_by FOREIGN KEY (created_by)   REFERENCES users      (user_id)      ON DELETE SET NULL,
    CONSTRAINT fk_loc_updated_by FOREIGN KEY (updated_by)   REFERENCES users      (user_id)      ON DELETE SET NULL,
    INDEX idx_loc_warehouse (warehouse_id),
    INDEX idx_loc_code      (code),
    INDEX idx_loc_deleted   (is_deleted)
) ENGINE=InnoDB;

-- ============================================================
-- 22. INVENTORY TRANSACTIONS
-- ============================================================
CREATE TABLE inventory_transactions (
    txn_id         INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    product_id     INT UNSIGNED  NOT NULL,
    reference_id   INT UNSIGNED  NULL,
    reference_type ENUM('SO','PO','MO','ADJUSTMENT','RETURN','OPENING') NOT NULL,
    txn_type       ENUM('IN','OUT','RESERVE','UNRESERVE','ADJUST')       NOT NULL,
    qty            DECIMAL(12,3) NOT NULL,
    qty_before     DECIMAL(12,3) NOT NULL,
    qty_after      DECIMAL(12,3) NOT NULL,
    location_id    INT UNSIGNED  NULL,
    notes          TEXT,
    created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by     INT UNSIGNED  NOT NULL,
    CONSTRAINT fk_txn_product    FOREIGN KEY (product_id) REFERENCES products (product_id),
    CONSTRAINT fk_txn_created_by FOREIGN KEY (created_by) REFERENCES users    (user_id),
    CONSTRAINT fk_txn_location   FOREIGN KEY (location_id) REFERENCES stock_locations (location_id) ON DELETE SET NULL,
    INDEX idx_txn_product  (product_id),
    INDEX idx_txn_ref      (reference_type, reference_id),
    INDEX idx_txn_type     (txn_type),
    INDEX idx_txn_created  (created_at),
    INDEX idx_txn_location (location_id)
) ENGINE=InnoDB;

-- ============================================================
-- 23. STOCK RESERVATIONS
-- ============================================================
CREATE TABLE stock_reservations (
    reservation_id INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    product_id     INT UNSIGNED  NOT NULL,
    so_id          INT UNSIGNED  NOT NULL,
    reserved_qty   DECIMAL(12,3) NOT NULL,
    status         ENUM('active','released','consumed') NOT NULL DEFAULT 'active',
    is_deleted     BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by     INT UNSIGNED  NULL,
    updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by     INT UNSIGNED  NULL,
    CONSTRAINT fk_reserve_product    FOREIGN KEY (product_id) REFERENCES products     (product_id),
    CONSTRAINT fk_reserve_so         FOREIGN KEY (so_id)      REFERENCES sales_orders (so_id)      ON DELETE CASCADE,
    CONSTRAINT fk_reserve_created_by FOREIGN KEY (created_by) REFERENCES users        (user_id)    ON DELETE SET NULL,
    CONSTRAINT fk_reserve_updated_by FOREIGN KEY (updated_by) REFERENCES users        (user_id)    ON DELETE SET NULL,
    INDEX idx_reserve_product (product_id),
    INDEX idx_reserve_so      (so_id),
    INDEX idx_reserve_status  (status),
    INDEX idx_reserve_deleted (is_deleted)
) ENGINE=InnoDB;

-- ============================================================
-- 24. PROCUREMENT RULES
-- ============================================================
CREATE TABLE procurement_rules (
    rule_id             INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    product_id          INT UNSIGNED  NOT NULL UNIQUE,
    strategy            ENUM('MTS','MTO','MTS_MTO') NOT NULL DEFAULT 'MTS',
    min_stock_qty       DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    reorder_qty         DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    preferred_vendor_id INT UNSIGNED  NULL,
    is_active           BOOLEAN       NOT NULL DEFAULT TRUE,
    is_deleted          BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by          INT UNSIGNED  NULL,
    updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by          INT UNSIGNED  NULL,
    CONSTRAINT fk_rule_product    FOREIGN KEY (product_id)          REFERENCES products (product_id) ON DELETE CASCADE,
    CONSTRAINT fk_rule_partner    FOREIGN KEY (preferred_vendor_id) REFERENCES partners (partner_id) ON DELETE SET NULL,
    CONSTRAINT fk_rule_created_by FOREIGN KEY (created_by)          REFERENCES users    (user_id)    ON DELETE SET NULL,
    CONSTRAINT fk_rule_updated_by FOREIGN KEY (updated_by)          REFERENCES users    (user_id)    ON DELETE SET NULL,
    INDEX idx_rule_strategy (strategy),
    INDEX idx_rule_active   (is_active),
    INDEX idx_rule_deleted  (is_deleted)
) ENGINE=InnoDB;

-- ============================================================
-- 25. AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
    log_id     INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    user_id    INT UNSIGNED  NOT NULL,
    table_name VARCHAR(100)  NOT NULL,
    record_id  INT UNSIGNED  NOT NULL,
    action     ENUM('INSERT','UPDATE','DELETE') NOT NULL,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users (user_id),
    INDEX idx_audit_user    (user_id),
    INDEX idx_audit_table   (table_name),
    INDEX idx_audit_record  (table_name, record_id),
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB;


-- ============================================================
-- SEED DATA SECTION
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. ROLES
INSERT INTO roles (role_id, name, permissions, is_deleted, created_by, updated_by) VALUES
(1, 'Admin',              JSON_OBJECT('access','full'),                                        FALSE, NULL, NULL),
(2, 'Sales User',         JSON_OBJECT('sales','full','dashboard','read'),                      FALSE, NULL, NULL),
(3, 'Purchase User',      JSON_OBJECT('purchase','full','dashboard','read'),                   FALSE, NULL, NULL),
(4, 'Manufacturing User', JSON_OBJECT('manufacturing','full','bom','read','dashboard','read'), FALSE, NULL, NULL),
(5, 'Inventory Manager',  JSON_OBJECT('inventory','full','products','read','dashboard','read'),FALSE, NULL, NULL),
(6, 'Business Owner',     JSON_OBJECT('dashboard','full','products','full','reports','full'),  FALSE, NULL, NULL);

-- 2. USERS
INSERT INTO users
    (user_id, role_id, name, email, password_hash, status, is_deleted, created_by, updated_by)
VALUES
-- Admins
(1,  1, 'Rajesh Sharma',  'rajesh@shivfurniture.in',    '$2b$10$45Co.l9RKkoRHAZ/08PvGe7CE6wGklnOgkArH.zVtjNt7h1UdnWfm', 'active',   FALSE, NULL, NULL),
(2,  1, 'Priya Mehta',    'priya@shivfurniture.in',     '$2b$10$45Co.l9RKkoRHAZ/08PvGe7CE6wGklnOgkArH.zVtjNt7h1UdnWfm', 'active',   FALSE, 1,    NULL),
-- Sales Users
(3,  2, 'Amit Patel',     'amit.sales@shivfurniture.in','$2b$10$45Co.l9RKkoRHAZ/08PvGe7CE6wGklnOgkArH.zVtjNt7h1UdnWfm', 'active',   FALSE, 1,    NULL),
(4,  2, 'Sneha Joshi',    'sneha.sales@shivfurniture.in','$2b$10$45Co.l9RKkoRHAZ/08PvGe7CE6wGklnOgkArH.zVtjNt7h1UdnWfm','active',   FALSE, 1,    NULL),
-- Purchase Users
(5,  3, 'Vikram Desai',   'vikram.po@shivfurniture.in', '$2b$10$45Co.l9RKkoRHAZ/08PvGe7CE6wGklnOgkArH.zVtjNt7h1UdnWfm', 'active',   FALSE, 1,    NULL),
(6,  3, 'Kavita Rao',     'kavita.po@shivfurniture.in', '$2b$10$45Co.l9RKkoRHAZ/08PvGe7CE6wGklnOgkArH.zVtjNt7h1UdnWfm', 'active',   FALSE, 1,    NULL),
-- Manufacturing Users
(7,  4, 'Suresh Nair',    'suresh.mfg@shivfurniture.in','$2b$10$45Co.l9RKkoRHAZ/08PvGe7CE6wGklnOgkArH.zVtjNt7h1UdnWfm','active',   FALSE, 1,    NULL),
(8,  4, 'Deepa Iyer',     'deepa.mfg@shivfurniture.in', '$2b$10$45Co.l9RKkoRHAZ/08PvGe7CE6wGklnOgkArH.zVtjNt7h1UdnWfm','active',   FALSE, 1,    NULL),
-- Inventory Managers
(9,  5, 'Manish Gupta',   'manish.inv@shivfurniture.in','$2b$10$45Co.l9RKkoRHAZ/08PvGe7CE6wGklnOgkArH.zVtjNt7h1UdnWfm','active',   FALSE, 1,    NULL),
(10, 5, 'Rekha Singh',    'rekha.inv@shivfurniture.in', '$2b$10$45Co.l9RKkoRHAZ/08PvGe7CE6wGklnOgkArH.zVtjNt7h1UdnWfm','active',   FALSE, 1,    NULL),
-- Business Owners
(11, 6, 'Shiv Agarwal',   'shiv@shivfurniture.in',      '$2b$10$45Co.l9RKkoRHAZ/08PvGe7CE6wGklnOgkArH.zVtjNt7h1UdnWfm','active',   FALSE, 1,    NULL),
(12, 6, 'Meena Agarwal',  'meena@shivfurniture.in',     '$2b$10$45Co.l9RKkoRHAZ/08PvGe7CE6wGklnOgkArH.zVtjNt7h1UdnWfm','inactive', FALSE, 1,    NULL);

-- 3. PARTNERS
INSERT INTO partners
    (partner_id, name, email, phone, address, city, state, country, gstin, lead_time_days,
     is_customer, is_vendor, is_active, is_deleted, created_by, updated_by)
VALUES
-- Pure Vendors
(1,  'Timber King Supplies',     'orders@timberking.in',    '9820001001',
     'Plot 5, Makarpura GIDC, Vadodara, Gujarat',   'Vadodara', 'Gujarat', 'India', '24AABCT1234A1Z5', 7,  FALSE, TRUE,  TRUE, FALSE, 5, NULL),
(2,  'Patel Foam Industries',    'contact@patelfoam.in',    '9820001002',
     'Survey No. 44, Udhna, Surat, Gujarat',         'Surat', 'Gujarat', 'India', '24AAFCP9876B1Z2', 5,  FALSE, TRUE,  TRUE, FALSE, 5, NULL),
(3,  'Gujarat Fabric House',     'orders@gjfabric.in',      '9820001003',
     'Ring Road Industrial Area, Ahmedabad, Gujarat','Ahmedabad', 'Gujarat', 'India', '24AACGF5678C1Z8', 6,  FALSE, TRUE,  TRUE, FALSE, 5, NULL),
(4,  'FastFix Screws & Bolts',   'sales@fastfix.in',        '9820001004',
     'Kathwada GIDC, Ahmedabad, Gujarat',            'Ahmedabad', 'Gujarat', 'India', '24AABFF2345D1Z4', 3,  FALSE, TRUE,  TRUE, FALSE, 6, NULL),
(5,  'Shree Glass Traders',      'sales@shreeglass.in',     '9820001005',
     'Industrial Zone, Anand, Gujarat',              'Anand', 'Gujarat', 'India', '24AADSG8901E1Z6', 4,  FALSE, TRUE,  TRUE, FALSE, 6, NULL),
(6,  'Prime Ply & Board Co.',    'orders@primeply.in',      '9820001006',
     'Amreli Road, Bhavnagar, Gujarat',              'Bhavnagar', 'Gujarat', 'India', '24AABCP4567F1Z3', 8,  FALSE, TRUE,  TRUE, FALSE, 5, NULL),
-- Pure Customers
(7,  'Home Comfort Retailers',   'orders@homecomfort.in',   '7700001001',
     '12 MG Road, Pune, Maharashtra',                'Pune', 'Maharashtra', 'India', '27AABCH6789G1Z1', 0,  TRUE,  FALSE, TRUE, FALSE, 3, NULL),
(8,  'Grand Palace Hotel',       'purchase@grandpalace.in', '7700001002',
     '1 Five Star Lane, Mumbai, Maharashtra',         'Mumbai', 'Maharashtra', 'India', '27AABCG3456H1Z7', 0,  TRUE,  FALSE, TRUE, FALSE, 4, NULL),
(9,  'Sunrise Office Solutions', 'admin@sunriseoffice.in',  '7700001003',
     'Cybercity, Hyderabad, Telangana',               'Hyderabad', 'Telangana', 'India', '36AABCS7890I1Z9', 0,  TRUE,  FALSE, TRUE, FALSE, 3, NULL),
(10, 'Delhi Interior Hub',       'orders@delhiinterior.in', '7700001004',
     'Kirti Nagar Furniture Market, New Delhi',       'New Delhi', 'Delhi', 'India', '07AABCD1234J1Z2', 0,  TRUE,  FALSE, TRUE, FALSE, 4, NULL),
-- Dual-role Partners
(11, 'Rajasthan Furniture Mall', 'buy@rajfurnmall.in',      '7700001005',
     'Sindhi Camp, Jaipur, Rajasthan',               'Jaipur', 'Rajasthan', 'India', '08AABCR5678K1Z5', 10, TRUE,  TRUE,  TRUE, FALSE, 3, NULL),
(12, 'Navkar Retail & Supplies', 'buy@navkarretail.in',     '7700001006',
     'Paldi, Ahmedabad, Gujarat',                    'Ahmedabad', 'Gujarat', 'India', '24AABCN9012L1Z8', 5,  TRUE,  TRUE,  TRUE, FALSE, 4, NULL);

-- 4. PRODUCTS
INSERT INTO products
    (product_id, product_code, product_name, description,
     product_type, procurement_type, procurement_strategy,
     vendor_id, bom_id,
     sales_price, cost_price, uom,
     on_hand_qty, reserved_qty, min_stock_qty,
     is_active, is_deleted, created_by, updated_by)
VALUES
-- Finished Goods
(1,  'FG-001', 'Wooden Dining Table',
     '6-seater solid teak dining table with lacquer finish',
     'storable','manufacture','MTS',  NULL, NULL,
     18500.00, 9200.00, 'Unit', 20.000, 18.000,  5.000, TRUE, FALSE, 11, NULL),

(2,  'FG-002', 'Wooden Office Chair',
     'Ergonomic chair with cushioned seat and back, padded armrests',
     'storable','manufacture','MTS',  NULL, NULL,
      6500.00, 3100.00, 'Unit', 50.000, 21.000, 10.000, TRUE, FALSE, 11, NULL),

(3,  'FG-003', 'Sofa Set 3+1+1',
     '5-seater fabric upholstered sofa set with solid teak frame',
     'storable','manufacture','MTO',  NULL, NULL,
     32000.00,16000.00, 'Set',   8.000,  4.000,  2.000, TRUE, FALSE, 11, NULL),

(4,  'FG-004', 'Wooden Wardrobe 3-Door',
     'Sliding 3-door wardrobe with one full-length mirror panel',
     'storable','manufacture','MTO',  NULL, NULL,
     24000.00,12500.00, 'Unit',  6.000,  3.000,  2.000, TRUE, FALSE, 11, NULL),

(5,  'FG-005', 'Study Table with Drawer',
     'Home/student study table with one side drawer and shelf',
     'storable','manufacture','MTS',  NULL, NULL,
      7200.00, 3500.00, 'Unit', 30.000, 13.000,  5.000, TRUE, FALSE, 11, NULL),

(6,  'FG-006', 'Coffee Table Glass Top',
     'Teak leg base with 8mm tempered glass top, polished edges',
     'storable','manufacture','MTS',  NULL, NULL,
       9800.00, 4800.00, 'Unit', 15.000, 15.000,  3.000, TRUE, FALSE, 11, NULL),

-- Raw Materials
(7,  'RM-001', 'Teak Wood Plank',
     'Seasoned teak plank 6ft × 1ft × 2in, kiln-dried',
     'storable','buy','MTS',  1, NULL,
       0.00, 850.00, 'Pcs',  200.000, 50.000, 50.000, TRUE, FALSE, 9, NULL),

(8,  'RM-002', 'Plywood Sheet 19mm',
     'BWR-grade plywood 8×4ft, 19mm thickness',
     'storable','buy','MTS',  1, NULL,
       0.00,1200.00, 'Sheet',150.000, 34.000, 30.000, TRUE, FALSE, 9, NULL),

(9,  'RM-003', 'Foam Cushion Block',
     'High-density PU foam block 24×24×4in, 40kg/m³ density',
     'storable','buy','MTS',  2, NULL,
       0.00, 350.00, 'Pcs',  120.000, 60.000, 20.000, TRUE, FALSE, 9, NULL),

(10, 'RM-004', 'Fabric Roll Grey',
     'Upholstery fabric 54in wide, woven polyester blend, per metre',
     'storable','buy','MTS',  3, NULL,
       0.00, 280.00, 'Metre',300.000, 90.000, 50.000, TRUE, FALSE, 9, NULL),

(11, 'RM-005', 'Screws and Bolts Pack',
     '100-piece assorted furniture hardware pack (M4–M8)',
     'consumable','buy','MTS', 4, NULL,
       0.00, 120.00, 'Pack', 250.000, 85.000, 50.000, TRUE, FALSE, 9, NULL),

(12, 'RM-006', 'Tempered Glass Sheet',
     '8mm tempered glass 3×2ft, pre-polished edges, safety rated',
     'storable','buy','MTS',  5, NULL,
       0.00, 950.00, 'Sheet', 40.000, 15.000, 10.000, TRUE, FALSE, 9, NULL);

-- 5. BOM HEADERS
INSERT INTO bom
    (bom_id, product_id, bom_name, qty, bom_type, is_active, is_deleted, created_by, updated_by)
VALUES
(1, 1, 'BOM – Wooden Dining Table v1',      1.000, 'manufacture', TRUE,  FALSE, 7, NULL),
(2, 2, 'BOM – Wooden Office Chair v1',      1.000, 'manufacture', TRUE,  FALSE, 7, NULL),
(3, 3, 'BOM – Sofa Set 3+1+1 v1',           1.000, 'manufacture', TRUE,  FALSE, 7, NULL),
(4, 4, 'BOM – Wooden Wardrobe 3-Door v1',   1.000, 'manufacture', TRUE,  FALSE, 8, NULL),
(5, 5, 'BOM – Study Table with Drawer v1',  1.000, 'manufacture', TRUE,  FALSE, 7, NULL),
(6, 6, 'BOM – Coffee Table Glass Top v1',   1.000, 'manufacture', TRUE,  FALSE, 8, NULL);

-- Back-fill bom_id on finished goods
UPDATE products SET bom_id = 1 WHERE product_id = 1;
UPDATE products SET bom_id = 2 WHERE product_id = 2;
UPDATE products SET bom_id = 3 WHERE product_id = 3;
UPDATE products SET bom_id = 4 WHERE product_id = 4;
UPDATE products SET bom_id = 5 WHERE product_id = 5;
UPDATE products SET bom_id = 6 WHERE product_id = 6;

-- 6. WORK CENTERS
INSERT INTO work_centers
    (work_center_id, name, code, description,
     capacity_per_day, cost_per_hour, is_active, is_deleted, created_by, updated_by)
VALUES
(1,  'Cutting Station',        'WC-CUT',    'Raw wood and material cutting area',          8.00, 150.00, TRUE, FALSE, 1, NULL),
(2,  'Assembly Line A',        'WC-ASM-A',  'Primary furniture frame assembly',            8.00, 200.00, TRUE, FALSE, 1, NULL),
(3,  'Assembly Line B',        'WC-ASM-B',  'Secondary assembly for doors and drawers',   8.00, 200.00, TRUE, FALSE, 1, NULL),
(4,  'Sanding and Finishing',  'WC-SAND',   'Wood sanding and surface preparation',       8.00, 120.00, TRUE, FALSE, 1, NULL),
(5,  'Paint and Polish Floor', 'WC-PAINT',  'Spray painting and lacquer application',     8.00, 180.00, TRUE, FALSE, 1, NULL),
(6,  'Upholstery Unit',        'WC-UPHL',   'Foam cutting, fabric stitching and fitting', 8.00, 160.00, TRUE, FALSE, 1, NULL),
(7,  'Glass Fitting Bay',      'WC-GLASS',  'Tempered glass cutting and fitting station', 8.00, 170.00, TRUE, FALSE, 1, NULL),
(8,  'Quality Control Bench',  'WC-QC',     'Final product inspection and QC check',      8.00,  90.00, TRUE, FALSE, 1, NULL),
(9,  'Packaging Unit',         'WC-PACK',   'Wrapping, boxing and product labelling',     8.00,  80.00, TRUE, FALSE, 1, NULL),
(10, 'Dispatch Bay',           'WC-DISP',   'Loading, staging and dispatch area',         8.00,  60.00, TRUE, FALSE, 1, NULL);

-- 7. OPERATIONS
INSERT INTO operations
    (operation_id, work_center_id, name, code, description,
     duration_minutes, is_active, is_deleted, created_by, updated_by)
VALUES
(1,  1, 'Cut Wood Planks',         'OP-CUT-001',   'Cut teak planks to drawing dimensions',        45.00, TRUE, FALSE, 7, NULL),
(2,  1, 'Cut Plywood Sheets',      'OP-CUT-002',   'Cut plywood panels to required sizes',         30.00, TRUE, FALSE, 7, NULL),
(3,  2, 'Frame Assembly',          'OP-ASM-001',   'Assemble main structural frame with screws',   90.00, TRUE, FALSE, 7, NULL),
(4,  3, 'Drawer and Door Fit',     'OP-ASM-002',   'Fit drawers, doors, hinges and handles',       60.00, TRUE, FALSE, 7, NULL),
(5,  4, 'Surface Sanding',         'OP-SAND-001',  'Sand all wood surfaces up to 220 grit',        40.00, TRUE, FALSE, 8, NULL),
(6,  5, 'Polish and Lacquer',      'OP-PAINT-001', 'Apply wood polish coat and lacquer finish',    50.00, TRUE, FALSE, 8, NULL),
(7,  6, 'Foam Cutting and Gluing', 'OP-UPHL-001',  'Cut foam to shape and glue to seat base',      35.00, TRUE, FALSE, 8, NULL),
(8,  6, 'Fabric Stitching',        'OP-UPHL-002',  'Stitch and stretch fabric over foam cushion',  45.00, TRUE, FALSE, 8, NULL),
(9,  7, 'Glass Cutting and Fit',   'OP-GLASS-001', 'Cut, edge-polish and fit tempered glass top',  30.00, TRUE, FALSE, 7, NULL),
(10, 8, 'Quality Inspection',      'OP-QC-001',    'Full quality check before dispatch clearance', 20.00, TRUE, FALSE, 1, NULL),
(11, 9, 'Packaging',               'OP-PACK-001',  'Wrap, box and label finished product unit',    15.00, TRUE, FALSE, 7, NULL),
(12,10, 'Dispatch Staging',        'OP-DISP-001',  'Stage at dispatch bay and generate note',      10.00, TRUE, FALSE, 7, NULL);

-- 8. BOM LINES
INSERT INTO bom_lines
    (bom_line_id, bom_id, component_id, qty, uom, operation_id, is_deleted, created_by)
VALUES
-- BOM 1: Dining Table
(1,  1,  7,  6.000, 'Pcs',   1, FALSE, 7),
(2,  1,  8,  2.000, 'Sheet', 2, FALSE, 7),
(3,  1, 11,  1.000, 'Pack',  3, FALSE, 7),
-- BOM 2: Office Chair
(4,  2,  8,  1.000, 'Sheet', 2, FALSE, 7),
(5,  2,  9,  2.000, 'Pcs',   7, FALSE, 7),
(6,  2, 10,  1.500, 'Metre', 8, FALSE, 7),
(7,  2, 11,  1.000, 'Pack',  3, FALSE, 7),
-- BOM 3: Sofa Set
(8,  3,  7,  4.000, 'Pcs',   1, FALSE, 8),
(9,  3,  9, 10.000, 'Pcs',   7, FALSE, 8),
(10, 3, 10, 12.000, 'Metre', 8, FALSE, 8),
(11, 3, 11,  2.000, 'Pack',  3, FALSE, 8),
-- BOM 4: Wardrobe
(12, 4,  8,  6.000, 'Sheet', 2, FALSE, 8),
(13, 4,  7,  3.000, 'Pcs',   1, FALSE, 8),
(14, 4, 11,  2.000, 'Pack',  4, FALSE, 8),
-- BOM 5: Study Table
(15, 5,  8,  2.000, 'Sheet', 2, FALSE, 7),
(16, 5,  7,  2.000, 'Pcs',   1, FALSE, 7),
(17, 5, 11,  1.000, 'Pack',  3, FALSE, 7),
-- BOM 6: Coffee Table
(18, 6,  7,  2.000, 'Pcs',   1, FALSE, 8),
(19, 6, 12,  1.000, 'Sheet', 9, FALSE, 8),
(20, 6, 11,  1.000, 'Pack',  3, FALSE, 8);

-- 9. WAREHOUSES
INSERT INTO warehouses
    (warehouse_id, name, address, is_active, is_deleted, created_by, updated_by)
VALUES
(1, 'Main Warehouse Vadodara', 'Plot 22-A, Manjusar GIDC, Vadodara, Gujarat', TRUE, FALSE, 1, NULL),
(2, 'Finished Goods Store',    'Block B, Manjusar GIDC, Vadodara, Gujarat',   TRUE, FALSE, 1, NULL),
(3, 'Raw Material Store',      'Block C, Manjusar GIDC, Vadodara, Gujarat',   TRUE, FALSE, 1, NULL);

-- 10. STOCK LOCATIONS
INSERT INTO stock_locations
    (location_id, warehouse_id, name, code, location_type, is_deleted, created_by, updated_by)
VALUES
(1,  1, 'Receiving Dock',          'WH1-IN',      'input',   FALSE, 9, NULL),
(2,  1, 'General Storage Zone A',  'WH1-STR-A',   'storage', FALSE, 9, NULL),
(3,  1, 'General Storage Zone B',  'WH1-STR-B',   'storage', FALSE, 9, NULL),
(4,  1, 'Quality Hold Area',       'WH1-QC',      'quality', FALSE, 9, NULL),
(5,  1, 'Scrap Bin',               'WH1-SCRAP',   'scrap',   FALSE, 9, NULL),
(6,  2, 'FG Storage Row 1',        'FG-ROW1',     'storage', FALSE, 9, NULL),
(7,  2, 'FG Storage Row 2',        'FG-ROW2',     'storage', FALSE, 9, NULL),
(8,  2, 'Dispatch Staging Area',   'FG-DISP',     'output',  FALSE, 9, NULL),
(9,  3, 'Wood Rack Section',       'RM-WOOD',     'storage', FALSE, 9, NULL),
(10, 3, 'Foam and Fabric Bay',     'RM-FOAM-FAB', 'storage', FALSE, 9, NULL),
(11, 3, 'Hardware and Glass Bay',  'RM-HW-GLASS', 'storage', FALSE, 9, NULL),
(12, 3, 'RM Receiving Dock',       'RM-IN',       'input',   FALSE, 9, NULL);

-- 11. SALES ORDERS
INSERT INTO sales_orders
    (so_id, customer_id, so_type, status, total_amount, delivery_date, notes,
     is_deleted, created_by, updated_by)
VALUES
(1,   7, 'MTS', 'done',        370000.00, '2024-01-20', 'Home Comfort – 20 Dining Tables bulk order',        FALSE, 3, NULL),
(2,   8, 'MTO', 'done',        192000.00, '2024-02-10', 'Grand Palace Hotel – 6 Custom Sofa Sets',           FALSE, 4, NULL),
(3,   9, 'MTS', 'done',        325000.00, '2024-02-28', 'Sunrise Office – 50 Office Chairs bulk',            FALSE, 3, NULL),
(4,  11, 'MTS', 'in_progress', 129500.00, '2024-03-15', 'Rajasthan Mall – 5 Dining + 3 Study Tables',       FALSE, 4, 4),
(5,  10, 'MTO', 'confirmed',    98000.00, '2024-03-22', 'Delhi Interior Hub – 10 Coffee Tables MTO',        FALSE, 3, NULL),
(6,  12, 'MTS', 'confirmed',   156000.00, '2024-03-30', 'Navkar Retail – 5 Dining + 6 Office Chairs',       FALSE, 4, NULL),
(7,   8, 'MTO', 'draft',        72000.00, '2024-04-05', 'Grand Palace Hotel – 3 Wardrobes MTO',             FALSE, 3, NULL),
(8,   9, 'MTS', 'draft',        57600.00, '2024-04-10', 'Sunrise Office – 8 Study Tables',                  FALSE, 4, NULL),
(9,   7, 'MTS', 'cancelled',    32500.00, '2024-03-01', 'Home Comfort – 5 Chairs (customer cancelled)',     FALSE, 3, 3),
(10, 11, 'MTS', 'in_progress', 212000.00, '2024-03-25', 'Rajasthan Mall – 8 Dining Tables + 2 Sofa Sets',  FALSE, 4, 4),
(11, 12, 'MTS', 'confirmed',    68000.00, '2024-04-12', 'Navkar Retail – 5 Study Tables + 5 Chairs',        FALSE, 3, NULL),
(12, 10, 'MTO', 'draft',        49000.00, '2024-04-20', 'Delhi Interior Hub – 5 Coffee Tables batch 2',    FALSE, 4, NULL);

-- 12. SALES ORDER LINES
INSERT INTO sales_order_lines
    (sol_id, so_id, product_id, qty, unit_price, reserved_qty, delivered_qty, is_deleted, created_by)
VALUES
-- SO1: 20 Dining Tables (done)
(1,  1,  1, 20.000, 18500.00,  0.000, 20.000, FALSE, 3),
-- SO2: 6 Sofa Sets (done)
(2,  2,  3,  6.000, 32000.00,  0.000,  6.000, FALSE, 4),
-- SO3: 50 Office Chairs (done)
(3,  3,  2, 50.000,  6500.00,  0.000, 50.000, FALSE, 3),
-- SO4: 5 Dining + 3 Study Tables (in_progress)
(4,  4,  1,  5.000, 18500.00,  5.000,  0.000, FALSE, 4),
(5,  4,  5,  3.000,  7200.00,  3.000,  0.000, FALSE, 4),
-- SO5: 10 Coffee Tables (confirmed MTO)
(6,  5,  6, 10.000,  9800.00, 10.000,  0.000, FALSE, 3),
-- SO6: 5 Dining + 6 Office Chairs (confirmed)
(7,  6,  1,  5.000, 18500.00,  5.000,  0.000, FALSE, 4),
(8,  6,  2,  6.000,  6500.00,  6.000,  0.000, FALSE, 4),
-- SO7: 3 Wardrobes (draft MTO)
(9,  7,  4,  3.000, 24000.00,  0.000,  0.000, FALSE, 3),
-- SO8: 8 Study Tables (draft)
(10, 8,  5,  8.000,  7200.00,  0.000,  0.000, FALSE, 4),
-- SO9: 5 Chairs (cancelled)
(11, 9,  2,  5.000,  6500.00,  0.000,  0.000, FALSE, 3),
-- SO10: 8 Dining Tables + 2 Sofa Sets (in_progress)
(12,10,  1,  8.000, 18500.00,  8.000,  0.000, FALSE, 4),
(13,10,  3,  2.000, 32000.00,  2.000,  0.000, FALSE, 4),
-- SO11: 5 Study + 5 Office Chairs (confirmed)
(14,11,  5,  5.000,  7200.00,  5.000,  0.000, FALSE, 3),
(15,11,  2,  5.000,  6500.00,  5.000,  0.000, FALSE, 3),
-- SO12: 5 Coffee Tables (draft MTO)
(16,12,  6,  5.000,  9800.00,  0.000,  0.000, FALSE, 4);

-- 13. PURCHASE ORDERS
INSERT INTO purchase_orders
    (po_id, vendor_id, status, total_amount, expected_date, notes,
     is_deleted, created_by, updated_by)
VALUES
(1,  1, 'received',   85000.00, '2024-01-10', 'Teak planks restock – Jan production run',       FALSE, 5, NULL),
(2,  2, 'received',   42000.00, '2024-01-15', 'Foam blocks restock – Jan upholstery batch',     FALSE, 5, NULL),
(3,  3, 'received',   84000.00, '2024-01-18', 'Fabric rolls – Jan Sofa and Chair production',  FALSE, 6, NULL),
(4,  4, 'received',   24000.00, '2024-01-20', 'Screws and bolts restock – routine',             FALSE, 5, NULL),
(5,  5, 'received',   38000.00, '2024-01-25', 'Tempered glass sheets – Jan batch',              FALSE, 6, NULL),
(6,  1, 'confirmed',  68000.00, '2024-03-20', 'Teak planks + plywood – March restock',          FALSE, 5, NULL),
(7,  2, 'confirmed',  35000.00, '2024-03-22', 'Foam restock for April MTO Sofa batch',          FALSE, 6, NULL),
(8,  3, 'sent',       56000.00, '2024-03-28', 'Fabric – April upholstery run',                  FALSE, 5, NULL),
(9,  4, 'sent',       12000.00, '2024-03-30', 'Screws restock – routine quarterly',             FALSE, 6, NULL),
(10, 5, 'draft',      28500.00, '2024-04-08', 'Glass – Coffee Table MTO batch SO5 + SO12',     FALSE, 5, NULL),
(11,11, 'draft',       9600.00, '2024-04-10', 'Cabinet door handles sourced from Raj Mall',    FALSE, 6, NULL),
(12, 6, 'received',   96000.00, '2024-01-12', 'Plywood – additional stock from Prime Ply',     FALSE, 5, NULL);

-- 14. PURCHASE ORDER LINES
INSERT INTO purchase_order_lines
    (pol_id, po_id, product_id, qty_ordered, qty_received, unit_cost, is_deleted, created_by)
VALUES
(1,  1,  7, 100.000, 100.000,  850.00, FALSE, 5),
(2,  2,  9, 120.000, 120.000,  350.00, FALSE, 5),
(3,  3, 10, 300.000, 300.000,  280.00, FALSE, 6),
(4,  4, 11, 200.000, 200.000,  120.00, FALSE, 5),
(5,  5, 12,  40.000,  40.000,  950.00, FALSE, 6),
(6,  6,  7,  80.000,   0.000,  850.00, FALSE, 5),
(7,  6,  8,  60.000,   0.000, 1200.00, FALSE, 5),
(8,  7,  9, 100.000,   0.000,  350.00, FALSE, 6),
(9,  8, 10, 200.000,   0.000,  280.00, FALSE, 5),
(10, 9, 11, 100.000,   0.000,  120.00, FALSE, 6),
(11,10, 12,  30.000,   0.000,  950.00, FALSE, 5),
(12,12,  8,  80.000,  80.000, 1200.00, FALSE, 5);

-- 15. MANUFACTURING ORDERS
INSERT INTO manufacturing_orders
    (mo_id, product_id, bom_id, so_id, mo_type, status,
     qty_planned, qty_produced, scheduled_date, completed_at,
     is_deleted, created_by, updated_by)
VALUES
(1,  1, 1, NULL, 'MTS', 'done',        25.000, 25.000, '2024-01-12', '2024-01-18 17:00:00', FALSE, 7, NULL),
(2,  2, 2, NULL, 'MTS', 'done',        60.000, 60.000, '2024-01-14', '2024-01-22 16:30:00', FALSE, 7, NULL),
(3,  3, 3, 2,    'MTO', 'done',         6.000,  6.000, '2024-01-28', '2024-02-08 15:00:00', FALSE, 8, NULL),
(4,  5, 5, NULL, 'MTS', 'done',        20.000, 20.000, '2024-02-05', '2024-02-12 16:00:00', FALSE, 7, NULL),
(5,  1, 1, 4,    'MTS', 'in_progress',  5.000,  2.000, '2024-03-10', NULL,                   FALSE, 7, 7),
(6,  6, 6, 5,    'MTO', 'confirmed',   10.000,  0.000, '2024-03-20', NULL,                   FALSE, 8, NULL),
(7,  4, 4, 7,    'MTO', 'draft',        3.000,  0.000, '2024-04-01', NULL,                   FALSE, 7, NULL),
(8,  2, 2, NULL, 'MTS', 'confirmed',   20.000,  0.000, '2024-03-25', NULL,                   FALSE, 8, NULL),
(9,  5, 5, 8,    'MTS', 'draft',        8.000,  0.000, '2024-04-02', NULL,                   FALSE, 7, NULL),
(10, 3, 3, 10,   'MTO', 'confirmed',    2.000,  0.000, '2024-03-22', NULL,                   FALSE, 8, NULL),
(11, 1, 1, 10,   'MTS', 'in_progress',  8.000,  3.000, '2024-03-18', NULL,                   FALSE, 7, 7),
(12, 6, 6, 12,   'MTO', 'draft',        5.000,  0.000, '2024-04-10', NULL,                   FALSE, 8, NULL);

-- 16. WORK ORDERS
INSERT INTO work_orders
    (wo_id, mo_id, operation_id, work_center_id, operation_name,
     status, duration_hours, scheduled_date, started_at, completed_at,
     is_deleted, created_by, updated_by)
VALUES
(1,  1,  1, 1, 'Cut Wood Planks',         'done',        3.00, '2024-01-12', '2024-01-12 08:00:00', '2024-01-12 11:00:00', FALSE, 7, NULL),
(2,  1,  3, 2, 'Frame Assembly',          'done',        6.00, '2024-01-13', '2024-01-13 08:00:00', '2024-01-13 14:00:00', FALSE, 7, NULL),
(3,  2,  2, 1, 'Cut Plywood Sheets',      'done',        4.00, '2024-01-14', '2024-01-14 08:00:00', '2024-01-14 12:00:00', FALSE, 8, NULL),
(4,  2,  7, 6, 'Foam Cutting and Gluing', 'done',        5.00, '2024-01-15', '2024-01-15 08:00:00', '2024-01-15 13:00:00', FALSE, 8, NULL),
(5,  3,  1, 1, 'Cut Wood Planks',         'done',        2.00, '2024-01-28', '2024-01-28 08:00:00', '2024-01-28 10:00:00', FALSE, 7, NULL),
(6,  3,  8, 6, 'Fabric Stitching',        'done',        8.00, '2024-01-29', '2024-01-29 08:00:00', '2024-01-29 16:00:00', FALSE, 8, NULL),
(7,  4,  2, 1, 'Cut Plywood Sheets',      'done',        3.00, '2024-02-05', '2024-02-05 08:00:00', '2024-02-05 11:00:00', FALSE, 7, NULL),
(8,  4,  3, 2, 'Frame Assembly',          'done',        5.00, '2024-02-06', '2024-02-06 08:00:00', '2024-02-06 13:00:00', FALSE, 7, NULL),
(9,  5,  1, 1, 'Cut Wood Planks',         'done',        2.00, '2024-03-10', '2024-03-10 08:00:00', '2024-03-10 10:00:00', FALSE, 7, NULL),
(10, 5,  3, 2, 'Frame Assembly',          'in_progress', 6.00, '2024-03-11', '2024-03-11 08:00:00', NULL,                  FALSE, 7, NULL),
(11, 6,  9, 7, 'Glass Cutting and Fit',   'pending',     3.00, '2024-03-20', NULL,                  NULL,                  FALSE, 8, NULL),
(12, 6, 10, 8, 'Quality Inspection',      'pending',     2.00, '2024-03-21', NULL,                  NULL,                  FALSE, 8, NULL);

-- 17. MO COMPONENTS
INSERT INTO mo_components
    (mo_component_id, mo_id, product_id, bom_line_id,
     qty_planned, qty_consumed, uom, is_available, notes, is_deleted, created_by)
VALUES
(1,  1,  7,  1, 150.000, 150.000, 'Pcs',   TRUE, 'Fully consumed – MO1 complete',   FALSE, 7),
(2,  1,  8,  2,  50.000,  50.000, 'Sheet', TRUE, 'Fully consumed – MO1 complete',   FALSE, 7),
(3,  1, 11,  3,  25.000,  25.000, 'Pack',  TRUE, 'Fully consumed – MO1 complete',   FALSE, 7),
(4,  2,  8,  4,  60.000,  60.000, 'Sheet', TRUE, 'Fully consumed – MO2 complete',   FALSE, 7),
(5,  2,  9,  5, 120.000, 120.000, 'Pcs',   TRUE, 'Fully consumed – MO2 complete',   FALSE, 7),
(6,  2, 10,  6,  90.000,  90.000, 'Metre', TRUE, 'Fully consumed – MO2 complete',   FALSE, 7),
(7,  2, 11,  7,  60.000,  60.000, 'Pack',  TRUE, 'Fully consumed – MO2 complete',   FALSE, 7),
(8,  3,  7,  8,  24.000,  24.000, 'Pcs',   TRUE, 'Fully consumed – MO3 complete',   FALSE, 8),
(9,  3,  9,  9,  60.000,  60.000, 'Pcs',   TRUE, 'Fully consumed – MO3 complete',   FALSE, 8),
(10, 3, 10, 10,  72.000,  72.000, 'Metre', TRUE, 'Fully consumed – MO3 complete',   FALSE, 8),
(11, 3, 11, 11,  12.000,  12.000, 'Pack',  TRUE, 'Fully consumed – MO3 complete',   FALSE, 8),
(12, 5,  7,  1,  30.000,  12.000, 'Pcs',   TRUE, 'Cutting done; assembly ongoing',  FALSE, 7),
(13, 5,  8,  2,  10.000,   4.000, 'Sheet', TRUE, 'Cutting done; assembly ongoing',  FALSE, 7),
(14, 5, 11,  3,   5.000,   0.000, 'Pack',  TRUE, 'Not yet consumed – assembly next',FALSE, 7),
(15, 6,  7, 18,  20.000,   0.000, 'Pcs',   TRUE, 'Stock reserved – awaiting WO',    FALSE, 8),
(16, 6, 12, 19,  10.000,   0.000, 'Sheet', TRUE, 'Glass PO10 pending receipt',      FALSE, 8),
(17, 6, 11, 20,  10.000,   0.000, 'Pack',  FALSE,'Screws PO9 not yet received',     FALSE, 8);

-- 18. STOCK RESERVATIONS
INSERT INTO stock_reservations
    (reservation_id, product_id, so_id, reserved_qty, status,
     is_deleted, created_by, updated_by)
VALUES
(1,  1,  4,  5.000, 'active',   FALSE, 9, NULL),
(2,  5,  4,  3.000, 'active',   FALSE, 9, NULL),
(3,  6,  5, 10.000, 'active',   FALSE, 9, NULL),
(4,  1,  6,  5.000, 'active',   FALSE, 9, NULL),
(5,  2,  6,  6.000, 'active',   FALSE, 9, NULL),
(6,  1, 10,  8.000, 'active',   FALSE, 9, NULL),
(7,  3, 10,  2.000, 'active',   FALSE, 9, NULL),
(8,  5, 11,  5.000, 'active',   FALSE, 9, NULL),
(9,  2, 11,  5.000, 'active',   FALSE, 9, NULL),
(10, 1,  1, 20.000, 'consumed', FALSE, 9, NULL),
(11, 2,  3, 50.000, 'consumed', FALSE, 9, NULL),
(12, 3,  2,  6.000, 'consumed', FALSE, 9, NULL);

-- 19. PROCUREMENT RULES
INSERT INTO procurement_rules
    (rule_id, product_id, strategy, min_stock_qty, reorder_qty,
     preferred_vendor_id, is_active, is_deleted, created_by, updated_by)
VALUES
(1,   1, 'MTS',     5.000,  10.000, NULL, TRUE, FALSE, 9, NULL),
(2,   2, 'MTS',    10.000,  20.000, NULL, TRUE, FALSE, 9, NULL),
(3,   3, 'MTO',     2.000,   5.000, NULL, TRUE, FALSE, 9, NULL),
(4,   4, 'MTO',     2.000,   4.000, NULL, TRUE, FALSE, 9, NULL),
(5,   5, 'MTS',     5.000,  15.000, NULL, TRUE, FALSE, 9, NULL),
(6,   6, 'MTS',     3.000,   8.000, NULL, TRUE, FALSE, 9, NULL),
(7,   7, 'MTS',    50.000, 100.000, 1,   TRUE, FALSE, 9, NULL),
(8,   8, 'MTS',    30.000,  80.000, 1,   TRUE, FALSE, 9, NULL),
(9,   9, 'MTS',    20.000,  60.000, 2,   TRUE, FALSE, 9, NULL),
(10, 10, 'MTS',    50.000, 150.000, 3,   TRUE, FALSE, 9, NULL),
(11, 11, 'MTS',    50.000, 200.000, 4,   TRUE, FALSE, 9, NULL),
(12, 12, 'MTS',    10.000,  30.000, 5,   TRUE, FALSE, 9, NULL);

-- 20. INVENTORY TRANSACTIONS
INSERT INTO inventory_transactions
    (txn_id, product_id, reference_id, reference_type, txn_type,
     qty, qty_before, qty_after, location_id, notes, created_by)
VALUES
(1,   7, NULL, 'OPENING', 'IN',    200.000,   0.000, 200.000,  9, 'Opening balance – Teak Planks',       9),
(2,   8, NULL, 'OPENING', 'IN',    150.000,   0.000, 150.000,  9, 'Opening balance – Plywood Sheets',    9),
(3,   9, NULL, 'OPENING', 'IN',    120.000,   0.000, 120.000, 10, 'Opening balance – Foam Blocks',       9),
(4,  10, NULL, 'OPENING', 'IN',    300.000,   0.000, 300.000, 10, 'Opening balance – Fabric Rolls',      9),
(5,  11, NULL, 'OPENING', 'IN',    250.000,   0.000, 250.000, 11, 'Opening balance – Screws Packs',      9),
(6,  12, NULL, 'OPENING', 'IN',     40.000,   0.000,  40.000, 11, 'Opening balance – Glass Sheets',      9),
(7,   7, 1,    'MO',      'OUT',   150.000, 200.000,  50.000,  9, 'MO1 – Teak Planks consumed',          7),
(8,   8, 1,    'MO',      'OUT',    50.000, 150.000, 100.000,  9, 'MO1 – Plywood consumed',              7),
(9,  11, 1,    'MO',      'OUT',    25.000, 250.000, 225.000, 11, 'MO1 – Screws consumed',               7),
(10,  1, 1,    'MO',      'IN',     25.000,   0.000,  25.000,  6, 'MO1 – 25 Dining Tables into FG',     7),
(11,  8, 2,    'MO',      'OUT',    60.000, 100.000,  40.000,  9, 'MO2 – Plywood consumed',              8),
(12,  9, 2,    'MO',      'OUT',   120.000, 120.000,   0.000, 10, 'MO2 – Foam Blocks consumed',          8),
(13,  2, 2,    'MO',      'IN',     60.000,   0.000,  60.000,  6, 'MO2 – 60 Office Chairs into FG',     8),
(14,  1, 1,    'SO',      'OUT',    20.000,  25.000,   5.000,  8, 'SO1 – 20 Dining Tables dispatched',  3),
(15,  2, 3,    'SO',      'OUT',    50.000,  60.000,  10.000,  8, 'SO3 – 50 Office Chairs dispatched',  4),
(16,  1, 4,    'SO',      'RESERVE', 5.000,   5.000,   5.000,  6, 'SO4 – Dining Tables reserved',       9);

-- 21. AUDIT LOGS
INSERT INTO audit_logs
    (log_id, user_id, table_name, record_id, action, old_values, new_values, ip_address)
VALUES
(1,  1, 'roles',                1,  'INSERT', NULL,
     JSON_OBJECT('name','Admin','permissions','{"access":"full"}'),                            '192.168.10.1'),
(2,  1, 'users',                3,  'INSERT', NULL,
     JSON_OBJECT('name','Amit Patel','role_id',2,'email','amit.sales@shivfurniture.in'),      '192.168.10.1'),
(3,  1, 'partners',             1,  'INSERT', NULL,
     JSON_OBJECT('name','Timber King Supplies','is_vendor',TRUE),                             '192.168.10.1'),
(4,  1, 'partners',             7,  'INSERT', NULL,
     JSON_OBJECT('name','Home Comfort Retailers','is_customer',TRUE),                         '192.168.10.1'),
(5,  3, 'sales_orders',         1,  'INSERT', NULL,
     JSON_OBJECT('customer_id',7,'so_type','MTS','status','draft'),                          '192.168.10.3'),
(6,  3, 'sales_orders',         1,  'UPDATE',
     JSON_OBJECT('status','draft'),       JSON_OBJECT('status','confirmed'),                  '192.168.10.3'),
(7,  3, 'sales_orders',         1,  'UPDATE',
     JSON_OBJECT('status','confirmed'),   JSON_OBJECT('status','done'),                       '192.168.10.3'),
(8,  5, 'purchase_orders',      1,  'INSERT', NULL,
     JSON_OBJECT('vendor_id',1,'status','draft','total_amount',85000),                       '192.168.10.5'),
(9,  5, 'purchase_orders',      1,  'UPDATE',
     JSON_OBJECT('status','draft'),       JSON_OBJECT('status','received'),                   '192.168.10.5'),
(10, 7, 'manufacturing_orders', 1,  'INSERT', NULL,
     JSON_OBJECT('product_id',1,'qty_planned',25,'status','draft'),                          '192.168.10.7'),
(11, 7, 'manufacturing_orders', 1,  'UPDATE',
     JSON_OBJECT('status','draft','qty_produced',0), JSON_OBJECT('status','done','qty_produced',25), '192.168.10.7'),
(12, 9, 'inventory_transactions',10,'INSERT', NULL,
     JSON_OBJECT('product_id',1,'txn_type','IN','qty',25,'qty_after',25),                    '192.168.10.9');

-- 22. PRODUCT VENDORS
INSERT INTO product_vendors
    (pv_id, product_id, partner_id, vendor_product_code,
     unit_cost, lead_time_days, min_order_qty,
     is_preferred, is_active, created_by, updated_by)
VALUES
(1,   7,  1, 'TK-TEAK-6FT',   850.00,  7, 50.000, TRUE,  TRUE,  5, NULL),
(2,   7, 11, 'RFM-WOOD-001',  920.00, 12, 20.000, FALSE, TRUE,  5, NULL),
(3,   8,  1, 'TK-PLY-19MM',  1200.00,  7, 30.000, TRUE,  TRUE,  5, NULL),
(4,   8,  6, 'PP-BWR-8X4',   1200.00,  8, 40.000, FALSE, TRUE,  5, NULL),
(5,   8, 12, 'NVK-PLY-001',  1280.00,  6, 20.000, FALSE, TRUE,  6, NULL),
(6,   9,  2, 'PF-HD-2424',    350.00,  5, 20.000, TRUE,  TRUE,  5, NULL),
(7,   9, 11, 'RFM-FOAM-24',   380.00, 12, 10.000, FALSE, TRUE,  5, NULL),
(8,  10,  3, 'GFH-GREY-54',   280.00,  6, 50.000, TRUE,  TRUE,  5, NULL),
(9,  10, 12, 'NVK-FAB-GRY',   295.00,  5, 30.000, FALSE, TRUE,  6, NULL),
(10, 11,  4, 'FF-AST-100PC',  120.00,  3, 50.000, TRUE,  TRUE,  5, NULL),
(11, 11, 11, 'RFM-HW-100PC',  130.00, 10, 25.000, FALSE, TRUE,  6, NULL),
(12, 12,  5, 'SG-TEMP-3X2',   950.00,  4, 10.000, TRUE,  TRUE,  5, NULL),
(13, 12,  6, 'PP-GLASS-3X2',  980.00,  9, 10.000, FALSE, TRUE,  6, NULL);

SET FOREIGN_KEY_CHECKS = 1;
