import { useState, useEffect, useRef } from "react";
import {
  AlertCircle,
  X,
  ChevronDown,
  Check,
  Plus,
  AlignLeft,
  Clock,
  Ticket,
  ShieldCheck,
  History,
  Sparkles,
  FileText,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PremiumErrorAlert from "./PremiumErrorAlert";
import SiteModal from "./SiteModal";
import ActivityModal from "./ActivityModal";
import { ActionsMenu } from "./ResourcePage";
import { useToast } from "./ToastContext";
import { useAuth } from "../../context/AuthContextHook";
import SearchTextHighlight from "./SearchTextHighlight";
import { getApiErrorMessage, getApiFieldErrors } from "../../utils/apiError";

import { usersApi } from "../../services/api/users";
import { sitesApi } from "../../services/api/sites";
import {
  amsTicketApi,
  SERVICE_PLANNED_TYPE_OPTIONS,
  TICKET_INCOMING_CHANNEL_OPTIONS,
} from "../../services/api/amsTicketApi";
import { loadBackendEnumTypes } from "../../services/backendEnumCache";
import DateTimePicker from "./DateTimePicker";
import { formatDurationHours } from "../../utils/formatDuration";

function Field({ label, error, children }) {
  return (
    <div className="flex flex-col gap-0.5 group/field">
      {label && (
        <label className="text-[11px] leading-4 font-medium text-slate-500 dark:text-slate-400 group-focus-within/field:text-pink-600 transition-colors flex items-center gap-1">
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
  "w-full min-h-8 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-slate-100 dark:bg-slate-800/50 backdrop-blur-sm text-xs outline-none transition-all duration-300 focus:bg-white dark:focus:bg-slate-900 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/10 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800/50 font-medium text-black dark:text-slate-200 placeholder:text-slate-500/80";

// ─── Robust string-based equality ──────────────────────────────────────────
// Converts both sides to lowercase strings before comparing so that
// number/string type mismatches (e.g. 1 vs "1") or UUID casing differences
// never cause a false negative.
const isEqual = (v1, v2) => {
  if (v1 == null || v2 == null) return v1 === v2;
  return String(v1).toLowerCase().trim() === String(v2).toLowerCase().trim();
};

const isGuid = (value) =>
  /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(
    String(value || "").trim(),
  );

function getActivityDurationMinutes(activity) {
  const storedMinutes = Number(activity?.durationMinutes);
  if (Number.isFinite(storedMinutes) && storedMinutes > 0) {
    return storedMinutes;
  }

  const storedHours = Number(activity?.durationHours);
  if (Number.isFinite(storedHours) && storedHours > 0) {
    return storedHours * 60;
  }

  const start = new Date(activity?.startDate);
  const end = new Date(activity?.endDate);
  const duration = end.getTime() - start.getTime();

  return Number.isFinite(duration) && duration > 0
    ? duration / (1000 * 60)
    : 0;
}

const normalizeActivityForForm = (activity = {}, userOptions = []) => {
  const detailUser = Array.isArray(activity.amsTicketDetailUsers)
    ? activity.amsTicketDetailUsers[0]
    : null;
  const resolvedById =
    activity.resolvedById ||
    (Array.isArray(activity.amsTicketDetailUserIds)
      ? activity.amsTicketDetailUserIds[0]
      : "") ||
    detailUser?.userId ||
    "";
  const identityUser = detailUser?.identityUser || {};
  const matchedResolvedUser = (Array.isArray(userOptions) ? userOptions : []).find((option) =>
    isEqual(option.value ?? option.id, resolvedById),
  );
  const rawActivityType =
    activity.activityTypeId ?? activity.activityType ?? activity.ActivityType;
  const isLikelyCause = !!(
    activity.isLikelyCause ??
    activity.likelyCauseOfIssue ??
    activity.likelyCause
  );

  return {
    ...activity,
    activityTypeId:
      rawActivityType !== "" && Number.isFinite(Number(rawActivityType))
        ? Number(rawActivityType)
        : activity.activityTypeId || "",
    activityType: amsTicketApi.resolveActivityTypeLabel
      ? amsTicketApi.resolveActivityTypeLabel(rawActivityType)
      : rawActivityType,
    workDoneCode:
      activity.workDoneCode || activity.workDoneCodeAndDescription || "",
    workDoneCodeId: activity.workDoneCodeId || "",
    resolvedBy:
      activity.resolvedBy ||
      activity.resolvedByName ||
      identityUser.name ||
      identityUser.userName ||
      matchedResolvedUser?.label ||
      "",
    resolvedById,
    amsTicketDetailUserIds: resolvedById ? [resolvedById] : [],
    isLikelyCause,
    likelyCause: isLikelyCause,
    isActivityDuringWorkingHours:
      activity.isActivityDuringWorkingHours !== false,
  };
};

const isEmailIncomingChannel = (value) =>
  String(value).trim().toLowerCase() === "email" || Number(value) === 3;

const getLocalizedApiError = (error, localize) => {
  const backendMessage = getApiErrorMessage(error);
  if (backendMessage) return backendMessage;

  const statusKey = error?.response?.status
    ? `DefaultErrorMessage${error.response.status}`
    : "";
  const statusMessage = statusKey ? localize(statusKey) : "";
  return statusMessage && statusMessage !== statusKey
    ? statusMessage
    : localize("DefaultErrorMessage");
};

function Combobox({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  loading,
  error,
  wide = false,
  menuAlign = "left",
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
    const searchableText = [
      label,
      opt.displayLabel,
      ...(opt.details || []).map((detail) => detail.value),
      opt.badge,
    ]
      .filter(Boolean)
      .join(" ");
    return searchableText.toLowerCase().includes(search.toLowerCase());
  });

  // ─── Resolve what text to display in the trigger button ────────────────
  // Priority order:
  //   1. Match stored value against opt.value  (value is a GUID/id)
  //   2. Match stored value against opt.label  (value is already a display name)
  //   3. Options are still loading → show placeholder (never show raw GUID)
  //   4. Options loaded but no match → still show placeholder to avoid noise
  const resolveDisplayLabel = () => {
    if (value == null || value === "") return placeholder;

    const opts = options || [];
    const valStr = String(value).toLowerCase().trim();

    // Case 1: stored value is an id/GUID — find by opt.value
    const matchById = opts.find(
      (opt) => String(opt.value ?? opt).toLowerCase().trim() === valStr
    );
    if (matchById) {
      return matchById.selectedLabel || matchById.label || String(matchById.value ?? matchById);
    }

    // Case 2: stored value is a display name string — find by opt.label
    const matchByLabel = opts.find(
      (opt) => String(opt.label || opt).toLowerCase().trim() === valStr
    );
    if (matchByLabel) {
      return matchByLabel.selectedLabel || matchByLabel.label || String(matchByLabel.value ?? matchByLabel);
    }

    // Options are still loading or empty — show the value
    if (loading || opts.length === 0) return isGuid(value) ? placeholder : value;

    // Options loaded but nothing matched.
    // Return the typed value to allow manual text input.
    return isGuid(value) ? placeholder : value;
  };

  const displayLabel = resolveDisplayLabel();
  const hasResolvedValue = displayLabel != null && displayLabel !== "" && displayLabel !== placeholder;

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        onClick={() => {
          if (!disabled && !open) {
            setSearch(hasResolvedValue ? displayLabel : "");
            setOpen(true);
          }
        }}
        className={`${inputClass} app-combobox-trigger flex items-center justify-between ${disabled
          ? "opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/30"
          : "cursor-text"
          } ${error ? "border-rose-500" : ""}`}
      >
        <div className="flex items-center gap-2 w-full truncate">
          <input
            type="text"
            autoComplete="off"
            className={`w-full bg-transparent outline-none truncate pointer-events-auto cursor-text select-text ${!hasResolvedValue
              ? "text-slate-600/80"
              : "text-black dark:text-white"
              }`}
            value={open ? search : displayLabel === placeholder ? "" : displayLabel}
            placeholder={placeholder}
            disabled={disabled}
            onFocus={() => {
              if (!disabled && !open) {
                setSearch(hasResolvedValue ? displayLabel : "");
                setOpen(true);
              }
            }}
            onChange={(e) => {
              const typedValue = e.target.value;
              setSearch(typedValue);
              onChange(typedValue);
              if (!open) setOpen(true);
            }}
          />
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {hasResolvedValue && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setSearch("");
                setOpen(false);
              }}
              className="text-slate-400 hover:text-rose-500 transition-colors p-1 rounded-md flex items-center justify-center"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) {
                if (!open) setSearch(hasResolvedValue ? displayLabel : "");
                setOpen(!open);
              }
            }}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md flex items-center justify-center"
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
            className={`app-combobox-menu absolute z-[100] mt-2 ${
              wide ? "w-[32rem] max-w-[calc(100vw-1rem)]" : "w-full"
            } ${menuAlign === "right" ? "right-0" : "left-0"} bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col max-h-[300px]`}
          >
            <div className="overflow-y-auto custom-scrollbar flex-1 py-1.5">
              {loading ? (
                <div className="p-8 text-center flex flex-col items-center gap-2">
                  <div className="w-4 h-4 border-2 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" />
                  <span className="text-[10px] font-bold text-slate-400">
                    Loading...
                  </span>
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="p-10 text-center flex flex-col items-center gap-1.5">
                  <AlertCircle size={20} className="text-slate-300" />
                  <span className="text-[10px] font-bold text-slate-400">
                    No results found
                  </span>
                </div>
              ) : (
                <div className="px-2 space-y-0.5">
                  {filteredOptions.map((opt, idx) => {
                    const label = opt.label || String(opt);
                    const val = opt.value ?? opt;
                    // Use the same robust isEqual for active highlight
                    const isSelected = isEqual(value, val);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          onChange(val);
                          setOpen(false);
                          setSearch("");
                        }}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between group/opt ${isSelected
                          ? "bg-pink-50 dark:bg-pink-500/10 text-pink-600 font-bold"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/80 hover:text-black dark:hover:text-white"
                          }`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">
                            <SearchTextHighlight text={label} query={search} />
                          </span>
                          {opt.details?.length > 0 && (
                            <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                              {opt.details.map((detail) => (
                                <span key={`${detail.label}-${detail.value}`}>
                                  {detail.hideLabel ? detail.value : `${detail.label}: ${detail.value}`}
                                </span>
                              ))}
                            </span>
                          )}
                        </span>
                        {opt.badge && (
                          <span className="ml-3 shrink-0 rounded-full bg-pink-50 px-2 py-0.5 text-[9px] font-bold text-pink-600 dark:bg-pink-500/10 dark:text-pink-300">
                            {opt.badge}
                          </span>
                        )}
                        {isSelected && !opt.badge && (
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
  pdfFile: null,
  receivedAt: "",
  cmsNextTicketNo: "",
  siteName: "",
  customer: "",
  ticketAssignedTo: "",
  ticketType: "",
  servicePlannedType: "",
  ticketIncomingChannel: "",
  incomingChannelEmail: "",
  isTicketForwarded: false,
  ticketForwardedBy: "",
  cmsTicketAddedBy: "",
  cmsTicketAddedOn: "",
  issueDescription: "",
  possibleRootCause: "",
  notes: "",
  totalDuration: "0.00",
  pre: false,
  ticketResolutionVerifiedBy: "",
  ticketResolutionVerifiedOn: "",
  cmsTicketClosedBy: "",
  cmsTicketClosedOn: "",
  serviceClosedDate: "",
  activities: [],
};

// ─── Shared helper: resolve a stored value (name string OR id) to an id ───
// Works in both the options-load effect and the normalization effect.
// Fields rendered on the "Ticket Verification" tab.
const VERIFICATION_FIELD_KEYS = [
  "ticketResolutionVerifiedBy",
  "ticketResolutionVerifiedOn",
  "cmsTicketClosedBy",
  "cmsTicketClosedOn",
  "serviceClosedDate",
];

// Keep the currently saved user selectable/visible even when they are no
// longer in the filtered option list (e.g. an older ticket's non-ITS user).
const withSelectedOption = (options, value, fallbackOptions = []) => {
  if (!value || options.some((option) => isEqual(option.value, value))) {
    return options;
  }
  const selected = fallbackOptions.find((option) => isEqual(option.value, value));
  return selected ? [...options, selected] : options;
};

const normalizeToId = (val, optList) => {
  if (!val) return val;
  const lower = String(val).toLowerCase().trim();
  // Already a valid ID in the list → keep as-is
  const byId = optList.find(
    (o) => String(o.value ?? o).toLowerCase().trim() === lower
  );
  if (byId) return byId.value ?? byId;
  // It's a name string → resolve to the matching ID
  const byLabel = optList.find(
    (o) => String(o.label || "").toLowerCase().trim() === lower
  );
  return byLabel ? (byLabel.value ?? byLabel) : val;
};

const createSiteOption = (site, localize) => {
  const name = site?.name || site?.Name || "";
  const ocn = site?.ocn || site?.oCN || site?.OCN || "";
  const country = site?.countryName || site?.country?.name || "";
  const details = [
    ocn && { label: localize("OCN"), value: ocn, hideLabel: true },
    country && { label: localize("CountryName"), value: country },
  ].filter(Boolean);

  return {
    label: name,
    selectedLabel: [name, ocn].filter(Boolean).join(" • "),
    displayLabel: [name, ocn, country].filter(Boolean).join(" • "),
    details,
    value: site?.id,
    raw: site,
  };
};

const createCustomerOption = (customer, localize) => {
  const name = customer?.name || customer?.userName || "";
  const email = customer?.email || "";
  const phoneNumber = customer?.phoneNumber || "";
  const isPrimary = Boolean(
    customer?.isPrimary ?? customer?.extraProperties?.isPrimary,
  );
  const details = [
    email && { label: localize("EmailAddress"), value: email },
    phoneNumber && {
      label: localize("CustomerContactNumber"),
      value: phoneNumber,
    },
  ].filter(Boolean);

  return {
    label: name,
    displayLabel: [
      name,
      isPrimary ? localize("DisplayName:IsPrimary") : "",
    ]
      .filter(Boolean)
      .join(" • "),
    details,
    badge: isPrimary ? localize("DisplayName:IsPrimary") : "",
    value: customer?.id,
    raw: customer,
  };
};

export default function TicketModal({
  open,
  onClose,
  onSave,
  onSubmit: onSubmitProp,
  ticket = null,
  submitting = false,
  viewMode = false,
  canCloseTicket = false,
  localize = (key) => key,
}) {
  const onSubmit = onSave || onSubmitProp;
  const isEdit = !!ticket;
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase().includes("admin");

  const [activeTab, setActiveTab] = useState("Ticket");
  const [isTabTransitioning, setIsTabTransitioning] = useState(false);
  // The other tabs are kept at least as tall as the Ticket tab, so switching tabs
  // doesn't shrink the modal; the Ticket tab itself is never padded.
  const ticketContentRef = useRef(null);
  const [tabMinHeight, setTabMinHeight] = useState(0);
  useEffect(() => {
    if (!open) {
      setTabMinHeight(0);
      return undefined;
    }
    const content = ticketContentRef.current;
    if (activeTab !== "Ticket" || !content) return undefined;
    const observer = new ResizeObserver(() => setTabMinHeight(content.offsetHeight));
    observer.observe(content);
    return () => observer.disconnect();
  }, [open, activeTab]);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const hasClosedStatus = (status) =>
    Number(status) === 2 ||
    String(status || "").trim().toLowerCase() === "closed";
  const isClosedTicket =
    isEdit && (hasClosedStatus(ticket?.status) || hasClosedStatus(form.status));
  const isReadOnly = viewMode || isClosedTicket;
  const isClosingTicket =
    isEdit && !isClosedTicket && activeTab === "Ticket Verification";
  // Only offer "Clear" for messages the user can see on the current tab.
  const currentTabHasErrors = Object.entries(errors).some(
    ([key, message]) =>
      message &&
      (activeTab === "Ticket Verification"
        ? VERIFICATION_FIELD_KEYS.includes(key)
        : activeTab === "Ticket" && !VERIFICATION_FIELD_KEYS.includes(key)),
  );

  const [loadingApis, setLoadingApis] = useState(false);
  const [optionsError, setOptionsError] = useState(null);
  const [apiData, setApiData] = useState({
    siteNames: [],
    customers: [],
    assignees: [],
    itsUsers: [],
    itsAssignableUsers: [],
    ticketTypes: [],
    servicePlannedTypes: [],
    incomingChannels: [],
  });

  const [rawSites, setRawSites] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [siteSubmitting, setSiteSubmitting] = useState(false);
  const [siteSubmitError, setSiteSubmitError] = useState(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerSubmitting, setCustomerSubmitting] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    isPrimary: false,
  });
  const [customerFormErrors, setCustomerFormErrors] = useState({});

  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityToEdit, setActivityToEdit] = useState(null);
  const [activityIndexToEdit, setActivityIndexToEdit] = useState(null);
  const activitiesDirtyRef = useRef(false);
  const itsUsersRef = useRef([]);

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showDateWarning, setShowDateWarning] = useState(false);
  const [showActivityWarning, setShowActivityWarning] = useState(false);

  // ── PDF Upload State ───────────────────────────────────────────────────────
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfError, setPdfError] = useState("");

  // ── Reset / seed form whenever the modal opens or the ticket changes ──────
  useEffect(() => {
    if (!open) {
      itsUsersRef.current = [];
      setForm({ ...EMPTY });
      setErrors({});
      setActiveTab("Ticket");
      setIsTabTransitioning(false);
      setShowExitConfirm(false);
      setShowDateWarning(false);
      setShowActivityWarning(false);
      return;
    }

    setShowExitConfirm(false);
    setShowDateWarning(false);
    setShowActivityWarning(false);
    setErrors({});
    setActiveTab("Ticket");
    setIsTabTransitioning(false);
    setActivityToEdit(null);
    setActivityIndexToEdit(null);
    activitiesDirtyRef.current = false;

    if (ticket) {
      const ticketHasVerification = hasClosedStatus(ticket.status);

      setForm({
        ...EMPTY,
        ...ticket,
        siteName: ticket.siteId || ticket.siteName || "",
        customer: ticket.customerUserId || ticket.customer || "",
        ticketAssignedTo:
          ticket.ticketAssignedToId || ticket.ticketAssignedTo || "",
        ticketForwardedBy:
          ticket.ticketForwardedById || ticket.ticketForwardedBy || "",
        cmsTicketAddedBy:
          ticket.cmsTicketAddedById || ticket.cmsTicketAddedBy || "",
        ticketResolutionVerifiedBy:
          ticketHasVerification
            ? ticket.ticketResolutionVerifiedById ||
              ticket.ticketResolutionVerifiedBy ||
              ""
            : "",
        cmsTicketClosedBy:
          ticketHasVerification
            ? ticket.cmsTicketClosedById || ticket.cmsTicketClosedBy || ""
            : "",
        ticketType: amsTicketApi.resolveTicketTypeLabel
          ? amsTicketApi.resolveTicketTypeLabel(ticket.ticketType)
          : ticket.ticketType || "",
        servicePlannedType: amsTicketApi.resolveServicePlannedTypeLabel
          ? amsTicketApi.resolveServicePlannedTypeLabel(
            ticket.servicePlannedType
          )
          : ticket.servicePlannedType || "",
        ticketIncomingChannel: amsTicketApi.resolveTicketIncomingChannelLabel
          ? amsTicketApi.resolveTicketIncomingChannelLabel(
            ticket.ticketIncomingChannel
          )
          : ticket.ticketIncomingChannel || "",
        incomingChannelEmail: ticket.emailAddress || ticket.incomingChannelEmail || "",
        notes: ticket.ticketNotes || ticket.notes || "",
        pre: !!(ticket.isPRE ?? ticket.pre),
        issueDescription: ticket.issueDescription || "",
        possibleRootCause: ticket.possibleRootCause || "",
        receivedAt: ticket.ticketReceivedDate
          ? ticket.ticketReceivedDate.slice(0, 16)
          : ticket.receivedAt
            ? ticket.receivedAt.slice(0, 16)
            : "",
        cmsTicketAddedOn: ticket.cmsTicketAddedOn
          ? ticket.cmsTicketAddedOn.slice(0, 16)
          : ticket.cMSTicketAddedOn
            ? ticket.cMSTicketAddedOn.slice(0, 16)
            : "",
        ticketResolutionVerifiedOn: ticketHasVerification && ticket.ticketResolutionVerifiedOn
          ? ticket.ticketResolutionVerifiedOn.slice(0, 16)
          : "",
        cmsTicketClosedOn: ticketHasVerification && ticket.cmsTicketClosedOn
          ? ticket.cmsTicketClosedOn.slice(0, 16)
          : ticketHasVerification && ticket.cMSTicketClosedOn
            ? ticket.cMSTicketClosedOn.slice(0, 16)
            : "",
        serviceClosedDate: ticketHasVerification && ticket.serviceClosedDate
          ? ticket.serviceClosedDate.slice(0, 16)
          : "",
        isTicketForwarded: !!(
          ticket.ticketForwardedById ||
          ticket.ticketForwardedBy ||
          ticket.isTicketForwarded
        ),
        activities: (ticket.activities || ticket.amsTicketDetails || []).map(
          (activity) => normalizeActivityForForm(activity, itsUsersRef.current),
        ),
      });

      // Fetch full record details (may resolve before or after options load)
      amsTicketApi
        .getById(ticket.id)
        .then((fullData) => {
          console.log("fullData keys with email:", Object.keys(fullData).filter(k => k.toLowerCase().includes("email")));
          console.log("fullData:", fullData);
          console.log("fullData.emailAddress:", fullData.emailAddress);
          console.log("fullData.incomingChannelEmail:", fullData.incomingChannelEmail);
          console.log("fullData.ticketIncomingChannel:", fullData.ticketIncomingChannel);
          const fullDataHasVerification = hasClosedStatus(fullData.status);
          const fetchedActivities =
            fullData.amsTicketDetails && fullData.amsTicketDetails.length > 0
              ? fullData.amsTicketDetails.map((activity) =>
                normalizeActivityForForm(activity, itsUsersRef.current)
              )
              : (fullData.activities || []).map((activity) =>
                normalizeActivityForForm(activity, itsUsersRef.current)
              );

          setForm((prev) => ({
            ...prev,
            ...fullData,
            siteName: fullData.siteId || fullData.siteName || prev.siteName,
            customer:
              fullData.customerUserId || fullData.customer || prev.customer,
            ticketAssignedTo:
              fullData.ticketAssignedToId ||
              fullData.ticketAssignedTo ||
              prev.ticketAssignedTo,
            ticketForwardedBy:
              fullData.ticketForwardedById ||
              fullData.ticketForwardedBy ||
              prev.ticketForwardedBy,
            cmsTicketAddedBy:
              fullData.cmsTicketAddedById ||
              fullData.cmsTicketAddedBy ||
              prev.cmsTicketAddedBy,
            ticketResolutionVerifiedBy:
              fullDataHasVerification
                ? fullData.ticketResolutionVerifiedById ||
                  fullData.ticketResolutionVerifiedBy ||
                  ""
                : "",
            cmsTicketClosedBy:
              fullDataHasVerification
                ? fullData.cmsTicketClosedById ||
                  fullData.cmsTicketClosedBy ||
                  ""
                : "",
            ticketType: amsTicketApi.resolveTicketTypeLabel
              ? amsTicketApi.resolveTicketTypeLabel(fullData.ticketType)
              : fullData.ticketType || prev.ticketType,
            servicePlannedType: amsTicketApi.resolveServicePlannedTypeLabel
              ? amsTicketApi.resolveServicePlannedTypeLabel(
                fullData.servicePlannedType
              )
              : fullData.servicePlannedType || prev.servicePlannedType,
            ticketIncomingChannel:
              amsTicketApi.resolveTicketIncomingChannelLabel
                ? amsTicketApi.resolveTicketIncomingChannelLabel(
                  fullData.ticketIncomingChannel
                )
                : fullData.ticketIncomingChannel || prev.ticketIncomingChannel,
            incomingChannelEmail: fullData.emailAddress || fullData.incomingChannelEmail || prev.incomingChannelEmail || "",
            notes: fullData.ticketNotes || fullData.notes || prev.notes || "",
            pre: !!(fullData.isPRE ?? fullData.pre ?? prev.pre),
            issueDescription: fullData.issueDescription ?? prev.issueDescription ?? "",
            possibleRootCause: fullData.possibleRootCause ?? prev.possibleRootCause ?? "",
            receivedAt: fullData.ticketReceivedDate
              ? fullData.ticketReceivedDate.slice(0, 16)
              : fullData.receivedAt
                ? fullData.receivedAt.slice(0, 16)
                : prev.receivedAt,
            cmsTicketAddedOn: fullData.cmsTicketAddedOn
              ? fullData.cmsTicketAddedOn.slice(0, 16)
              : fullData.cMSTicketAddedOn
                ? fullData.cMSTicketAddedOn.slice(0, 16)
                : prev.cmsTicketAddedOn,
            ticketResolutionVerifiedOn: fullDataHasVerification && fullData.ticketResolutionVerifiedOn
              ? fullData.ticketResolutionVerifiedOn.slice(0, 16)
              : "",
            cmsTicketClosedOn: fullDataHasVerification && fullData.cmsTicketClosedOn
              ? fullData.cmsTicketClosedOn.slice(0, 16)
              : fullDataHasVerification && fullData.cMSTicketClosedOn
                ? fullData.cMSTicketClosedOn.slice(0, 16)
                : "",
            serviceClosedDate: fullDataHasVerification && fullData.serviceClosedDate
              ? fullData.serviceClosedDate.slice(0, 16)
              : "",
            isTicketForwarded: !!(
              fullData.ticketForwardedById ||
              fullData.ticketForwardedBy ||
              fullData.isTicketForwarded
            ),
            activities: activitiesDirtyRef.current
              ? prev.activities
              : fetchedActivities.length > 0
                ? fetchedActivities
                : prev.activities,
          }));
        })
        .catch((err) =>
          console.error("Failed to fetch secure ticket record:", err)
        );
    } else {
      setForm({ ...EMPTY });
    }
  }, [open, isEdit, user]);

  // Pre-fill ticketAssignedTo with current user when creating a new ticket,
  // but only when that user is selectable (an ITS user).
  useEffect(() => {
    if (!open || isEdit || !user?.id) return;
    if (!apiData.itsAssignableUsers.some((u) => isEqual(u.value, user.id))) return;
    setForm((prev) =>
      prev.ticketAssignedTo ? prev : { ...prev, ticketAssignedTo: user.id },
    );
  }, [open, isEdit, user, apiData.itsAssignableUsers]);

  // ── Re-normalize id fields whenever options finish loading ─────────────────
  // Fixes the race condition: getById may resolve before OR after options load.
  // Whichever happens last, this effect runs and maps any name strings → ids.
  useEffect(() => {
    if (!open || !isEdit) return;
    if (apiData.itsUsers.length === 0 && apiData.siteNames.length === 0) return;

    setForm((prev) => ({
      ...prev,
      siteName:
        apiData.siteNames.length > 0
          ? normalizeToId(prev.siteName, apiData.siteNames)
          : prev.siteName,
      ticketAssignedTo:
        apiData.itsUsers.length > 0
          ? normalizeToId(prev.ticketAssignedTo, apiData.itsUsers)
          : prev.ticketAssignedTo,
      ticketForwardedBy:
        apiData.itsUsers.length > 0
          ? normalizeToId(prev.ticketForwardedBy, apiData.itsUsers)
          : prev.ticketForwardedBy,
      cmsTicketAddedBy:
        apiData.itsUsers.length > 0
          ? normalizeToId(prev.cmsTicketAddedBy, apiData.itsUsers)
          : prev.cmsTicketAddedBy,
      ticketResolutionVerifiedBy:
        apiData.itsUsers.length > 0
          ? normalizeToId(prev.ticketResolutionVerifiedBy, apiData.itsUsers)
          : prev.ticketResolutionVerifiedBy,
      cmsTicketClosedBy:
        apiData.itsUsers.length > 0
          ? normalizeToId(prev.cmsTicketClosedBy, apiData.itsUsers)
          : prev.cmsTicketClosedBy,
    }));
  }, [apiData.itsUsers, apiData.siteNames, open, isEdit]);

  // ── Fetch all dropdown options when modal opens ────────────────────────────
  useEffect(() => {
    if (!open) return;

    setLoadingApis(true);
    setOptionsError(null);

    const loadAllSites = async () => {
      const pageSize = 100;
      const firstPage = await sitesApi.getAll({ perPage: pageSize, page: 1 });
      const firstItems =
        firstPage?.items ||
        firstPage?.data ||
        (Array.isArray(firstPage) ? firstPage : []);
      const totalCount = Number(firstPage?.totalCount) || firstItems.length;
      const totalPages = Math.ceil(totalCount / pageSize);

      if (totalPages <= 1) return { items: firstItems };

      const remainingPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) =>
          sitesApi.getAll({ perPage: pageSize, page: index + 2 }),
        ),
      );
      const remainingItems = remainingPages.flatMap(
        (page) =>
          page?.items ||
          page?.data ||
          (Array.isArray(page) ? page : []),
      );

      return { items: [...firstItems, ...remainingItems] };
    };

    Promise.all([
      loadAllSites().catch((err) => {
        console.error(
          "[TicketModal] Failed to fetch sites:",
          err?.response?.data || err.message
        );
        setOptionsError(getLocalizedApiError(err, localize));
        return { items: [] };
      }),
      usersApi
        .getUsersList({
          organizationTypes: [2, 3],
          onlyLoadCurrentUser: false,
        })
        .catch((err) => {
          console.error("[TicketModal] Failed to fetch users:", err);
          setOptionsError(getLocalizedApiError(err, localize));
          return [];
        }),
      usersApi
        .getUsersList({ onlyLoadCurrentUser: true })
        .catch((err) => {
          console.error("[TicketModal] Failed to fetch current user:", err);
          setOptionsError(getLocalizedApiError(err, localize));
          return [];
        }),
      loadBackendEnumTypes()
        .catch((err) => {
          console.error("[TicketModal] Failed to fetch backend enums:", err);
          setOptionsError(getLocalizedApiError(err, localize));
          return {};
        }),
      usersApi
        .getUsersList({
          organizationTypes: [2, 3],
          isITS: true,
          onlyLoadCurrentUser: false,
        })
        .catch((err) => {
          console.error("[TicketModal] Failed to fetch ITS users:", err);
          setOptionsError(getLocalizedApiError(err, localize));
          return [];
        }),
    ])
      .then(([sitesRes, itsUsersRes, currentUserRes, enumTypes, itsOnlyUsersRes]) => {
        const fetchedSites =
          sitesRes?.items ||
          sitesRes?.data ||
          (Array.isArray(sitesRes) ? sitesRes : []);
        setRawSites(fetchedSites);

        // Ticket types come from the backend TicketTypeEnum, as in the Blazor client.
        const ticketTypes = (enumTypes?.TicketTypeEnum || [])
          .filter((member) => member.value > 0)
          .sort((a, b) => a.value - b.value)
          .map((member) => amsTicketApi.resolveTicketTypeLabel(member.value))
          .filter(Boolean);

        const servicePlannedTypes = SERVICE_PLANNED_TYPE_OPTIONS.filter(
          (item) => item.apiValue > 0,
        );

        const incomingChannels = TICKET_INCOMING_CHANNEL_OPTIONS.map(
          ({ label }) => label,
        );

        const itsUsersArr = Array.isArray(itsUsersRes)
          ? itsUsersRes
          : itsUsersRes?.items || itsUsersRes?.data || [];
        const currentUsersArr = Array.isArray(currentUserRes)
          ? currentUserRes
          : currentUserRes?.items || currentUserRes?.data || [];

        const mergedUsersMap = new Map();
        [...itsUsersArr, ...currentUsersArr].forEach((u) => {
          if (u?.id) mergedUsersMap.set(u.id, u);
        });
        if (user?.id && !mergedUsersMap.has(user.id)) {
          mergedUsersMap.set(user.id, {
            id: user.id,
            name: user.name || user.userName,
          });
        }

        const itsUsersList = Array.from(mergedUsersMap.values())
          .filter(Boolean)
          .map((u) => ({
            label: u.name || u.userName || "",
            value: u.id,
            raw: u,
          }))
          .filter((u) => u.label)
          .sort((a, b) => a.label.localeCompare(b.label));
        itsUsersRef.current = itsUsersList;

        // Assigned To / Forwarded By / CMS Added By only offer ITS users and
        // never the built-in admin account (matches the Blazor client).
        const itsOnlyUsersArr = Array.isArray(itsOnlyUsersRes)
          ? itsOnlyUsersRes
          : itsOnlyUsersRes?.items || itsOnlyUsersRes?.data || [];
        const itsAssignableUsersList = itsOnlyUsersArr
          .filter((u) => u?.id && String(u.userName || "").toLowerCase() !== "admin")
          .map((u) => ({
            label: u.name || u.userName || "",
            value: u.id,
            raw: u,
          }))
          .filter((u) => u.label)
          .sort((a, b) => a.label.localeCompare(b.label));

        const siteNameOptions = fetchedSites
          .filter(Boolean)
          .map((site) => createSiteOption(site, localize))
          .filter((option) => option.label)
          .sort((a, b) => a.label.localeCompare(b.label));

        // Normalize form fields now that options are available.
        // This handles the case where getById resolved first and stored a
        // name string instead of a GUID.
        setForm((prev) => ({
          ...prev,
          siteName: normalizeToId(prev.siteName, siteNameOptions),
          ticketAssignedTo: normalizeToId(prev.ticketAssignedTo, itsUsersList),
          ticketForwardedBy: normalizeToId(
            prev.ticketForwardedBy,
            itsUsersList
          ),
          cmsTicketAddedBy: normalizeToId(prev.cmsTicketAddedBy, itsUsersList),
          ticketResolutionVerifiedBy: normalizeToId(
            prev.ticketResolutionVerifiedBy,
            itsUsersList
          ),
          cmsTicketClosedBy: normalizeToId(
            prev.cmsTicketClosedBy,
            itsUsersList
          ),
          activities: (prev.activities || []).map((activity) =>
            normalizeActivityForForm(activity, itsUsersList)
          ),
        }));

        setApiData((prev) => ({
          ...prev,
          siteNames: siteNameOptions,
          itsUsers: itsUsersList,
          itsAssignableUsers: itsAssignableUsersList,
          ticketTypes:
            ticketTypes.length > 0
              ? ticketTypes
              : [
                "Service Planned",
                "Service Demand",
                "Complaint",
                "Inquiry",
              ].sort((a, b) => a.localeCompare(b)),
          servicePlannedTypes,
          incomingChannels:
            incomingChannels,
        }));
      })
      .catch((err) => {
        console.error(
          "[TicketModal] Unexpected error fetching modal data:",
          err
        );
      })
      .finally(() => {
        setLoadingApis(false);
      });
  }, [open, ticket, localize, user]);

  // The paged site request does not guarantee that an existing ticket's site
  // is included. Load that site directly so Edit can always resolve its ID to
  // the correct display name and subsequently load its customers.
  useEffect(() => {
    if (
      !open ||
      loadingApis ||
      !isGuid(form.siteName) ||
      rawSites.some((site) => isEqual(site.id, form.siteName))
    ) {
      return undefined;
    }

    let cancelled = false;
    sitesApi
      .getById(form.siteName)
      .then((site) => {
        if (cancelled || !site?.id) return;

        setRawSites((currentSites) =>
          currentSites.some((item) => isEqual(item.id, site.id))
            ? currentSites
            : [...currentSites, site],
        );
        setApiData((currentData) => {
          if (currentData.siteNames.some((option) => isEqual(option.value, site.id))) {
            return currentData;
          }

          const siteNames = [
            ...currentData.siteNames,
            createSiteOption(site, localize),
          ]
            .filter((option) => option.label)
            .sort((a, b) => a.label.localeCompare(b.label));

          return { ...currentData, siteNames };
        });
      })
      .catch(() => null);

    return () => {
      cancelled = true;
    };
  }, [form.siteName, loadingApis, localize, open, rawSites]);

  // ── Load customers whenever the selected site changes ─────────────────────
  useEffect(() => {
    let cancelled = false;

    if (!form.siteName) {
      setApiData((prev) => ({ ...prev, customers: [] }));
      setLoadingCustomers(false);
      return undefined;
    }

    // form.siteName may be a GUID or a name string — check both
    const selectedSite =
      rawSites.find((s) => isEqual(s.id, form.siteName)) ||
      rawSites.find((s) =>
        isEqual(s.name || s.Name || "", form.siteName)
      );

    if (selectedSite?.id) {
      setLoadingCustomers(true);
      usersApi
        .getCustomerUsers(selectedSite.id)
        .then((res) => {
          if (cancelled) return;

          const customers = (res?.items || res || [])
            .map((customer) => createCustomerOption(customer, localize))
            .filter((c) => c.label)
            .sort((a, b) =>
              Number(Boolean(b.badge)) - Number(Boolean(a.badge)) ||
              a.label.localeCompare(b.label)
            );

          setApiData((prev) => ({ ...prev, customers }));

          // Normalize form.customer (name string → id) if needed
          setForm((prev) => {
            if (!prev.customer) return prev;
            const normalized = normalizeToId(prev.customer, customers);
            return normalized !== prev.customer
              ? { ...prev, customer: normalized }
              : prev;
          });
        })
        .catch(() => {
          if (cancelled) return;
          setApiData((prev) => ({ ...prev, customers: [] }));
        })
        .finally(() => {
          if (!cancelled) setLoadingCustomers(false);
        });
    } else {
      setApiData((prev) => ({ ...prev, customers: [] }));
      setLoadingCustomers(false);
    }

    return () => {
      cancelled = true;
    };
  }, [form.siteName, localize, rawSites]);

  // Customer lists may omit an inactive or otherwise filtered saved customer.
  // Resolve that selected ID directly so Edit still shows its display name.
  useEffect(() => {
    if (
      !open ||
      loadingCustomers ||
      !isGuid(form.customer) ||
      apiData.customers.some((customer) =>
        isEqual(customer.value, form.customer)
      )
    ) {
      return undefined;
    }

    let cancelled = false;
    usersApi
      .getById(form.customer)
      .then((customer) => {
        if (cancelled || !customer?.id) return;
        const customerOption = createCustomerOption(customer, localize);
        if (!customerOption.label) return;

        setApiData((currentData) => {
          if (currentData.customers.some((item) => isEqual(item.value, customer.id))) {
            return currentData;
          }

          const customers = [
            ...currentData.customers,
            customerOption,
          ]
            .filter((option) => option.label)
            .sort((a, b) =>
              Number(Boolean(b.badge)) - Number(Boolean(a.badge)) ||
              a.label.localeCompare(b.label)
            );

          return { ...currentData, customers };
        });
      })
      .catch(() => null);

    return () => {
      cancelled = true;
    };
  }, [apiData.customers, form.customer, loadingCustomers, localize, open]);

  const setField = (key) => (e) => {
    let val = e?.target ? e.target.value : e;

    if (e?.target?.type === "checkbox") {
      val = e.target.checked;
    } else if (e?.target?.type === "file") {
      val = e.target.files[0];
    }

    setForm((f) => ({ ...f, [key]: val }));

    if (errors[key]) {
      setErrors((errs) => ({ ...errs, [key]: "" }));
    }
  };

  // ── Auto-compute total duration ────────────────────────────────────────────
  useEffect(() => {
    const activities = form.activities || [];
    const totalMinutes = activities.reduce(
      (total, activity) => total + getActivityDurationMinutes(activity),
      0,
    );

    const totalHours = totalMinutes / 60;
    const computedDuration = totalHours > 0 ? totalHours.toFixed(2) : "0.00";

    setForm((prev) => {
      if (prev.totalDuration === computedDuration) return prev;
      return { ...prev, totalDuration: computedDuration };
    });
  }, [form.activities]);

  const handleTicketTypeChange = (value) => {
    setForm((f) => ({
      ...f,
      ticketType: value,
      servicePlannedType:
        value === "Service Planned" ? f.servicePlannedType : "",
    }));

    setErrors((errs) => ({
      ...errs,
      ticketType: "",
      servicePlannedType:
        value === "Service Planned" ? errs.servicePlannedType : "",
    }));
  };

  const handleToggleForwarded = (e) => {
    const isChecked = e.target.checked;
    setForm((f) => ({
      ...f,
      isTicketForwarded: isChecked,
      ticketForwardedBy: isChecked ? f.ticketForwardedBy : "",
    }));
  };

  // ── PDF Upload Handler ─────────────────────────────────────────────────────
  const handleUploadViaPDF = async (file) => {
    if (!file) return;
    setPdfError("");
    setPdfUploading(true);
    try {
      const result = await amsTicketApi.uploadViaPDF(file);
      console.log("FULL PDF result:", JSON.stringify(result, null, 2));
      console.log("PDF result keys:", Object.keys(result || {}));

      // ── Map PDF-extracted activities ───────────────────────────────────────
      // FIX: the endpoint returns detail rows under "amsTicketDetails", not
      // "activities" — that's why nothing was ever filling in.
      let mappedActivities = [];
      try {
        const rawDetails = Array.isArray(result.amsTicketDetails)
          ? result.amsTicketDetails
          : Array.isArray(result.aMSTicketDetails)
            ? result.aMSTicketDetails
            : Array.isArray(result.activities)
              ? result.activities
              : [];

        mappedActivities = rawDetails.filter(Boolean).map((act) => {
          // Resolved By: amsTicketDetailUserIds holds a user id — look up the name
          const userId = Array.isArray(act.amsTicketDetailUserIds)
            ? act.amsTicketDetailUserIds[0]
            : null;
          const matchedUser = userId
            ? apiData.itsUsers.find((u) => isEqual(u.value, userId))
            : null;

          return {
            ...act,
            activityType: amsTicketApi.resolveActivityTypeLabel
              ? amsTicketApi.resolveActivityTypeLabel(act.activityType)
              : act.activityType,
            workDoneCode: act.workDoneCodeAndDescription || act.workDoneCode || "",
            resolvedBy: matchedUser?.label || userId || "",
            resolvedById: userId || act.resolvedById || "",
            isLikelyCause: !!act.isLikelyCause,
            likelyCause: !!act.isLikelyCause,
            isActivityDuringWorkingHours: !!act.isActivityDuringWorkingHours,
          };
        });
      } catch (mapErr) {
        console.error("Failed to map PDF activities:", mapErr, result.amsTicketDetails);
      }

      // Merge extracted data into the form — map API response fields to form keys
      setForm((prev) => ({
        ...prev,
        ...(result.receivedAt || result.ticketReceivedDate
          ? { receivedAt: (result.receivedAt || result.ticketReceivedDate || "").slice(0, 16) }
          : {}),
        ...(result.cmsNextTicketNo ? { cmsNextTicketNo: result.cmsNextTicketNo } : {}),
        ...(result.siteName || result.siteId ? { siteName: result.siteId || result.siteName || prev.siteName } : {}),
        ...(result.customer || result.customerUserId ? { customer: result.customerUserId || result.customer || prev.customer } : {}),
        ...(result.ticketAssignedTo || result.ticketAssignedToId ? { ticketAssignedTo: result.ticketAssignedToId || result.ticketAssignedTo || prev.ticketAssignedTo } : {}),
        // FIX: use != null instead of truthiness so value 0 isn't skipped
        ...(result.ticketType != null ? { ticketType: amsTicketApi.resolveTicketTypeLabel(result.ticketType) } : {}),
        ...(result.servicePlannedType != null ? { servicePlannedType: amsTicketApi.resolveServicePlannedTypeLabel(result.servicePlannedType) } : {}),
        ...(result.ticketIncomingChannel != null ? { ticketIncomingChannel: amsTicketApi.resolveTicketIncomingChannelLabel(result.ticketIncomingChannel) } : {}),
        ...(result.incomingChannelEmail || result.emailAddress ? { incomingChannelEmail: result.incomingChannelEmail || result.emailAddress || prev.incomingChannelEmail } : {}),
        ...(result.isTicketForwarded !== undefined ? { isTicketForwarded: !!result.isTicketForwarded } : {}),
        ...(result.ticketForwardedBy || result.ticketForwardedById ? { ticketForwardedBy: result.ticketForwardedById || result.ticketForwardedBy || prev.ticketForwardedBy } : {}),
        ...(result.cmsTicketAddedBy || result.cmsTicketAddedById ? { cmsTicketAddedBy: result.cmsTicketAddedById || result.cmsTicketAddedBy || prev.cmsTicketAddedBy } : {}),
        ...(result.cmsTicketAddedOn || result.cMSTicketAddedOn ? { cmsTicketAddedOn: (result.cmsTicketAddedOn || result.cMSTicketAddedOn || "").slice(0, 16) } : {}),
        ...(result.issueDescription ? { issueDescription: result.issueDescription } : {}),
        ...(result.possibleRootCause ? { possibleRootCause: result.possibleRootCause } : {}),
        ...(result.notes || result.ticketNotes ? { notes: result.notes || result.ticketNotes || prev.notes } : {}),
        ...(result.pre !== undefined ? { pre: !!result.pre } : {}),
        ...(mappedActivities.length > 0 ? { activities: mappedActivities } : {}),
      }));

      toast(localize("SavedSuccessfully"));
    } catch (err) {
      console.error("PDF upload error:", err);
      setPdfError(getLocalizedApiError(err, localize));
    } finally {
      setPdfUploading(false);
    }
  };

  const getNotAfterTodayMessage = () =>
    localize("ThisFieldMustBeLessOrEqual{0}").replace(
      "{0}",
      localize("Today"),
    );

  const getFutureDateError = (value) => {
    if (!value) return "";

    const selectedDate = new Date(value);
    return !Number.isNaN(selectedDate.getTime()) && selectedDate > new Date()
      ? getNotAfterTodayMessage()
      : "";
  };

  const getDateBeforeTicketReceivedError = (value) => {
    if (!form.receivedAt || !value) return "";

    const receivedDate = new Date(form.receivedAt);
    const selectedDate = new Date(value);
    if (
      Number.isNaN(receivedDate.getTime()) ||
      Number.isNaN(selectedDate.getTime()) ||
      selectedDate >= receivedDate
    ) {
      return "";
    }

    return localize("ThisFieldMustBeGreaterThanOrEqual{0}").replace(
      "{0}",
      localize("TicketReceivedDate"),
    );
  };

  const updateValidatedDate = (field, value, selectedDate) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: getFutureDateError(selectedDate || value),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isReadOnly) return;

    const newErrors = {};
    const now = new Date();
    const requiredMessage = (fieldName) =>
      localize("The {0} field is required.").replace("{0}", fieldName);

    if (!form.receivedAt) {
      newErrors.receivedAt = requiredMessage(localize("TicketReceivedDate"));
    } else {
      const receivedDate = new Date(form.receivedAt);
      if (receivedDate > now) {
        newErrors.receivedAt = getNotAfterTodayMessage();
      }
    }

    if (!String(form.cmsNextTicketNo ?? "").trim()) {
      newErrors.cmsNextTicketNo = requiredMessage(localize("CMSNextTicketNo"));
    }

    if (!form.cmsTicketAddedOn) {
      newErrors.cmsTicketAddedOn = requiredMessage(localize("CMSTicketAddedOn"));
    } else {
      const addedOnDate = new Date(form.cmsTicketAddedOn);
      if (addedOnDate > now) {
        newErrors.cmsTicketAddedOn = getNotAfterTodayMessage();
      }
    }

    if (form.isTicketForwarded && !form.ticketForwardedBy) {
      newErrors.ticketForwardedBy = requiredMessage(localize("TicketForwardedBy"));
    }

    if (form.receivedAt) {
      const receivedDate = new Date(form.receivedAt);

      if (form.cmsTicketClosedOn) {
        const cmsTicketClosedOnDate = new Date(form.cmsTicketClosedOn);
        if (cmsTicketClosedOnDate < receivedDate) {
          newErrors.cmsTicketClosedOn = getDateBeforeTicketReceivedError(
            form.cmsTicketClosedOn,
          );
        }
      }

      if (form.serviceClosedDate) {
        const serviceClosedDateDate = new Date(form.serviceClosedDate);
        if (serviceClosedDateDate < receivedDate) {
          newErrors.serviceClosedDate = getDateBeforeTicketReceivedError(
            form.serviceClosedDate,
          );
        }
      }

      if (form.ticketResolutionVerifiedOn) {
        const ticketResolutionVerifiedOnDate = new Date(
          form.ticketResolutionVerifiedOn
        );
        if (ticketResolutionVerifiedOnDate < receivedDate) {
          newErrors.ticketResolutionVerifiedOn = getDateBeforeTicketReceivedError(
            form.ticketResolutionVerifiedOn,
          );
        }
      }
    }

    if (!form.siteName) {
      newErrors.siteName = requiredMessage(localize("SiteName"));
    }
    if (!form.customer) {
      newErrors.customer = requiredMessage(localize("CustomerUserId"));
    }
    if (!form.ticketAssignedTo)
      newErrors.ticketAssignedTo = requiredMessage(localize("TicketAssignedToId"));
    if (!form.ticketType) {
      newErrors.ticketType = requiredMessage(localize("TicketType"));
    }
    if (
      (form.ticketType === "Service Planned" ||
        form.ticketType === 1 ||
        form.ticketType === "1") &&
      !form.servicePlannedType
    ) {
      newErrors.servicePlannedType = requiredMessage(localize("ServicePlannedType"));
    }
    if (!form.issueDescription?.trim())
      newErrors.issueDescription = requiredMessage(localize("IssueDescription"));
    if (!form.notes?.trim()) {
      newErrors.notes = requiredMessage(localize("TicketNotes"));
    }
    if (!form.ticketIncomingChannel) {
      newErrors.ticketIncomingChannel = requiredMessage(localize("TicketIncomingChannel"));
    } else if (
      isEmailIncomingChannel(form.ticketIncomingChannel) &&
      !form.incomingChannelEmail
    ) {
      newErrors.incomingChannelEmail = requiredMessage(localize("EmailAddress"));
    }

    if (activeTab === "Ticket Verification") {
      if (!form.ticketResolutionVerifiedBy) {
        newErrors.ticketResolutionVerifiedBy = requiredMessage(
          localize("TicketResolutionVerifiedById"),
        );
      }
      if (!form.ticketResolutionVerifiedOn) {
        newErrors.ticketResolutionVerifiedOn = requiredMessage(
          localize("TicketResolutionVerifiedOn"),
        );
      }
      if (!form.cmsTicketClosedBy) {
        newErrors.cmsTicketClosedBy = requiredMessage(
          localize("CMSTicketClosedById"),
        );
      }
      if (!form.serviceClosedDate) {
        newErrors.serviceClosedDate = requiredMessage(localize("ServiceClosedDate"));
      }
      if (!form.cmsTicketClosedOn) {
        newErrors.cmsTicketClosedOn = requiredMessage(localize("CMSTicketClosedOn"));
      }
    }

    [
      "ticketResolutionVerifiedOn",
      "cmsTicketClosedOn",
      "serviceClosedDate",
    ].forEach((key) => {
      if (!newErrors[key]) {
        const futureDateError = getFutureDateError(form[key]);
        if (futureDateError) newErrors[key] = futureDateError;
      }
    });

    const errorKeys = Object.keys(newErrors);
    if (errorKeys.length > 0) {
      setErrors(newErrors);
      // Errors only render on their own tab, so jump to a tab that shows one.
      const hasTicketError = errorKeys.some(
        (key) => !VERIFICATION_FIELD_KEYS.includes(key),
      );
      const hasVerificationError = errorKeys.some((key) =>
        VERIFICATION_FIELD_KEYS.includes(key),
      );
      const currentTabHasError =
        activeTab === "Ticket Verification"
          ? hasVerificationError
          : activeTab === "Ticket" && hasTicketError;
      if (!currentTabHasError) {
        setIsTabTransitioning(true);
        setActiveTab(hasTicketError ? "Ticket" : "Ticket Verification");
      }
      return;
    }

    if (!form.activities || form.activities.length === 0) {
      setShowActivityWarning(true);
      return;
    }

    const hasInvalidActivity = form.activities.some(
      (act) => !act.activityType && !act.ActivityType
    );
    if (hasInvalidActivity) {
      toast(requiredMessage(localize("ActivityType")), "error");
      return;
    }

    onSubmit({
      ...form,
      totalDuration: parseFloat(form.totalDuration) || 0,
      activeTab,
    });
  };

  const handleCreateSite = async (data) => {
    setSiteSubmitting(true);
    setSiteSubmitError(null);

    try {
      const createdSite = await sitesApi.create(data);
      const sitesResponse = await sitesApi.getAll({
        page: 1,
        perPage: 1000,
        sortKey: "name",
        sortDir: "asc",
      });
      const refreshedSites =
        sitesResponse?.items ||
        sitesResponse?.data ||
        (Array.isArray(sitesResponse) ? sitesResponse : []);
      const siteNameOptions = refreshedSites
        .filter(Boolean)
        .map((siteItem) => createSiteOption(siteItem, localize))
        .filter((option) => option.label)
        .sort((a, b) => a.label.localeCompare(b.label));
      const selectedSite =
        siteNameOptions.find((option) => option.value === createdSite?.id) ||
        siteNameOptions.find(
          (option) =>
            option.label === data.name &&
            String(option.raw?.ocn || option.raw?.oCN || "") ===
            String(data.ocn || ""),
        );

      setRawSites(refreshedSites);
      setApiData((prev) => ({ ...prev, siteNames: siteNameOptions }));
      if (selectedSite) {
        setForm((prev) => ({ ...prev, siteName: selectedSite.value }));
      }
      setIsSiteModalOpen(false);
      toast(localize("SavedSuccessfully"));
    } catch (error) {
      setSiteSubmitError(error);
    } finally {
      setSiteSubmitting(false);
    }
  };

  const handleSiteChange = (value) => {
    setForm((currentForm) => ({
      ...currentForm,
      siteName: value,
      customer: isEqual(currentForm.siteName, value)
        ? currentForm.customer
        : "",
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      siteName: "",
      customer: "",
    }));
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto custom-scrollbar p-1 md:p-2">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className={`relative my-auto w-full max-w-3xl ${isTabTransitioning ? "overflow-hidden" : ""} bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col font-[Arial]`}
            >
              <div className="flex flex-col gap-0 rounded-t-2xl bg-white dark:bg-slate-900">
                <div className="flex items-center justify-between gap-2 px-4 sm:px-5 pt-3 pb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-pink-50 dark:bg-pink-500/10 flex items-center justify-center text-pink-600 shrink-0">
                      <Ticket size={18} />
                    </div>
                    <div>
                      <nav className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        <span>{localize("AMSTickets")}</span>
                        <span className="text-slate-300 dark:text-slate-700">
                          /
                        </span>
                        <span>{localize("Ticket")}</span>
                      </nav>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-7 truncate">
                        {isEdit && form.cmsNextTicketNo
                          ? `${localize("Ticket")} #${form.cmsNextTicketNo}`
                          : isReadOnly
                            ? `${localize("View")} ${localize("Ticket")}`
                            : isEdit
                              ? `${localize("UpdateButtonText")} ${localize("Ticket")}`
                              : localize("NewAMSTicket")}
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {form.ticketResolutionVerifiedBy ? (
                      <span className="inline-flex h-7 items-center gap-1.5 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-medium select-none">
                        <ShieldCheck size={13} />
                        Verified
                      </span>
                    ) : isEdit ? (
                      <span className="inline-flex h-7 items-center gap-1.5 px-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px] font-medium select-none">
                        <AlertCircle size={13} />
                        Not verified
                      </span>
                    ) : null}
                    {!isReadOnly && currentTabHasErrors && (
                      <button
                        type="button"
                        onClick={() => setErrors({})}
                        className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[10px] font-semibold text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                      >
                        <X size={12} strokeWidth={2.5} />
                        {localize("Clear")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowExitConfirm(true)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    >
                      <X size={18} strokeWidth={2} />
                    </button>
                  </div>
                </div>

                <div className="flex px-4 sm:px-5 gap-5 sm:gap-6 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
                  {[
                    { id: "Ticket", labelKey: "Ticket" },
                    { id: "Activities", labelKey: "Activities" },
                    ...(isReadOnly || canCloseTicket
                      ? [{ id: "Ticket Verification", labelKey: "TicketVerification" }]
                      : []),
                  ].map(
                    (tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          if (tab.id === activeTab) return;
                          setIsTabTransitioning(true);
                          setActiveTab(tab.id);
                        }}
                        className={`relative pb-2 pt-0.5 text-xs font-medium transition-all flex items-center gap-2 group ${activeTab === tab.id
                           ? "text-pink-600"
                           : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                           }`}
                      >
                        {localize(tab.labelKey)}
                        {activeTab === tab.id && (
                          <motion.div
                            layoutId="activeTab"
                            className="absolute -bottom-px left-0 right-0 h-0.5 bg-pink-600 rounded-full"
                          />
                        )}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="flex-1 px-4 sm:px-5 py-3">
                {optionsError && (
                  <div className="max-w-5xl mx-auto mb-6 flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs animate-in fade-in slide-in-from-top-4 duration-500">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <div className="whitespace-pre-line leading-relaxed font-semibold">
                      {optionsError}
                    </div>
                  </div>
                )}
                <AnimatePresence
                  mode="popLayout"
                  initial={false}
                  onExitComplete={() => setIsTabTransitioning(false)}
                >
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    inert={isReadOnly ? true : undefined}
                    aria-disabled={isReadOnly}
                    className={`w-full ${isReadOnly ? "pointer-events-none opacity-90" : ""
                      }`}
                    style={activeTab !== "Ticket" && tabMinHeight ? { minHeight: tabMinHeight } : undefined}
                  >
                    {errors.server && (
                      <PremiumErrorAlert
                        open={!!errors.server}
                        message={errors.server}
                        onClose={() =>
                          setErrors((prev) => ({ ...prev, server: null }))
                        }
                      />
                    )}

                    {activeTab === "Ticket" && (
                      <div ref={ticketContentRef} className="flex flex-col gap-2.5">
                        <div className="grid grid-cols-1 md:grid-cols-3 items-start gap-x-3 gap-y-2">
                        {!isEdit && !isReadOnly && (
                          <div className="md:col-span-3">
                            <Field label="Upload PDF" error={errors.pdfFile}>
                            <div className="relative group/file">
                              <input
                                key={form.pdfFile ? form.pdfFile.name : "empty"}
                                type="file"
                                accept=".pdf"
                                disabled={pdfUploading}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  setField("pdfFile")(e);
                                  handleUploadViaPDF(file);
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                              />
                              <div className={`w-full p-1.5 border border-dashed rounded-xl flex flex-row items-center justify-center gap-2 transition-all ${pdfUploading
                                ? "border-violet-400 bg-violet-50/60 dark:bg-violet-500/5"
                                : pdfError
                                  ? "border-rose-400 bg-rose-50/40 dark:bg-rose-500/5 group-hover/file:border-rose-500"
                                  : form.pdfFile
                                    ? "border-emerald-400 bg-emerald-50/40 dark:bg-emerald-500/5 group-hover/file:border-emerald-500"
                                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 group-hover/file:border-pink-500/50 group-hover/file:bg-pink-500/[0.02]"
                                }`}>
                                {pdfUploading ? (
                                  <>
                                    <div className="w-10 h-10 rounded-2xl bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center">
                                      <Loader2 size={20} className="text-pink-600 animate-spin" />
                                    </div>
                                    <div className="text-center">
                                      <p className="text-sm font-bold text-violet-700 dark:text-violet-400">{localize("LoadingWithThreeDot")}</p>
                                    </div>
                                  </>
                                ) : pdfError ? (
                                  <>
                                    <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-500/15 flex items-center justify-center">
                                      <AlertCircle size={20} className="text-rose-500" />
                                    </div>
                                    <div className="text-center">
                                      <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{localize("Error")}</p>
                                      <p className="text-[11px] font-semibold text-rose-400/80 mt-1 max-w-xs">{pdfError}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">{localize("UploadPDF")}</p>
                                    </div>
                                  </>
                                ) : form.pdfFile ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setForm((prev) => ({ ...prev, pdfFile: null }));
                                      }}
                                      className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                                      title={localize("DeleteButtonText")}
                                    >
                                      <X size={16} />
                                    </button>
                                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
                                      <FileText size={20} className="text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div className="text-center">
                                      <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{form.pdfFile.name}</p>
                                      <p className="text-[11px] font-semibold text-slate-400 mt-1">
                                        {(form.pdfFile.size / 1024 / 1024).toFixed(2)} MB &middot; Click to change
                                      </p>
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-center">
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{localize("UploadPDF")}</p>
                                    <p className="text-[11px] font-semibold text-slate-400 mt-1">PDF format only (Max 10MB) &middot; AI will auto-fill the form</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            </Field>
                          </div>
                        )}

                        <div>
                          <Field
                            label={`${localize("SiteName")} *`}
                            error={errors.siteName}
                          >
                            <div className="flex items-center gap-2">
                              <Combobox
                                value={form.siteName}
                                onChange={handleSiteChange}
                                options={apiData.siteNames}
                                placeholder={
                                  loadingApis
                                    ? localize("LoadingWithThreeDot")
                                    : localize("Search")
                                }
                                loading={loadingApis}
                                error={errors.siteName}
                                wide
                              />
                              {!isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSiteSubmitError(null);
                                    setIsSiteModalOpen(true);
                                  }}
                                  className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-pink-600 rounded-lg hover:bg-pink-600 hover:text-white transition-all shadow-sm active:scale-95 shrink-0"
                                  title={localize("NewSite")}
                                >
                                  <Plus size={18} strokeWidth={2.5} />
                                </button>
                              )}
                            </div>
                          </Field>
                        </div>

                        <div>
                          <Field label={`${localize("CustomerUserId")} *`} error={errors.customer}>
                            <div className="flex items-center gap-2">
                              <Combobox
                                value={form.customer}
                                onChange={setField("customer")}
                                options={apiData.customers}
                                placeholder={
                                  !form.siteName
                                    ? localize("SelectBoxEmptyValueText")
                                    : loadingCustomers
                                      ? localize("LoadingWithThreeDot")
                                      : localize("Search")
                                }
                                loading={loadingCustomers}
                                disabled={
                                  loadingApis ||
                                  loadingCustomers ||
                                  !form.siteName
                                }
                                error={errors.customer}
                                wide
                                menuAlign="right"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomerFormErrors({});
                                  setIsCustomerModalOpen(true);
                                }}
                                disabled={!form.siteName || loadingApis || loadingCustomers}
                                className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-pink-600 rounded-lg hover:bg-pink-600 hover:text-white transition-all shadow-sm active:scale-95 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-100 disabled:hover:text-pink-600 dark:disabled:hover:bg-slate-800"
                                title={localize(
                                  !form.siteName
                                    ? "SelectBoxEmptyValueText"
                                    : "NewCustomer",
                                )}
                              >
                                <Plus size={18} strokeWidth={2.5} />
                              </button>
                            </div>
                          </Field>
                        </div>

                        <Field
                          label={`${localize("TicketAssignedToId")} *`}
                          error={errors.ticketAssignedTo}
                        >
                          <Combobox
                            value={form.ticketAssignedTo}
                            onChange={setField("ticketAssignedTo")}
                            options={withSelectedOption(
                              apiData.itsAssignableUsers,
                              form.ticketAssignedTo,
                              apiData.itsUsers,
                            )}
                            placeholder={
                              loadingApis
                                ? "Loading Users..."
                                : "Search users..."
                            }
                            loading={loadingApis}
                            error={errors.ticketAssignedTo}
                          />
                        </Field>

                        <Field
                          label={`${localize("TicketType")} *`}
                          error={errors.ticketType}
                        >
                          <Combobox
                            value={form.ticketType}
                            onChange={handleTicketTypeChange}
                            options={apiData.ticketTypes}
                            placeholder={
                              loadingApis
                                ? "Loading Types..."
                                : "Select An Option"
                            }
                            loading={loadingApis}
                            error={errors.ticketType}
                          />
                        </Field>

                        {form.ticketType === "Service Planned" && (
                          <div className="animate-in fade-in zoom-in duration-200">
                            <Field
                              label={`${localize("ServicePlannedType")} *`}
                              error={errors.servicePlannedType}
                            >
                              <Combobox
                                value={form.servicePlannedType}
                                onChange={setField("servicePlannedType")}
                                options={apiData.servicePlannedTypes}
                                placeholder={localize("SelectBoxEmptyValueText")}
                                loading={loadingApis}
                                error={errors.servicePlannedType}
                              />
                            </Field>
                          </div>
                        )}

                          <Field
                            label={`${localize("TicketIncomingChannel")} *`}
                            error={errors.ticketIncomingChannel}
                          >
                            <Combobox
                              value={form.ticketIncomingChannel}
                              onChange={setField("ticketIncomingChannel")}
                              options={apiData.incomingChannels}
                              placeholder={localize("SelectBoxEmptyValueText")}
                              loading={loadingApis}
                              error={errors.ticketIncomingChannel}
                            />
                          </Field>

                        {form.ticketIncomingChannel &&
                          isEmailIncomingChannel(form.ticketIncomingChannel) && (

                            <div className="animate-in fade-in zoom-in duration-200">
                              <Field
                                label="Email Address *"
                                error={errors.incomingChannelEmail}
                              >
                                <input
                                  type="email"
                                  value={form.incomingChannelEmail || ""}
                                  onChange={setField("incomingChannelEmail")}
                                  placeholder={localize("EmailAddress")}
                                  className={`${inputClass} ${errors.incomingChannelEmail ? "border-rose-500 text-rose-600" : ""}`}
                                />
                              </Field>
                            </div>
                          )}
                        </div>

                        <section className="border-t border-slate-200 dark:border-slate-800 pt-2.5">
                          <h3 className="flex items-center gap-2 mb-1.5 text-[13px] font-semibold text-slate-900 dark:text-white">
                            <Clock size={15} className="text-slate-500 dark:text-slate-400" />
                            Tracking &amp; ownership
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 items-start gap-x-3 gap-y-2">
                            <Field
                              label={`${localize("TicketReceivedDate")} *`}
                              error={errors.receivedAt}
                            >
                              <div className="relative group/input">
                                <DateTimePicker
                                  value={form.receivedAt}
                                  onChange={(dateStr, date) => {
                                    updateValidatedDate("receivedAt", dateStr, date);
                                  }}
                                  className={`${inputClass} !bg-gray-100 dark:!bg-gray-800 !pr-10 ${errors.receivedAt
                                    ? "border-rose-500 text-rose-600"
                                    : ""
                                    }`}
                                  placeholder="YYYY-MM-DD HH:mm"
                                />
                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-pink-500 transition-colors pointer-events-none">
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                  </svg>
                                </div>
                              </div>
                            </Field>

                            <Field
                              label={`${localize("CMSTicketAddedOn")} *`}
                              error={errors.cmsTicketAddedOn}
                            >
                              <div className="relative group/input">
                                <DateTimePicker
                                  value={form.cmsTicketAddedOn}
                                  onChange={(dateStr, date) => {
                                    updateValidatedDate("cmsTicketAddedOn", dateStr, date);
                                  }}
                                  className={`${inputClass} !bg-gray-100 dark:!bg-gray-800 !pr-10 ${errors.cmsTicketAddedOn
                                    ? "border-rose-500 text-rose-600"
                                    : ""
                                    }`}
                                  placeholder="YYYY-MM-DD HH:mm"
                                />
                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-pink-500 transition-colors pointer-events-none">
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                  </svg>
                                </div>
                              </div>
                            </Field>

                            <Field
                              label={`${localize("CMSNextTicketNo")} *`}
                              error={errors.cmsNextTicketNo}
                            >
                              <input
                                type="text"
                                value={form.cmsNextTicketNo}
                                onChange={setField("cmsNextTicketNo")}
                                className={`${inputClass} !bg-gray-100 dark:!bg-gray-800 ${errors.cmsNextTicketNo ? "border-rose-500 text-rose-600" : ""}`}
                              />
                            </Field>

                            <Field
                              label="Ticket Forwarded By"
                              error={errors.ticketForwardedBy}
                            >
                              <Combobox
                                value={form.ticketForwardedBy}
                                onChange={setField("ticketForwardedBy")}
                                options={withSelectedOption(
                                  apiData.itsAssignableUsers,
                                  form.ticketForwardedBy,
                                  apiData.itsUsers,
                                )}
                                placeholder={localize("Search")}
                                loading={loadingApis}
                                disabled={!form.isTicketForwarded || loadingApis}
                                error={errors.ticketForwardedBy}
                              />
                            </Field>

                            <Field
                              label="CMS Ticket Added By"
                              error={errors.cmsTicketAddedBy}
                            >
                              <Combobox
                                value={form.cmsTicketAddedBy}
                                onChange={setField("cmsTicketAddedBy")}
                                options={withSelectedOption(
                                  apiData.itsAssignableUsers,
                                  form.cmsTicketAddedBy,
                                  apiData.itsUsers,
                                )}
                                placeholder={localize("Search")}
                                loading={loadingApis}
                                error={errors.cmsTicketAddedBy}
                              />
                            </Field>

                            <div>
                              <Field
                                label="Total Duration"
                                error={errors.totalDuration}
                              >
                                <input
                                  type="text"
                                  value={formatDurationHours(form.totalDuration)}
                                  readOnly
                                  className={`${inputClass} !bg-gray-100 dark:!bg-gray-800 cursor-not-allowed`}
                                />
                              </Field>

                            </div>
                          </div>
                        </section>

                        <section className="border-t border-slate-200 dark:border-slate-800 pt-2.5">
                          <h3 className="flex items-center gap-2 mb-1.5 text-[13px] font-semibold text-slate-900 dark:text-white">
                            <AlignLeft size={15} className="text-slate-500 dark:text-slate-400" />
                            Issue &amp; findings
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 items-start gap-x-3 gap-y-2">
                            <div className="md:col-span-1">
                              <Field
                                label={`${localize("IssueDescription")} *`}
                                error={errors.issueDescription}
                              >
                                <textarea
                                  value={form.issueDescription || ""}
                                  onChange={setField("issueDescription")}
                                  rows={2}
                                  className={`${inputClass} !bg-gray-100 dark:!bg-gray-800 ${errors.issueDescription ? "border-rose-500 text-rose-600" : ""}`}
                                />
                              </Field>
                            </div>

                            <div className="md:col-span-1">
                              <Field
                                label="Possible Root Cause"
                                error={errors.possibleRootCause}
                              >
                                <textarea
                                  value={form.possibleRootCause || ""}
                                  onChange={setField("possibleRootCause")}
                                  rows={2}
                                  className={`${inputClass} !bg-gray-100 dark:!bg-gray-800`}
                                />
                              </Field>
                            </div>

                            <div>
                              <Field label={`${localize("TicketNotes")} *`} error={errors.notes}>
                                <textarea
                                  value={form.notes || ""}
                                  onChange={setField("notes")}
                                  rows={2}
                                  className={`${inputClass} !bg-gray-100 dark:!bg-gray-800 ${errors.notes ? "border-rose-500 text-rose-600" : ""}`}
                                />
                              </Field>
                            </div>
                          </div>
                        </section>
                      </div>
                    )}

                    {activeTab === "Activities" && (
                      <div className="flex flex-col h-full space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0">
                              <History size={20} />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                {localize("Activities")}
                              </h3>
                            </div>
                          </div>

                          {!isAdmin && !isReadOnly && (
                            <button
                              type="button"
                              className="app-primary-button inline-flex items-center justify-center px-5 py-2.5 text-xs"
                              onClick={() => {
                                if (!form.receivedAt) {
                                  setShowDateWarning(true);
                                  return;
                                }
                                setActivityToEdit(null);
                                setActivityIndexToEdit(null);
                                setIsActivityModalOpen(true);
                              }}
                            >
                              {localize("AddActivity")}
                            </button>
                          )}
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm flex-1">
                          <div className="overflow-x-auto no-scrollbar h-full">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                  <th className="px-6 py-4 text-[11px] font-semibold text-slate-500">
                                    {localize("Actions")}
                                  </th>
                                  <th className="px-6 py-4 text-[11px] font-semibold text-slate-500">
                                    {localize("ActivityType")}
                                  </th>
                                  <th className="px-6 py-4 text-[11px] font-semibold text-slate-500">
                                    {localize("StartDate")}
                                  </th>
                                  <th className="px-6 py-4 text-[11px] font-semibold text-slate-500">
                                    {localize("EndDate")}
                                  </th>
                                  <th className="px-6 py-4 text-[11px] font-semibold text-slate-500 text-center">
                                    {localize("Duration")}
                                  </th>
                                  <th className="px-6 py-4 text-[11px] font-semibold text-slate-500">
                                    {localize("WorkDoneCode")}
                                  </th>
                                  <th className="px-6 py-4 text-[11px] font-semibold text-slate-500">
                                    {localize("IsLikelyCause")}
                                  </th>
                                  <th className="px-6 py-4 text-[11px] font-semibold text-slate-500">
                                    {localize("ResolvedBy")}
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {!form.activities ||
                                  form.activities.length === 0 ? (
                                  <tr>
                                    <td
                                      colSpan="8"
                                      className="px-6 py-12 text-center text-[11px] font-semibold text-slate-400"
                                    >
                                      {localize("NoDataAvailableInDatatable")}
                                    </td>
                                  </tr>
                                ) : (
                                  form.activities.map((act, idx) => (
                                    <tr
                                      key={idx}
                                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                                    >
                                      <td className="px-6 py-4">
                                        <ActionsMenu
                                          onEdit={() => {
                                            setActivityToEdit(act);
                                            setActivityIndexToEdit(idx);
                                            setIsActivityModalOpen(true);
                                          }}
                                          onDelete={() => {
                                            activitiesDirtyRef.current = true;
                                            setForm((f) => ({
                                              ...f,
                                              activities: f.activities.filter(
                                                (_, activityIndex) => activityIndex !== idx
                                              ),
                                            }));
                                          }}
                                        />
                                      </td>
                                      <td className="px-6 py-4 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                        {act.activityType || "—"}
                                      </td>
                                      <td className="px-6 py-4 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                                        {act.startDate
                                          ? new Date(
                                            act.startDate
                                          ).toLocaleString([], {
                                            dateStyle: "short",
                                            timeStyle: "short",
                                          })
                                          : "—"}
                                      </td>
                                      <td className="px-6 py-4 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                                        {act.endDate
                                          ? new Date(
                                            act.endDate
                                          ).toLocaleString([], {
                                            dateStyle: "short",
                                            timeStyle: "short",
                                          })
                                          : "—"}
                                      </td>
                                      <td className="px-6 py-4 text-[11px] font-bold text-slate-900 dark:text-white text-center">
                                        {Math.round(getActivityDurationMinutes(act))}m
                                      </td>
                                      <td className="px-6 py-4 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                        {act.workDoneCode || "—"}
                                      </td>
                                      <td className="px-6 py-4 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                        {(act.isLikelyCause ?? act.likelyCause) ? "Yes" : "No"}
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

                    {activeTab === "Ticket Verification" && (
                      <div className="flex flex-col space-y-6 max-w-full mx-auto pb-4">
                        <div className="flex items-center gap-4 mb-2">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                            <ShieldCheck size={20} />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                              {localize("TicketVerification")}
                              {form.ticketResolutionVerifiedBy && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50/50 dark:bg-emerald-500/5 text-emerald-500/70 dark:text-emerald-400/70 text-[11px] font-bold tracking-wide border border-emerald-200/50 dark:border-emerald-500/20 cursor-not-allowed select-none">
                                  <Check size={12} strokeWidth={3} />
                                  {localize("TicketVerification")}: {localize("Yes")}
                                </span>
                              )}
                            </h3>
                          </div>
                        </div>
                        <Field
                          label={`${localize("TicketResolutionVerifiedById")} *`}
                          error={errors.ticketResolutionVerifiedBy}
                        >
                          <Combobox
                            value={form.ticketResolutionVerifiedBy}
                            onChange={setField("ticketResolutionVerifiedBy")}
                            options={apiData.itsUsers.filter(
                              (u) =>
                                Number(u.raw?.organizationType) === 2 ||
                                Number(
                                  u.raw?.extraProperties?.organizationType
                                ) === 2
                            )}
                            placeholder={localize("Search")}
                            loading={loadingApis}
                            error={errors.ticketResolutionVerifiedBy}
                          />
                        </Field>

                        <Field
                          label={`${localize("TicketResolutionVerifiedOn")} *`}
                          error={errors.ticketResolutionVerifiedOn}
                        >
                          <div className="flex items-center w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 overflow-hidden focus-within:ring-4 focus-within:ring-pink-500/10 focus-within:border-pink-500 transition-all">
                            <DateTimePicker
                              value={form.ticketResolutionVerifiedOn}
                              onChange={(dateStr) => {
                                setForm((f) => ({
                                  ...f,
                                  ticketResolutionVerifiedOn: dateStr,
                                }));
                                setErrors((e) => ({
                                  ...e,
                                  ticketResolutionVerifiedOn:
                                    getDateBeforeTicketReceivedError(dateStr) ||
                                    getFutureDateError(dateStr),
                                }));
                              }}
                              className="w-full bg-transparent text-sm h-10 px-4 outline-none text-slate-700 dark:text-slate-200"
                              placeholder="YYYY-MM-DD HH:mm"
                            />
                          </div>
                        </Field>

                        <Field
                          label={`${localize("CMSTicketClosedById")} *`}
                          error={errors.cmsTicketClosedBy}
                        >
                          <Combobox
                            value={form.cmsTicketClosedBy}
                            onChange={setField("cmsTicketClosedBy")}
                            options={apiData.itsUsers.filter(
                              (u) =>
                                Number(u.raw?.organizationType) === 2 ||
                                Number(
                                  u.raw?.extraProperties?.organizationType
                                ) === 2
                            )}
                            placeholder={localize("Search")}
                            loading={loadingApis}
                            error={errors.cmsTicketClosedBy}
                          />
                        </Field>

                        <Field
                          label={`${localize("CMSTicketClosedOn")} *`}
                          error={errors.cmsTicketClosedOn}
                        >
                          <div className="flex items-center w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 overflow-hidden focus-within:ring-4 focus-within:ring-pink-500/10 focus-within:border-pink-500 transition-all">
                            <DateTimePicker
                              value={form.cmsTicketClosedOn}
                              onChange={(dateStr) => {
                                setForm((f) => ({
                                  ...f,
                                  cmsTicketClosedOn: dateStr,
                                }));
                                setErrors((e) => ({
                                  ...e,
                                  cmsTicketClosedOn:
                                    getDateBeforeTicketReceivedError(dateStr) ||
                                    getFutureDateError(dateStr),
                                }));
                              }}
                              className="w-full bg-transparent text-sm h-10 px-4 outline-none text-slate-700 dark:text-slate-200"
                              placeholder="YYYY-MM-DD HH:mm"
                            />
                          </div>
                        </Field>

                        <Field
                          label={`${localize("ServiceClosedDate")} *`}
                          error={errors.serviceClosedDate}
                        >
                          <div className="flex items-center w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 overflow-hidden focus-within:ring-4 focus-within:ring-pink-500/10 focus-within:border-pink-500 transition-all">
                            <DateTimePicker
                              value={form.serviceClosedDate}
                              onChange={(dateStr) => {
                                setForm((f) => ({
                                  ...f,
                                  serviceClosedDate: dateStr,
                                }));
                                setErrors((e) => ({
                                  ...e,
                                  serviceClosedDate:
                                    getDateBeforeTicketReceivedError(dateStr) ||
                                    getFutureDateError(dateStr),
                                }));
                              }}
                              className="w-full bg-transparent text-sm h-10 px-4 outline-none text-slate-700 dark:text-slate-200"
                              placeholder="YYYY-MM-DD HH:mm"
                            />
                          </div>
                        </Field>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-2.5 rounded-b-2xl border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900">
                <div className="flex items-center gap-5">
                  {activeTab === "Ticket" && (
                    <>
                      <label className={`inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 ${isReadOnly ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}>
                        <input
                          type="checkbox"
                          checked={form.isTicketForwarded}
                          onChange={handleToggleForwarded}
                          disabled={isReadOnly}
                          className="h-4 w-4 rounded border-slate-300 accent-pink-600"
                        />
                        Forwarded
                      </label>
                      <label className={`inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 ${isReadOnly ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}>
                        <input
                          type="checkbox"
                          checked={form.pre}
                          onChange={setField("pre")}
                          disabled={isReadOnly}
                          className="h-4 w-4 rounded border-slate-300 accent-pink-600"
                        />
                        {localize("IsPRE")}
                      </label>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={
                    isReadOnly ? onClose : () => setShowExitConfirm(true)
                  }
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50 pointer-events-auto"
                >
                  {localize(isReadOnly ? "Close" : "Cancel")}
                </button>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="app-primary-button inline-flex items-center justify-center px-7 py-2 text-xs min-w-[125px] pointer-events-auto"
                  >
                    {submitting
                      ? localize("SavingWithThreeDot")
                      : isClosingTicket
                        ? localize("CloseTicketButtonText")
                        : isEdit
                        ? `${localize("UpdateButtonText")} ${localize("Ticket")}`
                        : `${localize("CreateButtonText")} ${localize("Ticket")}`}
                  </button>
                )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ActivityModal
        open={isActivityModalOpen}
        activity={activityToEdit}
        ticketReceivedDate={form.receivedAt}
        localize={localize}
        onClose={() => {
          setIsActivityModalOpen(false);
          setActivityToEdit(null);
          setActivityIndexToEdit(null);
        }}
        onSubmit={(data) => {
          activitiesDirtyRef.current = true;
          if (activityToEdit) {
            setForm((f) => {
              const targetId = activityToEdit.id;
              const hasStableId =
                targetId &&
                targetId !== "00000000-0000-0000-0000-000000000000";

              return {
                ...f,
                activities: (f.activities || []).map((activity, index) => {
                  const matchesId =
                    hasStableId &&
                    String(activity.id).toLowerCase() ===
                    String(targetId).toLowerCase();
                  const matchesIndex = index === activityIndexToEdit;
                  return matchesId || matchesIndex
                    ? { ...activity, ...data }
                    : activity;
                }),
              };
            });
          } else {
            setForm((f) => ({
              ...f,
              activities: [...(f.activities || []), data],
            }));
          }
          setIsActivityModalOpen(false);
          setActivityToEdit(null);
          setActivityIndexToEdit(null);
        }}
      />

      <SiteModal
        open={isSiteModalOpen}
        onClose={() => {
          setIsSiteModalOpen(false);
          setSiteSubmitError(null);
        }}
        localize={localize}
        onSubmit={handleCreateSite}
        loading={siteSubmitting}
        submitError={siteSubmitError}
        onSubmitErrorClose={() => setSiteSubmitError(null)}
      />

      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 font-[Arial] p-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-xs overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 rounded-t-2xl bg-white dark:bg-slate-900">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {localize("NewCustomer")}
              </h3>
              <button
                type="button"
                onClick={() => { setIsCustomerModalOpen(false); setCustomerForm({ name: "", email: "", phoneNumber: "", isPrimary: false }); setCustomerFormErrors({}); }}
                className="w-8 h-8 rounded-lg bg-white dark:bg-white flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-50 transition-all"
                aria-label={localize("Close")}
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <div className="px-5 py-2 space-y-2">
              {/* Name */}
              <div>
                <label className="text-[11px] leading-4 font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  {localize("Name")} <span className="required-asterisk">*</span>
                </label>
                <input
                  type="text"
                  value={customerForm.name}
                  onChange={(e) => { setCustomerForm(f => ({ ...f, name: e.target.value })); setCustomerFormErrors(err => ({ ...err, name: "", server: "" })); }}
                  placeholder={localize("Name")}
                  className={`${inputClass} !bg-gray-100 dark:!bg-gray-800 ${customerFormErrors.name ? "border-rose-500" : ""}`}
                />
                {customerFormErrors.name && <p className="mt-0.5 text-[10px] font-semibold leading-tight text-rose-600 dark:text-rose-400">{customerFormErrors.name}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="text-[11px] leading-4 font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  {localize("CustomerContactNumber")} <span className="required-asterisk">*</span>
                </label>
                <input
                  type="tel"
                  value={customerForm.phoneNumber}
                  onChange={(e) => { setCustomerForm(f => ({ ...f, phoneNumber: e.target.value })); setCustomerFormErrors(err => ({ ...err, phoneNumber: "", server: "" })); }}
                  placeholder={localize("CustomerContactNumber")}
                  className={`${inputClass} !bg-gray-100 dark:!bg-gray-800 ${customerFormErrors.phoneNumber ? "border-rose-500" : ""}`}
                />
                {customerFormErrors.phoneNumber && <p className="mt-0.5 text-[10px] font-semibold leading-tight text-rose-600 dark:text-rose-400">{customerFormErrors.phoneNumber}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="text-[11px] leading-4 font-semibold text-slate-700 dark:text-slate-300">
                  {localize("EmailAddress")}
                </label>
                <input
                  type="email"
                  value={customerForm.email}
                  onChange={(e) => { setCustomerForm(f => ({ ...f, email: e.target.value })); setCustomerFormErrors(err => ({ ...err, email: "", server: "" })); }}
                  placeholder={localize("EmailAddress")}
                  className={`${inputClass} !bg-gray-100 dark:!bg-gray-800 ${customerFormErrors.email ? "border-rose-500" : ""}`}
                />
                {customerFormErrors.email && <p className="mt-0.5 text-[10px] font-semibold leading-tight text-rose-600 dark:text-rose-400">{customerFormErrors.email}</p>}
              </div>

              <label className="flex w-max cursor-pointer items-center gap-2 py-1">
                <input
                  type="checkbox"
                  checked={customerForm.isPrimary}
                  onChange={(event) =>
                    setCustomerForm((currentForm) => ({
                      ...currentForm,
                      isPrimary: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-pink-600 dark:border-gray-600"
                />
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  {localize("DisplayName:IsPrimary")}
                </span>
              </label>

              {customerFormErrors.server && (
                <p className="mt-0.5 text-[10px] font-semibold leading-tight text-rose-600 dark:text-rose-400">
                  {customerFormErrors.server}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 rounded-b-2xl bg-white dark:bg-slate-900">
              <button
                type="button"
                onClick={() => { setIsCustomerModalOpen(false); setCustomerForm({ name: "", email: "", phoneNumber: "", isPrimary: false }); setCustomerFormErrors({}); }}
                disabled={customerSubmitting}
                className="px-5 py-2 text-xs font-bold rounded-lg border border-gray-300 dark:border-gray-600 text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all disabled:opacity-50"
              >
                {localize("Cancel")}
              </button>
              <button
                type="button"
                disabled={customerSubmitting}
                onClick={async () => {
                  // Validate
                  const errs = {};
                  const requiredMessage = (fieldName) =>
                    localize("The {0} field is required.").replace("{0}", fieldName);
                  if (!customerForm.name.trim()) {
                    errs.name = requiredMessage(localize("Name"));
                  }
                  if (!customerForm.phoneNumber.trim()) {
                    errs.phoneNumber = requiredMessage(localize("CustomerContactNumber"));
                  }
                  if (Object.keys(errs).length > 0) { setCustomerFormErrors(errs); return; }

                  // Auto-generate userName from name (e.g. "John Doe" → "john.doe")
                  const autoUserName = customerForm.name.trim().toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9.]/g, "") + "." + Date.now().toString().slice(-4);

                  // Resolve the siteId from the selected site name
                  const selectedSite =
                    rawSites.find((s) => isEqual(s.id, form.siteName)) ||
                    rawSites.find((s) => isEqual(s.name || s.Name || "", form.siteName));

                  setCustomerSubmitting(true);
                  try {
                    const result = await usersApi.create({
                      name: customerForm.name.trim(),
                      userName: autoUserName,
                      email: customerForm.email.trim() || undefined,
                      phoneNumber: customerForm.phoneNumber.trim(),
                      password: "Customer@123",
                      organizationType: 1,
                      siteId: selectedSite?.id ?? null,
                      isPrimary: customerForm.isPrimary,
                      isActive: true,
                      roleNames: [],
                    });

                    const newCustomer = result?.data ?? result;

                    // Refresh customer list
                    if (selectedSite?.id) {
                      const refreshed = await usersApi.getCustomerUsers(selectedSite.id);
                      const customers = (refreshed?.items || refreshed || [])
                        .map((customer) => createCustomerOption(customer, localize))
                        .filter((c) => c.label)
                        .sort((a, b) =>
                          Number(Boolean(b.badge)) - Number(Boolean(a.badge)) ||
                          a.label.localeCompare(b.label)
                        );
                      setApiData((prev) => ({ ...prev, customers }));
                      // Auto-select the new customer
                      const newId = newCustomer?.id;
                      if (newId) setForm((f) => ({ ...f, customer: newId }));
                    }

                    toast(localize("SavedSuccessfully"), "success");
                    setIsCustomerModalOpen(false);
                    setCustomerForm({ name: "", email: "", phoneNumber: "", isPrimary: false });
                    setCustomerFormErrors({});
                  } catch (err) {
                    const backendErrors = getApiFieldErrors(err);
                    const hasBackendFieldErrors = Object.keys(backendErrors).length > 0;
                    setCustomerFormErrors((prev) => ({
                      ...prev,
                      name: backendErrors.name || prev.name || "",
                      phoneNumber:
                        backendErrors.phoneNumber ||
                        backendErrors.customerContactNumber ||
                        prev.phoneNumber ||
                        "",
                      email:
                        backendErrors.email ||
                        backendErrors.emailAddress ||
                        prev.email ||
                        "",
                      server: hasBackendFieldErrors
                        ? ""
                        : getApiErrorMessage(err) ||
                        localize("DefaultErrorMessage"),
                    }));
                  } finally {
                    setCustomerSubmitting(false);
                  }
                }}
                className="app-primary-button px-6 py-2 text-xs flex items-center gap-2 min-w-[110px] justify-center"
              >
                {customerSubmitting ? (
                  <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />{localize("SavingWithThreeDot")}</>
                ) : localize("Save")}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-xs bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl px-5 py-4 text-center font-[Arial]"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500 mx-auto mb-3">
                <AlertCircle size={20} strokeWidth={2.5} />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                Discard Changes?
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 leading-snug">
                You have unsaved changes. Are you sure you want to exit?
              </p>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Stay
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => {
                    setShowExitConfirm(false);
                    onClose();
                  }}
                  className="flex-1 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-red-600 text-white text-sm font-medium hover:from-rose-600 hover:to-red-700 transition-all shadow-lg shadow-rose-500/20"
                >
                  Discard
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showDateWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-xs bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl px-5 py-4 text-center animate-fade-in font-[Arial]">
            <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-1">
              {localize("Warning")}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 leading-snug">
              {localize("TicketReceivedDateNotPresentErrorMessage")}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDateWarning(false)}
                className="flex-1 py-2 rounded-lg bg-pink-500 text-white text-sm hover:bg-pink-600 transition-all shadow-lg shadow-pink-500/20 font-medium"
              >
                {localize("Ok")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showActivityWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-xs bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl px-5 py-4 text-center animate-fade-in font-[Arial]">
            <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-1">
              {localize("Warning")}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 leading-snug">
              {localize("ActivityNotAddedErrorMessage")}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowActivityWarning(false)}
                className="flex-1 py-2 rounded-lg bg-pink-500 text-white text-sm hover:bg-pink-600 transition-all shadow-lg shadow-pink-500/20 font-medium"
              >
                {localize("Ok")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
