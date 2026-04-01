import { useState, useEffect } from "react";
import { Dialog, IconButton } from "@mui/material";
import codesApi from "../../services/api/Code";
import PremiumErrorAlert from "./PremiumErrorAlert";



const EMPTY_FORM = {
  lookupCode: "",
  description: "",
  sequence: 1,
};

export default function CodeModal({
  open,
  onClose,
  onSubmit, // Function called after successful form validation and payload building
  item = null, // If item is passed, we fetch its full details externally or pass via props
}) {
  const isEdit = !!item;
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [fetchedRecord, setFetchedRecord] = useState(null); // Explicit separation requested by user
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // When modal is opened, sync provided initial state
  // Assuming the calling page fetches getById prior to unhiding or passes the pre-filled obj via item
  useEffect(() => {
    if (open) {
      setError(null);
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
              sequence: record.sequence ?? 1,
              // Deliberately explicitly decoupled from form state per structural rule
            });
          } catch {
            setError("Failed to fetch record details for editing.");
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
  }, [open, isEdit, item]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Clear global error message when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Frontend strict validation
    if (!formData.lookupCode || formData.lookupCode.trim().length !== 3) {
      setError("Lookup Code must be exactly 3 characters.");
      return;
    }

    if (!formData.description || !formData.description.trim()) {
      setError("Description is required.");
      return;
    }

    if (!formData.sequence || formData.sequence < 0) {
      setError("Sequence is required and must be 0 or greater.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        lookupCode: formData.lookupCode,
        description: formData.description,
        sequence: formData.sequence,
        // System defaults for Create, preserved overrides for Edit precisely as strictly prescribed
        isSystemIndicator: isEdit && fetchedRecord ? !!fetchedRecord.isSystemIndicator : false,
        isActive: isEdit && fetchedRecord ? fetchedRecord.isActive : true,
        concurrencyStamp: isEdit && fetchedRecord ? fetchedRecord.concurrencyStamp : "",
      };

      await onSubmit(payload);
    } catch (err) {
      const apiError =
        err?.response?.data?.error?.validationErrors?.[0]?.message ||
        err?.response?.data?.error?.message ||
        err?.message ||
        "Something went wrong.";
      setError(apiError);
    } finally {
      if (!isEdit) {
        setSubmitting(false); // only toggle false here if error caught or creation finished (modal manages its own unmount)
      } else {
        setSubmitting(false);
      }
    }
  };

  const getInputClass = (isTextarea = false) => {
    return `w-full px-4 py-2.5 rounded-xl border outline-none text-sm transition-all bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:border-slate-200 dark:disabled:hover:border-white/10 ${isTextarea ? "min-h-[100px] resize-y" : ""}`;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: "16px", bgcolor: "background.paper" },
        className: "bg-white dark:bg-slate-900 dark:text-white",
      }}
    >
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <h2 className="text-lg font-medium text-slate-800 dark:text-white">
          {isEdit ? "Edit Code" : "Add Code"}
        </h2>
        <IconButton onClick={onClose} size="small" disabled={submitting}>
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </IconButton>
      </div>

      <div className="px-6 py-2">
        {error && (
          <PremiumErrorAlert 
            open={!!error} 
            message={error} 
            onClose={() => setError(null)} 
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Lookup Code */}
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1.5 ml-1 font-medium">
              Lookup Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="lookupCode"
              value={formData.lookupCode}
              onChange={handleChange}
              maxLength={3}
              required
              className={getInputClass()}
              disabled={submitting || isEdit}
            />
            <small style={{ color: "gray" }} className="ml-1 text-[10px]">
              {isEdit ? "Lookup Code cannot be changed." : "Must be exactly 3 characters."}
            </small>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1.5 ml-1 font-medium">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              className={getInputClass(true)}
              disabled={submitting}
            />
          </div>

          {/* Sequence */}
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1.5 ml-1 font-medium">
              Sequence <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="sequence"
              min={0}
              step={1}
              placeholder="Enter Sequence"
              value={formData.sequence}
              onChange={handleChange}
              required
              className={getInputClass()}
              disabled={submitting}
            />
          </div>

        </form>
      </div>

      <div className="flex items-center justify-end gap-3 px-6 pt-4 pb-5">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="px-5 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors dark:text-slate-300 dark:hover:bg-white/10"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-sm font-medium transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px] flex items-center justify-center"
        >
          {submitting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : isEdit ? "Save Changes" : "Create"}
        </button>
      </div>
    </Dialog>
  );
}
