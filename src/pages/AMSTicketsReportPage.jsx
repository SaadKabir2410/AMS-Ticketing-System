import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RotateCcw, FileText, ArrowLeftRight } from "lucide-react";
import { Autocomplete, TextField } from "@mui/material";
import apiClient from "../services/apiClient";
import countriesApi from "../services/api/countries";
import usersApi from "../services/api/users";
import workCodesApi from "../services/api/workCodes";
import ticketsApi from "../services/api/tickets";
import { Loader2 } from "lucide-react";

const STATUS_OPTIONS = ["Closed", "All", "Open", "Void"];
const TICKET_TYPES = [
  "service planed",
  "service demand",
  "inquiry",
  "complain",
];

export default function AMSTicketsReportPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    cmsNextTicketNo: "",
    dateFrom: "",
    dateTo: "",
    status: "All",
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

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [countriesData, customersData, workCodesData, performedData] =
          await Promise.all([
            countriesApi.getAll().catch(() => ({ items: [] })),
            usersApi
              .getAll({ isCustomer: true, perPage: 1000 })
              .catch(() => ({ items: [] })),
            workCodesApi.getAll().catch(() => ({ items: [] })),
            usersApi.getAll({ perPage: 1000 }).catch(() => ({ items: [] })),
          ]);

        setCountriesList(countriesData?.items || countriesData || []);
        setCustomersList(customersData?.items || customersData || []);
        setWorkCodesList(workCodesData?.items || workCodesData || []);
        setPerformedList(performedData?.items || performedData || []);
      } catch (error) {
        console.error("Failed to load dropdown data:", error);
      }
    };
    fetchDropdownData();
  }, []);

  const handleClear = () => {
    setFilters({
      cmsNextTicketNo: "",
      dateFrom: "",
      dateTo: "",
      status: "All",
      country: "",
      ticketType: "",
      customer: "",
      workDoneCode: "",
      performed: "",
      ticketNumber: "",
    });
  };

  const handleGetReport = async () => {
    try {
      setLoading(true);
      const rawParams = {
        UserId: "",
        SiteName: "",
        SiteOCN: "",
        TicketIncomingChannel: "",
        TicketForwardedBy: "",
        CMSNextTicketNo: filters.cmsNextTicketNo || "",
        CMSNextTicketNumbers: "",
        IssueDiscription: "",
        TicketReceivedDate: "",
        CMSTicketClosedOn: "",
        TicketResolutionVerifiedOn: "",
        Status: filters.status !== "All" ? filters.status : "",
        TicketType: filters.ticketType || "",
        ServicePlannedType: "",
        CountryId: filters.country || "",
        CustomerUserId: filters.customer || "",
        WorkDoneCodeIds: filters.workDoneCode || "",
        PerformedByUsers: filters.performed || "",
        TicketNumbers: filters.ticketNumber || "",
        CompressedTicketNumbers: "",
        DateFrom: filters.dateFrom || "",
        DateTo: filters.dateTo || "",
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

      const items = response.data?.items || response.data || [];
      // Ensure we always have an array even if the API returns an object format
      setReportData(Array.isArray(items) ? items : []);

      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error("Failed to get report:", error);
      alert("Failed to retrieve report. See console for details.");
    }
  };

  const handleCompareTicket = () => {
    alert("Comparing Tickets...");
  };


  const filterInputClass =
    "px-4 py-3 text-sm font-bold bg-white dark:bg-[#242938] border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400 shadow-sm w-full";

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
      <div className="bg-white dark:bg-[#1e2436] rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden flex flex-col">
        {/* Header Section */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/2">
          <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">
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
            <span className="text-blue-500 font-black">AMS Tickets Report</span>
          </nav>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <button
                onClick={() => navigate(-1)}
                className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-400 hover:text-blue-500 hover:border-blue-500/30 transition-all active:scale-95 shadow-sm"
              >
                <ArrowLeft size={22} />
              </button>
              <div>
                <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight leading-none">
                  AMS Tickets Report
                </h1>
              </div>
            </div>

            {/* Small Action Buttons in Header */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleClear}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#242938] border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-rose-500 hover:border-rose-500/30 transition-all active:scale-95 shadow-sm"
              >
                <RotateCcw size={14} />
                Clear
              </button>
              <button
                onClick={handleGetReport}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-blue-500/20"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                {loading ? "Loading..." : "Get Report"}
              </button>

              <button
                onClick={handleCompareTicket}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-emerald-500/20"
              >
                <ArrowLeftRight size={14} />
                Compare Ticket
              </button>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="px-8 py-6 bg-white dark:bg-transparent space-y-6">
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black tracking-widest text-slate-400 ml-1 uppercase mb-1">
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
              <label className="text-[10px] font-black tracking-widest text-slate-400 ml-1 uppercase mb-1">
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
              <label className="text-[10px] font-black tracking-widest text-slate-400 ml-1 uppercase mb-1">
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
              <label className="text-[10px] font-black tracking-widest text-slate-400 ml-1 uppercase mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
                className={filterInputClass}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black tracking-widest text-slate-400 ml-1 uppercase mb-1">
                Country
              </label>
              <Autocomplete
                options={countriesList}
                getOptionLabel={(option) => option.name || option || ""}
                value={
                  countriesList.find(
                    (c) => (c.name || c) === filters.country,
                  ) || null
                }
                onChange={(e, newValue) => {
                  setFilters({
                    ...filters,
                    country: newValue ? newValue.name || newValue : "",
                  });
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "0.75rem",
                    padding: "6px 14px",
                    fontSize: "14px",
                    fontWeight: "bold",
                    backgroundColor: "transparent",
                    "& fieldset": { border: "none" },
                  },
                }}
                className="bg-white dark:bg-[#242938] border border-slate-200 dark:border-white/10 rounded-xl outline-none focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all shadow-sm w-full text-slate-800 dark:text-slate-200"
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
              <label className="text-[10px] font-black tracking-widest text-slate-400 ml-1 uppercase mb-1">
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
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black tracking-widest text-slate-400 ml-1 uppercase mb-1">
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
                    borderRadius: "0.75rem",
                    padding: "6px 14px",
                    fontSize: "14px",
                    fontWeight: "bold",
                    backgroundColor: "transparent",
                    "& fieldset": { border: "none" },
                  },
                }}
                className="bg-white dark:bg-[#242938] border border-slate-200 dark:border-white/10 rounded-xl outline-none focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all shadow-sm w-full text-slate-800 dark:text-slate-200"
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
              <label className="text-[10px] font-black tracking-widest text-slate-400 ml-1 uppercase mb-1">
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
                    (w) => (w.id || w.code || w) === filters.workDoneCode,
                  ) || null
                }
                onChange={(e, newValue) => {
                  setFilters({
                    ...filters,
                    workDoneCode: newValue
                      ? newValue.id || newValue.code || newValue
                      : "",
                  });
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "0.75rem",
                    padding: "6px 14px",
                    fontSize: "14px",
                    fontWeight: "bold",
                    backgroundColor: "transparent",
                    "& fieldset": { border: "none" },
                  },
                }}
                className="bg-white dark:bg-[#242938] border border-slate-200 dark:border-white/10 rounded-xl outline-none focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all shadow-sm w-full text-slate-800 dark:text-slate-200"
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
              <label className="text-[10px] font-black tracking-widest text-slate-400 ml-1 uppercase mb-1">
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
                    borderRadius: "0.75rem",
                    padding: "6px 14px",
                    fontSize: "14px",
                    fontWeight: "bold",
                    backgroundColor: "transparent",
                    "& fieldset": { border: "none" },
                  },
                }}
                className="bg-white dark:bg-[#242938] border border-slate-200 dark:border-white/10 rounded-xl outline-none focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all shadow-sm w-full text-slate-800 dark:text-slate-200"
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
              <label className="text-[10px] font-black tracking-widest text-slate-400 ml-1 uppercase mb-1">
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
      </div>

    </div>
  );
}
