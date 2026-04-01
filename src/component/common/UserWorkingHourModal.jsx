import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  Autocomplete,
  TextField,
  Box,
  CircularProgress,
} from "@mui/material";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";
import "flatpickr/dist/themes/dark.css";
import { usersApi } from "../../services/api/users";
import { workingHoursApi } from "../../services/api/workingHours";
import { useToast } from "./ToastContext";
import PremiumErrorAlert from "./PremiumErrorAlert";
import { useAuth } from "../../context/AuthContextHook";

const WEEK_DAYS = [
  "Monday",   // 0
  "Tuesday",  // 1
  "Wednesday",// 2
  "Thursday", // 3
  "Friday",   // 4
  "Saturday", // 5
  "Sunday",   // 6
];

export default function UserWorkingHourModal({ open, onClose, onSave, item }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase().includes("admin");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  const [formData, setFormData] = useState({
    userId: "",
    weekDay: "",
    startTime: "09:00",
    endTime: "18:00",
  });

  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    if (open) {
      loadUsers();
      if (item) {
        setFormData({
          userId: item.userId || "",
          weekDay: (() => {
            if (item.weekDay === null || item.weekDay === undefined) return "";
            if (typeof item.weekDay === "number") {
              return WEEK_DAYS[item.weekDay] || "";
            }
            if (typeof item.weekDay === "string") {
              return item.weekDay.charAt(0).toUpperCase() + item.weekDay.slice(1).toLowerCase();
            }
            return "";
          })(),
          startTime: item.startTime?.slice(0, 5) || "09:00",
          endTime: item.endTime?.slice(0, 5) || "18:00",
        });
      } else {
        setFormData({
          userId: isAdmin ? "" : (user?.id || ""),
          weekDay: "",
          startTime: "09:00",
          endTime: "18:00",
        });
        
        if (!isAdmin && user) {
           setSelectedUser({ id: user.id, name: user.name, userName: user.email });
        } else {
           setSelectedUser(null);
        }
      }
      setValidationErrors({});
      setSubmitError("");
    }
  }, [open, item]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      if (!isAdmin) {
         setUsers(user ? [{ id: user.id, name: user.name, userName: user.email }] : []);
         return;
      }
      const data = await usersApi.getUsersList({
        organizationTypes: ["VendorSureze"],
        mustCompleteJobsheet: true,
        onlyLoadCurrentUser: false,
      });
      const items = data.items || data || [];
      setUsers(items);
      if (item) {
        const user = items.find((u) => u.id === item.userId);
        setSelectedUser(user || null);
      }
    } catch (err) {
      console.error("Error loading users:", err);
    } finally {
      setLoadingUsers(false);
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const errors = {};
    if (!formData.userId) errors.userId = "User is required";
    if (!formData.weekDay) errors.weekDay = "Week day is required";
    if (!formData.startTime) errors.startTime = "Start time is required";
    if (!formData.endTime) errors.endTime = "End time is required";

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        toast("Working hour updated successfully!");
      } else {
        await workingHoursApi.create(payload);
        toast("Working hour created successfully!");
      }
      onSave();
      onClose();
    } catch (err) {
      setSubmitError(err.response?.data?.error?.message || "Failed to save working hour");
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
          boxShadow: "0 25px 50px -12px rgba(59, 130, 246, 0.15)",
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
        },
      }}
    >
      <div className="bg-white dark:bg-[#020617] px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-[18px] font-black text-slate-800 dark:text-white uppercase tracking-tight">
            {item ? "Edit Working Hour" : "New Working Hour"}
          </h2>
          <p className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            {item ? "Update existing schedule" : "Set up user schedule"}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-white/5"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <DialogContent className="bg-white dark:bg-[#020617]" sx={{ p: 4 }}>
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
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest px-1">
              User Name*
            </label>
            {isAdmin ? (
              <Autocomplete
                options={users}
                getOptionLabel={(option) =>
                  option.name && option.userName
                    ? `${option.name} (${option.userName})`
                    : option.name || option.userName || ""
                } value={selectedUser}
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
                    placeholder="Search user..."
                    error={!!validationErrors.userId}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "10px",
                        fontSize: "12px",
                        padding: "2px 8px !important",
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
                        color: "text.primary",
                        transition: "all 0.2s",
                        "& fieldset": { borderColor: "divider" },
                        "&:hover fieldset": { borderColor: "primary.main" },
                      },
                    }}
                  />
                )}
              />
            ) : (
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 text-[12px] font-bold">
                {user?.name || "Loading..."}
              </div>
            )}
          </div>

          {/* Week Day */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest px-1">
              Week Day *
            </label>
            <div className="relative">
              <select
                name="weekDay"
                value={formData.weekDay}
                onChange={handleInputChange}
                className={`w-full appearance-none bg-slate-50 dark:bg-slate-800 border ${validationErrors.weekDay ? "border-red-500" : "border-slate-200 dark:border-slate-700"
                  } text-slate-700 dark:text-white text-[12px] font-semibold rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500/20 transition-all cursor-pointer`}
              >
                <option value="" className="bg-white dark:bg-[#020617]">Select Day</option>
                {WEEK_DAYS.map((day) => (
                  <option key={day} value={day} className="bg-white dark:bg-[#020617]">
                    {day}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>
          </div>

          {/* Start Time */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest px-1">
              Start Time *
            </label>
            <Flatpickr
              value={formData.startTime}
              onChange={([date]) => {
                if (date) {
                  const hours = date.getHours().toString().padStart(2, "0");
                  const mins = date.getMinutes().toString().padStart(2, "0");
                  setFormData((prev) => ({ ...prev, startTime: `${hours}:${mins}` }));
                }
              }}
              options={{
                enableTime: true,
                noCalendar: true,
                dateFormat: "H:i",
                time_24hr: true,
              }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white text-[12px] font-mono rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
            />
          </div>

          {/* End Time */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest px-1">
              End Time *
            </label>
            <Flatpickr
              value={formData.endTime}
              onChange={([date]) => {
                if (date) {
                  const hours = date.getHours().toString().padStart(2, "0");
                  const mins = date.getMinutes().toString().padStart(2, "0");
                  setFormData((prev) => ({ ...prev, endTime: `${hours}:${mins}` }));
                }
              }}
              options={{
                enableTime: true,
                noCalendar: true,
                dateFormat: "H:i",
                time_24hr: true,
              }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white text-[12px] font-mono rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
            />
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 shadow-md shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <CircularProgress size={12} color="inherit" />
                  Saving...
                </>
              ) : (
                "Save Working Hour"
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
