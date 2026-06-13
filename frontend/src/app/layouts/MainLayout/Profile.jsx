// Import Dependencies
import axios from "axios";
const BASE_URL = import.meta.env.VITE_API_BASE_URL;
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react";
import {
  ArrowLeftStartOnRectangleIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { TbCoins, TbUser } from "react-icons/tb";
import { useState, useRef } from "react";

import { Link, useNavigate } from "react-router";

// Local Imports
import { Avatar, AvatarDot, Button } from "components/ui";
import { setSession } from "utils/jwt";
import { GHOST_ENTRY_PATH } from "constants/app.constant";
import { useAuthContext } from "app/contexts/auth/context";
import { Toast } from "primereact/toast";

// ----------------------------------------------------------------------

const links = [
  {
    id: "1",
    title: "Profile",
    description: "Your profile Setting",
    to: "/settings/general",
    Icon: TbUser,
    color: "warning",
  },
  // {
  //   id: "4",
  //   title: "Billing",
  //   description: "Your billing information",
  //   to: "/settings/billing",
  //   Icon: TbCoins,
  //   color: "error",
  // },
  // {
  //   id: "5",
  //   title: "Settings",
  //   description: "Webapp settings",
  //   to: "/settings/appearance",
  //   Icon: Cog6ToothIcon,
  //   color: "success",
  // },
];

export function Profile() {
  const navigate = useNavigate();
  const toast = useRef(null);
  const { logout, user } = useAuthContext(); // ✅ get logout from AuthContext
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      const token =
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("authToken");

      if (!token) {
        // No token available, just do local logout
        await logout();
        sessionStorage.setItem("logoutSuccess", "Logged Out Successfully");
        navigate(GHOST_ENTRY_PATH, { replace: true });
        return;
      }

      const response = await axios.get(`${BASE_URL}/auth/userLogout`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const { success, message, error } = response.data;

      if (success === 1) {
        // Successful logout from server
        await logout();

        // Store success message for the login page
        sessionStorage.setItem(
          "logoutSuccess",
          message || "Logged Out Successfully",
        );
      } else {
        // Handle API error response
        const errorMessage = error?.message || "Logout failed";

        toast.current?.show({
          severity: "error",
          summary: "Logout Failed",
          detail: errorMessage,
          life: 4000,
        });

        // Even if server logout fails, we should still clear local session
        // This handles cases like expired tokens
        if (error?.statusCode === 401) {
          await logout();
          sessionStorage.setItem(
            "logoutSuccess",
            "Session expired. Please login again.",
          );
          navigate(GHOST_ENTRY_PATH, { replace: true });
        }
      }
    } catch (err) {
      console.error("Logout error:", err);

      let errorMessage = "Logout failed. Please try again.";

      if (err.response) {
        // API responded with an error
        const { data } = err.response;

        if (data?.success === 0 && data?.error?.message) {
          errorMessage = data.error.message;

          // Handle token expiration or invalid token
          if (data.error.statusCode === 401) {
            await logout();
            sessionStorage.setItem(
              "logoutSuccess",
              "Session expired. Please login again.",
            );
            navigate(GHOST_ENTRY_PATH, { replace: true });
            return;
          }
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      // If it's a network error, still do local logout as fallback
      if (!err.response) {
        await logout();
        sessionStorage.setItem(
          "logoutSuccess",
          "Logged out locally due to network error",
        );
        navigate(GHOST_ENTRY_PATH, { replace: true });
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <Toast ref={toast} />
      <Popover className="relative">
        <PopoverButton
          as={Avatar}
          size={14}
          role="button"
          src="/images/appLogo.png"
          alt="Profile"
          indicator={<AvatarDot color="success" className="top-1 right-0" />}
          classNames={{
            root: "flex cursor-pointer items-center justify-center",
            image: "object-contain",
          }}
        />

        <Transition
          enter="duration-200 ease-out"
          enterFrom="translate-x-2 opacity-0"
          enterTo="translate-x-0 opacity-100"
          leave="duration-200 ease-out"
          leaveFrom="translate-x-0 opacity-100"
          leaveTo="translate-x-2 opacity-0"
        >
          <PopoverPanel
            anchor={{ to: "right end", gap: 12 }}
            className="border-gray-150 shadow-soft dark:border-dark-600 dark:bg-dark-700 z-70 flex w-64 flex-col rounded-lg border bg-white transition dark:shadow-none"
          >
            {({ close }) => (
              <>
                <div className="dark:bg-dark-800 flex items-center gap-4 rounded-t-lg bg-gray-100 px-4 py-5">
                  <Avatar
                    size={14}
                    src={user?.profilepic || "/images/100x100.png"}
                    alt="Profile"
                  />

                  <div>
                    <Link
                      className="hover:text-primary-600 focus:text-primary-600 dark:text-dark-100 dark:hover:text-primary-400 dark:focus:text-primary-400 text-base font-medium text-gray-700"
                      to="/settings/general"
                    >
                      {user?.firstname || "User"}
                    </Link>

                    <p className="dark:text-dark-300 mt-0.5 text-xs text-gray-400">
                      {user?.email || "-"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col pt-2 pb-5">
                  {links.map((link) => (
                    <Link
                      key={link.id}
                      to={link.to}
                      onClick={close}
                      className="group dark:hover:bg-dark-600 dark:focus:bg-dark-600 flex items-center gap-3 px-4 py-2 tracking-wide outline-hidden transition-all hover:bg-gray-100 focus:bg-gray-100"
                    >
                      <Avatar
                        size={8}
                        initialColor={link.color}
                        classNames={{ display: "rounded-lg" }}
                      >
                        <link.Icon className="size-4.5" />
                      </Avatar>
                      <div>
                        <h2 className="group-hover:text-primary-600 group-focus:text-primary-600 dark:text-dark-100 dark:group-hover:text-primary-400 dark:group-focus:text-primary-400 font-medium text-gray-800 transition-colors">
                          {link.title}
                        </h2>
                        <div className="dark:text-dark-300 truncate text-xs text-gray-400">
                          {link.description}
                        </div>
                      </div>
                    </Link>
                  ))}
                  <div className="px-4 pt-4">
                    <Button onClick={handleLogout} className="w-full gap-2">
                      <ArrowLeftStartOnRectangleIcon className="size-4.5" />
                      <span>Logout</span>
                    </Button>
                  </div>
                </div>
              </>
            )}
          </PopoverPanel>
        </Transition>
      </Popover>
    </>
  );
}
