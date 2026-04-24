import { useState, useEffect, useMemo } from "react";
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

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getSortedRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Open", value: 1 },
  { label: "Closed", value: 2 },
  { label: "Void", value: 3 },
];

const TICKET_TYPES = [
  { label: "Service Planned", value: "ServicePlanned" },
  { label: "Service Demand", value: "ServiceDemand" },
  { label: "Inquiry", value: "Inquiry" },
  { label: "Complain", value: "Complain" },
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
    customer: "",
    workDoneCode: "",
    performed: "",
    ticketNumber: "",
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

  const [selectedRow, setSelectedRow] = useState(null);

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
        const [countriesData, customersData, workCodesData, performedData] =
          await Promise.all([
            countriesApi.getAll().catch(() => ({ items: [] })),
            usersApi.getCustomerList().catch(() => ({ items: [] })),
            workCodesApi.getAll().catch(() => ({ items: [] })),
            usersApi.getUsersList([1, 2, 3, -1]).catch(() => ({ items: [] })),
          ]);

        setCountriesList(countriesData?.items || countriesData || []);
        setCustomersList(customersData?.items || customersData || []);
        setWorkCodesList(
          Array.isArray(workCodesData) ? workCodesData : workCodesData?.items || []
        );
        setPerformedList(performedData?.items || performedData || []);
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
      customer: "",
      workDoneCode: "",
      performed: "",
      ticketNumber: "",
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
        ? Number(filters.cmsNextTicketNo)
        : undefined,
      "AMSTicketSearch.CMSNextTicketNumbers": "",
      "AMSTicketSearch.IssueDiscription": "",
      "AMSTicketSearch.TicketReceivedDate": "",
      "AMSTicketSearch.TicketResolutionVerifiedOn": "",
      "AMSTicketSearch.Status": filters.status !== "" ? filters.status : undefined,
      "AMSTicketSearch.TicketType": filters.ticketType || undefined,
      "AMSTicketSearch.ServicePlannedType": "",
      "AMSTicketSearch.CountryId": filters.country || undefined,
      "AMSTicketSearch.CustomerUserId": filters.customer || undefined,
      "AMSTicketSearch.WorkDoneCodeIds": filters.workDoneCode
        ? [filters.workDoneCode]
        : undefined,
      "AMSTicketSearch.PerformedByUsers": filters.performed
        ? [filters.performed]
        : undefined,
      "AMSTicketSearch.TicketNumbers": filters.ticketNumber
        ? [Number(filters.ticketNumber)]
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

      const items =
        response.data?.amsTicketReportDetailList ||
        response.data?.items ||
        response.data ||
        [];

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

      if (!filters.dateFrom || !filters.dateTo) {
        setFormError("Date From and Date To are required.");
        setLoading(false);
        return;
      }

      const formatDateStart = (d) => {
        if (!d) return undefined;
        return d.includes("T") ? d : `${d}T00:00:00.000Z`;
      };
      const formatDateEnd = (d) => {
        if (!d) return undefined;
        return d.includes("T") ? d : `${d}T23:59:59.999Z`;
      };

      const payload = {
        UserId: "",
        SiteName: "",
        SiteOCN: "",
        TicketIncomingChannel: "",
        TicketForwardedBy: "",
        CMSNextTicketNo: filters.cmsNextTicketNo
          ? Number(filters.cmsNextTicketNo)
          : undefined,
        Status: filters.status !== "" ? filters.status : undefined,
        TicketType: filters.ticketType || undefined,
        CountryId: filters.country || undefined,
        CustomerUserId: filters.customer || undefined,
        WorkDoneCodeIds: filters.workDoneCode ? [filters.workDoneCode] : undefined,
        PerformedByUsers: filters.performed ? [filters.performed] : undefined,
        TicketNumbers: filters.ticketNumber
          ? [Number(filters.ticketNumber)]
          : undefined,
        DateFrom: formatDateStart(filters.dateFrom) || undefined,
        DateTo: formatDateEnd(filters.dateTo) || undefined,
      };

      // Remove empty/null/undefined keys
      Object.keys(payload).forEach((key) => {
        if (payload[key] === "" || payload[key] === null || payload[key] === undefined) {
          delete payload[key];
        }
      });

      const response = await amsTicketApi.compareTickets(payload);

      const items = response?.items || response || [];

      // ✅ Strip nested objects (settings, etc.) from every row
      const dataArray = Array.isArray(items)
        ? items.map(sanitizeRow)
        : [];

      setReportData(dataArray);

      if (dataArray.length === 0) {
        setFormError("No comparison data returned.");
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

  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo(() => {
    if (reportData.length === 0) return [];

    const baseColumns = Object.keys(reportData[0])
      // ✅ Extra safety: skip any remaining object/array fields
      .filter((key) => {
        const val = reportData[0][key];
        if (val === null || val === undefined) return true;
        return typeof val !== "object" && !Array.isArray(val);
      })
      .map((key) => ({
        accessorKey: key,
        header: key.replace(/([A-Z])/g, " $1").trim().toUpperCase(),
        cell: (info) => {
          const val = info.getValue();
          if (typeof val === "boolean") return val ? "Yes" : "No";
          if (val === null || val === undefined) return "-";
          return String(val);
        },
      }));

    return [
      {
        id: "actions",
        header: "ACTIONS",
        cell: (info) => (
          <div className="flex justify-center">
            <IconButton
              size="small"
              onClick={(e) => handleActionClick(e, info.row.original)}
              className="hover:bg-pink-50 text-slate-400 hover:text-pink-600 transition-colors"
            >
              <MoreVertical size={14} />
            </IconButton>
          </div>
        ),
      },
      ...baseColumns,
    ];
  }, [reportData]);

  const table = useReactTable({
    data: reportData,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const filterInputClass =
    "px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400 w-full";

  return (
    <div className="h-full flex flex-col overflow-auto animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-auto flex flex-col">
        {/* Header Section */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
          <nav className="flex items-center gap-2 text-[10px] text-slate-400 mb-3">
            <span
              onClick={() => navigate("/")}
              className="hover:text-blue-500 cursor-pointer transition-colors"
            >
              Home
            </span>
            <span>/</span>
            <span>Management</span>
            <span>/</span>
            <span>Reports</span>
            <span>/</span>
            <span className="text-blue-500">AMS Tickets Report</span>
          </nav>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-blue-500 hover:border-blue-500/30 transition-all active:scale-95 shadow-sm"
              >
                <ArrowLeft size={16} strokeWidth={2.5} />
              </button>
              <div>
                <h1 className="text-2xl text-slate-800 dark:text-white leading-none">
                  AMS Tickets Report
                </h1>
              </div>
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
        <div className="px-6 py-4 bg-white dark:bg-transparent space-y-4">
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
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 ml-1 mb-1 font-bold uppercase tracking-wider">
                CMS Next Ticket No
              </label>
              <input
                type="text"
                placeholder="Enter ticket no..."
                value={filters.cmsNextTicketNo}
                onChange={(e) => setFilters({ ...filters, cmsNextTicketNo: e.target.value })}
                className={filterInputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 ml-1 mb-1 font-bold uppercase tracking-wider">
                Date From
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className={filterInputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 ml-1 mb-1 font-bold uppercase tracking-wider">
                Date To
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className={filterInputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 ml-1 mb-1 font-bold uppercase tracking-wider">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => {
                  const value = e.target.value === "" ? "" : Number(e.target.value);
                  setFilters({ ...filters, status: value });
                }}
                className={filterInputClass}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.label} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                onChange={(e) => setFilters({ ...filters, ticketType: e.target.value })}
                className={filterInputClass}
              >
                <option value="">Choose an option</option>
                {TICKET_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

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
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 ml-1 mb-1 font-bold uppercase tracking-wider">
                Work Done Code
              </label>
              <Autocomplete
                options={workCodesList}
                getOptionLabel={(option) =>
                  option.code || option.description || option.name || option || ""
                }
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
                Ticket Number
              </label>
              <input
                type="text"
                placeholder="Ticket no..."
                value={filters.ticketNumber}
                onChange={(e) => setFilters({ ...filters, ticketNumber: e.target.value })}
                className={filterInputClass}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col relative overflow-hidden">
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-md">
                  {table.getHeaderGroups().map((headerGroup) =>
                    headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-colors whitespace-nowrap"
                      >
                        <div className="flex items-center gap-2">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{ asc: " 🔼", desc: " 🔽" }[header.column.getIsSorted()] || null}
                        </div>
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {table.getRowModel().rows.length > 0 ? (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="group hover:bg-pink-50/30 dark:hover:bg-pink-900/10 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-4 py-3 text-[11px] text-slate-600 dark:text-slate-300 border-b border-transparent group-hover:border-pink-100/50 dark:group-hover:border-pink-800/30 whitespace-nowrap"
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-full">
                          <RotateCcw className="text-slate-300 animate-spin-slow" size={32} />
                        </div>
                        <p className="text-slate-400 text-xs font-medium tracking-tight">
                          {loading
                            ? "Fetching records..."
                            : "No records found matching your filters"}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Actions Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleActionClose}
        PaperProps={{
          sx: {
            borderRadius: "0.75rem",
            boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
            minWidth: 160,
          },
        }}
      >
        {!isAdmin && ["Close", "Open", "Void", "Re-Open"].map((action) => (
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