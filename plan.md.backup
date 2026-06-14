# m-erp — Mega Master Build Plan
## Team: Antigravity | Mini ERP: From Demand to Delivery
## Domain: Shiv Furniture Works, Vadodara, Gujarat
## Schema: MINI_ERP1 (v4 Final + product_vendors patch)

---

> **How to use this document:** Read top to bottom once before writing a single line of code.
> Every section feeds the next. Implementation order matters — follow the sprint plan in Part 13.

---

## TABLE OF CONTENTS

```
Part 01 — Project Overview & Vision
Part 02 — Technology Stack (Final Locked)
Part 03 — Database Schema Master Reference (v4 + patch)
Part 04 — Backend Architecture & Module Implementation
  04-A  Auth Module
  04-B  User Management Module
  04-C  Partners Module (unified vendors + customers)
  04-D  Products Module
  04-E  Bill of Materials (BOM) Module
  04-F  Work Centers & Operations Module
  04-G  Sales Orders Module
  04-H  Purchase Orders Module
  04-I  Manufacturing Orders Module
  04-J  Work Orders Module
  04-K  Inventory & Stock Module
  04-L  Procurement Rules & Automation Module
  04-M  Dashboard Module
  04-N  Audit Logs Module
Part 05 — Frontend Architecture & Page Plan
Part 06 — Business Logic Deep Dives
  06-A  MTS Flow (Make to Stock)
  06-B  MTO Flow (Make to Order)
  06-C  BOM Explosion Algorithm
  06-D  Stock Reservation & Release Lifecycle
  06-E  Procurement Automation Engine
  06-F  Inventory Ledger Rules
Part 07 — Complete API Contract (All Endpoints)
Part 08 — Role-Based Access Control (RBAC) Matrix
Part 09 — Database Seeding Reference
Part 10 — Known Quirks, Edge Cases & Migration Notes
Part 11 — QA & Testing Plan
Part 12 — Environment Setup & Deployment
Part 13 — Build Order & Sprint Plan
```

---

# PART 01 — PROJECT OVERVIEW & VISION

## 1.1 What We Are Building

m-erp is a **full-stack Mini ERP web application** for Shiv Furniture Works. It replaces
Excel sheets, WhatsApp coordination, and paper-based manufacturing notes with a single
centralized platform. The system covers the complete business loop:

```
Customer Demand → Sales Order → Stock Check → (MTS: Reserve) / (MTO: Manufacture/Purchase)
→ Manufacturing Order → BOM Explosion → Work Orders → Stock Consumed
→ Finished Goods Produced → Delivery → Stock Out → Inventory Updated → Audit Logged
```

## 1.2 The Five Core Problems Being Solved

| Problem | Root Cause | ERP Solution |
|---|---|---|
| Overselling | Sales had no stock visibility | Real-time free_to_use_qty shown at SO creation |
| Late procurement | No reorder triggers | Procurement rules with auto PO/MO generation |
| BOM on paper | No digital component list | BOM module with explosion at MO confirmation |
| No stock ledger | Manual tracking | Immutable inventory_transactions table |
| Zero visibility | Siloed departments | Unified dashboard + audit logs |

## 1.3 Key Business Concepts

### Make to Stock (MTS)
Produce goods BEFORE customer orders them. When SO arrives, fulfill from existing stock.
If stock runs low (below min_stock_qty), auto-trigger procurement.

### Make to Order (MTO)
Produce ONLY when a customer order arrives. SO confirmation triggers MO (if manufacture)
or PO (if buy). Customer waits for production to finish.

### Free to Use Quantity
```
free_to_use_qty = on_hand_qty - reserved_qty
```
This is a GENERATED ALWAYS column in MySQL — it auto-calculates. Never manually update it.

### BOM Explosion
When an MO is confirmed, the system reads the BOM and multiplies each component qty by
the planned production quantity. These become `mo_components` rows — the actual pick list.

### Partners (Unified)
v4 replaces separate `vendors` and `customers` tables with a single `partners` table.
A partner can be `is_vendor=TRUE`, `is_customer=TRUE`, or BOTH (dual-role distributors).

---

# PART 02 — TECHNOLOGY STACK (FINAL LOCKED)

## 2.1 Backend

| Layer | Tech | Version | Notes |
|---|---|---|---|
| Runtime | Node.js | 20+ LTS | Required for stable mysql2 async pool |
| Framework | Express.js | 4.x | Minimal, predictable routing |
| DB Connector | mysql2 | latest | Promise pool + AsyncLocalStorage for transactions |
| Auth | jsonwebtoken | 9.x | Access (1h) + Refresh (7d) token pair |
| Password | bcrypt | 5.x | 10 salt rounds |
| Validation | Joi | 17.13.3 | Schema validation on all request bodies |
| Logging | Winston | 3.14.2 | Daily rotation, info/error/warn levels |
| Scheduler | node-cron | 3.x | Cleanup expired tokens, DB backups |
| Email Template | EJS | 3.x | Password reset, backup reports |
| Config | dotenv | 16.x | .env parsing |
| File Upload | multer | 1.x | Product images if needed |

## 2.2 Frontend

| Layer | Tech | Version | Notes |
|---|---|---|---|
| Framework | React | 19 | Latest with concurrent rendering |
| Build Tool | Vite | 6 | Fast HMR, ESM native |
| Routing | React Router DOM | 7 | createBrowserRouter, loaders |
| State | Redux Toolkit | 2.8 | Global state for auth, notifications |
| Context | React Context API | - | Theme, breakpoint, locale |
| UI Library | PrimeReact | 10.9 | DataTable, Dialog, Toast, Form elements |
| Styling | TailwindCSS | v4 | Utility classes, no build step needed for v4 |
| HTTP | Axios | 1.x | Interceptors for JWT injection + 401 handling |
| i18n | i18next | 23.x | English (en) + Arabic (ar) locale |

## 2.3 Database

| Layer | Tech | Notes |
|---|---|---|
| Engine | MySQL 8.0+ | InnoDB, utf8mb4_unicode_ci |
| Schema | MINI_ERP1 | 22 tables (21 base + product_vendors patch) |
| Soft Deletes | is_deleted BOOLEAN | All entity tables, NOT inventory_transactions or audit_logs |
| Audit | audit_logs | Append-only, tracks INSERT/UPDATE/DELETE |

## 2.4 DevOps / Tooling

- **Package Manager:** npm (workspaces optional, or two separate package.json)
- **Env Management:** .env for backend, .env for frontend (VITE_ prefix)
- **Logger:** Winston with daily rotate transport
- **Port:** Backend on 8003, Frontend Vite dev on 5173

---

# PART 03 — DATABASE SCHEMA MASTER REFERENCE

## 3.1 Table Inventory (22 tables total)

```
Authentication & Users (5)
  01. roles
  02. users
  03. user_jwt_tokens
  04. password_reset_tokens
  05. login_logs

Partners & Products (3)
  06. partners                  ← unified vendors + customers (v4 change)
  07. products
  08. product_vendors           ← many-to-many patch (22nd table)

Bill of Materials & Manufacturing (7)
  09. bom
  10. bom_lines
  11. work_centers
  12. operations
  13. manufacturing_orders
  14. work_orders
  15. mo_components

Orders (4)
  16. sales_orders
  17. sales_order_lines
  18. purchase_orders
  19. purchase_order_lines

Inventory & Stock (4)
  20. warehouses
  21. stock_locations
  22. inventory_transactions     ← immutable ledger, no soft delete
  23. stock_reservations

Automation & Audit (2)
  24. procurement_rules
  25. audit_logs                 ← append-only, no soft delete
```

> NOTE: The project context document references 25 tables using the older schema (with
> separate vendors/customers). The active database MINI_ERP1 runs v4 (21 tables) + patch
> (product_vendors) = 22 tables. Always use `partners` table, never `vendors`/`customers`.

## 3.2 Critical Column Patterns (Apply Consistently)

### Soft Delete Pattern
Every entity table (NOT inventory_transactions, audit_logs, user_jwt_tokens,
password_reset_tokens, login_logs) has:
```sql
is_deleted BOOLEAN NOT NULL DEFAULT FALSE
```
All SELECT queries MUST filter: `WHERE is_deleted = FALSE`

### Audit Trail Pattern
Every writable table has:
```sql
created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
created_by  INT UNSIGNED NULL,
updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
updated_by  INT UNSIGNED NULL
```
`created_by` is NULL only for system-seeded rows (roles, initial admin).

### Generated Columns (READ ONLY — never INSERT/UPDATE these)
```sql
-- products table
free_to_use_qty DECIMAL(12,3) GENERATED ALWAYS AS (on_hand_qty - reserved_qty) STORED

-- sales_order_lines table
subtotal DECIMAL(14,2) GENERATED ALWAYS AS (qty * unit_price) STORED

-- purchase_order_lines table
subtotal DECIMAL(14,2) GENERATED ALWAYS AS (qty_ordered * unit_cost) STORED
```

## 3.3 Circular FK — products ↔ bom

```sql
-- products.bom_id is added AFTER bom table creation:
ALTER TABLE products
    ADD CONSTRAINT fk_products_bom
    FOREIGN KEY (bom_id) REFERENCES bom (bom_id) ON DELETE SET NULL;
```
This must be run AFTER both tables exist. In dbscript.sql this is handled automatically.
In migrations, respect the order: create products (bom_id NULL) → create bom → ALTER products.

## 3.4 Enum Reference Sheet

```
users.status                  : active | inactive | suspended
products.product_type         : storable | consumable | service
products.procurement_type     : buy | manufacture | both
products.procurement_strategy : MTS | MTO | MTS_MTO
bom.bom_type                  : manufacture | kit | subcontract
manufacturing_orders.mo_type  : MTS | MTO
manufacturing_orders.status   : draft | confirmed | in_progress | done | cancelled
work_orders.status            : pending | in_progress | done | cancelled
sales_orders.so_type          : MTS | MTO
sales_orders.status           : draft | confirmed | in_progress | done | cancelled
purchase_orders.status        : draft | sent | confirmed | received | cancelled
inventory_transactions.reference_type : SO | PO | MO | ADJUSTMENT | RETURN | OPENING
inventory_transactions.txn_type       : IN | OUT | RESERVE | UNRESERVE | ADJUST
stock_locations.location_type : input | storage | output | quality | scrap
stock_reservations.status     : active | released | consumed
procurement_rules.strategy    : MTS | MTO | MTS_MTO
audit_logs.action             : INSERT | UPDATE | DELETE
partners flags                : is_vendor BOOLEAN, is_customer BOOLEAN (can be both)
```

## 3.5 product_vendors Table (Patch)

This table enables multiple vendors per product. Key business rules:
- Only ONE row per `(product_id, partner_id)` — enforced by `UNIQUE KEY uq_product_vendor`
- Only ONE row per product should have `is_preferred = TRUE` (application enforces this)
- `products.vendor_id` is kept for backward compat but `product_vendors` is source of truth
- No `is_deleted` on this table — use `is_active = FALSE` to deactivate instead
- `partner_id` here MUST have `is_vendor = TRUE` in the partners table (application enforces)

---

# PART 04 — BACKEND ARCHITECTURE & MODULE IMPLEMENTATION

## 4.0 Directory Structure (Full)

```
backend/
├── .env
├── package.json
├── dbscript.sql
├── migrations/
│   ├── 001_base_schema.sql
│   ├── 002_bom_tables.sql
│   ├── 003_support_tables.sql
│   └── 004_product_vendors_patch.sql
└── src/
    ├── server.js                    ← Express app + route loader
    ├── config/
    │   ├── config.js                ← env validation + export
    │   ├── db.js                    ← mysql2 pool + transaction helper
    │   └── winston.js               ← logger config
    ├── constants/
    │   ├── enums.js                 ← All enum value arrays
    │   └── errors.js                ← Custom error classes
    ├── controllers/
    │   ├── auth.controller.js
    │   ├── dashboard.controller.js
    │   ├── masters/
    │   │   ├── user.controller.js
    │   │   ├── role.controller.js
    │   │   ├── partner.controller.js
    │   │   ├── product.controller.js
    │   │   ├── bom.controller.js
    │   │   ├── work-center.controller.js
    │   │   └── operation.controller.js
    │   ├── transactions/
    │   │   ├── sales-order.controller.js
    │   │   ├── purchase-order.controller.js
    │   │   ├── manufacturing-order.controller.js
    │   │   └── work-order.controller.js
    │   └── inventory/
    │       ├── inventory.controller.js
    │       ├── warehouse.controller.js
    │       └── procurement-rule.controller.js
    ├── middlewares/
    │   ├── auth.middleware.js        ← JWT verify + token DB check
    │   ├── permission.middleware.js  ← role-based module access
    │   ├── validation.middleware.js  ← Joi body/query validators
    │   └── upload.middleware.js      ← multer disk storage
    ├── models/
    │   ├── common.model.js
    │   ├── auth.model.js
    │   ├── masters/
    │   │   ├── user.model.js
    │   │   ├── role.model.js
    │   │   ├── partner.model.js
    │   │   ├── product.model.js
    │   │   ├── bom.model.js
    │   │   ├── bom-line.model.js
    │   │   ├── work-center.model.js
    │   │   └── operation.model.js
    │   ├── transactions/
    │   │   ├── sales-order.model.js
    │   │   ├── sales-order-line.model.js
    │   │   ├── purchase-order.model.js
    │   │   ├── purchase-order-line.model.js
    │   │   ├── manufacturing-order.model.js
    │   │   ├── mo-component.model.js
    │   │   └── work-order.model.js
    │   └── inventory/
    │       ├── inventory-transaction.model.js
    │       ├── stock-reservation.model.js
    │       ├── warehouse.model.js
    │       ├── stock-location.model.js
    │       └── procurement-rule.model.js
    ├── routes/
    │   ├── auth.routes.js
    │   ├── dashboard.routes.js
    │   ├── masters/
    │   │   ├── user.routes.js
    │   │   ├── role.routes.js
    │   │   ├── partner.routes.js
    │   │   ├── product.routes.js
    │   │   ├── bom.routes.js
    │   │   ├── work-center.routes.js
    │   │   └── operation.routes.js
    │   ├── transactions/
    │   │   ├── sales-order.routes.js
    │   │   ├── purchase-order.routes.js
    │   │   ├── manufacturing-order.routes.js
    │   │   └── work-order.routes.js
    │   └── inventory/
    │       ├── inventory.routes.js
    │       ├── warehouse.routes.js
    │       └── procurement-rule.routes.js
    ├── services/
    │   ├── bom-explosion.service.js  ← Core BOM → MO components logic
    │   ├── procurement.service.js    ← Auto PO/MO generation
    │   ├── stock-reservation.service.js
    │   ├── inventory-ledger.service.js
    │   └── audit.service.js          ← Write audit_logs rows
    ├── utils/
    │   ├── jwt.utils.js
    │   ├── password.utils.js
    │   ├── pagination.utils.js       ← LIMIT/OFFSET helper
    │   └── response.utils.js         ← Standardized API response format
    ├── validations/
    │   ├── auth.validation.js
    │   ├── user.validation.js
    │   ├── partner.validation.js
    │   ├── product.validation.js
    │   ├── bom.validation.js
    │   ├── sales-order.validation.js
    │   ├── purchase-order.validation.js
    │   ├── manufacturing-order.validation.js
    │   └── inventory.validation.js
    └── views/
        └── db-backup.ejs
```

