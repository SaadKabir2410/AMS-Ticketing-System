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
  MoreVertical,
  ChevronRight,
  ChevronLeft as ChevronLeftIcon,
  ChevronsLeft,
  ChevronsRight,
  GripVertical,
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
          userId: "00000000-0000-0000-0000-000000000000",
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
      setTickets(response.items || []);
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

  // --- Table Configuration ---
  const columns = [
    { key: "siteName", label: "Site Name", width: 80 },
    { key: "siteOCN", label: "Site OCN", width: 80, align: "center" },
    {
      key: "cmsNextTicketNo",
      label: "CMS Next Ticket No",
      width: 90,
      align: "center",
    },
    { key: "ticketReceivedDate", label: "Received Date Time", width: 70 },
    { key: "ticketClosedByName", label: "Ticket Closed By", width: 70 },
    {
      key: "activityTotalDuration",
      label: "Total Duration (H)",
      width: 40,
      align: "center",
    },
    { key: "cmsTicketClosedOn", label: "CMS Closed On", width: 70 },
    { key: "serviceClosedDate", label: "Service Closed", width: 70 },
    { key: "status", label: "Status", width: 50, align: "center" },
    { key: "isPRE", label: "PRE", width: 30, align: "center" },
    { key: "createdBy", label: "Created By", width: 70 },
    { key: "actions", label: "Actions", width: 60, align: "right" },
  ];

  const totalPages = Math.ceil(totalCount / pageSize);

  const filterRow = (
    <div className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/60 transition-all">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 px-4 py-4 md:px-8">
        {[
          { label: "Site Name", key: "siteName", isCombo: true },
          { label: "Site OCN", key: "siteOcn", isCombo: true },
          { label: "Ticket No", key: "cmsNextTicketNo", isCombo: true },
          { label: "Ticket Received Date Time", key: "ticketReceivedDate", isCombo: false, span: "sm:col-span-2 md:col-span-1 lg:col-span-2 xl:col-span-1" },
          { label: "Status", key: "status", isCombo: false },
          { label: "PRE", key: "isPRE", isCombo: false },
          { label: "Created By", key: "createdBy", isCombo: false },
        ].map((f, i) => (
          <div
            key={f.key}
            className={`flex flex-col gap-1.5 w-full shrink-0 ${f.span || ""}`}
          >
            {f.isCombo ? (
              <div className="relative group/input">
                <input
                  type="text"
                  placeholder={f.label}
                  className="w-full pl-3 pr-8 py-2 text-[11px] font-medium bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg outline-none focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500 transition-all placeholder:text-slate-400/70"
                  value={filters[f.key] || ""}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, [f.key]: e.target.value }))
                  }
                />
                {filters[f.key] && (
                  <button
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, [f.key]: "" }))
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-pink-500 transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ) : f.key === "status" ? (
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, status: e.target.value }))
                }
                className="w-full px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-[10px] font-bold outline-none appearance-none cursor-pointer focus:border-pink-500 transition-colors"
              >
                <option value="">All</option>
                <option value="1">Open</option>
                <option value="2">Closed</option>
                <option value="3">Void</option>
              </select>
            ) : f.key === "ticketReceivedDate" ? (
              <div className="relative">
                <Flatpickr
                  value={filters.ticketReceivedDate || ""}
                  onChange={(selectedDates) => {
                    const d = selectedDates[0] || null;
                    console.log("[AMS] Flatpickr onChange fired:", d);
                    setFilters((p) => ({ ...p, ticketReceivedDate: d }));
                  }}
                  options={{
                    dateFormat: "Y-m-d",
                    allowInput: true,
                  }}
                  className="w-full px-2 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-[10px] font-bold outline-none placeholder:text-slate-400/50 focus:border-pink-500 transition-all"
                  placeholder="Select Date"
                />
                {filters.ticketReceivedDate && (
                  <button
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, ticketReceivedDate: null }))
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-pink-500 transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ) : (
              <div className="h-[30px]" />
            )}
          </div>
        ))}
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
      `}</style>

      {/* ── Main Unified Card ── */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex-1 w-full bg-white dark:bg-[#161920] border border-slate-200 dark:border-slate-800/50 shadow-sm flex flex-col rounded-3xl"
      >
        {/* ── Header Row ── */}
        <div className="flex flex-col gap-6 py-8 px-4 md:px-8 transition-colors border-b border-slate-100 dark:border-slate-800/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.1, x: -2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(-1)}
                className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-600 hover:text-pink-600 transition-all border border-slate-200/60 dark:border-slate-700/50 shadow-sm"
              >
                <ChevronLeft size={20} strokeWidth={2.5} />
              </motion.button>
              <div>
                <nav className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-600 mb-1 flex-wrap">
                  <span>Home</span>
                  <span className="text-slate-300 dark:text-slate-700">/</span>
                  <span className="text-pink-500">AMS Tickets</span>
                </nav>
                <h1 className="text-4xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tighter">
                  AMS Tickets
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Advanced Filters Toggle (CodePage Style) */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`w-10 h-6 rounded-full relative transition-all duration-300 ${isAdvancedSearch ? "bg-pink-500 shadow-lg shadow-pink-500/20" : "bg-slate-200 dark:bg-slate-700"}`}
                >
                  <motion.div
                    animate={{ x: isAdvancedSearch ? 18 : 2 }}
                    className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-md"
                  />
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={isAdvancedSearch}
                  onChange={(e) => setIsAdvancedSearch(e.target.checked)}
                />
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors tracking-widest uppercase">
                  Advanced
                </span>
              </label>

              {!isAdmin && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setActionItem(null);
                    setActionType("create");
                  }}
                  className="inline-flex items-center px-5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-pink-500/20 transition-all bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white"
                >
                  <Plus size={16} className="mr-2" strokeWidth={3} />
                  New Ticket
                </motion.button>
              )}
            </div>
          </div>

          {/* Search bar row */}
          <div className="w-full flex items-center gap-4">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search
                  size={16}
                  className={
                    search
                      ? "text-pink-500"
                      : "text-slate-400 dark:text-slate-600 transition-colors"
                  }
                />
              </div>
              <input
                type="text"
                placeholder="Search tickets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-10 py-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/50 text-sm outline-none transition-all focus:border-pink-600 focus:ring-4 focus:ring-pink-600/10 shadow-sm font-medium"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-300 hover:text-slate-500 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {isAdvancedSearch && (
              <button
                onClick={handleClearFilters}
                className="text-[10px] font-black text-rose-500 hover:text-rose-600 px-4 py-2 bg-rose-50 dark:bg-rose-500/10 rounded-xl transition-all"
              >
                Clear Filters
              </button>
            )}
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
        <div className="w-full">
          <div className="overflow-x-auto px-4 pb-4 pt-2 no-scrollbar">
            <table className="w-full text-left border-separate border-spacing-y-1 min-w-max">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-[56px]">
                  {columns.map((col, i) => (
                    <th
                      key={col.key}
                      style={{ width: col.width, minWidth: col.width }}
                      className={`px-5 h-[56px] text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-${col.align || "left"} ${i === 0 ? "pl-8" : ""}`}
                    >
                      {col.label}
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
                    const isEven = idx % 2 === 0;
                    return (
                      <motion.tr
                        key={row.id}
                        variants={rowVariants}
                        whileHover={{
                          y: -2,
                          backgroundColor: "rgba(244, 63, 94, 0.04)",
                        }}
                        className={`group transition-all duration-200 ${ROW_HEIGHT} border-b border-slate-50 dark:border-slate-800/30 
                            ${row.status === 1 && row.isComingFromReOpenScreen
                            ? "bg-orange-50 dark:bg-orange-900/10"
                            : row.status === 1
                              ? "bg-[#fee2e2] dark:bg-red-950/60"
                              : idx % 2 === 0
                                ? "bg-white dark:bg-[#161920]/40"
                                : "bg-gray-200/50 dark:bg-white/[0.03]"
                          }`}
                      >
                        {columns.map((col, colIdx) => (
                          <td
                            key={col.key}
                            className={`px-5 ${ROW_HEIGHT} text-${col.align || "left"} transition-colors
                              ${colIdx === 0 ? "pl-8 rounded-l-2xl" : ""} 
                              ${colIdx === columns.length - 1 ? "rounded-r-2xl" : ""}
                              ${row.status === 1 && row.isComingFromReOpenScreen
                                ? "text-orange-900 dark:text-orange-100 font-semibold"
                                : row.status === 1
                                  ? "text-red-900 dark:text-red-100 font-semibold"
                                  : "text-slate-700 dark:text-slate-300"}`}
                          >
                            <div className="text-[12px] font-medium leading-none">
                              {col.key === "siteName" ? (
                                <div className="truncate max-w-[160px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight" title={row.siteName}>
                                  <HighlightText
                                    text={row.siteName}
                                    terms={[search, filters.siteName]}
                                  />
                                </div>
                              ) : col.key === "status" ? (
                                (() => {
                                  const statusMap = {
                                    1: {
                                      label: "Open",
                                      class: "bg-rose-100 text-rose-600",
                                    },
                                    2: {
                                      label: "Closed",
                                      class: "bg-emerald-100 text-emerald-600",
                                    },
                                    3: {
                                      label: "Void",
                                      class: "bg-slate-100 text-slate-500",
                                    },
                                  };
                                  const config = statusMap[row.status] || {
                                    label: "—",
                                    class: "",
                                  };

                                  if (row.status === 1 && row.isComingFromReOpenScreen) {
                                    config.label = "Reopened";
                                    config.class = "bg-orange-100 text-orange-600";
                                  }

                                  return (
                                    <span
                                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${(row.status === 1 && !row.isComingFromReOpenScreen) ? "bg-white/80 text-red-600 shadow-sm" : config.class}`}
                                    >
                                      {config.label}
                                    </span>
                                  );
                                })()
                              ) : col.key === "isPRE" ? (
                                <div
                                  className={`w-2.5 h-2.5 rounded-full mx-auto ${row.isPRE ? "bg-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.6)]" : "bg-slate-200 dark:bg-slate-800"}`}
                                />
                              ) : col.key === "ticketReceivedDate" ? (
                                row.ticketReceivedDate ? (
                                  <span className="font-bold text-[11px] tabular-nums">
                                    {new Date(
                                      row.ticketReceivedDate,
                                    ).toLocaleString([], {
                                      dateStyle: "short",
                                      timeStyle: "short",
                                    })}
                                  </span>
                                ) : (
                                  "—"
                                )
                              ) : col.key === "cmsTicketClosedOn" ? (
                                row.cmsTicketClosedOn ? (
                                  <span className="font-bold text-[11px] tabular-nums">
                                    {new Date(
                                      row.cmsTicketClosedOn,
                                    ).toLocaleString([], {
                                      dateStyle: "short",
                                      timeStyle: "short",
                                    })}
                                  </span>
                                ) : (
                                  "—"
                                )
                              ) : col.key === "serviceClosedDate" ? (
                                row.serviceClosedDate ? (
                                  <span className="font-bold text-[11px] tabular-nums text-emerald-600 dark:text-emerald-400">
                                    {new Date(
                                      row.serviceClosedDate,
                                    ).toLocaleString([], {
                                      dateStyle: "short",
                                      timeStyle: "short",
                                    })}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )
                              ) : col.key === "activityTotalDuration" ? (
                                <span className="font-black text-[11px] text-indigo-600 dark:text-indigo-400 tabular-nums">
                                  {row.activityTotalDuration
                                    ? `${row.activityTotalDuration}h`
                                    : "0h"}
                                </span>
                              ) : col.key === "actions" ? (
                                <ActionsMenu
                                  onAuditLog={() =>
                                    navigate(
                                      `/audit-logs?primaryKey=${row.id}&entityName=AMSTicket`,
                                    )
                                  }
                                  onEdit={
                                    !isAdmin && (row.status === 1 || row.status === 2 || row.status === 3)
                                      ? () => {
                                        setActionItem(row);
                                        setActionType("edit");
                                      }
                                      : null
                                  }
                                  onDelete={
                                    !isAdmin && row.status === 1
                                      ? () => {
                                        setActionItem(row);
                                        setActionType("delete");
                                      }
                                      : null
                                  }
                                  deleteButtonText="Void"
                                  customActions={
                                    !isAdmin && row.status === 2
                                      ? [
                                        {
                                          label: "Reopen ticket",
                                          onClick: () => {
                                            setActionItem(row);
                                            setActionType("reopen");
                                          }
                                        }
                                      ]
                                      : []
                                  }
                                  className="text-pink-500 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-950/30 border hover:border-pink-500 transition-all text-[11px] px-4 py-1.5 h-7.5 flex items-center justify-center gap-1 rounded-xl font-bold tracking-wider bg-transparent border-pink-500/20 hover:border-pink-500 shadow-sm"
                                />
                              ) : (
                                <HighlightText
                                  text={row[col.key]}
                                  terms={[
                                    search,
                                    col.key === "siteOCN"
                                      ? filters.siteOcn
                                      : col.key === "cmsNextTicketNo"
                                        ? filters.cmsNextTicketNo
                                        : null,
                                  ]}
                                />
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
