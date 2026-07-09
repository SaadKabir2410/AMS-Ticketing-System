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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";



import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";
import "flatpickr/dist/themes/dark.css";
import { useAuth } from "../context/AuthContextHook";
import JobsheetModal from "../component/common/JobsheetModal";
import { ActionsMenu } from "../component/common/ResourcePage";




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





  const columns = useMemo(() => [
    {
      key: "date",
      label: "DATE",
      render: (val) => {
        if (!val) return "—";
        const d = new Date(val);
        return (
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-slate-900 dark:text-white uppercase tracking-tight">
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
          <span className="text-slate-900 dark:text-white text-[11px] font-semibold uppercase tracking-tight">
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
        <span className="text-slate-900 dark:text-white font-mono font-black text-[12px]">
          {val ?? "—"}
        </span>
      ),
    },
    {
      key: "totalDurationMinutes",
      label: "Total Duration (Minutes)",
      sortable: false,
      render: (val) => (
        <span className="text-slate-900 dark:text-white font-mono font-black text-[12px]">
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
          <span className="text-slate-900 dark:text-white text-[10px] font-medium font-mono uppercase">
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
      render: (val) => {
        if (!val) return <span className="text-slate-300 dark:text-slate-700">—</span>;
        return (
          <span className="px-2 py-0.5 rounded-lg text-[9px] font-black border transition-all bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-500/10 dark:border-purple-500/20 uppercase tracking-wide">
            {val}
          </span>
        );
      },
    },
  ], []);

  const selectedUserNames = filters.user
    .map(id => allUsers.find(u => u.id === id))
    .filter(Boolean)
    .map(u => `${u.name || ''} ${u.surname || ''}`.trim());

  const userPlaceholder = selectedUserNames.length === 1
    ? selectedUserNames[0]
    : selectedUserNames.length > 1
      ? `${selectedUserNames.length} selected`
      : "Search User...";

  const selectedCollaboratorNames = filters.collaborator
    .map(id => allCollaborators.find(u => u.id === id))
    .filter(Boolean)
    .map(u => `${u.name || ''} ${u.surname || ''}`.trim());

  const collaboratorPlaceholder = selectedCollaboratorNames.length === 1
    ? selectedCollaboratorNames[0]
    : selectedCollaboratorNames.length > 1
      ? `${selectedCollaboratorNames.length} selected`
      : "Search Collaborator...";

  const filterInputClass =
    "pl-3 pr-8 py-2 text-[11px] bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500 transition-all placeholder:text-slate-400 shadow-sm w-full font-semibold text-slate-700 dark:text-slate-200";

  const clearButtonClass = "absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10";

  const customFilterArea = (
    <div className="flex items-center gap-4 bg-slate-50/30 dark:bg-[#0f172a]/50 p-2.5 rounded-[22px] border border-slate-100 dark:border-slate-800 backdrop-blur-sm shadow-inner w-full flex-nowrap overflow-visible">

      {/* Project */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Project</label>
          <div className="relative">
            <select
              value={filters.project}
              onChange={(e) => setFilters({ ...filters, project: e.target.value })}
              className={`${filterInputClass} appearance-none cursor-pointer pr-8`}
              disabled={loadingProjects}
            >
              <option value="">{loadingProjects ? "Loading..." : "Choose An Option"}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {filters.project && (
              <button
                className={clearButtonClass}
                onClick={() => setFilters({ ...filters, project: "" })}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Date From */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Date From</label>
          <div className="relative">
            <Flatpickr
              value={filters.dateFrom}
              onChange={(dates, dateStr) => setFilters({ ...filters, dateFrom: dateStr })}
              options={{ dateFormat: "Y-m-d", allowInput: true }}
              placeholder="YYYY-MM-DD"
              className={filterInputClass}
            />
            {filters.dateFrom && (
              <button
                className={clearButtonClass}
                onClick={() => setFilters({ ...filters, dateFrom: "" })}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Date To */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Date To</label>
          <div className="relative">
            <Flatpickr
              value={filters.dateTo}
              onChange={(dates, dateStr) => setFilters({ ...filters, dateTo: dateStr })}
              options={{ dateFormat: "Y-m-d", allowInput: true }}
              placeholder="YYYY-MM-DD"
              className={filterInputClass}
            />
            {filters.dateTo && (
              <button
                className={clearButtonClass}
                onClick={() => setFilters({ ...filters, dateTo: "" })}
              >
                <X size={14} />
              </button>
            )}
          </div>
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
                placeholder={userPlaceholder}
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
                  className={clearButtonClass}
                  onClick={() => { setUserSearch(""); setFilters({ ...filters, user: [] }); }}
                >
                  <X size={14} />
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
              placeholder={collaboratorPlaceholder}
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
                className={clearButtonClass}
                onClick={() => { setCollaboratorSearch(""); setFilters({ ...filters, collaborator: [] }); }}
              >
                <X size={14} />
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

      {!user?.role?.toLowerCase().includes("admin") && (
        <button
          type="button"
          className="btn-flagship border-pink-200 dark:border-pink-500/20 text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-500/5 flex items-center gap-2"
          onClick={() => setShowModal(true)}
        >
          New Jobsheet
        </button>
      )}
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
      onClick: (row) => handleAction("view", row),
      className: "text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 font-bold",
    },
    {
      key: "audit",
      label: "Audit Log",
      onClick: (row) => handleAction("audit", row),
      className: "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 font-bold",
    },
  ];


  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(14);
  const [serverTotalCount, setServerTotalCount] = useState(0);

  // Initial load / Pagination change / Filter change
  useEffect(() => {
    const fetchGridData = async () => {
      setReportLoading(true);
      try {
        const finalFilters = isAdmin ? filters : { ...filters, user: [user?.id] };
        const selectedUserIds = finalFilters.user?.length > 0 ? finalFilters.user : undefined;
        const selectedCollabIds = finalFilters.collaborator?.length > 0 ? finalFilters.collaborator : undefined;

        // Combine user + collaborator IDs for the search (API searches across both fields)
        const combinedIds = [
          ...(finalFilters.user || []),
          ...(finalFilters.collaborator || []),
        ].filter(Boolean);
        const userIdsParam = combinedIds.length > 0 ? combinedIds : undefined;

        const data = await jobsheetsApi.getAll({
          page,
          perPage: pageSize,
          FromDate: finalFilters.dateFrom,
          ToDate: finalFilters.dateTo,
          Project: finalFilters.project,
          UserIdsSearchValues: selectedUserIds,
          JobsheetDetailUserIdsSearchValues: selectedCollabIds,
          CurrentUserId: user?.id,
        });
        setReportData(data);
        setServerTotalCount(data?.totalCount || data?.items?.length || 0);
      } catch (err) {
        console.error("Failed to load jobsheets:", err);
      } finally {
        setReportLoading(false);
      }
    };
    fetchGridData();
  }, [page, pageSize, isAdmin, user?.id, filters]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  const tableData = Array.isArray(reportData)
    ? reportData
    : reportData?.items || reportData?.data || [];

  const overrideData = tableData.map((t, i) => ({ ...t, id: t.id || i }));
  const totalCount = serverTotalCount;

  const paginatedData = overrideData; // We are now using server-side pagination

  return (
    <div className="min-h-full w-full bg-[#f8fafc] dark:bg-slate-950 p-1 pb-[10px] flex flex-col relative overflow-visible font-[Arial] text-slate-900 dark:text-white">
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
        .no-scrollbar::-webkit-scrollbar { display: none !important; }
        .no-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }
      `}</style>

      <div className="flex-1 w-full bg-white dark:bg-[#161920] border border-slate-200 dark:border-slate-800/50 shadow-sm flex flex-col rounded-3xl">

        {/* Header */}
        <div className="flex flex-col gap-6 py-8 px-4 md:px-8 transition-colors border-b border-slate-100 dark:border-slate-800/50">
          <nav className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-600 mb-1 flex-wrap">
            <span onClick={() => navigate("/")} className="hover:opacity-80 cursor-pointer transition-all hover:text-pink-500">Home</span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-slate-500 dark:text-slate-400">Management</span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-pink-500 font-black">Jobsheets</span>
          </nav>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-black tracking-tighter">
                Jobsheets
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {headerActions}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="relative z-20 px-4 py-4 sm:px-6 sm:py-6 flex items-center justify-between bg-transparent shrink-0 flex-wrap gap-4 sm:gap-6">
          <div className="flex items-center gap-4 sm:gap-6 flex-1 min-w-[200px]">
            {customFilterArea}
          </div>
        </div>

        {/* Table */}
        <div className="flex flex-col w-full h-auto relative">
          {reportLoading && !reportData ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] animate-pulse py-20 w-full">
              Refreshing data...
            </div>
          ) : !overrideData || overrideData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] py-20 w-full">
              No jobsheets found.
            </div>
          ) : (
            <div className="overflow-x-auto px-4 pb-4 pt-2 custom-scrollbar w-full h-full">
              <div className="min-w-max flex flex-col">
                <table className="text-left border-separate border-spacing-y-1 table-auto text-[11px] transition-opacity duration-200">
                  <thead className="sticky top-0 z-10 text-slate-500 dark:text-slate-400">
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-[56px]">
                      {columns.map((col, idx) => (
                        <th key={col.key} className={`px-5 h-[56px] text-[10px] font-black uppercase tracking-widest text-left ${idx === 0 ? "pl-8" : ""}`}>
                          {col.label}
                        </th>
                      ))}
                      <th className="w-[120px] px-5 h-[56px] text-[10px] font-black uppercase tracking-widest text-center">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((row, idx) => {
                      const isEven = idx % 2 === 0;
                      return (
                        <tr
                          key={row.id || idx}
                          className={`group transition-all duration-200 h-[60px] border-b border-slate-50 dark:border-slate-800/30 ${isEven ? "bg-white dark:bg-[#161920]/40" : "bg-gray-200/50 dark:bg-white/[0.03]"}`}
                        >
                          {columns.map((col, colIdx) => (
                            <td key={col.key} className={`px-5 h-[60px] text-left transition-colors font-bold text-[12px] text-slate-700 dark:text-slate-200 ${colIdx === 0 ? "pl-8 rounded-l-2xl" : ""}`}>
                              {col.render ? col.render(row[col.key], row) : (row[col.key] || "—")}
                            </td>
                          ))}
                          <td className="w-[120px] px-5 rounded-r-2xl h-[60px] text-center transition-colors">
                            <ActionsMenu
                              customActions={customActions.map(ca => ({ ...ca, onClick: () => ca.onClick(row) }))}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Pagination Section */}
        {totalCount > 0 && (
          <div className="px-6 py-4 bg-white/80 dark:bg-[#161920] border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between shrink-0 transition-colors rounded-b-3xl">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Page Size:</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="px-3 h-7 text-[10px] font-black bg-white dark:bg-slate-800 text-pink-600 dark:text-pink-400 border border-slate-200 dark:border-slate-700/50 rounded-lg outline-none transition-all cursor-pointer shadow-sm hover:border-pink-500/50 uppercase tracking-widest"
                >
                  {[10, 14, 25, 50, 100].map((s) => (
                    <option key={s} value={s} className="font-sans text-slate-900 dark:text-white">{s}</option>
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
                  <span className="text-slate-400 dark:text-slate-500 mx-2 lowercase font-bold tracking-normal italic">of</span>
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
                  disabled={page === 1 || reportLoading}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  title="First Page"
                >
                  <ChevronsLeft size={14} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || reportLoading}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  title="Previous Page"
                >
                  <ChevronLeft size={14} strokeWidth={2.5} />
                </button>

                <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1"></div>

                <div className="px-3 flex items-center gap-2 py-1">
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Page</span>
                  <div className="flex items-center gap-1.5 min-w-[40px] justify-center">
                    <span className="text-[11px] font-black text-pink-600 dark:text-pink-400 tabular-nums leading-none">{page}</span>
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-600">/</span>
                    <span className="text-[10px] font-black text-slate-900 dark:text-white tabular-nums leading-none">{Math.ceil(totalCount / pageSize) || 1}</span>
                  </div>
                </div>

                <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1"></div>

                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(totalCount / pageSize) || reportLoading}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  title="Next Page"
                >
                  <ChevronRight size={14} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => setPage(Math.ceil(totalCount / pageSize) || 1)}
                  disabled={page >= Math.ceil(totalCount / pageSize) || reportLoading}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  title="Last Page"
                >
                  <ChevronsRight size={14} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <JobsheetModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSave={() => {
          fetchReport();
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



