// Local Imports
import { MainPanel } from "app/layouts/MainLayout/Sidebar/MainPanel";
import { baseNavigation as fullNavigation } from "app/navigation";
import { SidebarPanel } from "./SidebarPanel";
import { useAuthContext } from "app/contexts/auth/context";

// ----------------------------------------------------------------------

export function Sidebar() {
  const { user } = useAuthContext();
  const baseNavigation =
    user?.roleid === 0
      ? fullNavigation
      : fullNavigation.filter((item) => item.id === "form-entries");

  return (
    <>
      <MainPanel nav={baseNavigation} activeSegment="/settings" />
      <SidebarPanel />
    </>
  );
}
