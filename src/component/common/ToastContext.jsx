import { createContext, useContext, useState, useCallback } from "react";

export const ToastContext = createContext(); // ← added export here

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = "success") => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast, toast: showToast }}>
            {children}

            {/* Above MUI dialogs (z-index 1300) so toasts shown from an open
                form aren't hidden behind its backdrop. */}
            <div className="fixed bottom-5 right-5 flex flex-col gap-2 z-[2000]">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        role="status"
                        className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all animate-in fade-in slide-in-from-bottom-2 ${toast.type === "success" ? "bg-green-500 text-white" :
                                toast.type === "error" ? "bg-red-500 text-white" :
                                    // Warning: amber with dark text, which reads more clearly than white on amber.
                                    toast.type === "warning" ? "bg-amber-400 text-amber-950" :
                                        "bg-slate-800 dark:bg-slate-700 text-white ring-1 ring-white/10"
                            }`}
                    >
                        {toast.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

