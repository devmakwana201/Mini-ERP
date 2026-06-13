import ReactDOM from "react-dom/client";
import { PrimeReactProvider } from "primereact/api";
import App from "./App";

import "i18n/config";

import "simplebar-react/dist/simplebar.min.css";

import "styles/index.css";

// Global dropdown auto-focus utility
import "utils/dropdownAutoFocus";

ReactDOM.createRoot(document.getElementById("root")).render(
  // <React.StrictMode>
  <PrimeReactProvider>
    <App />
  </PrimeReactProvider>,
  // </React.StrictMode>,
);
