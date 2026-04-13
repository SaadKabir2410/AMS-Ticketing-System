import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getSortedRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import apiClient from "../services/apiClient";
import PremiumErrorAlert from "../component/common/PremiumErrorAlert";

export default function GeneralReportPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    year: "",
  });

  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const handleClear = () => {
    setFormError("");
    setFilters({
      year: "",
    });
    setReportData([]);
  };

  const handleGetReport = async () => {
    try {
      setLoading(true);
      setFormError("");

      if (!filters.year) {
        setFormError("Please select a Year before proceeding.");
        setLoading(false);
        return;
      }

      console.log(`[General Report] Fetching data for year: ${filters.year}...`);

      const response = await apiClient.get("/api/app/report/general-report", {
        params: { year: Number(filters.year) },
      });

      console.log("[General Report] API Response:", response.data);

      const items = response.data || [];
      const dataArray = Array.isArray(items) ? items : [];

      if (dataArray.length === 0) {
        setFormError("No data available for the selected year.");
        setReportData([]);
        setLoading(false);
        return;
      }

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

  const highlightText = (text, highlight) => {
    if (!highlight.trim()) {
      return text;
    }
    // Escape special regex characters
    const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = String(text).split(new RegExp(`(${escapedHighlight})`, "gi"));
    return (
      <span className="flex flex-wrap gap-0">
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={i} className="bg-pink-100 text-pink-700 px-0.5 rounded-sm">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </span>
    );
  };

  const handleExportExcel = async () => {
    if (reportData.length === 0) return;

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("General Report");

      // Get headers from data keys
      const headers = Object.keys(reportData[0]);

      // Define columns
      worksheet.columns = headers.map(header => ({
        header: header.toUpperCase().replace(/_/g, " "),
        key: header,
        width: 20
      }));

      // Add rows
      worksheet.addRows(reportData);

      // Style header row
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' } // Indigo-600
      };

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      saveAs(blob, `General_Report_${filters.year}_${new Date().getTime()}.xlsx`);
    } catch (error) {
      console.error("Export failed:", error);
      setFormError("Failed to export Excel file.");
    }
  };

  // TanStack Table setup
  const columns = useMemo(() => {
    if (reportData.length === 0) return [];

    return Object.keys(reportData[0]).map((key) => ({
      accessorKey: key,
      header: key.toUpperCase().replace(/_/g, " "),
      cell: (info) => {
        const val = info.getValue();
        if (typeof val === "boolean") return val ? "Yes" : "No";
        if (val === null || val === undefined) return "—";
        return highlightText(String(val), globalFilter);
      },
    }));
  }, [reportData, globalFilter]);

  const table = useReactTable({
    data: reportData,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const filterInputClass =
    "px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400 w-full";

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-[#0b0f19] overflow-hidden selection:bg-pink-500/20">
      {/* Top Professional Header */}
      <header className="shrink-0 px-6 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 z-30">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="group p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:text-pink-500 hover:bg-white dark:hover:bg-slate-750 transition-all active:scale-95 shadow-sm"
            >
              Back
            </button>
            <div>
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-0.5">
                <span onClick={() => navigate("/")} className="hover:text-pink-500 cursor-pointer transition-colors">Home</span>
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <span className="text-pink-500/80">Management Reports</span>
              </div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                General Report
                {loading && <span className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></span>}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClear}
              className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:border-rose-500/30 transition-all active:scale-95 shadow-sm"
            >
              Reset Filters
            </button>

            {reportData.length > 0 && (
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-bold transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
              >
                Export Excel
              </button>
            )}

            <button
              onClick={handleGetReport}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-1.5 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white rounded-lg text-[11px] font-black transition-all active:scale-95 shadow-lg shadow-pink-500/25"
            >
              {loading ? "Processing..." : "Get Reports"}
            </button>
          </div>
        </div>
      </header>

      {/* Modern Filter Sub-header */}
      <section className="shrink-0 px-6 py-3 bg-slate-50/50 dark:bg-[#0b0f19] border-b border-slate-200 dark:border-slate-800/50">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-4 w-full lg:w-auto">
            <div className="w-full sm:w-48">
              <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">
                Year
              </label>
              <div className="relative group">
                <select
                  value={filters.year}
                  onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500 transition-all appearance-none cursor-pointer shadow-sm group-hover:border-pink-500/50"
                >
                  <option value="">Choose Year</option>
                  {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() + 1 - i).map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>

            {reportData.length > 0 && (
              <div className="w-full sm:w-64 animate-in fade-in slide-in-from-left-4 duration-500">
                <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">
                  Data Filtering
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    value={globalFilter ?? ""}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    placeholder="Search results..."
                    className="w-full px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500 transition-all shadow-sm group-hover:border-pink-500/50"
                  />
                </div>
              </div>
            )}
          </div>

          {reportData.length > 0 && (
            <div className="hidden lg:flex items-center gap-6 text-slate-400 font-bold uppercase tracking-widest text-[9px]">
              <div className="flex flex-col items-end">
                <span className="text-slate-300 dark:text-slate-600">Total Entries</span>
                <span className="text-xs text-slate-900 dark:text-white tabular-nums">{reportData.length}</span>
              </div>
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-800"></div>
              <div className="flex flex-col items-end">
                <span className="text-slate-300 dark:text-slate-600">Visible Rows</span>
                <span className="text-xs text-pink-500 tabular-nums">{table.getRowModel().rows.length}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Main Content Area - Full Screen Layout */}
      <main className="flex-1 overflow-hidden flex flex-col relative px-6 py-4">
        {formError && (
          <div className="absolute top-4 left-6 right-6 z-40 max-w-[800px] mx-auto lg:left-1/2 lg:-translate-x-1/2 w-full px-6">
            <PremiumErrorAlert
              error={formError}
              onClose={() => setFormError("")}
            />
          </div>
        )}

        {reportData.length > 0 ? (
          <div className="flex-1 flex flex-col max-w-[1600px] mx-auto w-full">
            <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden flex flex-col">
              <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left text-xs border-separate border-spacing-0">
                  <thead className="sticky top-0 z-20">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="px-4 py-2.5 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] bg-slate-50/80 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            <div className="flex items-center gap-1">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {header.column.getIsSorted() ? (
                                <span className={header.column.getIsSorted() === "asc" ? "text-pink-500" : "text-rose-500"}>
                                  {header.column.getIsSorted() === "asc" ? "↑" : "↓"}
                                </span>
                              ) : null}
                            </div>
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {table.getRowModel().rows.map((row, idx) => (
                      <tr
                        key={row.id}
                        className="hover:bg-pink-50/40 dark:hover:bg-pink-600/5 transition-all text-slate-600 dark:text-slate-400 group animate-in fade-in fill-mode-both"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="px-4 py-2 font-semibold whitespace-nowrap"
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 max-w-sm mx-auto">
            <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2 uppercase tracking-tighter">No active report</h2>
            <p className="text-slate-400 text-[11px] font-medium leading-relaxed">
              Generate a report by choosing a specific year above.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}


