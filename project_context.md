# Project Context: m-erp (Mini ERP System)

This document provides a comprehensive, in-depth technical analysis and description of the **m-erp** (Mini ERP) system. It outlines the technology stack, application architecture, active database schema, system workflows, configurations, and quirks.

---

## 1. Project Overview & Architecture

**m-erp** is a Mini Enterprise Resource Planning (ERP) web application designed to manage business workflows. It is divided into two primary subsystems located in the root workspace:
1. `backend/`: A RESTful Node.js + Express API server querying a MySQL database, managing business logic, validating transactions, and executing cron jobs.
2. `frontend/`: A Vite-powered React Single Page Application (SPA) utilizing TailwindCSS v4 and PrimeReact v10 for a high-performance administration dashboard.

```mermaid
graph TD
    subgraph Client Panel (Frontend React App)
        FE[Vite SPA + React 19]
        PR[PrimeReact UI + Tailwind CSS v4]
        RT[Redux Toolkit State]
        RC[React Router v7]
    end

    subgraph Service Layer (Backend API Server)
        BE[Express.js App]
        JWT[JWT Auth Middleware]
        JOI[Joi Body Validation]
        CRON[Node-Cron Scheduler]
        LOG[Winston logger]
    end

    subgraph Storage Layer (MySQL DB)
        DB[(MySQL Database: MINI_ERP1)]
    end

    FE -->|API requests + JWT Header| BE
    BE -->|Authentication verify| JWT
    BE -->|Joi Validator schemas| JOI
    BE -->|mysql2 raw SQL connection pool| DB
    CRON -->|Database Backups & Cleanups| DB
```

---

## 2. Technology Stack

### Backend
- **Runtime**: Node.js (v20+)
- **Framework**: Express.js
- **Database Connector**: `mysql2` (utilizing a promise-based connection pool with thread-safe AsyncLocalStorage for transactions)
- **Authentication**: JWT (`jsonwebtoken`) for Access and Refresh Tokens, `bcrypt` for password hashing (10 rounds)
- **Validation**: Joi (v17.13.3) Joi Schema Validations
- **Logging**: Winston (v3.14.2) with daily logs rotation
- **Job Scheduler**: `node-cron`
- **Template Engine**: EJS (primarily for database backup and email layouts)

### Frontend
- **Framework**: React 19 (Vite 6 SPA)
- **Routing**: React Router DOM (v7)
- **State Management**: Redux Toolkit (v2.8) & React Context API
- **Styling & UI**: TailwindCSS v4 + PrimeReact (v10.9)
- **HTTP Client**: Axios (configured with interceptors to inject JWT headers and handle expired sessions)
- **Localization**: `i18next` (support for English `en` and Arabic `ar` locales)

---

## 3. Database Schema (Active Schema: 25 Tables in `MINI_ERP1`)

The database utilizes the **InnoDB** engine and `utf8mb4_unicode_ci` collation. Soft deletion is applied across all entity tables using the `is_deleted` (BOOLEAN) column. Below is an exhaustive structural map of all 25 tables.

### 3.1. User Management & Authentication

#### 1. `roles`
Stores roles and permissions rules in a JSON format.
- `role_id` (INT UNSIGNED AUTO_INCREMENT PRIMARY KEY)
- `name` (VARCHAR(50) NOT NULL UNIQUE)
- `permissions` (JSON) - Dictates granular read/write access per module (e.g. `{"users": {"view": true, "create": true}}`)
- `is_deleted` (BOOLEAN NOT NULL DEFAULT FALSE)
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- `created_by` (INT UNSIGNED NULL)
- `updated_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)
- `updated_by` (INT UNSIGNED NULL)
- *Indexes*: `idx_roles_deleted` (`is_deleted`)

#### 2. `users`
Tracks user login credentials, emails, and active role reference.
- `user_id` (INT UNSIGNED AUTO_INCREMENT PRIMARY KEY)
- `role_id` (INT UNSIGNED NOT NULL, FOREIGN KEY to `roles.role_id`)
- `name` (VARCHAR(100) NOT NULL) - Used as the login ID username
- `email` (VARCHAR(150) NOT NULL UNIQUE)
- `password_hash` (VARCHAR(255) NOT NULL)
- `status` (ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active')
- `is_deleted` (BOOLEAN NOT NULL DEFAULT FALSE)
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- `created_by` (INT UNSIGNED NULL, FOREIGN KEY to `users.user_id` ON DELETE SET NULL)
- `updated_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)
- `updated_by` (INT UNSIGNED NULL, FOREIGN KEY to `users.user_id` ON DELETE SET NULL)
- *Indexes*: `idx_users_email` (`email`), `idx_users_role` (`role_id`), `idx_users_status` (`status`), `idx_users_deleted` (`is_deleted`)

