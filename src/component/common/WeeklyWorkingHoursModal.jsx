import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, Autocomplete, TextField, CircularProgress } from "@mui/material";
import { Copy, Plus, X } from "lucide-react";
import { usersApi } from "../../services/api/users";
import { workingHoursApi } from "../../services/api/workingHours";
import { useToast } from "./ToastContext";
import PremiumErrorAlert from "./PremiumErrorAlert";
import { getApiErrorMessage } from "../../utils/apiError";
import { EditableTimePicker } from "./UserWorkingHourModal";

// One weekly form for New and Edit, limited to what the backend offers:
// create, update and the paged list (there is no delete). Every label is an
// existing backend localization key.
// - New (no editItem): every period is a new record (create).
// - Edit (editItem): update only, never create or delete. The row's staff
//   member's saved periods are loaded; changed times are updated. Unticking a
//   day (or × on a saved period) frees that saved record, and a day ticked or a
//   period added elsewhere takes it over: on Save the record is updated to the
//   new week day and times. Days/periods can only be added while freed records
//   are available.
//   A freed record that isn't reused is "parked": updated to week day All with
//   a placeholder time. Every working-hours calculation in the backend matches
//   one real week day (WeekDay == day), so a parked record never counts and
//   the day is off. The list hides parked records (backend WeekDay=All filter),
//   and Edit reuses them when days are ticked again.

const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Backend weekDay arrives as 1-7 (Monday = 1) or as the enum name.
const toDayIndex = (weekDay) => {
  if (typeof weekDay === "number") return weekDay - 1;
  if (typeof weekDay === "string") {
    return WEEK_DAYS.findIndex((day) => day.toLowerCase() === weekDay.toLowerCase());
  }
  return -1;
};

const isSaved = (period) => Boolean(period.id);
const isChanged = (period) =>
  isSaved(period) && (period.start !== period.savedStart || period.end !== period.savedEnd);

let periodKeySeed = 0;
const newPeriodKey = () => `p${++periodKeySeed}`;

// Every working day starts with a morning and an afternoon period.
const DEFAULT_PERIODS = [
  ["09:00", "13:00"],
  ["14:00", "18:00"],
];
const blankPeriod = () => ({ key: newPeriodKey(), start: "", end: "" });
const defaultPeriods = () =>
  DEFAULT_PERIODS.map(([start, end]) => ({ key: newPeriodKey(), start, end }));

// Every day unticked; Edit fills the week from the saved periods.
const emptyWeek = () => WEEK_DAYS.map(() => ({ enabled: false, periods: [] }));

// Saturday and Sunday are the backend's weekend (IsWeekend in the ticket
// logic), so they are off days.
const WEEKEND_DAY_INDEXES = [5, 6];

// New: Monday–Friday ticked with the default periods, the weekend off.
const defaultWeek = () =>
  WEEK_DAYS.map((_day, index) =>
    WEEKEND_DAY_INDEXES.includes(index)
      ? { enabled: false, periods: [] }
      : { enabled: true, periods: defaultPeriods() },
  );

