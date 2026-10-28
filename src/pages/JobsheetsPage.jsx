import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Autocomplete, Checkbox, TextField } from "@mui/material";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import AppSelect from "../component/common/AppSelect";
import SearchTextHighlight from "../component/common/SearchTextHighlight";
import PremiumErrorAlert from "../component/common/PremiumErrorAlert";
import JobsheetModal from "../component/common/JobsheetModal";
import { ActionsMenu } from "../component/common/ResourcePage";
import { jobsheetsApi } from "../services/api/jobsheets";
import { usersApi } from "../services/api/users";
import codeDetailsApi from "../services/api/CodeDetails";
import {
  JOBSHEET_SIGNALR_EVENTS,
  processTicketDetailsUpdate,
  subscribeToJobsheetEvent,
} from "../services/jobsheetSignalR";
import { loadReportTemplateTexts } from "../services/reportTemplateCache";
import { useAuth } from "../context/AuthContextHook";
import { usePermission } from "../hooks/usePermission";
import { useBackendLocalization } from "../hooks/useBackendLocalization";
import { useBackendEnumOptions } from "../hooks/useBackendEnumOptions";
import { useReportTemplateLines } from "../hooks/useReportTemplateLines";
import { getApiErrorMessage } from "../utils/apiError";
import { buildReportFileName } from "../utils/reportFileName";

// Same page sizes and default as the Blazor data grid.
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

// Date filters work like the Blazor DatePicker: shown and typed as dd/MM/yyyy
// with a "DD/MM/YYYY" hint. One input only (no flatpickr altInput); the filter
// state keeps YYYY-MM-DD for the API.
const DATE_PLACEHOLDER = "DD/MM/YYYY";
// Each picker needs its own options object: react-flatpickr adds its change
// handlers to the object it is given, so one shared object made a date picked in
// Date From also fill Date To.
const DATE_FROM_OPTIONS = { dateFormat: "d/m/Y", allowInput: true };
const DATE_TO_OPTIONS = { dateFormat: "d/m/Y", allowInput: true };

