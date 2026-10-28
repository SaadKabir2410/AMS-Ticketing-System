import { useState, useEffect, useRef } from "react";
import { Dialog, IconButton } from "@mui/material";
import { AlertCircle, Check, X } from "lucide-react";

import { workCodesApi } from "../../services/api/workCodes";
import PremiumErrorAlert from "./PremiumErrorAlert";
import { useBackendLocalization } from "../../hooks/useBackendLocalization";



const EMPTY = { description: "", code: "" };

export default function WorkCodeModal({
  open,
  onClose,
  onSubmit,
  item = null,
  loading = false,
  submitError = null,
}) {
  const isEdit = !!item;
  const localize = useBackendLocalization("Billing");
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [checkingCode, setCheckingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const abortControllerRef = useRef(null);

  const [prevOpen, setPrevOpen] = useState(open);
  const [prevItem, setPrevItem] = useState(item);

  if (open !== prevOpen || item !== prevItem) {
    setPrevOpen(open);
    setPrevItem(item);
    if (open) {
      setErrors({});
      setCheckingCode(false);
      setForm(
        item
          ? { description: item.description || "", code: item.code || "" }
          : EMPTY,
      );
    }
  }

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Returns true when another work done code already uses this code.
  const checkCodeExists = async () => {
    const code = form.code.trim().toUpperCase();
    if (!code) return false;

    // Skip check if we are editing and the code hasn't changed
    if (isEdit && item && item.code && item.code.toUpperCase() === code) {
      return false;
    }

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setCheckingCode(true);
    try {
      const data = await workCodesApi.checkCodeExists(
        code,
        abortControllerRef.current.signal,
      );
      const items = data.items || [];
      const codeLower = code.toLowerCase();

      // Serverside search is good, but let's be 100% sure with an exact match check
      const isDuplicate = items.some(
        (item) => (item.code || "").toLowerCase() === codeLower,
      );

      if (isDuplicate) {
        setErrors((prev) => ({
          ...prev,
          code: localize("SA:WorkDoneCodeExistsErrorMessage"),
        }));
      }
      return isDuplicate;
    } catch (err) {
      if (err.name !== "CanceledError") {
        console.error("Check code error:", err);
      }
      // The backend still rejects a duplicate on save.
      return false;
    } finally {
      setCheckingCode(false);
    }
  };

  const validate = () => {
    const errs = {};
    const code = form.code.trim();
    const desc = form.description.trim();

    const requiredMessage = (fieldKey) =>
      localize("The {0} field is required.").replace("{0}", localize(fieldKey));

    if (!desc) {
      errs.description = requiredMessage("Description");
    }

    if (!code) {
      errs.code = requiredMessage("Code");
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    setErrors({});

    // One click: the duplicate check runs here instead of blocking the button.
    if (await checkCodeExists()) {
      setSubmitting(false);
      return;
    }

    const payload = {
      Description: form.description.trim(),
      Code: form.code.trim().toUpperCase(),
    };

    try {
      const finalPayload = isEdit ? { ...item, ...payload } : payload;
      await onSubmit(finalPayload);
    } catch (err) {
      const validationErrors = err.response?.data?.error?.validationErrors;
      let msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message;

      if (validationErrors && validationErrors.length > 0) {
        const newErrs = {};
        for (const ve of validationErrors) {
          const members = ve.members || [];
          if (members.length === 0) newErrs.server = ve.message;
          members.forEach((m) => {
            if (m.toLowerCase() === "code") newErrs.code = ve.message;
            else if (m.toLowerCase() === "description") newErrs.description = ve.message;
            else newErrs.server = ve.message;
          });
        }
        setErrors((prev) => ({ ...prev, ...newErrs }));
      } else {
        if (msg.toLowerCase().includes("code")) {
          setErrors((prev) => ({ ...prev, code: msg }));
        } else if (msg.toLowerCase().includes("description")) {
          setErrors((prev) => ({ ...prev, description: msg }));
        } else {
          setErrors((prev) => ({ ...prev, server: msg }));
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputClasses = (error, isValid) =>
    `w-full px-4 py-2.5 rounded-xl border outline-none transition-all text-sm ` +
    (error
      ? `bg-red-50/50 border-red-400 text-red-900 placeholder:text-red-300 dark:bg-red-500/10 dark:border-red-500/50 dark:text-red-200`
      : isValid
        ? `bg-green-50/50 border-green-500 focus:border-green-600 text-green-900 dark:bg-green-500/10 dark:border-green-500/50 dark:text-green-200`
        : `bg-slate-50 border-slate-200 hover:border-slate-300 focus:bg-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 text-slate-700 placeholder:text-slate-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:focus:border-pink-500 dark:focus:ring-pink-500/20`);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: "16px", p: 1 },
        className: "bg-white dark:bg-slate-900 dark:text-white",
      }}
    >
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <h2 className="text-lg font-bold text-pink-600 dark:text-pink-400">
          {isEdit ? localize("EditWorkDoneCode") : localize("NewWorkDoneCode")}
        </h2>
        <IconButton onClick={onClose} size="small" className="text-slate-400 hover:text-pink-500 transition-colors">
          <X size={20} />
        </IconButton>
      </div>

      <div className="px-6 py-2 space-y-5">
        {errors.server && (
          <PremiumErrorAlert 
            open={!!errors.server} 
            message={errors.server} 
            onClose={() => setErrors(prev => ({ ...prev, server: null }))} 
          />
        )}
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
                if (errors.code) setErrors((errs) => ({ ...errs, code: "" }));
              }}
              onBlur={checkCodeExists}
              className={inputClasses(
                errors.code,
                form.code.length > 0 && !errors.code && !checkingCode,
              )}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
              {checkingCode && localize("ProcessingWithThreeDot")}
              {errors.code && (
                <AlertCircle size={16} className="text-red-500" />
              )}
              {!checkingCode && !errors.code && form.code.length > 0 && (
                <Check size={16} className="text-green-500" />
              )}
            </div>
          </div>
          {errors.code && (
            <p className="text-red-500 text-xs mt-1.5">{errors.code}</p>
          )}
        </div>

        <div>
          <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1.5">
            {localize("Description")} <span className="required-asterisk">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={form.description}
              onChange={(e) => {
                setForm((f) => ({ ...f, description: e.target.value }));
                if (errors.description)
                  setErrors((errs) => ({ ...errs, description: "" }));
              }}
              className={inputClasses(
                errors.description,
                form.description.length > 0 && !errors.description,
              )}
            />
            {form.description.length > 0 && !errors.description && (
              <Check
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500"
              />
            )}
          </div>
          {errors.description && (
            <p className="text-red-500 text-xs mt-1.5">{errors.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 px-6 pt-6 pb-5">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
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


