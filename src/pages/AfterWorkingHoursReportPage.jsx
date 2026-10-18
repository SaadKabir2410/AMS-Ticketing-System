import { useState, useEffect, useMemo } from "react";
import AppSelect from "../component/common/AppSelect";
import { useNavigate } from "react-router-dom";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileSpreadsheet, FileText } from "lucide-react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";
import "flatpickr/dist/themes/dark.css";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import usersApi from "../services/api/users";
import afterWorkingHoursReportApi from "../services/api/afterWorkingHoursReport";
import {
  getCachedApplicationConfig,
  loadApplicationConfig,
} from "../services/applicationConfigCache";
import PremiumErrorAlert from "../component/common/PremiumErrorAlert";
import { useAuth } from "../context/AuthContextHook";

const STATUS_OPTIONS = [
  { labelKey: "All", value: "" },
  { labelKey: "Open", value: 1 },
  { labelKey: "Closed", value: 2 },
  { labelKey: "VoidAMSTicketButtonText", value: 3 },
];

const formatInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDefaultFilters = () => {
  const today = new Date();
  return {
    user: "",
    dateFrom: formatInputDate(new Date(today.getFullYear(), today.getMonth(), 1)),
    dateTo: formatInputDate(today),
    status: 2,
  };
};

const REPORT_COLUMNS = [
  { key: "siteName", labelKey: "SiteName" },
  { key: "siteOCN", labelKey: "SiteOCN" },
  { key: "cmsNextTicketNo", labelKey: "CMSNextTicketNo" },
  { key: "ticketReceivedOn", labelKey: "TicketReceivedDate" },
  { key: "status", labelKey: "Status" },
  { key: "ticketClosedByName", labelKey: "TicketClosedById" },
  { key: "cmsTicketClosedOn", labelKey: "CMSTicketClosedOn" },
  { key: "createdBy", labelKey: "CreatedBy" },
  { key: "activityTotalDuration", labelKey: "ActivityTotalDuration" },
  {
    key: "afterWorkingHoursActivityTotalDurationForSpecificUser",
    labelKey: "AfterWorkingHoursActivityTotalDurationForSpecificUser",
    includesUserName: true,
  },
  { key: "amount", labelKey: "AfterWorkingHoursActivityTotalCostForSpecificUser" },
];

const getLocalizationValue = (applicationConfig, keys, fallback) => {
  const keyList = Array.isArray(keys) ? keys : [keys];
  const resources = applicationConfig?.localization?.values;
  if (resources && typeof resources === "object") {
    for (const key of keyList) {
      const billingValue = resources.Billing?.[key];
      if (typeof billingValue === "string" && billingValue.trim()) return billingValue.trim();
      for (const resource of Object.values(resources)) {
        const value = resource?.[key];
        if (typeof value === "string" && value.trim()) return value.trim();
      }
    }
  }
  return fallback || keyList[0];
};

const formatLocalizedText = (text, ...values) =>
  text.replace(/\{(\d+)\}/g, (placeholder, index) => values[Number(index)] ?? placeholder);

