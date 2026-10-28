import { useState, useEffect } from "react";
import { Dialog, IconButton, Autocomplete, TextField } from "@mui/material";
import { X } from "lucide-react";

import { countriesApi } from "../../services/api/countries";
import { getApiErrorMessage, getApiFieldErrors } from "../../utils/apiError";



const EMPTY = {
  name: "",
  oCN: "",
  countryId: "",
  address: "",
  status: "Active",
};

const fallbackLocalize = (key) => key;

export default function SiteModal({
  open,
  onClose,
  onSubmit,
  site = null,
  loading = false,
  submitError = null,
  onSubmitErrorClose,
  localize = fallbackLocalize,
}) {
  const isEdit = !!site;
  const [form, setForm] = useState(EMPTY);
  const [validationErrors, setValidationErrors] = useState({});

  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [countryLoadError, setCountryLoadError] = useState("");

  useEffect(() => {
    if (open) {
      setCountryLoadError("");
      setValidationErrors({});
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
        setCountryLoadError(
          getApiErrorMessage(error) || localize("DefaultErrorMessage"),
        );
      } finally {
        setLoadingCountries(false);
      }
    };

    fetchCountries();
    return () => controller.abort(); // cleanup if modal closes mid-fetch
  }, [open, countries.length, localize]);

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setValidationErrors((current) => ({ ...current, [field]: "" }));
    onSubmitErrorClose?.();
  };

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const requiredMessage = (fieldName) =>
      localize("The {0} field is required.").replace("{0}", fieldName);
    const nextValidationErrors = {};
    if (!form.name.trim()) {
      nextValidationErrors.name = requiredMessage(localize("SiteName"));
    }
    if (!form.oCN.trim()) {
      nextValidationErrors.oCN = requiredMessage(localize("OCN"));
    }
    if (!form.countryId) {
      nextValidationErrors.countryId = requiredMessage(localize("Country"));
    }
    if (Object.keys(nextValidationErrors).length > 0) {
      setValidationErrors(nextValidationErrors);
      return;
    }

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
    <label className="block text-[11px] leading-4 font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
      {label} {required && <span className="required-asterisk">*</span>}
    </label>
  );

  const FieldError = ({ message }) =>
    message ? (
      <p className="mt-0.5 text-[10px] font-semibold leading-tight text-rose-600 dark:text-rose-400">
        {message}
      </p>
    ) : null;

  const inputClasses =
    "w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-100 text-slate-800 placeholder:text-slate-400 outline-none transition-all text-sm hover:border-gray-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/10 dark:border-gray-600 dark:bg-gray-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-gray-500 dark:focus:border-pink-500";
  const normalizedSubmitError =
    submitError && submitError?.response
      ? submitError
      : submitError
        ? { response: { data: submitError } }
        : null;
  const backendFieldErrors = normalizedSubmitError
    ? getApiFieldErrors(normalizedSubmitError)
    : {};
  const hasFieldErrors = Object.keys(backendFieldErrors).length > 0;
  const generalSubmitError =
    normalizedSubmitError && !hasFieldErrors
      ? getApiErrorMessage(normalizedSubmitError) ||
        localize("DefaultErrorMessage")
      : "";
  const nameError =
    validationErrors.name ||
    backendFieldErrors.name ||
    backendFieldErrors.siteName;
  const ocnError =
    validationErrors.oCN ||
    backendFieldErrors.ocn ||
    backendFieldErrors.oCN;
  const countryError =
    validationErrors.countryId ||
    backendFieldErrors.countryId ||
    backendFieldErrors.country ||
    countryLoadError;
  const addressError = backendFieldErrors.address;

  return (
    <Dialog
      open={open}
      onClose={(event, reason) => {
        if (reason === "backdropClick") return;
        onClose?.();
      }}
      disableEscapeKeyDown
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: "16px", p: 0 },
        className: "!bg-white dark:!bg-slate-900 dark:text-white font-[Arial] border border-slate-200 dark:border-slate-700",
      }}
    >
      <div className="flex items-center justify-between px-5 py-3 rounded-t-2xl bg-white dark:bg-slate-900">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {localize(isEdit ? "UpdateSite" : "CreateSite")}
        </h2>
        <IconButton
          onClick={onClose}
          size="small"
          aria-label={localize("Close")}
          className="!w-8 !h-8 !rounded-lg !text-slate-400 hover:!text-rose-500 hover:!bg-rose-50 dark:hover:!bg-rose-500/10"
        >
          <X size={18} />
        </IconButton>
      </div>

      <div className="px-5 py-2 space-y-2">
        <div>
          <InputLabel label={localize("SiteName")} required />
          <div className="relative">
            <input
              type="text"
              value={form.name}
              onChange={handleChange("name")}
              className={inputClasses}
            />
          </div>
          <FieldError message={nameError} />
        </div>

        <div>
          <InputLabel label={localize("OCN")} required />
          <div className="relative">
            <input
              type="text"
              value={form.oCN}
              onChange={handleChange("oCN")}
              className={inputClasses}
            />
          </div>
          <FieldError message={ocnError} />
        </div>

        <div>
          <InputLabel label={localize("Country")} required />
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
              setValidationErrors((current) => ({
                ...current,
                countryId: "",
              }));
              onSubmitErrorClose?.();
            }}
            loading={loadingCountries}
            className="site-country-combobox w-full"
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder={
                  loadingCountries
                    ? localize("LoadingWithThreeDot")
                    : localize("SelectBoxEmptyValueText")
                }
                variant="outlined"
              />
            )}
          />
          <FieldError message={countryError} />
        </div>

        <div>
          <InputLabel label={localize("Address")} />
          <div className="relative">
            <textarea
              rows={3}
              value={form.address}
              onChange={handleChange("address")}
              className={`${inputClasses} resize-y`}
            />
          </div>
          <FieldError message={addressError} />
          <FieldError message={generalSubmitError} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 px-5 py-3 rounded-b-2xl bg-white dark:bg-slate-900">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
        >
          {localize("Cancel")}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="app-primary-button px-6 py-2 text-xs flex items-center justify-center min-w-[110px]"
        >
          {loading
            ? localize("ProcessingWithThreeDot")
            : localize(isEdit ? "UpdateButtonText" : "Create")}
        </button>
      </div>
    </Dialog>
  );
}
