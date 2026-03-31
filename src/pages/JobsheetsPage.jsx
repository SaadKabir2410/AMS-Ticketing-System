import { useState, useMemo, useEffect, useRef } from "react";
import ResourcePage from "../component/common/ResourcePage";
import { jobsheetsApi } from "../services/api/jobsheets";
import { usersApi } from "../services/api/users";
import { codesApi } from "../services/api/Code";
import codeDetailsApi from "../services/api/CodeDetails";
import { 
  AlertTriangle, 
  Search, 
  X, 
  ChevronDown, 
  Calendar, 
  Filter, 
  FileText, 
  ArrowRight,
  Download,
  RotateCcw
} from "lucide-react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";
import "flatpickr/dist/themes/dark.css";

import { useJobsheetReport } from "../component/hooks/useJobsheetReport";

export default function JobsheetsPage() {
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [filters, setFilters] = useState({
    project: "",
    dateFrom: "",
    dateTo: "",
    collaborator: "",
  });

  const [collaboratorSearch, setCollaboratorSearch] = useState("");
  const [collaboratorResults, setCollaboratorResults] = useState([]);
  const [allCollaborators, setAllCollaborators] = useState([]);
  const [isSearchingCollaborators, setIsSearchingCollaborators] =
    useState(false);
  const [showCollaboratorDropdown, setShowCollaboratorDropdown] =
    useState(false);
  const [hasFetchedUsers, setHasFetchedUsers] = useState(false);
  const collaboratorRef = useRef(null);

  // Fetch projects on mount
  useEffect(() => {
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
        console.error("Error loading projects:", err);
      } finally {
        setLoadingProjects(false);
      }
    };
    loadProjects();
  }, []);

  const {
    reportData,
    reportLoading,
    reportError,
    fetchReport,
    clearReportData,
    clearReportError,
  } = useJobsheetReport();

  // Fetch all users ONCE when the dropdown is requested
  useEffect(() => {
    if (!showCollaboratorDropdown || hasFetchedUsers) return;

    const fetchUsers = async () => {
      setIsSearchingCollaborators(true);
      try {
        // Fetch all users for local filtering to avoid spamming the backend
        const data = await usersApi.getUsersList();
        const usersArray = Array.isArray(data) ? data : data.items || [];
        setAllCollaborators(usersArray);
        setHasFetchedUsers(true);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setIsSearchingCollaborators(false);
      }
    };

    fetchUsers();
  }, [showCollaboratorDropdown, hasFetchedUsers]);

  // Perform local filtering when typing
  useEffect(() => {
    if (!collaboratorSearch) {
      // Show top 50 or all when empty, slicing to improve performance if huge
      setCollaboratorResults(allCollaborators.slice(0, 50));
      return;
    }

    const lowerSearch = collaboratorSearch.toLowerCase();
    const filtered = allCollaborators.filter((user) => {
      const fullName = `${user.name || ""} ${user.surname || ""}`.toLowerCase();
      const email = (user.email || "").toLowerCase();
      return fullName.includes(lowerSearch) || email.includes(lowerSearch);
    });

    // Limit to 50 results for the UI
    setCollaboratorResults(filtered.slice(0, 50));
  }, [collaboratorSearch, allCollaborators]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        collaboratorRef.current &&
        !collaboratorRef.current.contains(event.target)
      ) {
        setShowCollaboratorDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClear = () => {
    setFilters({ project: "", dateFrom: "", dateTo: "", collaborator: "" });
    setCollaboratorSearch("");
  };

  const columns = useMemo(
    () => [
      {
        key: "date",
        label: "DATE",
        render: (val) => {
          if (!val) return "—";
          const d = new Date(val);
          return (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Calendar size={14} />
              </div>
              <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">
                {d.toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          );
        },
      },
      {
        key: "attendanceStatus",
        label: "ATTENDANCE",
        render: (val) => (
          <span
            className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
              val === "Present"
                ? "bg-green-50 text-green-600 border-green-100 dark:bg-green-500/10 dark:border-green-500/20"
                : val === "Absent"
                  ? "bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:border-red-500/20"
                  : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-white/5 dark:border-white/10"
            }`}
          >
            {val || "—"}
          </span>
        ),
      },
      {
        key: "createdBy",
        label: "CREATED BY",
        sortable: false,
        render: (val) => (
          <div className="flex items-center gap-2">
             <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">
                {(val || 'U').charAt(0)}
             </div>
             <span className="text-slate-600 dark:text-slate-300 text-[11px] font-semibold uppercase tracking-tight">
              {val || "—"}
             </span>
          </div>
        ),
      },
      {
        key: "totalDurationHours",
        label: "HRS",
        sortable: false,
        width: 80,
        render: (val) => (
          <span className="text-blue-600 dark:text-blue-400 font-mono font-black text-[12px]">
            {val ?? "—"}
          </span>
        ),
      },
      {
        key: "totalDurationMinutes",
        label: "MINS",
        sortable: false,
        width: 80,
        render: (val) => (
          <span className="text-indigo-600 dark:text-indigo-400 font-mono font-black text-[12px]">
            {val ?? "—"}
          </span>
        ),
      },
      {
        key: "creationTime",
        label: "CREATION TIME",
        render: (val) => {
          if (!val) return "—";
          return (
            <span className="text-slate-500 dark:text-slate-400 text-[10px] font-medium font-mono uppercase">
              {new Date(val).toLocaleString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          );
        },
      },
      {
        key: "holiday",
        label: "HOLIDAY",
        width: 100,
        render: (val) => (
          <span
            className={`px-2 py-0.5 rounded-lg text-[9px] font-black border transition-all ${
              val
                ? "bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-500/10 dark:border-purple-500/20"
                : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-white/5 dark:border-white/10"
            }`}
          >
            {val ? "YES" : "NO"}
          </span>
        ),
      },
    ],
    [],
  );

  const filterInputClass =
    "pl-3 pr-8 py-2 text-[11px] bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400 shadow-sm w-full font-semibold text-slate-700 dark:text-slate-200";

  const customFilterArea = (
    <div className="flex items-center gap-3 bg-slate-50/30 dark:bg-[#0f172a]/50 p-3 rounded-[20px] border border-slate-100 dark:border-white/5 backdrop-blur-sm shadow-inner w-full overflow-hidden flex-nowrap">
      {/* Project Filter */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5 shrink-0">
            <Filter size={10} className="text-blue-500" />
            Project
          </label>
          <div className="relative group/select">
            <select
              value={filters.project}
              onChange={(e) =>
                setFilters({ ...filters, project: e.target.value })
              }
              className={`${filterInputClass} appearance-none cursor-pointer pr-8`}
              disabled={loadingProjects}
            >
              <option value="" className="bg-white dark:bg-[#0f172a]">
                {loadingProjects ? "Loading Projects..." : "All Projects"}
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-white dark:bg-[#0f172a]">
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover/select:text-blue-500 transition-colors" />
          </div>
        </div>
      </div>

      {/* Date From */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5 shrink-0">
            <Calendar size={10} className="text-indigo-500" />
            From
          </label>
          <div className="relative group/date">
            <Flatpickr
              value={filters.dateFrom}
              onChange={([date]) => {
                if (date) {
                  const formatted = date.toISOString().split('T')[0];
                  setFilters({ ...filters, dateFrom: formatted });
                } else {
                  setFilters({ ...filters, dateFrom: "" });
                }
              }}
              options={{ dateFormat: "Y-m-d", allowInput: true }}
              placeholder="Start Date..."
              className={filterInputClass}
            />
            <Calendar size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover/date:text-indigo-500 transition-colors" />
          </div>
        </div>
      </div>

      {/* Date To */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5 shrink-0">
            <ArrowRight size={10} className="text-indigo-600" />
            To
          </label>
          <div className="relative group/date">
            <Flatpickr
              value={filters.dateTo}
              onChange={([date]) => {
                if (date) {
                  const formatted = date.toISOString().split('T')[0];
                  setFilters({ ...filters, dateTo: formatted });
                } else {
                  setFilters({ ...filters, dateTo: "" });
                }
              }}
              options={{ dateFormat: "Y-m-d", allowInput: true }}
              placeholder="End Date..."
              className={filterInputClass}
            />
            <Calendar size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover/date:text-indigo-500 transition-colors" />
          </div>
        </div>
      </div>

      {/* Collaborators */}
      <div className="flex-1 min-w-0 relative" ref={collaboratorRef}>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5 shrink-0">
            <Search size={10} className="text-purple-500" />
            Collaborators
          </label>
          <div className="relative group/collab">
            <input
              type="text"
              placeholder="Search User..."
              value={collaboratorSearch}
              onFocus={() => setShowCollaboratorDropdown(true)}
              onChange={(e) => {
                const val = e.target.value;
                setCollaboratorSearch(val);
                setShowCollaboratorDropdown(true);
                if (val === "") setFilters({ ...filters, collaborator: "" });
              }}
              className={`${filterInputClass} pr-10`}
            />
            {collaboratorSearch ? (
              <X 
                size={12} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 cursor-pointer transition-colors" 
                onClick={() => {
                  setCollaboratorSearch("");
                  setFilters({ ...filters, collaborator: "" });
                }}
              />
            ) : (
              <Search size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover/collab:text-purple-500 transition-colors pointer-events-none" />
            )}
          </div>
          {showCollaboratorDropdown && (
            <div className="absolute top-[105%] left-0 w-full bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-white/10">
              {collaboratorResults.length > 0 ? (
                collaboratorResults.map((user) => (
                  <div
                    key={user.id}
                    className="px-4 py-2.5 text-[11px] text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 cursor-pointer border-b border-slate-50 dark:border-white/5 last:border-0 transition-colors"
                    onClick={() => {
                      const name = user.name + (user.surname ? ` ${user.surname}` : "");
                      setCollaboratorSearch(name);
                      setFilters({ ...filters, collaborator: user.id });
                      setShowCollaboratorDropdown(false);
                    }}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-[11px] dark:text-white uppercase tracking-tight">
                        {user.name} {user.surname}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium lowercase">
                        {user.email || 'no email'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-[10px] text-slate-400 font-black uppercase tracking-widest italic">
                  {isSearchingCollaborators ? "Searching..." : "No matches"}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Clear Button */}
      <button
        onClick={handleClear}
        className="px-4 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-xl text-slate-500 dark:text-slate-400 hover:text-blue-500 hover:border-blue-500/30 transition-all active:scale-95 text-[9px] font-black uppercase tracking-widest shadow-sm flex items-center justify-center h-[34px] self-end gap-2 shrink-0 group/clear"
        title="Reset All"
      >
        <RotateCcw size={12} className="group-hover/clear:-rotate-45 transition-transform" />
        Clear
      </button>
    </div>
  );

  const extraParams = useMemo(() => {
    const p = {};
    if (filters.project) p.Project = filters.project;
    if (filters.dateFrom) p.FromDate = filters.dateFrom;
    if (filters.dateTo) p.ToDate = filters.dateTo;
    if (filters.collaborator) p.UserIdsSearchValues = filters.collaborator;
    return p;
  }, [filters]);

  const headerActions = (
    <div className="flex items-center gap-2">
      {reportError && (
        <div className="text-red-500 text-xs flex items-center bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-xl">
          <AlertTriangle size={14} className="mr-1.5" />
          {reportError}
          <button
            onClick={clearReportError}
            className="ml-2 text-red-700 hover:text-red-900"
          >

          </button>
        </div>
      )}
      <button
        type="button"
        className="flex items-center justify-center px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 dark:text-slate-200 text-xs rounded-xl shadow-sm transition-all active:scale-95"
        onClick={() => fetchReport(filters, true)}
        disabled={reportLoading}
      >
        {reportLoading ? "Generating..." : "Get Report"}
      </button>
    </div>
  );

  // Auto-detect array for the generic report data table
  let tableData = [];
  if (Array.isArray(reportData)) tableData = reportData;
  else if (reportData && Array.isArray(reportData.items))
    tableData = reportData.items;
  else if (reportData && Array.isArray(reportData.data))
    tableData = reportData.data;

  const reportColumns = tableData.length > 0 ? Object.keys(tableData[0]) : [];

  return (
    <div className="h-full flex flex-col bg-[#f1f5f9] dark:bg-black transition-colors duration-500">
      <ResourcePage
        title="Jobsheets"
        apiObject={jobsheetsApi}
        columns={columns}
        searchPlaceholder="Global Jobsheet Search..."
        breadcrumb={["Home", "Management", "Jobsheets"]}
        showSearchBar={false}
        customFilterArea={customFilterArea}
        customHeaderActions={headerActions}
        extraParams={extraParams}
        showActions={true}
        initialPageSize={10}
        showPagination={true}
        smallHeaderButton={true}
        entityName="Jobsheet"
        wideSearch="full"
        containerClassName="bg-white dark:bg-[#020617] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col flex-1 m-4 mr-1 ml-4 mb-4"
      />

      {/* Report Data Modal Implementation */}
      {reportData && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div 
             className="absolute inset-0 bg-slate-900/40 dark:bg-black/80 backdrop-blur-md" 
             onClick={clearReportData}
          />
          
          <div className="relative bg-white dark:bg-[#0f172a] rounded-[32px] shadow-2xl max-w-7xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-white/10 animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="px-10 py-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-transparent shrink-0">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                    <FileText size={24} strokeWidth={2.5} />
                 </div>
                 <div>
                    <h2 className="text-[22px] font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">
                      Jobsheet Report
                    </h2>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
                       <span className="text-blue-500">{tableData.length}</span> records generated
                       <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                       Generated on {new Date().toLocaleDateString()}
                    </p>
                 </div>
              </div>
              
              <button
                onClick={clearReportData}
                className="p-3 text-slate-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl transition-all border border-transparent hover:border-red-100 dark:hover:border-red-500/20"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </div>

            {/* Modal Body / Table */}
            <div className="p-0 overflow-auto flex-1 bg-white dark:bg-transparent no-scrollbar">
              {tableData.length > 0 ? (
                <table className="w-full text-left border-collapse min-w-max">
                  <thead>
                    <tr className="sticky top-0 z-10">
                      {reportColumns.map((col) => (
                        <th
                          key={col}
                          className="bg-slate-50 dark:bg-[#1e293b] p-5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-white/5 whitespace-nowrap backdrop-blur-md"
                        >
                          {col.replace(/([A-Z])/g, ' $1').trim()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((row, i) => (
                      <tr
                        key={i}
                        className="group hover:bg-blue-50/30 dark:hover:bg-blue-500/5 border-b border-slate-50 dark:border-white/2 transition-colors last:border-0"
                      >
                        {reportColumns.map((col) => (
                          <td
                            key={col}
                            className="p-5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-50/50 dark:border-white/2 last:border-r-0 whitespace-nowrap"
                          >
                            {typeof row[col] === "object"
                              ? <pre className="text-[10px] opacity-60 font-mono">{JSON.stringify(row[col])}</pre>
                              : String(row[col] ?? "—")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-20 text-center gap-4">
                  <div className="w-20 h-20 rounded-[32px] bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-300 dark:text-slate-700 border border-slate-100 dark:border-white/5">
                    <Search size={32} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">No data available</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-600 mt-1 max-w-[240px]">Try adjusting your filters or search criteria to find what you're looking for.</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="px-10 py-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-transparent flex justify-end shrink-0">
               <button 
                  onClick={clearReportData}
                  className="px-8 py-2.5 bg-slate-800 dark:bg-white text-white dark:text-[#0f172a] rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-900/20 dark:shadow-white/10"
               >
                  Close Report
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none !important; }
        .no-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }
        .scrollbar-thin::-webkit-scrollbar { width: 6px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 10px; }
        .dark .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); }
      `}</style>
    </div>
  );
}
