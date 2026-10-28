import React, { useState } from "react";
import { Dialog, IconButton, Autocomplete, TextField } from "@mui/material";
import { X } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function SendTestEmailModal({
  open,
  onClose,
  onSend,
  loading = false,
  defaultSender = "",
  localize,
}) {
  const { dark } = useTheme();
  const isDark = dark === "dark";

  const [form, setForm] = useState({
    senderEmailAddress: defaultSender || "",
    targetEmailAddress: defaultSender || "",
    subject: localize("TestEmailSubject").replace("{0}", "").trim(),
    body: localize("TestEmailBody"),
  });

  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    const requiredMessage = localize("ThisFieldIsRequired.");
    if (!form.senderEmailAddress) newErrors.senderEmailAddress = requiredMessage;
    if (!form.targetEmailAddress) newErrors.targetEmailAddress = requiredMessage;
    if (!form.subject) newErrors.subject = requiredMessage;
    if (!form.body) newErrors.body = requiredMessage;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (validate()) {
      onSend(form);
    }
  };

  const renderComboBox = (id, label, value, error) => (
    <div className="mb-5">
      <label className="block text-[13px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 leading-none">
        {label}
      </label>
      <Autocomplete
        freeSolo
        options={[]}
        value={value}
        onChange={(e, newValue) => handleChange(id, newValue || "")}
        onInputChange={(e, newInputValue) => handleChange(id, newInputValue)}
        renderInput={(params) => (
          <TextField
            {...params}
            size="small"
            error={!!error}
            helperText={error}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "10px",
                backgroundColor: "transparent",
                color: isDark ? "#f1f5f9" : "#1e293b",
                "& fieldset": { 
                  borderColor: isDark ? "rgba(148, 163, 184, 0.2)" : "rgba(0, 0, 0, 0.1)",
                  borderWidth: "1px" 
                },
                "&:hover fieldset": { 
                  borderColor: isDark ? "rgba(148, 163, 184, 0.4)" : "rgba(0, 0, 0, 0.2)" 
                },
                "&.Mui-focused fieldset": { 
                  borderColor: "#3b82f6",
                  borderWidth: "2px"
                },
              },
              "& .MuiInputBase-input": {
                fontSize: "13px",
                padding: "4px 8px !important",
              },
              "& .MuiFormHelperText-root": {
                color: "#ef4444",
                marginTop: "4px",
                marginLeft: "0",
              },
            }}
            className="bg-slate-50/50 dark:bg-slate-800/50 rounded-[10px]"
          />
        )}
      />
    </div>
  );

  return (
    <Dialog
      open={open}
      onClose={(event, reason) => {
        if (reason === "backdropClick") return;
        onClose();
      }}
      maxWidth="xs"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: "blur(4px)",
            backgroundColor: isDark ? "rgba(0, 0, 0, 0.4)" : "rgba(0, 0, 0, 0.2)",
          },
        },
      }}
      PaperProps={{
        sx: { 
          borderRadius: "20px",
          backgroundColor: isDark ? "#0f172a" : "#ffffff",
          backgroundImage: "none",
          boxShadow: isDark ? "0 25px 50px -12px rgba(0, 0, 0, 0.5)" : "0 25px 50px -12px rgba(0, 0, 0, 0.1)",
          color: isDark ? "#f1f5f9" : "#1e293b",
        },
      }}
    >
      <div className="flex items-center justify-between px-7 pt-6 pb-2">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
          {localize("SendTestEmail")}
        </h2>
        <IconButton 
          onClick={onClose} 
          size="small" 
          sx={{ color: isDark ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.4)" }}
        >
          <X size={20} />
        </IconButton>
      </div>

      <div className="px-7 py-3">
        {renderComboBox("senderEmailAddress", localize("SenderEmailAddress"), form.senderEmailAddress, errors.senderEmailAddress)}
        {renderComboBox("targetEmailAddress", localize("TargetEmailAddress"), form.targetEmailAddress, errors.targetEmailAddress)}
        {renderComboBox("subject", localize("Subject"), form.subject, errors.subject)}
        {renderComboBox("body", localize("Body"), form.body, errors.body)}
      </div>

      <div className="flex items-center justify-end gap-3 px-7 pt-2 pb-8">
        <button
          onClick={onClose}
          className="px-5 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
        >
          {localize("Cancel")}
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="app-primary-button px-6 py-2 text-[10px] uppercase tracking-widest flex items-center justify-center min-w-[120px]"
        >
          {loading ? localize("ProcessingWithThreeDot") : localize("Send")}
        </button>
      </div>
    </Dialog>
  );
}
