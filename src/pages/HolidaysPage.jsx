import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import AppSelect from "../component/common/AppSelect";
import { holidaysApi } from "../services/api/holidays";
import { countriesApi } from "../services/api/countries";
import { useToast } from "../component/common/ToastContext";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";
import "flatpickr/dist/themes/dark.css";
import { usePermission } from "../hooks/usePermission";
import { useNavigate } from "react-router-dom";
import { ActionsMenu } from "../component/common/ResourcePage";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Check, ChevronDown } from "lucide-react";
import { getApiErrorMessage } from "../utils/apiError";

const FILTER_CONTROL_CLASS =
  "w-full h-9 min-h-9 max-h-9 box-border px-3 bg-white/80 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/50 rounded-lg text-[11px] leading-none outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-pink-600/10 focus:border-pink-600 transition-all text-slate-900 dark:text-white shadow-sm font-bold";

const highlightComboBoxText = (value, query) => {
  const text = String(value ?? "");
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return text;

  const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.split(new RegExp(`(${escapedQuery})`, "gi")).map((part, index) =>
    part.toLowerCase() === normalizedQuery.toLowerCase() ? (
      <mark
        key={`${part}-${index}`}
        className="rounded-sm bg-pink-200 px-0.5 text-pink-900 dark:bg-pink-500/40 dark:text-pink-100"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
};

function CompactFilterSelect({ value, onChange, options, placeholder = "Select...", getLabel, getValue }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const filtered = options.filter((o) =>
    String(getLabel ? getLabel(o) : o).toLowerCase().includes(search.toLowerCase())
  );
  const displayLabel = value !== "" && value !== null && value !== undefined
    ? (getLabel ? getLabel(options.find(o => (getValue ? getValue(o) : o) === value) ?? value) : value)
    : null;
  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${FILTER_CONTROL_CLASS} flex items-center justify-between cursor-pointer hover:border-pink-500`}
      >
        <span className={displayLabel ? "text-slate-900 dark:text-white truncate" : "text-slate-400 dark:text-slate-500"}>
          {displayLabel ?? placeholder}
        </span>
        <ChevronDown size={12} strokeWidth={2.5} className={`shrink-0 ml-1 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="app-modern-dropdown-menu absolute z-[9999] left-0 top-[calc(100%+3px)] w-[200px] min-w-full bg-white dark:bg-[#1e2330] border border-slate-200 dark:border-slate-700/60 rounded-xl shadow-xl overflow-hidden">
          <div className="p-1.5 border-b border-slate-100 dark:border-slate-800">
            <input autoFocus type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-full px-2 py-1 text-[10px] rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:border-pink-500 transition-all" />
          </div>
          <ul className="max-h-40 overflow-y-auto py-0.5" style={{ scrollbarWidth: "none" }}>
            <li className="px-2.5 py-1 text-[10px] text-slate-400 dark:text-slate-500 hover:bg-pink-50 dark:hover:bg-pink-500/10 cursor-pointer transition-colors" onClick={() => { onChange(""); setOpen(false); setSearch(""); }}>{placeholder}</li>
            {filtered.length === 0 && <li className="px-2.5 py-1.5 text-[10px] text-slate-400 text-center">No results</li>}
            {filtered.map((o) => {
              const val = getValue ? getValue(o) : o;
              const lbl = getLabel ? getLabel(o) : o;
              const selected = val === value;
              return (
                <li key={String(val)} onClick={() => { onChange(val); setOpen(false); setSearch(""); }}
                  className={`flex items-center justify-between px-2.5 py-1 text-[10px] cursor-pointer transition-colors ${selected ? "bg-pink-50 dark:bg-pink-500/15 text-pink-600 dark:text-pink-400 font-semibold" : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                  <span className="truncate">{highlightComboBoxText(lbl, search)}</span>
                  {selected && <Check size={10} strokeWidth={3} className="text-pink-500" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

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

  const canDisable = usePermission("Billing.Disable");
  const canEnable = usePermission("Billing.Enable");

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
  const [yearOptions, setYearOptions] = useState([]);
  const [countryOptions, setCountryOptions] = useState([]);

  useEffect(() => {
    let active = true;

    const loadFilterOptions = async () => {
      try {
        const [holidays, countries] = await Promise.all([
          holidaysApi.getFilterOptions(),
          countriesApi.getAll(),
        ]);
        if (!active) return;

        const years = [...new Set(
          holidays
            .map((holiday) => holiday.year ?? new Date(holiday.date).getFullYear())
            .filter((year) => Number.isFinite(Number(year))),
        )].map(Number).sort((a, b) => b - a);

        setYearOptions(years);
        setCountryOptions(
          [...countries].sort((a, b) => String(a.name).localeCompare(String(b.name))),
        );
      } catch (error) {
        const message = getApiErrorMessage(error);
        if (active && message) toast(message, "error");
      }
    };

    loadFilterOptions();
    return () => {
      active = false;
    };
  }, [toast]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const extraParams = {};
      if (debouncedFilters.name) extraParams.Name = debouncedFilters.name;
      if (debouncedFilters.description) extraParams.Description = debouncedFilters.description;
      if (debouncedFilters.type) extraParams.Type = debouncedFilters.type;
      if (debouncedFilters.date) extraParams.Date = debouncedFilters.date;
      if (debouncedFilters.year) extraParams.Year = debouncedFilters.year;
      if (debouncedFilters.country) extraParams.CountryISOCode = debouncedFilters.country;

      const resp = await holidaysApi.getAll(extraParams);
      setData(resp?.items || []);
      setTotalCount(resp?.totalCount || 0);
    } catch (err) {
      const message = getApiErrorMessage(err);
      if (message) toast(message, "error");
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

  const selectedCountryName = useMemo(
    () => countryOptions.find((country) => country.code === debouncedFilters.country)?.name || "",
    [countryOptions, debouncedFilters.country],
  );

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

  const handleDisable = async (row) => {
    try {
      await holidaysApi.disable(row);
      toast("Holiday disabled");
      fetchData();
    } catch (e) {
      const message = getApiErrorMessage(e);
      if (message) toast(message, "error");
    }
  };

  const handleEnable = async (row) => {
    try {
      await holidaysApi.enable(row);
      toast("Holiday enabled");
      fetchData();
    } catch (e) {
      const message = getApiErrorMessage(e);
      if (message) toast(message, "error");
    }
  };

  const filterInputClass = FILTER_CONTROL_CLASS;

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
          <div className="flex items-center">
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
              Holidays
            </h1>
          </div>
        </div>

        <div className="flex flex-col w-full h-auto relative flex-1 overflow-hidden">
          <div className="overflow-x-auto px-4 pb-4 pt-2 custom-scrollbar w-full h-full">
            <div className="min-w-[1400px] flex flex-col w-full">
              {/* Custom Filter Area (Aligned with Table) */}
              <div className="w-full bg-transparent p-0 flex flex-col gap-6 border-b border-slate-100 dark:border-slate-800/50 pb-6 mb-2">
                <div className="grid grid-cols-[12%_1fr_10%_12%_12%_12%_12%_120px] items-end w-full">
                  {/* Labels */}
                  {[
                    { label: "NAME" },
                    { label: "DESCRIPTION" },
                    { label: "DATE", center: true },
                    { label: "YEAR", center: true },
                    { label: "COUNTRY", center: true },
                    { label: "LOCATIONS", center: true },
                    { label: "HOLIDAY TYPE", center: true },
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

                  <div className="px-[10px] w-full">
                    <CompactFilterSelect
                      value={filters.year || ""}
                      onChange={(val) => setFilters({ ...filters, year: val !== "" ? Number(val) : "" })}
                      options={yearOptions}
                      placeholder="All Years"
                    />
                  </div>

                  <div className="px-[10px] w-full">
                    <CompactFilterSelect
                      value={filters.country}
                      onChange={(val) => setFilters({ ...filters, country: val })}
                      options={countryOptions}
                      placeholder="All Countries"
                      getLabel={(o) => (typeof o === "object" ? o.name : o)}
                      getValue={(o) => (typeof o === "object" ? o.code : o)}
                    />
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

                  <div className="flex justify-end px-[10px] w-full">
                    <button
                      onClick={handleClear}
                      className="inline-flex h-9 box-border justify-center items-center px-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors w-full"
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
                      <th className="w-[12%]">Year</th>
                      <th className="w-[12%]">Country</th>
                      <th className="w-[12%]">Locations</th>
                      <th className="w-[12%]">Holiday Type</th>
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
                        <td className="w-[12%] px-5 h-[60px] text-center transition-colors">
                          {row.year || "—"}
                        </td>
                        <td className="w-[12%] px-5 h-[60px] text-center transition-colors">
                          <div className="truncate w-full block" title={row.countryName || "Global"}>{highlightText(row.countryName || "Global", selectedCountryName)}</div>
                        </td>
                        <td className="w-[12%] px-5 h-[60px] text-center transition-colors">
                          <div className="truncate w-full block" title={row.locations}>{highlightText(row.locations || "—", debouncedFilters.locations)}</div>
                        </td>
                        <td className="w-[12%] px-5 h-[60px] text-center transition-colors">
                          <div className="truncate w-full block" title={row.type}>{highlightText(row.type || "—", debouncedFilters.type)}</div>
                        </td>
                        <td className="w-[120px] px-5 rounded-r-2xl h-[60px] text-center transition-colors">
                          <ActionsMenu
                            onDisable={canDisable && !row.isDeleted ? () => handleDisable(row) : undefined}
                            onEnable={canEnable && row.isDeleted ? () => handleEnable(row) : undefined}
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
              <AppSelect
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="px-3 h-7 text-[10px] font-black bg-white dark:bg-slate-800 text-pink-600 dark:text-pink-400 border border-slate-200 dark:border-slate-700/50 rounded-lg outline-none transition-all cursor-pointer shadow-sm hover:border-pink-500/50 uppercase tracking-widest"
              >
                {[10, 25, 50, 100].map((s) => (
                  <option key={s} value={s} className="font-sans text-slate-900 dark:text-white">{s}</option>
                ))}
              </AppSelect>
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
    </div>
  );
}




