import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContextHook";
import { AlertCircle } from "lucide-react";
import Logo from "../../assets/Sureze_Logo.png";


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
        className="text-sm text-slate-700 dark:text-slate-300 ml-1"
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
          required
          className={`w-full pl-11 pr-11 py-3 bg-white dark:bg-slate-900 border ${error
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
            {showPass ? "Hide" : "Show"}
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
  const { user, login, error: authContextError, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [localError, setLocalError] = useState("");
  const [showLoggedOutMessage, setShowLoggedOutMessage] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);

  // If already authenticated, skip login page
  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  useEffect(() => {
    if (location.state?.loggedOut) {
      setShowLoggedOutMessage(true);
      const timer = setTimeout(() => setShowLoggedOutMessage(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    clearError();
    setIsLoggingIn(true);
    setShouldShake(false);

    const success = await login({ email: username, password });
    if (success) {
      // Ensure the unclosed tickets modal will show after this fresh login
      sessionStorage.removeItem("hasSeenUnclosedTicketsModal");
      navigate(from, { replace: true });
    } else {
      setIsLoggingIn(false);
      setShouldShake(true);
      // Reset shake after animation duration
      setTimeout(() => setShouldShake(false), 500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0f1117] p-6 relative overflow-hidden">
      <style>
        {`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-6px); }
            40%, 80% { transform: translateX(6px); }
          }
          .shake-animation {
            animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
          }
        `}
      </style>

      {/* Background Glow Decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#ec4899]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/5 blur-[120px] pointer-events-none" />

      <div className={`w-full max-w-md relative z-10 ${shouldShake ? 'shake-animation' : ''}`}>
        {/* ── Consolidated Login Card ── */}
        <div className="w-full min-h-[650px] flex flex-col justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 lg:p-16 rounded-[48px] shadow-2xl shadow-slate-200/50 dark:shadow-none transition-all overflow-hidden relative group/card">
          
          {/* Subtle Internal Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#ec4899]/10 blur-[60px] rounded-full group-hover/card:bg-[#ec4899]/20 transition-all duration-1000" />
          
          {/* ── Animated Logo (Consolidated Inside) ── */}
          <div className="flex flex-col items-center gap-6 mb-10 group relative">
            <style>
              {`
                @keyframes float {
                  0%, 100% { transform: translateY(0px); }
                  50% { transform: translateY(-15px); }
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
              <div className="ray absolute inset-0 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 w-[240px] h-[240px] bg-[conic-gradient(from_0deg,transparent,rgba(236,72,153,0.1),transparent_30%)] blur-3xl opacity-50" />
              <div className="absolute inset-0 bg-[#ec4899]/20 blur-[50px] rounded-full scale-[1.4] group-hover:bg-[#ec4899]/30 transition-all duration-1000" />
              <div className="relative z-10 p-5 rounded-[28px] bg-slate-50/50 dark:bg-white/5 border border-slate-100 dark:border-white/10 backdrop-blur-xl shadow-xl overflow-hidden group-hover:border-[#ec4899]/30 transition-colors duration-500">
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent skew-y-[-10deg] -translate-y-1/2" />
                <img
                  src={Logo}
                  alt="Sureze Logo"
                  className="w-24 h-auto object-contain drop-shadow-[0_0_15px_rgba(236,72,153,0.3)]"
                />
              </div>
              <div className="absolute -top-2 -right-2 w-2 h-2 bg-[#ec4899] rounded-full blur-[1px] animate-pulse" />
            </div>
          </div>

          <div className="mb-10 text-center">
            <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
              Welcome back
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
              Sign in with credentials
            </p>
          </div>

          {/* Logout Warning Message */}
          {showLoggedOutMessage && (
            <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs animate-in fade-in slide-in-from-top-4 duration-500">
              <AlertCircle size={16} />
              <p>You have been logged out successfully.</p>
            </div>
          )}

          {/* Error messages */}
          {(localError || authContextError) && (
            <div className="mb-6 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              {localError || authContextError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <InputField
              id="username"
              label="Username or Email"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                clearError();
              }}
              placeholder="Enter your username"
            />
            <InputField
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearError();
              }}
              placeholder="Enter your password"
            />

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-2 py-5 rounded-2xl bg-[#ec4899] text-white font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-pink-500/25 hover:bg-[#d946ef] hover:-translate-y-0.5 active:translate-y-0 mt-6 disabled:opacity-50 disabled:cursor-not-allowed group/btn overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
              <span className="relative z-10">
                {isLoggingIn ? "Verifying..." : "Login"}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}




