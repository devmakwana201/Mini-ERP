import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApprovalService } from "services/approvals/approval";
import { CompanyService } from "services/subscription-management/companies";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { Skeleton } from "primereact/skeleton";
import { FilterMatchMode } from "primereact/api";
import { scrollToTop } from "utils/scrollToTop";
import EmptyMessage from "components/shared/EmptyMessage";
import { Checkbox } from "primereact/checkbox";

export default function ApprovalsManagement() {
  const toast = useRef(null);
  const [approvalType, setApprovalType] = useState("brand"); // 'brand' or 'item'
  const [dataList, setDataList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);

  // Company filter states
  const [showAllCompanies, setShowAllCompanies] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyList, setCompanyList] = useState([]);
  const [companyLoading, setCompanyLoading] = useState(false);

  // Approval/Rejection dialog states
  const [actionDialog, setActionDialog] = useState(false);
  const [actionType, setActionType] = useState(""); // 'approve' or 'reject'
  const [actionRemark, setActionRemark] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [singleItemAction, setSingleItemAction] = useState(null);

  // Rejection reasons
  const [rejectionReasons, setRejectionReasons] = useState([]);
  const [selectedRejectionReason, setSelectedRejectionReason] = useState(null);

  // Similar items expansion
  const [showSimilarItems, setShowSimilarItems] = useState(false);
  const [selectedMasterRecord, setSelectedMasterRecord] = useState(null); // For replacewith

  const [lazyParams, setLazyParams] = useState({
    first: 0,
    rows: 10,
    sortField: "createddate",
    sortOrder: -1,
  });

  const [totalRecords, setTotalRecords] = useState(0);

  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const approvalTypeOptions = [
    { label: "Brand Approvals", value: "brand" },
    { label: "Item Approvals", value: "item" },
    { label: "Supplier Approvals", value: "supplier" },
  ];

  // Load companies for dropdown
  const loadCompanies = async () => {
    try {
      setCompanyLoading(true);
      const response = await CompanyService.getFormattedCompanies({
        start: 0,
        length: -1,
        filters: {},
      });

      if (response.success && response.data) {
        const formattedCompanies = response.data.map((company) => ({
          label: company.companyname,
          value: company.companyid,
        }));
        setCompanyList(formattedCompanies);
      }
    } catch (error) {
      console.error("Error loading companies:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Failed to load companies",
        life: 3000,
      });
    } finally {
      setCompanyLoading(false);
    }
  };

  // Load rejection reasons based on approval type
  const loadRejectionReasons = async (type) => {
    try {
      let response;
      if (type === "item") {
        response = await ApprovalService.getItemRejectionReasons();
      } else if (type === "brand") {
        response = await ApprovalService.getBrandRejectionReasons();
      } else if (type === "supplier") {
        response = await ApprovalService.getSupplierRejectionReasons();
      }

      if (response && response.success && response.data) {
        const formattedReasons = response.data.map((reason) => ({
          label: reason.reason,
          value: reason.reason,
        }));
        setRejectionReasons(formattedReasons);
      } else {
        setRejectionReasons([]);
      }
    } catch (error) {
      console.error("Error loading rejection reasons:", error);
      setRejectionReasons([]);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  // Load rejection reasons when approval type changes
  useEffect(() => {
    loadRejectionReasons(approvalType);
  }, [approvalType]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setSelectedItems([]); // Clear selection when fetching new data

    try {
      let response;
      const params = {
        filters,
        start: lazyParams.first,
        length: lazyParams.rows,
        sortField: lazyParams.sortField,
        sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
        companyid: !showAllCompanies && selectedCompany ? selectedCompany : undefined,
      };

      if (approvalType === "brand") {
        response = await ApprovalService.getUnapprovedBrands(params);
      } else if (approvalType === "item") {
        response = await ApprovalService.getUnapprovedItems(params);
      } else if (approvalType === "supplier") {
        response = await ApprovalService.getUnapprovedSuppliers(params);
      }

      if (response.success) {
        setDataList(response.data);
        setTotalRecords(response.totalRecords);
      } else {
        console.error(`Failed to fetch ${approvalType}s:`, response.error);
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: response.error?.message || `Failed to load ${approvalType} data`,
          life: 3000,
        });
        setDataList([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error(`Error fetching ${approvalType} data:`, error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: error.error?.message || error.message || `Failed to load ${approvalType} data`,
        life: 3000,
      });
      setDataList([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams, approvalType, showAllCompanies, selectedCompany]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchData();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters, fetchData]);

  // Reset to first page when approval type or company filter changes
  useEffect(() => {
    setLazyParams((prev) => ({ ...prev, first: 0 }));
    setSelectedItems([]);
  }, [approvalType, showAllCompanies, selectedCompany]);

  const blankRow =
    approvalType === "brand"
      ? { brandname: "", branddesc: "", brandicon: "", brandcategory: "", categorynames: "", companyid: "", uniquekey: "" }
      : approvalType === "item"
      ? { itemname: "", itemcode: "", itembarcode: "", catname: "", brandname: "", sellingprice: "", companyid: "", uniquekey: "" }
      : { suppliername: "", address: "", gstno: "", phoneno: "", email: "", companyid: "", uniquekey: "" };

  const onGlobalFilterChange = (e) => {
    const value = e.target.value;
    const updatedFilters = {
      ...filters,
      global: { ...filters.global, value },
    };
    setFilters(updatedFilters);
  };

  // Open approval/rejection dialog
  const openActionDialog = (type, item = null) => {
    setActionType(type);
    setSingleItemAction(item);
    setActionRemark("");
    setSelectedRejectionReason(null);
    setShowSimilarItems(false);
    setSelectedMasterRecord(null);

    // If rejecting and has similar items, pre-select the first approved one
    if (type === "reject" && item) {
      let similarItems = [];
      if (approvalType === "item") {
        similarItems = item.similar_items || [];
      } else if (approvalType === "brand") {
        similarItems = item.similar_brands || [];
      } else if (approvalType === "supplier") {
        similarItems = item.similar_suppliers || [];
      }

      // Find first approved item to pre-select as master
      const firstApproved = similarItems.find(s => s.isapproved === 1);
      if (firstApproved) {
        // Set the ID based on type
        const masterId = approvalType === "item"
          ? firstApproved.itemid
          : approvalType === "brand"
          ? firstApproved.brandid
          : firstApproved.id;
        setSelectedMasterRecord(masterId);
      }
    }

    setActionDialog(true);
  };

  const hideActionDialog = () => {
    setActionDialog(false);
    setActionType("");
    setSingleItemAction(null);
    setActionRemark("");
    setSelectedRejectionReason(null);
    setShowSimilarItems(false);
    setSelectedMasterRecord(null);
  };

  // Handle approval or rejection
  const handleAction = async () => {
    if (!actionType) return;

    // Validate rejection reason for all types
    if (actionType === "reject" && !selectedRejectionReason) {
      toast.current?.show({
        severity: "warn",
        summary: "Warning",
        detail: "Please select a rejection reason",
        life: 3000,
      });
      return;
    }

    // Validate master record selection when rejecting as duplicate
    if (actionType === "reject" && singleItemAction) {
      const isDuplicateReason =
        selectedRejectionReason === "Duplicate Item" ||
        selectedRejectionReason === "Duplicate Brand" ||
        selectedRejectionReason === "Duplicate Supplier";

      let similarCount = 0;
      if (approvalType === "item") {
        similarCount = singleItemAction.similar_items_count || 0;
      } else if (approvalType === "brand") {
        similarCount = singleItemAction.similar_brands_count || 0;
      } else if (approvalType === "supplier") {
        similarCount = singleItemAction.similar_suppliers_count || 0;
      }

      // If user selected "Duplicate" as rejection reason
      if (isDuplicateReason) {
        // Check if similar items exist
        if (similarCount === 0) {
          toast.current?.show({
            severity: "error",
            summary: "Cannot Reject as Duplicate",
            detail: `No similar ${approvalType}s found in the system. Please select a different rejection reason.`,
            life: 4000,
          });
          return;
        }

        // Check if user has selected a master record
        if (!selectedMasterRecord) {
          toast.current?.show({
            severity: "warn",
            summary: "Selection Required",
            detail: "Please select which similar record to map to (expand Similar section below)",
            life: 4000,
          });
          setShowSimilarItems(true); // Auto-expand similar items section
          return;
        }
      }
    }

    try {
      setActionLoading(true);

      let response;
      const ids = singleItemAction
        ? [approvalType === "brand" ? singleItemAction.brandid : approvalType === "item" ? singleItemAction.itemid : singleItemAction.id]
        : selectedItems.map((item) =>
            approvalType === "brand" ? item.brandid : approvalType === "item" ? item.itemid : item.id
          );

      if (ids.length === 0) {
        toast.current?.show({
          severity: "warn",
          summary: "Warning",
          detail: "Please select at least one item",
          life: 3000,
        });
        return;
      }

      if (approvalType === "brand") {
        if (actionType === "approve") {
          response =
            ids.length === 1
              ? await ApprovalService.approveBrand(ids[0], actionRemark)
              : await ApprovalService.bulkApproveBrands(ids, actionRemark);
        } else {
          // For brand rejections, send reason, remark, and replacewith
          response =
            ids.length === 1
              ? await ApprovalService.rejectBrand(ids[0], selectedRejectionReason, actionRemark, selectedMasterRecord)
              : await ApprovalService.bulkRejectBrands(ids, selectedRejectionReason, actionRemark);
        }
      } else if (approvalType === "supplier") {
        if (actionType === "approve") {
          response =
            ids.length === 1
              ? await ApprovalService.approveSupplier(ids[0], actionRemark)
              : await ApprovalService.bulkApproveSuppliers(ids, actionRemark);
        } else {
          // For supplier rejections, send reason, remark, and replacewith
          response =
            ids.length === 1
              ? await ApprovalService.rejectSupplier(ids[0], selectedRejectionReason, actionRemark, selectedMasterRecord)
              : await ApprovalService.bulkRejectSuppliers(ids, selectedRejectionReason, actionRemark);
        }
      } else {
        // For items
        if (actionType === "approve") {
          response =
            ids.length === 1
              ? await ApprovalService.approveItem(ids[0], actionRemark)
              : await ApprovalService.bulkApproveItems(ids, actionRemark);
        } else {
          // For item rejections, send reason, remark, and replacewith
          response =
            ids.length === 1
              ? await ApprovalService.rejectItem(ids[0], selectedRejectionReason, actionRemark, selectedMasterRecord)
              : await ApprovalService.bulkRejectItems(ids, selectedRejectionReason, actionRemark);
        }
      }

      if (response.success) {
        toast.current?.show({
          severity: "success",
          summary: "Success",
          detail:
            response?.message ||
            `${approvalType === "brand" ? "Brand" : approvalType === "item" ? "Item" : "Supplier"}(s) ${actionType}d successfully`,
          life: 3000,
        });

        hideActionDialog();
        setSelectedItems([]);
        fetchData();
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail:
            response.error?.details?.[0]?.message ||
            response.message ||
            `Failed to ${actionType} ${approvalType}(s)`,
          life: 3000,
        });
      }
    } catch (error) {
      console.error(`Error ${actionType}ing ${approvalType}(s):`, error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          `Failed to ${actionType} ${approvalType}(s)`,
        life: 3000,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-4">
      {/* Title and Stats */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold sm:text-xl lg:text-2xl text-gray-800">
            Approval Management
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Review and approve synced {approvalType}s from POS systems
          </p>
        </div>

        {!isLoading && totalRecords > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2">
            <i className="pi pi-clock text-orange-600"></i>
            <div>
              <p className="text-xs text-gray-600">Pending Approval</p>
              <p className="text-xl font-bold text-orange-600">{totalRecords}</p>
            </div>
          </div>
        )}
      </div>

      {/* Type selector and Company Filter */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center gap-2">
          <i className="pi pi-filter text-gray-500"></i>
          <span className="text-sm font-medium text-gray-700">Filters:</span>
        </div>

        <Dropdown
          value={approvalType}
          options={approvalTypeOptions}
          onChange={(e) => setApprovalType(e.value)}
          placeholder="Select Type"
          className="w-full sm:w-56"
        />

        <div className="flex items-center gap-2 rounded border border-gray-300 bg-white px-3 py-2">
          <Checkbox
            inputId="showAllCompanies"
            checked={showAllCompanies}
            onChange={(e) => {
              setShowAllCompanies(e.checked);
              if (e.checked) {
                setSelectedCompany(null);
              }
            }}
          />
          <label htmlFor="showAllCompanies" className="text-sm font-medium cursor-pointer">
            All Companies
          </label>
        </div>

        {!showAllCompanies && (
          <Dropdown
            value={selectedCompany}
            options={companyList}
            onChange={(e) => setSelectedCompany(e.value)}
            placeholder="Select Company"
            className="w-full sm:w-64"
            loading={companyLoading}
            disabled={companyLoading}
            filter
            showClear
          />
        )}
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <IconField iconPosition="left" className="w-full sm:w-80">
          <InputIcon className="pi pi-search" />
          <InputText
            type="search"
            value={filters.global?.value || ""}
            onChange={onGlobalFilterChange}
            placeholder="Search by name, description, category..."
            className="w-full"
          />
        </IconField>

        {selectedItems.length > 0 && (
          <div className="flex gap-2 rounded-lg border-2 border-blue-200 bg-blue-50 p-2">
            <span className="flex items-center text-sm font-medium text-blue-700 px-2">
              {selectedItems.length} selected
            </span>
            <Button
              label="Approve All"
              icon="pi pi-check"
              size="small"
              severity="success"
              onClick={() => openActionDialog("approve")}
            />
            <Button
              label="Reject All"
              icon="pi pi-times"
              size="small"
              severity="danger"
              onClick={() => openActionDialog("reject")}
            />
          </div>
        )}
      </div>
    </div>
  );

  const actionBodyTemplate = (rowData) => {
    return isLoading ? (
      <div className="flex gap-1">
        <Skeleton width="2rem" height="2rem" />
        <Skeleton width="2rem" height="2rem" />
      </div>
    ) : (
      <div className="flex gap-2">
        <Button
          icon="pi pi-check"
          rounded
          severity="success"
          className="h-9 w-9 hover:shadow-lg transition-all"
          onClick={() => openActionDialog("approve", rowData)}
          tooltip="Approve"
          tooltipOptions={{ position: "top", showDelay: 300 }}
        />
        <Button
          icon="pi pi-times"
          rounded
          severity="danger"
          outlined
          className="h-9 w-9 hover:shadow-lg transition-all"
          onClick={() => openActionDialog("reject", rowData)}
          tooltip="Reject"
          tooltipOptions={{ position: "top", showDelay: 300 }}
        />
      </div>
    );
  };

  const nameBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="20%" height="1.5rem" />
    ) : (
      <span className="font-semibold text-gray-800">
        {approvalType === "brand"
          ? rowData.brandname || "-"
          : rowData.itemname || "-"}
      </span>
    );
  };

  const descBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="30%" height="1.5rem" />
    ) : (
      <span className="text-gray-700">
        {approvalType === "brand"
          ? rowData.branddesc || "-"
          : rowData.description || "-"}
      </span>
    );
  };

  const itemCodeBodyTemplate = (rowData) => {
    if (approvalType !== "item") return null;

    return isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span className="font-mono text-sm font-medium text-gray-800">
        {rowData.itemcode || "-"}
      </span>
    );
  };

  const itemBarcodeBodyTemplate = (rowData) => {
    if (approvalType !== "item") return null;

    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span className="font-mono text-sm text-gray-700">
        {rowData.itembarcode || "-"}
      </span>
    );
  };

  const itemCategoryBodyTemplate = (rowData) => {
    if (approvalType !== "item") return null;

    return isLoading ? (
      <Skeleton width="50%" height="1.5rem" />
    ) : (
      <div className="flex flex-col gap-1">
        {rowData.mastercatname && (
          <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
            {rowData.mastercatname}
          </span>
        )}
        {rowData.catname && (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
            {rowData.catname}
          </span>
        )}
        {rowData.subcatname && (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
            {rowData.subcatname}
          </span>
        )}
        {!rowData.mastercatname && !rowData.catname && !rowData.subcatname && (
          <span className="text-gray-400">-</span>
        )}
      </div>
    );
  };

  const itemBrandBodyTemplate = (rowData) => {
    if (approvalType !== "item") return null;

    return isLoading ? (
      <Skeleton width="50%" height="1.5rem" />
    ) : (
      <span className="font-medium text-gray-800">
        {rowData.brandname || "-"}
      </span>
    );
  };

  const itemPriceBodyTemplate = (rowData) => {
    if (approvalType !== "item") return null;

    return isLoading ? (
      <Skeleton width="40%" height="1.5rem" />
    ) : (
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-bold text-green-700">
          ₹{parseFloat(rowData.sellingprice || 0).toFixed(2)}
        </span>
        {rowData.purchaseprice > 0 && (
          <span className="text-xs text-gray-500">
            Cost: ₹{parseFloat(rowData.purchaseprice || 0).toFixed(2)}
          </span>
        )}
      </div>
    );
  };

  const itemImageBodyTemplate = (rowData) => {
    if (approvalType !== "item") return null;

    return (
      <div className="flex items-center justify-center">
        {isLoading ? (
          <Skeleton shape="circle" size="2.5rem" />
        ) : rowData.imgpath ? (
          <img
            src={rowData.imgpath}
            alt="Item"
            loading="lazy"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              objectFit: "contain",
              border: "1px solid #ddd",
            }}
            onError={(e) => {
              e.target.src = "/images/Thumbnail.png";
            }}
          />
        ) : (
          <div
            style={{
              width: "40px",
              height: "40px",
              backgroundColor: "#f8f9fa",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #ddd",
              color: "#6c757d",
            }}
          >
            <i className="pi pi-image"></i>
          </div>
        )}
      </div>
    );
  };

  const iconBodyTemplate = (rowData) => {
    if (approvalType !== "brand") return null;

    return (
      <div className="flex items-center justify-center">
        {isLoading ? (
          <Skeleton shape="circle" size="2.5rem" />
        ) : rowData.brandicon ? (
          <img
            src={rowData.brandicon}
            alt="Brand Logo"
            loading="lazy"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              objectFit: "contain",
              border: "1px solid #ddd",
            }}
            onError={(e) => {
              e.target.src = "/images/Thumbnail.png";
            }}
          />
        ) : (
          <div
            style={{
              width: "40px",
              height: "40px",
              backgroundColor: "#f8f9fa",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #ddd",
              color: "#6c757d",
            }}
          >
            <i className="pi pi-image"></i>
          </div>
        )}
      </div>
    );
  };

  const createdDateBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="50%" height="1.5rem" />
    ) : (
      <span>
        {rowData.createddate
          ? new Date(rowData.createddate).toLocaleString()
          : "-"}
      </span>
    );
  };

  const categoryBodyTemplate = (rowData) => {
    if (approvalType !== "brand") return null;

    return isLoading ? (
      <Skeleton width="40%" height="1.5rem" />
    ) : (
      <div className="flex flex-wrap gap-1">
        {rowData.categorynames ? (
          rowData.categorynames.split(",").map((catName, index) => (
            <span
              key={index}
              className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800"
            >
              {catName.trim()}
            </span>
          ))
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </div>
    );
  };

  const companyBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="40%" height="1.5rem" />
    ) : (
      <span>
        {companyList.find((c) => c.value === rowData.companyid)?.label ||
         `Company #${rowData.companyid}` || "-"}
      </span>
    );
  };

  const uniqueKeyBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : (
      <span className="font-mono text-xs">{rowData.uniquekey || "-"}</span>
    );
  };

  const ipAddressBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="50%" height="1.5rem" />
    ) : (
      <span className="font-mono text-xs">{rowData.ipaddress || "-"}</span>
    );
  };

  const similarItemsBodyTemplate = (rowData) => {
    // Get the count based on approval type
    let similarCount = 0;
    if (approvalType === "item") {
      similarCount = rowData.similar_items_count || 0;
    } else if (approvalType === "brand") {
      similarCount = rowData.similar_brands_count || 0;
    } else if (approvalType === "supplier") {
      similarCount = rowData.similar_suppliers_count || 0;
    }

    return isLoading ? (
      <Skeleton width="60%" height="1.5rem" />
    ) : similarCount > 0 ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 border border-amber-300">
        <i className="pi pi-exclamation-triangle text-xs"></i>
        {similarCount} similar
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
        <i className="pi pi-check text-xs"></i>
        No duplicates
      </span>
    );
  };

  return (
    <Page title="Approval Management">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : dataList
                }
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                emptyMessage={
                  <EmptyMessage
                    title={`No unapproved ${approvalType}s found`}
                    subtitle={`No ${approvalType}s are pending approval. All synced ${approvalType}s have been processed.`}
                  />
                }
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                onFilter={(e) => {
                  setIsLoading(true);
                  setFilters(e.filters);
                  setLazyParams((prev) => ({ ...prev, first: 0 }));
                  scrollToTop();
                }}
                onPage={(e) => {
                  setIsLoading(true);
                  setLazyParams((prev) => ({
                    ...prev,
                    first: e.first,
                    rows: e.rows,
                  }));
                  scrollToTop();
                }}
                onSort={(e) => {
                  setIsLoading(true);
                  setLazyParams((prev) => ({
                    ...prev,
                    sortField: e.sortField,
                    sortOrder: e.sortOrder,
                  }));
                  scrollToTop();
                }}
                rows={lazyParams.rows}
                first={lazyParams.first}
                totalRecords={totalRecords}
                sortField={lazyParams.sortField}
                sortOrder={lazyParams.sortOrder}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                rowsPerPageOptions={[10, 25, 50]}
                tableStyle={{ minWidth: "50rem" }}
                removableSort
                selection={selectedItems}
                onSelectionChange={(e) => setSelectedItems(e.value)}
                dataKey={approvalType === "brand" ? "brandid" : "itemid"}
              >
                <Column
                  selectionMode="multiple"
                  headerStyle={{ width: "3rem" }}
                  frozen
                />
                <Column
                  header="Action"
                  body={actionBodyTemplate}
                  style={{ width: "6rem" }}
                  frozen
                />
                <Column
                  header="Sr No."
                  body={(rowData, options) =>
                    isLoading ? (
                      <Skeleton width="30%" height="1.5rem" />
                    ) : (
                      lazyParams.first + options.rowIndex + 1
                    )
                  }
                  style={{ minWidth: "5rem" }}
                />
                <Column
                  field={approvalType === "brand" ? "brandname" : "itemname"}
                  header={approvalType === "brand" ? "Brand Name" : "Item Name"}
                  style={{ minWidth: "12rem" }}
                  body={nameBodyTemplate}
                  sortable
                />
                {approvalType === "brand" && (
                  <Column
                    field="brandicon"
                    header="Logo"
                    style={{ minWidth: "6rem" }}
                    headerStyle={{ display: "flex", justifyContent: "center" }}
                    body={iconBodyTemplate}
                  />
                )}
                {approvalType === "item" && (
                  <Column
                    field="imgpath"
                    header="Image"
                    style={{ minWidth: "6rem" }}
                    headerStyle={{ display: "flex", justifyContent: "center" }}
                    body={itemImageBodyTemplate}
                  />
                )}
                {approvalType === "item" && (
                  <Column
                    field="itemcode"
                    header="Item Code"
                    style={{ minWidth: "10rem" }}
                    body={itemCodeBodyTemplate}
                    sortable
                  />
                )}
                {approvalType === "item" && (
                  <Column
                    field="itembarcode"
                    header="Barcode"
                    style={{ minWidth: "12rem" }}
                    body={itemBarcodeBodyTemplate}
                    sortable
                  />
                )}
                <Column
                  field={approvalType === "brand" ? "branddesc" : "description"}
                  header="Description"
                  style={{ minWidth: "15rem" }}
                  body={descBodyTemplate}
                  sortable
                />
                {approvalType === "brand" && (
                  <Column
                    field="brandcategory"
                    header="Category"
                    style={{ minWidth: "10rem" }}
                    body={categoryBodyTemplate}
                    sortable
                  />
                )}
                {approvalType === "item" && (
                  <Column
                    field="catname"
                    header="Categories"
                    style={{ minWidth: "12rem" }}
                    body={itemCategoryBodyTemplate}
                    sortable
                  />
                )}
                {approvalType === "item" && (
                  <Column
                    field="brandname"
                    header="Brand"
                    style={{ minWidth: "10rem" }}
                    body={itemBrandBodyTemplate}
                    sortable
                  />
                )}
                {approvalType === "item" && (
                  <Column
                    field="sellingprice"
                    header="Price"
                    style={{ minWidth: "10rem" }}
                    body={itemPriceBodyTemplate}
                    sortable
                  />
                )}
                <Column
                  field={approvalType === "item" ? "similar_items_count" : approvalType === "brand" ? "similar_brands_count" : "similar_suppliers_count"}
                  header={`Similar ${approvalType === "item" ? "Items" : approvalType === "brand" ? "Brands" : "Suppliers"}`}
                  style={{ minWidth: "10rem" }}
                  body={similarItemsBodyTemplate}
                  sortable
                />
                <Column
                  field="companyid"
                  header="Company"
                  style={{ minWidth: "12rem" }}
                  body={companyBodyTemplate}
                  sortable
                />
                <Column
                  field="uniquekey"
                  header="Unique Key"
                  style={{ minWidth: "10rem" }}
                  body={uniqueKeyBodyTemplate}
                  sortable
                />
                <Column
                  field="ipaddress"
                  header="IP Address"
                  style={{ minWidth: "10rem" }}
                  body={ipAddressBodyTemplate}
                  sortable
                />
                <Column
                  field="createddate"
                  header="Synced On"
                  style={{ minWidth: "11rem" }}
                  body={createdDateBodyTemplate}
                  sortable
                />
              </DataTable>

              {/* Approval/Rejection Dialog */}
              <Dialog
                visible={actionDialog}
                style={{ width: "40rem" }}
                breakpoints={{ "960px": "75vw", "641px": "90vw" }}
                modal
                onHide={hideActionDialog}
                blockScroll={true}
                draggable={false}
                resizable={false}
                dismissableMask
                header={
                  <div className="flex items-center gap-3">
                    <i
                      className={`pi ${
                        actionType === "approve" ? "pi-check-circle text-green-600" : "pi-times-circle text-red-600"
                      } text-2xl`}
                    ></i>
                    <div>
                      <h3 className="text-lg font-bold">
                        {actionType === "approve" ? "Approve" : "Reject"}{" "}
                        {approvalType === "brand" ? "Brand" : approvalType === "item" ? "Item" : "Supplier"}
                        {singleItemAction ? "" : "s"}
                      </h3>
                      <p className="text-xs text-gray-500 font-normal">
                        {singleItemAction
                          ? "Review the details and provide your decision"
                          : `${selectedItems.length} ${approvalType}(s) will be ${actionType}d`}
                      </p>
                    </div>
                  </div>
                }
                footer={
                  <div className="flex justify-end gap-2">
                    <Button
                      label="Cancel"
                      icon="pi pi-times"
                      onClick={hideActionDialog}
                      disabled={actionLoading}
                      outlined
                    />
                    <Button
                      label={
                        actionLoading
                          ? actionType === "approve"
                            ? "Approving..."
                            : "Rejecting..."
                          : actionType === "approve"
                            ? "Approve"
                            : "Reject"
                      }
                      icon={
                        actionLoading
                          ? "pi pi-spin pi-spinner"
                          : actionType === "approve"
                            ? "pi pi-check"
                            : "pi pi-times"
                      }
                      severity={actionType === "approve" ? "success" : "danger"}
                      onClick={handleAction}
                      disabled={actionLoading}
                    />
                  </div>
                }
              >
                <div className="flex flex-col gap-4">
                  {/* Item Details Card */}
                  {singleItemAction && (
                    <div className="rounded-xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center gap-2 border-b border-gray-200 pb-3">
                        <i className="pi pi-info-circle text-blue-600"></i>
                        <h4 className="text-base font-bold text-gray-800">
                          {approvalType === "brand" ? "Brand" : approvalType === "item" ? "Item" : "Supplier"} Information
                        </h4>
                      </div>

                      {/* Brand/Item Image and Name */}
                      <div className="mb-4 flex items-start gap-4 rounded-lg bg-white p-3 shadow-sm">
                        {approvalType === "brand" && singleItemAction.brandicon && (
                          <img
                            src={singleItemAction.brandicon}
                            alt="Brand"
                            className="h-16 w-16 rounded-lg border-2 border-gray-200 object-contain"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        )}
                        {approvalType === "item" && singleItemAction.imgpath && (
                          <img
                            src={singleItemAction.imgpath}
                            alt="Item"
                            className="h-16 w-16 rounded-lg border-2 border-gray-200 object-contain"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        )}
                        <div className="flex-1">
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            {approvalType === "brand" ? "Brand" : approvalType === "item" ? "Item" : "Supplier"} Name
                          </label>
                          <p className="text-lg font-bold text-gray-900 mt-1">
                            {approvalType === "brand"
                              ? singleItemAction.brandname
                              : approvalType === "item"
                              ? singleItemAction.itemname
                              : singleItemAction.suppliername}
                          </p>
                          {approvalType === "brand" && singleItemAction.branddesc && (
                            <p className="text-sm text-gray-600 mt-1">
                              {singleItemAction.branddesc}
                            </p>
                          )}
                          {approvalType === "supplier" && singleItemAction.address && (
                            <p className="text-sm text-gray-600 mt-1">
                              {singleItemAction.address}
                            </p>
                          )}
                          {approvalType === "item" && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {singleItemAction.itemcode && (
                                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                  Code: {singleItemAction.itemcode}
                                </span>
                              )}
                              {singleItemAction.itembarcode && (
                                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                  Barcode: {singleItemAction.itembarcode}
                                </span>
                              )}
                            </div>
                          )}
                          {approvalType === "supplier" && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {singleItemAction.gstno && (
                                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                  GST: {singleItemAction.gstno}
                                </span>
                              )}
                              {singleItemAction.phoneno && (
                                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                  Phone: {singleItemAction.phoneno}
                                </span>
                              )}
                              {singleItemAction.email && (
                                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                  Email: {singleItemAction.email}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {approvalType === "brand" && singleItemAction.categorynames && (
                          <div className="rounded-lg bg-blue-50 p-3 border border-blue-200">
                            <label className="text-xs font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-1">
                              <i className="pi pi-tag text-xs"></i>
                              Categories
                            </label>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {singleItemAction.categorynames.split(",").map((catName, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm"
                                >
                                  {catName.trim()}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {approvalType === "item" && (singleItemAction.mastercatname || singleItemAction.catname || singleItemAction.subcatname) && (
                          <div className="rounded-lg bg-blue-50 p-3 border border-blue-200">
                            <label className="text-xs font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-1">
                              <i className="pi pi-tag text-xs"></i>
                              Categories
                            </label>
                            <div className="flex flex-col gap-1.5 mt-2">
                              {singleItemAction.mastercatname && (
                                <span className="inline-flex items-center rounded-full bg-purple-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                                  Master: {singleItemAction.mastercatname}
                                </span>
                              )}
                              {singleItemAction.catname && (
                                <span className="inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                                  Category: {singleItemAction.catname}
                                </span>
                              )}
                              {singleItemAction.subcatname && (
                                <span className="inline-flex items-center rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                                  Sub: {singleItemAction.subcatname}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {approvalType === "item" && singleItemAction.brandname && (
                          <div className="rounded-lg bg-indigo-50 p-3 border border-indigo-200">
                            <label className="text-xs font-semibold text-indigo-700 uppercase tracking-wide flex items-center gap-1">
                              <i className="pi pi-bookmark text-xs"></i>
                              Brand
                            </label>
                            <p className="font-bold text-indigo-900 mt-1.5">
                              {singleItemAction.brandname}
                            </p>
                          </div>
                        )}

                        {approvalType === "item" && (
                          <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-200">
                            <label className="text-xs font-semibold text-emerald-700 uppercase tracking-wide flex items-center gap-1">
                              <i className="pi pi-money-bill text-xs"></i>
                              Pricing
                            </label>
                            <div className="mt-1.5 space-y-1">
                              <p className="text-sm">
                                <span className="text-gray-600">Selling:</span>{" "}
                                <span className="font-bold text-emerald-900">
                                  ₹{parseFloat(singleItemAction.sellingprice || 0).toFixed(2)}
                                </span>
                              </p>
                              {singleItemAction.purchaseprice > 0 && (
                                <p className="text-sm">
                                  <span className="text-gray-600">Purchase:</span>{" "}
                                  <span className="font-bold text-emerald-900">
                                    ₹{parseFloat(singleItemAction.purchaseprice || 0).toFixed(2)}
                                  </span>
                                </p>
                              )}
                              {singleItemAction.wholesaleprice > 0 && (
                                <p className="text-sm">
                                  <span className="text-gray-600">Wholesale:</span>{" "}
                                  <span className="font-bold text-emerald-900">
                                    ₹{parseFloat(singleItemAction.wholesaleprice || 0).toFixed(2)}
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {approvalType === "item" && singleItemAction.description && (
                          <div className="rounded-lg bg-gray-50 p-3 border border-gray-200 col-span-full">
                            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1">
                              <i className="pi pi-align-left text-xs"></i>
                              Description
                            </label>
                            <p className="text-sm text-gray-800 mt-1.5">
                              {singleItemAction.description}
                            </p>
                          </div>
                        )}

                        <div className="rounded-lg bg-green-50 p-3 border border-green-200">
                          <label className="text-xs font-semibold text-green-700 uppercase tracking-wide flex items-center gap-1">
                            <i className="pi pi-building text-xs"></i>
                            Company
                          </label>
                          <p className="font-bold text-green-900 mt-1.5">
                            {companyList.find((c) => c.value === singleItemAction.companyid)
                              ?.label || `Company #${singleItemAction.companyid}`}
                          </p>
                        </div>

                        <div className="rounded-lg bg-purple-50 p-3 border border-purple-200">
                          <label className="text-xs font-semibold text-purple-700 uppercase tracking-wide flex items-center gap-1">
                            <i className="pi pi-key text-xs"></i>
                            Unique Key
                          </label>
                          <p className="font-mono text-sm font-bold text-purple-900 mt-1.5">
                            {singleItemAction.uniquekey}
                          </p>
                        </div>

                        <div className="rounded-lg bg-orange-50 p-3 border border-orange-200">
                          <label className="text-xs font-semibold text-orange-700 uppercase tracking-wide flex items-center gap-1">
                            <i className="pi pi-globe text-xs"></i>
                            IP Address
                          </label>
                          <p className="font-mono text-sm font-bold text-orange-900 mt-1.5">
                            {singleItemAction.ipaddress || "N/A"}
                          </p>
                        </div>

                        <div className="rounded-lg bg-gray-100 p-3 border border-gray-300 col-span-full">
                          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1">
                            <i className="pi pi-clock text-xs"></i>
                            Synced On
                          </label>
                          <p className="font-medium text-gray-900 mt-1.5">
                            {singleItemAction.createddate
                              ? new Date(singleItemAction.createddate).toLocaleString("en-US", {
                                  dateStyle: "full",
                                  timeStyle: "short",
                                })
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Similar Items/Brands/Suppliers Section */}
                  {singleItemAction && (
                    (approvalType === "item" && singleItemAction.similar_items_count > 0) ||
                    (approvalType === "brand" && singleItemAction.similar_brands_count > 0) ||
                    (approvalType === "supplier" && singleItemAction.similar_suppliers_count > 0)
                  ) && (
                    <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm">
                      <div
                        className="flex items-center justify-between cursor-pointer p-5"
                        onClick={() => setShowSimilarItems(!showSimilarItems)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 border-2 border-amber-300">
                            <i className="pi pi-exclamation-triangle text-amber-600 text-lg"></i>
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-amber-900">
                              Similar {approvalType === "item" ? "Items" : approvalType === "brand" ? "Brands" : "Suppliers"} Detected
                            </h4>
                            <p className="text-sm text-amber-700 mt-0.5">
                              {approvalType === "item"
                                ? singleItemAction.similar_items_count
                                : approvalType === "brand"
                                ? singleItemAction.similar_brands_count
                                : singleItemAction.similar_suppliers_count} potentially duplicate {approvalType}(s) found
                            </p>
                            {actionType === "reject" && (
                              <p className="text-xs text-amber-800 mt-1 font-semibold">
                                ⚠️ Please select which record to map this duplicate to
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          icon={showSimilarItems ? "pi pi-chevron-up" : "pi pi-chevron-down"}
                          rounded
                          text
                          severity="warning"
                          className="h-10 w-10"
                        />
                      </div>

                      {showSimilarItems && (
                        <div className="border-t border-amber-200 p-5 bg-white">
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {(approvalType === "item"
                              ? singleItemAction.similar_items
                              : approvalType === "brand"
                              ? singleItemAction.similar_brands
                              : singleItemAction.similar_suppliers
                            )
                            .sort((a, b) => b.isapproved - a.isapproved) // Show approved items first
                            .map((similarItem, idx) => {
                              const itemId = approvalType === "item"
                                ? similarItem.itemid
                                : approvalType === "brand"
                                ? similarItem.brandid
                                : similarItem.id;
                              const isSelected = selectedMasterRecord === itemId;
                              const isMaster = similarItem.isapproved === 1;

                              return (
                                <div
                                  key={idx}
                                  onClick={() => actionType === "reject" && setSelectedMasterRecord(itemId)}
                                  className={`rounded-lg border-2 p-4 transition-all cursor-pointer ${
                                    isSelected
                                      ? "border-blue-500 bg-blue-50"
                                      : isMaster
                                      ? "border-green-300 bg-green-50 hover:border-green-400"
                                      : "border-gray-200 bg-gray-50 hover:border-amber-300 hover:bg-amber-50"
                                  }`}
                                >
                                <div className="flex items-start gap-3">
                                  {actionType === "reject" && (
                                    <div className="flex items-center pt-1">
                                      <input
                                        type="radio"
                                        name="masterRecord"
                                        checked={isSelected}
                                        onChange={() => setSelectedMasterRecord(itemId)}
                                        className="h-5 w-5 text-blue-600 cursor-pointer"
                                      />
                                    </div>
                                  )}
                                  {((approvalType === "item" && similarItem.imgpath) || (approvalType === "brand" && similarItem.brandicon)) && (
                                    <img
                                      src={approvalType === "item" ? similarItem.imgpath : similarItem.brandicon}
                                      alt={`Similar ${approvalType}`}
                                      className="h-12 w-12 rounded border border-gray-300 object-contain"
                                      onError={(e) => {
                                        e.target.style.display = "none";
                                      }}
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <div className="flex-1">
                                        <h5 className="font-bold text-gray-900 truncate">
                                          {approvalType === "item"
                                            ? similarItem.itemname
                                            : approvalType === "brand"
                                            ? similarItem.brandname
                                            : similarItem.suppliername}
                                        </h5>
                                        <p className="text-xs text-gray-600 mt-0.5">
                                          {approvalType === "item"
                                            ? similarItem.itemdisplayname || "-"
                                            : approvalType === "brand"
                                            ? similarItem.branddesc || "-"
                                            : similarItem.address || "-"}
                                        </p>
                                      </div>
                                      <div className="flex gap-1.5 flex-shrink-0 flex-wrap">
                                        {isMaster && (
                                          <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800 border-2 border-purple-400">
                                            <i className="pi pi-star-fill text-xs mr-1"></i>
                                            MASTER
                                          </span>
                                        )}
                                        <span
                                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                            similarItem.match_type === "barcode" || similarItem.match_type === "exact" || similarItem.match_type === "gst"
                                              ? "bg-red-100 text-red-800 border border-red-300"
                                              : "bg-yellow-100 text-yellow-800 border border-yellow-300"
                                          }`}
                                        >
                                          {similarItem.match_type === "barcode"
                                            ? "Barcode Match"
                                            : similarItem.match_type === "gst"
                                            ? "GST Match"
                                            : similarItem.match_type === "exact"
                                            ? "Exact Match"
                                            : similarItem.match_type === "partial"
                                            ? "Partial Match"
                                            : "Name Match"}
                                        </span>
                                        {similarItem.isapproved === 1 ? (
                                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800 border border-green-300">
                                            <i className="pi pi-check text-xs mr-1"></i>
                                            Approved
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800 border border-orange-300">
                                            <i className="pi pi-clock text-xs mr-1"></i>
                                            Pending
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      {approvalType === "item" && similarItem.itemcode && (
                                        <div className="flex items-center gap-1">
                                          <span className="text-gray-500">Code:</span>
                                          <span className="font-mono font-medium text-gray-900">{similarItem.itemcode}</span>
                                        </div>
                                      )}
                                      {approvalType === "item" && similarItem.itembarcode && (
                                        <div className="flex items-center gap-1">
                                          <span className="text-gray-500">Barcode:</span>
                                          <span className="font-mono font-medium text-gray-900">{similarItem.itembarcode}</span>
                                        </div>
                                      )}
                                      {approvalType === "item" && similarItem.catname && (
                                        <div className="flex items-center gap-1">
                                          <span className="text-gray-500">Category:</span>
                                          <span className="font-medium text-gray-900">{similarItem.catname}</span>
                                        </div>
                                      )}
                                      {approvalType === "item" && similarItem.brandname && (
                                        <div className="flex items-center gap-1">
                                          <span className="text-gray-500">Brand:</span>
                                          <span className="font-medium text-gray-900">{similarItem.brandname}</span>
                                        </div>
                                      )}
                                      {approvalType === "brand" && similarItem.categorynames && (
                                        <div className="flex items-center gap-1">
                                          <span className="text-gray-500">Categories:</span>
                                          <span className="font-medium text-gray-900">{similarItem.categorynames}</span>
                                        </div>
                                      )}
                                      {approvalType === "supplier" && similarItem.gstno && (
                                        <div className="flex items-center gap-1">
                                          <span className="text-gray-500">GST:</span>
                                          <span className="font-mono font-medium text-gray-900">{similarItem.gstno}</span>
                                        </div>
                                      )}
                                      {approvalType === "supplier" && similarItem.phoneno && (
                                        <div className="flex items-center gap-1">
                                          <span className="text-gray-500">Phone:</span>
                                          <span className="font-medium text-gray-900">{similarItem.phoneno}</span>
                                        </div>
                                      )}
                                      {approvalType === "item" && similarItem.sellingprice > 0 && (
                                        <div className="flex items-center gap-1">
                                          <span className="text-gray-500">Selling:</span>
                                          <span className="font-bold text-green-700">
                                            ₹{parseFloat(similarItem.sellingprice || 0).toFixed(2)}
                                          </span>
                                        </div>
                                      )}
                                      {similarItem.companyname && (
                                        <div className="flex items-center gap-1">
                                          <span className="text-gray-500">Company:</span>
                                          <span className="font-medium text-gray-900">{similarItem.companyname}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bulk Selection Summary */}
                  {!singleItemAction && selectedItems.length > 0 && (
                    <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50 p-5 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                          <i className="pi pi-list text-indigo-600 text-lg"></i>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-base font-bold text-indigo-900">
                            Bulk {actionType === "approve" ? "Approval" : "Rejection"}
                          </h4>
                          <p className="text-sm text-indigo-700 mt-1">
                            {selectedItems.length} {approvalType}(s) selected for bulk{" "}
                            {actionType === "approve" ? "approval" : "rejection"}
                          </p>
                          <div className="mt-3 rounded-lg bg-white p-3 border border-indigo-200">
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                              Selected Items:
                            </p>
                            <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
                              {selectedItems.slice(0, 10).map((item, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center rounded-md bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-800"
                                >
                                  {approvalType === "brand" ? item.brandname : approvalType === "item" ? item.itemname : item.suppliername}
                                </span>
                              ))}
                              {selectedItems.length > 10 && (
                                <span className="inline-flex items-center rounded-md bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700">
                                  +{selectedItems.length - 10} more
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rejection Reason Dropdown - For All Rejection Types */}
                  {actionType === "reject" && (
                    <div className="rounded-xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-white p-5 shadow-sm">
                      <label
                        htmlFor="rejectionReason"
                        className="flex items-center gap-2 text-base font-bold text-gray-800 mb-3"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                          <i className="pi pi-list text-red-600 text-sm"></i>
                        </div>
                        <span>Rejection Reason</span>
                        <span className="ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold bg-red-100 text-red-700">
                          Required
                        </span>
                      </label>

                      <Dropdown
                        id="rejectionReason"
                        value={selectedRejectionReason}
                        options={rejectionReasons}
                        onChange={(e) => setSelectedRejectionReason(e.value)}
                        placeholder="Select a rejection reason"
                        className="w-full"
                        filter
                      />

                      <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 p-3 border border-red-200">
                        <i className="pi pi-info-circle text-red-600 text-sm mt-0.5"></i>
                        <p className="text-xs text-red-700">
                          <strong>Note:</strong> Please select the primary reason for rejection. You can provide additional details in the remarks below.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Remark Input - Always shown */}
                  <div className="rounded-xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5 shadow-sm">
                    <label
                      htmlFor="actionRemark"
                      className="flex items-center gap-2 text-base font-bold text-gray-800 mb-3"
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        actionType === "reject" ? "bg-red-100" : "bg-blue-100"
                      }`}>
                        <i className={`pi pi-comment ${
                          actionType === "reject" ? "text-red-600" : "text-blue-600"
                        } text-sm`}></i>
                      </div>
                      <span>
                        {actionType === "approve" ? "Approval" : "Rejection"} Remark
                      </span>
                      <span
                        className="ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold bg-gray-200 text-gray-600"
                      >
                        Optional
                      </span>
                    </label>

                    <InputTextarea
                      id="actionRemark"
                      value={actionRemark}
                      onChange={(e) => setActionRemark(e.target.value)}
                      placeholder={`Enter your ${actionType === "approve" ? "approval" : "rejection"} remark here...`}
                      rows={4}
                      className="w-full rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />

                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-blue-50 p-3 border border-blue-200">
                      <i className="pi pi-info-circle text-blue-600 text-sm mt-0.5"></i>
                      <p className="text-xs text-blue-700">
                        <strong>Note:</strong> This remark will be permanently saved in the
                        system for audit and compliance purposes. Please provide clear and
                        professional feedback.
                      </p>
                    </div>
                  </div>
                </div>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
