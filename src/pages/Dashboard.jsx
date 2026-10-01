import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  RefreshCw, CheckCircle2, MoreHorizontal, Calendar, CalendarCheck, BarChart3, BarChart4,
  CalendarDays, CalendarMinus, X, Users, Search
} from "lucide-react";
import dashboardApi from "../services/api/dashboardApi";
import usersApi from "../services/api/users";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContextHook";

// ─── Utility functions ────────────────────────────────────────────────────────
const parseDurationToMinutes = (value) => {
  if (!value || typeof value !== 'string') return 0;
  let totalMinutes = 0;
  const tokens = value.split(' ').filter(Boolean);
  for (const token of tokens) {
    if (token.toLowerCase().endsWith('h')) {
      totalMinutes += parseInt(token.slice(0, -1)) * 60;
    } else if (token.toLowerCase().endsWith('m')) {
      totalMinutes += parseInt(token.slice(0, -1));
    }
  }
  return totalMinutes || 0;
};

const calculateProgress = (timeStr, goalMinutes) => {
  if (!goalMinutes || goalMinutes <= 0) return 0;
  const minutes = parseDurationToMinutes(timeStr);
  return Math.min(100, Math.round((minutes / goalMinutes) * 100));
};

const formatMinutes = (totalMinutes) => {
  if (!totalMinutes || totalMinutes <= 0) return "0h 00m";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
};

const normalizeTime = (value) => {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "0h 0m";
  }
  return String(value);
};

const formatDate = (date) =>
  date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const getDashboardDateLabels = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayIndex = (today.getDay() + 6) % 7;
  const currentWeekStart = addDays(today, -dayIndex);
  const lastWeekStart = addDays(currentWeekStart, -7);
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  return {
    today: formatDate(today),
    yesterday: formatDate(addDays(today, -1)),
    currentWeek: `${formatDate(currentWeekStart)} - ${formatDate(addDays(currentWeekStart, 6))}`,
    lastWeek: `${formatDate(lastWeekStart)} - ${formatDate(addDays(lastWeekStart, 6))}`,
    currentMonth: `${formatDate(currentMonthStart)} - ${formatDate(currentMonthEnd)}`,
    previousMonth: `${formatDate(previousMonthStart)} - ${formatDate(previousMonthEnd)}`,
  };
};

const getUserLabel = (user) => {
  const fullName = [user?.name, user?.surname].filter(Boolean).join(" ").trim();
  return fullName || user?.userName || user?.email || "Unnamed user";
};

const normalizeDashboardResponse = (response) => {
  if (Array.isArray(response)) return response;

  const collection =
    response?.items ??
    response?.data ??
    response?.result ??
    response?.dashboards;

  if (Array.isArray(collection)) return collection;
  return response && typeof response === "object" ? [response] : [];
};

