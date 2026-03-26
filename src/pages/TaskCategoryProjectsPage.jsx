import { useState, useMemo } from "react";
import ResourcePage from "../component/common/ResourcePage";
import { taskCategoryProjectsApi } from "../services/api/taskCategoryProjects";
import TaskCategoryProjectModal from "../component/common/TaskCategoryProjectModal";

export default function TaskCategoryProjectsPage() {
  const [projectFilter, setProjectFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const columns = useMemo(() => [
    { key: "name", label: "NAME" },
    { key: "project", label: "PROJECT" },
  ], []);

  const handleClear = () => {
    setProjectFilter("");
  };

  const extraParams = useMemo(() => {
    const p = {};
    if (projectFilter) p.project = projectFilter;
    return p;
  }, [projectFilter]);

  const customFilterArea = (
    <div className="flex items-end gap-3 w-full sm:w-auto mt-4 sm:mt-0 flex-1">
      <div className="flex flex-col flex-1 min-w-[300px] w-full max-w-[80%] relative">
        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
          PROJECT
        </span>
        <div className="relative w-full">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="w-full appearance-none bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-600/50 text-slate-700 dark:text-slate-300 text-xs rounded-lg pl-3 pr-8 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer box-border shadow-sm"
          >
            <option value="" className="text-slate-400">Choose An Option</option>
            <option value="AMS">AMS</option>
            <option value="central monitoring">central monitoring</option>
            <option value="LIS">LIS</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </div>
        </div>
      </div>
      
      <button
        onClick={handleClear}
        className="px-4 py-2 bg-white border border-[#5da3d5] text-[#5da3d5] hover:bg-blue-50/50 rounded-lg text-xs font-medium transition-colors shadow-sm shrink-0"
      >
        Clear
      </button>
    </div>
  );

  const customHeaderActions = (
    <button 
      onClick={() => setModalOpen(true)}
      className="px-3 py-1.5 bg-white border border-blue-500 text-blue-500 hover:bg-blue-50 rounded-lg text-xs font-medium transition-colors shadow-sm shrink-0"
    >
      New Task Category Project
    </button>
  );

  return (
    <>
      <ResourcePage
        title="Task Category Projects"
        apiObject={taskCategoryProjectsApi}
        columns={columns}
        showPagination={true}
        showSearchBar={false}
        showActions={false}
        hideGrid={true}
        customFilterArea={customFilterArea}
        customHeaderActions={customHeaderActions}
        extraParams={extraParams}
        searchPlaceholder="Search task categories..."
        entityName="Task Category"
        breadcrumb={["Home", "Lookup", "Task Category Projects"]}
      />
      <TaskCategoryProjectModal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
      />
    </>
  );
}
