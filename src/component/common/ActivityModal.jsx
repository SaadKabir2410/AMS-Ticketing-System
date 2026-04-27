import { useState, useEffect } from "react";
import { X, Calendar, AlertCircle, Clock, Activity, Search, ChevronDown, Check } from "lucide-react";
import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";
import { usersApi } from "../../services/api/users";
import { workCodesApi } from "../../services/api/workCodes";
import codeDetailsApi from "../../services/api/CodeDetails";
import { amsTicketApi } from "../../services/api/amsTicketApi";

function Field({ label, error, children }) {
  return (
    <div className="space-y-1.5 flex flex-col group/field">
      {label && (
        <label className="text-[10px] uppercase font-bold tracking-widest text-black dark:text-slate-400 mb-0.5 group-focus-within/field:text-pink-600 transition-colors flex items-center gap-2">
          {label.includes('*') ? (
            <>{label.split('*')[0]}<span className="text-rose-500">*</span></>
          ) : (
            label
          )}
        </label>
      )}
      <div className="relative">
        {children}
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[10px] font-bold text-rose-600 flex items-center gap-1.5 mt-1.5 uppercase tracking-widest"
        >
          <AlertCircle size={10} strokeWidth={2.5} /> {error}
        </motion.p>
      )}
    </div>
  );
}

const inputClass =
  "w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none transition-all focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 shadow-sm font-medium text-black dark:text-slate-200 placeholder:text-slate-400/60";

