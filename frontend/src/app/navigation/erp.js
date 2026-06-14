// navigation/erp.js
// ERP module navigation — MASTER_PROMPT Section 6 modules
// Root path must be a common prefix for all child paths so
// isRouteActive() correctly identifies the active root segment.

import ErpIcon from "assets/dualicons/applications.svg?react";
import DashboardIcon from "assets/nav-icons/chart.svg?react";
import PartnerIcon from "assets/nav-icons/people.svg?react";
import ProductIcon from "assets/nav-icons/box-add.svg?react";
import SalesIcon from "assets/nav-icons/shopping-cart.svg?react";
import PurchaseIcon from "assets/nav-icons/doc.svg?react";
import ManufacturingIcon from "assets/nav-icons/project-board.svg?react";
import WorkOrderIcon from "assets/nav-icons/kanban.svg?react";
import InventoryIcon from "assets/nav-icons/table.svg?react";
import RuleIcon from "assets/nav-icons/check-double.svg?react";
import AuditIcon from "assets/nav-icons/timeline.svg?react";
import { NAV_TYPE_ROOT, NAV_TYPE_ITEM, NAV_TYPE_COLLAPSE } from "constants/app.constant";

// All ERP routes live under /erp/* — this is the common prefix
// that isRouteActive() uses to detect the active root segment.
const ROOT = "/erp";
const p = (sub) => `${ROOT}${sub}`;

export const erp = {
  id: "erp",
  type: NAV_TYPE_ROOT,
  path: ROOT,                    // ← common prefix for all children
  title: "ERP",
  transKey: "nav.erp.erp",
  Icon: ErpIcon,
  childs: [
    {
      id: "erp.dashboard",
      type: NAV_TYPE_ITEM,
      path: p("/dashboard"),
      title: "ERP Dashboard",
      transKey: "nav.erp.dashboard",
      Icon: DashboardIcon,
    },
    {
      id: "erp.partners",
      type: NAV_TYPE_ITEM,
      path: p("/partners"),
      title: "Partners",
      transKey: "nav.erp.partners",
      Icon: PartnerIcon,
    },
    {
      id: "erp.products",
      type: NAV_TYPE_ITEM,
      path: p("/products"),
      title: "Products",
      transKey: "nav.erp.products",
      Icon: ProductIcon,
    },
    {
      id: "erp.bom",
      type: NAV_TYPE_ITEM,
      path: p("/bom"),
      title: "Bill of Materials",
      transKey: "nav.erp.bom",
      Icon: ManufacturingIcon,
    },
    {
      id: "erp.sales-orders",
      type: NAV_TYPE_ITEM,
      path: p("/sales-orders"),
      title: "Sales Orders",
      transKey: "nav.erp.sales-orders",
      Icon: SalesIcon,
    },
    {
      id: "erp.purchase-orders",
      type: NAV_TYPE_ITEM,
      path: p("/purchase-orders"),
      title: "Purchase Orders",
      transKey: "nav.erp.purchase-orders",
      Icon: PurchaseIcon,
    },
    {
      id: "erp.manufacturing-orders",
      type: NAV_TYPE_ITEM,
      path: p("/manufacturing-orders"),
      title: "Manufacturing Orders",
      transKey: "nav.erp.manufacturing-orders",
      Icon: ManufacturingIcon,
    },
    {
      id: "erp.work-orders",
      type: NAV_TYPE_ITEM,
      path: p("/work-orders"),
      title: "Work Orders",
      transKey: "nav.erp.work-orders",
      Icon: WorkOrderIcon,
    },
    {
      id: "erp.inventory",
      type: NAV_TYPE_COLLAPSE,
      path: p("/inventory"),
      title: "Inventory",
      transKey: "nav.erp.inventory",
      Icon: InventoryIcon,
      childs: [
        {
          id: "erp.inventory.stock",
          type: NAV_TYPE_ITEM,
          path: p("/inventory"),
          title: "Stock Overview",
          transKey: "nav.erp.inventory.stock",
        },
        {
          id: "erp.inventory.transactions",
          type: NAV_TYPE_ITEM,
          path: p("/inventory/transactions"),
          title: "Transactions",
          transKey: "nav.erp.inventory.transactions",
        },
        {
          id: "erp.inventory.reservations",
          type: NAV_TYPE_ITEM,
          path: p("/inventory/reservations"),
          title: "Reservations",
          transKey: "nav.erp.inventory.reservations",
        },
        {
          id: "erp.inventory.warehouses",
          type: NAV_TYPE_ITEM,
          path: p("/inventory/warehouses"),
          title: "Warehouses",
          transKey: "nav.erp.inventory.warehouses",
        },
      ],
    },
    {
      id: "erp.procurement-rules",
      type: NAV_TYPE_ITEM,
      path: p("/procurement-rules"),
      title: "Procurement Rules",
      transKey: "nav.erp.procurement-rules",
      Icon: RuleIcon,
    },
    {
      id: "erp.audit-logs",
      type: NAV_TYPE_ITEM,
      path: p("/audit-logs"),
      title: "Audit Logs",
      transKey: "nav.erp.audit-logs",
      Icon: AuditIcon,
    },
  ],
};
