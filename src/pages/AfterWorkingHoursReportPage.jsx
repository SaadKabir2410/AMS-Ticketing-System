import { useState, useEffect } from "react";
import AppSelect from "../component/common/AppSelect";
import { useNavigate } from "react-router-dom";
import { FileSpreadsheet, FileText } from "lucide-react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import usersApi from "../services/api/users";
import afterWorkingHoursReportApi from "../services/api/afterWorkingHoursReport";
import PremiumErrorAlert from "../component/common/PremiumErrorAlert";
import { useAuth } from "../context/AuthContextHook";
import { useBackendLocalization } from "../hooks/useBackendLocalization";
import { getApiErrorMessage } from "../utils/apiError";
import { useBackendEnumOptions } from "../hooks/useBackendEnumOptions";
import { useReportTemplateLines } from "../hooks/useReportTemplateLines";

// Status options are loaded from the backend StatusEnum; these are backend enum
// member names, used as identifiers only.
const STATUS_CLOSED = "Closed";
const STATUS_EXCLUDED = ["SelectAnOption"];

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
    user: "",
    dateFrom: formatInputDate(new Date(today.getFullYear(), today.getMonth(), 1)),
    dateTo: formatInputDate(today),
    status: STATUS_CLOSED,
  };
};

// Columns follow the backend report template
// (Blazor.Client/wwwroot/Reports/AfterWorkingHoursReport.mrt); each header text
// matches the backend localization key used for it.
const REPORT_COLUMNS = [
  { field: "SiteName", labelKey: "SiteName", width: 150, align: "left" },
  { field: "SiteOCN", labelKey: "SiteOCN", width: 90 },
  { field: "CMSNextTicketNo", labelKey: "CMSNextTicketNo", width: 110 },
  { field: "TicketReceivedOn", labelKey: "TicketReceivedDate", width: 120 },
  { field: "Status", labelKey: "Status", width: 70 },
  { field: "TicketClosedByName", labelKey: "TicketClosedById", width: 100 },
  { field: "CMSTicketClosedOn", labelKey: "CMSTicketClosedOn", width: 120 },
  { field: "CreatedBy", labelKey: "CreatedBy", width: 100 },
  { field: "ActivityTotalDuration", labelKey: "ActivityTotalDuration", width: 80 },
  {
    field: "AfterWorkingHoursActivityTotalDurationForSpecificUserSpendTime",
    labelKey: "AfterWorkingHoursActivityTotalDurationForSpecificUser",
    includesUserName: true,
    width: 110,
  },
  { field: "Amount", labelKey: "AfterWorkingHoursActivityTotalCostForSpecificUser", width: 80 },
];

// Shown only when the backend sets ShowTotalAmountForEachTicket (admins).
const TICKET_TOTAL_COLUMN = { field: "TotalAmountForEachTicket", labelKey: "TotalAmount", width: 90 };

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

const safeFilePart = (value, fallback) =>
  String(value ?? fallback)
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[<>:"/\\|?*]/g, "-");

const formatFileDate = (value) => {
  const displayedDateMatch = String(value || "").match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (displayedDateMatch) {
    return `${displayedDateMatch[3]}${displayedDateMatch[2].padStart(2, "0")}${displayedDateMatch[1].padStart(2, "0")}`;
  }
  const isoDateMatch = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDateMatch) return `${isoDateMatch[1]}${isoDateMatch[2]}${isoDateMatch[3]}`;
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return safeFilePart(value, "");
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
};

const formatFileAmount = (value) => {
  const amount = String(value ?? 0).trim().replace(/^RM\s*/i, "");
  return `RM${safeFilePart(amount, 0)}`;
};

// Blazor sends the selected day at 23:59:59 local (Malaysia) time.
const toApiDate = (value) => (value ? `${value}T15:59:59.0000000Z` : undefined);

