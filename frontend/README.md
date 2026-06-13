# 🚀 Agro Manager Admin Panel

A modern, feature-rich React admin dashboard built with cutting-edge technologies and best practices. This production-ready template provides a solid foundation for building scalable administrative interfaces with a focus on developer experience and UI/UX excellence.

## ✨ Features

### Core Technologies
- **React 19** - Latest React version with concurrent features
- **Vite 6** - Lightning-fast build tool with HMR
- **Tailwind CSS 4** - Utility-first CSS framework with JIT compilation
- **Redux Toolkit** - Powerful state management with Redux Persist
- **React Router 7** - Client-side routing with protected routes
- **React Hook Form** - Performant forms with built-in validation
- **Yup** - Schema validation for robust form handling
- **Axios** - Promise-based HTTP client with interceptors

### UI/UX Excellence
- **🎨 Theming System**
  - Light/Dark mode support
  - Customizable color schemes (blue, indigo, green, amber, purple, rose)
  - Monochrome mode option
  - Multiple layout configurations

- **📱 Responsive Design**
  - Mobile-first approach
  - Breakpoint-aware components
  - Touch-optimized interactions

- **🎯 Component Library**
  - 18+ custom UI components
  - Headless UI integration
  - Heroicons for consistent iconography
  - PrimeReact components for complex UI needs

### Advanced Features
- **🔐 Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control (RBAC)
  - Protected routes with middleware guards
  - Session persistence

- **📊 Data Visualization**
  - ApexCharts integration
  - Chart.js support
  - Real-time analytics dashboard
  - Performance metrics

- **📝 Rich Content Editing**
  - TinyMCE rich text editor
  - Quill editor alternative
  - Markdown support with react-markdown
  - Syntax highlighting

- **🌍 Internationalization**
  - i18next integration
  - Multi-language support (English, Arabic)
  - RTL layout support
  - Language detection

- **📤 File Management**
  - Drag-and-drop file uploads
  - FilePond integration
  - Image compression
  - AWS S3 integration ready
  - HEIC to JPEG conversion

## 📁 Project Structure