const getResponseMessage = (value) => {
  const responseData = value?.response?.data ?? value;
  if (typeof responseData === "string") return responseData.trim();
  if (!responseData || typeof responseData !== "object") return "";

  const messages = [];
  const addMessage = (message) => {
    if (typeof message === "string" && message.trim()) {
      messages.push(message.trim());
    }
  };
  const readContainer = (container) => {
    if (!container) return;
    if (typeof container === "string") {
      addMessage(container);
      return;
    }

    addMessage(container.message);
    addMessage(container.details);
    addMessage(container.detail);
    addMessage(container.title);
    addMessage(container.error_description);

    if (Array.isArray(container.validationErrors)) {
      container.validationErrors.forEach((validationError) => {
        addMessage(
          typeof validationError === "string"
            ? validationError
            : validationError?.message || validationError?.details,
        );
      });
    }

    if (container.errors && typeof container.errors === "object") {
      Object.values(container.errors).flat().forEach((error) => {
        addMessage(typeof error === "string" ? error : error?.message);
      });
    }
  };

  readContainer(responseData);
  readContainer(responseData.error);
  readContainer(responseData.result);
  readContainer(responseData.data);

  return [...new Set(messages)].join("\n");
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

export default function AfterWorkingHoursReportPage() {
  const { user } = useAuth();
  const isTicketing = user?.role?.toLowerCase().includes("ticketing");
  const navigate = useNavigate();
  const [filters, setFilters] = useState(getDefaultFilters);
  const [usersList, setUsersList] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [reportSummary, setReportSummary] = useState(null);
  const [applicationConfig, setApplicationConfig] = useState(getCachedApplicationConfig);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const t = (keys, fallback) => getLocalizationValue(applicationConfig, keys, fallback);
  const reportTitle = t(
    ["AfterWorkingHoursReport", "Permission:Reports.AfterWorkingHoursReport"],
    "After Working Hours Report",
  );
  const emptyUserOption = t("SelectBoxEmptyValueText", "Choose An Option");

  useEffect(() => {
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
        setFormError(getResponseMessage(error));
      }
    };
    fetchUsers();
    loadApplicationConfig()
      .then(setApplicationConfig)
      .catch((error) => {
        setFormError(getResponseMessage(error));
      });
  }, []);

  const handleClear = () => {
    setFormError("");
    setFilters(getDefaultFilters());
    setReportData([]);
    setReportSummary(null);
  };

  const handleGetReport = async () => {
    try {
      setLoading(true);
      setFormError("");

      const formatDateStart = (d) => {
        if (!d) return undefined;
        return d.includes("T") ? d : `${d}T15:59:59.0000000Z`;
      };
      const formatDateEnd = (d) => {
        if (!d) return undefined;
        return d.includes("T") ? d : `${d}T15:59:59.0000000Z`;
      };

      const selectedStatus = STATUS_OPTIONS.find(
        (s) => String(s.value) === String(filters.status)
      );

      const rawParams = {
        UserId: filters.user || undefined,
        DateFrom: formatDateStart(filters.dateFrom),
        DateTo: formatDateEnd(filters.dateTo),
        Status:
          selectedStatus && selectedStatus.value !== ""
            ? selectedStatus.value
            : undefined,
      };

      const params = Object.fromEntries(
        Object.entries(rawParams).filter(
          ([, v]) => v !== "" && v !== null && v !== undefined
        )
      );

      const data = await afterWorkingHoursReportApi.getReport(params);
      const dataArray =
        data?.afterWorkingHoursDetails ||
        data?.reportList ||
        data?.result ||
        data?.data ||
        data?.items ||
        (Array.isArray(data) ? data : []);

      if (dataArray.length === 0) {
        setFormError(getResponseMessage(data) || t("NoReportFound"));
        setReportData([]);
        setReportSummary(data && !Array.isArray(data) ? data : null);
      } else {
        setReportData(dataArray);
        setReportSummary(data && !Array.isArray(data) ? data : null);
      }
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error("Failed to get report:", error);
      setFormError(getResponseMessage(error) || t("DefaultErrorMessage"));
    }
  };

  const highlightText = (text, highlight) => {
    if (!highlight || !highlight.trim()) return text;
    const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = String(text).split(new RegExp(`(${escapedHighlight})`, "gi"));
    return (
      <span className="flex flex-wrap gap-0">
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={i} className="bg-pink-100 dark:bg-pink-500/30 text-pink-700 dark:text-pink-100 px-0.5 rounded-sm">
              {part}
            </mark>
          ) : (
            <span key={i} className="text-slate-900 dark:text-white">{part}</span>
          ),
        )}
      </span>
    );
  };

  const reportUserName =
    reportSummary?.userName ||
    usersList.find((item) => String(item.id) === String(filters.user))?.userName ||
    user?.userName ||
    user?.name ||
    "User";

  const localizedColumns = useMemo(
    () => REPORT_COLUMNS.map((column) => ({
      ...column,
      label: column.includesUserName
        ? formatLocalizedText(
          getLocalizationValue(applicationConfig, column.labelKey),
          reportUserName,
        )
        : getLocalizationValue(applicationConfig, column.labelKey),
    })),
    [applicationConfig, reportUserName],
  );

  const getDownloadFileName = (extension) => {
    const userPart = safeFilePart(reportUserName, "User");
    const generatedDate = formatFileDate(reportSummary?.generatedOn);
    const amount = formatFileAmount(reportSummary?.totalAmount);
    return `(${userPart})_AMS OT CLAIM_${generatedDate}_${amount}.${extension}`;
  };

  const handleExportExcel = async () => {
    if (reportData.length === 0) return;
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(reportTitle);
      worksheet.columns = localizedColumns.map(column => ({
        header: column.label,
        key: column.key,
        width: 24,
      }));
      worksheet.addRows(reportData.map((row) =>
        Object.fromEntries(localizedColumns.map((column) => [column.key, row[column.key]]))
      ));
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEC4899' } };
      worksheet.addRow([]);
      worksheet.addRow([t(["GeneratedBy", "CreatedBy"]), reportSummary?.generatedBy ?? ""]);
      worksheet.addRow([t(["GeneratedOn", "CreationTime"]), reportSummary?.generatedOn ?? ""]);
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      saveAs(blob, getDownloadFileName("xlsx"));
    } catch (error) {
      console.error("Export failed:", error);
      setFormError(getResponseMessage(error) || t("DefaultErrorMessage"));
    }
  };

  const handleExportPdf = () => {
    if (reportData.length === 0) return;
    try {
      const document = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      document.setFontSize(14);
      document.text(reportTitle, 40, 35);
      document.setFontSize(9);
      document.text(`${t(["GeneratedBy", "CreatedBy"])}: ${reportSummary?.generatedBy ?? ""}`, 40, 52);
      document.text(`${t(["GeneratedOn", "CreationTime"])}: ${reportSummary?.generatedOn ?? ""}`, 40, 66);
      autoTable(document, {
        startY: 80,
        head: [localizedColumns.map((column) => column.label)],
        body: reportData.map((row) => localizedColumns.map((column) => row[column.key] ?? "")),
        styles: { fontSize: 6, cellPadding: 3, overflow: "linebreak" },
        headStyles: { fillColor: [236, 72, 153] },
      });
      document.save(getDownloadFileName("pdf"));
    } catch (error) {
      console.error("PDF export failed:", error);
      setFormError(getResponseMessage(error) || t("DefaultErrorMessage"));
    }
  };

  const columns = useMemo(() => {
    return localizedColumns.map((column) => ({
      accessorKey: column.key,
      header: column.label,
      cell: (info) => {
        const val = info.getValue();
        if (typeof val === "boolean") {
          return val
            ? getLocalizationValue(applicationConfig, "Yes")
            : getLocalizationValue(applicationConfig, "No");
        }
        if (val === null || val === undefined) return "—";
        return highlightText(String(val), globalFilter);
      },
    }));
  }, [localizedColumns, globalFilter, applicationConfig]);

  const table = useReactTable({
    data: reportData,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const filterInputClass =
    "px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/50 rounded-xl outline-none focus:border-pink-500 transition-all appearance-none cursor-pointer shadow-sm text-slate-900 dark:text-white";

  const dateFilterLabelKeys = String(filters.status) === "2"
    ? { from: "TicketClosedDateFrom", to: "TicketClosedDateTo" }
    : { from: "TicketReceivedDateFrom", to: "TicketReceivedDateTo" };

  return (
    <div className="min-h-full w-full bg-[#f8fafc] dark:bg-slate-950 p-1 pb-[10px] flex flex-col relative overflow-visible font-[Arial] text-slate-900 dark:text-white">
      <style>{`
        *::-webkit-scrollbar { display: none !important; }
        * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; display: block !important; }
        .custom-scrollbar { scrollbar-width: thin !important; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #ec4899; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #475569; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #ec4899; }
      `}</style>

      <div className="flex-1 w-full bg-white dark:bg-[#161920] border border-slate-200 dark:border-slate-800/50 shadow-sm flex flex-col rounded-3xl">
        {/* Header */}
        <div className="flex flex-col gap-6 py-8 px-4 md:px-8 transition-colors border-b border-slate-100 dark:border-slate-800/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <nav className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-600 mb-1">
                  <span onClick={() => navigate("/")} className="hover:opacity-80 cursor-pointer transition-all hover:text-pink-500">{t("Home")}</span>
                  <span className="text-slate-300 dark:text-slate-700">/</span>
                  <span className="text-pink-500 font-black">{t("Permission:Reports")}</span>
                </nav>
                <h1 className="text-4xl font-black tracking-tighter flex items-center gap-3">
                  {reportTitle}
                  {loading && <span className="w-4 h-4 border-2 border-slate-800 dark:border-white border-t-transparent rounded-full animate-spin"></span>}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleClear}
                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold hover:border-slate-400 dark:hover:border-slate-500 transition-all active:scale-95 shadow-sm text-slate-700 dark:text-slate-300"
              >
                {t("Clear")}
              </button>

              {reportData.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-700 shadow-sm transition-all hover:border-rose-300 hover:bg-rose-100 active:scale-95 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                  >
                    <FileText size={13} />
                    {t("GetPdfReport", "PDF")}
                  </button>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-100 active:scale-95 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                  >
                    <FileSpreadsheet size={13} />
                    {t("GetExcelReport", "Excel")}
                  </button>
                </>
              )}

              <button
                onClick={handleGetReport}
                disabled={loading}
                className="app-primary-button flex items-center gap-2 px-4 py-1.5 text-[11px]"
              >
                {loading ? t("ProcessingWithThreeDot") : t("GetReport")}
              </button>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="px-4 md:px-8 py-4 border-b border-slate-100 dark:border-slate-800/50">
          <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row items-end justify-between gap-4">
            <div className="flex flex-wrap items-end gap-10 xl:justify-between w-full">
              {!isTicketing && (
                <div className="flex flex-col gap-1 w-full sm:w-72">
                  <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">{t("User")}</label>
                  <AppSelect
                    value={filters.user}
                    onChange={(e) => setFilters({ ...filters, user: e.target.value })}
                    className={filterInputClass}
                  >
                    <option value="">{emptyUserOption}</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.userName}
                      </option>
                    ))}
                  </AppSelect>
                </div>
              )}

              <div className="flex flex-col gap-1 w-full sm:w-60">
                <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">{t(dateFilterLabelKeys.from)}</label>
                <Flatpickr
                  value={filters.dateFrom}
                  onChange={(dates, dateStr) => setFilters({ ...filters, dateFrom: dateStr })}
                  options={{ dateFormat: "Y-m-d", allowInput: true }}
                  onInput={(e) => setFilters((current) => ({ ...current, dateFrom: e.target.value }))}
                  placeholder="YYYY-MM-DD"
                  className={filterInputClass}
                />
              </div>

              <div className="flex flex-col gap-1 w-full sm:w-60">
                <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">{t(dateFilterLabelKeys.to)}</label>
                <Flatpickr
                  value={filters.dateTo}
                  onChange={(dates, dateStr) => setFilters({ ...filters, dateTo: dateStr })}
                  options={{ dateFormat: "Y-m-d", allowInput: true }}
                  onInput={(e) => setFilters((current) => ({ ...current, dateTo: e.target.value }))}
                  placeholder="YYYY-MM-DD"
                  className={filterInputClass}
                />
              </div>

              <div className="flex flex-col gap-1 w-full sm:w-52">
                <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">{t("Status")}</label>
                <AppSelect
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className={filterInputClass}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.labelKey} value={s.value}>{t(s.labelKey)}</option>
                  ))}
                </AppSelect>
              </div>

              {reportData.length > 0 && (
                <div className="flex flex-col gap-1 flex-1 sm:min-w-[200px] animate-in fade-in slide-in-from-left-4 duration-500">
                  <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">{t("Search")}</label>
                  <input
                    type="text"
                    value={globalFilter ?? ""}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    placeholder={t("SearchInTablePlaceholder")}
                    className="w-full px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-pink-500 transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 shadow-sm"
                  />
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Main Content Area - Full Screen Layout */}
        <div className="flex-1 flex flex-col relative py-4 h-auto w-full">
          {formError && (
            <div className="mb-4">
              <PremiumErrorAlert
                open={Boolean(formError)}
                message={<span className="whitespace-pre-line">{formError}</span>}
                onClose={() => setFormError("")}
              />
            </div>
          )}

          {reportData.length > 0 ? (
            <div className="flex flex-col w-full h-auto relative">
              <div className="flex flex-wrap justify-end gap-x-6 gap-y-1 px-6 pb-3 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                <span>{t(["GeneratedBy", "CreatedBy"])}: {reportSummary?.generatedBy ?? "—"}</span>
                <span>{t(["GeneratedOn", "CreationTime"])}: {reportSummary?.generatedOn ?? "—"}</span>
              </div>
              <div className="isolate max-h-[580px] overflow-auto px-4 pb-4 bg-white dark:bg-slate-900 custom-scrollbar">
                <table className="relative z-0 w-full text-left border-separate border-spacing-0 min-w-max text-[11px]">
                  <thead className="sticky top-0 z-40 bg-slate-50 dark:bg-slate-900">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id} className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-[56px] text-slate-500 dark:text-slate-400">
                        {headerGroup.headers.map((header, colIdx) => (
                          <th
                            key={header.id}
                            className={`sticky top-0 z-50 bg-slate-50 dark:bg-slate-900 px-5 h-[56px] text-[10px] font-black uppercase tracking-widest text-left cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 shadow-[0_1px_0_#e2e8f0] dark:shadow-[0_1px_0_#1e293b] ${colIdx === 0 ? "pl-8" : ""}`}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            <div className="flex items-center gap-1">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {header.column.getIsSorted() ? (
                                <span className="text-pink-500">
                                  {header.column.getIsSorted() === "asc" ? "↑" : "↓"}
                                </span>
                              ) : null}
                            </div>
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody className="relative z-0">
                    {table.getRowModel().rows.map((row, idx) => {
                      const isEven = idx % 2 === 0;
                      return (
                        <tr
                          key={row.id}
                          className={`group transition-all duration-200 h-[60px] border-b border-slate-50 dark:border-slate-800/30 ${isEven ? "bg-white dark:bg-[#161920]/40" : "bg-gray-200/50 dark:bg-white/[0.03]"}`}
                        >
                          {row.getVisibleCells().map((cell, colIdx) => (
                            <td
                              key={cell.id}
                              className={`px-5 h-[60px] text-left transition-colors font-bold text-[12px] ${colIdx === 0 ? "pl-8 rounded-l-2xl" : ""} ${colIdx === row.getVisibleCells().length - 1 ? "rounded-r-2xl" : ""}`}
                            >
                              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </div>
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Section */}
              <div className="px-6 py-4 bg-white/80 dark:bg-[#161920] border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between shrink-0 transition-colors rounded-b-3xl">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      {t("PagerShowMenuEntries").replace("_MENU_", "").trim()}
                    </span>
                    <AppSelect
                      value={table.getState().pagination.pageSize}
                      onChange={(e) => table.setPageSize(Number(e.target.value))}
                      className="px-3 h-7 text-[10px] font-black bg-white dark:bg-slate-800 text-pink-600 dark:text-pink-400 border border-slate-200 dark:border-slate-700/50 rounded-lg outline-none transition-all cursor-pointer shadow-sm hover:border-pink-500/50 uppercase tracking-widest"
                    >
                      {[5, 10, 25, 50, 100].map((s) => (
                        <option key={s} value={s} className="font-sans text-slate-900 dark:text-white">{s}</option>
                      ))}
                    </AppSelect>
                  </div>

                  <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      {formatLocalizedText(
                        t("PagerInfo{0}{1}{2}"),
                        table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1,
                        Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length),
                        table.getFilteredRowModel().rows.length,
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-800/50 p-1 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm">
                    <button
                      onClick={() => table.firstPage()}
                      disabled={!table.getCanPreviousPage()}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                      title={t("PagerFirst")}
                    >
                      <ChevronsLeft size={14} strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                      title={t("PagerPrevious")}
                    >
                      <ChevronLeft size={14} strokeWidth={2.5} />
                    </button>

                    <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1"></div>

                    <div className="px-3 flex items-center gap-2 py-1">
                      <div className="flex items-center gap-1.5 min-w-[40px] justify-center">
                        <span className="text-[11px] font-black text-pink-600 dark:text-pink-400 tabular-nums leading-none">{table.getState().pagination.pageIndex + 1}</span>
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-600">/</span>
                        <span className="text-[10px] font-black text-slate-900 dark:text-white tabular-nums leading-none">{table.getPageCount() || 1}</span>
                      </div>
                    </div>

                    <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1"></div>

                    <button
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                      title={t("PagerNext")}
                    >
                      <ChevronRight size={14} strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={() => table.lastPage()}
                      disabled={!table.getCanNextPage()}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                      title={t("PagerLast")}
                    >
                      <ChevronsRight size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1" />
          )}
        </div>
      </div>
    </div>
  );
}
