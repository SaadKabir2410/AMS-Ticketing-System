import { useState, useEffect, useMemo, useCallback } from "react";
import AppSelect from "../component/common/AppSelect";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Filter, Search, X, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { auditLogsApi } from "../services/api/auditLogs";
import CollapsibleAuditLogTable from "../component/common/CollapsibleAuditLogTable";
import { useResource } from "../component/hooks/useResource";
import { getApiErrorMessage } from "../utils/apiError";
import {
  getCachedApplicationConfig,
  loadApplicationConfig,
} from "../services/applicationConfigCache";

const getLocalizationValue = (applicationConfig, key) => {
  const resources = applicationConfig?.localization?.values;
  if (!resources || typeof resources !== "object") return key;

  const defaultResourceName = applicationConfig?.localization?.defaultResourceName;
  const defaultValue = resources[defaultResourceName]?.[key];
  if (typeof defaultValue === "string" && defaultValue.trim()) {
    return defaultValue.trim();
  }

  for (const resource of Object.values(resources)) {
    const value = resource?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return key;
};

export default function AuditLogsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [applicationConfig, setApplicationConfig] = useState(
    getCachedApplicationConfig,
  );
  const localize = useCallback(
    (key) => getLocalizationValue(applicationConfig, key),
    [applicationConfig],
  );
  const primaryKeySearch = searchParams.get("primaryKey") || "";
  const entityType = searchParams.get("entityName") || "all";

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [userNameSearch, setUserNameSearch] = useState("");
  const [debouncedUserName, setDebouncedUserName] = useState("");
  const [datePreset, setDatePreset] = useState("all");
  const [operationType, setOperationType] = useState("all");
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");

  useEffect(() => {
    let isCurrent = true;
    loadApplicationConfig()
      .then((config) => {
        if (isCurrent) setApplicationConfig(config);
      })
      .catch(() => null);

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedUserName(userNameSearch), 500);
    return () => clearTimeout(timer);
  }, [userNameSearch]);


  const toLocalISO = useCallback((d) => {
    if (!d || isNaN(d.getTime())) return null;
    const pad = (n) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }, []);

  const getDateRange = useCallback(
    (preset) => {
      const now = new Date();
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);

      const end = new Date(now);
      end.setHours(23, 59, 59, 999);

      if (preset === "all") return { fromDate: null, toDate: null };
      if (preset === "today")
        return { fromDate: toLocalISO(start), toDate: toLocalISO(end) };
      if (preset === "week") {
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        return { fromDate: toLocalISO(start), toDate: toLocalISO(end) };
      }
      if (preset === "month") {
        start.setDate(1);
        return { fromDate: toLocalISO(start), toDate: toLocalISO(end) };
      }
      if (preset === "year") {
        start.setMonth(0, 1);
        return { fromDate: toLocalISO(start), toDate: toLocalISO(end) };
      }
      if (preset === "custom") {
        const parseDate = (str, setEnd) => {
          if (!str) return null;
          const [y, m, d] = str.split("-").map(Number);
          const dt = new Date(y, m - 1, d);
          if (setEnd) dt.setHours(23, 59, 59, 999);
          else dt.setHours(0, 0, 0, 0);
          return dt;
        };
        const from = parseDate(customFromDate, false);
        const to = parseDate(customToDate, true);
        return { fromDate: toLocalISO(from), toDate: toLocalISO(to) };
      }
      return { fromDate: null, toDate: null };
    },
    [customFromDate, customToDate, toLocalISO],
  );

  const dateRange = useMemo(
    () => getDateRange(datePreset),
    [datePreset, getDateRange],
  );

  const apiParams = useMemo(
    () => ({
      page,
      perPage: pageSize,
      primaryKey: primaryKeySearch || undefined,
      userName: debouncedUserName || undefined,
      entityName: entityType === "all" ? undefined : entityType,
      operationType:
        operationType === "all" ? undefined : parseInt(operationType, 10),
      ...dateRange,
    }),
    [
      page,
      pageSize,
      primaryKeySearch,
      debouncedUserName,
      entityType,
      operationType,
      dateRange,
    ],
  );

  const hasAuditTarget = Boolean(
    primaryKeySearch && entityType !== "all",
  );
  const { data, total, loading, error } = useResource(
    hasAuditTarget ? auditLogsApi : null,
    apiParams,
  );
  const totalPages = Math.ceil(total / pageSize) || 1;

  const [showFilters, setShowFilters] = useState(false);
  const activeFilterCount = [
    operationType !== "all" ? operationType : "",
    datePreset !== "all" ? datePreset : ""
  ].filter(v => v !== "").length;

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-full w-full bg-[#f8fafc] dark:bg-slate-950 p-1 pb-[10px] flex flex-col relative overflow-visible font-[Arial]"
    >
      <style>{`
        *::-webkit-scrollbar { display: none !important; }
        * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
        
        .custom-scrollbar::-webkit-scrollbar:horizontal { height: 8px; display: block !important; }
        .custom-scrollbar::-webkit-scrollbar:vertical { display: none !important; width: 0 !important; }
        .custom-scrollbar { scrollbar-width: thin !important; }
        .custom-scrollbar::-webkit-scrollbar-track:horizontal { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb:horizontal { background-color: #cbd5e1; border-radius: 20px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:horizontal { background-color: #475569; }
      `}</style>

      <Motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex-1 w-full bg-white dark:bg-[#161920] border border-slate-200 dark:border-slate-800/50 shadow-sm flex flex-col rounded-3xl"
      >
        <div className="flex flex-col pt-3 pb-1 px-6 transition-colors border-b border-slate-100 dark:border-slate-800/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-0">
            <div className="flex flex-col">
              <nav className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 mb-2">
                <span>Home</span>
                <span className="text-slate-300">/</span>
                {entityType === "AMSTicket" ? (
                  <>
                    <span>AMS Ticket</span>
                    <span className="text-slate-300">/</span>
                  </>
                ) : entityType === "Country" ? (
                  <>
                    <span>Management</span>
                    <span className="text-slate-300">/</span>
                    <span>Lookups</span>
                    <span className="text-slate-300">/</span>
                    <span>Countries</span>
                    <span className="text-slate-300">/</span>
                  </>
                ) : entityType === "Lookup" || entityType === "LookupDetail" ? (
                  <>
                    <span>Management</span>
                    <span className="text-slate-300">/</span>
                    <span>Lookups</span>
                    <span className="text-slate-300">/</span>
                    <span>{entityType === "LookupDetail" ? "Code Details" : "Codes"}</span>
                    <span className="text-slate-300">/</span>
                  </>
                ) : (
                  <>
                    <span>Administration</span>
                    <span className="text-slate-300">/</span>
                    <span>{
                      entityType === "UserWorkingHour" ? "User Working Hours" :
                        entityType === "all" ? "All Entities" :
                          entityType
                    }</span>
                    <span className="text-slate-300">/</span>
                  </>
                )}
                <span className="text-pink-500">Audit Log</span>
              </nav>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(-1)}
                  className="p-1.5 -ml-1.5 text-slate-400 hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-500/10 rounded-lg transition-all"
                >
                  <ArrowLeft size={20} />
                </button>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Audit Logs
                </h1>
              </div>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 mt-2 border-t border-slate-100 dark:border-slate-800/50">
            <div className="relative w-full sm:max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={14} className={userNameSearch ? "text-pink-500" : "text-slate-400"} />
              </div>
              <input
                type="text"
                placeholder="Search by username..."
                value={userNameSearch}
                onChange={(e) => { setUserNameSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200/60 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/50 text-xs outline-none transition-all focus:border-pink-600 focus:ring-4 focus:ring-pink-600/10 shadow-sm font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
              />
              {userNameSearch && (
                <button onClick={() => { setUserNameSearch(""); setPage(1); }} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-pink-500">
                  <X size={12} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(v => !v)}
              aria-expanded={showFilters}
              className={`relative inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${showFilters || activeFilterCount > 0
                ? "bg-pink-50 border-pink-300 text-pink-600 dark:bg-pink-500/10 dark:border-pink-500/40 dark:text-pink-400"
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-pink-500 hover:border-pink-300"
                }`}
            >
              <Filter size={14} />
              Advanced Search
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-pink-500 text-white text-[9px] font-black flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <Motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-3 py-3 border-t border-slate-100 dark:border-slate-800/50 mt-2">
                  <AppSelect
                    value={operationType}
                    onChange={(e) => { setOperationType(e.target.value); setPage(1); }}
                    className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500 transition-all text-slate-700 dark:text-slate-200"
                  >
                    <option value="all">Operation Type</option>
                    <option value="1">CREATE</option>
                    <option value="2">UPDATE</option>
                  </AppSelect>

                  <AppSelect
                    value={datePreset}
                    onChange={(e) => { setDatePreset(e.target.value); setPage(1); }}
                    className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500 transition-all text-slate-700 dark:text-slate-200"
                  >
                    <option value="all">Date Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                    <option value="custom">Custom</option>
                  </AppSelect>

                  {datePreset === "custom" && (
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={customFromDate}
                        onChange={(e) => { setCustomFromDate(e.target.value); setPage(1); }}
                        className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-pink-500 transition-all text-slate-700 dark:text-slate-200 scheme-light dark:scheme-dark"
                      />
                      <span className="text-xs text-slate-400">to</span>
                      <input
                        type="date"
                        value={customToDate}
                        onChange={(e) => { setCustomToDate(e.target.value); setPage(1); }}
                        className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-pink-500 transition-all text-slate-700 dark:text-slate-200 scheme-light dark:scheme-dark"
                      />
                    </div>
                  )}

                  {(activeFilterCount > 0) && (
                    <button
                      onClick={() => { setOperationType("all"); setDatePreset("all"); setPage(1); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-200 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                    >
                      <X size={11} />
                      Clear All
                    </button>
                  )}
                </div>
              </Motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-full bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 relative min-h-[300px]">
          {loading && (
            <div className="absolute inset-0 z-10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-pink-500" size={32} />
              </div>
            </div>
          )}
          {error && !loading ? (
            <div className="min-h-[300px] flex items-center justify-center px-6 text-center text-sm font-semibold text-rose-600 dark:text-rose-400">
              {getApiErrorMessage(error) || localize("DefaultErrorMessage")}
            </div>
          ) : (
            <CollapsibleAuditLogTable
              data={data}
              loading={loading}
              localize={localize}
              searchTerm={userNameSearch}
            />
          )}
        </div>

        {/* Pagination Section (CodePage Style) */}
        <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/40 gap-4 mt-auto rounded-b-3xl">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">
                Show
              </span>
              <AppSelect
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-slate-50 dark:bg-slate-700 border-none rounded-lg text-[10px] font-black px-2 py-1 outline-none"
              >
                {[10, 20, 25, 50, 100].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </AppSelect>
            </div>

            <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-slate-800">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                <span className="text-slate-900 dark:text-white tabular-nums">
                  {total > 0 ? (page - 1) * pageSize + 1 : 0}
                </span>
                <span className="text-slate-400 dark:text-slate-600 mx-1.5">—</span>
                <span className="text-slate-900 dark:text-white tabular-nums">
                  {Math.min(page * pageSize, total)}
                </span>
                <span className="text-slate-400 dark:text-slate-600 mx-2 lowercase font-bold tracking-normal italic">of</span>
                <span className="text-slate-900 dark:text-white tabular-nums font-black">
                  {total}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800/50 p-1 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm">
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={page === 1 || loading}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="First Page"
              >
                <ChevronsLeft size={14} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1 || loading}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Previous Page"
              >
                <ChevronLeft size={14} strokeWidth={2.5} />
              </button>

              <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1"></div>

              <div className="px-3 flex items-center gap-2 py-1">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Page
                </span>
                <div className="flex items-center gap-1.5 min-w-[40px] justify-center">
                  <span className="text-[11px] font-black text-pink-600 dark:text-pink-400 tabular-nums leading-none">
                    {page}
                  </span>
                  <span className="text-[10px] font-black text-slate-300 dark:text-slate-600">/</span>
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 tabular-nums leading-none">
                    {totalPages}
                  </span>
                </div>
              </div>

              <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1"></div>

              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages || loading}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Next Page"
              >
                <ChevronRight size={14} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages || loading}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Last Page"
              >
                <ChevronsRight size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </Motion.div>
    </Motion.div>
  );
}