#### 3. `user_jwt_tokens`
Active JWT access tokens to allow multi-device logins and invalidate specific sessions.
- `token_id` (INT UNSIGNED AUTO_INCREMENT PRIMARY KEY)
- `user_id` (INT UNSIGNED NOT NULL, FOREIGN KEY to `users.user_id` ON DELETE CASCADE)
- `token` (TEXT NOT NULL)
- `expiry` (DATETIME NOT NULL)
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- *Indexes*: `idx_jwt_user` (`user_id`), `idx_jwt_expiry` (`expiry`)

#### 4. `password_reset_tokens`
Temporary tokens for password recovery.
- `token_id` (INT UNSIGNED AUTO_INCREMENT PRIMARY KEY)
- `email` (VARCHAR(150) NOT NULL)
- `token` (VARCHAR(255) NOT NULL UNIQUE)
- `expiry` (DATETIME NOT NULL)
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- *Indexes*: `idx_prt_email` (`email`), `idx_prt_token` (`token`), `idx_prt_expiry` (`expiry`)

#### 5. `login_logs`
Tracks login activities and user agents.
- `log_id` (INT UNSIGNED AUTO_INCREMENT PRIMARY KEY)
- `user_id` (INT UNSIGNED NOT NULL, FOREIGN KEY to `users.user_id` ON DELETE CASCADE)
- `login_at` (DATETIME NOT NULL)
- `logout_at` (DATETIME NULL)
- `ip_address` (VARCHAR(45))
- `user_agent` (TEXT)
- *Indexes*: `idx_ll_user` (`user_id`), `idx_ll_login` (`login_at`)

---

### 3.2. Contacts & Catalog Master

#### 6. `vendors`
Supplier directory.
- `vendor_id` (INT UNSIGNED AUTO_INCREMENT PRIMARY KEY)
- `name` (VARCHAR(150) NOT NULL)
- `email` (VARCHAR(150))
- `phone` (VARCHAR(20))
- `address` (TEXT)
- `lead_time_days` (INT UNSIGNED DEFAULT 0)
- `is_active` (BOOLEAN NOT NULL DEFAULT TRUE)
- `is_deleted` (BOOLEAN NOT NULL DEFAULT FALSE)
- `created_at`, `created_by`, `updated_at`, `updated_by`
- *Indexes*: `idx_vendors_name` (`name`), `idx_vendors_deleted` (`is_deleted`)

#### 7. `customers`
Client database.
- `customer_id` (INT UNSIGNED AUTO_INCREMENT PRIMARY KEY)
- `name` (VARCHAR(150) NOT NULL)
- `email` (VARCHAR(150))
- `phone` (VARCHAR(20))
- `address` (TEXT)
- `is_active` (BOOLEAN NOT NULL DEFAULT TRUE)
- `is_deleted` (BOOLEAN NOT NULL DEFAULT FALSE)
- `created_at`, `created_by`, `updated_at`, `updated_by`
- *Indexes*: `idx_customers_name` (`name`), `idx_customers_email` (`email`), `idx_customers_deleted` (`is_deleted`)

#### 8. `products`
The core catalog item definitions, storing prices and on-hand stock counters.
- `product_id` (INT UNSIGNED AUTO_INCREMENT PRIMARY KEY)
- `product_code` (VARCHAR(50) NOT NULL UNIQUE)
- `product_name` (VARCHAR(200) NOT NULL)
- `description` (TEXT)
- `product_type` (ENUM('storable', 'consumable', 'service') NOT NULL DEFAULT 'storable')
- `procurement_type` (ENUM('buy', 'manufacture', 'both') NOT NULL DEFAULT 'buy')
- `procurement_strategy` (ENUM('MTS', 'MTO', 'MTS_MTO') NOT NULL DEFAULT 'MTS')
- `vendor_id` (INT UNSIGNED, FOREIGN KEY to `vendors.vendor_id` ON DELETE SET NULL)
- `bom_id` (INT UNSIGNED, FOREIGN KEY to `bom.bom_id` ON DELETE SET NULL - added post-bom definition)
- `sales_price` (DECIMAL(12,2) NOT NULL DEFAULT 0.00)
- `cost_price` (DECIMAL(12,2) NOT NULL DEFAULT 0.00)
- `uom` (VARCHAR(20) NOT NULL DEFAULT 'Unit')
- `on_hand_qty` (DECIMAL(12,3) NOT NULL DEFAULT 0.000)
- `reserved_qty` (DECIMAL(12,3) NOT NULL DEFAULT 0.000)
- `free_to_use_qty` (DECIMAL(12,3) GENERATED ALWAYS AS (`on_hand_qty` - `reserved_qty`) STORED)
- `min_stock_qty` (DECIMAL(12,3) NOT NULL DEFAULT 0.000)
- `is_active` (BOOLEAN NOT NULL DEFAULT TRUE)
- `is_deleted` (BOOLEAN NOT NULL DEFAULT FALSE)
- `created_at`, `created_by`, `updated_at`, `updated_by`
- *Indexes*: `idx_products_code` (`product_code`), `idx_products_name` (`product_name`), `idx_products_type` (`product_type`), `idx_products_strategy` (`procurement_strategy`), `idx_products_vendor` (`vendor_id`), `idx_products_active` (`is_active`), `idx_products_deleted` (`is_deleted`)

