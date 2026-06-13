# MINI ERP - Backend

A robust and secure **Node.js** backend API for the **MINI ERP** system, built with Express.js, MySQL, and JWT authentication. Designed for enterprise-level reliability with comprehensive security, monitoring, logging, and background job capabilities.

---

## 🚀 Features

### ✅ Core Capabilities

- **Authentication**: JWT-based login with access & refresh tokens
- **Security**: Helmet.js headers, CORS configuration, bcrypt password hashing, compression
- **Health Monitoring**: Multiple health check endpoints (`/health`, `/health/ready`, `/health/live`)
- **Error Handling**: Centralized error handling with custom error classes
- **Input Validation**: Comprehensive request validation using Joi
- **Environment Configuration**: Environment-specific settings via `.env`
- **Metrics**: Application metrics endpoint at `/metrics`
- **Background Jobs**: Automated DB backup, file cleanup, and token cleanup cron jobs
- **POS Support**: Dedicated POS routes for point-of-sale device management
- **Logging**: Winston structured logging with daily log rotation
- **Code Quality**: ESLint configuration and code formatting

---

## 🔧 Technical Stack

| Technology | Purpose |
|---|---|
| **Node.js >= 20** | Runtime |
| **Express.js** | Web framework |
| **MySQL 2** | Database with connection pooling |
| **Sequelize** | ORM (migrations) |
| **JWT (jsonwebtoken)** | Authentication |
| **bcrypt** | Password hashing |
| **Winston** | Structured logging |
| **Joi** | Request validation |
| **node-cron** | Scheduled background jobs |
| **Nodemailer** | Email notifications |
| **AWS S3** | File/image storage |
| **Multer** | File upload handling |
| **EJS** | Server-side templates |
| **nodemon** | Dev auto-restart |

---

## 📁 Project Structure

```
Backend/
├── src/
│   ├── config/
│   │   ├── config.js        # Centralized environment configuration
│   │   ├── db.js            # MySQL connection pool
│   │   └── winston.js       # Logging configuration
│   ├── controllers/         # Route handler logic
│   │   ├── auth.controller.js
│   │   ├── masters/
│   │   └── pos-mgmt/
│   ├── jobs/                # Cron job implementations
│   │   ├── backup-db.js     # Daily DB backup at 2:00 AM
│   │   ├── cleanup-cron.js  # File cleanup cron
│   │   └── token-cleanup.js # Expired token removal (hourly)
│   ├── middlewares/
│   │   ├── auth.middleware.js  # JWT verification
│   │   └── validation.js       # Request validation middleware
│   ├── models/              # Data access layer (MySQL queries)
│   ├── routes/              # API route definitions
│   │   ├── auth.routes.js
│   │   ├── masters/
│   │   └── pos-mgmt/
│   ├── services/            # External service integrations (WhatsApp, S3)
│   ├── utils/               # Utility functions
│   │   ├── responseFormatter.js
│   │   ├── customErrors.js
│   │   ├── asyncHandler.js
│   │   └── jwtToken.utils.js
│   ├── views/               # EJS email/backup templates
│   └── server.js            # Application entry point
├── migrations/              # Sequelize DB migrations
├── public/                  # Static file serving
├── .env                     # Environment variables (not committed)
├── .gitignore
├── dbscript.sql             # Full DB schema script
└── package.json
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 20.0.0
- **MySQL** >= 8.0
- **npm** >= 10.0.0

### Installation

1. **Install dependencies**:
   ```bash
   cd Backend
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

3. **Database Setup**:
   - Create a MySQL database (e.g., `mini_erp`)
   - Import the schema:
     ```bash
     mysql -u root -p mini_erp < dbscript.sql
     ```
   - Update `DB_NAME`, `DB_USER`, `DB_PASS` in `.env`

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **Start production server**:
   ```bash
   npm start
   ```

---

## 📚 API Documentation

### Base URL

```
http://localhost:8003/api/v1
```

### Access Points

| Endpoint | Description |
|---|---|
| `http://localhost:8003/health` | Basic health check |
| `http://localhost:8003/health/ready` | Readiness probe (checks DB) |
| `http://localhost:8003/health/live` | Liveness probe |
| `http://localhost:8003/metrics` | Application metrics |

### Available Endpoints

#### 🔐 Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/userLogin` | User login — returns JWT |
| `POST` | `/api/v1/auth/userLogout` | Logout & invalidate token |
| `POST` | `/api/v1/auth/refreshToken` | Refresh access token |
| `POST` | `/api/v1/auth/forgotPassword` | Request password reset |
| `POST` | `/api/v1/auth/resetPassword` | Reset password with token |
| `POST` | `/api/v1/auth/changePassword` | Change current password |
| `GET`  | `/api/v1/auth/verifyToken` | Verify token validity |