## 4.1 server.js — Bootstrap Pattern

```
1. Load config (throws if required env vars are missing)
2. Initialize logger (Winston)
3. Create Express app
4. Apply global middlewares: cors, express.json, express.urlencoded, morgan
5. Auto-scan src/routes/**/*.routes.js and mount each at its exported `path`
6. Mount 404 handler
7. Mount global error handler (returns structured JSON error response)
8. Start cron jobs: token cleanup, DB backup
9. Listen on SERVER_PORT
```

**Route file convention:**
```js
// Every *.routes.js exports:
module.exports = {
  path: '/api/v1/partners',     // mount prefix
  router: require('express').Router()  // the router itself
}
```
server.js discovers this automatically — adding a new module only requires a new routes file.

## 4.2 config/db.js — Transaction Pattern

All DB operations that span multiple tables MUST use transactions. Pattern:

```
1. getConnection() from pool
2. connection.beginTransaction()
3. Execute queries using the connection (NOT pool.query)
4. On success: connection.commit()
5. On error: connection.rollback() + rethrow
6. Always: connection.release() in finally block
```

Use `AsyncLocalStorage` to propagate the active connection through the call stack so model
functions don't need to explicitly pass the connection object.

## 4.3 Standardized API Response Format

All responses follow this shape:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

Error responses:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "must be a valid email" }
  ]
}
```

HTTP Status codes:
- 200: Success (GET, PUT)
- 201: Created (POST)
- 204: No content (DELETE)
- 400: Validation error
- 401: Unauthenticated
- 403: Forbidden (no permission)
- 404: Not found
- 409: Conflict (duplicate)
- 422: Business rule violation
- 500: Internal server error

---

## MODULE 04-A: AUTH

### Tables: users, user_jwt_tokens, password_reset_tokens, login_logs

### Endpoints
```
POST /api/v1/auth/signup          → Register new user
POST /api/v1/auth/login           → Login, returns access + refresh tokens
POST /api/v1/auth/refresh         → Get new access token using refresh token
POST /api/v1/auth/logout          → Invalidate current access token
POST /api/v1/auth/logout-all      → Invalidate ALL tokens for this user
POST /api/v1/auth/forgot-password → Send reset token to email
POST /api/v1/auth/reset-password  → Reset password using token
PUT  /api/v1/auth/change-password → Change own password (authenticated)
GET  /api/v1/auth/me              → Get current user profile
```

### Signup Validation (Joi)
```
name:     alphanum, min 6, max 12, required
email:    valid email, required
password: min 8, must contain ≥1 uppercase, ≥1 lowercase, ≥1 special char
role_id:  integer, required (Admin can set any role; self-signup gets default role)
```

### Login Flow
```
1. Find user by email (is_deleted=FALSE, status='active')
2. bcrypt.compare(password, password_hash)
3. Generate JWT_ACCESS (payload: { user_id, role_id, name, email })
4. Generate JWT_REFRESH (payload: { user_id })
5. INSERT into user_jwt_tokens (user_id, token=accessToken, expiry)
6. INSERT into login_logs (user_id, login_at=NOW(), ip_address, user_agent)
7. Return { accessToken, refreshToken, user: { user_id, name, email, role } }
```

### Auth Middleware
```
1. Extract Bearer token from Authorization header
2. Verify JWT signature using JWT_SECRET
3. Check token exists in user_jwt_tokens AND expiry > NOW()
4. Attach decoded payload to req.user
5. If any check fails → 401 Unauthorized
```

### Permission Middleware
```
1. Read req.user.role_id
2. Fetch role.permissions JSON from DB (or cache per-request in req.role)
3. Check if permissions[module][action] === true
4. If not → 403 Forbidden
```

### Password Reset Flow
```
1. POST /forgot-password with email
2. Generate random 64-char token, store in password_reset_tokens with 1h expiry
3. Send email with reset link (EJS template)
4. POST /reset-password with token + new_password
5. Verify token exists + not expired
6. bcrypt.hash(new_password, 10)
7. UPDATE users SET password_hash = ... WHERE email = ...
8. DELETE from password_reset_tokens WHERE token = ...
9. DELETE from user_jwt_tokens WHERE user_id = ... (invalidate all sessions)
```

---

## MODULE 04-B: USER MANAGEMENT

### Tables: users, roles

### Endpoints
```
GET    /api/v1/users              → List users (paginated, filters: status, role_id)
GET    /api/v1/users/:id          → Get user by ID
POST   /api/v1/users              → Create user (Admin only)
PUT    /api/v1/users/:id          → Update user (Admin only)
DELETE /api/v1/users/:id          → Soft delete user (Admin only)
PUT    /api/v1/users/:id/status   → Activate / suspend / deactivate user

GET    /api/v1/roles              → List all roles
GET    /api/v1/roles/:id          → Get role with permissions JSON
POST   /api/v1/roles              → Create role (Admin only)
PUT    /api/v1/roles/:id          → Update role permissions (Admin only)
DELETE /api/v1/roles/:id          → Soft delete role (Admin only)
```

### Business Rules
- A user cannot delete themselves
- A role cannot be deleted if users are assigned to it
- `name` column is the login identifier — must be unique across non-deleted users
- `email` must be unique across non-deleted users
- Changing a user's role_id does NOT retroactively change audit_logs entries

### Permissions JSON Schema
```json
{
  "users":            { "view": true, "create": true, "update": true, "delete": false },
  "roles":            { "view": true, "create": false, "update": false, "delete": false },
  "partners":         { "view": true, "create": true, "update": true, "delete": false },
  "products":         { "view": true, "create": true, "update": true, "delete": false },
  "bom":              { "view": true, "create": true, "update": true, "delete": false },
  "sales":            { "view": true, "create": true, "update": true, "delete": false },
  "purchase":         { "view": true, "create": true, "update": true, "delete": false },
  "manufacturing":    { "view": true, "create": true, "update": true, "delete": false },
  "inventory":        { "view": true, "create": true, "update": false, "delete": false },
  "procurement":      { "view": true, "create": true, "update": true, "delete": false },
  "audit_logs":       { "view": false },
  "dashboard":        { "view": true },
  "work_centers":     { "view": true, "create": true, "update": true, "delete": false },
  "operations":       { "view": true, "create": true, "update": true, "delete": false }
}
```

---

## MODULE 04-C: PARTNERS

### Table: partners

### Endpoints
```
GET    /api/v1/partners           → List partners (filter: is_vendor, is_customer, is_active)
GET    /api/v1/partners/:id       → Get partner by ID with product_vendors
GET    /api/v1/partners/vendors   → Shortcut: is_vendor=TRUE partners only
GET    /api/v1/partners/customers → Shortcut: is_customer=TRUE partners only
POST   /api/v1/partners           → Create partner
PUT    /api/v1/partners/:id       → Update partner
DELETE /api/v1/partners/:id       → Soft delete partner

GET    /api/v1/partners/:id/products → Products supplied by this vendor (via product_vendors)
POST   /api/v1/partners/:id/products → Link a product to this vendor (add to product_vendors)
DELETE /api/v1/partners/:id/products/:productId → Remove vendor-product link
```

### Business Rules
- A partner MUST have at least one of `is_vendor` or `is_customer` = TRUE
- A partner cannot be soft-deleted if they have active (non-done/cancelled) sales_orders
  or purchase_orders referencing them
- `gstin` format: 15-character GST number, validated if provided
- `lead_time_days` is relevant only for vendors (is_vendor=TRUE)
- When creating a partner with `is_vendor=TRUE`, optionally create product_vendor links

### product_vendors sub-resource rules
- Only ONE `is_preferred=TRUE` per product_id — when setting a new preferred vendor,
  the previous preferred row must be updated to `is_preferred=FALSE`
- `partner_id` in product_vendors must have `is_vendor=TRUE` in partners table
- `unit_cost` and `lead_time_days` at product_vendors level override partners-level defaults

---

## MODULE 04-D: PRODUCTS

### Table: products, product_vendors

### Endpoints
```
GET    /api/v1/products           → List products (filter: product_type, strategy, is_active)
GET    /api/v1/products/:id       → Get product with vendors list, BOM header
GET    /api/v1/products/low-stock → Products where on_hand_qty <= min_stock_qty
POST   /api/v1/products           → Create product
PUT    /api/v1/products/:id       → Update product
DELETE /api/v1/products/:id       → Soft delete product
PUT    /api/v1/products/:id/stock → Manual stock adjustment (creates inventory_transaction)

GET    /api/v1/products/:id/vendors       → All vendor links for this product
POST   /api/v1/products/:id/vendors       → Add a vendor link
PUT    /api/v1/products/:id/vendors/:pvId → Update vendor link (cost, lead time, preferred flag)
DELETE /api/v1/products/:id/vendors/:pvId → Deactivate vendor link (is_active=FALSE)
```

### Business Rules
- `product_code` must be unique across non-deleted products
- `product_type = 'service'` cannot have `on_hand_qty` tracked (always 0)
- `procurement_type = 'buy'` products need at least one vendor in product_vendors
- `procurement_type = 'manufacture'` products need a BOM linked (bom_id)
- `procurement_type = 'both'` can use either route — checked at procurement time
- Soft delete blocked if product is referenced in any active (non-cancelled) order lines

### Stock Adjustment
When PUT /products/:id/stock is called:
```
1. Validate adjustment qty and reason
2. Calculate qty_before = current on_hand_qty
3. Calculate qty_after = on_hand_qty + adjustment (negative for deduction)
4. UPDATE products SET on_hand_qty = qty_after WHERE product_id = :id
5. INSERT into inventory_transactions (product_id, reference_type='ADJUSTMENT',
   txn_type='ADJUST', qty=adjustment, qty_before, qty_after, created_by)
6. INSERT into audit_logs
```

---

## MODULE 04-E: BILL OF MATERIALS (BOM)

### Tables: bom, bom_lines

### Endpoints
```
GET    /api/v1/bom                → List BOMs (filter: bom_type, is_active, product_id)
GET    /api/v1/bom/:id            → Get BOM with all bom_lines + component details
GET    /api/v1/bom/product/:productId → Get active BOM for a specific product
POST   /api/v1/bom                → Create BOM header
PUT    /api/v1/bom/:id            → Update BOM header
DELETE /api/v1/bom/:id            → Soft delete BOM (only if no in_progress/confirmed MOs use it)

POST   /api/v1/bom/:id/lines      → Add component line to BOM
PUT    /api/v1/bom/:id/lines/:lineId → Update component qty/uom/operation
DELETE /api/v1/bom/:id/lines/:lineId → Remove component line from BOM
```

### Business Rules
- One product can have multiple BOMs (different versions) but only ONE `is_active=TRUE` BOM
  When creating a new BOM for a product with existing active BOM, deactivate the old one
- `bom_lines` has `UNIQUE KEY uq_bom_component (bom_id, component_id)` —
  a component can appear only once per BOM; to split across operations, use one line + operation_id
- A BOM cannot reference its own finished product as a component (circular check needed)
- Component must be a non-service product (product_type != 'service')
- Soft delete BOM blocked if it is referenced by any MO with status NOT IN ('cancelled')
- When a BOM is created for a product, optionally update products.bom_id to this new bom_id

### BOM Response Shape
```json
{
  "bom_id": 1,
  "product_id": 1,
  "product_code": "FG-001",
  "product_name": "Wooden Dining Table",
  "bom_name": "BOM – Wooden Dining Table v1",
  "qty": 1.0,
  "bom_type": "manufacture",
  "is_active": true,
  "lines": [
    {
      "bom_line_id": 1,
      "component_id": 7,
      "component_code": "RM-001",
      "component_name": "Teak Wood Plank",
      "qty": 6.0,
      "uom": "Pcs",
      "operation_id": 1,
      "operation_name": "Cut Wood Planks",
      "work_center_name": "Cutting Station"
    }
  ]
}
```

---

## MODULE 04-F: WORK CENTERS & OPERATIONS

### Tables: work_centers, operations

### Endpoints
```
GET    /api/v1/work-centers            → List (filter: is_active)
GET    /api/v1/work-centers/:id        → Get with operations list
POST   /api/v1/work-centers            → Create
PUT    /api/v1/work-centers/:id        → Update
DELETE /api/v1/work-centers/:id        → Soft delete (blocked if active operations exist)

GET    /api/v1/operations              → List (filter: work_center_id, is_active)
GET    /api/v1/operations/:id          → Get operation detail
POST   /api/v1/operations              → Create (must specify work_center_id)
PUT    /api/v1/operations/:id          → Update
DELETE /api/v1/operations/:id          → Soft delete (blocked if referenced in active bom_lines)
```

### Business Rules
- `work_centers.code` must be unique (non-deleted)
- `operations.code` must be unique (non-deleted)
- `capacity_per_day` is in hours (default 8.0 = standard workday)
- `cost_per_hour` is used in future costing calculations
- A Work Center cannot be deleted if it has active (non-deleted) operations
- An Operation cannot be deleted if bom_lines reference it (SET NULL on delete is in schema
  so FK won't block it, but application should WARN user before deleting)

---

## MODULE 04-G: SALES ORDERS

### Tables: sales_orders, sales_order_lines, stock_reservations

### Endpoints
```
GET    /api/v1/sales-orders            → List (filter: status, so_type, customer_id, date range)
GET    /api/v1/sales-orders/:id        → Get SO with lines + reservation status
GET    /api/v1/sales-orders/stats      → Summary counts by status (for dashboard)
POST   /api/v1/sales-orders            → Create SO in draft
PUT    /api/v1/sales-orders/:id        → Update SO (only in draft status)
DELETE /api/v1/sales-orders/:id        → Soft delete (only draft/cancelled)

