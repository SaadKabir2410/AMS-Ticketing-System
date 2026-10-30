import { useState, useMemo, useEffect, useCallback } from "react";
import AppSelect from "../component/common/AppSelect";
import { holidaysApi } from "../services/api/holidays";
import { useToast } from "../component/common/ToastContext";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";
import { usePermission } from "../hooks/usePermission";
import { useNavigate } from "react-router-dom";
import { ActionsMenu } from "../component/common/ResourcePage";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { getApiErrorMessage } from "../utils/apiError";
import DeleteConfirmModal from "../component/common/DeleteConfirmation";
import ListPager from "../component/common/ListPager";
import { useBackendLocalization } from "../hooks/useBackendLocalization";

const FILTER_CONTROL_CLASS =
  "w-full h-9 min-h-9 max-h-9 box-border px-3 bg-white/80 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/50 rounded-lg text-[11px] leading-none outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-pink-600/10 focus:border-pink-600 transition-all text-slate-900 dark:text-white shadow-sm font-bold";

// Each picker gets its own options object (react-flatpickr writes hooks into it).
const DATE_FILTER_OPTIONS = { dateFormat: "d/m/Y", allowInput: true };
// Local calendar day; toISOString() shifted the day back in timezones east of UTC.
const toIsoDay = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const highlightText = (text, query) => {
  if (!query || !text) return text;
  const parts = String(text).split(new RegExp(`(${query})`, 'gi'));
  return parts.map((part, i) => 
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="rounded-sm bg-pink-200 px-0.5 text-pink-900 dark:bg-pink-500/40 dark:text-pink-100">
        {part}
      </mark>
    ) : part
  );
};

