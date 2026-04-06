import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RotateCcw, ArrowLeft, Search } from "lucide-react";
import apiClient from "../services/apiClient";

export default function UserYearlyReportPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ year: "" });
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [reportData, setReportData] = useState(null);

  const handleClear = () => {
    setFormError("");
    setFilters({ year: "" });
    setReportData(null);
  };

  const handleGetReport = async () => {
    try {
      setLoading(true);
      setFormError("");
      setReportData(null);

      if (!filters.year) {
        setFormError("Please select a Year before proceeding.");
        return;
      }

      const response = await apiClient.get(
        "/api/app/a-mSTicket/yearly-generation-each-user",
        { params: { year: filters.year } }
      );

      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.items || response.data?.data || [];

      setReportData(data);

    } catch (error) {
      setFormError(error?.response?.data?.error?.message || "Failed to generate report.");
    } finally {
      setLoading(false);
    }
  };

  const filterInputClass =
    "px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-4 focus:ring-[#ec4899]/10 focus:border-[#ec4899] transition-all placeholder:text-slate-400 w-full font-semibold text-slate-700 dark:text-slate-200";

  const reportColumns = reportData?.length > 0 ? Object.keys(reportData[0]) : [];

  return (
    <div className="animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <nav className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-slate-400 mb-3">
            <span onClick={() => navigate("/")} className="hover:text-[#ec4899] cursor-pointer transition-colors">Home</span>
            <span>/</span>
            <span>Management</span>
            <span>/</span>
            <span>Reports</span>
            <span>/</span>
            <span className="text-[#ec4899]">User Yearly Report</span>
          </nav>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-[#ec4899] hover:border-[#ec4899]/30 transition-all active:scale-95"
              >
                <ArrowLeft size={16} strokeWidth={2.5} />
              </button>
              <h1 className="text-2xl font-black text-slate-800 dark:text-white leading-none uppercase tracking-tighter">
                User Yearly Report
              </h1>
            </div>

            <div className="flex items-center gap-1">
              {(filters.year || reportData !== null) && (
                <button
                  onClick={handleClear}
                  className="btn-flagship !border-rose-500/40 !text-rose-500 hover:!border-rose-500 hover:!bg-rose-50/10"
                >
                  <RotateCcw size={12} />
                  Clear
                </button>
              )}
              <button
                onClick={handleGetReport}
                disabled={loading}
                className="btn-flagship"
              >
                {loading ? "Generating..." : "Get Report"}
              </button>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="px-6 py-5 flex items-end gap-4">
          <div className="flex flex-col gap-2 w-[200px]">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Year</label>
            <select
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
              className={filterInputClass}
            >
              <option value="">Select Year</option>
              {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() + 2 - i).map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {formError && (
            <div className="flex-1 p-3 bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-xl text-xs flex items-center gap-3 font-semibold">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              {formError}
            </div>
          )}
        </div>

        {/* Results — only renders after Get Report is clicked */}
        {reportData !== null && (
          <div className="border-t border-slate-100 dark:border-slate-800 overflow-auto no-scrollbar max-h-[60vh]">
            {reportData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                <div className="w-16 h-16 rounded-[24px] bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-700 border border-slate-100 dark:border-slate-800">
                  <Search size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
                    No Tickets Found
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    No data available for the year {filters.year}.
                  </p>
                </div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr className="sticky top-0 z-10">
                    {reportColumns.map((col) => (
                      <th
                        key={col}
                        className="bg-slate-50 dark:bg-[#1e293b] p-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 whitespace-nowrap"
                      >
                        {col.replace(/([A-Z])/g, " $1").trim()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, i) => (
                    <tr
                      key={i}
                      className="hover:bg-blue-50/30 dark:hover:bg-blue-500/5 border-b border-slate-50 dark:border-white/[0.02] last:border-0 transition-colors"
                    >
                      {reportColumns.map((col) => (
                        <td
                          key={col}
                          className="p-4 text-[11px] font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap border-r border-slate-50 dark:border-white/[0.02] last:border-r-0"
                        >
                          {typeof row[col] === "object"
                            ? <pre className="text-[10px] opacity-60 font-mono">{JSON.stringify(row[col])}</pre>
                            : String(row[col] ?? "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none !important; }
        .no-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }
      `}</style>
    </div>
  );
}