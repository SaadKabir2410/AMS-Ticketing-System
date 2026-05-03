import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RotateCcw, ArrowLeft, Search } from "lucide-react";
import apiClient from "../services/apiClient";
import * as XLSX from 'xlsx';

export default function UserYearlyReportPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ year: "" });
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const handleClear = () => {
    setFormError("");
    setFilters({ year: "" });
  };

  const handleGetReport = async () => {
    try {
      setLoading(true);
      setFormError("");

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

      if (data.length === 0) {
        setFormError(`No data available for the year ${filters.year}.`);
        return;
      }

      // Generate Excel
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Yearly Report");
      XLSX.writeFile(wb, `User_Yearly_Report_${filters.year}.xlsx`);

    } catch (error) {
      setFormError(error?.response?.data?.error?.message || "Failed to generate report.");
    } finally {
      setLoading(false);
    }
  };

  const filterInputClass =
    "px-3 py-2 text-xs bg-white dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/50 rounded-xl outline-none focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500 transition-all placeholder:text-slate-400 w-full font-semibold text-slate-700 dark:text-slate-200 shadow-sm";

  return (
    <div className="min-h-full w-full bg-[#f8fafc] dark:bg-slate-950 p-1 pb-[10px] flex flex-col relative overflow-visible font-[Arial]">
      <style>{`
        *::-webkit-scrollbar { display: none !important; }
        * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
      `}</style>

      <div className="flex-1 w-full bg-white dark:bg-[#161920] border border-slate-200 dark:border-slate-800/50 shadow-sm flex flex-col rounded-3xl">
        {/* Header */}
        <div className="flex flex-col gap-6 py-8 px-4 md:px-8 transition-colors border-b border-slate-100 dark:border-slate-800/50">
          <nav className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-600 mb-1">
            <span onClick={() => navigate("/")} className="hover:text-pink-500 cursor-pointer transition-colors">Home</span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span>Management</span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span>Reports</span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-pink-500">User Yearly Report</span>
          </nav>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-600 hover:text-pink-600 transition-all border border-slate-200/60 dark:border-slate-700/50 shadow-sm"
              >
                <ArrowLeft size={20} strokeWidth={2.5} />
              </button>
              <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                User Yearly Report
              </h1>
            </div>

            <div className="flex items-center gap-1">
              {filters.year && (
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
                {loading ? "Generating..." : "Excel Report"}
              </button>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="px-4 md:px-8 py-5 flex items-end gap-4">
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
      </div>
    </div>
  );
}