// Import Dependencies
import { Outlet, ScrollRestoration } from "react-router";
import { lazy } from "react";

// Local Imports
import { Progress } from "components/template/Progress";
import { Loadable } from "components/shared/Loadable";
import { useMaintenanceStatus } from "hooks/useMaintenanceStatus";
import MaintenancePage from "components/shared/MaintenancePage";

const Toaster = Loadable(lazy(() => import("components/template/Toaster")));
const Tooltip = Loadable(lazy(() => import("components/template/Tooltip")));

// ----------------------------------------------------------------------

function Root() {
  const { isMaintenanceMode, loading: maintenanceLoading } = useMaintenanceStatus();

  // Show maintenance page if maintenance mode is enabled
  if (isMaintenanceMode) {
    return <MaintenancePage />;
  }
  // The isInitialized check is gone!
  return (
    <>
      <Progress />
      <ScrollRestoration />
      <Outlet />
      <Tooltip />
      <Toaster />
    </>
  );
}

export default Root;
