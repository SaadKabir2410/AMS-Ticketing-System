import { useState } from "react";
import { Dialog, IconButton } from "@mui/material";
import { X, Loader2, Check } from "lucide-react";

const EMPTY = { name: "", code: "" };

export default function CountryModal({
  open,
  onClose,
  onSubmit,
  item = null,
  loading = false,
  submitError = null,
}) {
  const isEdit = !!item;
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  const [prevOpen, setPrevOpen] = useState(open);
  const [prevItem, setPrevItem] = useState(item);

  if (open !== prevOpen || item !== prevItem) {
    setPrevOpen(open);
    setPrevItem(item);
    if (open) {
      setErrors({});
      setForm(item ? { name: item.name || "", code: item.code || "" } : EMPTY);
    }
  }

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Country name is required";
    else if (form.name.length > 100)
      errs.name = "Name cannot exceed 100 characters";

    if (!form.code.trim()) errs.code = "Country code is required";
    else if (form.code.length > 3)
      errs.code = "Code cannot exceed 3 characters";
    return errs;
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
    };

    try {
      const finalPayload = isEdit ? { ...item, ...payload } : payload;
      await onSubmit(finalPayload);
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message;
      setErrors((prev) => ({ ...prev, server: msg }));
    }
  };

  const inputClasses = (error, isValid) =>
    `w-full px-4 py-2.5 rounded-xl border outline-none transition-all text-sm ` +
    (error
      ? `bg-red-50/50 border-red-400 text-red-900 placeholder:text-red-300 dark:bg-red-500/10 dark:border-red-500/50 dark:text-red-200`
      : isValid
        ? `bg-green-50/50 border-green-500 focus:border-green-600 text-green-900 dark:bg-green-500/10 dark:border-green-500/50 dark:text-green-200`
        : `bg-slate-50 border-slate-200 hover:border-slate-300 focus:bg-white focus:border-blue-500 text-slate-700 placeholder:text-slate-400 dark:bg-[#242938] dark:border-white/10 dark:text-slate-200 dark:focus:border-blue-500`);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: "16px", bgcolor: "background.paper", p: 1 },
        className: "bg-white dark:bg-[#1e2436] dark:text-white",
      }}
    >
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <h2 className="text-lg text-blue-600 dark:text-blue-400">
          {isEdit ? "Update Country" : "Create Country"}
        </h2>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </div>

      <div className="px-6 py-2 space-y-5">
        {(submitError || errors.server) && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs animate-in fade-in slide-in-from-top-2">
            {submitError || errors.server}
          </div>
        )}
        <div>
          <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1.5">
            Country Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              maxLength={100}
              placeholder="Enter Country Name"
              value={form.name}
              onChange={(e) => {
                setForm((f) => ({ ...f, name: e.target.value }));
                if (errors.name) setErrors((errs) => ({ ...errs, name: "" }));
              }}
              className={inputClasses(
                errors.name,
                form.name.length > 0 && !errors.name,
              )}
            />
            {form.name.length > 0 && !errors.name && (
              <Check
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500"
              />
            )}
          </div>
          {errors.name && (
            <p className="text-red-500 text-xs mt-1.5">{errors.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1.5">
            Country Code <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              maxLength={3}
              placeholder="Enter Country Code"
              value={form.code}
              onChange={(e) => {
                setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }));
                if (errors.code) setErrors((errs) => ({ ...errs, code: "" }));
              }}
              className={inputClasses(
                errors.code,
                form.code.length > 0 && !errors.code,
              )}
            />
            {form.code.length > 0 && !errors.code && (
              <Check
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500"
              />
            )}
          </div>
          {errors.code && (
            <p className="text-red-500 text-xs mt-1.5">{errors.code}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 px-6 pt-6 pb-5">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm flex items-center justify-center min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-blue-100 dark:shadow-none transition-all"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : isEdit ? (
            "Update"
          ) : (
            "Create"
          )}
        </button>
      </div>
    </Dialog>
  );
}
