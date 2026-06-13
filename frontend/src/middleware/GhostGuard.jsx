// Import Dependencies
import { useOutlet } from "react-router";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

// Local Imports
import { useAuthContext } from "app/contexts/auth/context";
import { HOME_PATH, REDIRECT_URL_KEY } from "constants/app.constant";

export default function GhostGuard() {
  const outlet = useOutlet();
  const { isAuthenticated } = useAuthContext();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const redirectUrl = searchParams.get(REDIRECT_URL_KEY);

  useEffect(() => {
    if (isAuthenticated) {
      const safeRedirect = redirectUrl && redirectUrl !== "null" ? redirectUrl : HOME_PATH;
      navigate(safeRedirect, { replace: true });
    }
  }, [isAuthenticated, redirectUrl, navigate]);

  if (isAuthenticated) {
    return null;
  }

  return <>{outlet}</>;
}
