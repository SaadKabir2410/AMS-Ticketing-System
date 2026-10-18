import { useState, useEffect } from "react";
import { Dialog, IconButton, Autocomplete, TextField } from "@mui/material";
import { Check } from "lucide-react";

import { countriesApi } from "../../services/api/countries";
import { getApiErrorMessage } from "../../utils/apiError";
import PremiumErrorAlert from "./PremiumErrorAlert";



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
  onSubmitErrorClose,
}) {
  const isEdit = !!site;
  const [form, setForm] = useState(EMPTY);

  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [countryLoadError, setCountryLoadError] = useState("");

  useEffect(() => {
    if (open) {
      setCountryLoadError("");
      if (site) {
        const ocn = site.ocn || site.oCN || "";
        setForm({
          name: site.name || "",
          oCN: ocn,
          countryId: site.countryId || site.country?.id || "",
          address: site.address || "",
          status: site.status || "Active",
        });
      } else {
        setForm(EMPTY);
      }
    }
  }, [open, site]);

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
        setCountryLoadError(getApiErrorMessage(error));
      } finally {
        setLoadingCountries(false);
      }
    };

    fetchCountries();
    return () => controller.abort(); // cleanup if modal closes mid-fetch
  }, [open, countries.length]);

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
  };

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();

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
      {label} {required && <span className="required-asterisk">*</span>}
    </label>
  );

  const inputClasses = (isValid) =>
    `w-full px-4 py-2.5 rounded-xl border outline-none transition-all text-sm ` +
    (isValid
        ? `bg-green-50/50 border-green-500 focus:border-green-600 text-green-900 dark:bg-green-500/10 dark:border-green-500/50 dark:text-green-200`
        : `bg-slate-50 border-slate-200 hover:border-slate-300 focus:bg-white focus:border-blue-500 text-slate-700 placeholder:text-slate-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:focus:border-blue-500`);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: "16px", p: 1 },
        className: "bg-white dark:bg-slate-900 dark:text-white font-[Arial]",
      }}
    >
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {isEdit ? "Update Site" : "Create Site"}
        </h2>
        <IconButton
          onClick={onClose}
          size="small"
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >

        </IconButton>
      </div>

      <div className="px-6 py-2 space-y-5">
        {(submitError || countryLoadError) && (
          <PremiumErrorAlert
            open={!!(submitError || countryLoadError)}
            message={submitError || countryLoadError}
            onClose={() => {
              if (submitError) onSubmitErrorClose?.();
              else setCountryLoadError("");
            }}
          />
        )}

        <div>
          <InputLabel label="Name" required />
          <div className="relative">
            <input
              type="text"
              value={form.name}
              onChange={handleChange("name")}
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
          <InputLabel label="OCN" required />
          <div className="relative">
            <input
              type="text"
              value={form.oCN}
              onChange={handleChange("oCN")}
              className={inputClasses(form.oCN.length > 0)}
            />
            {form.oCN.length > 0 && (
              <Check
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500"
              />
            )}
          </div>
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
            }}
            loading={loadingCountries}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "0.75rem",
                padding: "1.5px 12px",
                backgroundColor: "transparent",
                "& fieldset": {
                  border: "1px solid",
                  borderColor: "inherit",
                },
              },
            }}
            className={`w-full transition-all text-sm rounded-xl ${form.countryId
                  ? "bg-green-50/50 text-green-900 border-green-500 dark:bg-green-500/10 dark:text-green-200"
                  : "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
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
        </div>

        <div>
          <InputLabel label="Address" />
          <div className="relative">
            <textarea
              rows={3}
              value={form.address}
              onChange={handleChange("address")}
              className={`${inputClasses(form.address.length > 0)} resize-y`}
            />
            {form.address.length > 0 && (
              <Check
                size={16}
                className="absolute right-3 top-3 text-green-500"
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 px-6 pt-6 pb-5">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="app-primary-button px-8 py-2.5 text-sm flex items-center justify-center min-w-[120px]"
        >
          {loading ? "Wait..." : isEdit ? (
            "Update"
          ) : (
            "Create"
          )}
        </button>
      </div>
    </Dialog>
  );
}
