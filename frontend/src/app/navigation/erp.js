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

export const erp = {
  id: "erp",
  type: NAV_TYPE_ROOT,
  path: "/erp-dashboard",
  title: "ERP",
  transKey: "nav.erp.erp",
  Icon: ErpIcon,
  childs: [
    {
      id: "erp.dashboard",
      type: NAV_TYPE_ITEM,
      path: "/erp-dashboard",
      title: "ERP Dashboard",
      transKey: "nav.erp.dashboard",
      Icon: DashboardIcon,
    },
    {
      id: "erp.partners",
      type: NAV_TYPE_ITEM,
      path: "/partners",
      title: "Partners",
      transKey: "nav.erp.partners",
      Icon: PartnerIcon,
    },
    {
      id: "erp.bom",
      type: NAV_TYPE_ITEM,
      path: "/bom",
      title: "Bill of Materials",
      transKey: "nav.erp.bom",
      Icon: ManufacturingIcon,
    },
    {
      id: "erp.products",
      type: NAV_TYPE_ITEM,
      path: "/products",
      title: "Products",
      transKey: "nav.erp.products",
      Icon: ProductIcon,
    },
    {
      id: "erp.sales-orders",
      type: NAV_TYPE_ITEM,
      path: "/sales-orders",
      title: "Sales Orders",
      transKey: "nav.erp.sales-orders",
      Icon: SalesIcon,
    },
    {
      id: "erp.purchase-orders",
      type: NAV_TYPE_ITEM,
      path: "/purchase-orders",
      title: "Purchase Orders",
      transKey: "nav.erp.purchase-orders",
      Icon: PurchaseIcon,
    },
    {
      id: "erp.manufacturing-orders",
      type: NAV_TYPE_ITEM,
      path: "/manufacturing-orders",
      title: "Manufacturing Orders",
      transKey: "nav.erp.manufacturing-orders",
      Icon: ManufacturingIcon,
    },
    {
      id: "erp.work-orders",
      type: NAV_TYPE_ITEM,
      path: "/work-orders",
      title: "Work Orders",
      transKey: "nav.erp.work-orders",
      Icon: WorkOrderIcon,
    },
    {
      id: "erp.inventory",
      type: NAV_TYPE_COLLAPSE,
      path: "/inventory",
      title: "Inventory",
      transKey: "nav.erp.inventory",
      Icon: InventoryIcon,
      childs: [
        {
          id: "erp.inventory.stock",
          type: NAV_TYPE_ITEM,
          path: "/inventory",
          title: "Stock Overview",
          transKey: "nav.erp.inventory.stock",
        },
        {
          id: "erp.inventory.transactions",
          type: NAV_TYPE_ITEM,
          path: "/inventory/transactions",
          title: "Transactions",
          transKey: "nav.erp.inventory.transactions",
        },
        {
          id: "erp.inventory.reservations",
          type: NAV_TYPE_ITEM,
          path: "/inventory/reservations",
          title: "Reservations",
          transKey: "nav.erp.inventory.reservations",
        },
        {
          id: "erp.inventory.warehouses",
          type: NAV_TYPE_ITEM,
          path: "/inventory/warehouses",
          title: "Warehouses",
          transKey: "nav.erp.inventory.warehouses",
        },
      ],
    },
    {
      id: "erp.procurement-rules",
      type: NAV_TYPE_ITEM,
      path: "/procurement-rules",
      title: "Procurement Rules",
      transKey: "nav.erp.procurement-rules",
      Icon: RuleIcon,
    },
    {
      id: "erp.audit-logs",
      type: NAV_TYPE_ITEM,
      path: "/audit-logs",
      title: "Audit Logs",
      transKey: "nav.erp.audit-logs",
      Icon: AuditIcon,
    },
  ],
};