export default function AfterWorkingHoursReportPage() {
  const { user } = useAuth();
  const isAdmin = userHasRole(user, "admin");
  const navigate = useNavigate();
  const localize = useBackendLocalization("Billing");
  const statusOptions = useBackendEnumOptions("StatusEnum", localize, { exclude: STATUS_EXCLUDED });
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

  const reportDetails = getRowValue(report, "AfterWorkingHoursDetails") || [];
  const reportUserName = getRowValue(report, "UserName") || "";
  const showTicketTotal = Boolean(getRowValue(report, "ShowTotalAmountForEachTicket"));
  const visibleColumns = showTicketTotal ? [...REPORT_COLUMNS, TICKET_TOTAL_COLUMN] : REPORT_COLUMNS;
  const tableWidth = visibleColumns.reduce((total, column) => total + column.width, 0);

  const getColumnLabel = (column) => {
    const label = localize(column.labelKey);
    return column.includesUserName ? label.replace("{0}", reportUserName) : label;
  };

  // "Generated By / On" and summary lines come from the backend report template.
  const { generatedLines, summaryLines } = useReportTemplateLines(
    "AfterWorkingHoursReport",
    (field) => getRowValue(report, field),
  );
  const generatedOn = getRowValue(report, "GeneratedOn");

  const isClosedStatus = filters.status === STATUS_CLOSED;
  const dateFromLabel = localize(isClosedStatus ? "TicketClosedDateFrom" : "TicketReceivedDateFrom");
  const dateToLabel = localize(isClosedStatus ? "TicketClosedDateTo" : "TicketReceivedDateTo");

  const handleClear = () => {
    setFormError("");
    setFilters(getDefaultFilters());
    setReport(null);
  };

  // Same checks, in the same order, as the Blazor page.
  const validateFilters = () => {
    if (isAdmin && !filters.user) return localize("UserIdRequiredMessage");
    if (!filters.dateFrom) return localize("DateFromRequiredMessage");
    if (!filters.dateTo) return localize("DateToRequiredMessage");
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
      const data = await afterWorkingHoursReportApi.getReport({
        UserId: isAdmin ? filters.user : user?.id,
        DateFrom: toApiDate(filters.dateFrom),
        DateTo: toApiDate(filters.dateTo),
        Status: filters.status,
      });
      const details = getRowValue(data, "AfterWorkingHoursDetails") || [];

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

  const getDownloadFileName = (extension) => {
    const userPart = safeFilePart(reportUserName, "User");
    const generatedDate = formatFileDate(generatedOn);
    const amount = formatFileAmount(getRowValue(report, "TotalAmount"));
    return `(${userPart})_AMS OT CLAIM_${generatedDate}_${amount}.${extension}`;
  };

  const handleExportExcel = async () => {
    if (reportDetails.length === 0) return;
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(localize("AfterWorkingHoursReport") || "AfterWorkingHoursReport");

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

      worksheet.addRow([]);
      worksheet.addRow(summaryLines);

      worksheet.columns.forEach((column, index) => {
        column.width = Math.round((visibleColumns[index]?.width ?? 100) / 6);
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

  const handleExportPdf = () => {
    if (reportDetails.length === 0) return;
    try {
      const document = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      document.setFontSize(14);
      document.text(localize("AfterWorkingHoursReport"), 40, 35);
      document.setFontSize(9);
      generatedLines.forEach((line, index) => document.text(line, 40, 52 + index * 14));
      autoTable(document, {
        startY: 52 + generatedLines.length * 14,
        head: [visibleColumns.map(getColumnLabel)],
        body: reportDetails.map((row) => visibleColumns.map((column) => getRowValue(row, column.field) ?? "")),
        foot: summaryLines.length
          ? [[{ content: summaryLines.join("     "), colSpan: visibleColumns.length }]]
          : undefined,
        styles: { fontSize: 6, cellPadding: 3, overflow: "linebreak", halign: "center" },
        headStyles: { fillColor: [236, 72, 153] },
        footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], halign: "left" },
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
    "border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1 py-1.5 text-[9px] font-black uppercase text-slate-700 dark:text-slate-200 text-center align-middle leading-tight break-words";

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
                <span className="text-pink-500 font-black">{localize("AfterWorkingHoursReport")}</span>
              </nav>
              <h1 className="text-4xl font-black tracking-tighter flex items-center gap-3">
                {localize("AfterWorkingHoursReport")}
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
                <>
                  {/* The backend has no localization key for a PDF export, so this label is fixed text. */}
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-700 shadow-sm transition-all hover:border-rose-300 hover:bg-rose-100 active:scale-95 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                  >
                    <FileText size={13} />
                    Export PDF
                  </button>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-100 active:scale-95 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                  >
                    <FileSpreadsheet size={13} />
                    {localize("GetExcelReport")}
                  </button>
                </>
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
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? "lg:grid-cols-4" : "lg:grid-cols-3"} items-end gap-4 w-full report-filters`}>
            {isAdmin && (
              <div className="flex flex-col gap-1 w-full">
                <label className={filterLabelClass}>
                  {localize("User")} <span className="required-asterisk">*</span>
                </label>
                <AppSelect
                  value={filters.user}
                  onChange={(e) => setFilters({ ...filters, user: e.target.value })}
                  className="w-full h-[34px] text-xs font-semibold"
                >
                  <option value="">{localize("SelectBoxEmptyValueText")}</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>{u.userName}</option>
                  ))}
                </AppSelect>
              </div>
            )}

            <div className="flex flex-col gap-1 w-full">
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

            <div className="flex flex-col gap-1 w-full">
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

            <div className="flex flex-col gap-1 w-full">
              <label className={filterLabelClass}>{localize("Status")}</label>
              <AppSelect
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
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
            <div className="flex flex-col gap-3">
              <div className="flex flex-col text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                {generatedLines.map((line) => <span key={line}>{line}</span>)}
              </div>

              <div className="max-h-[580px] overflow-auto">
                <table className="table-fixed border-collapse text-[11px]" style={{ width: tableWidth }}>
                  <colgroup>
                    {visibleColumns.map((column) => (
                      <col key={column.field} style={{ width: column.width }} />
                    ))}
                  </colgroup>
                  <thead className="sticky top-0 z-10">
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
                        className={rowIndex % 2 === 0 ? "bg-white dark:bg-[#161920]" : "bg-slate-50 dark:bg-white/[0.03]"}
                      >
                        {visibleColumns.map((column) => (
                          <td
                            key={column.field}
                            className={`border border-slate-200 dark:border-slate-700 px-1.5 py-1.5 font-semibold text-slate-800 dark:text-slate-100 tabular-nums align-middle break-words ${column.align === "left" ? "text-left" : "text-center"}`}
                          >
                            {formatCellValue(getRowValue(row, column.field))}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap gap-x-8 gap-y-1 text-[11px] font-black text-slate-700 dark:text-slate-200">
                {summaryLines.map((line) => <span key={line}>{line}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
