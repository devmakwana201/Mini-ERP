import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { SerialKeyService } from "services/general-configurations/serialkey";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Button } from "primereact/button";
import { useNavigate } from "react-router";
import { MultiSelect } from "primereact/multiselect";
import { Tooltip } from "primereact/tooltip";
import { Tag } from "primereact/tag";
import { Dialog } from "primereact/dialog";
import { Checkbox } from "primereact/checkbox";
import { unparse } from "papaparse";
import { Skeleton } from "primereact/skeleton";
import { FilterMatchMode } from "primereact/api";
import { scrollToTop } from "utils/scrollToTop";
import EmptyMessage from "components/shared/EmptyMessage";

export default function GenerateKey() {
  const toast = useRef(null);
  const navigate = useNavigate();
  const [serialKeyList, setSerialKeyList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [generateFormData, setGenerateFormData] = useState({
    addnumber: null,
    is_nfs: false,
    free_demo: false,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [formErrors, setFormErrors] = useState({});

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
    location_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    is_nfs: { value: null, matchMode: FilterMatchMode.EQUALS },
    free_demo: { value: null, matchMode: FilterMatchMode.EQUALS },
    is_active: { value: null, matchMode: FilterMatchMode.EQUALS },
    payment_pending: { value: null, matchMode: FilterMatchMode.EQUALS },
  });

  const columnOptions = [
    { field: "serial_number", header: "Serial Number" },
    { field: "product_key", header: "Product Key" },
    { field: "client_mysql_password", header: "MySQL Password" },
    { field: "is_nfs", header: "Not For Sale" },
    { field: "free_demo", header: "Free Demo" },
    { field: "location_name", header: "Location" },
    { field: "is_active", header: "Active" },
    { field: "payment_pending", header: "Payment Pending" },
    { field: "activation_date", header: "Activation Date" },
    { field: "created_at", header: "Created At" },
  ];

  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = sessionStorage.getItem("serialKeyList_visibleFields");
    if (saved) {
      const fields = JSON.parse(saved);
      return columnOptions.filter((col) => fields.includes(col.field));
    }
    // Show all columns by default
    return columnOptions;
  });

  const fetchSerialKeys = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await SerialKeyService.getFormattedSerialKeys({
        filters,
        start: lazyParams.first,
        length: lazyParams.rows,
        sortField: lazyParams.sortField,
        sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
      });

      if (response.success) {
        setSerialKeyList(response.data);
        setTotalRecords(response.totalRecords);
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: response.error?.message || "Failed to load serial key data",
          life: 3000,
        });
        setSerialKeyList([]);
        setTotalRecords(0);
      }
    } catch (error) {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          "Failed to load serial key data",
        life: 3000,
      });
      setSerialKeyList([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, lazyParams]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchSerialKeys();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters, fetchSerialKeys]);

  useEffect(() => {
    const sessionState = sessionStorage.getItem("serialKeyTableFilters");
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
    client_mysql_password: "",
    is_nfs: "",
    free_demo: "",
    location_name: "",
    is_active: "",
    payment_pending: "",
    activation_date: "",
    created_at: "",
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
    if (serialKeyList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    const formattedData = serialKeyList.map((row) => {
      const formattedRow = {};
      visibleFields.forEach((col) => {
        formattedRow[col.header] = row[col.field] ?? "-";
      });
      return formattedRow;
    });

    const csvData = unparse({
      fields: visibleFields.map((col) => col.header),
      data: formattedData.map((row) =>
        visibleFields.map((col) => row[col.header]),
      ),
    });

    const filename = "serial_keys.csv";
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
    if (serialKeyList.length === 0) {
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
      const body = serialKeyList.map((row) =>
        visibleFields.map((col) => {
          let value = row[col.field] ?? "-";
          // Format boolean values
          if (
            col.field === "is_nfs" ||
            col.field === "free_demo" ||
            col.field === "is_active" ||
            col.field === "payment_pending"
          ) {
            value = value === 1 ? "Yes" : "No";
          }
          // Format dates
          if (
            (col.field === "activation_date" || col.field === "created_at") &&
            value &&
            value !== "-"
          ) {
            value = formatDate(value);
          }
          return value;
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

      doc.save("serial_keys.pdf");
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
    if (serialKeyList.length === 0) {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "No data available to export",
        life: 3000,
      });
      return;
    }

    import("xlsx").then((xlsx) => {
      const filteredData = serialKeyList.map((row) => {
        const filteredRow = {};
        visibleFields.forEach((col) => {
          filteredRow[col.header] = row[col.field] ?? "-";
        });
        return filteredRow;
      });

      const worksheet = xlsx.utils.json_to_sheet(filteredData);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ["data"] };
      const excelBuffer = xlsx.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      saveAsExcelFile(excelBuffer, "serial_keys");
      fileExportMessage();
    });
  };

  const validateForm = () => {
    const errors = {};

    if (!generateFormData.addnumber || generateFormData.addnumber <= 0) {
      errors.addnumber = "Product Key is required and must be greater than 0";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleGenerateSerialKey = async () => {
    if (!validateForm()) return;

    setIsGenerating(true);

    try {
      const payload = {
        addnumber: generateFormData.addnumber,
        is_nfs: generateFormData.is_nfs ? 1 : 0,
        free_demo: generateFormData.free_demo ? 1 : 0,
      };

      const response = await SerialKeyService.createSerialKey(payload);

      if (response.success) {
        toast.current?.show({
          severity: "success",
          summary: "Success",
          detail: response.message || "Serial key generated successfully",
          life: 3000,
        });
        setShowGenerateDialog(false);
        setGenerateFormData({
          addnumber: null,
          is_nfs: false,
          free_demo: false,
        });
        setFormErrors({});
        fetchSerialKeys();
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: response.error?.message || "Failed to generate serial key",
          life: 3000,
        });
      }
    } catch (error) {
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          "Failed to generate serial key",
        life: 3000,
      });
    } finally {
      setIsGenerating(false);
    }
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

    // Ensure serial_number is always included
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
      "serialKeyList_visibleFields",
      JSON.stringify(orderedSelectedColumns.map((col) => col.field)),
    );
  };

  const renderHeader = () => (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        Serial Key List
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

          <Button
            label="Generate"
            icon="pi pi-plus"
            size="small"
            onClick={() => setShowGenerateDialog(true)}
          />
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

  // Not For Sale filter (matching nfsBodyTemplate gradient style)
  const nfsFilterOptions = [
    {
      label: "Yes",
      value: 1,
      template: (option) => (
        <Tag
          value="Yes"
          style={{
            background: "linear-gradient(135deg, #132639 0%, #3973ac 100%)",
            fontSize: "11px",
            padding: "2px 6px",
          }}
        />
      ),
    },
    {
      label: "No",
      value: 0,
      template: (option) => (
        <Tag
          value="No"
          style={{
            background: "linear-gradient(135deg, #1f2e2e 0%, #5c8a8a 100%)",
            fontSize: "11px",
            padding: "2px 6px",
          }}
        />
      ),
    },
  ];

  const nfsFilterTemplate = (options) => (
    <Dropdown
      value={options.value}
      options={nfsFilterOptions}
      onChange={(e) => options.filterApplyCallback(e.value)}
      placeholder="Select"
      className="p-column-filter"
      style={{ minWidth: "8rem" }}
      itemTemplate={(option) => option.template(option)}
      valueTemplate={(option) => (option ? option.template(option) : "Select")}
    />
  );

  // Free Demo filter (matching freeDemoBodyTemplate gradient style)
  const freeDemoFilterOptions = [
    {
      label: "Yes",
      value: 1,
      template: (option) => (
        <Tag
          value="Yes"
          style={{
            background: "linear-gradient(135deg, #132639 0%, #3973ac 100%)",
            fontSize: "11px",
            padding: "2px 6px",
          }}
        />
      ),
    },
    {
      label: "No",
      value: 0,
      template: (option) => (
        <Tag
          value="No"
          style={{
            background: "linear-gradient(135deg, #1f2e2e 0%, #5c8a8a 100%)",
            fontSize: "11px",
            padding: "2px 6px",
          }}
        />
      ),
    },
  ];

  const freeDemoFilterTemplate = (options) => (
    <Dropdown
      value={options.value}
      options={freeDemoFilterOptions}
      onChange={(e) => options.filterApplyCallback(e.value)}
      placeholder="Select"
      className="p-column-filter"
      style={{ minWidth: "8rem" }}
      itemTemplate={(option) => option.template(option)}
      valueTemplate={(option) => (option ? option.template(option) : "Select")}
    />
  );

  // Active filter (matching activeBodyTemplate success/danger severity)
  const activeFilterOptions = [
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

  const activeFilterTemplate = (options) => (
    <Dropdown
      value={options.value}
      options={activeFilterOptions}
      onChange={(e) => options.filterApplyCallback(e.value)}
      placeholder="Select"
      className="p-column-filter"
      style={{ minWidth: "8rem" }}
      itemTemplate={(option) => option.template(option)}
      valueTemplate={(option) => (option ? option.template(option) : "Select")}
    />
  );

  // Payment Pending filter (matching paymentPendingBodyTemplate danger/success severity)
  const paymentPendingFilterOptions = [
    {
      label: "Yes",
      value: 1,
      template: (option) => (
        <Tag
          value="Yes"
          severity="danger"
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
          severity="success"
          style={{ fontSize: "11px", padding: "2px 6px" }}
        />
      ),
    },
  ];

  const paymentPendingFilterTemplate = (options) => (
    <Dropdown
      value={options.value}
      options={paymentPendingFilterOptions}
      onChange={(e) => options.filterApplyCallback(e.value)}
      placeholder="Select"
      className="p-column-filter"
      style={{ minWidth: "8rem" }}
      itemTemplate={(option) => option.template(option)}
      valueTemplate={(option) => (option ? option.template(option) : "Select")}
    />
  );

  const serialNumberBodyTemplate = (rowData) => {
    return isLoading ? (
      <div
        className="flex items-center justify-between"
        style={{ textAlign: "center" }}
      >
        <Skeleton width="80%" height="1.5rem" />
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
              copyToClipboard(rowData.serial_number, e.target, "serial")
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
        <Skeleton width="80%" height="1.5rem" />
        <Skeleton width="1rem" height="1rem" />
      </div>
    ) : (
      <div
        className="flex items-center justify-between"
        style={{ textAlign: "center" }}
      >
        <span
          style={{
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            marginRight: "8px",
          }}
          title={rowData.product_key}
        >
          {rowData.product_key || "-"}
        </span>
        {rowData.product_key && (
          <i
            className="pi pi-copy cursor-pointer text-blue-500 transition-all duration-100 hover:text-blue-600"
            onClick={(e) =>
              copyToClipboard(rowData.product_key, e.target, "product_key")
            }
            title="Copy product key"
            style={{ fontSize: "1rem", flexShrink: 0 }}
          />
        )}
      </div>
    );
  };

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

  const copyToClipboard = async (text, iconElement, type = "password") => {
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

    // Determine the message based on type
    const getSuccessMessage = (type) => {
      switch (type) {
        case "serial":
          return "Serial number copied to clipboard";
        case "product_key":
          return "Product key copied to clipboard";
        case "password":
        default:
          return "Password copied to clipboard";
      }
    };

    const getErrorMessage = (type) => {
      switch (type) {
        case "serial":
          return "Failed to copy serial number";
        case "product_key":
          return "Failed to copy product key";
        case "password":
        default:
          return "Failed to copy password";
      }
    };

    try {
      await navigator.clipboard.writeText(text);
      toast.current?.show({
        severity: "success",
        summary: "Copied",
        detail: getSuccessMessage(type),
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
          detail: getSuccessMessage(type),
          life: 2000,
        });
      } catch (fallbackErr) {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: getErrorMessage(type),
          life: 3000,
        });
      }
      document.body.removeChild(textArea);
    }
  };

  const mysqlPasswordBodyTemplate = (rowData) => {
    return isLoading ? (
      <div
        className="flex items-center justify-between"
        style={{ textAlign: "center" }}
      >
        <Skeleton width="80%" height="1.5rem" />
        <Skeleton width="1rem" height="1rem" />
      </div>
    ) : (
      <div
        className="flex items-center justify-between"
        style={{ textAlign: "center" }}
      >
        <span>{rowData.client_mysql_password || "-"}</span>
        {rowData.client_mysql_password && (
          <i
            className="pi pi-copy cursor-pointer text-blue-500 transition-all duration-100 hover:text-blue-600"
            onClick={(e) =>
              copyToClipboard(rowData.client_mysql_password, e.target, "password")
            }
            title="Copy password"
            style={{ fontSize: "1rem" }}
          />
        )}
      </div>
    );
  };

  const nfsBodyTemplate = (rowData) => {
    return isLoading ? (
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Skeleton width="2rem" height="1.5rem" />
      </div>
    ) : (
      <div style={{ textAlign: "center" }}>
        {(() => {
          const isNfs = rowData.is_nfs === 1;
          const style = {
            background: isNfs
              ? "linear-gradient(135deg, #132639 0%, #3973ac 100%)"
              : "linear-gradient(135deg, #1f2e2e 0%, #5c8a8a 100%)",
          };
          return <Tag style={style} value={isNfs ? "Yes" : "No"} />;
        })()}
      </div>
    );
  };

  const freeDemoBodyTemplate = (rowData) => {
    return isLoading ? (
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Skeleton width="2rem" height="1.5rem" />
      </div>
    ) : (
      <div style={{ textAlign: "center" }}>
        {(() => {
          const isFreeDemo = rowData.free_demo === 1;
          const style = {
            background: isFreeDemo
              ? "linear-gradient(135deg, #132639 0%, #3973ac 100%)"
              : "linear-gradient(135deg, #1f2e2e 0%, #5c8a8a 100%)",
          };
          return <Tag style={style} value={isFreeDemo ? "Yes" : "No"} />;
        })()}
      </div>
    );
  };

  const activeBodyTemplate = (rowData) => {
    return isLoading ? (
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Skeleton width="2rem" height="1.5rem" />
      </div>
    ) : (
      <div style={{ textAlign: "center" }}>
        {(() => {
          const isActive = rowData.is_active === 1;
          return (
            <Tag
              value={isActive ? "Yes" : "No"}
              severity={isActive ? "success" : "danger"}
            />
          );
        })()}
      </div>
    );
  };

  const paymentPendingBodyTemplate = (rowData) => {
    return isLoading ? (
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Skeleton width="2rem" height="1.5rem" />
      </div>
    ) : (
      <div style={{ textAlign: "center" }}>
        {(() => {
          const isPaymentPending = rowData.payment_pending === 1;
          return (
            <Tag
              value={isPaymentPending ? "Yes" : "No"}
              severity={isPaymentPending ? "danger" : "success"}
            />
          );
        })()}
      </div>
    );
  };

  const locationBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="70%" height="1.5rem" />
    ) : (
      <span>{rowData.location_name || "-"}</span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const dateBodyTemplate = (rowData, field) => {
    return isLoading ? (
      <Skeleton width="80%" height="1.5rem" />
    ) : (
      <span>{formatDate(rowData[field])}</span>
    );
  };

  return (
    <Page title="Serial Key Management">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : serialKeyList
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
                  "location_name",
                  "is_active",
                  "payment_pending",
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
                stateKey="serialKeyTableFilters"
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
                    title="No serial keys found"
                    subtitle="Generate serial keys to see them here"
                  />
                }
              >
                <Column
                  header="Sr No."
                  body={(rowData, options) =>
                    isLoading ? (
                      <div
                        style={{ display: "flex", justifyContent: "center" }}
                      >
                        <Skeleton width="1.5rem" height="1.5rem" />
                      </div>
                    ) : (
                      <div style={{ textAlign: "center" }}>
                        {options.rowIndex + 1}
                      </div>
                    )
                  }
                  style={{ minWidth: "5rem" }}
                />
                {visibleFields.some((col) => col.field === "serial_number") && (
                  <Column
                    field="serial_number"
                    header="Serial Number"
                    style={{ minWidth: "16rem" }}
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
                    style={{ minWidth: "15rem" }}
                    body={productKeyBodyTemplate}
                    filter
                    showFilterMenu={false}
                    filterPlaceholder="Search Product Key"
                    sortable
                  />
                )}
                {visibleFields.some(
                  (col) => col.field === "client_mysql_password",
                ) && (
                  <Column
                    field="client_mysql_password"
                    header="MySQL Password"
                    style={{ minWidth: "11rem" }}
                    body={mysqlPasswordBodyTemplate}
                    sortable={false}
                  />
                )}
                {visibleFields.some((c) => c.field === "is_nfs") && (
                  <Column
                    field="is_nfs"
                    header="Not For Sale"
                    style={{ minWidth: "10rem" }}
                    body={nfsBodyTemplate}
                    sortable
                    filter
                    showFilterMenu={false}
                    filterElement={nfsFilterTemplate}
                  />
                )}
                {visibleFields.some((c) => c.field === "free_demo") && (
                  <Column
                    field="free_demo"
                    header="Free Demo"
                    style={{ minWidth: "9rem" }}
                    body={freeDemoBodyTemplate}
                    sortable
                    filter
                    showFilterMenu={false}
                    filterElement={freeDemoFilterTemplate}
                  />
                )}
                {visibleFields.some((c) => c.field === "is_active") && (
                  <Column
                    field="is_active"
                    header="Active"
                    style={{ minWidth: "6rem" }}
                    body={activeBodyTemplate}
                    sortable
                    filter
                    showFilterMenu={false}
                    filterElement={activeFilterTemplate}
                  />
                )}
                {visibleFields.some((c) => c.field === "payment_pending") && (
                  <Column
                    field="payment_pending"
                    header="Payment Pending"
                    style={{ minWidth: "13rem" }}
                    body={paymentPendingBodyTemplate}
                    sortable
                    filter
                    showFilterMenu={false}
                    filterElement={paymentPendingFilterTemplate}
                  />
                )}
                {visibleFields.some((col) => col.field === "location_name") && (
                  <Column
                    field="location_name"
                    header="Location"
                    style={{ minWidth: "10rem" }}
                    body={locationBodyTemplate}
                    sortable
                  />
                )}
                {visibleFields.some(
                  (col) => col.field === "activation_date",
                ) && (
                  <Column
                    field="activation_date"
                    header="Activation Date"
                    style={{ minWidth: "12rem" }}
                    body={(rowData) =>
                      dateBodyTemplate(rowData, "activation_date")
                    }
                    sortable
                  />
                )}
                {visibleFields.some((col) => col.field === "created_at") && (
                  <Column
                    field="created_at"
                    header="Created At"
                    style={{ minWidth: "9rem" }}
                    body={(rowData) => dateBodyTemplate(rowData, "created_at")}
                    sortable
                  />
                )}
              </DataTable>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        visible={showGenerateDialog}
        style={{ width: "40rem" }}
        breakpoints={{ "960px": "75vw", "641px": "90vw" }}
        header="Generate Serial Key"
        modal
        className="p-fluid"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Cancel"
              icon="pi pi-times"
              onClick={() => {
                setShowGenerateDialog(false);
                setGenerateFormData({
                  addnumber: null,
                  is_nfs: false,
                  free_demo: false,
                });
                setFormErrors({});
              }}
              disabled={isGenerating}
              className="border-none bg-red-500 text-white hover:bg-red-600"
            />
            <Button
              label={isGenerating ? "Generating..." : "Generate"}
              icon={isGenerating ? "pi pi-spin pi-spinner" : "pi pi-check"}
              onClick={handleGenerateSerialKey}
              disabled={isGenerating}
              className="border-none bg-green-500 text-white hover:bg-green-600 disabled:opacity-70"
            />
          </div>
        }
        onHide={() => setShowGenerateDialog(false)}
        blockScroll={true}
        draggable={false}
        resizable={false}
        dismissableMask
      >
        <div className="grid gap-4 sm:grid-cols-1">
          {/* Product Key */}
          <div className="input-root">
            <label
              htmlFor="productKey"
              className="label-default text-base font-semibold"
            >
              Product Key <span className="text-red-600">*</span>
            </label>
            <InputNumber
              id="productKey"
              value={generateFormData.addnumber}
              onValueChange={(e) => {
                setGenerateFormData((prev) => ({
                  ...prev,
                  addnumber: e.value,
                }));
                setFormErrors({ ...formErrors, addnumber: null });
              }}
              placeholder="Enter number of keys to generate"
              min={1}
              max={100}
              autoFocus
              disabled={isGenerating}
              className={formErrors.addnumber ? "p-invalid" : ""}
            />
            {formErrors.addnumber && (
              <small className="p-error">
                {formErrors.addnumber}
              </small>
            )}
          </div>

          {/* Checkboxes */}
          <div className="input-root">
            <div className="flex flex-wrap gap-6">
              <div className="align-items-center flex">
                <Checkbox
                  inputId="isNfs"
                  checked={generateFormData.is_nfs}
                  onChange={(e) =>
                    setGenerateFormData((prev) => ({
                      ...prev,
                      is_nfs: e.checked,
                      free_demo: e.checked ? prev.free_demo : false,
                    }))
                  }
                  disabled={isGenerating}
                />
                <label
                  htmlFor="isNfs"
                  className="ml-2 cursor-pointer text-base font-semibold"
                >
                  Is not for sale?
                </label>
              </div>

              {generateFormData.is_nfs && (
                <div className="align-items-center flex">
                  <Checkbox
                    inputId="freeDemo"
                    checked={generateFormData.free_demo}
                    onChange={(e) =>
                      setGenerateFormData((prev) => ({
                        ...prev,
                        free_demo: e.checked,
                      }))
                    }
                    disabled={isGenerating}
                  />
                  <label
                    htmlFor="freeDemo"
                    className="ml-2 cursor-pointer text-base font-semibold"
                  >
                    Is free demo? <small>(21 days)</small>
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      </Dialog>
    </Page>
  );
}
