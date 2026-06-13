# MINI ERP - Frontend (Admin Panel)

A modern, feature-rich **React** admin dashboard for the **MINI ERP** system. Built with cutting-edge technologies and production-ready patterns — providing complete ERP management capabilities including inventory, users, POS, reports, and more.

---

## ✨ Features

### Core Technologies
| Technology | Version | Purpose |
|---|---|---|
| **React** | 19.x | UI framework |
| **Vite** | 6.x | Lightning-fast build tool with HMR |
| **Tailwind CSS** | 4.x | Utility-first styling |
| **Redux Toolkit** | 2.x | Global state management |
| **React Router** | 7.x | Client-side routing with protected routes |
| **Axios** | 1.x | HTTP client with interceptors |
| **React Hook Form** | 7.x | Performant form handling |
| **Yup** | 1.x | Schema-based form validation |
| **PrimeReact** | 10.x | Enterprise UI component library |

### UI/UX Excellence

- 🎨 **Theming System** — Light/Dark mode, multiple color schemes (blue, indigo, green, amber, purple, rose), monochrome mode
- 📱 **Responsive Design** — Mobile-first, breakpoint-aware components, touch-optimized
- 🎯 **Component Library** — 18+ custom UI components (Tables, Forms, Modals, Charts)
- ⚡ **Performance** — Code splitting, lazy loading, virtual scrolling

### Advanced Features

- 🔐 **Authentication & Authorization** — JWT-based auth, role-based access control (RBAC), protected routes, session persistence
- 📊 **Data Visualization** — ApexCharts, Chart.js, real-time analytics dashboard
- 📝 **Rich Content Editing** — Quill editor, TinyMCE support
- 🌍 **Internationalization** — i18next, English & Arabic support, RTL layout
- 📤 **File Management** — Drag-and-drop uploads, FilePond, image compression, AWS S3 ready

---

## 📁 Project Structure

```
Frontend/
├── public/
│   └── images/              # Static images (flags, logos, illustrations)
│
├── src/
│   ├── app/
│   │   ├── contexts/        # React Context providers
│   │   │   ├── auth/        # Authentication context (login, logout, session)
│   │   │   ├── breakpoint/  # Responsive breakpoint context
│   │   │   ├── locale/      # Internationalization context
│   │   │   ├── sidebar/     # Sidebar state management
│   │   │   └── theme/       # Theme configuration context
│   │   │
│   │   ├── layouts/         # Application layouts
│   │   │   ├── MainLayout/  # Primary dashboard layout
│   │   │   └── Sideblock/   # Compact sidebar layout
│   │   │
│   │   ├── navigation/      # Navigation menu configuration
│   │   │   ├── dashboards.js
│   │   │   ├── masterRecords.js
│   │   │   └── settings.js
│   │   │
│   │   ├── pages/           # Application pages
│   │   │   ├── Auth/        # Login, forgot/reset password pages
│   │   │   ├── dashboards/  # Dashboard overview
│   │   │   ├── masterRecords/ # Items, categories, suppliers, users, roles
│   │   │   └── errors/      # 401, 404, 500 error pages
│   │   │
│   │   └── router/          # Routing configuration
│   │       ├── protected.jsx  # Authenticated routes
│   │       ├── ghost.jsx      # Unauthenticated (login) routes
│   │       └── router.jsx     # Root router setup
│   │
│   ├── components/
│   │   ├── shared/          # Reusable form and table components
│   │   ├── template/        # Layout components (header, sidebar, notifications)
│   │   └── ui/              # Core UI library (Button, Card, Badge, Table, etc.)
│   │
│   ├── configs/             # App-level configuration
│   │   ├── auth.config.js
│   │   ├── breakpoints.config.js
│   │   └── theme.config.js
│   │
│   ├── hooks/               # 30+ custom React hooks
│   │   ├── useDebounce.js
│   │   ├── useLocalStorage.js
│   │   ├── useMediaQuery.js
│   │   └── ...
│   │
│   ├── i18n/                # Internationalization
│   │   └── locales/
│   │       ├── en/translations.json
│   │       └── ar/translations.json
│   │
│   ├── middleware/
│   │   ├── AuthGuard.jsx    # Redirects unauthenticated users to login
│   │   └── GhostGuard.jsx   # Redirects logged-in users away from login
│   │
│   ├── redux/               # Redux store
│   │   ├── Store.jsx
│   │   └── slice/FormSlice.js
│   │
│   ├── services/            # API service layer
│   │   ├── common/          # Shared API helpers
│   │   ├── master-records/  # Items, brands, categories, users, suppliers
│   │   ├── reports/         # Sales, purchase, stock reports
│   │   └── finance/         # Invoice & payment tracking
│   │
│   ├── styles/              # Global CSS styles
│   │   ├── index.css
│   │   ├── base.css
│   │   ├── colors.css
│   │   └── app/             # Component-specific styles
│   │
│   └── utils/               # Utility functions
│       ├── axios.js          # Axios instance with auth interceptors
│       ├── jwt.js            # Token validation helpers
│       ├── dateHelpers.js
│       ├── formatNumber.js
│       └── responseHandler.js
│
├── .env                     # Environment variables
├── .gitignore
├── index.html
├── vite.config.js           # Vite configuration (port 3002)
├── eslint.config.js
├── prettier.config.js
├── jsconfig.json            # Path aliases
├── vercel.json              # Vercel deployment config
└── package.json
```

