import { useState } from "react";
import { Dialog, IconButton } from "@mui/material";
import { Check, X } from "lucide-react";
import PremiumErrorAlert from "./PremiumErrorAlert";
import { getApiErrorMessage } from "../../utils/apiError";
const EMPTY = { name: "", code: "" };

export default function CountryModal({
  open,
  onClose,
  onSubmit,
  item = null,
  loading = false,
  submitError = null,
  onSubmitErrorClose,
}) {
  const isEdit = !!item;
  const [form, setForm] = useState(EMPTY);
  const [backendError, setBackendError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [prevOpen, setPrevOpen] = useState(open);
  const [prevItem, setPrevItem] = useState(item);

  if (open !== prevOpen || item !== prevItem) {
    setPrevOpen(open);
    setPrevItem(item);
    if (open) {
      setBackendError("");
      setForm(item ? { name: item.name || "", code: item.code || "" } : EMPTY);
    }
  }

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
    };

    try {
      setSubmitting(true);
      setBackendError("");
      const finalPayload = isEdit ? { ...item, ...payload } : payload;
      await onSubmit(finalPayload);
    } catch (err) {
      setBackendError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClasses = (isValid) =>
    `w-full px-4 py-2.5 rounded-xl border outline-none transition-all text-sm ` +
    (isValid
        ? `bg-green-50/50 border-green-500 focus:border-green-600 text-green-900 dark:bg-green-500/10 dark:border-green-500/50 dark:text-green-200`
        : `bg-slate-50 border-slate-200 hover:border-slate-300 focus:bg-white focus:border-blue-500 text-slate-700 placeholder:text-slate-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:focus:border-blue-500`);

  return (
    <Dialog
      open={open}
      onClose={(event, reason) => {
        if (reason !== "backdropClick") {
          onClose();
        }
      }}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: "16px", p: 1 },
        className: "bg-white dark:bg-slate-900 dark:text-white",
      }}
    >
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <h2 className="text-lg text-pink-600 dark:text-pink-400">
          {isEdit ? "Update Country" : "Create Country"}
        </h2>
        <IconButton onClick={onClose} size="small">
          <X className="text-slate-500 dark:text-slate-400" size={20} />
        </IconButton>
      </div>

      <div className="px-6 py-2 space-y-5">
        {(submitError || backendError) && (
          <PremiumErrorAlert
            open={!!(submitError || backendError)}
            message={submitError || backendError}
            onClose={() => {
              setBackendError("");
              onSubmitErrorClose?.();
            }}
          />
        )}
        <div>
          <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1.5">
            Country Name <span className="required-asterisk">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Enter Country Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={inputClasses(form.name.length > 0)}
            />
            {form.name.length > 0 && (
              <Check
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500"
              />
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1.5">
            Country Code <span className="required-asterisk">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Enter Country Code"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              className={inputClasses(form.code.length > 0)}
            />
            {form.code.length > 0 && (
              <Check
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500"
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 px-6 pt-6 pb-5">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || submitting}
          className="app-primary-button px-8 py-2.5 text-sm flex items-center justify-center min-w-[120px]"
        >
          {loading || submitting ? "Saving..." : isEdit ? "Update" : "Create"}
        </button>
      </div>
    </Dialog>
  );
}
