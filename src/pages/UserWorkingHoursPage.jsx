import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { workingHoursApi } from "../services/api/workingHours";
import { useToast } from "../component/common/ToastContext";
import { Select, MenuItem } from "@mui/material";
import { ActionsMenu } from "../component/common/ResourcePage";
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
    <div className="h-full bg-[#f1f5f9] dark:bg-slate-950 overflow-hidden flex flex-col no-scrollbar px-2 pt-2 pb-1 transition-colors duration-300">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 mb-3 ml-1">
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

      <div className="flex-1 w-full flex flex-col overflow-hidden px-6 pb-6 mb-2">
        <div className="flex-1 bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-white/5 rounded-2xl shadow-xl backdrop-blur-sm overflow-hidden flex flex-col transition-all duration-300">

          {/* Header */}
          <div className="px-12 py-8 flex flex-col gap-6 bg-slate-50/50 dark:bg-transparent shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-[26px] font-black text-slate-800 dark:text-white tracking-tighter leading-none uppercase">
                  User Working Hours
                </h1>
              </div>
              <PermissionGuard permission="Billing.UserWorkingHours.Create">
                <button
                  onClick={handleNew}
                  className="h-[34px] px-6 bg-blue-600 text-white rounded-xl text-[10px] font-black hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-500/20 uppercase"
                >
                  New Working Hour
                </button>
              </PermissionGuard>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 flex flex-col w-full h-0 overflow-hidden relative">
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-slate-300 dark:text-slate-600 text-[11px] font-black uppercase tracking-[0.2em] animate-pulse">
                Refreshing data...
              </div>
            ) : data.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-300 dark:text-slate-600 text-[11px] font-black uppercase tracking-[0.2em]">
                No working hours found
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto no-scrollbar">
                <table className="w-full text-[11px] text-slate-800 dark:text-slate-200 border-collapse">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900/50 backdrop-blur-md z-10">
                    <tr>
                      <th className="px-12 py-4 text-left font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-[9px]">User Name</th>
                      <th className="px-6 py-4 text-left font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-[9px]">Week Day</th>
                      <th className="px-6 py-4 text-left font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-[9px]">Start Time</th>
                      <th className="px-6 py-4 text-left font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-[9px]">End Time</th>
                      <th className="px-12 py-4 text-right font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-[9px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, i) => (
                      <tr
                        key={row.id || i}
                        className="group transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-500/5"
                      >
                        <td className="px-12 py-4 font-bold text-slate-800 dark:text-slate-200 text-[12px]">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-[10px]">
                              {(row.userName || 'U').charAt(0).toUpperCase()}
                            </div>
                            {row.userName || "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
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
                        <td className="px-12 py-4 text-right">
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

          {/* Pagination */}
          <div className="px-12 py-6 bg-slate-50/30 dark:bg-white/1 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Show:</span>
                <Select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  size="small"
                  sx={{
                    "& .MuiSelect-select": { py: "4px", px: "10px", fontSize: "11px", fontWeight: "800", color: "#3b82f6" },
                    "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                    bgcolor: "rgba(59, 130, 246, 0.05)",
                    borderRadius: "8px",
                  }}
                >
                  {[10, 25, 50, 100].map((s) => (
                    <MenuItem key={s} value={s} sx={{ fontSize: "11px", fontWeight: "800" }}>{s}</MenuItem>
                  ))}
                </Select>
              </div>
              <div className="h-4 w-px bg-slate-200 dark:bg-white/10" />
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                <span className="text-slate-900 dark:text-white">{totalCount > 0 ? (page - 1) * pageSize + 1 : 0}</span>
                {" — "}
                <span className="text-slate-900 dark:text-white">{Math.min(page * pageSize, totalCount)}</span>
                <span className="text-slate-400 mx-1">OF</span>
                <span className="text-slate-900 dark:text-white">{totalCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"
              >
                Prev
              </button>
              <div className="px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white shadow-lg shadow-blue-500/20">
                Page {page} of {Math.ceil(totalCount / pageSize) || 1}
              </div>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(totalCount / pageSize) || loading}
                className="px-4 py-2 bg-white dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-white/10 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"
              >
                Next
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