POST   /api/v1/sales-orders/:id/confirm    → Confirm SO (triggers reservation + MTO check)
POST   /api/v1/sales-orders/:id/deliver    → Mark delivery (partial or full)
POST   /api/v1/sales-orders/:id/cancel     → Cancel SO (releases reservations)

POST   /api/v1/sales-orders/:id/lines            → Add line item
PUT    /api/v1/sales-orders/:id/lines/:solId     → Update line (only draft SO)
DELETE /api/v1/sales-orders/:id/lines/:solId     → Remove line (only draft SO)
```

### SO Status State Machine
```
draft ──confirm──> confirmed ──deliver──> in_progress ──fully_delivered──> done
  │                    │
  └──cancel──> cancelled
               └──(from confirmed, releases reservation)
```

### Confirm SO Business Logic (CRITICAL)
```
Transaction block:
1. Validate SO is in 'draft' status
2. For each SO line:
   a. Fetch product (lock row: SELECT ... FOR UPDATE)
   b. Check product.free_to_use_qty >= line.qty
   c. IF sufficient stock (MTS scenario):
      - UPDATE products SET reserved_qty = reserved_qty + line.qty
      - INSERT stock_reservations (product_id, so_id, reserved_qty=line.qty, status='active')
      - INSERT inventory_transactions (txn_type='RESERVE', reference_type='SO')
      - UPDATE sales_order_lines SET reserved_qty = line.qty
   d. IF insufficient stock AND so_type='MTS':
      - Reserve whatever is available (free_to_use_qty amount)
      - Call procurement.service.triggerReplenishment(product, shortage_qty, so_id=null)
      - Creates a PO or MTS MO automatically
   e. IF so_type='MTO':
      - Reserve 0 (stock doesn't exist yet)
      - Call procurement.service.triggerMTOReplenishment(product, line.qty, so_id)
      - Creates an MTO MO or PO linked to this SO
3. UPDATE sales_orders SET status='confirmed', updated_by=req.user.user_id
4. UPDATE total_amount = SUM of all line subtotals
5. INSERT audit_logs
6. Commit transaction
```

### Deliver SO Business Logic
```
Transaction block:
1. Validate SO is in 'confirmed' or 'in_progress'
2. For each delivery line (product_id + qty_to_deliver):
   a. Check stock_reservations.reserved_qty >= qty_to_deliver
   b. UPDATE products SET on_hand_qty = on_hand_qty - qty_to_deliver,
                          reserved_qty = reserved_qty - qty_to_deliver
   c. UPDATE stock_reservations SET status='consumed' (if fully fulfilled)
   d. UPDATE sales_order_lines SET delivered_qty = delivered_qty + qty_to_deliver
   e. INSERT inventory_transactions (txn_type='OUT', reference_type='SO')
3. Check if all lines fully delivered → UPDATE SO status to 'done'
   Else → UPDATE SO status to 'in_progress'
4. INSERT audit_logs
5. Commit
```

### Cancel SO Business Logic
```
Transaction block:
1. Validate SO is NOT in 'done' status
2. For each active stock_reservation for this SO:
   a. UPDATE products SET reserved_qty = reserved_qty - reservation.reserved_qty
   b. UPDATE stock_reservations SET status='released'
   c. INSERT inventory_transactions (txn_type='UNRESERVE', reference_type='SO')
3. UPDATE sales_orders SET status='cancelled'
4. INSERT audit_logs
5. Commit
```

---

## MODULE 04-H: PURCHASE ORDERS

### Tables: purchase_orders, purchase_order_lines

### Endpoints
```
GET    /api/v1/purchase-orders            → List (filter: status, vendor_id, date range)
GET    /api/v1/purchase-orders/:id        → Get PO with lines
GET    /api/v1/purchase-orders/stats      → Summary by status (dashboard)
POST   /api/v1/purchase-orders            → Create PO in draft
PUT    /api/v1/purchase-orders/:id        → Update PO (draft or sent only)
DELETE /api/v1/purchase-orders/:id        → Soft delete (draft only)

POST   /api/v1/purchase-orders/:id/send      → Mark as 'sent' to vendor
POST   /api/v1/purchase-orders/:id/confirm   → Vendor confirmed the PO
POST   /api/v1/purchase-orders/:id/receive   → Receive products (partial or full)
POST   /api/v1/purchase-orders/:id/cancel    → Cancel PO
```

### PO Status State Machine
```
draft ──send──> sent ──confirm──> confirmed ──receive──> received
  │              │                    │
  └─────────────cancel──────────────> cancelled
```

### Receive PO Business Logic (CRITICAL — stock IN)
```
Transaction block:
1. Validate PO is 'confirmed' or partially received (status='confirmed')
2. For each received line (product_id + qty_received):
   a. Validate qty_received <= (qty_ordered - already_received)
   b. UPDATE products SET on_hand_qty = on_hand_qty + qty_received
   c. UPDATE purchase_order_lines SET qty_received = qty_received + :qty
   d. INSERT inventory_transactions (txn_type='IN', reference_type='PO',
      qty=qty_received, qty_before, qty_after)
3. UPDATE purchase_orders.total_amount = SUM of line subtotals
4. Check if all lines fully received → UPDATE PO status to 'received'
   Else keep as 'confirmed'
5. After stock IN: call procurement.service.checkAndSatisfyReservations(product_id)
   → If an MTS SO was waiting for stock, try to reserve the newly arrived quantity
6. INSERT audit_logs
7. Commit
```

### PO Create Validation
```
vendor_id: must exist in partners where is_vendor=TRUE and is_deleted=FALSE
lines[]: array, min 1 item
lines[].product_id: valid product, not is_deleted
lines[].qty_ordered: > 0
lines[].unit_cost: >= 0
expected_date: optional, must be future date
```

---

## MODULE 04-I: MANUFACTURING ORDERS

### Tables: manufacturing_orders, mo_components, work_orders

### Endpoints
```
GET    /api/v1/manufacturing-orders            → List (filter: status, mo_type, product_id)
GET    /api/v1/manufacturing-orders/:id        → Get MO with components + work orders
GET    /api/v1/manufacturing-orders/stats      → Summary by status (dashboard)
POST   /api/v1/manufacturing-orders            → Create MO in draft
PUT    /api/v1/manufacturing-orders/:id        → Update MO (draft only)
DELETE /api/v1/manufacturing-orders/:id        → Soft delete (draft only)

POST   /api/v1/manufacturing-orders/:id/confirm      → Confirm MO (explodes BOM, reserves components)
POST   /api/v1/manufacturing-orders/:id/start        → Set to in_progress
POST   /api/v1/manufacturing-orders/:id/produce      → Record production qty (partial/full)
POST   /api/v1/manufacturing-orders/:id/cancel       → Cancel MO (release component reservations)
```

### MO Status State Machine
```
draft ──confirm──> confirmed ──start──> in_progress ──produce(all)──> done
  │                   │                      │
  └─────────────────cancel──────────────> cancelled
```

### Confirm MO Business Logic — BOM Explosion (CRITICAL)
```
Transaction block:
1. Validate MO is 'draft'
2. Fetch BOM (mo.bom_id) with all bom_lines
3. For each bom_line:
   a. qty_planned = bom_line.qty * mo.qty_planned
   b. INSERT mo_components (mo_id, product_id=bom_line.component_id,
      bom_line_id, qty_planned, qty_consumed=0, uom, is_available=FALSE)
4. For each mo_component:
   a. Check component product.free_to_use_qty >= component.qty_planned
   b. IF sufficient:
      - UPDATE products SET reserved_qty = reserved_qty + component.qty_planned
      - INSERT inventory_transactions (txn_type='RESERVE', reference_type='MO')
      - UPDATE mo_components SET is_available=TRUE
   c. IF insufficient → is_available stays FALSE (flag for purchasing team)
5. Create work_orders from BOM operations (if operations are defined in bom_lines)
   - GROUP bom_lines by operation_id, one WO per unique operation
   - INSERT work_orders (mo_id, operation_id, work_center_id, operation_name, status='pending',
     duration_hours=operation.duration_minutes/60)
6. UPDATE manufacturing_orders SET status='confirmed'
7. INSERT audit_logs
8. Commit
```

### Produce MO Business Logic (Mark Production)
```
Transaction block:
1. Validate MO is 'in_progress'
2. Accept qty_to_produce (≤ qty_planned - qty_produced)
3. For each mo_component (scaled proportionally or explicit):
   a. qty_to_consume = component.qty_planned * (qty_to_produce / mo.qty_planned)
   b. UPDATE products SET on_hand_qty = on_hand_qty - qty_to_consume,
                          reserved_qty = reserved_qty - qty_to_consume
   c. UPDATE mo_components SET qty_consumed = qty_consumed + qty_to_consume
   d. INSERT inventory_transactions (txn_type='OUT', reference_type='MO')
4. UPDATE products (finished good) SET on_hand_qty = on_hand_qty + qty_to_produce
5. INSERT inventory_transactions (txn_type='IN', reference_type='MO') for finished good
6. UPDATE manufacturing_orders SET qty_produced = qty_produced + qty_to_produce
7. If qty_produced >= qty_planned → SET status='done', completed_at=NOW()
8. INSERT audit_logs
9. Commit
```

---

## MODULE 04-J: WORK ORDERS

### Table: work_orders

### Endpoints
```
GET    /api/v1/work-orders                    → List (filter: status, mo_id, work_center_id)
GET    /api/v1/work-orders/:id                → Get WO detail
PUT    /api/v1/work-orders/:id                → Update WO (scheduled_date, duration_hours)

POST   /api/v1/work-orders/:id/start          → Set status to in_progress, started_at=NOW()
POST   /api/v1/work-orders/:id/complete       → Set status to done, completed_at=NOW()
POST   /api/v1/work-orders/:id/cancel         → Cancel WO
```

### Business Rules
- A WO can only be started if parent MO is 'confirmed' or 'in_progress'
- Completing ALL work orders for an MO does NOT auto-produce — production is explicit
- WOs are created automatically on MO confirmation (BOM explosion step)
- WOs can also be added manually to an MO (custom operations not in BOM)
- `duration_hours` can differ from `operations.duration_minutes / 60` (actual vs. estimated)

---

## MODULE 04-K: INVENTORY & STOCK

### Tables: warehouses, stock_locations, inventory_transactions, stock_reservations

### Endpoints
```
GET    /api/v1/warehouses                     → List warehouses with location count
GET    /api/v1/warehouses/:id                 → Get warehouse + locations
POST   /api/v1/warehouses                     → Create warehouse
PUT    /api/v1/warehouses/:id                 → Update
DELETE /api/v1/warehouses/:id                 → Soft delete (blocked if has locations)

GET    /api/v1/locations                      → List locations (filter: warehouse_id, type)
POST   /api/v1/locations                      → Create location
PUT    /api/v1/locations/:id                  → Update
DELETE /api/v1/locations/:id                  → Soft delete

GET    /api/v1/inventory/transactions         → List inventory transactions (filter: product_id,
                                                  txn_type, reference_type, date range)
GET    /api/v1/inventory/transactions/:id     → Get transaction detail
GET    /api/v1/inventory/ledger/:productId    → Full stock ledger for a product

GET    /api/v1/inventory/reservations         → List reservations (filter: product_id, so_id, status)
```

### Key Rules for inventory_transactions
- IMMUTABLE — no UPDATE or DELETE ever. Only INSERT.
- `qty_before + qty = qty_after` MUST always be true (application enforces)
- For OUT transactions, qty stored as POSITIVE number but reduces stock
  (txn_type determines direction, not sign of qty)
- `reference_id` holds the SO/PO/MO id, `reference_type` says which table

### Stock Ledger Query (for product/:id/ledger)
```sql
SELECT
    txn_id, reference_type, reference_id, txn_type,
    qty, qty_before, qty_after, notes, created_at,
    u.name AS created_by_name,
    sl.name AS location_name
FROM inventory_transactions it
LEFT JOIN users u ON u.user_id = it.created_by
LEFT JOIN stock_locations sl ON sl.location_id = it.location_id
WHERE it.product_id = :productId
ORDER BY it.created_at ASC;
```

---

## MODULE 04-L: PROCUREMENT RULES & AUTOMATION

### Table: procurement_rules

### Endpoints
```
GET    /api/v1/procurement-rules              → List rules (filter: strategy, is_active)
GET    /api/v1/procurement-rules/:id          → Get rule detail
GET    /api/v1/procurement-rules/product/:pid → Get rule for specific product
POST   /api/v1/procurement-rules              → Create rule (one per product)
PUT    /api/v1/procurement-rules/:id          → Update rule
DELETE /api/v1/procurement-rules/:id          → Soft delete

POST   /api/v1/procurement-rules/run          → Manually trigger procurement check (Admin)
```

### Procurement Automation Logic (procurement.service.js)

The service is triggered in two ways:
1. **Automatic**: When SO is confirmed and stock is insufficient (MTS shortage)
2. **Scheduled**: via node-cron job (configurable, e.g., daily at midnight)
3. **Manual**: via the API endpoint above

```
FUNCTION checkAndTriggerProcurement():
  1. SELECT all procurement_rules WHERE is_active=TRUE AND is_deleted=FALSE
  2. For each rule:
     a. Fetch product.on_hand_qty, product.reserved_qty, product.free_to_use_qty
     b. Fetch product.min_stock_qty
     c. IF strategy = 'MTS' AND free_to_use_qty <= rule.min_stock_qty:
        - shortage = rule.reorder_qty (or custom calc)
        - IF product.procurement_type = 'buy':
            → createAutoPurchaseOrder(product, rule.preferred_vendor_id, shortage)
        - IF product.procurement_type = 'manufacture':
            → createAutoManufacturingOrder(product, shortage, so_id=null, mo_type='MTS')
        - IF product.procurement_type = 'both':
            → Prefer manufacturing if BOM exists and components available, else buy
     d. IF strategy = 'MTO': skip (triggered only per SO)

FUNCTION createAutoPurchaseOrder(product, vendor_id, qty):
  1. SELECT preferred vendor from product_vendors WHERE is_preferred=TRUE (fallback to rule.preferred_vendor_id)
  2. INSERT purchase_orders (vendor_id, status='draft', notes='Auto-generated by procurement engine')
  3. INSERT purchase_order_lines (po_id, product_id, qty_ordered=qty, unit_cost from product_vendors)
  4. INSERT audit_logs
  5. Return po_id

FUNCTION createAutoManufacturingOrder(product, qty, so_id, mo_type):
  1. Fetch active BOM for product
  2. INSERT manufacturing_orders (product_id, bom_id, so_id, mo_type, status='draft', qty_planned=qty)
  3. Auto-confirm it (triggers BOM explosion) if stock is available
  4. INSERT audit_logs
  5. Return mo_id
```

---

## MODULE 04-M: DASHBOARD

### Endpoints
```
GET    /api/v1/dashboard/summary        → All KPI counts
GET    /api/v1/dashboard/sales          → Sales order stats + recent orders
GET    /api/v1/dashboard/purchase       → Purchase stats + pending receipts
GET    /api/v1/dashboard/manufacturing  → MO stats + in-progress MOs
GET    /api/v1/dashboard/inventory      → Low stock products, stock value
GET    /api/v1/dashboard/alerts         → Pending issues (low stock, overdue, blocked WOs)
```

### Dashboard Summary Query
```sql
-- KPI Query
SELECT
  (SELECT COUNT(*) FROM sales_orders WHERE status NOT IN ('cancelled') AND is_deleted=FALSE) AS total_sos,
  (SELECT COUNT(*) FROM sales_orders WHERE status='confirmed' AND is_deleted=FALSE) AS pending_deliveries,
  (SELECT COUNT(*) FROM sales_orders WHERE status='in_progress' AND is_deleted=FALSE) AS partial_deliveries,
  (SELECT COUNT(*) FROM purchase_orders WHERE status NOT IN ('received','cancelled') AND is_deleted=FALSE) AS open_pos,
  (SELECT COUNT(*) FROM purchase_orders WHERE status IN ('draft','sent') AND is_deleted=FALSE) AS pending_receipts,
  (SELECT COUNT(*) FROM manufacturing_orders WHERE status='in_progress' AND is_deleted=FALSE) AS active_mos,
  (SELECT COUNT(*) FROM manufacturing_orders WHERE status='confirmed' AND is_deleted=FALSE) AS pending_mos,
  (SELECT COUNT(*) FROM products WHERE on_hand_qty <= min_stock_qty AND is_deleted=FALSE AND is_active=TRUE) AS low_stock_count,
  (SELECT COUNT(*) FROM work_orders WHERE status='in_progress' AND is_deleted=FALSE) AS active_work_orders;
```

---

## MODULE 04-N: AUDIT LOGS

### Table: audit_logs

### Endpoints
```
GET    /api/v1/audit-logs              → List (filter: user_id, table_name, action, date range)
GET    /api/v1/audit-logs/:id          → Get single log entry
GET    /api/v1/audit-logs/record/:table/:recordId → All changes for a specific record
```

### Audit Service
```js
// audit.service.js
async function logAudit({ user_id, table_name, record_id, action, old_values, new_values, ip_address }) {
  await db.query(
    `INSERT INTO audit_logs (user_id, table_name, record_id, action, old_values, new_values, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [user_id, table_name, record_id, action,
     old_values ? JSON.stringify(old_values) : null,
     new_values ? JSON.stringify(new_values) : null,
     ip_address]
  );
}
```

This service is called at the END of every successful write operation, BEFORE commit.
Never call it inside try blocks that might rollback — always call before committing.

---

# PART 05 — FRONTEND ARCHITECTURE & PAGE PLAN

## 5.1 Directory Structure

```
frontend/
├── .env
├── package.json
├── vite.config.js
├── index.html
└── src/
    ├── main.jsx                      ← PrimeReact theme provider, Redux store, i18n setup
    ├── App.jsx                       ← createBrowserRouter setup
    ├── store/
    │   ├── index.js                  ← Redux store
    │   ├── slices/
    │   │   ├── auth.slice.js         ← user, tokens, isAuthenticated
    │   │   ├── notification.slice.js ← toast messages queue
    │   │   └── ui.slice.js           ← sidebar collapsed, theme, loading states
    ├── contexts/
    │   ├── AuthContext.jsx
    │   ├── ThemeContext.jsx
    │   └── BreakpointContext.jsx
    ├── hooks/
    │   ├── useAuth.js
    │   ├── usePermission.js
    │   ├── usePagination.js
    │   └── useToast.js
    ├── services/
    │   ├── api.js                    ← Axios instance with interceptors
    │   ├── auth.service.js
    │   ├── user.service.js
    │   ├── partner.service.js
    │   ├── product.service.js
    │   ├── bom.service.js
    │   ├── work-center.service.js
    │   ├── operation.service.js
    │   ├── sales-order.service.js
    │   ├── purchase-order.service.js
    │   ├── manufacturing-order.service.js
    │   ├── work-order.service.js
    │   ├── inventory.service.js
    │   ├── warehouse.service.js
    │   ├── procurement-rule.service.js
    │   ├── dashboard.service.js
    │   └── audit-log.service.js
    ├── components/
    │   ├── layout/
    │   │   ├── AppLayout.jsx         ← Sidebar + topbar + content area
    │   │   ├── Sidebar.jsx           ← Dynamic nav based on permissions
    │   │   ├── Topbar.jsx            ← User menu, notifications, theme toggle
    │   │   └── PageHeader.jsx        ← Title + breadcrumb + action buttons
    │   ├── shared/
    │   │   ├── DataTable.jsx         ← PrimeReact DataTable wrapper with pagination
    │   │   ├── StatusBadge.jsx       ← Color-coded status chips
    │   │   ├── ConfirmDialog.jsx     ← Reusable confirm modal
    │   │   ├── SearchBar.jsx
    │   │   ├── FilterPanel.jsx
    │   │   ├── EmptyState.jsx
    │   │   ├── LoadingSpinner.jsx
    │   │   └── FormField.jsx         ← Label + input + error message wrapper
    │   └── domain/
    │       ├── products/
    │       │   ├── ProductForm.jsx
    │       │   ├── StockBadge.jsx     ← Shows on_hand / reserved / free_to_use
    │       │   └── VendorLinkForm.jsx
    │       ├── bom/
    │       │   ├── BomLineTable.jsx
    │       │   └── BomLineForm.jsx
    │       ├── orders/
    │       │   ├── OrderLineTable.jsx
    │       │   ├── OrderStatusStepper.jsx
    │       │   └── DeliveryForm.jsx
    │       └── manufacturing/
    │           ├── BomExplosionView.jsx
    │           ├── WorkOrderList.jsx
    │           └── ComponentAvailability.jsx
    ├── pages/
    │   ├── Auth/
    │   │   ├── Login.jsx
    │   │   ├── SignUp.jsx
    │   │   └── ForgotPassword.jsx
    │   ├── Dashboard/
    │   │   └── index.jsx
    │   ├── Users/
    │   │   ├── UserList.jsx
    │   │   └── UserForm.jsx
    │   ├── Roles/
    │   │   ├── RoleList.jsx
    │   │   └── RolePermissionEditor.jsx
    │   ├── Partners/
    │   │   ├── PartnerList.jsx
    │   │   ├── PartnerForm.jsx
    │   │   └── PartnerDetail.jsx
    │   ├── Products/
    │   │   ├── ProductList.jsx
    │   │   ├── ProductForm.jsx
    │   │   └── ProductDetail.jsx
    │   ├── BOM/
    │   │   ├── BomList.jsx
    │   │   ├── BomForm.jsx
    │   │   └── BomDetail.jsx
    │   ├── WorkCenters/
    │   │   ├── WorkCenterList.jsx
    │   │   └── WorkCenterForm.jsx
    │   ├── Operations/
    │   │   ├── OperationList.jsx
    │   │   └── OperationForm.jsx
    │   ├── SalesOrders/
    │   │   ├── SoList.jsx
    │   │   ├── SoForm.jsx
    │   │   └── SoDetail.jsx
    │   ├── PurchaseOrders/
    │   │   ├── PoList.jsx
    │   │   ├── PoForm.jsx
    │   │   └── PoDetail.jsx
    │   ├── ManufacturingOrders/
    │   │   ├── MoList.jsx
    │   │   ├── MoForm.jsx
    │   │   └── MoDetail.jsx
    │   ├── WorkOrders/
    │   │   └── WorkOrderList.jsx
    │   ├── Inventory/
    │   │   ├── StockOverview.jsx
    │   │   ├── TransactionList.jsx
    │   │   └── LedgerView.jsx
    │   ├── Warehouses/
    │   │   ├── WarehouseList.jsx
    │   │   └── WarehouseForm.jsx
    │   ├── ProcurementRules/
    │   │   ├── RuleList.jsx
    │   │   └── RuleForm.jsx
    │   └── AuditLogs/
    │       └── AuditLogList.jsx
    ├── router/
    │   ├── router.jsx               ← createBrowserRouter with all routes
    │   ├── AuthGuard.jsx            ← Protected route wrapper
    │   ├── GhostGuard.jsx           ← Redirect logged-in users away from auth pages
    │   └── PermissionGuard.jsx      ← Check module permission before rendering
    └── utils/
        ├── jwt.utils.js
        ├── format.utils.js          ← Date, currency, qty formatting
        └── permission.utils.js      ← hasPermission(role, module, action)
```

## 5.2 Routing Structure

```
/                       → redirect to /dashboard (if auth) or /login (if not)
/login                  → Login.jsx (GhostGuard)
/signup                 → SignUp.jsx (GhostGuard)
/forgot-password        → ForgotPassword.jsx (GhostGuard)

/dashboard              → Dashboard/index.jsx (AuthGuard)

/users                  → Users/UserList.jsx
/users/new              → Users/UserForm.jsx
/users/:id              → Users/UserForm.jsx (edit mode)

/roles                  → Roles/RoleList.jsx
/roles/:id/permissions  → Roles/RolePermissionEditor.jsx

/partners               → Partners/PartnerList.jsx
/partners/new           → Partners/PartnerForm.jsx
/partners/:id           → Partners/PartnerDetail.jsx
/partners/:id/edit      → Partners/PartnerForm.jsx

/products               → Products/ProductList.jsx
/products/new           → Products/ProductForm.jsx
/products/:id           → Products/ProductDetail.jsx
/products/:id/edit      → Products/ProductForm.jsx

/bom                    → BOM/BomList.jsx
/bom/new                → BOM/BomForm.jsx
/bom/:id                → BOM/BomDetail.jsx

/work-centers           → WorkCenters/WorkCenterList.jsx
/operations             → Operations/OperationList.jsx

/sales-orders           → SalesOrders/SoList.jsx
/sales-orders/new       → SalesOrders/SoForm.jsx
/sales-orders/:id       → SalesOrders/SoDetail.jsx

/purchase-orders        → PurchaseOrders/PoList.jsx
/purchase-orders/new    → PurchaseOrders/PoForm.jsx
/purchase-orders/:id    → PurchaseOrders/PoDetail.jsx

/manufacturing-orders   → ManufacturingOrders/MoList.jsx
/manufacturing-orders/new → ManufacturingOrders/MoForm.jsx
/manufacturing-orders/:id → ManufacturingOrders/MoDetail.jsx

/work-orders            → WorkOrders/WorkOrderList.jsx

/inventory              → Inventory/StockOverview.jsx
/inventory/transactions → Inventory/TransactionList.jsx
/inventory/:productId/ledger → Inventory/LedgerView.jsx

/warehouses             → Warehouses/WarehouseList.jsx

/procurement-rules      → ProcurementRules/RuleList.jsx

/audit-logs             → AuditLogs/AuditLogList.jsx
```

## 5.3 Axios Interceptor Setup (api.js)

```
Request Interceptor:
  → Read access token from localStorage
  → Add Authorization: Bearer <token> header

Response Interceptor:
  → On 401 response:
      1. Try POST /auth/refresh with refresh token
      2. If success: update localStorage, retry original request with new token
      3. If refresh also fails: clear localStorage, redirect to /login
  → On 403: show "Permission Denied" toast, do NOT redirect
  → On 422: extract error message, show in form validation
  → On 500: show "Server Error" toast
```

## 5.4 Sidebar Navigation (Dynamic by Role)

```
Dashboard          (all roles)
Masters
  ├── Users        (Admin only)
  ├── Roles        (Admin only)
  ├── Partners     (Admin, Purchase User)
  ├── Products     (Admin, Inventory Manager, Business Owner)
  ├── Bill of Materials  (Admin, Manufacturing User)
  ├── Work Centers (Admin, Manufacturing User)
  └── Operations   (Admin, Manufacturing User)
Transactions
  ├── Sales Orders        (Admin, Sales User)
  ├── Purchase Orders     (Admin, Purchase User)
  ├── Manufacturing Orders (Admin, Manufacturing User)
  └── Work Orders         (Admin, Manufacturing User)
Inventory
  ├── Stock Overview      (Admin, Inventory Manager)
  ├── Transactions        (Admin, Inventory Manager)
  └── Warehouses          (Admin, Inventory Manager)
Automation
  └── Procurement Rules   (Admin, Inventory Manager)
Reports
  └── Audit Logs          (Admin only)
```

## 5.5 Key Page Behaviors

### SoDetail.jsx (Sales Order Detail)
```
Sections:
  - Header: SO number, customer, type (MTS/MTO), status, dates
  - Status Stepper: Draft → Confirmed → In Progress → Done
  - Line Items Table: product, qty, unit_price, subtotal, reserved_qty, delivered_qty
  - Reservations Panel: stock_reservations rows for this SO
  - Actions:
    - [Confirm] (only when draft)
    - [Deliver] (only when confirmed/in_progress, opens delivery form)
    - [Cancel] (when draft or confirmed)
  - Audit Trail tab: all audit_logs for this SO
```

### MoDetail.jsx (Manufacturing Order Detail)
```
Sections:
  - Header: MO ref, product, BOM, type (MTS/MTO), status, linked SO
  - Components Tab:
    - BOM explosion table: component, qty_planned, qty_consumed, is_available badge
    - Red badge on is_available=FALSE rows (trigger purchase from here)
  - Work Orders Tab:
    - List of WOs with status, work center, operator
    - Start/Complete buttons inline
  - Production Tab:
    - qty_planned vs qty_produced progress bar
    - [Produce] button to record production
  - Actions: [Confirm], [Start], [Produce], [Cancel]
```

### ProductDetail.jsx
```
Sections:
  - Product info + current stock metrics (3 cards: On Hand / Reserved / Free to Use)
  - Stock alert if on_hand_qty <= min_stock_qty
  - BOM tab (if procurement_type includes 'manufacture')
  - Vendors tab (product_vendors rows with edit inline)
  - Procurement Rule tab (view/edit linked rule)
  - Inventory Ledger tab (full transaction history for this product)
```

---

# PART 06 — BUSINESS LOGIC DEEP DIVES

## 06-A: MTS (Make to Stock) Flow — End to End

```
Step 1: Product Setup
  products.procurement_strategy = 'MTS'
  products.min_stock_qty = 5 (e.g.)
  procurement_rules: strategy='MTS', min_stock_qty=5, reorder_qty=20, preferred_vendor_id=1

Step 2: Production Run (proactive)
  Manufacturing Order created for 25 units → confirmed → BOM explodes → WOs created
  → Operators complete WOs → Produce 25 units
  → products.on_hand_qty += 25
  → inventory_transactions: IN, reference_type=MO

Step 3: Customer Order Arrives
  Sales Order created: 10 Wooden Dining Tables
  SO confirmed:
    → Check free_to_use_qty = on_hand_qty(25) - reserved_qty(0) = 25 ≥ 10 ✓
    → reserved_qty += 10
    → stock_reservations: INSERT (active, qty=10)
    → inventory_transactions: RESERVE

Step 4: Delivery
  Deliver 10 units to customer:
    → on_hand_qty -= 10 (now 15)
    → reserved_qty -= 10 (now 0)
    → stock_reservations: status → consumed
    → sales_order_lines.delivered_qty = 10
    → inventory_transactions: OUT

Step 5: Reorder Trigger
  After delivery: free_to_use_qty = 15 - 0 = 15
  If 15 <= min_stock_qty (5): NO trigger yet (15 > 5)
  
  Next order arrives for 12 units:
  free_to_use_qty before reservation = 15
  After reserving 12: free_to_use_qty = 3
  3 <= min_stock_qty(5): TRIGGER procurement
  → Auto-create Purchase Order for reorder_qty=20 units from vendor 1
```

## 06-B: MTO (Make to Order) Flow — End to End

```
Step 1: Customer Order Arrives
  Sales Order created: 10 Wooden Dining Tables, so_type='MTO'

Step 2: SO Confirmed
  → free_to_use_qty = 5 (only 5 in stock, need 10)
  → Reserve available 5
  → Shortage = 5 units
  → procurement.service.triggerMTOReplenishment(product, qty=5, so_id=SO.so_id)

Step 3: Auto MO Created
  manufacturing_orders:
    product_id=1, bom_id=1, so_id=SO.so_id, mo_type='MTO',
    status='draft', qty_planned=5

Step 4: MO Confirmed (BOM Exploded)
  For 5 Dining Tables, BOM says:
    - Teak Plank × 6 each = 30 total
    - Plywood Sheet × 2 each = 10 total
    - Screws Pack × 1 each = 5 total
  mo_components inserted for all 3 components
  Component stock checked:
    - Teak: free_to_use=200-50=150 ≥ 30 ✓ → RESERVE 30
    - Plywood: free_to_use=150-34=116 ≥ 10 ✓ → RESERVE 10
    - Screws: free_to_use=250-85=165 ≥ 5 ✓ → RESERVE 5
  All is_available = TRUE
  Work Orders created from BOM operations

Step 5: Production
  Operators start and complete Work Orders
  → Produce 5 Dining Tables
  → Components consumed from stock
  → Finished goods added to stock
  → SO delivery can proceed

Step 6: SO Delivery
  5 remaining units delivered to customer
  Total: 5 (from stock) + 5 (from MTO production) = 10 units complete
```

## 06-C: BOM Explosion Algorithm Detail

```
INPUT:
  mo_id       = 5
  mo.bom_id   = 1   (BOM for Dining Table)
  mo.qty_planned = 5

STEP 1: Fetch BOM lines
  SELECT bl.*, p.product_code, p.product_name, p.uom
  FROM bom_lines bl
  JOIN products p ON p.product_id = bl.component_id
  WHERE bl.bom_id = 1;

  Result:
  | bom_line_id | component_id | qty  | uom   | operation_id |
  |-------------|-------------|------|-------|--------------|
  | 1           | 7 (Teak)    | 6.0  | Pcs   | 1            |
  | 2           | 8 (Plywood) | 2.0  | Sheet | 2            |
  | 3           | 11 (Screws) | 1.0  | Pack  | 3            |

STEP 2: Calculate planned quantities
  bom_base_qty = bom.qty (1.0 — this BOM produces 1 unit)
  scale_factor = mo.qty_planned / bom_base_qty = 5 / 1 = 5

  component.qty_planned = bom_line.qty × scale_factor
  Teak:    6.0 × 5 = 30.0 Pcs
  Plywood: 2.0 × 5 = 10.0 Sheet
  Screws:  1.0 × 5 =  5.0 Pack

STEP 3: Insert mo_components
  INSERT mo_components (mo_id=5, product_id=7, bom_line_id=1, qty_planned=30, ...)
  INSERT mo_components (mo_id=5, product_id=8, bom_line_id=2, qty_planned=10, ...)
  INSERT mo_components (mo_id=5, product_id=11, bom_line_id=3, qty_planned=5, ...)

STEP 4: Reserve components
  For each mo_component:
    SELECT on_hand_qty, reserved_qty FROM products WHERE product_id=? FOR UPDATE;
    free = on_hand_qty - reserved_qty;
    IF free >= qty_planned:
      UPDATE products SET reserved_qty = reserved_qty + qty_planned
      INSERT inventory_transactions (txn_type='RESERVE', reference_type='MO', reference_id=mo_id)
      UPDATE mo_components SET is_available=TRUE
    ELSE:
      is_available stays FALSE
      (Flag: procurement team must create PO for this component)

STEP 5: Create Work Orders from BOM operations
  Collect unique operation_ids from bom_lines: [1, 2, 3]
  For each unique operation:
    Fetch operation (name, work_center_id, duration_minutes)
    INSERT work_orders (mo_id, operation_id, work_center_id, operation_name,
                        status='pending', duration_hours=duration_minutes/60,
                        scheduled_date=mo.scheduled_date)
```

## 06-D: Stock Reservation & Release Lifecycle

```
States of stock_reservations:
  active   → Stock held for this SO, cannot be used elsewhere
  released → SO was cancelled, stock freed
  consumed → SO fully delivered, stock used

Reservation creates these parallel updates:
  1. products.reserved_qty increases
  2. products.free_to_use_qty GENERATED COLUMN decreases automatically
  3. stock_reservations row with status='active' created
  4. inventory_transactions row with txn_type='RESERVE' created

When SO is delivered:
  1. products.on_hand_qty decreases
  2. products.reserved_qty decreases
  3. stock_reservations.status → 'consumed'
  4. inventory_transactions row with txn_type='OUT' created

When SO is cancelled:
  1. products.reserved_qty decreases (releasing hold)
  2. products.on_hand_qty UNCHANGED (nothing actually left the warehouse)
  3. stock_reservations.status → 'released'
  4. inventory_transactions row with txn_type='UNRESERVE' created

Double-reservation prevention:
  The MySQL row-level lock (SELECT ... FOR UPDATE) on the products row during
  confirmation ensures two concurrent SO confirmations for the same product
  cannot both read the same free_to_use_qty and double-reserve stock.
```

## 06-E: Procurement Automation Engine

```
TRIGGER POINTS:
  1. SO Confirm (real-time per-order check)
  2. Cron job (PROCUREMENT_SCHEDULE in .env)
  3. Manual API call

DECISION TREE per product:
  IF procurement_type = 'buy':
    → Create PO from preferred vendor (product_vendors.is_preferred=TRUE)
    → If no preferred vendor: use procurement_rules.preferred_vendor_id
    → If still null: create PO without vendor (user must assign vendor manually)

  IF procurement_type = 'manufacture':
    → Check all BOM components availability FIRST
    → If all components available: create + confirm MO (auto-explode BOM)
    → If components not available: trigger sub-procurement for missing components
      (recursive procurement for multi-level BOM — handle max 2 levels for Mini ERP)

  IF procurement_type = 'both':
    → Check if BOM exists and all components available
    → If yes: manufacture
    → If no: purchase

QTY CALCULATION:
  reorder_qty = procurement_rules.reorder_qty
  OR calculate: max(reorder_qty, shortage_qty + safety_buffer)
  For Mini ERP: use rule.reorder_qty directly

DEDUPLICATION:
  Before creating auto PO/MO, check:
    - Are there already open POs for this product with status IN ('draft','sent','confirmed')?
    - Are there already confirmed/in_progress MOs for this product?
    - If yes: skip auto-creation, log a warning instead
```

## 06-F: Inventory Ledger Rules

```
GOLDEN RULES for inventory_transactions:
  1. Never DELETE or UPDATE an inventory_transactions row
  2. qty_before must equal the previous qty_after for this product
  3. qty_after = qty_before + qty (for IN, RESERVE, UNRESERVE)
     qty_after = qty_before - qty (for OUT)
  4. The txn_id auto-increment provides an audit trail by insertion order

TRANSACTION TYPE → EFFECT ON PRODUCTS TABLE:
  IN         → on_hand_qty += qty            (PO receipt, MO production)
  OUT        → on_hand_qty -= qty            (SO delivery, MO component consumption)
  RESERVE    → reserved_qty += qty           (SO confirm, MO confirm)
  UNRESERVE  → reserved_qty -= qty           (SO/MO cancel)
  ADJUST     → on_hand_qty += qty (signed)   (manual adjustment, can be negative)

BALANCE CHECK QUERY:
  SELECT
    SUM(CASE WHEN txn_type IN ('IN','ADJUST') THEN qty ELSE 0 END) -
    SUM(CASE WHEN txn_type = 'OUT' THEN qty ELSE 0 END)
  FROM inventory_transactions
  WHERE product_id = :productId;

  This should always equal products.on_hand_qty.
  If not, there's a bug in business logic — use this as a data integrity check endpoint.
```

---

# PART 07 — COMPLETE API CONTRACT

## Base URL: `http://localhost:8003/api/v1`

### Auth Endpoints
```
POST   /auth/signup
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
POST   /auth/logout-all
POST   /auth/forgot-password
POST   /auth/reset-password
PUT    /auth/change-password          [AUTH]
GET    /auth/me                       [AUTH]
```

### User Management
```
GET    /users                         [AUTH] [perm: users.view]
GET    /users/:id                     [AUTH] [perm: users.view]
POST   /users                         [AUTH] [perm: users.create]
PUT    /users/:id                     [AUTH] [perm: users.update]
DELETE /users/:id                     [AUTH] [perm: users.delete]
PUT    /users/:id/status              [AUTH] [perm: users.update]

GET    /roles                         [AUTH] [perm: roles.view]
GET    /roles/:id                     [AUTH] [perm: roles.view]
POST   /roles                         [AUTH] [perm: roles.create]
PUT    /roles/:id                     [AUTH] [perm: roles.update]
DELETE /roles/:id                     [AUTH] [perm: roles.delete]
```

### Partners
```
GET    /partners                      [AUTH] [perm: partners.view]
GET    /partners/vendors              [AUTH] [perm: partners.view]
GET    /partners/customers            [AUTH] [perm: partners.view]
GET    /partners/:id                  [AUTH] [perm: partners.view]
POST   /partners                      [AUTH] [perm: partners.create]
PUT    /partners/:id                  [AUTH] [perm: partners.update]
DELETE /partners/:id                  [AUTH] [perm: partners.delete]
GET    /partners/:id/products         [AUTH] [perm: partners.view]
POST   /partners/:id/products         [AUTH] [perm: partners.update]
DELETE /partners/:id/products/:pvId   [AUTH] [perm: partners.update]
```

### Products
```
GET    /products                      [AUTH] [perm: products.view]
GET    /products/low-stock            [AUTH] [perm: products.view]
GET    /products/:id                  [AUTH] [perm: products.view]
POST   /products                      [AUTH] [perm: products.create]
PUT    /products/:id                  [AUTH] [perm: products.update]
DELETE /products/:id                  [AUTH] [perm: products.delete]
PUT    /products/:id/stock            [AUTH] [perm: inventory.create]
GET    /products/:id/vendors          [AUTH] [perm: products.view]
POST   /products/:id/vendors          [AUTH] [perm: products.update]
PUT    /products/:id/vendors/:pvId    [AUTH] [perm: products.update]
DELETE /products/:id/vendors/:pvId    [AUTH] [perm: products.update]
```

### BOM
```
GET    /bom                           [AUTH] [perm: bom.view]
GET    /bom/:id                       [AUTH] [perm: bom.view]
GET    /bom/product/:productId        [AUTH] [perm: bom.view]
POST   /bom                           [AUTH] [perm: bom.create]
PUT    /bom/:id                       [AUTH] [perm: bom.update]
DELETE /bom/:id                       [AUTH] [perm: bom.delete]
POST   /bom/:id/lines                 [AUTH] [perm: bom.update]
PUT    /bom/:id/lines/:lineId         [AUTH] [perm: bom.update]
DELETE /bom/:id/lines/:lineId         [AUTH] [perm: bom.update]
```

### Work Centers & Operations
```
GET    /work-centers                  [AUTH] [perm: work_centers.view]
GET    /work-centers/:id              [AUTH] [perm: work_centers.view]
POST   /work-centers                  [AUTH] [perm: work_centers.create]
PUT    /work-centers/:id              [AUTH] [perm: work_centers.update]
DELETE /work-centers/:id              [AUTH] [perm: work_centers.delete]

GET    /operations                    [AUTH] [perm: operations.view]
GET    /operations/:id                [AUTH] [perm: operations.view]
POST   /operations                    [AUTH] [perm: operations.create]
PUT    /operations/:id                [AUTH] [perm: operations.update]
DELETE /operations/:id                [AUTH] [perm: operations.delete]
```

### Sales Orders
```
GET    /sales-orders                  [AUTH] [perm: sales.view]
GET    /sales-orders/stats            [AUTH] [perm: sales.view]
GET    /sales-orders/:id              [AUTH] [perm: sales.view]
POST   /sales-orders                  [AUTH] [perm: sales.create]
PUT    /sales-orders/:id              [AUTH] [perm: sales.update]
DELETE /sales-orders/:id              [AUTH] [perm: sales.delete]
POST   /sales-orders/:id/confirm      [AUTH] [perm: sales.update]
POST   /sales-orders/:id/deliver      [AUTH] [perm: sales.update]
POST   /sales-orders/:id/cancel       [AUTH] [perm: sales.update]
POST   /sales-orders/:id/lines        [AUTH] [perm: sales.update]
PUT    /sales-orders/:id/lines/:solId [AUTH] [perm: sales.update]
DELETE /sales-orders/:id/lines/:solId [AUTH] [perm: sales.update]
```

### Purchase Orders
```
GET    /purchase-orders               [AUTH] [perm: purchase.view]
GET    /purchase-orders/stats         [AUTH] [perm: purchase.view]
GET    /purchase-orders/:id           [AUTH] [perm: purchase.view]
POST   /purchase-orders               [AUTH] [perm: purchase.create]
PUT    /purchase-orders/:id           [AUTH] [perm: purchase.update]
DELETE /purchase-orders/:id           [AUTH] [perm: purchase.delete]
POST   /purchase-orders/:id/send      [AUTH] [perm: purchase.update]
POST   /purchase-orders/:id/confirm   [AUTH] [perm: purchase.update]
POST   /purchase-orders/:id/receive   [AUTH] [perm: purchase.update]
POST   /purchase-orders/:id/cancel    [AUTH] [perm: purchase.update]
```

### Manufacturing Orders
```
GET    /manufacturing-orders          [AUTH] [perm: manufacturing.view]
GET    /manufacturing-orders/stats    [AUTH] [perm: manufacturing.view]
GET    /manufacturing-orders/:id      [AUTH] [perm: manufacturing.view]
POST   /manufacturing-orders          [AUTH] [perm: manufacturing.create]
PUT    /manufacturing-orders/:id      [AUTH] [perm: manufacturing.update]
DELETE /manufacturing-orders/:id      [AUTH] [perm: manufacturing.delete]
POST   /manufacturing-orders/:id/confirm  [AUTH] [perm: manufacturing.update]
POST   /manufacturing-orders/:id/start    [AUTH] [perm: manufacturing.update]
POST   /manufacturing-orders/:id/produce  [AUTH] [perm: manufacturing.update]
POST   /manufacturing-orders/:id/cancel   [AUTH] [perm: manufacturing.update]
```

### Work Orders
```
GET    /work-orders                   [AUTH] [perm: manufacturing.view]
GET    /work-orders/:id               [AUTH] [perm: manufacturing.view]
PUT    /work-orders/:id               [AUTH] [perm: manufacturing.update]
POST   /work-orders/:id/start         [AUTH] [perm: manufacturing.update]
POST   /work-orders/:id/complete      [AUTH] [perm: manufacturing.update]
POST   /work-orders/:id/cancel        [AUTH] [perm: manufacturing.update]
```

### Inventory & Warehouses
```
GET    /inventory/transactions        [AUTH] [perm: inventory.view]
GET    /inventory/transactions/:id    [AUTH] [perm: inventory.view]
GET    /inventory/ledger/:productId   [AUTH] [perm: inventory.view]
GET    /inventory/reservations        [AUTH] [perm: inventory.view]

GET    /warehouses                    [AUTH] [perm: inventory.view]
GET    /warehouses/:id                [AUTH] [perm: inventory.view]
POST   /warehouses                    [AUTH] [perm: inventory.create]
PUT    /warehouses/:id                [AUTH] [perm: inventory.update]
DELETE /warehouses/:id                [AUTH] [perm: inventory.delete]

GET    /locations                     [AUTH] [perm: inventory.view]
POST   /locations                     [AUTH] [perm: inventory.create]
PUT    /locations/:id                 [AUTH] [perm: inventory.update]
DELETE /locations/:id                 [AUTH] [perm: inventory.delete]
```

### Procurement Rules
```
GET    /procurement-rules             [AUTH] [perm: procurement.view]
GET    /procurement-rules/:id         [AUTH] [perm: procurement.view]
GET    /procurement-rules/product/:pid [AUTH] [perm: procurement.view]
POST   /procurement-rules             [AUTH] [perm: procurement.create]
PUT    /procurement-rules/:id         [AUTH] [perm: procurement.update]
DELETE /procurement-rules/:id         [AUTH] [perm: procurement.delete]
POST   /procurement-rules/run         [AUTH] [perm: procurement.create] (Admin)
```

### Dashboard
```
GET    /dashboard/summary             [AUTH] [perm: dashboard.view]
GET    /dashboard/sales               [AUTH] [perm: dashboard.view]
GET    /dashboard/purchase            [AUTH] [perm: dashboard.view]
GET    /dashboard/manufacturing       [AUTH] [perm: dashboard.view]
GET    /dashboard/inventory           [AUTH] [perm: dashboard.view]
GET    /dashboard/alerts              [AUTH] [perm: dashboard.view]
```

### Audit Logs
```
GET    /audit-logs                    [AUTH] [perm: audit_logs.view]
GET    /audit-logs/:id                [AUTH] [perm: audit_logs.view]
GET    /audit-logs/record/:table/:id  [AUTH] [perm: audit_logs.view]
```

---

# PART 08 — ROLE-BASED ACCESS CONTROL MATRIX

## Role Definitions (as seeded)

| role_id | Role Name | Description |
|---|---|---|
| 1 | Admin | Full system access |
| 2 | Sales User | Manage sales orders, view products |
| 3 | Purchase User | Manage purchase orders, partners |
| 4 | Manufacturing User | MOs, WOs, BOM, Work Centers, Operations |
| 5 | Inventory Manager | Stock, warehouses, adjustments |
| 6 | Business Owner | Dashboard, products, reports (read-heavy) |

## Permission Matrix by Module

```
Module          | Admin | Sales | Purchase | Manufacturing | Inventory | Business Owner
----------------|-------|-------|----------|---------------|-----------|----------------
users           | CRUD  | -     | -        | -             | -         | -
roles           | CRUD  | -     | -        | -             | -         | -
partners        | CRUD  | R     | CRUD     | R             | R         | R
products        | CRUD  | R     | R        | R             | CRUD      | CRUD
bom             | CRUD  | -     | -        | CRUD          | R         | R
work_centers    | CRUD  | -     | -        | CRUD          | -         | R
operations      | CRUD  | -     | -        | CRUD          | -         | R
sales           | CRUD  | CRUD  | R        | R             | R         | R
purchase        | CRUD  | R     | CRUD     | R             | R         | R
manufacturing   | CRUD  | R     | R        | CRUD          | R         | R
inventory       | CRUD  | R     | R        | R             | CRUD      | R
procurement     | CRUD  | -     | CRU      | -             | CRU       | R
audit_logs      | R     | -     | -        | -             | -         | -
dashboard       | R     | R     | R        | R             | R         | R
```

## Permission Check Implementation
```js
// permission.middleware.js
function checkPermission(module, action) {
  return async (req, res, next) => {
    const { role_id } = req.user;
    const role = await roleModel.findById(role_id);
    const permissions = role.permissions;
    
    if (!permissions?.[module]?.[action]) {
      return res.status(403).json({
        success: false,
        message: `You do not have ${action} permission for ${module}`
      });
    }
    next();
  };
}

// Usage in routes:
router.post('/', authMiddleware, checkPermission('sales', 'create'), soController.create);
```

---

# PART 09 — DATABASE SEEDING REFERENCE

## 9.1 Seeding Order (Must Follow FK Dependencies)

```
1.  roles              (no FK deps)
2.  users              (FK: roles.role_id; self-ref created_by)
3.  partners           (FK: users.user_id for created_by)
4.  products           (FK: partners.partner_id for vendor_id; bom_id=NULL initially)
5.  bom                (FK: products.product_id)
    → UPDATE products SET bom_id = ... (resolve circular FK)
6.  work_centers       (FK: users)
7.  operations         (FK: work_centers, users)
8.  bom_lines          (FK: bom, products for component_id, operations)
9.  warehouses         (FK: users)
10. stock_locations    (FK: warehouses, users)
11. sales_orders       (FK: partners, users)
12. sales_order_lines  (FK: sales_orders, products, users)
13. purchase_orders    (FK: partners, users)
14. purchase_order_lines (FK: purchase_orders, products, users)
15. manufacturing_orders (FK: products, bom, sales_orders, users)
16. work_orders        (FK: manufacturing_orders, operations, work_centers, users)
17. mo_components      (FK: manufacturing_orders, products, bom_lines, users)
18. stock_reservations (FK: products, sales_orders, users)
19. procurement_rules  (FK: products, partners, users)
20. inventory_transactions (FK: products, stock_locations, users)
21. audit_logs         (FK: users)
    PATCH:
22. product_vendors    (FK: products, partners, users)
```

## 9.2 Seed Data Summary (from seed_v4.sql)

```
roles:           6 rows  (Admin, Sales User, Purchase User, Manufacturing User, Inventory Manager, Business Owner)
users:          12 rows  (2 per role, user_id 1 = Rajesh Sharma = first Admin)
partners:       12 rows  (6 vendors, 4 customers, 2 dual-role)
products:       12 rows  (6 finished goods FG-001–FG-006, 6 raw materials RM-001–RM-006)
bom:             6 rows  (one BOM per finished good)
work_centers:   10 rows  (Cutting, Assembly A/B, Sanding, Paint, Upholstery, Glass, QC, Packaging, Dispatch)
operations:     12 rows  (mapped to work centers)
bom_lines:      20 rows  (3-4 components per BOM)
warehouses:      3 rows  (Main, Finished Goods, Raw Material stores)
stock_locations:12 rows  (across 3 warehouses)
sales_orders:   12 rows  (mixed statuses: done, in_progress, confirmed, draft, cancelled)
sales_order_lines: 16 rows
purchase_orders: 12 rows
purchase_order_lines: 12 rows
manufacturing_orders: 12 rows
work_orders:    12 rows
mo_components:  17 rows
stock_reservations: 12 rows (9 active, 3 consumed)
procurement_rules: 12 rows
inventory_transactions: 16 rows
audit_logs:     12 rows
product_vendors: 13 rows (patch)
```

## 9.3 Default Admin Credentials

```
Email: rajesh@shivfurniture.in
Password: (must be set via bcrypt — seed file has placeholder hash)
For dev: use bcrypt.hashSync('Admin@123', 10) and update seed before running
```

## 9.4 Running Seeds in Development

```bash
# Start fresh
mysql -u root -p < dbscript.sql          # Creates DB, all 21 tables, seeds data
mysql -u root -p MINI_ERP1 < migrations/004_product_vendors_patch.sql  # Add 22nd table
```

---

# PART 10 — KNOWN QUIRKS, EDGE CASES & MIGRATION NOTES

## 10.1 v3 → v4 Migration: vendors & customers → partners

**The project context document (Part 1) still references separate `vendors` and `customers`
tables. These DO NOT EXIST in v4. Everything is `partners`.**

Any code referencing the old tables must be updated:
```
OLD: SELECT * FROM vendors WHERE vendor_id = ?
NEW: SELECT * FROM partners WHERE partner_id = ? AND is_vendor = TRUE

OLD: sales_orders.customer_id → customers.customer_id
NEW: sales_orders.customer_id → partners.partner_id (where is_customer = TRUE)

OLD: purchase_orders.vendor_id → vendors.vendor_id
NEW: purchase_orders.vendor_id → partners.partner_id (where is_vendor = TRUE)
```

## 10.2 Legacy POS Module

`backend/src/models/pos-mgmt/` references old schema names (`usermaster`, `itemmaster`).
**DO NOT use this directory.** The active models are all in:
- `src/models/masters/`
- `src/models/transactions/`
- `src/models/inventory/`

## 10.3 common.model.js Fallbacks

When endpoints try to load from missing tables (`countrymst`, `statemaster`, `citymaster`,
`locationmaster`, `taxprofilemaster`) — these DO NOT EXIST in v4. The model catches SQL
errors and returns `[]`. This is safe but will generate SQL errors in logs.
Either remove these calls or add migration to create stub tables.

## 10.4 products.vendor_id vs product_vendors

`products.vendor_id` is now REDUNDANT. It's kept for backward compat only.
- **Source of truth for vendor relationships**: `product_vendors` table
- `products.vendor_id` should always match the `is_preferred=TRUE` row in product_vendors
- When updating the preferred vendor: UPDATE BOTH products.vendor_id AND product_vendors.is_preferred

## 10.5 Generated Column Restrictions

`free_to_use_qty`, `subtotal` (on SOL and POL) are GENERATED ALWAYS STORED columns.
**You CANNOT:**
- INSERT a value into these columns
- UPDATE these columns
- Use them in SET clause

If you try, MySQL throws: `ERROR 3105: The value specified for generated column is not allowed`

Always exclude these columns from INSERT/UPDATE statements using explicit column lists.

## 10.6 Unique Constraint Gotchas

```
bom_lines:   UNIQUE KEY uq_bom_component (bom_id, component_id)
             → Same component cannot appear twice in one BOM
             → Workaround: split into sub-assemblies

mo_components: UNIQUE KEY uq_mo_component (mo_id, product_id)
             → If BOM has same component in 2 different operations,
               only ONE mo_component row per product per MO (qty accumulated)

procurement_rules: product_id must be UNIQUE
             → One rule per product
             → Trying to create second rule for same product → 409 Conflict
```

## 10.7 Cron Job Configuration

```
BACKUP_SCHEDULE=0 2 * * *      (daily at 2 AM)
CLEANUP_SCHEDULE=0 3 * * *     (daily at 3 AM — expires user_jwt_tokens + password_reset_tokens)
PROCUREMENT_SCHEDULE=0 1 * * * (daily at 1 AM — auto-trigger procurement check)
```

Cleanup query for expired tokens:
```sql
DELETE FROM user_jwt_tokens WHERE expiry < NOW();
DELETE FROM password_reset_tokens WHERE expiry < NOW();
```

## 10.8 MTO SO linked MO Lifecycle

When an MO is linked to an SO (via `manufacturing_orders.so_id`):
- Cancelling the SO should NOT auto-cancel the MO (materials may already be consumed)
- Instead: SO.so_id in MO is SET NULL (FK: ON DELETE SET NULL)
- User must manually cancel the MO if needed
- Always warn user when cancelling an SO that has linked MOs

## 10.9 BOM Circular Reference Prevention

Before saving a BOM line, validate:
```
component_id MUST NOT equal bom.product_id (direct circular)
component_id's own BOM must not include bom.product_id (indirect circular — 1 level check)
```
For Mini ERP, 1-level check is sufficient.

## 10.10 Transaction Isolation

For stock operations (reserve, unreserve, IN, OUT), use:
```sql
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
```
And always SELECT ... FOR UPDATE on the products row before modifying qty columns.
This prevents phantom reads and concurrent double-reservation bugs.

## 10.11 Soft Delete Cascade Considerations

```
If you soft-delete a partner:
  → All their active SOs/POs still exist and reference them
  → When querying SOs, join partners with NO is_deleted filter (to show deleted partner name)
  → Show "(deleted)" suffix in UI when partner.is_deleted=TRUE

If you soft-delete a product:
  → All existing order lines still reference it
  → BOM lines still reference it
  → is_deleted=TRUE means it won't appear in new order dropdowns
  → But existing orders remain intact
```

---

# PART 11 — QA & TESTING PLAN

## 11.1 Core Scenarios to Test (Happy Paths)

### Scenario 1: Complete MTS Sale
```
1. Create product (storable, MTS, sales_price=1000, on_hand_qty=50)
2. Create partner (is_customer=TRUE)
3. Create Sales Order (draft) → add 10 units of product
4. Confirm SO
   EXPECT: reserved_qty=10, free_to_use_qty=40, stock_reservations.status=active
5. Deliver SO
   EXPECT: on_hand_qty=40, reserved_qty=0, SO.status=done,
           inventory_transactions has RESERVE + OUT rows
```

### Scenario 2: MTO Trigger
```
1. Product with on_hand_qty=0, procurement_type='manufacture', BOM exists
2. Create Sales Order, so_type='MTO', qty=5
3. Confirm SO
   EXPECT: MO auto-created with so_id=SO.so_id, mo_type='MTO', qty_planned=5
4. Confirm MO
   EXPECT: mo_components created (BOM exploded), WOs created
5. Produce 5 units
   EXPECT: on_hand_qty=5 for finished good, components consumed
6. Deliver SO
   EXPECT: SO done, on_hand_qty=0
```

### Scenario 3: PO Receiving
```
1. Create Purchase Order (draft) → add 100 units of RM-001 at cost 850
2. Send PO → Confirm PO
3. Receive 50 units
   EXPECT: products.on_hand_qty increased by 50
           inventory_transactions: IN qty=50
           purchase_order_lines.qty_received=50
           PO.status still 'confirmed' (partial)
4. Receive remaining 50
   EXPECT: PO.status='received'
```

### Scenario 4: Procurement Automation
```
1. Set procurement_rule: min_stock_qty=10, reorder_qty=50, strategy='MTS'
2. Product.on_hand_qty=12, reserved_qty=0, free_to_use_qty=12
3. Confirm SO for 5 units → free_to_use drops to 7
4. EXPECT: Still above min (7 > 5... wait no: 7 > 10 is FALSE) → trigger procurement
   Wait: 7 < 10 → trigger auto PO created
   EXPECT: purchase_order created in draft with qty=50
```

### Scenario 5: Cancel SO Releases Reservation
```
1. SO confirmed, reserved_qty=10 on product
2. Cancel SO
   EXPECT: reserved_qty back to 0, stock_reservations.status=released,
           inventory_transactions: UNRESERVE row added
```

## 11.2 Edge Cases to Test

```
EC-01: Try to confirm SO when free_to_use_qty=0 and so_type=MTS
       EXPECT: Auto PO created for shortage, partial reservation done

EC-02: Try to confirm MO when BOM component has insufficient stock
       EXPECT: MO confirms, mo_component.is_available=FALSE for unavailable components

EC-03: Try to deliver more than reserved_qty
       EXPECT: 422 error "Delivery qty exceeds reserved quantity"

EC-04: Try to create second procurement_rule for same product
       EXPECT: 409 Conflict

EC-05: Try to add same component twice to a BOM
       EXPECT: 409 Conflict (UNIQUE KEY violation caught, returned as business error)

EC-06: Concurrent SO confirmations for same product (race condition)
       EXPECT: SELECT FOR UPDATE ensures only one gets the stock, other gets 422

EC-07: Soft delete product that has active SOs
       EXPECT: 422 "Cannot delete product with active orders"

EC-08: Change BOM while MO is in_progress
       EXPECT: BOM update allowed, but MO keeps its original mo_components (already exploded)

EC-09: BOM references product as its own component (circular)
       EXPECT: 422 "Component cannot be the same as the finished product"

EC-10: Try to INSERT into free_to_use_qty column
       EXPECT: MySQL throws 3105 — should never reach DB, Joi schema should exclude it
```

## 11.3 Business Logic Validation Tests

```
BL-01: free_to_use_qty ALWAYS = on_hand_qty - reserved_qty (generated column, always true)
BL-02: inventory_transactions ledger sum EQUALS products.on_hand_qty for every product
BL-03: SUM of active stock_reservations for a product EQUALS products.reserved_qty
BL-04: SO.total_amount = SUM(sales_order_lines.subtotal) for non-cancelled SOs
BL-05: MO cannot be confirmed if it is already confirmed/in_progress/done
BL-06: WO cannot be started if parent MO is not confirmed or in_progress
BL-07: Deleted users' audit_logs entries remain intact (FK ON DELETE NO ACTION)
BL-08: password_reset_token expires after 1 hour (check expiry < NOW() on use)
BL-09: JWT access token invalidated on logout (deleted from user_jwt_tokens)
BL-10: Refresh token can generate new access token (separate signing key)
```

## 11.4 API Response Tests

For every endpoint, test:
- Correct HTTP status code
- Response has `success` boolean
- Paginated lists have `meta.total`, `meta.page`, `meta.limit`
- Error responses have `errors` array (for 400/422)
- 401 when no token provided
- 403 when token valid but insufficient permissions
- 404 when record not found (AND not just is_deleted=TRUE without proper message)

---

# PART 12 — ENVIRONMENT SETUP & DEPLOYMENT

## 12.1 backend/.env

```env
# Server
NODE_ENV=development
SERVER_PORT=8003

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=yourpassword
DB_NAME=MINI_ERP1

# JWT
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your_super_secret_refresh_key_min_32_chars
JWT_REFRESH_EXPIRES_IN=7d

# Email (for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourapp@gmail.com
SMTP_PASS=your_app_password

# Backup
DB_BACKUP_TOKEN=secure_random_token_for_backup_endpoint

# Cron
BACKUP_SCHEDULE=0 2 * * *
CLEANUP_SCHEDULE=0 3 * * *
PROCUREMENT_SCHEDULE=0 1 * * *

# WhatsApp (optional)
WHATSAPP_ENABLED=false
WHATSAPP_API_URL=

# Logging
LOG_LEVEL=info
LOG_DIR=./logs
```

## 12.2 frontend/.env

```env
VITE_API_BASE_URL=http://localhost:8003/api/v1
VITE_APP_NAME=m-erp
VITE_DEFAULT_LOCALE=en
```

## 12.3 Local Development Setup

```bash
# 1. Clone repository
git clone <repo-url>
cd m-erp

# 2. Install backend dependencies
cd backend
npm install

# 3. Setup database
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS MINI_ERP1;"
mysql -u root -p MINI_ERP1 < dbscript.sql
# Note: update bcrypt hashes in seed before running in production

# 4. Configure environment
cp .env.example .env
# Fill in DB_PASS, JWT_SECRET, etc.

# 5. Start backend
npm run dev  # nodemon src/server.js

# 6. In new terminal, install frontend
cd ../frontend
npm install
cp .env.example .env

# 7. Start frontend
npm run dev  # Vite on port 5173
```

## 12.4 Production Deployment Checklist

```
□ NODE_ENV=production set
□ JWT secrets are 64+ char random strings
□ DB user has only required permissions (not root)
□ HTTPS configured for both API and frontend
□ CORS restricted to production frontend domain
□ Rate limiting added (express-rate-limit) on auth endpoints
□ Log rotation configured
□ DB backup cron enabled and tested
□ SMTP credentials tested for password reset flow
□ Default admin password changed from seed value
□ All console.log removed (use Winston only)
□ Error messages in production don't expose stack traces
```

## 12.5 package.json Scripts

### Backend
```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "seed": "node scripts/seed.js",
    "migrate": "node scripts/migrate.js"
  }
}
```

### Frontend
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .jsx,.js"
  }
}
```

---

# PART 13 — BUILD ORDER & SPRINT PLAN

## Phase 0: Foundation (Day 1 — Half Day)
```
□ Project repo setup (mono-repo or separate dirs)
□ Backend: Express scaffold, .env parsing, Winston logger, db.js pool
□ Frontend: Vite + React scaffold, TailwindCSS v4, PrimeReact theme
□ Database: Run dbscript.sql + patch
□ API health check endpoint: GET /api/v1/health → { status: "ok", timestamp }
□ Axios instance with base URL
□ Redux store skeleton (auth slice)
```

## Phase 1: Auth & Users (Day 1 — Rest)
```
□ Backend: auth.routes.js, auth.controller.js, auth.model.js
□ Backend: JWT utils, bcrypt utils, response utils
□ Backend: auth.middleware.js (JWT verify + token DB check)
□ Backend: permission.middleware.js
□ Frontend: Login page → POST /auth/login → store token
□ Frontend: AuthGuard, GhostGuard route wrappers
□ Frontend: Axios interceptor (token injection + 401 refresh)
□ Test: Login → protected route → 401 without token
```

## Phase 2: Masters — Users, Roles, Partners (Day 2)
```
□ Backend: user CRUD, role CRUD with permissions JSON
□ Backend: partner CRUD (is_vendor, is_customer filtering)
□ Frontend: UserList, UserForm (create/edit/soft-delete)
□ Frontend: RoleList, RolePermissionEditor (JSON permission editor UI)
□ Frontend: PartnerList, PartnerForm (dual-role flag toggles)
□ Test: Create partner as vendor only, customer only, both
□ Test: RBAC — Sales user cannot access /users
```

## Phase 3: Products + BOM + Work Centers (Day 2 — Day 3)
```
□ Backend: product CRUD, product_vendors sub-resource
□ Backend: BOM CRUD, bom_lines sub-resource
□ Backend: work_centers CRUD, operations CRUD
□ Frontend: ProductList with stock badges (on_hand / reserved / free)
□ Frontend: ProductForm (procurement_type + strategy dropdowns)
□ Frontend: ProductDetail with Vendors tab, Ledger tab (placeholder)
□ Frontend: BomDetail with bom_lines table (add/edit/remove lines)
□ Frontend: WorkCenterList with Operations nested
□ Test: Create FG product → create BOM → add 3 components with operations
```

## Phase 4: Sales Orders (Day 3)
```
□ Backend: sales_orders CRUD + confirm/deliver/cancel endpoints
□ Backend: stock_reservation.service.js
□ Backend: inventory-ledger.service.js (RESERVE, UNRESERVE, OUT)
□ Frontend: SoList with status filter chips
□ Frontend: SoForm (customer picker, product line items with qty/price)
□ Frontend: SoDetail (status stepper, lines table, reserve status, action buttons)
□ Frontend: DeliveryForm dialog (per-product qty input)
□ Test: Create → Confirm (check RESERVE txn) → Deliver (check OUT txn + SO done)
□ Test: Cancel after confirm (check UNRESERVE txn + reservations released)
```

## Phase 5: Purchase Orders (Day 3 — Day 4)
```
□ Backend: purchase_orders CRUD + send/confirm/receive/cancel endpoints
□ Backend: ON RECEIVE → inventory IN + auto-satisfy waiting reservations
□ Frontend: PoList, PoForm, PoDetail
□ Frontend: ReceiveDialog (partial receive per line)
□ Test: PO draft → sent → confirmed → receive partial → receive rest → status=received
□ Test: After receive, check product on_hand_qty increased
```

## Phase 6: Manufacturing Orders + BOM Explosion (Day 4)
```
□ Backend: manufacturing_orders CRUD + confirm/start/produce/cancel
□ Backend: bom-explosion.service.js (the core algorithm)
□ Backend: work_orders sub-CRUD (start/complete per WO)
□ Frontend: MoList, MoForm, MoDetail
□ Frontend: MoDetail → Components tab (explosion view, is_available badges)
□ Frontend: MoDetail → Work Orders tab (inline start/complete buttons)
□ Frontend: MoDetail → Production tab (progress bar + Produce button)
□ Test: Confirm MO → BOM explodes → check mo_components rows
□ Test: Produce 5 units → components OUT + finished good IN
```

## Phase 7: Inventory & Procurement Automation (Day 5)
```
□ Backend: inventory CRUD (warehouses, locations, transactions, reservations)
□ Backend: procurement-rule CRUD
□ Backend: procurement.service.js (auto-trigger on low stock)
□ Backend: Connect procurement trigger to SO confirm + cron job
□ Frontend: StockOverview (product list with stock bars, low stock alerts)
□ Frontend: TransactionList (all inventory movements, filterable)
□ Frontend: LedgerView (per-product transaction timeline)
□ Frontend: ProcurementRuleList + RuleForm
□ Test: Set min_stock_qty=50, reduce stock to 30 via SO, expect auto PO/MO
```

## Phase 8: Dashboard & Audit Logs (Day 5 — Day 6)
```
□ Backend: dashboard aggregation queries
□ Backend: audit-logs read endpoints
□ Frontend: Dashboard with KPI cards, status charts, alerts panel
□ Frontend: AuditLogList with table_name + action filters
□ Frontend: Add audit trail tab to SoDetail, PoDetail, MoDetail
□ Test: All KPI numbers match actual DB counts
□ Test: Every write operation creates an audit_logs entry
```

## Phase 9: UI Polish & Integration Testing (Day 6)
```
□ Toast notifications for all success/error actions
□ Loading states on all async operations
□ Empty state components (no orders found, etc.)
□ Permission guards on all UI action buttons (not just routes)
□ Responsive sidebar (collapsible on smaller screens)
□ Sidebar nav items hidden based on user's role permissions
□ Final integration test: complete MTS flow end-to-end
□ Final integration test: complete MTO flow end-to-end
□ Final integration test: concurrent SO confirmation race condition
□ Code review: generated columns excluded from all INSERT/UPDATE
□ Code review: all DB writes inside transactions
□ Code review: all routes have authMiddleware + permissionMiddleware
```

## Phase 10: Deployment & Documentation (Day 7)
```
□ Production .env with proper secrets
□ Build frontend: npm run build → static files
□ Backend: PM2 or systemd for process management
□ Nginx reverse proxy (frontend static + /api → backend:8003)
□ SSL certificate (Let's Encrypt)
□ Final README with setup instructions
□ API documentation (Postman collection or OpenAPI spec)
□ Demo walkthrough recording (optional but impressive for hackathon)
```

---

# APPENDIX A — COMMON SQL PATTERNS

## Paginated List Query Pattern
```sql
-- Count total
SELECT COUNT(*) as total
FROM table_name
WHERE is_deleted = FALSE
  AND (filter_col = :filter OR :filter IS NULL);

-- Get page
SELECT *
FROM table_name
WHERE is_deleted = FALSE
  AND (filter_col = :filter OR :filter IS NULL)
ORDER BY created_at DESC
LIMIT :limit OFFSET :offset;
```

## Join Pattern for Order Lists
```sql
-- Sales Order list with customer name + created_by name
SELECT
    so.so_id, so.so_type, so.status, so.total_amount,
    so.delivery_date, so.created_at,
    p.name AS customer_name,
    u.name AS created_by_name,
    COUNT(sol.sol_id) AS line_count
FROM sales_orders so
JOIN partners p ON p.partner_id = so.customer_id
JOIN users u ON u.user_id = so.created_by
LEFT JOIN sales_order_lines sol ON sol.so_id = so.so_id
WHERE so.is_deleted = FALSE
GROUP BY so.so_id
ORDER BY so.created_at DESC
LIMIT ? OFFSET ?;
```

## Stock Check Before Reservation
```sql
-- Always use FOR UPDATE to prevent concurrent over-reservation
START TRANSACTION;
SELECT product_id, on_hand_qty, reserved_qty,
       (on_hand_qty - reserved_qty) AS free_to_use_qty
FROM products
WHERE product_id = ?
  AND is_deleted = FALSE
  AND is_active = TRUE
FOR UPDATE;

-- Check free_to_use_qty >= required_qty before proceeding
-- Then do UPDATE + INSERT
COMMIT;
```

## Procurement Rule Check
```sql
SELECT
    pr.*,
    p.product_code, p.product_name,
    p.on_hand_qty, p.reserved_qty,
    (p.on_hand_qty - p.reserved_qty) AS free_to_use_qty,
    p.min_stock_qty,
    partner.name AS preferred_vendor_name
FROM procurement_rules pr
JOIN products p ON p.product_id = pr.product_id
LEFT JOIN partners partner ON partner.partner_id = pr.preferred_vendor_id
WHERE pr.is_active = TRUE
  AND pr.is_deleted = FALSE
  AND p.is_deleted = FALSE
  AND p.is_active = TRUE
  AND (p.on_hand_qty - p.reserved_qty) <= p.min_stock_qty;
-- Returns all products that need replenishment
```

---

# APPENDIX B — FRONTEND COMPONENT CONVENTIONS

## DataTable Column Definitions (PrimeReact)

```jsx
// Standard column with status badge
const statusBodyTemplate = (rowData) => (
  <StatusBadge status={rowData.status} />
);

// Currency column
const priceBodyTemplate = (rowData) => (
  <span>₹{rowData.total_amount?.toLocaleString('en-IN')}</span>
);

// Date column
const dateBodyTemplate = (rowData) => (
  <span>{rowData.delivery_date ? new Date(rowData.delivery_date).toLocaleDateString('en-IN') : '—'}</span>
);

// Action column (respect permissions)
const actionBodyTemplate = (rowData) => (
  <div className="flex gap-2">
    <Button icon="pi pi-eye" rounded text onClick={() => navigate(`/sales-orders/${rowData.so_id}`)} />
    {hasPermission('sales', 'update') && rowData.status === 'draft' && (
      <Button icon="pi pi-check" rounded text severity="success" onClick={() => handleConfirm(rowData)} />
    )}
  </div>
);
```

## StatusBadge Color Map

```jsx
const statusColors = {
  // SO / MO status
  draft:       'secondary',
  confirmed:   'info',
  in_progress: 'warning',
  done:        'success',
  cancelled:   'danger',
  // PO status
  sent:        'info',
  received:    'success',
  // WO status
  pending:     'secondary',
  // User status
  active:      'success',
  inactive:    'secondary',
  suspended:   'danger',
};

const StatusBadge = ({ status }) => (
  <Tag value={status?.replace('_', ' ').toUpperCase()} severity={statusColors[status] || 'secondary'} />
);
```

## Form Validation Pattern (React + Joi on client side)

```jsx
// Mirror backend Joi schema for instant client-side validation
import Joi from 'joi';

const partnerSchema = Joi.object({
  name: Joi.string().min(2).max(150).required(),
  email: Joi.string().email({ tlds: false }).allow('', null),
  phone: Joi.string().pattern(/^[0-9]{10}$/).allow('', null),
  is_vendor: Joi.boolean().required(),
  is_customer: Joi.boolean().required(),
  lead_time_days: Joi.number().integer().min(0).when('is_vendor', {
    is: true, then: Joi.required()
  }),
}).or('is_vendor', 'is_customer');  // at least one must be true
```

## usePermission Hook

```jsx
// hooks/usePermission.js
import { useSelector } from 'react-redux';

export function usePermission() {
  const permissions = useSelector(state => state.auth.permissions);

  const hasPermission = (module, action) => {
    return permissions?.[module]?.[action] === true;
  };

  return { hasPermission };
}

// Usage in component:
const { hasPermission } = usePermission();
{hasPermission('sales', 'create') && (
  <Button label="New Sales Order" icon="pi pi-plus" onClick={() => navigate('/sales-orders/new')} />
)}
```

---

# APPENDIX C — ERROR HANDLING STRATEGY

## Custom Error Classes (errors.js)

```js
class AppError extends Error {
  constructor(message, statusCode, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
  }
}

class ValidationError extends AppError {
  constructor(errors) { super('Validation failed', 400, errors); }
}

class AuthenticationError extends AppError {
  constructor(msg = 'Unauthorized') { super(msg, 401); }
}

class ForbiddenError extends AppError {
  constructor(msg = 'Forbidden') { super(msg, 403); }
}

class NotFoundError extends AppError {
  constructor(entity = 'Resource') { super(`${entity} not found`, 404); }
}

class ConflictError extends AppError {
  constructor(msg) { super(msg, 409); }
}

class BusinessRuleError extends AppError {
  constructor(msg) { super(msg, 422); }
}
```

## Global Error Handler (Express)

```js
// Applied LAST in server.js
app.use((err, req, res, next) => {
  logger.error(err.message, {
    stack: err.stack,
    path: req.path,
    user: req.user?.user_id
  });

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors
    });
  }

  // Unexpected error — don't expose internals
  return res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});
