import { useState } from "react";
import { Dialog, IconButton } from "@mui/material";
import { X, Check } from "lucide-react";

import PremiumErrorAlert from "./PremiumErrorAlert";




const LOCAL_COUNTRIES = [
  { id: "gb", name: "United Kingdom", code: "GB" },
  { id: "my", name: "Malaysia", code: "MY" },
  { id: "us", name: "United States", code: "US" },
  { id: "au", name: "Australia", code: "AU" },
  { id: "ca", name: "Canada", code: "CA" },
  { id: "de", name: "Germany", code: "DE" },
  { id: "fr", name: "France", code: "FR" },
  { id: "in", name: "India", code: "IN" },
  { id: "sg", name: "Singapore", code: "SG" },
  { id: "ae", name: "United Arab Emirates", code: "AE" },
  { id: "jp", name: "Japan", code: "JP" },
  { id: "cn", name: "China", code: "CN" },
  { id: "za", name: "South Africa", code: "ZA" },
  { id: "ng", name: "Nigeria", code: "NG" },
  { id: "pk", name: "Pakistan", code: "PK" },
  { id: "bd", name: "Bangladesh", code: "BD" },
  { id: "id", name: "Indonesia", code: "ID" },
  { id: "ph", name: "Philippines", code: "PH" },
  { id: "nz", name: "New Zealand", code: "NZ" },
  { id: "ie", name: "Ireland", code: "IE" },
];

const EMPTY = {
  name: "",
  description: "",
  date: "",
  year: new Date().getFullYear(),
  countryId: "",
  countryISOCode: "",
  countryName: "",
  type: "",
  locations: "",
  disabled: false,
};

const HOLIDAY_TYPES = [
  "Public",
  "Regional",
  "Optional",
  "Bank Holiday",
  "Other",
];

const Label = ({ children, required }) => (
  <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1.5">
    {children} {required && <span className="text-red-500">*</span>}
  </label>
);

