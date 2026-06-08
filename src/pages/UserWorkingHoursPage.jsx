import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { workingHoursApi } from "../services/api/workingHours";
import { useToast } from "../component/common/ToastContext";
import { Select, MenuItem } from "@mui/material";
import { ActionsMenu } from "../component/common/ResourcePage";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus } from "lucide-react";
import UserWorkingHourModal from "../component/common/UserWorkingHourModal";
import { useAuth } from "../context/AuthContextHook";
import { usePermission } from "../hooks/usePermission";
import { PermissionGuard } from "../component/common/PermissionGuard";

const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function UserWorkingHoursPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = useMemo(() => user?.role?.toLowerCase().includes("admin"), [user]);

  const canEdit = usePermission("Billing.UserWorkingHours.Edit");
  const canViewAuditLog = usePermission("Billing.UserWorkingHours.ViewAuditLog");

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await workingHoursApi.getAll({
        page,
        perPage: pageSize,
        UserId: isAdmin ? undefined : (user?.id || undefined),
      });
      setData(resp.items || []);
      setTotalCount(resp.totalCount || 0);
    } catch (err) {
      toast("Failed to load working hours", "error");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, toast, isAdmin, user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleNew = () => {
    setEditItem(null);
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setModalOpen(true);
  };

  const breadcrumb = ["Home", "Management", "Users", "Working Hours"];

  return (
    <div className="min-h-full w-full bg-[#f8fafc] dark:bg-slate-950 p-1 pb-[10px] flex flex-col relative overflow-visible font-[Arial]">
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
            <h1 className="text-4xl font-black text-black tracking-tighter">
              User Working Hours
            </h1>
            <div className="flex items-center gap-4">
              <button
                onClick={handleNew}
                className="inline-flex items-center px-5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-pink-500/20 transition-all bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white"
              >
                <Plus size={16} className="mr-2" strokeWidth={3} />
                New Working Hour
              </button>
            </div>
          </div>
        </div>

          {/* Table */}
          <div className="flex flex-col w-full h-auto relative text-black">
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-black text-[11px] font-black uppercase tracking-[0.2em] animate-pulse">
                Refreshing data...
              </div>
            ) : data.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-black text-[11px] font-black uppercase tracking-[0.2em]">
                No working hours found
              </div>
            ) : (
              <div className="overflow-x-auto px-4 pb-4 pt-2 custom-scrollbar text-black">
                <table className="w-full text-left border-separate border-spacing-y-1 min-w-max text-[11px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-[56px]">
                      <th className="px-5 pl-8 h-[56px] text-[10px] font-black uppercase tracking-widest text-black text-left">User Name</th>
                      <th className="px-5 h-[56px] text-[10px] font-black uppercase tracking-widest text-black text-center">Week Day</th>
                      <th className="px-5 h-[56px] text-[10px] font-black uppercase tracking-widest text-black text-center">Start Time</th>
                      <th className="px-5 h-[56px] text-[10px] font-black uppercase tracking-widest text-black text-center">End Time</th>
                      <th className="px-5 h-[56px] text-[10px] font-black uppercase tracking-widest text-black text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, idx) => {
                      const isEven = idx % 2 === 0;
                      return (
                      <tr
                        key={row.id || idx}
                        className={`group transition-all duration-200 h-[60px] border-b border-slate-50 dark:border-slate-800/30 ${isEven ? "bg-white dark:bg-[#161920]/40" : "bg-gray-200/50 dark:bg-white/[0.03]"}`}
                      >
                        <td className="px-5 pl-8 rounded-l-2xl h-[60px] text-left transition-colors text-black font-bold text-[12px]">
                          <div className="flex items-center gap-3">
                            {row.userName || "—"}
                          </div>
                        </td>
                        <td className="px-5 h-[60px] text-center transition-colors text-black">
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold uppercase tracking-wider text-[10px] text-black">
                            {(() => {
                              const val = row.weekDay;
                              if (val === null || val === undefined) return "—";
                              if (typeof val === "number") return WEEK_DAYS[val] || val;
                              return val;
                            })()}
                          </span>
                        </td>
                        <td className="px-5 h-[60px] text-center transition-colors text-black">
                          <div className="flex items-center gap-2 font-mono font-bold text-[12px] justify-center text-black">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                            </svg>
                            {row.startTime || "—"}
                          </div>
                        </td>
                        <td className="px-5 h-[60px] text-center transition-colors text-black">
                          <div className="flex items-center gap-2 font-mono font-bold text-[12px] justify-center text-black">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                            </svg>
                            {row.endTime || "—"}
                          </div>
                        </td>
                        <td className="px-5 rounded-r-2xl h-[60px] text-center transition-colors text-black">
                          <ActionsMenu
                            onEdit={canEdit ? () => handleEdit(row) : undefined}
                            onAuditLog={canViewAuditLog ? () =>
                              navigate(`/audit-logs?primaryKey=${row.id}&entityName=UserWorkingHour`)
                              : undefined
                            }
                          />
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination Section */}
          <div className="px-6 py-4 bg-white/80 dark:bg-[#161920] border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between shrink-0 transition-colors rounded-b-3xl">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-black">Page Size:</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="px-3 h-7 text-[10px] font-black bg-white dark:bg-slate-800 text-pink-600 dark:text-pink-400 border border-slate-200 dark:border-slate-700/50 rounded-lg outline-none transition-all cursor-pointer shadow-sm hover:border-pink-500/50 uppercase tracking-widest"
                >
                  {[10, 25, 50, 100].map((s) => (
                    <option key={s} value={s} className="font-sans">{s}</option>
                  ))}
                </select>
              </div>

              <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-black uppercase tracking-widest text-black">
                  <span className="text-black tabular-nums">
                    {totalCount > 0 ? (page - 1) * pageSize + 1 : 0}
                  </span>
                  <span className="text-black mx-1.5">—</span>
                  <span className="text-black tabular-nums">
                    {Math.min(page * pageSize, totalCount)}
                  </span>
                  <span className="text-black mx-2 lowercase font-bold tracking-normal italic">of</span>
                  <span className="text-black tabular-nums font-black">
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
                  <span className="text-[10px] font-black text-black uppercase tracking-widest">Page</span>
                  <div className="flex items-center gap-1.5 min-w-[40px] justify-center">
                    <span className="text-[11px] font-black text-pink-600 dark:text-pink-400 tabular-nums leading-none">{page}</span>
                    <span className="text-[10px] font-black text-black">/</span>
                    <span className="text-[10px] font-black text-black tabular-nums leading-none">{Math.ceil(totalCount / pageSize) || 1}</span>
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

      <UserWorkingHourModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditItem(null); }}
        onSave={() => { fetchData(); }}
        item={editItem}
      />
    </div>
  );
}




