import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom"; // Add this
import ResourcePage from "../component/common/ResourcePage";

import { jobsheetsApi } from "../services/api/jobsheets";
import { usersApi } from "../services/api/users";
import { codesApi } from "../services/api/Code";
import codeDetailsApi from "../services/api/CodeDetails";
import {
  AlertTriangle,
  Search,
  X,
  Calendar,
  FileText,
  History,
  Eye,
} from "lucide-react";



import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";
import "flatpickr/dist/themes/dark.css";
import { useAuth } from "../context/AuthContextHook";
import JobsheetModal from "../component/common/JobsheetModal";




export default function JobsheetsPage() {
  const { user } = useAuth();
  const navigate = useNavigate(); // Add this
  const isAdmin = user?.role?.toLowerCase().includes("admin");



  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const [filters, setFilters] = useState({
    user: [],
    collaborator: [],
    project: "",
    dateFrom: "",
    dateTo: "",
  });

  // ── User dropdown (Vendor-Sureze only) ──
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [hasFetchedUsers, setHasFetchedUsers] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userRef = useRef(null);

  // ── Collaborator dropdown (all users) ──
  const [collaboratorSearch, setCollaboratorSearch] = useState("");
  const [collaboratorResults, setCollaboratorResults] = useState([]);
  const [allCollaborators, setAllCollaborators] = useState([]);
  const [hasFetchedCollaborators, setHasFetchedCollaborators] = useState(false);
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(false);
  const [showCollaboratorDropdown, setShowCollaboratorDropdown] = useState(false);
  const collaboratorRef = useRef(null);

  // ── Report state ──
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);
  const clearReportData = () => setReportData(null);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedJobsheet, setSelectedJobsheet] = useState(null);




  // ── Fetch projects on mount ──
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

  // ── Fetch Vendor-Sureze users ONCE when User dropdown opens ──
  useEffect(() => {
    if (!showUserDropdown || hasFetchedUsers) return;
    const fetch = async () => {
      setIsLoadingUsers(true);
      try {
        const data = await usersApi.getUsersList({ organizationTypes: [2] });
        const arr = Array.isArray(data) ? data : data.items || [];
        setAllUsers(arr);
        setHasFetchedUsers(true);
      } catch (err) {
        console.error("Error fetching vendor users:", err);
      } finally {
        setIsLoadingUsers(false);
      }
    };
    fetch();
  }, [showUserDropdown, hasFetchedUsers]);

  // ── Fetch all users ONCE when Collaborator dropdown opens ──
  useEffect(() => {
    if (!showCollaboratorDropdown || hasFetchedCollaborators) return;
    const fetch = async () => {
      setIsLoadingCollaborators(true);
      try {
        const data = await usersApi.getUsersList();
        const arr = Array.isArray(data) ? data : data.items || [];
        setAllCollaborators(arr);
        setHasFetchedCollaborators(true);
      } catch (err) {
        console.error("Error fetching collaborators:", err);
      } finally {
        setIsLoadingCollaborators(false);
      }
    };
    fetch();
  }, [showCollaboratorDropdown, hasFetchedCollaborators]);

  // ── Local filter for User dropdown ──
  useEffect(() => {
    if (!userSearch) {
      setUserResults(allUsers.slice(0, 50));
    } else {
      const lower = userSearch.toLowerCase();
      setUserResults(
        allUsers.filter((u) => {
          const full = `${u.name || ""} ${u.surname || ""}`.toLowerCase();
          return full.includes(lower) || (u.email || "").toLowerCase().includes(lower);
        }).slice(0, 50)
      );
    }
  }, [userSearch, allUsers]);

  // ── Local filter for Collaborator dropdown ──
  useEffect(() => {
    if (!collaboratorSearch) {
      setCollaboratorResults(allCollaborators.slice(0, 50));
    } else {
      const lower = collaboratorSearch.toLowerCase();
      setCollaboratorResults(
        allCollaborators.filter((u) => {
          const full = `${u.name || ""} ${u.surname || ""}`.toLowerCase();
          return full.includes(lower) || (u.email || "").toLowerCase().includes(lower);
        }).slice(0, 50)
      );
    }
  }, [collaboratorSearch, allCollaborators]);

  // ── Click outside to close dropdowns independently ──
  useEffect(() => {
    function handleClickOutside(event) {
      if (userRef.current && !userRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
      if (collaboratorRef.current && !collaboratorRef.current.contains(event.target)) {
        setShowCollaboratorDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClear = () => {
    setFilters({
      user: [],
      collaborator: [],
      project: "",
      dateFrom: "",
      dateTo: "",
    });
    setUserSearch("");
    setCollaboratorSearch("");
  };

  // ── Fetch Report ──
  const fetchReport = async () => {
    setReportLoading(true);
    setReportError(null);
    try {
      // Non-admins can only see their own jobsheets
      const finalFilters = isAdmin 
        ? filters 
        : { ...filters, user: [user?.id] };

      const data = await jobsheetsApi.getReport({ filters: finalFilters, currentUserId: user?.id });
      setReportData(data);

    } catch (err) {
      setReportError(err?.message || "Failed to generate report.");
    } finally {
      setReportLoading(false);
    }
  };




  const columns = useMemo(() => [
    {
      key: "date",
      label: "DATE",
      render: (val) => {
        if (!val) return "—";
        const d = new Date(val);
        return (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-pink-50 dark:bg-pink-500/10 flex items-center justify-center text-pink-600 dark:text-pink-400">
              <Calendar size={14} />
            </div>
            <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">
              {d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          </div>
        );
      },
    },
    {
      key: "attendanceStatus",
      label: "ATTENDANCE",
      render: (val) => (
        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${val === "Present"
          ? "bg-green-50 text-green-600 border-green-100 dark:bg-green-500/10 dark:border-green-500/20"
          : val === "Absent"
            ? "bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:border-red-500/20"
            : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:border-slate-700"
          }`}>
          {val || "—"}
        </span>
      ),
    },
    {
      key: "userName",
      label: "CREATED BY",
      sortable: true, // paged api supports sorting
      render: (val) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">
            {(val || "U").charAt(0)}
          </div>
          <span className="text-slate-600 dark:text-slate-300 text-[11px] font-semibold uppercase tracking-tight">
            {val || "—"}
          </span>
        </div>
      ),
    },

    {
      key: "totalDurationHours",
      label: "Total Duration (Hours)",
      sortable: false,
      render: (val) => (
        <span className="text-pink-600 dark:text-pink-400 font-mono font-black text-[12px]">
          {val ?? "—"}
        </span>
      ),
    },
    {
      key: "totalDurationMinutes",
      label: "Total Duration (Minutes)",
      sortable: false,
      render: (val) => (
        <span className="text-pink-500/80 dark:text-pink-500/60 font-mono font-black text-[12px]">
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
              day: "2-digit", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </span>
        );
      },
    },
    {
      key: "holiday",
      label: "HOLIDAY",
      render: (val) => (
        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black border transition-all ${val
          ? "bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-500/10 dark:border-purple-500/20"
          : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700"
          }`}>
          {val ? "YES" : "NO"}
        </span>
      ),
    },
  ], []);

  const filterInputClass =
    "pl-3 pr-8 py-2 text-[11px] bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500 transition-all placeholder:text-slate-400 shadow-sm w-full font-semibold text-slate-700 dark:text-slate-200";

  const customFilterArea = (
    <div className="flex items-center gap-4 bg-slate-50/30 dark:bg-[#0f172a]/50 p-2.5 rounded-[22px] border border-slate-100 dark:border-slate-800 backdrop-blur-sm shadow-inner w-full flex-nowrap overflow-visible">

      {/* Project */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Project</label>
          <select
            value={filters.project}
            onChange={(e) => setFilters({ ...filters, project: e.target.value })}
            className={`${filterInputClass} appearance-none cursor-pointer pr-3`}
            disabled={loadingProjects}
          >
            <option value="">{loadingProjects ? "Loading..." : "All Projects"}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Date From */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Date From</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            onClick={(e) => e.target.showPicker && e.target.showPicker()}
            className={filterInputClass}
          />
        </div>
      </div>

      {/* Date To */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Date To</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            onClick={(e) => e.target.showPicker && e.target.showPicker()}
            className={filterInputClass}
          />
        </div>
      </div>

      {/* User — Vendor-Sureze only (ADMIN ONLY) */}
      {isAdmin && (
        <div className="flex-1 min-w-0 relative" ref={userRef}>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">User</label>
            <div className="relative">
              <input
                type="text"
                placeholder={filters.user.length > 0 ? `${filters.user.length} selected` : "Search User..."}
                value={userSearch}
                onFocus={() => setShowUserDropdown(true)}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setShowUserDropdown(true);
                }}
                className={filterInputClass}
              />
              {(userSearch || filters.user.length > 0) && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 text-[9px] font-black uppercase"
                  onClick={() => { setUserSearch(""); setFilters({ ...filters, user: [] }); }}
                >
                  Clear
                </button>
              )}
            </div>
            {showUserDropdown && (
              <div className="absolute top-[105%] left-0 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 max-h-56 overflow-y-auto no-scrollbar">
                {isLoadingUsers ? (
                  <div className="px-4 py-8 text-center text-[10px] text-slate-400 font-black uppercase tracking-widest">Loading...</div>
                ) : userResults.length > 0 ? (
                  userResults.map((u) => {
                    const isChecked = filters.user.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        className="px-4 py-2.5 cursor-pointer border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-pink-50 dark:hover:bg-pink-500/5 flex items-center gap-3 group"
                        onClick={() => {
                          const newUsers = isChecked
                            ? filters.user.filter(id => id !== u.id)
                            : [...filters.user, u.id];
                          setFilters({ ...filters, user: newUsers });
                        }}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isChecked ? 'bg-[#ec4899] border-[#ec4899]' : 'border-slate-200 dark:border-slate-700'}`}>
                          {isChecked && <div className="w-2 h-2 bg-white rounded-[1px] rotate-45 border-b-2 border-r-2" style={{ transform: 'rotate(45deg) translate(-1px, -1px)' }}></div>}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-[11px] text-slate-800 dark:text-white uppercase tracking-tight group-hover:text-[#ec4899] transition-colors">
                            {u.name} {u.surname}
                          </span>
                          <span className="text-[9px] text-slate-400 lowercase">{u.email || "no email"}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="px-4 py-8 text-center text-[10px] text-slate-400 font-black uppercase tracking-widest">No matches</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}


      {/* Collaborators — all users */}
      <div className="flex-1 min-w-0 relative" ref={collaboratorRef}>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Collaborators</label>
          <div className="relative">
            <input
              type="text"
              placeholder={filters.collaborator.length > 0 ? `${filters.collaborator.length} selected` : "Search User..."}
              value={collaboratorSearch}
              onFocus={() => setShowCollaboratorDropdown(true)}
              onChange={(e) => {
                setCollaboratorSearch(e.target.value);
                setShowCollaboratorDropdown(true);
              }}
              className={filterInputClass}
            />
            {(collaboratorSearch || filters.collaborator.length > 0) && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 text-[9px] font-black uppercase"
                onClick={() => { setCollaboratorSearch(""); setFilters({ ...filters, collaborator: [] }); }}
              >
                Clear
              </button>
            )}
          </div>
          {showCollaboratorDropdown && (
            <div className="absolute top-[105%] left-0 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 max-h-56 overflow-y-auto no-scrollbar">
              {isLoadingCollaborators ? (
                <div className="px-4 py-8 text-center text-[10px] text-slate-400 font-black uppercase tracking-widest">Loading...</div>
              ) : collaboratorResults.length > 0 ? (
                collaboratorResults.map((u) => {
                  const isChecked = filters.collaborator.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      className="px-4 py-2.5 cursor-pointer border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-pink-50 dark:hover:bg-[#ec4899]/5 flex items-center gap-3 group"
                      onClick={() => {
                        const newCollabs = isChecked
                          ? filters.collaborator.filter(id => id !== u.id)
                          : [...filters.collaborator, u.id];
                        setFilters({ ...filters, collaborator: newCollabs });
                      }}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isChecked ? 'bg-[#ec4899] border-[#ec4899]' : 'border-slate-200 dark:border-slate-700'}`}>
                        {isChecked && <div className="w-2 h-2 bg-white rounded-[1px] rotate-45 border-b-2 border-r-2" style={{ transform: 'rotate(45deg) translate(-1px, -1px)' }}></div>}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-[11px] text-slate-800 dark:text-white uppercase tracking-tight group-hover:text-[#ec4899] transition-colors">
                          {u.name} {u.surname}
                        </span>
                        <span className="text-[9px] text-slate-400 lowercase">{u.email || "no email"}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-4 py-8 text-center text-[10px] text-slate-400 font-black uppercase tracking-widest">No matches</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Clear All */}
      <button
        onClick={handleClear}
        className="btn-flagship border-slate-200! dark:border-slate-800! text-slate-500! hover:text-pink-600! hover:border-pink-500/30! self-end"
      >
        Clear All
      </button>
    </div>
  );

  const extraParams = useMemo(() => {
    const p = {};
    if (user?.id) p.CurrentUserId = user.id;
    if (filters.project) p.Project = filters.project;
    if (filters.dateFrom) p.FromDate = filters.dateFrom;
    if (filters.dateTo) p.ToDate = filters.dateTo;
    if (filters.collaborator) p.UserIdsSearchValues = filters.collaborator;
    
    // Force current user if not admin
    p.userId = isAdmin ? filters.user : [user?.id];
    
    return p;
  }, [filters, user, isAdmin]);


  const headerActions = (
    <div className="flex items-center gap-2">
      {reportError && (
        <div className="text-red-500 text-xs flex items-center bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-xl">
          <AlertTriangle size={14} className="mr-1.5" />
          {reportError}
          <button onClick={clearReportError} className="ml-2 text-red-700 hover:text-red-900">
            <X size={12} />
          </button>
        </div>
      )}
      {reportData && (
        <button
          onClick={clearReportData}
          className="btn-flagship border-slate-200! dark:border-slate-800! text-slate-500! hover:text-red-500! hover:border-red-500/30!"
        >
          Close Report
        </button>
      )}
      {!user?.role?.toLowerCase().includes("admin") && (
        <button
          type="button"
          className="btn-flagship border-pink-200 dark:border-pink-500/20 text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-500/5 flex items-center gap-2"
          onClick={() => setShowModal(true)}
        >
          New Jobsheet
        </button>
      )}
      <button
        type="button"
        className="btn-flagship-solid"
        onClick={fetchReport}
        disabled={reportLoading}
      >
        {reportLoading ? "Generating..." : "Get Report"}
      </button>
    </div>
  );

  const handleAction = async (action, row) => {
    if (action === "view") {
      try {
        const fullData = await jobsheetsApi.getById(row.id);
        setSelectedJobsheet(fullData);
        setShowViewModal(true);
      } catch (error) {
        console.error("Failed to fetch jobsheet details:", error);
      }
    } else if (action === "audit") {
      navigate(`/audit-logs?primaryKey=${row.id}&entityName=Jobsheet`);
    }
  };



  const customActions = [
    {
      key: "view",
      label: "View",
      icon: <Eye size={14} />,
      onClick: (row) => handleAction("view", row),
      className: "text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10",
    },
    {
      key: "audit",
      label: "Audit Log",
      icon: <History size={14} />,
      onClick: (row) => handleAction("audit", row),
      className: "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10",
    },
  ];


  const tableData = Array.isArray(reportData)
    ? reportData
    : reportData?.items || reportData?.data || [];

  const overrideData = reportData ? tableData.map((t, i) => ({ ...t, id: t.id || i })) : null;
  const resourceRef = useRef(null);


  return (
    <div className="h-full flex flex-col bg-[#f1f5f9] dark:bg-black transition-colors duration-500">
      <ResourcePage
        ref={resourceRef}
        title="Jobsheets"
        apiObject={jobsheetsApi}
        columns={columns}
        searchPlaceholder="Global Jobsheet Search..."
        breadcrumb={["Home", "Management", "Jobsheets"]}
        showSearchBar={false}
        customFilterArea={customFilterArea}
        customHeaderActions={headerActions}
        extraParams={extraParams}
        overrideData={overrideData} // Keep for when report is explicitly requested
        loading={reportLoading}
        hideGrid={false}

        emptyMessage="No jobsheets found."
        showActions={true}
        showAuditLog={false}
        customActions={customActions}


        initialPageSize={14}


        showPagination={true}
        smallHeaderButton={true}
        entityName="Jobsheet"
        wideSearch="full"
        containerClassName="bg-white dark:bg-[#020617] rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col flex-1"
      />


      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none !important; }
        .no-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }
      `}</style>

      <JobsheetModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSave={() => {
          if (reportData) fetchReport();
          if (resourceRef.current?.refresh) {
            resourceRef.current.refresh();
          }
        }}
      />

      <JobsheetModal
        open={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedJobsheet(null);
        }}
        viewOnly={true}
        jobsheet={selectedJobsheet}
      />




    </div>
  );
}



