// Import Dependencies
import { PhoneIcon, XMarkIcon } from "@heroicons/react/20/solid";
import {
  EnvelopeIcon,
  UserIcon,
  IdentificationIcon,
  ShieldCheckIcon,
  CheckBadgeIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { useState, useRef } from "react";
import { HiPencil } from "react-icons/hi";
import {
  TbId,
  TbShieldCheck,
  TbUser,
  TbMail,
  TbCircleDot,
  TbAt,
} from "react-icons/tb";

// Local Imports
import { PreviewImg } from "components/shared/PreviewImg";
import { Avatar, Button, Input, Upload } from "components/ui";
import { useAuthContext } from "app/contexts/auth/context";
import { UserService } from "services/master-records/users";
import { Toast } from "primereact/toast";
import { useNavigate } from "react-router";

// ----------------------------------------------------------------------

function InfoChip({ icon: Icon, label, value, color = "primary" }) {
  const colorMap = {
    primary: "text-primary-600 bg-primary-50 dark:bg-primary-900/30 dark:text-primary-400",
    success: "text-success bg-success/10 dark:bg-success/20",
    warning: "text-warning-600 bg-warning-50 dark:bg-warning-900/30 dark:text-warning-400",
    gray: "text-gray-500 bg-gray-100 dark:bg-dark-600 dark:text-dark-300",
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-dark-600 dark:bg-dark-600/50">
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${colorMap[color]}`}>
        <Icon className="size-4.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-dark-400">
          {label}
        </p>
        <p className="truncate text-sm font-semibold text-gray-700 dark:text-dark-100">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const isActive = status === "active" || !status;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        isActive
          ? "bg-success/10 text-success dark:bg-success/20"
          : "bg-gray-100 text-gray-500 dark:bg-dark-600 dark:text-dark-300"
      }`}
    >
      <TbCircleDot className="size-3" />
      {isActive ? "Active" : status || "Inactive"}
    </span>
  );
}

