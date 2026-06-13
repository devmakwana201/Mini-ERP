import { useState, useEffect } from 'react';

// --- Improved & Thematic Icons ---

const SystemUpdateIcon = () => (
  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
    <line x1="6" y1="6" x2="6.01" y2="6"></line>
    <line x1="6" y1="18" x2="6.01" y2="18"></line>
  </svg>
);

const DatabaseIcon = () => (
  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const SecurityIcon = () => (
  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);


// --- Reusable Status Card Component ---

const StatusCard = ({ icon, title, description, gradient }) => (
  <div className="bg-white/60 dark:bg-dark-700/60 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/20 dark:border-dark-600/30 hover:shadow-2xl hover:-translate-y-2 transition-all duration-200 group h-full flex flex-col text-center">
    <div className={`w-16 h-16 ${gradient} rounded-2xl flex items-center justify-center mb-5 mx-auto group-hover:scale-110 transition-transform duration-300`}>
      {icon}
    </div>
    <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2 text-lg">
      {title}
    </h3>
    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
      {description}
    </p>
  </div>
);


// --- Main Maintenance Page Component ---

const MaintenancePage = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const MaintenanceIcon = () => (
    <div className="relative w-24 h-24 mx-auto mb-6">
      {/* Animated rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute w-22 h-22 border-2 border-primary-300 rounded-full animate-ping opacity-30"></div>
        <div className="absolute w-30 h-30 border-2 border-primary-200 rounded-full animate-ping opacity-20" style={{ animationDelay: '0.75s' }}></div>
      </div>
      
      {/* Main Icon */}
      <svg className="relative w-24 h-24 text-primary-500 animate-pulse" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-dark-900 dark:via-dark-800 dark:to-dark-900 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 dark:opacity-10">
        <div className="absolute top-0 left-0 w-full h-full">
          <svg width="100%" height="100%" className="text-primary-600">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
      </div>

      <div className="relative z-10 max-w-5xl w-full">
        {/* Header Section */}
        <header className="text-center mb-12">
          <MaintenanceIcon />
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-4">
            Under Maintenance
          </h1>
          <p className="text-xl font-medium text-gray-600 dark:text-gray-300 mb-6">
            We&apos;re making things even better for you.
          </p>
          <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Our system is currently undergoing scheduled maintenance to improve performance and add new features. We appreciate your patience and will be back online shortly.
          </p>
        </header>

        {/* Status Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatusCard
            icon={<SystemUpdateIcon />}
            title="System Upgrades"
            description="Enhancing core infrastructure and servers for a faster, more reliable experience."
            gradient="bg-gradient-to-br from-blue-500 to-blue-600"
          />
          <StatusCard
            icon={<DatabaseIcon />}
            title="Database Optimization"
            description="Refining our data structures and queries to ensure lightning-fast information retrieval."
            gradient="bg-gradient-to-br from-green-500 to-green-600"
          />
          <StatusCard
            icon={<SecurityIcon />}
            title="Security Enhancements"
            description="Implementing the latest security protocols to keep your data safer than ever."
            gradient="bg-gradient-to-br from-purple-500 to-purple-600"
          />
        </section>

        {/* Time & Contact Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center mb-12">
          <div className="bg-white/70 dark:bg-dark-700/70 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/20 dark:border-dark-600/30 text-center">
              <div className="flex items-center justify-center mb-3 text-gray-800 dark:text-gray-200">
                <svg className="w-6 h-6 mr-2 text-primary-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <h3 className="font-semibold text-lg">Current Server Time</h3>
              </div>
              <p className="text-3xl font-mono font-bold text-primary-600 dark:text-primary-400">
                {currentTime.toLocaleTimeString()}
              </p>
              <p className="text-gray-500 dark:text-gray-400">
                {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
          </div>
          
          <div className="bg-white/70 dark:bg-dark-700/70 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/20 dark:border-dark-600/30">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 text-center mb-4">Need Immediate Assistance?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a href="mailto:sales@accreteinfo.com" className="group flex items-center justify-center px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                Email Support
              </a>
              <a href="tel:+919714774449" className="group flex items-center justify-center px-4 py-3 bg-white dark:bg-dark-600 border border-gray-300 dark:border-dark-500 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-100 dark:hover:bg-dark-500 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                Call Us
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p className="mb-2">Thank you for your patience as we work to improve your experience.</p>
          <div className="flex items-center justify-center space-x-4">
            <button onClick={() => window.location.reload()} className="hover:text-primary-500 transition-colors duration-200 flex items-center space-x-1 group">
              <svg className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              <span>Refresh Page</span>
            </button>
            <span>&bull;</span>
            <a href="#" className="hover:text-primary-500 transition-colors duration-200">System Status</a>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default MaintenancePage;