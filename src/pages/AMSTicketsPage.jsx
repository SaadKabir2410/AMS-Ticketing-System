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
  ArrowRight
} from "lucide-react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";
import { useAuth } from "../context/AuthContextHook";
import amsTicketApi from "../services/api/amsTicketApi";
import { useToast } from "../component/common/ToastContext";
import TicketModal from "../component/common/TicketModal";
import TicketDetailModal from "../component/common/TicketDetailModal";
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
  const [isAdvancedSearch, setIsAdvancedSearch] = useState(false);
  const [isUnclosedModalOpen, setIsUnclosedModalOpen] = useState(false);

  // Modals
  const [actionItem, setActionItem] = useState(null);
  const [actionType, setActionType] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    siteName: "",
    siteOcn: "",
    cmsNextTicketNo: "",
    status: "",
    ticketReceivedDate: null,
  });

  // --- Initialization ---
  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTickets();
    }, 400);
    return () => clearTimeout(timer);
  }, [search, filters, currentPage, pageSize, isAdvancedSearch]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      let formattedTicketDate = undefined;
      let dateFrom = undefined;
      let dateTo = undefined;

      if (isAdvancedSearch && filters.ticketReceivedDate) {
        const d = new Date(filters.ticketReceivedDate);
        formattedTicketDate = d.toISOString().replace(/\.\d{3}Z$/, ".0000000Z");

        // The backend requires DateFrom and DateTo for date searches
        const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

        dateFrom = firstDay.toISOString().replace(/\.\d{3}Z$/, ".0000000Z");
        dateTo = lastDay.toISOString().replace(/\.\d{3}Z$/, ".0000000Z");
      }

      const extraParams = isAdvancedSearch
        ? {
          siteName: filters.siteName || undefined,
          siteOcn: filters.siteOcn || undefined,
          cmsNextTicketNo: filters.cmsNextTicketNo || undefined,
          status: filters.status || undefined,
          ticketReceivedDate: formattedTicketDate,
          dateFrom: dateFrom,
          dateTo: dateTo,
        }
        : {};

      console.log("[AMS] fetchTickets extraParams:", JSON.stringify(extraParams));

      const response = await amsTicketApi.getAll({
        page: currentPage,
        perPage: pageSize,
        search: search,
        sortKey: "status",
        sortDir: "asc",
        ...extraParams,
      });

      let items = response.items || [];
      // Always enforce Open tickets (status === 1) to come first locally 
      // just in case the backend query ignores the sortKey when advanced filters are applied.
      items.sort((a, b) => {
        if (a.status === 1 && b.status !== 1) return -1;
        if (a.status !== 1 && b.status === 1) return 1;
        return 0;
      });

      setTickets(items);
      setTotalCount(response.totalCount || 0);
    } catch (err) {
      toast("Failed to fetch tickets", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setFilters({
      siteName: "",
      siteOcn: "",
      cmsNextTicketNo: "",
      status: "",
      ticketReceivedDate: null,
    });
    setSearch("");
  };

  const handleDelete = async (row) => {
    try {
      setActionLoading(true);
      await amsTicketApi.delete(row);
      toast("Ticket voided successfully");
      setActionItem(null);
      setActionType("");
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
      fetchTickets();
    } catch (err) {
      toast("Failed to reopen ticket", "error");
    } finally {
      setActionLoading(false);
    }
  };

// --- Computed Stats (Mocked from current page for UI) ---
  const stats = useMemo(() => {
    const open = tickets.filter(t => t.status === 1).length;
    const closed = tickets.filter(t => t.status === 2).length;
    let overdue = 0;
    const now = new Date();
    tickets.forEach(t => {
      if (t.status === 1 && t.ticketReceivedDate) {
        if ((now - new Date(t.ticketReceivedDate)) > 8*60*60*1000) overdue++;
      }
    });
    return { open, inProgress: Math.floor(open * 0.2), closed, overdue };
  }, [tickets, totalCount]);

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
    { key: "createdBy", label: "CREATED BY", width: 110 },
    { key: "actions", label: "ACTIONS", width: 70, align: "center" },
  ];

  const totalPages = Math.ceil(totalCount / pageSize);

  const filterRow = (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 transition-all p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={14} className="text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search tickets by site name, OCN, ticket no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500 transition-all placeholder:text-slate-400"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-pink-500"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Site Dropdown */}
        <div className="flex flex-col gap-1 w-[140px]">
          <span className="text-[10px] font-semibold text-slate-500">Site</span>
          <select
            value={filters.siteName}
            onChange={(e) => setFilters((prev) => ({ ...prev, siteName: e.target.value }))}
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium outline-none appearance-none focus:border-pink-500"
          >
            <option value="">All Sites</option>
          </select>
        </div>

        {/* Status Dropdown */}
        <div className="flex flex-col gap-1 w-[140px]">
          <span className="text-[10px] font-semibold text-slate-500">Status</span>
          <select
            value={filters.status}
            onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium outline-none appearance-none focus:border-pink-500"
          >
            <option value="">All Statuses</option>
            <option value="1">Open</option>
            <option value="2">Closed</option>
            <option value="3">Void</option>
          </select>
        </div>

        {/* Date Range Picker */}
        <div className="flex flex-col gap-1 w-[180px]">
          <span className="text-[10px] font-semibold text-slate-500">Date Range</span>
          <div className="relative">
            <Flatpickr
              value={filters.ticketReceivedDate || ""}
              onChange={(selectedDates) => {
                const d = selectedDates[0] || null;
                setFilters((p) => ({ ...p, ticketReceivedDate: d }));
              }}
              options={{ dateFormat: "Y-m-d" }}
              className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium outline-none placeholder:text-slate-400 focus:border-pink-500"
              placeholder="Select Date Range"
            />
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
              <Calendar size={14} className="text-slate-400" />
            </div>
            {filters.ticketReceivedDate && (
              <button
                onClick={() => setFilters((p) => ({ ...p, ticketReceivedDate: null }))}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-pink-500"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Created By Dropdown */}
        <div className="flex flex-col gap-1 w-[140px]">
          <span className="text-[10px] font-semibold text-slate-500">Created By</span>
          <select
            value={filters.createdBy || ""}
            onChange={(e) => setFilters((p) => ({ ...p, createdBy: e.target.value }))}
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium outline-none appearance-none focus:border-pink-500"
          >
            <option value="">All Users</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-end gap-2 h-[50px]">
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Clear
          </button>
          <button
            className="px-5 py-2 text-xs font-semibold text-white bg-pink-500 rounded-lg hover:bg-pink-600 transition-colors shadow-sm"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );

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
        <div className="flex flex-col pt-6 pb-2 px-6 transition-colors border-b border-slate-100 dark:border-slate-800/50">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
            <div className="flex flex-col">
              <nav className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 mb-2">
                <span>Home</span>
                <span className="text-slate-300">/</span>
                <span className="text-pink-500">AMS Tickets</span>
              </nav>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                AMS Tickets
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                View and manage all AMS tickets in one place.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAdvancedSearch(!isAdvancedSearch)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-pink-500 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-all"
              >
                Show Advanced Filters
                <motion.div animate={{ rotate: isAdvancedSearch ? 180 : 0 }}>
                  <ChevronRight size={14} className="rotate-90" />
                </motion.div>
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

          {/* ── Stats Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2 mb-6">
            {/* Open Tickets */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-pink-50 dark:bg-pink-500/10 flex items-center justify-center text-pink-500">
                <Ticket size={24} strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Open Tickets</span>
                <span className="text-2xl font-bold text-slate-900 dark:text-white leading-tight mt-1">{stats.open}</span>
                <div className="flex items-center text-[10px] mt-1">
                  <ArrowUp size={10} className="text-red-500 mr-0.5" />
                  <span className="text-red-500 font-medium">6</span>
                  <span className="text-slate-400 ml-1">from yesterday</span>
                </div>
              </div>
            </div>

            {/* In Progress */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Clock size={24} strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">In Progress</span>
                <span className="text-2xl font-bold text-slate-900 dark:text-white leading-tight mt-1">{stats.inProgress}</span>
                <div className="flex items-center text-[10px] mt-1">
                  <ArrowUp size={10} className="text-red-500 mr-0.5" />
                  <span className="text-red-500 font-medium">2</span>
                  <span className="text-slate-400 ml-1">from yesterday</span>
                </div>
              </div>
            </div>

            {/* Closed Today */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <CheckCircle2 size={24} strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Closed Today</span>
                <span className="text-2xl font-bold text-slate-900 dark:text-white leading-tight mt-1">{stats.closed}</span>
                <div className="flex items-center text-[10px] mt-1">
                  <ArrowUp size={10} className="text-emerald-500 mr-0.5" />
                  <span className="text-emerald-500 font-medium">4</span>
                  <span className="text-slate-400 ml-1">from yesterday</span>
                </div>
              </div>
            </div>

            {/* Overdue */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <Calendar size={24} strokeWidth={2} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Overdue</span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-white leading-tight mt-1">{stats.overdue}</span>
                  <div className="flex items-center text-[10px] mt-1 group cursor-pointer">
                    <span className="text-indigo-600 font-medium group-hover:underline">View all overdue</span>
                    <ArrowRight size={10} className="text-indigo-600 ml-1" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Filter Row (Visible only if toggled) */}
        <AnimatePresence>
          {isAdvancedSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {filterRow}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table Area */}
        <div className="w-full bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-separate border-spacing-y-1 min-w-max">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 h-[48px] bg-white dark:bg-slate-900">
                  {columns.map((col, i) => (
                    <th
                      key={col.key}
                      style={{ width: col.width, minWidth: col.width }}
                      className={`px-5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-${col.align || "left"} whitespace-nowrap`}
                    >
                      <div className={`flex items-center ${col.align === "center" ? "justify-center" : "justify-start"} gap-1`}>
                        {col.label}
                        {col.sortable && (
                          <div className="flex flex-col">
                            <ChevronRight size={10} className="-rotate-90 text-slate-300 -mb-1" />
                            <ChevronRight size={10} className="rotate-90 text-slate-300" />
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
                className="relative"
              >
                {loading && (
                  <div className="absolute inset-0 z-10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2
                        className="animate-spin text-pink-500"
                        size={32}
                      />
                    </div>
                  </div>
                )}

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
                                <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[140px] block" title={row.siteName}>{row.siteName || "—"}</span>
                              ) : col.key === "siteOCN" ? (
                                <span className="text-slate-600 dark:text-slate-400 font-medium">{row.siteOCN || "—"}</span>
                              ) : col.key === "cmsNextTicketNo" ? (
                                <span className="font-bold text-slate-900 dark:text-slate-100">{row.cmsNextTicketNo || "—"}</span>
                              ) : col.key === "ticketReceivedDate" ? (
                                <span className="text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                                  {row.ticketReceivedDate ? new Date(row.ticketReceivedDate).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' }) : "—"}
                                </span>
                              ) : col.key === "ticketClosedByName" ? (
                                <span className="text-slate-600 dark:text-slate-400 font-medium">{row.ticketClosedByName || "—"}</span>
                              ) : col.key === "activityTotalDuration" ? (
                                <span className="font-bold text-blue-500">
                                  {row.activityTotalDuration ? `${row.activityTotalDuration}h` : "0h"}
                                </span>
                              ) : col.key === "cmsTicketClosedOn" ? (
                                <span className="text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                                  {row.cmsTicketClosedOn ? new Date(row.cmsTicketClosedOn).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' }) : "—"}
                                </span>
                              ) : col.key === "serviceClosedDate" ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">
                                  {row.serviceClosedDate ? new Date(row.serviceClosedDate).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' }) : "—"}
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
                              ) : col.key === "createdBy" ? (
                                <span className="text-slate-600 dark:text-slate-400 font-medium">{row.createdBy || "—"}</span>
                              ) : col.key === "actions" ? (
                                <div className="flex items-center justify-center gap-2">
                                  <button onClick={() => { setActionItem(row); setActionType("detail"); }} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
                                    <Eye size={16} />
                                  </button>
                                  <button onClick={() => { setActionItem(row); setActionType("edit"); }} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
                                    <Edit size={16} />
                                  </button>
                                </div>
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
          await amsTicketApi.create(payload);
          toast("Ticket created successfully");
          setActionType("");
          fetchTickets();
        }}
      />


      {actionItem && (
        <>
          <TicketModal
            open={actionType === "edit"}
            onClose={() => {
              setActionType("");
              setActionItem(null);
            }}
            ticket={actionItem}
            onSave={async (payload) => {
              const { activeTab, ...dataToSave } = payload;
              if (activeTab === "Ticket Verification") {
                await amsTicketApi.close(actionItem.id, dataToSave);
                toast("Ticket closed successfully");
              } else {
                await amsTicketApi.update(actionItem.id, dataToSave);
                toast("Ticket updated successfully");
              }
              setActionType("");
              setActionItem(null);
              fetchTickets();
            }}
          />
          <TicketDetailModal
            open={actionType === "detail"}
            onClose={() => {
              setActionType("");
              setActionItem(null);
            }}
            ticket={actionItem}
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