export default function General() {
  const [avatar, setAvatar] = useState(null);
  const { user } = useAuthContext();
  const toast = useRef(null);
  const navigate = useNavigate();

  // Resolve display name from various possible user fields
  const displayName =
    user?.name ||
    (user?.firstname ? `${user.firstname} ${user?.lastname || ""}`.trim() : null) ||
    user?.username ||
    "User";

  const [formData, setFormData] = useState({
    userName: user?.username || user?.name || "",
    firstName: user?.firstname || "",
    lastName: user?.lastname || "",
    email: user?.email || "",
  });

  const [formErrors, setFormErrors] = useState({});

  const id = user?.user_id || user?.userid;

  const validateForm = () => {
    const errors = {};
    if (!formData.userName.trim()) errors.userName = "Username is required.";
    if (!formData.firstName.trim())
      errors.firstName = "First name is required.";
    if (!formData.email.trim()) {
      errors.email = "Email is required.";
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      errors.email = "Invalid email format.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const updateProfile = async () => {
    if (!validateForm()) return;
    try {
      const payload = {
        username: formData.userName,
        firstname: formData.firstName,
        lastname: formData.lastName,
        email: formData.email,
      };
      if (id) {
        payload.userid = id;
      }
      const response = await UserService.saveUser(payload);
      if (response.success === 1) {
        toast.current.show({
          severity: "success",
          summary: "Success",
          detail: response.msg || "Profile updated successfully",
          life: 3000,
        });
      } else {
        toast.current.show({
          severity: "error",
          summary: "Error",
          detail: response.msg || "Error updating profile",
          life: 3000,
        });
      }
    } catch (error) {
      console.error("Error saving user:", error);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "An error occurred while saving the profile.",
        life: 3000,
      });
    }
  };

  return (
    <div className="w-full max-w-3xl 2xl:max-w-5xl">
      <Toast ref={toast} />

      {/* Page Header */}
      <div>
        <h5 className="dark:text-dark-50 text-lg font-semibold text-gray-800">
          General Settings
        </h5>
        <p className="dark:text-dark-200 mt-0.5 text-sm text-gray-500">
          Manage your personal information and account preferences.
        </p>
      </div>

      <div className="dark:bg-dark-500 my-5 h-px bg-gray-200" />

      {/* Profile Card */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-gray-100 dark:border-dark-600">
        {/* Cover / gradient banner */}
        <div className="h-24 bg-gradient-to-r from-primary-500 via-primary-400 to-primary-600 dark:from-primary-700 dark:to-primary-500" />

        {/* Avatar + identity row */}
        <div className="relative px-6 pb-5">
          {/* Avatar — overlapping the banner */}
          <div className="relative -mt-10 mb-3 inline-flex">
            <Avatar
              size={20}
              imgComponent={PreviewImg}
              imgProps={{ file: avatar }}
              src={avatar ? null : user?.profilepic || "/images/100x100.png"}
              classNames={{
                root: "ring-primary-600 dark:ring-primary-500 dark:ring-offset-dark-700 rounded-xl ring-4 ring-offset-[3px] ring-offset-white dark:ring-offset-dark-700 shadow-lg transition-all hover:ring-4",
                display: "rounded-xl",
              }}
              indicator={
                <div className="dark:bg-dark-700 absolute right-0 bottom-0 -m-1 flex items-center justify-center rounded-full bg-white shadow">
                  {avatar ? (
                    <Button
                      onClick={() => setAvatar(null)}
                      isIcon
                      className="size-6 rounded-full"
                    >
                      <XMarkIcon className="size-4" />
                    </Button>
                  ) : (
                    <Upload name="avatar" onChange={setAvatar} accept="image/*">
                      {({ ...props }) => (
                        <Button isIcon className="size-6 rounded-full" {...props}>
                          <HiPencil className="size-3.5" />
                        </Button>
                      )}
                    </Upload>
                  )}
                </div>
              }
            />
          </div>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="dark:text-dark-50 text-xl font-bold text-gray-800">
                {displayName}
              </h3>
              <p className="dark:text-dark-300 mt-0.5 text-sm text-gray-500">
                {user?.email || "—"}
              </p>
              <div className="mt-2">
                <StatusBadge status={user?.status} />
              </div>
            </div>

            {/* Quick badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {id && (
                <span className="dark:bg-dark-600 dark:text-dark-200 inline-flex items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 dark:border-dark-500">
                  <TbId className="size-3.5 text-primary-500" />
                  User ID: {id}
                </span>
              )}
              {(user?.role_id || user?.rolename) && (
                <span className="dark:bg-dark-600 dark:text-dark-200 inline-flex items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 dark:border-dark-500">
                  <TbShieldCheck className="size-3.5 text-warning-500" />
                  {user?.rolename || `Role #${user.role_id}`}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info chips row */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <InfoChip
          icon={TbMail}
          label="Email Address"
          value={user?.email}
          color="primary"
        />
        <InfoChip
          icon={TbAt}
          label="Username / Name"
          value={user?.name || user?.username}
          color="warning"
        />
        <InfoChip
          icon={TbCircleDot}
          label="Account Status"
          value={
            user?.status
              ? user.status.charAt(0).toUpperCase() + user.status.slice(1)
              : "Active"
          }
          color={user?.status === "active" || !user?.status ? "success" : "gray"}
        />
      </div>

      {/* Divider */}
      <div className="dark:bg-dark-500 mb-5 h-px bg-gray-200" />

      {/* Edit form */}
      <div>
        <h6 className="dark:text-dark-100 mb-4 text-sm font-semibold text-gray-700">
          Edit Profile Information
        </h6>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 [&_.prefix]:pointer-events-none">
          <Input
            placeholder="Enter Username"
            label="Username"
            className="rounded-xl"
            prefix={<TbUser className="size-4.5" />}
            value={formData.userName}
            onChange={(e) => {
              setFormData({ ...formData, userName: e.target.value });
              setFormErrors((prev) => ({ ...prev, userName: null }));
            }}
            error={formErrors.userName}
          />
          <Input
            placeholder="Enter First Name"
            label="First Name"
            className="rounded-xl"
            prefix={<UserIcon className="size-4.5" />}
            value={formData.firstName}
            onChange={(e) => {
              setFormData({ ...formData, firstName: e.target.value });
              setFormErrors((prev) => ({ ...prev, firstName: null }));
            }}
            error={formErrors.firstName}
          />
          <Input
            placeholder="Enter Last Name"
            label="Last Name"
            className="rounded-xl"
            prefix={<UserIcon className="size-4.5" />}
            value={formData.lastName}
            onChange={(e) => {
              setFormData({ ...formData, lastName: e.target.value });
              setFormErrors((prev) => ({ ...prev, lastName: null }));
            }}
            error={formErrors.lastName}
          />
          <Input
            placeholder="Enter Email"
            label="Email Address"
            className="rounded-xl"
            prefix={<EnvelopeIcon className="size-4.5" />}
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              setFormErrors((prev) => ({ ...prev, email: null }));
            }}
            error={formErrors.email}
          />
        </div>
      </div>

      <div className="dark:bg-dark-500 my-7 h-px bg-gray-200" />

      {/* Action buttons */}
      <div className="flex justify-end space-x-3">
        <Button
          onClick={() => navigate("/dashboards/home")}
          className="min-w-[7rem]"
        >
          Cancel
        </Button>
        <Button
          onClick={updateProfile}
          className="min-w-[7rem]"
          color="primary"
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}
