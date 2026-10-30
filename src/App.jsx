import { useState, useEffect, lazy, Suspense } from "react";
import clsx from "clsx";

import { usePermissionContext } from "./context/PermissionContext";
import { useAuth } from "./context/AuthContextHook";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Navbar from "./component/layout/Navbar";
import Sidebar from "./component/layout/Sidebar";
import ProtectedRoute from "./component/auth/ProtectedRoute";
import PermissionGuard from "./component/auth/PermissionGuard";

// Auth pages — loaded eagerly (needed before auth resolves)
import LoginPage from "./pages/Auth/Login";
import ForgotPasswordPage from "./pages/Auth/ForgotPassword";
import ResetPasswordPage from "./pages/Auth/ResetPaswordPage";

// The dashboard is the default page, so it ships with the app.
import Dashboard from "./pages/Dashboard";

// Other pages are lazy-loaded, then fetched in the background once the app is
// idle, so opening any page later is instant.
const pageLoaders = [];
const lazyPage = (loader) => {
  pageLoaders.push(loader);
  return lazy(loader);
};

const AMSTicketsPage = lazyPage(() => import("./pages/AMSTicketsPage"));
const SitesPage = lazyPage(() => import("./pages/SitesPage"));
const CountriesPage = lazyPage(() => import("./pages/CountriesPage"));
const AuditLogsPage = lazyPage(() => import("./pages/AuditLogsPage"));
const WorkCodesPage = lazyPage(() => import("./pages/WorkCodesPage"));
const CodePage = lazyPage(() => import("./pages/CodePage"));
const HolidaysPage = lazyPage(() => import("./pages/HolidaysPage"));
const UserWorkingHoursPage = lazyPage(() => import("./pages/UserWorkingHoursPage"));
const JobsheetsPage = lazyPage(() => import("./pages/JobsheetsPage"));
const TicketCommissionReportPage = lazyPage(() => import("./pages/TicketCommissionReportPage"));
const AMSTicketsReportPage = lazyPage(() => import("./pages/AMSTicketsReportPage"));
const GeneralReportPage = lazyPage(() => import("./pages/GeneralReportPage"));
const UserYearlyReportPage = lazyPage(() => import("./pages/UserYearlyReportPage"));
const AfterWorkingHoursReportPage = lazyPage(() => import("./pages/AfterWorkingHoursReportPage"));
const UsersPage = lazyPage(() => import("./pages/UsersPage"));
const RolesPage = lazyPage(() => import("./pages/RolesPage"));
const TaskCategoryProjectsPage = lazyPage(() => import("./pages/TaskCategoryProjectsPage"));
const CodeDetailsPage = lazyPage(() => import("./pages/CodeDetailsPage"));
const SettingsPage = lazyPage(() => import("./pages/SettingsPage"));
const MyAccountPage = lazyPage(() => import("./pages/MyAccountPage"));

const preloadPages = () => pageLoaders.forEach((load) => load().catch(() => null));

const AUDIT_LOG_PERMISSIONS = [
  "Billing.AMSTickets.ViewAuditLog",
  "Billing.Sites.ViewAuditLog",
  "Billing.WorkDoneCodes.ViewAuditLog",
  "Billing.Countries.ViewAuditLog",
  "Billing.Holidays.ViewAuditLog",
  "Billing.Lookups.ViewAuditLog",
  "Billing.Jobsheets.ViewAuditLog",
  "Billing.LookupDetails.ViewAuditLog",
  "Billing.UserWorkingHours.ViewAuditLog",
];

// Lightweight page-level loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 border-4 border-pink-500/10 rounded-full" />
        <div className="absolute inset-0 border-4 border-pink-600 rounded-full border-t-transparent animate-spin" />
      </div>
    </div>
  );
}

