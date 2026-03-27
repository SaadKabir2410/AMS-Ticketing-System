import { useState, useEffect, useRef } from "react";
import { Dialog, IconButton } from "@mui/material";
import { AlertCircle, Check } from "lucide-react";

import { workCodesApi } from "../../services/api/workCodes";
import PremiumErrorAlert from "./PremiumErrorAlert";



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
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [checkingCode, setCheckingCode] = useState(false);
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

  const checkCodeExists = async () => {
    const code = form.code.trim().toUpperCase();
    if (!code) return;

    // Skip check if we are editing and the code hasn't changed
    if (isEdit && item && item.code && item.code.toUpperCase() === code) {
      return;
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
          code: `Code "${code}" already exists`,
        }));
      }
    } catch (err) {
      if (err.name !== "CanceledError") {
        console.error("Check code error:", err);
      }
    } finally {
      setCheckingCode(false);
    }
  };

  const validate = () => {
    const errs = {};
    const code = form.code.trim();
    const desc = form.description.trim();

    if (!desc) {
      errs.description = "Description is required";
    }

    if (!code) {
      errs.code = "Code is required";
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
    if (errors.code || checkingCode) return;
    setErrors({});

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
    }
  };

  const inputClasses = (error, isValid) =>
    `w-full px-4 py-2.5 rounded-xl border outline-none transition-all text-sm ` +
    (error
      ? `bg-red-50/50 border-red-400 text-red-900 placeholder:text-red-300 dark:bg-red-500/10 dark:border-red-500/50 dark:text-red-200`
      : isValid
        ? `bg-green-50/50 border-green-500 focus:border-green-600 text-green-900 dark:bg-green-500/10 dark:border-green-500/50 dark:text-green-200`
        : `bg-slate-50 border-slate-200 hover:border-slate-300 focus:bg-white focus:border-blue-500 text-slate-700 placeholder:text-slate-400 dark:bg-slate-800 dark:border-white/10 dark:text-slate-200 dark:focus:border-blue-500`);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: "16px", bgcolor: "background.paper", p: 1 },
        className: "bg-white dark:bg-slate-900 dark:text-white",
      }}
    >
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <h2 className="text-lg text-blue-600 dark:text-blue-400">
          {isEdit ? "Update Work Code" : "Create Work Code"}
        </h2>
        <IconButton onClick={onClose} size="small">
          
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
            Code <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Enter Code"
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
              {checkingCode && "Checking..."}
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
            Description <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Enter Description"
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
          className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || checkingCode || !!errors.code}
          className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm flex items-center justify-center min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-blue-100 dark:shadow-none transition-all"
        >
          {loading ? "Loading..." : isEdit ? (
            "Update"
          ) : (
            "Create"
          )}
        </button>
      </div>
    </Dialog>
  );
}
