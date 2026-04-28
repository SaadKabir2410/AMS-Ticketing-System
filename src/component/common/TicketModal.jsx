import { useState, useEffect, useRef } from "react";
import { AlertCircle, X, Search, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PremiumErrorAlert from "./PremiumErrorAlert";
import SiteModal from "./SiteModal";
import ActivityModal from "./ActivityModal";
import { useToast } from "./ToastContext";
import { useAuth } from "../../context/AuthContextHook";
import { usersApi } from "../../services/api/users";
import { sitesApi } from "../../services/api/sites";
import { amsTicketApi } from "../../services/api/amsTicketApi";
import codeDetailsApi from "../../services/api/CodeDetails";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div className="space-y-1.5 flex flex-col group/field">
      {label && (
        <label className="text-[10px] uppercase font-bold tracking-widest text-black dark:text-slate-400 mb-0.5 group-focus-within/field:text-pink-600 transition-colors flex items-center gap-2">
          {label.includes("*") ? (
            <>
              {label.split("*")[0]}
              <span className="text-rose-500">*</span>
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

// ─── Combobox — supports both plain strings and { label, value } objects ──────
function Combobox({
  value,
  onChange,
  options = [],
  placeholder,
  disabled,
  error,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Normalise every option to { label, value }
  const normalised = options.map((o) =>
    o !== null && typeof o === "object" ? o : { label: String(o), value: o },
  );

  const filtered = normalised.filter((o) =>
    String(o.label).toLowerCase().includes(search.toLowerCase()),
  );

  // Find display label for current value
  const displayLabel = (() => {
    if (value === "" || value === null || value === undefined) return null;
    const match = normalised.find(
      (o) => o.value === value || o.value === Number(value),
    );
    return match ? match.label : String(value);
  })();

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`${inputClass} flex items-center justify-between cursor-pointer ${
          disabled
            ? "opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/30"
            : ""
        } ${error ? "border-rose-500" : ""}`}
      >
        <span
          className={`truncate ${!displayLabel ? "text-slate-400" : "text-black dark:text-white"}`}
        >
          {displayLabel || placeholder}
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
                  autoFocus
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
                />
              </div>
            </div>
            <div className="overflow-y-auto no-scrollbar flex-1">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  No results found
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filtered.map((opt) => {
                    const isSelected =
                      value === opt.value ||
                      value === String(opt.value) ||
                      Number(value) === opt.value;
                    return (
                      <button
                        key={String(opt.value)}
                        onClick={() => {
                          onChange(opt.value);
                          setOpen(false);
                          setSearch("");
                        }}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-pink-50 dark:bg-pink-500/10 text-pink-600 font-bold"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-black dark:hover:text-white"
                        }`}
                      >
                        <span className="truncate">{String(opt.label)}</span>
                        {isSelected && <Check size={14} />}
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

// ─── Mappers ──────────────────────────────────────────────────────────────────

/**
 * API response → form state
 * Single source of truth for all field name translations.
 */
function mapApiToForm(data) {
  return {
    // Hidden IDs (needed to build the save payload)
    _id: data.id ?? null,
    _siteId: data.siteId ?? null,
    _customerUserId: data.customerUserId ?? null,
    _ticketAssignedToId: data.ticketAssignedToId ?? null,
    _ticketForwardedById: data.ticketForwardedById ?? null,
    _cmsTicketAddedById: data.cmsTicketAddedById ?? null,
    _cmsTicketClosedById: data.cmsTicketClosedById ?? null,
    _ticketResolutionVerifiedById: data.ticketResolutionVerifiedById ?? null,
    _concurrencyStamp: data.concurrencyStamp ?? null,

    // ── Ticket tab ──────────────────────────────────────────────────────────
    pdfFile: null,
    // ticketReceivedDate → receivedAt
    receivedAt: data.ticketReceivedDate
      ? data.ticketReceivedDate.slice(0, 16)
      : "",
    cmsNextTicketNo: data.cmsNextTicketNo ?? "",
    siteName: data.siteName ?? "",
    // customerUserId resolved to name separately; stored in _customerName
    customer: data._customerName ?? "",
    // ticketAssignedToName → ticketAssignedTo
    ticketAssignedTo: data.ticketAssignedToName ?? "",
    // ticketType is numeric from API
    ticketType: data.ticketType ?? "",
    // ticketIncomingChannel is numeric from API
    ticketIncomingChannel: data.ticketIncomingChannel ?? "",
    // isTicketForwarded is a real boolean in API
    isTicketForwarded: !!data.isTicketForwarded,
    // ticketForwardedById resolved to name
    ticketForwardedBy: data._ticketForwardedByName ?? "",
    // cmsTicketAddedById resolved to name
    cmsTicketAddedBy: data._cmsTicketAddedByName ?? "",
    cmsTicketAddedOn: data.cmsTicketAddedOn
      ? data.cmsTicketAddedOn.slice(0, 16)
      : "",
    issueDescription: data.issueDescription ?? "",
    possibleRootCause: data.possibleRootCause ?? "",
    // ticketNotes → notes
    notes: data.ticketNotes ?? "",
    // activityTotalDuration → totalDuration
    totalDuration:
      data.activityTotalDuration != null
        ? String(data.activityTotalDuration)
        : "",
    // isPRE → pre
    pre: !!data.isPRE,
    servicePlannedType: data.servicePlannedType ?? "",

    // ── Ticket Verification tab ─────────────────────────────────────────────
    ticketResolutionVerifiedBy: data._ticketResolutionVerifiedByName ?? "",
    ticketResolutionVerifiedOn: data.ticketResolutionVerifiedOn
      ? data.ticketResolutionVerifiedOn.slice(0, 16)
      : "",
    // ticketClosedByName → cmsTicketClosedBy
    cmsTicketClosedBy: data.ticketClosedByName ?? "",
    cmsTicketClosedOn: data.cmsTicketClosedOn
      ? data.cmsTicketClosedOn.slice(0, 16)
      : "",
    serviceClosedDate: data.serviceClosedDate
      ? data.serviceClosedDate.slice(0, 16)
      : "",

    // ── Activities tab ──────────────────────────────────────────────────────
    // amsTicketDetails → activities
    activities: (data.amsTicketDetails || []).map(mapActivityFromApi),
  };
}

/**
 * Single amsTicketDetail item → ActivityModal form object
 */
function mapActivityFromApi(detail) {
  const buildDateTime = (date, time) => {
    if (!date) return "";
    const d = date.slice(0, 10);
    const t = (time ?? "00:00:00").slice(0, 5);
    return `${d} ${t}`;
  };

  const startStr = buildDateTime(detail.startDate, detail.startTimeSpan);
  const endStr = buildDateTime(detail.endDate, detail.endTimeSpan);

  const durationHours = (() => {
    if (!startStr || !endStr) return "";
    const diff = (new Date(endStr) - new Date(startStr)) / 1000 / 3600;
    return diff > 0 ? String(Math.round(diff * 100) / 100) : "";
  })();

  return {
    _id: detail.id ?? null,
    _workDoneCodeId: detail.workDoneCodeId ?? null,
    _afterWorkingHoursReasonId: detail.afterWorkingHoursReasonId ?? null,
    _isActivityDuringWorkingHours: detail.isActivityDuringWorkingHours ?? true,
    _resolvedByUserId: detail.amsTicketDetailUsers?.[0]?.userId ?? null,

    // activityType is numeric from API
    activityType: detail.activityType ?? "",
    startDate: startStr,
    endDate: endStr,
    durationHours,
    // workDoneCodeAndDescription preferred; fall back to id string
    workDoneCode:
      detail.workDoneCodeAndDescription ?? detail.workDoneCodeId ?? "",
    _workDoneCodeIdRaw: detail.workDoneCodeId ?? null,
    likelyCause: !!detail.isLikelyCause,
    afterWorkingHoursReasonRemarks: detail.afterWorkingHoursReasonRemarks ?? "",
    resolvedBy:
      detail.amsTicketDetailUsers?.[0]?.identityUser?.name ??
      detail.amsTicketDetailUsers?.[0]?.identityUser?.userName ??
      "",
  };
}

/**
 * Form state → API payload for create / update
 */
function mapFormToApi(form, rawUsers, rawSites) {
  const findUser = (name) =>
    rawUsers.find((u) => (u.name || u.userName) === name);
  const findSite = (name) => rawSites.find((s) => (s.name || s.Name) === name);

  const site = findSite(form.siteName);
  const assignedUser = findUser(form.ticketAssignedTo);
  const forwardedUser = findUser(form.ticketForwardedBy);
  const addedByUser = findUser(form.cmsTicketAddedBy);
  const closedByUser = findUser(form.cmsTicketClosedBy);
  const verifiedUser = findUser(form.ticketResolutionVerifiedBy);

  const toISO = (str) => (str ? `${str}:00` : null);

  return {
    ...(form._concurrencyStamp && { concurrencyStamp: form._concurrencyStamp }),

    siteId: site?.id ?? form._siteId ?? null,
    ticketAssignedToId: assignedUser?.id ?? form._ticketAssignedToId ?? null,
    ticketReceivedDate: toISO(form.receivedAt),
    customerUserId: form._customerUserId ?? null,
    ticketIncomingChannel:
      form.ticketIncomingChannel !== ""
        ? Number(form.ticketIncomingChannel)
        : null,
    isTicketForwarded: !!form.isTicketForwarded,
    ticketForwardedById: form.isTicketForwarded
      ? (forwardedUser?.id ?? form._ticketForwardedById ?? null)
      : null,
    cmsNextTicketNo: form.cmsNextTicketNo || null,
    issueDescription: form.issueDescription || null,
    possibleRootCause: form.possibleRootCause || null,
    isPRE: !!form.pre,
    ticketType: form.ticketType !== "" ? Number(form.ticketType) : null,
    servicePlannedType:
      form.servicePlannedType !== "" ? Number(form.servicePlannedType) : null,
    ticketNotes: form.notes || null,
    cmsTicketAddedById: addedByUser?.id ?? form._cmsTicketAddedById ?? null,
    cmsTicketAddedOn: toISO(form.cmsTicketAddedOn),

    // Verification
    cmsTicketClosedById: closedByUser?.id ?? form._cmsTicketClosedById ?? null,
    cmsTicketClosedOn: toISO(form.cmsTicketClosedOn),
    ticketResolutionVerifiedById:
      verifiedUser?.id ?? form._ticketResolutionVerifiedById ?? null,
    ticketResolutionVerifiedOn: toISO(form.ticketResolutionVerifiedOn),
    serviceClosedDate: toISO(form.serviceClosedDate),

    // Activities
    amsTicketDetails: (form.activities || []).map((act) =>
      mapActivityToApi(act, rawUsers),
    ),
  };
}

/**
 * Activity form object → amsTicketDetail API shape
 */
function mapActivityToApi(act, rawUsers) {
  const resolvedUser = rawUsers.find(
    (u) => (u.name || u.userName) === act.resolvedBy,
  );
  const userId = resolvedUser?.id ?? act._resolvedByUserId ?? null;

  const parseDateTime = (str) => {
    if (!str) return { date: null, time: null };
    const [datePart, timePart] = str.includes("T")
      ? str.split("T")
      : str.split(" ");
    return { date: datePart ?? null, time: (timePart ?? "00:00").slice(0, 5) };
  };

  const start = parseDateTime(act.startDate);
  const end = parseDateTime(act.endDate);

  return {
    ...(act._id && { id: act._id }),
    activityType: act.activityType !== "" ? Number(act.activityType) : null,
    startDate: start.date ? `${start.date}T${start.time}:00` : null,
    startTimeSpan: start.time ? `${start.time}:00` : null,
    endDate: end.date ? `${end.date}T${end.time}:00` : null,
    endTimeSpan: end.time ? `${end.time}:00` : null,
    isLikelyCause: !!act.likelyCause,
    workDoneCodeId: act._workDoneCodeIdRaw ?? null,
    afterWorkingHoursReasonId: act._afterWorkingHoursReasonId ?? null,
    afterWorkingHoursReasonRemarks: act.afterWorkingHoursReasonRemarks || null,
    isActivityDuringWorkingHours: act._isActivityDuringWorkingHours ?? true,
    isActive: true,
    amsTicketDetailUsers: userId ? [{ userId }] : [],
  };
}

// ─── Blank form ───────────────────────────────────────────────────────────────
const EMPTY = {
  _id: null,
  _siteId: null,
  _customerUserId: null,
  _ticketAssignedToId: null,
  _ticketForwardedById: null,
  _cmsTicketAddedById: null,
  _cmsTicketClosedById: null,
  _ticketResolutionVerifiedById: null,
  _concurrencyStamp: null,

  pdfFile: null,
  receivedAt: "",
  cmsNextTicketNo: "",
  siteName: "",
  customer: "",
  ticketAssignedTo: "",
  ticketType: "",
  ticketIncomingChannel: "",
  isTicketForwarded: false,
  ticketForwardedBy: "",
  cmsTicketAddedBy: "",
  cmsTicketAddedOn: "",
  issueDescription: "",
  possibleRootCause: "",
  notes: "",
  totalDuration: "",
  pre: false,
  servicePlannedType: "",

  ticketResolutionVerifiedBy: "",
  ticketResolutionVerifiedOn: "",
  cmsTicketClosedBy: "",
  cmsTicketClosedOn: "",
  serviceClosedDate: "",

  activities: [],
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function TicketModal({
  open,
  onClose,
  onSave,
  onSubmit: onSubmitProp,
  ticket = null,
  submitting = false,
}) {
  const onSubmit = onSave || onSubmitProp;
  const isEdit = !!ticket;
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase().includes("admin");

  const [activeTab, setActiveTab] = useState("Ticket");
  const [form, setForm] = useState({ ...EMPTY });
  const [errors, setErrors] = useState({});

  const [loadingApis, setLoadingApis] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Raw lists kept so we can resolve IDs on submit
  const [rawUsers, setRawUsers] = useState([]);
  const [rawSites, setRawSites] = useState([]);

  // Dropdown options
  const [apiData, setApiData] = useState({
    siteNames: [], // string[]
    customers: [], // string[]
    assignees: [], // string[]
    ticketTypes: [], // { label, value }[]
    incomingChannels: [], // { label, value }[]
    servicePlannedTypes: [], // { label, value }[]
  });

  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityToEdit, setActivityToEdit] = useState(null);
  const [activityEditIndex, setActivityEditIndex] = useState(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showDateWarning, setShowDateWarning] = useState(false);

  // ── Open / close reset ────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setForm({ ...EMPTY });
      setErrors({});
      setActiveTab("Ticket");
      setShowExitConfirm(false);
      setShowDateWarning(false);
      return;
    }

    setErrors({});
    setActiveTab("Ticket");

    // Seed form immediately from prop so the UI isn't blank while we fetch
    if (ticket) {
      setForm(mapApiToForm(ticket));
    } else {
      setForm({ ...EMPTY });
    }

    setLoadingApis(true);

    Promise.all([
      sitesApi.getAll({ perPage: 1000 }).catch(() => ({ items: [] })),
      usersApi.getUsersList().catch(() => []),
      // Fetch all three lookup groups in one call
      codeDetailsApi
        .getListByLookupCodes({
          lookupCodes: [
            "TicketType",
            "TicketIncomingChannel",
            "ServicePlannedType",
          ],
        })
        .catch(() => ({})),
    ])
      .then(([sitesRes, usersRes, lookupsRes]) => {
        const fetchedSites = sitesRes?.items || [];
        const fetchedUsers = usersRes || [];

        setRawSites(fetchedSites);
        setRawUsers(fetchedUsers);

        // Build { label, value } pairs from lookup codes
        // The API returns items with `sequence` as the numeric enum value
        // and `description` as the human-readable label
        const buildEnumOptions = (key) =>
          (lookupsRes[key] || []).map((item) => ({
            label: item.description || item.newCode || String(item.sequence),
            value: item.sequence ?? item.value ?? item.newCode,
          }));

        setApiData((prev) => ({
          ...prev,
          siteNames: fetchedSites
            .map((s) => s.name || s.Name)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b)),
          assignees: fetchedUsers
            .map((u) => u.name || u.userName)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b)),
          ticketTypes: buildEnumOptions("TicketType"),
          incomingChannels: buildEnumOptions("TicketIncomingChannel"),
          servicePlannedTypes: buildEnumOptions("ServicePlannedType"),
        }));

        // Deep hydration from getById for edit mode
        if (ticket?.id) {
          return amsTicketApi
            .getById(ticket.id)
            .then((fullData) => {
              // Resolve ID → display name using the users we just fetched
              const nameById = (id) => {
                const u = fetchedUsers.find((u) => u.id === id);
                return u?.name || u?.userName || "";
              };

              const enriched = {
                ...fullData,
                _customerName: ticket._customerName ?? "",
                _ticketForwardedByName: nameById(fullData.ticketForwardedById),
                _cmsTicketAddedByName: nameById(fullData.cmsTicketAddedById),
                _ticketResolutionVerifiedByName: nameById(
                  fullData.ticketResolutionVerifiedById,
                ),
              };

              setForm(mapApiToForm(enriched));
            })
            .catch((err) => console.error("Failed to hydrate ticket:", err));
        }
      })
      .finally(() => setLoadingApis(false));
  }, [open, ticket]);

  // ── Fetch customers when site changes ─────────────────────────────────────
  useEffect(() => {
    if (!form.siteName) {
      setApiData((prev) => ({ ...prev, customers: [] }));
      return;
    }
    const site = rawSites.find(
      (s) => s.name === form.siteName || s.Name === form.siteName,
    );
    if (!site?.id) return;

    setLoadingCustomers(true);
    usersApi
      .getCustomerUsers(site.id)
      .then((res) => {
        const customers = (res?.items || res || [])
          .map((c) => c.name || c.userName)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
        setApiData((prev) => ({ ...prev, customers }));
      })
      .catch(() => setApiData((prev) => ({ ...prev, customers: [] })))
      .finally(() => setLoadingCustomers(false));
  }, [form.siteName, rawSites]);

  // ── Generic field setter ──────────────────────────────────────────────────
  const setField = (key) => (e) => {
    let val;
    if (e?.target?.type === "checkbox") val = e.target.checked;
    else if (e?.target?.type === "file") val = e.target.files[0];
    else if (e?.target) val = e.target.value;
    else val = e; // Combobox / Flatpickr direct value
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((errs) => ({ ...errs, [key]: "" }));
  };

  const handleToggleForwarded = (e) => {
    const checked = e.target.checked;
    setForm((f) => ({
      ...f,
      isTicketForwarded: checked,
      ticketForwardedBy: checked ? f.ticketForwardedBy : "",
    }));
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.receivedAt) e.receivedAt = "Required";
    if (!form.cmsNextTicketNo) e.cmsNextTicketNo = "Required";
    if (!form.siteName) e.siteName = "Required";
    if (!form.customer) e.customer = "Required";
    if (!form.ticketAssignedTo) e.ticketAssignedTo = "Required";
    if (form.ticketType === "") e.ticketType = "Required";
    if (form.ticketIncomingChannel === "") e.ticketIncomingChannel = "Required";
    if (!form.issueDescription) e.issueDescription = "Required";
    if (!form.notes) e.notes = "Required";
    if (!form.cmsTicketAddedOn) e.cmsTicketAddedOn = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) {
      // Auto-jump to first tab with an error
      const ticketFields = [
        "receivedAt",
        "cmsNextTicketNo",
        "siteName",
        "customer",
        "ticketAssignedTo",
        "ticketType",
        "ticketIncomingChannel",
        "issueDescription",
        "notes",
        "cmsTicketAddedOn",
      ];
      if (ticketFields.some((f) => errors[f])) setActiveTab("Ticket");
      return;
    }
    const payload = mapFormToApi(form, rawUsers, rawSites);
    onSubmit(payload, form._id);
  };

  if (!open) return null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 overflow-hidden">
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
              className="relative w-full max-w-6xl bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-auto max-h-[95vh] overflow-hidden"
            >
              {/* ── Header ── */}
              <div className="flex flex-col border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="flex items-center justify-between px-8 py-6">
                  <div>
                    <nav className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-0.5">
                      <span>AMS</span>
                      <span className="text-slate-300 dark:text-slate-700">
                        /
                      </span>
                      <span className="text-pink-600">Tickets</span>
                    </nav>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                      {isEdit ? "Update Ticket" : "New AMS Ticket"}
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowExitConfirm(true)}
                    className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all border border-slate-200 dark:border-slate-700"
                  >
                    <X size={20} strokeWidth={2} />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex px-8 gap-10">
                  {["Ticket", "Activities", "Ticket Verification"].map(
                    (tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`relative py-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${
                          activeTab === tab
                            ? "text-pink-600"
                            : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                        }`}
                      >
                        {tab}
                        {activeTab === tab && (
                          <motion.div
                            layoutId="activeTab"
                            className="absolute bottom-0 left-0 right-0 h-1 bg-pink-600 rounded-t-full"
                          />
                        )}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* ── Body ── */}
              <div className="overflow-y-auto no-scrollbar px-8 py-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="max-w-5xl mx-auto"
                  >
                    {errors.server && (
                      <PremiumErrorAlert
                        open={!!errors.server}
                        message={errors.server}
                        onClose={() =>
                          setErrors((p) => ({ ...p, server: null }))
                        }
                      />
                    )}

                    {/* ══ TICKET TAB ══ */}
                    {activeTab === "Ticket" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {/* Upload PDF */}
                        <div className="md:col-span-2">
                          <Field label="Upload PDF" error={errors.pdfFile}>
                            <div className="relative group/file">
                              <input
                                type="file"
                                accept=".pdf"
                                onChange={setField("pdfFile")}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              />
                              <div className="w-full p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 flex flex-col items-center justify-center gap-2 transition-all group-hover/file:border-pink-500/50">
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                  {form.pdfFile
                                    ? form.pdfFile.name
                                    : "Select PDF Document"}
                                </p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                                  {form.pdfFile
                                    ? `${(form.pdfFile.size / 1024 / 1024).toFixed(2)} MB`
                                    : "PDF format only (Max 10MB)"}
                                </p>
                              </div>
                            </div>
                          </Field>
                        </div>

                        {/* Ticket Received Date Time */}
                        <Field
                          label="Ticket Received Date Time *"
                          error={errors.receivedAt}
                        >
                          <Flatpickr
                            data-enable-time
                            value={form.receivedAt}
                            onChange={(_, dateStr) => {
                              setForm((f) => ({ ...f, receivedAt: dateStr }));
                              if (errors.receivedAt)
                                setErrors((e) => ({ ...e, receivedAt: "" }));
                            }}
                            options={{
                              enableTime: true,
                              dateFormat: "Y-m-d\\TH:i",
                              time_24hr: true,
                            }}
                            className={`${inputClass} ${errors.receivedAt ? "border-rose-500" : ""}`}
                            placeholder="YYYY-MM-DD HH:MM"
                          />
                        </Field>

                        {/* CMS Next Ticket No */}
                        <Field
                          label="CMS Next Ticket No *"
                          error={errors.cmsNextTicketNo}
                        >
                          <input
                            type="text"
                            value={form.cmsNextTicketNo}
                            onChange={setField("cmsNextTicketNo")}
                            className={`${inputClass} ${errors.cmsNextTicketNo ? "border-rose-500" : ""}`}
                          />
                        </Field>

                        {/* Site Name */}
                        <div className="md:col-span-2">
                          <Field label="Site Name *" error={errors.siteName}>
                            <div className="flex items-center gap-3">
                              <Combobox
                                value={form.siteName}
                                onChange={setField("siteName")}
                                options={apiData.siteNames}
                                placeholder={
                                  loadingApis
                                    ? "Loading Sites..."
                                    : "Search sites..."
                                }
                                disabled={loadingApis}
                                error={errors.siteName}
                              />
                              {!isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setIsSiteModalOpen(true)}
                                  className="px-4 h-10 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-pink-600 rounded-xl hover:border-pink-500 transition-all shadow-sm text-[10px] font-bold uppercase tracking-widest whitespace-nowrap"
                                >
                                  New Site
                                </button>
                              )}
                            </div>
                          </Field>
                        </div>

                        {/* Customer */}
                        <div className="md:col-span-2">
                          <Field label="Customer *" error={errors.customer}>
                            <div className="flex items-center gap-3">
                              <Combobox
                                value={form.customer}
                                onChange={setField("customer")}
                                options={apiData.customers}
                                placeholder={
                                  !form.siteName
                                    ? "Select Site Name first..."
                                    : loadingCustomers
                                      ? "Loading Customers..."
                                      : "Search customers..."
                                }
                                disabled={
                                  loadingApis ||
                                  loadingCustomers ||
                                  !form.siteName
                                }
                                error={errors.customer}
                              />
                              {!isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setIsCustomerModalOpen(true)}
                                  className="px-4 h-10 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-pink-600 rounded-xl hover:border-pink-500 transition-all shadow-sm text-[10px] font-bold uppercase tracking-widest whitespace-nowrap"
                                >
                                  New Customer
                                </button>
                              )}
                            </div>
                          </Field>
                        </div>

                        {/* Ticket Assigned To */}
                        <Field
                          label="Ticket Assigned To *"
                          error={errors.ticketAssignedTo}
                        >
                          <Combobox
                            value={form.ticketAssignedTo}
                            onChange={setField("ticketAssignedTo")}
                            options={apiData.assignees}
                            placeholder={
                              loadingApis ? "Loading..." : "Search users..."
                            }
                            disabled={loadingApis}
                            error={errors.ticketAssignedTo}
                          />
                        </Field>

                        {/* Ticket Type — numeric value, label shown */}
                        <Field label="Ticket Type *" error={errors.ticketType}>
                          <Combobox
                            value={form.ticketType}
                            onChange={setField("ticketType")}
                            options={apiData.ticketTypes}
                            placeholder={
                              loadingApis ? "Loading..." : "Select An Option"
                            }
                            disabled={loadingApis}
                            error={errors.ticketType}
                          />
                        </Field>

                        {/* Incoming Channel + Forwarded toggle */}
                        <div className="flex gap-6 items-end">
                          <div className="flex-1">
                            <Field
                              label="Ticket Incoming Channel *"
                              error={errors.ticketIncomingChannel}
                            >
                              <Combobox
                                value={form.ticketIncomingChannel}
                                onChange={setField("ticketIncomingChannel")}
                                options={apiData.incomingChannels}
                                placeholder="Select An Option"
                                error={errors.ticketIncomingChannel}
                              />
                            </Field>
                          </div>
                          <label className="flex items-center gap-3 cursor-pointer w-max mb-2 p-1 px-3 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                            <div className="relative">
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={form.isTicketForwarded}
                                onChange={handleToggleForwarded}
                              />
                              <div
                                className={`block w-10 h-6 rounded-full transition-all duration-300 ${form.isTicketForwarded ? "bg-pink-600" : "bg-slate-300 dark:bg-slate-700"}`}
                              />
                              <motion.div
                                animate={{ x: form.isTicketForwarded ? 18 : 2 }}
                                className="absolute left-0 top-1 bg-white w-4 h-4 rounded-full shadow-md"
                              />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                              Forwarded
                            </span>
                          </label>
                        </div>

                        {/* Ticket Forwarded By */}
                        <Field
                          label="Ticket Forwarded By"
                          error={errors.ticketForwardedBy}
                        >
                          <Combobox
                            value={form.ticketForwardedBy}
                            onChange={setField("ticketForwardedBy")}
                            options={apiData.assignees}
                            placeholder="Search users..."
                            disabled={!form.isTicketForwarded}
                          />
                        </Field>

                        {/* CMS Ticket Added By */}
                        <Field
                          label="CMS Ticket Added By"
                          error={errors.cmsTicketAddedBy}
                        >
                          <Combobox
                            value={form.cmsTicketAddedBy}
                            onChange={setField("cmsTicketAddedBy")}
                            options={apiData.assignees}
                            placeholder="Search users..."
                          />
                        </Field>

                        {/* CMS Ticket Added On */}
                        <Field
                          label="CMS Ticket Added On *"
                          error={errors.cmsTicketAddedOn}
                        >
                          <Flatpickr
                            data-enable-time
                            value={form.cmsTicketAddedOn}
                            onChange={(_, dateStr) => {
                              setForm((f) => ({
                                ...f,
                                cmsTicketAddedOn: dateStr,
                              }));
                              if (errors.cmsTicketAddedOn)
                                setErrors((e) => ({
                                  ...e,
                                  cmsTicketAddedOn: "",
                                }));
                            }}
                            options={{
                              enableTime: true,
                              dateFormat: "Y-m-d\\TH:i",
                              time_24hr: true,
                            }}
                            className={`${inputClass} ${errors.cmsTicketAddedOn ? "border-rose-500" : ""}`}
                            placeholder="YYYY-MM-DD HH:MM"
                          />
                        </Field>

                        {/* Issue Description */}
                        <Field
                          label="Issue Description *"
                          error={errors.issueDescription}
                        >
                          <textarea
                            rows={3}
                            value={form.issueDescription}
                            onChange={setField("issueDescription")}
                            className={`${inputClass} ${errors.issueDescription ? "border-rose-500" : ""}`}
                          />
                        </Field>

                        {/* Possible Root Cause */}
                        <Field
                          label="Possible Root Cause"
                          error={errors.possibleRootCause}
                        >
                          <textarea
                            rows={3}
                            value={form.possibleRootCause}
                            onChange={setField("possibleRootCause")}
                            className={inputClass}
                          />
                        </Field>

                        {/* Notes */}
                        <div className="md:col-span-2">
                          <Field label="Notes *" error={errors.notes}>
                            <textarea
                              rows={2}
                              value={form.notes}
                              onChange={setField("notes")}
                              className={`${inputClass} ${errors.notes ? "border-rose-500" : ""}`}
                            />
                          </Field>
                        </div>

                        {/* Total Duration */}
                        <div className="md:col-span-2">
                          <Field
                            label="Total Duration (Hours)"
                            error={errors.totalDuration}
                          >
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={form.totalDuration}
                              onChange={setField("totalDuration")}
                              className={inputClass}
                            />
                          </Field>
                        </div>

                        {/* Service Planned Type */}
                        <div className="md:col-span-2">
                          <Field
                            label="Service Planned Type"
                            error={errors.servicePlannedType}
                          >
                            <Combobox
                              value={form.servicePlannedType}
                              onChange={setField("servicePlannedType")}
                              options={apiData.servicePlannedTypes}
                              placeholder="Select An Option"
                              disabled={loadingApis}
                            />
                          </Field>
                        </div>

                        {/* PRE Toggle */}
                        <div className="md:col-span-2">
                          <label className="flex items-center gap-3 cursor-pointer w-max p-1 px-4 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                            <div className="relative">
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={form.pre}
                                onChange={setField("pre")}
                              />
                              <div
                                className={`block w-10 h-6 rounded-full transition-all duration-300 ${form.pre ? "bg-pink-600" : "bg-slate-300 dark:bg-slate-700"}`}
                              />
                              <motion.div
                                animate={{ x: form.pre ? 18 : 2 }}
                                className="absolute left-0 top-1 bg-white w-4 h-4 rounded-full shadow-md"
                              />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                              PRE (Public Record Entry)
                            </span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* ══ ACTIVITIES TAB ══ */}
                    {activeTab === "Activities" && (
                      <div className="flex flex-col space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">
                              Ticket Activities
                            </h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">
                              Manage chronological service records
                            </p>
                          </div>
                          {!isAdmin && (
                            <button
                              type="button"
                              className="px-6 py-2.5 bg-pink-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-pink-700 transition shadow-lg shadow-pink-500/20"
                              onClick={() => {
                                if (!form.receivedAt) {
                                  setShowDateWarning(true);
                                  return;
                                }
                                setActivityToEdit(null);
                                setActivityEditIndex(null);
                                setIsActivityModalOpen(true);
                              }}
                            >
                              Add Activity
                            </button>
                          )}
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                          <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                  {[
                                    "Actions",
                                    "Activity Type",
                                    "Start Date",
                                    "End Date",
                                    "Duration",
                                    "Work Done Code",
                                    "Likely Cause",
                                    "Resolved By",
                                  ].map((h) => (
                                    <th
                                      key={h}
                                      className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500"
                                    >
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {!form.activities?.length ? (
                                  <tr>
                                    <td
                                      colSpan={8}
                                      className="px-6 py-12 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400"
                                    >
                                      No activities recorded
                                    </td>
                                  </tr>
                                ) : (
                                  form.activities.map((act, idx) => (
                                    <tr
                                      key={idx}
                                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                                    >
                                      <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                          <button
                                            type="button"
                                            className="text-[10px] font-bold uppercase tracking-widest text-pink-600 hover:text-pink-700"
                                            onClick={() => {
                                              setActivityToEdit(act);
                                              setActivityEditIndex(idx);
                                              setIsActivityModalOpen(true);
                                            }}
                                          >
                                            Edit
                                          </button>
                                          <button
                                            type="button"
                                            className="text-[10px] font-bold uppercase tracking-widest text-rose-600 hover:text-rose-700"
                                            onClick={() =>
                                              setForm((f) => ({
                                                ...f,
                                                activities: f.activities.filter(
                                                  (_, i) => i !== idx,
                                                ),
                                              }))
                                            }
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                        {act.activityType || "—"}
                                      </td>
                                      <td className="px-6 py-4 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                                        {act.startDate
                                          ? new Date(
                                              act.startDate,
                                            ).toLocaleString([], {
                                              dateStyle: "short",
                                              timeStyle: "short",
                                            })
                                          : "—"}
                                      </td>
                                      <td className="px-6 py-4 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                                        {act.endDate
                                          ? new Date(
                                              act.endDate,
                                            ).toLocaleString([], {
                                              dateStyle: "short",
                                              timeStyle: "short",
                                            })
                                          : "—"}
                                      </td>
                                      <td className="px-6 py-4 text-[11px] font-bold text-slate-900 dark:text-white text-center">
                                        {act.durationHours
                                          ? `${act.durationHours}h`
                                          : "—"}
                                      </td>
                                      <td className="px-6 py-4 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                        {act.workDoneCode || "—"}
                                      </td>
                                      <td className="px-6 py-4 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                        {act.likelyCause ? "Yes" : "No"}
                                      </td>
                                      <td className="px-6 py-4 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                        {act.resolvedBy || "—"}
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ══ TICKET VERIFICATION TAB ══ */}
                    {activeTab === "Ticket Verification" && (
                      <div className="flex flex-col space-y-6 pb-4">
                        <Field
                          label="Ticket Resolution Verified By"
                          error={errors.ticketResolutionVerifiedBy}
                        >
                          <Combobox
                            value={form.ticketResolutionVerifiedBy}
                            onChange={setField("ticketResolutionVerifiedBy")}
                            options={apiData.assignees}
                            placeholder="Search users..."
                          />
                        </Field>

                        <Field
                          label="Ticket Resolution Verified On"
                          error={errors.ticketResolutionVerifiedOn}
                        >
                          <Flatpickr
                            data-enable-time
                            value={form.ticketResolutionVerifiedOn}
                            onChange={(_, dateStr) => {
                              setForm((f) => ({
                                ...f,
                                ticketResolutionVerifiedOn: dateStr,
                              }));
                              if (errors.ticketResolutionVerifiedOn)
                                setErrors((e) => ({
                                  ...e,
                                  ticketResolutionVerifiedOn: "",
                                }));
                            }}
                            options={{
                              enableTime: true,
                              dateFormat: "Y-m-d\\TH:i",
                              time_24hr: true,
                            }}
                            className={inputClass}
                            placeholder="YYYY-MM-DD HH:MM"
                          />
                        </Field>

                        <Field
                          label="CMS Ticket Closed By"
                          error={errors.cmsTicketClosedBy}
                        >
                          <Combobox
                            value={form.cmsTicketClosedBy}
                            onChange={setField("cmsTicketClosedBy")}
                            options={apiData.assignees}
                            placeholder="Search users..."
                          />
                        </Field>

                        <Field
                          label="CMS Ticket Closed On"
                          error={errors.cmsTicketClosedOn}
                        >
                          <Flatpickr
                            data-enable-time
                            value={form.cmsTicketClosedOn}
                            onChange={(_, dateStr) => {
                              setForm((f) => ({
                                ...f,
                                cmsTicketClosedOn: dateStr,
                              }));
                              if (errors.cmsTicketClosedOn)
                                setErrors((e) => ({
                                  ...e,
                                  cmsTicketClosedOn: "",
                                }));
                            }}
                            options={{
                              enableTime: true,
                              dateFormat: "Y-m-d\\TH:i",
                              time_24hr: true,
                            }}
                            className={inputClass}
                            placeholder="YYYY-MM-DD HH:MM"
                          />
                        </Field>

                        <Field
                          label="Service Closed Date"
                          error={errors.serviceClosedDate}
                        >
                          <Flatpickr
                            data-enable-time
                            value={form.serviceClosedDate}
                            onChange={(_, dateStr) => {
                              setForm((f) => ({
                                ...f,
                                serviceClosedDate: dateStr,
                              }));
                              if (errors.serviceClosedDate)
                                setErrors((e) => ({
                                  ...e,
                                  serviceClosedDate: "",
                                }));
                            }}
                            options={{
                              enableTime: true,
                              dateFormat: "Y-m-d\\TH:i",
                              time_24hr: true,
                            }}
                            className={inputClass}
                            placeholder="YYYY-MM-DD HH:MM"
                          />
                        </Field>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* ── Footer ── */}
              <div className="flex items-center justify-end gap-4 px-8 py-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setShowExitConfirm(true)}
                  disabled={submitting}
                  className="px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-8 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-xl bg-pink-600 text-white shadow-lg shadow-pink-500/20 transition-all disabled:opacity-50 flex items-center justify-center min-w-[140px]"
                >
                  {submitting
                    ? "Saving..."
                    : isEdit
                      ? "Update Ticket"
                      : "Create Ticket"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Activity Modal ── */}
      <ActivityModal
        open={isActivityModalOpen}
        activity={activityToEdit}
        ticketReceivedDate={form.receivedAt}
        onClose={() => {
          setIsActivityModalOpen(false);
          setActivityToEdit(null);
          setActivityEditIndex(null);
        }}
        onSubmit={(data) => {
          if (activityToEdit !== null && activityEditIndex !== null) {
            setForm((f) => ({
              ...f,
              activities: f.activities.map((a, i) =>
                i === activityEditIndex ? data : a,
              ),
            }));
          } else {
            setForm((f) => ({
              ...f,
              activities: [...(f.activities || []), data],
            }));
          }
          setIsActivityModalOpen(false);
          setActivityToEdit(null);
          setActivityEditIndex(null);
        }}
      />

      {/* ── Site Modal ── */}
      <SiteModal
        open={isSiteModalOpen}
        onClose={() => setIsSiteModalOpen(false)}
        onSubmit={(data) => {
          setIsSiteModalOpen(false);
          sitesApi.getAll({ perPage: 1000 }).then((res) => {
            const fetchedSites = res?.items || [];
            setRawSites(fetchedSites);
            setApiData((prev) => ({
              ...prev,
              siteNames: fetchedSites
                .map((s) => s.name || s.Name)
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b)),
            }));
            if (data?.name) setForm((f) => ({ ...f, siteName: data.name }));
          });
        }}
      />

      {/* ── Customer Modal placeholder ── */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl w-[400px]">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">
              New Customer
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Customer creation — implementation pending.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Exit Confirm ── */}
      <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500 mx-auto mb-6">
                <AlertCircle size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-widest">
                Discard Changes?
              </h3>
              <p className="text-xs font-bold text-slate-400 mb-8 uppercase tracking-widest leading-relaxed">
                You have unsaved changes. Are you sure you want to exit?
              </p>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Stay
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setShowExitConfirm(false);
                    onClose();
                  }}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:from-rose-600 hover:to-red-700 transition-all shadow-lg shadow-rose-500/20"
                >
                  Discard
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Date Warning ── */}
      {showDateWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 text-center">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
              Warning
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Enter Received Date before adding an activity.
            </p>
            <button
              onClick={() => setShowDateWarning(false)}
              className="w-full py-2.5 rounded-xl bg-pink-500 text-white text-sm hover:bg-pink-600 transition-all font-medium"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}
