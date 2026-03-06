import { useNavigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useEffect } from "react";

export default function AuthCallback() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [auth.isAuthenticated, navigate]);

  if (auth.error) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-[#0f1117]">
        <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-red-100 dark:border-red-900/30">
          <h2 className="text-xl font-bold text-red-600 mb-2">
            Authentication Error
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            {auth.error.message}
          </p>
          <button
            onClick={() => navigate("/login")}
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50 dark:bg-[#0f1117]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-600 dark:text-slate-400 font-medium">
          Finalizing sign in...
        </p>
      </div>
    </div>
  );
}
