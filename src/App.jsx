import { useState, useEffect } from "react";
import { useAuth } from "./context/AuthContextHook";
import { usePermissionContext } from "./context/PermissionContext";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Navbar from "./component/layout/Navbar";
import Sidebar from "./component/layout/Sidebar";
import LoginPage from "./pages/Auth/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./component/auth/ProtectedRoute";
import AMSTicketsPage from "./pages/AMSTicketsPage";
import SitesPage from "./pages/SitesPage";
import CountriesPage from "./pages/CountriesPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import WorkCodesPage from "./pages/WorkCodesPage";
import CodePage from "./pages/CodePage";
import HolidaysPage from "./pages/HolidaysPage";
import UserWorkingHoursPage from "./pages/UserWorkingHoursPage";
import JobsheetsPage from "./pages/JobsheetsPage";
import TicketCommissionReportPage from "./pages/TicketCommissionReportPage";
import AMSTicketsReportPage from "./pages/AMSTicketsReportPage";
import GeneralReportPage from "./pages/GeneralReportPage";
import AfterWorkingHoursReportPage from "./pages/AfterWorkingHoursReportPage";
import UsersPage from "./pages/UsersPage";
import RolesPage from "./pages/RolesPage";
import TaskCategoryProjectsPage from "./pages/TaskCategoryProjectsPage";
import CodeDetailsPage from "./pages/CodeDetailsPage";
import SettingsPage from "./pages/SettingsPage";
import MyAccountPage from "./pages/MyAccountPage";

function Layout({ collapsed, setCollapsed }) {
  return (
    <div className="flex h-screen w-screen dark:bg-slate-950 bg-slate-50 text-slate-900 dark:text-white transition-colors duration-300">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="flex flex-col flex-1 h-screen overflow-hidden">
        <Navbar Collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className="flex-1 overflow-auto p-6 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
          <Routes>
            <Route path="/" element={<AMSTicketsPage />} />
            <Route path="/ams-tickets" element={<AMSTicketsPage />} />
            <Route path="/sites" element={<SitesPage />} />
            <Route path="/countries" element={<CountriesPage />} />
            <Route path="/work-codes" element={<WorkCodesPage />} />
            <Route path="/codes" element={<CodePage />} />
            <Route path="/holidays" element={<HolidaysPage />} />
            <Route path="/working-hours" element={<UserWorkingHoursPage />} />
            <Route path="/jobsheets" element={<JobsheetsPage />} />
            <Route
              path="/reports/commission"
              element={<TicketCommissionReportPage />}
            />
            <Route
              path="/reports/after-hours"
              element={<AfterWorkingHoursReportPage />}
            />
            <Route path="/reports/tickets" element={<AMSTicketsReportPage />} />
            <Route path="/reports/general" element={<GeneralReportPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/roles" element={<RolesPage />} />
            <Route path="/task-category-projects" element={<TaskCategoryProjectsPage />} />
            <Route path="/code-details" element={<CodeDetailsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/my-account" element={<MyAccountPage />} />


            <Route path="/audit-logs" element={<AuditLogsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const { isLoading } = usePermissionContext();

  // Handle session expiry (401 from API)
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
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-800 dark:text-white animate-pulse">
            Loading...
          </p>
          <div className="w-32 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 animate-[loading_1.5s_ease-in-out_infinite]"></div>
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
