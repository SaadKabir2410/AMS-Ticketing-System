import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  Clock,
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
  ArrowRight,
  MoreVertical,
  Check,
  ShieldCheck,
  ShieldAlert
} from "lucide-react";
import { Popper, ClickAwayListener, Paper, Box, MenuItem, ListItemText } from "@mui/material";

import { useAuth } from "../context/AuthContextHook";
import amsTicketApi from "../services/api/amsTicketApi";
import { useToast } from "../component/common/ToastContext";
import TicketModal from "../component/common/TicketModal";
import DeleteConfirmModal from "../component/common/DeleteConfirmation";
import UnclosedTicketsModal from "../component/common/UnclosedTicketsModal";
import { ActionsMenu } from "../component/common/ResourcePage";

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
  const activeTerms = terms.filter((t) => t && String(t).trim().length > 0);
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
            className="bg-pink-100 dark:bg-pink-500/30 text-pink-700 dark:text-pink-100 px-0.5 rounded-[1px]"
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

const RowActions = ({ row, onUpdateData, onVoid, onAuditLog, onReopen, isAdmin }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const handleClick = (e) => {
    setAnchorEl(anchorEl ? null : e.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <ClickAwayListener onClickAway={handleClose}>
      <div className="flex items-center justify-center gap-1">
        <button onClick={handleClick} className="p-1 text-slate-400 hover:text-slate-600 transition-colors" title="More Actions">
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
              {!isAdmin && onUpdateData && (
                <MenuItem onClick={() => { handleClose(); onUpdateData(); }}>
                  <ListItemText primary="Update Data" primaryTypographyProps={{ fontSize: "12px", fontWeight: 600 }} />
                </MenuItem>
              )}
              {!isAdmin && row?.status !== 2 && onVoid && (
                <MenuItem onClick={() => { handleClose(); onVoid(); }}>
                  <ListItemText primary="Void" primaryTypographyProps={{ fontSize: "12px", fontWeight: 600 }} />
                </MenuItem>
              )}
              {!isAdmin && row?.status === 2 && onReopen && (
                <MenuItem onClick={() => { handleClose(); onReopen(); }}>
                  <ListItemText primary="Reopen Ticket" primaryTypographyProps={{ fontSize: "12px", fontWeight: 600 }} />
                </MenuItem>
              )}
              <MenuItem onClick={() => { handleClose(); onAuditLog(); }}>
                <ListItemText primary="Audit Log" primaryTypographyProps={{ fontSize: "12px", fontWeight: 600 }} />
              </MenuItem>
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
  const isAdmin = user?.role?.toLowerCase().includes("admin");

  // --- States ---
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isUnclosedModalOpen, setIsUnclosedModalOpen] = useState(false);
  const [sortKey, setSortKey] = useState("status");
  const [sortDir, setSortDir] = useState("asc");

  // Modals
  const [actionItem, setActionItem] = useState(null);
  const [actionType, setActionType] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterIsPRE, setFilterIsPRE] = useState("");
  const [filterIsVerified, setFilterIsVerified] = useState("");
  const [filterCreatedBy, setFilterCreatedBy] = useState("");
  const [filterTicketDelayed, setFilterTicketDelayed] = useState("");

  const activeFilterCount = [filterStatus, filterIsPRE, filterIsVerified, filterCreatedBy, filterTicketDelayed].filter(v => v !== "").length;

  const [globalStats, setGlobalStats] = useState({ open: 0, closed: 0, voided: 0, inProgress: 0, verified: 0, nonVerified: 0, lateClosures: 0 });

  // Cache for client-side filtering to avoid redundant full-table fetches
  const allTicketsCache = useRef({ paramsKey: null, items: null });

  // Carousel ref
  const kpiScrollRef = useRef(null);

  const scrollKPI = (direction) => {
    if (kpiScrollRef.current) {
      const scrollAmount = 300; // width of one card + gap roughly
      kpiScrollRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  const fetchGlobalStats = async (currentSearch = search) => {
    try {
      const baseParams = {
        search: currentSearch,
      };

      const safeFetch = (params) => amsTicketApi.getAll(params).catch(() => ({ totalCount: 0, items: [] }));

      const [openRes, closedRes, voidRes, initialAllRes] = await Promise.all([
        safeFetch({ ...baseParams, status: 1, page: 1, perPage: 1 }),
        safeFetch({ ...baseParams, status: 2, page: 1, perPage: 1 }),
        safeFetch({ ...baseParams, status: 3, page: 1, perPage: 1 }),
        safeFetch({ ...baseParams, page: 1, perPage: 1000 })
      ]);
      const openCount = openRes.totalCount || 0;
      const closedCount = closedRes.totalCount || 0;
      const voidCount = voidRes.totalCount || 0;
      const totalCount = initialAllRes.totalCount || 0;

      let allItems = initialAllRes.items || [];

      const calcStats = (items) => {
        const verifiedCount = items.filter(r => r.ticketResolutionVerifiedBy || r.ticketResolutionVerifiedById).length;
        const nonVerifiedCount = totalCount > 0 ? totalCount - verifiedCount : 0;
        let lateClosuresCount = 0;
        const now = new Date();
        items.forEach(ticket => {
          if (ticket.status === 3) return; // ignore void
          if (!ticket.ticketReceivedDate) return;
          const received = new Date(ticket.ticketReceivedDate);
          let end = now;
          if (ticket.status === 2) {
            if (ticket.cmsTicketClosedOn) {
              end = new Date(ticket.cmsTicketClosedOn);
            } else if (ticket.serviceClosedDate) {
              end = new Date(ticket.serviceClosedDate);
            }
          }
          const diffHours = (end - received) / (1000 * 60 * 60);
          if (diffHours > 24) {
            lateClosuresCount++;
          }
        });
        return { verifiedCount, nonVerifiedCount, lateClosuresCount };
      };

      const initialStats = calcStats(allItems);
      setGlobalStats({
        open: openCount,
        closed: closedCount,
        voided: voidCount,
        inProgress: Math.floor(openCount * 0.2),
        verified: initialStats.verifiedCount,
        nonVerified: initialStats.nonVerifiedCount,
        lateClosures: initialStats.lateClosuresCount,
      });

      if (totalCount > allItems.length && allItems.length > 0) {
        const limit = 1000;
        const pagesToFetch = Math.ceil(totalCount / limit);
        for (let i = 2; i <= pagesToFetch; i++) {
          const res = await safeFetch({ ...baseParams, page: i, perPage: limit });
          if (res.items) {
            allItems = allItems.concat(res.items);
            const stats = calcStats(allItems);
            setGlobalStats(prev => ({
              ...prev,
              verified: stats.verifiedCount,
              nonVerified: stats.nonVerifiedCount,
              lateClosures: stats.lateClosuresCount,
            }));
          }
          // Yield to not block other network requests like fetchTickets
          await new Promise(r => setTimeout(r, 50));
        }
      }
    } catch (e) {
      console.error("Failed to fetch global stats", e);
    }
  };

  // --- Initialization and Watchers ---
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchGlobalStats(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTickets();
    }, 400);
    return () => clearTimeout(timer);
  }, [search, currentPage, pageSize, sortKey, sortDir, filterStatus, filterIsPRE, filterIsVerified, filterCreatedBy, filterTicketDelayed]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const isClientSideFiltering = filterIsPRE !== "" || filterIsVerified !== "" || filterCreatedBy !== "" || filterTicketDelayed !== "";

      const params = {
        search,
        sortKey,
        sortDir,
      };
      if (filterStatus !== "") params.status = Number(filterStatus);

      let items = [];
      let finalTotalCount = 0;

      if (!isClientSideFiltering) {
        // Fetch just the current page
        const data = await amsTicketApi.getAll({
          ...params,
          page: currentPage,
          perPage: pageSize,
        });
        items = data.items || [];
        finalTotalCount = data.totalCount || 0;
      } else {
        const paramsKey = JSON.stringify(params);
        if (allTicketsCache.current.paramsKey === paramsKey && allTicketsCache.current.items) {
          items = [...allTicketsCache.current.items];
        } else {
          // Fetch all items to apply client-side filtering correctly
          const limit = 1000;
          const initialRes = await amsTicketApi.getAll({ ...params, page: 1, perPage: limit });
          items = initialRes.items || [];
          const serverTotalCount = initialRes.totalCount || 0;

          if (serverTotalCount > items.length && items.length > 0) {
            const pagesToFetch = Math.ceil(serverTotalCount / limit);
            for (let i = 2; i <= pagesToFetch; i++) {
              const res = await amsTicketApi.getAll({ ...params, page: i, perPage: limit }).catch(() => ({ items: [] }));
              if (res.items) {
                items = items.concat(res.items);
              }
            }
          }
          allTicketsCache.current = { paramsKey, items: [...items] };
        }
      }

      // Always show Open/New tickets (status === 1) first, then by received date (newest first)
      items = [...items].sort((a, b) => {
        const aIsOpen = a.status === 1;
        const bIsOpen = b.status === 1;
        if (aIsOpen && !bIsOpen) return -1;
        if (!aIsOpen && bIsOpen) return 1;
        // Within same status, sort by received date descending
        const aDate = a.ticketReceivedDate ? new Date(a.ticketReceivedDate).getTime() : 0;
        const bDate = b.ticketReceivedDate ? new Date(b.ticketReceivedDate).getTime() : 0;
        return bDate - aDate;
      });

      if (isClientSideFiltering) {
        // Apply client-side filters
        if (filterIsPRE !== "") {
          items = items.filter(r => String(r.isPRE) === filterIsPRE);
        }
        if (filterIsVerified !== "") {
          const verified = filterIsVerified === "true";
          items = items.filter(r => {
            const isVer = !!(r.ticketResolutionVerifiedBy || r.ticketResolutionVerifiedById);
            return isVer === verified;
          });
        }
        if (filterCreatedBy !== "") {
          const lowerSearch = filterCreatedBy.toLowerCase();
          items = items.filter(r => r.createdBy && r.createdBy.toLowerCase().includes(lowerSearch));
        }
        if (filterTicketDelayed === "late_closures") {
          const now = new Date();
          items = items.filter(ticket => {
            if (ticket.status === 3) return false;
            if (!ticket.ticketReceivedDate) return false;

            const received = new Date(ticket.ticketReceivedDate);
            let end = now;
            if (ticket.status === 2) {
              if (ticket.cmsTicketClosedOn) {
                end = new Date(ticket.cmsTicketClosedOn);
              } else if (ticket.serviceClosedDate) {
                end = new Date(ticket.serviceClosedDate);
              }
            }
            const diffHours = (end - received) / (1000 * 60 * 60);
            return diffHours > 24;
          });
        }

        finalTotalCount = items.length;
        // Client-side pagination
        const startIndex = (currentPage - 1) * pageSize;
        items = items.slice(startIndex, startIndex + pageSize);
      }

      setTickets(items);
      setTotalCount(finalTotalCount);
    } catch (err) {
      toast("Failed to fetch tickets", "error");
    } finally {
      setLoading(false);
    }
  };


  const handleDelete = async (row) => {
    try {
      setActionLoading(true);
      await amsTicketApi.delete(row);
      toast("Ticket voided successfully");
      setActionItem(null);
      setActionType("");
      fetchGlobalStats();
      fetchTickets();
    } catch (err) {
      toast("Failed to void ticket", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopen = async (row) => {
    try {
      setActionLoading(true);
      await amsTicketApi.reOpen(row.id, {});
      toast("Ticket reopened successfully");
      setActionItem(null);
      setActionType("");
      fetchGlobalStats();
      fetchTickets();
    } catch (err) {
      toast("Failed to reopen ticket", "error");
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
    { key: "siteName", label: "SITE NAME", width: 140 },
    { key: "siteOCN", label: "SITE OCN", width: 100 },
    { key: "cmsNextTicketNo", label: "CMS NEXT TICKET NO", width: 140 },
    { key: "ticketReceivedDate", label: "RECEIVED DATE TIME", width: 130, sortable: true },
    { key: "ticketClosedByName", label: "TICKET CLOSED BY", width: 120 },
    { key: "activityTotalDuration", label: "TOTAL DURATION (H)", width: 120 },
    { key: "cmsTicketClosedOn", label: "CMS CLOSED ON", width: 120 },
    { key: "serviceClosedDate", label: "SERVICE CLOSED", width: 120 },
    { key: "status", label: "STATUS", width: 90 },
    { key: "isPRE", label: "PRE", width: 50, align: "center" },
    { key: "isVerified", label: "VERIFIED", width: 80, align: "center" },
    { key: "createdBy", label: "CREATED BY", width: 110 },
    { key: "actions", label: "ACTIONS", width: 70, align: "center" },
  ];

  const totalPages = Math.ceil(totalCount / pageSize);



  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-full w-full bg-[#f8fafc] dark:bg-slate-950 p-1 pb-[10px] flex flex-col relative overflow-visible font-[Arial]"
    >
      <style>{`
        *::-webkit-scrollbar { display: none !important; }
        * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
        
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
        <div className="flex flex-col pt-3 pb-1 px-6 transition-colors border-b border-slate-100 dark:border-slate-800/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-0">
            <div className="flex flex-col">
              <nav className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 mb-2">
                <span>Home</span>
                <span className="text-slate-300">/</span>
                <span className="text-pink-500">AMS Tickets</span>
              </nav>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                AMS Tickets
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Advanced Filter Toggle */}
              <button
                onClick={() => setShowFilters(v => !v)}
                className={`relative inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${showFilters || activeFilterCount > 0
                  ? "bg-pink-50 border-pink-300 text-pink-600 dark:bg-pink-500/10 dark:border-pink-500/40 dark:text-pink-400"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-pink-500 hover:border-pink-300"
                  }`}
              >
                <Filter size={13} />
                Advanced Filter
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-pink-500 text-white text-[9px] font-black flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {!isAdmin && (
                <button
                  onClick={() => { setActionItem(null); setActionType("create"); }}
                  className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-medium shadow-sm transition-all bg-pink-500 hover:bg-pink-600 text-white"
                >
                  <Plus size={16} className="mr-1.5" />
                  New Ticket
                </button>
              )}
            </div>
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
                <div className="flex flex-wrap items-center gap-3 py-3 border-t border-slate-100 dark:border-slate-800/50">
                  {/* Search */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search size={13} className="text-slate-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search tickets..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 pr-7 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500 transition-all placeholder:text-slate-400 min-w-[200px]"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-pink-500"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>

                  {/* Status */}
                  <select
                    value={filterStatus}
                    onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                    className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500 transition-all text-slate-700 dark:text-slate-200"
                  >
                    <option value="">Ticket Status</option>
                    <option value="1">Open</option>
                    <option value="2">Closed</option>
                    <option value="3">Void</option>
                  </select>

                  {/* PRE */}
                  <select
                    value={filterIsPRE}
                    onChange={e => { setFilterIsPRE(e.target.value); setCurrentPage(1); }}
                    className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500 transition-all text-slate-700 dark:text-slate-200"
                  >
                    <option value="">PRE Status</option>
                    <option value="true">PRE</option>
                    <option value="false">Non-PRE</option>
                  </select>

                  {/* Verified */}
                  <select
                    value={filterIsVerified}
                    onChange={e => { setFilterIsVerified(e.target.value); setCurrentPage(1); }}
                    className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500 transition-all text-slate-700 dark:text-slate-200"
                  >
                    <option value="">Verification Status</option>
                    <option value="true">Verified</option>
                    <option value="false">Non-Verified</option>
                  </select>

                  {/* Ticket Delayed */}
                  <select
                    value={filterTicketDelayed}
                    onChange={e => { setFilterTicketDelayed(e.target.value); setCurrentPage(1); }}
                    className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500 transition-all text-slate-700 dark:text-slate-200"
                  >
                    <option value="">Delayed Status</option>
                    <option value="late_closures">Late Closures</option>
                  </select>

                  {/* Created By */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Created By..."
                      value={filterCreatedBy}
                      onChange={(e) => { setFilterCreatedBy(e.target.value); setCurrentPage(1); }}
                      className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500 transition-all placeholder:text-slate-400 min-w-[150px] text-slate-700 dark:text-slate-200"
                    />
                    {filterCreatedBy && (
                      <button
                        onClick={() => { setFilterCreatedBy(""); setCurrentPage(1); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-pink-500"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>

                  {/* Clear Filters */}
                  {(activeFilterCount > 0 || search) && (
                    <button
                      onClick={() => { setFilterStatus(""); setFilterIsPRE(""); setFilterIsVerified(""); setFilterCreatedBy(""); setFilterTicketDelayed(""); setSearch(""); setCurrentPage(1); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-200 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                    >
                      <X size={11} />
                      Clear All
                    </button>
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
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Open Tickets</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{stats.open}</span>
                </div>
              </div>

              {/* In Progress */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center gap-2 shadow-sm snap-start">
                <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                  <Clock size={18} strokeWidth={2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">In Progress</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{stats.inProgress}</span>
                </div>
              </div>

              {/* Verified Tickets */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center gap-2 shadow-sm snap-start">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                  <ShieldCheck size={18} strokeWidth={2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Verified  </span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{stats.verified}</span>
                </div>
              </div>

              {/* Non Verified Tickets */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center gap-2 shadow-sm snap-start">
                <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
                  <ShieldAlert size={18} strokeWidth={2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Non Verified</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{stats.nonVerified}</span>
                </div>
              </div>

              {/* Closed Today */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center gap-2 shadow-sm snap-start">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                  <CheckCircle2 size={18} strokeWidth={2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Closed  </span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{stats.closed}</span>
                </div>
              </div>

              {/* Void Tickets */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center gap-2 shadow-sm snap-start">
                <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-500/10 flex items-center justify-center text-slate-500 shrink-0">
                  <X size={18} strokeWidth={2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Void</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{stats.voided}</span>
                </div>
              </div>

              {/* Late Closures */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center gap-2 shadow-sm snap-start min-w-[140px]">
                <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
                  <AlertCircle size={18} strokeWidth={2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 truncate">Late Closures</span>
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
                          <div className="flex flex-col">
                            <ChevronRight size={10} className={`-rotate-90 -mb-1 ${sortKey === col.key && sortDir === "asc" ? "text-pink-500" : "text-slate-300 dark:text-slate-600"}`} />
                            <ChevronRight size={10} className={`rotate-90 ${sortKey === col.key && sortDir === "desc" ? "text-pink-500" : "text-slate-300 dark:text-slate-600"}`} />
                          </div>
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
                      No tickets found
                    </td>
                  </tr>
                ) : (
                  tickets.map((row, idx) => {
                    const ageInfo = formatAge(row.ticketReceivedDate);
                    const assignedUser = row.ticketClosedByName || row.createdBy || "admin";
                    const avatarColor = getAvatarColor(assignedUser);

                    return (
                      <motion.tr
                        key={row.id}
                        variants={rowVariants}
                        className={`group transition-all duration-200 border-b border-slate-50 dark:border-slate-800/30
                            ${row.status === 1 ? "bg-rose-50/30 dark:bg-rose-950/20" :
                            row.status === 2 ? "bg-emerald-50/30 dark:bg-emerald-950/20" :
                              "bg-white dark:bg-slate-900"}`}
                      >
                        {columns.map((col, colIdx) => (
                          <td
                            key={col.key}
                            className={`px-5 py-3 text-${col.align || "left"} transition-colors`}
                          >
                            <div className="text-[12px] leading-tight">
                              {col.key === "siteName" ? (
                                <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[140px] block" title={row.siteName}>
                                  <HighlightText text={row.siteName} terms={[search]} />
                                </span>
                              ) : col.key === "siteOCN" ? (
                                <span className="text-slate-600 dark:text-slate-400 font-medium">
                                  <HighlightText text={row.siteOCN} terms={[search]} />
                                </span>
                              ) : col.key === "cmsNextTicketNo" ? (
                                <span className="font-bold text-slate-900 dark:text-slate-100">
                                  <HighlightText text={row.cmsNextTicketNo} terms={[search]} />
                                </span>
                              ) : col.key === "ticketReceivedDate" ? (
                                <span className="text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                                  {row.ticketReceivedDate ? new Date(row.ticketReceivedDate).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "—"}
                                </span>
                              ) : col.key === "ticketClosedByName" ? (
                                <span className="text-slate-600 dark:text-slate-400 font-medium">
                                  {row.ticketClosedByName ? <HighlightText text={row.ticketClosedByName} terms={[search]} /> : "—"}
                                </span>
                              ) : col.key === "activityTotalDuration" ? (
                                <span className="font-bold text-blue-500">
                                  {row.activityTotalDuration ? `${row.activityTotalDuration}h` : "0h"}
                                </span>
                              ) : col.key === "cmsTicketClosedOn" ? (
                                <span className="text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                                  {row.cmsTicketClosedOn ? new Date(row.cmsTicketClosedOn).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "—"}
                                </span>
                              ) : col.key === "serviceClosedDate" ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">
                                  {row.serviceClosedDate ? new Date(row.serviceClosedDate).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "—"}
                                </span>
                              ) : col.key === "status" ? (
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap
                                  ${row.status === 1 ? "bg-rose-100 text-rose-600" :
                                    row.status === 2 ? "bg-emerald-100 text-emerald-600" :
                                      row.status === 3 ? "bg-slate-100 text-slate-600" :
                                        "bg-amber-100 text-amber-600"}`}
                                >
                                  {row.status === 1 ? "Open" : row.status === 2 ? "Closed" : row.status === 3 ? "Void" : "In Progress"}
                                </span>
                              ) : col.key === "isPRE" ? (
                                <div className={`w-2 h-2 rounded-full mx-auto ${row.isPRE ? "bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.6)]" : "bg-slate-200 dark:bg-slate-700"}`} />
                              ) : col.key === "isVerified" ? (
                                <div className="flex justify-center w-full">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${(row.ticketResolutionVerifiedBy || row.ticketResolutionVerifiedById) ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
                                    {(row.ticketResolutionVerifiedBy || row.ticketResolutionVerifiedById) ? "Verified" : "Non-verified"}
                                  </span>
                                </div>
                              ) : col.key === "createdBy" ? (
                                <span className="text-slate-600 dark:text-slate-400 font-medium">
                                  {row.createdBy ? <HighlightText text={row.createdBy} terms={[search, filterCreatedBy]} /> : "—"}
                                </span>
                              ) : col.key === "actions" ? (
                                <RowActions
                                  row={row}
                                  isAdmin={isAdmin}
                                  onUpdateData={() => { setActionItem(row); setActionType("edit"); }}
                                  onVoid={() => { setActionItem(row); setActionType("delete"); }}
                                  onReopen={() => { setActionItem(row); setActionType("reopen"); }}
                                  onAuditLog={() => navigate(`/audit-logs?primaryKey=${row.id}&entityName=AMSTicket`)}
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
                Show
              </span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-slate-50 dark:bg-slate-700 border-none rounded-lg text-[10px] font-black px-2 py-1 outline-none"
              >
                {[10, 20, 50, 100].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              <span className="text-slate-900 dark:text-white tabular-nums">
                {totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0}
              </span>
              <span className="mx-1.5 text-slate-300">—</span>
              <span className="text-slate-900 dark:text-white tabular-nums">
                {Math.min(currentPage * pageSize, totalCount)}
              </span>
              <span className="mx-2 lowercase font-bold italic text-slate-300">
                of
              </span>
              <span className="text-pink-500 font-black">{totalCount}</span>
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
        onClose={() => setActionType("")}
        onSave={async (payload) => {
          try {
            await amsTicketApi.create(payload);
            toast("Ticket created successfully");
            setActionType("");
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
              toast("Failed to create ticket", "error");
            }
          }
        }}
      />


      {actionItem && (
        <>
          <TicketModal
            open={actionType === "edit" || actionType === "detail"}
            viewMode={actionType === "detail"}
            onClose={() => {
              setActionType("");
              setActionItem(null);
            }}
            ticket={actionItem}
            onSave={async (payload) => {
              const { activeTab, ...dataToSave } = payload;
              try {
                if (activeTab === "Ticket Verification") {
                  await amsTicketApi.close(actionItem.id, dataToSave);
                  toast("Ticket closed successfully");
                } else {
                  await amsTicketApi.update(actionItem.id, dataToSave);
                  toast("Ticket updated successfully");
                }
                setActionType("");
                setActionItem(null);
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
                  toast("Failed to save ticket", "error");
                }
              }
            }}
          />
          <DeleteConfirmModal
            open={actionType === "delete"}
            item={actionItem}
            onCancel={() => {
              setActionType("");
              setActionItem(null);
            }}
            onConfirm={() => handleDelete(actionItem)}
            title="Void Ticket"
            message={`Are you sure you want to void ticket #${actionItem?.cmsNextTicketNo}? This action cannot be undone.`}
            loading={actionLoading}
          />
          <DeleteConfirmModal
            open={actionType === "reopen"}
            item={actionItem}
            onCancel={() => {
              setActionType("");
              setActionItem(null);
            }}
            onConfirm={() => handleReopen(actionItem)}
            title="Reopen Ticket"
            message={`Are you sure you want to ReOpen this ticket?`}
            confirmText="Yes"
            loading={actionLoading}
          />
        </>
      )}

    </motion.div>
  );
}