---

## 🛠️ Installation

### Prerequisites
- **Node.js** >= 18.x
- **npm** >= 9.x
- **Backend** running at `http://localhost:8003`

### Setup Instructions

1. **Install dependencies**:
   ```bash
   cd Frontend
   npm install
   ```

2. **Configure environment**:
   Create a `.env` file in the `Frontend/` root:
   ```env
   VITE_API_BASE_URL=http://localhost:8003/api/v1
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```
   Opens at `http://localhost:3002`

4. **Build for production**:
   ```bash
   npm run build
   ```

5. **Preview production build**:
   ```bash
   npm run preview
   ```

---

## 🔑 Default Login Credentials

| Field | Value |
|-------|-------|
| **Email** | `admin@gmail.com` |
| **Password** | `admin@123` |

> Make sure the backend is running at `http://localhost:8003` before attempting login.

---

## 📝 Available Scripts

```bash
npm run dev       # Start Vite dev server (http://localhost:3002)
npm run build     # Build production bundle
npm run lint      # Run ESLint
npm run preview   # Preview production build locally
```

---

## 🎨 Theming & Customization

Customize the theme via `src/configs/theme.config.js`:

```javascript
{
  themeMode: "light",         // "light" | "dark" | "system"
  isMonochrome: false,        // Enable monochrome mode
  themeLayout: "main-layout", // "main-layout" | "sideblock"
  cardSkin: "bordered",       // "bordered" | "shadow-sm"
}
```

### Color Schemes
- **Dark themes**: cinder, navy, mirage, black, mint
- **Light themes**: slate, gray, neutral
- **Primary accent colors**: blue, indigo, green, amber, purple, rose

---

## 🔒 Authentication Flow

1. **Login** — User submits credentials → POST `/api/v1/auth/userLogin`
2. **Token Storage** — JWT stored in `localStorage` (persistent) or `sessionStorage` (session-only) based on "Remember Me"
3. **Request Interception** — Axios interceptor attaches `Authorization: Bearer <token>` to all requests
4. **Route Protection** — `AuthGuard` middleware validates token on every protected route
5. **Auto-Logout** — Redirects to `/login` on 401 response
6. **Multi-Tab Sync** — Storage event listeners sync auth state across browser tabs

---

## 📊 Key Modules

### Master Records Management
- **Users** — Create, update, delete, view user accounts
- **Roles & Permissions** — Role-based access control
- **Items** — Product/inventory management with BOM
- **Categories & Brands** — Item classification
- **Suppliers** — Vendor management
- **Warehouses** — Storage location management
- **UOM** — Units of measurement

### Reports
- **Sales Reports** — Daily summary, product-wise, customer-wise, discount, cancellations
- **Purchase Reports** — Daily summary, supplier ledger, price deviation
- **Stock Reports** — Current stock, day-wise details, adjustment reports
- **Finance** — Invoice payment tracking

### PrimeReact DataTable Features
- Lazy server-side pagination & filtering
- Column-level filtering (text, date range, select)
- Multi-column sorting
- Skeleton loading states
- Row action menus
- Excel export
- Session-persistent state

---

## ⚡ Performance Optimizations

- **Code Splitting** — Dynamic imports per route
- **Lazy Loading** — Components loaded on demand
- **Image Optimization** — Automatic compression
- **Bundle Optimization** — Tree shaking & minification
- **Virtual Scrolling** — Large list optimization
- **Network Detection** — Slow network warnings

---

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## 🔧 Configuration Files

| File | Purpose |
|------|---------|
| `vite.config.js` | Vite bundler config (port 3002) |
| `eslint.config.js` | ESLint rules for React |
| `prettier.config.js` | Code formatting rules |
| `jsconfig.json` | Absolute import path aliases |
| `vercel.json` | Vercel SPA routing config |

---

## 🚢 Deployment

### Environment Variables for Production

```env
VITE_API_BASE_URL=https://your-production-api.com/api/v1
```

### Vercel
```bash
npm run build
vercel --prod
```

### Netlify
```bash
npm run build
# Upload dist/ folder to Netlify
# Set redirect: /* → /index.html (200) for SPA routing
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3002
CMD ["npm", "run", "preview"]
```

---

## 🔍 Troubleshooting

| Issue | Solution |
|-------|---------|
| **Login not working / API fails** | Ensure `.env` has `VITE_API_BASE_URL=http://localhost:8003/api/v1` and restart Vite |
| **CORS error in browser** | Check backend `ALLOWED_ORIGINS` includes `http://localhost:3002` |
| **Blank screen after login** | Check browser console for JS errors; verify backend profile endpoint |
| **Vite not picking up `.env`** | Restart `npm run dev` — Vite reads `.env` only at startup |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/your-feature`)
3. Follow the existing code style (ESLint + Prettier enforced)
4. Commit with clear messages (`git commit -m 'feat: add new report page'`)
5. Push to your branch and open a Pull Request

---

## 📄 License

ISC License — © MINI ERP

---

Built with ❤️ for **MINI ERP** using modern web technologies.