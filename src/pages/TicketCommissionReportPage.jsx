import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RotateCcw, FileText } from "lucide-react";

const STATUS_OPTIONS = ["All", "Open", "Closed", "Void"];
const SERVICE_PLANNED_TYPES = [
  "AMC",
  "Service Call",
  "Installation",
  "Repair",
  "Others",
];

export default function TicketCommissionReportPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    servicePlannedType: "",
    status: "All",
  });

  const handleClear = () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      servicePlannedType: "",
      status: "All",
    });
  };

  const handleGetReport = () => {
    if (!filters.dateFrom || !filters.dateTo || !filters.servicePlannedType) {
      alert(
        "Please fill in all required fields (Dates and Service Planned Type)",
      );
      return;
    }
    alert("Generating Ticket Commission Report...");
  };

  const filterInputClass =
    "pl-3 pr-3 py-2.5 text-[11px] bg-white dark:bg-[#242938] border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400 shadow-sm w-full";

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
      <div className="bg-white dark:bg-[#1e2436] rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden flex flex-col">
        {/* Header Section */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/2">
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
            <span className="text-blue-500 ">Ticket Commission Report</span>
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
                <h1 className="text-3xl text-slate-800 dark:text-white leading-none">
                  Ticket Commission Report
                </h1>
              </div>
            </div>

            {/* Small Action Buttons in Header */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleClear}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#242938] border border-slate-200 dark:border-white/10 rounded-xl text-[10px] text-slate-400 hover:text-rose-500 hover:border-rose-500/30 transition-all active:scale-95 shadow-sm"
              >
                <RotateCcw size={14} />
                Clear
              </button>
              <button
                onClick={handleGetReport}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] transition-all active:scale-95 shadow-md shadow-blue-500/20"
              >
                <FileText size={14} />
                Get Report
              </button>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="px-8 py-6 bg-white dark:bg-transparent">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Ticket Closed Date From */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-slate-400 ml-1 ">
                Date From*
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

            {/* Ticket Closed Date To */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-slate-400 ml-1 ">
                Date To*
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

            {/* Service Planned Type */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-slate-400 ml-1 ">
                Planned Type*
              </label>
              <select
                value={filters.servicePlannedType}
                onChange={(e) =>
                  setFilters({ ...filters, servicePlannedType: e.target.value })
                }
                className={filterInputClass}
              >
                <option value="">Choose an option</option>
                {SERVICE_PLANNED_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-slate-400 ml-1 ">Status</label>
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
        </div>
      </div>
    </div>
  );
}
