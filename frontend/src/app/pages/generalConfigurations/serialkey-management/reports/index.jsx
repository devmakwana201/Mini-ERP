import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { SerialKeyService } from "services/general-configurations/serialkey";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Button } from "primereact/button";
import { MultiSelect } from "primereact/multiselect";
import { Tooltip } from "primereact/tooltip";
import { unparse } from "papaparse";
import { Skeleton } from "primereact/skeleton";
import { FilterMatchMode } from "primereact/api";
import { scrollToTop } from "utils/scrollToTop";
import { Tag } from "primereact/tag";
import { Dropdown } from "primereact/dropdown";
import EmptyMessage from "components/shared/EmptyMessage";

export default function Reports() {
  const toast = useRef(null);
  const [reportList, setReportList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [keyCount, setKeyCount] = useState({
    totalKeys: 0,
    usedKeys: 0,
    unusedKeys: 0,
  });
  const [isLoadingKeyCount, setIsLoadingKeyCount] = useState(true);

  const [lazyParams, setLazyParams] = useState({
    first: 0,
    rows: 10,
    sortField: null,
    sortOrder: null,
  });

  const [totalRecords, setTotalRecords] = useState(0);

  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    serial_number: { value: null, matchMode: FilterMatchMode.CONTAINS },
    product_key: { value: null, matchMode: FilterMatchMode.CONTAINS },
    locationname: { value: null, matchMode: FilterMatchMode.CONTAINS },
    contactno: { value: null, matchMode: FilterMatchMode.CONTAINS },
    suppliername: { value: null, matchMode: FilterMatchMode.CONTAINS },
    is_nfs: { value: null, matchMode: FilterMatchMode.EQUALS },
    is_active: { value: null, matchMode: FilterMatchMode.EQUALS },
  });

  const columnOptions = [
    { field: "serial_number", header: "Serial Number" },
    { field: "product_key", header: "Product Key" },
    { field: "locationname", header: "Location Name" },
    { field: "contactno", header: "Contact No" },
    { field: "suppliername", header: "Supplier Name" },
    { field: "is_nfs", header: "NFS Status" },
    { field: "is_active", header: "Active Status" },
    { field: "activation_date", header: "Activation Date" },
    { field: "activation_count", header: "Activation Count" },
    { field: "createddate", header: "Created Date" },
  ];

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("serialReports_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    // Show all columns by default
    return columnOptions;
  });

  const fetchReports = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await SerialKeyService.getSerialKeyReports({
        filters,
        start: lazyParams.first,
        length: lazyParams.rows,
        sortField: lazyParams.sortField,
        sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
      });

      if (response.success) {
        setReportList(response.data);
        setTotalRecords(response.totalRecords);
      } else {
        console.error("Failed to fetch reports:", response.error);
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: response.error?.message || "Failed to load report data",
          life: 3000,
        });
        setReportList([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error("Error fetching report data:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message || error.message || "Failed to load report data",
        life: 3000,
      });
      setReportList([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchReports();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters, fetchReports]);

  const fetchKeyCount = useCallback(async () => {
    setIsLoadingKeyCount(true);
    try {
      const response = await SerialKeyService.getKeyCount();
      if (response.success) {
        setKeyCount(response.data);
      } else {
        console.error("Failed to fetch key count:", response.error);
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: response.error?.message || "Failed to load key count data",
          life: 3000,
        });
      }
    } catch (error) {
      console.error("Error fetching key count:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          "Failed to load key count data",
        life: 3000,
      });
    } finally {
      setIsLoadingKeyCount(false);
    }
  }, []);

  useEffect(() => {
    fetchKeyCount();
  }, [fetchKeyCount]);

  useEffect(() => {
    const sessionState = sessionStorage.getItem("serialReportsTableFilters");
    if (sessionState) {
      const parsed = JSON.parse(sessionState);

      if (parsed.sortField !== undefined && parsed.sortOrder !== undefined) {
        setLazyParams((prev) => ({
          ...prev,
          sortField: parsed.sortField,
          sortOrder: parsed.sortOrder,
        }));
      }
    }
  }, []);

  const blankRow = {
    serial_number: "",
    product_key: "",
    locationname: "",
    contactno: "",
    suppliername: "",
    is_nfs: "",
    is_active: "",
    activation_date: "",
    activation_count: "",
    createddate: "",
  };

  const onGlobalFilterChange = (e) => {
    const value = e.target.value;
    const updatedFilters = {
      ...filters,
      global: { ...filters.global, value },
    };
    setFilters(updatedFilters);
  };

  const fileExportMessage = () => {
    toast.current.show({
      severity: "success",
      detail: "File Exported Successfully",
      life: 3000,
    });
  };

  const exportCSV = () => {
    if (reportList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const formattedData = reportList.map((row) => {
      const formattedRow = {};
      visibleFields.forEach((col) => {
        if (col.field === "is_nfs") {
          formattedRow[col.header] = row[col.field] === 1 ? "Yes" : "No";
        } else if (col.field === "is_active") {
          formattedRow[col.header] =
            row[col.field] === 1 ? "Active" : "Inactive";
        } else if (
          col.field === "activation_date" ||
          col.field === "createddate"
        ) {
          formattedRow[col.header] = row[col.field]
            ? new Date(row[col.field]).toLocaleString()
            : "-";
        } else {
          formattedRow[col.header] = row[col.field] ?? "-";
        }
      });
      return formattedRow;
    });

    const csvData = unparse({
      fields: visibleFields.map((col) => col.header),
      data: formattedData.map((row) =>
        visibleFields.map((col) => row[col.header]),
      ),
    });

    const filename = "serial_key_reports.csv";
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    fileExportMessage();
  };

  const exportPdf = async () => {
    if (reportList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    try {
      const [{ jsPDF }, autoTableModule] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const autoTable = autoTableModule.default || autoTableModule;

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "A4",
      });

      const head = [visibleFields.map((col) => col.header)];
      const body = reportList.map((row) =>
        visibleFields.map((col) => {
          if (col.field === "is_nfs") {
            return row[col.field] === 1 ? "Yes" : "No";
          } else if (col.field === "is_active") {
            return row[col.field] === 1 ? "Active" : "Inactive";
          } else if (
            col.field === "activation_date" ||
            col.field === "createddate"
          ) {
            return row[col.field]
              ? new Date(row[col.field]).toLocaleDateString()
              : "-";
          }
          return row[col.field] ?? "-";
        }),
      );

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = { top: 30, bottom: 20, left: 30, right: 30 };
      const usableWidth = pageWidth - margin.left - margin.right;
      const colWidth = Math.floor(usableWidth / visibleFields.length);

      const columnStyles = visibleFields.reduce((acc, _col, idx) => {
        acc[idx] = {
          cellWidth: colWidth,
          overflow: "linebreak",
        };
        return acc;
      }, {});

      autoTable(doc, {
        head,
        body,
        startY: 20,
        tableWidth: usableWidth,
        styles: {
          fontSize: 8,
          cellPadding: 4,
          overflow: "linebreak",
          valign: "middle",
        },
        headStyles: {
          fillColor: [0, 128, 0],
          textColor: 255,
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [240, 240, 240],
        },
        columnStyles,
        margin,
        theme: "grid",
        didParseCell: (data) => {
          const raw = data.cell?.raw;
          if (typeof raw === "string") {
            const softened = raw.replace(/(\S{30})/g, "$1\u200B");
            if (softened !== raw) data.cell.text = [softened];
          }
        },
      });

      doc.save("serial_key_reports.pdf");
      fileExportMessage();
    } catch (error) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Failed to export PDF. Please try again.",
        life: 3000,
      });
    }
  };

  const exportExcel = () => {
    if (reportList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    import("xlsx").then((xlsx) => {
      const filteredData = reportList.map((row) => {
        const filteredRow = {};
        visibleFields.forEach((col) => {
          if (col.field === "is_nfs") {
            filteredRow[col.header] = row[col.field] === 1 ? "Yes" : "No";
          } else if (col.field === "is_active") {
            filteredRow[col.header] =
              row[col.field] === 1 ? "Active" : "Inactive";
          } else if (
            col.field === "activation_date" ||
            col.field === "createddate"
          ) {
            filteredRow[col.header] = row[col.field]
              ? new Date(row[col.field]).toLocaleString()
              : "-";
          } else {
            filteredRow[col.header] = row[col.field] ?? "-";
          }
        });
        return filteredRow;
      });

      const worksheet = xlsx.utils.json_to_sheet(filteredData);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ["data"] };
      const excelBuffer = xlsx.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      saveAsExcelFile(excelBuffer, "serial_key_reports");
      fileExportMessage();
    });
  };

  const saveAsExcelFile = (buffer, fileName) => {
    import("file-saver").then((module) => {
      if (module && module.default) {
        let EXCEL_TYPE =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8";
        let EXCEL_EXTENSION = ".xlsx";
        const data = new Blob([buffer], {
          type: EXCEL_TYPE,
        });

        module.default.saveAs(
          data,
          fileName + "_export_" + new Date().getTime() + EXCEL_EXTENSION,
        );
      }
    });
  };

  const onColumnToggle = (event) => {
    let selectedColumns = event.value;

    if (!selectedColumns.some((col) => col.field === "serial_number")) {
      selectedColumns = [
        ...selectedColumns,
        columnOptions.find((col) => col.field === "serial_number"),
      ];
    }

    let orderedSelectedColumns = columnOptions.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field),
    );

    setVisibleFields(orderedSelectedColumns);
    sessionStorage.setItem(
      "serialReports_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  // NFS Status filter (matching nfsStatusBodyTemplate info/warning severity)
  const nfsStatusFilterOptions = [
    {
      label: "Yes",
      value: 1,
      template: (option) => (
        <Tag
          value="Yes"
          severity="success"
          style={{ fontSize: "11px", padding: "2px 6px" }}
        />
      ),
    },
    {
      label: "No",
      value: 0,
      template: (option) => (
        <Tag
          value="No"
          severity="danger"
          style={{ fontSize: "11px", padding: "2px 6px" }}
        />
      ),
    },
  ];

  const nfsStatusFilterTemplate = (options) => (
    <Dropdown
      value={options.value}
      options={nfsStatusFilterOptions}
      onChange={(e) => options.filterApplyCallback(e.value)}
      placeholder="Select"
      className="p-column-filter"
      style={{ minWidth: "8rem" }}
      itemTemplate={(option) => option.template(option)}
      valueTemplate={(option) => (option ? option.template(option) : "Select")}
    />
  );

  // Active Status filter (matching activeStatusBodyTemplate success/danger severity)
  const activeStatusFilterOptions = [
    {
      label: "Active",
      value: 1,
      template: (option) => (
        <Tag
          value="Active"
          severity="success"
          style={{ fontSize: "11px", padding: "2px 6px" }}
        />
      ),
    },
    {
      label: "Inactive",
      value: 0,
      template: (option) => (
        <Tag
          value="Inactive"
          severity="danger"
          style={{ fontSize: "11px", padding: "2px 6px" }}
        />
      ),
    },
  ];

  const activeStatusFilterTemplate = (options) => (
    <Dropdown
      value={options.value}
      options={activeStatusFilterOptions}
      onChange={(e) => options.filterApplyCallback(e.value)}
      placeholder="Select"
      className="p-column-filter"
      style={{ minWidth: "8rem" }}
      itemTemplate={(option) => option.template(option)}
      valueTemplate={(option) => (option ? option.template(option) : "Select")}
    />
  );

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Serial Key Reports
      </h3>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 lg:justify-end">
        <IconField iconPosition="left" className="w-full sm:w-64">
          <InputIcon className="pi pi-search" />
          <InputText
            type="search"
            value={filters.global?.value || ""}
            onChange={onGlobalFilterChange}
            placeholder="Keyword Search"
            className="w-full"
          />
        </IconField>

        <MultiSelect
          value={visibleFields}
          options={columnOptions}
          optionLabel="header"
          onChange={onColumnToggle}
          className="w-full sm:w-56"
          display="chip"
          placeholder="Visible Columns"
          disabled={isLoading}
        />

        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <div className="flex gap-1">
            <Button
              className="export-icon-tooltip"
              type="button"
              icon="pi pi-file"
              rounded
              size="small"
              onClick={exportCSV}
              data-pr-tooltip="Export as CSV"
              disabled={isLoading}
            />
            <Button
              className="export-icon-tooltip"
              type="button"
              icon="pi pi-file-excel"
              severity="success"
              rounded
              size="small"
              onClick={exportExcel}
              data-pr-tooltip="Export as XLS"
              disabled={isLoading}
            />
            <Button
              className="export-icon-tooltip"
              type="button"
              icon="pi pi-file-pdf"
              severity="warning"
              rounded
              size="small"
              onClick={exportPdf}
              data-pr-tooltip="Export as PDF"
              disabled={isLoading}
            />
          </div>
        </div>

        <Tooltip
          target=".export-icon-tooltip"
          position="top"
          style={{ fontSize: "12px" }}
          showDelay={100}
          hideDelay={100}
        />
      </div>
    </div>
  );

  const createSparkles = (iconElement) => {
    const rect = iconElement.getBoundingClientRect();
    const sparkleCount = 6;

    for (let i = 0; i < sparkleCount; i++) {
      const sparkle = document.createElement("div");
      sparkle.innerHTML = "✨";
      sparkle.style.position = "fixed";
      sparkle.style.left = rect.left + rect.width / 2 + "px";
      sparkle.style.top = rect.top + rect.height / 2 + "px";
      sparkle.style.fontSize = "12px";
      sparkle.style.pointerEvents = "none";
      sparkle.style.zIndex = "9999";
      sparkle.style.transform = "translate(-50%, -50%)";
      sparkle.style.opacity = "1";
      sparkle.style.transition = "all 0.6s ease-out";

      document.body.appendChild(sparkle);

      // Animate sparkle
      setTimeout(() => {
        const angle = (360 / sparkleCount) * i;
        const distance = 15 + Math.random() * 10;
        const radian = (angle * Math.PI) / 180;
        const x = Math.cos(radian) * distance;
        const y = Math.sin(radian) * distance;

        sparkle.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(0.5)`;
        sparkle.style.opacity = "0";
      }, 10);

      // Remove sparkle
      setTimeout(() => {
        if (document.body.contains(sparkle)) {
          document.body.removeChild(sparkle);
        }
      }, 500);
    }
  };

  const copyToClipboard = async (text, iconElement, type) => {
    // Add click animation and sparkles
    if (iconElement) {
      iconElement.style.transform = "scale(0.8)";
      iconElement.style.transition = "transform 0.1s ease";

      // Create sparkles
      createSparkles(iconElement);

      setTimeout(() => {
        iconElement.style.transform = "scale(1)";
      }, 100);
    }

    try {
      await navigator.clipboard.writeText(text);
      toast.current?.show({
        severity: "success",
        summary: "Copied",
        detail: `${type} copied to clipboard`,
        life: 2000,
      });
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        toast.current?.show({
          severity: "success",
          summary: "Copied",
          detail: `${type} copied to clipboard`,
          life: 2000,
        });
      } catch (fallbackErr) {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: `Failed to copy ${type}`,
          life: 3000,
        });
      }
      document.body.removeChild(textArea);
    }
  };

  const serialNumberBodyTemplate = (rowData) => {
    return isLoading ? (
      <div
        className="flex items-center justify-between"
        style={{ textAlign: "center" }}
      >
        <Skeleton width="70%" height="1.5rem" />
        <Skeleton width="1rem" height="1rem" />
      </div>
    ) : (
      <div
        className="flex items-center justify-between"
        style={{ textAlign: "center" }}
      >
        <span>{rowData.serial_number || "-"}</span>
        {rowData.serial_number && (
          <i
            className="pi pi-copy cursor-pointer text-blue-500 transition-all duration-100 hover:text-blue-600"
            onClick={(e) =>
              copyToClipboard(rowData.serial_number, e.target, "Serial Number")
            }
            title="Copy serial number"
            style={{ fontSize: "1rem" }}
          />
        )}
      </div>
    );
  };

  const productKeyBodyTemplate = (rowData) => {
    return isLoading ? (
      <div
        className="flex items-center justify-between"
        style={{ textAlign: "center" }}
      >
        <Skeleton width="70%" height="1.5rem" />
        <Skeleton width="1rem" height="1rem" />
      </div>
    ) : (
      <div
        className="flex items-center justify-between"
        style={{ textAlign: "center" }}
      >
        <span>{rowData.product_key || "-"}</span>
        {rowData.product_key && (
          <i
            className="pi pi-copy cursor-pointer text-blue-500 transition-all duration-100 hover:text-blue-600"
            onClick={(e) =>
              copyToClipboard(rowData.product_key, e.target, "Product Key")
            }
            title="Copy product key"
            style={{ fontSize: "1rem" }}
          />
        )}
      </div>
    );
  };

  const locationNameBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>{rowData.locationname || "-"}</span>
    );
  };

  const contactNoBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>{rowData.contactno || "-"}</span>
    );
  };

  const supplierNameBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>{rowData.suppliername || "N/A"}</span>
    );
  };

  const nfsStatusBodyTemplate = (rowData) => {
    return isLoading ? (
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Skeleton width="2rem" height="1.5rem" />
      </div>
    ) : (
      <div style={{ textAlign: "center" }}>
        <Tag
          value={rowData.is_nfs === 1 ? "Yes" : "No"}
          severity={rowData.is_nfs === 1 ? "success" : "danger"}
        />
      </div>
    );
  };

  const activeStatusBodyTemplate = (rowData) => {
    return isLoading ? (
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Skeleton width="3rem" height="1.5rem" />
      </div>
    ) : (
      <div style={{ textAlign: "center" }}>
        <Tag
          value={rowData.is_active === 1 ? "Active" : "Inactive"}
          severity={rowData.is_active === 1 ? "success" : "danger"}
        />
      </div>
    );
  };

  const activationDateBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>
        {rowData.activation_date
          ? new Date(rowData.activation_date).toLocaleDateString()
          : "-"}
      </span>
    );
  };

  const activationCountBodyTemplate = (rowData) => {
    return (
      <div className="flex items-center justify-center">
        {isLoading ? (
          <Skeleton shape="circle" size="2.5rem" />
        ) : (
          <div
            style={{
              width: "40px",
              height: "40px",
              backgroundColor: "#d1e7dd",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #ddd",
              color: "#0f5132",
            }}
          >
            {rowData.activation_count || 0}
          </div>
        )}
      </div>
    );
  };

  const createdDateBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>
        {rowData.createddate
          ? new Date(rowData.createddate).toLocaleDateString()
          : "-"}
      </span>
    );
  };

  return (
    <Page title="Serialkey Reports">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          {/* Key Count Statistics */}
          <div className="col-span-12">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Total Keys */}
              <div className="rounded-xl bg-white p-4 shadow-md dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xl font-semibold text-gray-900 dark:text-white">
                      {isLoadingKeyCount ? (
                        <Skeleton width="4rem" height="1.5rem" />
                      ) : (
                        keyCount.totalKeys.toLocaleString()
                      )}
                    </div>
                    <div className="text-sm text-gray-500">Total Keys</div>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                    <i className="pi pi-key text-lg"></i>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-xs text-gray-400">
                    All generated keys
                  </div>
                </div>
              </div>

              {/* Used Keys */}
              <div className="rounded-xl bg-white p-4 shadow-md dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xl font-semibold text-gray-900 dark:text-white">
                      {isLoadingKeyCount ? (
                        <Skeleton width="4rem" height="1.5rem" />
                      ) : (
                        keyCount.usedKeys.toLocaleString()
                      )}
                    </div>
                    <div className="text-sm text-gray-500">Used Keys</div>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                    <i className="pi pi-check-circle text-lg"></i>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-xs text-gray-400">
                    Active installations
                  </div>
                  {!isLoadingKeyCount && keyCount.totalKeys > 0 && (
                    <div className="text-xs font-medium text-emerald-600">
                      {Math.round(
                        (keyCount.usedKeys / keyCount.totalKeys) * 100,
                      )}
                      %
                    </div>
                  )}
                </div>
              </div>

              {/* Unused Keys */}
              <div className="rounded-xl bg-white p-4 shadow-md dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xl font-semibold text-gray-900 dark:text-white">
                      {isLoadingKeyCount ? (
                        <Skeleton width="4rem" height="1.5rem" />
                      ) : (
                        keyCount.unusedKeys.toLocaleString()
                      )}
                    </div>
                    <div className="text-sm text-gray-500">Unused Keys</div>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                    <i className="pi pi-clock text-lg"></i>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-xs text-gray-400">Available for use</div>
                  {!isLoadingKeyCount && keyCount.totalKeys > 0 && (
                    <div className="text-xs font-medium text-amber-600">
                      {Math.round(
                        (keyCount.unusedKeys / keyCount.totalKeys) * 100,
                      )}
                      %
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : reportList
                }
                className="overflow-hidden rounded-lg border border-gray-300"
                header={renderHeader()}
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                globalFilterFields={[
                  "serial_number",
                  "product_key",
                  "locationname",
                  "contactno",
                  "suppliername",
                ]}
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
                stateStorage="session"
                stateKey="serialReportsTableFilters"
                rows={lazyParams.rows}
                first={lazyParams.first}
                totalRecords={totalRecords}
                sortField={lazyParams.sortField}
                sortOrder={lazyParams.sortOrder}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                rowsPerPageOptions={[10, 25, 50]}
                tableStyle={{ minWidth: "70rem" }}
                removableSort
                emptyMessage={
                  <EmptyMessage
                    title="No reports found"
                    subtitle="Serial key reports will appear here when available"
                  />
                }
              >
                <Column
                  header="Sr No."
                  body={(rowData, options) =>
                    isLoading ? (
                      <Skeleton width="30%" height="1.5rem" />
                    ) : (
                      options.rowIndex + 1
                    )
                  }
                  style={{ minWidth: "5rem" }}
                />
                {visibleFields.some((col) => col.field === "serial_number") && (
                  <Column
                    field="serial_number"
                    header="Serial Number"
                    style={{ minWidth: "15rem" }}
                    body={serialNumberBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Serial Number"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "product_key") && (
                  <Column
                    field="product_key"
                    header="Product Key"
                    style={{ minWidth: "16rem" }}
                    body={productKeyBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Product Key"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "locationname") && (
                  <Column
                    field="locationname"
                    header="Location Name"
                    style={{ minWidth: "14rem" }}
                    body={locationNameBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Location"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "contactno") && (
                  <Column
                    field="contactno"
                    header="Contact No"
                    style={{ minWidth: "12rem" }}
                    body={contactNoBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Contact"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "suppliername") && (
                  <Column
                    field="suppliername"
                    header="Supplier Name"
                    style={{ minWidth: "14rem" }}
                    body={supplierNameBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Supplier"
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "is_nfs") && (
                  <Column
                    field="is_nfs"
                    header="NFS Status"
                    style={{ minWidth: "10rem" }}
                    body={nfsStatusBodyTemplate}
                    sortable
                    filter
                    showFilterMenu={false}
                    filterElement={nfsStatusFilterTemplate}
                  />
                )}
                {visibleFields.some((col) => col.field === "is_active") && (
                  <Column
                    field="is_active"
                    header="Active Status"
                    style={{ minWidth: "12rem" }}
                    body={activeStatusBodyTemplate}
                    sortable
                    filter
                    showFilterMenu={false}
                    filterElement={activeStatusFilterTemplate}
                  />
                )}
                {visibleFields.some(
                  (col) => col.field === "activation_date",
                ) && (
                  <Column
                    field="activation_date"
                    header="Activation Date"
                    style={{ minWidth: "12rem" }}
                    body={activationDateBodyTemplate}
                    sortable
                  />
                )}
                {visibleFields.some(
                  (col) => col.field === "activation_count",
                ) && (
                  <Column
                    field="activation_count"
                    header="Activation Count"
                    style={{ minWidth: "12rem" }}
                    body={activationCountBodyTemplate}
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "createddate") && (
                  <Column
                    field="createddate"
                    header="Created Date"
                    style={{ minWidth: "10rem" }}
                    body={createdDateBodyTemplate}
                    sortable
                  />
                )}
              </DataTable>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
