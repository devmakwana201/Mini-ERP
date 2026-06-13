// app/router/RouterWithAuth.jsx
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { useAuthContext } from "app/contexts/auth/context";
import Root from "app/layouts/Root";
import RootErrorBoundary from "app/pages/errors/RootErrorBoundary";
import { SplashScreen } from "components/template/SplashScreen";
import { ghostRoutes } from "./ghost";
import { publicRoutes } from "./public";
import { useProtectedRoutes } from "./protected";

const RouterWithAuth = () => {
  const { isInitialized } = useAuthContext();
  const protectedRoutes = useProtectedRoutes();

  // If not initialized, show the splash screen and do nothing else.
  // This prevents the router from even trying to match a route.
  if (!isInitialized) {
    return <SplashScreen />;
  }

  const router = createBrowserRouter([
    {
      id: "root",
      Component: Root,
      hydrateFallbackElement: <SplashScreen />,
      ErrorBoundary: RootErrorBoundary,
      children: [protectedRoutes, ghostRoutes, publicRoutes],
    },
  ]);

  return <RouterProvider router={router} />;
};

export default RouterWithAuth;
