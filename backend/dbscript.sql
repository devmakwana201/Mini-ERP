-- ============================================================
-- MINI ERP SYSTEM — MySQL Schema  (v2)
-- Tables: 19 | Engine: InnoDB | Charset: utf8mb4
-- Changes from v1:
--   • is_deleted  BOOLEAN added to all business-entity tables
--   • created_by / updated_by added where a user is responsible
--   • INDEX on is_deleted added to every table that has it
-- ============================================================

CREATE DATABASE IF NOT EXISTS mini_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mini_erp;

-- ============================================================
-- 1. ROLES
--    • created_by / updated_by — system bootstrap, so nullable
--    • is_deleted              — yes, roles can be soft-deleted
-- ============================================================
CREATE TABLE roles (
    role_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL UNIQUE,
    permissions JSON,

    is_deleted  BOOLEAN      NOT NULL DEFAULT FALSE,

    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    created_by  INT UNSIGNED NULL,                    -- NULL for seed/system roles
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by  INT UNSIGNED NULL,

    INDEX idx_roles_deleted (is_deleted)
) ENGINE=InnoDB;

-- ============================================================
-- 2. USERS
--    • created_by / updated_by — nullable (first admin has no creator)
--    • is_deleted              — soft-delete instead of hard purge
-- ============================================================
CREATE TABLE users (
    user_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_id       INT UNSIGNED NOT NULL,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    status        ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',

    is_deleted    BOOLEAN      NOT NULL DEFAULT FALSE,

    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    created_by    INT UNSIGNED NULL,
    updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by    INT UNSIGNED NULL,

    CONSTRAINT fk_users_role       FOREIGN KEY (role_id)    REFERENCES roles  (role_id),
    CONSTRAINT fk_users_created_by FOREIGN KEY (created_by) REFERENCES users  (user_id) ON DELETE SET NULL,
    CONSTRAINT fk_users_updated_by FOREIGN KEY (updated_by) REFERENCES users  (user_id) ON DELETE SET NULL,

    INDEX idx_users_email   (email),
    INDEX idx_users_role    (role_id),
    INDEX idx_users_status  (status),
    INDEX idx_users_deleted (is_deleted)
) ENGINE=InnoDB;

-- ============================================================
-- 3. VENDORS
-- ============================================================
CREATE TABLE vendors (
    vendor_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name           VARCHAR(150) NOT NULL,
    email          VARCHAR(150),
    phone          VARCHAR(20),
    address        TEXT,
    lead_time_days INT UNSIGNED DEFAULT 0,
    is_active      BOOLEAN      NOT NULL DEFAULT TRUE,

    is_deleted     BOOLEAN      NOT NULL DEFAULT FALSE,

    created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    created_by     INT UNSIGNED NULL,
    updated_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by     INT UNSIGNED NULL,

    CONSTRAINT fk_vendors_created_by FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE SET NULL,
    CONSTRAINT fk_vendors_updated_by FOREIGN KEY (updated_by) REFERENCES users (user_id) ON DELETE SET NULL,

    INDEX idx_vendors_name    (name),
    INDEX idx_vendors_deleted (is_deleted)
) ENGINE=InnoDB;

-- ============================================================
-- 4. CUSTOMERS
-- ============================================================
CREATE TABLE customers (
    customer_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    email       VARCHAR(150),
    phone       VARCHAR(20),
    address     TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,

    is_deleted  BOOLEAN      NOT NULL DEFAULT FALSE,

    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    created_by  INT UNSIGNED NULL,
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by  INT UNSIGNED NULL,

    CONSTRAINT fk_customers_created_by FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE SET NULL,
    CONSTRAINT fk_customers_updated_by FOREIGN KEY (updated_by) REFERENCES users (user_id) ON DELETE SET NULL,

    INDEX idx_customers_name    (name),
    INDEX idx_customers_email   (email),
    INDEX idx_customers_deleted (is_deleted)
) ENGINE=InnoDB;

