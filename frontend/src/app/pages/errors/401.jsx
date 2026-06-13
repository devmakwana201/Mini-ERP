// Local Imports
import Authorize from "assets/illustrations/authorize.svg?react";
import { Page } from "components/shared/Page";
import { useThemeContext } from "app/contexts/theme/context";
import { Link } from "react-router";
import { Button } from "components/ui";
import { useHover } from "hooks";
// ----------------------------------------------------------------------

export default function Error401() {
  const [btnRef, btnHovered] = useHover();
  const {
    primaryColorScheme: primary,
    lightColorScheme: light,
    darkColorScheme: dark,
    isDark,
  } = useThemeContext();

  return (
    <Page title="Error 401">
      <main className="min-h-100vh relative grid w-full grow grid-cols-1 place-items-center p-4">
        <div className="w-full max-w-[26rem] text-center">
          <Authorize
            className="w-full"
            style={{
              "--primary": primary[500],
              "--dark-500": isDark ? dark[500] : light[700],
            }}
          />
          <p className="text-primary-600 dark:text-primary-500 pt-4 text-7xl font-bold">
            401
          </p>
          <p className="dark:text-dark-50 pt-4 text-xl font-semibold text-gray-800">
            You are not authorized
          </p>
          <p className="dark:text-dark-200 pt-2 text-balance text-gray-500">
            You are missing the required rights to be able to access this page
          </p>
          <div className="mt-8">
            <Button
              component={Link}
              to="/"
              ref={btnRef}
              isGlow={btnHovered}
              color="primary"
              className="h-11 text-base"
            >
              Back To Home
            </Button>
          </div>
        </div>
      </main>
    </Page>
  );
}
