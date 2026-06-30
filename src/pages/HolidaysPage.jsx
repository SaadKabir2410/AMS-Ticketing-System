import { useState, useMemo, useEffect, useCallback } from "react";
import { holidaysApi } from "../services/api/holidays";
import HolidayModal from "../component/common/HolidayModal";
import { useToast } from "../component/common/ToastContext";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";
import "flatpickr/dist/themes/dark.css";
import { usePermission } from "../hooks/usePermission";
import { useNavigate } from "react-router-dom";
import { ActionsMenu } from "../component/common/ResourcePage";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus } from "lucide-react";

const LOCAL_COUNTRIES = [
  { id: "gb", name: "United Kingdom", code: "GB" },
  { id: "my", name: "Malaysia", code: "MY" },
  { id: "us", name: "United States", code: "US" },
  { id: "au", name: "Australia", code: "AU" },
  { id: "ca", name: "Canada", code: "CA" },
  { id: "de", name: "Germany", code: "DE" },
  { id: "fr", name: "France", code: "FR" },
  { id: "in", name: "India", code: "IN" },
  { id: "sg", name: "Singapore", code: "SG" },
  { id: "ae", name: "United Arab Emirates", code: "AE" },
  { id: "jp", name: "Japan", code: "JP" },
  { id: "cn", name: "China", code: "CN" },
  { id: "za", name: "South Africa", code: "ZA" },
  { id: "ng", name: "Nigeria", code: "NG" },
  { id: "pk", name: "Pakistan", code: "PK" },
  { id: "bd", name: "Bangladesh", code: "BD" },
  { id: "id", name: "Indonesia", code: "ID" },
  { id: "ph", name: "Philippines", code: "PH" },
  { id: "nz", name: "New Zealand", code: "NZ" },
  { id: "ie", name: "Ireland", code: "IE" },
];

const highlightText = (text, query) => {
  if (!query || !text) return text;
  const parts = String(text).split(new RegExp(`(${query})`, 'gi'));
  return parts.map((part, i) => 
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-pink-100 dark:bg-pink-500/30 text-pink-700 dark:text-pink-100 rounded-[2px] px-[2px]">
        {part}
      </mark>
    ) : part
  );
};