-- ============================================================
-- 5. PRODUCTS
-- ============================================================
CREATE TABLE products (
    product_id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_code         VARCHAR(50)  NOT NULL UNIQUE,
    product_name         VARCHAR(200) NOT NULL,
    description          TEXT,
    product_type         ENUM('storable', 'consumable', 'service') NOT NULL DEFAULT 'storable',
    procurement_type     ENUM('buy', 'manufacture', 'both')        NOT NULL DEFAULT 'buy',
    procurement_strategy ENUM('MTS', 'MTO', 'MTS_MTO')            NOT NULL DEFAULT 'MTS',
    vendor_id            INT UNSIGNED,
    bom_id               INT UNSIGNED,              -- FK added after bom table
    sales_price          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    cost_price           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    uom                  VARCHAR(20)   NOT NULL DEFAULT 'Unit',
    on_hand_qty          DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    reserved_qty         DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    free_to_use_qty      DECIMAL(12,3) GENERATED ALWAYS AS (on_hand_qty - reserved_qty) STORED,
    min_stock_qty        DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    is_active            BOOLEAN       NOT NULL DEFAULT TRUE,

    is_deleted           BOOLEAN       NOT NULL DEFAULT FALSE,

    created_at           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    created_by           INT UNSIGNED  NULL,
    updated_at           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by           INT UNSIGNED  NULL,

    CONSTRAINT fk_products_vendor     FOREIGN KEY (vendor_id)  REFERENCES vendors (vendor_id) ON DELETE SET NULL,
    CONSTRAINT fk_products_created_by FOREIGN KEY (created_by) REFERENCES users   (user_id)   ON DELETE SET NULL,
    CONSTRAINT fk_products_updated_by FOREIGN KEY (updated_by) REFERENCES users   (user_id)   ON DELETE SET NULL,

    INDEX idx_products_code     (product_code),
    INDEX idx_products_name     (product_name),
    INDEX idx_products_type     (product_type),
    INDEX idx_products_strategy (procurement_strategy),
    INDEX idx_products_vendor   (vendor_id),
    INDEX idx_products_active   (is_active),
    INDEX idx_products_deleted  (is_deleted)
) ENGINE=InnoDB;

-- ============================================================
-- 6. BOM (Bill of Materials — header)
-- ============================================================
CREATE TABLE bom (
    bom_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED  NOT NULL,
    bom_name   VARCHAR(200),
    qty        DECIMAL(12,3) NOT NULL DEFAULT 1.000,
    bom_type   ENUM('manufacture', 'kit', 'subcontract') NOT NULL DEFAULT 'manufacture',
    is_active  BOOLEAN       NOT NULL DEFAULT TRUE,

    is_deleted BOOLEAN       NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    created_by INT UNSIGNED  NULL,
    updated_at TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT UNSIGNED  NULL,

    CONSTRAINT fk_bom_product     FOREIGN KEY (product_id) REFERENCES products (product_id) ON DELETE CASCADE,
    CONSTRAINT fk_bom_created_by  FOREIGN KEY (created_by) REFERENCES users    (user_id)    ON DELETE SET NULL,
    CONSTRAINT fk_bom_updated_by  FOREIGN KEY (updated_by) REFERENCES users    (user_id)    ON DELETE SET NULL,

    INDEX idx_bom_product (product_id),
    INDEX idx_bom_deleted (is_deleted)
) ENGINE=InnoDB;

-- Back-fill products.bom_id FK
ALTER TABLE products
    ADD CONSTRAINT fk_products_bom
    FOREIGN KEY (bom_id) REFERENCES bom (bom_id) ON DELETE SET NULL;

