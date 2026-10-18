import { useState, useEffect, useRef, useCallback } from "react";
import AppSelect from "./AppSelect";
import {
  Dialog,
  DialogContent,
  Autocomplete,
  TextField,
  Box,
  CircularProgress,
} from "@mui/material";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import "flatpickr/dist/themes/dark.css";
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

function EditableTimePicker({ name, value, onChange, className, ...inputProps }) {
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
        toast(localize("SuccessfullySaved"), "success");
      } else {
        await workingHoursApi.create(payload);
        toast(localize("SuccessfullySaved"), "success");
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

  return (
    <Dialog
      open={open}
      onClose={(e, reason) => {
        if (reason !== "backdropClick") {
          onClose();
        }
      }}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "24px",
          padding: 0,
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.4)",
          bgcolor: (theme) => theme.palette.mode === 'dark' ? "#0f172a" : "#ffffff",
          border: "1px solid",
          borderColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
        },
        className: "dark:bg-slate-900",
      }}
    >
      <div className="bg-white dark:bg-slate-900 px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-[18px] font-black text-slate-900 dark:text-white uppercase tracking-tight">
            {localize(item ? "EditUserWorkingHour" : "NewUserWorkingHour")}
          </h2>
        </div>
        <button
          onClick={onClose}
          aria-label={localize("Close")}
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-white/5"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <DialogContent className="bg-white dark:bg-slate-900" sx={{ p: 4 }}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {submitError && (
            <PremiumErrorAlert
              open={!!submitError}
              message={submitError}
              onClose={() => setSubmitError("")}
            />
          )}

          {/* User Selection */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">
              {localize("UserName")} <span className="required-asterisk">*</span>
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
                  helperText={validationErrors.userId}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "10px",
                      fontSize: "12px",
                      padding: "2px 8px !important",
                      bgcolor: (theme) => theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.02)",
                      color: "text.primary",
                      transition: "all 0.2s",
                      "& fieldset": { borderColor: "divider" },
                      "&:hover fieldset": { borderColor: "primary.main" },
                    },
                  }}
                />
              )}
            />
          </div>

          {/* Week Day */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">
              {localize("WeekDay")} <span className="required-asterisk">*</span>
            </label>
            <div className="relative">
              <AppSelect
                name="weekDay"
                value={formData.weekDay}
                onChange={handleInputChange}
                className={`w-full appearance-none bg-slate-50 dark:bg-slate-800 border ${validationErrors.weekDay ? "border-red-500" : "border-slate-200 dark:border-slate-700"
                  } text-slate-900 dark:text-white text-[12px] font-semibold rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-pink-500/20 transition-all cursor-pointer`}
              >
                <option value="" className="bg-white dark:bg-slate-900">{localize("Select")}</option>
                {WEEK_DAYS.map((day, index) => (
                  <option key={day} value={day} className="bg-white dark:bg-slate-900">
                    {localizedWeekDays[index] || day}
                  </option>
                ))}
              </AppSelect>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>
            {validationErrors.weekDay && (
              <p className="px-1 text-[11px] text-red-500">{validationErrors.weekDay}</p>
            )}
          </div>

          {/* Start Time */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">
              {localize("StartTime")} <span className="required-asterisk">*</span>
            </label>
            <EditableTimePicker
              name="startTime"
              value={formData.startTime}
              onChange={(date, dateString) =>
                handleTimeChange("startTime", date, dateString)
              }
              aria-invalid={!!validationErrors.startTime}
              aria-describedby={validationErrors.startTime ? "start-time-error" : undefined}
              className={`w-full bg-slate-50 dark:bg-slate-800 border ${validationErrors.startTime ? "border-red-500" : "border-slate-200 dark:border-slate-700"} text-slate-900 dark:text-white text-[12px] font-mono rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-pink-500/20 transition-all`}
            />
            {validationErrors.startTime && (
              <p id="start-time-error" className="px-1 text-[11px] text-red-500">{validationErrors.startTime}</p>
            )}
          </div>

          {/* End Time */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">
              {localize("EndTime")} <span className="required-asterisk">*</span>
            </label>
            <EditableTimePicker
              name="endTime"
              value={formData.endTime}
              onChange={(date, dateString) =>
                handleTimeChange("endTime", date, dateString)
              }
              aria-invalid={!!validationErrors.endTime}
              aria-describedby={validationErrors.endTime ? "end-time-error" : undefined}
              className={`w-full bg-slate-50 dark:bg-slate-800 border ${validationErrors.endTime ? "border-red-500" : "border-slate-200 dark:border-slate-700"} text-slate-900 dark:text-white text-[12px] font-mono rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-pink-500/20 transition-all`}
            />
            {validationErrors.endTime && (
              <p id="end-time-error" className="px-1 text-[11px] text-red-500">{validationErrors.endTime}</p>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
            >
              {localize("Cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="app-primary-button flex-[2] px-4 py-2 text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <CircularProgress size={12} color="inherit" />
                  {localize("SavingWithThreeDot")}
                </>
              ) : (
                <>{localize("Save")}</>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
