// router/useProtectedRoutes.js
import { Navigate } from "react-router";
import { useAuthContext } from "app/contexts/auth/context";
import AuthGuard from "middleware/AuthGuard";
import { AppLayout } from "app/layouts/AppLayout";
import { DynamicLayout } from "app/layouts/DynamicLayout";

export const useProtectedRoutes = () => {
  const { user } = useAuthContext();
  const roleid = user?.roleid;

  return {
    id: "protected",
    Component: AuthGuard,
    children: [
      {
        Component: DynamicLayout,
        children: [
          {
            index: true,
            element: <Navigate to="/dashboards/home" />,
          },
          // ─── Dashboards ───────────────────────────────────────────────
          {
            path: "dashboards",
            children: [
              {
                index: true,
                element: <Navigate to="/dashboards/home" />,
              },
              {
                path: "home",
                lazy: async () => ({
                  Component: (await import("app/pages/dashboards/home"))
                    .default,
                }),
              },
              {
                path: "sales-dashboard",
                lazy: async () => ({
                  Component: (
                    await import("app/pages/dashboards/salesDashboard")
                  ).default,
                }),
              },
              {
                path: "purchase-dashboard",
                lazy: async () => ({
                  Component: (
                    await import("app/pages/dashboards/purchaseDashboard")
                  ).default,
                }),
              },
            ],
          },

          // ─── ERP Module ───────────────────────────────────────────────
          // All ERP routes nested under /erp so nav paths (/erp/partners etc.)
          // match correctly and PrimePanel always shows children.
          {
            path: "erp",
            children: [
              // ERP Dashboard
              {
                path: "dashboard",
                lazy: async () => ({ Component: (await import("app/pages/erp/dashboard/Dashboard")).default }),
              },

              // Partners
              {
                path: "partners",
                children: [
                  { index: true, lazy: async () => ({ Component: (await import("app/pages/erp/partners/PartnerList")).default }) },
                  { path: "new",      lazy: async () => ({ Component: (await import("app/pages/erp/partners/PartnerForm")).default }) },
                  { path: ":id",      lazy: async () => ({ Component: (await import("app/pages/erp/partners/PartnerDetail")).default }) },
                  { path: ":id/edit", lazy: async () => ({ Component: (await import("app/pages/erp/partners/PartnerForm")).default }) },
                ],
              },

              // Products
              {
                path: "products",
                children: [
                  { index: true, lazy: async () => ({ Component: (await import("app/pages/erp/products/ProductList")).default }) },
                  { path: "new",      lazy: async () => ({ Component: (await import("app/pages/erp/products/ProductForm")).default }) },
                  { path: ":id",      lazy: async () => ({ Component: (await import("app/pages/erp/products/ProductDetail")).default }) },
                  { path: ":id/edit", lazy: async () => ({ Component: (await import("app/pages/erp/products/ProductForm")).default }) },
                ],
              },

              // Bill of Materials
              {
                path: "bom",
                children: [
                  { index: true, lazy: async () => ({ Component: (await import("app/pages/erp/bom/BomList")).default }) },
                  { path: "new",      lazy: async () => ({ Component: (await import("app/pages/erp/bom/BomForm")).default }) },
                  { path: ":id",      lazy: async () => ({ Component: (await import("app/pages/erp/bom/BomDetail")).default }) },
                  { path: ":id/edit", lazy: async () => ({ Component: (await import("app/pages/erp/bom/BomForm")).default }) },
                ],
              },

              // Sales Orders
              {
                path: "sales-orders",
                children: [
                  { index: true, lazy: async () => ({ Component: (await import("app/pages/erp/sales-orders/SoList")).default }) },
                  { path: "new",      lazy: async () => ({ Component: (await import("app/pages/erp/sales-orders/SoForm")).default }) },
                  { path: ":id",      lazy: async () => ({ Component: (await import("app/pages/erp/sales-orders/SoDetail")).default }) },
                  { path: ":id/edit", lazy: async () => ({ Component: (await import("app/pages/erp/sales-orders/SoForm")).default }) },
                ],
              },

              // Purchase Orders
              {
                path: "purchase-orders",
                children: [
                  { index: true, lazy: async () => ({ Component: (await import("app/pages/erp/purchase-orders/PoList")).default }) },
                  { path: "new",      lazy: async () => ({ Component: (await import("app/pages/erp/purchase-orders/PoForm")).default }) },
                  { path: ":id",      lazy: async () => ({ Component: (await import("app/pages/erp/purchase-orders/PoDetail")).default }) },
                  { path: ":id/edit", lazy: async () => ({ Component: (await import("app/pages/erp/purchase-orders/PoForm")).default }) },
                ],
              },

              // Manufacturing Orders
              {
                path: "manufacturing-orders",
                children: [
                  { index: true, lazy: async () => ({ Component: (await import("app/pages/erp/manufacturing-orders/MoList")).default }) },
                  { path: "new",      lazy: async () => ({ Component: (await import("app/pages/erp/manufacturing-orders/MoForm")).default }) },
                  { path: ":id",      lazy: async () => ({ Component: (await import("app/pages/erp/manufacturing-orders/MoDetail")).default }) },
                  { path: ":id/edit", lazy: async () => ({ Component: (await import("app/pages/erp/manufacturing-orders/MoForm")).default }) },
                ],
              },

              // Work Orders
              {
                path: "work-orders",
                children: [
                  { index: true, lazy: async () => ({ Component: (await import("app/pages/erp/work-orders/WorkOrderList")).default }) },
                  { path: ":id",      lazy: async () => ({ Component: (await import("app/pages/erp/work-orders/WorkOrderDetail")).default }) },
                ],
              },

              // Inventory
              {
                path: "inventory",
                children: [
                  { index: true,                lazy: async () => ({ Component: (await import("app/pages/erp/inventory/StockOverview")).default }) },
                  { path: "transactions",        lazy: async () => ({ Component: (await import("app/pages/erp/inventory/TransactionList")).default }) },
                  { path: "ledger/:productId",   lazy: async () => ({ Component: (await import("app/pages/erp/inventory/LedgerView")).default }) },
                  { path: "reservations",        lazy: async () => ({ Component: (await import("app/pages/erp/inventory/ReservationList")).default }) },
                  { path: "warehouses",          lazy: async () => ({ Component: (await import("app/pages/erp/inventory/WarehouseList")).default }) },
                ],
              },

              // Procurement Rules
              {
                path: "procurement-rules",
                children: [
                  { index: true,     lazy: async () => ({ Component: (await import("app/pages/erp/procurement-rules/ProcurementRuleList")).default }) },
                  { path: "new",     lazy: async () => ({ Component: (await import("app/pages/erp/procurement-rules/ProcurementRuleForm")).default }) },
                  { path: ":id/edit",lazy: async () => ({ Component: (await import("app/pages/erp/procurement-rules/ProcurementRuleForm")).default }) },
                ],
              },

              // Audit Logs
              {
                path: "audit-logs",
                lazy: async () => ({ Component: (await import("app/pages/erp/audit-logs/AuditLogList")).default }),
              },

              // Work Centers (admin-only, not in sidebar nav directly)
              {
                path: "work-centers",
                lazy: async () => ({ Component: (await import("app/pages/erp/work-centers/WorkCenterList")).default }),
              },
            ],
          },

          // ─── Settings (full-page layout) ──────────────────────────────────
          {
            Component: AppLayout,
            children: [
              {
                path: "settings",
                lazy: async () => ({
                  Component: (await import("app/pages/settings/Layout")).default,
                }),
                children: [
                  {
                    index: true,
                    element: <Navigate to="/settings/general" />,
                  },
                  {
                    path: "general",
                    lazy: async () => ({
                      Component: (
                        await import("app/pages/settings/sections/General")
                      ).default,
                    }),
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
};
