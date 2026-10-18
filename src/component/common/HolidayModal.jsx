import { useState } from "react";
import { Dialog, IconButton } from "@mui/material";
import { X } from "lucide-react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";
import "flatpickr/dist/themes/dark.css";

import { getApiErrorMessage } from "../../utils/apiError";
import PremiumErrorAlert from "./PremiumErrorAlert";

const EMPTY = {
  name: "",
  description: "",
  date: "",
  year: "",
  countryISOCode: "",
  countryName: "",
  type: "",
  locations: "",
};

const Label = ({ children, required }) => (
  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
    {children} {required && <span className="required-asterisk">*</span>}
  </label>
);

export default function HolidayModal({
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
      setForm(item ? {
        name: item.name || "",
        description: item.description || "",
        date: item.date ? item.date.slice(0, 10) : "",
        year: item.year == null ? "" : String(item.year),
        countryISOCode: item.countryISOCode || "",
        countryName: item.countryName || "",
        type: item.type || "",
        locations: item.locations || "",
      } : EMPTY);
    }
  }

  const handleChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      Name: form.name.trim(),
      Description: form.description.trim(),
      Date: form.date.trim(),
      Year: form.year === "" ? 0 : Number(form.year),
      CountryISOCode: form.countryISOCode.trim(),
      CountryName: form.countryName.trim(),
      Type: form.type.trim(),
      Locations: form.locations.trim(),
    };

    try {
      setSubmitting(true);
      setBackendError("");
      await onSubmit(isEdit ? { ...item, ...payload } : payload);
    } catch (error) {
      setBackendError(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClasses =
    "w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 outline-none transition-all text-sm bg-slate-50 dark:bg-slate-800 hover:border-slate-300 focus:bg-white focus:border-pink-500 text-slate-700 placeholder:text-slate-400 dark:text-slate-200 dark:focus:border-pink-500";

  const displayedError = submitError || backendError;

  return (
    <Dialog
      open={open}
      onClose={(event, reason) => {
        if (reason !== "backdropClick") onClose();
      }}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "24px",
          p: 1,
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
        },
        className: "bg-white dark:bg-[#161920] dark:text-white",
      }}
    >
      <div className="flex items-center justify-between px-8 pt-6 pb-2">
        <h2 className="text-xl text-slate-800 dark:text-white">
          {isEdit ? "Update Holiday" : "Create Holiday"}
        </h2>
        <IconButton
          onClick={onClose}
          className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <X size={18} />
        </IconButton>
      </div>

      <form onSubmit={handleSubmit} className="px-8 py-6">
        <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
          {displayedError && (
            <PremiumErrorAlert
              open={!!displayedError}
              message={displayedError}
              onClose={() => {
                setBackendError("");
                onSubmitErrorClose?.();
              }}
            />
          )}

          <div>
            <Label required>Holiday Name</Label>
            <input type="text" placeholder="Enter Holiday Name" value={form.name} onChange={handleChange("name")} className={inputClasses} />
          </div>

          <div>
            <Label required>Description</Label>
            <input type="text" placeholder="Enter holiday description" value={form.description} onChange={handleChange("description")} className={inputClasses} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <Label required>Date</Label>
              <Flatpickr
                value={form.date}
                onChange={(dates, dateString) => {
                  setForm((current) => ({
                    ...current,
                    date: dateString,
                    year: dates[0] ? String(dates[0].getFullYear()) : current.year,
                  }));
                }}
                options={{
                  dateFormat: "Y-m-d",
                  allowInput: true,
                  disableMobile: true,
                }}
                placeholder="YYYY-MM-DD"
                className={inputClasses}
              />
            </div>
            <div>
              <Label required>Year</Label>
              <input type="text" placeholder="Enter year" value={form.year} onChange={handleChange("year")} className={inputClasses} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <Label>Country</Label>
              <input type="text" placeholder="Enter country" value={form.countryName} onChange={handleChange("countryName")} className={inputClasses} />
            </div>
            <div>
              <Label>Country ISO Code</Label>
              <input type="text" placeholder="Enter ISO code" value={form.countryISOCode} onChange={handleChange("countryISOCode")} className={inputClasses} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <Label>Locations</Label>
              <input type="text" placeholder="Enter location" value={form.locations} onChange={handleChange("locations")} className={inputClasses} />
            </div>
            <div>
              <Label required>Holiday Type</Label>
              <input type="text" placeholder="Enter holiday type" value={form.type} onChange={handleChange("type")} className={inputClasses} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 mt-10">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-[11px] font-black text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 uppercase tracking-widest"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || submitting}
            className="app-primary-button px-10 py-3 text-[11px] flex items-center justify-center min-w-[160px] uppercase tracking-widest"
          >
            {loading || submitting ? "Saving..." : isEdit ? "Save Changes" : "Create Holiday"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
