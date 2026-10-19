import { useState, useEffect } from "react";
import { Dialog, IconButton } from "@mui/material";
import codesApi from "../../services/api/Code";
import { getApiErrorMessage, getApiFieldErrors } from "../../utils/apiError";



const EMPTY_FORM = {
  lookupCode: "",
  description: "",
  sequence: 0,
};

export default function CodeModal({
  open,
  onClose,
  onSubmit, // Function called after successful form validation and payload building
  item = null, // If item is passed, we fetch its full details externally or pass via props
  readOnly = false,
  localize = (key) => key,
}) {
  const isEdit = !!item;
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [fetchedRecord, setFetchedRecord] = useState(null); // Explicit separation requested by user
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // When modal is opened, sync provided initial state
  // Assuming the calling page fetches getById prior to unhiding or passes the pre-filled obj via item
  useEffect(() => {
    if (open) {
      setError(null);
      setFieldErrors({});
      setSubmitting(false);

      if (isEdit && item) {
        // Must fetch fresh record to retrieve latest concurrencyStamp
        const fetchFreshRecord = async () => {
          setSubmitting(true);
          try {
            const record = await codesApi.getById(item.id);
            setFetchedRecord(record);
            setFormData({
              lookupCode: record.lookupCode || "",
              description: record.description || "",
              sequence: record.sequence ?? 0,
              // Deliberately explicitly decoupled from form state per structural rule
            });
          } catch (fetchError) {
            setError(
              getApiErrorMessage(fetchError) || localize("DefaultErrorMessage"),
            );
          } finally {
            setSubmitting(false);
          }
        };
        fetchFreshRecord();
      } else {
        setFetchedRecord(null);
        setFormData(EMPTY_FORM);
      }
    }
  }, [open, isEdit, item, localize]);

  const handleChange = (e) => {
    if (readOnly) return;
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (readOnly) return;

    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      const errors = {};
      const requiredMessage = (fieldName) =>
        localize("The {0} field is required.").replace("{0}", fieldName);

      if (!formData.lookupCode?.trim()) {
        errors.lookupCode = requiredMessage(localize("LookupCode"));
      }
      if (!formData.description?.trim()) {
        errors.description = requiredMessage(localize("Description"));
      }
      if (formData.sequence === "" || formData.sequence === null || formData.sequence === undefined) {
        errors.sequence = requiredMessage(localize("Sequence"));
      }

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setSubmitting(false);
        return;
      }

      const payload = {
        lookupCode: formData.lookupCode.trim(),
        description: formData.description.trim(),
        sequence: Number(formData.sequence),
        // System defaults for Create, preserved overrides for Edit precisely as strictly prescribed
        isSystemIndicator: isEdit && fetchedRecord ? !!fetchedRecord.isSystemIndicator : false,
        isActive: isEdit && fetchedRecord ? fetchedRecord.isActive : true,
        concurrencyStamp: isEdit && fetchedRecord ? fetchedRecord.concurrencyStamp : "",
      };

      await onSubmit(payload);
    } catch (err) {
      const apiFieldErrors = getApiFieldErrors(err);
      const nextFieldErrors = Object.fromEntries(
        ["lookupCode", "description", "sequence"]
          .filter((field) => apiFieldErrors[field])
          .map((field) => [field, apiFieldErrors[field]]),
      );
      setFieldErrors(nextFieldErrors);
      setError(
        Object.keys(nextFieldErrors).length
          ? null
          : getApiErrorMessage(err) || localize("DefaultErrorMessage"),
      );
    } finally {
      if (!isEdit) {
        setSubmitting(false); // only toggle false here if error caught or creation finished (modal manages its own unmount)
      } else {
        setSubmitting(false);
      }
    }
  };

  const getInputClass = (isTextarea = false) => {
    return `w-full px-4 py-2.5 rounded-xl border outline-none text-sm transition-all bg-slate-50 border-slate-200 text-slate-700 hover:border-pink-500 focus:bg-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:border-pink-500 dark:focus:border-pink-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:border-slate-200 dark:disabled:hover:border-white/10 ${isTextarea ? "min-h-[100px] resize-y" : ""}`;
  };

  return (
    <Dialog
      open={open}
      onClose={(_event, reason) => {
        if (reason === "backdropClick" || reason === "escapeKeyDown") return;
        onClose();
      }}
      maxWidth="xs"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
          },
        },
      }}
      PaperProps={{
        sx: { borderRadius: "16px" },
        className: "bg-white dark:bg-slate-900 dark:text-white",
      }}
    >
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <h2 className="text-lg font-medium text-slate-800 dark:text-white">
          {readOnly
            ? localize("View")
            : isEdit
              ? localize("EditLookup")
              : localize("AddNewLookup")}
        </h2>
        <IconButton onClick={onClose} size="small" disabled={submitting}>
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </IconButton>
      </div>

      <div className="px-6 py-2">
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Lookup Code */}
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1.5 ml-1 font-medium">
              {localize("LookupCode")} <span className="required-asterisk">*</span>
            </label>
            <input
              type="text"
              name="lookupCode"
              value={formData.lookupCode}
              onChange={handleChange}
              maxLength={3}
              className={getInputClass()}
              disabled={submitting || isEdit || readOnly}
            />
            {fieldErrors.lookupCode && (
              <p role="alert" className="mt-1.5 whitespace-pre-line text-xs font-medium leading-relaxed text-red-600 dark:text-red-400">
                {fieldErrors.lookupCode}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1.5 ml-1 font-medium">
              {localize("Description")} <span className="required-asterisk">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={getInputClass(true)}
              disabled={submitting || readOnly}
            />
            {fieldErrors.description && (
              <p role="alert" className="mt-1.5 whitespace-pre-line text-xs font-medium leading-relaxed text-red-600 dark:text-red-400">
                {fieldErrors.description}
              </p>
            )}
          </div>

          {/* Sequence */}
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1.5 ml-1 font-medium">
              {localize("Sequence")} <span className="required-asterisk">*</span>
            </label>
            <input
              type="number"
              name="sequence"
              min={0}
              step={1}
              placeholder={localize("Sequence")}
              value={formData.sequence}
              onChange={handleChange}
              className={getInputClass()}
              disabled={submitting || readOnly}
            />
            {fieldErrors.sequence && (
              <p role="alert" className="mt-1.5 whitespace-pre-line text-xs font-medium leading-relaxed text-red-600 dark:text-red-400">
                {fieldErrors.sequence}
              </p>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="whitespace-pre-line text-sm font-medium leading-relaxed text-red-600 dark:text-red-400"
            >
              {error}
            </p>
          )}
        </form>
      </div>

      <div className="flex items-center justify-end gap-3 px-6 pt-4 pb-5">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className={`${readOnly ? "w-full" : "flex-1"} btn-flagship h-[42px]! text-[11px]! border-slate-200! dark:border-slate-700! text-slate-500! hover:bg-slate-50! dark:hover:bg-white/5!`}
        >
          {readOnly ? localize("Close") : localize("Cancel")}
        </button>
        {!readOnly && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="app-primary-button inline-flex h-[42px] flex-1 items-center justify-center text-[11px] uppercase tracking-tight"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white! border-t-transparent rounded-full animate-spin"></div>
            ) : localize("Save")}
          </button>
        )}
      </div>
    </Dialog>
  );
}
