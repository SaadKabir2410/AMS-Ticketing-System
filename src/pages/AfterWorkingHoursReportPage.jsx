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

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Open", value: "Open" },
  { label: "Closed", value: "Closed" },
  { label: "Void", value: "Void" },
];

export default function AfterWorkingHoursReportPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    user: "",
    dateFrom: "",
    dateTo: "",
    status: "All",
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
      status: "All",
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
      const statusLabel = selectedStatus?.label;

      const rawParams = {
        UserId: filters.user || undefined,
        DateFrom: formatDateStart(filters.dateFrom),
        DateTo: formatDateEnd(filters.dateTo),
        Status: statusLabel && statusLabel !== "All" ? statusLabel : undefined,
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
      <span className="flex flex-wrap gap-0 text-black">
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={i} className="bg-pink-100 text-black px-0.5 rounded-sm">
              {part}
            </mark>
          ) : (
            <span key={i} className="text-black">{part}</span>
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
    "px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/50 rounded-xl outline-none focus:border-black transition-all appearance-none cursor-pointer shadow-sm text-black";

  return (
    <div className="min-h-full w-full bg-[#f8fafc] dark:bg-slate-950 p-1 pb-[10px] flex flex-col relative overflow-visible font-[Arial] text-black">
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

      <div className="flex-1 w-full bg-white dark:bg-[#161920] border border-slate-200 dark:border-slate-800/50 shadow-sm flex flex-col rounded-3xl text-black">
        {/* Header */}
        <div className="flex flex-col gap-6 py-8 px-4 md:px-8 transition-colors border-b border-slate-100 dark:border-slate-800/50 text-black">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-black">
            <div className="flex items-center gap-4 text-black">
              <div>
                <nav className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-black mb-1">
                  <span onClick={() => navigate("/")} className="hover:opacity-80 cursor-pointer transition-all text-black">Home</span>
                  <span className="text-black">/</span>
                  <span className="text-black font-black">Management Reports</span>
                </nav>
                <h1 className="text-4xl font-black text-black tracking-tighter flex items-center gap-3">
                  After Working Hours Report
                  {loading && <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 text-black">
              <button
                onClick={handleClear}
                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold text-black hover:border-black transition-all active:scale-95 shadow-sm"
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
        <div className="px-4 md:px-8 py-4 border-b border-slate-100 dark:border-slate-800/50 text-black">
          <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row items-end justify-between gap-4 text-black">
            <div className="flex flex-wrap items-end gap-3 w-full text-black">
              <div className="flex flex-col gap-1 w-full sm:w-40 text-black">
                <label className="text-[9px] font-black text-black uppercase tracking-widest ml-1">User</label>
                <select
                  value={filters.user}
                  onChange={(e) => setFilters({ ...filters, user: e.target.value })}
                  className={filterInputClass}
                >
                  <option value="" className="text-black">All Users</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id} className="text-black">
                      {u.userName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1 w-full sm:w-36 text-black">
                <label className="text-[9px] font-black text-black uppercase tracking-widest ml-1">Date From</label>
                <Flatpickr
                  value={filters.dateFrom}
                  onChange={(dates, dateStr) => setFilters({ ...filters, dateFrom: dateStr })}
                  options={{ dateFormat: "Y-m-d", allowInput: true }}
                  placeholder="YYYY-MM-DD"
                  className={filterInputClass}
                />
              </div>

              <div className="flex flex-col gap-1 w-full sm:w-36 text-black">
                <label className="text-[9px] font-black text-black uppercase tracking-widest ml-1">Date To</label>
                <Flatpickr
                  value={filters.dateTo}
                  onChange={(dates, dateStr) => setFilters({ ...filters, dateTo: dateStr })}
                  options={{ dateFormat: "Y-m-d", allowInput: true }}
                  placeholder="YYYY-MM-DD"
                  className={filterInputClass}
                />
              </div>

              <div className="flex flex-col gap-1 w-full sm:w-28 text-black">
                <label className="text-[9px] font-black text-black uppercase tracking-widest ml-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className={filterInputClass}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.label} value={s.value} className="text-black">{s.label}</option>
                  ))}
                </select>
              </div>

              {reportData.length > 0 && (
                <div className="flex flex-col gap-1 flex-1 sm:min-w-[200px] animate-in fade-in slide-in-from-left-4 duration-500 text-black">
                  <label className="text-[9px] font-black text-black uppercase tracking-widest ml-1">Search</label>
                  <input
                    type="text"
                    value={globalFilter ?? ""}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    placeholder="Filter results..."
                    className="w-full px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-black transition-all text-black"
                  />
                </div>
              )}

              {reportData.length > 0 && (
                <div className="hidden lg:flex items-center gap-5 text-black font-bold uppercase tracking-widest text-[9px] mb-1.5 ml-auto">
                  <div className="flex flex-col items-end text-black">
                    <span className="text-black">Results</span>
                    <span className="text-xs text-black tabular-nums">{reportData.length}</span>
                  </div>
                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-800"></div>
                  <div className="flex flex-col items-end text-black">
                    <span className="text-black">Filtered</span>
                    <span className="text-xs text-black tabular-nums">{table.getRowModel().rows.length}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area - Full Screen Layout */}
        <div className="flex-1 flex flex-col relative py-4 text-black h-auto w-full">
          {formError && (
            <div className="mb-4 text-black">
              <PremiumErrorAlert
                error={formError}
                onClose={() => setFormError("")}
              />
            </div>
          )}

          {reportData.length > 0 ? (
            <div className="flex flex-col w-full h-auto relative text-black">
              <div className="overflow-x-auto px-4 pb-4 pt-2 custom-scrollbar text-black">
                <table className="w-full text-left border-separate border-spacing-y-1 min-w-max text-[11px] text-black">
                  <thead className="sticky top-0 z-10 text-black">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id} className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-[56px] text-black">
                        {headerGroup.headers.map((header, colIdx) => (
                          <th
                            key={header.id}
                            className={`px-5 h-[56px] text-[10px] font-black uppercase tracking-widest text-black text-left cursor-pointer hover:bg-slate-100 ${colIdx === 0 ? "pl-8" : ""}`}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            <div className="flex items-center gap-1 text-black">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {header.column.getIsSorted() ? (
                                <span className="text-black">
                                  {header.column.getIsSorted() === "asc" ? "↑" : "↓"}
                                </span>
                              ) : null}
                            </div>
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody className="text-black">
                    {table.getRowModel().rows.map((row, idx) => {
                      const isEven = idx % 2 === 0;
                      return (
                      <tr
                        key={row.id}
                        className={`group transition-all duration-200 h-[60px] border-b border-slate-50 dark:border-slate-800/30 text-black ${isEven ? "bg-white dark:bg-[#161920]/40" : "bg-gray-200/50 dark:bg-white/[0.03]"}`}
                      >
                        {row.getVisibleCells().map((cell, colIdx) => (
                          <td
                            key={cell.id}
                            className={`px-5 h-[60px] text-left transition-colors text-black font-bold text-[12px] ${colIdx === 0 ? "pl-8 rounded-l-2xl" : ""} ${colIdx === row.getVisibleCells().length - 1 ? "rounded-r-2xl" : ""}`}
                          >
                            <div className="flex items-center gap-3 text-black">
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
              <div className="px-6 py-4 bg-white/80 dark:bg-[#161920] border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between shrink-0 transition-colors rounded-b-3xl text-black">
                <div className="flex items-center gap-4 text-black">
                  <div className="flex items-center gap-2.5 text-black">
                    <span className="text-[10px] font-black uppercase tracking-widest text-black">Page Size:</span>
                    <select
                      value={table.getState().pagination.pageSize}
                      onChange={(e) => table.setPageSize(Number(e.target.value))}
                      className="px-3 h-7 text-[10px] font-black bg-white dark:bg-slate-800 text-black border border-slate-200 dark:border-slate-700/50 rounded-lg outline-none transition-all cursor-pointer shadow-sm hover:border-black uppercase tracking-widest"
                    >
                      {[5, 10, 25, 50, 100].map((s) => (
                        <option key={s} value={s} className="font-sans text-black">{s}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-slate-800 text-black">
                    <p className="text-[10px] font-black uppercase tracking-widest text-black">
                      <span className="text-black tabular-nums">
                        {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
                      </span>
                      <span className="text-black mx-1.5">—</span>
                      <span className="text-black tabular-nums">
                        {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)}
                      </span>
                      <span className="text-black mx-2 lowercase font-bold tracking-normal italic">of</span>
                      <span className="text-black tabular-nums font-black">
                        {table.getFilteredRowModel().rows.length}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-black">
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-800/50 p-1 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm text-black">
                    <button
                      onClick={() => table.firstPage()}
                      disabled={!table.getCanPreviousPage()}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-black hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                      title="First Page"
                    >
                      <ChevronsLeft size={14} strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-black hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                      title="Previous Page"
                    >
                      <ChevronLeft size={14} strokeWidth={2.5} />
                    </button>
                    
                    <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1"></div>
                    
                    <div className="px-3 flex items-center gap-2 py-1 text-black">
                      <span className="text-[10px] font-black text-black uppercase tracking-widest">Page</span>
                      <div className="flex items-center gap-1.5 min-w-[40px] justify-center text-black">
                        <span className="text-[11px] font-black text-black tabular-nums leading-none">{table.getState().pagination.pageIndex + 1}</span>
                        <span className="text-[10px] font-black text-black">/</span>
                        <span className="text-[10px] font-black text-black tabular-nums leading-none">{table.getPageCount() || 1}</span>
                      </div>
                    </div>

                    <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1"></div>

                    <button
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-black hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                      title="Next Page"
                    >
                      <ChevronRight size={14} strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={() => table.lastPage()}
                      disabled={!table.getCanNextPage()}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-black hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                      title="Last Page"
                    >
                      <ChevronsRight size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 max-w-sm mx-auto text-black">
              <h2 className="text-xl font-black text-black mb-2 uppercase tracking-tighter">No active report</h2>
              <p className="text-black text-[11px] font-medium leading-relaxed">
                Select your filters and click "Get Report" to display the after hours activity.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
