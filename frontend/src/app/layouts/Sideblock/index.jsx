// Import Dependencies
import { Suspense } from "react";
import { Outlet } from "react-router";

// Local Imports
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

// ----------------------------------------------------------------------

export default function Sideblock() {
  return (
    <>
      <Header />
      <main className="main-content transition-content grid grid-cols-1">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center p-8" />
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <Sidebar />
    </>
  );
}
