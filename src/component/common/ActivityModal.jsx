import { useState, useEffect } from "react";
import { X, Calendar, AlertCircle, Clock, Activity, Search, ChevronDown, Check } from "lucide-react";
import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DateTimePicker from "./DateTimePicker";
import { usersApi } from "../../services/api/users";
import { workCodesApi } from "../../services/api/workCodes";
import { amsTicketApi } from "../../services/api/amsTicketApi";
import { loadBackendEnumTypes } from "../../services/backendEnumCache";
import SearchTextHighlight from "./SearchTextHighlight";

function Field({ label, error, children }) {
  return (
    <div className="space-y-0 flex flex-col group/field">
      {label && (
        <label className="text-[11px] leading-4 font-semibold text-slate-700 dark:text-slate-400 group-focus-within/field:text-pink-600 transition-colors flex items-center gap-1">
          {label.includes("*") ? (
            <>
              {label.split("*")[0]}
              <span className="required-asterisk animate-pulse">*</span>
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
          className="text-[10px] font-semibold text-rose-600 flex items-center gap-1 mt-0.5 leading-tight"
        >
          <AlertCircle size={10} strokeWidth={2.5} /> {error}
        </motion.p>
      )}
    </div>
  );
}

const inputClass =
  "w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 !bg-gray-100 dark:!bg-gray-800 backdrop-blur-sm text-sm outline-none transition-all duration-300 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 shadow-sm font-medium text-black dark:text-slate-200 placeholder:text-slate-500/80";

function Combobox({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  loading,
  error,
  localize = (key) => key,
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
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = (options || []).filter((opt) => {
    const label = opt.label || String(opt);
    return label.toLowerCase().includes(search.toLowerCase());
  });

  const resolveDisplayLabel = () => {
    if (value == null || value === "") return placeholder;

    const valueText = String(value).toLowerCase().trim();
    const match = (options || []).find((option) => {
      const optionValue = option.value ?? option;
      const optionLabel = option.label || String(optionValue);
      return (
        String(optionValue).toLowerCase().trim() === valueText ||
        optionLabel.toLowerCase().trim() === valueText
      );
    });

    return match ? match.label || String(match.value ?? match) : String(value);
  };

  const displayLabel = resolveDisplayLabel();
  const hasValue = value != null && value !== "";

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        onClick={() => {
          if (!disabled && !open) {
            setSearch(hasValue ? displayLabel : "");
            setOpen(true);
          }
        }}
        className={`${inputClass} app-combobox-trigger flex items-center justify-between ${disabled
          ? "opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/30"
          : "cursor-text"
          } ${error ? "border-rose-500" : ""}`}
      >
        <div className="flex items-center gap-3 w-full min-w-0">
          <Search size={14} className={`text-slate-400 group-focus-within:text-pink-500 transition-colors ${!value ? "opacity-50" : "opacity-100"}`} />
          <input
            type="text"
            autoComplete="off"
            value={open ? search : hasValue ? displayLabel : ""}
            placeholder={placeholder}
            disabled={disabled}
            onFocus={() => {
              if (!disabled && !open) {
                setSearch(hasValue ? displayLabel : "");
                setOpen(true);
              }
            }}
            onChange={(event) => {
              const typedValue = event.target.value;
              setSearch(typedValue);
              if (!open) setOpen(true);
            }}
            className="w-full min-w-0 bg-transparent outline-none pointer-events-auto cursor-text select-text text-black dark:text-white placeholder:text-slate-600/80"
          />
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {hasValue && !disabled && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onChange("");
                setSearch("");
                setOpen(false);
              }}
              className="p-1 rounded-md text-slate-400 hover:text-rose-500 transition-colors"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (!disabled) {
                if (!open) setSearch(hasValue ? displayLabel : "");
                setOpen(!open);
              }
            }}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ChevronDown
              size={16}
              className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="app-combobox-menu absolute z-[100] mt-2 w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col max-h-[300px]"
          >
            <div className="overflow-y-auto custom-scrollbar flex-1 py-1.5">
              {loading ? (
                <div className="p-8 text-center flex flex-col items-center gap-2">
                  <div className="w-4 h-4 border-2 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{localize("LoadingWithThreeDot")}</span>
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="p-10 text-center flex flex-col items-center gap-1.5">
                  <AlertCircle size={20} className="text-slate-300" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{localize("NoDataAvailableInDatatable")}</span>
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
                        <span className="truncate">
                          <SearchTextHighlight text={label} query={search} />
                        </span>
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
  isLikelyCause: false,
};

export default function ActivityModal({
  open,
  onClose,
  onSubmit,
  activity = null,
  ticketReceivedDate = "",
  localize = (key) => key,
}) {
  const isEdit = !!activity;
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  const [loadingApis, setLoadingApis] = useState(false);
  const [apiData, setApiData] = useState({
    activityTypes: [], // Array of { label, enumValue }
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
      loadBackendEnumTypes().catch(() => ({})),
      workCodesApi.getAll().catch(() => [])
    ]).then(([usersRes, enumTypes, workCodesRes]) => {
      // Activity types use the backend ActivityTypeEnum values, as the Blazor client does.
      const activityTypeObjects = (enumTypes?.ActivityTypeEnum || [])
        .filter(member => member.value > 0)
        .map(member => {
          // localize returns the key itself when the backend has no text for it.
          const enumKey = `Enum:ActivityTypeEnum.${member.name}`;
          const enumText = localize(enumKey);
          return {
            label:
              (enumText !== enumKey && enumText) ||
              amsTicketApi.resolveActivityTypeLabel(member.value) ||
              member.name,
            enumValue: member.value,
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label));

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

      const resolvedTypes = activityTypeObjects.length > 0
        ? activityTypeObjects
        : amsTicketApi.ACTIVITY_TYPE_OPTIONS;

      setApiData({
        activityTypes: resolvedTypes,
        workDoneCodes: workDoneCodeObjects,   // ✅ full objects
        users: userObjects,                   // ✅ full objects
      });

      // Reconcile API IDs with their display labels when editing an activity.
      setForm(prev => {
        const next = { ...prev };
        const rawType = prev.activityType;
        if (rawType !== null && rawType !== undefined && rawType !== "" && !isNaN(Number(rawType))) {
          const numVal = Number(rawType);
          const match = resolvedTypes.find(o => o.enumValue === numVal);
          if (match) {
            next.activityType = match.label;
            next.activityTypeId = match.enumValue;
          }
        } else {
          const match = resolvedTypes.find(
            o => o.label.toLowerCase() === String(rawType || "").toLowerCase(),
          );
          if (match) next.activityTypeId = match.enumValue;
        }

        const workDoneCodeId = prev.workDoneCodeId || "";
        const workDoneCode = workDoneCodeObjects.find(
          item => String(item.id).toLowerCase() === String(workDoneCodeId).toLowerCase(),
        );
        if (workDoneCode) next.workDoneCode = workDoneCode.label;

        const detailUser = Array.isArray(prev.amsTicketDetailUsers)
          ? prev.amsTicketDetailUsers[0]
          : null;
        const resolvedById =
          prev.resolvedById ||
          (Array.isArray(prev.amsTicketDetailUserIds)
            ? prev.amsTicketDetailUserIds[0]
            : "") ||
          detailUser?.userId ||
          "";
        const resolvedUser = userObjects.find(
          item => String(item.id).toLowerCase() === String(resolvedById).toLowerCase(),
        );
        if (resolvedUser) {
          next.resolvedById = resolvedUser.id;
          next.resolvedBy = resolvedUser.label;
          next.amsTicketDetailUserIds = [resolvedUser.id];
        }

        return next;
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
    setForm(f => ({
      ...f,
      isLikelyCause: e.target.checked,
      likelyCause: e.target.checked,
    }));
  };

  const getTicketReceivedDateError = (value, localizationKey) => {
    if (!ticketReceivedDate || !value) return "";

    const receivedDate = new Date(ticketReceivedDate);
    const activityDate = new Date(value);
    if (
      Number.isNaN(receivedDate.getTime()) ||
      Number.isNaN(activityDate.getTime()) ||
      activityDate >= receivedDate
    ) {
      return "";
    }

    return localize(localizationKey);
  };

  const getAfterTodayError = (value, fieldLocalizationKey) => {
    if (!value) return "";

    const selectedDate = new Date(value);
    if (Number.isNaN(selectedDate.getTime())) return "";

    // Date and time must not be later than the current moment.
    if (selectedDate <= new Date()) return "";

    const localizedRule = localize("ThisFieldMustBeLessOrEqual{0}").replace(
      "{0}",
      localize("Today"),
    );
    return `${localize(fieldLocalizationKey)}: ${localizedRule}`;
  };

  const getStartDateError = (value) =>
    getTicketReceivedDateError(
      value,
      "TicketReceivedDateMoreThanActivityStartDateErrorMessage",
    ) || getAfterTodayError(value, "StartDate");

  const getEndDateError = (value, startDate = form.startDate) => {
    const receivedDateError = getTicketReceivedDateError(
      value,
      "TicketReceivedDateMoreThanActivityEndDateErrorMessage",
    );
    if (receivedDateError) return receivedDateError;

    if (value && startDate) {
      const selectedEndDate = new Date(value);
      const selectedStartDate = new Date(startDate);
      if (
        !Number.isNaN(selectedEndDate.getTime()) &&
        !Number.isNaN(selectedStartDate.getTime()) &&
        selectedEndDate < selectedStartDate
      ) {
        const localizedRule = localize(
          "ThisFieldMustBeGreaterThanOrEqual{0}",
        ).replace("{0}", localize("StartDate"));
        return `${localize("EndDate")}: ${localizedRule}`;
      }
    }

    return getAfterTodayError(value, "EndDate");
  };

  const validate = () => {
    const newErrors = {};
    const requiredMessage = (fieldName) =>
      localize("The {0} field is required.").replace("{0}", fieldName);

    if (!form.activityType) {
      newErrors.activityType = requiredMessage(localize("ActivityType"));
    }
    if (!form.startDate) {
      newErrors.startDate = requiredMessage(localize("StartDate"));
    } else {
      const startDateError = getStartDateError(form.startDate);
      if (startDateError) newErrors.startDate = startDateError;
    }
    if (!form.endDate) {
      newErrors.endDate = requiredMessage(localize("EndDate"));
    } else {
      const endDateError = getEndDateError(form.endDate);
      if (endDateError) newErrors.endDate = endDateError;
    }
    if (!form.workDoneCode) {
      newErrors.workDoneCode = requiredMessage(localize("WorkDoneCode"));
    }
    if (!form.resolvedBy || !form.resolvedById) {
      newErrors.resolvedBy = requiredMessage(localize("ResolvedBy"));
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const resolvedById = form.resolvedById;
    onSubmit({
      ...form,
      ActivityType: form.activityTypeId,
      isLikelyCause: !!form.isLikelyCause,
      likelyCause: !!form.isLikelyCause,
      durationMinutes: form.durationHours ? parseFloat(form.durationHours) * 60 : 0,
      workDoneCodeId: form.workDoneCodeId,   // ✅ UUID passed up
      resolvedById,
      amsTicketDetailUserIds: [resolvedById],
    });
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 overflow-hidden">
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
            className="relative w-full max-w-lg bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-auto max-h-[90vh] overflow-hidden font-[Arial]"
          >

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div>
                  <nav className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 dark:text-slate-500 mb-0.5">
                    <span>{localize("AMSTickets")}</span>
                    <span className="text-slate-300 dark:text-slate-700">/</span>
                    <span className="text-pink-600">{localize("AddActivity")}</span>
                  </nav>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    {isEdit ? localize("EditActivity") : localize("NewActivity")}
                  </h2>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all border border-slate-200 dark:border-slate-700"
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-2 space-y-2 overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 gap-y-2">
                {/* Activity Type */}
                <Field label={`${localize("ActivityType")} *`} error={errors.activityType}>
                  <div className="relative group/input">
                    <Combobox
                      value={form.activityType}
                      onChange={(label) => {
                        const selectedType = apiData.activityTypes.find(
                          option => option.label === label,
                        );
                        setForm(f => ({
                          ...f,
                          activityType: label,
                          activityTypeId: selectedType?.enumValue || "",
                          ActivityType: selectedType?.enumValue || "",
                        }));
                        if (errors.activityType) setErrors(e => ({ ...e, activityType: "" }));
                      }}
                      options={apiData.activityTypes.map(o => o.label ?? o)}
                      placeholder={loadingApis ? localize("LoadingWithThreeDot") : localize("SelectBoxEmptyValueText")}
                      error={errors.activityType}
                      localize={localize}
                    />
                  </div>
                </Field>

                {/* Start Date */}
                <Field label={`${localize("StartDate")} *`} error={errors.startDate}>
                  <div className="relative group/input">
                    <DateTimePicker
                      value={form.startDate}
                      onChange={(dateStr) => {
                        setForm(f => ({ ...f, startDate: dateStr }));
                        setErrors(e => ({
                          ...e,
                          startDate: getStartDateError(dateStr),
                          ...(form.endDate
                            ? { endDate: getEndDateError(form.endDate, dateStr) }
                            : {}),
                        }));
                      }}
                      options={{ disableMobile: true }}
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
                <Field label={`${localize("EndDate")} *`} error={errors.endDate}>
                  <div className="relative group/input">
                    <DateTimePicker
                      value={form.endDate}
                      onChange={(dateStr) => {
                        setForm(f => ({ ...f, endDate: dateStr }));
                        setErrors(e => ({
                          ...e,
                          endDate: getEndDateError(dateStr),
                        }));
                      }}
                      options={{ disableMobile: true }}
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
                <Field label={localize("ActivityTotalDuration")} error={errors.durationHours}>
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
                <Field label={`${localize("WorkDoneCode")} *`} error={errors.workDoneCode}>
                  <Combobox
                    value={form.workDoneCode}
                    onChange={(label) => {
                      const found = apiData.workDoneCodes.find(w => w.label === label);
                      setForm(f => ({
                        ...f,
                        workDoneCode: label,
                        workDoneCodeId: found?.id || "",
                        workDoneCodeAndDescription: label,
                      }));
                      if (errors.workDoneCode) setErrors(e => ({ ...e, workDoneCode: "" }));
                    }}
                    options={apiData.workDoneCodes.map(w => w.label)}  // ✅ show labels
                    placeholder={localize("Search")}
                    error={errors.workDoneCode}
                    localize={localize}
                  />
                </Field>

                {/* Resolved By */}
                <Field label={`${localize("ResolvedBy")} *`} error={errors.resolvedBy}>
                  <Combobox
                    value={form.resolvedBy}
                    onChange={(label) => {
                      const found = apiData.users.find(u => u.label === label);
                      setForm(f => ({
                        ...f,
                        resolvedBy: label,
                        resolvedById: found?.id || "",
                        amsTicketDetailUserIds: found?.id ? [found.id] : [],
                      }));
                      if (errors.resolvedBy) setErrors(e => ({ ...e, resolvedBy: "" }));
                    }}
                    options={apiData.users.map(u => u.label)}  // ✅ show labels
                    placeholder={localize("Search")}
                    error={errors.resolvedBy}
                    localize={localize}
                  />
                </Field>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <label className="flex h-8 items-center gap-2 cursor-pointer w-max px-3 rounded-lg bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 focus-within:ring-2 focus-within:ring-pink-500/20">
                  <div className="relative group/toggle">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={form.isLikelyCause}
                      onChange={handleToggleLikelyCause}
                    />
                    <div className={`block w-10 h-6 rounded-full transition-all duration-300 ${form.isLikelyCause ? "bg-pink-600 shadow-lg shadow-pink-500/20" : "bg-slate-300 dark:bg-slate-700"}`}></div>
                    <motion.div
                      animate={{ x: form.isLikelyCause ? 18 : 2 }}
                      className={`absolute left-0 top-1 bg-white w-4 h-4 rounded-full shadow-md transition-all`}
                    />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{localize("IsLikelyCause")}</span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 bg-white dark:bg-slate-900">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                {localize("Cancel")}
              </button>
              <button
                onClick={handleSubmit}
                className="app-primary-button px-6 py-2 text-[10px] uppercase tracking-widest flex items-center justify-center min-w-[120px]"
              >
                {isEdit ? localize("UpdateButtonText") : localize("AddActivity")}
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
