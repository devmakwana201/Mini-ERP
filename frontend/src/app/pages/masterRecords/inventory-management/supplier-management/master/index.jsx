import { Page } from "components/shared/Page";
import { useState, useRef, useEffect } from "react";
import { Toast } from "primereact/toast";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { FileUpload } from "primereact/fileupload";
import { Dialog } from "primereact/dialog";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { Skeleton } from "primereact/skeleton";
import { CommonApi } from "services/common/commonapi";
import { SupplierService } from "services/master-records/supplier";
const MAX_FILE_SIZE = import.meta.env.VITE_MAX_FILE_SIZE;

export default function SupplierManagementMaster() {
  const toast = useRef(null);
  const navigate = useNavigate();
  const { id } = useParams();

  const [formLoading, setFormLoading] = useState(!!id);
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Loading states for dropdowns
  const [countryLoading, setCountryLoading] = useState(false);
  const [stateLoading, setStateLoading] = useState(false);
  const [cityLoading, setCityLoading] = useState(false);

  // Dropdown states
  const [countryList, setCountryList] = useState([]);
  const [stateList, setStateList] = useState([]);
  const [cityList, setCityList] = useState([]);

  // Image preview and remove states
  const [imagePreview, setImagePreview] = useState(null);
  const [imagePreviewName, setImagePreviewName] = useState(null); // Store image name separately
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState(null);
  const [imageChanged, setImageChanged] = useState(false); // Track if image was changed

  // Form data state
  const [formData, setFormData] = useState({
    supplierName: "",
    countryId: null,
    stateId: null,
    cityId: null,
    address: "",
    gstNumber: "",
    panNumber: "",
    vatNumber: "",
    contactNumber: "",
    email: "",
    pincode: "",
    contactPersonName: "",
    seedsLicenseNumber: "",
    seedsLicenseDate: null,
    fertilizerLicenseNumber: "",
    fertilizerLicenseDate: null,
    pesticidesLicenseNumber: "",
    pesticidesLicenseDate: null,
    supplierImage: null,
  });

  const validateForm = () => {
    const errors = {};

    if (!formData.supplierName?.trim())
      errors.supplierName = "Supplier Name is required";
    if (!formData.countryId) errors.countryId = "Country is required";
    if (!formData.stateId) errors.stateId = "State is required";
    if (!formData.cityId) errors.cityId = "City is required";

    // GST validation - optional but if provided must be valid
    if (formData.gstNumber?.trim()) {
      const gstRegex =
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(formData.gstNumber.trim())) {
        errors.gstNumber = "Invalid GST Number format";
      }
    }

    // PAN Number validation - required and must be valid format
    if (!formData.panNumber?.trim()) {
      errors.panNumber = "PAN Number is required";
    } else {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(formData.panNumber.trim())) {
        errors.panNumber = "Invalid PAN Number format";
      }
    }

    // Contact Number validation - required and must be 10 digits starting with 6, 7, 8, or 9
    if (!formData.contactNumber?.trim()) {
      errors.contactNumber = "Contact Number is required";
    } else {
      const contactRegex = /^[6-9]\d{9}$/;
      if (!contactRegex.test(formData.contactNumber.trim())) {
        errors.contactNumber =
          "Contact Number must be 10 digits starting with 6, 7, 8, or 9";
      }
    }

    // Email validation
    if (!formData.email?.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = "Invalid email format";
    }

    if (!formData.pincode?.trim()) errors.pincode = "Pincode is required";
    if (!formData.contactPersonName?.trim())
      errors.contactPersonName = "Contact Person Name is required";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  useEffect(() => {
    // Load initial dropdown data
    fetchCountries();

    // If editing, fetch supplier data
    if (id) {
      fetchSupplierData(id);
    }
  }, [id]);

  const fetchCountries = async () => {
    try {
      setCountryLoading(true);
      const countries = await CommonApi.getCountryList();
      setCountryList(countries);
    } catch (error) {
      console.error("Error fetching countries:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message || error.message || "Failed to load countries",
        life: 3000,
      });
    } finally {
      setCountryLoading(false);
    }
  };

  const fetchStates = async (countryId) => {
    try {
      setStateLoading(true);
      const states = await CommonApi.getStateList(countryId);
      setStateList(states);
    } catch (error) {
      console.error("Error fetching states:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message || error.message || "Failed to load states",
        life: 3000,
      });
    } finally {
      setStateLoading(false);
    }
  };

  const fetchCities = async (stateId) => {
    try {
      setCityLoading(true);
      const cities = await CommonApi.getCityList(stateId);
      setCityList(cities);
    } catch (error) {
      console.error("Error fetching cities:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message || error.message || "Failed to load cities",
        life: 3000,
      });
    } finally {
      setCityLoading(false);
    }
  };

  const fetchSupplierData = async (id) => {
    try {
      setFormLoading(true);
      const response = await SupplierService.getSupplierById(id);

      if (response.success && response.data) {
        const supplier = response.data;

        setFormData({
          supplierName: supplier.suppliername || "",
          countryId: supplier.countryid || null,
          stateId: supplier.stateid || null,
          cityId: supplier.cityid || null,
          address: supplier.address || "",
          gstNumber: supplier.gstno || "",
          panNumber: supplier.panno || "",
          vatNumber: supplier.vatno || "",
          contactNumber: supplier.phoneno || "",
          email: supplier.email || "",
          pincode: supplier.pincode || "",
          contactPersonName: supplier.contactperson || "",
          seedsLicenseNumber: supplier.seedslicensenumber || "",
          seedsLicenseDate: supplier.seedslicensedate
            ? new Date(supplier.seedslicensedate)
            : null,
          fertilizerLicenseNumber: supplier.fertilizerlicensenumber || "",
          fertilizerLicenseDate: supplier.fertilizerlicensedate
            ? new Date(supplier.fertilizerlicensedate)
            : null,
          pesticidesLicenseNumber: supplier.pesticideslicensenumber || "",
          pesticidesLicenseDate: supplier.pesticideslicensedate
            ? new Date(supplier.pesticideslicensedate)
            : null,
          supplierImage: null, // Keep as null for edit mode, will show existing image separately
        });

        // Set existing image preview if available
        if (supplier.supplierimage) {
          // Handle both old format (string) and new format (object with key/value)
          if (
            typeof supplier.supplierimage === "object" &&
            supplier.supplierimage.value
          ) {
            setImagePreview(supplier.supplierimage.value);
            setImagePreviewName(supplier.supplierimage.key || "Current Image");
          } else if (typeof supplier.supplierimage === "string") {
            setImagePreview(supplier.supplierimage);
            setImagePreviewName("Current Image");
          }
        }

        // Reset image changed flag when loading existing data
        setImageChanged(false);

        // Load states and cities if country and state are selected
        if (supplier.countryid) {
          await fetchStates(supplier.countryid);
          if (supplier.stateid) {
            await fetchCities(supplier.stateid);
          }
        }
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: "Failed to load supplier data",
          life: 3000,
        });
        navigate("/master-records/inventory/supplier/supplier-list");
      }
    } catch (error) {
      console.error("Error fetching supplier:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          "Failed to load supplier data",
        life: 3000,
      });
      navigate("/master-records/inventory/supplier/supplier-list");
    } finally {
      setFormLoading(false);
    }
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

  const handleRemoveImage = () => {
    handleChange("supplierImage", null);
    setImagePreview(null);
    setImagePreviewName(null);
    setShowRemoveDialog(false);
    setFormErrors((prev) => ({ ...prev, supplierImage: null }));
    setImageChanged(true); // Mark image as changed when removed
  };

  // Enhanced handleChange for dependent dropdowns
  const handleDropdownChange = (field, value) => {
    if (field === "countryId") {
      // Reset dependent dropdowns
      setFormData((prev) => ({
        ...prev,
        [field]: value,
        stateId: null,
        cityId: null,
      }));
      setStateList([]);
      setCityList([]);

      // Load states if country is selected
      if (value) {
        fetchStates(value);
      }
    } else if (field === "stateId") {
      // Reset city dropdown
      setFormData((prev) => ({
        ...prev,
        [field]: value,
        cityId: null,
      }));
      setCityList([]);

      // Load cities if state is selected
      if (value) {
        fetchCities(value);
      }
    } else {
      // Handle other fields normally
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }

    // Clear field error
    setFormErrors((prev) => ({
      ...prev,
      [field]: null,
    }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.current?.show({
        severity: "error",
        summary: "Validation Error",
        detail: "Please fill in all required fields",
        life: 3000,
      });
      return;
    }

    try {
      setLoading(true);

      // Create FormData for multipart/form-data submission
      const formDataPayload = new FormData();

      // Define key mapping from camelCase to lowercase for backend
      const keyMapping = {
        supplierName: "suppliername",
        countryId: "countryid",
        stateId: "stateid",
        cityId: "cityid",
        address: "address",
        gstNumber: "gstno",
        panNumber: "panno",
        vatNumber: "vatno",
        contactNumber: "phoneno",
        email: "email",
        pincode: "pincode",
        contactPersonName: "contactperson",
        seedsLicenseNumber: "seedslicensenumber",
        seedsLicenseDate: "seedslicensedate",
        fertilizerLicenseNumber: "fertilizerlicensenumber",
        fertilizerLicenseDate: "fertilizerlicensedate",
        pesticidesLicenseNumber: "pesticideslicensenumber",
        pesticidesLicenseDate: "pesticideslicensedate",
        supplierImage: "supplierimage",
      };

      // Add all form fields to FormData (including null/empty values so backend knows to clear them)
      Object.keys(formData).forEach((key) => {
        if (key === "supplierImage") {
          // Only include supplierimage if image was changed (for updates) or if creating new supplier
          if (!id || imageChanged) {
            if (formData[key]) {
              formDataPayload.append("supplierimage", formData[key]);
            } else {
              // Send empty value to indicate image should be removed
              formDataPayload.append("supplierimage", "");
            }
          }
        } else if (
          key === "seedsLicenseDate" ||
          key === "fertilizerLicenseDate" ||
          key === "pesticidesLicenseDate"
        ) {
          // Handle date fields - send even if null/empty
          const backendKey = keyMapping[key] || key.toLowerCase();
          if (formData[key]) {
            formDataPayload.append(
              backendKey,
              formData[key].toISOString().split("T")[0],
            );
          } else {
            // Send empty string for null/empty dates so backend knows to clear them
            formDataPayload.append(backendKey, "");
          }
        } else {
          // Handle all other fields - send even if null/empty
          const value = formData[key];
          const backendKey = keyMapping[key] || key.toLowerCase();

          if (value === null || value === undefined) {
            // Send empty string for null/undefined values
            formDataPayload.append(backendKey, "");
          } else {
            // Send the actual value (including empty strings)
            formDataPayload.append(backendKey, value);
          }
        }
      });

      let response;
      if (id) {
        response = await SupplierService.updateSupplier(id, formDataPayload);
      } else {
        response = await SupplierService.createSupplier(formDataPayload);
      }

      if (response.success) {
        toast.current?.show({
          severity: "success",
          summary: "Success",
          detail:
            response.message ||
            (id
              ? "Supplier updated successfully"
              : "Supplier created successfully"),
          life: 3000,
        });

        if (!id) {
          // Clear all form inputs only for create mode
          setFormData({
            supplierName: "",
            countryId: null,
            stateId: null,
            cityId: null,
            address: "",
            gstNumber: "",
            panNumber: "",
            vatNumber: "",
            contactNumber: "",
            email: "",
            pincode: "",
            contactPersonName: "",
            seedsLicenseNumber: "",
            seedsLicenseDate: null,
            fertilizerLicenseNumber: "",
            fertilizerLicenseDate: null,
            pesticidesLicenseNumber: "",
            pesticidesLicenseDate: null,
            supplierImage: null,
          });

          // Clear dependent dropdown lists
          setStateList([]);
          setCityList([]);

          // Clear image preview
          setImagePreview(null);
          setImagePreviewName(null);
          setImageChanged(false);

          // Clear form errors
          setFormErrors({});
        }

        // Navigate back to supplier list after success
        setTimeout(() => {
          navigate("/master-records/inventory/supplier/supplier-list");
        }, 1000);
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail:
            response.error?.details?.[0]?.message ||
            response.message ||
            (id ? "Failed to update supplier" : "Failed to create supplier"),
          life: 3000,
        });
      }
    } catch (error) {
      console.error(
        id ? "Error updating supplier:" : "Error creating supplier:",
        error,
      );
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          (id ? "Failed to update supplier" : "Failed to create supplier"),
        life: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page title={id ? "Update Supplier" : "Add Supplier"}>
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {id ? "Update Supplier" : "Add Supplier"}
                </h3>
                <Button
                  label="Back"
                  icon="pi pi-arrow-left"
                  className="p-button-sm"
                  severity="secondary"
                  onClick={() =>
                    navigate("/master-records/inventory/supplier/supplier-list")
                  }
                />
              </div>

              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Supplier Name */}
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
                          Supplier Name <span className="text-red-600">*</span>
                        </label>
                        <InputText
                          value={formData.supplierName}
                          onChange={(e) =>
                            handleChange("supplierName", e.target.value)
                          }
                          placeholder="Enter Supplier Name"
                          maxLength={50}
                          className={formErrors.supplierName ? "p-invalid" : ""}
                        />
                        {formErrors.supplierName && (
                          <small className="p-error">
                            {formErrors.supplierName}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Country */}
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
                          Country <span className="text-red-600">*</span>
                        </label>
                        <Dropdown
                          value={formData.countryId}
                          options={countryList}
                          onChange={(e) =>
                            handleDropdownChange("countryId", e.value)
                          }
                          placeholder="Select Country"
                          showClear
                          filter
                          loading={countryLoading}
                          className={formErrors.countryId ? "p-invalid" : ""}
                          virtualScrollerOptions={{ itemSize: 45 }}
                        />
                        {formErrors.countryId && (
                          <small className="p-error">
                            {formErrors.countryId}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* State */}
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
                          State <span className="text-red-600">*</span>
                        </label>
                        <Dropdown
                          value={formData.stateId}
                          options={stateList}
                          onChange={(e) =>
                            handleDropdownChange("stateId", e.value)
                          }
                          placeholder="Select State"
                          showClear
                          filter
                          loading={stateLoading}
                          disabled={!formData.countryId}
                          className={formErrors.stateId ? "p-invalid" : ""}
                          virtualScrollerOptions={{ itemSize: 45 }}
                        />
                        {formErrors.stateId && (
                          <small className="p-error">
                            {formErrors.stateId}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* City */}
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
                          City <span className="text-red-600">*</span>
                        </label>
                        <Dropdown
                          value={formData.cityId}
                          options={cityList}
                          onChange={(e) =>
                            handleDropdownChange("cityId", e.value)
                          }
                          placeholder="Select City"
                          showClear
                          filter
                          loading={cityLoading}
                          disabled={!formData.stateId}
                          className={formErrors.cityId ? "p-invalid" : ""}
                          virtualScrollerOptions={{ itemSize: 45 }}
                        />
                        {formErrors.cityId && (
                          <small className="p-error">{formErrors.cityId}</small>
                        )}
                      </>
                    )}
                  </div>

                  {/* GST Number */}
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
                          GST Number
                        </label>
                        <InputText
                          value={formData.gstNumber}
                          onChange={(e) =>
                            handleChange(
                              "gstNumber",
                              e.target.value.toUpperCase(),
                            )
                          }
                          placeholder="Enter GST Number"
                          className={formErrors.gstNumber ? "p-invalid" : ""}
                          maxLength={15}
                        />
                        {formErrors.gstNumber && (
                          <small className="p-error">
                            {formErrors.gstNumber}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* PAN Number */}
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
                          PAN Number <span className="text-red-600">*</span>
                        </label>
                        <InputText
                          value={formData.panNumber}
                          onChange={(e) =>
                            handleChange(
                              "panNumber",
                              e.target.value.toUpperCase(),
                            )
                          }
                          placeholder="Enter PAN Number"
                          maxLength={10}
                          className={formErrors.panNumber ? "p-invalid" : ""}
                        />
                        {formErrors.panNumber && (
                          <small className="p-error">
                            {formErrors.panNumber}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* VAT Number */}
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
                          VAT Number
                        </label>
                        <InputText
                          value={formData.vatNumber}
                          onChange={(e) =>
                            handleChange("vatNumber", e.target.value)
                          }
                          placeholder="Enter VAT Number"
                          maxLength={30}
                          className={formErrors.vatNumber ? "p-invalid" : ""}
                        />
                        {formErrors.vatNumber && (
                          <small className="p-error">
                            {formErrors.vatNumber}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Contact Number */}
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
                          Contact Number <span className="text-red-600">*</span>
                        </label>
                        <InputText
                          value={formData.contactNumber}
                          onChange={(e) =>
                            handleChange("contactNumber", e.target.value)
                          }
                          placeholder="Enter Contact Number"
                          keyfilter="pnum"
                          maxLength={10}
                          className={
                            formErrors.contactNumber ? "p-invalid" : ""
                          }
                        />
                        {formErrors.contactNumber && (
                          <small className="p-error">
                            {formErrors.contactNumber}
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

                  {/* Pincode */}
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
                          Pincode <span className="text-red-600">*</span>
                        </label>
                        <InputText
                          value={formData.pincode}
                          onChange={(e) =>
                            handleChange("pincode", e.target.value)
                          }
                          placeholder="Enter Pincode"
                          keyfilter="pnum"
                          maxLength={7}
                          className={formErrors.pincode ? "p-invalid" : ""}
                        />
                        {formErrors.pincode && (
                          <small className="p-error">
                            {formErrors.pincode}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Contact Person Name */}
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
                          Contact Person Name{" "}
                          <span className="text-red-600">*</span>
                        </label>
                        <InputText
                          value={formData.contactPersonName}
                          onChange={(e) =>
                            handleChange("contactPersonName", e.target.value)
                          }
                          placeholder="Enter Contact Person Name"
                          maxLength={50}
                          className={
                            formErrors.contactPersonName ? "p-invalid" : ""
                          }
                        />
                        {formErrors.contactPersonName && (
                          <small className="p-error">
                            {formErrors.contactPersonName}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Seeds Licence Number */}
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
                          Seeds License Number
                        </label>
                        <InputText
                          value={formData.seedsLicenseNumber}
                          onChange={(e) =>
                            handleChange("seedsLicenseNumber", e.target.value)
                          }
                          placeholder="Enter Seeds License Number"
                          maxLength={50}
                          className={
                            formErrors.seedsLicenseNumber ? "p-invalid" : ""
                          }
                        />
                        {formErrors.seedsLicenseNumber && (
                          <small className="p-error">
                            {formErrors.seedsLicenseNumber}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Seeds Licence Date */}
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
                          Seeds License Date
                        </label>
                        <Calendar
                          value={formData.seedsLicenseDate}
                          onChange={(e) =>
                            handleChange("seedsLicenseDate", e.value)
                          }
                          placeholder="Select Seeds License Date"
                          dateFormat="dd/mm/yy"
                          showIcon
                          className={
                            formErrors.seedsLicenseDate ? "p-invalid" : ""
                          }
                        />
                        {formErrors.seedsLicenseDate && (
                          <small className="p-error">
                            {formErrors.seedsLicenseDate}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Fertilizer Licence Number */}
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
                          Fertilizer License Number
                        </label>
                        <InputText
                          value={formData.fertilizerLicenseNumber}
                          onChange={(e) =>
                            handleChange(
                              "fertilizerLicenseNumber",
                              e.target.value,
                            )
                          }
                          placeholder="Enter Fertilizer License Number"
                          maxLength={50}
                          className={
                            formErrors.fertilizerLicenseNumber
                              ? "p-invalid"
                              : ""
                          }
                        />
                        {formErrors.fertilizerLicenseNumber && (
                          <small className="p-error">
                            {formErrors.fertilizerLicenseNumber}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Fertilizer Licence Date */}
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
                          Fertilizer License Date
                        </label>
                        <Calendar
                          value={formData.fertilizerLicenseDate}
                          onChange={(e) =>
                            handleChange("fertilizerLicenseDate", e.value)
                          }
                          placeholder="Select Fertilizer License Date"
                          dateFormat="dd/mm/yy"
                          showIcon
                          className={
                            formErrors.fertilizerLicenseDate ? "p-invalid" : ""
                          }
                        />
                        {formErrors.fertilizerLicenseDate && (
                          <small className="p-error">
                            {formErrors.fertilizerLicenseDate}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Pesticides Licence Number */}
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
                          Pesticides License Number
                        </label>
                        <InputText
                          value={formData.pesticidesLicenseNumber}
                          onChange={(e) =>
                            handleChange(
                              "pesticidesLicenseNumber",
                              e.target.value,
                            )
                          }
                          placeholder="Enter Pesticides License Number"
                          maxLength={50}
                          className={
                            formErrors.pesticidesLicenseNumber
                              ? "p-invalid"
                              : ""
                          }
                        />
                        {formErrors.pesticidesLicenseNumber && (
                          <small className="p-error">
                            {formErrors.pesticidesLicenseNumber}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Pesticides Licence Date */}
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
                          Pesticides License Date
                        </label>
                        <Calendar
                          value={formData.pesticidesLicenseDate}
                          onChange={(e) =>
                            handleChange("pesticidesLicenseDate", e.value)
                          }
                          placeholder="Select Pesticides License Date"
                          dateFormat="dd/mm/yy"
                          showIcon
                          className={
                            formErrors.pesticidesLicenseDate ? "p-invalid" : ""
                          }
                        />
                        {formErrors.pesticidesLicenseDate && (
                          <small className="p-error">
                            {formErrors.pesticidesLicenseDate}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Supplier Logo */}
                  <div className="input-root">
                    {formLoading ? (
                      <>
                        <div className="flex flex-col lg:flex-row lg:items-stretch lg:gap-6">
                          <div className="flex-1">
                            {/* Label skeleton */}
                            <Skeleton
                              width="30%"
                              height="1.25rem"
                              className="mb-2"
                            />
                            {/* Choose button skeleton */}
                            <Skeleton width="100%" height="2.5rem" />
                          </div>
                          {/* Preview div skeleton */}
                          <div className="mt-4 lg:mt-0 lg:flex lg:items-center">
                            <div className="flex w-full max-w-[290px] min-w-[250px] flex-1 items-center justify-between gap-4 rounded border p-2 shadow">
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
                        <div className="flex flex-col lg:flex-row lg:items-stretch lg:gap-6">
                          <div className="flex-1">
                            <label className="label-default text-base font-semibold">
                              Supplier Logo
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
                                    supplierImage:
                                      "File size should be less than 2MB",
                                  }));
                                  handleChange("supplierImage", null);
                                  setImagePreview(null);
                                  setImagePreviewName(null);
                                } else {
                                  setFormErrors((prev) => ({
                                    ...prev,
                                    supplierImage: null,
                                  }));
                                  handleChange("supplierImage", e.files[0]);
                                  setImagePreview(
                                    URL.createObjectURL(e.files[0]),
                                  );
                                  setImagePreviewName(e.files[0].name);
                                  setImageChanged(true); // Mark image as changed when new file is selected
                                }
                              }}
                              auto
                              disabled={loading}
                              className={
                                formErrors.supplierImage ? "p-invalid" : ""
                              }
                            />
                            {formErrors.supplierImage && (
                              <small className="p-error">
                                {formErrors.supplierImage}
                              </small>
                            )}
                          </div>
                          {imagePreview && (
                            <div className="mt-4 lg:mt-0 lg:flex lg:items-center">
                              <div className="flex w-full max-w-[290px] min-w-[250px] flex-1 items-center justify-between gap-4 rounded border p-2 shadow">
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
                                        formData.supplierImage?.name ||
                                        imagePreviewName ||
                                        "Current Image"
                                      }
                                    >
                                      {formData.supplierImage?.name ||
                                        imagePreviewName ||
                                        "Current Image"}
                                    </span>
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

                {/* Address - Full width */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="input-root">
                    {formLoading ? (
                      <>
                        <Skeleton
                          width="15%"
                          height="1.25rem"
                          className="mt-2 mb-2"
                        />
                        <Skeleton width="100%" height="5rem" />
                      </>
                    ) : (
                      <>
                        <label className="label-default text-base font-semibold">
                          Address
                        </label>
                        <InputTextarea
                          value={formData.address}
                          onChange={(e) =>
                            handleChange("address", e.target.value)
                          }
                          placeholder="Enter Address"
                          rows={4}
                          maxLength={500}
                          className={formErrors.address ? "p-invalid" : ""}
                        />
                        {formErrors.address && (
                          <small className="p-error">
                            {formErrors.address}
                          </small>
                        )}
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
                          ? "Update Supplier"
                          : "Add Supplier"
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
