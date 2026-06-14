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
} from "@heroicons/react/24/outline";
import {
  TbUser,
  TbShieldCheck,
  TbId,
  TbCircleDot,
} from "react-icons/tb";
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
    description: "Your profile setting",
    to: "/settings/general",
    Icon: TbUser,
    color: "warning",
  },
];

function StatusBadge({ status }) {
  const isActive = status === "active" || !status;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        isActive
          ? "bg-success/10 text-success dark:bg-success/20"
          : "bg-gray-200 text-gray-500 dark:bg-dark-500 dark:text-dark-300"
      }`}
    >
      <TbCircleDot className="size-2.5" />
      {isActive ? "Active" : status || "Inactive"}
    </span>
  );
}

export function Profile() {
  const navigate = useNavigate();
  const toast = useRef(null);
  const { logout, user } = useAuthContext();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Derive display values from user object
  const displayName =
    user?.name || user?.firstname
      ? `${user?.firstname || ""} ${user?.lastname || ""}`.trim() ||
        user?.name
      : user?.username || "User";

  const roleLabel = user?.role_id
    ? `Role #${user.role_id}`
    : user?.rolename || null;

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      const token =
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("authToken");

      if (!token) {
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
        await logout();
        sessionStorage.setItem(
          "logoutSuccess",
          message || "Logged Out Successfully",
        );
      } else {
        const errorMessage = error?.message || "Logout failed";

        toast.current?.show({
          severity: "error",
          summary: "Logout Failed",
          detail: errorMessage,
          life: 4000,
        });

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
        const { data } = err.response;

        if (data?.success === 0 && data?.error?.message) {
          errorMessage = data.error.message;

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
            className="border-gray-150 shadow-soft dark:border-dark-600 dark:bg-dark-700 z-70 flex w-72 flex-col rounded-xl border bg-white transition dark:shadow-none"
          >
            {({ close }) => (
              <>
                {/* Header / Avatar section */}
                <div className="dark:bg-dark-800 rounded-t-xl bg-gradient-to-br from-primary-50 to-primary-100/40 px-4 py-5 dark:from-dark-800 dark:to-dark-700">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <Avatar
                        size={14}
                        src={user?.profilepic || "/images/100x100.png"}
                        alt="Profile"
                        classNames={{ root: "ring-2 ring-white dark:ring-dark-600 shadow-md" }}
                      />
                      <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-white bg-success dark:border-dark-800" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <Link
                        className="hover:text-primary-600 focus:text-primary-600 dark:text-dark-100 dark:hover:text-primary-400 dark:focus:text-primary-400 block truncate text-sm font-semibold text-gray-800 transition-colors"
                        to="/settings/general"
                        onClick={close}
                      >
                        {displayName}
                      </Link>
                      <p className="dark:text-dark-300 mt-0.5 truncate text-xs text-gray-500">
                        {user?.email || "—"}
                      </p>
                      <div className="mt-1.5">
                        <StatusBadge status={user?.status} />
                      </div>
                    </div>
                  </div>

                  {/* Quick info chips */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {user?.user_id && (
                      <span className="dark:bg-dark-600 dark:text-dark-200 inline-flex items-center gap-1 rounded-md bg-white/70 px-2 py-1 text-[10px] font-medium text-gray-600 shadow-xs backdrop-blur-sm">
                        <TbId className="size-3 text-primary-500" />
                        ID: {user.user_id}
                      </span>
                    )}
                    {(user?.role_id || user?.rolename) && (
                      <span className="dark:bg-dark-600 dark:text-dark-200 inline-flex items-center gap-1 rounded-md bg-white/70 px-2 py-1 text-[10px] font-medium text-gray-600 shadow-xs backdrop-blur-sm">
                        <TbShieldCheck className="size-3 text-warning-500" />
                        {user?.rolename || `Role #${user.role_id}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Navigation links */}
                <div className="flex flex-col py-2">
                  {links.map((link) => (
                    <Link
                      key={link.id}
                      to={link.to}
                      onClick={close}
                      className="group dark:hover:bg-dark-600 dark:focus:bg-dark-600 flex items-center gap-3 px-4 py-2 tracking-wide outline-hidden transition-all hover:bg-gray-50 focus:bg-gray-50"
                    >
                      <Avatar
                        size={8}
                        initialColor={link.color}
                        classNames={{ display: "rounded-lg" }}
                      >
                        <link.Icon className="size-4.5" />
                      </Avatar>
                      <div>
                        <h2 className="group-hover:text-primary-600 group-focus:text-primary-600 dark:text-dark-100 dark:group-hover:text-primary-400 dark:group-focus:text-primary-400 text-sm font-medium text-gray-800 transition-colors">
                          {link.title}
                        </h2>
                        <div className="dark:text-dark-300 truncate text-xs text-gray-400">
                          {link.description}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Divider */}
                <div className="dark:bg-dark-600 mx-4 h-px bg-gray-100" />

                {/* Logout */}
                <div className="px-4 py-3">
                  <Button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full gap-2"
                  >
                    <ArrowLeftStartOnRectangleIcon className="size-4.5" />
                    <span>{isLoggingOut ? "Logging out…" : "Logout"}</span>
                  </Button>
                </div>
              </>
            )}
          </PopoverPanel>
        </Transition>
      </Popover>
    </>
  );
}
