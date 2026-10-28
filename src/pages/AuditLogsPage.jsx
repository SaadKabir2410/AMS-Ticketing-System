import { useState, useEffect, useMemo, useCallback } from "react";
import AppSelect from "../component/common/AppSelect";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Filter, Search, X, Loader2 } from "lucide-react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { auditLogsApi } from "../services/api/auditLogs";
import CollapsibleAuditLogTable from "../component/common/CollapsibleAuditLogTable";
import { useResource } from "../component/hooks/useResource";
import { getApiErrorMessage } from "../utils/apiError";
import ListPager from "../component/common/ListPager";
import { useBackendEnumOptions } from "../hooks/useBackendEnumOptions";
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
  // Operation types come from the backend AuditTypeEnum (Create, Update, Delete),
  // labelled with the ABP audit logging texts "Created", "Updated", "Deleted".
  const operationTypeOptions = useBackendEnumOptions(
    "AuditTypeEnum",
    (key) => {
      const value = localize(key);
      return value === key ? "" : value;
    },
    { exclude: ["None"] },
  ).map((option) => ({ ...option, label: localize(`${option.name}d`) }));
  const primaryKeySearch = searchParams.get("primaryKey") || "";
  const entityType = searchParams.get("entityName") || "all";

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [userNameSearch, setUserNameSearch] = useState("");
  const [debouncedUserName, setDebouncedUserName] = useState("");
  const [operationType, setOperationType] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

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


  // Start date / End date filter (ABP audit logging "Start date" / "End date").
  const dateRange = useMemo(() => ({
    fromDate: fromDate ? `${fromDate}T00:00:00` : null,
    toDate: toDate ? `${toDate}T23:59:59` : null,
  }), [fromDate, toDate]);

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

  const [showFilters, setShowFilters] = useState(false);
  const activeFilterCount = [
    operationType !== "all" ? operationType : "",
    fromDate,
    toDate,
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
        <div className="app-page-header flex flex-col pt-3 pb-1 px-6 transition-colors border-b border-slate-100 dark:border-slate-800/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-0">
            <div className="flex flex-col">
              <nav className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 mb-2">
                <span onClick={() => navigate("/")} className="hover:text-pink-500 cursor-pointer transition-colors">{localize("Home")}</span>
                <span className="text-slate-300">/</span>
                {entityType === "AMSTicket" ? (
                  <>
                    <span>{localize("Menu:AMSTickets")}</span>
                    <span className="text-slate-300">/</span>
                  </>
                ) : entityType === "Country" ? (
                  <>
                    <span>{localize("Menu:Administration")}</span>
                    <span className="text-slate-300">/</span>
                    <span>{localize("Lookups")}</span>
                    <span className="text-slate-300">/</span>
                    <span>{localize("Country")}</span>
                    <span className="text-slate-300">/</span>
                  </>
                ) : entityType === "Lookup" || entityType === "LookupDetail" ? (
                  <>
                    <span>{localize("Menu:Administration")}</span>
                    <span className="text-slate-300">/</span>
                    <span>{entityType === "LookupDetail" ? localize("LookupDetails") : localize("Lookups")}</span>
                    <span className="text-slate-300">/</span>
                  </>
                ) : (
                  <>
                    <span>{localize("Menu:Administration")}</span>
                    <span className="text-slate-300">/</span>
                    <span>{
                      entityType === "UserWorkingHour" ? localize("UserWorkingHours") :
                        entityType === "all" ? localize("All") :
                          entityType
                    }</span>
                    <span className="text-slate-300">/</span>
                  </>
                )}
                <span className="text-pink-500">{localize("AuditLogsButtonText")}</span>
              </nav>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(-1)}
                  className="p-1.5 -ml-1.5 text-slate-400 hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-500/10 rounded-lg transition-all"
                >
                  <ArrowLeft size={20} />
                </button>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {localize("AuditLogsButtonText")}
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
                placeholder={localize("SearchInTablePlaceholder")}
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
              {localize("AdvancedSearch")}
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
                    <option value="all">{localize("ChangeType")}</option>
                    {operationTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </AppSelect>

                  <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    {localize("StartDate")}
                    <input
                      type="date"
                      value={fromDate}
                      max={toDate || undefined}
                      onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                      className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-pink-500 transition-all text-slate-700 dark:text-slate-200 scheme-light dark:scheme-dark"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    {localize("EndDate")}
                    <input
                      type="date"
                      value={toDate}
                      min={fromDate || undefined}
                      onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                      className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-pink-500 transition-all text-slate-700 dark:text-slate-200 scheme-light dark:scheme-dark"
                    />
                  </label>

                  {(activeFilterCount > 0) && (
                    <button
                      onClick={() => { setOperationType("all"); setFromDate(""); setToDate(""); setPage(1); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-200 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                    >
                      <X size={11} />
                      {localize("ClearFilter")}
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

        <ListPager
          className="mt-auto"
          page={page}
          pageSize={pageSize}
          totalCount={total}
          loading={loading}
          pageSizeOptions={[10, 20, 25, 50, 100]}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
      </Motion.div>
    </Motion.div>
  );
}