```
agro-manager-adminpanel/
├── public/
│   └── images/
│       ├── awards/           # Award icons and badges
│       ├── christmas/        # Seasonal assets
│       ├── flags/            # Country flags (PNG & SVG)
│       ├── folders/          # Folder status icons
│       ├── illustrations/    # UI illustrations
│       ├── logos/            # Brand logos
│       └── payments/         # Payment method icons
│
├── src/
│   ├── app/
│   │   ├── contexts/        # React Context providers
│   │   │   ├── auth/        # Authentication context
│   │   │   ├── breakpoint/  # Responsive breakpoint context
│   │   │   ├── locale/      # Internationalization context
│   │   │   ├── sidebar/     # Sidebar state management
│   │   │   └── theme/       # Theme configuration context
│   │   │
│   │   ├── layouts/         # Application layouts
│   │   │   ├── MainLayout/  # Primary dashboard layout
│   │   │   ├── Sideblock/   # Alternative sidebar layout
│   │   │   ├── AppLayout.jsx
│   │   │   └── DynamicLayout.jsx
│   │   │
│   │   ├── navigation/      # Navigation configuration
│   │   │   ├── dashboards.js
│   │   │   ├── masterRecords.js
│   │   │   └── settings.js
│   │   │
│   │   ├── pages/           # Application pages
│   │   │   ├── Auth/        # Authentication pages
│   │   │   ├── dashboards/  # Dashboard variations
│   │   │   ├── errors/      # Error pages (401, 404, 429, 500)
│   │   │   ├── masterRecords/ # CRUD management pages
│   │   │   └── settings/    # Application settings
│   │   │
│   │   └── router/          # Routing configuration
│   │       ├── ghost.jsx    # Ghost routes
│   │       ├── protected.jsx # Protected routes
│   │       ├── public.jsx   # Public routes
│   │       └── router.jsx   # Main router setup
│   │
│   ├── assets/              # Static assets
│   │   ├── dualicons/       # Dual-tone icons
│   │   ├── illustrations/  # SVG illustrations
│   │   └── nav-icons/       # Navigation icons
│   │
│   ├── components/
│   │   ├── shared/          # Shared components
│   │   │   ├── form/        # Form components
│   │   │   │   ├── Combobox.jsx
│   │   │   │   ├── Datepicker.jsx
│   │   │   │   ├── Filepond.jsx
│   │   │   │   ├── Flatpickr.jsx
│   │   │   │   └── TextEditor.jsx
│   │   │   │
│   │   │   └── table/       # Table components
│   │   │       ├── ColumnFilter.jsx
│   │   │       ├── PaginationSection.jsx
│   │   │       └── TableSettings.jsx
│   │   │
│   │   ├── template/        # Template components
│   │   │   ├── AnimatedCounter.jsx
│   │   │   ├── LanguageSelector.jsx
│   │   │   ├── Notifications.jsx
│   │   │   ├── RightSidebar/
│   │   │   ├── Search/
│   │   │   └── SplashScreen.jsx
│   │   │
│   │   └── ui/              # UI component library
│   │       ├── Accordion/
│   │       ├── Avatar/
│   │       ├── Badge/
│   │       ├── Button/
│   │       ├── Card/
│   │       ├── Form/
│   │       ├── Pagination/
│   │       ├── Table/
│   │       └── Timeline/
│   │
│   ├── configs/             # Configuration files
│   │   ├── auth.config.js
│   │   ├── breakpoints.config.js
│   │   └── theme.config.js
│   │
│   ├── constants/           # Application constants
│   │   ├── app.constant.js
│   │   ├── colors.constant.js
│   │   └── countries.constant.js
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── useClipboard.js
│   │   ├── useDebounce.js
│   │   ├── useLocalStorage.js
│   │   ├── useMediaQuery.js
│   │   └── [30+ custom hooks]
│   │
│   ├── i18n/                # Internationalization
│   │   ├── config.js
│   │   └── locales/
│   │       ├── ar/
│   │       └── en/
│   │
│   ├── middleware/          # Route middleware
│   │   ├── AuthGuard.jsx
│   │   └── GhostGuard.jsx
│   │
│   ├── redux/               # Redux store configuration
│   │   ├── Store.jsx
│   │   └── slice/
│   │       └── FormSlice.js
│   │
│   ├── services/            # API services
│   │   ├── common/
│   │   └── master-records/
│   │
│   ├── styles/              # Global styles
│   │   ├── app.css
│   │   ├── base.css
│   │   ├── colors.css
│   │   ├── layouts.css
│   │   ├── variants.css
│   │   ├── app/
│   │   │   ├── components/
│   │   │   └── forms/
│   │   └── vendors/         # Third-party styles
│   │
│   └── utils/               # Utility functions
│       ├── axios.js
│       ├── dateHelpers.js
│       ├── formatters.js
│       ├── jwt.js
│       ├── dom/            # DOM utilities
│       └── react-table/    # React Table helpers
│
├── .gitignore
├── eslint.config.js         # ESLint configuration
├── index.html
├── jsconfig.json            # JavaScript configuration
├── package.json
├── prettier.config.js       # Prettier configuration
├── vercel.json             # Vercel deployment config
└── vite.config.js          # Vite configuration
```

## 🛠️ Installation

### Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd agro-manager-adminpanel
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```
   The application will open at `http://localhost:3002`

4. **Build for production**
   ```bash
   npm run build
   ```

5. **Preview production build**
   ```bash
   npm run preview
   ```

### 🔑 Default Login Credentials
For quick testing and development access:
- **Email**: `admin@gmail.com`
- **Password**: `admin@123`

The login form comes pre-filled with these credentials for convenience.

## 📝 Available Scripts

```json
{
  "dev": "vite",              # Start development server
  "build": "vite build",      # Build for production
  "lint": "eslint .",         # Run ESLint
  "preview": "vite preview"   # Preview production build
}
```

## 🎨 Theming & Customization

