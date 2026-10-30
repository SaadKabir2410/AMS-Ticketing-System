import { Fragment, useState, useEffect, useMemo, useRef, useCallback } from "react";
import AppSelect from "../component/common/AppSelect";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  X,
  ChevronLeft,
  Loader2,
  Calendar,
  Filter,
  CheckCircle2,
  Edit,
  ChevronRight,
  ChevronLeft as ChevronLeftIcon,
  ChevronsLeft,
  ChevronsRight,
  GripVertical,
  Eye,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ArrowRight,
  MoreVertical,
  Check,
  Ticket,
  ShieldAlert,
  AlertCircle,
} from "lucide-react";
import { Popper, ClickAwayListener, Paper, Box, MenuItem, ListItemText } from "@mui/material";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";

import { useAuth } from "../context/AuthContextHook";
import amsTicketApi from "../services/api/amsTicketApi";
import { usersApi } from "../services/api/users";
import { useToast } from "../component/common/ToastContext";
import TicketModal from "../component/common/TicketModal";
import DeleteConfirmModal from "../component/common/DeleteConfirmation";
import { ActionsMenu } from "../component/common/ResourcePage";
import { usePermission } from "../hooks/usePermission";
import { useBackendEnumOptions } from "../hooks/useBackendEnumOptions";
import { formatDurationHours } from "../utils/formatDuration";
import {
  getCachedApplicationConfig,
  loadApplicationConfig,
} from "../services/applicationConfigCache";

const getLocalizationValue = (applicationConfig, key) => {
  const resources = applicationConfig?.localization?.values;
  if (!resources || typeof resources !== "object") return key;

  const defaultResourceName =
    applicationConfig?.localization?.defaultResourceName;
  const defaultValue = resources[defaultResourceName]?.[key];
  if (typeof defaultValue === "string" && defaultValue.trim()) {
    return defaultValue.trim();
  }

  for (const resource of Object.values(resources)) {
    const value = resource?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return key;
};

// ── Animation variants ────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.015 } },
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" },
  },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

const ROW_HEIGHT = "h-[60px]";

// --- Text Highlighter ---
const HighlightText = ({ text, terms = [] }) => {
  if (!text) return "—";
  const str = String(text);
  const activeTerms = terms
    .map((term) => String(term ?? "").trim())
    .filter((term) => term.length > 0);
  if (activeTerms.length === 0) return str;

  const escapedTerms = activeTerms
    .map((t) => String(t).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const regex = new RegExp(`(${escapedTerms})`, "gi");
  const parts = str.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        activeTerms.some((t) => t.toLowerCase() === part.toLowerCase()) ? (
          <mark
            key={i}
            className="rounded-sm bg-pink-200 px-0.5 text-pink-900 dark:bg-pink-500/40 dark:text-pink-100"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
};

const AdvancedFilterInput = ({ label, value, onChange, onClear, type = "text" }) => (
  <div className="flex min-w-0 w-full flex-col gap-1">
    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
      {label}
    </span>
    <div className="relative">
      {type === "date" ? (
        <Flatpickr
          value={value || undefined}
          onChange={(_dates, dateString) => onChange(dateString)}
          onInput={(event) => onChange(event.currentTarget.value)}
          options={{
            dateFormat: "Y-m-d",
            allowInput: true,
          }}
          aria-label={label}
          title={label}
          placeholder={label}
          className="w-full px-2 pr-12 py-1 text-[11px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500 transition-all placeholder:text-slate-400 text-slate-700 dark:text-slate-200"
        />
      ) : (
        <input
          type="text"
          aria-label={label}
          title={label}
          placeholder={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full px-2 pr-7 py-1 text-[11px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500 transition-all placeholder:text-slate-400 text-slate-700 dark:text-slate-200"
        />
      )}
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label={label}
          className={`absolute ${type === "date" ? "right-7" : "right-2"} top-1/2 -translate-y-1/2 text-slate-300 hover:text-pink-500`}
        >
          <X size={11} />
        </button>
      )}
      {type === "date" && (
        <Calendar
          size={14}
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
        />
      )}
    </div>
  </div>
);

const parseTicketDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
};

// Table cells show the date and the time on separate lines.
const formatTicketDateOnly = (value, locale) =>
  parseTicketDate(value)?.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" }) || "";

const formatTicketTimeOnly = (value, locale) =>
  parseTicketDate(value)?.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) || "";

// The most recent active activity of a ticket (latest end, or start when it has no end).
const getLastActivity = (ticket) => {
  const activities = ticket.amsTicketDetails || ticket.aMSTicketDetails || [];
  let last = null;
  let lastTime = -Infinity;
  activities.forEach((activity) => {
    if (activity?.isActive === false) return;
    const time = parseTicketDate(activity.endDate || activity.startDate)?.getTime();
    if (time !== undefined && time > lastTime) {
      last = activity;
      lastTime = time;
    }
  });
  return last;
};

const getLocalDate = (value) => {
  if (!value) return "";
  const rawValue = String(value).trim();
  const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(rawValue)
    ? `${rawValue}T00:00:00`
    : rawValue.replace(" ", "T");
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const formatTicketDate = (value, locale) => {
  const localDate = getLocalDate(value);
  if (!localDate) return "";
  const [year, month, day] = localDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const fetchRemainingPages = async (pageCount, fetchPage, concurrency = 4) => {
  const results = [];
  for (let firstPage = 2; firstPage <= pageCount; firstPage += concurrency) {
    const lastPage = Math.min(firstPage + concurrency - 1, pageCount);
    const batch = await Promise.all(
      Array.from(
        { length: lastPage - firstPage + 1 },
        (_, index) => fetchPage(firstPage + index)
      )
    );
    results.push(...batch);
  }
  return results;
};

const getReceivedTime = (ticket) =>
  ticket.ticketReceivedDate ? new Date(ticket.ticketReceivedDate).getTime() || 0 : 0;

const getTicketSortValue = (ticket, key) => {
  if (key === "ticketReceivedDate") return getReceivedTime(ticket);
  if (key === "cmsTicketClosedOn") return parseTicketDate(ticket.cmsTicketClosedOn)?.getTime() || 0;
  if (key === "isPRE") return Number(Boolean(ticket.isPRE));
  if (key === "status" || key === "activityTotalDuration") return Number(ticket[key]) || 0;
  return String(ticket[key] ?? "");
};

// Mirrors the server Sorting built by amsTicketApi.getAll: the selected column,
// then the newest received date, then Id.
const sortTickets = (items, sortKey, sortDir) => items.sort((a, b) => {
  const aValue = getTicketSortValue(a, sortKey);
  const bValue = getTicketSortValue(b, sortKey);
  const result = typeof aValue === "number"
    ? aValue - bValue
    : aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: "base" });
  if (result !== 0) return sortDir === "desc" ? -result : result;
  const receivedOrder = getReceivedTime(b) - getReceivedTime(a);
  if (receivedOrder !== 0) return receivedOrder;
  return String(b.id ?? "").localeCompare(String(a.id ?? ""));
});