function Combobox({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  loading,
  error,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = (options || []).filter((opt) =>
    String(opt).toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        onClick={() => !disabled && setOpen(!open)}
        className={`${inputClass} flex items-center justify-between cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/30" : ""} ${error ? "border-rose-500" : ""}`}
      >
        <span
          className={`truncate ${!value ? "text-slate-400" : "text-black dark:text-white"}`}
        >
          {value || placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""} text-slate-400 shrink-0 ml-2`}
        />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute z-[100] mt-2 w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[300px]"
          >
            <div className="p-3 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-4 focus:ring-pink-500/10 transition-all"
                />
              </div>
            </div>

            <div className="overflow-y-auto no-scrollbar flex-1">
              {loading ? (
                <div className="p-8 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Loading...
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="p-8 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  No results found
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        onChange(opt);
                        setOpen(false);
                        setSearch("");
                      }}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between ${value === opt
                        ? "bg-pink-50 dark:bg-pink-500/10 text-pink-600 font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-black dark:hover:text-white"
                        }`}
                    >
                      <span className="truncate">{opt}</span>
                      {value === opt && <Check size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
    if (!open) {
      setForm({ ...EMPTY });
      setErrors({});
      return;
    }

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

    Promise.all([
      usersApi.getUsersList().catch(() => []),
      codeDetailsApi.getListByLookupCodes({
        lookupCodes: ["ActivityType"]
      }).catch(() => ({})),
      workCodesApi.getAll().catch(() => [])
    ]).then(([usersRes, lookupsRes, workCodesRes]) => {
      const activityTypes = (lookupsRes["ActivityType"] || [])
        .map(item => item.description || item.newCode)
        .sort((a, b) => a.localeCompare(b));

      const workDoneCodes = (workCodesRes || [])
        .map(item => `${item.code} - ${item.description}`)
        .sort((a, b) => a.localeCompare(b));

      setApiData({
        users: (usersRes || [])
          .map((u) => u.name || u.userName)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b)),
        activityTypes: activityTypes.length > 0
          ? activityTypes
          : ["Maintenance", "Repair", "Installation", "Inspection"].sort((a, b) => a.localeCompare(b)),
        workDoneCodes: workDoneCodes.length > 0
          ? workDoneCodes
          : ["W001 - Replaced Part", "W002 - Software Update", "W003 - Network Fix", "W004 - General Servicing"].sort((a, b) => a.localeCompare(b)),
      });
    }).finally(() => {
      setLoadingApis(false);
    });
  }, [open, activity]);

  const setField = (key) => (e) => {
    let val = e?.target ? e.target.value : e;
    if (e?.target?.type === "checkbox") {
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
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60"
          />

          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            className="relative w-full max-w-2xl bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-auto max-h-[90vh] overflow-hidden font-[Arial]"
          >

            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-4">
                <div>
                  <nav className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">
                    <span>Ticket</span>
                    <span className="text-slate-300 dark:text-slate-700">/</span>
                    <span className="text-pink-600">Activity</span>
                  </nav>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {isEdit ? "Update Activity" : "New Activity"}
                  </h2>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all border border-slate-200 dark:border-slate-700"
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            {/* Body */}
            <div className="px-8 py-8 space-y-6 overflow-y-auto no-scrollbar max-h-[75vh]">

              {/* Activity Type */}
              <Field label="Activity Type *" error={errors.activityType}>
                <div className="relative group/input">
                  <Combobox
                    value={form.activityType}
                    onChange={setField("activityType")}
                    options={apiData.activityTypes}
                    placeholder="Select An Option"
                    disabled={loadingApis}
                    error={errors.activityType}
                  />
                </div>
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Start Date */}
                <Field label="Start Date *" error={errors.startDate}>
                  <div className="relative group/input">
                    <Flatpickr
                      data-enable-time
                      value={form.startDate}
                      onChange={(date, dateStr) => {
                        setForm(f => ({ ...f, startDate: dateStr }));
                        if (errors.startDate) setErrors(e => ({ ...e, startDate: "" }));
                      }}
                      options={{ enableTime: true, dateFormat: "Y-m-d H:i", time_24hr: true }}
                      className={inputClass}
                      placeholder="YYYY-MM-DD HH:MM"
                    />
                  </div>
                </Field>

                {/* End Date */}
                <Field label="End Date *" error={errors.endDate}>
                  <div className="relative group/input">
                    <Flatpickr
                      data-enable-time
                      value={form.endDate}
                      onChange={(date, dateStr) => {
                        setForm(f => ({ ...f, endDate: dateStr }));
                        if (errors.endDate) setErrors(e => ({ ...e, endDate: "" }));
                      }}
                      options={{ enableTime: true, dateFormat: "Y-m-d H:i", time_24hr: true }}
                      className={inputClass}
                      placeholder="YYYY-MM-DD HH:MM"
                    />
                  </div>
                </Field>

                {/* Duration (Hours) */}
                <Field label="Duration (Hours)" error={errors.durationHours}>
                  <div className="relative group/input">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={form.durationHours}
                      onChange={setField("durationHours")}
                      className={inputClass}
                      placeholder="0.0"
                    />
                  </div>
                </Field>

                {/* Work Done Code */}
                <Field label="Work Done Code *" error={errors.workDoneCode}>
                  <Combobox
                    value={form.workDoneCode}
                    onChange={setField("workDoneCode")}
                    options={apiData.workDoneCodes}
                    placeholder="Search codes..."
                    disabled={loadingApis}
                    error={errors.workDoneCode}
                  />
                </Field>
              </div>

              {/* Resolved By */}
              <Field label="Resolved By *" error={errors.resolvedBy}>
                <Combobox
                  value={form.resolvedBy}
                  onChange={setField("resolvedBy")}
                  options={apiData.users}
                  placeholder="Search users..."
                  disabled={loadingApis}
                  error={errors.resolvedBy}
                />
              </Field>

              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer w-max p-1 px-4 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                  <div className="relative group/toggle">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={form.likelyCause}
                      onChange={handleToggleLikelyCause}
                    />
                    <div className={`block w-10 h-6 rounded-full transition-all duration-300 ${form.likelyCause ? "bg-pink-600 shadow-lg shadow-pink-500/20" : "bg-slate-300 dark:bg-slate-700"}`}></div>
                    <motion.div
                      animate={{ x: form.likelyCause ? 18 : 2 }}
                      className={`absolute left-0 top-1 bg-white w-4 h-4 rounded-full shadow-md transition-all`}
                    />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Likely Cause of issue</span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-4 px-8 py-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-8 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-xl bg-pink-600 text-white shadow-lg shadow-pink-500/20 transition-all flex items-center justify-center min-w-[140px]"
              >
                {isEdit ? "Update Activity" : "Create Activity"}
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
