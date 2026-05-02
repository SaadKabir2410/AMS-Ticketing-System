import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import Logo from "../../assets/Sureze_Logo.png";
import { accountApi } from "../../services/api/AccountApi";

function InputField({ label, id, type = "text", value, onChange, placeholder, icon: Icon, error, disabled }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm text-slate-700 dark:text-slate-300 ml-1 font-medium">
        {label}
      </label>
      <div className="relative group">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-pink-500 transition-colors">
          {Icon && <Icon size={18} />}
        </div>
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border ${error
            ? "border-red-500 ring-2 ring-red-500/10"
            : "border-slate-200 dark:border-slate-800 group-focus-within:border-pink-500 group-focus-within:ring-4 group-focus-within:ring-pink-500/10"
            } rounded-xl text-slate-700 dark:text-slate-200 placeholder:text-slate-400 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
        />
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-500 mt-1 ml-1">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);

  const triggerShake = () => {
    setShouldShake(true);
    setTimeout(() => setShouldShake(false), 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      triggerShake();
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address.");
      triggerShake();
      return;
    }

    setLoading(true);
    try {
      await accountApi.sendPasswordResetCode(email);
      setSent(true);
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.error?.details ||
        "Failed to send reset email. Please check your email and try again.";
      setError(msg);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0f1117] p-6 relative overflow-hidden">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .shake-animation { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes rotate-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .logo-container { animation: float 6s ease-in-out infinite; }
        .ray { animation: rotate-slow 15s linear infinite; }
      `}</style>

      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#ec4899]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/5 blur-[120px] pointer-events-none" />

      <div className={`w-full max-w-md relative z-10 ${shouldShake ? "shake-animation" : ""}`}>
        <div className="w-full min-h-[580px] flex flex-col justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 lg:p-16 rounded-[48px] shadow-2xl shadow-slate-200/50 dark:shadow-none transition-all overflow-hidden relative group/card">

          {/* Internal Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#ec4899]/10 blur-[60px] rounded-full group-hover/card:bg-[#ec4899]/20 transition-all duration-1000" />

          {/* Logo */}
          <div className="flex flex-col items-center gap-6 mb-8 group relative">
            <div className="relative logo-container">
              <div className="ray absolute inset-0 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 w-[240px] h-[240px] bg-[conic-gradient(from_0deg,transparent,rgba(236,72,153,0.1),transparent_30%)] blur-3xl opacity-50" />
              <div className="absolute inset-0 bg-[#ec4899]/20 blur-[50px] rounded-full scale-[1.4] group-hover:bg-[#ec4899]/30 transition-all duration-1000" />
              <div className="relative z-10 p-5 rounded-[28px] bg-slate-50/50 dark:bg-white/5 border border-slate-100 dark:border-white/10 backdrop-blur-xl shadow-xl overflow-hidden group-hover:border-[#ec4899]/30 transition-colors duration-500">
                <img src={Logo} alt="Sureze Logo" className="w-24 h-auto object-contain drop-shadow-[0_0_15px_rgba(236,72,153,0.3)]" />
              </div>
              <div className="absolute -top-2 -right-2 w-2 h-2 bg-[#ec4899] rounded-full blur-[1px] animate-pulse" />
            </div>
          </div>

          {/* ── Success State ── */}
          {sent ? (
            <div className="flex flex-col items-center text-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 size={36} className="text-emerald-500" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight mb-2">
                  Check Your Email
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                  We sent a password reset link to
                </p>
                <p className="text-pink-500 font-bold text-sm mt-1">{email}</p>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-3 leading-relaxed">
                  Click the link in the email to reset your password.
                  The link will expire in 24 hours.
                </p>
              </div>

              <div className="w-full space-y-3 mt-2">
                <button
                  onClick={() => { setSent(false); setEmail(""); setError(""); }}
                  className="w-full py-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Try a different email
                </button>
                <button
                  onClick={() => navigate("/login")}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#ec4899] text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-pink-500/25 hover:bg-[#d946ef] transition-all"
                >
                  <ArrowLeft size={12} />
                  Back to Login
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Title */}
              <div className="mb-8 text-center">
                <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
                  Forgot Password
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
                  Enter your email to receive a reset link
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-6 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs animate-in fade-in slide-in-from-top-2">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <InputField
                  id="email"
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="Enter your registered email"
                  icon={Mail}
                  disabled={loading}
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#ec4899] text-white font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-pink-500/25 hover:bg-[#d946ef] hover:-translate-y-0.5 active:translate-y-0 mt-4 disabled:opacity-50 disabled:cursor-not-allowed group/btn overflow-hidden relative"
                >
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                  <span className="relative z-10 flex items-center gap-2">
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail size={14} />
                        Send Reset Link
                      </>
                    )}
                  </span>
                </button>
              </form>

              {/* Back to login */}
              <div className="mt-8 text-center">
                <button
                  onClick={() => navigate("/login")}
                  className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 hover:text-pink-500 transition-colors"
                >
                  <ArrowLeft size={12} />
                  Back to Login
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}