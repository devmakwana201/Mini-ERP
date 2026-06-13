const publicRoutes = {
  id: "public",
  children: [
    {
      path: "privacy-notice",
      lazy: async () => ({
        Component: (await import("app/pages/PrivacyNotice")).default,
      }),
    },
    {
      path: "terms-of-service",
      lazy: async () => ({
        Component: (await import("app/pages/TermsOfService")).default,
      }),
    },
    {
      path: "ebill/:id",
      lazy: async () => ({
        Component: (
          await import("app/pages/reports/sales-reports/sales-receipt/EBill")
        ).default,
      }),
    },
    {
      path: "ebill/seeds/:id",
      lazy: async () => ({
        Component: (
          await import("app/pages/reports/sales-reports/sales-receipt/Seeds")
        ).default,
      }),
    },
    {
      path: "ebill/fertilizers/:id",
      lazy: async () => ({
        Component: (
          await import("app/pages/reports/sales-reports/sales-receipt/Fertilizers")
        ).default,
      }),
    },
    {
      path: "ebill/pesticides/:id",
      lazy: async () => ({
        Component: (
          await import("app/pages/reports/sales-reports/sales-receipt/Pesticides")
        ).default,
      }),
    },
  ],
};

export { publicRoutes };