```

---

# APPENDIX D — CRON JOB IMPLEMENTATIONS

## Cleanup Cron (cleanup.cron.js)

```js
const cron = require('node-cron');
const db = require('../config/db');
const logger = require('../config/winston');

const scheduleCleanup = () => {
  cron.schedule(process.env.CLEANUP_SCHEDULE || '0 3 * * *', async () => {
    try {
      const [jwt] = await db.query('DELETE FROM user_jwt_tokens WHERE expiry < NOW()');
      const [prt] = await db.query('DELETE FROM password_reset_tokens WHERE expiry < NOW()');
      logger.info(`Cleanup: removed ${jwt.affectedRows} expired JWTs, ${prt.affectedRows} reset tokens`);
    } catch (err) {
      logger.error('Cleanup cron failed:', err.message);
    }
  });
};

module.exports = { scheduleCleanup };
```

## Procurement Cron (procurement.cron.js)

```js
const cron = require('node-cron');
const procurementService = require('../services/procurement.service');
const logger = require('../config/winston');

const scheduleProcurement = () => {
  cron.schedule(process.env.PROCUREMENT_SCHEDULE || '0 1 * * *', async () => {
    logger.info('Procurement cron: starting auto-replenishment check');
    try {
      const result = await procurementService.checkAndTriggerProcurement();
      logger.info(`Procurement cron: created ${result.posCreated} POs and ${result.mosCreated} MOs`);
    } catch (err) {
      logger.error('Procurement cron failed:', err.message);
    }
  });
};

