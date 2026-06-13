// Import Dependencies
import { PhoneIcon, XMarkIcon } from "@heroicons/react/20/solid";
import { EnvelopeIcon, UserIcon } from "@heroicons/react/24/outline";
import { useState, useRef } from "react";
import { HiPencil } from "react-icons/hi";

// Local Imports
import { PreviewImg } from "components/shared/PreviewImg";
import { Avatar, Button, Input, Upload } from "components/ui";
import { useAuthContext } from "app/contexts/auth/context";
import { UserService } from "services/master-records/users";
import { Toast } from "primereact/toast";
import { useNavigate } from "react-router";

// ----------------------------------------------------------------------

export default function General() {
  const [avatar, setAvatar] = useState(null);
  const { user } = useAuthContext();
  const toast = useRef(null);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    userName: user?.username || "",
    firstName: user?.firstname || "",
    lastName: user?.lastname || "",
    email: user?.email || "",
  });

  const [formErrors, setFormErrors] = useState({});

  const id = user?.userid;

  const validateForm = () => {
    const errors = {};
    if (!formData.userName.trim()) errors.userName = "Username is required.";
    if (!formData.firstName.trim())
      errors.firstName = "First name is required.";
    if (!formData.lastName.trim()) errors.lastName = "Last name is required.";
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
          detail: response.msg || "User Updated successfully",
          life: 3000,
        });
      } else {
        alert(response.msg || "Error updating user");
      }
    } catch (error) {
      console.error("Error saving user:", error);
      alert("An error occurred while saving the user.");
    }
  };

  return (
    <div className="w-full max-w-3xl 2xl:max-w-5xl">
      <Toast ref={toast} />
      <h5 className="dark:text-dark-50 text-lg font-medium text-gray-800">
        General
      </h5>
      <p className="dark:text-dark-200 mt-0.5 text-sm text-balance text-gray-500">
        Update your account settings.
      </p>
      <div className="dark:bg-dark-500 my-5 h-px bg-gray-200" />
      <div className="mt-4 flex flex-col space-y-1.5">
        <span className="dark:text-dark-100 text-base font-medium text-gray-800">
          Avatar
        </span>
        <Avatar
          size={20}
          imgComponent={PreviewImg}
          imgProps={{ file: avatar }}
          src={avatar ? null : user?.profilepic || "/images/100x100.png"}
          classNames={{
            root: "ring-primary-600 dark:ring-primary-500 dark:ring-offset-dark-700 rounded-xl ring-offset-[3px] ring-offset-white transition-all hover:ring-3",
            display: "rounded-xl",
          }}
          indicator={
            <div className="dark:bg-dark-700 absolute right-0 bottom-0 -m-1 flex items-center justify-center rounded-full bg-white">
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
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 [&_.prefix]:pointer-events-none">
        <Input
          placeholder="Enter Username"
          label="User name"
          className="rounded-xl"
          prefix={<UserIcon className="size-4.5" />}
          value={formData.userName}
          onChange={(e) => {
            setFormData({ ...formData, userName: e.target.value });
            setFormErrors((prev) => ({ ...prev, userName: null }));
          }}
          error={formErrors.userName}
        />
        <Input
          placeholder="Enter First Name"
          label="First name"
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
          label="Last name"
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
          label="Email"
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
      <div className="dark:bg-dark-500 my-7 h-px bg-gray-200" />
      <div className="mt-8 flex justify-end space-x-3">
        <Button
          onClick={() => navigate("/dashboards/home")}
          className="min-w-[7rem]"
        >
          Cancel
        </Button>
        <Button
          // onClick={updateProfile}
          className="min-w-[7rem]"
          color="primary"
        >
          Save
        </Button>
      </div>
    </div>
  );
}
