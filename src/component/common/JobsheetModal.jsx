import { useState, useEffect, useMemo } from "react";
import { Check, AlertCircle, X } from "lucide-react";
import { jobsheetsApi } from "../../services/api/jobsheets";

import { usersApi } from "../../services/api/users";
import { codesApi } from "../../services/api/Code";
import codeDetailsApi from "../../services/api/CodeDetails";
import { taskCategoryProjectsApi } from "../../services/api/taskCategoryProjects";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";
import "flatpickr/dist/themes/dark.css";




// ─── Attendance enum (fixed by API contract) ──────────────────────
const ATTENDANCE_OPTIONS = [
  { label: "Select An Option", value: 0 },
  { label: "Present", value: 1 },
  { label: "Emergency Leave", value: 2 },
  { label: "Medical Certificate", value: 3 },
  { label: "Annual Leave", value: 4 },
  { label: "Unpaid Leave", value: 5 },
];

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
};

// ─── Helpers ──────────────────────────────────────────────────────
// HH:mm → 100-nanosecond ticks (TimeSpan format expected by API)
function timeToTicks(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (h * 3600 + m * 60) * 10_000_000;
}

function buildPayload(date, attendanceStatus, details) {
  return {
    date: date ? new Date(date).toISOString() : null,
    attendanceStatus: Number(attendanceStatus),
    jobsheetDetails: details.map((d) => ({
      taskCategoryId: d.taskCategoryId || null,
      subTaskCategoryId: d.subTaskCategoryId || null,
      projectId: d.projectId || null,
      startTime: { ticks: timeToTicks(d.startTimeDisplay) },
      endTime: { ticks: timeToTicks(d.endTimeDisplay) },
      statusId: d.statusId || null,
      remarks: d.remarks,
      amsTicketDetailId: d.amsTicketDetailId || null,
      jobsheetDetailUserIds: d.jobsheetDetailUserIds,
    })),
  };
}

// Fetch codeDetails by lookupCode — same pattern as JobsheetsPage
async function fetchLookupByCode(code) {
  const allLookups = await codesApi.getAll();
  const lookup = allLookups.find((l) => l.lookupCode === code);
  if (!lookup) return [];
  const details = await codeDetailsApi.getAll({ lookupId: lookup.id });
  // only that things will show in modal if isActive- true
  return details
    .filter((d) => d.isActive !== false)
    .map((d) => ({ id: d.id, name: d.description || d.newCode }));
}


// ─── Reusable dynamic select ──────────────────────────────────────
function DynSelect({ name, value, onChange, options, loading, placeholder = "Choose An Option", disabled = false, hasError = false }) {
  return (
    <select
      name={name}
      value={value}
      onChange={onChange}
      disabled={loading || disabled}
      style={{
        ...styles.input,
        ...styles.select,
        color: value ? "#333" : "#aaa",
        opacity: disabled ? 0.7 : 1,
        border: hasError ? "1px solid #ff4d4f" : styles.input.border
      }}
    >

      <option value="">{loading ? "Loading…" : placeholder}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.name}</option>
      ))}
    </select>
  );
}