function Layout({ collapsed, setCollapsed }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const schedule = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 1500));
    const cancel = window.cancelIdleCallback || window.clearTimeout;
    const handle = schedule(preloadPages);
    return () => cancel(handle);
  }, []);

  return (
    <div className="flex h-screen w-screen dark:bg-slate-950 bg-slate-100 text-slate-900 dark:text-white transition-colors duration-300 relative">
      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden animate-in fade-in duration-300"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar for Mobile */}
      <div
        className={clsx(
          "fixed inset-y-0 left-0 z-[70] transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Sidebar
          collapsed={false}
          setCollapsed={() => {}}
          isMobile={true}
          closeMobile={() => setMobileOpen(false)}
        />
      </div>

      {/* Sidebar for Desktop */}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <div className="app-content-scroll flex flex-col flex-1 h-screen overflow-y-auto overflow-x-hidden">
        <Navbar setCollapsed={setCollapsed} setMobileOpen={setMobileOpen} />

        <main className="flex-1 p-3 sm:p-6 bg-slate-100 dark:bg-slate-950 transition-colors duration-300 min-h-full">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Dashboard / Home: the default page for every signed-in user
                  (as in Blazor); its data request still needs Billing.Dashboards. */}
              <Route path="/" element={<Dashboard />} />

              {/* Main Menu */}
              <Route
                path="/ams-tickets"
                element={
                  <PermissionGuard permission="Billing.AMSTickets">
                    <AMSTicketsPage />
                  </PermissionGuard>
                }
              />
              <Route
                path="/ams-tickets/:ticketNumber"
                element={
                  <PermissionGuard permission="Billing.AMSTickets">
                    <AMSTicketsPage />
                  </PermissionGuard>
                }
              />

              {/* Management - Jobsheets */}
              <Route
                path="/jobsheets"
                element={
                  <PermissionGuard permission="Billing.Jobsheets">
                    <JobsheetsPage />
                  </PermissionGuard>
                }
              />

              {/* Management - Reports */}
              <Route
                path="/reports/general"
                element={
                  <PermissionGuard permission="Billing.Reports.AMSTicketingGeneralReport">
                    <GeneralReportPage />
                  </PermissionGuard>
                }
              />
              <Route
                path="/reports/user-yearly"
                element={
                  <PermissionGuard permission="Billing.Reports.AMSTicketingUserYearlyReport">
                    <UserYearlyReportPage />
                  </PermissionGuard>
                }
              />
              <Route
                path="/reports/tickets"
                element={
                  <PermissionGuard permission="Billing.Reports.AMSTicketsReport">
                    <AMSTicketsReportPage />
                  </PermissionGuard>
                }
              />
              <Route
                path="/reports/after-hours"
                element={
                  <PermissionGuard permission="Billing.Reports.AfterWorkingHoursReport">
                    <AfterWorkingHoursReportPage />
                  </PermissionGuard>
                }
              />
              <Route
                path="/reports/commission"
                element={
                  <PermissionGuard permission="Billing.Reports.TicketsWithCommissionsReport">
                    <TicketCommissionReportPage />
                  </PermissionGuard>
                }
              />

              {/* Lookups / Master Data */}
              <Route
                path="/working-hours"
                element={
                  <PermissionGuard permission="Billing.UserWorkingHours">
                    <UserWorkingHoursPage />
                  </PermissionGuard>
                }
              />
              <Route
                path="/sites"
                element={
                  <PermissionGuard permission="Billing.Sites">
                    <SitesPage />
                  </PermissionGuard>
                }
              />
              <Route
                path="/countries"
                element={
                  <PermissionGuard permission="Billing.Countries">
                    <CountriesPage />
                  </PermissionGuard>
                }
              />
              <Route
                path="/work-codes"
                element={
                  <PermissionGuard permission="Billing.WorkDoneCodes">
                    <WorkCodesPage />
                  </PermissionGuard>
                }
              />
              <Route
                path="/holidays"
                element={
                  <PermissionGuard permission="Billing.Holidays">
                    <HolidaysPage />
                  </PermissionGuard>
                }
              />
              <Route
                path="/codes"
                element={
                  <PermissionGuard permission="Billing.Lookups">
                    <CodePage />
                  </PermissionGuard>
                }
              />
              <Route
                path="/code-details"
                element={
                  <PermissionGuard permission="Billing.LookupDetails">
                    <CodeDetailsPage />
                  </PermissionGuard>
                }
              />
              <Route
                path="/task-category-projects"
                element={
                  <PermissionGuard permission="Billing.TaskCategoryProjects">
                    <TaskCategoryProjectsPage />
                  </PermissionGuard>
                }
              />

              {/* Administration */}
              <Route
                path="/users"
                element={
                  <PermissionGuard permission="AbpIdentity.Users">
                    <UsersPage />
                  </PermissionGuard>
                }
              />
              <Route
                path="/roles"
                element={
                  <PermissionGuard permission="AbpIdentity.Roles">
                    <RolesPage />
                  </PermissionGuard>
                }
              />
              <Route
                path="/settings"
                element={
                  <PermissionGuard permission={["SettingManagement.Emailing", "AbpSettingManagement.Emailing", "SettingManagement.Settings.SystemSettings"]}>
                    <SettingsPage />
                  </PermissionGuard>
                }
              />

              {/* Common / Self-Service */}
              <Route path="/my-account" element={<MyAccountPage />} />
              <Route
                path="/audit-logs"
                element={
                  <PermissionGuard permission={AUDIT_LOG_PERMISSIONS}>
                    <AuditLogsPage />
                  </PermissionGuard>
                }
              />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", JSON.stringify(collapsed));
  }, [collapsed]);

  const navigate = useNavigate();
  const { isLoading } = usePermissionContext();
  const { user, loggingOut } = useAuth();

  useEffect(() => {
    const handleAuthExpired = () => {
      // Logout reloads into the login page itself.
      if (loggingOut) return;
      console.warn("[App] auth:expired — redirecting to login");
      navigate("/login", { state: { from: window.location.pathname } });
    };
    window.addEventListener("auth:expired", handleAuthExpired);
    return () => window.removeEventListener("auth:expired", handleAuthExpired);
  }, [navigate, loggingOut]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-slate-50 dark:bg-[#020617] flex items-center justify-center flex-col gap-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-pink-500/10 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-pink-600 rounded-full border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 btn-flagship rounded-full animate-pulse"></div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-800 dark:text-white animate-pulse">
            Loading...
          </p>
          <div className="w-32 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full btn-flagship animate-[loading_1.5s_ease-in-out_infinite]"></div>
          </div>
        </div>

        <style>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <Routes>
      {/* A signed-in user goes straight to the app, so the login form never flashes. */}
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout collapsed={collapsed} setCollapsed={setCollapsed} />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