// Retain the completed search dataset while navigating within the SPA. The
// owner key prevents data from being reused across different signed-in users.
const sharedAllTicketsCache = {
  ownerId: null,
  items: null,
  promise: null,
  version: 0,
  loadedAt: 0,
};
const SEARCH_CACHE_TTL_MS = 2 * 60 * 1000;

// --- Helper Functions ---
const formatAge = (dateString) => {
  if (!dateString) return { text: "—", isOverdue: false };
  const start = new Date(dateString);
  const now = new Date();
  const diffMs = now - start;
  if (diffMs < 0) return { text: "—", isOverdue: false };

  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  const isOverdue = totalHours >= 8;

  if (totalHours >= 24) {
    const days = Math.floor(totalHours / 24);
    const hrs = totalHours % 24;
    return { text: `${days}d ${hrs}h`, isOverdue };
  }
  return { text: `${totalHours}h ${diffMinutes}m`, isOverdue };
};

const getAvatarColor = (name) => {
  const colors = ["bg-blue-100 text-blue-600", "bg-purple-100 text-purple-600", "bg-emerald-100 text-emerald-600", "bg-amber-100 text-amber-600", "bg-pink-100 text-pink-600"];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const getInitials = (name) => {
  if (!name) return "U";
  return name.charAt(0).toUpperCase();
};

const isVoidedTicket = (ticket) => Number(ticket?.status) === 3;

const RowActions = ({
  row,
  onUpdateData,
  onVoid,
  onAuditLog,
  onReopen,
  moreActionsText,
  editButtonText,
  voidButtonText,
  reopenButtonText,
  auditLogsButtonText,
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const isVoided = isVoidedTicket(row);
  const handleClick = (e) => {
    setAnchorEl(anchorEl ? null : e.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <ClickAwayListener onClickAway={handleClose}>
      <div className="flex items-center justify-center gap-1">
        <button onClick={handleClick} className="p-1 text-slate-400 hover:text-slate-600 transition-colors" title={moreActionsText}>
          <MoreVertical size={16} />
        </button>
        <Popper
          open={open}
          anchorEl={anchorEl}
          placement="bottom-end"
          style={{ zIndex: 1300 }}
        >
          <Paper
            elevation={8}
            sx={{
              mt: 0.5,
              borderRadius: "12px",
              minWidth: 120,
              overflow: 'hidden'
            }}
          >
            <Box sx={{ py: 0.5 }}>
              {onUpdateData && (
                <MenuItem onClick={() => { handleClose(); onUpdateData(); }}>
                  <ListItemText primary={editButtonText} primaryTypographyProps={{ fontSize: "12px", fontWeight: 600 }} />
                </MenuItem>
              )}
              {!isVoided && Number(row?.status) !== 2 && onVoid && (
                <MenuItem onClick={() => { handleClose(); onVoid(); }}>
                  <ListItemText primary={voidButtonText} primaryTypographyProps={{ fontSize: "12px", fontWeight: 600 }} />
                </MenuItem>
              )}
              {row?.status === 2 && onReopen && (
                <MenuItem onClick={() => { handleClose(); onReopen(); }}>
                  <ListItemText primary={reopenButtonText} primaryTypographyProps={{ fontSize: "12px", fontWeight: 600 }} />
                </MenuItem>
              )}
              {onAuditLog && (
                <MenuItem onClick={() => { handleClose(); onAuditLog(); }}>
                  <ListItemText primary={auditLogsButtonText} primaryTypographyProps={{ fontSize: "12px", fontWeight: 600 }} />
                </MenuItem>
              )}
            </Box>
          </Paper>
        </Popper>
      </div>
    </ClickAwayListener>
  );
};

export default function AMSTicketsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { ticketNumber } = useParams();
  const isAdmin = user?.role?.toLowerCase().includes("admin");
  // Admin is hard-coded to read-only on tickets: no create, edit/view opens in
  // view mode only, and audit log is always available.
  const canCreate = usePermission("Billing.AMSTickets.Create") && !isAdmin;
  const canEdit = usePermission("Billing.AMSTickets.Edit") && !isAdmin;
  // The backend has no view-only permission; admins open tickets read-only.
  const canViewMode = isAdmin;
  const canVoid = usePermission("Billing.AMSTickets.VoidAMSTicket") && !isAdmin;
  const canReopen = usePermission("Billing.AMSTickets.ReOpenAMSTicket") && !isAdmin;
  const canViewAuditLog = usePermission("Billing.AMSTickets.ViewAuditLog") || isAdmin;
  const canClose = usePermission("Billing.AMSTickets.CloseAMSTicket") && !isAdmin;
  const [applicationConfig, setApplicationConfig] = useState(
    getCachedApplicationConfig,
  );
  const localize = useCallback(
    (key) => getLocalizationValue(applicationConfig, key),
    [applicationConfig],
  );
  const currentCulture =
    applicationConfig?.localization?.currentCulture?.cultureName || undefined;
  // Status names come from the backend StatusEnum (Opened, Closed, Void).
  const statusOptions = useBackendEnumOptions("StatusEnum", (key) => {
    const value = localize(key);
    return value === key ? "" : value;
  });
  const statusLabel = (value) =>
    statusOptions.find((option) => option.value === Number(value))?.label || "";

  useEffect(() => {
    let isCurrent = true;
    loadApplicationConfig()
      .then((config) => {
        if (isCurrent) setApplicationConfig(config);
      })
      .catch(() => null);

    return () => {
      isCurrent = false;
    };
  }, []);

  // --- States ---
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const openedTicketNumberRef = useRef(null);
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState("asc");

  // Modals
  const [actionItem, setActionItem] = useState(null);
  const [actionType, setActionType] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [generalSearch, setGeneralSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterIsPRE, setFilterIsPRE] = useState("");
  const [filterIsVerified, setFilterIsVerified] = useState("");
  const [globalStats, setGlobalStats] = useState({ open: 0, closed: 0, voided: 0, nonVerified: 0, lateClosures: 0 });
  const [userNames, setUserNames] = useState(() => new Map());
  // Rows opened to show their activities, and each ticket's loaded activities.
  const [expandedRows, setExpandedRows] = useState(() => new Set());
  const [ticketActivities, setTicketActivities] = useState({});
  const hoverTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(hoverTimerRef.current), []);

  // The list holds only part of each activity (no work done code); load the full
  // ticket once. Called on hover too, so the activities are usually ready on click.
  const loadActivities = (row) => {
    if (ticketActivities[row.id]) return;
    setTicketActivities((current) => ({ ...current, [row.id]: { loading: true, items: [] } }));
    amsTicketApi
      .getById(row.id)
      .then((ticket) => {
        const items = ticket?.amsTicketDetails || ticket?.aMSTicketDetails || [];
        setTicketActivities((current) => ({ ...current, [row.id]: { loading: false, items } }));
      })
      .catch((error) => {
        console.error("Failed to load ticket activities", error);
        setTicketActivities((current) => ({ ...current, [row.id]: { loading: false, items: null } }));
      });
  };

  const toggleRow = (row) => {
    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(row.id)) next.delete(row.id);
      else next.add(row.id);
      return next;
    });
    loadActivities(row);
  };
  const [filterCreatedBy, setFilterCreatedBy] = useState("");
  const [filterTicketDelayed, setFilterTicketDelayed] = useState("");
  const [filterSiteName, setFilterSiteName] = useState("");
  const [filterSiteOCN, setFilterSiteOCN] = useState("");
  const [filterCmsNextTicketNo, setFilterCmsNextTicketNo] = useState("");
  const [filterTicketReceivedDate, setFilterTicketReceivedDate] = useState("");
  const [filterTicketClosedBy, setFilterTicketClosedBy] = useState("");

  const advancedFilterValues = [
    filterStatus,
    filterIsPRE,
    filterIsVerified,
    filterCreatedBy,
    filterTicketDelayed,
    filterSiteName,
    filterSiteOCN,
    filterCmsNextTicketNo,
    filterTicketReceivedDate,
    filterTicketClosedBy,
  ];
  const activeFilterCount = advancedFilterValues.filter(
    value => String(value ?? "").trim() !== ""
  ).length;


  const ticketFetchRequestId = useRef(0);
  // Sorting reloads quietly: the current rows stay visible until the re-ordered page arrives.
  const quietFetchRef = useRef(false);


  const ticketCacheOwnerId = String(user?.id ?? "anonymous");
  const getAllTicketsCache = () => {
    if (sharedAllTicketsCache.ownerId !== ticketCacheOwnerId) {
      sharedAllTicketsCache.ownerId = ticketCacheOwnerId;
      sharedAllTicketsCache.items = null;
      sharedAllTicketsCache.promise = null;
      sharedAllTicketsCache.version += 1;
      sharedAllTicketsCache.loadedAt = 0;
    }
    return sharedAllTicketsCache;
  };

  const loadAllTickets = async () => {
    const cache = getAllTicketsCache();
    if (cache.items && Date.now() - cache.loadedAt < SEARCH_CACHE_TTL_MS) {
      return cache.items;
    }
    cache.items = null;
    if (cache.promise) {
      return cache.promise;
    }

    const cacheVersion = cache.version;
    const request = (async () => {
      const limit = 1000;
      const initialResponse = await amsTicketApi.getAll({ page: 1, perPage: limit });
      let items = initialResponse.items || [];
      const totalCount = initialResponse.totalCount || 0;

      if (totalCount > items.length) {
        const pageCount = Math.ceil(totalCount / limit);
        const remainingPages = await fetchRemainingPages(
          pageCount,
          page => amsTicketApi.getAll({ page, perPage: limit })
        );
        for (const response of remainingPages) {
          items = items.concat(response.items || []);
        }
      }

      if (items.length < totalCount) {
        throw new Error(`Only ${items.length} of ${totalCount} AMS tickets were loaded.`);
      }
      if (cache.ownerId === ticketCacheOwnerId && cache.version === cacheVersion) {
        cache.items = items;
        cache.loadedAt = Date.now();
      }
      return items;
    })();

    cache.promise = request;
    try {
      return await request;
    } finally {
      if (cache.promise === request) {
        cache.promise = null;
      }
    }
  };

  const invalidateAllTicketsCache = () => {
    const cache = getAllTicketsCache();
    cache.items = null;
    cache.promise = null;
    cache.version += 1;
    cache.loadedAt = 0;
  };

  // Loads every ticket into the shared cache that the client-side filters use,
  // and counts them for the summary cards.
  const warmTicketCache = async () => {
    // Runs after every save, void and reopen: opened rows reload their activities.
    setTicketActivities({});
    try {
      const allItems = await loadAllTickets();
      const now = new Date();
      let verified = 0;
      let lateClosures = 0;
      allItems.forEach((ticket) => {
        if (ticket.ticketResolutionVerifiedBy || ticket.ticketResolutionVerifiedById || ticket.ticketResolutionVerifiedOn) {
          verified++;
        }
        // Overdue: a non-void ticket that took (or is taking) more than 24 hours to close.
        if (Number(ticket.status) === 3) return;
        const received = parseTicketDate(ticket.ticketReceivedDate);
        if (!received) return;
        const end = Number(ticket.status) === 2
          ? parseTicketDate(ticket.cmsTicketClosedOn) || parseTicketDate(ticket.serviceClosedDate) || now
          : now;
        if ((end - received) / (1000 * 60 * 60) > 24) lateClosures++;
      });
      setGlobalStats({
        open: allItems.filter((ticket) => Number(ticket.status) === 1).length,
        closed: allItems.filter((ticket) => Number(ticket.status) === 2).length,
        voided: allItems.filter((ticket) => Number(ticket.status) === 3).length,
        nonVerified: allItems.length - verified,
        lateClosures,
      });
    } catch (e) {
      console.error("Failed to load the ticket cache", e);
    }
  };

  // --- Initialization and Watchers ---
  useEffect(() => {
    // Activity users are shown by name in the Last Activity column.
    usersApi
      .getUsersList({ organizationTypes: [2, 3], onlyLoadCurrentUser: false })
      .then((response) => {
        const list = Array.isArray(response) ? response : response?.items || response?.data || [];
        setUserNames(new Map(list.filter((u) => u?.id).map((u) => [String(u.id).toLowerCase(), u.name || u.userName || ""])));
      })
      .catch((error) => console.error("Failed to load user names", error));
  }, []);

  useEffect(() => {
    // Start warming the shared search cache immediately on page entry.
    warmTicketCache();
  }, []);

  // Only typed text waits for the user to pause; opening the page, paging,
  // sorting and picking a filter load at once.
  const typedFiltersRef = useRef(null);
  useEffect(() => {
    const typedFilters = [generalSearch, filterSiteName, filterSiteOCN, filterCmsNextTicketNo, filterCreatedBy, filterTicketClosedBy].join("\u0000");
    const isTyping = typedFiltersRef.current !== null && typedFiltersRef.current !== typedFilters;
    typedFiltersRef.current = typedFilters;
    const timer = setTimeout(() => {
      fetchTickets();
    }, isTyping ? 300 : 0);
    return () => clearTimeout(timer);
  }, [generalSearch, currentPage, pageSize, sortKey, sortDir, filterStatus, filterIsPRE, filterIsVerified, filterCreatedBy, filterTicketDelayed, filterSiteName, filterSiteOCN, filterCmsNextTicketNo, filterTicketReceivedDate, filterTicketClosedBy]);

  useEffect(() => {
    if (!ticketNumber || openedTicketNumberRef.current === ticketNumber) return;
    openedTicketNumberRef.current = ticketNumber;

    let cancelled = false;
    const openLinkedTicket = async () => {
      try {
        const ticketId = await amsTicketApi.getIdByTicketNumber({
          ticketNumber: decodeURIComponent(ticketNumber),
        });
        const ticket = await amsTicketApi.getById(ticketId);
        if (cancelled) return;
        if (!canEdit && !canViewMode) {
          toast(localize("DefaultErrorMessage403"), "error");
          navigate("/ams-tickets", { replace: true });
          return;
        }
        setActionItem(ticket);
        setActionType(canEdit && !isVoidedTicket(ticket) ? "edit" : "detail");
      } catch (error) {
        if (!cancelled) {
          toast(localize("DefaultErrorMessage"), "error");
          navigate("/ams-tickets", { replace: true });
        }
      }
    };

    openLinkedTicket();
    return () => {
      cancelled = true;
    };
  }, [ticketNumber, canEdit, canViewMode, localize, navigate, toast]);

  const fetchTickets = async () => {
    const requestId = ++ticketFetchRequestId.current;
    if (quietFetchRef.current) quietFetchRef.current = false;
    else setLoading(true);
    try {
      const requiresClientSideFiltering =
        filterIsPRE !== "" ||
        filterIsVerified !== "" ||
        filterCreatedBy.trim() !== "" ||
        filterTicketClosedBy.trim() !== "" ||
        filterTicketDelayed !== "";

      const selectedReceivedDate = getLocalDate(filterTicketReceivedDate);

      const params = {
        search: generalSearch.trim(),
        // No column chosen means the default order: status (Opened first), then newest received.
        sortKey: sortKey || "status",
        sortDir: sortKey ? sortDir : "asc",
        siteName: filterSiteName.trim(),
        siteOcn: filterSiteOCN.trim(),
        cmsNextTicketNo: filterCmsNextTicketNo.trim(),
        // The paged list filters on TicketReceivedDate (same day); it ignores
        // DateFrom/DateTo, which only the report endpoints use.
        ticketReceivedDate: selectedReceivedDate ? `${selectedReceivedDate}T00:00:00` : "",
      };
      if (filterStatus !== "") params.status = Number(filterStatus);

      let items = [];
      let finalTotalCount = 0;

      if (!requiresClientSideFiltering) {
        // Backend-supported filters are applied by the paged-list API so only
        // the requested result page is transferred to the browser.
        const data = await amsTicketApi.getAll({
          ...params,
          page: currentPage,
          perPage: pageSize,
        });
        items = data.items || [];
        finalTotalCount = data.totalCount || 0;
      } else {
        const hasBackendFilter = Boolean(
          params.search ||
          params.siteName ||
          params.siteOcn ||
          params.cmsNextTicketNo ||
          params.ticketReceivedDate ||
          params.status
        );
        if (hasBackendFilter) {
          const limit = 1000;
          const initialResponse = await amsTicketApi.getAll({ ...params, page: 1, perPage: limit });
          items = initialResponse.items || [];
          const serverTotalCount = initialResponse.totalCount || 0;
          if (serverTotalCount > items.length) {
            const remainingPages = await fetchRemainingPages(
              Math.ceil(serverTotalCount / limit),
              page => amsTicketApi.getAll({ ...params, page, perPage: limit })
            );
            for (const response of remainingPages) {
              items = items.concat(response.items || []);
            }
          }
        } else {
          // These legacy filters are not exposed by the paged-list API contract.
          // Reuse the already-warmed KPI dataset rather than downloading it again.
          items = [...await loadAllTickets()];
        }
      }

      if (requiresClientSideFiltering) {
        const siteNameSearch = filterSiteName.trim().toLocaleLowerCase();
        const siteOcnSearch = filterSiteOCN.trim().toLocaleLowerCase();
        const ticketNoSearch = filterCmsNextTicketNo.trim().toLocaleLowerCase();
        const createdBySearch = filterCreatedBy.trim().toLocaleLowerCase();
        const closedBySearch = filterTicketClosedBy.trim().toLocaleLowerCase();
        const selectedStatus = filterStatus === "" ? null : Number(filterStatus);
        const selectedIsPre = filterIsPRE === "" ? null : filterIsPRE === "true";
        const selectedIsVerified = filterIsVerified === "" ? null : filterIsVerified === "true";
        const selectedDate = getLocalDate(filterTicketReceivedDate);
        const filterDelayed = filterTicketDelayed === "late_closures";
        const now = filterDelayed ? new Date() : null;

        items = items.filter(ticket => {
          if (siteNameSearch && !String(ticket.siteName ?? "").toLocaleLowerCase().includes(siteNameSearch)) return false;
          if (siteOcnSearch && !String(ticket.siteOCN ?? "").toLocaleLowerCase().includes(siteOcnSearch)) return false;
          if (ticketNoSearch && !String(ticket.cmsNextTicketNo ?? "").toLocaleLowerCase().includes(ticketNoSearch)) return false;
          if (createdBySearch && !String(ticket.createdBy ?? "").toLocaleLowerCase().includes(createdBySearch)) return false;
          if (closedBySearch && !String(ticket.ticketClosedByName ?? "").toLocaleLowerCase().includes(closedBySearch)) return false;
          if (selectedStatus !== null && Number(ticket.status) !== selectedStatus) return false;
          if (selectedIsPre !== null && Boolean(ticket.isPRE) !== selectedIsPre) return false;

          if (selectedIsVerified !== null) {
            const isVerified = Boolean(
              ticket.ticketResolutionVerifiedBy ||
              ticket.ticketResolutionVerifiedById ||
              ticket.ticketResolutionVerifiedOn
            );
            if (isVerified !== selectedIsVerified) return false;
          }
          if (selectedDate && getLocalDate(ticket.ticketReceivedDate) !== selectedDate) return false;

          if (filterDelayed) {
            if (Number(ticket.status) === 3 || !ticket.ticketReceivedDate) return false;
            const received = new Date(ticket.ticketReceivedDate);
            if (Number.isNaN(received.getTime())) return false;
            let end = now;
            if (Number(ticket.status) === 2) {
              end = new Date(ticket.cmsTicketClosedOn || ticket.serviceClosedDate || "");
            }
            if (Number.isNaN(end.getTime())) return false;
            if ((end - received) / (1000 * 60 * 60) <= 24) return false;
          }
          return true;
        });

        finalTotalCount = items.length;
        sortTickets(items, sortKey || "status", sortKey ? sortDir : "asc");
        // Client-side pagination
        const startIndex = (currentPage - 1) * pageSize;
        items = items.slice(startIndex, startIndex + pageSize);
      }

      if (requestId === ticketFetchRequestId.current) {
        setTickets(items);
        setTotalCount(finalTotalCount);
      }
    } catch (err) {
      if (requestId === ticketFetchRequestId.current) {
        toast(localize("DefaultErrorMessage"), "error");
      }
    } finally {
      if (requestId === ticketFetchRequestId.current) {
        setLoading(false);
      }
    }
  };


  const handleVoid = async (row) => {
    if (isVoidedTicket(row)) {
      setActionItem(null);
      setActionType("");
      return;
    }

    try {
      setActionLoading(true);
      await amsTicketApi.void(row);
      toast(localize("SavedSuccessfully"));
      setActionItem(null);
      setActionType("");
      invalidateAllTicketsCache();
      warmTicketCache();
      fetchTickets();
    } catch (err) {
      toast(localize("DefaultErrorMessage"), "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopen = async (row) => {
    try {
      setActionLoading(true);
      await amsTicketApi.reOpen(row.id, {});
      toast(localize("SavedSuccessfully"));
      setActionItem(null);
      setActionType("");
      invalidateAllTicketsCache();
      warmTicketCache();
      fetchTickets();
    } catch (err) {
      toast(localize("DefaultErrorMessage"), "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSort = (key) => {
    if (key === "actions") return;
    quietFetchRef.current = true;
    // Click cycle: A to Z -> Z to A -> back to the default order (Opened first, newest received).
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortKey("");
      setSortDir("asc");
    }
    // A new order starts again from the first row.
    setCurrentPage(1);
  };

  // Uses the backend text when the key exists; the English fallback covers keys
  // the backend does not define yet.
  const localizeOr = (key, fallback) => {
    const value = localize(key);
    return value === key ? fallback : value;
  };

  // --- Table Configuration ---
  const columns = [
    { key: "siteName", label: `${localize("SiteName")} / ${localize("SiteOCN")}`, width: "16%", sortable: true },
    { key: "cmsNextTicketNo", label: localize("CMSNextTicketNo"), width: "11%", sortable: true },
    { key: "ticketReceivedDate", label: localize("TicketReceivedDate"), width: "9%", sortable: true },
    { key: "lastActivity", label: localizeOr("LastActivity", "Last Activity"), width: "9%" },
    { key: "cmsTicketClosedOn", label: localize("CMSTicketClosedOn"), width: "9%", sortable: true },
    { key: "activityTotalDuration", label: localize("ActivityTotalDuration"), width: "8%", sortable: true },
    { key: "createdBy", label: localize("CreatedBy"), width: "8%" },
    { key: "isPRE", label: localize("IsPRE"), width: "6%", align: "center", sortable: true },
    { key: "status", label: localize("Status"), width: "8%", align: "center", sortable: true },
    { key: "isVerified", label: localizeOr("TicketVerified", "Ticket Verified"), width: "9%", align: "center" },
    { key: "actions", label: localize("Actions"), width: "7%", align: "center" },
  ];

  const pillClass = "inline-flex items-center justify-center min-w-[44px] px-2.5 py-1 rounded-md border text-[12px] font-medium whitespace-nowrap";
  const pinkPill = "bg-pink-100 border-pink-200 text-pink-600 dark:bg-pink-500/15 dark:border-pink-500/30 dark:text-pink-300";
  const greenPill = "bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300";
  const neutralPill = "bg-white border-slate-300 text-slate-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200";

  const renderDateCell = (value, highlightTerm) => {
    if (!value) return null;
    const dateText = formatTicketDateOnly(value, currentCulture);
    return (
      <>
        <span className="block text-[13px] text-slate-800 dark:text-slate-100 whitespace-nowrap">
          {highlightTerm ? <HighlightText text={dateText} terms={[highlightTerm]} /> : dateText}
        </span>
        <span className="block text-[12px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {formatTicketTimeOnly(value, currentCulture)}
        </span>
      </>
    );
  };

  // Activities of an opened row: the full list once loaded, the list data until then.
  const renderActivities = (row) => {
    const cached = ticketActivities[row.id];
    const items = (cached?.items || row.amsTicketDetails || row.aMSTicketDetails || [])
      .filter((activity) => activity?.isActive !== false)
      .slice()
      .sort((a, b) => (parseTicketDate(a.startDate)?.getTime() || 0) - (parseTicketDate(b.startDate)?.getTime() || 0));
    const cellClass = "px-3 py-2 text-[12px] text-slate-700 dark:text-slate-200 align-middle";
    const headClass = "px-3 py-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700";

    return (
      <div className="px-4 py-3 bg-white dark:bg-slate-900 shadow-[inset_3px_0_0_0_#ef4444]">
        <div className="flex items-center gap-2 mb-2 text-[13px] font-semibold text-slate-800 dark:text-slate-100">
          {localize("Activities")}
          <span className="text-[11px] font-normal text-slate-500">({items.length})</span>
          {cached?.loading && <Loader2 size={13} className="animate-spin text-pink-500" />}
        </div>
        {cached?.items === null && items.length === 0 ? (
          <p className="text-[12px] text-red-600">{localize("DefaultErrorMessage")}</p>
        ) : items.length === 0 ? (
          <p className="text-[12px] text-slate-500">{localize("NoDataAvailableInDatatable")}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className={headClass}>{localize("ActivityType")}</th>
                  <th className={headClass}>{localize("StartDate")}</th>
                  <th className={headClass}>{localize("EndDate")}</th>
                  <th className={headClass}>{localizeOr("DurationHours", "Duration")}</th>
                  <th className={headClass}>{localize("WorkDoneCode")}</th>
                  <th className={headClass}>{localize("IsLikelyCause")}</th>
                  <th className={headClass}>{localize("ResolvedBy")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((activity, index) => {
                  const start = parseTicketDate(activity.startDate);
                  const end = parseTicketDate(activity.endDate);
                  const hours = start && end ? Math.max(0, (end - start) / (1000 * 60 * 60)) : 0;
                  return (
                    <tr key={activity.id || index}>
                      <td className={cellClass}>{amsTicketApi.resolveActivityTypeLabel(activity.activityType) || "—"}</td>
                      <td className={`${cellClass} whitespace-nowrap`}>
                        {start ? `${formatTicketDateOnly(start, currentCulture)} ${formatTicketTimeOnly(start, currentCulture)}` : "—"}
                      </td>
                      <td className={`${cellClass} whitespace-nowrap`}>
                        {end ? `${formatTicketDateOnly(end, currentCulture)} ${formatTicketTimeOnly(end, currentCulture)}` : "—"}
                      </td>
                      <td className={`${cellClass} whitespace-nowrap`}>{formatDurationHours(hours)}</td>
                      <td className={cellClass}>
                        {/* The list data has no work done code, which the backend formats as " ()". */}
                        {activity.workDoneCodeAndDescription?.replace(/^\s*\(\s*\)\s*$/, "") || "—"}
                      </td>
                      <td className={cellClass}>{activity.isLikelyCause ? localize("Yes") : localize("No")}</td>
                      <td className={cellClass}>{getActivityUsers(activity) || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const getActivityUsers = (activity) =>
    (activity?.amsTicketDetailUsers || activity?.aMSTicketDetailUsers || [])
      .map((detailUser) =>
        detailUser.identityUser?.name ||
        detailUser.identityUser?.userName ||
        userNames.get(String(detailUser.userId).toLowerCase()),
      )
      .filter(Boolean)
      .join(", ");

  const renderSortIcon = (key) => (
    sortKey === key ? (
      sortDir === "asc" ? (
        <ArrowUp size={12} className="shrink-0 text-pink-500" />
      ) : (
        <ArrowDown size={12} className="shrink-0 text-pink-500" />
      )
    ) : (
      <ArrowUpDown size={11} className="shrink-0 text-slate-300 dark:text-slate-600" />
    )
  );

  const totalPages = Math.ceil(totalCount / pageSize);
  const pageStart = totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const pageEnd = Math.min(currentPage * pageSize, totalCount);
  const pagerInfoText = localize("PagerInfo{0}{1}{2}")
    .replace("{0}", pageStart)
    .replace("{1}", pageEnd)
    .replace("{2}", totalCount);



  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-full w-full bg-[#f8fafc] dark:bg-slate-950 p-1 pb-[10px] flex flex-col relative overflow-visible font-[Arial]"
    >
      <style>{`
        .custom-scrollbar::-webkit-scrollbar:horizontal { height: 8px; display: block !important; }
        .custom-scrollbar::-webkit-scrollbar:vertical { display: none !important; width: 0 !important; }
        .custom-scrollbar { scrollbar-width: thin !important; }
        .custom-scrollbar::-webkit-scrollbar-track:horizontal { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb:horizontal { background-color: #cbd5e1; border-radius: 20px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:horizontal { background-color: #475569; }
      `}</style>

      {/* ── Main Unified Card ── */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex-1 w-full flex flex-col gap-3"
      >
        {/* ── Header Row ── */}
        <div className="flex items-start justify-between gap-3 px-1">
          <div className="flex flex-col">
            <nav className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              <span>{localize("Home")}</span>
              <span className="text-slate-400">/</span>
              <span className="text-pink-500">{localize("AMSTickets")}</span>
            </nav>
            <h1 className="text-[28px] leading-tight font-bold text-slate-900 dark:text-white">
              {localize("AMSTickets")}
            </h1>
          </div>
          {canCreate && (
            <button
              onClick={() => { setActionItem(null); setActionType("create"); }}
              className="app-primary-button inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm rounded-xl shrink-0"
            >
              <Plus size={18} />
              {localize("NewAMSTicket")}
            </button>
          )}
        </div>

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {[
            { id: "open", label: statusLabel(1), value: globalStats.open, icon: Ticket, tone: "bg-pink-50 text-pink-500 dark:bg-pink-500/10" },
            { id: "nonVerified", label: localizeOr("NonTicketVerification", "Non-Ticket Verification"), value: globalStats.nonVerified, icon: ShieldAlert, tone: "bg-rose-50 text-rose-500 dark:bg-rose-500/10" },
            { id: "closed", label: statusLabel(2), value: globalStats.closed, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10" },
            { id: "voided", label: localize("VoidAMSTicketButtonText"), value: globalStats.voided, icon: X, tone: "bg-slate-100 text-slate-500 dark:bg-slate-500/10" },
            { id: "overdue", label: localize("Overdue"), value: globalStats.lateClosures, icon: AlertCircle, tone: "bg-rose-50 text-rose-500 dark:bg-rose-500/10" },
          ]
            // Cards with a zero count are hidden.
            .filter((card) => card.value > 0)
            .map((card) => (
            <div key={card.id} className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-[#161920] border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${card.tone}`}>
                <card.icon size={22} strokeWidth={2} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] text-slate-600 dark:text-slate-400 truncate">{card.label}</span>
                <span className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{card.value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Search Bar ── */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="relative w-full sm:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search
                  size={16}
                  className={generalSearch ? "text-pink-500" : "text-slate-500"}
                />
              </div>
              <input
                type="text"
                value={generalSearch}
                onChange={(event) => {
                  setGeneralSearch(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder={localize("Search")}
                aria-label={localize("Search")}
                className="w-full pl-10 pr-8 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none transition-all focus:border-pink-600 focus:ring-4 focus:ring-pink-600/10 shadow-sm font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
              />
              {generalSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setGeneralSearch("");
                    setCurrentPage(1);
                  }}
                  aria-label={`${localize("Clear")} ${localize("Search")}`}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-pink-500"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(v => !v)}
              aria-expanded={showFilters}
              className={`relative inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${showFilters || activeFilterCount > 0
                ? "border-pink-300 bg-pink-50 text-pink-600 dark:border-pink-500/40 dark:bg-pink-500/10 dark:text-pink-300"
                : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"}`}
            >
              <Filter size={16} />
              {localize("AdvancedSearch")}
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-pink-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-[#161920]">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* ── Advanced Filter Panel ── */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col py-3">
                  <div className="order-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <AdvancedFilterInput
                    label={localize("SiteName")}
                    value={filterSiteName}
                    onChange={(value) => { setFilterSiteName(value); setCurrentPage(1); }}
                    onClear={() => { setFilterSiteName(""); setCurrentPage(1); }}
                  />

                  <AdvancedFilterInput
                    label={localize("SiteOCN")}
                    value={filterSiteOCN}
                    onChange={(value) => { setFilterSiteOCN(value); setCurrentPage(1); }}
                    onClear={() => { setFilterSiteOCN(""); setCurrentPage(1); }}
                  />

                  <AdvancedFilterInput
                    label={localize("CMSNextTicketNo")}
                    value={filterCmsNextTicketNo}
                    onChange={(value) => { setFilterCmsNextTicketNo(value); setCurrentPage(1); }}
                    onClear={() => { setFilterCmsNextTicketNo(""); setCurrentPage(1); }}
                  />

                  <AdvancedFilterInput
                    type="date"
                    label={localize("TicketReceivedDate")}
                    value={filterTicketReceivedDate}
                    onChange={(value) => { setFilterTicketReceivedDate(value); setCurrentPage(1); }}
                    onClear={() => { setFilterTicketReceivedDate(""); setCurrentPage(1); }}
                  />

                  <AdvancedFilterInput
                    label={localize("TicketClosedById")}
                    value={filterTicketClosedBy}
                    onChange={(value) => { setFilterTicketClosedBy(value); setCurrentPage(1); }}
                    onClear={() => { setFilterTicketClosedBy(""); setCurrentPage(1); }}
                  />

                  <AdvancedFilterInput
                    label={localize("CreatedBy")}
                    value={filterCreatedBy}
                    onChange={(value) => { setFilterCreatedBy(value); setCurrentPage(1); }}
                    onClear={() => { setFilterCreatedBy(""); setCurrentPage(1); }}
                  />

                  <div className="flex min-w-0 w-full flex-col gap-1">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {`${localize("Ticket")} ${localize("Status")}`}
                    </span>
                    <AppSelect
                      value={filterStatus}
                      onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                      className="w-full px-2 py-1 text-[11px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500 transition-all text-slate-700 dark:text-slate-200"
                    >
                      <option value="">{localize("SelectBoxEmptyValueText")}</option>
                      <option value="1">{statusLabel(1)}</option>
                      <option value="2">{statusLabel(2)}</option>
                      <option value="3">{localize("VoidAMSTicketButtonText")}</option>
                    </AppSelect>
                  </div>

                  <div className="flex min-w-0 w-full flex-col gap-1">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {`${localize("IsPRE")} ${localize("Status")}`}
                    </span>
                    <AppSelect
                      value={filterIsPRE}
                      onChange={e => { setFilterIsPRE(e.target.value); setCurrentPage(1); }}
                      className="w-full px-2 py-1 text-[11px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500 transition-all text-slate-700 dark:text-slate-200"
                    >
                      <option value="">{localize("SelectBoxEmptyValueText")}</option>
                      <option value="true">{localize("IsPRE")}</option>
                      <option value="false">{`${localize("No")} ${localize("IsPRE")}`}</option>
                    </AppSelect>
                  </div>

                  <div className="flex min-w-0 w-full flex-col gap-1">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {localize("TicketVerification")}
                    </span>
                    <AppSelect
                      value={filterIsVerified}
                      onChange={e => { setFilterIsVerified(e.target.value); setCurrentPage(1); }}
                      className="w-full px-2 py-1 text-[11px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500 transition-all text-slate-700 dark:text-slate-200"
                    >
                      <option value="">{localize("SelectBoxEmptyValueText")}</option>
                      <option value="true">{localize("Yes")}</option>
                      <option value="false">{localize("No")}</option>
                    </AppSelect>
                  </div>

                  <div className="flex min-w-0 w-full flex-col gap-1">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {`${localize("Overdue")} ${localize("Status")}`}
                    </span>
                    <AppSelect
                      value={filterTicketDelayed}
                      onChange={e => { setFilterTicketDelayed(e.target.value); setCurrentPage(1); }}
                      className="w-full px-2 py-1 text-[11px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500 transition-all text-slate-700 dark:text-slate-200"
                    >
                      <option value="">{localize("SelectBoxEmptyValueText")}</option>
                      <option value="late_closures">{localize("Overdue")}</option>
                    </AppSelect>
                  </div>

                  </div>

                  {/* Clear Filters */}
                  {activeFilterCount > 0 && (
                    <div className="order-1 flex justify-end mb-3">
                    <button
                      onClick={() => {
                        setFilterStatus("");
                        setFilterIsPRE("");
                        setFilterIsVerified("");
                        setFilterCreatedBy("");
                        setFilterTicketDelayed("");
                        setFilterSiteName("");
                        setFilterSiteOCN("");
                        setFilterCmsNextTicketNo("");
                        setFilterTicketReceivedDate("");
                        setFilterTicketClosedBy("");
                        setCurrentPage(1);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-200 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                    >
                      <X size={11} />
                      {localize("ClearFilter")}
                    </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>


        {/* ── Table Card ── */}
        <div className="flex flex-col rounded-xl bg-white dark:bg-[#161920] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Table Area */}
        <div className="w-full bg-slate-100 dark:bg-slate-900 relative min-h-[300px]">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-pink-500" size={32} />
              </div>
            </div>
          )}
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse table-fixed min-w-[1150px]">
              <thead>
                <tr className="bg-white dark:bg-[#161920]">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => col.sortable && handleSort(col.key)}
                      style={col.width ? { width: col.width } : undefined}
                      className={`px-3 py-3 border-b border-slate-200 dark:border-slate-800 text-[12px] leading-4 font-normal text-slate-700 dark:text-slate-300 align-middle text-${col.align || "left"} ${col.sortable ? "cursor-pointer select-none hover:text-slate-900 dark:hover:text-white transition-colors" : ""}`}
                    >
                      <div className={`flex items-center ${col.align === "center" ? "justify-center" : "justify-start"} gap-1`}>
                        <span>{col.label}</span>
                        {col.sortable && sortKey === col.key && renderSortIcon(col.key)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <motion.tbody
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {tickets.length === 0 && !loading ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="py-32 text-center text-sm font-medium text-slate-400 uppercase tracking-widest"
                    >
                      {localize("NoDataAvailableInDatatable")}
                    </td>
                  </tr>
                ) : (
                  tickets.map((row) => {
                    const isVerified = Boolean(row.ticketResolutionVerifiedBy || row.ticketResolutionVerifiedById);
                    const lastActivity = getLastActivity(row);
                    const lastActivityAt = lastActivity?.endDate || lastActivity?.startDate;
                    const lastActivityUsers = getActivityUsers(lastActivity);
                    const rowTone = Number(row.status) === 1
                      ? "bg-red-100 dark:bg-red-500/15"
                      : Number(row.status) === 3
                        ? "bg-slate-200 dark:bg-slate-700/60"
                        : "bg-white dark:bg-[#161920]";
                    const isExpanded = expandedRows.has(row.id);
                    return (
                      <Fragment key={row.id}>
                      <motion.tr
                        variants={rowVariants}
                        onClick={() => toggleRow(row)}
                        onMouseEnter={() => {
                          // A short pause skips rows the pointer only passes over.
                          clearTimeout(hoverTimerRef.current);
                          hoverTimerRef.current = setTimeout(() => loadActivities(row), 150);
                        }}
                        onMouseLeave={() => clearTimeout(hoverTimerRef.current)}
                        aria-expanded={isExpanded}
                        className={`cursor-pointer ${isExpanded ? "" : "border-b-4"} border-slate-100 dark:border-slate-900 transition-colors hover:brightness-[0.98] dark:hover:brightness-125 ${rowTone}`}
                      >
                        <td className="px-3 py-1 align-middle">
                          <span className="block text-[13px] leading-[18px] text-slate-800 dark:text-slate-100 line-clamp-2" title={row.siteName}>
                            <HighlightText text={row.siteName} terms={[generalSearch, filterSiteName]} />
                          </span>
                          {row.siteOCN && (
                            <span className="block text-[12px] leading-4 text-slate-500 dark:text-slate-400 truncate" title={row.siteOCN}>
                              <HighlightText text={row.siteOCN} terms={[generalSearch, filterSiteOCN]} />
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1 align-middle">
                          <span className="block text-[13px] text-slate-800 dark:text-slate-100 truncate" title={row.cmsNextTicketNo}>
                            <HighlightText text={row.cmsNextTicketNo} terms={[generalSearch, filterCmsNextTicketNo]} />
                          </span>
                        </td>
                        <td className="px-3 py-1 align-middle">
                          {renderDateCell(row.ticketReceivedDate, formatTicketDate(filterTicketReceivedDate, currentCulture))}
                        </td>
                        <td className="px-3 py-1 align-middle">
                          {renderDateCell(lastActivityAt)}
                          {lastActivityUsers && (
                            <span className="block text-[12px] text-slate-500 dark:text-slate-400 truncate" title={lastActivityUsers}>
                              {localizeOr("By", "By")} {lastActivityUsers}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1 align-middle">
                          {renderDateCell(row.cmsTicketClosedOn)}
                        </td>
                        <td className="px-3 py-1 align-middle text-[13px] text-slate-800 dark:text-slate-100 whitespace-nowrap">
                          {formatDurationHours(row.activityTotalDuration)}
                        </td>
                        <td className="px-3 py-1 align-middle">
                          <span className="block text-[13px] text-slate-800 dark:text-slate-100 truncate" title={row.createdBy}>
                            {row.createdBy ? <HighlightText text={row.createdBy} terms={[generalSearch, filterCreatedBy]} /> : ""}
                          </span>
                        </td>
                        <td className="px-3 py-1 align-middle text-center">
                          <span className={`${pillClass} ${row.isPRE ? "bg-red-50 border-red-200 text-red-600 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300" : neutralPill}`}>
                            {row.isPRE ? localize("Yes") : localize("No")}
                          </span>
                        </td>
                        <td className="px-3 py-1 align-middle text-center">
                          <span className={`${pillClass} ${Number(row.status) === 1 ? pinkPill : Number(row.status) === 2 ? greenPill : neutralPill}`}>
                            {Number(row.status) === 3
                              ? localize("VoidAMSTicketButtonText")
                              : statusLabel(row.status) || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-1 align-middle text-center">
                          <span className={`${pillClass} ${isVerified ? greenPill : pinkPill}`}>
                            {isVerified ? localize("Yes") : localize("No")}
                          </span>
                        </td>
                        {/* The Actions menu must not open or close the row. */}
                        <td className="px-3 py-1 align-middle text-center" onClick={(event) => event.stopPropagation()}>
                          <RowActions
                            row={row}
                            moreActionsText={localize("Actions")}
                            editButtonText={localize("ViewEditButtonText")}
                            voidButtonText={localize("VoidAMSTicketButtonText")}
                            reopenButtonText={localize("ReOpenAMSTicketButtonText")}
                            auditLogsButtonText={localize("AuditLogsButtonText")}
                            onUpdateData={(canEdit || canViewMode) ? () => {
                              setActionItem(row);
                              setActionType(canEdit && !isVoidedTicket(row) ? "edit" : "detail");
                            } : undefined}
                            onVoid={canVoid ? () => { setActionItem(row); setActionType("void"); } : undefined}
                            onReopen={canReopen ? () => { setActionItem(row); setActionType("reopen"); } : undefined}
                            onAuditLog={canViewAuditLog ? () => navigate(`/audit-logs?primaryKey=${row.id}&entityName=AMSTicket`) : undefined}
                          />
                        </td>
                      </motion.tr>
                      {isExpanded && (
                        <tr className="border-b-4 border-slate-100 dark:border-slate-900">
                          <td colSpan={columns.length} className="p-0">
                            {renderActivities(row)}
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    );
                  })
                )}
              </motion.tbody>
            </table>
          </div>
        </div>

        {/* Pagination Section (CodePage Style) */}
        <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/40 gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">
                {localize("PagerShowMenuEntries").replace("_MENU_", "")}
              </span>
              <AppSelect
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-slate-50 dark:bg-slate-700 border-none rounded-lg text-[10px] font-black px-2 py-1 outline-none"
              >
                {[10, 20, 50, 100].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </AppSelect>
            </div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              {pagerInfoText}
            </p>
          </div>

          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 disabled:opacity-20 hover:text-pink-500 transition-all"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 disabled:opacity-20 hover:text-pink-500 transition-all"
            >
              <ChevronLeftIcon size={16} />
            </button>
            <div className="h-4 w-px bg-slate-100 dark:bg-slate-700 mx-1"></div>
            <div className="px-2 flex items-center gap-1.5">
              <span className="text-[11px] font-black text-pink-600">
                {currentPage}
              </span>
              <span className="text-[10px] font-black text-slate-300">/</span>
              <span className="text-[10px] font-black text-slate-500">
                {totalPages || 1}
              </span>
            </div>
            <div className="h-4 w-px bg-slate-100 dark:bg-slate-700 mx-1"></div>
            <button
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 disabled:opacity-20 hover:text-pink-500 transition-all"
            >
              <ChevronRight size={16} />
            </button>
            <button
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(totalPages)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 disabled:opacity-20 hover:text-pink-500 transition-all"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
        </div>
      </motion.div>

      {/* Modals */}
      <TicketModal
        open={actionType === "create"}
        canCloseTicket={canClose}
        localize={localize}
        onClose={() => setActionType("")}
        onSave={async (payload) => {
          try {
            await amsTicketApi.create(payload);
            toast(localize("SavedSuccessfully"));
            setActionType("");
            invalidateAllTicketsCache();
            warmTicketCache();
            fetchTickets();
          } catch (error) {
            const errorData = error.response?.data?.error;
            if (errorData?.validationErrors?.length > 0) {
              const msg = errorData.validationErrors.map((e) => e.message).join("\n");
              toast(msg, "error");
            } else if (errorData?.message) {
              toast(errorData.message, "error");
            } else {
              toast(localize("DefaultErrorMessage"), "error");
            }
          }
        }}
      />


      {actionItem && (
        <>
          <TicketModal
            open={actionType === "edit" || actionType === "detail"}
            viewMode={actionType === "detail"}
            localize={localize}
            onClose={() => {
              setActionType("");
              setActionItem(null);
            }}
            ticket={actionItem}
            canCloseTicket={canClose}
            onSave={async (payload) => {
              if (isVoidedTicket(actionItem)) {
                setActionType("detail");
                return;
              }

              const dataToSave = { ...payload };
              const isClosingTicket =
                dataToSave.activeTab === "Ticket Verification";
              delete dataToSave.activeTab;
              try {
                if (isClosingTicket) {
                  await amsTicketApi.close(actionItem.id, dataToSave);
                } else {
                  const settingsAreUnchanged = await amsTicketApi.isSettingsSameAfterReOpening(dataToSave);
                  const setNewSettings = settingsAreUnchanged
                    ? false
                    : window.confirm(localize("AreYouSure"));
                  await amsTicketApi.update(actionItem.id, dataToSave, { setNewSettings });
                }
                toast(localize("SavedSuccessfully"));
                setActionType("");
                setActionItem(null);
                invalidateAllTicketsCache();
                warmTicketCache();
                fetchTickets();
              } catch (error) {
                const errorData = error.response?.data?.error;
                if (errorData?.validationErrors?.length > 0) {
                  const msg = errorData.validationErrors.map((e) => e.message).join("\n");
                  toast(msg, "error");
                } else if (errorData?.message) {
                  toast(errorData.message, "error");
                } else {
                  toast(localize("DefaultErrorMessage"), "error");
                }
              }
            }}
          />
          <DeleteConfirmModal
            open={actionType === "void"}
            item={actionItem}
            onCancel={() => {
              setActionType("");
              setActionItem(null);
            }}
            onConfirm={() => handleVoid(actionItem)}
            title={localize("VoidAMSTicketButtonText")}
            message={localize("VoidTicketConfirmMessage")}
            confirmText={localize("VoidAMSTicketButtonText")}
            cancelText={localize("CancelButtonText")}
            processingText={localize("ProcessingWithThreeDot")}
            compact
            loading={actionLoading}
            blurBackdrop={false}
          />
          <DeleteConfirmModal
            open={actionType === "reopen"}
            item={actionItem}
            onCancel={() => {
              setActionType("");
              setActionItem(null);
            }}
            onConfirm={() => handleReopen(actionItem)}
            title={localize("ReOpenAMSTicketButtonText")}
            message={localize("ReOpenTicketConfirmMessage")}
            confirmText={localize("Yes")}
            cancelText={localize("CancelButtonText")}
            processingText={localize("ProcessingWithThreeDot")}
            compact
            loading={actionLoading}
            blurBackdrop={false}
          />
        </>
      )}

    </motion.div>
  );
}