---

### 3.3. Bill of Materials (BOM) & Manufacturing

#### 9. `bom`
Header table for the Bill of Materials (assembly formulas).
- `bom_id` (INT UNSIGNED AUTO_INCREMENT PRIMARY KEY)
- `product_id` (INT UNSIGNED NOT NULL, FOREIGN KEY to `products.product_id` ON DELETE CASCADE)
- `bom_name` (VARCHAR(200))
- `qty` (DECIMAL(12,3) NOT NULL DEFAULT 1.000) - Base output yield quantity
- `bom_type` (ENUM('manufacture', 'kit', 'subcontract') NOT NULL DEFAULT 'manufacture')
- `is_active` (BOOLEAN NOT NULL DEFAULT TRUE)
- `is_deleted` (BOOLEAN NOT NULL DEFAULT FALSE)
- `created_at`, `created_by`, `updated_at`, `updated_by`
- *Indexes*: `idx_bom_product` (`product_id`), `idx_bom_deleted` (`is_deleted`)

#### 10. `bom_lines`
Individual component items required to build the parent BOM product.
- `bom_line_id` (INT UNSIGNED AUTO_INCREMENT PRIMARY KEY)
- `bom_id` (INT UNSIGNED NOT NULL, FOREIGN KEY to `bom.bom_id` ON DELETE CASCADE)
- `component_id` (INT UNSIGNED NOT NULL, FOREIGN KEY to `products.product_id`) - Product ID of the ingredient
- `qty` (DECIMAL(12,3) NOT NULL DEFAULT 1.000)
- `uom` (VARCHAR(20) NOT NULL DEFAULT 'Unit')
- `operation_id` (INT UNSIGNED NULL, FOREIGN KEY to `operations.operation_id` ON DELETE SET NULL) - Specific operation step where this raw material is consumed
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- `created_by` (INT UNSIGNED NULL, FOREIGN KEY to `users.user_id` ON DELETE SET NULL)
- *Unique constraints*: `uq_bom_component (bom_id, component_id)`
- *Indexes*: `idx_bomlines_bom` (`bom_id`), `idx_bomlines_component` (`component_id`), `idx_bomline_operation` (`operation_id`)

#### 11. `work_centers`
Manufacturing work center stations.
- `work_center_id` (INT UNSIGNED AUTO_INCREMENT PRIMARY KEY)
- `name` (VARCHAR(150) NOT NULL UNIQUE)
- `code` (VARCHAR(50) NOT NULL UNIQUE)
- `description` (TEXT)
- `capacity_per_day` (DECIMAL(8,2) NOT NULL DEFAULT 8.00) - Machine hours available per day
- `cost_per_hour` (DECIMAL(10,2) NOT NULL DEFAULT 0.00)
- `is_active` (BOOLEAN NOT NULL DEFAULT TRUE)
- `is_deleted` (BOOLEAN NOT NULL DEFAULT FALSE)
- `created_at`, `created_by`, `updated_at`, `updated_by`
- *Indexes*: `idx_wc_code` (`code`), `idx_wc_active` (`is_active`), `idx_wc_deleted` (`is_deleted`)

#### 12. `operations`
Standard routing tasks that occur inside specific work centers.
- `operation_id` (INT UNSIGNED AUTO_INCREMENT PRIMARY KEY)
- `work_center_id` (INT UNSIGNED NOT NULL, FOREIGN KEY to `work_centers.work_center_id`)
- `name` (VARCHAR(150) NOT NULL)
- `code` (VARCHAR(50) NOT NULL UNIQUE)
- `description` (TEXT)
- `duration_minutes` (DECIMAL(8,2) NOT NULL DEFAULT 0.00) - Average duration to complete the operation
- `is_active` (BOOLEAN NOT NULL DEFAULT TRUE)
- `is_deleted` (BOOLEAN NOT NULL DEFAULT FALSE)
- `created_at`, `created_by`, `updated_at`, `updated_by`
- *Indexes*: `idx_op_work_center` (`work_center_id`), `idx_op_code` (`code`), `idx_op_active` (`is_active`), `idx_op_deleted` (`is_deleted`)

