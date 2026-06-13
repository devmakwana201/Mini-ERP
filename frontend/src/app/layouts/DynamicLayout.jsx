// Import Dependencies
import { lazy, useMemo } from "react";

// Local Imports
import { useThemeContext } from "app/contexts/theme/context";
import { Loadable } from "components/shared/Loadable";

// ----------------------------------------------------------------------

const themeLayouts = {
  "main-layout": lazy(() => import("./MainLayout")),
  sideblock: lazy(() => import("./Sideblock")),
};

// Lightweight fallback - transparent to avoid flash during route transitions
const LayoutFallback = () => (
  <div className="flex h-screen items-center justify-center bg-transparent" />
);

export function DynamicLayout() {
  const { themeLayout } = useThemeContext();

  const CurrentLayout = useMemo(
    () => Loadable(themeLayouts[themeLayout], LayoutFallback),
    [themeLayout],
  );

  return <CurrentLayout />;
}
