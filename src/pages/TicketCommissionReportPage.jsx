import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RotateCcw, FileText, ArrowLeft } from "lucide-react";
import { Autocomplete, TextField, Checkbox } from "@mui/material";
import ticketCommissionReportApi from "../services/api/ticketCommissionReport";
import usersApi from "../services/api/users";

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Opened", value: 0 },
  { label: "Closed", value: 1 },
  { label: "Void", value: 2 },
];

// ✅ Real labels from backend
const SERVICE_PLANNED_TYPES = [
  { label: "Report", value: "Report" },
  { label: "Rule", value: "Rule" },
  { label: "Installation", value: "Installation" },
  { label: "Configuration", value: "Configuration" },
  { label: "TSB", value: "TSB" },
  { label: "Other", value: "Other" },
];

export default function TicketCommissionReportPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    performedByUsers: [],
    dateFrom: "",
    dateTo: "",
    servicePlannedTypes: [],
    status: "",
  });
  const [usersList, setUsersList] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await usersApi.getUsersList({
          organizationTypes: ["VendorSureze"],
        });
        setUsersList(data?.items || data || []);
      } catch (error) {
        console.error("Failed to fetch users", error);
      }
    };
    fetchUsers();
  }, []);

  const handleClear = () => {
    setFilters({
      performedByUsers: [],
      dateFrom: "",
      dateTo: "",
      servicePlannedTypes: [],
      status: "",
    });
    setReportData(null);
    setError(null);
  };

  const handleGetReport = async () => {
    if (!filters.dateFrom || !filters.dateTo) {
      alert("Please fill in Date From and Date To");
      return;
    }

    setLoading(true);
    setError(null);
    setReportData(null);

    try {
      const formatDateStart = (d) =>
        d.includes("T") ? d : `${d}T00:00:00.000Z`;
      const formatDateEnd = (d) => (d.includes("T") ? d : `${d}T23:59:59.999Z`);

      const params = {
        DateFrom: formatDateStart(filters.dateFrom),
        DateTo: formatDateEnd(filters.dateTo),
        Status: filters.status !== "" ? filters.status : undefined,
        ServicePlannedTypes: filters.servicePlannedTypes.length
          ? filters.servicePlannedTypes
          : undefined,
        PerformedByUsers: filters.performedByUsers.length
          ? filters.performedByUsers
          : undefined,
      };

      console.log("Sending params:", params);
      const data = await ticketCommissionReportApi.getReport(params);
      console.log("Report Data:", data);
      setReportData(data);
    } catch (error) {
      console.error("Failed to get report:", error);
      setError("Failed to generate report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filterInputClass =
    "pl-3 pr-3 py-2.5 text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400 shadow-sm w-full";

  return (
    <div className="h-full flex flex-col overflow-auto animate-in fade-in duration-500 gap-4">
      {/* Filter Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-auto flex flex-col">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <nav className="flex items-center gap-2 text-[10px] text-slate-400 mb-3 ml-1">
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
            <span className="text-blue-500">Ticket Commission Report</span>
          </nav>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <button
                onClick={() => navigate(-1)}
                className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-blue-500 hover:border-blue-500/30 transition-all active:scale-95 shadow-sm"
              >
                <ArrowLeft size={18} />
              </button>
              <h1 className="text-3xl text-slate-800 dark:text-white leading-none">
                Ticket Commission Report
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleClear}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] text-slate-400 hover:text-rose-500 hover:border-rose-500/30 transition-all active:scale-95 shadow-sm"
              >
                <RotateCcw size={14} /> Clear
              </button>
              <button
                onClick={handleGetReport}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 btn-flagship  disabled:opacity-60 text-white rounded-xl text-[10px] transition-all active:scale-95 shadow-md "
              >
                <FileText size={14} />
                {loading ? "Loading..." : "Get Report"}
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-8 py-6 bg-white dark:bg-transparent">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Performed By Users - Multi Select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-slate-400 ml-1">
                Performed By Users
              </label>
              <Autocomplete
                size="small"
                limitTags={1}
                multiple
                options={usersList}
                disableCloseOnSelect
                getOptionLabel={(option) =>
                  option.name || option.userName || ""
                }
                value={usersList.filter((u) =>
                  filters.performedByUsers.includes(u.id),
                )}
                onChange={(e, newValue) =>
                  setFilters({
                    ...filters,
                    performedByUsers: newValue.map((v) => v.id),
                  })
                }
                renderOption={(props, option, { selected }) => {
                  const { key, ...restProps } = props;
                  return (
                    <li
                      key={key}
                      {...restProps}
                      style={{ fontSize: "11px", padding: "4px 8px" }}
                    >
                      <Checkbox
                        style={{ marginRight: 8, padding: 0 }}
                        checked={selected}
                        size="small"
                      />
                      {option.name || option.userName}
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    placeholder="Select Users..."
                    sx={{
                      "& .MuiInputBase-root": {
                        fontSize: "10px",
                        backgroundColor: "white",
                        borderRadius: "0.5rem",
                        padding: "0px 4px !important",
                        minHeight: "28px !important",
                      },
                      "& .MuiInputBase-input": {
                        padding: "2px 0px !important",
                        height: "unset",
                      },
                      ".dark & .MuiInputBase-root": {
                        backgroundColor: "#1e293b",
                        color: "white",
                      },
                    }}
                  />
                )}
                sx={{ width: "100%" }}
              />
            </div>

            {/* Date From */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-slate-400 ml-1">
                Date From*
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  setFilters({ ...filters, dateFrom: e.target.value })
                }
                onClick={(e) => e.target.showPicker && e.target.showPicker()}
                className={filterInputClass}
              />
            </div>

            {/* Date To */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-slate-400 ml-1">Date To*</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  setFilters({ ...filters, dateTo: e.target.value })
                }
                onClick={(e) => e.target.showPicker && e.target.showPicker()}
                className={filterInputClass}
              />
            </div>

            {/* Service Planned Types - Multi Select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-slate-400 ml-1">
                Service Planned Types
              </label>
              <Autocomplete
                size="small"
                limitTags={1}
                multiple
                options={SERVICE_PLANNED_TYPES}
                disableCloseOnSelect
                getOptionLabel={(option) => option.label || ""}
                value={SERVICE_PLANNED_TYPES.filter((t) =>
                  filters.servicePlannedTypes.includes(t.value),
                )}
                onChange={(e, newValue) =>
                  setFilters({
                    ...filters,
                    servicePlannedTypes: newValue.map((v) => v.value),
                  })
                }
                renderOption={(props, option, { selected }) => {
                  const { key, ...restProps } = props;
                  return (
                    <li
                      key={key}
                      {...restProps}
                      style={{ fontSize: "11px", padding: "4px 8px" }}
                    >
                      <Checkbox
                        style={{ marginRight: 8, padding: 0 }}
                        checked={selected}
                        size="small"
                      />
                      {option.label}
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    placeholder="Select Types..."
                    sx={{
                      "& .MuiInputBase-root": {
                        fontSize: "10px",
                        backgroundColor: "white",
                        borderRadius: "0.5rem",
                        padding: "0px 4px !important",
                        minHeight: "28px !important",
                      },
                      "& .MuiInputBase-input": {
                        padding: "2px 0px !important",
                        height: "unset",
                      },
                      ".dark & .MuiInputBase-root": {
                        backgroundColor: "#1e293b",
                        color: "white",
                      },
                    }}
                  />
                )}
                sx={{ width: "100%" }}
              />
            </div>

            {/* Status */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-slate-400 ml-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
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
        </div>
      </div>

    </div>
  );
}




