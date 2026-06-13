import { useState, useEffect, useCallback } from 'react';
import { MaintenanceService } from '../services/common/maintenanceapi';

export const useMaintenanceStatus = () => {
  const [maintenanceStatus, setMaintenanceStatus] = useState({
    isMaintenanceMode: false,
    loading: true,
    error: null,
    lastChecked: null
  });

  const checkMaintenanceStatus = useCallback(async () => {
    try {
      setMaintenanceStatus(prev => ({ ...prev, loading: true, error: null }));
      
      const result = await MaintenanceService.checkMaintenanceStatus();
      
      if (result.success) {
        setMaintenanceStatus({
          isMaintenanceMode: result.data.maintenanceMode,
          loading: false,
          error: null,
          lastChecked: new Date(),
          message: result.data.message
        });
      } else {
        setMaintenanceStatus({
          isMaintenanceMode: result.maintenanceMode,
          loading: false,
          error: result.message,
          lastChecked: new Date(),
          message: result.message
        });
      }
    } catch (error) {
      console.error('Error in useMaintenanceStatus:', error);
      setMaintenanceStatus({
        isMaintenanceMode: false, // Fail safely - don't block app
        loading: false,
        error: error.message,
        lastChecked: new Date(),
        message: 'System is operational'
      });
    }
  }, []);

  useEffect(() => {
    checkMaintenanceStatus();
  }, [checkMaintenanceStatus]);

  return {
    ...maintenanceStatus,
    refetch: checkMaintenanceStatus
  };
};