#### 13. `manufacturing_orders` (MO)
Represents a production request to assemble products.
- `mo_id` (INT UNSIGNED AUTO_INCREMENT PRIMARY KEY)
- `product_id` (INT UNSIGNED NOT NULL, FOREIGN KEY to `products.product_id`)
- `bom_id` (INT UNSIGNED NOT NULL, FOREIGN KEY to `bom.bom_id`)
- `so_id` (INT UNSIGNED NULL, FOREIGN KEY to `sales_orders.so_id` ON DELETE SET NULL) - Empty for MTS (Make to Stock), filled for MTO (Make to Order)
- `mo_type` (ENUM('MTS', 'MTO') NOT NULL DEFAULT 'MTS')
- `status` (ENUM('draft', 'confirmed', 'in_progress', 'done', 'cancelled') NOT NULL DEFAULT 'draft')
- `qty_planned` (DECIMAL(12,3) NOT NULL)
- `qty_produced` (DECIMAL(12,3) NOT NULL DEFAULT 0.000)
- `scheduled_date` (DATE)
- `completed_at` (TIMESTAMP NULL)
- `is_deleted` (BOOLEAN NOT NULL DEFAULT FALSE)
- `created_at`, `created_by`, `updated_at`, `updated_by`
- *Indexes*: `idx_mo_product` (`product_id`), `idx_mo_so` (`so_id`), `idx_mo_status` (`status`), `idx_mo_type` (`mo_type`), `idx_mo_schedule` (`scheduled_date`), `idx_mo_deleted` (`is_deleted`)

