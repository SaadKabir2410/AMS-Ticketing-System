import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RotateCcw, FileText, ArrowLeft } from "lucide-react";
import usersApi from "../services/api/users";
import afterWorkingHoursReportApi from "../services/api/afterWorkingHoursReport";

const STATUS_OPTIONS = ["All", "Open", "Closed", "Void"];
const STATUS_MAP = {
  Open: "Opened",
  Closed: "Closed",
  Void: "Void",
};

export default function AfterWorkingHoursReportPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    user: "",
    dateFrom: "",
    dateTo: "",
    status: "All",
  });
  const [usersList, setUsersList] = useState([]);

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
      user: "",
      dateFrom: "",
      dateTo: "",
      status: "All",
    });
  };

  const handleGetReport = async () => {
    try {
      const formatDateStart = (d) => {
        if (!d) return undefined;
        return d.includes("T") ? d : `${d}T00:00:00.000Z`;
      };
      const formatDateEnd = (d) => {
        if (!d) return undefined;
        return d.includes("T") ? d : `${d}T23:59:59.999Z`;
      };

      const rawParams = {
        UserId: filters.user || undefined,
        DateFrom: formatDateStart(filters.dateFrom),
        DateTo: formatDateEnd(filters.dateTo),
        Status:
          filters.status !== "All" && filters.status !== ""
            ? STATUS_MAP[filters.status]
            : undefined,
      };
      const params = Object.fromEntries(
        Object.entries(rawParams).filter(
          ([_, v]) => v !== "" && v !== null && v !== undefined,
        ),
      );

      const data = await afterWorkingHoursReportApi.getReport(params);
      console.log("Report Data:", data);
    } catch (error) {
      console.error("Failed to get report:", error);
    }
  };

  const filterInputClass =
    "pl-3 pr-3 py-2.5 text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400 shadow-sm w-full";

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden flex flex-col">
        {/* Header Section */}
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
            <span className="text-blue-500 ">After Working Hours Report</span>
          </nav>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <button
                onClick={() => navigate(-1)}
                className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-blue-500 hover:border-blue-500/30 transition-all active:scale-95 shadow-sm"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-3xl text-slate-800 dark:text-white leading-none">
                  After Working Hours Report
                </h1>
              </div>
            </div>

            {/* Small Action Buttons in Header */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleClear}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] text-slate-400 hover:text-rose-500 hover:border-rose-500/30 transition-all active:scale-95 shadow-sm"
              >
                <RotateCcw size={14} />
                Clear
              </button>
              <button
                onClick={handleGetReport}
                className="flex items-center gap-2 px-5 py-2.5 btn-flagship  text-white rounded-xl text-[10px] transition-all active:scale-95 shadow-md "
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
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-slate-400 ml-1 ">User</label>
              <select
                value={filters.user}
                onChange={(e) =>
                  setFilters({ ...filters, user: e.target.value })
                }
                className={filterInputClass}
              >
                <option value="">choose an option</option>
                {usersList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.userName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-slate-400 ml-1 ">
                Ticket Closed Date From
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

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-slate-400 ml-1 ">
                Ticket Closed Date To
              </label>
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


