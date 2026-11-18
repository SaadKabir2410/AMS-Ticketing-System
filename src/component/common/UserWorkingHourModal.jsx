import { useState, useEffect, useRef, useCallback } from "react";
import AppSelect from "./AppSelect";
import {
  Dialog,
  Autocomplete,
  TextField,
  CircularProgress,
} from "@mui/material";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { usersApi } from "../../services/api/users";
import { workingHoursApi } from "../../services/api/workingHours";
import { useToast } from "./ToastContext";
import PremiumErrorAlert from "./PremiumErrorAlert";
import { getApiErrorMessage } from "../../utils/apiError";

const WEEK_DAYS = [
  "Monday",   // 0
  "Tuesday",  // 1
  "Wednesday",// 2
  "Thursday", // 3
  "Friday",   // 4
  "Saturday", // 5
  "Sunday",   // 6
];

const commitPopupTime = (instance) => {
  const hour = instance.hourElement?.value;
  const minute = instance.minuteElement?.value;

  if (
    !/^\d{2}$/.test(hour) ||
    !/^\d{2}$/.test(minute) ||
    Number(hour) > 23 ||
    Number(minute) > 59
  ) {
    return;
  }

  instance.setDate(`${hour}:${minute}`, true, "H:i");
};

const makePopupTimeEditable = (_dates, _dateString, instance) => {
  instance.input.readOnly = false;
  instance.input.removeAttribute("readonly");

  // Keep the popup inside MUI's dialog focus boundary. Flatpickr normally
  // portals it to document.body, where the dialog immediately steals focus.
  const pickerWrapper = instance.calendarContainer.parentElement;
  if (pickerWrapper?.classList.contains("flatpickr-wrapper")) {
    pickerWrapper.style.width = "100%";
  }

  [instance.hourElement, instance.minuteElement]
    .filter(Boolean)
    .forEach((input) => {
      // Number inputs are controlled by the browser's stepper and Flatpickr's
      // delegated key handler. Text inputs allow normal replacement/caret edits.
      input.type = "text";
      input.readOnly = false;
      input.removeAttribute("readonly");
      input.setAttribute("inputmode", "numeric");
      input.setAttribute("pattern", "[0-9]*");
      input.setAttribute("maxlength", "2");
      input.setAttribute("autocomplete", "off");

      if (input.dataset.manualTimeEditing === "true") return;
      input.dataset.manualTimeEditing = "true";

      input.addEventListener("keydown", (event) => {
        if (
          event.key.length === 1 &&
          !/\d/.test(event.key) &&
          !event.ctrlKey &&
          !event.metaKey
        ) {
          event.preventDefault();
        }

        if (
          event.key !== "ArrowUp" &&
          event.key !== "ArrowDown" &&
          event.key !== "Enter" &&
          event.key !== "Escape" &&
          event.key !== "Tab"
        ) {
          event.stopPropagation();
        }
      });

      input.addEventListener("input", () => {
        input.value = input.value.replace(/\D/g, "").slice(0, 2);
        if (input.value.length === 2) {
          commitPopupTime(instance);
        }
      });
    });
};

export function EditableTimePicker({ name, value, onChange, className, ...inputProps }) {
  const inputRef = useRef(null);
  const pickerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const initialValueRef = useRef(value);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const instance = flatpickr(inputRef.current, {
      enableTime: true,
      noCalendar: true,
      dateFormat: "H:i",
      time_24hr: true,
      allowInput: true,
      clickOpens: true,
      minuteIncrement: 1,
      static: true,
      defaultDate: initialValueRef.current || undefined,
      onReady: makePopupTimeEditable,
      onOpen: makePopupTimeEditable,
      onChange: ([date], dateString) => {
        onChangeRef.current(date, dateString);
      },
    });

    pickerRef.current = instance;
    return () => {
      instance.destroy();
      pickerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = pickerRef.current;
    if (!instance || instance.input.value === (value || "")) return;

    if (value) {
      instance.setDate(value, false, "H:i");
    } else {
      instance.clear(false);
    }
  }, [value]);

  return (
    <input
      {...inputProps}
      ref={inputRef}
      name={name}
      defaultValue={value || ""}
      className={className}
    />
  );
}

