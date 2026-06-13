const EXCEL_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8";
const EXCEL_EXTENSION = ".xlsx";

export const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

export const inRange = (value, range) => {
  if (!range || !range[0]) return true;
  const target = parseDate(value);
  if (!target) return false;

  const fromDate = new Date(range[0]);
  const toDate = new Date(range[1] || range[0]);
  fromDate.setHours(0, 0, 0, 0);
  toDate.setHours(23, 59, 59, 999);

  return target >= fromDate && target <= toDate;
};

export const saveAsExcelFile = (buffer, fileName) => {
  import("file-saver").then((module) => {
    if (module?.default) {
      const data = new Blob([buffer], { type: EXCEL_TYPE });
      module.default.saveAs(
        data,
        `${fileName}_export_${new Date().getTime()}${EXCEL_EXTENSION}`,
      );
    }
  });
};

export const parseIsoDate = (value) => {
  if (!value || typeof value !== "string") return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

export const formatDateForFilter = (value) => {
  if (!(value instanceof Date)) return null;
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const restoreSessionState = (sessionKey, defaultFilters) => {
  const raw = sessionStorage.getItem(sessionKey);
  if (!raw) return null;

  const parsed = JSON.parse(raw);
  let mergedFilters = null;
  let sortField;
  let sortOrder;

  if (parsed.filters) {
    mergedFilters = { ...defaultFilters };
    Object.keys(defaultFilters).forEach((key) => {
      const existing = parsed.filters[key];
      if (existing && typeof existing === "object") {
        const normalizedValue =
          existing.value ??
          (Array.isArray(existing.constraints)
            ? existing.constraints.find((item) => item?.value != null)?.value
            : null) ??
          null;
        mergedFilters[key] = { ...defaultFilters[key], value: normalizedValue };
      }
    });
    parsed.filters = mergedFilters;
    sessionStorage.setItem(sessionKey, JSON.stringify(parsed));
  }

  if (parsed.sortField !== undefined && parsed.sortOrder !== undefined) {
    sortField = parsed.sortField;
    sortOrder = parsed.sortOrder;
  }

  return { filters: mergedFilters, sortField, sortOrder };
};
