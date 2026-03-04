import { useState, useEffect } from "react";
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
import HolidaysPage from "./pages/HolidaysPage";
import UserWorkingHoursPage from "./pages/UserWorkingHoursPage";
import JobsheetsPage from "./pages/JobsheetsPage";

function Layout({ collapsed, setCollapsed }) {
  return (
    <div className="flex h-screen w-screen dark:bg-slate-950 bg-slate-50 text-slate-900 dark:text-white transition-colors duration-300">
      <Sidebar collapsed={collapsed} />
      <div className="flex flex-col flex-1 h-screen overflow-hidden">
        <Navbar Collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className="flex-1 overflow-auto p-6 bg-slate-50 dark:bg-[#020617] transition-colors duration-300">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/ams-tickets" element={<AMSTicketsPage />} />
            <Route path="/sites" element={<SitesPage />} />
            <Route path="/countries" element={<CountriesPage />} />
            <Route path="/work-codes" element={<WorkCodesPage />} />
            <Route path="/holidays" element={<HolidaysPage />} />
            <Route path="/working-hours" element={<UserWorkingHoursPage />} />
            <Route path="/jobsheets" element={<JobsheetsPage />} />
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

  // When DB.js interceptor detects 403/401, it fires 'auth:expired'.
  // We clear everything here and send the user to login.
  useEffect(() => {
    const handleAuthExpired = () => {
      console.warn('[App] auth:expired — redirecting to /login');
      navigate('/login', { state: { loggedOut: true }, replace: true });
    };
    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, [navigate]);

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
