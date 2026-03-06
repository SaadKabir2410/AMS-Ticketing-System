import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import Logo from "../../assets/Sureze_Logo.png";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Layers,
  AlertCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";

function InputField({
  label,
  id,
  type,
  value,
  onChange,
  placeholder,
  icon: Icon,
  error,
}) {
  const [showPass, setShowPass] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPass ? "text" : "password") : type;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1"
      >
        {label}
      </label>
      <div className="relative group">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
          {Icon && <Icon size={18} />}
        </div>
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full pl-11 pr-11 py-3 bg-white dark:bg-slate-900 border ${
            error
              ? "border-red-500 ring-2 ring-red-500/10"
              : "border-slate-200 dark:border-slate-800 group-focus-within:border-blue-500 group-focus-within:ring-4 group-focus-within:ring-blue-500/10"
          } rounded-xl text-slate-700 dark:text-slate-200 placeholder:text-slate-400 outline-none transition-all`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPass((s) => !s)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-500 mt-1 ml-1 animate-in fade-in slide-in-from-top-1">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}

export default function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";
  const [showLoggedOutMessage, setShowLoggedOutMessage] = useState(false);

  // If already authenticated via OIDC, skip login page
  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [auth.isAuthenticated, navigate, from]);

  useEffect(() => {
    if (location.state?.loggedOut) {
      setShowLoggedOutMessage(true);
      const timer = setTimeout(() => setShowLoggedOutMessage(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [location]);

  const handleSubmit = (e) => {
    e.preventDefault();
    auth.signinRedirect();
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#0f1117]">
      {/* ── Left Panel ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#1e3a5f] via-[#1a2d4e] to-[#0f1a2e] flex-col items-center justify-center p-12">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-3xl" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-indigo-600/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-blue-500/5 blur-2xl" />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        <div className="relative z-10 text-center max-w-md">
          {/* Premium Eye-Catchy Logo area */}
          <div className="flex flex-col items-center gap-10 mb-16 group relative">
            <style>
              {`
                @keyframes float {
                  0%, 100% { transform: translateY(0px); }
                  50% { transform: translateY(-20px); }
                }
                @keyframes rotate-slow {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
                .logo-container {
                  animation: float 6s ease-in-out infinite;
                }
                .ray {
                  animation: rotate-slow 15s linear infinite;
                }
              `}
            </style>

            <div className="relative logo-container">
              {/* Rotating Light Rays */}
              <div className="ray absolute inset-0 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 w-[400px] h-[400px] bg-[conic-gradient(from_0deg,transparent,rgba(59,130,246,0.1),transparent_30%)] blur-3xl opacity-50" />

              {/* High Highlight Glass Effect - Optimized to prevent bleed */}
              <div className="absolute inset-0 bg-blue-400/30 blur-[80px] rounded-full scale-[1.8] group-hover:bg-blue-400/40 transition-all duration-1000" />

              {/* Premium Glass Container */}
              <div className="relative z-10 p-8 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden group-hover:border-blue-500/30 transition-colors duration-500">
                {/* Reflection highlight */}
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent skew-y-[-10deg] -translate-y-1/2" />

                <img
                  src={Logo}
                  alt="Sureze Logo"
                  className="w-56 h-auto object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                />
              </div>

              {/* Orbital particles */}
              <div className="absolute -top-4 -right-4 w-3 h-3 bg-blue-400 rounded-full blur-[2px] animate-pulse" />
              <div className="absolute -bottom-6 -left-6 w-2 h-2 bg-indigo-400 rounded-full blur-[1px] animate-pulse delay-700" />
            </div>

            {/* Premium Text Branding Layer */}
            <div className="relative">
              <h2 className="text-5xl font-black text-white tracking-tighter mt-1">
                SUREZE
              </h2>
              {/* <span className="text-xs font-bold text-blue-400 tracking-[0.3em] uppercase">
                YOUR ICT PARTNER
              </span> */}
              <div className="flex items-center gap-2 justify-center mt-2">
                <div className="h-[2px] w-8 bg-gradient-to-r from-transparent to-blue-500" />
                <span className="text-[10px] font-bold text-blue-400/80 tracking-[0.4em] uppercase">
                  YOUR ICT PARTNER
                </span>
                <div className="h-[2px] w-8 bg-gradient-to-l from-transparent to-blue-500" />
              </div>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-slate-300 mb-3 leading-tight">
            Manage everything
            <br />
            from one place
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-10">
            Support portal for SUREZE employees. Manage tickets, customer
            requests, and technical operations securely.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: "1,718", label: "Tickets" },
              { value: "248", label: "Customers" },
              { value: "99.9%", label: "Uptime" },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white/5 rounded-2xl p-3 border border-white/10 backdrop-blur-sm"
              >
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel (Form) ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
              <img
                src={Logo}
                alt="Sureze Logo"
                className="relative z-10 w-12 h-auto"
              />
            </div>
            <span className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              SUREZE
            </span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
              Welcome back
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
              Sign in to your account to continue
            </p>
          </div>

          {/* Logout Warning Message */}
          {showLoggedOutMessage && (
            <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <AlertCircle size={18} />
              </div>
              <div>
                <p className="font-bold text-amber-500">Session Ended</p>
                <p className="text-amber-500/80 text-xs">
                  You have been logged out successfully.
                </p>
              </div>
            </div>
          )}

          {/* Global error */}
          {auth.error && (
            <div className="mb-5 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              {auth.error.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4 opacity-40 pointer-events-none select-none">
              <InputField
                id="email"
                label="Username or Email"
                type="text"
                value=""
                onChange={() => {}}
                placeholder="admin or you@example.com"
                icon={Mail}
              />
              <InputField
                id="password"
                label="Password"
                type="password"
                value=""
                onChange={() => {}}
                placeholder="Enter your password"
                icon={Lock}
              />
            </div>

            <button
              type="submit"
              disabled={auth.isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 mt-4"
            >
              {auth.isLoading ? (
                <>
                  <Loader2 size={17} className="animate-spin" /> Redirecting...
                </>
              ) : (
                <>
                  Sign In with SSO <ArrowRight size={16} />
                </>
              )}
            </button>

            <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-3">
              You will be redirected to the secure ABP login page
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
