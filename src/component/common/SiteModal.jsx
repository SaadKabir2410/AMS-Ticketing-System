import { useState, useEffect, useRef } from "react";
import { Dialog, IconButton, Autocomplete, TextField } from "@mui/material";
import { X, Loader2, Check, AlertCircle } from "lucide-react";
import { sitesApi } from "../../services/api/sites";
import { countriesApi } from "../../services/api/countries";

const EMPTY = {
  name: "",
  oCN: "",
  countryId: "",
  address: "",
  status: "Active",
};

export default function SiteModal({
  open,
  onClose,
  onSubmit,
  site = null,
  loading = false,
  submitError = null,
}) {
  const isEdit = !!site;
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [ocnChecking, setOcnChecking] = useState(false); // true while querying API

  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);

  // Track the OCN that was on the record when the modal opened (for edit mode)
  const originalOcnRef = useRef("");

  useEffect(() => {
    if (open) {
      setErrors({});
      setOcnChecking(false);
      if (site) {
        const ocn = site.ocn || site.oCN || "";
        originalOcnRef.current = ocn;
        setForm({
          name: site.name || "",
          oCN: ocn,
          countryId: site.countryId || site.country?.id || "",
          address: site.address || "",
          status: site.status || "Active",
        });
      } else {
        originalOcnRef.current = "";
        setForm(EMPTY);
      }
    }
  }, [open, site]);

  // Show server-side submit errors inline on the relevant field
  useEffect(() => {
    if (!submitError) return;
    const msg = submitError.toLowerCase();
    if (
      msg.includes("ocn") ||
      msg.includes("duplicate") ||
      msg.includes("already exist") ||
      msg.includes("unique")
    ) {
      setErrors((e) => ({ ...e, oCN: `Server: ${submitError}` }));
    } else {
      // Generic error — show on name field as fallback
      setErrors((e) => ({ ...e, name: `Server: ${submitError}` }));
    }
  }, [submitError]);

  // AbortController ref so we can cancel a stale in-flight OCN check when the
  // user blurs quickly, types again, and blurs a second time before the first
  // request resolves (race condition fix).
  const ocnAbortRef = useRef(null);

  // Called once when user leaves the OCN field — uses DB.sites.checkOcnExists
  // which goes through the shared `api` instance (with auth header + safe interceptor).
  const checkOcnExists = async () => {
    const ocn = form.oCN.trim();
    if (!ocn || ocn === originalOcnRef.current) return;

    // Cancel any previous in-flight check before starting a new one
    if (ocnAbortRef.current) ocnAbortRef.current.abort();
    const controller = new AbortController();
    ocnAbortRef.current = controller;

    setOcnChecking(true);
    try {
      const res = await sitesApi.checkOcnExists(ocn, controller.signal);

      // If this request was aborted (superceded by a newer check), bail out
      if (controller.signal.aborted) return;

      const items =
        res?.result?.items || res?.items || (Array.isArray(res) ? res : []);
      console.log("[OCN] raw items count:", items.length);

      // Scan every string property of every returned item for an exact match.
      // Resilient to any backend field naming (ocn / oCN / OCN / etc.)
      const ocnLower = ocn.toLowerCase();
      const isDuplicate = items.some((item) =>
        Object.values(item).some(
          (val) => typeof val === "string" && val.toLowerCase() === ocnLower,
        ),
      );

      console.log("[OCN] isDuplicate:", isDuplicate);

      if (isDuplicate) {
        setErrors((errs) => ({ ...errs, oCN: `OCN "${ocn}" already exists` }));
      } else {
        setErrors((errs) =>
          errs.oCN?.includes("already exists") ? { ...errs, oCN: "" } : errs,
        );
      }
    } catch (err) {
      // CanceledError = request was aborted; ignore silently
      if (
        err?.name === "CanceledError" ||
        err?.name === "AbortError" ||
        controller.signal.aborted
      )
        return;
      // Any other error (network, auth) — don't block the user
      console.warn("[OCN] check failed — skipping:", err?.message);
      setErrors((errs) =>
        errs.oCN?.includes("already exists") ? { ...errs, oCN: "" } : errs,
      );
    } finally {
      // Only clear the spinner if this controller is still the current one
      if (!controller.signal.aborted) {
        setOcnChecking(false);
      }
    }
  };

  useEffect(() => {
    if (!open || countries.length > 0) return;

    const controller = new AbortController();
    const fetchCountries = async () => {
      setLoadingCountries(true);
      try {
        // DB.countries.getAll uses the shared `api` instance—sends auth token automatically
        const data = await countriesApi.getAll();
        const list = Array.isArray(data) ? data : data?.items || [];
        setCountries([...list].sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        if (error?.name === "CanceledError" || error?.name === "AbortError")
          return;
        console.error("Failed to load countries", error);
      } finally {
        setLoadingCountries(false);
      }
    };

    fetchCountries();
    return () => controller.abort(); // cleanup if modal closes mid-fetch
  }, [open, countries.length]);

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((errs) => ({ ...errs, [field]: "" }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.name) errs.name = "Name is required";
    else if (form.name.length > 200) errs.name = "Name cannot exceed 200";

    if (!form.oCN) errs.oCN = "OCN is required";
    else if (form.oCN.length > 50) errs.oCN = "OCN cannot exceed 50";

    if (!form.countryId) errs.countryId = "Country is required";

    if (form.address && form.address.length > 500)
      errs.address = "Address cannot exceed 500";

    return errs;
  };

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    // Guard: if the onBlur check is still in-flight (user tabbed straight to submit)
    if (ocnChecking) return;
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    // Block if a duplicate OCN was found
    if (errors.oCN && errors.oCN.includes("already exists")) return;

    // Merge form values into existing site object to preserve metadata like concurrencyStamps
    const payload = isEdit ? { ...site, ...form } : { ...form };
    payload.ocn = form.oCN;
    delete payload.oCN;

    // Ensure country is passed as name string, not object, for better Audit Logging
    const selectedCountry = countries.find((c) => c.id === form.countryId);
    if (selectedCountry) {
      payload.countryName = selectedCountry.name;
    }

    // Pass metadata (like LastModificationTime and ConcurrencyStamp) ONLY when needed (Edit mode)
    if (!isEdit) {
      delete payload.LastModificationTime;
      delete payload.lastModificationTime;
      delete payload.ConcurrencyStamp;
      delete payload.concurrencyStamp;
      delete payload.CreationTime;
      delete payload.creationTime;
      delete payload.CreatorId;
      delete payload.creatorId;
    }

    // Delete the nested 'country' objects to prevent [object Object] in audit logs
    delete payload.country;
    delete payload.Country;
    delete payload.extraProperties;
    delete payload.ExtraProperties;

    onSubmit(payload);
  };

  const InputLabel = ({ label, required }) => (
    <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
  );

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
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: "16px", bgcolor: "background.paper", p: 1 },
        className: "bg-white dark:bg-[#1e2436] dark:text-white",
      }}
    >
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <h2 className="text-lg text-blue-600 dark:text-blue-400">
          {isEdit ? "Update Site" : "Create Site"}
        </h2>
        <IconButton
          onClick={onClose}
          size="small"
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          <X size={20} />
        </IconButton>
      </div>

      <div className="px-6 py-2 space-y-5">
        <div>
          <InputLabel label="Name" required />
          <div className="relative">
            <input
              type="text"
              maxLength={200}
              value={form.name}
              onChange={handleChange("name")}
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
          {typeof errors.name === "string" && (
            <p className="text-red-500 text-xs mt-1.5">{errors.name}</p>
          )}
        </div>

        <div>
          <InputLabel label="OCN" required />
          <div className="relative">
            <input
              type="text"
              maxLength={50}
              value={form.oCN}
              onChange={handleChange("oCN")}
              onBlur={checkOcnExists}
              className={inputClasses(
                errors.oCN,
                form.oCN.length > 0 && !errors.oCN && !ocnChecking,
              )}
            />
            {/* Spinner while checking */}
            {ocnChecking && (
              <Loader2
                size={15}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 animate-spin"
              />
            )}
            {/* Green tick when valid and not checking */}
            {form.oCN.length > 0 && !errors.oCN && !ocnChecking && (
              <Check
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500"
              />
            )}
            {/* Red icon when duplicate found */}
            {errors.oCN && errors.oCN.includes("already exists") && (
              <AlertCircle
                size={15}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500"
              />
            )}
          </div>
          {typeof errors.oCN === "string" && errors.oCN && (
            <p
              className={`text-xs mt-1.5 flex items-center gap-1 ${
                errors.oCN.includes("already exists")
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-red-500"
              }`}
            >
              {errors.oCN.includes("already exists") && (
                <AlertCircle size={11} />
              )}
              {errors.oCN}
            </p>
          )}
        </div>

        <div>
          <InputLabel label="Country" required />
          <Autocomplete
            options={countries}
            getOptionLabel={(option) => option.name || ""}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            value={countries.find((c) => c.id === form.countryId) || null}
            onChange={(e, newValue) => {
              setForm((f) => ({
                ...f,
                countryId: newValue ? newValue.id : "",
              }));
              if (errors.countryId)
                setErrors((errs) => ({ ...errs, countryId: "" }));
            }}
            loading={loadingCountries}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "0.75rem",
                padding: "1.5px 12px",
                backgroundColor: "transparent",
                "& fieldset": {
                  border: "1px solid",
                  borderColor: errors.countryId
                    ? "rgb(248 113 113)"
                    : "inherit",
                },
              },
            }}
            className={`w-full transition-all text-sm rounded-xl ${
              errors.countryId
                ? "bg-red-50/50 text-red-900 placeholder:text-red-300 dark:bg-red-500/10 dark:text-red-200"
                : form.countryId
                  ? "bg-green-50/50 text-green-900 border-green-500 dark:bg-green-500/10 dark:text-green-200"
                  : "bg-slate-50 text-slate-700 dark:bg-[#242938] dark:text-slate-200"
            }`}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder={
                  loadingCountries
                    ? "Loading countries..."
                    : "Select a country..."
                }
                variant="outlined"
                sx={{
                  "& .MuiInputBase-input": {
                    padding: "10px !important",
                  },
                }}
              />
            )}
          />
          {typeof errors.countryId === "string" && (
            <p className="text-red-500 text-xs mt-1.5">{errors.countryId}</p>
          )}
        </div>

        <div>
          <InputLabel label="Address" />
          <div className="relative">
            <textarea
              rows={3}
              maxLength={500}
              value={form.address}
              onChange={handleChange("address")}
              className={`${inputClasses(errors.address, form.address.length > 0 && !errors.address)} resize-y`}
            />
            {form.address.length > 0 && !errors.address && (
              <Check
                size={16}
                className="absolute right-3 top-3 text-green-500"
              />
            )}
          </div>
          {typeof errors.address === "string" && (
            <p className="text-red-500 text-xs mt-1.5">{errors.address}</p>
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
          type="button"
          onClick={handleSubmit}
          disabled={loading || ocnChecking}
          className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm flex items-center justify-center min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-blue-100 dark:shadow-none transition-all"
        >
          {loading || ocnChecking ? (
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
