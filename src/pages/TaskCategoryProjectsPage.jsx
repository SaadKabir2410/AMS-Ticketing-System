import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { taskCategoryProjectsApi } from "../services/api/taskCategoryProjects";
import { codesApi } from "../services/api/Code";
import codeDetailsApi from "../services/api/CodeDetails";
import { useToast } from "../component/common/ToastContext";
import { Select, MenuItem } from "@mui/material";
import { ActionsMenu } from "../component/common/ResourcePage";
import TaskCategoryProjectModal from "../component/common/TaskCategoryProjectModal";
import DeleteConfirmModal from "../component/common/DeleteConfirmation";

export default function TaskCategoryProjectsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(false);

  const [mappings, setMappings] = useState([]);
  const [loadingMappings, setLoadingMappings] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [actionItem, setActionItem] = useState(null);
  const [actionType, setActionType] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editProject, setEditProject] = useState(null); // Dedicated state for updates

  // Load projects for the dropdown
  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const allLookups = await codesApi.getAll();
      const projectLookup = allLookups.find((l) => l.lookupCode === "PRJ");
      if (projectLookup) {
        const details = await codeDetailsApi.getAll({ lookupId: projectLookup.id });
        setProjects(details.map((d) => ({ id: d.id, name: d.description || d.newCode })));
      }
    } catch (err) {
      toast("Error fetching projects", "error");
    } finally {
      setLoadingProjects(false);
    }
  };

  // Fetch mappings: selective or global
  const fetchMappings = useCallback(async () => {
    setLoadingMappings(true);
    try {
      const data = await taskCategoryProjectsApi.getAll({
        projectId: selectedProjectId || undefined, // undefined fetches ALL
        skipCount: (page - 1) * pageSize,
        maxResultCount: pageSize,
      });
      setMappings(Array.isArray(data?.items) ? data.items : []);
      setTotalCount(data?.totalCount || 0);
    } catch (err) {
      toast("Failed to load mappings", "error");
    } finally {
      setLoadingMappings(false);
    }
  }, [selectedProjectId, page, pageSize, toast]);

  useEffect(() => { loadProjects(); }, []);
  useEffect(() => { fetchMappings(); }, [fetchMappings]);
  useEffect(() => { setPage(1); }, [selectedProjectId]);

  const handleClear = () => {
    setSelectedProjectId("");
    setPage(1);
  };

  // Using mappings directly as they are now server-side filtered
  const paginatedData = mappings;

  const handleNew = () => {
    setEditProject(null); // Ensure modal is clear
    setModalOpen(true);
  };

  const handleEdit = (row) => {
    setEditProject({ id: row.projectId, name: row.projectDescription || row.description });
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!actionItem) return;
    setActionLoading(true);
    try {
      await taskCategoryProjectsApi.delete(actionItem.projectId || actionItem.id);
      toast("Mapping removed successfully!");
      fetchMappings();
    } catch (err) {
      toast("Failed to remove mapping", "error");
    } finally {
      setActionLoading(false);
      setActionItem(null);
      setActionType("");
    }
  };

  const breadcrumb = ["Home", "Management", "Lookups", "Task Category Projects"];

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
              <h1 className="text-[26px] font-black text-slate-800 dark:text-white tracking-tighter leading-none uppercase">
                Task Category Projects
              </h1>
              <button
                onClick={handleNew}
                className="h-[26px] px-4 bg-blue-600 text-white rounded-[6px] text-[9.5px] font-black hover:bg-blue-700 transition-all active:scale-95 shadow-sm uppercase shadow-blue-500/10"
              >
                New Task Category Project
              </button>
            </div>

            {/* Project Filter */}
            <div className="flex items-end gap-3 w-full max-w-lg">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-[9.5px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none px-1">
                  Project
                </label>
                <div className="relative">
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    disabled={loadingProjects}
                    className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-[11px] font-semibold rounded-lg pl-3 pr-8 py-2 outline-none focus:border-blue-400 transition-all cursor-pointer shadow-sm"
                  >
                    <option value="">Choose An Option</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                </div>
              </div>
              <button
                onClick={handleClear}
                className="h-[34px] px-5 bg-blue-600 text-white rounded-lg text-[9.5px] font-black hover:bg-blue-700 transition-all active:scale-95 shadow-sm uppercase shrink-0"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Table — no headers, just rows */}
          <div className="flex-1 flex flex-col w-full h-0 overflow-hidden">
            <div className="flex-1 flex flex-col w-full h-0 overflow-hidden relative">
              {loadingMappings ? (
                <div className="flex-1 flex items-center justify-center text-slate-300 text-[11px] font-black uppercase tracking-widest animate-pulse">
                  Loading Data...
                </div>
              ) : mappings.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-300 text-[11px] font-black uppercase tracking-widest">
                  No Data Found
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto no-scrollbar">
                  <table className="w-full text-[11px] text-slate-800 dark:text-slate-200 border-collapse">
                    <tbody>
                      {paginatedData.map((row, i) => (
                        <tr
                          key={row.projectId || i}
                          className="group transition-colors hover:bg-blue-50/30 dark:hover:bg-blue-500/10"
                        >
                          {/* Project name — NOW FIRST COLUMN */}
                          <td className="px-16 py-3 font-semibold text-slate-700 dark:text-slate-300 text-[12px]">
                            {row.projectDescription || row.description || ""}
                          </td>
                          {/* Task Category — NOW SECOND COLUMN */}
                          <td style={{ width: 250, minWidth: 250 }} className="px-2 py-3 font-semibold text-slate-700 dark:text-slate-300 text-[12px]">
                            {row.taskCategoryDescription || ""}
                          </td>
                          {/* Actions split button */}
                          <td className="px-6 py-3 text-right">
                            <ActionsMenu
                              onEdit={() => handleEdit(row)}
                              onDelete={() => {
                                setActionItem(row);
                                setActionType("delete");
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Pagination Footer */}
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
                  {[5, 10, 25, 50].map((s) => (
                    <MenuItem key={s} value={s} sx={{ fontSize: "11px", fontWeight: "800" }}>{s}</MenuItem>
                  ))}
                </Select>
              </div>
              <div className="h-4 w-px bg-slate-200 dark:bg-white/10 hidden sm:block" />
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest hidden sm:block">
                <span className="text-slate-900 dark:text-white">{totalCount > 0 ? (page - 1) * pageSize + 1 : 0}</span>
                {" — "}
                <span className="text-slate-900 dark:text-white">{Math.min(page * pageSize, totalCount)}</span>
                <span className="text-slate-400"> OF </span>
                <span className="text-slate-900 dark:text-white">{totalCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1 || loadingMappings}
                className="px-4 py-1.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"
              >
                Prev
              </button>
              <div className="px-5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white shadow-lg shadow-blue-500/20">
                Page {page} of {Math.ceil(totalCount / pageSize) || 1}
              </div>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(totalCount / pageSize) || loadingMappings}
                className="px-4 py-1.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <TaskCategoryProjectModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditProject(null);
        }}
        onSave={() => {
          fetchMappings();
          setEditProject(null);
        }}
        preSelectedProject={editProject}
      />

      {actionType === "delete" && (
        <DeleteConfirmModal
          open={true}
          item={actionItem}
          loading={actionLoading}
          title="Confirm Deleting"
          confirmText="Delete"
          onClose={() => { setActionItem(null); setActionType(""); }}
          onConfirm={handleDelete}
        />
      )}

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