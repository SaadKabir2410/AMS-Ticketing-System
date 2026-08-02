import { useState, useEffect, lazy, Suspense } from "react";
import clsx from "clsx";
import { useAuth } from "./context/AuthContextHook";

import { usePermissionContext } from "./context/PermissionContext";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Navbar from "./component/layout/Navbar";
import Sidebar from "./component/layout/Sidebar";
import ProtectedRoute from "./component/auth/ProtectedRoute";
import PermissionGuard from "./component/auth/PermissionGuard";

// Auth pages — loaded eagerly (needed before auth resolves)
import LoginPage from "./pages/Auth/Login";
import ForgotPasswordPage from "./pages/Auth/ForgotPassword";

// App pages — lazy-loaded so only the current route's code is fetched
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AMSTicketsPage = lazy(() => import("./pages/AMSTicketsPage"));
const SitesPage = lazy(() => import("./pages/SitesPage"));
const CountriesPage = lazy(() => import("./pages/CountriesPage"));
const AuditLogsPage = lazy(() => import("./pages/AuditLogsPage"));
const WorkCodesPage = lazy(() => import("./pages/WorkCodesPage"));
const CodePage = lazy(() => import("./pages/CodePage"));
const HolidaysPage = lazy(() => import("./pages/HolidaysPage"));
const UserWorkingHoursPage = lazy(() => import("./pages/UserWorkingHoursPage"));
const JobsheetsPage = lazy(() => import("./pages/JobsheetsPage"));
const TicketCommissionReportPage = lazy(() => import("./pages/TicketCommissionReportPage"));
const AMSTicketsReportPage = lazy(() => import("./pages/AMSTicketsReportPage"));
const GeneralReportPage = lazy(() => import("./pages/GeneralReportPage"));
const UserYearlyReportPage = lazy(() => import("./pages/UserYearlyReportPage"));
const AfterWorkingHoursReportPage = lazy(() => import("./pages/AfterWorkingHoursReportPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const RolesPage = lazy(() => import("./pages/RolesPage"));
const TaskCategoryProjectsPage = lazy(() => import("./pages/TaskCategoryProjectsPage"));
const CodeDetailsPage = lazy(() => import("./pages/CodeDetailsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const MyAccountPage = lazy(() => import("./pages/MyAccountPage"));

// Lightweight page-level loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full" />
        <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin" />
      </div>
    </div>
  );
}

function Layout({ collapsed, setCollapsed }) {
  const [mobileOpen, setMobileOpen] = useState(false);

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

      <div className="flex flex-col flex-1 h-screen overflow-y-auto overflow-x-hidden">
        <Navbar setCollapsed={setCollapsed} setMobileOpen={setMobileOpen} />

        <main className="flex-1 p-3 sm:p-6 bg-slate-100 dark:bg-slate-950 transition-colors duration-300 min-h-full">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Dashboard / Home */}
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
                  <PermissionGuard permission="Billing.Lookups.Create">
                    <CodePage />
                  </PermissionGuard>
                }
              />
              <Route
                path="/code-details"
                element={
                  <PermissionGuard permission="Billing.Lookups.Create">
                    <CodeDetailsPage />
                  </PermissionGuard>
                }
              />
              <Route
                path="/task-category-projects"
                element={
                  <PermissionGuard permission="Billing.TaskCategoryProjects.Create">
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
                  <PermissionGuard permission={["SettingManagement.Emailing", "AbpSettingManagement.Emailing"]}>
                    <SettingsPage />
                  </PermissionGuard>
                }
              />

              {/* Common / Self-Service */}
              <Route path="/my-account" element={<MyAccountPage />} />
              <Route path="/audit-logs" element={<AuditLogsPage />} />

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

  useEffect(() => {
    const handleAuthExpired = () => {
      console.warn("[App] auth:expired — redirecting to login");
      navigate("/login", { state: { from: window.location.pathname } });
    };
    window.addEventListener("auth:expired", handleAuthExpired);
    return () => window.removeEventListener("auth:expired", handleAuthExpired);
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-slate-50 dark:bg-[#020617] flex items-center justify-center flex-col gap-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
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
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
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
