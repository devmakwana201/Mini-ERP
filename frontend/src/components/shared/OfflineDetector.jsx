import { useEffect } from 'react';
import useOnlineStatus from 'hooks/useOnlineStatus';
import NoInternet from 'app/pages/errors/NoInternet';
import { toast } from 'sonner';

const OfflineDetector = ({ children }) => {
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (!isOnline) {
      toast.error('You are offline', {
        description: 'Please check your internet connection',
        duration: 5000,
      });
    } else {
      // Show success toast when coming back online
      const wasOffline = sessionStorage.getItem('wasOffline');
      if (wasOffline === 'true') {
        toast.success('Connection restored', {
          description: 'You are back online',
          duration: 3000,
        });
        sessionStorage.removeItem('wasOffline');
      }
    }

    // Track offline state
    if (!isOnline) {
      sessionStorage.setItem('wasOffline', 'true');
    }
  }, [isOnline]);

  // Show the offline page when offline
  if (!isOnline) {
    return <NoInternet />;
  }

  // Render children when online
  return children;
};

export default OfflineDetector;