#### 👤 Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/v1/users` | List all users |
| `POST` | `/api/v1/users` | Create new user |
| `GET`  | `/api/v1/users/:id` | Get user by ID |
| `PUT`  | `/api/v1/users/:id` | Update user |
| `DELETE` | `/api/v1/users/:id` | Soft-delete user |

#### 📦 Master Records
- `/api/v1/items` — Item management
- `/api/v1/brands` — Brand management
- `/api/v1/itemcategories` — Category management
- `/api/v1/itemtypes` — Item type management
- `/api/v1/uoms` — Unit of measure
- `/api/v1/suppliers` — Supplier management
- `/api/v1/warehouses` — Warehouse management
- `/api/v1/bom` — Bill of materials
- `/api/v1/roles` — Role management
- `/api/v1/permissions` — Permission management

#### 🏪 POS Management
- `/api/v1/pos/installation` — Device installation & activation
- `/api/v1/pos/order` — POS orders
- `/api/v1/pos/item` — POS item sync
- `/api/v1/pos/sync` — Full data sync
- `/api/v1/pos/stock` — Stock management
- `/api/v1/pos/settlement` — Cash settlement
- `/api/v1/pos/shift` — Shift management

---

## 🔧 Configuration

### Key Environment Variables (`.env`)

```bash
# Application
NODE_ENV=development
APP_NAME="MINI ERP"
SERVER_PORT=8003

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your_password
DB_NAME=mini_erp

# JWT
JWT_SECRET=your_strong_jwt_secret
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_strong_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d

# Security
ALLOWED_ORIGINS=http://localhost:3002
BCRYPT_ROUNDS=10

# Feature Flags
ENABLE_METRICS=true
ENABLE_HEALTH_CHECKS=true
ENABLE_BACKUPS=true
ENABLE_CLEANUP=true
```

---

## 🔒 Security Features

1. **Rate Limiting**: 100 req/15 min (API), 50 req/15 min (auth)
2. **Security Headers**: Helmet.js
3. **CORS**: Environment-specific allowed origins
4. **Input Validation**: Joi schema validation on all routes
5. **JWT Security**: Short-lived access tokens + refresh tokens
6. **Password Hashing**: bcrypt with 10 rounds
7. **Request Size Limits**: Configurable body size limits

---

## 📊 Monitoring & Logging

### Health Checks
- **`/health`** — Server status, uptime, memory usage
- **`/health/ready`** — Confirms DB is connected
- **`/health/live`** — Simple alive check

### Logging (Winston)
- Daily rotating log files (7-day retention)
- Separate log levels per environment (`debug` in dev, `info` in prod)
- Morgan HTTP request logging

---

## 🔄 Background Jobs (Cron)

| Job | Schedule | Purpose |
|-----|----------|---------|
| **DB Backup** | `0 2 * * *` (2:00 AM daily) | Automated MySQL backup |
| **File Cleanup** | `0 2 * * *` (2:00 AM daily) | Remove temp files older than 48h |
| **Token Cleanup** | `0 * * * *` (every hour) | Remove expired JWT tokens from DB |

---

## 📝 Scripts

```bash
npm run dev       # Start with nodemon (development)
npm start         # Start production server
npm run lint      # Run ESLint
npm run lint:fix  # Fix ESLint issues automatically
```

---

## 🚀 Deployment

1. Set `NODE_ENV=production`
2. Configure production MySQL database
3. Set secure JWT secrets (minimum 32 characters)
4. Configure `ALLOWED_ORIGINS` for your frontend domain
5. Set `LOG_LEVEL=info`

---

## 🔍 Troubleshooting

| Issue | Solution |
|-------|---------|
| `EADDRINUSE: address already in use :::8003` | Another process is on port 8003. Run `kill $(lsof -ti :8003)` |
| `secretOrPrivateKey must have a value` | `JWT_SECRET` is empty in `.env` — add a value |
| `Database connection failed` | Check `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME` in `.env` |
| `User not found` on login | Verify the user exists in `usermaster` table and `isdeleted=0` |
| `Invalid Authentication` on login | Password doesn't match — check the correct password |

---

## 📄 License

ISC License — © MINI ERP

## 🤝 Contributing

1. Follow the existing code style (ESLint enforced)
2. Use `asyncHandler` for all route handlers
3. Use `ResponseFormatter` for consistent API responses
4. Use custom error classes (`AuthenticationError`, `ValidationError`)
5. Update documentation for any new endpoints