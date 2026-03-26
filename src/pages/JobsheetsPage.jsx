import { useState, useMemo, useEffect, useRef } from "react";
import ResourcePage from "../component/common/ResourcePage";
import { jobsheetsApi } from "../services/api/jobsheets";
import { usersApi } from "../services/api/users";

import { useJobsheetReport } from "../component/hooks/useJobsheetReport";

const PROJECTS = [
  { id: "11111111-1111-1111-1111-111111111111", name: "AMS" },
  { id: "22222222-2222-2222-2222-222222222222", name: "Central Monitoring" },
  { id: "33333333-3333-3333-3333-333333333333", name: "LIS" },
];

export default function JobsheetsPage() {
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
            <span className=" text-slate-800 dark:text-white ">
              {d.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          );
        },
      },
      {
        key: "attendanceStatus",
        label: "ATTENDANCE STATUS",
        render: (val) => (
          <span
            className={`px-2 py-0.5 rounded-lg text-[10px] border ${
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
          <span className="text-slate-600 dark:text-slate-300 text-sm">
            {val || "—"}
          </span>
        ),
      },
      {
        key: "totalDurationHours",
        label: "TOTAL DURATION (HOURS)",
        sortable: false,
        render: (val) => (
          <span className="text-blue-600 dark:text-blue-400 font-mono">
            {val ?? "—"}
          </span>
        ),
      },
      {
        key: "totalDurationMinutes",
        label: "TOTAL DURATION (MINUTES)",
        sortable: false,
        render: (val) => (
          <span className="text-indigo-600 dark:text-indigo-400 font-mono">
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
            <span className="text-slate-500 dark:text-slate-400 text-[11px] ">
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
        render: (val) => (
          <span
            className={`px-2 py-0.5 rounded-lg text-[9px] border ${
              val
                ? "bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-500/10"
                : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-white/5"
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
    "pl-3 pr-3 py-2 text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400 shadow-sm w-full";

  const customFilterArea = (
    <div className="flex flex-wrap items-center gap-4 flex-1 bg-slate-50/50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
      {/* Project Filter */}
      <div className="flex-1 min-w-[160px]">
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-400 mb-1 ml-1 ">Project</span>
          <select
            value={filters.project}
            onChange={(e) =>
              setFilters({ ...filters, project: e.target.value })
            }
            className={filterInputClass}
          >
            <option value="">choose an option</option>
            {PROJECTS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Date From */}
      <div className="flex-1 min-w-[160px]">
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-400 mb-1 ml-1 ">
            Date From
          </span>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) =>
              setFilters({ ...filters, dateFrom: e.target.value })
            }
            className={filterInputClass}
          />
        </div>
      </div>

      {/* Date To */}
      <div className="flex-1 min-w-[160px]">
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-400 mb-1 ml-1 ">Date To</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            className={filterInputClass}
          />
        </div>
      </div>

      {/* Collaborators */}
      <div className="flex-1 min-w-[160px] relative" ref={collaboratorRef}>
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-400 mb-1 ml-1 ">
            Collaborators
          </span>
          <div className="relative">
            <input
              type="text"
              placeholder="Search User..."
              value={collaboratorSearch}
              onFocus={() => setShowCollaboratorDropdown(true)}
              onChange={(e) => {
                const val = e.target.value;
                setCollaboratorSearch(val);
                setShowCollaboratorDropdown(true);
                // Only update the active Jobsheets filter if the user clears the input
                if (val === "") {
                  setFilters({ ...filters, collaborator: "" });
                }
              }}
              className={filterInputClass}
            />
            {isSearchingCollaborators && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                
              </div>
            )}
          </div>
          {showCollaboratorDropdown && (
            <div className="absolute top-[105%] left-0 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
              {collaboratorResults.length > 0 ? (
                collaboratorResults.map((user) => (
                  <div
                    key={user.id}
                    className="px-3 py-2 text-[11px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer border-b border-slate-100 dark:border-white/5 last:border-0"
                    onClick={() => {
                      const name =
                        user.name + (user.surname ? ` ${user.surname}` : "");
                      setCollaboratorSearch(name);
                      setFilters({ ...filters, collaborator: user.id });
                      setShowCollaboratorDropdown(false);
                    }}
                  >
                    <div className="flex flex-col">
                      <span>
                        {user.name} {user.surname}
                      </span>
                      <span className="text-[9px] text-slate-400 ">
                        {user.email}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-[10px] text-slate-400 transition-all duration-300">
                  {isSearchingCollaborators ? "Searching..." : "No users found"}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Clear Button */}
      <button
        onClick={handleClear}
        className="px-4 mt-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-400 hover:text-blue-500 hover:border-blue-500/30 transition-all active:scale-95 text-xs font-medium shadow-sm flex items-center justify-center h-[38px] min-w-[50px]"
        title="Clear Filters"
      >
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
    <>
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
      />

      {/* Report Data Modal for JSON Responses */}
      {reportData && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
              <h2 className="text-lg text-slate-800 dark:text-white">
                Jobsheet Report
              </h2>
              <button
                onClick={clearReportData}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all"
              >
                
              </button>
            </div>

            <div className="p-0 overflow-auto flex-1 bg-slate-50/50 dark:bg-slate-900">
              {tableData.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      {reportColumns.map((col) => (
                        <th
                          key={col}
                          className="sticky top-0 bg-white dark:bg-slate-800 p-3 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((row, i) => (
                      <tr
                        key={i}
                        className="hover:bg-white dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/50 transition-colors"
                      >
                        {reportColumns.map((col) => (
                          <td
                            key={col}
                            className="p-3 text-sm text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800/30 last:border-r-0 whitespace-nowrap"
                          >
                            {typeof row[col] === "object"
                              ? JSON.stringify(row[col])
                              : String(row[col] ?? "—")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-10 flex flex-col items-center justify-center text-center">
                  <span className="text-slate-400 "> No Results Found</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
