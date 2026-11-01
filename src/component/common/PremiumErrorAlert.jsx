import React from 'react';
import { X, Info } from 'lucide-react';
import { Dialog, DialogContent, Zoom } from '@mui/material';
import { useTheme } from "../../context/ThemeContext";
import { useBackendLocalization } from "../../hooks/useBackendLocalization";

export default function PremiumErrorAlert({ open, message, onClose, variant = "error" }) {
  const { isDark } = useTheme();
  const localize = useBackendLocalization("Billing");
  const localizeOr = (key, fallback) => {
    const value = localize(key);
    return value && value !== key ? value : fallback;
  };
  const isInfo = variant === "info";
  const Icon = isInfo ? Info : X;

  return (
    <Dialog
      open={open}
      onClose={(_event, reason) => {
        if (reason === "backdropClick" || reason === "escapeKeyDown") return;
        onClose?.();
      }}
      TransitionComponent={Zoom}
      PaperProps={{
        sx: {
          borderRadius: "16px",
          padding: "16px 20px",
          maxWidth: "320px",
          width: "90%",
          textAlign: "center",
          boxShadow: isDark ? "0 20px 40px -12px rgba(0, 0, 0, 0.5)" : "0 20px 40px -12px rgba(15, 23, 42, 0.2)",
          border: "1px solid",
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
          bgcolor: isDark ? "#0f172a" : "#ffffff",
          backgroundImage: "none",
        }
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <div className="flex justify-center mb-2.5">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isInfo
                ? "bg-pink-50 text-pink-500 dark:bg-pink-500/15"
                : "bg-red-50 text-red-500 dark:bg-red-500/15"
            }`}
          >
            <Icon size={20} strokeWidth={2.25} />
          </div>
        </div>

        <div className="space-y-1 mb-4 px-1">
          {!isInfo && (
            <h3 className="text-base font-semibold text-slate-800 dark:text-white leading-tight">
              {localizeOr("Error", "Error")}
            </h3>
          )}
          <p
            className={`text-sm leading-relaxed break-words ${
              isInfo ? "font-medium text-slate-700 dark:text-slate-200" : "text-slate-600 dark:text-slate-300"
            }`}
          >
            {message}
          </p>
        </div>

        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="min-w-[80px] h-8 px-5 rounded-lg bg-pink-600 hover:bg-pink-700 dark:bg-pink-500 dark:hover:bg-pink-600 text-white font-semibold text-sm transition-colors"
          >
            {localizeOr("OKButtonText", "OK")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
