# Agri POS Backend

A robust and secure Node.js backend API for the Agri POS system with comprehensive security, monitoring, and testing capabilities.

## 🚀 Features

### ✅ Completed Optimizations

- **Security**: Rate limiting, Helmet.js security headers, CORS configuration, compression
- **Health Monitoring**: Multiple health check endpoints (`/health`, `/health/ready`, `/health/live`)
- **Error Handling**: Centralized error handling with custom error classes
- **Input Validation**: Comprehensive validation middleware using Joi
- **Environment Configuration**: Proper environment-specific settings
- **Metrics**: Application metrics endpoint at `/metrics`
- **Code Quality**: ESLint configuration and code formatting

### 🔧 Technical Stack

- **Framework**: Express.js
- **Database**: MySQL with connection pooling
- **Authentication**: JWT with refresh tokens
- **File Storage**: AWS S3 integration
- **Logging**: Winston with daily log rotation
- **Validation**: Joi schema validation

## 📁 Project Structure

```
src/
├── config/           # Configuration files
│   ├── config.js     # Centralized configuration
│   └── winston.js    # Logging configuration
├── controllers/      # Route handlers
├── helpers/          # Database and utility helpers
├── jobs/            # Cron job implementations
├── middlewares/     # Express middleware
│   ├── auth.middleware.js
│   └── validation.js
├── models/          # Data access layer
├── routes/          # API route definitions
├── services/        # External service integrations
├── utils/           # Utility functions
│   ├── responseFormatter.js
│   ├── customErrors.js
│   ├── asyncHandler.js
│   └── jwtToken.utils.js
├── views/           # EJS templates
└── server.js        # Application entry point
```

## 🚀 Quick Start

### Prerequisites

- Node.js (>= 20.0.0)
- MySQL (>= 9.1.0)
- npm (>= 10.0.0)

### Installation

1. **Clone and setup**:
   ```bash
   cd server
   npm install
   ```

2. **Environment Configuration**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database Setup**:
   - Create MySQL database
   - Update database credentials in `.env`

4. **Start Development Server**:
   ```bash
   npm run dev
   ```

5. **Production Start**:
   ```bash
   npm start
   ```

## 📚 API Documentation

### Access Points

- **API Documentation**: `http://localhost:8001/api-docs`
- **Health Check**: `http://localhost:8001/health`
- **Metrics**: `http://localhost:8001/metrics`

### Available Endpoints

#### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password
- `POST /api/v1/auth/change-password` - Change password
- `GET /api/v1/auth/verify` - Verify token

#### Users
- `GET /api/v1/users` - Get users list
- `POST /api/v1/users` - Create new user
- `GET /api/v1/users/:id` - Get user by ID
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

#### Health & Monitoring
- `GET /health` - Basic health check
- `GET /health/ready` - Readiness probe (checks DB)
- `GET /health/live` - Liveness probe
- `GET /metrics` - Application metrics

## 🔧 Configuration

### Environment Variables

Key environment variables (see `.env.example` for complete list):

```bash
# Server
NODE_ENV=development
SERVER_PORT=8001
BASE_URL=http://localhost

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=agripos

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Security
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
BCRYPT_ROUNDS=10
```

### Feature Flags

```bash
ENABLE_METRICS=true
ENABLE_HEALTH_CHECKS=true
ENABLE_BACKUPS=true
ENABLE_CLEANUP=true
```

## 🔒 Security Features

### Implemented Security Measures

1. **Rate Limiting**: 100 requests per 15 minutes (API), 5 per 15 minutes (auth)
2. **Security Headers**: Helmet.js for security headers
3. **CORS**: Environment-specific CORS configuration
4. **Input Validation**: Comprehensive request validation
5. **JWT Security**: Access and refresh tokens with proper expiration
6. **Password Hashing**: bcrypt with configurable rounds
7. **Request Size Limits**: 10MB body parsing limit

### Security Best Practices

- All passwords are hashed using bcrypt
- JWT tokens have proper expiration times
- Sensitive data is not logged in production
- Rate limiting prevents brute force attacks
- Input validation prevents injection attacks
- CORS is configured per environment

## 📊 Monitoring & Logging

### Health Checks

- **Basic Health** (`/health`): Server status, uptime, memory usage
- **Readiness** (`/health/ready`): Database connectivity check
- **Liveness** (`/health/live`): Simple alive check

### Metrics

Application metrics available at `/metrics`:
- Process uptime
- Memory usage
- CPU usage
- Environment information

### Logging

- **Winston** for structured logging
- **Daily log rotation** (14 days retention)
- **Different log levels** per environment
- **Request logging** with Morgan

## 🔄 Background Jobs

### Cron Jobs

1. **Database Backup**: Daily at 2:00 AM
2. **Cleanup Job**: Daily cleanup of temporary files

### Job Configuration

```bash
BACKUP_SCHEDULE="0 2 * * *"
CLEANUP_SCHEDULE="0 2 * * *"
CLEANUP_AGE_HOURS=48
```

## 📝 Scripts

```bash
# Development
npm run dev          # Start with nodemon

# Production
npm start           # Start production server

# Database
npm run db:setup     # Setup database (migrations + seeders)
npm run db:migrate   # Run migrations only
npm run db:seed      # Run seeders only

# Code Quality
npm run lint        # Run ESLint
npm run lint:fix    # Fix ESLint issues
```

## 🚀 Deployment

### Environment Setup

1. Set `NODE_ENV=production`
2. Configure production database
3. Set secure JWT secrets
4. Configure CORS for production domains
5. Set up proper logging levels

## 🛠 Development

### Code Style

- **ESLint** for code linting
- **4-space indentation**
- **Double quotes** for strings
- **Semicolons** required

### Best Practices

1. Use `asyncHandler` for route handlers
2. Use `ResponseFormatter` for consistent responses
3. Use custom error classes for specific errors
4. Follow the existing project structure

## 🔍 Troubleshooting

### Common Issues

1. **Database Connection**: Check DB credentials and connection
2. **JWT Errors**: Verify JWT_SECRET is set
3. **CORS Issues**: Check ALLOWED_ORIGINS configuration
4. **Rate Limiting**: Check if hitting rate limits

### Debug Mode

Set `LOG_LEVEL=debug` for detailed logging.

## 📄 License

ISC License

## 🤝 Contributing

1. Follow the existing code style
2. Update documentation
3. Follow security best practices