// ─── Collaborator pill picker ─────────────────────────────────────
function CollaboratorPicker({ users, selected, onChange, loading, disabled = false, fieldErrors = {} }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filtered = users.filter((u) => {
    const full = `${u.name || ""} ${u.surname || ""}`.toLowerCase();
    return full.includes(query.toLowerCase());
  });

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
          background: "#f8fafc",
          border: fieldErrors?.jobsheetDetailUserIds ? "1px solid #ff4d4f" : styles.input.border,
          position: "relative"
        }}
        onClick={() => !disabled && setIsOpen(true)}
      >
        {selectedUsers.map((u) => (
          <span key={u.id} style={{ ...styles.pill, margin: 0 }}>
            {u.name} {u.surname}
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
            color: "#1e293b",
            padding: "4px 0"
          }}
          placeholder={loading ? "Loading users…" : selected.length === 0 ? "Search users…" : ""}
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
                  background: isSel ? "#fdf2f8" : "#fff",
                  display: "flex", justifyContent: "space-between", alignItems: "center"
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  toggle(u.id);
                }}
              >
                <span>{u.name} {u.surname}</span>
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
  // ── Form state ──

  const [date, setDate] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState("");
  const [detail, setDetail] = useState(emptyDetail);
  const [details, setDetails] = useState([]);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [allowedCategoryIds, setAllowedCategoryIds] = useState(null); // Filtered by Project
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

  const handleCloseAttempt = () => {
    if (viewOnly) {
      onClose();
      return;
    }
    setConfirmation({
      type: "EXIT",
      message: "Are you sure to exit without saving data?",
      confirmLabel: "Yes",
      cancelLabel: "Cancel"
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
        const [proj, cats, stats, usrs] = await Promise.all([
          // Projects — same as JobsheetsPage
          fetchLookupByCode(LOOKUP_CODES.PROJECT),

          // Task Categories — via codesApi lookup
          fetchLookupByCode(LOOKUP_CODES.TASK_CATEGORY),

          // Statuses — via codesApi lookup
          fetchLookupByCode(LOOKUP_CODES.STATUS),

          // Users — same as CollaboratorPicker in JobsheetsPage (all users)
          usersApi.getUsersList().then((data) =>
            Array.isArray(data) ? data : data?.items || []
          ),
        ]);

        setProjects(proj);
        setTaskCategories(cats);
        setStatuses(stats);
        setUsers(usrs);
      } catch (err) {
        console.error("Failed to load lookup data:", err);
        setFetchError("Failed to load dropdown options. Please refresh and try again.");
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchAll();
  }, [open]);

  // ── Fetch allowed task categories when project changes ──
  useEffect(() => {
    // If we're entering a "New" jobsheet (no projectId or it changes)
    if (!detail.projectId) {
      setAllowedCategoryIds(null);
      return;
    }

    const fetchAllowed = async () => {
      try {
        const ids = await taskCategoryProjectsApi.getCategoryIdsByProjectId(detail.projectId);
        setAllowedCategoryIds(Array.isArray(ids) ? ids : []);
      } catch (err) {
        console.error("Failed to fetch allowed categories:", err);
        setAllowedCategoryIds([]); // fallback to empty if error
      }
    };

    fetchAllowed();

    // Clear the category when the project changes to avoid invalid state
    // We only reset if it's not the initial population from 'jobsheet'
    setDetail(prev => {
      if (prev.projectId === detail.projectId && prev.taskCategoryId) {
        // This is a bit tricky to distinguish initial vs manual change.
        // But usually if the parent project changes manually, child must reset.
      }
      return { ...prev, taskCategoryId: "", subTaskCategoryId: "" };
    });
  }, [detail.projectId]);

  // ── Compute filtered Task Categories ──
  const filteredTaskCategories = useMemo(() => {
    if (!detail.projectId || !allowedCategoryIds) return taskCategories;
    return taskCategories.filter(cat => allowedCategoryIds.includes(cat.id));
  }, [taskCategories, allowedCategoryIds, detail.projectId]);

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
      if (jobsheet) {
        // Populate for View mode
        setDate(jobsheet.date ? jobsheet.date.split("T")[0] : "");
        setAttendanceStatus(jobsheet.attendanceStatus ?? "");

        // Map details from API response
        const mappedDetails = (jobsheet.jobsheetDetails || []).map(d => ({
          ...d,
          startTimeDisplay: d.startTime ? d.startTime.substring(0, 5) : "",
          endTimeDisplay: d.endTime ? d.endTime.substring(0, 5) : "",
          // Ensure display names are available for the table
          _taskCategoryName: d.taskCategoryName,
          _subTaskCategoryName: d.subTaskCategoryName,
          _projectName: d.projectName,
          _statusName: d.statusName,
        }));
        setDetails(mappedDetails);
        // Load first detail into the entry form for visibility
        if (mappedDetails.length > 0) {
          setDetail(mappedDetails[0]);
        } else {
          setDetail(emptyDetail);
        }
      } else {

        // Clear for Create mode
        setDate("");
        setAttendanceStatus("");
        setDetail(emptyDetail);
        setDetails([]);
      }
      setError("");
      setFetchError("");
    }
  }, [open, jobsheet]);


  if (!open) return null;

  // ── Handlers ──
  const handleDetailChange = (e) => {
    const { name, value } = e.target;
    setDetail((prev) => ({ ...prev, [name]: value }));
  };

  const handleCollaboratorsChange = (ids) =>
    setDetail((prev) => ({ ...prev, jobsheetDetailUserIds: ids }));

  const validateDetail = () => {
    const errors = {};
    if (!detail.projectId) errors.projectId = "Project is required";
    if (!detail.taskCategoryId) errors.taskCategoryId = "Category is required";
    if (!detail.startTimeDisplay) errors.startTimeDisplay = "Start time is required";
    if (!detail.endTimeDisplay) errors.endTimeDisplay = "End time is required";
    if (!detail.statusId) errors.statusId = "Status is required";
    if (!detail.remarks?.trim()) errors.remarks = "Remarks are required";

    setFieldErrors(prev => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  };

  const handleDetailCancel = () => {
    if (viewOnly) return;
    setConfirmation({
      type: "DETAIL_CANCEL",
      message: "Are you sure you want to cancel?",
      confirmLabel: "Yes",
      cancelLabel: "No"
    });
  };

  const handleAddDetail = () => {
    if (!validateDetail()) {
      setError("Please fill all required jobsheet detail fields.");
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

    setDetails((prev) => [...prev, enrichedDetail]);
    setDetail(emptyDetail);
  };


  const handleRemoveDetail = (idx) =>
    setDetails((prev) => prev.filter((_, i) => i !== idx));

  const handleCreate = async () => {
    const errors = {};
    if (!date) errors.date = "Date is required";
    if (attendanceStatus === "") errors.attendanceStatus = "Choose one";

    if (Object.keys(errors).length > 0 || !validateDetail()) {
      setFieldErrors(prev => ({ ...prev, ...errors }));
      setError("Please fill in all required fields before creating.");
      return;
    }
    if (details.length === 0 && !validateDetail()) {
      setError("Add at least one jobsheet record.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const payload = buildPayload(date, attendanceStatus, details);
      const result = await jobsheetsApi.create(payload);

      // Support both onSave (JobsheetsPage) and onSubmit patterns
      if (onSave) onSave(result);
      if (onSubmit) onSubmit(result);
      onClose();
    } catch (err) {
      console.error("Failed to create jobsheet:", err);
      setError(
        err?.response?.data?.error?.message ||
        "Failed to create jobsheet. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Resolve display name from id for the table
  const nameOf = (list, id) => list.find((o) => o.id === id)?.name ?? "—";
  const usersOf = (ids) =>
    ids.map((id) => {
      const u = users.find((u) => u.id === id);
      return u ? `${u.name} ${u.surname}` : id;
    }).join(", ") || "—";

  return (
    <div
      style={styles.overlay}
      onMouseDown={(e) => { if (e.target === e.currentTarget) e.stopPropagation(); }}
    >
      <div style={styles.modal} onMouseDown={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={styles.header}>
          <span style={styles.title}>{viewOnly ? "Jobsheet Details" : "New Jobsheet"}</span>
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
            <label style={styles.label}>Date <span style={styles.req}>*</span></label>
            <div style={styles.inputWrapper}>
              <Flatpickr
                value={date}
                onChange={([d]) => setDate(d)}
                disabled={viewOnly}
                options={{
                  dateFormat: "Y-m-d",
                  allowInput: true,
                  disableMobile: "true",
                  clickOpens: !viewOnly
                }}
                className="flatpickr-input-custom"
                style={{ ...styles.input, border: fieldErrors.date ? "1px solid #ff4d4f" : styles.input.border }}
                placeholder="Select Date"
              />
            </div>
            {fieldErrors.date && <span style={styles.errorText}>{fieldErrors.date}</span>}
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Attendance Status <span style={styles.req}>*</span></label>
            <select
              style={{
                ...styles.input, ...styles.select,
                background: attendanceStatus === "" && !viewOnly ? "#fffbe6" : "#fff",
                opacity: viewOnly ? 0.7 : 1,
                border: fieldErrors.attendanceStatus ? "1px solid #ff4d4f" : styles.input.border
              }}
              value={attendanceStatus}
              onChange={(e) => {
                setAttendanceStatus(e.target.value);
                setFieldErrors(prev => ({ ...prev, attendanceStatus: null }));
              }}
              disabled={viewOnly}
            >

              {ATTENDANCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {fieldErrors.attendanceStatus && <span style={styles.errorText}>{fieldErrors.attendanceStatus}</span>}
          </div>
        </div>


        {/* Section label */}
        <div style={styles.sectionLabel}>{viewOnly ? "Jobsheet Records" : "Jobsheet Details"}</div>

        {/* Detail form - now ALWAYS visible, but disabled in View mode */}
        <div style={{ opacity: viewOnly ? 0.85 : 1 }}>
          <div style={styles.detailGrid}>

            <div>
              <label style={styles.label}>Project <span style={styles.req}>*</span></label>
              <DynSelect
                name="projectId"
                value={detail.projectId}
                onChange={(e) => {
                  handleDetailChange(e);
                  setFieldErrors(prev => ({ ...prev, projectId: null }));
                }}
                options={projects}
                loading={loadingOptions}
                disabled={viewOnly}
                hasError={!!fieldErrors.projectId}
              />
              {fieldErrors.projectId && <span style={styles.errorText}>{fieldErrors.projectId}</span>}
            </div>

            <div>
              <label style={styles.label}>Task Category <span style={styles.req}>*</span></label>
              <DynSelect
                name="taskCategoryId"
                value={detail.taskCategoryId}
                onChange={(e) => {
                  handleDetailChange(e);
                  setFieldErrors(prev => ({ ...prev, taskCategoryId: null, subTaskCategoryId: null }));
                }}
                options={filteredTaskCategories}
                loading={loadingOptions}
                disabled={viewOnly || !detail.projectId}
                hasError={!!fieldErrors.taskCategoryId}
              />
              {fieldErrors.taskCategoryId && <span style={styles.errorText}>{fieldErrors.taskCategoryId}</span>}
            </div>

            {/* Sub Task Category - only show if they exist for selection */}
            {subTaskCategories.length > 0 && (
              <div>
                <label style={styles.label}>Sub Task Category</label>
                <DynSelect
                  name="subTaskCategoryId"
                  value={detail.subTaskCategoryId}
                  onChange={(e) => {
                    handleDetailChange(e);
                    setFieldErrors(prev => ({ ...prev, subTaskCategoryId: null }));
                  }}
                  options={subTaskCategories}
                  loading={loadingSubCats}
                  placeholder={loadingSubCats ? "Fetching..." : "Choose Sub Category"}
                  disabled={viewOnly}
                />

              </div>
            )}

            <div>
              <label style={styles.label}>Start Time <span style={styles.req}>*</span></label>
              <div style={styles.inputWrapper}>
                <Flatpickr
                  value={detail.startTimeDisplay}
                  onChange={([d]) => {
                    const hh = d.getHours().toString().padStart(2, '0');
                    const mm = d.getMinutes().toString().padStart(2, '0');
                    handleDetailChange({ target: { name: 'startTimeDisplay', value: `${hh}:${mm}` } });
                  }}
                  options={{
                    enableTime: true,
                    noCalendar: true,
                    dateFormat: "H:i",
                    time_24hr: true,
                    disableMobile: "true",
                    clickOpens: !viewOnly
                  }}

                  className="flatpickr-input-custom"
                  style={{ ...styles.input, border: fieldErrors.startTimeDisplay ? "1px solid #ff4d4f" : styles.input.border }}
                  placeholder="Start"
                  disabled={viewOnly}
                />
                {fieldErrors.startTimeDisplay && <span style={styles.errorText}>{fieldErrors.startTimeDisplay}</span>}
              </div>
            </div>

            <div>
              <label style={styles.label}>End Time <span style={styles.req}>*</span></label>
              <div style={styles.inputWrapper}>
                <Flatpickr
                  value={detail.endTimeDisplay}
                  onChange={([d]) => {
                    const hh = d.getHours().toString().padStart(2, '0');
                    const mm = d.getMinutes().toString().padStart(2, '0');
                    handleDetailChange({ target: { name: 'endTimeDisplay', value: `${hh}:${mm}` } });
                    setFieldErrors(prev => ({ ...prev, endTimeDisplay: null }));
                  }}
                  options={{
                    enableTime: true,
                    noCalendar: true,
                    dateFormat: "H:i",
                    time_24hr: true,
                    disableMobile: "true",
                    clickOpens: !viewOnly
                  }}

                  className="flatpickr-input-custom"
                  style={{ ...styles.input, border: fieldErrors.endTimeDisplay ? "1px solid #ff4d4f" : styles.input.border }}
                  placeholder="End"
                  disabled={viewOnly}
                />
                {fieldErrors.endTimeDisplay && <span style={styles.errorText}>{fieldErrors.endTimeDisplay}</span>}
              </div>
            </div>

            <div>
              <label style={styles.label}>Status <span style={styles.req}>*</span></label>
              <DynSelect
                name="statusId"
                value={detail.statusId}
                onChange={(e) => {
                  handleDetailChange(e);
                  setFieldErrors(prev => ({ ...prev, statusId: null }));
                }}
                options={statuses}
                loading={loadingOptions}
                disabled={viewOnly}
                hasError={!!fieldErrors.statusId}
              />
              {fieldErrors.statusId && <span style={styles.errorText}>{fieldErrors.statusId}</span>}
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={styles.label}>Collaborators</label>
              <CollaboratorPicker
                users={users}
                selected={detail.jobsheetDetailUserIds}
                onChange={(ids) => {
                  handleCollaboratorsChange(ids);
                  setFieldErrors(prev => ({ ...prev, jobsheetDetailUserIds: null }));
                }}
                loading={loadingOptions}
                disabled={viewOnly}
                fieldErrors={fieldErrors}
              />
            </div>
          </div>

          {/* Remarks */}
          <div style={{ marginBottom: 12 }}>
            <label style={styles.label}>Remarks <span style={styles.req}>*</span></label>
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
                Cancel
              </button>
              <button style={styles.createBtn} onClick={handleAddDetail}>
                Create
              </button>
            </div>
          )}
        </div>




        {/* Detail table */}
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                {["Task Category", "Sub Task Category", "Project", "Start Time", "End Time", "Collaborators", "Status", "CMS Next Ticket No", "Remarks", ""].map((h, i) => (
                  <th key={i} style={styles.th}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {details.length === 0 ? (
                <tr>
                  <td colSpan={10} style={styles.emptyCell}>No records added yet</td>
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
                      {!viewOnly && (
                        <button style={styles.removeBtn} onClick={() => handleRemoveDetail(i)}>✕</button>
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
              Cancel
            </button>
            <button
              style={{ ...styles.createBtn, opacity: submitting ? 0.7 : 1 }}
              onClick={handleCreate}
              disabled={submitting}
            >
              {submitting ? "Creating…" : "Create"}
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
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 8, textAlign: "center" }}>
              {confirmation.message}
            </h3>
            <p style={{ fontSize: 14, color: "#64748b", marginBottom: 24, textAlign: "center" }}>
              {confirmation.type === "EXIT" ? "You have unsaved changes. Choose how you would like to proceed." : "Your current form entries will be cleared."}
            </p>
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
                      setConfirmation(null);
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
                      setDetail(emptyDetail);
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
const styles = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, fontFamily: "'Segoe UI', sans-serif",
  },
  modal: {
    background: "#fff", borderRadius: 12,
    width: "min(96vw, 1200px)",
    height: "min(96vh, 1200px)", // Increased height
    overflowY: "auto", padding: "32px 36px", // More spacious
    boxShadow: "0 12px 60px rgba(0,0,0,0.22)",
    display: "flex", flexDirection: "column",
  },

  header: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", marginBottom: 28, // Increased gap
  },
  title: { fontSize: 20, fontWeight: 6400, color: "#111" },
  closeBtn: { background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#bbb" },
  errorBanner: {
    background: "#fff2f0", border: "1px solid #ffccc7",
    borderRadius: 8, padding: "10px 16px",
    color: "#cf1322", fontSize: 13, marginBottom: 18,
  },
  warningBanner: {
    background: "#fffbe6", border: "1px solid #ffe58f",
    borderRadius: 8, padding: "10px 16px",
    color: "#ad6800", fontSize: 13, marginBottom: 18,
  },
  row: { display: "flex", gap: 16, marginBottom: 16 },
  fieldGroup: { flex: 1 },
  label: { fontSize: 12.5, fontWeight: 600, color: "#555", display: "block", marginBottom: 5 },
  req: { color: "#e74c3c" },
  inputWrapper: { display: "flex", alignItems: "center" },
  input: {
    width: "100%", border: "1px solid #e2e8f0", borderRadius: 8,
    padding: "8px 12px", fontSize: 13, outline: "none",
    color: "#1e293b", boxSizing: "border-box", background: "#f8fafc",
    transition: "all 0.2s ease",
  },
  select: {
    appearance: "none", cursor: "pointer",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center", paddingRight: 32,
  },
  sectionLabel: {
    fontSize: 15, fontWeight: 700, color: "#1e293b",
    marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid #f1f5f9",
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 16, marginBottom: 12,
  },

  pill: {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: "#fdf2f8", color: "#ec4899",
    borderRadius: 20, padding: "4px 12px", fontSize: 12,
    border: "1px solid #fbcfe8", fontWeight: 500,
  },
  pillRemove: {
    background: "none", border: "none", cursor: "pointer",
    color: "#ec4899", fontSize: 14, padding: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  dropdown: {
    position: "absolute", zIndex: 10,
    background: "#fff", border: "1px solid #d9d9d9",
    borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    maxHeight: 200, overflowY: "auto", width: "100%",
  },
  dropdownItem: {
    padding: "8px 12px", fontSize: 13, cursor: "pointer", color: "#333",
    borderBottom: "1px solid #f5f5f5",
  },
  textarea: {
    width: "100%", minHeight: 80, border: "1px solid #d9d9d9",
    borderRadius: 6, padding: "8px 10px", fontSize: 13,
    outline: "none", color: "#333", background: "#fffff0",
    resize: "vertical", boxSizing: "border-box",
  },
  actionRow: { display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 16 },
  cancelBtn: {
    padding: "7px 18px", borderRadius: 6,
    border: "1px solid #d9d9d9", background: "#fff",
    fontSize: 13, cursor: "pointer", color: "#444",
  },
  createBtn: {
    padding: "7px 18px", borderRadius: 6, border: "none",
    background: "#3b5bdb", fontSize: 13, cursor: "pointer",
    color: "#fff", fontWeight: 600,
  },
  tableWrapper: {
    overflowX: "auto", marginBottom: 16,
    border: "1px solid #f0f0f0", borderRadius: 6,
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: {
    padding: "8px 10px", textAlign: "left", background: "#fafafa",
    color: "#888", fontWeight: 600, fontSize: 11,
    borderBottom: "1px solid #eee", whiteSpace: "nowrap",
  },
  td: { padding: "8px 10px", color: "#444", whiteSpace: "nowrap" },
  emptyCell: { textAlign: "center", padding: "24px", color: "#aaa", fontSize: 13 },
  removeBtn: {
    background: "none", border: "none", color: "#e74c3c",
    cursor: "pointer", fontSize: 13, fontWeight: 700,
  },
  errorText: {
    color: "#ff4d4f", fontSize: 11, marginTop: 4, display: "block"
  },
  footer: {
    display: "flex", justifyContent: "flex-end", gap: 8,
    borderTop: "1px solid #f0f0f0", paddingTop: 16,
  },
  confirmOverlay: {
    position: "fixed", inset: 0,
    background: "rgba(15, 23, 42, 0.6)",
    backdropFilter: "blur(4px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 2000,
  },
  confirmCard: {
    background: "#fff", borderRadius: 16,
    width: "400px", padding: "32px",
    display: "flex", flexDirection: "column", alignItems: "center",
    boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
  },
  exitBtn: {
    background: "#fee2e2", color: "#ef4444", border: "1px solid #fecaca",
    borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
    transition: "all 0.2s ease",
  }
};