export default function UserWorkingHourModal({
  open,
  onClose,
  onSave,
  item,
  canCreate,
  canEdit,
  localize,
  localizedWeekDays = [],
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  const [formData, setFormData] = useState({
    userId: "",
    weekDay: "",
    startTime: "",
    endTime: "",
  });

  const [selectedUser, setSelectedUser] = useState(null);
  const canSubmit = item ? canEdit : canCreate;

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const data = await usersApi.getUsersList({
        organizationTypes: ["VendorSureze"],
        mustCompleteJobsheet: true,
        onlyLoadCurrentUser: false,
      });
      const items = data.items || data || [];
      setUsers(items);
      if (item) {
        const selectedItemUser = items.find((entry) => entry.id === item.userId);
        setSelectedUser(selectedItemUser || null);
      }
    } catch (err) {
      setSubmitError(
        getApiErrorMessage(err) || localize("DefaultErrorMessage"),
      );
    } finally {
      setLoadingUsers(false);
    }
  }, [item, localize]);

  useEffect(() => {
    if (open && canSubmit) {
      loadUsers();
      if (item) {
        setFormData({
          userId: item.userId || "",
          weekDay: (() => {
            if (item.weekDay === null || item.weekDay === undefined) return "";
            if (typeof item.weekDay === "number") {
              return WEEK_DAYS[item.weekDay - 1] || "";
            }
            if (typeof item.weekDay === "string") {
              return item.weekDay.charAt(0).toUpperCase() + item.weekDay.slice(1).toLowerCase();
            }
            return "";
          })(),
          startTime: item.startTime?.slice(0, 5) || "",
          endTime: item.endTime?.slice(0, 5) || "",
        });
      } else {
        setFormData({
          userId: "",
          weekDay: "",
          startTime: "",
          endTime: "",
        });
        setSelectedUser(null);
      }
      setValidationErrors({});
      setSubmitError("");
    }
  }, [canSubmit, item, loadUsers, open]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleTimeChange = (name, date, dateString) => {
    setFormData((prev) => ({
      ...prev,
      [name]: date ? dateString : "",
    }));
    if (date && validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const errors = {};
    const requiredMessage = (fieldName) =>
      localize("The {0} field is required.").replace("{0}", fieldName);

    if (!formData.userId) {
      errors.userId = requiredMessage(localize("UserName"));
    }
    if (!formData.weekDay) {
      errors.weekDay = requiredMessage(localize("WeekDay"));
    }
    if (!formData.startTime) {
      errors.startTime = requiredMessage(localize("StartTime"));
    }
    if (!formData.endTime) {
      errors.endTime = requiredMessage(localize("EndTime"));
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (!validate()) return;

    setLoading(true);
    setSubmitError("");

    // Ensure seconds are included
    const payload = {
      ...formData,
      startTime: formData.startTime?.length === 5 ? `${formData.startTime}:00` : formData.startTime,
      endTime: formData.endTime?.length === 5 ? `${formData.endTime}:00` : formData.endTime,
    };

    try {
      if (item) {
        await workingHoursApi.update(item.id, payload);
        toast(localize("SavedSuccessfully"), "success");
      } else {
        await workingHoursApi.create(payload);
        toast(localize("SavedSuccessfully"), "success");
      }
      onSave();
      onClose();
    } catch (err) {
      setSubmitError(
        getApiErrorMessage(err) || localize("DefaultErrorMessage"),
      );
    } finally {
      setLoading(false);
    }
  };

  // Labels added for the weekly form fall back to English until the backend is deployed.
  const t = (key, fallback) => {
    const value = localize(key);
    return value && value !== key ? value : fallback ?? key;
  };

  const timeMinutes = (time) => {
    if (!/^\d{2}:\d{2}/.test(time || "")) return null;
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };
  const startMinutes = timeMinutes(formData.startTime);
  const endMinutes = timeMinutes(formData.endTime);
  const periodMinutes =
    startMinutes !== null && endMinutes !== null && endMinutes > startMinutes
      ? endMinutes - startMinutes
      : 0;
  const hoursText = String(Math.round((periodMinutes / 60) * 100) / 100);

  const fieldLabelClass = "text-[11px] font-bold text-slate-700 dark:text-slate-300";
  const timeInputClass = (hasError) =>
    `w-full h-7 pl-2 pr-5 text-[12px] font-mono rounded-lg border outline-none transition-all bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 ${
      hasError
        ? "border-red-400 focus:ring-1 focus:ring-red-400"
        : "border-slate-200 dark:border-slate-700 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
    }`;
  const timeErrors = [validationErrors.startTime, validationErrors.endTime].filter(Boolean);

  return (
    <Dialog
      open={open}
      onClose={(e, reason) => {
        if (reason === "backdropClick" || reason === "escapeKeyDown") return;
        onClose();
      }}
      maxWidth={false}
      fullWidth
      PaperProps={{
        sx: {
          m: { xs: 1, sm: 4 },
          width: { xs: "calc(100% - 16px)", sm: "calc(100% - 64px)" },
          maxWidth: "580px",
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)",
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "#0f172a" : "#ffffff"),
          border: "1px solid",
          borderColor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
        },
      }}
    >
      <form onSubmit={handleSubmit} className="flex flex-col bg-white dark:bg-slate-900">
        {/* Header */}
        <div className="px-4 sm:px-6 pt-4 pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Management / Lookups / Staff Working Hours
              </p>
              <h2 className="mt-1 text-lg font-bold leading-tight text-slate-900 dark:text-white">
                {item ? "Edit Staff Working Hour" : "New Staff Working Hour"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={localize("Close")}
              className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Staff member */}
          <div className="mt-3 flex flex-col gap-1 w-full sm:w-72">
            <label className={fieldLabelClass}>
              {t("StaffMember", localize("UserName"))} <span className="required-asterisk">*</span>
            </label>
            <Autocomplete
              options={users}
              getOptionLabel={(option) =>
                option.name && option.userName
                  ? `${option.name} (${option.userName})`
                  : option.name || option.userName || ""
              }
              value={selectedUser}
              loading={loadingUsers}
              onChange={(e, newValue) => {
                setSelectedUser(newValue);
                setFormData((prev) => ({ ...prev, userId: newValue?.id || "" }));
                if (validationErrors.userId) {
                  setValidationErrors((prev) => ({ ...prev, userId: "" }));
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={localize("Search")}
                  error={!!validationErrors.userId}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 600,
                      padding: "2px 8px !important",
                      bgcolor: (theme) => (theme.palette.mode === "dark" ? "#1e293b" : "#fff"),
                      "& fieldset": { borderColor: (theme) => (theme.palette.mode === "dark" ? "#334155" : "#e2e8f0") },
                      "&:hover fieldset": { borderColor: "#f472b6" },
                      "&.Mui-focused fieldset": { borderColor: "#ec4899", borderWidth: "1px" },
                      "&.Mui-error fieldset": { borderColor: "#f87171" },
                    },
                  }}
                />
              )}
            />
            {validationErrors.userId && (
              <p className="text-[11px] leading-tight text-red-500">{validationErrors.userId}</p>
            )}
          </div>
        </div>

        {submitError && (
          <div className="px-4 sm:px-6 pb-2">
            <PremiumErrorAlert
              open={!!submitError}
              message={submitError}
              onClose={() => setSubmitError("")}
            />
          </div>
        )}

        {/* Column headings, as on the weekly form */}
        <div className="hidden sm:grid grid-cols-[150px_1fr_44px] gap-4 px-6 py-1.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          <span>
            {localize("WeekDay")} <span className="required-asterisk">*</span>
          </span>
          <span>{t("WorkingPeriods24HourTime", "Working periods · 24-hour time")}</span>
          <span className="text-right">{t("Total", "Total")}</span>
        </div>

        {/* The record's day and period */}
        <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[150px_1fr_44px] gap-x-4 gap-y-1.5 px-4 sm:px-6 py-2 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
          <div className="flex flex-col gap-1 min-w-0">
            <AppSelect
              name="weekDay"
              value={formData.weekDay}
              onChange={handleInputChange}
              aria-label={localize("WeekDay")}
              className="app-filter-select w-full"
            >
              <option value="">{localize("SelectBoxEmptyValueText")}</option>
              {WEEK_DAYS.map((day, index) => (
                <option key={day} value={day}>
                  {localizedWeekDays[index] || day}
                </option>
              ))}
            </AppSelect>
            {validationErrors.weekDay && (
              <p className="text-[11px] leading-tight text-red-500">{validationErrors.weekDay}</p>
            )}
          </div>

          <span className="sm:order-last flex items-center justify-end h-7 text-xs font-semibold text-slate-600 dark:text-slate-300">
            {periodMinutes > 0 ? t("HoursShort", "{0}h").replace("{0}", hoursText) : "—"}
          </span>

          <div className="col-span-2 sm:col-span-1 flex flex-col gap-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1">
              {["startTime", "endTime"].map((name, index) => (
                <div key={name} className="flex items-center gap-1">
                  {index === 1 && <span className="text-slate-400 text-xs">–</span>}
                  <div className="relative w-[78px]">
                    <EditableTimePicker
                      name={name}
                      value={formData[name]}
                      onChange={(date, dateString) => handleTimeChange(name, date, dateString)}
                      placeholder="--:--"
                      aria-label={localize(name === "startTime" ? "StartTime" : "EndTime")}
                      aria-invalid={!!validationErrors[name]}
                      className={timeInputClass(!!validationErrors[name])}
                    />
                    {/* Clear × empties this time box only. */}
                    {formData[name] && (
                      <button
                        type="button"
                        onClick={() => handleTimeChange(name, null, "")}
                        aria-label={`${localize("Clear")} ${localize(name === "startTime" ? "StartTime" : "EndTime")}`}
                        title={localize("Clear")}
                        className="absolute right-1 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-4 h-4 rounded text-slate-300 hover:text-pink-500"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {[...new Set(timeErrors)].map((message) => (
              <p key={message} className="text-[11px] leading-tight text-red-500">{message}</p>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800">
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {periodMinutes > 0 ? t("HoursShort", "{0}h").replace("{0}", hoursText) : "—"}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-white dark:hover:bg-white/5 transition-colors"
            >
              {localize("Cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="app-primary-button inline-flex items-center justify-center gap-2 px-4 py-2 text-xs rounded-lg disabled:opacity-50"
            >
              {loading && <CircularProgress size={12} color="inherit" />}
              {loading ? localize("SavingWithThreeDot") : localize("Save")}
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
