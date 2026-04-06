import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { workingHoursApi } from "../services/api/workingHours";
import { useToast } from "../component/common/ToastContext";
import { Select, MenuItem } from "@mui/material";
import { ActionsMenu } from "../component/common/ResourcePage";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import UserWorkingHourModal from "../component/common/UserWorkingHourModal";
import DeleteConfirmModal from "../component/common/DeleteConfirmation";
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

  const canCreate = usePermission("Billing.UserWorkingHours.Create");
  const canEdit = usePermission("Billing.UserWorkingHours.Edit");
  const canDelete = usePermission("Billing.UserWorkingHours.Delete");
  const canViewAuditLog = usePermission("Billing.UserWorkingHours.ViewAuditLog");

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
    <div className="h-full bg-[#f1f5f9] dark:bg-slate-950 overflow-hidden flex flex-col no-scrollbar p-6 transition-colors duration-300">
      {/* Breadcrumb - Standardized Style */}
      <nav className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500 mb-4 ml-1">
        {breadcrumb.map((b, i) => (
          <span key={i} className="flex items-center gap-2">
            <span
              onClick={() => b === "Home" && navigate("/")}
              className={b === "Home" ? "hover:text-blue-500 cursor-pointer transition-colors" : ""}
            >
              {b}
            </span>
            {i < breadcrumb.length - 1 && <span>/</span>}
          </span>
        ))}
      </nav>

      <div className="flex-1 w-full flex flex-col overflow-hidden">
        <div className="flex-1 bg-white dark:bg-slate-900 h-full w-full border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl backdrop-blur-sm overflow-hidden flex flex-col transition-all duration-300">

          {/* Header Section */}
          <div className="px-6 py-6 flex flex-col gap-6 bg-slate-50/50 dark:bg-transparent shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-[26px] font-black text-slate-800 dark:text-white tracking-tighter leading-none uppercase">
                  User Working Hours
                </h1>
              </div>
              <PermissionGuard permission="Billing.UserWorkingHours.Create">
                <button
                  onClick={handleNew}
                  className="h-[34px] px-6 btn-flagship rounded-xl text-[10px] font-black  transition-all active:scale-95 shadow-sm uppercase tracking-widest "
                >
                  New Working Hour
                </button>
              </PermissionGuard>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 flex flex-col w-full h-0 overflow-hidden relative">
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-slate-300 dark:text-slate-300 text-[11px] font-black uppercase tracking-[0.2em] animate-pulse">
                Refreshing data...
              </div>
            ) : data.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-300 dark:text-slate-300 text-[11px] font-black uppercase tracking-[0.2em]">
                No working hours found
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto no-scrollbar">
                <table className="w-full text-[11px] text-slate-800 dark:text-slate-200 border-collapse">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 backdrop-blur-md z-10">
                    <tr>
                      <th className="px-6 py-4 text-left font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-[9px]">User Name</th>
                      <th className="px-6 py-4 text-left font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-[9px]">Week Day</th>
                      <th className="px-6 py-4 text-left font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-[9px]">Start Time</th>
                      <th className="px-6 py-4 text-left font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-[9px]">End Time</th>
                      <th className="px-6 py-4 text-right font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-[9px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, i) => (
                      <tr
                        key={row.id || i}
                        className="group transition-colors hover:bg-pink-50 dark:hover:bg-[#ec4899]/5"
                      >
                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200 text-[12px]">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-[10px]">
                              {(row.userName || 'U').charAt(0).toUpperCase()}
                            </div>
                            {row.userName || "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                            {(() => {
                              const val = row.weekDay;
                              if (val === null || val === undefined) return "—";
                              if (typeof val === "number") return WEEK_DAYS[val] || val;
                              return val;
                            })()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-mono font-bold text-[12px]">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                            </svg>
                            {row.startTime || "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-mono font-bold text-[12px]">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                            </svg>
                            {row.endTime || "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <ActionsMenu
                            onEdit={canEdit ? () => handleEdit(row) : undefined}
                            onAuditLog={canViewAuditLog ? () =>
                              navigate(`/audit-logs?primaryKey=${row.id}&entityName=UserWorkingHour`)
                              : undefined
                            }
                            onDelete={canDelete ? () => { setDeleteId(row.id); } : undefined}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination Section */}
          <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 transition-colors">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Page Size:</span>
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
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  <span className="text-slate-900 dark:text-white tabular-nums">
                    {totalCount > 0 ? (page - 1) * pageSize + 1 : 0}
                  </span>
                  <span className="text-slate-400 dark:text-slate-600 mx-1.5">—</span>
                  <span className="text-slate-900 dark:text-white tabular-nums">
                    {Math.min(page * pageSize, totalCount)}
                  </span>
                  <span className="text-slate-400 dark:text-slate-600 mx-2 lowercase font-bold tracking-normal italic">of</span>
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
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Page</span>
                  <div className="flex items-center gap-1.5 min-w-[40px] justify-center">
                    <span className="text-[11px] font-black text-pink-600 dark:text-pink-400 tabular-nums leading-none">{page}</span>
                    <span className="text-[10px] font-black text-slate-300 dark:text-slate-600">/</span>
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 tabular-nums leading-none">{Math.ceil(totalCount / pageSize) || 1}</span>
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

      <UserWorkingHourModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditItem(null); }}
        onSave={() => { fetchData(); }}
        item={editItem}
      />

      <style>{`
        body { overflow: hidden !important; }
        .no-scrollbar::-webkit-scrollbar { display: none !important; }
        .no-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }
        ::-webkit-scrollbar { display: none !important; }
        * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
      `}</style>
    </div>
  );
}