// The picker gets the exact text it shows (dd/mm/yyyy). react-flatpickr resets the
// input whenever the value differs from the input text, so a Date object (never
// equal to the text) would reset it on every render.
const toPickerDate = (value) => {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};
const fromPickerDates = ([date]) =>
  date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` : "";

// Backend enum member names, used as identifiers only.
const ORGANIZATION_VENDOR_SUREZE = "VendorSureze";
const ORGANIZATION_VENDOR_ABBOTT = "VendorAbbott";
const ENUM_EXCLUDED = ["SelectAnOption", "All"];

// Grid columns as in Blazor Pages/Public/Jobsheets/Jobsheets.razor; labels are
// backend localization keys, sortField is the backend sorting field.
const GRID_COLUMNS = [
  { field: "date", labelKey: "Date", sortField: "Date", type: "date" },
  { field: "attendanceStatus", labelKey: "AttendanceStatus", sortField: "AttendanceStatus", type: "attendance" },
  { field: "userName", labelKey: "CreatedBy" },
  { field: "totalDurationHours", labelKey: "TotalDurationHours" },
  { field: "totalDurationMinutes", labelKey: "TotalDurationMinutes" },
  { field: "creationTime", labelKey: "CreationTime", sortField: "CreationTime", type: "dateTime" },
  { field: "holidayName", labelKey: "HolidayName", sortField: "Holiday.Name" },
];

// Detail rows shown when a jobsheet row is expanded (Blazor DetailRowTemplate).
const DETAIL_COLUMNS = [
  { field: "projectName", labelKey: "ProjectName" },
  { field: "taskCategoryName", labelKey: "TaskCategoryName" },
  { field: "subTaskCategoryName", labelKey: "SubTaskCategoryName" },
  { field: "startTime", labelKey: "StartTime", type: "time" },
  { field: "endTime", labelKey: "EndTime", type: "time" },
  { field: "jobsheetDetailUsers", labelKey: "Collaborators", type: "collaborators" },
  { field: "statusName", labelKey: "StatusName" },
  { field: "cmsNextTicketNo", labelKey: "CMSNextTicketNo", type: "ticket" },
  { field: "workingHoursFlag", labelKey: "WorkingHoursFlag", type: "workingHours" },
];

// Report columns follow the backend template (Reports/JobsheetReport.mrt):
// Date, Created By, then the "Details" group.
const REPORT_COLUMNS = [
  { field: "Date", labelKey: "Date" },
  { field: "UserName", labelKey: "CreatedBy" },
];
const REPORT_DETAIL_COLUMNS = [
  { field: "ProjectName", labelKey: "ProjectName" },
  { field: "TaskCategoryName", labelKey: "TaskCategoryName" },
  { field: "SubTaskCategoryName", labelKey: "SubTaskCategoryName" },
  { field: "StartTime", labelKey: "StartTime" },
  { field: "EndTime", labelKey: "EndTime" },
  { field: "StatusName", labelKey: "StatusName" },
  { field: "JobsheetDetailUsers", labelKey: "Collaborators" },
  { field: "Remarks", labelKey: "ClosingTicketRemarks" },
];
const ALL_REPORT_COLUMNS = [...REPORT_COLUMNS, ...REPORT_DETAIL_COLUMNS];

// Admin-only report totals (the backend sets ShowCells for admins). Labels come
// from the backend template; until it loads, from the backend field names.
const ADMIN_TOTAL_FIELDS = [
  "OfficeHoursDuration",
  "AfterOfficeHoursDuration",
  "WorkingHoursCost",
  "AfterWorkingHoursCost",
  "TotalPayout",
];

const splitFieldName = (name) => String(name).replace(/([a-z\d])([A-Z])/g, "$1 $2");

// The API may camelCase the DTO property names, so match them case-insensitively.
const getRowValue = (row, field) => {
  if (!row) return undefined;
  const matchingKey = Object.keys(row).find(
    (key) => key.toLowerCase() === field.toLowerCase(),
  );
  return matchingKey ? row[matchingKey] : undefined;
};

const isEmptyValue = (value) => value === null || value === undefined || value === "";
const pad = (value) => String(value).padStart(2, "0");

// Same display formats as the backend DateTimeExtensions.
const formatDate = (value) => {
  if (isEmptyValue(value)) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};
const formatDateTime = (value) => {
  if (isEmptyValue(value)) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${formatDate(value)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};
const formatTime = (value) => {
  if (isEmptyValue(value)) return "";
  const match = String(value).match(/(\d{1,2}):(\d{2})/);
  return match ? `${pad(match[1])}:${match[2]}` : String(value);
};

// Blazor sends each selected day at 23:59:59; the backend compares dates only.
const toApiDate = (value) => (value ? `${value}T23:59:59` : undefined);

const getUserDisplayName = (user) => user?.name || user?.userName || "";

const userHasRole = (user, requiredRole) => {
  const roles = user?.roles ?? user?.role ?? [];
  const normalizedRoles = Array.isArray(roles) ? roles : String(roles).split(",");
  return normalizedRoles.some(
    (role) => String(role).trim().toLowerCase() === requiredRole.toLowerCase(),
  );
};

const getItems = (data) => (Array.isArray(data) ? data : data?.items || []);

const renderCheckboxOption = (props, option, { selected, inputValue }) => {
  const { key, ...restProps } = props;
  return (
    <li key={key} {...restProps} style={{ fontSize: "11px", padding: "4px 8px" }} className="hover:bg-slate-50 dark:hover:bg-slate-800">
      <Checkbox style={{ marginRight: 8, padding: 0 }} checked={selected} size="small" sx={{ "&.Mui-checked": { color: "#ec4899" } }} />
      <span className="text-slate-900 dark:text-white">
        <SearchTextHighlight text={getUserDisplayName(option)} query={inputValue} />
      </span>
    </li>
  );
};

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

const EMPTY_FILTERS = {
  project: "",
  users: [],
  dateFrom: "",
  dateTo: "",
  collaborators: [],
};

export default function JobsheetsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const localize = useBackendLocalization("Billing");
  const isAdmin = userHasRole(user, "admin");

  // Same permissions as Blazor: admins never create jobsheets.
  const canCreate = usePermission("Billing.Jobsheets.Create") && !isAdmin;
  const canEdit = usePermission("Billing.Jobsheets.Edit");
  const canViewAuditLog = usePermission("Billing.Jobsheets.ViewAuditLog");

  const attendanceOptions = useBackendEnumOptions("AttendanceStatusEnum", localize, { exclude: ENUM_EXCLUDED });
  const workingHoursOptions = useBackendEnumOptions("WorkingHoursFlagEnum", localize, { exclude: ENUM_EXCLUDED });

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [projects, setProjects] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [jobsheetUsers, setJobsheetUsers] = useState([]);

  const [jobsheets, setJobsheets] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sorting, setSorting] = useState({ field: "", direction: "" });
  const [gridLoading, setGridLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pageError, setPageError] = useState("");

  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [adminTotalLabels, setAdminTotalLabels] = useState({});

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedJobsheet, setSelectedJobsheet] = useState(null);

  const showError = (error) =>
    setPageError(getApiErrorMessage(error) || localize("DefaultErrorMessage"));

  // ── Filter data: projects (PRJ lookup), users, collaborators ──
  useEffect(() => {
    let active = true;
    const loadFilterData = async () => {
      try {
        const [projectData, allUserData, jobsheetUserData] = await Promise.all([
          codeDetailsApi.getByLookupCodes(["PRJ"]),
          usersApi.getUsersList({
            organizationTypes: [ORGANIZATION_VENDOR_SUREZE, ORGANIZATION_VENDOR_ABBOTT],
          }),
          usersApi.getUsersList({
            organizationTypes: [ORGANIZATION_VENDOR_SUREZE],
            mustCompleteJobsheet: true,
          }),
        ]);
        if (!active) return;
        setProjects(getItems(projectData));
        setAllUsers(getItems(allUserData));
        setJobsheetUsers(getItems(jobsheetUserData));
      } catch (error) {
        if (active) showError(error);
      }
    };
    loadFilterData();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Admin-only report total labels from the backend report template ──
  useEffect(() => {
    let active = true;
    loadReportTemplateTexts("JobsheetReport")
      .then((texts) => {
        const labels = texts
          .map((text) => text.match(/ShowCells == true \? "([^"]+)"/)?.[1])
          .filter(Boolean);
        const fields = texts
          .map((text) => text.match(/ShowCells == true \? root\.(\w+)/)?.[1])
          .filter(Boolean);
        if (!active) return;
        setAdminTotalLabels(
          Object.fromEntries(fields.map((field, index) => [field, labels[index]]).filter(([, label]) => label)),
        );
      })
      .catch(() => {
        // Labels fall back to the backend field names.
      });
    return () => {
      active = false;
    };
  }, []);

  // ── AMS ticket activities update jobsheets through SignalR ──
  useEffect(() => {
    const refreshJobsheets = () => setRefreshTrigger((value) => value + 1);
    const updateTicketDetails = async (firstArgument, secondArgument) => {
      try {
        await processTicketDetailsUpdate(firstArgument, secondArgument);
      } catch (error) {
        console.error("Failed to synchronize AMS ticket jobsheet details:", error);
      } finally {
        refreshJobsheets();
      }
    };
    const unsubscribeReload = subscribeToJobsheetEvent(
      JOBSHEET_SIGNALR_EVENTS.reloadJobsheets,
      refreshJobsheets,
    );
    const unsubscribeTicketDetails = subscribeToJobsheetEvent(
      JOBSHEET_SIGNALR_EVENTS.updateTicketDetails,
      updateTicketDetails,
    );
    return () => {
      unsubscribeReload();
      unsubscribeTicketDetails();
    };
  }, []);

  // Search values sent to the backend, the same way Blazor builds JobsheetSearchDto.
  const searchParams = useMemo(() => ({
    CurrentUserId: user?.id,
    UserIdsSearchValues: isAdmin ? filters.users : [],
    JobsheetDetailUserIdsSearchValues: filters.collaborators,
    ProjectIdSearchValue: filters.project || undefined,
    DateFrom: toApiDate(filters.dateFrom),
    DateTo: toApiDate(filters.dateTo),
  }), [filters, isAdmin, user?.id]);

  // ── Grid data ──
  useEffect(() => {
    let active = true;
    const loadJobsheets = async () => {
      setGridLoading(true);
      try {
        const data = await jobsheetsApi.getAll({
          page,
          perPage: pageSize,
          sortKey: sorting.field || undefined,
          sortDir: sorting.direction,
          ...searchParams,
        });
        if (!active) return;
        setJobsheets(getItems(data));
        setTotalCount(Number(data?.totalCount) || 0);
      } catch (error) {
        if (active) showError(error);
      } finally {
        if (active) setGridLoading(false);
      }
    };
    loadJobsheets();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, sorting, searchParams, refreshTrigger]);

  const updateFilters = (changes) => {
    setFilters((current) => ({ ...current, ...changes }));
    setPage(1);
    setExpandedIds([]);
  };

  const handleClear = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
    setExpandedIds([]);
    setReport(null);
    setPageError("");
  };

  const handleSort = (column) => {
    if (!column.sortField) return;
    setSorting((current) => {
      if (current.field !== column.sortField) return { field: column.sortField, direction: "asc" };
      if (current.direction === "asc") return { field: column.sortField, direction: "desc" };
      return { field: "", direction: "" };
    });
  };

  const toggleExpanded = (id) =>
    setExpandedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );

  const afterSave = () => {
    setExpandedIds([]);
    setRefreshTrigger((value) => value + 1);
  };

  const openEditModal = async (id) => {
    try {
      const jobsheet = await jobsheetsApi.getById(id);
      setSelectedJobsheet(jobsheet);
      setShowEditModal(true);
    } catch (error) {
      showError(error);
    }
  };

  // ── Report (Blazor shows the backend JobsheetReport under the grid) ──
  const handleGetReport = async () => {
    setPageError("");
    setReportLoading(true);
    try {
      const response = await jobsheetsApi.getReport(searchParams);
      const data = response?.data?.result || response?.data || null;
      const details = getRowValue(data, "JobsheetDetails") || [];
      if (details.length === 0) {
        setReport(null);
        setPageError(localize("NoReportFound"));
      } else {
        setReport(data);
      }
    } catch (error) {
      setReport(null);
      showError(error);
    } finally {
      setReportLoading(false);
    }
  };

  const reportDetails = getRowValue(report, "JobsheetDetails") || [];
  const { generatedItems: templateGeneratedItems } = useReportTemplateLines(
    "JobsheetReport",
    (field) => getRowValue(report, field),
  );
  const generatedItems = ["GeneratedBy", "GeneratedOn"].map((field) => ({
    field,
    label:
      templateGeneratedItems.find((item) => item.field === field)?.label || splitFieldName(field),
    value: getRowValue(report, field),
  }));
  const reportTotals = [
    { field: "TotalDurationHours", label: localize("TotalDurationHours") },
    ...(getRowValue(report, "ShowCells")
      ? ADMIN_TOTAL_FIELDS.map((field) => ({
        field,
        label: adminTotalLabels[field] || splitFieldName(field),
      }))
      : []),
  ].map((item) => ({ ...item, value: getRowValue(report, item.field) }));

  const reportFileName = (extension) => buildReportFileName("JobsheetReport", new Date(), extension);

  const handleExportExcel = async () => {
    if (reportDetails.length === 0) return;
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(localize("Jobsheets") || "Jobsheets");
      const headerStyle = (cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEC4899" } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      };

      // Two header rows, like the template: Date, Created By, then "Details" over the rest.
      const groupRow = worksheet.addRow([
        ...REPORT_COLUMNS.map((column) => localize(column.labelKey)),
        localize("Details"),
      ]);
      const columnRow = worksheet.addRow([
        ...REPORT_COLUMNS.map(() => ""),
        ...REPORT_DETAIL_COLUMNS.map((column) => localize(column.labelKey)),
      ]);
      REPORT_COLUMNS.forEach((column, index) =>
        worksheet.mergeCells(groupRow.number, index + 1, columnRow.number, index + 1),
      );
      worksheet.mergeCells(
        groupRow.number,
        REPORT_COLUMNS.length + 1,
        groupRow.number,
        ALL_REPORT_COLUMNS.length,
      );
      [groupRow, columnRow].forEach((row) => {
        for (let index = 1; index <= ALL_REPORT_COLUMNS.length; index += 1) headerStyle(row.getCell(index));
      });

      reportDetails.forEach((row) => {
        worksheet.addRow(ALL_REPORT_COLUMNS.map((column) => getRowValue(row, column.field) ?? ""));
      });

      worksheet.addRow([]);
      const totalsLabelRow = worksheet.addRow(reportTotals.map((item) => item.label));
      totalsLabelRow.eachCell((cell) => {
        cell.font = { bold: true };
      });
      worksheet.addRow(reportTotals.map((item) => item.value ?? ""));

      worksheet.addRow([]);
      generatedItems.forEach((item) => worksheet.addRow([`${item.label} : ${item.value ?? ""}`]));

      worksheet.columns.forEach((column, index) => {
        column.width = index === ALL_REPORT_COLUMNS.length - 1 ? 40 : 18;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        reportFileName("xlsx"),
      );
    } catch (error) {
      showError(error);
    }
  };

  const handleExportPdf = () => {
    if (reportDetails.length === 0) return;
    try {
      const document = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      document.setFontSize(14);
      document.text(localize("Jobsheets"), 40, 35);

      autoTable(document, {
        startY: 50,
        head: [
          [
            ...REPORT_COLUMNS.map((column) => ({ content: localize(column.labelKey), rowSpan: 2 })),
            { content: localize("Details"), colSpan: REPORT_DETAIL_COLUMNS.length },
          ],
          REPORT_DETAIL_COLUMNS.map((column) => localize(column.labelKey)),
        ],
        body: reportDetails.map((row) =>
          ALL_REPORT_COLUMNS.map((column) => getRowValue(row, column.field) ?? ""),
        ),
        styles: { fontSize: 7, cellPadding: 3, overflow: "linebreak", valign: "middle" },
        headStyles: { fillColor: [253, 242, 248], textColor: [190, 24, 93], fontStyle: "bold", halign: "center" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      autoTable(document, {
        startY: document.lastAutoTable.finalY + 12,
        head: [reportTotals.map((item) => item.label)],
        body: [reportTotals.map((item) => item.value ?? "")],
        styles: { fontSize: 8, cellPadding: 4, halign: "center" },
        headStyles: { fillColor: [253, 242, 248], textColor: [190, 24, 93], fontStyle: "bold" },
      });

      document.setFontSize(9);
      generatedItems.forEach((item, index) =>
        document.text(`${item.label} : ${item.value ?? ""}`, 40, document.lastAutoTable.finalY + 20 + index * 14),
      );
      document.save(reportFileName("pdf"));
    } catch (error) {
      showError(error);
    }
  };

  // ── Display helpers ──
  const getEnumLabel = (options, value) => {
    if (isEmptyValue(value)) return "";
    const option = options.find(
      (item) => item.name === value || String(item.value) === String(value),
    );
    return option?.label ?? String(value);
  };

  const getCollaboratorNames = (detailUsers) =>
    (detailUsers || [])
      .map((entry) => {
        const userId = getRowValue(entry, "UserId");
        return getUserDisplayName(allUsers.find((item) => item.id === userId));
      })
      .filter(Boolean)
      .join(",");

  const renderGridCell = (column, row) => {
    const value = getRowValue(row, column.field);
    if (column.type === "date") return formatDate(value);
    if (column.type === "dateTime") return formatDateTime(value);
    if (column.type === "attendance") return getEnumLabel(attendanceOptions, value);
    return isEmptyValue(value) ? "" : String(value);
  };

  const renderDetailCell = (column, detail) => {
    const value = getRowValue(detail, column.field);
    if (column.type === "time") return formatTime(value);
    if (column.type === "collaborators") return getCollaboratorNames(value);
    if (column.type === "workingHours") return getEnumLabel(workingHoursOptions, value);
    if (column.type === "ticket" && !isEmptyValue(value)) {
      return (
        <a
          href={`/ams-tickets/${encodeURIComponent(value)}`}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 dark:text-blue-400 underline"
        >
          {value}
        </a>
      );
    }
    return isEmptyValue(value) ? "" : String(value);
  };

  const getRowActions = (row) => [
    canEdit && {
      key: "edit",
      label: localize("ViewEditButtonText"),
      onClick: () => openEditModal(row.id),
      className: "text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-bold",
    },
    canViewAuditLog && {
      key: "audit",
      label: localize("AuditLogsButtonText"),
      onClick: () => navigate(`/audit-logs?primaryKey=${row.id}&entityName=Jobsheet`),
      className: "text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-bold",
    },
  ].filter(Boolean);

  // ── Pager (ABP pager texts from backend localization) ──
  const pageCount = Math.max(Math.ceil(totalCount / pageSize), 1);
  const firstEntry = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const lastEntry = Math.min(page * pageSize, totalCount);
  const pagerInfo = totalCount > 0
    ? localize("PagerInfo{0}{1}{2}")
      .replace("{0}", firstEntry)
      .replace("{1}", lastEntry)
      .replace("{2}", totalCount)
    : localize("PagerInfoEmpty");
  const [pagerShowBefore, pagerShowAfter = ""] = localize("PagerShowMenuEntries").split("_MENU_");

  const filterLabelClass = "text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1";
  const filterInputClass = "w-full px-3 pr-8 text-xs font-semibold";
  const clearDateButtonClass = "absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors";
  const gridHeaderClass = "border-b border-r last:border-r-0 border-pink-100 dark:border-slate-700 bg-pink-50 dark:bg-slate-800 px-3 py-3 text-[10px] font-black uppercase tracking-wide text-pink-700 dark:text-pink-200 text-center align-middle leading-tight";
  const gridCellClass = "border-b border-r last:border-r-0 border-slate-100 dark:border-slate-800 px-3 py-2.5 text-[12px] font-semibold text-slate-800 dark:text-slate-100 text-center align-middle break-words";
  const pagerButtonClass = "w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all";

  const renderUserFilter = (labelKey, options, value, onChange) => (
    <div className="flex flex-col gap-1 w-full min-w-0">
      <label className={filterLabelClass}>{localize(labelKey)}</label>
      <Autocomplete
        size="small"
        multiple
        limitTags={1}
        options={options}
        disableCloseOnSelect
        componentsProps={multiSelectPaperProps}
        getOptionLabel={getUserDisplayName}
        isOptionEqualToValue={(option, selected) => option.id === selected.id}
        value={options.filter((option) => value.includes(option.id))}
        onChange={(event, selected) => onChange(selected.map((option) => option.id))}
        renderOption={renderCheckboxOption}
        renderInput={(params) => (
          <TextField
            {...params}
            size="small"
            placeholder={value.length ? "" : localize("SelectBoxEmptyValueText")}
            className="rounded-xl"
            sx={multiSelectSx}
          />
        )}
        sx={{ width: "100%", color: "inherit" }}
      />
    </div>
  );

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
                <span className="text-pink-500 font-black">{localize("Jobsheets")}</span>
              </nav>
              <h1 className="text-4xl font-black tracking-tighter flex items-center gap-3">
                {localize("Jobsheets")}
                {gridLoading && <span className="w-4 h-4 border-2 border-slate-800 dark:border-white border-t-transparent rounded-full animate-spin"></span>}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold hover:border-slate-400 dark:hover:border-slate-500 transition-all active:scale-95 shadow-sm text-slate-700 dark:text-slate-300"
              >
                {localize("Clear")}
              </button>

              <button
                type="button"
                onClick={handleGetReport}
                disabled={reportLoading}
                className="app-primary-button flex items-center gap-2 px-4 py-1.5 text-[11px]"
              >
                {reportLoading ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                {reportLoading ? localize("LoadingWithThreeDot") : localize("GetReport")}
              </button>

              {canCreate && (
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="app-primary-button flex items-center gap-2 px-4 py-1.5 text-[11px]"
                >
                  <Plus size={13} />
                  {localize("New")}
                </button>
              )}
            </div>
          </div>

          {/* Filters (same fields and order as Blazor) */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? "lg:grid-cols-5" : "lg:grid-cols-4"} items-end gap-4 w-full report-filters`}>
            <div className="flex flex-col gap-1 w-full min-w-0">
              <label className={filterLabelClass}>{localize("Project")}</label>
              <AppSelect
                value={filters.project}
                onChange={(event) => updateFilters({ project: event.target.value })}
                className="w-full text-xs font-semibold"
              >
                <option value="">{localize("SelectBoxEmptyValueText")}</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.description}</option>
                ))}
              </AppSelect>
            </div>

            {isAdmin &&
              renderUserFilter("User", jobsheetUsers, filters.users, (users) => updateFilters({ users }))}

            <div className="flex flex-col gap-1 w-full min-w-0">
              <label className={filterLabelClass}>{localize("DateFrom")}</label>
              <div className="relative">
                <Flatpickr
                  value={toPickerDate(filters.dateFrom)}
                  onChange={(dates) => updateFilters({ dateFrom: fromPickerDates(dates) })}
                  options={DATE_FROM_OPTIONS}
                  placeholder={DATE_PLACEHOLDER}
                  className={filterInputClass}
                />
                {filters.dateFrom && (
                  <button type="button" onClick={() => updateFilters({ dateFrom: "" })} className={clearDateButtonClass}>
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1 w-full min-w-0">
              <label className={filterLabelClass}>{localize("DateTo")}</label>
              <div className="relative">
                <Flatpickr
                  value={toPickerDate(filters.dateTo)}
                  onChange={(dates) => updateFilters({ dateTo: fromPickerDates(dates) })}
                  options={DATE_TO_OPTIONS}
                  placeholder={DATE_PLACEHOLDER}
                  className={filterInputClass}
                />
                {filters.dateTo && (
                  <button type="button" onClick={() => updateFilters({ dateTo: "" })} className={clearDateButtonClass}>
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {renderUserFilter("Collaborators", allUsers, filters.collaborators, (collaborators) =>
              updateFilters({ collaborators }))}
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-4 p-4 w-full">
          {pageError && (
            <PremiumErrorAlert open={!!pageError} message={pageError} onClose={() => setPageError("")} />
          )}

          {/* Jobsheet grid */}
          <div className="w-full max-h-[70vh] overflow-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <table className="w-full border-separate border-spacing-0 min-w-[900px]">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className={`${gridHeaderClass} w-10`}></th>
                  {GRID_COLUMNS.map((column) => (
                    <th
                      key={column.field}
                      className={`${gridHeaderClass} ${column.sortField ? "cursor-pointer select-none hover:bg-pink-100 dark:hover:bg-slate-700" : ""}`}
                      onClick={() => handleSort(column)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {localize(column.labelKey)}
                        {sorting.field === column.sortField && sorting.direction === "asc" && <ChevronUp size={12} />}
                        {sorting.field === column.sortField && sorting.direction === "desc" && <ChevronDown size={12} />}
                      </span>
                    </th>
                  ))}
                  <th className={`${gridHeaderClass} w-[140px]`}>{localize("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {jobsheets.length === 0 ? (
                  <tr>
                    <td colSpan={GRID_COLUMNS.length + 2} className="px-4 py-12 text-center text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      {gridLoading ? localize("LoadingWithThreeDot") : localize("NoDataAvailableInDatatable")}
                    </td>
                  </tr>
                ) : (
                  jobsheets.map((row, rowIndex) => {
                    const isExpanded = expandedIds.includes(row.id);
                    const details = getRowValue(row, "JobsheetDetails") || [];
                    const actions = getRowActions(row);
                    const rowClass = rowIndex % 2 === 0 ? "bg-white dark:bg-[#161920]" : "bg-slate-50/80 dark:bg-white/[0.03]";
                    return (
                      <Fragment key={row.id}>
                        <tr className={`transition-colors hover:bg-pink-50/60 dark:hover:bg-pink-500/5 ${rowClass}`}>
                          <td className={gridCellClass}>
                            <button
                              type="button"
                              onClick={() => toggleExpanded(row.id)}
                              className="w-6 h-6 inline-flex items-center justify-center rounded-md text-pink-600 hover:bg-pink-100 dark:hover:bg-pink-500/10"
                              aria-expanded={isExpanded}
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </td>
                          {GRID_COLUMNS.map((column) => (
                            <td key={column.field} className={gridCellClass}>
                              {renderGridCell(column, row)}
                            </td>
                          ))}
                          <td className={gridCellClass}>
                            {actions.length > 0 && (
                              <ActionsMenu actionButtonText={localize("Actions")} customActions={actions} />
                            )}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td colSpan={GRID_COLUMNS.length + 2} className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-4 py-3">
                              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                                <table className="w-full border-separate border-spacing-0 text-[11px]">
                                  <thead>
                                    <tr>
                                      {DETAIL_COLUMNS.map((column) => (
                                        <th key={column.field} className="border-b border-r last:border-r-0 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-2 text-[9px] font-black uppercase tracking-wide text-slate-600 dark:text-slate-300 text-center">
                                          {localize(column.labelKey)}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {details.length === 0 ? (
                                      <tr>
                                        <td colSpan={DETAIL_COLUMNS.length} className="px-3 py-4 text-center text-slate-500 dark:text-slate-400">
                                          {localize("NoDataAvailableInDatatable")}
                                        </td>
                                      </tr>
                                    ) : (
                                      details.map((detail, detailIndex) => (
                                        <tr key={detail.id || detailIndex} className="bg-white dark:bg-[#161920]">
                                          {DETAIL_COLUMNS.map((column) => (
                                            <td key={column.field} className="border-b border-r last:border-r-0 border-slate-100 dark:border-slate-800 px-2 py-2 text-center font-semibold text-slate-800 dark:text-slate-100 break-words">
                                              {renderDetailCell(column, detail)}
                                            </td>
                                          ))}
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pager */}
          {totalCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-2">
              <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-2">
                  {pagerShowBefore}
                  <AppSelect
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setPage(1);
                    }}
                    className="h-7 text-[11px] font-bold"
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </AppSelect>
                  {pagerShowAfter}
                </span>
                <span>{pagerInfo}</span>
              </div>

              <div className="flex items-center gap-1 bg-white dark:bg-slate-800/50 p-1 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm">
                <button type="button" onClick={() => setPage(1)} disabled={page === 1 || gridLoading} className={pagerButtonClass} title={localize("PagerFirst")}>
                  <ChevronsLeft size={14} strokeWidth={2.5} />
                </button>
                <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1 || gridLoading} className={pagerButtonClass} title={localize("PagerPrevious")}>
                  <ChevronLeft size={14} strokeWidth={2.5} />
                </button>
                <span className="px-3 text-[11px] font-black text-pink-600 dark:text-pink-400 tabular-nums">
                  {page} / {pageCount}
                </span>
                <button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={page >= pageCount || gridLoading} className={pagerButtonClass} title={localize("PagerNext")}>
                  <ChevronRight size={14} strokeWidth={2.5} />
                </button>
                <button type="button" onClick={() => setPage(pageCount)} disabled={page >= pageCount || gridLoading} className={pagerButtonClass} title={localize("PagerLast")}>
                  <ChevronsRight size={14} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          )}

          {/* Jobsheet report, laid out like the backend JobsheetReport template */}
          {reportDetails.length > 0 && (
            <div className="flex flex-col gap-3 mt-2">
              <div className="flex items-center justify-end gap-2">
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
                <button
                  type="button"
                  onClick={() => setReport(null)}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-red-500"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="w-full max-h-[70vh] overflow-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <table className="w-full border-separate border-spacing-0 min-w-[1100px]">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      {REPORT_COLUMNS.map((column) => (
                        <th key={column.field} rowSpan={2} className={gridHeaderClass}>
                          {localize(column.labelKey)}
                        </th>
                      ))}
                      <th colSpan={REPORT_DETAIL_COLUMNS.length} className={gridHeaderClass}>
                        {localize("Details")}
                      </th>
                    </tr>
                    <tr>
                      {REPORT_DETAIL_COLUMNS.map((column) => (
                        <th key={column.field} className={gridHeaderClass}>
                          {localize(column.labelKey)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportDetails.map((row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        className={rowIndex % 2 === 0 ? "bg-white dark:bg-[#161920]" : "bg-slate-50/80 dark:bg-white/[0.03]"}
                      >
                        {ALL_REPORT_COLUMNS.map((column) => (
                          <td
                            key={column.field}
                            className={`${gridCellClass} ${column.field === "Remarks" ? "text-left" : ""}`}
                          >
                            {getRowValue(row, column.field) ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="sticky bottom-0 z-10">
                    <tr>
                      <td colSpan={ALL_REPORT_COLUMNS.length} className="border-t-2 border-pink-200 dark:border-slate-600 bg-pink-50 dark:bg-slate-800 px-3 py-3">
                        <div className="flex flex-wrap gap-x-8 gap-y-2 text-[12px] font-black text-slate-900 dark:text-white">
                          {reportTotals.map((item) => (
                            <span key={item.field}>
                              <span className="text-pink-700 dark:text-pink-200">{item.label} :</span> {item.value ?? ""}
                            </span>
                          ))}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-8 gap-y-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          {generatedItems.map((item) => (
                            <span key={item.field}>
                              {item.label} : <span className="text-slate-900 dark:text-white">{item.value ?? ""}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <JobsheetModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={afterSave}
      />

      <JobsheetModal
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedJobsheet(null);
        }}
        jobsheet={selectedJobsheet}
        // Blazor locks the form when the backend marks the jobsheet as not editable.
        viewOnly={!canEdit || Boolean(getRowValue(selectedJobsheet, "IsJobsheetNotEditable"))}
        onSave={afterSave}
      />
    </div>
  );
}