module.exports = { scheduleProcurement };
```

---

# APPENDIX E — PAGINATION UTILITY

```js
// utils/pagination.utils.js
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page) || DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit) || DEFAULT_LIMIT));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function buildMeta(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  };
}

module.exports = { parsePagination, buildMeta };
```

---

# APPENDIX F — FRONTEND QUANTITY DISPLAY RULES

```
on_hand_qty:    Always show with UOM, 3 decimal places (e.g., "200.000 Pcs")
reserved_qty:   Show in orange/warning color if > 0
free_to_use_qty: Show in green if > min_stock_qty, red/danger if <= min_stock_qty
                Green card if healthy, red alert card if low stock

Stock card UI:
┌─────────────────────────────────────────────┐
│  Teak Wood Plank (RM-001)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐│
│  │ On Hand  │ │ Reserved │ │ Free to Use  ││
│  │ 200 Pcs  │ │  50 Pcs  │ │   150 Pcs    ││
│  │          │ │ (orange) │ │   (green)    ││
│  └──────────┘ └──────────┘ └──────────────┘│
│  Min: 50 Pcs     [HEALTHY]                  │
└─────────────────────────────────────────────┘

Low stock card:
┌─────────────────────────────────────────────┐
│  ⚠ Coffee Table Glass Top (FG-006)          │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐│
│  │ On Hand  │ │ Reserved │ │ Free to Use  ││
│  │ 15 Unit  │ │ 15 Unit  │ │    0 Unit    ││
│  │          │ │ (orange) │ │   (RED)      ││
│  └──────────┘ └──────────┘ └──────────────┘│
│  Min: 3 Units   ⚠ NO FREE STOCK             │
└─────────────────────────────────────────────┘
```

---

# APPENDIX G — QUICK REFERENCE: TABLE → MODEL → CONTROLLER → ROUTE

```
Table                 | Model File                     | Controller                        | Route File
----------------------|--------------------------------|-----------------------------------|----------------------------------
roles                 | masters/role.model.js          | masters/role.controller.js        | masters/role.routes.js
users                 | masters/user.model.js          | masters/user.controller.js        | masters/user.routes.js
user_jwt_tokens       | auth.model.js                  | auth.controller.js                | auth.routes.js
password_reset_tokens | auth.model.js                  | auth.controller.js                | auth.routes.js
login_logs            | auth.model.js                  | auth.controller.js                | auth.routes.js
partners              | masters/partner.model.js       | masters/partner.controller.js     | masters/partner.routes.js
products              | masters/product.model.js       | masters/product.controller.js     | masters/product.routes.js
product_vendors       | masters/product.model.js       | masters/product.controller.js     | masters/product.routes.js
bom                   | masters/bom.model.js           | masters/bom.controller.js         | masters/bom.routes.js
bom_lines             | masters/bom-line.model.js      | masters/bom.controller.js         | masters/bom.routes.js
work_centers          | masters/work-center.model.js   | masters/work-center.controller.js | masters/work-center.routes.js
operations            | masters/operation.model.js     | masters/operation.controller.js   | masters/operation.routes.js
sales_orders          | transactions/so.model.js       | transactions/so.controller.js     | transactions/so.routes.js
sales_order_lines     | transactions/sol.model.js      | transactions/so.controller.js     | transactions/so.routes.js
purchase_orders       | transactions/po.model.js       | transactions/po.controller.js     | transactions/po.routes.js
purchase_order_lines  | transactions/pol.model.js      | transactions/po.controller.js     | transactions/po.routes.js
manufacturing_orders  | transactions/mo.model.js       | transactions/mo.controller.js     | transactions/mo.routes.js
mo_components         | transactions/moc.model.js      | transactions/mo.controller.js     | transactions/mo.routes.js
work_orders           | transactions/wo.model.js       | transactions/wo.controller.js     | transactions/wo.routes.js
warehouses            | inventory/warehouse.model.js   | inventory/warehouse.controller.js | inventory/warehouse.routes.js
stock_locations       | inventory/location.model.js    | inventory/warehouse.controller.js | inventory/warehouse.routes.js
inventory_transactions| inventory/inv-txn.model.js     | inventory/inventory.controller.js | inventory/inventory.routes.js
stock_reservations    | inventory/reservation.model.js | inventory/inventory.controller.js | inventory/inventory.routes.js
procurement_rules     | inventory/pr-rule.model.js     | inventory/pr-rule.controller.js   | inventory/pr-rule.routes.js
audit_logs            | audit.model.js                 | audit.controller.js               | audit.routes.js
```

---

> **Final Note for Team Antigravity:**
> The single most critical piece of this system is the **transaction block** on SO/PO/MO
> status transitions. Every status change that touches stock quantities MUST run inside
> a DB transaction with `SELECT ... FOR UPDATE` on the products row.
> Get this right and the rest of the system is mostly CRUD + aggregation.
>
> Suggested build order priority:
> **Auth → Products → BOM → Sales Orders (with reservation) → Purchase Orders (with stock IN)
> → Manufacturing Orders (with BOM explosion) → Procurement Automation → Dashboard**
>
> The DB schema is already battle-tested. Trust the schema. Respect the FKs.
> Build the service layer clean and the UI follows naturally.
>
> Code smart. Build big. Have fun. 🚀
```
