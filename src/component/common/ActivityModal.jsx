import { useState, useEffect } from "react";
import { X, Calendar, AlertCircle } from "lucide-react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";
import { usersApi } from "../../services/api/users";
// Assuming you might have these imports later, otherwise we'll mock the fetch for now
// import { amsTicketApi } from "../../services/api/amsTicketApi";

function Field({ label, error, children }) {
  return (
    <div className="space-y-1.5 flex flex-col">
      {label && (
        <label className="text-sm text-slate-600 dark:text-slate-300 font-medium">
          {label.includes('*') ? (
            <>{label.split('*')[0]}<span className="text-[#e91e63] ml-0.5">*</span></>
          ) : (
            label
          )}
        </label>
      )}
      {children}
      {error && (
        <p className="text-[11px] text-red-500 flex items-center gap-1 mt-0.5">
          <AlertCircle size={10} /> {error}
        </p>
      )}
    </div>
  );
}

const inputClass =
  "w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all";

const EMPTY = {
  activityType: "",
  startDate: "",
  endDate: "",
  durationHours: "",
  workDoneCode: "",
  resolvedBy: "",
  likelyCause: false,
};

export default function ActivityModal({ open, onClose, onSubmit, activity = null }) {
  const isEdit = !!activity;
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  const [loadingApis, setLoadingApis] = useState(false);
  const [apiData, setApiData] = useState({
    activityTypes: [],
    workDoneCodes: [],
    users: [],
  });

  useEffect(() => {
    if (open) {
      setErrors({});
      if (activity) {
        setForm({
          ...EMPTY,
          ...activity,
        });
      } else {
        setForm({ ...EMPTY });
      }

      setLoadingApis(true);
      
      // Fetching required data for dropdowns dynamically
      Promise.all([
        usersApi.getUsersList().catch(() => []),
        // MOCK: Replace these with your actual APIs when ready 
        Promise.resolve(["Maintenance", "Repair", "Installation", "Inspection"]), // Activity Types
        Promise.resolve(["W001 - Replaced Part", "W002 - Software Update", "W003 - Network Fix", "W004 - General Servicing"]) // Work Done Codes
      ]).then(([usersRes, activityTypesRes, workDoneCodesRes]) => {
        setApiData({
          users: (usersRes || []).map(u => u.name || u.userName).filter(Boolean),
          activityTypes: activityTypesRes,
          workDoneCodes: workDoneCodesRes,
        });
      }).finally(() => {
        setLoadingApis(false);
      });
    }
  }, [open, activity]);

  const setField = (key) => (e) => {
    let val = e.target.value;
    if (e.target.type === "checkbox") {
      val = e.target.checked;
    }
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((errs) => ({ ...errs, [key]: "" }));
  };

  const handleToggleLikelyCause = (e) => {
    setForm(f => ({ ...f, likelyCause: e.target.checked }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.activityType) newErrors.activityType = "Activity Type is required";
    if (!form.startDate) newErrors.startDate = "Start Date is required";
    if (!form.endDate) newErrors.endDate = "End Date is required";
    if (!form.workDoneCode) newErrors.workDoneCode = "Work Done Code is required";
    if (!form.resolvedBy) newErrors.resolvedBy = "Resolved By is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Convert durationHours back to expected durationMinutes if needed, or keep it.
    // Assuming you want it as presented in the UI:
    onSubmit({
      ...form, 
      durationMinutes: form.durationHours ? parseFloat(form.durationHours) * 60 : 0
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-[17px] text-slate-800 dark:text-white font-semibold">
            {isEdit ? "Edit Activity" : "New Activity"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all outline-none"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-5 overflow-y-auto max-h-[75vh]">
          
          {/* Activity Type */}
          <Field label="Activity Type *" error={errors.activityType}>
            <select
              value={form.activityType}
              onChange={setField("activityType")}
              className={`w-full text-sm px-3 py-2 rounded-lg border outline-none transition-all ${
                errors.activityType 
                  ? 'border-[#e91e63] bg-[#fff0f4] text-[#e91e63]' 
                  : form.activityType 
                    ? 'border-[#e91e63] bg-[#fffbed] text-slate-800' 
                    : 'border-[#e91e63] bg-[#fffbed] text-slate-800 dark:bg-yellow-900/20 dark:border-yellow-600 dark:text-amber-100'
              }`}
              disabled={loadingApis}
            >
              <option value="" disabled selected>Select An Option</option>
              {apiData.activityTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </Field>

          {/* Start Date */}
          <Field label="Start Date *" error={errors.startDate}>
            <div className="flex items-center w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition-all">
              <div className="flex items-center justify-center bg-slate-100 dark:bg-slate-700/50 w-10 border-r border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                <Calendar size={15} strokeWidth={2.5} />
              </div>
              <Flatpickr
                data-enable-time
                value={form.startDate}
                onChange={(date, dateStr) => {
                  setForm(f => ({ ...f, startDate: dateStr }));
                  if (errors.startDate) setErrors(e => ({ ...e, startDate: "" }));
                }}
                options={{ enableTime: true, dateFormat: "d/m/Y H:i", time_24hr: true }}
                className="w-full bg-transparent text-sm h-10 px-3 outline-none text-slate-700 dark:text-slate-200"
                placeholder="DD/MM/YYYY"
              />
            </div>
          </Field>

          {/* End Date */}
          <Field label="End Date *" error={errors.endDate}>
            <div className="flex items-center w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition-all">
              <div className="flex items-center justify-center bg-slate-100 dark:bg-slate-700/50 w-10 border-r border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                <Calendar size={15} strokeWidth={2.5} />
              </div>
              <Flatpickr
                data-enable-time
                value={form.endDate}
                onChange={(date, dateStr) => {
                  setForm(f => ({ ...f, endDate: dateStr }));
                  if (errors.endDate) setErrors(e => ({ ...e, endDate: "" }));
                }}
                options={{ enableTime: true, dateFormat: "d/m/Y H:i", time_24hr: true }}
                className="w-full bg-transparent text-sm h-10 px-3 outline-none text-slate-700 dark:text-slate-200"
                placeholder="DD/MM/YYYY"
              />
            </div>
          </Field>

          {/* Duration (Hours) */}
          <Field label="Duration (Hours)" error={errors.durationHours}>
            <input
              type="number"
              step="0.1"
              min="0"
              value={form.durationHours}
              onChange={setField("durationHours")}
              className={inputClass}
            />
          </Field>

          {/* Work Done Code */}
          <Field label="Work Done Code *" error={errors.workDoneCode}>
            <select
              value={form.workDoneCode}
              onChange={setField("workDoneCode")}
              className={inputClass}
              disabled={loadingApis}
            >
              <option value="" disabled selected>Search work done codes...</option>
              {apiData.workDoneCodes.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </Field>

          {/* Resolved By */}
          <Field label="Resolved By *" error={errors.resolvedBy}>
            <select
              value={form.resolvedBy}
              onChange={setField("resolvedBy")}
              className={inputClass}
              disabled={loadingApis}
            >
              <option value="" disabled selected>Search users...</option>
              {apiData.users.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </Field>

          {/* Likely Cause Toggle */}
          <div className="flex items-center gap-3 pt-2">
            <label className="flex items-center gap-3 cursor-pointer w-max">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={form.likelyCause}
                  onChange={handleToggleLikelyCause}
                />
                <div className={`block w-[34px] h-[18px] rounded-full transition-colors duration-300 ease-in-out ${form.likelyCause ? "bg-[#52525b]" : "bg-[#e4e4e7]"}`}></div>
                <div className={`absolute left-0.5 bg-white w-3.5 h-3.5 rounded-full transition-transform duration-300 ease-in-out shadow-sm ${form.likelyCause ? "transform translate-x-[16px]" : ""}`}></div>
              </div>
              <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">Likely Cause</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium rounded-lg border border-[#6b58dc]/30 text-[#6b58dc] hover:bg-[#6b58dc]/5 dark:border-indigo-400 dark:text-indigo-400 dark:hover:bg-indigo-400/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 text-sm font-medium rounded-lg border border-[#4a3bc7] text-[#4a3bc7] bg-white hover:bg-[#4a3bc7] hover:text-white dark:border-indigo-500 dark:text-indigo-400 dark:bg-transparent dark:hover:bg-indigo-500 dark:hover:text-white transition-colors flex items-center justify-center min-w-[90px]"
          >
            {isEdit ? "Save" : "Create"}
          </button>
        </div>

      </div>
    </div>
  );
}
