import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Filter, Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { auditLogsApi } from "../services/api/auditLogs";
import CollapsibleAuditLogTable from "../component/common/CollapsibleAuditLogTable";
import { useResource } from "../component/hooks/useResource";

export default function AuditLogsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initKey = searchParams.get("primaryKey") || "";

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [primaryKeySearch] = useState(initKey);
  const [debouncedPrimaryKey, setDebouncedPrimaryKey] = useState(initKey);
  const [userNameSearch, setUserNameSearch] = useState("");
  const [debouncedUserName, setDebouncedUserName] = useState("");
  const [datePreset, setDatePreset] = useState("all");
  const [operationType, setOperationType] = useState("all");
  const [entityType, setEntityType] = useState(searchParams.get("entityName") || "all");


  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedPrimaryKey(primaryKeySearch),
      500,
    );
    return () => clearTimeout(timer);
  }, [primaryKeySearch]);

  useEffect(() => {
    const key = searchParams.get("primaryKey") || "";
    const ent = searchParams.get("entityName") || "all";
    
    if (key !== debouncedPrimaryKey) {
      setDebouncedPrimaryKey(key);
    }
    if (ent !== entityType) {
      setEntityType(ent);
    }
  }, [searchParams]);

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
      primaryKey: debouncedPrimaryKey || undefined,
      userName: debouncedUserName || undefined,
      entityName: entityType === "all" ? undefined : entityType,
      operationType:
        operationType === "all" ? undefined : parseInt(operationType, 10),
      ...dateRange,
    }),
    [
      page,
      pageSize,
      debouncedPrimaryKey,
      debouncedUserName,
      entityType,
      operationType,
      dateRange,
    ],
  );

  const { data, total, loading } = useResource(auditLogsApi, apiParams);

  const [showFilters, setShowFilters] = useState(false);
  const activeFilterCount = [
    operationType !== "all" ? operationType : "",
    userNameSearch !== "" ? userNameSearch : "",
    datePreset !== "all" ? datePreset : ""
  ].filter(v => v !== "").length;

  return (
    <motion.div
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

      <motion.div
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
                <span>{entityType === "AMSTicket" ? "AMS Tickets" : entityType === "all" ? "Administration" : entityType}</span>
                <span className="text-slate-300">/</span>
                <span className="text-pink-500">Audit Logs</span>
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

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(v => !v)}
                className={`relative inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${showFilters || activeFilterCount > 0
                  ? "bg-pink-50 border-pink-300 text-pink-600 dark:bg-pink-500/10 dark:border-pink-500/40 dark:text-pink-400"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-pink-500 hover:border-pink-300"
                  }`}
              >
                <Filter size={13} />
                Advanced Filter
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-pink-500 text-white text-[9px] font-black flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-3 py-3 border-t border-slate-100 dark:border-slate-800/50 mt-2">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search size={13} className="text-slate-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Username..."
                      value={userNameSearch}
                      onChange={(e) => { setUserNameSearch(e.target.value); setPage(1); }}
                      className="pl-8 pr-7 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500 transition-all placeholder:text-slate-400 min-w-[200px]"
                    />
                    {userNameSearch && (
                      <button
                        onClick={() => { setUserNameSearch(""); setPage(1); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-pink-500"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>

                  <select
                    value={operationType}
                    onChange={(e) => { setOperationType(e.target.value); setPage(1); }}
                    className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500 transition-all text-slate-700 dark:text-slate-200"
                  >
                    <option value="all">All Types</option>
                    <option value="1">CREATE</option>
                    <option value="2">UPDATE</option>
                  </select>

                  <select
                    value={datePreset}
                    onChange={(e) => { setDatePreset(e.target.value); setPage(1); }}
                    className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500 transition-all text-slate-700 dark:text-slate-200"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                    <option value="custom">Custom</option>
                  </select>

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
                      onClick={() => { setOperationType("all"); setUserNameSearch(""); setDatePreset("all"); setPage(1); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-200 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                    >
                      <X size={11} />
                      Clear All
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-full bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 relative min-h-[300px] flex-1 flex flex-col rounded-b-3xl overflow-hidden">
          <CollapsibleAuditLogTable
            data={data}
            loading={loading}
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}


