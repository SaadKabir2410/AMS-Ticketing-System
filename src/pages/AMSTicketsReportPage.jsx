import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContextHook";
import { useToast } from "../component/common/ToastContext";
import { ArrowLeft, ArrowLeftRight, RotateCcw, MoreVertical } from "lucide-react";
import {
  Autocomplete,
  TextField,
  Menu,
  MenuItem,
  IconButton,
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


// Helper: strip nested objects/arrays from a row
const sanitizeRow = (row) => {
  return Object.fromEntries(
    Object.entries(row).filter(([_, v]) => {
      if (v === null || v === undefined) return true;
      return typeof v !== "object" && !Array.isArray(v);
    })
  );
};

export default function AMSTicketsReportPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    cmsNextTicketNo: "",
    dateFrom: "",
    dateTo: "",
    status: "",
    country: "",
    ticketType: "",
    servicePlannedType: "",
    customer: "",
    workDoneCode: "",
    performed: "",
    compareFile: null,
  });

  const [countriesList, setCountriesList] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [workCodesList, setWorkCodesList] = useState([]);
  const [performedList, setPerformedList] = useState([]);

  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role?.toLowerCase().includes("admin");
  const fileInputRef = useRef(null);

  const [selectedRow, setSelectedRow] = useState(null);
  const [compareResultDialog, setCompareResultDialog] = useState({ open: false, message: "", isSuccess: true }); // ← ADD THIS LINE


  const handleActionClick = (event, row) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedRow(row);
  };

  const handleActionClose = () => {
    setAnchorEl(null);
    setSelectedRow(null);
  };

  const handleStatusUpdate = async (action) => {
    const row = selectedRow;
    handleActionClose();
    if (!row) return;

    try {
      setLoading(true);
      const ticketId = row.id || row.ticketNo;

      let fullTicket = row;
      try {
        if (ticketId) {
          fullTicket = await amsTicketApi.getById(ticketId);
        }
      } catch (e) {
        console.warn("Could not fetch full ticket by id, using row data as fallback.", e);
      }

      switch (action) {
        case "Close":
          await amsTicketApi.close(ticketId, fullTicket);
          toast("Ticket closed successfully");
          break;
        case "Open":
        case "Re-Open":
          await amsTicketApi.reOpen(ticketId, fullTicket);
          toast("Ticket re-opened successfully");
          break;
        case "Void":
          await amsTicketApi.delete(ticketId, fullTicket);
          toast("Ticket voided successfully");
          break;
        case "Re-Open":
          await amsTicketApi.reOpen(ticketId, fullTicket);
          break;
        default:
          break;
      }

      handleGetReport(false);
    } catch (error) {
      console.error("Failed to update status:", error);
      toast(error.message || "Failed to update status", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAuditLog = () => {
    const row = selectedRow;
    handleActionClose();
    if (!row) return;

    navigate(`/audit-logs?primaryKey=${row.id || row.ticketNo}&entityName=AMSTicket`);
  };

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [countriesData, customersData, workCodesData, vendorUsersData, itsUsersData] =
          await Promise.all([
            countriesApi.getAll().catch(() => ({ items: [] })),
            usersApi.getCustomerList().catch(() => ({ items: [] })),
            workCodesApi.getAll().catch(() => ({ items: [] })),
            usersApi.getUsersList({ organizationTypes: [2, 3] }).catch(() => ({ items: [] })),
            usersApi.getUsersList({ isITS: true }).catch(() => ({ items: [] })),
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

      } catch (error) {
        console.error("Failed to load dropdown data:", error);
      }
    };
    fetchDropdownData();
  }, []);

  const handleClear = () => {
    setFormError("");
    setFilters({
      cmsNextTicketNo: "",
      dateFrom: "",
      dateTo: "",
      status: "",
      country: "",
      ticketType: "",
      servicePlannedType: "",
      customer: "",
      workDoneCode: "",
      performed: "",
      compareFile: null,
    });
    setReportData([]);
  };

  const buildParams = () => {
    const formatDateStart = (d) => {
      if (!d) return undefined;
      return d.includes("T") ? d : `${d}T00:00:00.000Z`;
    };
    const formatDateEnd = (d) => {
      if (!d) return undefined;
      return d.includes("T") ? d : `${d}T23:59:59.999Z`;
    };

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
      "AMSTicketSearch.DateFrom": formatDateStart(filters.dateFrom) || "",
      "AMSTicketSearch.DateTo": formatDateEnd(filters.dateTo) || "",
    };

    return Object.fromEntries(
      Object.entries(rawParams).filter(
        ([_, v]) => v !== "" && v !== null && v !== undefined
      )
    );
  };

  const handleGetReport = async (asFile = false) => {
    try {
      setLoading(true);
      setFormError("");

      // DateFrom and DateTo are always required
      if (!filters.dateFrom || !filters.dateTo) {
        setFormError("Date From and Date To are required.");
        setLoading(false);
        return;
      }

      const params = buildParams();

      const response = await apiClient.get(
        "/api/app/a-mSTicket/a-mSTicket-reports",
        { params }
      );

      const data = response.data;
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
          items = arrayValues.length > 0 ? arrayValues[0] : [data];
        }
      }

      // ✅ Strip nested objects (settings, etc.) from every row
      const dataArray = Array.isArray(items)
        ? items.map(sanitizeRow)
        : [];

      if (asFile) {
        if (dataArray.length === 0) {
          setFormError("No data available to export.");
          setLoading(false);
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
          `AMS_Tickets_Report_${new Date().toISOString().split("T")[0]}.xlsx`
        );
      } else {
        if (dataArray.length === 0) {
          setFormError("No data available for the selected filters.");
        }
        setReportData(dataArray);
      }

      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error("Failed to get report:", error);
      let errorMessage = "Failed to retrieve report.";
      if (error.response?.data?.error?.validationErrors) {
        errorMessage = error.response.data.error.validationErrors
          .map((e) => e.message)
          .join("\n");
      } else if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      setFormError(errorMessage);
    }
  };

  const handleCompareTicket = async () => {
    try {
      setLoading(true);
      setFormError("");

      // DateFrom and DateTo are always required
      if (!filters.dateFrom || !filters.dateTo) {
        setFormError("Date From and Date To are required.");
        setLoading(false);
        return;
      }

      const formatDateStart = (d) => (d ? (d.includes("T") ? d : `${d}T00:00:00.000Z`) : null);
      const formatDateEnd = (d) => (d ? (d.includes("T") ? d : `${d}T23:59:59.999Z`) : null);

      const amsTicketSearch = {
        siteName: "",
        siteOCN: "",
        ticketIncomingChannel: 0,
        ticketForwardedBy: "",
        cmsNextTicketNo: filters.cmsNextTicketNo || "",
        cmsNextTicketNumbers: filters.cmsNextTicketNo
          ? filters.cmsNextTicketNo.split(";").map((s) => s.trim()).filter(Boolean)
          : [],
        issueDiscription: "",
        status: filters.status || 0,
        ticketType: filters.ticketType || 0,
        servicePlannedType: 0,
        servicePlannedTypes: [],
        workDoneCodeIds: filters.workDoneCode ? [filters.workDoneCode] : [],
        performedByUsers: filters.performed ? [filters.performed] : [],
        dateFrom: formatDateStart(filters.dateFrom),
        dateTo: formatDateEnd(filters.dateTo),
        ...(filters.country ? { countryId: filters.country } : {}),
        ...(filters.customer ? { customerUserId: filters.customer } : {}),
      };

      // ── Parse the uploaded Excel file into rows matching abbottReportTickets schema ──
      // ── Parse the uploaded Excel file into rows matching abbottReportTickets schema ──
      let abbottReportTickets = [];
      if (filters.compareFile) {
        const workbook = new ExcelJS.Workbook();
        const buffer = await filters.compareFile.arrayBuffer();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0];

        const headerRow = worksheet.getRow(1).values.slice(1).map((h) => String(h).trim());

        const headerToField = {
          "Country": "country",
          "Instrument": "instrument",
          "Customer Name": "customer",
          "Serial Number": "serialNumber",
          "Ticket": "ticket",
          "Summary Description": "summaryDescription",
          "Ticket Type": "ticketType",
          "Ticket Status": "ticketStatus",
          "Receipt Date": "receiptDate",
          "Service Close Date": "serviceCloseDate",
          "Ticket Close Date": "ticketCloseDate",
          "Workdone Start Date (UTC)": "startDate",
          "Workdone End Date (UTC)": "endDate",
          "Start Time (UTC + 8)": "startTimeUTC_8",
          "End Time (UTC + 8)": "endTimeUTC_8",
          "Performed By": "performedBy",
          "Performer": "performer",
          "Start within Business Hours?": "hoursType",
        };

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // skip header row
          const values = row.values.slice(1);
          const obj = {};

          headerRow.forEach((header, i) => {
            const field = headerToField[header];
            if (field) {
              let val = values[i];
              // Dates in ExcelJS come through as JS Date objects — convert to ISO string
              if (val instanceof Date) {
                val = val.toISOString();
              } else if (val === undefined || val === null) {
                val = "";
              } else {
                val = String(val);
              }
              obj[field] = val;
            }
          });

          // Ensure every DTO field exists even if a column was missing/blank
          abbottReportTickets.push({
            country: obj.country || "",
            instrument: obj.instrument || "",
            customer: obj.customer || "",
            serialNumber: obj.serialNumber || "",
            ticket: obj.ticket || "",
            summaryDescription: obj.summaryDescription || "",
            ticketType: obj.ticketType || "",
            ticketStatus: obj.ticketStatus || "",
            receiptDate: obj.receiptDate || "",
            serviceCloseDate: obj.serviceCloseDate || "",
            ticketCloseDate: obj.ticketCloseDate || "",
            startTimeUTC_8: obj.startTimeUTC_8 || "",
            endTimeUTC_8: obj.endTimeUTC_8 || "",
            performedBy: obj.performedBy || "",
            performer: obj.performer || "",
            hoursType: obj.hoursType || "",
            startDate: obj.startDate || null,
            endDate: obj.endDate || null,
          });
        });
      }
      const body = {
        ticketsWithTimeDifferencesDto: {
          amsTicketSearch,
          abbottReportTickets,
        },
      };

      const response = await amsTicketApi.compareTickets(body);

      const existInInternalOnly = response?.ticketNumbersExistInInternalSystemOnly || [];
      const existInAbbottOnly = response?.ticketNumbersExistInAbbottReportOnly || [];
      const wdcDifferences = response?.ticketNumbersWithWDCDifferences || [];

      const dataArray = [
        ...existInInternalOnly.map((t) => ({ ticketNo: t, difference: "Exists in Internal System Only" })),
        ...existInAbbottOnly.map((t) => ({ ticketNo: t, difference: "Exists in Abbott Report Only" })),
        ...wdcDifferences.map((t) => ({ ticketNo: t, difference: "WDC Difference" })),
      ];

      setReportData(dataArray);

      if (dataArray.length === 0) {
        setCompareResultDialog({
          open: true,
          message: "All the tickets from Abbott Report exist in the ticketing system.",
          isSuccess: true,
        });
      } else {
        setCompareResultDialog({
          open: true,
          message: "Some tickets do not exist or have differences. Please review the details in the table.",
          isSuccess: false,
        });
      }

      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error("Failed to compare tickets:", error);
      let errorMessage = "Failed to compare tickets.";
      if (error.response?.data?.error?.validationErrors) {
        errorMessage = error.response.data.error.validationErrors
          .map((e) => e.message)
          .join("\n");
      } else if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      setFormError(errorMessage);
    }
  };

  const columns = useMemo(() => {
    if (reportData.length === 0) return [];

    const dataKeys = Object.keys(reportData[0]);
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
      const desiredColumns = [
        { header: "Country", keys: ["countryName", "countryId", "country"] },
        { header: "Customer Name", keys: ["customerName", "customerUserId", "customer"] },
        { header: "Ticket", keys: ["cmsNextTicketNo", "cMSNextTicketNo", "ticketNo", "ticketNumber", "ticket"] },
        { header: "Summary Description", keys: ["issueDescription", "issueDiscription", "summaryDescription", "ticketNotes"] },
        { header: "Type", keys: ["ticketType", "ticketTypeStr", "type"] },
        { header: "Status", keys: ["status", "ticketStatus"] },
        { header: "Receipt Date", keys: ["ticketReceivedDate", "receiptDate", "creationTime", "receivedAt"] },
        { header: "Close Date", keys: ["cmsTicketClosedOn", "cMSTicketClosedOn", "serviceClosedDate", "closeDate", "ticketCloseDate"] },
        { header: "Work Done Code", keys: ["workDoneCodeName", "workDoneCode", "workDoneCodeIds"] },
        { header: "Work Done Description", keys: ["workDoneCodeDescription", "workDoneDescription"] },
        { header: "Activity Type", keys: ["activityTypeName", "activityType"] },
        { header: "Start Time", keys: ["startDate", "startTime", "startTimeUTC_8"] },
        { header: "End Time", keys: ["endDate", "endTime", "endTimeUTC_8"] },
        { header: "Total Duration (Minutes)", keys: ["activityTotalDuration", "totalDurationMinutes", "totalDuration", "duration", "totalDurationInMinutes"] },
        { header: "Office Hours Duration (Minutes)", keys: ["totalMinutesOfficeHoursWholeTicket", "officeHoursDurationMinutes", "activityTotalDurationForSpecificUser", "officeHoursDuration", "officeHours", "durationDuringOfficeHours"] },
        { header: "After Office Hours Duration (Minutes)", keys: ["totalMinutesAfterOfficeHoursWholeTicket", "afterWorkingHoursActivityTotalDurationForSpecificUser", "afterOfficeHoursDurationMinutes", "afterOfficeHours", "afterOfficeHoursDuration", "durationAfterOfficeHours", "afterWorkingHoursActivityTotalDuration"] },
        { header: "Performed By", keys: ["performedByName", "performedBy", "ticketClosedBy", "ticketAssignedToName", "performer"] },
        { header: "Working Hours", keys: ["isWorkingHours", "isActivityDuringWorkingHours", "workingHours", "hoursType", "startWithinBusinessHours"] }
      ];

      finalColumns = desiredColumns.map((col) => {
        // Case-insensitive find
        const matchingKey = col.keys.reduce((found, k) => {
          if (found) return found;
          const match = dataKeys.find(dk => dk.toLowerCase() === k.toLowerCase());
          return match || null;
        }, null) || col.keys[0];

        return {
          field: matchingKey,
          headerName: col.header.toUpperCase(),
          minWidth: 150,
          flex: 1,
          renderCell: (params) => {
            const val = params.value;
            if (typeof val === "boolean") return val ? "Yes" : "No";
            if (val === null || val === undefined) return "-";
            return String(val);
          },
        };
      });
    }

    return [
      {
        field: "actions",
        headerName: "ACTIONS",
        width: 80,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <div className="flex justify-center items-center w-full h-full">
            <IconButton
              size="small"
              onClick={(e) => handleActionClick(e, params.row)}
              className="hover:bg-pink-50 text-slate-400 hover:text-pink-600 transition-colors"
            >
              <MoreVertical size={14} />
            </IconButton>
          </div>
        ),
      },
      ...finalColumns,
    ];
  }, [reportData]);

  const filterInputClass =
    "px-3 py-2 text-xs bg-white dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/50 rounded-xl outline-none focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500 transition-all placeholder:text-slate-400 w-full shadow-sm";

  return (
    <div className="min-h-full w-full bg-[#f8fafc] dark:bg-slate-950 p-1 pb-[10px] flex flex-col relative overflow-visible font-[Arial]">
      <style>{`
        *::-webkit-scrollbar { display: none !important; }
        * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
      `}</style>

      <div className="flex-1 w-full bg-white dark:bg-[#161920] border border-slate-200 dark:border-slate-800/50 shadow-sm flex flex-col rounded-3xl overflow-auto">
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
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 disabled:opacity-50 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-[11px] transition-all active:scale-95 shadow-sm focus:outline-none"
              >
                {loading ? "Loading..." : "Get Report"}
              </button>

              <button
                onClick={() => handleGetReport(true)}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-[11px] transition-all active:scale-95 shadow-sm focus:outline-none"
              >
                {loading ? "Exporting..." : "Excel Report"}
              </button>

              <button
                onClick={handleCompareTicket}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-[11px] transition-all active:scale-95 shadow-sm focus:outline-none"
              >
                <ArrowLeftRight size={14} />
                Compare Ticket
              </button>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="px-4 md:px-8 py-4 space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-lg text-xs flex items-center gap-2">
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
                  onChange={(e) => setFilters({ ...filters, compareFile: e.target.files[0] })}
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
        <div className="flex-1 min-h-0 border-t border-slate-100 dark:border-slate-800/50 flex flex-col relative overflow-hidden bg-white dark:bg-slate-900">
          <DataGrid
            rows={reportData}
            columns={columns}
            getRowId={(row) => row.id || row.ticketNo || row.ticket || Math.random().toString()}
            disableRowSelectionOnClick
            loading={loading}
            getRowHeight={() => "auto"}
            getEstimatedRowHeight={() => 44}
            columnHeaderHeight={48}
            hideFooter
            showColumnVerticalBorder={true}
            showCellVerticalBorder={true}
            sx={{
              border: "none",
              color: "inherit",
              "& .MuiDataGrid-columnHeaders": {
                bgcolor: "rgba(248, 250, 252, 1)",
                borderBottom: "1px solid rgba(226, 232, 240, 1)",
                "& .MuiDataGrid-columnHeaderTitle": {
                  fontWeight: 800,
                  fontSize: "10px",
                  color: "rgb(71, 85, 105)",
                  letterSpacing: "0.05em",
                },
              },
              "& .MuiDataGrid-cell": {
                borderBottom: "1px solid rgba(241, 245, 249, 1)",
                fontSize: "11px",
                color: "rgb(71, 85, 105)",
                display: "flex",
                alignItems: "center",
                whiteSpace: "normal",
                wordBreak: "break-word",
                padding: "8px",
              },
              "& .MuiDataGrid-row:hover": {
                bgcolor: "rgba(244, 114, 182, 0.05)",
              },
            }}
          />
        </div>
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
                {compareResultDialog.isSuccess ? "Success" : "Notice"}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                {compareResultDialog.message}
              </p>
            </div>
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setCompareResultDialog({ open: false, message: "", isSuccess: true })}
                className="w-full px-5 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-all active:scale-95 outline-none focus:ring-4 focus:ring-slate-400/20"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actions Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleActionClose}
        disableScrollLock={true}
        PaperProps={{
          sx: {
            borderRadius: "0.75rem",
            boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
            minWidth: 160,
          },
        }}
      >
        {!isAdmin &&
          ["Close", "Open", "Void", "Re-Open"]
            .filter((action) => {
              if (!selectedRow) return false;
              const status = String(
                selectedRow.status || selectedRow.ticketStatus || selectedRow.Status || ""
              ).toLowerCase();

              if (status.includes("close") || status === "2") {
                return action === "Re-Open";
              }
              if (status.includes("open") || status.includes("new") || status === "1" || status === "0") {
                return action === "Close" || action === "Void";
              }
              if (status.includes("void") || status === "3") {
                return action === "Re-Open" || action === "Open";
              }
              return true; // Fallback if status is unknown
            })
            .map((action) => (
              <MenuItem
                key={action}
                onClick={() => handleStatusUpdate(action)}
                sx={{ fontSize: "12px", fontWeight: 600 }}
              >
                {action}
              </MenuItem>
            ))}
        {isAdmin && (
          <MenuItem
            onClick={handleAuditLog}
            sx={{ fontSize: "12px", fontWeight: 600, color: "primary.main", borderTop: "1px solid", borderColor: "divider" }}
          >
            Audit Log
          </MenuItem>
        )}
      </Menu>
    </div>
  );
}