import { useState, useEffect, useMemo } from "react";
import AppSelect from "./AppSelect";
import SearchTextHighlight from "./SearchTextHighlight";
import { Check, AlertCircle, X } from "lucide-react";
import { jobsheetsApi } from "../../services/api/jobsheets";
import { ActionsMenu } from "./ResourcePage";

import { usersApi } from "../../services/api/users";
import codeDetailsApi from "../../services/api/CodeDetails";
import { taskCategoryProjectsApi } from "../../services/api/taskCategoryProjects";
import { getApiErrorMessage } from "../../utils/apiError";
import { useAuth } from "../../context/AuthContextHook";
import { useBackendLocalization } from "../../hooks/useBackendLocalization";
import { useBackendEnumOptions } from "../../hooks/useBackendEnumOptions";
import { useToast } from "./ToastContext";
import {
  JOBSHEET_SIGNALR_EVENTS,
  normalizeTicketDetailsUpdate,
  processTicketDetailsUpdate,
  subscribeToJobsheetEvent,
} from "../../services/jobsheetSignalR";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";




// ─── Attendance options come from the backend AttendanceStatusEnum ─
// Same list as Blazor: every member except "All".
const ATTENDANCE_EXCLUDED = ["All"];

// Same collaborator list as Blazor (Sureze and Abbott vendor users);
// these are backend OrganizationTypeEnum member names.
const COLLABORATOR_ORGANIZATION_TYPES = ["VendorSureze", "VendorAbbott"];

// ─── Lookup codes — match your codesApi lookupCode values ─────────
const LOOKUP_CODES = {
  PROJECT: "PRJ",
  TASK_CATEGORY: "TSK",   // ← update if your lookupCode differs
  STATUS: "STS",   // ← update if your lookupCode differs
};

// ─── Empty detail row ─────────────────────────────────────────────
const emptyDetail = {
  taskCategoryId: "",
  subTaskCategoryId: "",
  projectId: "",
  startTimeDisplay: "",   // HH:mm — converted to ticks on submit
  endTimeDisplay: "",   // HH:mm — converted to ticks on submit
  statusId: "",
  remarks: "",
  amsTicketDetailId: "",
  cmsNextTicketNo: "",
  jobsheetDetailUserIds: [],
  // Set from the backend when a task / sub task category is chosen (as in Blazor).
  hasSubTaskCategory: false,
  isCollaboratorsRequired: false,
};

// ─── Helpers ──────────────────────────────────────────────────────
function dateToTimeString(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return "";
  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}

function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return (hours * 60) + minutes;
}

function hasTimeRangeOverlap(candidate, records, excludedIndex = null) {
  const candidateStart = timeToMinutes(candidate.startTimeDisplay);
  const candidateEnd = timeToMinutes(candidate.endTimeDisplay);

  if (candidateStart === null || candidateEnd === null || candidateStart >= candidateEnd) {
    return false;
  }

  return records.some((record, index) => {
    if (index === excludedIndex) return false;
    if (candidate.id && record.id === candidate.id) return false;
    const recordStart = timeToMinutes(record.startTimeDisplay);
    const recordEnd = timeToMinutes(record.endTimeDisplay);
    if (recordStart === null || recordEnd === null) return false;

    // End-to-start boundaries are allowed; intersecting ranges are not.
    return candidateStart < recordEnd && candidateEnd > recordStart;
  });
}

function dateToLocalDateString(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(value).split("T")[0];
}

function formatDisplayDate(value) {
  const [year, month, day] = dateToLocalDateString(value).split("-");
  return year && month && day ? `${day}/${month}/${year}` : "";
}

function mapJobsheetDetails(items = []) {
  return items.map((item) => ({
    ...item,
    startTimeDisplay: item.startTime?.substring(0, 5) || "",
    endTimeDisplay: item.endTime?.substring(0, 5) || "",
    _taskCategoryName: item.taskCategoryName,
    _subTaskCategoryName: item.subTaskCategoryName,
    _projectName: item.projectName,
    _statusName: item.statusName,
  }));
}

function getTicketDetailItems(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.jobsheetDetails)) return response.jobsheetDetails;
  return [];
}

function selectedDateParameter(selectedDate) {
  // AMS activity timestamps are saved without a timezone suffix. Sending Z
  // converts the value to UTC on the server and can move the lookup outside
  // the intended local activity date.
  return `${selectedDate}T00:00:00`;
}

// The overlap endpoint uses the same JobsheetDetailDto as create/update.
// Although Swagger renders TimeSpan as an object, the ASP.NET JSON converter
// accepts it in the HH:mm:ss string format used by the working save endpoint.
function buildOverlapPayload(details) {
  return details.map((d) => {
    const overlapDetail = {
      taskCategoryId: d.taskCategoryId,
      projectId: d.projectId,
      startTime: d.startTimeDisplay ? `${d.startTimeDisplay}:00` : "00:00:00",
      endTime: d.endTimeDisplay ? `${d.endTimeDisplay}:00` : "00:00:00",
      statusId: d.statusId,
      remarks: d.remarks,
      amsTicketDetailId: d.amsTicketDetailId || null,
      workingHoursFlag: d.workingHoursFlag ?? 0,
      taskCategoryName: d.taskCategoryName || d._taskCategoryName || null,
      subTaskCategoryName: d.subTaskCategoryName || d._subTaskCategoryName || null,
      statusName: d.statusName || d._statusName || null,
      cmsNextTicketNo: d.cmsNextTicketNo || null,
      concurrencyStamp: d.concurrencyStamp || null,
      projectName: d.projectName || d._projectName || null,
      hasSubTaskCategory: d.hasSubTaskCategory ?? Boolean(d.subTaskCategoryId),
      isCollaboratorsRequired: d.isCollaboratorsRequired ?? false,
      jobsheetDetailUserIds: d.jobsheetDetailUserIds || [],
      jobsheetDetailUsers: d.jobsheetDetailUsers || [],
    };

    if (d.subTaskCategoryId) overlapDetail.subTaskCategoryId = d.subTaskCategoryId;

    // Existing record identifiers let the backend exclude the same detail
    // while checking an update. New records do not have these values yet.
    if (d.id) overlapDetail.id = d.id;
    if (d.jobsheetId) overlapDetail.jobsheetId = d.jobsheetId;

    return overlapDetail;
  });
}

function buildPayload(date, attendanceStatus, details, jobsheet) {
  const payload = {
    date: date ? new Date(date).toISOString() : null,
    attendanceStatus: Number(attendanceStatus),
    jobsheetDetails: details.map((d) => {
      const detail = {
        taskCategoryId: d.taskCategoryId || null,
        projectId: d.projectId || null,
        startTime: d.startTimeDisplay ? `${d.startTimeDisplay}:00` : "00:00:00",
        endTime: d.endTimeDisplay ? `${d.endTimeDisplay}:00` : "00:00:00",
        statusId: d.statusId || null,
        remarks: d.remarks,
        jobsheetDetailUserIds: d.jobsheetDetailUserIds || [],
      };
      if (d.subTaskCategoryId) detail.subTaskCategoryId = d.subTaskCategoryId;
      if (d.amsTicketDetailId) detail.amsTicketDetailId = d.amsTicketDetailId;

      // Child identifiers are essential on update. Without them the backend
      // cannot match an edited row or determine which existing row was removed.
      if (d.id) detail.id = d.id;
      if (d.jobsheetId || jobsheet?.id) {
        detail.jobsheetId = d.jobsheetId || jobsheet.id;
      }
      if (d.concurrencyStamp) detail.concurrencyStamp = d.concurrencyStamp;
      if (d.workingHoursFlag !== undefined && d.workingHoursFlag !== null) {
        detail.workingHoursFlag = d.workingHoursFlag;
      }
      if (d.id) detail.isDeleted = Boolean(d.isDeleted);

      return detail;
    }),
  };

  // Required for updates — ABP's optimistic concurrency check compares this
  // against the DB value. Omitting it entirely (not just sending null) is
  // treated as a stale/mismatched entity and throws
  // SA:ConcurrencyErrorMessage on every update, not just real conflicts.
  if (jobsheet?.id) payload.id = jobsheet.id;
  if (jobsheet?.concurrencyStamp) {
    payload.concurrencyStamp = jobsheet.concurrencyStamp;
  }

  return payload;
}

