import { Page } from "components/shared/Page";
import { useState, useRef, useEffect, useCallback } from "react";
import { Toast } from "primereact/toast";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { FileUpload } from "primereact/fileupload";
import { Dialog } from "primereact/dialog";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { Skeleton } from "primereact/skeleton";
import { CommonApi } from "services/common/commonapi";
import { ItemCategoryService } from "services/master-records/category";
const MAX_FILE_SIZE = import.meta.env.VITE_MAX_FILE_SIZE;

export default function ItemCategoryManagementMaster() {
  const toast = useRef(null);
  const navigate = useNavigate();
  const { id } = useParams();

  const [formLoading, setFormLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Loading state for dropdown
  const [parentCategoryLoading, setParentCategoryLoading] = useState(false);

  // Dropdown states
  const [parentCategoryList, setParentCategoryList] = useState([]);

  // Image preview and remove states
  const [imagePreview, setImagePreview] = useState(null);
  const [imagePreviewName, setImagePreviewName] = useState(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState(null);
  const [imageChanged, setImageChanged] = useState(false); // Track if image was changed

  // Form data state
  const [formData, setFormData] = useState({
    categoryName: "",
    categoryDisplayName: "",
    parentCategoryId: null,
    displayOrder: null,
    itemCategoryImage: null,
  });

  const validateForm = () => {
    const errors = {};

    if (!formData.categoryName?.trim())
      errors.categoryName = "Item Category Name is required";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const fetchParentCategories = async () => {
    try {
      setParentCategoryLoading(true);
      const categories = await CommonApi.getItemCategoryList();
      setParentCategoryList(categories);
    } catch (error) {
      console.error("Error fetching parent categories:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          "Failed to load parent categories",
        life: 3000,
      });
    } finally {
      setParentCategoryLoading(false);
    }
  };

  const fetchCategoryData = useCallback(async () => {
    try {
      setFormLoading(true);
      const response = await ItemCategoryService.getItemCategoryById(id);

      if (response.success) {
        const categoryData = response.data;
        setFormData({
          categoryName: categoryData.itemcategoryname || "",
          categoryDisplayName: categoryData.displayname || "",
          parentCategoryId: categoryData.parentcategoryid || null,
          displayOrder: categoryData.itemcategoryorder || null,
          itemCategoryImage: null, // We'll handle the existing image separately
        });

        // If there's an existing image, set the image preview
        if (categoryData.itemcategoryimage) {
          if (
            typeof categoryData.itemcategoryimage === "object" &&
            categoryData.itemcategoryimage.value
          ) {
            setImagePreview(categoryData.itemcategoryimage.value);
            setImagePreviewName(
              categoryData.itemcategoryimage.key || "Current Image",
            );
          } else if (typeof categoryData.itemcategoryimage === "string") {
            setImagePreview(categoryData.itemcategoryimage);
            setImagePreviewName("Current Image");
          }
        }

        // Reset image changed flag when loading existing data
        setImageChanged(false);
      } else {
        console.error("Failed to fetch category data:", response.error);
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail:
            response.error?.details?.[0]?.message ||
            response.error?.message ||
            "Failed to load category data",
          life: 3000,
        });
      }
    } catch (error) {
      console.error("Error fetching category data:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          "Failed to load category data",
        life: 3000,
      });
    } finally {
      setFormLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchParentCategories();

    // Fetch category data if editing (id exists in params)
    if (id) {
      fetchCategoryData();
    }
  }, [id, fetchCategoryData]);

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

  const handleRemoveImage = () => {
    handleChange("itemCategoryImage", null);
    setImagePreview(null);
    setImagePreviewName(null);
    setShowRemoveDialog(false);
    setFormErrors((prev) => ({ ...prev, itemCategoryImage: null }));
    setImageChanged(true); // Mark image as changed when removed
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const formdata = new FormData();
      formdata.append("itemcategoryname", formData.categoryName);
      formdata.append("displayname", formData.categoryDisplayName);
      formdata.append(
        "parentcategoryid",
        formData.parentCategoryId ? parseInt(formData.parentCategoryId) : "",
      );
      formdata.append("itemcategoryorder", parseInt(formData.displayOrder));

      // Only include itemcategoryimage if image was changed (for updates) or if creating new category
      if (!id || imageChanged) {
        formdata.append("itemcategoryimage", formData.itemCategoryImage || "");
      }

      // Call appropriate API based on whether we're creating or updating
      const result = id
        ? await ItemCategoryService.updateItemCategory(id, formdata)
        : await ItemCategoryService.createItemCategory(formdata);

      if (result.success) {
        toast.current?.show({
          severity: "success",
          summary: "Success",
          detail: result.message || "Operation completed successfully",
          life: 3000,
        });

        if (!id) {
          // reset form only for create mode
          setFormData({
            categoryName: "",
            categoryDisplayName: "",
            parentCategoryId: null,
            displayOrder: null,
            itemCategoryImage: null,
          });
          setImagePreview(null);
          setImagePreviewName(null);
        }

        // Navigate back to list after success
        navigate("/master-records/inventory/item-category/item-category-list");
      } else {
        console.error("Failed to submit form:", result.error);
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail:
            result.error?.details?.[0]?.message ||
            result.error?.message ||
            `Failed to ${id ? "update" : "add"} Item Category`,
          life: 3000,
        });
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          (id
            ? "Failed to update Item Category"
            : "Failed to add Item Category"),
        life: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page title={id ? "Update Item Category" : "Add Item Category"}>
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {id ? "Update Item Category" : "Add Item Category"}
                </h3>
                <Button
                  label="Back"
                  icon="pi pi-arrow-left"
                  className="p-button-sm"
                  severity="secondary"
                  onClick={() =>
                    navigate(
                      "/master-records/inventory/item-category/item-category-list",
                    )
                  }
                />
              </div>

              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Item Category Name */}
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
                          Item Category Name{" "}
                          <span className="text-red-600">*</span>
                        </label>
                        <InputText
                          value={formData.categoryName}
                          onChange={(e) =>
                            handleChange("categoryName", e.target.value)
                          }
                          placeholder="Enter Item Category Name"
                          className={formErrors.categoryName ? "p-invalid" : ""}
                        />
                        {formErrors.categoryName && (
                          <small className="p-error">
                            {formErrors.categoryName}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Item Category Display Name */}
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
                          Item Category Display Name
                        </label>
                        <InputText
                          value={formData.categoryDisplayName}
                          onChange={(e) =>
                            handleChange("categoryDisplayName", e.target.value)
                          }
                          placeholder="Enter Item Category Display Name"
                          className={
                            formErrors.categoryDisplayName ? "p-invalid" : ""
                          }
                        />
                        {formErrors.categoryDisplayName && (
                          <small className="p-error">
                            {formErrors.categoryDisplayName}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Parent Category */}
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
                          Parent Category
                        </label>
                        <Dropdown
                          value={formData.parentCategoryId}
                          options={parentCategoryList}
                          onChange={(e) =>
                            handleChange("parentCategoryId", e.value)
                          }
                          placeholder="Select Parent Category"
                          showClear
                          filter
                          loading={parentCategoryLoading}
                          className={
                            formErrors.parentCategoryId ? "p-invalid" : ""
                          }
                          virtualScrollerOptions={{ itemSize: 45 }}
                        />
                        {formErrors.parentCategoryId && (
                          <small className="p-error">
                            {formErrors.parentCategoryId}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Display Order */}
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
                          Display Order
                        </label>
                        <InputNumber
                          value={formData.displayOrder}
                          onValueChange={(e) =>
                            handleChange("displayOrder", e.value)
                          }
                          placeholder="Enter Display Order"
                          className={formErrors.displayOrder ? "p-invalid" : ""}
                          useGrouping={false}
                          pt={{
                            input: {
                              root: {
                                className: "w-full",
                              },
                            },
                          }}
                        />
                        {formErrors.displayOrder && (
                          <small className="p-error">
                            {formErrors.displayOrder}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Item Category Image */}
                  <div className="input-root">
                    {formLoading ? (
                      <>
                        <div className="flex flex-col lg:flex-row lg:items-start lg:gap-6">
                          <div className="flex-1 lg:flex lg:min-h-[78px] lg:flex-col lg:justify-center">
                            {/* Label skeleton */}
                            <Skeleton
                              width="50%"
                              height="1.25rem"
                              className="mb-2"
                            />
                            {/* Choose button skeleton */}
                            <Skeleton width="100%" height="2.5rem" />
                          </div>
                          {/* Preview div skeleton */}
                          <div className="mt-4 lg:mt-0">
                            <div className="flex h-[78px] w-full max-w-[290px] min-w-[250px] flex-1 items-center justify-between gap-4 rounded border p-2 shadow">
                              <div className="flex items-center gap-4">
                                {/* Image skeleton */}
                                <Skeleton
                                  width="3.5rem"
                                  height="3.5rem"
                                  className="rounded"
                                />
                                <div className="flex flex-col gap-1">
                                  {/* File name skeleton */}
                                  <Skeleton width="120px" height="1rem" />
                                  {/* File info skeleton */}
                                  <Skeleton width="80px" height="0.75rem" />
                                </div>
                              </div>
                              {/* Delete icon skeleton */}
                              <Skeleton
                                width="1.5rem"
                                height="1.5rem"
                                className="rounded-full"
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex flex-col lg:flex-row lg:items-start lg:gap-6">
                          <div className="flex-1 lg:flex lg:min-h-[78px] lg:flex-col lg:justify-center">
                            <label className="label-default text-base font-semibold">
                              Item Category Image
                            </label>
                            <FileUpload
                              mode="basic"
                              accept="image/*"
                              onSelect={(e) => {
                                if (e?.files[0]?.size > MAX_FILE_SIZE) {
                                  // Show toast notification for file size error
                                  toast.current?.show({
                                    severity: "warn",
                                    summary: "File Size Warning",
                                    detail: "Image size should not exceed 2MB",
                                    life: 3000,
                                  });
                                  setFormErrors((prev) => ({
                                    ...prev,
                                    itemCategoryImage:
                                      "File size should be less than 50kb",
                                  }));
                                  handleChange("itemCategoryImage", null);
                                  setImagePreview(null);
                                } else {
                                  setFormErrors((prev) => ({
                                    ...prev,
                                    itemCategoryImage: null,
                                  }));
                                  handleChange("itemCategoryImage", e.files[0]);
                                  setImagePreview(
                                    URL.createObjectURL(e.files[0]),
                                  );
                                  setImageChanged(true); // Mark image as changed when new file is selected
                                }
                              }}
                              auto
                              disabled={loading}
                              className={
                                formErrors.itemCategoryImage ? "p-invalid" : ""
                              }
                            />
                            {formErrors.itemCategoryImage && (
                              <small className="p-error">
                                {formErrors.itemCategoryImage}
                              </small>
                            )}
                          </div>
                          {imagePreview && (
                            <div className="mt-4 lg:mt-0">
                              <div className="flex h-[78px] w-full max-w-[290px] min-w-[250px] flex-1 items-center justify-between gap-4 rounded border p-2 shadow">
                                <div className="flex items-center gap-4">
                                  <img
                                    className="h-14 w-14 cursor-pointer rounded object-contain"
                                    src={imagePreview}
                                    alt="Preview"
                                    onClick={() => {
                                      setPreviewImageSrc(imagePreview);
                                      setShowImagePreview(true);
                                    }}
                                  />
                                  <div className="flex flex-col gap-1">
                                    <span
                                      className="max-w-[150px] truncate"
                                      title={
                                        formData.itemCategoryImage?.name ||
                                        imagePreviewName ||
                                        "Current Image"
                                      }
                                    >
                                      {formData.itemCategoryImage?.name ||
                                        imagePreviewName ||
                                        "Current Image"}
                                    </span>
                                    {!formData.itemCategoryImage && (
                                      <span className="text-xs text-gray-500">
                                        Existing image
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <i
                                  className="pi pi-times-circle cursor-pointer text-2xl text-red-500"
                                  onClick={() => setShowRemoveDialog(true)}
                                ></i>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    label={
                      loading
                        ? id
                          ? "Updating..."
                          : "Adding..."
                        : id
                          ? "Update Item Category"
                          : "Add Item Category"
                    }
                    onClick={handleSubmit}
                    disabled={formLoading || loading}
                    icon="pi pi-check"
                    className="border-none bg-green-500 text-white hover:bg-green-600"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Remove Image Confirmation Dialog */}
      <Dialog
        header="Confirm Deletion"
        visible={showRemoveDialog}
        style={{ width: "32rem" }}
        breakpoints={{ "960px": "75vw", "641px": "90vw" }}
        onHide={() => setShowRemoveDialog(false)}
        modal
        draggable={false}
        resizable={false}
        blockScroll={true}
        dismissableMask
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="No"
              icon="pi pi-times"
              onClick={() => setShowRemoveDialog(false)}
              className="p-button-text"
            />
            <Button
              label="Yes"
              icon="pi pi-check"
              className="p-button-danger"
              onClick={handleRemoveImage}
              autoFocus
            />
          </div>
        }
      >
        <div className="confirmation-content flex items-center">
          <i
            className="pi pi-exclamation-triangle mr-3"
            style={{ fontSize: "2rem" }}
          />
          <span>Are you sure you want to delete this image?</span>
        </div>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog
        header="Image Preview"
        visible={showImagePreview}
        style={{ width: "90vw", maxWidth: "800px" }}
        modal
        onHide={() => setShowImagePreview(false)}
        draggable={false}
        resizable={false}
        blockScroll={true}
        dismissableMask
      >
        <img
          src={previewImageSrc}
          alt="Preview"
          className="h-auto w-full"
          style={{ objectFit: "contain" }}
        />
      </Dialog>
    </Page>
  );
}