export default function HolidaysPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const localize = useBackendLocalization("Billing");
  // Like ABP, a key the backend does not define is shown as the key itself.
  const text = (key) => localize(key) || key;

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
  // The backend paged list leaves disabled holidays out, so the page loads the
  // full list (GET /api/app/holiday, which includes them) like the Blazor
  // Holidays page, then filters and sorts it here with the same fields.
  const [sortKey, setSortKey] = useState("Date");
  const [sortDir, setSortDir] = useState("desc");

  const handleSort = (field) => {
    if (sortKey === field) {
      setSortDir((direction) => (direction === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      setData(await holidaysApi.getFilterOptions());
    } catch (err) {
      const message = getApiErrorMessage(err);
      if (message) toast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1); // back to the first page when the filters change
  }, [debouncedFilters]);

  const filteredData = useMemo(() => {
    // Text filters match with "contains", as the backend search does.
    const contains = (value, search) =>
      !search || String(value ?? "").toLowerCase().includes(search.trim().toLowerCase());
    const sortField = {
      Name: "name",
      Description: "description",
      Date: "date",
      Year: "year",
      CountryName: "countryName",
      Locations: "locations",
      Type: "type",
      IsDeleted: "isDeleted",
    }[sortKey];

    return data
      .filter((holiday) => {
        if (!contains(holiday.name, debouncedFilters.name)) return false;
        if (!contains(holiday.description, debouncedFilters.description)) return false;
        if (!contains(holiday.type, debouncedFilters.type)) return false;
        if (!contains(holiday.locations, debouncedFilters.locations)) return false;
        if (debouncedFilters.date && String(holiday.date || "").slice(0, 10) !== debouncedFilters.date) return false;
        if (!contains(holiday.countryName, debouncedFilters.country) &&
          !contains(holiday.countryISOCode, debouncedFilters.country)) return false;
        if (!contains(holiday.year ?? new Date(holiday.date).getFullYear(), debouncedFilters.year)) return false;
        return true;
      })
      .sort((first, second) => {
        const a = first[sortField];
        const b = second[sortField];
        const order = typeof a === "number" || typeof a === "boolean"
          ? Number(a) - Number(b)
          : String(a ?? "").localeCompare(String(b ?? ""), undefined, { sensitivity: "base" });
        return sortDir === "asc" ? order : -order;
      });
  }, [data, debouncedFilters, sortKey, sortDir]);

  const totalCount = filteredData.length;

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);


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

  // Disable / enable ask first, as the Blazor Holidays page does.
  const [pendingAction, setPendingAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const confirmPendingAction = async () => {
    if (!pendingAction) return;
    setActionLoading(true);
    try {
      if (pendingAction.type === "disable") {
        await holidaysApi.disable(pendingAction.row);
      } else {
        await holidaysApi.enable(pendingAction.row);
      }
      toast(localize("OperationSuccessfull"));
      fetchData();
    } catch (e) {
      const message = getApiErrorMessage(e);
      if (message) toast(message, "error");
    } finally {
      setActionLoading(false);
      setPendingAction(null);
    }
  };

  const filterInputClass = FILTER_CONTROL_CLASS;

  const breadcrumb = [
    { key: "Home", isHome: true },
    { key: "Menu:Administration" },
    { key: "Lookups" },
    { key: "Holidays" },
  ];

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
        <div className="app-page-header flex flex-col gap-6 py-8 px-4 md:px-8 transition-colors border-b border-slate-100 dark:border-slate-800/50">
          <nav className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-600 mb-1 flex-wrap">
            {breadcrumb.map((b, i) => (
              <span key={b.key} className="flex items-center gap-1.5">
                <span
                  onClick={() => b.isHome && navigate("/")}
                  className={
                    i === breadcrumb.length - 1
                      ? "text-pink-500"
                      : b.isHome
                      ? "hover:text-pink-500 cursor-pointer transition-colors"
                      : ""
                  }
                >
                  {text(b.key)}
                </span>
                {i < breadcrumb.length - 1 && <span className="text-slate-300 dark:text-slate-700">/</span>}
              </span>
            ))}
          </nav>
          <div className="flex items-center">
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
              {localize("Holidays")}
            </h1>
          </div>
        </div>

        <div className="flex flex-col w-full h-auto relative flex-1 overflow-hidden">
          <div className="overflow-x-auto px-4 pb-4 pt-2 custom-scrollbar w-full h-full">
            <div className="min-w-[1400px] flex flex-col w-full">
              {/* Custom Filter Area (Aligned with Table) */}
              <div className="w-full bg-transparent p-0 flex flex-col gap-6 border-b border-slate-100 dark:border-slate-800/50 pb-6 mb-2">
                <div className="grid grid-cols-[12%_1fr_10%_8%_12%_12%_12%_90px_120px] items-end w-full">
                  {/* Labels */}
                  {[
                    { key: "Name", sortField: "Name" },
                    { key: "Description", sortField: "Description" },
                    { key: "Date", sortField: "Date", center: true },
                    { key: "Year", sortField: "Year", center: true },
                    { key: "CountryName", sortField: "CountryName", center: true },
                    { key: "Locations", sortField: "Locations", center: true },
                    { key: "HolidayType", sortField: "Type", center: true },
                    { key: "IsDisabled", sortField: "IsDeleted", center: true },
                  ].map((l) => (
                    <div key={l.key} className={`${l.center ? 'px-[10px]' : 'pl-[23px] pr-[10px]'} text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center mb-1 ${l.center ? 'justify-center' : ''}`}>
                      <button
                        type="button"
                        onClick={() => handleSort(l.sortField)}
                        className={`inline-flex items-center gap-1 uppercase tracking-widest hover:text-pink-600 dark:hover:text-pink-400 ${sortKey === l.sortField ? "text-pink-600 dark:text-pink-400" : ""}`}
                        aria-label={localize(l.key)}
                      >
                        {localize(l.key)}
                        {sortKey !== l.sortField
                          ? <ArrowUpDown size={11} />
                          : sortDir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                      </button>
                    </div>
                  ))}
                  <div></div>

                  {/* Inputs */}
                  <div className="px-[10px] w-full"><input type="text" placeholder={localize("Name")} value={filters.name} onChange={(e) => setFilters({ ...filters, name: e.target.value })} className={filterInputClass} /></div>
                  <div className="px-[10px] w-full"><input type="text" placeholder={localize("Description")} value={filters.description} onChange={(e) => setFilters({ ...filters, description: e.target.value })} className={filterInputClass} /></div>

                  <div className="px-[10px] w-full">
                    <Flatpickr
                      value={filters.date ? filters.date.split("-").reverse().join("/") : ""}
                      onChange={([date]) => setFilters({ ...filters, date: date ? toIsoDay(date) : "" })}
                      options={DATE_FILTER_OPTIONS}
                      placeholder="DD/MM/YYYY"
                      className={filterInputClass}
                    />
                  </div>

                  <div className="px-[10px] w-full">
                    <input type="text" inputMode="numeric" placeholder={localize("Year")} value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })} className={filterInputClass} />
                  </div>

                  <div className="px-[10px] w-full">
                    <input type="text" placeholder={localize("CountryName")} value={filters.country} onChange={(e) => setFilters({ ...filters, country: e.target.value })} className={filterInputClass} />
                  </div>

                  <div className="px-[10px] w-full"><input type="text" placeholder={localize("Locations")} value={filters.locations} onChange={(e) => setFilters({ ...filters, locations: e.target.value })} className={filterInputClass} /></div>

                  <div className="px-[10px] w-full">
                    <input
                      type="text"
                      placeholder={localize("HolidayType")}
                      value={filters.type}
                      onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                      className={filterInputClass}
                    />
                  </div>

                  <div></div>

                  {/* Sits right after the last filter box, same height as the boxes. */}
                  <div className="flex justify-start pr-[10px] w-full">
                    <button
                      onClick={handleClear}
                      className="app-primary-button inline-flex h-9 items-center justify-center px-4 text-[11px]"
                    >
                      {localize("ClearFilter")}
                    </button>
                  </div>
                </div>
              </div>

              {/* Table */}
              {loading && filteredData.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] animate-pulse py-20 w-full">
                  {localize("LoadingWithThreeDot")}
                </div>
              ) : filteredData.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] py-20 w-full">
                  {localize("NoDataAvailableInDatatable")}
                </div>
              ) : (
                <table className={`w-full text-left border-separate border-spacing-y-1 table-fixed text-[11px] transition-opacity duration-200 ${loading ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
                  <thead className="sticky top-0 z-10 hidden">
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-[56px]">
                      <th className="w-[12%]">{localize("Name")}</th>
                      <th className="w-auto">{localize("Description")}</th>
                      <th className="w-[10%]">{localize("Date")}</th>
                      <th className="w-[8%]">{localize("Year")}</th>
                      <th className="w-[12%]">{localize("CountryName")}</th>
                      <th className="w-[12%]">{localize("Locations")}</th>
                      <th className="w-[12%]">{localize("HolidayType")}</th>
                      <th className="w-[90px]">{localize("IsDisabled")}</th>
                      <th className="w-[120px]">{localize("Actions")}</th>
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
                        <td className="w-[12%] pl-[23px] pr-5 rounded-l-2xl h-[60px] text-left transition-colors font-bold text-[12px]">
                          <div className="flex items-center gap-3 w-full overflow-hidden">
                            <span className="truncate block w-full">{highlightText(row.name || "—", debouncedFilters.name)}</span>
                          </div>
                        </td>
                        <td className="w-auto pl-[23px] pr-5 h-[60px] text-left transition-colors" title={row.description}>
                          <div className="line-clamp-2 w-full break-words whitespace-normal overflow-hidden leading-tight" style={{ overflow: "hidden" }}>{highlightText(row.description || "—", debouncedFilters.description)}</div>
                        </td>
                        <td className="w-[10%] px-5 h-[60px] text-center transition-colors">
                          {row.date ? new Date(row.date).toLocaleDateString("en-GB") : "—"}
                        </td>
                        <td className="w-[8%] px-5 h-[60px] text-center transition-colors">
                          {row.year ? highlightText(String(row.year), debouncedFilters.year) : "—"}
                        </td>
                        <td className="w-[12%] px-5 h-[60px] text-center transition-colors">
                          <div className="truncate w-full block" title={row.countryName || text("Global")}>{highlightText(row.countryName || text("Global"), debouncedFilters.country)}</div>
                        </td>
                        <td className="w-[12%] px-5 h-[60px] text-center transition-colors">
                          <div className="truncate w-full block" title={row.locations}>{highlightText(row.locations || "—", debouncedFilters.locations)}</div>
                        </td>
                        <td className="w-[12%] px-5 h-[60px] text-center transition-colors">
                          <div className="truncate w-full block" title={row.type}>{highlightText(row.type || "—", debouncedFilters.type)}</div>
                        </td>
                        <td className="w-[90px] px-5 h-[60px] text-center transition-colors">
                          <input
                            type="checkbox"
                            checked={!!row.isDeleted}
                            readOnly
                            aria-label={localize("IsDisabled")}
                            className="w-4 h-4 accent-pink-500 pointer-events-none"
                          />
                        </td>
                        <td className="w-[120px] px-5 rounded-r-2xl h-[60px] text-center transition-colors">
                          <ActionsMenu
                            onDisable={canDisable && !row.isDeleted ? () => setPendingAction({ type: "disable", row }) : undefined}
                            onEnable={canEnable && row.isDeleted ? () => setPendingAction({ type: "enable", row }) : undefined}
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

        <ListPager
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          loading={loading}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
      </div>

      <DeleteConfirmModal
        open={!!pendingAction}
        item={pendingAction?.row}
        loading={actionLoading}
        blurBackdrop={false}
        title={pendingAction?.type === "enable" ? localize("EnableButtonText") : localize("DisableButtonText")}
        message={pendingAction?.type === "enable" ? localize("EnableHolidayMessage") : localize("DisableHolidayMessage")}
        confirmText={pendingAction?.type === "enable" ? localize("EnableButtonText") : localize("DisableButtonText")}
        cancelText={localize("CancelButtonText")}
        processingText={localize("ProcessingWithThreeDot")}
        onClose={() => setPendingAction(null)}
        onConfirm={confirmPendingAction}
      />
    </div>
  );
}




