import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PermissionGuard } from "../component/common/PermissionGuard";
import { ArrowLeft, RotateCcw } from "lucide-react";
import {
  Autocomplete,
  TextField,
} from "@mui/material";
import apiClient from "../services/apiClient";
import countriesApi from "../services/api/countries";
import usersApi from "../services/api/users";
import workCodesApi from "../services/api/workCodes";
import amsTicketApi from "../services/api/amsTicketApi";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";
import "flatpickr/dist/themes/dark.css";

import { DataGrid } from "@mui/x-data-grid";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { buildDateRangeReportFileName } from "../utils/reportFileName";

const TICKET_TYPE_OPTIONS = [
  { value: "ServicePlanned", label: "Service Planned" },
  { value: "ServiceDemand", label: "Service Demand" },
  { value: "Inquiry", label: "Inquiry" },
  { value: "Complaint", label: "Complaint" },
];

const SERVICE_PLANNED_TYPE_OPTIONS = [
  { value: "Report", label: "Report" },
  { value: "Rule", label: "Rule" },
  { value: "Installation", label: "Installation" },
  { value: "Configuration", label: "Configuration" },
  { value: "TBS", label: "TBS" },
  { value: "Other", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "Opened", label: "Open" },
  { value: "Closed", label: "Closed" },
  { value: "Void", label: "Void" },
];

const STATUS_API_VALUES = { Opened: 1, Closed: 2, Void: 3 };
const TICKET_TYPE_API_VALUES = {
  ServicePlanned: 1,
  ServiceDemand: 2,
  Complaint: 3,
  Inquiry: 4,
};
const SERVICE_PLANNED_TYPE_API_VALUES = {
  Report: 1,
  Rule: 2,
  Installation: 3,
  Configuration: 4,
  TBS: 5,
  Other: 6,
};

const normalizeSpreadsheetHeader = (value) =>
  String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

const TICKET_SPREADSHEET_HEADERS = new Set([
  "ticket",
  "tickets",
  "ticketnumber",
  "ticketno",
  "ticketid",
  "cmsticket",
  "cmsticketnumber",
  "cmsticketno",
  "cmsnextticketno",
]);

const extractSpreadsheetTicketNumbers = (workbook) => {
  const ticketNumbers = [];

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
      raw: false,
    });

    const headerRowIndex = rows.findIndex((row) =>
      row.some((cell) =>
        TICKET_SPREADSHEET_HEADERS.has(normalizeSpreadsheetHeader(cell))
      )
    );
    if (headerRowIndex < 0) return;

    const headerRow = rows[headerRowIndex];
    const ticketColumnIndex = headerRow.findIndex((cell) =>
      TICKET_SPREADSHEET_HEADERS.has(normalizeSpreadsheetHeader(cell))
    );

    rows.slice(headerRowIndex + 1).forEach((row) => {
      String(row[ticketColumnIndex] ?? "")
        .split(/[;,\r\n]+/)
        .map((ticketNumber) => ticketNumber.trim())
        .filter(Boolean)
        .forEach((ticketNumber) => ticketNumbers.push(ticketNumber));
    });
  });

  return [...new Set(ticketNumbers)];
};