#### 14. `mo_components`
Raw materials needed for the MO, exploded from the BOM at order confirmation.
- `mo_component_id` (INT UNSIGNED AUTO_INCREMENT PRIMARY KEY)
- `mo_id` (INT UNSIGNED NOT NULL, FOREIGN KEY to `manufacturing_orders.mo_id` ON DELETE CASCADE)
- `product_id` (INT UNSIGNED NOT NULL, FOREIGN KEY to `products.product_id`) - Product ID of the ingredient component
- `bom_line_id` (INT UNSIGNED NULL, FOREIGN KEY to `bom_lines.bom_line_id` ON DELETE SET NULL)
- `qty_planned` (DECIMAL(12,3) NOT NULL)
- `qty_consumed` (DECIMAL(12,3) NOT NULL DEFAULT 0.000) - Tracks actual raw material usage
- `uom` (VARCHAR(20) NOT NULL DEFAULT 'Unit')
- `is_available` (BOOLEAN NOT NULL DEFAULT FALSE)
- `notes` (TEXT)
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- `created_by` (INT UNSIGNED NULL, FOREIGN KEY to `users.user_id` ON DELETE SET NULL)
- `updated_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)
- *Unique constraints*: `uq_mo_component (mo_id, product_id)`
- *Indexes*: `idx_moc_mo` (`mo_id`), `idx_moc_product` (`product_id`), `idx_moc_bom_line` (`bom_line_id`), `idx_moc_available` (`is_available`)

#### 15. `work_orders` (WO)
The actual routing/operational execution tasks linked to a Manufacturing Order.
- `wo_id` (INT UNSIGNED AUTO_INCREMENT PRIMARY KEY)
- `mo_id` (INT UNSIGNED NOT NULL, FOREIGN KEY to `manufacturing_orders.mo_id` ON DELETE CASCADE)
- `operation_id` (INT UNSIGNED NULL, FOREIGN KEY to `operations.operation_id` ON DELETE SET NULL)
- `work_center_id` (INT UNSIGNED NULL, FOREIGN KEY to `work_centers.work_center_id` ON DELETE SET NULL)
- `operation_name` (VARCHAR(150) NOT NULL)
- `status` (ENUM('pending', 'in_progress', 'done', 'cancelled') NOT NULL DEFAULT 'pending')
- `duration_hours` (DECIMAL(8,2))
- `scheduled_date` (DATE)
- `started_at` (TIMESTAMP NULL)
- `completed_at` (TIMESTAMP NULL)
- `is_deleted` (BOOLEAN NOT NULL DEFAULT FALSE)
- `created_at`, `created_by`, `updated_at`, `updated_by`
- *Indexes*: `idx_wo_mo` (`mo_id`), `idx_wo_status` (`status`), `idx_wo_deleted` (`is_deleted`), `idx_wo_operation` (`operation_id`), `idx_wo_work_center` (`work_center_id`)

---

### 3.4. Order Procurement & Sales

#### 16. `sales_orders`
Header for outgoing product orders to customers.
- `so_id` (INT UNSIGNED AUTO_INCREMENT PRIMARY KEY)
- `customer_id` (INT UNSIGNED NOT NULL, FOREIGN KEY to `customers.customer_id`)
- `so_type` (ENUM('MTS', 'MTO') NOT NULL DEFAULT 'MTS')
- `status` (ENUM('draft', 'confirmed', 'in_progress', 'done', 'cancelled') NOT NULL DEFAULT 'draft')
- `total_amount` (DECIMAL(14,2) NOT NULL DEFAULT 0.00)
- `delivery_date` (DATE)
- `notes` (TEXT)
- `is_deleted` (BOOLEAN NOT NULL DEFAULT FALSE)
- `created_at`, `created_by`, `updated_at`, `updated_by`
- *Indexes*: `idx_so_customer` (`customer_id`), `idx_so_status` (`status`), `idx_so_type` (`so_type`), `idx_so_created` (`created_at`), `idx_so_deleted` (`is_deleted`)

#### 17. `sales_order_lines`
Specific line-items of products ordered in a Sales Order.
- `sol_id` (INT UNSIGNED AUTO_INCREMENT PRIMARY KEY)
- `so_id` (INT UNSIGNED NOT NULL, FOREIGN KEY to `sales_orders.so_id` ON DELETE CASCADE)
- `product_id` (INT UNSIGNED NOT NULL, FOREIGN KEY to `products.product_id`)
- `qty` (DECIMAL(12,3) NOT NULL)
- `unit_price` (DECIMAL(12,2) NOT NULL)
- `subtotal` (DECIMAL(14,2) GENERATED ALWAYS AS (`qty` * `unit_price`) STORED)
- `reserved_qty` (DECIMAL(12,3) NOT NULL DEFAULT 0.000)
- `delivered_qty` (DECIMAL(12,3) NOT NULL DEFAULT 0.000)
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- `created_by` (INT UNSIGNED NULL, FOREIGN KEY to `users.user_id` ON DELETE SET NULL)
- *Indexes*: `idx_sol_so` (`so_id`), `idx_sol_product` (`product_id`)

#### 18. `purchase_orders`
Header for replenishment/material ordering from vendors.
- `po_id` (INT UNSIGNED AUTO_INCREMENT PRIMARY KEY)
- `vendor_id` (INT UNSIGNED NOT NULL, FOREIGN KEY to `vendors.vendor_id`)
- `status` (ENUM('draft', 'sent', 'confirmed', 'received', 'cancelled') NOT NULL DEFAULT 'draft')
- `total_amount` (DECIMAL(14,2) NOT NULL DEFAULT 0.00)
- `expected_date` (DATE)
- `notes` (TEXT)
- `is_deleted` (BOOLEAN NOT NULL DEFAULT FALSE)
- `created_at`, `created_by`, `updated_at`, `updated_by`
- *Indexes*: `idx_po_vendor` (`vendor_id`), `idx_po_status` (`status`), `idx_po_created` (`created_at`), `idx_po_deleted` (`is_deleted`)

#### 19. `purchase_order_lines`
Lines for ordered materials.
- `pol_id` (INT UNSIGNED AUTO_INCREMENT PRIMARY KEY)
- `po_id` (INT UNSIGNED NOT NULL, FOREIGN KEY to `purchase_orders.po_id` ON DELETE CASCADE)
- `product_id` (INT UNSIGNED NOT NULL, FOREIGN KEY to `products.product_id`)
- `qty_ordered` (DECIMAL(12,3) NOT NULL)
- `qty_received` (DECIMAL(12,3) NOT NULL DEFAULT 0.000)
- `unit_cost` (DECIMAL(12,2) NOT NULL)
- `subtotal` (DECIMAL(14,2) GENERATED ALWAYS AS (`qty_ordered` * `unit_cost`) STORED)
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- `created_by` (INT UNSIGNED NULL, FOREIGN KEY to `users.user_id` ON DELETE SET NULL)
- *Indexes*: `idx_pol_po` (`po_id`), `idx_pol_product` (`product_id`)

---

### 3.5. Inventory, Stock & Logs

#### 20. `warehouses`
Physical stock locations header.
- `warehouse_id` (INT UNSIGNED AUTO_INCREMENT PRIMARY KEY)
- `name` (VARCHAR(150) NOT NULL UNIQUE)
- `address` (TEXT)
- `is_active` (BOOLEAN NOT NULL DEFAULT TRUE)
- `is_deleted` (BOOLEAN NOT NULL DEFAULT FALSE)
- `created_at`, `created_by`, `updated_at`, `updated_by`
- *Indexes*: `idx_wh_deleted` (`is_deleted`)

#### 21. `stock_locations`
Specific storage zones inside warehouses.
- `location_id` (INT UNSIGNED AUTO_INCREMENT PRIMARY KEY)
- `warehouse_id` (INT UNSIGNED NOT NULL, FOREIGN KEY to `warehouses.warehouse_id` ON DELETE CASCADE)
- `name` (VARCHAR(100) NOT NULL)
- `code` (VARCHAR(50) NOT NULL UNIQUE)
- `location_type` (ENUM('input', 'storage', 'output', 'quality', 'scrap') NOT NULL DEFAULT 'storage')
- `is_deleted` (BOOLEAN NOT NULL DEFAULT FALSE)
- `created_at`, `created_by`, `updated_at`, `updated_by`
- *Indexes*: `idx_loc_warehouse` (`warehouse_id`), `idx_loc_code` (`code`), `idx_loc_deleted` (`is_deleted`)

#### 22. `inventory_transactions`
The immutable ledger tracking all warehouse movements. It contains no soft deletes or overrides.
- `txn_id` (INT UNSIGNED AUTO_INCREMENT PRIMARY KEY)
- `product_id` (INT UNSIGNED NOT NULL, FOREIGN KEY to `products.product_id`)
- `reference_id` (INT UNSIGNED NULL) - Holds the ID of the triggering order
- `reference_type` (ENUM('SO', 'PO', 'MO', 'ADJUSTMENT', 'RETURN', 'OPENING') NOT NULL)
- `txn_type` (ENUM('IN', 'OUT', 'RESERVE', 'UNRESERVE', 'ADJUST') NOT NULL)
- `qty` (DECIMAL(12,3) NOT NULL)
- `qty_before` (DECIMAL(12,3) NOT NULL)
- `qty_after` (DECIMAL(12,3) NOT NULL)
- `location_id` (INT UNSIGNED NULL, FOREIGN KEY to `stock_locations.location_id` ON DELETE SET NULL)
- `notes` (TEXT)
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- `created_by` (INT UNSIGNED NOT NULL, FOREIGN KEY to `users.user_id`)
- *Indexes*: `idx_txn_product` (`product_id`), `idx_txn_ref` (`reference_type`, `reference_id`), `idx_txn_type` (`txn_type`), `idx_txn_created` (`created_at`)

#### 23. `stock_reservations`
Tracks allocations of stock quantities reserved for specific active Sales Orders.
- `reservation_id` (INT UNSIGNED AUTO_INCREMENT PRIMARY KEY)
- `product_id` (INT UNSIGNED NOT NULL, FOREIGN KEY to `products.product_id`)
- `so_id` (INT UNSIGNED NOT NULL, FOREIGN KEY to `sales_orders.so_id` ON DELETE CASCADE)
- `reserved_qty` (DECIMAL(12,3) NOT NULL)
- `status` (ENUM('active', 'released', 'consumed') NOT NULL DEFAULT 'active')
- `is_deleted` (BOOLEAN NOT NULL DEFAULT FALSE)
- `created_at`, `created_by`, `updated_at`, `updated_by`
- *Indexes*: `idx_reserve_product` (`product_id`), `idx_reserve_so` (`so_id`), `idx_reserve_status` (`status`), `idx_reserve_deleted` (`is_deleted`)

#### 24. `procurement_rules`
Automated reordering rule parameters matching MTS (Make to Stock) rules.
- `rule_id` (INT UNSIGNED AUTO_INCREMENT PRIMARY KEY)
- `product_id` (INT UNSIGNED NOT NULL UNIQUE, FOREIGN KEY to `products.product_id` ON DELETE CASCADE)
- `strategy` (ENUM('MTS', 'MTO', 'MTS_MTO') NOT NULL DEFAULT 'MTS')
- `min_stock_qty` (DECIMAL(12,3) NOT NULL DEFAULT 0.000)
- `reorder_qty` (DECIMAL(12,3) NOT NULL DEFAULT 0.000)
- `preferred_vendor_id` (INT UNSIGNED NULL, FOREIGN KEY to `vendors.vendor_id` ON DELETE SET NULL)
- `is_active` (BOOLEAN NOT NULL DEFAULT TRUE)
- `is_deleted` (BOOLEAN NOT NULL DEFAULT FALSE)
- `created_at`, `created_by`, `updated_at`, `updated_by`
- *Indexes*: `idx_rule_strategy` (`strategy`), `idx_rule_active` (`is_active`), `idx_rule_deleted` (`is_deleted`)

#### 25. `audit_logs`
An append-only database transaction tracker.
- `log_id` (INT UNSIGNED AUTO_INCREMENT PRIMARY KEY)
- `user_id` (INT UNSIGNED NOT NULL, FOREIGN KEY to `users.user_id`)
- `table_name` (VARCHAR(100) NOT NULL)
- `record_id` (INT UNSIGNED NOT NULL)
- `action` (ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL)
- `old_values` (JSON NULL)
- `new_values` (JSON NULL)
- `ip_address` (VARCHAR(45))
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- *Indexes*: `idx_audit_user` (`user_id`), `idx_audit_table` (`table_name`), `idx_audit_record` (`table_name`, `record_id`), `idx_audit_created` (`created_at`)

---

## 4. Backend Application Structure & Core Logic

### Directory Tree
```
backend/
├── dbscript.sql                      # Active schema creation with seed data (v4)
├── migrations/
│   ├── bom_tables.sql                # Routing and operational tables migration
│   └── support_tables.sql            # Token and login tracking tables migration
├── src/
│   ├── server.js                     # Server entrypoint and route bootstrapping
│   ├── config/
│   │   ├── config.js                 # Configuration parsing with validation schema
│   │   ├── db.js                     # mysql2 transaction pool and connection logger
│   │   └── winston.js                # Winston logger configurations
│   ├── controllers/
│   │   ├── auth.controller.js        # Handles sign-in, sign-up, reset, and password updates
│   │   └── masters/user-mgmt/
│   │       └── user.controller.js    # Access management control for user directories
│   ├── middlewares/
│   │   ├── auth.middleware.js        # Validates JWT tokens and checks endpoints permissions
│   │   ├── upload.middleware.js      # Direct filesystem disk storage uploads
│   │   └── validation.js             # General Joi verification validation rules
│   ├── models/                       # Models layer executing DB transactions
│   │   ├── common.model.js           # Shared fallback lists
│   │   └── masters/
│   │       ├── bom.model.js
│   │       ├── operation.model.js
│   │       ├── work-center.model.js
│   │       └── user-mgmt/
│   │           ├── user.model.js     # users Table mapping
│   │           ├── role.model.js     # roles Table mapping
│   │           └── permission.model.js # JSON extraction logic
│   ├── routes/
│   │   ├── auth.routes.js            # POST /auth/signup, /auth/userLogin, /auth/logout
│   │   └── masters/user-mgmt/
│   │       └── user.routes.js        # GET, POST, PUT, DELETE for /users (Profile rules)
│   ├── utils/
│   │   ├── passwordVerify.utils.js   # Bcrypt hash verify helper
│   │   └── jwtToken.utils.js         # JWT generation utilities
│   └── views/
│       └── db-backups.ejs            # Template layout for DB status visualizer
└── .env                              # Active environment file
```

### Route Registration
Routes are registered dynamically in `src/server.js` by scanning files matching the pattern `*.routes.js` inside the `src/routes/` folder. For every file, a routing endpoint prefix mapping is registered depending on the exported `path` parameter.

### Core Middlewares
1. **`authMiddleware`**: Reads `Authorization: Bearer <JWT>` header, checks its existence in the `user_jwt_tokens` database, and decodes the JWT to populate the `req.user` payload object.
2. **`authorizeRoles`**: Compares the parsed `req.user.role` against a list of roles permitted to call the endpoint.
3. **`validateBody` & `validateQuery`**: Verifies inputs using Joi schemas defined in `middlewares/validation.js`.

---

## 5. Frontend Application Structure & Routing

### Directory Tree
```
frontend/
├── package.json                      # Build scripts, framework dependencies
├── src/
│   ├── main.jsx                      # App entry point
│   ├── App.jsx                       # Routing tree initializer
│   ├── app/
│   │   ├── contexts/                 # Theme, Breakpoint and Auth context providers
│   │   ├── layouts/                  # Base Layout wrappers (AppLayout, DynamicLayout)
│   │   ├── navigation/               # Sidenav structures for active views
│   │   ├── pages/
│   │   │   ├── Auth/
│   │   │   │   ├── index.jsx         # Dual toggle admin/user login layout
│   │   │   │   ├── SignUp.jsx        # Login registration panel
│   │   │   │   └── ForgotPassword.jsx # Recovery trigger layout
│   │   │   └── masterRecords/        # Admin data list panels (users, roles, permissions)
│   │   └── router/
│   │       ├── router.jsx            # Routing configuration provider
│   │       ├── protected.jsx         # Routes gated under authenticated guards
│   │       ├── ghost.jsx             # Guest-only authentication pages (login, signup)
│   │       └── public.jsx            # Unauthenticated public views
│   ├── services/
│   │   └── master-records/
│   │       ├── users.jsx             # Users API Axios client wrapper
│   │       └── roles.jsx             # Roles API Axios client wrapper
│   └── utils/
│       └── jwt.js                    # Token extraction and storage tools
└── .env                              # VITE API prefix mapping
```

### Routing Setup
The application uses React Router DOM (v7) and `createBrowserRouter`:
- **`protectedRoutes`**: Accessed using the `DynamicLayout` layout. Wrapped inside an `AuthGuard` component that checks token validity. If no active session exists, it redirects to `/login`.
- **`ghostRoutes`**: Login, signup, and reset pages wrapped inside a `GhostGuard`. If an active session is found, guests are redirected back to the dashboard dashboard home page.
- **`publicRoutes`**: Terms of service, privacy pages, and electronic bills (EBills) accessible without a login session.

---

## 6. System Workflows

### 6.1. Authentication Flow
```
[User Login Form] ──(credentials)──> POST /auth/userLogin 
                                             │
                       ┌─────────────────────┴─────────────────────┐
                   (not found / mismatch)                              (matched)
                       ▼                                           ▼
             Throws AuthenticationError                     Generate Access & Refresh JWTs
                                                                   │
                                                            Update user_jwt_tokens
                                                                   │
                                                            Write login_logs record
                                                                   │
                                                            Return tokens + user profile
