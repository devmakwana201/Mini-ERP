import { dashboards } from "./dashboards";
import { erp } from "./erp";

// Role-based navigation — only ERP + Dashboards modules are active
export const getNavigation = (roleid, userOrFlags) => {
  return [dashboards, erp];
};

export { baseNavigation } from "./baseNavigation";
