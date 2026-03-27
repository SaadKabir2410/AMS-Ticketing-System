import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, Zoom } from '@mui/material';

export default function PremiumErrorAlert({ open, message, onClose }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionComponent={Zoom}
      PaperProps={{
        sx: {
          borderRadius: "28px",
          padding: "24px",
          maxWidth: "400px",
          width: "90%",
          textAlign: "center",
          overflow: "visible",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid",
          borderColor: "divider"
        }
      }}
    >
      <DialogContent sx={{ p: 0, pt: 1 }}>
        {/* Large Red X Circle */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-red-100 dark:bg-red-500/10 rounded-full animate-ping opacity-20 scale-150" />
            <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-500/20 flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-xl relative z-10">
              <X size={44} strokeWidth={2.5} className="text-red-500" />
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2 mb-8 px-2">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">
             Execution Error
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed wrap-break-word">
            {message}
          </p>
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="min-w-[120px] py-3 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all active:scale-[0.98] shadow-lg shadow-blue-500/25"
          >
            OK
          </button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
