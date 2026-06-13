// Import Dependencies
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router";

// Local Imports
import { useBreakpointsContext } from "app/contexts/breakpoint/context";
import { useSidebarContext } from "app/contexts/sidebar/context";
import { useDidUpdate } from "hooks";
import { isRouteActive } from "utils/isRouteActive";
import { MainPanel } from "./MainPanel";
import { PrimePanel } from "./PrimePanel";
import { getNavigation } from "app/navigation";
import { useAuthContext } from "app/contexts/auth/context";

// ----------------------------------------------------------------------

export function Sidebar() {
  const { pathname } = useLocation();
  const { name, lgAndDown } = useBreakpointsContext();
  const { isExpanded, close } = useSidebarContext();
  const { user } = useAuthContext();
  const roleid = user?.roleid;
  const navItems = useMemo(() => getNavigation(roleid, user), [roleid, user]);

  const mainPanelRef = useRef(null);
  const primePanelRef = useRef(null);
  const isExpandedRef = useRef(isExpanded);
  const lgAndDownRef = useRef(lgAndDown);

  const initialSegment = useMemo(
    () => navItems.find((item) => isRouteActive(item.path, pathname)),
    [navItems, pathname],
  );

  const [activeSegmentPath, setActiveSegmentPath] = useState(
    initialSegment?.path,
  );

  const currentSegment = useMemo(() => {
    return navItems.find((item) => item.path === activeSegmentPath);
  }, [navItems, activeSegmentPath]);

  useDidUpdate(() => {
    const activePath = navItems.find((item) =>
      isRouteActive(item.path, pathname),
    )?.path;

    if (!isRouteActive(activeSegmentPath, pathname)) {
      setActiveSegmentPath(activePath);
    }
  }, [pathname]);

  useDidUpdate(() => {
    if (lgAndDown && isExpanded) close();
  }, [name]);

  // Keep refs updated
  useEffect(() => {
    isExpandedRef.current = isExpanded;
  }, [isExpanded]);

  useEffect(() => {
    lgAndDownRef.current = lgAndDown;
  }, [lgAndDown]);

  // Handle click outside (ignore clicks in both panels)
  useEffect(() => {
    const handleClickOutside = (event) => {
      const panelEl = primePanelRef.current;
      const mainEl = mainPanelRef.current;
      const expanded = isExpandedRef.current;
      const mobile = lgAndDownRef.current;

      const target = event.target;

      const isInsidePrime = panelEl?.contains(target);
      const isInsideMain = mainEl?.contains(target);
      const isToggle = target.closest("#sidebar-toggle");

      if (!isInsidePrime && !isInsideMain && !isToggle && expanded && mobile) {
        close();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [close]);

  return (
    <>
      <div ref={mainPanelRef}>
        <MainPanel
          nav={navItems}
          activeSegment={activeSegmentPath}
          setActiveSegment={setActiveSegmentPath}
        />
      </div>
      <div ref={primePanelRef}>
        <PrimePanel
          close={close}
          currentSegment={currentSegment}
          pathname={pathname}
        />
      </div>
    </>
  );
}
