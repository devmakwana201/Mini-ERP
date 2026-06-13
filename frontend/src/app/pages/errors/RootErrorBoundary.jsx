// Import Depndencies
import { isRouteErrorResponse, useRouteError } from "react-router";
import { lazy } from "react";

// Local Imports
import { Loadable } from "components/shared/Loadable";
import Error500 from "assets/illustrations/error-500.svg?react";
import { useThemeContext } from "app/contexts/theme/context";
import { Button } from "primereact/button";

// ----------------------------------------------------------------------

const app = {
  401: lazy(() => import("./401")),
  404: lazy(() => import("./404")),
  429: lazy(() => import("./429")),
  500: lazy(() => import("./500")),
};

function RootErrorBoundary() {
  const error = useRouteError();
  const { primaryColorScheme: primary, isDark } = useThemeContext();

  if (isRouteErrorResponse(error)) {
    const Component = Loadable(app[error.status]);
    return <Component />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Error500
        className="w-full"
        style={{
          "--primary": isDark ? primary[500] : primary[600],
          "--primary-light": primary[300],
        }}
      />
      <h1 className="mb-2 text-3xl font-semibold">
        Oops! Something went wrong
      </h1>
      <p className="mb-6 text-gray-500">
        We couldn’t load this page. Please try again or contact support if the
        problem persists.
      </p>
      <Button onClick={() => window.location.reload()}>Reload Page</Button>
    </div>
  );
}

export default RootErrorBoundary;