export default function HolidaysPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const canEdit = usePermission("Billing.Holidays.Edit");
  const canDelete = usePermission("Billing.Holidays.Delete");
  const canViewAuditLog = usePermission("Billing.Holidays.ViewAuditLog");

  const [filters, setFilters] = useState({
    name: "",
    description: "",
    type: "",
    date: "",
    year: "",
    country: "",
    locations: "",
  });

  const [debouncedFilters, setDebouncedFilters] = useState(filters);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters]);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [totalCount, setTotalCount] = useState(0);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const extraParams = {};
      if (debouncedFilters.name) extraParams.Name = debouncedFilters.name;
      if (debouncedFilters.description) extraParams.Description = debouncedFilters.description;
      if (debouncedFilters.type) extraParams.Type = debouncedFilters.type;
      if (debouncedFilters.date) extraParams.Date = debouncedFilters.date;
      if (debouncedFilters.year) extraParams.Year = debouncedFilters.year;
      if (debouncedFilters.country) extraParams.CountryName = debouncedFilters.country;
      if (debouncedFilters.locations) extraParams.Locations = debouncedFilters.locations;

      const resp = await holidaysApi.getAll(extraParams);
      setData(resp?.items || []);
      setTotalCount(resp?.totalCount || 0);
    } catch (err) {
      toast("Failed to load holidays", "error");
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters, toast]);

  useEffect(() => {
    fetchData();
    setPage(1); // reset to first page when filters change
  }, [fetchData]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);

  const handleClear = () => {
    setFilters({
      name: "",
      description: "",
      type: "",
      date: "",
      year: "",
      country: "",
      locations: "",
    });
  };

  const handleCreateSubmit = async (payload) => {
    setIsCreating(true);
    try {
      await holidaysApi.create(payload);
      toast("Holiday created successfully");
      setIsCreateOpen(false);
      fetchData();
    } catch (error) {
      toast(error?.message || "Operation failed", "error");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDisable = async (row) => {
    try {
      await holidaysApi.disable(row);
      toast("Holiday disabled");
      fetchData();
    } catch (e) {
      toast(e?.message || e?.Message || "Failed to disable", "error");
    }
  };

  const handleEnable = async (row) => {
    try {
      await holidaysApi.enable(row);
      toast("Holiday enabled");
      fetchData();
    } catch (e) {
      toast(e?.message || e?.Message || "Failed to enable", "error");
    }
  };

  const filterInputClass =
    "w-full px-3 py-2 bg-white/80 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/50 rounded-lg text-[11px] outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-pink-600/10 focus:border-pink-600 transition-all text-slate-900 dark:text-white shadow-sm font-bold";

  const breadcrumb = ["Home", "Management", "Lookups", "Holidays"];

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
          <nav className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-600 mb-1 flex-wrap">
            {breadcrumb.map((b, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span
                  onClick={() => b === "Home" && navigate("/")}
                  className={
                    i === breadcrumb.length - 1
                      ? "text-pink-500"
                      : b === "Home"
                      ? "hover:text-pink-500 cursor-pointer transition-colors"
                      : ""
                  }
                >
                  {b}
                </span>
                {i < breadcrumb.length - 1 && <span className="text-slate-300 dark:text-slate-700">/</span>}
              </span>
            ))}
          </nav>
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
              Holidays
            </h1>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center px-5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-pink-500/20 transition-all bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white"
              >
                <Plus size={16} className="mr-2" strokeWidth={3} />
                Add Holiday
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col w-full h-auto relative flex-1 overflow-hidden">
          <div className="overflow-x-auto px-4 pb-4 pt-2 custom-scrollbar w-full h-full">
            <div className="min-w-[1400px] flex flex-col w-full">
              {/* Custom Filter Area (Aligned with Table) */}
              <div className="w-full bg-transparent p-0 flex flex-col gap-6 border-b border-slate-100 dark:border-slate-800/50 pb-6 mb-2">
                <div className="grid grid-cols-[12%_1fr_10%_8%_12%_12%_12%_10%_120px] items-end w-full">
                  {/* Labels */}
                  {[
                    { label: "NAME" },
                    { label: "DESCRIPTION" },
                    { label: "DATE", center: true },
                    { label: "YEAR", center: true },
                    { label: "COUNTRY", center: true },
                    { label: "LOCATIONS", center: true },
                    { label: "HOLIDAY TYPE", center: true },
                    { label: "DISABLED", center: true },
                  ].map((l) => (
                    <div key={l.label} className={`px-[10px] text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center mb-1 ${l.center ? 'justify-center' : ''}`}>
                      {l.label}
                    </div>
                  ))}
                  <div></div>

                  {/* Inputs */}
                  <div className="px-[10px] w-full"><input type="text" placeholder="Filter Name..." value={filters.name} onChange={(e) => setFilters({ ...filters, name: e.target.value })} className={filterInputClass} /></div>
                  <div className="px-[10px] w-full"><input type="text" placeholder="Search details..." value={filters.description} onChange={(e) => setFilters({ ...filters, description: e.target.value })} className={filterInputClass} /></div>

                  <div className="px-[10px] w-full">
                    <Flatpickr
                      value={filters.date}
                      onChange={([date]) => setFilters({ ...filters, date: date ? date.toISOString().split('T')[0] : "" })}
                      options={{ dateFormat: "Y-m-d", allowInput: true }}
                      placeholder="YYYY-MM-DD"
                      className={filterInputClass}
                    />
                  </div>

                  <div className="px-[10px] w-full"><input type="number" placeholder="2024" value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })} className={filterInputClass} /></div>

                  <div className="px-[10px] w-full">
                    <select
                      value={filters.country}
                      onChange={(e) => setFilters({ ...filters, country: e.target.value })}
                      className={`${filterInputClass} appearance-none pr-3 cursor-pointer`}
                    >
                      <option value="">All Countries</option>
                      {LOCAL_COUNTRIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="px-[10px] w-full"><input type="text" placeholder="Region..." value={filters.locations} onChange={(e) => setFilters({ ...filters, locations: e.target.value })} className={filterInputClass} /></div>

                  <div className="px-[10px] w-full">
                    <input
                      type="text"
                      placeholder="Holiday Type..."
                      value={filters.type}
                      onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                      className={filterInputClass}
                    />
                  </div>

                  <div className="flex justify-center items-center h-full px-[10px] w-full">
                  </div>
                  <div className="flex justify-end px-[10px] w-full">
                    <button
                      onClick={handleClear}
                      className="inline-flex justify-center items-center px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors w-full"
                      title="Reset All Filters"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              {/* Table */}
              {loading && data.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] animate-pulse py-20 w-full">
                  Refreshing data...
                </div>
              ) : data.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] py-20 w-full">
                  No holidays found
                </div>
              ) : (
                <table className={`w-full text-left border-separate border-spacing-y-1 table-fixed text-[11px] transition-opacity duration-200 ${loading ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
                  <thead className="sticky top-0 z-10 hidden">
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-[56px]">
                      <th className="w-[12%]">Name</th>
                      <th className="w-auto">Description</th>
                      <th className="w-[10%]">Date</th>
                      <th className="w-[8%]">Year</th>
                      <th className="w-[12%]">Country</th>
                      <th className="w-[12%]">Locations</th>
                      <th className="w-[12%]">Holiday Type</th>
                      <th className="w-[10%]">Disabled</th>
                      <th className="w-[120px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((row, idx) => {
                      const isEven = idx % 2 === 0;
                      return (
                      <tr
                        key={row.id || idx}
                        className={`group transition-all duration-200 h-[60px] border-b border-slate-50 dark:border-slate-800/30 ${isEven ? "bg-white dark:bg-[#161920]/40" : "bg-gray-200/50 dark:bg-white/[0.03]"}`}
                      >
                        <td className="w-[12%] px-5 pl-8 rounded-l-2xl h-[60px] text-left transition-colors font-bold text-[12px]">
                          <div className="flex items-center gap-3 w-full overflow-hidden">
                            <span className="truncate block w-full">{highlightText(row.name || "—", debouncedFilters.name)}</span>
                          </div>
                        </td>
                        <td className="w-auto px-5 h-[60px] text-left transition-colors" title={row.description}>
                          <div className="line-clamp-2 w-full break-words whitespace-normal overflow-hidden leading-tight" style={{ overflow: "hidden" }}>{highlightText(row.description || "—", debouncedFilters.description)}</div>
                        </td>
                        <td className="w-[10%] px-5 h-[60px] text-center transition-colors">
                          {row.date ? new Date(row.date).toLocaleDateString("en-GB") : "—"}
                        </td>
                        <td className="w-[8%] px-5 h-[60px] text-center transition-colors">
                          {row.year || "—"}
                        </td>
                        <td className="w-[12%] px-5 h-[60px] text-center transition-colors">
                          <div className="truncate w-full block" title={row.countryName || "Global"}>{highlightText(row.countryName || "Global", debouncedFilters.country)}</div>
                        </td>
                        <td className="w-[12%] px-5 h-[60px] text-center transition-colors">
                          <div className="truncate w-full block" title={row.locations}>{highlightText(row.locations || "—", debouncedFilters.locations)}</div>
                        </td>
                        <td className="w-[12%] px-5 h-[60px] text-center transition-colors">
                          <div className="truncate w-full block" title={row.type}>{highlightText(row.type || "—", debouncedFilters.type)}</div>
                        </td>
                        <td className="w-[10%] px-5 h-[60px] text-center transition-colors">
                          <div className="flex justify-center w-full">
                            <input
                              type="checkbox"
                              checked={!!row.isDeleted}
                              readOnly
                              className="w-4 h-4 rounded accent-blue-500 border-slate-300 dark:border-white/20 pointer-events-none appearance-none checked:btn-flagship dark:checked:btn-flagship checked:border-transparent bg-slate-100 dark:bg-slate-800 border relative after:content-[''] after:hidden checked:after:block after:absolute after:left-[5px] after:top-[1px] after:w-[4px] after:h-[8px] after:border-white after:border-b-2 after:border-r-2 after:rotate-45"
                            />
                          </div>
                        </td>
                        <td className="w-[120px] px-5 rounded-r-2xl h-[60px] text-center transition-colors">
                          <ActionsMenu
                            onAuditLog={canViewAuditLog ? () =>
                              navigate(`/audit-logs?primaryKey=${row.id}&entityName=Holiday`)
                              : undefined
                            }
                            onDisable={!row.isDeleted ? () => handleDisable(row) : undefined}
                            onEnable={row.isDeleted ? () => handleEnable(row) : undefined}
                          />
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Pagination Section */}
        <div className="px-6 py-4 bg-white/80 dark:bg-[#161920] border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between shrink-0 transition-colors rounded-b-3xl">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Page Size:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="px-3 h-7 text-[10px] font-black bg-white dark:bg-slate-800 text-pink-600 dark:text-pink-400 border border-slate-200 dark:border-slate-700/50 rounded-lg outline-none transition-all cursor-pointer shadow-sm hover:border-pink-500/50 uppercase tracking-widest"
              >
                {[10, 25, 50, 100].map((s) => (
                  <option key={s} value={s} className="font-sans text-slate-900 dark:text-white">{s}</option>
                ))}
              </select>
            </div>

            <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-slate-800">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                <span className="text-slate-900 dark:text-white tabular-nums">
                  {totalCount > 0 ? (page - 1) * pageSize + 1 : 0}
                </span>
                <span className="text-slate-400 dark:text-slate-600 mx-1.5">—</span>
                <span className="text-slate-900 dark:text-white tabular-nums">
                  {Math.min(page * pageSize, totalCount)}
                </span>
                <span className="text-slate-400 dark:text-slate-500 mx-2 lowercase font-bold tracking-normal italic">of</span>
                <span className="text-slate-900 dark:text-white tabular-nums font-black">
                  {totalCount}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800/50 p-1 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1 || loading}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="First Page"
              >
                <ChevronsLeft size={14} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Previous Page"
              >
                <ChevronLeft size={14} strokeWidth={2.5} />
              </button>

              <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1"></div>

              <div className="px-3 flex items-center gap-2 py-1">
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Page</span>
                <div className="flex items-center gap-1.5 min-w-[40px] justify-center">
                  <span className="text-[11px] font-black text-pink-600 dark:text-pink-400 tabular-nums leading-none">{page}</span>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-600">/</span>
                  <span className="text-[10px] font-black text-slate-900 dark:text-white tabular-nums leading-none">{Math.ceil(totalCount / pageSize) || 1}</span>
                </div>
              </div>

              <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1"></div>

              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(totalCount / pageSize) || loading}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Next Page"
              >
                <ChevronRight size={14} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => setPage(Math.ceil(totalCount / pageSize))}
                disabled={page >= Math.ceil(totalCount / pageSize) || loading}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Last Page"
              >
                <ChevronsRight size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <HolidayModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
        loading={isCreating}
      />
    </div>
  );
}