const REPORT_GRID_COLUMNS = [
  { field: "countryName", header: "Country", keys: ["countryName", "country"] },
  { field: "customerName", header: "Customer Name", keys: ["customerName", "customer"] },
  { field: "cmsNextTicketNo", header: "Ticket", keys: ["cmsNextTicketNo", "cMSNextTicketNo", "ticketNo", "ticketNumber", "ticket"] },
  { field: "issueDescription", header: "Summary Description", keys: ["issueDescription", "issueDiscription", "summaryDescription", "ticketNotes"] },
  { field: "ticketType", header: "Type", keys: ["ticketType", "ticketTypeStr", "type"] },
  { field: "ticketStatus", header: "Status", keys: ["ticketStatus", "status"] },
  { field: "ticketReceivedDate", header: "Receipt Date", keys: ["ticketReceivedDate", "receiptDate", "creationTime", "receivedAt"] },
  { field: "cmsTicketClosedOn", header: "Close Date", keys: ["cmsTicketClosedOn", "cMSTicketClosedOn", "serviceClosedDate", "closeDate", "ticketCloseDate"] },
  { field: "workDoneCode", header: "Work Done Code", keys: ["workDoneCode", "workDoneCodeName"] },
  { field: "workDoneDescription", header: "Work Done Description", keys: ["workDoneDescription", "workDoneCodeDescription"] },
  { field: "activityType", header: "Activity Type", keys: ["activityType", "activityTypeName"] },
  { field: "startTime", header: "Start Time", keys: ["startTime", "startDate", "startTimeUTC_8"] },
  { field: "endTime", header: "End Time", keys: ["endTime", "endDate", "endTimeUTC_8"] },
  { field: "duration", header: "Total Duration (Minutes)", keys: ["duration", "totalDurationMinutes", "totalDuration", "activityTotalDuration", "totalDurationInMinutes"] },
  { field: "totalMinutesSpendInsideOfWorkingHours", header: "Office Hours Duration (Minutes)", keys: ["totalMinutesSpendInsideOfWorkingHours", "totalMinutesOfficeHoursWholeTicket", "officeHoursDurationMinutes", "officeHoursDuration", "officeHours"] },
  { field: "totalMinutesSpendOutsideOfWorkingHours", header: "After Office Hours Duration (Minutes)", keys: ["totalMinutesSpendOutsideOfWorkingHours", "totalMinutesAfterOfficeHoursWholeTicket", "afterOfficeHoursDurationMinutes", "afterOfficeHoursDuration", "afterOfficeHours"] },
  { field: "performedBy", header: "Performed By", keys: ["performedBy", "performedByName", "ticketClosedBy", "ticketAssignedToName", "performer"] },
  { field: "isWorkingHours", header: "Working Hours", keys: ["isWorkingHours", "isActivityDuringWorkingHours", "workingHours", "hoursType", "startWithinBusinessHours"] },
];

const getReportValue = (row, keys) => {
  for (const key of keys) {
    const matchingKey = Object.keys(row).find(
      (rowKey) => rowKey.toLowerCase() === key.toLowerCase(),
    );
    if (matchingKey && row[matchingKey] !== null && row[matchingKey] !== undefined) {
      return row[matchingKey];
    }
  }
  return null;
};

const getBackendResponseText = (responseData) => {
  if (typeof responseData === "string") return responseData;
  if (!responseData || typeof responseData !== "object") return "";

  const messages = [];
  const addMessage = (value) => {
    if (typeof value === "string" && value.trim()) messages.push(value.trim());
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
      container.validationErrors.forEach((validationError) =>
        addMessage(
          typeof validationError === "string"
            ? validationError
            : validationError?.message,
        ),
      );
    }

    if (container.errors && typeof container.errors === "object") {
      Object.values(container.errors).flat().forEach(addMessage);
    }
  };

  readContainer(responseData);
  readContainer(responseData.error);
  readContainer(responseData.result);
  readContainer(responseData.data);

  if (messages.length > 0) return [...new Set(messages)].join("\n");
  return "";
};

const getBackendErrorText = (error) =>
  getBackendResponseText(error?.response?.data);

const fetchBackendApplicationConfig = () =>
  apiClient.get("/api/abp/application-configuration", {
    params: { IncludeLocalizationResources: true },
  }).then((response) => response.data).catch(() => null);

const getBackendLocalizationText = (applicationConfig, key) => {
  const resources = applicationConfig?.localization?.values;
  if (!resources || typeof resources !== "object") return "";

  const billingText = resources.Billing?.[key];
  if (typeof billingText === "string" && billingText.trim()) {
    return billingText.trim();
  }

  for (const resource of Object.values(resources)) {
    const localizedText = resource?.[key];
    if (typeof localizedText === "string" && localizedText.trim()) {
      return localizedText.trim();
    }
  }

  return "";
};

const formatBackendLocalizationText = (text, ...values) =>
  text.replace(/\{(\d+)\}/g, (placeholder, index) =>
    values[Number(index)] ?? placeholder
  );

const getBackendErrorFallbackKey = (error) => {
  if (!error?.response) return "InternetConnectionInfo";

  switch (error.response.status) {
    case 400:
      return "ValidationErrorMessage";
    case 401:
      return "DefaultErrorMessage401";
    case 403:
      return "DefaultErrorMessage403";
    case 404:
      return "DefaultErrorMessage404";
    case 500:
    case 501:
    case 502:
    case 503:
      return "InternalServerErrorMessage";
    default:
      return "DefaultErrorMessage";
  }
};

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDefaultFilters = () => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  return {
    cmsNextTicketNo: "",
    dateFrom: formatLocalDate(firstDayOfMonth),
    dateTo: formatLocalDate(today),
    status: "Closed",
    country: "",
    ticketType: "",
    servicePlannedType: "",
    customer: "",
    workDoneCode: "",
    performed: "",
    compareFile: null,
  };
};