// Fetching lookup details using getByLookupCodes instead


// ─── Reusable dynamic select ──────────────────────────────────────
function DynSelect({ name, value, onChange, options, loading, placeholder, loadingText, disabled = false, hasError = false, styles }) {
  return (
    <AppSelect
      name={name}
      value={value}
      onChange={onChange}
      disabled={loading || disabled}
      style={{
        ...styles.input,
        ...styles.select,
        backgroundColor: styles.input.backgroundColor, // re-apply to avoid background shorthand conflict
        color: value ? (styles._isDark ? "#e2e8f0" : "#333") : "#aaa",
        opacity: disabled ? 0.7 : 1,
        border: hasError ? "1px solid #ff4d4f" : styles.input.border
      }}
    >
      <option value="">{loading ? loadingText : placeholder}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.name}</option>
      ))}
    </AppSelect>
  );
}

// ─── Collaborator pill picker ─────────────────────────────────────
// Users are shown by Name, as in Blazor.
function CollaboratorPicker({ users, selected, onChange, loading, placeholder, loadingText, disabled = false, fieldErrors = {}, styles }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const isDark = styles?._isDark;

  const filtered = users.filter((u) =>
    (u.name || u.userName || "").toLowerCase().includes(query.toLowerCase()),
  );

  const selectedUsers = useMemo(() =>
    selected.map(id => users.find(u => u.id === id)).filter(Boolean),
    [selected, users]
  );

  const toggle = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
    setQuery("");
  };

  return (
    <div style={{ position: "relative", opacity: disabled ? 0.7 : 1 }}>
      <div
        style={{
          ...styles.input,
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          padding: "5px 8px",
          minHeight: "40px",
          alignItems: "center",
          cursor: "text",
          border: fieldErrors?.jobsheetDetailUserIds ? "1px solid #ff4d4f" : styles.input.border,
          position: "relative"
        }}
        onClick={() => !disabled && setIsOpen(true)}
      >
        {selectedUsers.map((u) => (
          <span key={u.id} style={{ ...styles.pill, margin: 0 }}>
            {u.name || u.userName}
            {!disabled && (
              <button
                type="button"
                style={styles.pillRemove}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(u.id);
                }}
              >
                <X size={14} />
              </button>
            )}
          </span>
        ))}

        <input
          style={{
            border: "none",
            outline: "none",
            background: "transparent",
            flex: 1,
            minWidth: "120px",
            fontSize: "13px",
            color: isDark ? "#e2e8f0" : "#1e293b",
            padding: "4px 0"
          }}
          placeholder={loading ? loadingText : selected.length === 0 ? placeholder : ""}
          disabled={loading || disabled}
          value={isOpen ? query : ""}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => !disabled && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        />

        {selected.length > 0 && !isOpen && (
          <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>
            <span style={{ fontSize: 11, background: "#ec4899", color: "#fff", borderRadius: 10, padding: "2px 6px", fontWeight: "bold" }}>
              {selected.length}
            </span>
          </div>
        )}
      </div>

      {isOpen && !disabled && filtered.length > 0 && (
        <div style={styles.dropdown}>
          {filtered.slice(0, 15).map((u) => {
            const isSel = selected.includes(u.id);
            return (
              <div
                key={u.id}
                style={{
                  ...styles.dropdownItem,
                  backgroundColor: isSel ? (isDark ? "rgba(236,72,153,0.15)" : "#fdf2f8") : "transparent",
                  display: "flex", justifyContent: "space-between", alignItems: "center"
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  toggle(u.id);
                }}
              >
                <span>
                  <SearchTextHighlight text={u.name || u.userName || ""} query={query} />
                </span>
                {isSel && <Check size={14} color="#ec4899" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}



// ─── Main component ───────────────────────────────────────────────
export default function NewJobsheet({ open, onClose, onSave, onSubmit, viewOnly = false, jobsheet = null }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const localize = useBackendLocalization("Billing");
  const requiredMessage = (fieldName) =>
    localize("The {0} field is required.").replace("{0}", fieldName);
  const timeOverlapMessage = localize("SA:JobsheetDetailOverlappingErrorMessage");
  const emptyOptionText = localize("SelectBoxEmptyValueText");
  const loadingText = localize("LoadingWithThreeDot");
  // The backend has no "Remarks" key; ClosingTicketRemarks holds the same label.
  const remarksLabel = localize("Remarks") || localize("ClosingTicketRemarks");
  const attendanceOptions = useBackendEnumOptions("AttendanceStatusEnum", localize, {
    exclude: ATTENDANCE_EXCLUDED,
  });
  // ── Dark mode detection ──
  const isDark = document.documentElement.classList.contains("dark");
  const styles = getStyles(isDark);

  // ── Form state ──
  const [date, setDate] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState("");
  const [detail, setDetail] = useState(emptyDetail);
  const [details, setDetails] = useState([]);
  const [deletedDetails, setDeletedDetails] = useState([]);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [allowedCategoryIds, setAllowedCategoryIds] = useState(null); // Filtered by Project
  const [editingIndex, setEditingIndex] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null); // { type, message, confirmLabel, cancelLabel }

  const isDirty = useMemo(() => {
    if (viewOnly) return false;
    if (date || attendanceStatus !== "") return true;
    if (details.length > 0) return true;
    // Check if current detail form is being filled
    const d = detail;
    if (d.projectId || d.taskCategoryId || d.remarks || d.jobsheetDetailUserIds.length > 0) return true;
    return false;
  }, [date, attendanceStatus, details, detail, viewOnly]);

  const currentTimeOverlap = useMemo(
    () => hasTimeRangeOverlap(detail, details, editingIndex),
    [detail, details, editingIndex],
  );

  // ── Fully reset the form back to a clean slate ──
  // Called whenever the modal is exited/closed or a jobsheet is successfully
  // created, so the next time it opens the user never sees stale data.
  const resetForm = () => {
    setDate("");
    setAttendanceStatus("");
    setDetail(emptyDetail);
    setDetails([]);
    setDeletedDetails([]);
    setEditingIndex(null);
    setError("");
    setFieldErrors({});
    setAllowedCategoryIds(null);
    setSubTaskCategories([]);
    setFetchError("");
    setConfirmation(null);
  };

  const handleCloseAttempt = () => {
    if (viewOnly) {
      resetForm();
      onClose();
      return;
    }
    setConfirmation({
      type: "EXIT",
      message: localize("CloseModalMessage"),
      confirmLabel: localize("Yes"),
      cancelLabel: localize("CancelButtonText"),
    });
  };


  // ── Lookup data ──
  const [projects, setProjects] = useState([]);
  const [taskCategories, setTaskCategories] = useState([]);
  const [subTaskCategories, setSubTaskCategories] = useState([]); // handle sub task categories
  const [statuses, setStatuses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingSubCats, setLoadingSubCats] = useState(false);
  const [fetchError, setFetchError] = useState("");


  // ── Fetch all lookups when modal opens ──
  useEffect(() => {
    if (!open) return;

    const fetchAll = async () => {
      setLoadingOptions(true);
      setFetchError("");
      try {
        // Fetch all lookups at once
        const allLookups = await codeDetailsApi.getByLookupCodes(['TSK', 'STS', 'PRJ']);

        // Split into separate arrays
        const projects = allLookups.filter(item => item.lookupCode === 'PRJ');
        const tasks = allLookups.filter(item => item.lookupCode === 'TSK');
        const statuses = allLookups.filter(item => item.lookupCode === 'STS');

        // Map them into the { id, name } structure
        const proj = projects
          .filter(d => d.isActive !== false)
          .map(item => ({ id: item.id, name: item.description || item.newCode }));

        const cats = tasks
          .filter(d => d.isActive !== false)
          .map(item => ({ id: item.id, name: item.description || item.newCode }));

        const stats = statuses
          .filter(d => d.isActive !== false)
          .map(item => ({ id: item.id, name: item.description || item.newCode }));

        // Collaborators — same user list as the Blazor modal (AllUsers)
        const usrs = await usersApi
          .getUsersList({ organizationTypes: COLLABORATOR_ORGANIZATION_TYPES })
          .then((data) => (Array.isArray(data) ? data : data?.items || []));

        setProjects(proj);
        setTaskCategories(cats);
        setStatuses(stats);
        setUsers(usrs);
      } catch (err) {
        console.error("Failed to load lookup data:", err);
        setFetchError(getApiErrorMessage(err) || localize("DefaultErrorMessage"));
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Task categories for the selected project, straight from the backend ──
  // Same call as Blazor (TaskCategoryProjectAppService.GetTaskCategoriesByProjectIdAsync).
  // This only loads the list; it never clears the chosen category, so editing a
  // saved record keeps its task category. A user-driven project change clears
  // it in handleProjectChange.
  useEffect(() => {
    if (!detail.projectId) {
      setAllowedCategoryIds(null);
      return;
    }

    let ignoreResult = false;
    const fetchProjectCategories = async () => {
      try {
        const data = await taskCategoryProjectsApi.getCategoriesByProjectId(detail.projectId);
        const list = (Array.isArray(data) ? data : data?.items || [])
          .map((item) => ({ id: item.id, name: item.description || item.newCode }));
        if (!ignoreResult) setAllowedCategoryIds(list);
      } catch (err) {
        console.error("Failed to fetch task categories for the project:", err);
        if (!ignoreResult) setAllowedCategoryIds([]);
      }
    };

    fetchProjectCategories();
    return () => {
      ignoreResult = true;
    };
  }, [detail.projectId]);

  // ── Task categories offered for the selected project ──
  const filteredTaskCategories = useMemo(() => {
    if (!detail.projectId || !allowedCategoryIds) return [];
    const filtered = allowedCategoryIds;
    // Safety net: if the record being edited has a taskCategoryId that
    // isn't in the "allowed for this project" list (e.g. older data),
    // still show it so the select doesn't silently render blank.
    if (detail.taskCategoryId && !filtered.some(c => c.id === detail.taskCategoryId)) {
      const current = taskCategories.find(c => c.id === detail.taskCategoryId);
      if (current) return [...filtered, current];
    }
    return filtered;
  }, [taskCategories, allowedCategoryIds, detail.projectId, detail.taskCategoryId]);

  // ── Fetch sub-task categories when parent category changes ──
  useEffect(() => {
    if (!detail.taskCategoryId) {
      setSubTaskCategories([]);
      return;
    }
    const fetchSub = async () => {
      setLoadingSubCats(true);
      try {
        const data = await codeDetailsApi.getByGroupCode(detail.taskCategoryId);
        const list = (Array.isArray(data) ? data : data?.items || [])
          .filter(d => d.isActive !== false)
          .map(d => ({ id: d.id, name: d.description || d.newCode }));
        setSubTaskCategories(list);
      } catch (err) {
        console.error("Sub-task fetch error:", err);
      } finally {
        setLoadingSubCats(false);
      }
    };
    fetchSub();
  }, [detail.taskCategoryId]);


  // ── Reset form or populate from jobsheet when modal opens ──
  useEffect(() => {
    if (open) {
      setDeletedDetails([]);
      if (jobsheet) {
        // Populate the jobsheet header and table, but leave the detail editor
        // empty until the user chooses a specific row from Actions.
        setDate(jobsheet.date ? jobsheet.date.split("T")[0] : "");
        setAttendanceStatus(jobsheet.attendanceStatus ?? "");

        // Map details from API response
        const mappedDetails = mapJobsheetDetails(jobsheet.jobsheetDetails || []);
        setDetails(mappedDetails);
        setDetail(emptyDetail);
        setEditingIndex(null);
      } else {

        // Clear for Create mode
        setDate("");
        setAttendanceStatus("");
        setDetail(emptyDetail);
        setDetails([]);
        setEditingIndex(null);
      }
      setError("");
      setFieldErrors({});
      setFetchError("");
    }
  }, [open, jobsheet]);

  // Keep AMS-generated rows in an open jobsheet in sync while preserving any
  // manual rows the user is currently drafting in the modal.
  useEffect(() => {
    if (!open || !date || !user?.id) return undefined;

    const selectedDate = dateToLocalDateString(date);
    let disposed = false;

    const handleTicketDetailsUpdated = async (firstArgument, secondArgument) => {
      const { affectedDates, affectedUserIds } = normalizeTicketDetailsUpdate(
        firstArgument,
        secondArgument,
      );
      const affectsSelectedDate = affectedDates.some(
        (affectedDate) => dateToLocalDateString(affectedDate) === selectedDate,
      );
      const affectsCurrentUser = affectedUserIds.length === 0 || affectedUserIds.some(
        (affectedUserId) => String(affectedUserId).toLowerCase() === String(user.id).toLowerCase(),
      );
      if (!affectsSelectedDate || !affectsCurrentUser) return;

      try {
        await processTicketDetailsUpdate(firstArgument, secondArgument);

        const refreshedDetails = jobsheet?.id
          ? (await jobsheetsApi.getById(jobsheet.id))?.jobsheetDetails
          : await jobsheetsApi.getTicketDetails({
            date: selectedDateParameter(selectedDate),
            userId: user.id,
            isActive: true,
          });

        if (disposed) return;

        const automaticDetails = mapJobsheetDetails(
          getTicketDetailItems(refreshedDetails).filter((item) => item.amsTicketDetailId),
        );

        setDetails((currentDetails) => [
          ...currentDetails.filter((item) => !item.amsTicketDetailId),
          ...automaticDetails,
        ].sort((left, right) =>
          (left.startTimeDisplay || "").localeCompare(right.startTimeDisplay || ""),
        ));
      } catch (err) {
        console.error("Failed to refresh AMS jobsheet details:", err);
      }
    };

    const unsubscribe = subscribeToJobsheetEvent(
      JOBSHEET_SIGNALR_EVENTS.updateTicketDetails,
      handleTicketDetailsUpdated,
    );

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [open, date, jobsheet?.id, user?.id]);


  if (!open) return null;

  // ── Handlers ──
  const handleDetailChange = (e) => {
    const { name, value } = e.target;
    setDetail((prev) => ({ ...prev, [name]: value }));
  };

  // Project changes are handled separately (not via handleDetailChange)
  // because a genuine, user-driven project change needs to reset the
  // dependent task-category / sub-task-category fields. Doing this reset
  // here — instead of in a useEffect keyed on projectId — means it only
  // fires when the user actually picks a different project, and never
  // fires when we programmatically load a saved record via handleEditDetail.
  const handleProjectChange = (e) => {
    const newProjectId = e.target.value;
    setDetail((prev) => ({
      ...prev,
      projectId: newProjectId,
      taskCategoryId: "",
      subTaskCategoryId: "",
    }));
    setFieldErrors((prev) => ({
      ...prev,
      projectId: null,
      taskCategoryId: null,
      subTaskCategoryId: null,
    }));
  };

  // Same flow as Blazor OnChangedJobsheetDate:
  // 1. If another jobsheet exists on the new date, show the backend message and
  //    keep the previous date.
  // 2. Otherwise load the user's active AMS ticket activities for that date as
  //    jobsheet rows (replacing the previous date's AMS rows). If they overlap the
  //    existing rows, show the backend message and keep the previous date.
  const handleDateChange = async (newDate) => {
    const oldDate = date;
    setDate(newDate);
    setFieldErrors((prev) => ({ ...prev, date: null }));
    setError("");
    if (!newDate) return;

    try {
      const exists = await jobsheetsApi.checkExists({
        date: selectedDateParameter(newDate),
        id: jobsheet?.id || undefined,
      });
      if (exists) {
        setError(
          localize("SA:JobsheetAlreadyExistsErrorMessage_2").replace("{0}", formatDisplayDate(newDate)),
        );
        setDate(oldDate);
        return;
      }

      if (!user?.id) return;
      const ticketDetails = await jobsheetsApi.getTicketDetails({
        date: selectedDateParameter(newDate),
        userId: user.id,
        isActive: true,
      });
      const automaticDetails = mapJobsheetDetails(getTicketDetailItems(ticketDetails));
      const manualDetails = details.filter((item) => !item.amsTicketDetailId);
      const previousAmsDetails = details.filter((item) => item.amsTicketDetailId);
      const combinedDetails = [...manualDetails, ...automaticDetails].sort((left, right) =>
        (left.startTimeDisplay || "").localeCompare(right.startTimeDisplay || ""),
      );

      if (automaticDetails.length > 0) {
        const hasOverlap = await jobsheetsApi.hasOverlappingJobsheetDetails(
          buildOverlapPayload(combinedDetails),
        );
        if (hasOverlap) {
          setError(localize("SA:JobsheetDetailOverlappingWithAMSTicketsErrorMessage"));
          setDate(oldDate);
          return;
        }
      }

      // Saved AMS rows of the previous date are removed on save, as in Blazor.
      const removedAmsDetails = previousAmsDetails.filter(
        (item) => item.id && !automaticDetails.some((automatic) => automatic.id === item.id),
      );
      if (removedAmsDetails.length > 0) {
        setDeletedDetails((prev) => [
          ...prev,
          ...removedAmsDetails
            .filter((item) => !prev.some((deleted) => deleted.id === item.id))
            .map((item) => ({ ...item, isDeleted: true })),
        ]);
      }
      setDetails(combinedDetails);
    } catch (err) {
      setError(getApiErrorMessage(err) || localize("DefaultErrorMessage"));
    }
  };

  const handleCollaboratorsChange = (ids) =>
    setDetail((prev) => ({ ...prev, jobsheetDetailUserIds: ids }));

  // Same as Blazor OnChangedTaskCategory: ask the backend whether this category
  // has sub task categories and whether it makes collaborators required.
  const handleTaskCategoryChange = async (e) => {
    const taskCategoryId = e.target.value;
    setDetail((prev) => ({
      ...prev,
      taskCategoryId,
      subTaskCategoryId: "",
      hasSubTaskCategory: false,
      isCollaboratorsRequired: false,
    }));
    setFieldErrors((prev) => ({
      ...prev,
      taskCategoryId: null,
      subTaskCategoryId: null,
      jobsheetDetailUserIds: null,
    }));
    if (!taskCategoryId) return;

    try {
      const [isCollaboratorsRequired, hasSubTaskCategory] = await Promise.all([
        codeDetailsApi.isRequiredField(taskCategoryId),
        codeDetailsApi.hasSubTaskCategory(taskCategoryId),
      ]);
      setDetail((prev) =>
        prev.taskCategoryId === taskCategoryId
          ? { ...prev, isCollaboratorsRequired, hasSubTaskCategory }
          : prev,
      );
    } catch (err) {
      setError(getApiErrorMessage(err) || localize("DefaultErrorMessage"));
    }
  };

  // Same as Blazor OnChangeSubTaskCategoryId: the sub task category decides
  // whether collaborators are required.
  const handleSubTaskCategoryChange = async (e) => {
    const subTaskCategoryId = e.target.value;
    setDetail((prev) => ({ ...prev, subTaskCategoryId, isCollaboratorsRequired: false }));
    setFieldErrors((prev) => ({ ...prev, subTaskCategoryId: null, jobsheetDetailUserIds: null }));
    if (!subTaskCategoryId) return;

    try {
      const isCollaboratorsRequired = await codeDetailsApi.isRequiredField(subTaskCategoryId);
      setDetail((prev) =>
        prev.subTaskCategoryId === subTaskCategoryId ? { ...prev, isCollaboratorsRequired } : prev,
      );
    } catch (err) {
      setError(getApiErrorMessage(err) || localize("DefaultErrorMessage"));
    }
  };

  const showSubTaskCategory = detail.hasSubTaskCategory || subTaskCategories.length > 0;

  const validateDetail = () => {
    const errors = {};
    if (!detail.projectId) errors.projectId = requiredMessage(localize("ProjectId"));
    if (!detail.taskCategoryId) errors.taskCategoryId = requiredMessage(localize("TaskCategoryId"));
    if (showSubTaskCategory && !detail.subTaskCategoryId) {
      errors.subTaskCategoryId = requiredMessage(localize("SubTaskCategoryId"));
    }
    if (detail.isCollaboratorsRequired && (detail.jobsheetDetailUserIds || []).length === 0) {
      errors.jobsheetDetailUserIds = requiredMessage(localize("Collaborators"));
    }
    if (!detail.startTimeDisplay) errors.startTimeDisplay = requiredMessage(localize("StartTime"));
    if (!detail.endTimeDisplay) errors.endTimeDisplay = requiredMessage(localize("EndTime"));
    if (!detail.statusId) errors.statusId = requiredMessage(localize("StatusId"));
    if (!detail.remarks?.trim()) {
      errors.remarks = requiredMessage(remarksLabel);
    }

    if (detail.startTimeDisplay && detail.endTimeDisplay) {
      if (detail.startTimeDisplay >= detail.endTimeDisplay) {
        const rule = localize("ThisFieldMustBeGreaterThan{0}") ||
          localize("ThisFieldMustBeGreaterThanOrEqual{0}");
        errors.endTimeDisplay = `${localize("EndTime")}: ${rule.replace("{0}", localize("StartTime"))}`;
      } else if (hasTimeRangeOverlap(detail, details, editingIndex)) {
        errors.endTimeDisplay = timeOverlapMessage;
      }
    }

    setFieldErrors(prev => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  };

  const handleEditDetail = (idx) => {
    setDetail(details[idx]);
    setEditingIndex(idx);
    setFieldErrors({});
    setError("");
  };

  const handleDetailCancel = () => {
    if (viewOnly) return;
    setConfirmation({
      type: "DETAIL_CANCEL",
      message: localize("CancelConfirmationMessage"),
      confirmLabel: localize("Yes"),
      cancelLabel: localize("No"),
    });
  };

  // Blazor asks before removing a detail row.
  const handleDeleteRequest = (idx) => {
    setConfirmation({
      type: "DELETE",
      index: idx,
      message: localize("DeleteConfirmationMessage"),
      confirmLabel: localize("Yes"),
      cancelLabel: localize("No"),
    });
  };

  const handleAddDetail = () => {
    if (!validateDetail()) {
      setError(localize("ValidationErrorMessage"));
      return;
    }
    setError("");
    setFieldErrors({});

    // Capture current names for the table display
    const enrichedDetail = {
      ...detail,
      _taskCategoryName: nameOf(taskCategories, detail.taskCategoryId),
      _subTaskCategoryName: nameOf(subTaskCategories, detail.subTaskCategoryId),
      _projectName: nameOf(projects, detail.projectId),
      _statusName: nameOf(statuses, detail.statusId),
    };

    if (editingIndex !== null) {
      setDetails((prev) => {
        const newDetails = [...prev];
        newDetails[editingIndex] = enrichedDetail;
        return newDetails;
      });
      setEditingIndex(null);
    } else {
      setDetails((prev) => [...prev, enrichedDetail]);
    }
    setDetail(emptyDetail);
  };


  const handleRemoveDetail = (idx) => {
    const removedDetail = details[idx];

    // Existing child records must remain in the aggregate update payload with
    // the soft-delete flag set. Omitting them only leaves them unchanged in DB.
    if (removedDetail?.id) {
      setDeletedDetails((prev) => {
        if (prev.some((item) => item.id === removedDetail.id)) return prev;
        return [...prev, { ...removedDetail, isDeleted: true }];
      });
    }

    setDetails((prev) => prev.filter((_, i) => i !== idx));

    if (editingIndex === idx || (detail.id && removedDetail?.id === detail.id)) {
      setDetail(emptyDetail);
      setEditingIndex(null);
      setFieldErrors({});
      setError("");
    } else if (editingIndex !== null && editingIndex > idx) {
      setEditingIndex((prev) => prev - 1);
    }
  };

  const handleCreate = async () => {
    const errors = {};
    if (!date) errors.date = requiredMessage(localize("Date") || localize("Datetime"));
    // "Select An Option" (0) counts as empty, like the backend EnumRequired rule.
    if (attendanceValue === "" || Number(attendanceValue) === 0) {
      errors.attendanceStatus = requiredMessage(localize("AttendanceStatus"));
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(prev => ({ ...prev, ...errors }));
      setError(localize("ValidationErrorMessage"));
      return;
    }

    // Apply a row currently being edited even if the user goes directly to the
    // main save button instead of clicking "Update Record" first.
    let finalDetails = details;
    if (editingIndex !== null) {
      if (!validateDetail()) {
        setError(localize("ValidationErrorMessage"));
        return;
      }

      const updatedDetail = {
        ...detail,
        _taskCategoryName: nameOf(taskCategories, detail.taskCategoryId),
        _subTaskCategoryName: nameOf(subTaskCategories, detail.subTaskCategoryId),
        _projectName: nameOf(projects, detail.projectId),
        _statusName: nameOf(statuses, detail.statusId),
      };
      finalDetails = [...details];
      finalDetails[editingIndex] = updatedDetail;
    } else if (details.length === 0 && !jobsheet?.id) {
      // A new jobsheet still requires its first detail. During an update an
      // empty array is intentional and allows the last existing row to delete.
      if (!validateDetail()) {
        setError(localize("ValidationErrorMessage"));
        return;
      }
      const enrichedDetail = {
        ...detail,
        _taskCategoryName: nameOf(taskCategories, detail.taskCategoryId),
        _subTaskCategoryName: nameOf(subTaskCategories, detail.subTaskCategoryId),
        _projectName: nameOf(projects, detail.projectId),
        _statusName: nameOf(statuses, detail.statusId),
      };
      finalDetails = [enrichedDetail];
    }

    setError("");
    setSubmitting(true);
    try {
      const detailsToSave = jobsheet?.id
        ? [...finalDetails, ...deletedDetails]
        : finalDetails;
      const payload = buildPayload(date, attendanceValue, detailsToSave, jobsheet);
      console.log("Submitting jobsheet payload:", JSON.stringify(payload, null, 2));

      const hasOverlap = finalDetails.length > 0
        ? await jobsheetsApi.hasOverlappingJobsheetDetails(buildOverlapPayload(finalDetails))
        : false;

      if (hasOverlap) {
        setError(timeOverlapMessage);
        return;
      }

      let result;
      if (jobsheet && jobsheet.id) {
        result = await jobsheetsApi.update(jobsheet.id, payload);
      } else {
        result = await jobsheetsApi.create(payload);
      }

      // Blazor shows "Operation is successfull" after saving.
      toast(localize("OperationSuccessfull"));

      // Support both onSave (JobsheetsPage) and onSubmit patterns
      if (onSave) onSave(result);
      if (onSubmit) onSubmit(result);
      resetForm();
      onClose();
    } catch (err) {
      console.error("Failed to save jobsheet:", err, err.response?.data);
      setError(getApiErrorMessage(err) || localize("DefaultErrorMessage"));
    } finally {
      setSubmitting(false);
    }
  };

  // Resolve display name from id for the table
  const nameOf = (list, id) => list.find((o) => o.id === id)?.name ?? "—";
  // Collaborator names joined like Blazor (Name, comma separated).
  const usersOf = (ids = []) =>
    ids.map((id) => {
      const u = users.find((u) => u.id === id);
      return u ? u.name || u.userName : id;
    }).join(",") || "—";

  // The API may send the attendance status as its enum name or its number.
  const attendanceValue =
    attendanceOptions.find(
      (option) => option.name === attendanceStatus || String(option.value) === String(attendanceStatus),
    )?.value ?? attendanceStatus;

  return (
    <div
      style={styles.overlay}
      onMouseDown={(e) => { if (e.target === e.currentTarget) e.stopPropagation(); }}
    >
      <div style={styles.modal} onMouseDown={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={styles.header}>
          <span style={styles.title}>
            {jobsheet && jobsheet.id ? localize("EditJobsheet") : localize("NewJobsheet")}
          </span>
          <button

            type="button"
            style={styles.closeBtn}
            onClick={handleCloseAttempt}
          >✕</button>
        </div>



        {fetchError && <div style={styles.warningBanner}>{fetchError}</div>}
        {error && <div style={styles.errorBanner}>{error}</div>}

        {/* Date + Attendance Status */}
        <div style={styles.row}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>{localize("Date")} <span style={styles.req}>*</span></label>
            <div style={styles.inputWrapper}>
              <Flatpickr
                // Exact text the picker shows (dd/mm/yyyy), so it is not reset on re-render.
                value={formatDisplayDate(date)}
                onChange={([d]) => handleDateChange(dateToLocalDateString(d))}
                disabled={viewOnly}
                options={{
                  // Shown and typed as dd/MM/yyyy like the backend; one input only.
                  dateFormat: "d/m/Y",
                  allowInput: true,
                  disableMobile: "true",
                  clickOpens: !viewOnly
                }}
                className="flatpickr-date-custom"
                style={{ ...styles.input, border: fieldErrors.date ? "1px solid #ff4d4f" : styles.input.border }}
                // Same date hint as the Blazor DatePicker.
                placeholder="DD/MM/YYYY"
              />
            </div>
            {fieldErrors.date && <span style={styles.errorText}>{fieldErrors.date}</span>}
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>{localize("AttendanceStatus")} <span style={styles.req}>*</span></label>
            <AppSelect
              style={{
                ...styles.input,
                ...styles.select,
                backgroundColor: attendanceStatus === "" && !viewOnly
                  ? (isDark ? "#422006" : "#fffbe6")
                  : styles.input.backgroundColor,
                color: attendanceStatus === "" ? (isDark ? "#94a3b8" : "#aaa") : styles.input.color,
                opacity: viewOnly ? 0.7 : 1,
                border: fieldErrors.attendanceStatus ? "1px solid #ff4d4f" : styles.input.border
              }}
              value={attendanceValue === "" ? 0 : attendanceValue}
              onChange={(e) => {
                setAttendanceStatus(e.target.value);
                setFieldErrors(prev => ({ ...prev, attendanceStatus: null }));
              }}
              disabled={viewOnly}
            >
              {attendanceOptions.map((o) => (
                <option key={o.name} value={o.value}>{o.label}</option>
              ))}
            </AppSelect>
            {fieldErrors.attendanceStatus && <span style={styles.errorText}>{fieldErrors.attendanceStatus}</span>}
          </div>
        </div>


        {/* Section label */}
        <div style={styles.sectionLabel}>{localize("JobsheetDetails")}</div>

        {/* Detail form - now ALWAYS visible, but disabled in View mode */}
        <div style={{ opacity: viewOnly ? 0.85 : 1 }}>
          <div style={styles.detailGrid}>

            <div>
              <label style={styles.label}>{localize("ProjectId")} <span style={styles.req}>*</span></label>
              <DynSelect
                name="projectId"
                value={detail.projectId}
                onChange={handleProjectChange}
                options={projects}
                loading={loadingOptions}
                placeholder={emptyOptionText}
                loadingText={loadingText}
                disabled={viewOnly}
                hasError={!!fieldErrors.projectId}
                styles={styles}
              />
              {fieldErrors.projectId && <span style={styles.errorText}>{fieldErrors.projectId}</span>}
            </div>

            <div>
              <label style={styles.label}>{localize("TaskCategoryId")} <span style={styles.req}>*</span></label>
              <DynSelect
                name="taskCategoryId"
                value={detail.taskCategoryId}
                onChange={handleTaskCategoryChange}
                options={filteredTaskCategories}
                loading={loadingOptions}
                placeholder={emptyOptionText}
                loadingText={loadingText}
                disabled={viewOnly || !detail.projectId}
                hasError={!!fieldErrors.taskCategoryId}
                styles={styles}
              />
              {fieldErrors.taskCategoryId && <span style={styles.errorText}>{fieldErrors.taskCategoryId}</span>}
            </div>

            {/* Sub Task Category - shown and required when the task category has sub categories (as in Blazor) */}
            {showSubTaskCategory && (
              <div>
                <label style={styles.label}>{localize("SubTaskCategoryId")} <span style={styles.req}>*</span></label>
                <DynSelect
                  name="subTaskCategoryId"
                  value={detail.subTaskCategoryId}
                  onChange={handleSubTaskCategoryChange}
                  options={subTaskCategories}
                  loading={loadingSubCats}
                  placeholder={emptyOptionText}
                  loadingText={loadingText}
                  disabled={viewOnly}
                  hasError={!!fieldErrors.subTaskCategoryId}
                  styles={styles}
                />
                {fieldErrors.subTaskCategoryId && <span style={styles.errorText}>{fieldErrors.subTaskCategoryId}</span>}
              </div>
            )}

            <div>
              <label style={styles.label}>{localize("StartTime")} <span style={styles.req}>*</span></label>
              <Flatpickr
                value={detail.startTimeDisplay}
                onChange={([selectedTime]) => {
                  setDetail((prev) => ({
                    ...prev,
                    startTimeDisplay: dateToTimeString(selectedTime),
                  }));
                  setFieldErrors(prev => ({ ...prev, startTimeDisplay: null }));
                }}
                disabled={viewOnly}
                options={{
                  enableTime: true,
                  noCalendar: true,
                  dateFormat: "H:i",
                  time_24hr: true,
                  allowInput: true,
                  disableMobile: true,
                  clickOpens: !viewOnly,
                }}
                style={{
                  ...styles.input,
                  border: (fieldErrors.startTimeDisplay || currentTimeOverlap) ? "1px solid #ff4d4f" : styles.input.border,
                }}
              />
              {fieldErrors.startTimeDisplay && <span style={styles.errorText}>{fieldErrors.startTimeDisplay}</span>}
            </div>

            <div>
              <label style={styles.label}>{localize("EndTime")} <span style={styles.req}>*</span></label>
              <Flatpickr
                value={detail.endTimeDisplay}
                onChange={([selectedTime]) => {
                  setDetail((prev) => ({
                    ...prev,
                    endTimeDisplay: dateToTimeString(selectedTime),
                  }));
                  setFieldErrors(prev => ({ ...prev, endTimeDisplay: null }));
                }}
                disabled={viewOnly}
                options={{
                  enableTime: true,
                  noCalendar: true,
                  dateFormat: "H:i",
                  time_24hr: true,
                  allowInput: true,
                  disableMobile: true,
                  clickOpens: !viewOnly,
                }}
                style={{
                  ...styles.input,
                  border: (fieldErrors.endTimeDisplay || currentTimeOverlap) ? "1px solid #ff4d4f" : styles.input.border,
                }}
              />
              {(fieldErrors.endTimeDisplay || currentTimeOverlap) && (
                <span style={styles.errorText}>
                  {fieldErrors.endTimeDisplay || timeOverlapMessage}
                </span>
              )}
            </div>

            <div>
              <label style={styles.label}>{localize("StatusId")} <span style={styles.req}>*</span></label>
              <DynSelect
                name="statusId"
                value={detail.statusId}
                onChange={(e) => {
                  handleDetailChange(e);
                  setFieldErrors(prev => ({ ...prev, statusId: null }));
                }}
                options={statuses}
                loading={loadingOptions}
                placeholder={emptyOptionText}
                loadingText={loadingText}
                disabled={viewOnly}
                hasError={!!fieldErrors.statusId}
                styles={styles}
              />
              {fieldErrors.statusId && <span style={styles.errorText}>{fieldErrors.statusId}</span>}
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={styles.label}>
                {localize("Collaborators")}
                {detail.isCollaboratorsRequired && <span style={styles.req}> *</span>}
              </label>
              <CollaboratorPicker
                users={users}
                selected={detail.jobsheetDetailUserIds}
                onChange={(ids) => {
                  handleCollaboratorsChange(ids);
                  setFieldErrors(prev => ({ ...prev, jobsheetDetailUserIds: null }));
                }}
                loading={loadingOptions}
                placeholder={emptyOptionText}
                loadingText={loadingText}
                disabled={viewOnly}
                fieldErrors={fieldErrors}
                styles={styles}
              />
              {fieldErrors.jobsheetDetailUserIds && <span style={styles.errorText}>{fieldErrors.jobsheetDetailUserIds}</span>}
            </div>
          </div>

          {/* Remarks */}
          <div style={{ marginBottom: 12 }}>
            <label style={styles.label}>{remarksLabel} <span style={styles.req}>*</span></label>
            <textarea
              name="remarks"
              style={{ ...styles.textarea, border: fieldErrors.remarks ? "1px solid #ff4d4f" : styles.textarea.border }}
              value={detail.remarks}
              onChange={(e) => {
                handleDetailChange(e);
                setFieldErrors(prev => ({ ...prev, remarks: null }));
              }}
              disabled={viewOnly}
            />
            {fieldErrors.remarks && <span style={styles.errorText}>{fieldErrors.remarks}</span>}
          </div>


          {/* Add detail row */}
          {!viewOnly && (
            <div style={styles.actionRow}>
              <button
                type="button"
                style={styles.cancelBtn}
                onClick={handleDetailCancel}
              >
                {localize("CancelButtonText")}
              </button>
              <button
                style={{
                  ...styles.createBtn,
                  opacity: currentTimeOverlap ? 0.5 : 1,
                  cursor: currentTimeOverlap ? "not-allowed" : "pointer"
                }}
                onClick={handleAddDetail}
                disabled={currentTimeOverlap}
                title={currentTimeOverlap ? timeOverlapMessage : ""}
              >
                {editingIndex !== null ? localize("UpdateButtonText") : localize("CreateButtonText")}
              </button>
            </div>
          )}
        </div>




        {/* Detail table */}
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                {[
                  localize("TaskCategoryName"),
                  localize("SubTaskCategoryName"),
                  localize("ProjectName"),
                  localize("StartTime"),
                  localize("EndTime"),
                  localize("Collaborators"),
                  localize("StatusName"),
                  localize("CMSNextTicketNo"),
                  remarksLabel,
                  localize("Actions"),
                ].map((h, i) => (
                  <th key={i} style={styles.th}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {details.length === 0 ? (
                <tr>
                  <td colSpan={10} style={styles.emptyCell}>{localize("NoDataAvailableInDatatable")}</td>
                </tr>
              ) : (
                details.map((d, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={styles.td}>{d._taskCategoryName || nameOf(taskCategories, d.taskCategoryId)}</td>
                    <td style={styles.td}>{d._subTaskCategoryName || nameOf(subTaskCategories, d.subTaskCategoryId)}</td>
                    <td style={styles.td}>{d._projectName || nameOf(projects, d.projectId)}</td>
                    <td style={styles.td}>{d.startTimeDisplay}</td>
                    <td style={styles.td}>{d.endTimeDisplay}</td>
                    <td style={styles.td}>{usersOf(d.jobsheetDetailUserIds)}</td>
                    <td style={styles.td}>{d._statusName || nameOf(statuses, d.statusId)}</td>
                    <td style={styles.td}>{d.cmsNextTicketNo || "—"}</td>
                    <td style={styles.td}>{d.remarks}</td>
                    <td style={styles.td}>
                      {!viewOnly && !d.amsTicketDetailId && (
                        <ActionsMenu
                          actionButtonText={localize("Actions")}
                          editButtonText={localize("EditButtonText")}
                          deleteButtonText={localize("DeleteButtonText")}
                          onEdit={() => handleEditDetail(i)}
                          onDelete={() => handleDeleteRequest(i)}
                        />
                      )}
                    </td>

                  </tr>
                ))

              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!viewOnly && (
          <div style={styles.footer}>
            <button style={styles.cancelBtn} onClick={handleCloseAttempt} disabled={submitting}>
              {localize("CancelButtonText")}
            </button>
            <button
              style={{ ...styles.createBtn, opacity: submitting ? 0.7 : 1 }}
              onClick={handleCreate}
              disabled={submitting}
            >
              {submitting
                ? localize("ProcessingWithThreeDot")
                : (jobsheet && jobsheet.id ? localize("UpdateButtonText") : localize("CreateButtonText"))}
            </button>
          </div>
        )}



      </div>

      {/* Warning Overlay - Sibling to modal for full coverage */}
      {confirmation && (
        <div style={styles.confirmOverlay}>
          <div style={styles.confirmCard}>
            <div style={{ color: "#ec4899", marginBottom: 16 }}>
              <AlertCircle size={48} strokeWidth={1.5} />
            </div>
            <h3 style={styles.confirmTitle}>
              {confirmation.message}
            </h3>
            <div style={{ display: "flex", gap: 12, width: "100%" }}>
              {confirmation.type === "EXIT" ? (
                <>
                  <button
                    style={{ ...styles.cancelBtn, flex: 1, padding: "12px" }}
                    onClick={() => setConfirmation(null)}
                  >
                    {confirmation.cancelLabel}
                  </button>
                  <button
                    style={{ ...styles.createBtn, flex: 1, padding: "12px", background: "#ec4899" }}
                    onClick={() => {
                      resetForm(); // clear all form state immediately, don't wait for next open
                      onClose(); // Instant Exit
                    }}
                  >
                    {confirmation.confirmLabel}
                  </button>
                </>
              ) : (
                <>
                  <button
                    style={{ ...styles.cancelBtn, flex: 1, padding: "12px" }}
                    onClick={() => setConfirmation(null)}
                  >
                    {confirmation.cancelLabel}
                  </button>
                  <button
                    style={{ ...styles.exitBtn, flex: 1, padding: "12px" }}
                    onClick={() => {
                      if (confirmation.type === "DELETE") {
                        handleRemoveDetail(confirmation.index);
                        setConfirmation(null);
                        return;
                      }
                      setDetail(emptyDetail);
                      setEditingIndex(null);
                      setFieldErrors({});
                      setError("");
                      setConfirmation(null);
                    }}
                  >
                    {confirmation.confirmLabel}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
function getStyles(isDark) {
  const bg = isDark ? "#161920" : "#fff";
  const bgSecondary = isDark ? "#1e293b" : "#f8fafc";
  const border = isDark ? "#334155" : "#e2e8f0";
  const text = isDark ? "#f1f5f9" : "#111";
  const textMuted = isDark ? "#94a3b8" : "#555";
  const textSubtle = isDark ? "#64748b" : "#888";
  const inputBg = isDark ? "#1e293b" : "#f8fafc";
  const inputColor = isDark ? "#e2e8f0" : "#1e293b";
  const sectionBorder = isDark ? "#1e293b" : "#f1f5f9";
  const tableTh = isDark ? "#0f172a" : "#fafafa";
  const tableBorder = isDark ? "#1e293b" : "#eee";
  const dropdownBg = isDark ? "#1e293b" : "#fff";
  const dropdownBorder = isDark ? "#334155" : "#d9d9d9";
  const confirmBg = isDark ? "#1e293b" : "#fff";
  return {
    overlay: {
      position: "fixed", inset: 0,
      backgroundColor: "rgba(0,0,0,0.65)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, fontFamily: "'Segoe UI', sans-serif",
    },
    modal: {
      backgroundColor: bg, borderRadius: 12,
      width: "min(96vw, 1200px)",
      height: "min(96vh, 1200px)",
      // Smaller padding on phones, full padding on wide screens.
      overflowY: "auto", padding: "clamp(16px, 4vw, 32px) clamp(14px, 4vw, 36px)",
      boxShadow: isDark ? "0 12px 60px rgba(0,0,0,0.6)" : "0 12px 60px rgba(0,0,0,0.22)",
      display: "flex", flexDirection: "column",
    },
    header: {
      display: "flex", justifyContent: "space-between",
      alignItems: "center", marginBottom: 28,
    },
    title: { fontSize: 20, fontWeight: 700, color: text },
    closeBtn: { background: "none", border: "none", fontSize: 22, cursor: "pointer", color: isDark ? "#64748b" : "#bbb" },
    errorBanner: {
      backgroundColor: isDark ? "#450a0a" : "#fff2f0", border: `1px solid ${isDark ? "#7f1d1d" : "#ffccc7"}`,
      borderRadius: 8, padding: "10px 16px",
      color: isDark ? "#fca5a5" : "#cf1322", fontSize: 13, marginBottom: 18,
    },
    warningBanner: {
      backgroundColor: isDark ? "#422006" : "#fffbe6", border: `1px solid ${isDark ? "#92400e" : "#ffe58f"}`,
      borderRadius: 8, padding: "10px 16px",
      color: isDark ? "#fcd34d" : "#ad6800", fontSize: 13, marginBottom: 18,
    },
    existingJobsheetCard: {
      display: "flex", alignItems: "center", gap: 10,
      backgroundColor: isDark ? "#422006" : "#fff7ed",
      border: `1px solid ${isDark ? "#92400e" : "#fdba74"}`,
      borderRadius: 8, padding: "12px 16px",
      color: isDark ? "#fcd34d" : "#9a3412",
      fontSize: 13, fontWeight: 600, marginBottom: 18,
    },
    row: { display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 },
    fieldGroup: { flex: "1 1 220px", minWidth: 0 },
    label: { fontSize: 12.5, fontWeight: 600, color: textMuted, display: "block", marginBottom: 5 },
    req: { color: "#e74c3c" },
    inputWrapper: { display: "flex", alignItems: "center" },
    timeInputWrapper: { display: "block", width: "100%" },
    input: {
      width: "100%", border: `1px solid ${border}`, borderRadius: 8,
      padding: "8px 12px", fontSize: 13, outline: "none",
      color: inputColor, boxSizing: "border-box", backgroundColor: inputBg,
      transition: "all 0.2s ease",
    },
    select: {
      appearance: "none", cursor: "pointer",
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
      backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center", paddingRight: 32,
    },
    sectionLabel: {
      fontSize: 15, fontWeight: 700, color: text,
      marginBottom: 16, paddingBottom: 8, borderBottom: `1px solid ${sectionBorder}`,
    },
    detailGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(min(220px, 100%), 1fr))",
      gap: 16, marginBottom: 12,
    },
    pill: {
      display: "inline-flex", alignItems: "center", gap: 6,
      backgroundColor: isDark ? "rgba(236,72,153,0.15)" : "#fdf2f8", color: "#ec4899",
      borderRadius: 20, padding: "4px 12px", fontSize: 12,
      border: isDark ? "1px solid rgba(236,72,153,0.3)" : "1px solid #fbcfe8", fontWeight: 500,
    },
    pillRemove: {
      background: "none", border: "none", cursor: "pointer",
      color: "#ec4899", fontSize: 14, padding: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
    },
    dropdown: {
      position: "absolute", zIndex: 10,
      backgroundColor: dropdownBg, border: `1px solid ${dropdownBorder}`,
      borderRadius: 12,
      boxShadow: isDark
        ? "0 20px 25px -5px rgba(0,0,0,0.38), 0 8px 10px -6px rgba(0,0,0,0.3)"
        : "0 20px 25px -5px rgba(15,23,42,0.12), 0 8px 10px -6px rgba(15,23,42,0.08)",
      maxHeight: 240, overflowY: "auto", width: "100%", padding: 6,
    },
    dropdownItem: {
      padding: "9px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: inputColor,
      borderRadius: 8, margin: "2px 0",
    },
    textarea: {
      width: "100%", minHeight: 80, border: `1px solid ${border}`,
      borderRadius: 6, padding: "8px 10px", fontSize: 13,
      outline: "none", color: inputColor, backgroundColor: inputBg,
      resize: "vertical", boxSizing: "border-box",
    },
    actionRow: { display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 16 },
    cancelBtn: {
      padding: "7px 18px", borderRadius: 6,
      border: `1px solid ${border}`, backgroundColor: inputBg,
      fontSize: 13, cursor: "pointer", color: inputColor,
    },
    createBtn: {
      padding: "7px 18px", borderRadius: 6, border: "none",
      backgroundColor: "#ec4899", fontSize: 13, cursor: "pointer",
      color: "#fff", fontWeight: 600,
    },
    tableWrapper: {
      overflowX: "auto", overflowY: "auto", marginBottom: 16,
      border: `1px solid ${tableBorder}`, borderRadius: 6,
      flex: 1, minHeight: 250,
    },
    table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
    th: {
      padding: "8px 10px", textAlign: "left", backgroundColor: tableTh,
      color: textSubtle, fontWeight: 600, fontSize: 11,
      borderBottom: `1px solid ${tableBorder}`, whiteSpace: "nowrap",
      position: "sticky", top: 0, zIndex: 10,
    },
    td: { padding: "8px 10px", color: isDark ? "#cbd5e1" : "#444", whiteSpace: "nowrap" },
    emptyCell: { textAlign: "center", padding: "24px", color: textSubtle, fontSize: 13 },
    errorText: {
      color: "#ff4d4f", fontSize: 11, marginTop: 4, display: "block"
    },
    footer: {
      display: "flex", justifyContent: "flex-end", gap: 8,
      borderTop: `1px solid ${tableBorder}`, paddingTop: 16,
    },
    confirmOverlay: {
      position: "fixed", inset: 0,
      backgroundColor: "rgba(15, 23, 42, 0.6)",
      backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 2000,
    },
    confirmCard: {
      backgroundColor: confirmBg, borderRadius: 16,
      width: "min(400px, 92vw)", padding: "clamp(20px, 5vw, 32px)",
      display: "flex", flexDirection: "column", alignItems: "center",
      boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
      border: `1px solid ${border}`,
    },
    confirmTitle: {
      fontSize: 18, fontWeight: 700,
      color: isDark ? "#f8fafc" : "#1e293b",
      marginBottom: 8, textAlign: "center",
    },
    confirmMessage: {
      fontSize: 14,
      color: isDark ? "#cbd5e1" : "#64748b",
      marginBottom: 24, textAlign: "center",
    },
    exitBtn: {
      backgroundColor: "#fee2e2", color: "#ef4444", border: "1px solid #fecaca",
      borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
      transition: "all 0.2s ease",
    },
    _isDark: isDark
  };
}
