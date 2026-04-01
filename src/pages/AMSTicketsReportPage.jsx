import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowLeftRight, RotateCcw } from "lucide-react";
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
import ticketsApi from "../services/api/tickets";

import { DataGrid, GridToolbar } from "@mui/x-data-grid";

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Open", value: 0 },
  { label: "Closed", value: 1 },
  { label: "Void", value: 2 },
];

const TICKET_TYPES = [
  { label: "Service Planned", value: "ServicePlanned" },
  { label: "Service Demand", value: "ServiceDemand" },
  { label: "Inquiry", value: "Inquiry" },
  { label: "Complain", value: "Complain" },
];

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
  const [selectedRow, setSelectedRow] = useState(null);

  const handleActionClick = (event, row) => {
    setAnchorEl(event.currentTarget);
    setSelectedRow(row);
  };

  const handleActionClose = () => {
    setAnchorEl(null);
    setSelectedRow(null);
  };

  const handleStatusUpdate = async (action, statusCode) => {
    const row = selectedRow;
    handleActionClose();
    if (!row) return;

    try {
      setLoading(true);
      const ticketId = row.id || row.ticketNo;

      let fullTicket = row;
      try {
        if (ticketId) {
          fullTicket = await ticketsApi.getAMSTicketById(ticketId);
        }
      } catch (e) {
        console.warn(
          "Could not fetch full ticket by id, using row data as fallback.",
          e,
        );
      }

      switch (action) {
        case "Close":
          await ticketsApi.closeAMSTicket(ticketId, fullTicket);
          break;
        case "Open":
          await ticketsApi.isAnyTicketsOpen(fullTicket);
          break;
        case "Void":
          await ticketsApi.voidAMSTicket(ticketId, fullTicket);
          break;
        case "Re-Open":
          await ticketsApi.reOpenAMSTicket(ticketId, fullTicket);
          break;
        default:
          break;
      }

      // Optionally re-fetch the report to update the grid instantly
      handleGetReport(false);
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setLoading(false);
    }
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
          Array.isArray(workCodesData)
            ? workCodesData
            : workCodesData?.items || [],
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
  };

  const handleGetReport = async (asFile = false) => {
    try {
      setLoading(true);
      setFormError("");

      const isAnyFilterEmpty = Object.values(filters).some(
        (val) => val === "" || val === null || val === undefined,
      );
      if (isAnyFilterEmpty) {
        setFormError("Please fill in all search fields before proceeding.");
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
        "AMSTicketSearch.Status":
          filters.status !== "" ? filters.status : undefined,
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

      const params = Object.fromEntries(
        Object.entries(rawParams).filter(
          ([_, v]) => v !== "" && v !== null && v !== undefined,
        ),
      );

      const response = await apiClient.get(
        "/api/app/a-mSTicket/a-mSTicket-reports",
        { params },
      );

      const items =
        response.data?.amsTicketReportDetailList ||
        response.data?.items ||
        response.data ||
        [];
      const dataArray = Array.isArray(items) ? items : [];

      if (asFile) {
        if (dataArray.length === 0) {
          setFormError("No data available to export.");
          setLoading(false);
          return;
        }

        const headers = Object.keys(dataArray[0]);
        const csvRows = dataArray.map((row) => {
          return headers
            .map((header) => {
              const val = row[header];
              if (val === null || val === undefined) return '""';
              return `"${String(val).replace(/"/g, '""')}"`;
            })
            .join(",");
        });

        const csvData = `${headers.join(",")}\n${csvRows.join("\n")}`;
        const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvData], {
          type: "text/csv;charset=utf-8;",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `AMS_Tickets_Report_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
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

      const isAnyFilterEmpty = Object.values(filters).some(
        (val) => val === "" || val === null || val === undefined,
      );
      if (isAnyFilterEmpty) {
        setFormError("Please fill in all search fields before proceeding.");
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

      const rawParams = {
        AMSTicketSearch: {
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
          WorkDoneCodeIds: filters.workDoneCode
            ? [filters.workDoneCode]
            : undefined,
          PerformedByUsers: filters.performed ? [filters.performed] : undefined,
          TicketNumbers: filters.ticketNumber
            ? [Number(filters.ticketNumber)]
            : undefined,
          DateFrom: formatDateStart(filters.dateFrom) || undefined,
          DateTo: formatDateEnd(filters.dateTo) || undefined,
        },
      };

      const payload = {
        ...rawParams.AMSTicketSearch,
      };

      // Clean up undefined/empty string properties from the API payload
      Object.keys(payload).forEach((key) => {
        if (
          payload[key] === "" ||
          payload[key] === null ||
          payload[key] === undefined
        ) {
          delete payload[key];
        }
      });

      const response = await ticketsApi.compareTickets(payload);

      const items = response?.items || response || [];
      const dataArray = Array.isArray(items) ? items : [];

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

  const dynamicColumns =
    reportData.length > 0
      ? Object.keys(reportData[0]).map((key) => ({
          field: key,
          headerName: key.replace(/([A-Z])/g, " $1").trim(), // Add space before capital letters
          flex: 1,
          minWidth: 150,
          renderCell: (params) => {
            const val = params.value;
            if (typeof val === "boolean") return val ? "Yes" : "No";
            if (val === null || val === undefined) return "-";
            return String(val);
          },
        }))
      : [];

  const columnsWithActions = [
    {
      field: "actions",
      headerName: "ACTIONS",
      width: 100,
      renderCell: (params) => (
        <IconButton
          size="small"
          onClick={(e) => handleActionClick(e, params.row)}
        >
          
        </IconButton>
      ),
    },
    ...dynamicColumns,
  ];

  const filterInputClass =
    "px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400 w-full";

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
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
            <span className="text-blue-500 ">AMS Tickets Report</span>
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

            {/* Small Action Buttons in Header */}
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
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-[11px] transition-all active:scale-95 shadow-sm focus:outline-none"
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
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] transition-all active:scale-95 shadow-sm focus:outline-none"
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
              <label className="text-[10px] text-slate-400 ml-1 mb-1">
                CMS Next Ticket No
              </label>
              <input
                type="text"
                placeholder="Enter ticket no..."
                value={filters.cmsNextTicketNo}
                onChange={(e) =>
                  setFilters({ ...filters, cmsNextTicketNo: e.target.value })
                }
                className={filterInputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 ml-1 mb-1">
                Ticket Closed Data From
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  setFilters({ ...filters, dateFrom: e.target.value })
                }
                className={filterInputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 ml-1 mb-1">
                Ticket Closed Data To
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  setFilters({ ...filters, dateTo: e.target.value })
                }
                className={filterInputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 ml-1 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => {
                  const value =
                    e.target.value === "" ? "" : Number(e.target.value);
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 ml-1 mb-1">
                Country
              </label>
              <Autocomplete
                options={countriesList}
                getOptionLabel={(option) => option.name || option || ""}
                value={
                  countriesList.find((c) => (c.id || c) === filters.country) ||
                  null
                }
                onChange={(e, newValue) => {
                  setFilters({
                    ...filters,
                    country: newValue ? newValue.id || newValue : "",
                  });
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "0.5rem",
                    padding: "4px 12px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    backgroundColor: "transparent",
                    "& fieldset": { border: "none" },
                  },
                }}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all w-full text-slate-800 dark:text-slate-200"
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search country..."
                    variant="outlined"
                  />
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 ml-1 mb-1">
                Ticket Type
              </label>
              <select
                value={filters.ticketType}
                onChange={(e) =>
                  setFilters({ ...filters, ticketType: e.target.value })
                }
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
              <label className="text-[10px] text-slate-400 ml-1 mb-1">
                Customer
              </label>
              <Autocomplete
                options={customersList}
                getOptionLabel={(option) =>
                  option.name || option.userName || option.email || option || ""
                }
                value={
                  customersList.find((c) => (c.id || c) === filters.customer) ||
                  null
                }
                onChange={(e, newValue) => {
                  setFilters({
                    ...filters,
                    customer: newValue ? newValue.id || newValue : "",
                  });
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "0.5rem",
                    padding: "4px 12px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    backgroundColor: "transparent",
                    "& fieldset": { border: "none" },
                  },
                }}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all w-full text-slate-800 dark:text-slate-200"
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search customer..."
                    variant="outlined"
                  />
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 ml-1 mb-1">
                Work Done Code
              </label>
              <Autocomplete
                options={workCodesList}
                getOptionLabel={(option) =>
                  option.code ||
                  option.description ||
                  option.name ||
                  option ||
                  ""
                }
                value={
                  workCodesList.find(
                    (w) => (w.id || w) === filters.workDoneCode,
                  ) || null
                }
                onChange={(e, newValue) => {
                  setFilters({
                    ...filters,
                    workDoneCode: newValue ? newValue.id || newValue : "",
                  });
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "0.5rem",
                    padding: "4px 12px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    backgroundColor: "transparent",
                    "& fieldset": { border: "none" },
                  },
                }}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all w-full text-slate-800 dark:text-slate-200"
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search work code..."
                    variant="outlined"
                  />
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 ml-1 mb-1">
                Performed By
              </label>
              <Autocomplete
                options={performedList}
                getOptionLabel={(option) =>
                  option.name || option.userName || option.email || option || ""
                }
                value={
                  performedList.find(
                    (c) => (c.id || c) === filters.performed,
                  ) || null
                }
                onChange={(e, newValue) => {
                  setFilters({
                    ...filters,
                    performed: newValue ? newValue.id || newValue : "",
                  });
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "0.5rem",
                    padding: "4px 12px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    backgroundColor: "transparent",
                    "& fieldset": { border: "none" },
                  },
                }}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all w-full text-slate-800 dark:text-slate-200"
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search user..."
                    variant="outlined"
                  />
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 ml-1 mb-1">
                Ticket number
              </label>
              <input
                type="text"
                placeholder="Ticket no..."
                value={filters.ticketNumber}
                onChange={(e) =>
                  setFilters({ ...filters, ticketNumber: e.target.value })
                }
                className={filterInputClass}
              />
            </div>
          </div>
        </div>

        {/* Data Grid Section */}
        <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 relative">
          <div className="absolute inset-0">
            <DataGrid
              rows={reportData.map((row, index) => ({
                id: row.id || row.ticketNo || index,
                ...row,
              }))}
              columns={columnsWithActions}
              loading={loading}
              disableRowSelectionOnClick
              rowHeight={48}
              columnHeaderHeight={48}
              slots={{
                toolbar: GridToolbar,
                noRowsOverlay: () => (
                  <div className="h-full flex flex-col items-center justify-center p-10 space-y-4 text-slate-400">
                    <p className="text-sm tracking-tighter">No Records</p>
                  </div>
                ),
              }}
              sx={{
                border: "none",
                bgcolor: "inherit",
                color: "inherit",
                "& .MuiDataGrid-columnHeaders": {
                  bgcolor: "rgba(248, 250, 252, 0.05)",
                  borderBottom: "2px solid rgba(255, 255, 255, 0.05)",
                  "& .MuiDataGrid-columnHeaderTitle": {
                    fontWeight: 800,
                    fontSize: "10px",
                    color: "inherit",
                    textTransform: "",
                    letterSpacing: "0.05em",
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      
    </div>
  );
}
