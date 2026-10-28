import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { taskCategoryProjectsApi } from "../services/api/taskCategoryProjects";
import codeDetailsApi from "../services/api/CodeDetails";
import { useToast } from "../component/common/ToastContext";
import { ActionsMenu } from "../component/common/ResourcePage";
import TaskCategoryProjectModal from "../component/common/TaskCategoryProjectModal";
import DeleteConfirmModal from "../component/common/DeleteConfirmation";
import PremiumErrorAlert from "../component/common/PremiumErrorAlert";
import { Plus } from "lucide-react";
import { usePermission } from "../hooks/usePermission";
import { getApiErrorMessage } from "../utils/apiError";
import AppSelect from "../component/common/AppSelect";
import ListPager from "../component/common/ListPager";
import { useBackendLocalization } from "../hooks/useBackendLocalization";

export default function TaskCategoryProjectsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const localize = useBackendLocalization("Billing");
  // Like ABP, a key the backend does not define is shown as the key itself.
  const text = (key) => localize(key) || key;
  const canCreate = usePermission("Billing.TaskCategoryProjects.Create");
  const canEdit = usePermission("Billing.TaskCategoryProjects.Edit");
  const canDelete = usePermission("Billing.TaskCategoryProjects.Delete");

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
  const [pageError, setPageError] = useState("");

  const loadProjects = useCallback(async () => {
    setPageError("");
    setLoadingProjects(true);
    try {
      const details = await codeDetailsApi.getAll({ lookupCode: "PRJ" });
      setProjects(details.map((d) => ({ id: d.id, name: d.description || d.newCode })));
    } catch (err) {
      const message = getApiErrorMessage(err);
      if (message) setPageError(message);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  const fetchMappings = useCallback(async () => {
    setPageError("");
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
      const message = getApiErrorMessage(err);
      if (message) setPageError(message);
    } finally {
      setLoadingMappings(false);
    }
  }, [selectedProjectId, page, pageSize]);

  useEffect(() => { loadProjects(); }, [loadProjects]);
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
    setPageError("");
    setActionLoading(true);
    try {
      await taskCategoryProjectsApi.delete(actionItem.projectId || actionItem.id);
      toast(localize("OperationSuccessfull"));
      fetchMappings();
    } catch (err) {
      const message = getApiErrorMessage(err);
      if (message) setPageError(message);
    } finally {
      setActionLoading(false);
      setActionItem(null);
      setActionType("");
    }
  };

  const breadcrumb = [
    { key: "Home", isHome: true },
    { key: "Menu:Administration" },
    { key: "Lookups" },
    { key: "TaskCategoryProjects" },
  ];

  return (
    <div className="min-h-full w-full bg-[#f8fafc] dark:bg-slate-950 p-1 pb-[10px] flex flex-col relative overflow-visible font-[Arial] text-slate-900 dark:text-white">
      {pageError && (
        <PremiumErrorAlert
          open={!!pageError}
          message={pageError}
          onClose={() => setPageError("")}
        />
      )}
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
                      ? "text-pink-500 font-black"
                      : b.isHome
                        ? "hover:opacity-80 cursor-pointer transition-all hover:text-pink-500"
                        : "text-slate-500 dark:text-slate-400"
                  }
                >
                  {text(b.key)}
                </span>
                {i < breadcrumb.length - 1 && <span className="text-slate-300 dark:text-slate-700">/</span>}
              </span>
            ))}
          </nav>
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-black tracking-tighter">
              {localize("TaskCategoryProjects")}
            </h1>
            <div className="flex items-center gap-4">
              {canCreate && (
                <button
                  onClick={handleNew}
                  className="app-primary-button inline-flex items-center px-5 py-2.5 text-xs"
                >
                  <Plus size={16} className="mr-2" strokeWidth={3} />
                  {localize("NewTaskCategoryProject")}
                </button>
              )}
            </div>
          </div>

          {/* Project Filter */}
          <div className="flex items-end gap-3 w-full max-w-3xl">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[9.5px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none px-1">
                {localize("ProjectId")}
              </label>
              <div className="relative">
                <AppSelect
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  disabled={loadingProjects}
                  className="w-full h-10 appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold rounded-lg pl-3 pr-8 outline-none transition-all cursor-pointer shadow-sm text-slate-900 dark:text-white focus:border-pink-500"
                >
                  <option value="">{localize("SelectBoxEmptyValueText")}</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </AppSelect>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </div>
            </div>
            <button
              onClick={handleClear}
              className="app-primary-button h-10 px-4 inline-flex items-center justify-center text-xs shrink-0"
            >
              {localize("ClearFilter")}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex flex-col w-full h-auto relative">
          {loadingMappings ? (
            <div className="flex-1 flex items-center justify-center text-[11px] font-black uppercase tracking-[0.2em] animate-pulse py-20 text-slate-500 dark:text-slate-400">
              {localize("LoadingWithThreeDot")}
            </div>
          ) : mappings.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-[11px] font-black uppercase tracking-[0.2em] py-20 text-slate-500 dark:text-slate-400">
              {localize("NoDataAvailableInDatatable")}
            </div>
          ) : (
            <div className="overflow-x-auto px-4 pb-4 pt-2 custom-scrollbar">
              <table className="w-full min-w-[560px] table-fixed text-left border-separate border-spacing-y-1 text-[11px]">
                <colgroup>
                  <col style={{ width: '80%' }} />
                  <col style={{ width: '20%' }} />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-[56px] text-slate-500 dark:text-slate-400">
                    <th className="px-5 pl-10 h-[56px] text-[10px] font-black uppercase tracking-widest text-left">{localize("ProjectName")}</th>
                    <th className="px-5 h-[56px] text-[10px] font-black uppercase tracking-widest text-center">{localize("Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, idx) => {
                    const isEven = idx % 2 === 0;
                    return (
                      <tr
                        key={row.projectId || idx}
                        className={`group transition-all duration-200 h-[60px] border-b border-slate-50 dark:border-slate-800/30 ${isEven ? "bg-white dark:bg-[#161920]/40" : "bg-gray-200/50 dark:bg-white/[0.03]"}`}
                      >
                        <td className="px-5 pl-10 rounded-l-2xl h-[60px] text-left transition-colors font-bold text-[12px]">
                          <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                            {row.projectDescription || row.description || "—"}
                          </div>
                        </td>
                        <td className="px-5 rounded-r-2xl h-[60px] text-center transition-colors">
                          <ActionsMenu
                            onEdit={canEdit ? () => handleEdit(row) : undefined}
                            onDelete={canDelete ? () => {
                              setActionItem(row);
                              setActionType("delete");
                            } : undefined}
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

        <ListPager
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          loading={loadingMappings}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
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
          title={localize("DeleteButtonText")}
          message={localize("DeleteConfirmationMessage")}
          confirmText={localize("DeleteButtonText")}
          cancelText={localize("CancelButtonText")}
          processingText={localize("ProcessingWithThreeDot")}
          blurBackdrop={false}
          onClose={() => { setActionItem(null); setActionType(""); }}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
