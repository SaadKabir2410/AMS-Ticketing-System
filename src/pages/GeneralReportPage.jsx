import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RotateCcw, FileText } from "lucide-react";
import { Loader2 } from "lucide-react";
import apiClient from "../services/apiClient";

export default function GeneralReportPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    year: "",
  });

  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const handleClear = () => {
    setFormError("");
    setFilters({
      year: "",
    });
  };

  const handleGetReport = async () => {
    try {
      setLoading(true);
      setFormError("");

      if (!filters.year) {
        setFormError("Please enter a Year before proceeding.");
        setLoading(false);
        return;
      }

      console.log(
        `[General Report] Fetching data for year: ${filters.year}...`,
      );

      const response = await apiClient.get("/api/app/report/general-report", {
        params: { year: Number(filters.year) },
      });

      console.log("[General Report] API Response:", response.data);

      const items = response.data || [];
      const dataArray = Array.isArray(items) ? items : [];

      if (dataArray.length === 0) {
        console.warn("[General Report] No data found for the selected year.");
        setFormError("No data available to export for the selected year.");
        setLoading(false);
        return;
      }

      // Automatically download as CSV
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
      link.setAttribute("download", `General_Report_${filters.year}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setReportData(dataArray);
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

  const filterInputClass =
    "px-3 py-2 text-xs bg-white dark:bg-[#242938] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400 w-full";

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
      <div className="bg-white dark:bg-[#1e2436] rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col">
        {/* Header Section */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/2 shrink-0">
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
            <span className="text-blue-500 ">General Report</span>
          </nav>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-400 hover:text-blue-500 hover:border-blue-500/30 transition-all active:scale-95 "
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-2xl text-slate-800 dark:text-white leading-none">
                  General Report
                </h1>
              </div>
            </div>

            {/* Small Action Buttons in Header */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-[#242938] border border-slate-200 dark:border-white/10 rounded-lg text-[11px] text-slate-400 hover:text-rose-500 hover:border-rose-500/30 transition-all active:scale-95 focus:outline-none"
              >
                <RotateCcw size={14} />
                Clear
              </button>
              <button
                onClick={handleGetReport}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-[11px] transition-all active:scale-95 focus:outline-none"
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <FileText size={14} />
                )}
                {loading ? "Loading..." : "Get Report"}
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

          <div className="flex flex-col gap-1.5 w-full max-w-xs">
            <label className="text-[10px] text-slate-400 ml-1 mb-1">Year</label>
            <select
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
              className={filterInputClass}
            >
              <option value="">Select Year</option>
              {Array.from(
                { length: 15 },
                (_, i) => new Date().getFullYear() + 2 - i,
              ).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