### Theme Configuration
The theme system is highly customizable through `src/configs/theme.config.js`:

```javascript
{
  themeMode: "light",        // "light" | "dark" | "system"
  isMonochrome: false,       // Enable monochrome mode
  themeLayout: "main-layout",// "main-layout" | "sideblock"
  cardSkin: "bordered",      // "bordered" | "shadow-sm"
}
```

### Color Schemes
- **Dark themes**: cinder, navy, mirage, black, mint
- **Light themes**: slate, gray, neutral
- **Primary colors**: blue, indigo, green, amber, purple, rose

### Layout Options
- **Main Layout**: Traditional sidebar navigation
- **Sideblock**: Compact sidebar with expandable panels

## 🔒 Authentication Flow

1. **Login Process**
   - User submits credentials
   - JWT token received and stored
   - User redirected to dashboard

2. **Protected Routes**
   - AuthGuard middleware validates token
   - Unauthorized users redirected to login
   - Role-based access control enforced

3. **Session Management**
   - Redux Persist maintains session
   - Auto-logout on token expiration
   - Refresh token support ready

## 📊 Key Components

### Dashboard Features
- **Real-time Analytics**: Live data updates with WebSocket support
- **Performance Metrics**: System and user performance tracking
- **Form Performance Overview**: Form submission analytics
- **Statistics Cards**: Key metrics at a glance

### Master Records Management
- **User Management**: Complete CRUD operations
- **Role Management**: Define and assign roles
- **Permission System**: Granular permission control

## 📋 DataTable Architecture & Implementation

### PrimeReact DataTable Integration
The project uses **PrimeReact DataTable** as the primary table component with extensive customization and advanced features.

#### Core DataTable Features
```jsx
<DataTable
  value={userList}
  paginator
  lazy
  filterDisplay="row"
  filterDelay={0}
  filters={filters}
  globalFilterFields={["username", "firstname", "lastname", "email"]}
  onFilter={(e) => setFilters(e.filters)}
  onPage={(e) => setLazyParams(prev => ({...prev, first: e.first, rows: e.rows}))}
  onSort={(e) => setLazyParams(prev => ({...prev, sortField: e.sortField}))}
  stateStorage="session"
  stateKey="userTableFilters"
  rows={10}
  totalRecords={totalRecords}
  paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
  rowsPerPageOptions={[10, 25, 50]}
/>
```

#### Filter Implementation
- **Global Search**: Search across multiple fields simultaneously
- **Column Filters**: Individual column filtering with different types:
  - **Text Filter**: Standard text matching
  - **Date Range Filter**: Flatpickr-based date range selection
  - **Number Range Filter**: Min/max numeric filtering
  - **Select Filter**: Multi-select dropdown with checkboxes
- **Session Persistence**: Filters and pagination state persist across sessions

#### Column Configuration
```jsx
<Column
  field="username"
  header="User Name"
  body={userNameBodyTemplate}
  filter
  showFilterMenu={false}
  filterPlaceholder="Search Username"
  style={{ minWidth: "10rem" }}
/>
```

#### Advanced DataTable Features
- **Lazy Loading**: Server-side pagination and filtering
- **State Management**: Filter and pagination state persistence
- **Custom Templates**: Body templates for custom cell rendering
- **Skeleton Loading**: Loading states with skeleton placeholders
- **Action Menus**: Row-based action buttons with overlay panels
- **Responsive Design**: Mobile-friendly table layouts
- **Export Capabilities**: Built-in data export functionality

#### DataTable Service Pattern
```jsx
// Service layer for API integration
const fetchUsers = useCallback(async () => {
  const data = await UserService.getFormattedUsers({
    filters,
    start: lazyParams.first,
    length: lazyParams.rows,
    sortField: lazyParams.sortField,
    sortOrder: lazyParams.sortOrder,
  });
  setUserList(data.data);
  setTotalRecords(data.totalRecords);
}, [filters, lazyParams]);
```