```

*Self-Signup Requirements*:
1. Username: Alphanumeric string between 6 and 12 characters, checked for uniqueness.
2. Email: Valid syntax and checked for uniqueness.
3. Password: Minimum 8 characters, containing at least 1 lowercase letter, 1 uppercase letter, and 1 special symbol.

---

### 6.2. Manufacturing & BOM Explosion Workflow
When a Manufacturing Order (MO) status transitions to `confirmed`:
1. The backend triggers `explodeBOM(moId, createdBy)` inside `mo-component.model.js`.
2. It queries all entries in `bom_lines` matching the order's `bom_id`.
3. It multiplies each component's unit yield by the planned MO production quantity (`mo.qty_planned`).
4. It inserts a raw material inventory checklist mapping directly into the `mo_components` table for tracking material consumption.

---

### 6.3. Inventory Reservation Workflow
When a Sales Order (SO) is confirmed:
1. The system allocates the required finished products based on current stock levels.
2. A `stock_reservations` transaction record is created.
3. The `reserved_qty` column in the `products` table increases, reducing the calculated `free_to_use_qty` virtual column, preventing double allocation of stock.
4. When delivery completes, the reservation is marked `consumed`, and the products are deducted from `on_hand_qty` while the reservation is released.

---

## 7. Configuration & Environment Settings

### Backend Environments (`backend/.env`)
Key configuration variables used on server startup:
- `NODE_ENV`: Runs in `development` or `production`.
- `SERVER_PORT`: Set to `8003`.
- `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASS` / `DB_NAME`: Database target matching credentials.
- `JWT_SECRET` / `JWT_EXPIRES_IN`: Used to sign access tokens (default expiration `1h`).
- `JWT_REFRESH_SECRET` / `JWT_REFRESH_EXPIRES_IN`: Signed keys for session refresh (expires in `7d`).
- `DB_BACKUP_TOKEN`: Secures the `/db-backup` endpoint.
- `WHATSAPP_ENABLED` / `WHATSAPP_API_URL`: Controls integration for dispatch alerts.
- `BACKUP_SCHEDULE` / `CLEANUP_SCHEDULE`: Crontab values executing cleanup scripts.

### Frontend Environments (`frontend/.env`)
- `VITE_API_BASE_URL`: Set to `http://localhost:8003/api/v1` to point Axios requests to the correct backend port.