-- ============================================================
-- 7. BOM_LINES
--    • is_deleted  — NO  (cascade with parent bom)
--    • updated_by  — NO  (line items aren't independently edited)
--    • created_by  — YES (who added this component)
-- ============================================================
CREATE TABLE bom_lines (
    bom_line_id  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    bom_id       INT UNSIGNED  NOT NULL,
    component_id INT UNSIGNED  NOT NULL,
    qty          DECIMAL(12,3) NOT NULL DEFAULT 1.000,
    uom          VARCHAR(20)   NOT NULL DEFAULT 'Unit',

    created_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    created_by   INT UNSIGNED  NULL,

    CONSTRAINT fk_bomlines_bom        FOREIGN KEY (bom_id)       REFERENCES bom      (bom_id)     ON DELETE CASCADE,
    CONSTRAINT fk_bomlines_component  FOREIGN KEY (component_id) REFERENCES products (product_id),
    CONSTRAINT fk_bomlines_created_by FOREIGN KEY (created_by)   REFERENCES users    (user_id)    ON DELETE SET NULL,

    UNIQUE KEY uq_bom_component (bom_id, component_id),
    INDEX idx_bomlines_bom       (bom_id),
    INDEX idx_bomlines_component (component_id)
) ENGINE=InnoDB;

-- ============================================================
-- 8. SALES_ORDERS (header)
-- ============================================================
CREATE TABLE sales_orders (
    so_id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id   INT UNSIGNED  NOT NULL,
    so_type       ENUM('MTS', 'MTO')                                                      NOT NULL DEFAULT 'MTS',
    status        ENUM('draft', 'confirmed', 'in_progress', 'done', 'cancelled')          NOT NULL DEFAULT 'draft',
    total_amount  DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    delivery_date DATE,
    notes         TEXT,

    is_deleted    BOOLEAN       NOT NULL DEFAULT FALSE,

    created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    created_by    INT UNSIGNED  NOT NULL,
    updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by    INT UNSIGNED  NULL,

    CONSTRAINT fk_so_customer   FOREIGN KEY (customer_id) REFERENCES customers (customer_id),
    CONSTRAINT fk_so_created_by FOREIGN KEY (created_by)  REFERENCES users     (user_id),
    CONSTRAINT fk_so_updated_by FOREIGN KEY (updated_by)  REFERENCES users     (user_id) ON DELETE SET NULL,

    INDEX idx_so_customer  (customer_id),
    INDEX idx_so_status    (status),
    INDEX idx_so_type      (so_type),
    INDEX idx_so_created   (created_at),
    INDEX idx_so_deleted   (is_deleted)
) ENGINE=InnoDB;

-- ============================================================
-- 9. SALES_ORDER_LINES
--    • is_deleted  — NO  (cascade with SO)
--    • updated_by  — NO  (lines deleted & re-added, not edited)
--    • created_by  — YES (who added the line)
-- ============================================================
CREATE TABLE sales_order_lines (
    sol_id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    so_id         INT UNSIGNED  NOT NULL,
    product_id    INT UNSIGNED  NOT NULL,
    qty           DECIMAL(12,3) NOT NULL,
    unit_price    DECIMAL(12,2) NOT NULL,
    subtotal      DECIMAL(14,2) GENERATED ALWAYS AS (qty * unit_price) STORED,
    reserved_qty  DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    delivered_qty DECIMAL(12,3) NOT NULL DEFAULT 0.000,

    created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    created_by    INT UNSIGNED  NULL,

    CONSTRAINT fk_sol_so         FOREIGN KEY (so_id)      REFERENCES sales_orders (so_id)      ON DELETE CASCADE,
    CONSTRAINT fk_sol_product    FOREIGN KEY (product_id) REFERENCES products     (product_id),
    CONSTRAINT fk_sol_created_by FOREIGN KEY (created_by) REFERENCES users        (user_id)    ON DELETE SET NULL,

    INDEX idx_sol_so      (so_id),
    INDEX idx_sol_product (product_id)
) ENGINE=InnoDB;

-- ============================================================
-- 10. PURCHASE_ORDERS (header)
-- ============================================================
CREATE TABLE purchase_orders (
    po_id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vendor_id     INT UNSIGNED  NOT NULL,
    status        ENUM('draft', 'sent', 'confirmed', 'received', 'cancelled') NOT NULL DEFAULT 'draft',
    total_amount  DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    expected_date DATE,
    notes         TEXT,

    is_deleted    BOOLEAN       NOT NULL DEFAULT FALSE,

    created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    created_by    INT UNSIGNED  NOT NULL,
    updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by    INT UNSIGNED  NULL,

    CONSTRAINT fk_po_vendor     FOREIGN KEY (vendor_id)  REFERENCES vendors (vendor_id),
    CONSTRAINT fk_po_created_by FOREIGN KEY (created_by) REFERENCES users   (user_id),
    CONSTRAINT fk_po_updated_by FOREIGN KEY (updated_by) REFERENCES users   (user_id) ON DELETE SET NULL,

    INDEX idx_po_vendor  (vendor_id),
    INDEX idx_po_status  (status),
    INDEX idx_po_created (created_at),
    INDEX idx_po_deleted (is_deleted)
) ENGINE=InnoDB;

-- ============================================================
-- 11. PURCHASE_ORDER_LINES
--    • is_deleted / updated_by — NO (cascade with PO)
--    • created_by              — YES
-- ============================================================
CREATE TABLE purchase_order_lines (
    pol_id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    po_id         INT UNSIGNED  NOT NULL,
    product_id    INT UNSIGNED  NOT NULL,
    qty_ordered   DECIMAL(12,3) NOT NULL,
    qty_received  DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    unit_cost     DECIMAL(12,2) NOT NULL,
    subtotal      DECIMAL(14,2) GENERATED ALWAYS AS (qty_ordered * unit_cost) STORED,

    created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    created_by    INT UNSIGNED  NULL,

    CONSTRAINT fk_pol_po         FOREIGN KEY (po_id)      REFERENCES purchase_orders (po_id)      ON DELETE CASCADE,
    CONSTRAINT fk_pol_product    FOREIGN KEY (product_id) REFERENCES products        (product_id),
    CONSTRAINT fk_pol_created_by FOREIGN KEY (created_by) REFERENCES users           (user_id)    ON DELETE SET NULL,

    INDEX idx_pol_po      (po_id),
    INDEX idx_pol_product (product_id)
) ENGINE=InnoDB;

-- ============================================================
-- 12. MANUFACTURING_ORDERS
-- ============================================================
CREATE TABLE manufacturing_orders (
    mo_id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id     INT UNSIGNED  NOT NULL,
    bom_id         INT UNSIGNED  NOT NULL,
    so_id          INT UNSIGNED  NULL,
    mo_type        ENUM('MTS', 'MTO')                                            NOT NULL DEFAULT 'MTS',
    status         ENUM('draft', 'confirmed', 'in_progress', 'done', 'cancelled') NOT NULL DEFAULT 'draft',
    qty_planned    DECIMAL(12,3) NOT NULL,
    qty_produced   DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    scheduled_date DATE,
    completed_at   TIMESTAMP     NULL,

    is_deleted     BOOLEAN       NOT NULL DEFAULT FALSE,

    created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    created_by     INT UNSIGNED  NOT NULL,
    updated_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by     INT UNSIGNED  NULL,

    CONSTRAINT fk_mo_product    FOREIGN KEY (product_id) REFERENCES products          (product_id),
    CONSTRAINT fk_mo_bom        FOREIGN KEY (bom_id)     REFERENCES bom               (bom_id),
    CONSTRAINT fk_mo_so         FOREIGN KEY (so_id)      REFERENCES sales_orders      (so_id)    ON DELETE SET NULL,
    CONSTRAINT fk_mo_created_by FOREIGN KEY (created_by) REFERENCES users             (user_id),
    CONSTRAINT fk_mo_updated_by FOREIGN KEY (updated_by) REFERENCES users             (user_id)  ON DELETE SET NULL,

    INDEX idx_mo_product  (product_id),
    INDEX idx_mo_so       (so_id),
    INDEX idx_mo_status   (status),
    INDEX idx_mo_type     (mo_type),
    INDEX idx_mo_schedule (scheduled_date),
    INDEX idx_mo_deleted  (is_deleted)
) ENGINE=InnoDB;

-- ============================================================
-- 13. WORK_ORDERS
-- ============================================================
CREATE TABLE work_orders (
    wo_id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    mo_id          INT UNSIGNED  NOT NULL,
    operation_name VARCHAR(150)  NOT NULL,
    status         ENUM('pending', 'in_progress', 'done', 'cancelled') NOT NULL DEFAULT 'pending',
    duration_hours DECIMAL(8,2),
    scheduled_date DATE,
    started_at     TIMESTAMP     NULL,
    completed_at   TIMESTAMP     NULL,

    is_deleted     BOOLEAN       NOT NULL DEFAULT FALSE,

    created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    created_by     INT UNSIGNED  NULL,
    updated_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by     INT UNSIGNED  NULL,

    CONSTRAINT fk_wo_mo         FOREIGN KEY (mo_id)      REFERENCES manufacturing_orders (mo_id) ON DELETE CASCADE,
    CONSTRAINT fk_wo_created_by FOREIGN KEY (created_by) REFERENCES users                (user_id) ON DELETE SET NULL,
    CONSTRAINT fk_wo_updated_by FOREIGN KEY (updated_by) REFERENCES users                (user_id) ON DELETE SET NULL,

    INDEX idx_wo_mo      (mo_id),
    INDEX idx_wo_status  (status),
    INDEX idx_wo_deleted (is_deleted)
) ENGINE=InnoDB;

-- ============================================================
-- 14. INVENTORY_TRANSACTIONS
--    Immutable ledger — NO is_deleted, NO updated_at/updated_by
--    created_by already present (the user who triggered the txn)
-- ============================================================
CREATE TABLE inventory_transactions (
    txn_id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id     INT UNSIGNED  NOT NULL,
    reference_id   INT UNSIGNED  NULL,
    reference_type ENUM('SO', 'PO', 'MO', 'ADJUSTMENT', 'RETURN', 'OPENING') NOT NULL,
    txn_type       ENUM('IN', 'OUT', 'RESERVE', 'UNRESERVE', 'ADJUST')        NOT NULL,
    qty            DECIMAL(12,3) NOT NULL,
    qty_before     DECIMAL(12,3) NOT NULL,
    qty_after      DECIMAL(12,3) NOT NULL,
    location_id    INT UNSIGNED  NULL,
    notes          TEXT,

    created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    created_by     INT UNSIGNED  NOT NULL,

    CONSTRAINT fk_txn_product    FOREIGN KEY (product_id) REFERENCES products (product_id),
    CONSTRAINT fk_txn_created_by FOREIGN KEY (created_by) REFERENCES users    (user_id),

    INDEX idx_txn_product (product_id),
    INDEX idx_txn_ref     (reference_type, reference_id),
    INDEX idx_txn_type    (txn_type),
    INDEX idx_txn_created (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- 15. STOCK_RESERVATIONS
-- ============================================================
CREATE TABLE stock_reservations (
    reservation_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id     INT UNSIGNED  NOT NULL,
    so_id          INT UNSIGNED  NOT NULL,
    reserved_qty   DECIMAL(12,3) NOT NULL,
    status         ENUM('active', 'released', 'consumed') NOT NULL DEFAULT 'active',

    is_deleted     BOOLEAN       NOT NULL DEFAULT FALSE,

    created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    created_by     INT UNSIGNED  NULL,
    updated_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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
-- 16. PROCUREMENT_RULES
-- ============================================================
CREATE TABLE procurement_rules (
    rule_id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id          INT UNSIGNED  NOT NULL UNIQUE,
    strategy            ENUM('MTS', 'MTO', 'MTS_MTO') NOT NULL DEFAULT 'MTS',
    min_stock_qty       DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    reorder_qty         DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    preferred_vendor_id INT UNSIGNED  NULL,
    is_active           BOOLEAN       NOT NULL DEFAULT TRUE,

    is_deleted          BOOLEAN       NOT NULL DEFAULT FALSE,

    created_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    created_by          INT UNSIGNED  NULL,
    updated_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by          INT UNSIGNED  NULL,

    CONSTRAINT fk_rule_product    FOREIGN KEY (product_id)          REFERENCES products (product_id) ON DELETE CASCADE,
    CONSTRAINT fk_rule_vendor     FOREIGN KEY (preferred_vendor_id) REFERENCES vendors  (vendor_id)  ON DELETE SET NULL,
    CONSTRAINT fk_rule_created_by FOREIGN KEY (created_by)          REFERENCES users    (user_id)    ON DELETE SET NULL,
    CONSTRAINT fk_rule_updated_by FOREIGN KEY (updated_by)          REFERENCES users    (user_id)    ON DELETE SET NULL,

    INDEX idx_rule_strategy (strategy),
    INDEX idx_rule_active   (is_active),
    INDEX idx_rule_deleted  (is_deleted)
) ENGINE=InnoDB;

-- ============================================================
-- 17. WAREHOUSES
-- ============================================================
CREATE TABLE warehouses (
    warehouse_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(150) NOT NULL UNIQUE,
    address      TEXT,
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,

    is_deleted   BOOLEAN      NOT NULL DEFAULT FALSE,

    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    created_by   INT UNSIGNED NULL,
    updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by   INT UNSIGNED NULL,

    CONSTRAINT fk_wh_created_by FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE SET NULL,
    CONSTRAINT fk_wh_updated_by FOREIGN KEY (updated_by) REFERENCES users (user_id) ON DELETE SET NULL,

    INDEX idx_wh_deleted (is_deleted)
) ENGINE=InnoDB;

-- ============================================================
-- 18. STOCK_LOCATIONS
-- ============================================================
CREATE TABLE stock_locations (
    location_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    warehouse_id  INT UNSIGNED NOT NULL,
    name          VARCHAR(100) NOT NULL,
    code          VARCHAR(50)  NOT NULL UNIQUE,
    location_type ENUM('input', 'storage', 'output', 'quality', 'scrap') NOT NULL DEFAULT 'storage',

    is_deleted    BOOLEAN      NOT NULL DEFAULT FALSE,

    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    created_by    INT UNSIGNED NULL,
    updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by    INT UNSIGNED NULL,

    CONSTRAINT fk_loc_warehouse  FOREIGN KEY (warehouse_id) REFERENCES warehouses (warehouse_id) ON DELETE CASCADE,
    CONSTRAINT fk_loc_created_by FOREIGN KEY (created_by)   REFERENCES users      (user_id)      ON DELETE SET NULL,
    CONSTRAINT fk_loc_updated_by FOREIGN KEY (updated_by)   REFERENCES users      (user_id)      ON DELETE SET NULL,

    INDEX idx_loc_warehouse (warehouse_id),
    INDEX idx_loc_code      (code),
    INDEX idx_loc_deleted   (is_deleted)
) ENGINE=InnoDB;

-- ============================================================
-- 19. AUDIT_LOGS
--    Append-only log — NO is_deleted, NO updated_at/updated_by
--    user_id = the actor; no created_by duplicate needed
-- ============================================================
CREATE TABLE audit_logs (
    log_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id    INT UNSIGNED  NOT NULL,
    table_name VARCHAR(100)  NOT NULL,
    record_id  INT UNSIGNED  NOT NULL,
    action     ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),

    created_at TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users (user_id),

    INDEX idx_audit_user    (user_id),
    INDEX idx_audit_table   (table_name),
    INDEX idx_audit_record  (table_name, record_id),
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- 20. WORK_CENTERS
--     A physical or logical station where operations are performed.
--     e.g. "Welding Station", "Assembly Line 1", "QC Bench"
--     Referenced by: operations
-- ============================================================
CREATE TABLE work_centers (
    work_center_id   INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    name             VARCHAR(150)  NOT NULL UNIQUE,
    code             VARCHAR(50)   NOT NULL UNIQUE,       -- short internal code, e.g. WC-001
    description      TEXT,
    capacity_per_day DECIMAL(8,2)  NOT NULL DEFAULT 8.00, -- available hours/day
    cost_per_hour    DECIMAL(10,2) NOT NULL DEFAULT 0.00, -- for manufacturing cost calc
    is_active        BOOLEAN       NOT NULL DEFAULT TRUE,

    is_deleted       BOOLEAN       NOT NULL DEFAULT FALSE,

    created_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    created_by       INT UNSIGNED  NULL,
    updated_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by       INT UNSIGNED  NULL,

    CONSTRAINT fk_wc_created_by FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE SET NULL,
    CONSTRAINT fk_wc_updated_by FOREIGN KEY (updated_by) REFERENCES users (user_id) ON DELETE SET NULL,

    INDEX idx_wc_code    (code),
    INDEX idx_wc_active  (is_active),
    INDEX idx_wc_deleted (is_deleted)
) ENGINE=InnoDB;

-- ============================================================
-- 21. OPERATIONS
--     A reusable process-step template assigned to a Work Center.
--     e.g. "Cut Steel Plate", "Weld Frame", "Final QC Check"
--     Referenced by: bom_lines (which operations a BOM needs)
--                    work_orders (the actual execution of an operation)
-- ============================================================
CREATE TABLE operations (
    operation_id     INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    work_center_id   INT UNSIGNED  NOT NULL,
    name             VARCHAR(150)  NOT NULL,
    code             VARCHAR(50)   NOT NULL UNIQUE,       -- e.g. OP-CUT-001
    description      TEXT,
    duration_minutes DECIMAL(8,2)  NOT NULL DEFAULT 0.00, -- standard time per cycle
    is_active        BOOLEAN       NOT NULL DEFAULT TRUE,

    is_deleted       BOOLEAN       NOT NULL DEFAULT FALSE,

    created_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    created_by       INT UNSIGNED  NULL,
    updated_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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
-- 22. MO_COMPONENTS  (Manufacturing Order — Component Lines)
--     Created by exploding the BOM when an MO is confirmed.
--     Tracks planned qty (from BOM) vs actual consumed qty.
--     One row per component per MO.
-- ============================================================
CREATE TABLE mo_components (
    mo_component_id INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    mo_id           INT UNSIGNED  NOT NULL,
    product_id      INT UNSIGNED  NOT NULL,   -- the component/raw material
    bom_line_id     INT UNSIGNED  NULL,       -- source BOM line (NULL if added manually)
    qty_planned     DECIMAL(12,3) NOT NULL,   -- exploded from BOM at MO creation
    qty_consumed    DECIMAL(12,3) NOT NULL DEFAULT 0.000,  -- actual usage recorded
    uom             VARCHAR(20)   NOT NULL DEFAULT 'Unit',
    is_available    BOOLEAN       NOT NULL DEFAULT FALSE,  -- set TRUE when stock confirmed
    notes           TEXT,

    -- no is_deleted: cascade-deleted with MO
    -- no updated_by: consumed qty is updated by system on Work Order completion

    created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    created_by      INT UNSIGNED  NULL,       -- user who confirmed/exploded the MO
    updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_moc_mo         FOREIGN KEY (mo_id)       REFERENCES manufacturing_orders (mo_id)       ON DELETE CASCADE,
    CONSTRAINT fk_moc_product    FOREIGN KEY (product_id)  REFERENCES products             (product_id),
    CONSTRAINT fk_moc_bom_line   FOREIGN KEY (bom_line_id) REFERENCES bom_lines            (bom_line_id) ON DELETE SET NULL,
    CONSTRAINT fk_moc_created_by FOREIGN KEY (created_by)  REFERENCES users                (user_id)     ON DELETE SET NULL,

    UNIQUE KEY uq_mo_component (mo_id, product_id),  -- one row per component per MO

    INDEX idx_moc_mo        (mo_id),
    INDEX idx_moc_product   (product_id),
    INDEX idx_moc_bom_line  (bom_line_id),
    INDEX idx_moc_available (is_available)
) ENGINE=InnoDB;

-- ============================================================
-- Deferred FKs (tables that needed to exist first)
-- ============================================================

-- inventory_transactions → stock_locations
ALTER TABLE inventory_transactions
    ADD CONSTRAINT fk_txn_location
    FOREIGN KEY (location_id) REFERENCES stock_locations (location_id) ON DELETE SET NULL;

-- work_orders → operations  (link each WO to the operation template it executes)
ALTER TABLE work_orders
    ADD COLUMN  operation_id   INT UNSIGNED NULL AFTER mo_id,
    ADD COLUMN  work_center_id INT UNSIGNED NULL AFTER operation_id,
    ADD CONSTRAINT fk_wo_operation   FOREIGN KEY (operation_id)   REFERENCES operations   (operation_id)   ON DELETE SET NULL,
    ADD CONSTRAINT fk_wo_work_center FOREIGN KEY (work_center_id) REFERENCES work_centers (work_center_id) ON DELETE SET NULL,
    ADD INDEX idx_wo_operation   (operation_id),
    ADD INDEX idx_wo_work_center (work_center_id);

-- bom_lines → operations  (which operation does this component feed into?)
ALTER TABLE bom_lines
    ADD COLUMN operation_id INT UNSIGNED NULL AFTER uom,
    ADD CONSTRAINT fk_bomline_operation FOREIGN KEY (operation_id) REFERENCES operations (operation_id) ON DELETE SET NULL,
    ADD INDEX idx_bomline_operation (operation_id);

-- ============================================================
-- END OF SCHEMA  v3  (22 tables)
-- ============================================================
