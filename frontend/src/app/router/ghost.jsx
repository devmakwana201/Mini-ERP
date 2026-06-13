import GhostGuard from "middleware/GhostGuard";

const ghostRoutes = {
  id: "ghost",
  Component: GhostGuard,
  children: [
    {
      path: "login",
      lazy: async () => ({
        Component: (await import("app/pages/Auth")).default,
      }),
    },
    {
      path: "sign-up",
      lazy: async () => ({
        Component: (await import("app/pages/Auth/SignUp")).default,
      }),
    },
    {
      path: "forgot-password",
      lazy: async () => ({
        Component: (await import("app/pages/Auth/ForgotPassword")).default,
      }),
    },
  ],
};

export { ghostRoutes };