---

## 8. Database Seeds
Initial seed data inside `dbscript.sql` establishes:
1. **Roles**:
   - `Super Admin` (full access to all modules).
   - `Manager` (creation and editing of records, cannot delete or modify users/roles).
   - `Viewer` (read-only access).
2. **Users**:
   - Default Administrator: `admin@minierp.com` (Password: `Admin@123`).
3. **Master Directory Data**:
   - 3 Vendors (`AgriSupply Co.`, `FarmTech Traders`, `GreenHarvest Ltd.`).
   - 3 Customers (`Ramesh Patel Farms`, `Sunrise Agro Store`, `Devkar Agri Exports`).
   - 1 Warehouse (`Main Warehouse`) containing 5 Locations (`Input Bay`, `Storage Zone`, `Output Bay`, `QC Area`, `Scrap Zone`).
   - 3 Work Centers (`Assembly Line 1`, `Quality Control`, `Packaging Station`) and 3 Operations (`Component Assembly`, `Quality Inspection`, `Pack & Label`).

---

## 9. Quirks & Legacy Mapping

- **POS Integration**: The legacy module code inside `backend/src/models/pos-mgmt/` is still structured around the old schema naming conventions (e.g. `usermaster` and `itemmaster`), whereas the actual active database has migrated to `users` and `products`.
- **Database Fallbacks**: The model `common.model.js` has built-in fallbacks. When endpoints attempt to load cities, states, locations, or tax rates from missing tables (`countrymst`, `statemaster`, `citymaster`, `locationmaster`, or `taxprofilemaster`), the queries catch errors and gracefully return empty arrays (`[]`) to prevent server crashes.
