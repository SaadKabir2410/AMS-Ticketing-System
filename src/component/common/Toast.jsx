import { useState, useCallback } from "react";
import { CheckCircle2, XCircle, AlertCircle, X } from "lucide-react"; // ✅ added

import { ToastContext } from "./ToastContext";

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, type = "success") => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const remove = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  const icons = {
    success: <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />,
    error: <XCircle size={16} className="text-red-500 shrink-0" />,
    warning: <AlertCircle size={16} className="text-amber-500 shrink-0" />,
  };

  return (
    <ToastContext.Provider value={{ toast: add }}>
      {children}
      <div className="fixed bottom-5 right-5 z-100 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl min-w-[260px] max-w-sm pointer-events-auto animate-slide-in"
          >
            {icons[t.type] || icons.success}
            <p className="text-sm text-slate-700 dark:text-slate-200 flex-1">
              {t.message}
            </p>
            <button
              onClick={() => remove(t.id)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={14} /> {/* ✅ replaced blank with X icon */}
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

