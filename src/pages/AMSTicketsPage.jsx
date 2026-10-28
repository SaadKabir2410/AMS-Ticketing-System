import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  AlertCircle,
  Edit,
  ChevronRight,
  ChevronLeft as ChevronLeftIcon,
  ChevronsLeft,
  ChevronsRight,
  GripVertical,
  Ticket,
  Eye,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ArrowRight,
  MoreVertical,
  Check,
  ShieldCheck,
  ShieldAlert
} from "lucide-react";
import { Popper, ClickAwayListener, Paper, Box, MenuItem, ListItemText } from "@mui/material";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";

import { useAuth } from "../context/AuthContextHook";
import amsTicketApi from "../services/api/amsTicketApi";
import { useToast } from "../component/common/ToastContext";
import TicketModal from "../component/common/TicketModal";
import DeleteConfirmModal from "../component/common/DeleteConfirmation";
import { ActionsMenu } from "../component/common/ResourcePage";
import { usePermission } from "../hooks/usePermission";
import { useBackendEnumOptions } from "../hooks/useBackendEnumOptions";
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

const formatTicketDateTime = (value, locale) => {
  if (!value) return "";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

const sortTicketsByStatusAndDate = (items) => items.sort((a, b) => {
  const aIsOpen = Number(a.status) === 1;
  const bIsOpen = Number(b.status) === 1;
  if (aIsOpen && !bIsOpen) return -1;
  if (!aIsOpen && bIsOpen) return 1;
  const aDate = a.ticketReceivedDate ? new Date(a.ticketReceivedDate).getTime() : 0;
  const bDate = b.ticketReceivedDate ? new Date(b.ticketReceivedDate).getTime() : 0;
  return bDate - aDate;
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
  const [sortKey, setSortKey] = useState("status");
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

  const [globalStats, setGlobalStats] = useState({ open: 0, closed: 0, voided: 0, verified: 0, nonVerified: 0, lateClosures: 0 });

  const ticketFetchRequestId = useRef(0);

  // Carousel ref
  const kpiScrollRef = useRef(null);

  const scrollKPI = (direction) => {
    if (kpiScrollRef.current) {
      const scrollAmount = 300; // width of one card + gap roughly
      kpiScrollRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

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

  const fetchGlobalStats = async () => {
    try {
      const allItems = await loadAllTickets();
      const totalCount = allItems.length;
      const openCount = allItems.filter(ticket => Number(ticket.status) === 1).length;
      const closedCount = allItems.filter(ticket => Number(ticket.status) === 2).length;
      const voidCount = allItems.filter(ticket => Number(ticket.status) === 3).length;

      const calcStats = (items) => {
        const verifiedCount = items.filter(r =>
          r.ticketResolutionVerifiedBy ||
          r.ticketResolutionVerifiedById ||
          r.ticketResolutionVerifiedOn
        ).length;
        const nonVerifiedCount = totalCount > 0 ? totalCount - verifiedCount : 0;
        let lateClosuresCount = 0;
        const now = new Date();
        items.forEach(ticket => {
          if (Number(ticket.status) === 3) return; // ignore void
          if (!ticket.ticketReceivedDate) return;
          const received = new Date(ticket.ticketReceivedDate);
          if (Number.isNaN(received.getTime())) return;
          let end = now;
          if (Number(ticket.status) === 2) {
            if (ticket.cmsTicketClosedOn) {
              end = new Date(ticket.cmsTicketClosedOn);
            } else if (ticket.serviceClosedDate) {
              end = new Date(ticket.serviceClosedDate);
            }
          }
          if (Number.isNaN(end.getTime())) return;
          const diffHours = (end - received) / (1000 * 60 * 60);
          if (diffHours > 24) {
            lateClosuresCount++;
          }
        });
        return { verifiedCount, nonVerifiedCount, lateClosuresCount };
      };

      const stats = calcStats(allItems);
      setGlobalStats({
        open: openCount,
        closed: closedCount,
        voided: voidCount,
        verified: stats.verifiedCount,
        nonVerified: stats.nonVerifiedCount,
        lateClosures: stats.lateClosuresCount,
      });
    } catch (e) {
      console.error("Failed to fetch global stats", e);
    }
  };

  // --- Initialization and Watchers ---
  useEffect(() => {
    // Start warming the shared search cache immediately on page entry.
    fetchGlobalStats();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTickets();
    }, generalSearch.trim() ? 300 : activeFilterCount > 0 ? 100 : 250);
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
    setLoading(true);
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
        sortKey,
        sortDir,
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
        sortTicketsByStatusAndDate(items);
        // Client-side pagination
        const startIndex = (currentPage - 1) * pageSize;
        items = items.slice(startIndex, startIndex + pageSize);
      } else {
        sortTicketsByStatusAndDate(items);
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
      fetchGlobalStats();
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
      fetchGlobalStats();
      fetchTickets();
    } catch (err) {
      toast(localize("DefaultErrorMessage"), "error");
    } finally {
      setActionLoading(false);
    }
  };

  // --- Computed Stats ---
  const stats = globalStats;

  const handleSort = (key) => {
    if (key === "actions") return;
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // --- Table Configuration ---
  const columns = [
    { key: "siteName", label: localize("SiteName"), width: 140 },
    { key: "siteOCN", label: localize("SiteOCN"), width: 100 },
    { key: "cmsNextTicketNo", label: localize("CMSNextTicketNo"), width: 140 },
    { key: "ticketReceivedDate", label: localize("TicketReceivedDate"), width: 130, sortable: true },
    { key: "ticketClosedByName", label: localize("TicketClosedById"), width: 120 },
    { key: "activityTotalDuration", label: localize("ActivityTotalDuration"), width: 120 },
    { key: "cmsTicketClosedOn", label: localize("CMSTicketClosedOn"), width: 120 },
    { key: "serviceClosedDate", label: localize("ServiceClosedDate"), width: 120 },
    { key: "status", label: localize("Status"), width: 90 },
    { key: "isPRE", label: localize("IsPRE"), width: 50, align: "center" },
    { key: "isVerified", label: localize("TicketVerification"), width: 80, align: "center" },
    { key: "createdBy", label: localize("CreatedBy"), width: 110 },
    { key: "actions", label: localize("Actions"), width: 70, align: "center" },
  ];

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
        className="flex-1 w-full bg-white dark:bg-[#161920] border border-slate-200 dark:border-slate-800/50 shadow-sm flex flex-col rounded-3xl"
      >
        {/* ── Header Row ── */}
        <div className="app-page-header flex flex-col pt-3 pb-1 px-6 transition-colors">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-0">
            <div className="flex flex-col">
              <nav className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 mb-2">
                <span>{localize("Home")}</span>
                <span className="text-slate-300">/</span>
                <span className="text-pink-500">{localize("AMSTickets")}</span>
              </nav>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {localize("AMSTickets")}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {canCreate && (
                <button
                  onClick={() => { setActionItem(null); setActionType("create"); }}
                  className="app-primary-button inline-flex items-center px-5 py-2.5 text-xs"
                >
                  <Plus size={16} className="mr-1.5" />
                  {localize("NewAMSTicket")}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 mt-2">
            <div className="relative w-full sm:max-w-xl">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search
                  size={14}
                  className={generalSearch ? "text-pink-500" : "text-slate-400"}
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
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200/60 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/50 text-xs outline-none transition-all focus:border-pink-600 focus:ring-4 focus:ring-pink-600/10 shadow-sm font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
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
              className={`relative inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${showFilters || activeFilterCount > 0
                ? "bg-pink-50 border-pink-300 text-pink-600 dark:bg-pink-500/10 dark:border-pink-500/40 dark:text-pink-400"
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-pink-500 hover:border-pink-300"
                }`}
            >
              <Filter size={14} />
              {localize("AdvancedSearch")}
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-pink-500 text-white text-[9px] font-black flex items-center justify-center">
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

          {/* ── Stats Cards Carousel ── */}
          <div className="relative group/kpi mt-2 mb-2">
            <div
              ref={kpiScrollRef}
              className="flex justify-between gap-4 overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {/* Open Tickets */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center gap-2 shadow-sm snap-start">
                <div className="w-10 h-10 rounded-lg bg-pink-50 dark:bg-pink-500/10 flex items-center justify-center text-pink-500 shrink-0">
                  <Ticket size={18} strokeWidth={2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">{statusLabel(1)}</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{stats.open}</span>
                </div>
              </div>

              {/* Verified Tickets */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center gap-2 shadow-sm snap-start">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                  <ShieldCheck size={18} strokeWidth={2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">{`${localize("TicketVerification")}: ${localize("Yes")}`}</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{stats.verified}</span>
                </div>
              </div>

              {/* Non Verified Tickets */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center gap-2 shadow-sm snap-start">
                <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
                  <ShieldAlert size={18} strokeWidth={2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">{`${localize("TicketVerification")}: ${localize("No")}`}</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{stats.nonVerified}</span>
                </div>
              </div>

              {/* Closed Today */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center gap-2 shadow-sm snap-start">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                  <CheckCircle2 size={18} strokeWidth={2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">{statusLabel(2)}</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{stats.closed}</span>
                </div>
              </div>

              {/* Void Tickets */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center gap-2 shadow-sm snap-start">
                <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-500/10 flex items-center justify-center text-slate-500 shrink-0">
                  <X size={18} strokeWidth={2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">{localize("VoidAMSTicketButtonText")}</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{stats.voided}</span>
                </div>
              </div>

              {/* Overdue */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center gap-2 shadow-sm snap-start min-w-[140px]">
                <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
                  <AlertCircle size={18} strokeWidth={2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 truncate">{localize("Overdue")}</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{stats.lateClosures}</span>
                </div>
              </div>

            </div>
          </div>
        </div>


        {/* Table Area */}
        <div className="w-full bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 relative min-h-[300px]">
          {loading && (
            <div className="absolute inset-0 z-10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-pink-500" size={32} />
              </div>
            </div>
          )}
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-separate border-spacing-y-1 min-w-max">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 h-[48px] bg-white dark:bg-slate-900">
                  {columns.map((col, i) => (
                    <th
                      key={col.key}
                      onClick={() => col.key !== "actions" && col.key !== "isVerified" && handleSort(col.key)}
                      style={{ width: col.width, minWidth: col.width }}
                      className={`px-5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-${col.align || "left"} whitespace-nowrap ${col.key !== "actions" && col.key !== "isVerified" ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" : ""}`}
                    >
                      <div className={`flex items-center ${col.align === "center" ? "justify-center" : "justify-start"} gap-1`}>
                        {col.label}
                        {col.key !== "actions" && col.key !== "isVerified" && (
                          sortKey === col.key ? (
                            sortDir === "asc" ? (
                              <ArrowUp size={13} className="shrink-0 text-pink-500" />
                            ) : (
                              <ArrowDown size={13} className="shrink-0 text-pink-500" />
                            )
                          ) : (
                            <ArrowUpDown size={12} className="shrink-0 text-slate-400 dark:text-slate-600" />
                          )
                        )}
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
                    return (
                      <motion.tr
                        key={row.id}
                        variants={rowVariants}
                        className={`group transition-all duration-200 border-b border-white/80 dark:border-slate-700/50 hover:brightness-[0.98] dark:hover:brightness-110
                            ${row.status === 1 ? "bg-rose-100/70 dark:bg-rose-950/45" :
                            row.status === 2 ? "bg-emerald-100/70 dark:bg-emerald-950/40" :
                              row.status === 3 ? "bg-slate-200/80 dark:bg-slate-800/80" :
                                "bg-amber-100/70 dark:bg-amber-950/35"}`}
                      >
                        {columns.map((col) => (
                          <td
                            key={col.key}
                            className={`px-5 py-3 text-${col.align || "left"} transition-colors`}
                          >
                            <div className="text-[12px] leading-tight">
                              {col.key === "siteName" ? (
                                <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[140px] block" title={row.siteName}>
                                  <HighlightText text={row.siteName} terms={[generalSearch, filterSiteName]} />
                                </span>
                              ) : col.key === "siteOCN" ? (
                                <span className="text-slate-600 dark:text-slate-400 font-medium">
                                  <HighlightText text={row.siteOCN} terms={[generalSearch, filterSiteOCN]} />
                                </span>
                              ) : col.key === "cmsNextTicketNo" ? (
                                <span className="font-bold text-slate-900 dark:text-slate-100">
                                  <HighlightText text={row.cmsNextTicketNo} terms={[generalSearch, filterCmsNextTicketNo]} />
                                </span>
                              ) : col.key === "ticketReceivedDate" ? (
                                <span className="text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                                  {row.ticketReceivedDate ? (
                                    <HighlightText
                                      text={formatTicketDateTime(row.ticketReceivedDate, currentCulture)}
                                      terms={[formatTicketDate(filterTicketReceivedDate, currentCulture)]}
                                    />
                                  ) : "—"}
                                </span>
                              ) : col.key === "ticketClosedByName" ? (
                                <span className="text-slate-600 dark:text-slate-400 font-medium">
                                  {row.ticketClosedByName ? <HighlightText text={row.ticketClosedByName} terms={[generalSearch, filterTicketClosedBy]} /> : "—"}
                                </span>
                              ) : col.key === "activityTotalDuration" ? (
                                <span className="font-bold text-blue-500">
                                  {row.activityTotalDuration || 0}
                                </span>
                              ) : col.key === "cmsTicketClosedOn" ? (
                                <span className="text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                                  {row.cmsTicketClosedOn ? formatTicketDateTime(row.cmsTicketClosedOn, currentCulture) : "—"}
                                </span>
                              ) : col.key === "serviceClosedDate" ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">
                                  {row.serviceClosedDate ? formatTicketDateTime(row.serviceClosedDate, currentCulture) : "—"}
                                </span>
                              ) : col.key === "status" ? (
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap
                                  ${row.status === 1 ? "bg-rose-100 text-rose-600" :
                                    row.status === 2 ? "bg-emerald-100 text-emerald-600" :
                                      row.status === 3 ? "bg-slate-100 text-slate-600" :
                                        "bg-amber-100 text-amber-600"}`}
                                >
                                  {row.status === 3
                                    ? localize("VoidAMSTicketButtonText")
                                    : statusLabel(row.status) || "—"}
                                </span>
                              ) : col.key === "isPRE" ? (
                                <div className={`w-2 h-2 rounded-full mx-auto ${row.isPRE ? "bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.6)]" : "bg-slate-200 dark:bg-slate-700"}`} />
                              ) : col.key === "isVerified" ? (
                                <div className="flex justify-center w-full">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${(row.ticketResolutionVerifiedBy || row.ticketResolutionVerifiedById) ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
                                    {(row.ticketResolutionVerifiedBy || row.ticketResolutionVerifiedById)
                                      ? localize("Yes")
                                      : localize("No")}
                                  </span>
                                </div>
                              ) : col.key === "createdBy" ? (
                                <span className="text-slate-600 dark:text-slate-400 font-medium">
                                  {row.createdBy ? <HighlightText text={row.createdBy} terms={[generalSearch, filterCreatedBy]} /> : "—"}
                                </span>
                              ) : col.key === "actions" ? (
                                <RowActions
                                  row={row}
                                  moreActionsText={localize("Actions")}
                                  editButtonText="Edit/View"
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
                              ) : (
                                "—"
                              )}
                            </div>
                          </td>
                        ))}
                      </motion.tr>
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
            fetchGlobalStats();
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
                fetchGlobalStats();
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
            loading={actionLoading}
            blurBackdrop={false}
          />
        </>
      )}

    </motion.div>
  );
}
