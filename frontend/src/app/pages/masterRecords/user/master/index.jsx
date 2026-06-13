import { Page } from "components/shared/Page";
import { useState, useRef, useEffect } from "react";
import { Toast } from "primereact/toast";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { useNavigate } from "react-router";
// import { FileUpload } from "primereact/fileupload";
import { UserService } from "services/master-records/users";
import { useParams } from "react-router-dom";
import { Skeleton } from "primereact/skeleton";

export default function UserRegister() {
  const toast = useRef(null);
  const navigate = useNavigate();
  const { id } = useParams();

  const [formLoading, setFormLoading] = useState(false);

  // Form data state
  const [formData, setFormData] = useState({
    username: "",
    firstname: "",
    lastname: "",
    email: "",
    password: "",
    // profilepic: "",
    // importedfromsap: false,
  });

  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // const [profilePicFile, setProfilePicFile] = useState(null);
  // const [profilePicPreview, setProfilePicPreview] = useState(null);
  // const [imageError, setImageError] = useState(null);

  const validateForm = () => {
    const errors = {};

    if (!formData.username?.trim()) errors.username = "Username is required";
    if (!formData.firstname?.trim())
      errors.firstname = "First name is required";
    if (!formData.lastname?.trim()) errors.lastname = "Last name is required";

    if (!formData.email?.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Invalid email format";
    }

    if (!id && !formData.password?.trim()) {
      errors.password = "Password is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setFormErrors((prev) => ({
      ...prev,
      [field]: null,
    }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
  };

  useEffect(() => {
    if (!id) return;
    setFormLoading(true);

    const fetchUserData = async () => {
      try {
        const response = await UserService.getUserById(id);

        if (response.success) {
          const UserDataById = response.data;
          setFormData({
            username: UserDataById.username,
            firstname: UserDataById.firstname,
            lastname: UserDataById.lastname,
            email: UserDataById.email,
            // profilepic: UserDataById.profilepic || "",
          });
          // if (UserDataById.profilepic) {
          //   setProfilePicPreview(UserDataById.profilepic);
          // }
        } else {
          console.error("Failed to fetch user data:", response.error);
          toast.current?.show({
            severity: "error",
            summary: "Error",
            detail: response.error?.message || "Failed to load user data",
            life: 3000,
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail:
            error.error?.message || error.message || "Failed to load user data",
          life: 3000,
        });
      } finally {
        setFormLoading(false);
      }
    };

    fetchUserData();
  }, [id]);

  return (
    <Page title="User Register">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold">User Registration</h3>
                <Button
                  label="Back"
                  icon="pi pi-arrow-left"
                  className="p-button-sm"
                  severity="secondary"
                  onClick={() => navigate("/master-records/user-list")}
                />
              </div>

              <div className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  {/* Username */}
                  <div className="input-root">
                    {formLoading ? (
                      <>
                        <Skeleton
                          width="40%"
                          height="1.25rem"
                          className="mt-2 mb-2"
                        />
                        <Skeleton width="100%" height="2.5rem" />
                      </>
                    ) : (
                      <>
                        <label className="label-default text-base font-semibold">
                          User Name <span className="text-red-600">*</span>
                        </label>
                        <InputText
                          value={formData.username}
                          onChange={(e) =>
                            handleChange("username", e.target.value)
                          }
                          placeholder="Enter User Name"
                          className={formErrors.username ? "p-invalid" : ""}
                        />
                        {formErrors.username && (
                          <small className="p-error">
                            {formErrors.username}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* First Name */}
                  <div className="input-root">
                    {formLoading ? (
                      <>
                        <Skeleton
                          width="40%"
                          height="1.25rem"
                          className="mt-2 mb-2"
                        />
                        <Skeleton width="100%" height="2.5rem" />
                      </>
                    ) : (
                      <>
                        <label className="label-default text-base font-semibold">
                          First Name <span className="text-red-600">*</span>
                        </label>
                        <InputText
                          value={formData.firstname}
                          onChange={(e) =>
                            handleChange("firstname", e.target.value)
                          }
                          placeholder="Enter First Name"
                          className={formErrors.firstname ? "p-invalid" : ""}
                        />
                        {formErrors.firstname && (
                          <small className="p-error">
                            {formErrors.firstname}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Last Name */}
                  <div className="input-root">
                    {formLoading ? (
                      <>
                        <Skeleton
                          width="40%"
                          height="1.25rem"
                          className="mt-2 mb-2"
                        />
                        <Skeleton width="100%" height="2.5rem" />
                      </>
                    ) : (
                      <>
                        <label className="label-default text-base font-semibold">
                          Last Name <span className="text-red-600">*</span>
                        </label>
                        <InputText
                          value={formData.lastname}
                          onChange={(e) =>
                            handleChange("lastname", e.target.value)
                          }
                          placeholder="Enter Last Name"
                          className={formErrors.lastname ? "p-invalid" : ""}
                        />
                        {formErrors.lastname && (
                          <small className="p-error">
                            {formErrors.lastname}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Email */}
                  <div className="input-root">
                    {formLoading ? (
                      <>
                        <Skeleton
                          width="40%"
                          height="1.25rem"
                          className="mt-2 mb-2"
                        />
                        <Skeleton width="100%" height="2.5rem" />
                      </>
                    ) : (
                      <>
                        <label className="label-default text-base font-semibold">
                          Email <span className="text-red-600">*</span>
                        </label>
                        <InputText
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            handleChange("email", e.target.value)
                          }
                          placeholder="Enter Email"
                          className={formErrors.email ? "p-invalid" : ""}
                        />
                        {formErrors.email && (
                          <small className="p-error">{formErrors.email}</small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Password */}
                  <div className="input-root">
                    {formLoading ? (
                      <>
                        <Skeleton
                          width="40%"
                          height="1.25rem"
                          className="mt-2 mb-2"
                        />
                        <Skeleton width="100%" height="2.5rem" />
                      </>
                    ) : (
                      <>
                        <label className="label-default text-base font-semibold">
                          Password <span className="text-red-600">*</span>
                        </label>
                        <InputText
                          type="password"
                          value={formData.password}
                          onChange={(e) =>
                            handleChange("password", e.target.value)
                          }
                          placeholder="Enter Password"
                          className={formErrors.password ? "p-invalid" : ""}
                        />
                        {formErrors.password && (
                          <small className="p-error">
                            {formErrors.password}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Profile Pic
                  <div className="input-root">
                    <label className="label-default text-base font-semibold">
                      Profile Pic URL
                    </label>
                    <InputText
                      value={formData.profilepic}
                      onChange={(e) =>
                        handleChange("profilepic", e.target.value)
                      }
                      placeholder="Enter Profile Pic URL"
                    />
                  </div> */}
                  {/* Profile Pic Upload */}
                  {/* <div className="input-root">
                    {formLoading ? (
                      <>
                        <Skeleton
                          width="40%"
                          height="1.25rem"
                          className="mt-2 mb-2"
                        />
                        <Skeleton width="100%" height="2.5rem" />
                      </>
                    ) : (
                      <>
                        <label className="label-default text-base font-semibold">
                          Profile Picture
                        </label>
                        <div className="flex w-full items-center gap-4">
                          <FileUpload
                            mode="basic"
                            accept=".jpg,.jpeg,.png,.webp"
                            onSelect={(e) => {
                              const file = e?.files[0];
                              if (!file) return;

                              if (file.size > 500000) {
                                setImageError(
                                  "File size should be less than 500kb",
                                );
                                setProfilePicFile(null);
                                setProfilePicPreview(null);

                                // Clear from formData as well
                                setFormData((prev) => ({
                                  ...prev,
                                  profilepic: "",
                                }));
                              } else {
                                setImageError(null);
                                setProfilePicFile(file);
                                setProfilePicPreview(URL.createObjectURL(file));

                                // 🟩 Add the file name or file itself to formData
                                setFormData((prev) => ({
                                  ...prev,
                                  profilepic: file.name, // you can also store the actual file here if needed
                                }));
                              }
                            }}
                            auto
                            className={imageError ? "p-invalid" : ""}
                          />

                          {profilePicPreview && (
                            <div className="flex w-full items-center justify-between overflow-hidden">
                              <div className="flex w-full items-center gap-4">
                                <img
                                  className="h-14 object-contain"
                                  src={profilePicPreview}
                                  alt="Profile Pic"
                                />

                                <div className="flex flex-col gap-1">
                                  <span
                                    className="max-w-[150px] truncate"
                                    title={profilePicFile?.name}
                                  >
                                    {profilePicFile?.name}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    {profilePicFile?.size &&
                                    !isNaN(profilePicFile.size)
                                      ? (profilePicFile.size / 1024).toFixed(
                                          2,
                                        ) + " KB"
                                      : ""}
                                  </span>
                                </div>
                              </div>

                              <i
                                className="pi pi-times-circle cursor-pointer text-2xl text-red-500"
                                onClick={() => {
                                  setProfilePicFile(null);
                                  setProfilePicPreview(null);
                                  setFormData((prev) => ({
                                    ...prev,
                                    profilepic: "",
                                  }));
                                }}
                              ></i>
                            </div>
                          )}
                        </div>
                        {imageError && (
                          <small className="text-red-500">{imageError}</small>
                        )}
                      </>
                    )}
                  </div> */}

                  {/* <div className="mt-4">
                    <Button
                      label="Submit"
                      icon="pi pi-check"
                      className="p-button-sm"
                      onClick={handleSubmit}
                    /> */}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    label={
                      loading
                        ? id
                          ? "Updating..."
                          : "Adding..."
                        : id
                          ? "Update"
                          : "Add"
                    }
                    onClick={handleSubmit}
                    disabled={formLoading || loading}
                    icon="pi pi-check"
                    className="border-none bg-green-500 text-white hover:bg-green-600"
                  ></Button>
                  {/* <Button
                    label="Clear"
                    onClick={() => console.log("Cancel")}
                    icon="pi pi-times"
                    className="border-none bg-gray-500 text-white hover:bg-gray-600"
                  ></Button> */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