const formatFilterDateTime = (value, defaultTime, endOfMinute = false) => {
  if (!value) return undefined;
  if (value.includes("T")) return value;

  const [date, selectedTime] = value.trim().split(/\s+/);
  const seconds = endOfMinute ? "59.999" : "00.000";
  return `${date}T${selectedTime || defaultTime}:${seconds}Z`;
};


// Helper: strip nested objects/arrays from a row
const sanitizeRow = (row) => {
  return Object.fromEntries(
    Object.entries(row).filter(([, v]) => {
      if (v === null || v === undefined) return true;
      return typeof v !== "object" && !Array.isArray(v);
    })
  );
};

export default function AMSTicketsReportPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(getDefaultFilters);

  const [countriesList, setCountriesList] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [workCodesList, setWorkCodesList] = useState([]);
  const [performedList, setPerformedList] = useState([]);

  const [reportData, setReportData] = useState([]);
  const [showDataGrid, setShowDataGrid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [applicationConfig, setApplicationConfig] = useState(null);
  const fileInputRef = useRef(null);

  const [compareResultDialog, setCompareResultDialog] = useState({
    open: false,
    title: "",
    message: "",
    actionText: "",
    isSuccess: true,
  });

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [countriesData, customersData, workCodesData, vendorUsersData, itsUsersData, applicationConfig] =
          await Promise.all([
            countriesApi.getAll().catch(() => ({ items: [] })),
            usersApi.getCustomerList().catch(() => ({ items: [] })),
            workCodesApi.getAll().catch(() => ({ items: [] })),
            usersApi.getUsersList({ organizationTypes: [2, 3] }).catch(() => ({ items: [] })),
            usersApi.getUsersList({ isITS: true }).catch(() => ({ items: [] })),
            fetchBackendApplicationConfig(),
          ]);

        setCountriesList(countriesData?.items || countriesData || []);
        setCustomersList(customersData?.items || customersData || []);
        setWorkCodesList(
          Array.isArray(workCodesData) ? workCodesData : workCodesData?.items || []
        );
        const allPerformed = [
          ...(Array.isArray(vendorUsersData) ? vendorUsersData : vendorUsersData?.items || []),
          ...(Array.isArray(itsUsersData) ? itsUsersData : itsUsersData?.items || [])
        ];

        // Deduplicate users by id
        const uniquePerformed = Array.from(new Map(allPerformed.map(u => [u.id, u])).values());
        setPerformedList(uniquePerformed);
        setApplicationConfig(applicationConfig);

      } catch (error) {
        console.error(error);
      }
    };
    fetchDropdownData();
  }, []);

  const handleClear = () => {
    setFormError("");
    setFilters(getDefaultFilters());
    setReportData([]);
    setShowDataGrid(false);
  };

  const buildParams = () => {
    const rawParams = {
      "AMSTicketSearch.UserId": "",
      "AMSTicketSearch.SiteName": "",
      "AMSTicketSearch.SiteOCN": "",
      "AMSTicketSearch.TicketIncomingChannel": "",
      "AMSTicketSearch.TicketForwardedBy": "",
      "AMSTicketSearch.CMSNextTicketNo": filters.cmsNextTicketNo
        ? filters.cmsNextTicketNo.replace(/\s+/g, "").replace(/;+/g, ";").replace(/;$/, "") : undefined,
      "AMSTicketSearch.IssueDiscription": "",
      "AMSTicketSearch.TicketReceivedDate": "",
      "AMSTicketSearch.TicketResolutionVerifiedOn": "",
      "AMSTicketSearch.Status": filters.status !== "" ? filters.status : undefined,
      "AMSTicketSearch.TicketType": filters.ticketType || undefined,
      "AMSTicketSearch.ServicePlannedType": filters.ticketType === "ServicePlanned" && filters.servicePlannedType
        ? filters.servicePlannedType
        : undefined,
      "AMSTicketSearch.CountryId": filters.country || undefined,
      "AMSTicketSearch.CustomerUserId": filters.customer || undefined,
      "AMSTicketSearch.WorkDoneCodeIds": filters.workDoneCode
        ? [filters.workDoneCode]
        : undefined,
      "AMSTicketSearch.PerformedByUsers": filters.performed
        ? [filters.performed]
        : undefined,
      "AMSTicketSearch.CompressedTicketNumbers": "",
      "AMSTicketSearch.DateFrom": formatFilterDateTime(filters.dateFrom, "00:00") || "",
      "AMSTicketSearch.DateTo": formatFilterDateTime(filters.dateTo, "23:59", true) || "",
    };

    return Object.fromEntries(
      Object.entries(rawParams).filter(
        ([, v]) => v !== "" && v !== null && v !== undefined
      )
    );
  };

  const handleGetReport = async (asFile = false) => {
    const setRequestLoading = asFile ? setExcelLoading : setReportLoading;
    try {
      setRequestLoading(true);
      setFormError("");
      if (!asFile) setShowDataGrid(false);

      const params = buildParams();

      const response = await apiClient.get(
        "/api/app/a-mSTicket/a-mSTicket-reports",
        { params }
      );

      const data = response.data;
      const backendResponseText = getBackendResponseText(data);
      let items = [];

      if (Array.isArray(data)) {
        items = data;
      } else if (data && typeof data === "object") {
        // Try common known properties
        items =
          data.amsTicketReportDetailList ||
          data.aMSTicketReportDetailList ||
          data.items ||
          data.data ||
          data.result;

        // If still not an array, search for the first array property in the object
        if (!Array.isArray(items)) {
          const arrayValues = Object.values(data).filter(Array.isArray);
          items = arrayValues.length > 0 ? arrayValues[0] : [];
        }
      }

      // ✅ Strip nested objects (settings, etc.) from every row
      const dataArray = Array.isArray(items)
        ? items.map(sanitizeRow)
        : [];

      let backendConfig = applicationConfig;
      let emptyResultText = backendResponseText || getBackendLocalizationText(
        backendConfig,
        "NoReportFound",
      );
      if (dataArray.length === 0 && !emptyResultText) {
        backendConfig = await fetchBackendApplicationConfig();
        emptyResultText = getBackendLocalizationText(
          backendConfig,
          "NoReportFound",
        );
        if (backendConfig) setApplicationConfig(backendConfig);
      }

      if (asFile) {
        if (dataArray.length === 0) {
          setFormError(emptyResultText);
          setRequestLoading(false);
          return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("AMS Tickets Report");

        const headers = Object.keys(dataArray[0]);
        const headerRow = worksheet.addRow(headers);

        headerRow.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFDB2777" },
          };
          cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
          cell.alignment = { horizontal: "center" };
        });

        dataArray.forEach((row) => {
          worksheet.addRow(Object.values(row));
        });

        worksheet.columns.forEach((column) => {
          column.width = 20;
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(
          new Blob([buffer]),
          buildDateRangeReportFileName(
            "AMSTicket",
            filters.dateFrom,
            filters.dateTo,
          ),
        );
      } else {
        setReportData(dataArray);
        setFormError(dataArray.length === 0 ? emptyResultText : "");
        setShowDataGrid(dataArray.length > 0);
      }

      setRequestLoading(false);
    } catch (error) {
      setRequestLoading(false);
      console.error(error);
      const backendConfig = applicationConfig || await fetchBackendApplicationConfig();
      if (backendConfig && !applicationConfig) setApplicationConfig(backendConfig);
      setFormError(
        getBackendErrorText(error) ||
        getBackendLocalizationText(backendConfig, getBackendErrorFallbackKey(error))
      );
    }
  };

  const handleCompareTicket = async (compareFile) => {
    try {
      setLoading(true);
      setFormError("");
      setShowDataGrid(false);

      const buffer = await compareFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const uploadedTicketNumbers = extractSpreadsheetTicketNumbers(workbook);

      if (uploadedTicketNumbers.length === 0) {
        const backendConfig = applicationConfig || await fetchBackendApplicationConfig();
        if (backendConfig && !applicationConfig) setApplicationConfig(backendConfig);
        setFormError(
          getBackendLocalizationText(backendConfig, "NoReportFound")
        );
        setLoading(false);
        return;
      }

      const filterTicketNumbers = filters.cmsNextTicketNo
        ? filters.cmsNextTicketNo.split(";").map((value) => value.trim()).filter(Boolean)
        : [];
      const cmsNextTicketNumbers = [
        ...new Set([...uploadedTicketNumbers, ...filterTicketNumbers]),
      ];

      const amsTicketSearch = {
        siteName: "",
        siteOCN: "",
        ticketIncomingChannel: 0,
        ticketForwardedBy: "",
        cmsNextTicketNo: filters.cmsNextTicketNo || "",
        cmsNextTicketNumbers,
        issueDiscription: "",
        status: STATUS_API_VALUES[filters.status] || 0,
        ticketType: TICKET_TYPE_API_VALUES[filters.ticketType] || 0,
        servicePlannedType:
          SERVICE_PLANNED_TYPE_API_VALUES[filters.servicePlannedType] || 0,
        servicePlannedTypes: filters.servicePlannedType
          ? [SERVICE_PLANNED_TYPE_API_VALUES[filters.servicePlannedType]]
          : [],
        workDoneCodeIds: filters.workDoneCode ? [filters.workDoneCode] : [],
        performedByUsers: filters.performed ? [filters.performed] : [],
        dateFrom: formatFilterDateTime(filters.dateFrom, "00:00"),
        dateTo: formatFilterDateTime(filters.dateTo, "23:59", true),
        ...(filters.country ? { countryId: filters.country } : {}),
        ...(filters.customer ? { customerUserId: filters.customer } : {}),
      };

      const response = await amsTicketApi.compareTickets(amsTicketSearch);

      const existInInternalOnly = response?.ticketNumbersExistInSystemOnly ||
        response?.ticketNumbersExistInInternalSystemOnly || [];
      const existInAbbottOnly = response?.ticketNumbersExistInExternalReportOnly ||
        response?.ticketNumbersExistInAbbottReportOnly || [];
      const wdcDifferences = response?.ticketNumbersWithWDCDifferences || [];

      const backendConfig = applicationConfig || await fetchBackendApplicationConfig();
      if (backendConfig && !applicationConfig) setApplicationConfig(backendConfig);
      const internalOnlyText = getBackendLocalizationText(
        backendConfig,
        "TicketNumbersExistInSystemOnly",
      );
      const externalOnlyText = getBackendLocalizationText(
        backendConfig,
        "TicketNumbersExistInExternalReportOnly",
      );

      const dataArray = [
        ...existInInternalOnly.map((t) => ({ ticketNo: t, difference: internalOnlyText })),
        ...existInAbbottOnly.map((t) => ({ ticketNo: t, difference: externalOnlyText })),
        ...wdcDifferences.map((t) => ({ ticketNo: t, difference: "WDC Difference" })),
      ];

      setReportData(dataArray);
      setShowDataGrid(dataArray.length > 0);

      if (dataArray.length === 0) {
        setCompareResultDialog({
          open: true,
          title: getBackendLocalizationText(backendConfig, "OperationSuccessfull"),
          message: getBackendResponseText(response) || getBackendLocalizationText(
            backendConfig,
            "AllTheTicketsExistsInTheSystem",
          ),
          actionText: getBackendLocalizationText(backendConfig, "Ok"),
          isSuccess: true,
        });
      } else {
        const comparisonMessages = [
          existInInternalOnly.length > 0 ? internalOnlyText : "",
          existInAbbottOnly.length > 0 ? externalOnlyText : "",
        ].filter(Boolean);
        setCompareResultDialog({
          open: true,
          title: getBackendLocalizationText(backendConfig, "CompareTickets"),
          message: getBackendResponseText(response) ||
            comparisonMessages.join("\n") ||
            getBackendLocalizationText(backendConfig, "CompareTickets"),
          actionText: getBackendLocalizationText(backendConfig, "Ok"),
          isSuccess: false,
        });
      }

      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error(error);
      const backendConfig = applicationConfig || await fetchBackendApplicationConfig();
      if (backendConfig && !applicationConfig) setApplicationConfig(backendConfig);
      setFormError(
        getBackendErrorText(error) ||
        getBackendLocalizationText(backendConfig, getBackendErrorFallbackKey(error))
      );
    }
  };

  const handleCompareFileChange = async (event) => {
    const file = event.target.files?.[0] || null;
    setFormError("");

    if (!file) {
      setFilters((current) => ({ ...current, compareFile: null }));
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "xlsx" && extension !== "xls") {
      setFilters((current) => ({ ...current, compareFile: null }));
      event.target.value = "";
      const backendConfig = applicationConfig || await fetchBackendApplicationConfig();
      if (backendConfig && !applicationConfig) setApplicationConfig(backendConfig);
      setFormError(
        formatBackendLocalizationText(
          getBackendLocalizationText(
            backendConfig,
            "ThisFieldOnlyAcceptsFilesWithTheFollowingExtensions:{0}",
          ),
          ".xlsx, .xls",
        ),
      );
      return;
    }

    setFilters((current) => ({ ...current, compareFile: file }));
    await handleCompareTicket(file);
  };

  const columns = useMemo(() => {
    const dataKeys = reportData.length > 0 ? Object.keys(reportData[0]) : [];
    const isCompareResult = dataKeys.includes("difference");

    let finalColumns = [];

    if (isCompareResult) {
      finalColumns = dataKeys
        .filter((key) => {
          const val = reportData[0][key];
          return val === null || val === undefined || (typeof val !== "object" && !Array.isArray(val));
        })
        .map((key) => ({
          field: key,
          headerName: key.replace(/([A-Z])/g, " $1").trim().toUpperCase(),
          minWidth: 150,
          flex: 1,
          renderCell: (params) => {
            const val = params.value;
            if (typeof val === "boolean") return val ? "Yes" : "No";
            if (val === null || val === undefined) return "-";
            return String(val);
          },
        }));
    } else {
      finalColumns = REPORT_GRID_COLUMNS.map((column) => {
        return {
          field: column.field,
          headerName: column.header,
          minWidth: 150,
          flex: 1,
          valueGetter: (_value, row) => getReportValue(row, column.keys),
          renderCell: (params) => {
            const val = params.value;
            if (typeof val === "boolean") return val ? "Yes" : "No";
            if (val === null || val === undefined) return "-";
            return String(val);
          },
        };
      });
    }

    return finalColumns;
  }, [reportData]);

  const filterInputClass =
    "px-3 py-2 text-xs bg-white dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/50 rounded-xl outline-none focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500 transition-all placeholder:text-slate-400 w-full shadow-sm";

  return (
    <div className="ams-ticket-report-page min-h-full w-full bg-[#f8fafc] dark:bg-slate-950 p-1 pb-[10px] flex flex-col relative overflow-visible font-[Arial]">
      <style>{`
        .ams-ticket-report-page,
        .ams-ticket-report-page * {
          scrollbar-width: auto;
          scrollbar-color: #94a3b8 #e2e8f0;
        }

        .dark .ams-ticket-report-page,
        .dark .ams-ticket-report-page * {
          scrollbar-color: #64748b #1e293b;
        }

        .ams-ticket-report-page *::-webkit-scrollbar {
          display: block !important;
          width: 10px;
          height: 10px;
        }

        .ams-ticket-report-page *::-webkit-scrollbar-track {
          background: #e2e8f0;
          border-radius: 999px;
        }

        .ams-ticket-report-page *::-webkit-scrollbar-thumb {
          background: #94a3b8;
          border: 2px solid #e2e8f0;
          border-radius: 999px;
        }

        .ams-ticket-report-page *::-webkit-scrollbar-thumb:hover {
          background: #ec4899;
        }

        .dark .ams-ticket-report-page *::-webkit-scrollbar-track {
          background: #1e293b;
        }

        .dark .ams-ticket-report-page *::-webkit-scrollbar-thumb {
          background: #64748b;
          border-color: #1e293b;
        }

        .dark .ams-ticket-report-page *::-webkit-scrollbar-thumb:hover {
          background: #ec4899;
        }
      `}</style>

      <div className="flex-1 min-h-0 w-full bg-white dark:bg-[#161920] border border-slate-200 dark:border-slate-800/50 shadow-sm flex flex-col rounded-3xl overflow-hidden">
        <div className="flex flex-col gap-6 py-8 px-4 md:px-8 transition-colors border-b border-slate-100 dark:border-slate-800/50 shrink-0">
          <nav className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-600 mb-1">
            <span
              onClick={() => navigate("/")}
              className="hover:text-pink-500 cursor-pointer transition-colors"
            >
              Home
            </span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span>Management</span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span>Reports</span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-pink-500">AMS Tickets Report</span>
          </nav>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                AMS Tickets Report
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] text-slate-400 hover:text-rose-500 hover:border-rose-500/30 transition-all active:scale-95 focus:outline-none"
              >
                <RotateCcw size={14} />
                Clear
              </button>
              <button
                onClick={() => handleGetReport(false)}
                disabled={reportLoading}
                className="app-primary-button flex items-center gap-1.5 px-4 py-2 text-[11px] focus:outline-none"
              >
                {reportLoading ? "Loading..." : "Get Report"}
              </button>

              <PermissionGuard permission="Billing.AMSTickets.ExportReportToExcel">
                <button
                  onClick={() => handleGetReport(true)}
                  disabled={excelLoading}
                  className="app-primary-button flex items-center gap-1.5 px-4 py-2 text-[11px] focus:outline-none"
                >
                  {excelLoading ? "Exporting..." : "Excel Report"}
                </button>
              </PermissionGuard>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="px-4 md:px-8 py-4 space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-lg text-xs flex items-center gap-2 whitespace-pre-line">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              {formError}
            </div>
          )}

          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[10px] text-slate-400 ml-1 mb-1 font-bold uppercase tracking-wider">
                CMS Next Ticket No
              </label>
              <textarea
                placeholder="Enter ticket no... (152172RA2364993;152172RA2364881;)"
                value={filters.cmsNextTicketNo}
                onChange={(e) => setFilters({ ...filters, cmsNextTicketNo: e.target.value })}
                className={`${filterInputClass} resize-y min-h-[42px]`}
                rows={1}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 ml-1 mb-1 font-bold uppercase tracking-wider">
                Ticket Closed Date From
              </label>
              <Flatpickr
                value={filters.dateFrom}
                onChange={(dates, dateStr) => setFilters({ ...filters, dateFrom: dateStr })}
                options={{ dateFormat: "Y-m-d", allowInput: true }}
                placeholder="YYYY-MM-DD"
                className={filterInputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 ml-1 mb-1 font-bold uppercase tracking-wider">
                Ticket Closed Date To
              </label>
              <Flatpickr
                value={filters.dateTo}
                onChange={(dates, dateStr) => setFilters({ ...filters, dateTo: dateStr })}
                options={{ dateFormat: "Y-m-d", allowInput: true }}
                placeholder="YYYY-MM-DD"
                className={filterInputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 ml-1 mb-1 font-bold uppercase tracking-wider">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className={filterInputClass}
              >
                <option value="">All</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 ml-1 mb-1 font-bold uppercase tracking-wider">
                Country
              </label>
              <Autocomplete
                options={countriesList}
                getOptionLabel={(option) => option.name || option || ""}
                value={countriesList.find((c) => (c.id || c) === filters.country) || null}
                onChange={(e, newValue) => {
                  setFilters({ ...filters, country: newValue ? newValue.id || newValue : "" });
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "0.5rem",
                    padding: "1px 12px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    backgroundColor: "transparent",
                    "& fieldset": { border: "none" },
                  },
                }}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus-within:ring-4 focus-within:ring-pink-500/10 focus-within:border-pink-500 transition-all w-full text-slate-800 dark:text-slate-200"
                renderInput={(params) => (
                  <TextField {...params} placeholder="Search country..." variant="outlined" />
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 ml-1 mb-1 font-bold uppercase tracking-wider">
                Ticket Type
              </label>
              <select
                value={filters.ticketType}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilters({
                    ...filters,
                    ticketType: val,
                    // Reset servicePlannedType when ticket type is not ServicePlanned
                    servicePlannedType: val !== "ServicePlanned" ? "" : filters.servicePlannedType,
                  });
                }}
                className={filterInputClass}
              >
                <option value="">All</option>
                {TICKET_TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Service Planned Type — only shown when Ticket Type is Service Planned */}
            {filters.ticketType === "ServicePlanned" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 ml-1 mb-1 font-bold uppercase tracking-wider">
                  Service Planned Type
                </label>
                <select
                  value={filters.servicePlannedType}
                  onChange={(e) => setFilters({ ...filters, servicePlannedType: e.target.value })}
                  className={filterInputClass}
                >
                  <option value="">All</option>
                  {SERVICE_PLANNED_TYPE_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 ml-1 mb-1 font-bold uppercase tracking-wider">
                Customer
              </label>
              <Autocomplete
                options={customersList}
                getOptionLabel={(option) =>
                  option.name || option.userName || option.email || option || ""
                }
                value={customersList.find((c) => (c.id || c) === filters.customer) || null}
                onChange={(e, newValue) => {
                  setFilters({ ...filters, customer: newValue ? newValue.id || newValue : "" });
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "0.5rem",
                    padding: "1px 12px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    backgroundColor: "transparent",
                    "& fieldset": { border: "none" },
                  },
                }}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus-within:ring-4 focus-within:ring-pink-500/10 focus-within:border-pink-500 transition-all w-full text-slate-800 dark:text-slate-200"
                renderInput={(params) => (
                  <TextField {...params} placeholder="Search customer..." variant="outlined" />
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 ml-1 mb-1 font-bold uppercase tracking-wider">
                Work Done Code
              </label>
              <Autocomplete
                options={workCodesList}
                getOptionLabel={(option) => {
                  if (typeof option === "string") return option;
                  const c = option.code || "";
                  const d = option.description || "";
                  if (c && d) return `${c} - ${d}`;
                  return c || d || option.name || "";
                }}
                value={workCodesList.find((w) => (w.id || w) === filters.workDoneCode) || null}
                onChange={(e, newValue) => {
                  setFilters({ ...filters, workDoneCode: newValue ? newValue.id || newValue : "" });
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "0.5rem",
                    padding: "1px 12px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    backgroundColor: "transparent",
                    "& fieldset": { border: "none" },
                  },
                }}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus-within:ring-4 focus-within:ring-pink-500/10 focus-within:border-pink-500 transition-all w-full text-slate-800 dark:text-slate-200"
                renderInput={(params) => (
                  <TextField {...params} placeholder="Search work code..." variant="outlined" />
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 ml-1 mb-1 font-bold uppercase tracking-wider">
                Performed By
              </label>
              <Autocomplete
                options={performedList}
                getOptionLabel={(option) =>
                  option.name || option.userName || option.email || option || ""
                }
                value={performedList.find((c) => (c.id || c) === filters.performed) || null}
                onChange={(e, newValue) => {
                  setFilters({ ...filters, performed: newValue ? newValue.id || newValue : "" });
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "0.5rem",
                    padding: "1px 12px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    backgroundColor: "transparent",
                    "& fieldset": { border: "none" },
                  },
                }}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus-within:ring-4 focus-within:ring-pink-500/10 focus-within:border-pink-500 transition-all w-full text-slate-800 dark:text-slate-200"
                renderInput={(params) => (
                  <TextField {...params} placeholder="Search user..." variant="outlined" />
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 ml-1 mb-1 font-bold uppercase tracking-wider">
                Compare Tickets (File)
              </label>
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleCompareFileChange}
                  className={`${filterInputClass} p-1 file:mr-4 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-pink-50 dark:file:bg-pink-900/30 file:text-pink-700 dark:file:text-pink-400 hover:file:bg-pink-100 dark:hover:file:bg-pink-900/50 cursor-pointer pr-8`}
                />
                {filters.compareFile && (
                  <button
                    onClick={() => {
                      setFilters({ ...filters, compareFile: null });
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors z-10"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        {showDataGrid && (
          <div className="h-[580px] min-h-[580px] shrink-0 border-t border-slate-100 dark:border-slate-800/50 flex flex-col relative overflow-hidden bg-white dark:bg-slate-900">
            <DataGrid
            className="ams-ticket-report-grid"
            rows={reportData}
            columns={columns}
            getRowId={(row) => row.id || row.ticketNo || row.ticket || Math.random().toString()}
            disableRowSelectionOnClick
            loading={loading || reportLoading}
            rowHeight={52}
            columnHeaderHeight={48}
            hideFooter
            showColumnVerticalBorder={true}
            showCellVerticalBorder={true}
            sx={{
              height: "100%",
              minHeight: 0,
              border: "none",
              color: "inherit",
              "& .MuiDataGrid-main": {
                isolation: "isolate",
              },
              "& .MuiDataGrid-columnHeaders": {
                bgcolor: "rgba(248, 250, 252, 1)",
                borderBottom: "1px solid rgba(226, 232, 240, 1)",
                position: "sticky",
                top: 0,
                zIndex: 10,
                "& .MuiDataGrid-columnHeaderTitle": {
                  fontWeight: 800,
                  fontSize: "10px",
                  color: "rgb(71, 85, 105)",
                  letterSpacing: "0.05em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                },
              },
              "& .MuiDataGrid-cell": {
                borderBottom: "1px solid rgba(241, 245, 249, 1)",
                fontSize: "11px",
                color: "rgb(71, 85, 105)",
                display: "flex",
                alignItems: "center",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                padding: "8px",
              },
              "& .MuiDataGrid-cellContent": {
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              },
              "& .MuiDataGrid-virtualScroller": {
                position: "relative",
                zIndex: 1,
              },
              "& .MuiDataGrid-row:hover": {
                bgcolor: "rgba(244, 114, 182, 0.05)",
              },
            }}
            />
          </div>
        )}
      </div>

      {/* Compare Result Dialog (Card) */}
      {compareResultDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-6 flex flex-col gap-4 animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center gap-3 mt-2">
              {compareResultDialog.isSuccess ? (
                <div className="h-14 w-14 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
              ) : (
                <div className="h-14 w-14 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                </div>
              )}
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {compareResultDialog.title}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed whitespace-pre-line">
                {compareResultDialog.message}
              </p>
            </div>
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setCompareResultDialog({
                  open: false,
                  title: "",
                  message: "",
                  actionText: "",
                  isSuccess: true,
                })}
                className="w-full px-5 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-all active:scale-95 outline-none focus:ring-4 focus:ring-slate-400/20"
              >
                {compareResultDialog.actionText}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
