import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";
import "flatpickr/dist/themes/dark.css";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import usersApi from "../services/api/users";
import afterWorkingHoursReportApi from "../services/api/afterWorkingHoursReport";
import PremiumErrorAlert from "../component/common/PremiumErrorAlert";
import { useAuth } from "../context/AuthContextHook";

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Open", value: 0 },
  { label: "Closed", value: 2 },
  { label: "Void", value: 3 },
]

export default function AfterWorkingHoursReportPage() {
  const { user } = useAuth();
  const isTicketing = user?.role?.toLowerCase().includes("ticketing");
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    user: "",
    dateFrom: "",
    dateTo: "",
    status: "",
  });
  const [usersList, setUsersList] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await usersApi.getUsersList({
          organizationTypes: ["VendorSureze"],
          isITS: true,
          onlyLoadCurrentUser: false,
        });
        setUsersList(data?.items || data || []);
      } catch (error) {
        console.error("Failed to fetch users", error);
      }
    };
    fetchUsers();
  }, []);

  const handleClear = () => {
    setFormError("");
    setFilters({
      user: "",
      dateFrom: "",
      dateTo: "",
      status: "",
    });
    setReportData([]);
  };

  const handleGetReport = async () => {
    try {
      setLoading(true);
      setFormError("");

      const formatDateStart = (d) => {
        if (!d) return undefined;
        return d.includes("T") ? d : `${d}T15:59:59.0000000Z`;
      };
      const formatDateEnd = (d) => {
        if (!d) return undefined;
        return d.includes("T") ? d : `${d}T15:59:59.0000000Z`;
      };

      const selectedStatus = STATUS_OPTIONS.find(
        (s) => String(s.value) === String(filters.status)
      );

      const rawParams = {
        UserId: filters.user || undefined,
        DateFrom: formatDateStart(filters.dateFrom),
        DateTo: formatDateEnd(filters.dateTo),
        Status:
          selectedStatus && selectedStatus.value !== ""
            ? selectedStatus.value
            : undefined,
      };

      const params = Object.fromEntries(
        Object.entries(rawParams).filter(
          ([_, v]) => v !== "" && v !== null && v !== undefined
        )
      );

      const data = await afterWorkingHoursReportApi.getReport(params);
      const dataArray =
        data?.afterWorkingHoursDetails ||
        data?.reportList ||
        data?.result ||
        data?.data ||
        data?.items ||
        (Array.isArray(data) ? data : []);

      if (dataArray.length === 0) {
        setFormError("No data available for the selected filters.");
        setReportData([]);
      } else {
        setReportData(dataArray);
      }
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error("Failed to get report:", error);
      setFormError("Failed to retrieve report data.");
    }
  };

  const highlightText = (text, highlight) => {
    if (!highlight || !highlight.trim()) return text;
    const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = String(text).split(new RegExp(`(${escapedHighlight})`, "gi"));
    return (
      <span className="flex flex-wrap gap-0">
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={i} className="bg-pink-100 dark:bg-pink-500/30 text-pink-700 dark:text-pink-100 px-0.5 rounded-sm">
              {part}
            </mark>
          ) : (
            <span key={i} className="text-slate-900 dark:text-white">{part}</span>
          ),
        )}
      </span>
    );
  };

  const handleExportExcel = async () => {
    if (reportData.length === 0) return;
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("After Hours Report");
      const headers = Object.keys(reportData[0]);
      worksheet.columns = headers.map(header => ({
        header: header.toUpperCase().replace(/_/g, " "),
        key: header,
        width: 20
      }));
      worksheet.addRows(reportData);
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEC4899' } };
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      saveAs(blob, `After_Hours_Report_${new Date().getTime()}.xlsx`);
    } catch (error) {
      console.error("Export failed:", error);
      setFormError("Failed to export Excel file.");
    }
  };

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
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const filterInputClass =
    "px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/50 rounded-xl outline-none focus:border-pink-500 transition-all appearance-none cursor-pointer shadow-sm text-slate-900 dark:text-white";

  return (
    <div className="min-h-full w-full bg-[#f8fafc] dark:bg-slate-950 p-1 pb-[10px] flex flex-col relative overflow-visible font-[Arial] text-slate-900 dark:text-white">
      <style>{`
        *::-webkit-scrollbar { display: none !important; }
        * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
        td, tr { overflow: visible !important; }

        .custom-scrollbar::-webkit-scrollbar:horizontal { height: 8px; display: block !important; }
        .custom-scrollbar::-webkit-scrollbar:vertical { display: none !important; width: 0 !important; }
        .custom-scrollbar { scrollbar-width: thin !important; }
        .custom-scrollbar::-webkit-scrollbar-track:horizontal { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb:horizontal { background-color: #cbd5e1; border-radius: 20px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:horizontal { background-color: #475569; }
      `}</style>

      <div className="flex-1 w-full bg-white dark:bg-[#161920] border border-slate-200 dark:border-slate-800/50 shadow-sm flex flex-col rounded-3xl">
        {/* Header */}
        <div className="flex flex-col gap-6 py-8 px-4 md:px-8 transition-colors border-b border-slate-100 dark:border-slate-800/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <nav className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-600 mb-1">
                  <span onClick={() => navigate("/")} className="hover:opacity-80 cursor-pointer transition-all hover:text-pink-500">Home</span>
                  <span className="text-slate-300 dark:text-slate-700">/</span>
                  <span className="text-pink-500 font-black">Management Reports</span>
                </nav>
                <h1 className="text-4xl font-black tracking-tighter flex items-center gap-3">
                  After Working Hours Report
                  {loading && <span className="w-4 h-4 border-2 border-slate-800 dark:border-white border-t-transparent rounded-full animate-spin"></span>}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleClear}
                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold hover:border-slate-400 dark:hover:border-slate-500 transition-all active:scale-95 shadow-sm text-slate-700 dark:text-slate-300"
              >
                Clear
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
                {loading ? "Processing..." : "Get Report"}
              </button>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="px-4 md:px-8 py-4 border-b border-slate-100 dark:border-slate-800/50">
          <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row items-end justify-between gap-4">
            <div className="flex flex-wrap items-end gap-3 w-full">
              {!isTicketing && (
                <div className="flex flex-col gap-1 w-full sm:w-40">
                  <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">User</label>
                  <select
                    value={filters.user}
                    onChange={(e) => setFilters({ ...filters, user: e.target.value })}
                    className={filterInputClass}
                  >
                    <option value="">All Users</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.userName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-1 w-full sm:w-44">
                <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Date From</label>
                <Flatpickr
                  value={filters.dateFrom}
                  onChange={(dates, dateStr) => setFilters({ ...filters, dateFrom: dateStr })}
                  options={{ dateFormat: "Y-m-d", allowInput: true }}
                  placeholder="YYYY-MM-DD"
                  className={filterInputClass}
                />
              </div>

              <div className="flex flex-col gap-1 w-full sm:w-44">
                <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Date To</label>
                <Flatpickr
                  value={filters.dateTo}
                  onChange={(dates, dateStr) => setFilters({ ...filters, dateTo: dateStr })}
                  options={{ dateFormat: "Y-m-d", allowInput: true }}
                  placeholder="YYYY-MM-DD"
                  className={filterInputClass}
                />
              </div>

              <div className="flex flex-col gap-1 w-full sm:w-40">
                <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className={filterInputClass}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.label} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {reportData.length > 0 && (
                <div className="flex flex-col gap-1 flex-1 sm:min-w-[200px] animate-in fade-in slide-in-from-left-4 duration-500">
                  <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Search</label>
                  <input
                    type="text"
                    value={globalFilter ?? ""}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    placeholder="Filter results..."
                    className="w-full px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-pink-500 transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 shadow-sm"
                  />
                </div>
              )}

              {reportData.length > 0 && (
                <div className="hidden lg:flex items-center gap-5 font-bold uppercase tracking-widest text-[9px] mb-1.5 ml-auto text-slate-500 dark:text-slate-400">
                  <div className="flex flex-col items-end">
                    <span>Results</span>
                    <span className="text-xs text-slate-900 dark:text-white tabular-nums">{reportData.length}</span>
                  </div>
                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-800"></div>
                  <div className="flex flex-col items-end">
                    <span>Filtered</span>
                    <span className="text-xs text-slate-900 dark:text-white tabular-nums">{table.getRowModel().rows.length}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area - Full Screen Layout */}
        <div className="flex-1 flex flex-col relative py-4 h-auto w-full">
          {formError && (
            <div className="mb-4">
              <PremiumErrorAlert
                error={formError}
                onClose={() => setFormError("")}
              />
            </div>
          )}

          {reportData.length > 0 ? (
            <div className="flex flex-col w-full h-auto relative">
              <div className="overflow-x-auto px-4 pb-4 pt-2 custom-scrollbar">
                <table className="w-full text-left border-separate border-spacing-y-1 min-w-max text-[11px]">
                  <thead className="sticky top-0 z-10">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id} className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-[56px] text-slate-500 dark:text-slate-400">
                        {headerGroup.headers.map((header, colIdx) => (
                          <th
                            key={header.id}
                            className={`px-5 h-[56px] text-[10px] font-black uppercase tracking-widest text-left cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 ${colIdx === 0 ? "pl-8" : ""}`}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            <div className="flex items-center gap-1">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {header.column.getIsSorted() ? (
                                <span className="text-pink-500">
                                  {header.column.getIsSorted() === "asc" ? "↑" : "↓"}
                                </span>
                              ) : null}
                            </div>
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row, idx) => {
                      const isEven = idx % 2 === 0;
                      return (
                        <tr
                          key={row.id}
                          className={`group transition-all duration-200 h-[60px] border-b border-slate-50 dark:border-slate-800/30 ${isEven ? "bg-white dark:bg-[#161920]/40" : "bg-gray-200/50 dark:bg-white/[0.03]"}`}
                        >
                          {row.getVisibleCells().map((cell, colIdx) => (
                            <td
                              key={cell.id}
                              className={`px-5 h-[60px] text-left transition-colors font-bold text-[12px] ${colIdx === 0 ? "pl-8 rounded-l-2xl" : ""} ${colIdx === row.getVisibleCells().length - 1 ? "rounded-r-2xl" : ""}`}
                            >
                              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </div>
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Section */}
              <div className="px-6 py-4 bg-white/80 dark:bg-[#161920] border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between shrink-0 transition-colors rounded-b-3xl">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Page Size:</span>
                    <select
                      value={table.getState().pagination.pageSize}
                      onChange={(e) => table.setPageSize(Number(e.target.value))}
                      className="px-3 h-7 text-[10px] font-black bg-white dark:bg-slate-800 text-pink-600 dark:text-pink-400 border border-slate-200 dark:border-slate-700/50 rounded-lg outline-none transition-all cursor-pointer shadow-sm hover:border-pink-500/50 uppercase tracking-widest"
                    >
                      {[5, 10, 25, 50, 100].map((s) => (
                        <option key={s} value={s} className="font-sans text-slate-900 dark:text-white">{s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      <span className="text-slate-900 dark:text-white tabular-nums">
                        {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
                      </span>
                      <span className="text-slate-400 dark:text-slate-600 mx-1.5">—</span>
                      <span className="text-slate-900 dark:text-white tabular-nums">
                        {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500 mx-2 lowercase font-bold tracking-normal italic">of</span>
                      <span className="text-slate-900 dark:text-white tabular-nums font-black">
                        {table.getFilteredRowModel().rows.length}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-800/50 p-1 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm">
                    <button
                      onClick={() => table.firstPage()}
                      disabled={!table.getCanPreviousPage()}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                      title="First Page"
                    >
                      <ChevronsLeft size={14} strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                      title="Previous Page"
                    >
                      <ChevronLeft size={14} strokeWidth={2.5} />
                    </button>

                    <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1"></div>

                    <div className="px-3 flex items-center gap-2 py-1">
                      <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Page</span>
                      <div className="flex items-center gap-1.5 min-w-[40px] justify-center">
                        <span className="text-[11px] font-black text-pink-600 dark:text-pink-400 tabular-nums leading-none">{table.getState().pagination.pageIndex + 1}</span>
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-600">/</span>
                        <span className="text-[10px] font-black text-slate-900 dark:text-white tabular-nums leading-none">{table.getPageCount() || 1}</span>
                      </div>
                    </div>

                    <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1"></div>

                    <button
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                      title="Next Page"
                    >
                      <ChevronRight size={14} strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={() => table.lastPage()}
                      disabled={!table.getCanNextPage()}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                      title="Last Page"
                    >
                      <ChevronsRight size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 max-w-sm mx-auto text-slate-500 dark:text-slate-400">
              <h2 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-2 uppercase tracking-tighter">No active report</h2>
              <p className="text-[11px] font-medium leading-relaxed">
                Select your filters and click "Get Report" to display the after hours activity.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
