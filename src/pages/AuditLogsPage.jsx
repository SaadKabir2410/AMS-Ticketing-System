import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
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
  const [entityType] = useState(searchParams.get("entityName") || "Site");
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

  const customFilterArea = (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="relative min-w-[150px]">
        
        <select
          value={operationType}
          onChange={(e) => {
            setOperationType(e.target.value);
            setPage(1);
          }}
          className="w-full pl-9 pr-8 py-2 text-[10px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 dark:text-white rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer placeholder:text-slate-400"
        >
          <option value="all">ALL TYPE</option>
          <option value="1" className="dark:bg-slate-900">CREATE</option>
          <option value="2" className="dark:bg-slate-900">UPDATE</option>
        </select>
      </div>

      <div className="relative min-w-[180px]">
        {/* User Icon or similar if needed */}
        <input
          type="text"
          placeholder="USERNAME..."
          value={userNameSearch}
          onChange={(e) => {
            setUserNameSearch(e.target.value);
            setPage(1);
          }}
          className="w-full pl-9 pr-4 py-2 text-[10px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 dark:text-white rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="relative min-w-[160px]">
          {/* Time Icon or similar if needed */}
          <select
            value={datePreset}
            onChange={(e) => {
              setDatePreset(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-8 py-2 text-[10px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 dark:text-white rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer placeholder:text-slate-400"
          >
            <option value="all">ALL TIME</option>
            <option value="today" className="dark:bg-slate-900">TODAY</option>
            <option value="week" className="dark:bg-slate-900">THIS WEEK</option>
            <option value="month" className="dark:bg-slate-900">THIS MONTH</option>
            <option value="year" className="dark:bg-slate-900">THIS YEAR</option>
            <option value="custom" className="dark:bg-slate-900">CUSTOM</option>
          </select>
        </div>

        {datePreset === "custom" && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
            <input
              type="date"
              value={customFromDate}
              onChange={(e) => {
                setCustomFromDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-[10px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 dark:text-white rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all scheme-light dark:scheme-dark"
            />
            <span className="text-slate-400 text-[10px] ">TO</span>
            <input
              type="date"
              value={customToDate}
              onChange={(e) => {
                setCustomToDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-[10px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 dark:text-white rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all scheme-light dark:scheme-dark"
            />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden flex flex-col flex-1">
        {/* Header Section */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/2 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-400 hover:text-blue-500 hover:border-blue-500/30 transition-all active:scale-95 shadow-sm"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {[
                    "Home",
                    "Administration",
                    "Audit Logs",
                    entityType === "all" ? "All" : entityType,
                  ].map((b, i) => (
                    <span key={b} className="flex items-center gap-2">
                      <span
                        className={`text-[9px] ${i === 3 ? "text-blue-500" : "text-slate-400"}`}
                      >
                        {b}
                      </span>
                      {i < 3 && <span className="text-slate-300">/</span>}
                    </span>
                  ))}
                </div>
                <h1 className="text-3xl text-slate-800 dark:text-white leading-none ">
                  Audit Logs
                </h1>
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center border border-blue-100 dark:border-blue-500/20 shadow-inner">
              
            </div>
          </div>

          {/* Filter Toolbar Section */}
          <div className="mt-6 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center justify-between shadow-sm">
            {customFilterArea}
          </div>
        </div>

        {/* Table Area (Flush to the card) */}
        <div className="flex-1 overflow-hidden min-h-0 relative">
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
      </div>
    </div>
  );
}
