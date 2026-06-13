// Import Dependencies
import { Suspense, useRef } from "react";
import { Toast } from "primereact/toast";
import clsx from "clsx";
import { Outlet } from "react-router";

// Local Imports
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

// ----------------------------------------------------------------------

export default function MainLayout() {
  const toast = useRef(null);

  // useEffect(() => {
  //   const loginMessage = sessionStorage.getItem("loginSuccess");
  //   if (loginMessage) {
  //     toast.current?.show({
  //       severity: "success",
  //       summary: "Welcome",
  //       detail: loginMessage,
  //       life: 3000,
  //     });

  //     sessionStorage.removeItem("loginSuccess"); // Show only once
  //   }
  // }, []);

  return (
    <>
      <Toast ref={toast} />
      <Header />
      <main
        className={clsx("main-content transition-content grid grid-cols-1")}
      >
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
