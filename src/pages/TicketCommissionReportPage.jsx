import { useState, useEffect } from "react";
import AppSelect from "../component/common/AppSelect";
import { useNavigate } from "react-router-dom";
import { FileSpreadsheet, FileText } from "lucide-react";
import { Autocomplete, TextField, Checkbox } from "@mui/material";
import SearchTextHighlight from "../component/common/SearchTextHighlight";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import ticketCommissionReportApi from "../services/api/ticketCommissionReport";
import usersApi from "../services/api/users";
import { useAuth } from "../context/AuthContextHook";
import PremiumErrorAlert from "../component/common/PremiumErrorAlert";
import { useBackendLocalization } from "../hooks/useBackendLocalization";
import { getApiErrorMessage } from "../utils/apiError";
import { useBackendEnumOptions } from "../hooks/useBackendEnumOptions";
import { useReportTemplateLines } from "../hooks/useReportTemplateLines";

// Status and service planned type options are loaded from the backend enums;
// these are backend enum member names, used as identifiers only.
const STATUS_CLOSED = "Closed";
const STATUS_EXCLUDED = ["SelectAnOption"];
const SERVICE_PLANNED_TYPE_EXCLUDED = ["SelectAnOption", "All"];

const formatInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Same defaults as the backend AMSTicketSearchDto: first of this month to today, Closed.
const getDefaultFilters = () => {
  const today = new Date();
  return {
    performedByUsers: [],
    dateFrom: formatInputDate(new Date(today.getFullYear(), today.getMonth(), 1)),
    dateTo: formatInputDate(today),
    servicePlannedTypes: [],
    status: STATUS_CLOSED,
  };
};

// Columns follow the backend report template
// (Blazor.Client/wwwroot/Reports/TicketsWithCommissionsReport.mrt); each header
// text matches the backend localization key used for it.
const REPORT_COLUMNS = [
  { field: "CustomerName", labelKey: "CustomerUserId", width: 150, align: "left" },
  { field: "CMSNextTicketNo", labelKey: "CMSNextTicketNo", width: 120 },
  { field: "TicketReceivedDate", labelKey: "TicketReceivedDate", width: 130 },
  { field: "TicketStatus", labelKey: "Status", width: 80 },
  { field: "CMSTicketClosedOn", labelKey: "CMSTicketClosedOn", width: 130 },
  { field: "ActivityTotalDurationForSpecificUser", labelKey: "ActivityTotalDuration", width: 100 },
];

// Shown only when the backend sets ShowTotalAmountForEachTicket (admins).
const TICKET_TOTAL_COLUMN = { field: "TotalAmountForEachTicket", labelKey: "TotalAmount", width: 100 };

// The API may camelCase the DTO property names, so match them case-insensitively.
const getRowValue = (row, field) => {
  if (!row) return undefined;
  const matchingKey = Object.keys(row).find(
    (key) => key.toLowerCase() === field.toLowerCase(),
  );
  return matchingKey ? row[matchingKey] : undefined;
};

const formatCellValue = (value) =>
  value === null || value === undefined || value === "" ? "-" : String(value);

const userHasRole = (user, requiredRole) => {
  const roles = user?.roles ?? user?.role ?? [];
  const normalizedRoles = Array.isArray(roles) ? roles : String(roles).split(",");
  return normalizedRoles.some(
    (role) => String(role).trim().toLowerCase() === requiredRole.toLowerCase(),
  );
};

// Blazor sends the selected day at 23:59:59 local time.
const toApiDate = (value) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59).toISOString();
};

// Height, padding and border come from the shared .report-filters styles.
const multiSelectSx = {
  "& .MuiSvgIcon-root": { color: "inherit" },
  "& .MuiChip-root": {
    height: "22px",
    backgroundColor: "rgba(236, 72, 153, 0.1)",
    color: "#db2777",
    "& .MuiChip-deleteIcon": { color: "#db2777" },
  },
};

