import { useState } from "react";
import { Dialog, IconButton } from "@mui/material";
import { Check, X } from "lucide-react";
import { getApiErrorMessage, getApiFieldErrors } from "../../utils/apiError";
import { useBackendLocalization } from "../../hooks/useBackendLocalization";
const EMPTY = { name: "", code: "" };

export default function CountryModal({
  open,
  onClose,
  onSubmit,
  item = null,
  loading = false,
}) {
  const isEdit = !!item;
  const localize = useBackendLocalization("Billing");
  const [form, setForm] = useState(EMPTY);
  // Errors show under the boxes: per field (name / code) or general.
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
    };

    // Name and Code are required by the backend; check them before saving.
    const requiredMessage = (fieldKey) =>
      localize("The {0} field is required.").replace("{0}", localize(fieldKey));
    const requiredErrors = {};
    if (!payload.name) requiredErrors.name = requiredMessage("Name");
    if (!payload.code) requiredErrors.code = requiredMessage("Code");
    if (Object.keys(requiredErrors).length > 0) {
      setErrors(requiredErrors);
      return;
    }

    try {
      setSubmitting(true);
      setErrors({});
      const finalPayload = isEdit ? { ...item, ...payload } : payload;
      await onSubmit(finalPayload);
    } catch (err) {
      const fieldErrors = getApiFieldErrors(err);
      setErrors(
        fieldErrors.name || fieldErrors.code
          ? { name: fieldErrors.name, code: fieldErrors.code }
          : { general: getApiErrorMessage(err) || localize("DefaultErrorMessage") },
      );
    } finally {
      setSubmitting(false);
    }
  };

  const FieldError = ({ message }) =>
    message ? (
      <p className="mt-1 text-xs font-semibold leading-tight text-rose-600 dark:text-rose-400 whitespace-pre-line">
        {message}
      </p>
    ) : null;

  const clearError = (field) =>
    setErrors((current) => ({ ...current, [field]: "", general: "" }));

  const inputClasses = (isValid, hasError) =>
    `w-full px-4 py-2.5 rounded-xl border outline-none transition-all text-sm ` +
    (hasError
      ? `bg-rose-50/50 border-rose-500 focus:border-rose-600 text-slate-800 dark:bg-rose-500/10 dark:border-rose-500/60 dark:text-slate-100`
      : isValid
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
          {isEdit ? localize("EditCountry") : localize("NewCountry")}
        </h2>
        <IconButton onClick={onClose} size="small">
          <X className="text-slate-500 dark:text-slate-400" size={20} />
        </IconButton>
      </div>

      <div className="px-6 py-2 space-y-5">
        <div>
          <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1.5">
            {localize("Name")} <span className="required-asterisk">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={form.name}
              onChange={(e) => {
                setForm((f) => ({ ...f, name: e.target.value }));
                clearError("name");
              }}
              className={inputClasses(form.name.length > 0, !!errors.name)}
            />
            {form.name.length > 0 && !errors.name && (
              <Check
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500"
              />
            )}
          </div>
          <FieldError message={errors.name} />
        </div>

        <div>
          <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1.5">
            {localize("Code")} <span className="required-asterisk">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={form.code}
              onChange={(e) => {
                setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }));
                clearError("code");
              }}
              className={inputClasses(form.code.length > 0, !!errors.code)}
            />
            {form.code.length > 0 && !errors.code && (
              <Check
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500"
              />
            )}
          </div>
          <FieldError message={errors.code} />
        </div>
        <FieldError message={errors.general} />
      </div>

      <div className="flex items-center justify-end gap-3 px-6 pt-6 pb-5">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
        >
          {localize("CancelButtonText")}
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || submitting}
          className="app-primary-button px-8 py-2.5 text-sm flex items-center justify-center min-w-[120px]"
        >
          {loading || submitting
            ? localize("SavingWithThreeDot")
            : isEdit ? localize("UpdateButtonText") : localize("CreateButtonText")}
        </button>
      </div>
    </Dialog>
  );
}