const toMinutes = (time) => {
  if (!/^\d{2}:\d{2}$/.test(time || "")) return null;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// A parked record (see the header) has week day All (-1).
const PARKED_WEEK_DAY = "All";
const isParkedWeekDay = (weekDay) =>
  weekDay === -1 || String(weekDay).toLowerCase() === "all";
// Parked records need distinct, non-overlapping times (the backend rejects
// duplicates), so each takes a one-minute placeholder slot from 00:00.
const minuteToTime = (minute) =>
  `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;

const periodMinutes = ({ start, end }) => {
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  return startMinutes !== null && endMinutes !== null && endMinutes > startMinutes
    ? endMinutes - startMinutes
    : 0;
};

const formatHours = (minutes) => String(Math.round((minutes / 60) * 100) / 100);

// Same rule as the backend's overlap check (start < other end && end > other start).
const overlaps = (a, b) => {
  const [aStart, aEnd, bStart, bEnd] = [a.start, a.end, b.start, b.end].map(toMinutes);
  if ([aStart, aEnd, bStart, bEnd].includes(null)) return false;
  return aStart < bEnd && aEnd > bStart;
};

const timeInputClass = (hasError, disabled) =>
  `w-full h-6 pl-1.5 pr-4 text-[11px] font-mono rounded-md border outline-none transition-all text-slate-800 dark:text-slate-100 ${
    disabled
      ? "bg-slate-50 dark:bg-slate-800/50 text-slate-500 cursor-not-allowed"
      : "bg-white dark:bg-slate-800"
  } ${
    hasError
      ? "border-red-400 focus:ring-1 focus:ring-red-400"
      : "border-slate-200 dark:border-slate-700 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
  }`;

export default function WeeklyWorkingHoursModal({
  open,
  onClose,
  onSave,
  editItem = null,
  canCreate,
  canEdit,
  localize,
  localizedWeekDays = [],
}) {
  const { toast } = useToast();
  const isEditMode = Boolean(editItem);

  // The page mounts this form only while it is open, so every opening starts fresh.
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  // In Edit mode the staff member is fixed to the row's user.
  const [selectedUser, setSelectedUser] = useState(() =>
    editItem ? { id: editItem.userId, userName: editItem.userName } : null,
  );
  const [userError, setUserError] = useState("");
  // New starts from the default working week; Edit loads the saved one.
  const [week, setWeek] = useState(() => (editItem ? emptyWeek() : defaultWeek()));
  const [loadingWeek, setLoadingWeek] = useState(Boolean(editItem));
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);
  // Edit mode: saved periods taken off the week (untick or ×), waiting to be
  // updated into a newly added period on Save.
  const [releasedPeriods, setReleasedPeriods] = useState([]);
  const localizeRef = useRef(localize);
  useEffect(() => {
    localizeRef.current = localize;
  }, [localize]);
  // Fixed for the life of this form (it is remounted for every opening).
  const editUserIdRef = useRef(editItem?.userId || null);

  // Load the staff list once per opening; late-loading labels must not reload it.
  useEffect(() => {
    let active = true;
    usersApi
      .getUsersList({
        organizationTypes: ["VendorSureze"],
        mustCompleteJobsheet: true,
        onlyLoadCurrentUser: false,
      })
      .then((data) => {
        if (!active) return;
        const items = data.items || data || [];
        setUsers(items);
        // Show the full name of the Edit row's staff member once the list arrives.
        if (editUserIdRef.current) {
          const match = items.find((entry) => entry.id === editUserIdRef.current);
          if (match) setSelectedUser(match);
        }
      })
      .catch((err) => {
        if (active) setSubmitError(getApiErrorMessage(err) || localizeRef.current("DefaultErrorMessage"));
      })
      .finally(() => {
        if (active) setLoadingUsers(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Edit mode: load every saved period of the row's staff member.
  useEffect(() => {
    const userId = editUserIdRef.current;
    if (!userId) return undefined;

    let active = true;
    workingHoursApi
      .getPagedList({ userId, page: 1, perPage: 200, sortField: "StartTime" })
      .then((response) => {
        if (!active) return;
        const nextWeek = emptyWeek();
        const parked = [];
        (response.items || []).forEach((item) => {
          const start = item.startTime?.slice(0, 5) || "";
          const end = item.endTime?.slice(0, 5) || "";
          // Parked records aren't shown; they wait to be reused (dayIndex -1).
          if (isParkedWeekDay(item.weekDay)) {
            parked.push({
              key: newPeriodKey(),
              id: item.id,
              start,
              end,
              savedStart: start,
              savedEnd: end,
              dayIndex: -1,
            });
            return;
          }
          const dayIndex = toDayIndex(item.weekDay);
          if (dayIndex < 0 || dayIndex > 6) return;
          nextWeek[dayIndex].periods.push({
            key: newPeriodKey(),
            id: item.id,
            start,
            end,
            savedStart: start,
            savedEnd: end,
          });
        });
        nextWeek.forEach((day) => {
          day.periods.sort((a, b) => (toMinutes(a.start) ?? 0) - (toMinutes(b.start) ?? 0));
          day.enabled = day.periods.length > 0;
        });
        setWeek(nextWeek);
        setReleasedPeriods(parked);
      })
      .catch((err) => {
        if (active) setSubmitError(getApiErrorMessage(err) || localizeRef.current("DefaultErrorMessage"));
      })
      .finally(() => {
        if (active) setLoadingWeek(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const clearPeriodError = (key) =>
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });

  const updateDay = (dayIndex, updater) =>
    setWeek((current) => current.map((day, index) => (index === dayIndex ? updater(day) : day)));

  // Keep saved periods taken off the week so Save can move them (update).
  const releasePeriods = (periods, dayIndex) => {
    const savedPeriods = periods.filter(isSaved);
    if (savedPeriods.length) {
      setReleasedPeriods((current) => [
        ...current,
        ...savedPeriods.map((period) => ({ ...period, dayIndex })),
      ]);
    }
  };

  const toggleDay = (dayIndex) => {
    if (saving || loadingWeek) return;
    const day = week[dayIndex];
    // Moving a saved period is an update, so it needs Edit.
    if (day.enabled && day.periods.some(isSaved) && !canEdit) return;
    day.periods.forEach((period) => clearPeriodError(period.key));
    if (day.enabled) {
      releasePeriods(day.periods, dayIndex);
      updateDay(dayIndex, () => ({ enabled: false, periods: [] }));
      return;
    }
    // Re-ticking a day brings back its own saved periods; otherwise defaults
    // (in Edit, only as many as there are freed records to update into).
    const restored = releasedPeriods
      .filter((released) => released.dayIndex === dayIndex)
      .map((released) => ({
        key: released.key,
        id: released.id,
        start: released.savedStart,
        end: released.savedEnd,
        savedStart: released.savedStart,
        savedEnd: released.savedEnd,
      }));
    if (restored.length) {
      setReleasedPeriods((current) => current.filter((released) => released.dayIndex !== dayIndex));
      updateDay(dayIndex, () => ({ enabled: true, periods: restored }));
      return;
    }
    // In Edit without Create, only as many as there are freed records to reuse.
    const periods =
      isEditMode && !canCreate ? defaultPeriods().slice(0, Math.max(freeSlots, 0)) : defaultPeriods();
    if (!periods.length) return;
    updateDay(dayIndex, () => ({ enabled: true, periods }));
  };

  const addPeriod = (dayIndex) => {
    if (isEditMode && !canAddInEdit) return;
    updateDay(dayIndex, (day) => ({
      ...day,
      enabled: true,
      periods: [...day.periods, blankPeriod()],
    }));
  };

  // Removing a day's last period turns the day off. A removed saved period is
  // set aside to be moved (updated) on Save, never deleted.
  const removePeriod = (dayIndex, key) => {
    const target = week[dayIndex].periods.find((period) => period.key === key);
    if (!target || (isSaved(target) && !canEdit)) return;
    clearPeriodError(key);
    releasePeriods([target], dayIndex);
    updateDay(dayIndex, (day) => {
      const periods = day.periods.filter((period) => period.key !== key);
      return { enabled: periods.length > 0, periods };
    });
  };

  const setPeriodTime = (dayIndex, key, field, value) => {
    clearPeriodError(key);
    updateDay(dayIndex, (day) => ({
      ...day,
      periods: day.periods.map((period) =>
        period.key === key ? { ...period, [field]: value } : period,
      ),
    }));
  };

  const copyMondayToWeekdays = () => {
    if (saving || loadingWeek || isEditMode || !week[0].enabled || !week[0].periods.length) return;

    const mondayPeriods = week[0].periods.map(({ start, end }) => ({ start, end }));
    setWeek((current) =>
      current.map((day, dayIndex) =>
        dayIndex >= 1 && dayIndex <= 4
          ? {
              enabled: true,
              periods: mondayPeriods.map(({ start, end }) => ({
                key: newPeriodKey(),
                start,
                end,
              })),
            }
          : day,
      ),
    );
    setErrors({});
  };

  const dayTotals = useMemo(
    () => week.map((day) => day.periods.reduce((sum, period) => sum + periodMinutes(period), 0)),
    [week],
  );
  const weekTotal = dayTotals.reduce((sum, minutes) => sum + minutes, 0);

  // Periods on the week that aren't saved yet (moved into or created on Save).
  const newPeriods = week.flatMap((day, dayIndex) =>
    day.enabled
      ? day.periods.filter((period) => !isSaved(period)).map((period) => ({ period, dayIndex }))
      : [],
  );
  const pendingUpdates = canEdit
    ? week.flatMap((day, dayIndex) =>
        day.periods.filter(isChanged).map((period) => ({ period, dayIndex })),
      )
    : [];
  // Edit: how many more periods can be added, i.e. freed saved records not yet
  // taken over by a new period (each one becomes an update on Save).
  const freeSlots = releasedPeriods.length - newPeriods.length;
  // Edit: a new period reuses a freed record (needs Edit) or, when none is
  // left, is created as a new record (needs Create).
  const canAddInEdit = canCreate || (canEdit && freeSlots > 0);
  // Save is enabled only when it has something to send: changed times, or new
  // periods (created in New, updated into from freed records in Edit). Only
  // unticking sends nothing, because update can't turn a day off.
  // Unticked saved periods (dayIndex >= 0) are parked on Save, so they count too.
  const hasChanges =
    newPeriods.length > 0 ||
    pendingUpdates.length > 0 ||
    releasedPeriods.some((released) => released.dayIndex >= 0);

  // Only checks the backend would reject anyway, with the backend's own messages.
  // End-before-start is left to the backend, which returns its own message.
  const validate = () => {
    const nextErrors = {};
    const requiredMessage = (fieldName) =>
      localize("The {0} field is required.").replace("{0}", fieldName);
    const overlapMessage = localize("SA:OverLappingExists");
    const duplicateMessage = localize("SA:WorkingHourExistsErrorMessage");

    const nextUserError = selectedUser ? "" : requiredMessage(localize("UserName"));
    setUserError(nextUserError);

    week.forEach((day) => {
      if (!day.enabled) return;
      day.periods.forEach((period) => {
        if (!period.start) nextErrors[period.key] = requiredMessage(localize("StartTime"));
        else if (!period.end) nextErrors[period.key] = requiredMessage(localize("EndTime"));
      });

      // No two periods on the same day may share the same times or overlap.
      const filled = day.periods.filter((period) => !nextErrors[period.key]);
      filled.forEach((period, index) => {
        filled.slice(index + 1).forEach((other) => {
          if (!overlaps(period, other)) return;
          const message =
            period.start === other.start && period.end === other.end ? duplicateMessage : overlapMessage;
          nextErrors[period.key] = nextErrors[period.key] || message;
          nextErrors[other.key] = nextErrors[other.key] || message;
        });
      });
    });

    setErrors(nextErrors);
    return !nextUserError && Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (saving || loadingWeek || !hasChanges) return;
    if (!validate()) return;

    setSaving(true);
    setSubmitError("");
    const failures = {};
    const saved = new Map();

    const payloadFor = (period, dayIndex) => ({
      userId: selectedUser.id,
      weekDay: WEEK_DAYS[dayIndex],
      startTime: period.start,
      endTime: period.end,
    });

    // Pair each set-aside saved record with a new period:
    // - same day and times: it is that record, kept as it is (no call);
    // - otherwise the record is moved there with an update;
    // - new periods left over are created; records left over stay unchanged.
    // Freshly unticked records are reused first, then already parked ones.
    const pool = [
      ...releasedPeriods.filter((released) => released.dayIndex >= 0),
      ...releasedPeriods.filter((released) => released.dayIndex < 0),
    ];
    const unmatched = [];
    const usedReleased = new Set();
    newPeriods.forEach((entry) => {
      const index = pool.findIndex(
        (released) =>
          released.dayIndex === entry.dayIndex &&
          released.savedStart === entry.period.start &&
          released.savedEnd === entry.period.end,
      );
      if (index < 0) {
        unmatched.push(entry);
        return;
      }
      const released = pool.splice(index, 1)[0];
      saved.set(entry.period.key, released.id);
      usedReleased.add(released.key);
    });
    // Edit reuses freed records first (update), then creates the rest; New only creates.
    const moves = [];
    const creates = [];
    unmatched.forEach((entry) => {
      if (isEditMode && canEdit && pool.length) {
        moves.push({ ...entry, released: pool.shift() });
      } else if (canCreate) {
        creates.push(entry);
      }
    });

    // Updates go first so a moved period frees its slot before new ones are created.
    for (const { period, dayIndex } of pendingUpdates) {
      try {
        await workingHoursApi.update(period.id, payloadFor(period, dayIndex));
        saved.set(period.key, period.id);
      } catch (err) {
        failures[period.key] = getApiErrorMessage(err) || localize("DefaultErrorMessage");
      }
    }

    // A move can clash with another set-aside record that hasn't moved yet, so
    // failed moves are tried once more after the others.
    const runMoves = async (list) => {
      const failed = [];
      for (const move of list) {
        try {
          await workingHoursApi.update(move.released.id, payloadFor(move.period, move.dayIndex));
          saved.set(move.period.key, move.released.id);
          usedReleased.add(move.released.key);
          delete failures[move.period.key];
        } catch (err) {
          failures[move.period.key] = getApiErrorMessage(err) || localize("DefaultErrorMessage");
          failed.push(move);
        }
      }
      return failed;
    };
    const failedMoves = await runMoves(moves);
    if (failedMoves.length && failedMoves.length < moves.length) await runMoves(failedMoves);

    // Park unticked records that weren't reused: week day All with a free
    // one-minute placeholder slot, so the day is off (see the header).
    const toPark = isEditMode && canEdit ? pool.filter((released) => released.dayIndex >= 0) : [];
    const parkedNow = [];
    let parkError = "";
    if (toPark.length) {
      const takenMinutes = new Set(
        pool
          .filter((released) => released.dayIndex < 0)
          .map((released) => toMinutes(released.savedStart))
          .filter((minute) => minute !== null),
      );
      let nextMinute = 0;
      for (const released of toPark) {
        while (takenMinutes.has(nextMinute)) nextMinute += 1;
        takenMinutes.add(nextMinute);
        const slot = { start: minuteToTime(nextMinute), end: minuteToTime(nextMinute + 1) };
        try {
          await workingHoursApi.update(released.id, {
            userId: selectedUser.id,
            weekDay: PARKED_WEEK_DAY,
            startTime: slot.start,
            endTime: slot.end,
          });
          parkedNow.push({
            ...released,
            dayIndex: -1,
            start: slot.start,
            end: slot.end,
            savedStart: slot.start,
            savedEnd: slot.end,
          });
        } catch (err) {
          parkError = parkError || getApiErrorMessage(err) || localize("DefaultErrorMessage");
        }
      }
    }

    for (const { period, dayIndex } of creates) {
      try {
        const created = await workingHoursApi.create(payloadFor(period, dayIndex));
        saved.set(period.key, created?.id);
      } catch (err) {
        failures[period.key] = getApiErrorMessage(err) || localize("DefaultErrorMessage");
      }
    }

    // Reused records leave the pool; newly parked ones stay in it as parked
    // (dayIndex -1) so later ticks can reuse them.
    const parkedKeys = new Set(parkedNow.map((released) => released.key));
    setReleasedPeriods((current) => [
      ...current.filter(
        (released) => !usedReleased.has(released.key) && !parkedKeys.has(released.key),
      ),
      ...parkedNow,
    ]);

    // So a retry only resends the failed periods: in Edit mode saved ones stay
    // on the week as saved; in New mode created ones leave the form.
    setWeek((current) =>
      current.map((day) => {
        if (!day.periods.some((period) => saved.has(period.key))) return day;
        if (isEditMode) {
          return {
            ...day,
            periods: day.periods.map((period) =>
              saved.has(period.key)
                ? {
                    ...period,
                    id: saved.get(period.key) || period.id,
                    savedStart: period.start,
                    savedEnd: period.end,
                  }
                : period,
            ),
          };
        }
        const periods = day.periods.filter((period) => !saved.has(period.key));
        return { enabled: periods.length > 0, periods };
      }),
    );
    setSaving(false);

    // Only periods that went to the server count (kept ones send nothing).
    const requestsSent =
      pendingUpdates.length > 0 || moves.length > 0 || creates.length > 0 || toPark.length > 0;
    if (saved.size > 0 || parkedNow.length > 0) onSave();

    if (Object.keys(failures).length > 0 || parkError) {
      setErrors(failures);
      setSubmitError(parkError || Object.values(failures)[0]);
      return;
    }

    if (requestsSent) toast(localize("SavedSuccessfully"), "success");
    onClose();
  };

  const dayLabel = (index) => localizedWeekDays[index] || localize(WEEK_DAYS[index]);
  const periodLabel = `${localize("StartTime")} – ${localize("EndTime")}`;
  // No "Period" key in the backend yet; localize returns the key ("Period")
  // until one is added, then its translation.
  const addPeriodText = localize("Period");
  // `locked` freezes the whole form. Adding periods needs Create in New; in
  // Edit it reuses a freed record (Edit) or creates a new one (Create).
  const locked = saving || loadingWeek || (!canCreate && !canEdit);
  const lockNew = locked || (isEditMode ? !(canEdit || canCreate) : !canCreate);
  const canAddPeriod = !lockNew && (!isEditMode || canAddInEdit);

  return (
    <Dialog
      open={open}
      onClose={(_event, reason) => {
        if (reason === "backdropClick" || reason === "escapeKeyDown") return;
        onClose();
      }}
      maxWidth={false}
      fullWidth
      PaperProps={{
        sx: {
          m: { xs: 1, sm: 4 },
          width: { xs: "calc(100% - 16px)", sm: "calc(100% - 64px)" },
          // Just wide enough for one period row (times, ×, +).
          maxWidth: "580px",
          maxHeight: { xs: "calc(100% - 16px)", sm: "calc(100% - 64px)" },
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
      <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-slate-900">
        {/* Header */}
        <div className="shrink-0 px-4 sm:px-6 pt-4 pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Management / Lookups / Staff Working Hours
              </p>
              <h2 className="mt-1 text-lg font-bold leading-tight text-slate-900 dark:text-white">
                {isEditMode ? "Edit Staff Working Hour" : "Staff Working Hours"}
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Configure the full week in one place
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={localize("Close")}
              className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex w-full flex-col gap-1 sm:w-72">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {localize("UserName")} <span className="required-asterisk">*</span>
              </label>
              <Autocomplete
              options={users}
              loading={loadingUsers}
              value={selectedUser}
              // Edit is for the clicked row's staff member only.
              disabled={saving || isEditMode}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionLabel={(option) =>
                option.name && option.userName
                  ? `${option.name} (${option.userName})`
                  : option.name || option.userName || ""
              }
              onChange={(_event, newValue) => {
                setSelectedUser(newValue);
                if (newValue) setUserError("");
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={localize("Search")}
                  error={!!userError}
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
              {userError && <p className="text-[11px] leading-tight text-red-500">{userError}</p>}
            </div>
            {!isEditMode && (
              <button
                type="button"
                onClick={copyMondayToWeekdays}
                disabled={saving || loadingWeek || !week[0].enabled || !week[0].periods.length}
                className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-pink-200 px-2 text-[11px] font-semibold text-pink-600 transition-colors hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-pink-500/40 dark:text-pink-300 dark:hover:bg-pink-500/10"
              >
                <Copy size={12} strokeWidth={2.5} />
                Copy Monday to Tue-Fri
              </button>
            )}
          </div>
        </div>

        {/* Week */}
        <div className="flex-1 min-h-0 overflow-y-auto border-t border-slate-100 dark:border-slate-800">
          {submitError && (
            <div className="px-4 sm:px-6 pt-2">
              <PremiumErrorAlert open message={submitError} onClose={() => setSubmitError("")} />
            </div>
          )}

          <div className="hidden sm:grid grid-cols-[120px_1fr_72px] gap-4 px-6 py-1.5 bg-slate-50 dark:bg-slate-800/40 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <span>{localize("WeekDay")}</span>
            <span>{periodLabel}</span>
            <span className="text-right leading-tight">{localize("TotalDurationHours")}</span>
          </div>

          {loadingWeek ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
              <CircularProgress size={16} color="inherit" />
              {localize("LoadingWithThreeDot")}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {week.map((day, dayIndex) => {
                // Unticking a day with saved periods moves them on Save (update),
                // so it needs Edit; without it the day stays ticked (normal look,
                // clicks ignored). Ticking an empty day needs Create.
                const hasSaved = day.periods.some(isSaved);
                const keepTicked = hasSaved && !canEdit;
                // In Edit an empty day can be ticked when a period can be added
                // (Create, or a freed record) or it's re-ticking its own saved hours.
                const canTick =
                  !isEditMode ||
                  canAddInEdit ||
                  releasedPeriods.some((released) => released.dayIndex === dayIndex);
                const checkboxLocked = day.enabled
                  ? hasSaved
                    ? locked
                    : lockNew
                  : lockNew || !canTick;
                return (
                  <div
                    key={WEEK_DAYS[dayIndex]}
                    className="grid grid-cols-[1fr_auto] sm:grid-cols-[120px_1fr_72px] gap-x-4 gap-y-1 px-4 sm:px-6 py-1"
                  >
                    <label className={`flex items-center gap-2 h-6 ${keepTicked ? "cursor-default" : "cursor-pointer"}`}>
                      <input
                        type="checkbox"
                        checked={day.enabled}
                        disabled={checkboxLocked && !keepTicked}
                        onChange={() => toggleDay(dayIndex)}
                        className={`w-3.5 h-3.5 rounded accent-pink-600 disabled:cursor-default ${keepTicked ? "cursor-default" : "cursor-pointer"}`}
                      />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {dayLabel(dayIndex)}
                      </span>
                    </label>

                    <span className="sm:order-last flex items-center justify-end h-6 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      {day.enabled && dayTotals[dayIndex] > 0 ? formatHours(dayTotals[dayIndex]) : "—"}
                    </span>

                    <div className="col-span-2 sm:col-span-1 flex flex-col gap-1 min-w-0">
                      {!day.enabled ? (
                        <span className="flex items-center h-6 text-[11px] text-slate-400">
                          {WEEKEND_DAY_INDEXES.includes(dayIndex) ? "Day Off" : "—"}
                        </span>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {day.periods.map((period, periodIndex) => {
                            const isLast = periodIndex === day.periods.length - 1;
                            const saved = isSaved(period);
                            // Saved periods need Edit, new ones need Create.
                            const timeLocked = saved ? locked || !canEdit : lockNew;
                            return (
                              <div key={period.key} className="flex flex-wrap items-center gap-1">
                                {["start", "end"].map((field, fieldIndex) => {
                                  const fieldLabel = `${dayLabel(dayIndex)} ${localize(field === "start" ? "StartTime" : "EndTime")}`;
                                  return (
                                    <div key={field} className="flex items-center gap-1">
                                      {fieldIndex === 1 && <span className="text-slate-400 text-xs">–</span>}
                                      <div className="relative w-[72px]">
                                        <EditableTimePicker
                                          value={period[field]}
                                          onChange={(date, dateString) =>
                                            setPeriodTime(dayIndex, period.key, field, date ? dateString : "")
                                          }
                                          disabled={timeLocked}
                                          placeholder="--:--"
                                          aria-label={fieldLabel}
                                          aria-invalid={!!errors[period.key]}
                                          className={timeInputClass(!!errors[period.key], timeLocked)}
                                        />
                                        {/* Clear × empties this time box only. */}
                                        {period[field] && !timeLocked && (
                                          <button
                                            type="button"
                                            onClick={() => setPeriodTime(dayIndex, period.key, field, "")}
                                            aria-label={`${localize("Clear")} ${fieldLabel}`}
                                            title={localize("Clear")}
                                            className="absolute right-0.5 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-3.5 h-3.5 rounded text-slate-300 hover:text-pink-500"
                                          >
                                            <X size={11} strokeWidth={2.5} />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                                {/* Remove ×: a saved period is set aside to be moved
                                    (updated) on Save, which needs Edit. A same-width
                                    spacer keeps the + button aligned. */}
                                {saved && !canEdit ? (
                                  <span className="w-5 h-5" aria-hidden="true" />
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => removePeriod(dayIndex, period.key)}
                                    disabled={saved ? locked : lockNew}
                                    aria-label={localize("Remove")}
                                    title={localize("Remove")}
                                    className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                                  >
                                    <X size={13} strokeWidth={2.5} />
                                  </button>
                                )}
                                {/* "+ Period" adds another period to the day. */}
                                {isLast && canAddPeriod && (
                                  <button
                                    type="button"
                                    onClick={() => addPeriod(dayIndex)}
                                    aria-label={`${dayLabel(dayIndex)}: + ${addPeriodText}`}
                                    title={periodLabel}
                                    className="inline-flex items-center gap-1 h-6 px-1.5 rounded border border-dashed border-pink-300 text-pink-600 text-[10px] font-medium hover:bg-pink-50 dark:border-pink-500/40 dark:text-pink-300 dark:hover:bg-pink-500/10 transition-colors"
                                  >
                                    <Plus size={12} strokeWidth={2.5} />
                                    {addPeriodText}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {/* One line per distinct error, under the day's periods. */}
                      {day.enabled &&
                        [...new Set(day.periods.map((period) => errors[period.key]).filter(Boolean))].map((message) => (
                          <p key={message} className="text-[11px] leading-tight text-red-500">{message}</p>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between gap-4 px-4 sm:px-6 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800">
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {localize("TotalDurationHours")}: {formatHours(weekTotal)}h/Week
          </p>
          <button
            type="button"
            onClick={handleSave}
            disabled={locked || !hasChanges}
            className="app-primary-button inline-flex items-center justify-center gap-2 px-4 py-2 text-xs rounded-lg disabled:opacity-50"
          >
            {saving && <CircularProgress size={12} color="inherit" />}
            {saving ? localize("SavingWithThreeDot") : localize("Save")}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