### Table Features Summary
- **Advanced Filtering**: Column, date, range, and faceted filters
- **Sorting**: Multi-column sorting support
- **Pagination**: Client and server-side pagination
- **Export**: Excel export with styling (xlsx-js-style)
- **Column Visibility**: Show/hide columns dynamically
- **Row Selection**: Bulk actions support
- **Network Optimization**: Slow network detection and warnings

## 🔐 Authentication System Deep Dive

### JWT-Based Authentication Flow

#### 1. Authentication Context Structure
```jsx
const initialState = {
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  errorMessage: null,
  user: null,
  token: null,
};
```

#### 2. Login Process Flow
```jsx
const login = async ({ email, password, rememberMe }) => {
  dispatch({ type: "LOGIN_REQUEST" });
  
  try {
    // API call for authentication
    const response = await axios.post(`${BASE_URL}/auth/userLogin`, {
      email,
      password,
    });
    
    const { success, token } = response.data;
    
    // Store token with remember me option
    setSession(token, rememberMe);
    
    // Set axios default headers
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    
    // Fetch user profile
    const profileResponse = await axios.post(`${BASE_URL}/users/profile`);
    const user = profileResponse.data[0];
    
    dispatch({
      type: "LOGIN_SUCCESS",
      payload: { user, token },
    });
    
    return { success: true };
  } catch (err) {
    dispatch({
      type: "LOGIN_ERROR",
      payload: { errorMessage: err.response?.data?.msg },
    });
    throw new Error(err.response?.data?.msg || "Login failed");
  }
};
```

#### 3. Session Management
- **Token Storage**: Supports both localStorage (persistent) and sessionStorage (session-only)
- **Remember Me**: Optional persistent login across browser sessions
- **Multi-Tab Sync**: Authentication state synced across browser tabs
- **Auto-Logout**: Automatic logout on token expiration

#### 4. Route Protection System
```jsx
// AuthGuard middleware
export default function AuthGuard() {
  const { isAuthenticated } = useAuthContext();
  const location = useLocation();
  
  if (!isAuthenticated) {
    return (
      <Navigate
        to={`${GHOST_ENTRY_PATH}?${REDIRECT_URL_KEY}=${location.pathname}`}
        replace
      />
    );
  }
  
  return <>{outlet}</>;
}
```

#### 5. Token Validation & Security
- **JWT Decode**: Token validation and expiration checking
- **Automatic Refresh**: Token refresh mechanism ready
- **Secure Storage**: XSS protection with httpOnly cookie support
- **Cross-Tab Communication**: Storage event listeners for state sync

#### 6. Authentication Features
- **Role-Based Access Control (RBAC)**: User roles and permissions
- **Session Persistence**: Configurable session duration
- **Logout Everywhere**: Global logout across all sessions
- **Login Activity Tracking**: IP address and login history
- **Password Security**: Encryption and secure transmission

#### 7. User Profile Management
```jsx
// User profile structure
const userProfile = {
  userid: 1,
  username: "superadmin",
  firstname: "super",
  lastname: "admin",
  email: "admin@gmail.com",
  profilepic: null,
  deptid: 0,
  roleid: 0,
  permissions: [...],
  role: "Administrator"
};
```

### Authentication Security Features
- **JWT Token Encryption**: Secure token generation and validation
- **Request Interceptors**: Automatic token attachment to API requests
- **Error Handling**: Comprehensive error management for auth failures
- **Redirect Management**: Smart redirect after login based on intended destination
- **Session Timeout**: Configurable session timeout with warnings
- **Concurrent Session Management**: Control multiple device logins

### Form Components
- **Validation**: Yup schema validation
- **File Upload**: Drag-and-drop with preview
- **Date Pickers**: Flatpickr integration
- **Rich Text**: TinyMCE and Quill editors
- **Auto-complete**: Searchable dropdowns
- **Input Masks**: Formatted input fields

## ⚡ Performance Optimizations

- **Code Splitting**: Dynamic imports for routes
- **Lazy Loading**: Components loaded on demand
- **Image Optimization**: Automatic compression
- **Bundle Optimization**: Tree shaking and minification
- **Caching Strategy**: Service worker ready
- **Virtual Scrolling**: Large list optimization

