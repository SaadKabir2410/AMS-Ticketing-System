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
        <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-400 mb-1.5 group-focus-within/field:text-pink-600 transition-colors flex items-center gap-2">
          {label.includes("*") ? (
            <>
              {label.split("*")[0]}
              <span className="text-rose-500 animate-pulse">*</span>
            </>
          ) : (
            label
          )}
        </label>
      )}
      <div className="relative">{children}</div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[11px] font-semibold text-rose-600 flex items-center gap-1.5 mt-1.5"
        >
          <AlertCircle size={10} strokeWidth={2.5} /> {error}
        </motion.p>
      )}
    </div>
  );
}

const inputClass =
  "w-full px-4 py-2.5 rounded-xl border border-transparent border-slate-500 bg-slate-100 dark:bg-slate-800/50 backdrop-blur-sm text-sm outline-none transition-all duration-300 focus:bg-white dark:focus:bg-slate-900 focus:border-pink-500/30 focus:ring-4 focus:ring-pink-500/10 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800/50 font-medium text-black dark:text-slate-200 placeholder:text-slate-500/80";

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

  const filteredOptions = (options || []).filter((opt) => {
    const label = opt.label || String(opt);
    return label.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        onClick={() => !disabled && setOpen(!open)}
        className={`${inputClass} flex items-center justify-between cursor-pointer ${disabled
          ? "opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/30"
          : ""
          } ${error ? "border-rose-500" : ""}`}
      >
        <div className="flex items-center gap-3 truncate">
          <Search size={14} className={`text-slate-400 group-focus-within:text-pink-500 transition-colors ${!value ? "opacity-50" : "opacity-100"}`} />
          <span
            className={`truncate ${!value ? "text-slate-600/80" : "text-black dark:text-white"
              }`}
          >
            {options?.find(opt => (opt.value || opt) === value)?.label || value || placeholder}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`transition-transform duration-300 ${open ? "rotate-180" : ""
            } text-slate-400 shrink-0 ml-2`}
        />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute z-[100] mt-2 w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col max-h-[300px]"
          >
            <div className="p-3 border-b border-slate-100/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50">
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
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-100 dark:bg-slate-900 border border-transparent rounded-xl text-xs outline-none focus:bg-white dark:focus:bg-slate-950 focus:ring-4 focus:ring-pink-500/5 focus:border-pink-500/20 transition-all placeholder:text-slate-500/80"
                />
              </div>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 py-1.5">
              {loading ? (
                <div className="p-8 text-center flex flex-col items-center gap-2">
                  <div className="w-4 h-4 border-2 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Loading...</span>
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="p-10 text-center flex flex-col items-center gap-1.5">
                  <AlertCircle size={20} className="text-slate-300" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">No results found</span>
                </div>
              ) : (
                <div className="px-2 space-y-0.5">
                  {filteredOptions.map((opt, idx) => {
                    const label = opt.label || String(opt);
                    const val = opt.value || opt;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          onChange(val);
                          setOpen(false);
                          setSearch("");
                        }}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between group/opt ${value === val
                          ? "bg-pink-50 dark:bg-pink-500/10 text-pink-600 font-bold"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/80 hover:text-black dark:hover:text-white"
                          }`}
                      >
                        <span className="truncate">{label}</span>
                        {value === val && (
                          <motion.div
                            layoutId="active-check"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                          >
                            <Check size={14} strokeWidth={3} />
                          </motion.div>
                        )}
                      </button>
                    );
                  })}
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
  activityTypeId: "",    // ✅ add
  startDate: "",
  endDate: "",
  durationHours: "",
  workDoneCode: "",
  workDoneCodeId: "",    // ✅ add — UUID for API
  resolvedBy: "",
  resolvedById: "",      // ✅ add — UUID for API
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
      usersApi.getUsersList({ organizationTypes: [2, 3] }).catch(() => []),
      codeDetailsApi.getListByLookupCodes({
        lookupCodes: ["ActivityType"]
      }).catch(() => ({})),
      workCodesApi.getAll().catch(() => [])
    ]).then(([usersRes, lookupsRes, workCodesRes]) => {
      const activityTypes = (lookupsRes["ActivityType"] || [])
        .map(item => item.description || item.newCode)
        .sort((a, b) => a.localeCompare(b));

      // ✅ Store full objects so we have both label and id
      const workDoneCodeObjects = (workCodesRes || [])
        .map(item => ({
          label: `${item.code} - ${item.description}`,
          id: item.id,  // UUID
        }))
        .sort((a, b) => a.label.localeCompare(b.label));

      const userObjects = (usersRes || [])
        .map(u => ({
          label: u.name || u.userName,
          id: u.id,  // UUID
        }))
        .filter(u => u.label)
        .sort((a, b) => a.label.localeCompare(b.label));

      setApiData({
        activityTypes: activityTypes.length > 0
          ? activityTypes
          : ["Documentaion", "Technical"],
        workDoneCodes: workDoneCodeObjects,   // ✅ full objects
        users: userObjects,                   // ✅ full objects
      });
    }).finally(() => setLoadingApis(false));

  }, [open, activity]);

  useEffect(() => {
    if (form.startDate && form.endDate) {
      const start = new Date(form.startDate);
      const end = new Date(form.endDate);
      if (end > start) {
        const diffHours = (end - start) / (1000 * 60 * 60);
        if (form.durationHours !== diffHours.toFixed(2)) {
          setForm(f => ({ ...f, durationHours: diffHours.toFixed(2) }));
        }
      } else {
        if (form.durationHours !== "0.00") {
          setForm(f => ({ ...f, durationHours: "0.00" }));
        }
      }
    }
  }, [form.startDate, form.endDate]);

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
    onSubmit({
      ...form,
      durationMinutes: form.durationHours ? parseFloat(form.durationHours) * 60 : 0,
      workDoneCodeId: form.workDoneCodeId,   // ✅ UUID passed up
      resolvedById: form.resolvedById,        // ✅ UUID passed up
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
                  <nav className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 dark:text-slate-500 mb-0.5">
                    <span>AMS</span>
                    <span className="text-slate-300 dark:text-slate-700">/</span>
                    <span className="text-pink-600">Activity</span>
                  </nav>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
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
                      options={{ enableTime: true, dateFormat: "Y-m-d\\TH:i", time_24hr: true }}
                      className={`${inputClass} !pr-10 ${errors.startDate ? "border-rose-500 text-rose-600" : ""}`}
                      placeholder="YYYY-MM-DD HH:MM"
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-pink-500 transition-colors pointer-events-none">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
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
                      options={{ enableTime: true, dateFormat: "Y-m-d\\TH:i", time_24hr: true }}
                      className={`${inputClass} !pr-10 ${errors.endDate ? "border-rose-500 text-rose-600" : ""}`}
                      placeholder="YYYY-MM-DD HH:MM"
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-pink-500 transition-colors pointer-events-none">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
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
                      readOnly
                      className={`${inputClass} opacity-70 cursor-not-allowed`}
                      placeholder="0.0"
                    />
                  </div>
                </Field>

                {/* Work Done Code */}
                <Field label="Work Done Code *" error={errors.workDoneCode}>
                  <Combobox
                    value={form.workDoneCode}
                    onChange={(label) => {
                      const found = apiData.workDoneCodes.find(w => w.label === label);
                      setForm(f => ({
                        ...f,
                        workDoneCode: label,
                        workDoneCodeId: found?.id || "",   // ✅ store UUID
                      }));
                      if (errors.workDoneCode) setErrors(e => ({ ...e, workDoneCode: "" }));
                    }}
                    options={apiData.workDoneCodes.map(w => w.label)}  // ✅ show labels
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
                  onChange={(label) => {
                    const found = apiData.users.find(u => u.label === label);
                    setForm(f => ({
                      ...f,
                      resolvedBy: label,
                      resolvedById: found?.id || "",   // ✅ store UUID
                    }));
                    if (errors.resolvedBy) setErrors(e => ({ ...e, resolvedBy: "" }));
                  }}
                  options={apiData.users.map(u => u.label)}  // ✅ show labels
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
