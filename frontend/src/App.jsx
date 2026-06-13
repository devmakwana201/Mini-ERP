// Import Dependencies
import { RouterProvider } from "react-router";
import { Provider } from "react-redux";
import { reduxstore, persistor } from "./redux/Store";
import { PersistGate } from "redux-persist/integration/react";
import { Toaster } from "sonner";

// Local Imports
import { AuthProvider } from "app/contexts/auth/Provider";
import { BreakpointProvider } from "app/contexts/breakpoint/Provider";
import { LocaleProvider } from "app/contexts/locale/Provider";
import { SidebarProvider } from "app/contexts/sidebar/Provider";
import { ThemeProvider } from "app/contexts/theme/Provider";
// import router from "app/router/router";
import RouterWithAuth from "app/router/routerwithauth";
import OfflineDetector from "components/shared/OfflineDetector";
import SlowNetworkWarning from "components/shared/SlowNetworkWarning";

// ----------------------------------------------------------------------

function App() {
  return (
    <Provider store={reduxstore}>
      <PersistGate loading={null} persistor={persistor}>
        <AuthProvider>
          <ThemeProvider>
            <LocaleProvider>
              <BreakpointProvider>
                <SidebarProvider>
                  <OfflineDetector>
                    <SlowNetworkWarning>
                      <RouterWithAuth />
                    </SlowNetworkWarning>
                  </OfflineDetector>
                  <Toaster position="top-right" />
                </SidebarProvider>
              </BreakpointProvider>
            </LocaleProvider>
          </ThemeProvider>
        </AuthProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;
