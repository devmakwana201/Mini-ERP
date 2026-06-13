import { useEffect, useState } from 'react';
import useSlowNetwork from 'hooks/useSlowNetwork';

const SlowNetworkWarning = ({ children }) => {
  const isSlowNetwork = useSlowNetwork();
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (isSlowNetwork) {
      // Show modal for 3 seconds
      setShowWarning(true);
      
      // Hide modal after 3 seconds
      const timer = setTimeout(() => {
        setShowWarning(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isSlowNetwork]);

  return (
    <>
      {children}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm pointer-events-none">
          <div className="flex flex-col items-center justify-center rounded-xl bg-white/80 p-6 shadow-lg pointer-events-auto">
            <i className="pi pi-exclamation-triangle mb-2 text-4xl text-yellow-600" />
            <p className="text-sm font-semibold text-gray-800">
              Slow Network Detected
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default SlowNetworkWarning;