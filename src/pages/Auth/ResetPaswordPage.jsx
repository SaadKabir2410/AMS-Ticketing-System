import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
} from "lucide-react";
import Logo from "../../assets/Sureze_Logo.png";
import { accountApi } from "../../services/api/AccountApi";
import { useBackendLocalization } from "../../hooks/useBackendLocalization";

const getErrorMessage = (error, fallback) =>
  error.response?.data?.error?.message ||
  error.response?.data?.error?.details ||
  error.message ||
  fallback;

function PasswordField({ id, label, value, onChange, disabled, autoComplete }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="ml-1 text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <div className="group relative">
        <LockKeyhole
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-pink-500"
        />
        <input
          id={id}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          disabled={disabled}
          autoComplete={autoComplete}
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-11 text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        />
        <button
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          disabled={disabled}
          aria-label={label}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-pink-500 disabled:cursor-not-allowed"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const localize = useBackendLocalization("AbpAccount");
  const [status, setStatus] = useState("verifying");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const resetCredentials = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const rawHash = location.hash.replace(/^#/, "");
    const hashParams = new URLSearchParams(
      rawHash.includes("?") ? rawHash.slice(rawHash.indexOf("?") + 1) : rawHash,
    );
    const readParam = (...names) => {
      for (const name of names) {
        const value = searchParams.get(name) || hashParams.get(name);
        if (value) return value;
      }
      return "";
    };

    return {
      userId: readParam("userId", "UserId", "user_id"),
      resetToken: readParam("resetToken", "ResetToken", "token", "code"),
    };
  }, [location.hash, location.search]);

  useEffect(() => {
    let active = true;

    const verifyToken = async () => {
      if (!resetCredentials.userId || !resetCredentials.resetToken) {
        setError(localize("DefaultErrorMessage"));
        setStatus("invalid");
        return;
      }

      try {
        const isValid = await accountApi.verifyPasswordResetToken(
          resetCredentials.userId,
          resetCredentials.resetToken,
        );
        if (!active) return;

        if (isValid === false) {
          setError(localize("InvalidLoginRequest"));
          setStatus("invalid");
        } else {
          setStatus("ready");
        }
      } catch (verifyError) {
        if (!active) return;
        setError(
          getErrorMessage(
            verifyError,
            localize("DefaultErrorMessage"),
          ),
        );
        setStatus("invalid");
      }
    };

    verifyToken();
    return () => {
      active = false;
    };
  }, [localize, resetCredentials]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!password) {
      setError(
        localize("The {0} field is required.").replace(
          "{0}",
          localize("DisplayName:NewPassword"),
        ),
      );
      return;
    }
    if (!confirmPassword) {
      setError(localize("NewPasswordConfirmFailed"));
      return;
    }
    if (password !== confirmPassword) {
      setError(
        localize("'{0}' and '{1}' do not match.")
          .replace("{0}", localize("DisplayName:NewPassword"))
          .replace("{1}", localize("ConfirmPassword")),
      );
      return;
    }

    setStatus("submitting");
    try {
      await accountApi.resetPassword(
        resetCredentials.userId,
        resetCredentials.resetToken,
        password,
      );
      setStatus("success");
    } catch (submitError) {
      setError(
        getErrorMessage(
          submitError,
          localize("DefaultErrorMessage"),
        ),
      );
      setStatus("ready");
    }
  };

  const isBusy = status === "verifying" || status === "submitting";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-6 dark:bg-[#0f1117]">
      <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-pink-500/5 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-indigo-600/5 blur-[120px]" />

      <main className="relative z-10 w-full max-w-md rounded-[48px] border border-slate-200 bg-white p-10 shadow-2xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none sm:p-14">
        <div className="mb-8 flex justify-center">
          <div className="rounded-[28px] border border-slate-100 bg-slate-50/50 p-5 shadow-xl dark:border-white/10 dark:bg-white/5">
            <img src={Logo} alt="" className="w-24 object-contain" />
          </div>
        </div>

        {status === "success" ? (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <CheckCircle2 size={36} className="text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-800 dark:text-white">
                {localize("PasswordReset")}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {localize("YourPasswordIsSuccessfullyReset")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
              className="w-full rounded-2xl bg-pink-500 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-pink-500/25 transition-all hover:bg-pink-600"
            >
              {localize("BackToLogin")}
            </button>
          </div>
        ) : status === "invalid" ? (
          <div className="flex flex-col items-center gap-6 text-center">
            <AlertCircle size={50} className="text-red-500" />
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-800 dark:text-white">
                {localize("Error")}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-red-500">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/forgot-password", { replace: true })}
              className="w-full rounded-2xl bg-pink-500 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-pink-500/25 transition-all hover:bg-pink-600"
            >
              {localize("ForgotPassword")}
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-800 dark:text-white">
                {localize("ResetPassword")}
              </h1>
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {status === "verifying"
                  ? localize("LoadingWithThreeDot")
                  : localize("ResetPassword_Information")}
              </p>
            </div>

            {status === "verifying" ? (
              <div className="flex justify-center py-12">
                <span className="h-9 w-9 animate-spin rounded-full border-4 border-pink-200 border-t-pink-500" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <PasswordField
                  id="new-password"
                  label={localize("DisplayName:NewPassword")}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  disabled={isBusy}
                  autoComplete="new-password"
                />
                <PasswordField
                  id="confirm-password"
                  label={localize("ConfirmPassword")}
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setError("");
                  }}
                  disabled={isBusy}
                  autoComplete="new-password"
                />
                <button
                  type="submit"
                  disabled={isBusy}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-pink-500 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-pink-500/25 transition-all hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === "submitting"
                    ? localize("LoadingWithThreeDot")
                    : localize("ResetPassword")}
                </button>
              </form>
            )}

            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 transition-colors hover:text-pink-500"
              >
                <ArrowLeft size={12} />
                {localize("BackToLogin")}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