const multiSelectPaperProps = {
  paper: { className: "bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg" },
};

const renderCheckboxOption = (getLabel) => {
  const CheckboxOption = (props, option, { selected, inputValue }) => {
    const { key, ...restProps } = props;
    return (
      <li key={key} {...restProps} style={{ fontSize: "11px", padding: "4px 8px" }} className="hover:bg-slate-50 dark:hover:bg-slate-800">
        <Checkbox style={{ marginRight: 8, padding: 0 }} checked={selected} size="small" sx={{ "&.Mui-checked": { color: "#ec4899" } }} />
        <span className="text-slate-900 dark:text-white">
          <SearchTextHighlight text={getLabel(option)} query={inputValue} />
        </span>
      </li>
    );
  };
  return CheckboxOption;
};

const getUserLabel = (option) => option.name || option.userName || "";
const getTypeLabel = (option) => option.label || "";

export default function TicketCommissionReportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = userHasRole(user, "admin");
  const localize = useBackendLocalization("Billing");
  const statusOptions = useBackendEnumOptions("StatusEnum", localize, { exclude: STATUS_EXCLUDED });
  const servicePlannedTypeOptions = useBackendEnumOptions("ServicePlannedTypeEnum", localize, {
    exclude: SERVICE_PLANNED_TYPE_EXCLUDED,
  });

  const [filters, setFilters] = useState(getDefaultFilters);
  const [usersList, setUsersList] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!isAdmin) return;
    const fetchUsers = async () => {
      try {
        const data = await usersApi.getUsersList({
          organizationTypes: ["VendorSureze"],
          isITS: true,
          onlyLoadCurrentUser: false,
        });
        setUsersList(data?.items || data || []);
      } catch (error) {
        console.error("Failed to fetch users", error);
        setFormError(getApiErrorMessage(error) || localize("DefaultErrorMessage"));
      }
    };
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const reportDetails = getRowValue(report, "TicketsWithCommissionsDetails") || [];
  const showTicketTotal = Boolean(getRowValue(report, "ShowTotalAmountForEachTicket"));
  const visibleColumns = showTicketTotal ? [...REPORT_COLUMNS, TICKET_TOTAL_COLUMN] : REPORT_COLUMNS;
  const tableWidth = visibleColumns.reduce((total, column) => total + column.width, 0);
  const getColumnLabel = (column) => localize(column.labelKey);

  const isClosedStatus = filters.status === STATUS_CLOSED;
  // Blazor uses the backend's "TicketRecevied…" keys here; the correctly spelled
  // "TicketReceived…" keys hold the same labels without the typo.
  const dateFromLabel = localize(isClosedStatus ? "TicketClosedDateFrom" : "TicketReceivedDateFrom");
  const dateToLabel = localize(isClosedStatus ? "TicketClosedDateTo" : "TicketReceivedDateTo");

  // "Generated By / On" and summary lines come from the backend report template.
  const { generatedItems: templateGeneratedItems, summaryItems } = useReportTemplateLines(
    "TicketsWithCommissionsReport",
    (field) => getRowValue(report, field),
  );
  // Generated By / On are always shown. Labels come from the backend template, or
  // until it loads, from the backend report field names ("GeneratedBy" -> "Generated By").
  const generatedItems = ["GeneratedBy", "GeneratedOn"].map((field) => ({
    field,
    label:
      templateGeneratedItems.find((item) => item.field === field)?.label ||
      field.replace(/([a-z])([A-Z])/g, "$1 $2"),
    value: getRowValue(report, field),
  }));
  const generatedLines = generatedItems.map((item) => `${item.label} : ${item.value ?? ""}`);
  // Until the template loads, the summary uses the matching backend localization keys.
  const reportSummaryItems = summaryItems.length > 0
    ? summaryItems
    : [
      { field: "UserNames", labelKey: "Name" },
      { field: "DateFrom", labelKey: "DateFrom" },
      { field: "DateTo", labelKey: "DateTo" },
      { field: "TotalAmount", labelKey: "TotalAmount" },
    ].map((item) => ({ ...item, label: localize(item.labelKey), value: getRowValue(report, item.field) }));
  // Summary cells sit under the same columns as in the backend template:
  // Name under Customer + CMS Next Ticket No, Date From under Ticket Received,
  // Date To under Status + CMS Ticket Closed On, Total Amount under the rest.
  const SUMMARY_COL_SPANS = [2, 1, 2];
  const getSummaryColSpan = (index) => {
    const usedColumns = SUMMARY_COL_SPANS.slice(0, index).reduce((total, span) => total + span, 0);
    if (index === reportSummaryItems.length - 1) return Math.max(visibleColumns.length - usedColumns, 1);
    return SUMMARY_COL_SPANS[index] ?? 1;
  };

  const handleClear = () => {
    setFilters(getDefaultFilters());
    setReport(null);
    setFormError("");
  };

  // Same checks, in the same order, as the Blazor page.
  const validateFilters = () => {
    if (isAdmin && filters.performedByUsers.length === 0) return localize("UserIdRequiredMessage");
    if (!filters.dateFrom) return localize("DateFromRequiredMessage");
    if (!filters.dateTo) return localize("DateToRequiredMessage");
    if (filters.servicePlannedTypes.length === 0) return localize("ServicePlannedTypeRequiredMessage");
    return "";
  };

  const handleGetReport = async () => {
    setFormError("");
    const validationMessage = validateFilters();
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    try {
      setLoading(true);
      const data = await ticketCommissionReportApi.getReport({
        DateFrom: toApiDate(filters.dateFrom),
        DateTo: toApiDate(filters.dateTo),
        Status: filters.status,
        TicketType: "ServicePlanned",
        ServicePlannedTypes: filters.servicePlannedTypes,
        PerformedByUsers: isAdmin ? filters.performedByUsers : [user?.id].filter(Boolean),
      });
      const details = getRowValue(data, "TicketsWithCommissionsDetails") || [];

      if (details.length === 0) {
        setReport(null);
        setFormError(localize("NoReportFound"));
      } else {
        setReport(data);
      }
    } catch (error) {
      console.error("Failed to get report:", error);
      setReport(null);
      setFormError(getApiErrorMessage(error) || localize("DefaultErrorMessage"));
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (reportDetails.length === 0) return;
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(localize("TicketsWithCommissionsReport") || "TicketsWithCommissionsReport");

      generatedLines.forEach((line) => worksheet.addRow([line]));
      worksheet.addRow([]);

      const headerRow = worksheet.addRow(visibleColumns.map(getColumnLabel));
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEC4899" } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      });

      reportDetails.forEach((row) => {
        worksheet.addRow(visibleColumns.map((column) => getRowValue(row, column.field) ?? ""));
      });

      // Closing summary row, each cell merged across the same columns as on screen.
      const summaryRow = worksheet.addRow([]);
      let summaryColumn = 1;
      reportSummaryItems.forEach((item, index) => {
        const span = getSummaryColSpan(index);
        const cell = summaryRow.getCell(summaryColumn);
        cell.value = `${item.label} : ${item.value ?? ""}`;
        cell.font = { bold: true };
        if (span > 1) {
          worksheet.mergeCells(summaryRow.number, summaryColumn, summaryRow.number, summaryColumn + span - 1);
        }
        summaryColumn += span;
      });

      worksheet.columns.forEach((column, index) => {
        column.width = Math.round((visibleColumns[index]?.width ?? 120) / 6);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        getDownloadFileName("xlsx"),
      );
    } catch (error) {
      console.error("Export failed:", error);
      setFormError(localize("DefaultErrorMessage"));
    }
  };

  // e.g. TicketsWithCommissionsReport_Ali_Ahmad_01-10-2026_28-10-2026.pdf, using the
  // user name(s) and date range the backend returned for this report.
  const getDownloadFileName = (extension) => {
    const safePart = (value) =>
      String(value ?? "")
        .trim()
        .replace(/[<>:"/\\|?*]+/g, "-")
        .replace(/[\s,]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^[_-]+|[_-]+$/g, "");
    const parts = [
      "TicketsWithCommissionsReport",
      getRowValue(report, "UserNames"),
      getRowValue(report, "DateFrom"),
      getRowValue(report, "DateTo"),
    ].map(safePart).filter(Boolean);
    return `${parts.join("_")}.${extension}`;
  };

  // PDF laid out like the grid: Generated By / On, column headers, rows, summary row.
  const handleExportPdf = () => {
    if (reportDetails.length === 0) return;
    try {
      const document = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      document.setFontSize(14);
      document.text(localize("TicketsWithCommissionsReport"), 40, 35);
      document.setFontSize(9);
      generatedLines.forEach((line, index) => document.text(line, 40, 54 + index * 14));

      autoTable(document, {
        startY: 54 + generatedLines.length * 14,
        head: [visibleColumns.map(getColumnLabel)],
        body: reportDetails.map((row) =>
          visibleColumns.map((column) => formatCellValue(getRowValue(row, column.field))),
        ),
        foot: [
          reportSummaryItems.map((item, index) => ({
            content: `${item.label} : ${item.value ?? ""}`,
            colSpan: getSummaryColSpan(index),
          })),
        ],
        showFoot: "lastPage",
        styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak", halign: "center", valign: "middle" },
        columnStyles: { 0: { halign: "left" } },
        headStyles: { fillColor: [253, 242, 248], textColor: [190, 24, 93], fontStyle: "bold" },
        footStyles: { fillColor: [253, 242, 248], textColor: [15, 23, 42], fontStyle: "bold", halign: "left" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      document.save(getDownloadFileName("pdf"));
    } catch (error) {
      console.error("PDF export failed:", error);
      setFormError(localize("DefaultErrorMessage"));
    }
  };

  const filterInputClass =
    "w-full h-[34px] px-3 text-xs font-semibold bg-white dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/50 rounded-xl outline-none focus:border-pink-500 transition-all shadow-sm text-slate-900 dark:text-white";
  const filterLabelClass =
    "text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1";
  const headerCellClass =
    "border-b border-r last:border-r-0 border-pink-100 dark:border-slate-700 bg-pink-50 dark:bg-slate-800 px-3 py-3 text-[10px] font-black uppercase tracking-wide text-pink-700 dark:text-pink-200 text-center align-middle leading-tight break-words";

  return (
    <div className="min-h-full w-full bg-[#f8fafc] dark:bg-slate-950 p-1 pb-[10px] flex flex-col relative overflow-visible font-[Arial] text-slate-900 dark:text-white">
      <div className="flex-1 w-full bg-white dark:bg-[#161920] border border-slate-200 dark:border-slate-800/50 shadow-sm flex flex-col rounded-3xl">
        {/* Header */}
        <div className="app-page-header flex flex-col gap-6 py-8 px-4 md:px-8 transition-colors border-b border-slate-100 dark:border-slate-800/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <nav className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-600 mb-1">
                <span onClick={() => navigate("/")} className="hover:opacity-80 cursor-pointer transition-all hover:text-pink-500">
                  {localize("Home")}
                </span>
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <span>{localize("Permission:Reports")}</span>
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <span className="text-pink-500 font-black">{localize("TicketsWithCommissionsReport")}</span>
              </nav>
              <h1 className="text-4xl font-black tracking-tighter flex items-center gap-3">
                {localize("TicketsWithCommissionsReport")}
                {loading && <span className="w-4 h-4 border-2 border-slate-800 dark:border-white border-t-transparent rounded-full animate-spin"></span>}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleClear}
                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold hover:border-slate-400 dark:hover:border-slate-500 transition-all active:scale-95 shadow-sm text-slate-700 dark:text-slate-300"
              >
                {localize("Clear")}
              </button>

              {reportDetails.length > 0 && (
                // The backend has no localization key for a PDF export, so this label is fixed text.
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-700 shadow-sm transition-all hover:border-rose-300 hover:bg-rose-100 active:scale-95 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                >
                  <FileText size={13} />
                  Export PDF
                </button>
              )}

              {reportDetails.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-100 active:scale-95 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                >
                  <FileSpreadsheet size={13} />
                  {localize("GetExcelReport")}
                </button>
              )}

              <button
                onClick={handleGetReport}
                disabled={loading}
                className="app-primary-button flex items-center gap-2 px-4 py-1.5 text-[11px]"
              >
                {loading ? localize("LoadingWithThreeDot") : localize("GetReport")}
              </button>
            </div>
          </div>

          {/* Filter Section */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? "lg:grid-cols-5" : "lg:grid-cols-4"} items-end gap-4 w-full report-filters`}>
            {isAdmin && (
              <div className="flex flex-col gap-1 w-full min-w-0">
                <label className={filterLabelClass}>
                  {localize("User")} <span className="required-asterisk">*</span>
                </label>
                <Autocomplete
                  size="small"
                  limitTags={1}
                  multiple
                  options={usersList}
                  disableCloseOnSelect
                  componentsProps={multiSelectPaperProps}
                  getOptionLabel={getUserLabel}
                  value={usersList.filter((u) => filters.performedByUsers.includes(u.id))}
                  onChange={(e, newValue) => setFilters((current) => ({ ...current, performedByUsers: newValue.map((v) => v.id) }))}
                  renderOption={renderCheckboxOption(getUserLabel)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      placeholder={filters.performedByUsers.length ? "" : localize("SelectBoxEmptyValueText")}
                      className="rounded-xl"
                      sx={multiSelectSx}
                    />
                  )}
                  sx={{ width: "100%", color: "inherit" }}
                />
              </div>
            )}

            <div className="flex flex-col gap-1 w-full min-w-0">
              <label className={filterLabelClass}>
                {dateFromLabel} <span className="required-asterisk">*</span>
              </label>
              <Flatpickr
                value={filters.dateFrom}
                onChange={(dates, dateStr) => setFilters((current) => ({ ...current, dateFrom: dateStr }))}
                options={{ dateFormat: "Y-m-d", allowInput: true }}
                onInput={(e) => setFilters((current) => ({ ...current, dateFrom: e.target.value }))}
                className={filterInputClass}
              />
            </div>

            <div className="flex flex-col gap-1 w-full min-w-0">
              <label className={filterLabelClass}>
                {dateToLabel} <span className="required-asterisk">*</span>
              </label>
              <Flatpickr
                value={filters.dateTo}
                onChange={(dates, dateStr) => setFilters((current) => ({ ...current, dateTo: dateStr }))}
                options={{ dateFormat: "Y-m-d", allowInput: true }}
                onInput={(e) => setFilters((current) => ({ ...current, dateTo: e.target.value }))}
                className={filterInputClass}
              />
            </div>

            <div className="flex flex-col gap-1 w-full min-w-0">
              <label className={filterLabelClass}>
                {localize("ServicePlannedType")} <span className="required-asterisk">*</span>
              </label>
              <Autocomplete
                size="small"
                limitTags={1}
                multiple
                options={servicePlannedTypeOptions}
                disableCloseOnSelect
                componentsProps={multiSelectPaperProps}
                getOptionLabel={getTypeLabel}
                isOptionEqualToValue={(option, value) => option.name === value.name}
                value={servicePlannedTypeOptions.filter((t) => filters.servicePlannedTypes.includes(t.name))}
                onChange={(e, newValue) => setFilters((current) => ({ ...current, servicePlannedTypes: newValue.map((v) => v.name) }))}
                renderOption={renderCheckboxOption(getTypeLabel)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    placeholder={filters.servicePlannedTypes.length ? "" : localize("SelectBoxEmptyValueText")}
                    className="rounded-xl"
                    sx={multiSelectSx}
                  />
                )}
                sx={{ width: "100%", color: "inherit" }}
              />
            </div>

            <div className="flex flex-col gap-1 w-full min-w-0">
              <label className={filterLabelClass}>{localize("Status")}</label>
              <AppSelect
                value={filters.status}
                onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value }))}
                className="w-full h-[34px] text-xs font-semibold"
              >
                {statusOptions.map((status) => (
                  <option key={status.name} value={status.name}>{status.label}</option>
                ))}
              </AppSelect>
            </div>
          </div>
        </div>

        {/* Report */}
        <div className="flex-1 flex flex-col relative p-4 h-auto w-full">
          {formError && (
            <div className="mb-4">
              <PremiumErrorAlert open={!!formError} message={formError} onClose={() => setFormError("")} />
            </div>
          )}

          {reportDetails.length > 0 && (
            <div className="flex flex-col gap-4 w-full">
              {/* Data grid: fills the full width; scrolls sideways only on narrow screens.
                  Like the backend report, Generated By / On sit above the column headers
                  and Name, Date From, Date To, Total Amount form the closing row. */}
              <div className="w-full max-h-[70vh] overflow-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <table className="w-full table-fixed border-separate border-spacing-0 text-[12px]" style={{ minWidth: tableWidth }}>
                  <colgroup>
                    {visibleColumns.map((column) => (
                      <col key={column.field} style={{ width: `${(column.width / tableWidth) * 100}%` }} />
                    ))}
                  </colgroup>
                  <thead className="sticky top-0 z-10">
                    {generatedItems.length > 0 && (
                      <tr>
                        <th
                          colSpan={visibleColumns.length}
                          className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-[#161920] px-3 py-2 text-left align-middle"
                        >
                          <div className="flex flex-col gap-0.5 text-[11px] font-semibold normal-case text-slate-600 dark:text-slate-300">
                            {generatedItems.map((item) => (
                              <span key={item.field}>
                                {item.label} : <span className="text-slate-900 dark:text-white">{formatCellValue(item.value)}</span>
                              </span>
                            ))}
                          </div>
                        </th>
                      </tr>
                    )}
                    <tr>
                      {visibleColumns.map((column) => (
                        <th key={column.field} className={headerCellClass}>
                          {getColumnLabel(column)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportDetails.map((row, rowIndex) => (
                      <tr
                        key={`${getRowValue(row, "CMSNextTicketNo")}-${rowIndex}`}
                        className={`transition-colors hover:bg-pink-50/60 dark:hover:bg-pink-500/5 ${rowIndex % 2 === 0 ? "bg-white dark:bg-[#161920]" : "bg-slate-50/80 dark:bg-white/[0.03]"}`}
                      >
                        {visibleColumns.map((column) => (
                          <td
                            key={column.field}
                            className={`border-b border-r last:border-r-0 border-slate-100 dark:border-slate-800 px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-100 tabular-nums align-middle break-words ${column.align === "left" ? "text-left" : "text-center"}`}
                          >
                            {formatCellValue(getRowValue(row, column.field))}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="sticky bottom-0 z-10">
                    <tr>
                      {reportSummaryItems.map((item, index) => (
                        <td
                          key={item.field}
                          colSpan={getSummaryColSpan(index)}
                          className="border-t-2 border-r last:border-r-0 border-pink-200 dark:border-slate-600 bg-pink-50 dark:bg-slate-800 px-3 py-3 text-[12px] font-black text-slate-900 dark:text-white align-middle break-words"
                        >
                          <span className="text-pink-700 dark:text-pink-200">{item.label} :</span> {formatCellValue(item.value)}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