const userHasRole = (user, requiredRole) => {
  const roles = user?.roles ?? user?.role ?? [];
  const normalizedRoles = Array.isArray(roles)
    ? roles
    : String(roles).split(",");

  return normalizedRoles.some(
    (role) =>
      String(role).trim().toLowerCase() === requiredRole.toLowerCase(),
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = userHasRole(user, "admin");
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [showBanner, setShowBanner] = useState(true);

  // Admin state
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [isUserPickerOpen, setIsUserPickerOpen] = useState(false);
  const userPickerRef = useRef(null);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour === 12) return "Good Noon";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const loadAvailableUsers = useCallback(async () => {
    try {
      const users = await usersApi.getUsersList({ mustCompleteJobsheet: true });
      setAvailableUsers(users || []);
    } catch (e) {
      console.error("Failed to load users", e);
    }
  }, []);

  const loadDashboardData = useCallback(async (userIdsToLoad) => {
    try {
      setLoading(true);
      setDashboardError("");
      const data = await dashboardApi.getDashboardData(userIdsToLoad);
      setDashboards(normalizeDashboardResponse(data));
    } catch (e) {
      console.error("Failed to load dashboard data", e);
      setDashboards([]);
      setDashboardError(
        e.response?.data?.error?.message ||
          e.message ||
          "Dashboard data could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadAvailableUsers();
      // Admin dashboard stays empty until users are selected
      setLoading(false);
    } else {
      // Non-admin auto-loads their own dashboard
      if (user?.id) {
        setSelectedUserIds([user.id]);
        loadDashboardData([user.id]);
      }
    }
  }, [isAdmin, user?.id, loadAvailableUsers, loadDashboardData]);

  useEffect(() => {
    const closeUserPicker = (event) => {
      if (
        userPickerRef.current &&
        !userPickerRef.current.contains(event.target)
      ) {
        setIsUserPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", closeUserPicker);
    return () => document.removeEventListener("mousedown", closeUserPicker);
  }, []);

  const updateSelectedUsers = (nextUserIds) => {
    setSelectedUserIds(nextUserIds);
    if (nextUserIds.length > 0) {
      loadDashboardData(nextUserIds);
    } else {
      setDashboards([]);
      setDashboardError("");
    }
  };

  const toggleUser = (userId) => {
    const normalizedId = String(userId);
    const isSelected = selectedUserIds.some(
      (selectedId) => String(selectedId) === normalizedId,
    );
    const nextUserIds = isSelected
      ? selectedUserIds.filter(
          (selectedId) => String(selectedId) !== normalizedId,
        )
      : [...selectedUserIds, userId];

    updateSelectedUsers(nextUserIds);
  };

  const clearSelectedUsers = () => {
    updateSelectedUsers([]);
    setUserSearch("");
  };

  const removeUser = (userId) => {
    const nextUserIds = selectedUserIds.filter(
      (selectedId) => String(selectedId) !== String(userId),
    );
    updateSelectedUsers(nextUserIds);
  };

  const handleRefresh = () => {
    if (selectedUserIds.length > 0) {
      loadDashboardData(selectedUserIds);
    }
  };

  const selectedUsers = availableUsers.filter((availableUser) =>
    selectedUserIds.some(
      (selectedId) => String(selectedId) === String(availableUser.id),
    ),
  );
  const normalizedSearch = userSearch.trim().toLowerCase();
  const filteredUsers = availableUsers.filter((availableUser) =>
    [
      getUserLabel(availableUser),
      availableUser.userName,
      availableUser.email,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedSearch)),
  );

  if (loading && dashboards.length === 0 && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f6fa] dark:bg-slate-950">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const renderDashboardCards = (db) => {
    const dto = db.dashboard || {};
    const dates = getDashboardDateLabels();
    const periods = [
      {
        title: "Today",
        icon: Calendar,
        accent: "#1268e8",
        date: dates.today,
        ams: dto.amsTicketRelatedTimeToday,
        nonAms: dto.nonAMSTicketRelatedTimeToday,
        total: dto.totalTimeToday,
        goal: dto.dailyGoalMinutes
      },
      {
        title: "Yesterday",
        icon: CalendarCheck,
        accent: "#18b957",
        date: dates.yesterday,
        ams: dto.amsTicketRelatedTimeYesterday,
        nonAms: dto.nonAMSTicketRelatedTimeYesterday,
        total: dto.totalTimeYesterday,
        goal: dto.dailyGoalMinutes
      },
      {
        title: "Current Week",
        icon: BarChart3,
        accent: "#7445ed",
        date: dates.currentWeek,
        ams: dto.amsTicketRelatedTimeCurrentWeek,
        nonAms: dto.nonAMSTicketRelatedTimeCurrentWeek,
        total: dto.totalTimeCurrentWeek,
        goal: dto.weeklyGoalMinutes
      },
      {
        title: "Last Week",
        icon: BarChart4,
        accent: "#f08300",
        date: dates.lastWeek,
        ams: dto.amsTicketRelatedTimeLastWeek,
        nonAms: dto.nonAMSTicketRelatedTimeLastWeek,
        total: dto.totalTimeLastWeek,
        goal: dto.weeklyGoalMinutes
      },
      {
        title: "Current Month",
        icon: CalendarDays,
        accent: "#2487e8",
        date: dates.currentMonth,
        ams: dto.amsTicketRelatedTimeCurrentMonth,
        nonAms: dto.nonAMSTicketRelatedTimeCurrentMonth,
        total: dto.totalTimeCurrentMonth,
        goal: dto.monthlyGoalMinutes
      },
      {
        title: "Previous Month",
        icon: CalendarMinus,
        accent: "#60788d",
        date: dates.previousMonth,
        ams: dto.amsTicketRelatedTimePreviousMonth,
        nonAms: dto.nonAMSTicketRelatedTimePreviousMonth,
        total: dto.totalTimePreviousMonth,
        goal: dto.monthlyGoalMinutes
      }
    ];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
        {periods.map((period) => {
          const PeriodIcon = period.icon;
          const progress = calculateProgress(period.total, period.goal);
          return (
            <div
              key={period.title}
              className="min-h-[362px] rounded-xl border border-slate-200 bg-white p-5 shadow-[0_4px_14px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900 flex flex-col"
            >
              <h3
                className="mb-6 text-center text-base font-bold"
                style={{ color: period.accent }}
              >
                {period.title}
              </h3>

              <div className="mb-5 flex items-center gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: period.accent }}
                >
                  <PeriodIcon className="h-5 w-5" strokeWidth={2.4} />
                </div>
                <div className="min-w-0">
                  <div className="text-[27px] font-extrabold leading-tight text-slate-900 dark:text-white">
                    {normalizeTime(period.total)}
                  </div>
                  <div className="mt-1 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                    of {formatMinutes(period.goal)} goal
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-4 text-sm dark:border-slate-700 dark:bg-slate-800/60">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: period.accent }} />
                    AMS
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{normalizeTime(period.ams)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    Non-AMS
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{normalizeTime(period.nonAms)}</span>
                </div>
              </div>

              <div className="mt-auto pt-7">
                <div className="flex items-center gap-4">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${progress}%`, backgroundColor: period.accent }}
                    />
                  </div>
                  <span className="min-w-8 text-right text-sm font-bold" style={{ color: period.accent }}>
                    {progress}%
                  </span>
                </div>
                <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  {period.date}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-full w-full bg-[#f4f6fa] dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 transition-colors">
      <div className="w-full space-y-6">

        {!isAdmin && (
          <>
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Overview</h1>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400 hidden sm:flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date().toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={loading || selectedUserIds.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>
            </div>

            {/* ── Banner ── */}
            <AnimatePresence>
              {showBanner && (
                <Motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-4 flex items-start justify-between shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mt-1">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-indigo-900 dark:text-indigo-100">
                        {getGreeting()}, {user?.name || user?.userName || "User"}!
                      </h3>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-0.5">
                        Here's a summary of Jobsheet and AMS activities.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowBanner(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
                    aria-label="Dismiss greeting"
                  >
                    <MoreHorizontal size={20} className="rotate-45" />
                  </button>
                </Motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* ── Admin User Filter ── */}
        {isAdmin && (
          <div className="relative z-30 rounded-2xl border border-slate-100 bg-white px-6 py-7 shadow-[0_3px_14px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900">
            <label className="mb-2 block text-sm font-semibold text-slate-600 dark:text-slate-300">
              Select Users
            </label>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div ref={userPickerRef} className="relative flex-1">
                <div
                  className={`flex min-h-12 cursor-text flex-wrap items-center gap-2 rounded-xl border bg-white px-2.5 py-1.5 transition dark:bg-slate-800 ${
                    isUserPickerOpen
                      ? "border-blue-500 ring-4 ring-blue-100 dark:ring-blue-500/15"
                      : "border-slate-300 dark:border-slate-700"
                  }`}
                  onClick={() => setIsUserPickerOpen(true)}
                >
                  {selectedUsers.map((selectedUser) => (
                    <span
                      key={selectedUser.id}
                      className="flex h-8 items-center gap-1.5 rounded-lg bg-blue-700 px-3 text-xs font-semibold text-white"
                    >
                      {getUserLabel(selectedUser)}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleUser(selectedUser.id);
                        }}
                        className="rounded p-0.5 hover:bg-white/15"
                        aria-label={`Remove ${getUserLabel(selectedUser)}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                  <div className="flex min-w-[210px] flex-1 items-center gap-2 px-1">
                    <Search className="h-4 w-4 shrink-0 text-slate-400" />
                    <input
                      value={userSearch}
                      onChange={(event) => {
                        setUserSearch(event.target.value);
                        setIsUserPickerOpen(true);
                      }}
                      onFocus={() => setIsUserPickerOpen(true)}
                      placeholder="Search and select users..."
                      className="h-8 w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100"
                      aria-label="Search users"
                    />
                  </div>
                </div>

                {isUserPickerOpen && (
                  <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((availableUser) => {
                        const isSelected = selectedUserIds.some(
                          (selectedId) => String(selectedId) === String(availableUser.id),
                        );
                        return (
                          <label
                            key={availableUser.id}
                            className={`flex cursor-pointer items-center gap-3 px-4 py-2 text-sm transition ${
                              isSelected
                                ? "bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white"
                                : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/70"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleUser(availableUser.id)}
                              className="h-4 w-4 rounded border-slate-300 accent-pink-500"
                            />
                            <span>{getUserLabel(availableUser)}</span>
                          </label>
                        );
                      })
                    ) : (
                      <div className="px-4 py-5 text-center text-sm text-slate-500">
                        No users match your search.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={clearSelectedUsers}
                disabled={selectedUserIds.length === 0}
                className="inline-flex h-11 items-center justify-center gap-2 self-end rounded-xl border border-indigo-500 px-5 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-indigo-500/10 lg:self-center"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            </div>

            <div className="mt-10 flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
              <Users className="h-5 w-5" />
              <span>{selectedUserIds.length} {selectedUserIds.length === 1 ? "user" : "users"} selected</span>
              {loading && <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />}
            </div>
          </div>
        )}

        {/* ── Empty States ── */}
        {dashboardError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-5 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-semibold">Unable to load dashboard data</h3>
                <p className="mt-1 text-sm opacity-90">{dashboardError}</p>
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-400 px-4 text-sm font-semibold hover:bg-rose-100 dark:hover:bg-rose-500/10"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </div>
          </div>
        ) : isAdmin && selectedUserIds.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1">No Users Selected</h3>
            <p className="text-slate-500 dark:text-slate-400">Select one or more users above to view their dashboard data.</p>
          </div>
        ) : dashboards.length === 0 && !loading ? (
          <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <BarChart3 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1">No Dashboard Data</h3>
            <p className="text-slate-500 dark:text-slate-400">No jobsheet information could be found for the selected user(s).</p>
          </div>
        ) : (
          /* ── Dashboards List ── */
          <div className="space-y-6">
            {dashboards.map(db => (
              <section
                key={db.userId}
                className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_3px_14px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="mb-7 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                      {db.userName || (isAdmin ? "User Dashboard" : "My Dashboard")}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {isAdmin ? "Jobsheet Activity Summary" : "User Activity Summary"}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => removeUser(db.userId)}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-500 px-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      title="Remove User"
                    >
                      <X className="h-4 w-4" />
                      Remove
                    </button>
                  )}
                </div>
                {renderDashboardCards(db)}
              </section>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