## 🧪 Development Tools

### Code Quality
- **ESLint**: Code linting with React rules
- **Prettier**: Code formatting with Tailwind plugin
- **Lint-staged**: Pre-commit hooks for code quality

### Developer Experience
- **Hot Module Replacement**: Instant updates
- **JSConfig Paths**: Absolute imports support
- **SVGR**: Import SVGs as React components
- **Error Boundaries**: Graceful error handling

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 📦 Dependencies Overview

### Core Libraries
- React 19.0.0
- React Router 7.6.0
- Redux Toolkit 2.8.1
- Tailwind CSS 4.0.16
- Vite 6.2.3

### UI Libraries
- Headless UI 2.2.0
- Heroicons 2.2.0
- PrimeReact 10.9.5
- React Icons 5.5.0
- Swiper 11.2.6

### Form & Validation
- React Hook Form 7.54.2
- Yup 1.6.1
- Cleave.js 1.6.0

### Data Visualization
- ApexCharts 4.7.0
- Chart.js 4.5.0
- React ApexCharts 1.7.0

### Utilities
- Axios 1.8.4
- Day.js 1.11.13
- date-fns 4.1.0
- UUID 11.1.0
- Crypto-js 4.2.0

## 🔧 Configuration Files

- **vite.config.js**: Vite bundler configuration
- **eslint.config.js**: ESLint rules and settings
- **prettier.config.js**: Code formatting rules
- **jsconfig.json**: Path aliases and IntelliSense
- **vercel.json**: Deployment configuration

## 📂 Folder Structure Deep Dive

### Key Directories Explained

#### `/src/app/`
- **contexts/**: React Context providers for global state management
- **layouts/**: Reusable layout components (MainLayout, Sideblock)
- **navigation/**: Navigation menu configurations and routing setup
- **pages/**: All application pages organized by feature
- **router/**: Routing configuration with protected and public routes

#### `/src/components/`
- **shared/**: Reusable components across the application
- **template/**: Layout-specific components (headers, sidebars)
- **ui/**: Core UI component library (buttons, inputs, tables)

#### `/src/utils/`
- **dom/**: DOM manipulation and browser utilities
- **react-table/**: Table-specific helper functions
- Core utilities for common operations (formatting, validation, etc.)

## 🎯 Getting Started Guide

### First Steps After Installation

1. **Explore the Dashboard**
   - Navigate to `http://localhost:3002`
   - Login with the default credentials
   - Check out the dashboard features and navigation

2. **Customize Theme**
   - Edit `src/configs/theme.config.js`
   - Change colors, layout, and appearance settings
   - See changes in real-time with HMR

3. **Add New Pages**
   - Create page components in `src/app/pages/`
   - Update navigation in `src/app/navigation/`
   - Add routes in `src/app/router/`

4. **Integrate APIs**
   - Configure axios in `src/utils/axios.js`
   - Create service files in `src/services/`
   - Update authentication endpoints in contexts

## 🚢 Deployment

### Vercel Deployment
The project includes a `vercel.json` configuration file for easy deployment:

```bash
npm run build
vercel --prod
```

### Other Deployment Options

#### Netlify
```bash
npm run build
# Upload dist/ folder to Netlify
```

#### Docker Deployment
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

### Environment Variables
Create a `.env` file in the root directory:

```env
# API Configuration
VITE_API_BASE_URL=your_api_base_url
VITE_API_TIMEOUT=30000

# Feature Flags
VITE_TEXT_EDITOR_KEY=your_tiny_mc_text_editor_key
VITE_MAX_FILE_TO_UPLOAD=maximum_file_allowed_while_upload
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request


## 🙏 Acknowledgments

- React team for the amazing framework
- Tailwind CSS for the utility-first approach
- All open-source contributors

## 📞 Support

For support, email dhrumil@accreteinfo.com or open an issue in the GitHub repository.

---

Built with ❤️ using modern web technologies