export default function HolidayModal({
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
  const countries = [...LOCAL_COUNTRIES].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const [prevOpen, setPrevOpen] = useState(open);
  const [prevItem, setPrevItem] = useState(item);

  if (open !== prevOpen || item !== prevItem) {
    setPrevOpen(open);
    setPrevItem(item);
    if (open) {
      setErrors({});
      if (item) {
        setForm({
          name: item.name || "",
          description: item.description || "",
          date: item.date ? item.date.slice(0, 10) : "",
          year: item.year || new Date().getFullYear(),
          countryId: item.countryId || "",
          countryISOCode: item.countryISOCode || "",
          countryName: item.countryName || "",
          type: item.type || "",
          locations: item.locations || "",
          disabled: !!item.disabled,
        });
      } else {
        setForm(EMPTY);
      }
    }
  }

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (form.name.length > 200) errs.name = "Maximum 200 characters";

    if (!form.description.trim()) errs.description = "Description is required";
    if (form.description.length > 1000)
      errs.description = "Maximum 1000 characters";

    if (!form.date) errs.date = "Date is required";

    if (!form.type) errs.type = "Type is required";

    if (!form.year) errs.year = "Year is required";
    const y = parseInt(form.year);
    if (isNaN(y) || y < 2000 || y > 2200)
      errs.year = "Year must be between 2000-2200";

    if (form.locations && form.locations.length > 100)
      errs.locations = "Maximum 100 characters";

    return errs;
  };

  const handleCountryChange = (e) => {
    const id = e.target.value;
    const selected = countries.find((c) => c.id === id);
    setForm({
      ...form,
      countryId: id,
      countryName: selected ? selected.name : "",
      countryISOCode: selected ? selected.code || "" : "",
    });
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    const payload = {
      Name: form.name.trim(),
      Description: form.description.trim(),
      Date: form.date,
      Year: parseInt(form.year, 10),
      CountryISOCode: form.countryISOCode,
      CountryName: form.countryName,
      Type: form.type,
      Locations: form.locations.trim(),
      Disabled: form.disabled,
    };

    try {
      // Include concurrency stamp and other system fields if editing
      const finalPayload = isEdit ? { ...item, ...payload } : payload;
      await onSubmit(finalPayload);
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message;
      setErrors({ server: msg });
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
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "24px",
          p: 1,
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
        },
        className: "bg-white dark:bg-slate-900 dark:text-white",
      }}
    >
      <div className="flex items-center justify-between px-8 pt-6 pb-2">
        <div>
          <h2 className="text-xl text-slate-800 dark:text-white ">
            {isEdit ? "Update Holiday" : "Create Holiday"}
          </h2>
          <p className="text-[10px] text-blue-500 mt-0.5">
            Manage Calendar Events
          </p>
        </div>
        <IconButton
          onClick={onClose}
          className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10"
        >
          <X size={18} />
        </IconButton>
      </div>

      <form onSubmit={handleSubmit} className="px-8 py-6">
        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
          {(submitError || errors.server) && (
            <PremiumErrorAlert 
              open={!!(submitError || errors.server)} 
              message={submitError || errors.server} 
              onClose={() => setErrors(prev => ({ ...prev, server: null }))}
            />
          )}

          {/* Name */}
          <div>
            <Label required>Holiday Name</Label>
            <input
              type="text"
              maxLength={200}
              placeholder="e.g. Christmas Day"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClasses(
                errors.name,
                form.name.length > 0 && !errors.name,
              )}
            />
            {errors.name && (
              <p className="text-red-500 text-[10px] mt-1.5 ml-1">
                {errors.name}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label required>Description</Label>
            <textarea
              rows={3}
              maxLength={1000}
              placeholder="Add holiday details..."
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className={
                inputClasses(
                  errors.description,
                  form.description.length > 0 && !errors.description,
                ) + " resize-none"
              }
            />
            {errors.description && (
              <p className="text-red-500 text-[10px] mt-1.5 ml-1">
                {errors.description}
              </p>
            )}
          </div>

          {/* Date & Year */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label required>Date</Label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={inputClasses(errors.date, !!form.date)}
              />
              {errors.date && (
                <p className="text-red-500 text-[10px] mt-1.5 ml-1">
                  {errors.date}
                </p>
              )}
            </div>
            <div>
              <Label required>Year</Label>
              <input
                type="number"
                min="2000"
                max="2200"
                placeholder="2024"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
                className={inputClasses(errors.year, !!form.year)}
              />
              {errors.year && (
                <p className="text-red-500 text-[10px] mt-1.5 ml-1">
                  {errors.year}
                </p>
              )}
            </div>
          </div>

          {/* Country & Locations */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label>Country</Label>
              <select
                value={form.countryId}
                onChange={handleCountryChange}
                className={inputClasses(false, !!form.countryId)}
              >
                <option value="">Global / Select...</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {form.countryISOCode && (
                <p className="text-[10px] text-blue-500 mt-1 ml-1">
                  ISO: {form.countryISOCode}
                </p>
              )}
            </div>
            <div>
              <Label>Locations</Label>
              <input
                type="text"
                maxLength={100}
                placeholder="Specific region..."
                value={form.locations}
                onChange={(e) =>
                  setForm({ ...form, locations: e.target.value })
                }
                className={inputClasses(
                  errors.locations,
                  form.locations.length > 0,
                )}
              />
              {errors.locations && (
                <p className="text-red-500 text-[10px] mt-1.5 ml-1">
                  {errors.locations}
                </p>
              )}
            </div>
          </div>

          {/* Type & Disabled */}
          <div className="grid grid-cols-2 gap-6 items-end">
            <div>
              <Label required>Holiday Type</Label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className={inputClasses(errors.type, !!form.type)}
              >
                <option value="">Select Type...</option>
                {HOLIDAY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {errors.type && (
                <p className="text-red-500 text-[10px] mt-1.5 ml-1">
                  {errors.type}
                </p>
              )}
            </div>
            <div className="pb-2.5">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${form.disabled ? "bg-red-500 border-red-500 shadow-lg shadow-red-500/20" : "border-slate-200 dark:border-white/10 group-hover:border-red-400"}`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={form.disabled}
                    onChange={(e) =>
                      setForm({ ...form, disabled: e.target.checked })
                    }
                  />
                  {form.disabled && (
                    <Check size={14} className="text-white" strokeWidth={4} />
                  )}
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-300 text-[11px]">
                  Holiday Disabled
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 mt-10">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-3 rounded-2xl border border-slate-200 dark:border-white/10 text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm flex items-center justify-center min-w-[160px] disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl shadow-blue-500/30 transition-all active:scale-95"
          >
            {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Holiday"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
