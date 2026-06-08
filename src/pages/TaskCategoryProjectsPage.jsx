import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { taskCategoryProjectsApi } from "../services/api/taskCategoryProjects";
import { codesApi } from "../services/api/Code";
import codeDetailsApi from "../services/api/CodeDetails";
import { useToast } from "../component/common/ToastContext";
import { ActionsMenu } from "../component/common/ResourcePage";
import TaskCategoryProjectModal from "../component/common/TaskCategoryProjectModal";
import DeleteConfirmModal from "../component/common/DeleteConfirmation";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus } from "lucide-react";

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
  const [editProject, setEditProject] = useState(null);

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

  const fetchMappings = useCallback(async () => {
    setLoadingMappings(true);
    try {
      const data = await taskCategoryProjectsApi.getAll({
        projectId: selectedProjectId || undefined,
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

  const paginatedData = mappings;

  const handleNew = () => {
    setEditProject(null);
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
      toast("Mapping removed !successfully");
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
    <div className="min-h-full w-full bg-[#f8fafc] dark:bg-slate-950 p-1 pb-[10px] flex flex-col relative overflow-visible font-[Arial] text-black">
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

      <div className="flex-1 w-full bg-white dark:bg-[#161920] border border-slate-200 dark:border-slate-800/50 shadow-sm flex flex-col rounded-3xl text-black">
        {/* Header */}
        <div className="flex flex-col gap-6 py-8 px-4 md:px-8 transition-colors border-b border-slate-100 dark:border-slate-800/50 text-black">
          <nav className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-black mb-1 flex-wrap">
            {breadcrumb.map((b, i) => (
              <span key={i} className="flex items-center gap-1.5 text-black">
                <span
                  onClick={() => b === "Home" && navigate("/")}
                  className={
                    i === breadcrumb.length - 1
                      ? "text-black font-black"
                      : b === "Home"
                        ? "text-black hover:opacity-80 cursor-pointer transition-all"
                        : "text-black"
                  }
                >
                  {b}
                </span>
                {i < breadcrumb.length - 1 && <span className="text-black">/</span>}
              </span>
            ))}
          </nav>
          <div className="flex items-center justify-between text-black">
            <h1 className="text-4xl font-black text-black tracking-tighter">
              Task Category Projects
            </h1>
            <div className="flex items-center gap-4 text-black">
              <button
                onClick={handleNew}
                className="inline-flex items-center px-5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-pink-500/20 transition-all bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white"
              >
                <Plus size={16} className="mr-2" strokeWidth={3} />
                Add New
              </button>
            </div>
          </div>

          {/* Project Filter */}
          <div className="flex items-end gap-3 w-full max-w-lg text-black">
            <div className="flex flex-col gap-1 flex-1 text-black">
              <label className="text-[9.5px] font-black text-black uppercase tracking-widest leading-none px-1">
                Project
              </label>
              <div className="relative text-black">
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  disabled={loadingProjects}
                  className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-black text-[11px] font-semibold rounded-lg pl-3 pr-8 py-2 outline-none focus:border-black transition-all cursor-pointer shadow-sm"
                >
                  <option value="" className="text-black">Choose An Option</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="text-black">{p.name}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-black">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </div>
            </div>
            <button
              onClick={handleClear}
              className="h-[34px] px-5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 text-black rounded-lg text-[9.5px] font-black transition-all active:scale-95 shadow-sm uppercase shrink-0"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex flex-col w-full h-auto relative text-black">
          {loadingMappings ? (
            <div className="flex-1 flex items-center justify-center text-black text-[11px] font-black uppercase tracking-[0.2em] animate-pulse py-20">
              Loading Data...
            </div>
          ) : mappings.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-black text-[11px] font-black uppercase tracking-[0.2em] py-20">
              No Data Found
            </div>
          ) : (
            <div className="overflow-x-auto px-4 pb-4 pt-2 custom-scrollbar text-black">
              <table className="w-full text-left border-separate border-spacing-y-1 min-w-max text-[11px] text-black">
                <thead className="sticky top-0 z-10 text-black">
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-[56px] text-black">
                    <th className="min-w-[250px] px-5 pl-8 h-[56px] text-[10px] font-black uppercase tracking-widest text-black text-left">Project Name</th>
                    <th className="px-5 h-[56px] text-[10px] font-black uppercase tracking-widest text-black text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-black">
                  {paginatedData.map((row, idx) => {
                    const isEven = idx % 2 === 0;
                    return (
                      <tr
                        key={row.projectId || idx}
                        className={`group transition-all duration-200 h-[60px] border-b border-slate-50 dark:border-slate-800/30 text-black ${isEven ? "bg-white dark:bg-[#161920]/40" : "bg-gray-200/50 dark:bg-white/[0.03]"}`}
                      >
                        <td className="px-5 pl-8 rounded-l-2xl h-[60px] text-left transition-colors text-black font-bold text-[12px]">
                          <div className="flex items-center gap-3 text-black">
                            {row.projectDescription || row.description || "—"}
                          </div>
                        </td>
                        <td className="px-5 rounded-r-2xl h-[60px] text-center transition-colors text-black">
                          <ActionsMenu
                            onEdit={() => handleEdit(row)}
                            onDelete={() => {
                              setActionItem(row);
                              setActionType("delete");
                            }}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination Section */}
        <div className="px-6 py-4 bg-white/80 dark:bg-[#161920] border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between shrink-0 transition-colors rounded-b-3xl text-black">
          <div className="flex items-center gap-4 text-black">
            <div className="flex items-center gap-2.5 text-black">
              <span className="text-[10px] font-black uppercase tracking-widest text-black">Page Size:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="px-3 h-7 text-[10px] font-black bg-white dark:bg-slate-800 text-black border border-slate-200 dark:border-slate-700/50 rounded-lg outline-none transition-all cursor-pointer shadow-sm hover:border-black uppercase tracking-widest"
              >
                {[5, 10, 25, 50].map((s) => (
                  <option key={s} value={s} className="font-sans text-black">{s}</option>
                ))}
              </select>
            </div>

            <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-slate-800 text-black">
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

          <div className="flex items-center gap-1.5 text-black">
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800/50 p-1 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm text-black">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1 || loadingMappings}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-black hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="First Page"
              >
                <ChevronsLeft size={14} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loadingMappings}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-black hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Previous Page"
              >
                <ChevronLeft size={14} strokeWidth={2.5} />
              </button>

              <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1"></div>

              <div className="px-3 flex items-center gap-2 py-1 text-black">
                <span className="text-[10px] font-black text-black uppercase tracking-widest">Page</span>
                <div className="flex items-center gap-1.5 min-w-[40px] justify-center text-black">
                  <span className="text-[11px] font-black text-black tabular-nums leading-none">{page}</span>
                  <span className="text-[10px] font-black text-black">/</span>
                  <span className="text-[10px] font-black text-black tabular-nums leading-none">{Math.ceil(totalCount / pageSize) || 1}</span>
                </div>
              </div>

              <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1"></div>

              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(totalCount / pageSize) || loadingMappings}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-black hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Next Page"
              >
                <ChevronRight size={14} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => setPage(Math.ceil(totalCount / pageSize))}
                disabled={page >= Math.ceil(totalCount / pageSize) || loadingMappings}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-black hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Last Page"
              >
                <ChevronsRight size={14} strokeWidth={2.5} />
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
    </div>
  );
}
