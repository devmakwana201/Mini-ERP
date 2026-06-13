import { Page } from "components/shared/Page";
import { useState, useRef, useEffect, useCallback } from "react";
import { Toast } from "primereact/toast";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { InputSwitch } from "primereact/inputswitch";
import { FileUpload } from "primereact/fileupload";
import { Dialog } from "primereact/dialog";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { Skeleton } from "primereact/skeleton";
import { RadioButton } from "primereact/radiobutton";
import { InputNumber } from "primereact/inputnumber";
import { CommonApi } from "services/common/commonapi";
import { ItemService } from "services/master-records/items";
const MAX_FILE_SIZE = import.meta.env.VITE_MAX_FILE_SIZE;

export default function ItemManagementMaster() {
  const toast = useRef(null);
  const navigate = useNavigate();
  const { id } = useParams();

  const [formLoading, setFormLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Individual loading states for dropdowns
  const [masterCategoryLoading, setMasterCategoryLoading] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [subCategoryLoading, setSubCategoryLoading] = useState(false);
  const [brandLoading, setBrandLoading] = useState(false);
  const [baseUnitLoading, setBaseUnitLoading] = useState(false);
  const [taxProfileLoading, setTaxProfileLoading] = useState(false);

  // Dropdown states
  const [masterCategoryList, setMasterCategoryList] = useState([]);
  const [categoryList, setCategoryList] = useState([]);
  const [subCategoryList, setSubCategoryList] = useState([]);
  const [brandList, setBrandList] = useState([]);
  const [baseUnitList, setBaseUnitList] = useState([]);

  // Image preview and remove states
  const [imagePreview, setImagePreview] = useState(null);
  const [imagePreviewName, setImagePreviewName] = useState(null); // Store image name separately
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState(null);
  const [imageChanged, setImageChanged] = useState(false); // Track if image was changed

  // Pricing dropdown states
  const [defaultTaxList, setDefaultTaxList] = useState([]);
  const [priceTypeList, setPriceTypeList] = useState([]);

  // Form data state
  const [formData, setFormData] = useState({
    masterCategoryId: null,
    categoryId: null,
    subCategoryId: null,
    brandId: null,
    itemName: "",
    displayName: "",
    genericName: "",
    itemCode: "",
    safetyQuantity: "",
    baseUnitId: null,
    packageUom: null,
    packageQuantity: "",
    itemImage: null,
  });

  // Pricing and GST form data
  const [pricingData, setPricingData] = useState({
    defaultTaxId: null,
    sellingItemAs: "goods", // "goods" or "service"
    hsnCode: "",
    sacCode: "",
    priceTypeId: null,
    standardSalePrice: "",
    standardPurchasePrice: "",
    netCostMrp: "",
    wholesalePrice: "",
    ingredients: "",
    description: "",
    ignoreTax: false,
    ignoreDiscount: false,
    isNegativeSale: false,
  });

  const validateForm = () => {
    const errors = {};

    // Section 1 validation - Item Master
    if (!formData.masterCategoryId)
      errors.masterCategoryId = "Master Category is required";
    if (!formData.categoryId) errors.categoryId = "Category is required";
    if (!formData.brandId) errors.brandId = "Brand is required";
    if (!formData.itemName?.trim()) errors.itemName = "Item Name is required";
    if (!formData.baseUnitId) errors.baseUnitId = "Base Unit is required";
    if (!formData.packageUom) errors.packageUom = "Package UOM is required";
    if (!formData.packageQuantity)
      errors.packageQuantity = "Package Quantity is required";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const [pricingErrors, setPricingErrors] = useState({});

  const validatePricingForm = () => {
    const errors = {};

    // Section 3 validation - Pricing and GST
    if (!pricingData.defaultTaxId)
      errors.defaultTaxId = "Default Tax is required";
    if (!pricingData.sellingItemAs)
      errors.sellingItemAs = "Selling Item As is required";

    // HSN/SAC Code validation
    if (pricingData.sellingItemAs === "goods" && !pricingData.hsnCode?.trim()) {
      errors.hsnCode = "HSN Code is required";
    }
    if (
      pricingData.sellingItemAs === "service" &&
      !pricingData.sacCode?.trim()
    ) {
      errors.sacCode = "SAC Code is required";
    }

    if (!pricingData.priceTypeId) errors.priceTypeId = "Price Type is required";
    if (!pricingData.standardSalePrice)
      errors.standardSalePrice = "Standard Sale Price is required";
    if (!pricingData.netCostMrp)
      errors.netCostMrp = "Net Cost (MRP) is required";

    setPricingErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const loadItemData = useCallback(async (itemId) => {
    try {
      setFormLoading(true);
      const response = await ItemService.getItemById(itemId);

      if (response.success && response.data) {
        const itemData = response.data;

        // Set form data
        setFormData({
          masterCategoryId: itemData.mastercategoryid,
          categoryId: itemData.categoryid,
          subCategoryId: itemData.subcategoryid,
          brandId: itemData.brandid,
          itemName: itemData.itemname || "",
          displayName: itemData.itemdisplayname || "",
          genericName: itemData.genericname || "",
          itemCode: itemData.itemcode || "",
          safetyQuantity: itemData.safetyquantity?.toString() || "",
          baseUnitId: itemData.baseunit,
          packageUom: itemData.packageuom,
          packageQuantity: itemData.packingqty?.toString() || "",
          itemImage: null, // Keep as null for edit mode, will show existing image separately
        });

        // Set pricing data
        setPricingData({
          defaultTaxId: itemData.defaulttaxprofileid,
          sellingItemAs: itemData.sellingitemas === 1 ? "service" : "goods",
          hsnCode:
            itemData.sellingitemas === 2 ? itemData.hsnseccode || "" : "",
          sacCode:
            itemData.sellingitemas === 1 ? itemData.hsnseccode || "" : "",
          priceTypeId: itemData.pricetype,
          standardSalePrice: itemData.sellingprice?.toString() || "",
          standardPurchasePrice: itemData.purchaseprice?.toString() || "",
          netCostMrp: itemData.netcost?.toString() || "",
          wholesalePrice: itemData.wholesaleprice?.toString() || "",
          ingredients: itemData.ingredients || "",
          description: itemData.description || "",
          ignoreTax: itemData.ignoretax === 1,
          ignoreDiscount: itemData.ignorediscount === 1,
          isNegativeSale: itemData.isnegativesale === 1,
        });

        // Set existing image preview if available
        if (itemData.imgpath) {
          // Handle both old format (string) and new format (object with key/value)
          if (typeof itemData.imgpath === "object" && itemData.imgpath.value) {
            setImagePreview(itemData.imgpath.value);
            setImagePreviewName(itemData.imgpath.key || "Current Image");
          } else if (typeof itemData.imgpath === "string") {
            setImagePreview(itemData.imgpath);
            setImagePreviewName("Current Image");
          }
        }

        // Reset image changed flag when loading existing data
        setImageChanged(false);

        // Load dependent dropdown data
        if (itemData.mastercategoryid) {
          await loadCategoryData(itemData.mastercategoryid);
        }
        if (itemData.categoryid) {
          await loadSubCategoryData(itemData.categoryid);
        }
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail:
            response.error?.details?.[0]?.message ||
            response.message ||
            "Failed to load item data",
          life: 3000,
        });
      }
    } catch (error) {
      console.error("Error loading item data:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message || error.message || "Failed to load item data",
        life: 3000,
      });
    } finally {
      setFormLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load initial dropdown data
    loadMasterCategoryData();
    loadBrandData();
    loadBaseUnitData();
    loadTaxProfileData();

    // Static price type data
    setPriceTypeList([
      { label: "Fixed Price", value: 1 },
      { label: "Variable Price", value: 2 },
    ]);

    // Load item data if editing
    if (id) {
      loadItemData(id);
    }
  }, [id, loadItemData]);

  const handleItemCodeChange = (e) => {
    const raw = e.target.value || "";
    const alphaNumericOnly = raw.replace(/[^A-Za-z0-9]/g, "").slice(0, 20); // keep alphanumeric, cap at 20
    setFormData((prev) => ({ ...prev, itemCode: alphaNumericOnly }));
    setFormErrors((prev) => ({ ...prev, itemCode: null }));
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

  const handlePricingChange = (field, value) => {
    setPricingData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setPricingErrors((prev) => ({
      ...prev,
      [field]: null,
    }));
  };

  const handleRemoveImage = () => {
    handleChange("itemImage", null);
    setImagePreview(null);
    setImagePreviewName(null);
    setShowRemoveDialog(false);
    setFormErrors((prev) => ({ ...prev, itemImage: null }));
    setImageChanged(true); // Mark image as changed when removed
  };

  // API call functions for category dropdowns
  const loadMasterCategoryData = async () => {
    try {
      setMasterCategoryLoading(true);
      const data = await CommonApi.getMasterCategoryList();
      setMasterCategoryList(data);
    } catch (error) {
      console.error("Error loading master category data:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          "Failed to load master category data",
        life: 3000,
      });
    } finally {
      setMasterCategoryLoading(false);
    }
  };

  const loadCategoryData = async (masterCategoryId) => {
    try {
      setCategoryLoading(true);
      const data = await CommonApi.getCategoryList(masterCategoryId);
      setCategoryList(data);
    } catch (error) {
      console.error("Error loading category data:", error);
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
      setCategoryLoading(false);
    }
  };

  const loadSubCategoryData = async (categoryId) => {
    try {
      setSubCategoryLoading(true);
      const data = await CommonApi.getSubCategoryList(categoryId);
      setSubCategoryList(data);
    } catch (error) {
      console.error("Error loading sub category data:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          "Failed to load sub category data",
        life: 3000,
      });
    } finally {
      setSubCategoryLoading(false);
    }
  };

  const loadBrandData = async () => {
    try {
      setBrandLoading(true);
      const data = await CommonApi.getBrandList();
      setBrandList(data);
    } catch (error) {
      console.error("Error loading brand data:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message || error.message || "Failed to load brand data",
        life: 3000,
      });
    } finally {
      setBrandLoading(false);
    }
  };

  const loadBaseUnitData = async () => {
    try {
      setBaseUnitLoading(true);
      const data = await CommonApi.getBaseUnitList();
      setBaseUnitList(data);
    } catch (error) {
      console.error("Error loading base unit data:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          "Failed to load base unit data",
        life: 3000,
      });
    } finally {
      setBaseUnitLoading(false);
    }
  };

  const loadTaxProfileData = async () => {
    try {
      setTaxProfileLoading(true);
      const data = await CommonApi.getDropdownData("taxprofile");
      setDefaultTaxList(data);
    } catch (error) {
      console.error("Error loading tax profile data:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          "Failed to load tax profile data",
        life: 3000,
      });
    } finally {
      setTaxProfileLoading(false);
    }
  };

  // Enhanced handleChange to handle dropdown dependencies
  const handleCategoryDropdownChange = (field, value) => {
    if (field === "masterCategoryId") {
      // Reset dependent dropdowns
      setFormData((prev) => ({
        ...prev,
        [field]: value,
        categoryId: null,
        subCategoryId: null,
      }));
      setCategoryList([]);
      setSubCategoryList([]);

      // Load category data if master category is selected
      if (value) {
        loadCategoryData(value);
      }
    } else if (field === "categoryId") {
      // Reset sub category dropdown
      setFormData((prev) => ({
        ...prev,
        [field]: value,
        subCategoryId: null,
      }));
      setSubCategoryList([]);

      // Load sub category data if category is selected
      if (value) {
        loadSubCategoryData(value);
      }
    } else {
      // Handle sub category or other fields normally
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
    const isItemMasterValid = validateForm();
    const isPricingValid = validatePricingForm();

    if (!isItemMasterValid || !isPricingValid) {
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

      // Create payload object with proper data types
      const payload = {
        // Basic item information (strings)
        itemname: formData.itemName,
        itemdisplayname: formData.displayName || "",
        genericname: formData.genericName || "",
        itemcode: formData.itemCode || "",

        // IDs (numbers) - only include if they have valid values
        mastercategoryid: parseInt(formData.masterCategoryId),
        categoryid: parseInt(formData.categoryId),
        brandid: parseInt(formData.brandId),
        baseunit: parseInt(formData.baseUnitId),
        defaulttaxprofileid: parseInt(pricingData.defaultTaxId),
        pricetype: parseInt(pricingData.priceTypeId),
        defaultuom: parseInt(formData.baseUnitId),

        // Quantities and prices (numbers)
        sellingprice: parseFloat(pricingData.standardSalePrice),
        netcost: parseFloat(pricingData.netCostMrp),

        // Flags (numbers: 1 or 0)
        sellingitemas: pricingData.sellingItemAs === "service" ? 1 : 2,
        ignoretax: pricingData.ignoreTax ? 1 : 0,
        ignorediscount: pricingData.ignoreDiscount ? 1 : 0,
        isnegativesale: pricingData.isNegativeSale ? 1 : 0,

        // Text fields (strings)
        hsnseccode:
          pricingData.sellingItemAs === "goods"
            ? pricingData.hsnCode || ""
            : pricingData.sacCode || "",
        ingredients: pricingData.ingredients || "",
        description: pricingData.description || "",
      };

      // Only include imgpath if image was changed (for updates) or if creating new item
      if (!id || imageChanged) {
        payload.imgpath = formData.itemImage || "";
      }

      // Add optional fields - send null for dropdowns and "" for strings if not present
      // Dropdown fields - send null if not selected
      payload.subcategoryid = formData.subCategoryId
        ? parseInt(formData.subCategoryId)
        : null;

      // Package UOM and Quantity are now required
      payload.packageuom = parseInt(formData.packageUom);
      payload.packingqty = parseFloat(formData.packageQuantity);

      // Numeric fields - send null if empty or not provided
      payload.safetyquantity =
        formData.safetyQuantity && formData.safetyQuantity.trim() !== ""
          ? parseFloat(formData.safetyQuantity)
          : null;

      payload.purchaseprice =
        pricingData.standardPurchasePrice &&
        pricingData.standardPurchasePrice.toString().trim() !== ""
          ? parseFloat(pricingData.standardPurchasePrice)
          : null;

      payload.wholesaleprice =
        pricingData.wholesalePrice &&
        pricingData.wholesalePrice.toString().trim() !== ""
          ? parseFloat(pricingData.wholesalePrice)
          : null;

      // Create FormData for API call (if API requires FormData)
      const formdata = new FormData();
      Object.keys(payload).forEach((key) => {
        if (payload[key] !== undefined) {
          // Send null values as "null" string or empty string based on field type
          if (payload[key] === null) {
            // For dropdown fields, send null as empty string
            if (key.includes("id") || key.includes("uom")) {
              formdata.append(key, "");
            } else {
              formdata.append(key, "");
            }
          } else {
            formdata.append(key, payload[key]);
          }
        }
      });

      // Call API to create or update item
      const result = id
        ? await ItemService.updateItem(id, formdata)
        : await ItemService.createItem(formdata);

      if (result.success) {
        toast.current?.show({
          severity: "success",
          summary: "Success",
          detail: result.message || "Operation completed successfully",
          life: 3000,
        });

        // Navigate back to list after success
        navigate("/master-records/inventory/item/item-list");
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail:
            result.error?.details?.[0]?.message ||
            result.message ||
            `Failed to ${id ? "update" : "add"} Item`,
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
          (id ? "Failed to update Item" : "Failed to add Item"),
        life: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page title={id ? "Update Item" : "Add Item"}>
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {id ? "Update Item" : "Add Item"}
                </h3>
                <Button
                  label="Back"
                  icon="pi pi-arrow-left"
                  className="p-button-sm"
                  severity="secondary"
                  onClick={() =>
                    navigate("/master-records/inventory/item/item-list")
                  }
                />
              </div>

              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Master Category */}
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
                          Master Category{" "}
                          <span className="text-red-600">*</span>
                        </label>
                        <Dropdown
                          value={formData.masterCategoryId}
                          options={masterCategoryList}
                          onChange={(e) =>
                            handleCategoryDropdownChange(
                              "masterCategoryId",
                              e.value,
                            )
                          }
                          placeholder="Select Master Category"
                          showClear
                          filter
                          loading={masterCategoryLoading}
                          className={
                            formErrors.masterCategoryId ? "p-invalid" : ""
                          }
                        />
                        {formErrors.masterCategoryId && (
                          <small className="p-error">
                            {formErrors.masterCategoryId}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Category */}
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
                          Category <span className="text-red-600">*</span>
                        </label>
                        <Dropdown
                          value={formData.categoryId}
                          options={categoryList}
                          onChange={(e) =>
                            handleCategoryDropdownChange("categoryId", e.value)
                          }
                          placeholder="Select Category"
                          showClear
                          filter
                          loading={categoryLoading}
                          disabled={!formData.masterCategoryId}
                          className={formErrors.categoryId ? "p-invalid" : ""}
                        />
                        {formErrors.categoryId && (
                          <small className="p-error">
                            {formErrors.categoryId}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Sub Category */}
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
                          Sub Category
                        </label>
                        <Dropdown
                          value={formData.subCategoryId}
                          options={subCategoryList}
                          onChange={(e) =>
                            handleCategoryDropdownChange(
                              "subCategoryId",
                              e.value,
                            )
                          }
                          placeholder="Select Sub Category"
                          showClear
                          filter
                          loading={subCategoryLoading}
                          disabled={!formData.categoryId}
                          className={
                            formErrors.subCategoryId ? "p-invalid" : ""
                          }
                        />
                        {formErrors.subCategoryId && (
                          <small className="p-error">
                            {formErrors.subCategoryId}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Brand */}
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
                          Brand <span className="text-red-600">*</span>
                        </label>
                        <Dropdown
                          value={formData.brandId}
                          options={brandList}
                          onChange={(e) => handleChange("brandId", e.value)}
                          placeholder="Select Brand"
                          showClear
                          filter
                          loading={brandLoading}
                          className={formErrors.brandId ? "p-invalid" : ""}
                        />
                        {formErrors.brandId && (
                          <small className="p-error">
                            {formErrors.brandId}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Item Name */}
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
                          Item Name <span className="text-red-600">*</span>
                        </label>
                        <InputText
                          value={formData.itemName}
                          onChange={(e) =>
                            handleChange("itemName", e.target.value)
                          }
                          placeholder="Enter Item Name"
                          className={formErrors.itemName ? "p-invalid" : ""}
                        />
                        {formErrors.itemName && (
                          <small className="p-error">
                            {formErrors.itemName}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Display Name */}
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
                          Display Name
                        </label>
                        <InputText
                          value={formData.displayName}
                          onChange={(e) =>
                            handleChange("displayName", e.target.value)
                          }
                          placeholder="Enter Display Name"
                          className={formErrors.displayName ? "p-invalid" : ""}
                        />
                        {formErrors.displayName && (
                          <small className="p-error">
                            {formErrors.displayName}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Generic Name */}
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
                          Generic Name
                        </label>
                        <InputText
                          value={formData.genericName}
                          onChange={(e) =>
                            handleChange("genericName", e.target.value)
                          }
                          placeholder="Enter Generic Name"
                          className={formErrors.genericName ? "p-invalid" : ""}
                        />
                        {formErrors.genericName && (
                          <small className="p-error">
                            {formErrors.genericName}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Item Code */}
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
                          Item Code
                        </label>
                        <InputText
                          value={formData.itemCode}
                          onChange={handleItemCodeChange}
                          placeholder="Enter Item Code"
                          maxLength={20}
                          keyfilter="alphanum" // PrimeReact filter for alphanumeric
                          className={formErrors.itemCode ? "p-invalid" : ""}
                        />
                        {formErrors.itemCode && (
                          <small className="p-error">
                            {formErrors.itemCode}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Safety Quantity */}
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
                          Safety Quantity
                        </label>
                        <InputText
                          value={formData.safetyQuantity}
                          onChange={(e) =>
                            handleChange("safetyQuantity", e.target.value)
                          }
                          placeholder="Enter Safety Quantity"
                          keyfilter="pnum"
                          className={
                            formErrors.safetyQuantity ? "p-invalid" : ""
                          }
                        />
                        {formErrors.safetyQuantity && (
                          <small className="p-error">
                            {formErrors.safetyQuantity}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Base Unit */}
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
                          Base Unit <span className="text-red-600">*</span>
                        </label>
                        <Dropdown
                          value={formData.baseUnitId}
                          options={baseUnitList}
                          onChange={(e) => handleChange("baseUnitId", e.value)}
                          placeholder="Select Base Unit"
                          showClear
                          filter
                          loading={baseUnitLoading}
                          className={formErrors.baseUnitId ? "p-invalid" : ""}
                        />
                        {formErrors.baseUnitId && (
                          <small className="p-error">
                            {formErrors.baseUnitId}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Package UOM */}
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
                          Package UOM <span className="text-red-600">*</span>
                        </label>
                        <Dropdown
                          value={formData.packageUom}
                          options={baseUnitList}
                          onChange={(e) => handleChange("packageUom", e.value)}
                          placeholder="Select Package UOM"
                          showClear
                          filter
                          loading={baseUnitLoading}
                          className={formErrors.packageUom ? "p-invalid" : ""}
                        />
                        {formErrors.packageUom && (
                          <small className="p-error">
                            {formErrors.packageUom}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Package Quantity */}
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
                          Package Quantity{" "}
                          <span className="text-red-600">*</span>
                        </label>
                        <InputNumber
                          value={formData.packageQuantity}
                          onValueChange={(e) =>
                            handleChange("packageQuantity", e.value)
                          }
                          placeholder="Enter Package Quantity"
                          min={0}
                          minFractionDigits={0}
                          maxFractionDigits={0}
                          className={
                            formErrors.packageQuantity
                              ? "p-invalid w-full"
                              : "w-full"
                          }
                          pt={{
                            input: {
                              root: {
                                className: "w-full",
                              },
                            },
                          }}
                        />
                        {formErrors.packageQuantity && (
                          <small className="p-error">
                            {formErrors.packageQuantity}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Item Image */}
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
                              Item Image
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
                                    itemImage:
                                      "File size should be less than 2MB",
                                  }));
                                  handleChange("itemImage", null);
                                  setImagePreview(null);
                                  setImagePreviewName(null);
                                } else {
                                  setFormErrors((prev) => ({
                                    ...prev,
                                    itemImage: null,
                                  }));
                                  handleChange("itemImage", e.files[0]);
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
                                formErrors.itemImage ? "p-invalid" : ""
                              }
                            />
                            {formErrors.itemImage && (
                              <small className="p-error">
                                {formErrors.itemImage}
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
                                        formData.itemImage?.name ||
                                        imagePreviewName ||
                                        "Current Image"
                                      }
                                    >
                                      {formData.itemImage?.name ||
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
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Pricing and GST</h3>
              </div>

              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Default Tax */}
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
                          Default Tax <span className="text-red-600">*</span>
                        </label>
                        <Dropdown
                          value={pricingData.defaultTaxId}
                          options={defaultTaxList}
                          onChange={(e) =>
                            handlePricingChange("defaultTaxId", e.value)
                          }
                          placeholder="Select Default Tax"
                          showClear
                          filter
                          loading={taxProfileLoading}
                          className={
                            pricingErrors.defaultTaxId
                              ? "p-invalid w-full"
                              : "w-full"
                          }
                        />
                        {pricingErrors.defaultTaxId && (
                          <small className="p-error">
                            {pricingErrors.defaultTaxId}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Selling Item As */}
                  <div className="input-root">
                    {formLoading ? (
                      <>
                        <Skeleton
                          width="40%"
                          height="1.25rem"
                          className="mt-2 mb-2"
                        />
                        <div className="mt-2 flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Skeleton shape="circle" size="1.5rem" />
                            <Skeleton width="3.5rem" height="1rem" />
                          </div>
                          <div className="flex items-center gap-2">
                            <Skeleton shape="circle" size="1.5rem" />
                            <Skeleton width="3.5rem" height="1rem" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <label className="label-default text-base font-semibold">
                          Selling Item As{" "}
                          <span className="text-red-600">*</span>
                        </label>
                        <div className="mt-2 flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <RadioButton
                              inputId="goods"
                              name="sellingItemAs"
                              value="goods"
                              onChange={(e) =>
                                handlePricingChange("sellingItemAs", e.value)
                              }
                              checked={pricingData.sellingItemAs === "goods"}
                            />
                            <label htmlFor="goods">Goods</label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioButton
                              inputId="service"
                              name="sellingItemAs"
                              value="service"
                              onChange={(e) =>
                                handlePricingChange("sellingItemAs", e.value)
                              }
                              checked={pricingData.sellingItemAs === "service"}
                            />
                            <label htmlFor="service">Service</label>
                          </div>
                        </div>
                        {pricingErrors.sellingItemAs && (
                          <small className="p-error">
                            {pricingErrors.sellingItemAs}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* HSN Code / SAC Code */}
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
                          {pricingData.sellingItemAs === "goods"
                            ? "HSN Code"
                            : "SAC Code"}{" "}
                          <span className="text-red-600">*</span>
                        </label>
                        <InputText
                          value={
                            pricingData.sellingItemAs === "goods"
                              ? pricingData.hsnCode
                              : pricingData.sacCode
                          }
                          onChange={(e) =>
                            handlePricingChange(
                              pricingData.sellingItemAs === "goods"
                                ? "hsnCode"
                                : "sacCode",
                              e.target.value,
                            )
                          }
                          placeholder={`Enter ${pricingData.sellingItemAs === "goods" ? "HSN" : "SAC"} Code`}
                          className={
                            (pricingData.sellingItemAs === "goods" &&
                              pricingErrors.hsnCode) ||
                            (pricingData.sellingItemAs === "service" &&
                              pricingErrors.sacCode)
                              ? "p-invalid w-full"
                              : "w-full"
                          }
                        />
                        {pricingData.sellingItemAs === "goods" &&
                          pricingErrors.hsnCode && (
                            <small className="p-error">
                              {pricingErrors.hsnCode}
                            </small>
                          )}
                        {pricingData.sellingItemAs === "service" &&
                          pricingErrors.sacCode && (
                            <small className="p-error">
                              {pricingErrors.sacCode}
                            </small>
                          )}
                      </>
                    )}
                  </div>

                  {/* Price Type */}
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
                          Price Type <span className="text-red-600">*</span>
                        </label>
                        <Dropdown
                          value={pricingData.priceTypeId}
                          options={priceTypeList}
                          onChange={(e) =>
                            handlePricingChange("priceTypeId", e.value)
                          }
                          placeholder="Select Price Type"
                          showClear
                          filter
                          className={
                            pricingErrors.priceTypeId
                              ? "p-invalid w-full"
                              : "w-full"
                          }
                        />
                        {pricingErrors.priceTypeId && (
                          <small className="p-error">
                            {pricingErrors.priceTypeId}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Standard Sale Price */}
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
                          Standard Sale Price{" "}
                          <span className="text-red-600">*</span>
                        </label>
                        <InputNumber
                          value={
                            parseFloat(pricingData.standardSalePrice) || null
                          }
                          onValueChange={(e) =>
                            handlePricingChange("standardSalePrice", e.value)
                          }
                          placeholder="Enter Standard Sale Price"
                          mode="currency"
                          currency="INR"
                          locale="en-IN"
                          minFractionDigits={2}
                          className={
                            pricingErrors.standardSalePrice
                              ? "p-invalid w-full"
                              : "w-full"
                          }
                          pt={{
                            input: {
                              root: {
                                className: "w-full",
                              },
                            },
                          }}
                        />
                        {pricingErrors.standardSalePrice && (
                          <small className="p-error">
                            {pricingErrors.standardSalePrice}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Standard Purchase Price */}
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
                          Standard Purchase Price
                        </label>
                        <InputNumber
                          value={
                            parseFloat(pricingData.standardPurchasePrice) ||
                            null
                          }
                          onValueChange={(e) =>
                            handlePricingChange(
                              "standardPurchasePrice",
                              e.value,
                            )
                          }
                          placeholder="Enter Standard Purchase Price"
                          mode="currency"
                          currency="INR"
                          locale="en-IN"
                          minFractionDigits={2}
                          className={
                            pricingErrors.standardPurchasePrice
                              ? "p-invalid w-full"
                              : "w-full"
                          }
                          pt={{
                            input: {
                              root: {
                                className: "w-full",
                              },
                            },
                          }}
                        />
                        {pricingErrors.standardPurchasePrice && (
                          <small className="p-error">
                            {pricingErrors.standardPurchasePrice}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Net Cost (MRP) */}
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
                          Net Cost (MRP) <span className="text-red-600">*</span>
                        </label>
                        <InputNumber
                          value={parseFloat(pricingData.netCostMrp) || null}
                          onValueChange={(e) =>
                            handlePricingChange("netCostMrp", e.value)
                          }
                          placeholder="Enter Net Cost (MRP)"
                          mode="currency"
                          currency="INR"
                          locale="en-IN"
                          minFractionDigits={2}
                          className={
                            pricingErrors.netCostMrp
                              ? "p-invalid w-full"
                              : "w-full"
                          }
                          pt={{
                            input: {
                              root: {
                                className: "w-full",
                              },
                            },
                          }}
                        />
                        {pricingErrors.netCostMrp && (
                          <small className="p-error">
                            {pricingErrors.netCostMrp}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Wholesale Price */}
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
                          Wholesale Price
                        </label>
                        <InputNumber
                          value={parseFloat(pricingData.wholesalePrice) || null}
                          onValueChange={(e) =>
                            handlePricingChange("wholesalePrice", e.value)
                          }
                          placeholder="Enter Wholesale Price"
                          mode="currency"
                          currency="INR"
                          locale="en-IN"
                          minFractionDigits={2}
                          className={
                            pricingErrors.wholesalePrice
                              ? "p-invalid w-full"
                              : "w-full"
                          }
                          pt={{
                            input: {
                              root: {
                                className: "w-full",
                              },
                            },
                          }}
                        />
                        {pricingErrors.wholesalePrice && (
                          <small className="p-error">
                            {pricingErrors.wholesalePrice}
                          </small>
                        )}
                      </>
                    )}
                  </div>

                  {/* Ingredients */}
                  <div className="input-root">
                    {formLoading ? (
                      <>
                        <Skeleton
                          width="40%"
                          height="1.25rem"
                          className="mt-2 mb-2"
                        />
                        <Skeleton width="100%" height="5rem" />
                      </>
                    ) : (
                      <>
                        <label className="label-default text-base font-semibold">
                          Ingredients
                        </label>
                        <InputTextarea
                          value={pricingData.ingredients}
                          onChange={(e) =>
                            handlePricingChange("ingredients", e.target.value)
                          }
                          placeholder="Enter Ingredients"
                          rows={3}
                          className="w-full"
                        />
                      </>
                    )}
                  </div>

                  {/* Description */}
                  <div className="input-root">
                    {formLoading ? (
                      <>
                        <Skeleton
                          width="40%"
                          height="1.25rem"
                          className="mt-2 mb-2"
                        />
                        <Skeleton width="100%" height="5rem" />
                      </>
                    ) : (
                      <>
                        <label className="label-default text-base font-semibold">
                          Description
                        </label>
                        <InputTextarea
                          value={pricingData.description}
                          onChange={(e) =>
                            handlePricingChange("description", e.target.value)
                          }
                          placeholder="Enter Description for Barcode Print - [This is Printed in Barcode Print]"
                          rows={3}
                          className="w-full"
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Switch Controls Group */}
                <div className="mt-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Ignore Tax */}
                    <div className="input-root">
                      {formLoading ? (
                        <>
                          <Skeleton
                            width="30%"
                            height="1.25rem"
                            className="mt-2 mb-2"
                          />
                          <div className="mt-2 flex items-center gap-2">
                            <Skeleton
                              width="3rem"
                              height="1.75rem"
                              borderRadius="1rem"
                            />
                            <Skeleton width="1.25rem" height="1rem" />
                          </div>
                        </>
                      ) : (
                        <>
                          <label className="label-default text-base font-semibold">
                            Ignore Tax
                          </label>
                          <div className="mt-2 flex items-center gap-2">
                            <InputSwitch
                              checked={pricingData.ignoreTax}
                              onChange={(e) =>
                                handlePricingChange("ignoreTax", e.value)
                              }
                            />
                            <span>{pricingData.ignoreTax ? "Yes" : "No"}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Ignore Discount */}
                    <div className="input-root">
                      {formLoading ? (
                        <>
                          <Skeleton
                            width="30%"
                            height="1.25rem"
                            className="mt-2 mb-2"
                          />
                          <div className="mt-2 flex items-center gap-2">
                            <Skeleton
                              width="3rem"
                              height="1.75rem"
                              borderRadius="1rem"
                            />
                            <Skeleton width="1.25rem" height="1rem" />
                          </div>
                        </>
                      ) : (
                        <>
                          <label className="label-default text-base font-semibold">
                            Ignore Discount
                          </label>
                          <div className="mt-2 flex items-center gap-2">
                            <InputSwitch
                              checked={pricingData.ignoreDiscount}
                              onChange={(e) =>
                                handlePricingChange("ignoreDiscount", e.value)
                              }
                            />
                            <span>
                              {pricingData.ignoreDiscount ? "Yes" : "No"}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Is Negative Sale */}
                    <div className="input-root">
                      {formLoading ? (
                        <>
                          <Skeleton
                            width="30%"
                            height="1.25rem"
                            className="mt-2 mb-2"
                          />
                          <div className="mt-2 flex items-center gap-2">
                            <Skeleton
                              width="3rem"
                              height="1.75rem"
                              borderRadius="1rem"
                            />
                            <Skeleton width="1.25rem" height="1rem" />
                          </div>
                        </>
                      ) : (
                        <>
                          <label className="label-default text-base font-semibold">
                            Is Negative Sale
                          </label>
                          <div className="mt-2 flex items-center gap-2">
                            <InputSwitch
                              checked={pricingData.isNegativeSale}
                              onChange={(e) =>
                                handlePricingChange("isNegativeSale", e.value)
                              }
                            />
                            <span>
                              {pricingData.isNegativeSale ? "Yes" : "No"}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Add Item Button */}
                <div className="mt-6 flex justify-end gap-2">
                  <Button
                    label={
                      loading
                        ? id
                          ? "Updating..."
                          : "Adding..."
                        : id
                          ? "Update Item"
                          : "Add Item"
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
