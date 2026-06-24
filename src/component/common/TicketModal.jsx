import { useState, useEffect, useRef } from "react";
import {
  AlertCircle,
  X,
  Search,
  ChevronDown,
  Check,
  Plus,
  Activity,
  Ticket,
  ShieldCheck,
  History,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PremiumErrorAlert from "./PremiumErrorAlert";
import SiteModal from "./SiteModal";
import ActivityModal from "./ActivityModal";
import { ActionsMenu } from "./ResourcePage";
import { useToast } from "./ToastContext";
import { useAuth } from "../../context/AuthContextHook";

import { usersApi } from "../../services/api/users";
import { sitesApi } from "../../services/api/sites";
import { amsTicketApi } from "../../services/api/amsTicketApi";
import codeDetailsApi from "../../services/api/CodeDetails";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";

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

// ─── Robust string-based equality ──────────────────────────────────────────
// Converts both sides to lowercase strings before comparing so that
// number/string type mismatches (e.g. 1 vs "1") or UUID casing differences
// never cause a false negative.
const isEqual = (v1, v2) => {
  if (v1 == null || v2 == null) return v1 === v2;
  return String(v1).toLowerCase().trim() === String(v2).toLowerCase().trim();
};

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
      return matchById.label || String(matchById.value ?? matchById);
    }

    // Case 2: stored value is a display name string — find by opt.label
    const matchByLabel = opts.find(
      (opt) => String(opt.label || opt).toLowerCase().trim() === valStr
    );
    if (matchByLabel) {
      return matchByLabel.label || String(matchByLabel.value ?? matchByLabel);
    }

    // Options are still loading or empty — show the value
    if (loading || opts.length === 0) return value;

    // Options loaded but nothing matched.
    // Return the typed value to allow manual text input.
    return value;
  };

  const displayLabel = resolveDisplayLabel();
  const hasResolvedValue = displayLabel != null && displayLabel !== "" && displayLabel !== placeholder;

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        onClick={() => {
          if (!disabled && !open) setOpen(true);
        }}
        className={`${inputClass} flex items-center justify-between ${disabled
          ? "opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/30"
          : "cursor-text"
          } ${error ? "border-rose-500" : ""}`}
      >
        <div className="flex items-center gap-3 w-full truncate">
          <Search
            size={14}
            className={`text-slate-400 shrink-0 group-focus-within:text-pink-500 transition-colors ${!hasResolvedValue ? "opacity-50" : "opacity-100"
              }`}
          />
          <input
            type="text"
            className={`w-full bg-transparent outline-none truncate ${!hasResolvedValue
              ? "text-slate-600/80"
              : "text-black dark:text-white"
              }`}
            value={displayLabel === placeholder ? "" : displayLabel}
            placeholder={placeholder}
            disabled={disabled}
            onChange={(e) => {
              onChange(e.target.value);
              setSearch(e.target.value);
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
              if (!disabled) setOpen(!open);
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
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Loading...
                  </span>
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="p-10 text-center flex flex-col items-center gap-1.5">
                  <AlertCircle size={20} className="text-slate-300" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
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
                        <span className="truncate">{label}</span>
                        {isSelected && (
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
  totalDuration: "",
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

export default function TicketModal({
  open,
  onClose,
  onSave,
  onSubmit: onSubmitProp,
  ticket = null,
  submitting = false,
  viewMode = false,
}) {
  const onSubmit = onSave || onSubmitProp;
  const isEdit = !!ticket;
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase().includes("admin");

  const [activeTab, setActiveTab] = useState("Ticket");
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  const [loadingApis, setLoadingApis] = useState(false);
  const [optionsError, setOptionsError] = useState(null);
  const [apiData, setApiData] = useState({
    siteNames: [],
    customers: [],
    assignees: [],
    itsUsers: [],
    ticketTypes: [],
    servicePlannedTypes: [],
    incomingChannels: [],
  });

  const [rawSites, setRawSites] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityToEdit, setActivityToEdit] = useState(null);

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showDateWarning, setShowDateWarning] = useState(false);
  const [showActivityWarning, setShowActivityWarning] = useState(false);

  // ── Reset / seed form whenever the modal opens or the ticket changes ──────
  useEffect(() => {
    if (!open) {
      setForm({ ...EMPTY });
      setErrors({});
      setActiveTab("Ticket");
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

    if (ticket) {



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
          ticket.ticketResolutionVerifiedById ||
          ticket.ticketResolutionVerifiedBy ||
          "",
        cmsTicketClosedBy:
          ticket.cmsTicketClosedById || ticket.cmsTicketClosedBy || "",
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
        ticketResolutionVerifiedOn: ticket.ticketResolutionVerifiedOn
          ? ticket.ticketResolutionVerifiedOn.slice(0, 16)
          : "",
        cmsTicketClosedOn: ticket.cmsTicketClosedOn
          ? ticket.cmsTicketClosedOn.slice(0, 16)
          : ticket.cMSTicketClosedOn
            ? ticket.cMSTicketClosedOn.slice(0, 16)
            : "",
        serviceClosedDate: ticket.serviceClosedDate
          ? ticket.serviceClosedDate.slice(0, 16)
          : "",
        isTicketForwarded: !!(
          ticket.ticketForwardedById ||
          ticket.ticketForwardedBy ||
          ticket.isTicketForwarded
        ),
        activities: ticket.activities || ticket.amsTicketDetails || [],
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
              fullData.ticketResolutionVerifiedById ||
              fullData.ticketResolutionVerifiedBy ||
              prev.ticketResolutionVerifiedBy,
            cmsTicketClosedBy:
              fullData.cmsTicketClosedById ||
              fullData.cmsTicketClosedBy ||
              prev.cmsTicketClosedBy,
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
            ticketResolutionVerifiedOn: fullData.ticketResolutionVerifiedOn
              ? fullData.ticketResolutionVerifiedOn.slice(0, 16)
              : prev.ticketResolutionVerifiedOn,
            cmsTicketClosedOn: fullData.cmsTicketClosedOn
              ? fullData.cmsTicketClosedOn.slice(0, 16)
              : fullData.cMSTicketClosedOn
                ? fullData.cMSTicketClosedOn.slice(0, 16)
                : prev.cmsTicketClosedOn,
            serviceClosedDate: fullData.serviceClosedDate
              ? fullData.serviceClosedDate.slice(0, 16)
              : prev.serviceClosedDate,
            isTicketForwarded: !!(
              fullData.ticketForwardedById ||
              fullData.ticketForwardedBy ||
              fullData.isTicketForwarded
            ),
            activities:
              fullData.amsTicketDetails && fullData.amsTicketDetails.length > 0
                ? fullData.amsTicketDetails.map((act) => ({
                  ...act,
                  activityType: amsTicketApi.resolveActivityTypeLabel
                    ? amsTicketApi.resolveActivityTypeLabel(act.activityType)
                    : act.activityType,
                  isLikelyCause: !!act.isLikelyCause,
                  isActivityDuringWorkingHours:
                    !!act.isActivityDuringWorkingHours,
                }))
                : fullData.activities || prev.activities || [],
          }));
        })
        .catch((err) =>
          console.error("Failed to fetch secure ticket record:", err)
        );
    } else {
      setForm({ ...EMPTY });
    }
  }, [open, isEdit, user]);

  // Pre-fill ticketAssignedTo with current user when creating a new ticket
  useEffect(() => {
    if (open && !isEdit && user?.id) {
      setForm((prev) => ({
        ...prev,
        ticketAssignedTo: user.id,
      }));
    }
  }, [open, isEdit, user]);

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

    Promise.all([
      sitesApi.getAll({ perPage: 100, page: 1 }).catch((err) => {
        console.error(
          "[TicketModal] Failed to fetch sites:",
          err?.response?.data || err.message
        );
        setOptionsError(
          "Some form options couldn't be loaded due to a permissions issue. \nPlease contact your administrator or try logging out and back in."
        );
        return { items: [] };
      }),
      usersApi
        .getUsersList({
          organizationTypes: [2, 3],
          onlyLoadCurrentUser: false,
        })
        .catch((err) => {
          console.error("[TicketModal] Failed to fetch users:", err);
          setOptionsError(
            "Some form options couldn't be loaded due to a permissions issue. \nPlease contact your administrator or try logging out and back in."
          );
          return [];
        }),
      usersApi
        .getUsersList({ onlyLoadCurrentUser: true })
        .catch((err) => {
          console.error("[TicketModal] Failed to fetch current user:", err);
          setOptionsError(
            "Some form options couldn't be loaded due to a permissions issue. \nPlease contact your administrator or try logging out and back in."
          );
          return [];
        }),
      codeDetailsApi
        .getListByLookupCodes({
          lookupCodes: [
            "TicketType",
            "TicketIncomingChannel",
            "ServicePlannedType",
          ],
        })
        .catch((err) => {
          console.error("[TicketModal] Failed to fetch lookups:", err);
          setOptionsError(
            "Some form options couldn't be loaded due to a permissions issue. \nPlease contact your administrator or try logging out and back in."
          );
          return {};
        }),
    ])
      .then(([sitesRes, itsUsersRes, currentUserRes, lookupsRes]) => {
        const fetchedSites =
          sitesRes?.items ||
          sitesRes?.data ||
          (Array.isArray(sitesRes) ? sitesRes : []);
        setRawSites(fetchedSites);

        const ticketTypes = (lookupsRes["TicketType"] || [])
          .map((item) => item.description || item.newCode)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));

        const servicePlannedTypes = (lookupsRes["ServicePlannedType"] || [])
          .map((item) => item.description || item.newCode)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));

        const incomingChannels = (lookupsRes["TicketIncomingChannel"] || [])
          .map((item) => item.description || item.newCode)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));

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

        const siteNameOptions = fetchedSites
          .filter(Boolean)
          .map((s) => ({
            label: s.name || s.Name || "",
            value: s.id,
            raw: s,
          }))
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
        }));

        setApiData((prev) => ({
          ...prev,
          siteNames: siteNameOptions,
          itsUsers: itsUsersList,
          ticketTypes:
            ticketTypes.length > 0
              ? ticketTypes
              : [
                "Service Planned",
                "Service Demand",
                "Complaint",
                "Inquiry",
              ].sort((a, b) => a.localeCompare(b)),
          servicePlannedTypes:
            servicePlannedTypes.length > 0
              ? servicePlannedTypes
              : [
                "Report",
                "Rule",
                "Installation",
                "Configuration",
                "TBS",
                "Other"

              ].sort((a, b) => a.localeCompare(b)),
          incomingChannels:
            incomingChannels.length > 0
              ? incomingChannels
              : [
                "Phone Call",
                "Email",
                "Whatsapp/viber",
                "Teams"].sort((a, b) =>
                  a.localeCompare(b)
                ),
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
  }, [open, ticket]);

  // ── Load customers whenever the selected site changes ─────────────────────
  useEffect(() => {
    if (!form.siteName) {
      setApiData((prev) => ({ ...prev, customers: [] }));
      return;
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
          const customers = (res?.items || res || [])
            .map((c) => ({
              label: c.name || c.userName || "",
              value: c.id,
            }))
            .filter((c) => c.label)
            .sort((a, b) => a.label.localeCompare(b.label));

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
          setApiData((prev) => ({ ...prev, customers: [] }));
        })
        .finally(() => {
          setLoadingCustomers(false);
        });
    }
  }, [form.siteName, rawSites]);

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
    if (activities.length === 0) {
      // Avoid unnecessary updates if already empty/zero
      setForm((prev) => (prev.totalDuration !== "0.00" && prev.totalDuration !== "" ? { ...prev, totalDuration: "0.00" } : prev));
      return;
    }

    let totalMinutes = 0;
    for (const act of activities) {
      totalMinutes += parseFloat(act.durationMinutes) || 0;
    }

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

  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {};
    const now = new Date();

    if (!form.receivedAt) {
      newErrors.receivedAt = "Ticket Received Date is required";
    } else {
      const receivedDate = new Date(form.receivedAt);
      if (receivedDate > now) {
        newErrors.receivedAt =
          "Ticket Received Date can not be more than today's date";
      }
    }

    if (form.cmsTicketAddedOn) {
      const addedOnDate = new Date(form.cmsTicketAddedOn);
      if (addedOnDate > now) {
        newErrors.cmsTicketAddedOn =
          "CMS Ticket Added On can not be more than today's date";
      }
    }

    if (form.isTicketForwarded && !form.ticketForwardedBy) {
      newErrors.ticketForwardedBy = "Ticket Forwarded By is required";
    }

    if (form.receivedAt) {
      const receivedDate = new Date(form.receivedAt);

      if (form.cmsTicketClosedOn) {
        const cmsTicketClosedOnDate = new Date(form.cmsTicketClosedOn);
        if (cmsTicketClosedOnDate < receivedDate) {
          newErrors.cmsTicketClosedOn =
            "CMS Ticket Closed On can NOT be lesser than Ticket Received Date";
        }
      }

      if (form.serviceClosedDate) {
        const serviceClosedDateDate = new Date(form.serviceClosedDate);
        if (serviceClosedDateDate < receivedDate) {
          newErrors.serviceClosedDate =
            "Service Closed Date can NOT be lesser than Ticket Received Date";
        }
      }

      if (form.ticketResolutionVerifiedOn) {
        const ticketResolutionVerifiedOnDate = new Date(
          form.ticketResolutionVerifiedOn
        );
        if (ticketResolutionVerifiedOnDate < receivedDate) {
          newErrors.ticketResolutionVerifiedOn =
            "Ticket Resolution Verified On can NOT be lesser than Ticket Received Date";
        }
      }
    }

    if (!form.siteName) newErrors.siteName = "Site Name is required";
    if (!form.customer) newErrors.customer = "Customer is required";
    if (!form.ticketAssignedTo)
      newErrors.ticketAssignedTo = "Assigned To is required";
    if (!form.ticketType) newErrors.ticketType = "Ticket Type is required";
    if (
      (form.ticketType === "Service Planned" ||
        form.ticketType === 2 ||
        form.ticketType === "2") &&
      !form.servicePlannedType
    ) {
      newErrors.servicePlannedType = "Service Planned Type is required";
    }
    if (!form.issueDescription)
      newErrors.issueDescription = "Issue Description is required";
    if (!form.ticketIncomingChannel) {
      newErrors.ticketIncomingChannel = "Channel is required";
    } else if (
      (String(form.ticketIncomingChannel).toLowerCase().includes("email") ||
        form.ticketIncomingChannel === 2 ||
        form.ticketIncomingChannel === "2") &&
      !form.incomingChannelEmail
    ) {
      newErrors.incomingChannelEmail = "Email Address is required";
    }

    if (activeTab === "Ticket Verification") {
      if (!form.serviceClosedDate) {
        newErrors.serviceClosedDate = "Service Closed Date is required";
      }
      if (!form.cmsTicketClosedOn) {
        newErrors.cmsTicketClosedOn = "CMS Ticket Closed On is required";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast("Please fix the errors before submitting.", "error");
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
      toast(
        "Every activity detail must have an Activity Type selected.",
        "error"
      );
      return;
    }

    onSubmit({
      ...form,
      totalDuration: parseFloat(form.totalDuration) || 0,
      activeTab,
    });
  };

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
              className="relative w-full max-w-6xl bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-auto max-h-[95vh] overflow-hidden font-[Arial]"
            >
              <div className="flex flex-col gap-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="flex items-center justify-between px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-pink-50 dark:bg-pink-500/10 flex items-center justify-center text-pink-600 shrink-0">
                      <Ticket size={24} />
                    </div>
                    <div>
                      <nav className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 dark:text-slate-500 mb-0.5">
                        <span>AMS</span>
                        <span className="text-slate-300 dark:text-slate-700">
                          /
                        </span>
                        <span className="text-pink-600">Tickets</span>
                      </nav>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        {isEdit ? "Update Ticket" : "New AMS Ticket"}
                        {form.ticketResolutionVerifiedBy ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50/50 dark:bg-emerald-500/5 text-emerald-500/80 dark:text-emerald-400/80 text-[11px] font-bold tracking-wide uppercase border border-emerald-200/50 dark:border-emerald-500/20 select-none pointer-events-none">
                            <Check size={12} strokeWidth={3} />
                            Verified
                          </span>
                        ) : isEdit ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50/50 dark:bg-rose-500/5 text-rose-500/80 dark:text-rose-400/80 text-[11px] font-bold tracking-wide uppercase border border-rose-200/50 dark:border-rose-500/20 select-none pointer-events-none">
                            <X size={12} strokeWidth={3} />
                            Non-verified
                          </span>
                        ) : null}
                      </h2>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowExitConfirm(true)}
                    className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all border border-slate-200 dark:border-slate-700"
                  >
                    <X size={20} strokeWidth={2} />
                  </button>
                </div>

                <div className="flex px-8 gap-10">
                  {["Ticket", "Activities", "Ticket Verification"].map(
                    (tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`relative py-4 text-[12px] font-semibold transition-all flex items-center gap-2 group ${activeTab === tab
                          ? "text-pink-600"
                          : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                          }`}
                      >
                        {tab}
                        {activeTab === tab && (
                          <motion.div
                            layoutId="activeTab"
                            className="absolute bottom-0 left-0 right-0 h-1 bg-pink-600 rounded-t-full shadow-[0_-4px_12px_rgba(236,72,153,0.2)]"
                          />
                        )}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="overflow-y-auto no-scrollbar px-8 py-8">
                {optionsError && (
                  <div className="max-w-5xl mx-auto mb-6 flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs animate-in fade-in slide-in-from-top-4 duration-500">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <div className="whitespace-pre-line leading-relaxed font-semibold">
                      {optionsError}
                    </div>
                  </div>
                )}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className={`max-w-5xl mx-auto ${viewMode ? "pointer-events-none opacity-90" : ""
                      }`}
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
                      <div className="flex flex-col space-y-8">
                        <div className="flex items-center gap-4 mb-2">
                          <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-500/10 flex items-center justify-center text-pink-600 shrink-0">
                            <Activity size={20} />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                              Ticket Information
                            </h3>

                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                          <div className="md:col-span-2">
                            <Field label="Upload PDF" error={errors.pdfFile}>
                              <div className="relative group/file">
                                <input
                                  key={
                                    form.pdfFile ? form.pdfFile.name : "empty"
                                  }
                                  type="file"
                                  accept=".pdf"
                                  onChange={setField("pdfFile")}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="w-full p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 flex flex-col items-center justify-center gap-2 transition-all group-hover/file:border-pink-500/50 group-hover/file:bg-pink-500/[0.02]">
                                  <div className="text-center">
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                      {form.pdfFile
                                        ? form.pdfFile.name
                                        : "Select PDF Document"}
                                    </p>
                                    <p className="text-[11px] font-semibold text-slate-400 mt-1">
                                      {form.pdfFile
                                        ? `${(
                                          form.pdfFile.size /
                                          1024 /
                                          1024
                                        ).toFixed(2)} MB`
                                        : "PDF format only (Max 10MB)"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </Field>
                          </div>

                          <Field
                            label="Ticket Received Date Time *"
                            error={errors.receivedAt}
                          >
                            <div className="relative group/input">
                              <Flatpickr
                                data-enable-time
                                value={form.receivedAt}
                                onChange={(date, dateStr) => {
                                  setForm((f) => ({
                                    ...f,
                                    receivedAt: dateStr,
                                  }));
                                  if (errors.receivedAt) {
                                    setErrors((e) => ({
                                      ...e,
                                      receivedAt: "",
                                    }));
                                  }
                                }}
                                options={{
                                  enableTime: true,
                                  dateFormat: "Y-m-d\\TH:i",
                                  time_24hr: true,
                                  allowInput: true,
                                }}
                                className={`${inputClass} !pr-10 ${errors.receivedAt
                                  ? "border-rose-500 text-rose-600"
                                  : ""
                                  }`}
                                placeholder="YYYY-MM-DD HH:MM"
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
                            label="CMS Next Ticket No *"
                            error={errors.cmsNextTicketNo}
                          >
                            <input
                              type="text"
                              value={form.cmsNextTicketNo}
                              onChange={setField("cmsNextTicketNo")}
                              className={inputClass}
                            />
                          </Field>

                          <div className="md:col-span-2">
                            <Field
                              label="Site Name *"
                              error={errors.siteName}
                            >
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
                                  loading={loadingApis}
                                  disabled={loadingApis}
                                  error={errors.siteName}
                                />
                                {!isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => setIsSiteModalOpen(true)}
                                    className="w-[42px] h-[42px] flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-pink-600 rounded-xl hover:bg-pink-600 hover:text-white transition-all shadow-sm active:scale-95 shrink-0"
                                    title="Add New Site"
                                  >
                                    <Plus size={18} strokeWidth={2.5} />
                                  </button>
                                )}
                              </div>
                            </Field>
                          </div>

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
                                  loading={loadingCustomers}
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
                                    className="w-[42px] h-[42px] flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-pink-600 rounded-xl hover:bg-pink-600 hover:text-white transition-all shadow-sm active:scale-95 shrink-0"
                                    title="Add New Customer"
                                  >
                                    <Plus size={18} strokeWidth={2.5} />
                                  </button>
                                )}
                              </div>
                            </Field>
                          </div>

                          <Field
                            label="Ticket Assigned To *"
                            error={errors.ticketAssignedTo}
                          >
                            <Combobox
                              value={form.ticketAssignedTo}
                              onChange={setField("ticketAssignedTo")}
                              options={apiData.itsUsers}
                              placeholder={
                                loadingApis
                                  ? "Loading Users..."
                                  : "Search users..."
                              }
                              loading={loadingApis}
                              disabled={loadingApis}
                              error={errors.ticketAssignedTo}
                            />
                          </Field>

                          <Field
                            label="Ticket Type *"
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
                              disabled={loadingApis}
                              error={errors.ticketType}
                            />
                          </Field>

                          {form.ticketType === "Service Planned" && (
                            <div className="animate-in fade-in zoom-in duration-200">
                              <Field
                                label="Service Planned Type *"
                                error={errors.servicePlannedType}
                              >
                                <Combobox
                                  value={form.servicePlannedType}
                                  onChange={setField("servicePlannedType")}
                                  options={apiData.servicePlannedTypes}
                                  placeholder="Select An Option"
                                  loading={loadingApis}
                                  disabled={loadingApis}
                                  error={errors.servicePlannedType}
                                />
                              </Field>
                            </div>
                          )}

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
                                  loading={loadingApis}
                                  error={errors.ticketIncomingChannel}
                                />
                              </Field>
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer w-max mb-2 p-1 px-3 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                              <div className="relative group/toggle">
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={form.isTicketForwarded}
                                  onChange={handleToggleForwarded}
                                />
                                <div
                                  className={`block w-10 h-6 rounded-full transition-all duration-300 ${form.isTicketForwarded
                                    ? "bg-pink-600 shadow-lg shadow-pink-500/20"
                                    : "bg-slate-300 dark:bg-slate-700"
                                    }`}
                                />
                                <motion.div
                                  animate={{
                                    x: form.isTicketForwarded ? 18 : 2,
                                  }}
                                  className="absolute left-0 top-1 bg-white w-4 h-4 rounded-full shadow-md transition-all"
                                />
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                Forwarded
                              </span>
                            </label>
                          </div>

                          <Field
                            label="Ticket Forwarded By"
                            error={errors.ticketForwardedBy}
                          >
                            <Combobox
                              value={form.ticketForwardedBy}
                              onChange={setField("ticketForwardedBy")}
                              options={apiData.itsUsers}
                              placeholder="Search users..."
                              loading={loadingApis}
                              disabled={!form.isTicketForwarded || loadingApis}
                              error={errors.ticketForwardedBy}
                            />
                          </Field>
                          {console.log("channel at render:", form.ticketIncomingChannel, typeof form.ticketIncomingChannel)}

                          {form.ticketIncomingChannel &&
                            (String(form.ticketIncomingChannel).toLowerCase().includes("email") ||
                              form.ticketIncomingChannel === 2 ||
                              form.ticketIncomingChannel === "2") && (

                              <div className="animate-in fade-in zoom-in duration-200">
                                <Field
                                  label="Email Address *"
                                  error={errors.incomingChannelEmail}
                                >
                                  <input
                                    type="email"
                                    value={form.incomingChannelEmail || ""}
                                    onChange={setField("incomingChannelEmail")}
                                    placeholder="Enter Email Address"
                                    className={`${inputClass} ${errors.incomingChannelEmail ? "border-rose-500 text-rose-600" : ""}`}
                                  />
                                </Field>
                              </div>
                            )}

                          <Field
                            label="CMS Ticket Added By"
                            error={errors.cmsTicketAddedBy}
                          >
                            <Combobox
                              value={form.cmsTicketAddedBy}
                              onChange={setField("cmsTicketAddedBy")}
                              options={apiData.itsUsers}
                              placeholder="Search users..."
                              loading={loadingApis}
                              disabled={loadingApis}
                              error={errors.cmsTicketAddedBy}
                            />
                          </Field>

                          <Field
                            label="CMS Ticket Added On *"
                            error={errors.cmsTicketAddedOn}
                          >
                            <div className="relative group/input">
                              <Flatpickr
                                data-enable-time
                                value={form.cmsTicketAddedOn}
                                onChange={(date, dateStr) => {
                                  setForm((f) => ({
                                    ...f,
                                    cmsTicketAddedOn: dateStr,
                                  }));
                                  if (errors.cmsTicketAddedOn) {
                                    setErrors((e) => ({
                                      ...e,
                                      cmsTicketAddedOn: "",
                                    }));
                                  }
                                }}
                                options={{
                                  enableTime: true,
                                  dateFormat: "Y-m-d\\TH:i",
                                  time_24hr: true,
                                  allowInput: true,
                                }}
                                className={`${inputClass} !pr-10 ${errors.cmsTicketAddedOn
                                  ? "border-rose-500 text-rose-600"
                                  : ""
                                  }`}
                                placeholder="YYYY-MM-DD HH:MM"
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

                          <div className="md:col-span-1">
                            <Field
                              label="Issue Description *"
                              error={errors.issueDescription}
                            >
                              <textarea
                                value={form.issueDescription || ""}
                                onChange={setField("issueDescription")}
                                rows={3}
                                className={inputClass}
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
                                rows={3}
                                className={inputClass}
                              />
                            </Field>
                          </div>

                          <div className="md:col-span-2">
                            <Field label="Notes *" error={errors.notes}>
                              <textarea
                                value={form.notes || ""}
                                onChange={setField("notes")}
                                rows={2}
                                className={inputClass}
                              />
                            </Field>
                          </div>

                          <div className="md:col-span-2">
                            <Field
                              label="Total Duration (Hours)"
                              error={errors.totalDuration}
                            >
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={form.totalDuration}
                                readOnly
                                className={`${inputClass} bg-slate-100 dark:bg-slate-800/40 cursor-not-allowed`}
                              />
                            </Field>
                          </div>

                          <div className="md:col-span-2">
                            <label className="flex items-center gap-3 cursor-pointer w-max p-1 px-4 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                              <div className="relative group/toggle">
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={form.pre}
                                  onChange={setField("pre")}
                                />
                                <div
                                  className={`block w-10 h-6 rounded-full transition-all duration-300 ${form.pre
                                    ? "bg-pink-600 shadow-[0_0_15px_rgba(219,39,119,0.3)]"
                                    : "bg-slate-300 dark:bg-slate-700"
                                    }`}
                                />
                                <motion.div
                                  animate={{ x: form.pre ? 18 : 2 }}
                                  className="absolute left-0 top-1 bg-white w-4 h-4 rounded-full shadow-md transition-all"
                                />
                              </div>
                              <span className="text-[12px] font-semibold text-slate-600 dark:text-slate-400">
                                PRE
                              </span>
                            </label>
                          </div>
                        </div>
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
                                Ticket Activities
                              </h3>
                            </div>
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
                                setIsActivityModalOpen(true);
                              }}
                            >
                              Add Activity
                            </button>
                          )}
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm flex-1">
                          <div className="overflow-x-auto no-scrollbar h-full">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                  <th className="px-6 py-4 text-[11px] font-semibold text-slate-500">
                                    Actions
                                  </th>
                                  <th className="px-6 py-4 text-[11px] font-semibold text-slate-500">
                                    Activity Type
                                  </th>
                                  <th className="px-6 py-4 text-[11px] font-semibold text-slate-500">
                                    Start Date
                                  </th>
                                  <th className="px-6 py-4 text-[11px] font-semibold text-slate-500">
                                    End Date
                                  </th>
                                  <th className="px-6 py-4 text-[11px] font-semibold text-slate-500 text-center">
                                    Duration
                                  </th>
                                  <th className="px-6 py-4 text-[11px] font-semibold text-slate-500">
                                    Work Done Code
                                  </th>
                                  <th className="px-6 py-4 text-[11px] font-semibold text-slate-500">
                                    Likely Cause
                                  </th>
                                  <th className="px-6 py-4 text-[11px] font-semibold text-slate-500">
                                    Resolved By
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
                                        <ActionsMenu
                                          onEdit={() => {
                                            setActivityToEdit(act);
                                            setIsActivityModalOpen(true);
                                          }}
                                          onDelete={() => {
                                            setForm((f) => ({
                                              ...f,
                                              activities: f.activities.filter(
                                                (a) => a !== act
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
                                        {act.durationMinutes || "0"}m
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

                    {activeTab === "Ticket Verification" && (
                      <div className="flex flex-col space-y-6 max-w-full mx-auto pb-4">
                        <div className="flex items-center gap-4 mb-2">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                            <ShieldCheck size={20} />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                              Ticket Verification
                              {form.ticketResolutionVerifiedBy && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50/50 dark:bg-emerald-500/5 text-emerald-500/70 dark:text-emerald-400/70 text-[11px] font-bold tracking-wide uppercase border border-emerald-200/50 dark:border-emerald-500/20 cursor-not-allowed select-none">
                                  <Check size={12} strokeWidth={3} />
                                  Verified
                                </span>
                              )}
                            </h3>
                          </div>
                        </div>
                        <Field
                          label="Ticket Resolution Verified By"
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
                            placeholder="Search users..."
                            loading={loadingApis}
                            disabled={loadingApis}
                            error={errors.ticketResolutionVerifiedBy}
                          />
                        </Field>

                        <Field
                          label="Ticket Resolution Verified On By Sureze *"
                          error={errors.ticketResolutionVerifiedOn}
                        >
                          <div className="flex items-center w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden focus-within:ring-4 focus-within:ring-pink-500/10 focus-within:border-pink-500 transition-all">
                            <Flatpickr
                              data-enable-time
                              value={form.ticketResolutionVerifiedOn}
                              onChange={(date, dateStr) => {
                                setForm((f) => ({
                                  ...f,
                                  ticketResolutionVerifiedOn: dateStr,
                                }));
                                if (errors.ticketResolutionVerifiedOn) {
                                  setErrors((e) => ({
                                    ...e,
                                    ticketResolutionVerifiedOn: "",
                                  }));
                                }
                              }}
                              options={{
                                enableTime: true,
                                dateFormat: "Y-m-d\\TH:i",
                                time_24hr: true,
                                allowInput: true,
                              }}
                              className="w-full bg-transparent text-sm h-10 px-4 outline-none text-slate-700 dark:text-slate-200"
                              placeholder="YYYY-MM-DDTHH:mm"
                            />
                          </div>
                        </Field>

                        <Field
                          label="CMS Ticket Closed By"
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
                            placeholder="Search users..."
                            loading={loadingApis}
                            disabled={loadingApis}
                            error={errors.cmsTicketClosedBy}
                          />
                        </Field>

                        <Field
                          label="CMS Ticket Closed On *"
                          error={errors.cmsTicketClosedOn}
                        >
                          <div className="flex items-center w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden focus-within:ring-4 focus-within:ring-pink-500/10 focus-within:border-pink-500 transition-all">
                            <Flatpickr
                              data-enable-time
                              value={form.cmsTicketClosedOn}
                              onChange={(date, dateStr) => {
                                setForm((f) => ({
                                  ...f,
                                  cmsTicketClosedOn: dateStr,
                                }));
                                if (errors.cmsTicketClosedOn) {
                                  setErrors((e) => ({
                                    ...e,
                                    cmsTicketClosedOn: "",
                                  }));
                                }
                              }}
                              options={{
                                enableTime: true,
                                dateFormat: "Y-m-d\\TH:i",
                                time_24hr: true,
                                allowInput: true,
                              }}
                              className="w-full bg-transparent text-sm h-10 px-4 outline-none text-slate-700 dark:text-slate-200"
                              placeholder="YYYY-MM-DDTHH:mm"
                            />
                          </div>
                        </Field>

                        <Field
                          label="Service Closed Date *"
                          error={errors.serviceClosedDate}
                        >
                          <div className="flex items-center w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden focus-within:ring-4 focus-within:ring-pink-500/10 focus-within:border-pink-500 transition-all">
                            <Flatpickr
                              data-enable-time
                              value={form.serviceClosedDate}
                              onChange={(date, dateStr) => {
                                setForm((f) => ({
                                  ...f,
                                  serviceClosedDate: dateStr,
                                }));
                                if (errors.serviceClosedDate) {
                                  setErrors((e) => ({
                                    ...e,
                                    serviceClosedDate: "",
                                  }));
                                }
                              }}
                              options={{
                                enableTime: true,
                                dateFormat: "Y-m-d\\TH:i",
                                time_24hr: true,
                                allowInput: true,
                              }}
                              className="w-full bg-transparent text-sm h-10 px-4 outline-none text-slate-700 dark:text-slate-200"
                              placeholder="YYYY-MM-DDTHH:mm"
                            />
                          </div>
                        </Field>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-end gap-4 px-8 py-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <button
                  type="button"
                  onClick={
                    viewMode ? onClose : () => setShowExitConfirm(true)
                  }
                  disabled={submitting}
                  className="px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50 pointer-events-auto"
                >
                  {viewMode ? "Close" : "Cancel"}
                </button>
                {!viewMode && (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-8 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-xl bg-pink-600 text-white shadow-lg shadow-pink-500/20 transition-all disabled:opacity-50 flex items-center justify-center min-w-[140px] pointer-events-auto"
                  >
                    {submitting
                      ? "Saving..."
                      : isEdit
                        ? activeTab === "Ticket Verification"
                          ? "Close Ticket"
                          : "Update Ticket"
                        : "Create Ticket"}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ActivityModal
        open={isActivityModalOpen}
        activity={activityToEdit}
        onClose={() => setIsActivityModalOpen(false)}
        onSubmit={(data) => {
          if (activityToEdit) {
            setForm((f) => ({
              ...f,
              activities: (f.activities || []).map((a) =>
                a === activityToEdit ? data : a
              ),
            }));
          } else {
            setForm((f) => ({
              ...f,
              activities: [...(f.activities || []), data],
            }));
          }
          setIsActivityModalOpen(false);
        }}
      />

      <SiteModal
        open={isSiteModalOpen}
        onClose={() => setIsSiteModalOpen(false)}
        onSubmit={(data) => {
          console.log("Created site", data);
          setIsSiteModalOpen(false);
        }}
      />

      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 backdrop-blur-sm font-[Arial]">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl w-[400px]">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">
              New Customer
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Existing customer form goes here. Implementation pending.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-2xl p-8 text-center font-[Arial]"
            >
              <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500 mx-auto mb-6">
                <AlertCircle size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tighter uppercase tracking-widest">
                Discard Changes?
              </h3>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-8 uppercase tracking-widest leading-relaxed">
                You have unsaved changes. Are you sure you want to exit?
              </p>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
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
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:from-rose-600 hover:to-red-700 transition-all shadow-lg shadow-rose-500/20"
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
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 text-center animate-fade-in font-[Arial]">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
              Warning
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Enter Received Date before adding an activity
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDateWarning(false)}
                className="flex-1 py-2.5 rounded-xl bg-pink-500 text-white text-sm hover:bg-pink-600 transition-all shadow-lg shadow-pink-500/20 font-medium"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {showActivityWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 text-center animate-fade-in font-[Arial]">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
              Warning
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Please add at least one activity before saving
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowActivityWarning(false)}
                className="flex-1 py-2.5 rounded-xl bg-pink-500 text-white text-sm hover:bg-pink-600 transition-all shadow-lg shadow-pink-500/20 font-medium"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}