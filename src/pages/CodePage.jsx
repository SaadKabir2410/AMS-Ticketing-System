import { useState, useEffect, useMemo, useCallback } from "react";
import AppSelect from "../component/common/AppSelect";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Loader2, Plus, Search, X, ChevronLeft, ChevronsLeft, ChevronsRight, ChevronRight, Filter, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ActionsMenu } from "../component/common/ResourcePage";

import codesApi from "../services/api/Code";
import CodeModal from "../component/common/CodeModal";
import DeleteConfirmModal from "../component/common/DeleteConfirmation";
import PremiumErrorAlert from "../component/common/PremiumErrorAlert";
import { usePermission } from "../hooks/usePermission";
import { useToast } from "../component/common/ToastContext";
import { useResource } from "../component/hooks/useResource";
import { getApiErrorMessage } from "../utils/apiError";
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

// ── Highlight helper ────────────────────────────────────────────────
const highlightText = (text, query) => {
  if (!query || !text) return text;
  const escapedQuery = String(query).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = String(text).split(new RegExp(`(${escapedQuery})`, "gi"));
  return parts.map((part, i) => 
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-pink-100 dark:bg-pink-500/30 text-pink-700 dark:text-pink-100 rounded-[2px] px-[2px]">
        {part}
      </mark>
    ) : part
  );
};

// ── Skeleton row ──────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100 dark:border-slate-800/60 h-[60px] text-slate-900 dark:text-white">
      {[15, 30, 10, 10, 15, 10].map((w, i) => (
        <td key={i} className="px-5 h-[60px]">
          <div
            className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse"
            style={{ width: `${w}%`, minWidth: 20 }}
          />
        </td>
      ))}
    </tr>
  );
}

// ── Sortable row ──────────────────────────────────────────────────
function SortableHeader({ label, column, sortConfig, onSort, align = "left" }) {
  const active = sortConfig.key === column;
  const Icon = active
    ? sortConfig.direction === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  return (
    <th className={`px-5 h-[56px] text-[10px] font-black uppercase tracking-widest ${align === "center" ? "text-center" : "text-left"}`}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`inline-flex w-full items-center gap-1.5 transition-colors hover:text-pink-600 dark:hover:text-pink-400 ${align === "center" ? "justify-center" : "justify-start"} ${active ? "text-pink-600 dark:text-pink-400" : "text-slate-500 dark:text-slate-400"}`}
        aria-label={`Sort by ${label}`}
      >
        <span>{label}</span>
        <Icon size={12} strokeWidth={2.5} />
      </button>
    </th>
  );
}

// ── Sortable row ──────────────────────────────────────────────────
function SortableRow({ row, index, onEdit, onDisable, onEnable, onAuditLog, searchTerm, advancedFilters, dragDisabled }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id, disabled: dragDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
  };

  const isEven = index % 2 === 0;
  const isRowActive = row.isActive && !row.isDeleted;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...(!dragDisabled ? attributes : {})}
      {...(!dragDisabled ? listeners : {})}
      className={`group cursor-default transition-all duration-200 h-[60px] border-b border-slate-50 dark:border-slate-800/30 ${isEven ? "bg-white dark:bg-[#161920]/40" : "bg-gray-200/50 dark:bg-white/[0.03]"} ${isDragging ? "shadow-2xl shadow-indigo-200 dark:shadow-indigo-900/40 z-50 relative pointer-events-none" : ""}`}
    >
      <td className="px-5 pl-8 rounded-l-2xl h-[60px] text-left transition-colors font-bold text-[12px]">
        {highlightText(row.lookupCode, advancedFilters.lookupCode || searchTerm)}
      </td>
      <td className="px-5 h-[60px] text-left transition-colors">
        {highlightText(row.description || "—", advancedFilters.description || searchTerm)}
      </td>
      <td className="px-5 h-[60px] text-center transition-colors">
        {highlightText(String(row.sequence ?? "—"), advancedFilters.sequence || searchTerm)}
      </td>
      <td className="px-5 h-[60px] text-center transition-colors">
        {highlightText(row.isSystemIndicator ? "Yes" : "No", searchTerm)}
      </td>
      <td className="px-5 h-[60px] text-center transition-colors">
        {highlightText(isRowActive ? "Active" : "Inactive", searchTerm)}
      </td>
      <td className="px-5 rounded-r-2xl h-[60px] text-center transition-colors">
        {!row.isSystemIndicator && (
          <ActionsMenu
            onAuditLog={onAuditLog ? () => onAuditLog(row) : undefined}
            onEdit={isRowActive && onEdit ? () => onEdit(row) : undefined}
            onDisable={isRowActive && onDisable ? () => onDisable(row) : undefined}
            onEnable={!isRowActive && onEnable ? () => onEnable(row) : undefined}
          />
        )}
      </td>
    </tr>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function CodePage() {
  const navigate = useNavigate();
  const canCreate = usePermission("Billing.Lookups.Create");
  const canEdit = usePermission("Billing.Lookups.Edit");
  const canDelete = usePermission("Billing.Lookups.Delete");
  const canViewAuditLog = usePermission("Billing.Lookups.ViewAuditLog");
  const { toast } = useToast();
  const [applicationConfig, setApplicationConfig] = useState(
    getCachedApplicationConfig,
  );
  const localize = useCallback(
    (key) => getLocalizationValue(applicationConfig, key),
    [applicationConfig],
  );
  const {
    data,
    loading: resourceLoading,
    error: resourceError,
    refetch,
  } = useResource(codesApi, { perPage: 1000 });

  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    lookupCode: "",
    description: "",
    sequence: "",
  });
  const [sortConfig, setSortConfig] = useState({
    key: "sequence",
    direction: "asc",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [actionItem, setActionItem] = useState(null);
  const [actionType, setActionType] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);
  const [pageError, setPageError] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  useEffect(() => {
    if (data) {
      const sorted = [...data].sort(
        (a, b) =>
          (a.sequence ?? Number.MAX_SAFE_INTEGER) -
          (b.sequence ?? Number.MAX_SAFE_INTEGER),
      );
      setItems(sorted);
    }
  }, [data]);

  useEffect(() => {
    if (!resourceError) return;
    setPageError(getApiErrorMessage(resourceError));
  }, [resourceError]);

  const filteredItems = useMemo(() => {
    let result = [...items];
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      result = result.filter(
        (i) =>
          i.lookupCode?.toLowerCase().includes(s) ||
          i.description?.toLowerCase().includes(s) ||
          String(i.sequence ?? "").includes(s) ||
          (i.isSystemIndicator ? "system yes" : "system no").includes(s) ||
          (i.isActive && !i.isDeleted ? "active" : "inactive").includes(s)
      );
    }

    const lookupCodeFilter = advancedFilters.lookupCode.trim().toLowerCase();
    const descriptionFilter = advancedFilters.description.trim().toLowerCase();
    const sequenceFilter = advancedFilters.sequence.trim();

    if (lookupCodeFilter) {
      result = result.filter((item) =>
        item.lookupCode?.toLowerCase().includes(lookupCodeFilter)
      );
    }
    if (descriptionFilter) {
      result = result.filter((item) =>
        item.description?.toLowerCase().includes(descriptionFilter)
      );
    }
    if (sequenceFilter) {
      result = result.filter(
        (item) => String(item.sequence ?? "") === sequenceFilter
      );
    }
    result.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      let comparison = 0;

      if (sortConfig.key === "sequence") {
        comparison = Number(aValue ?? 0) - Number(bValue ?? 0);
      } else if (sortConfig.key === "isActive") {
        comparison =
          Number(Boolean(a.isActive && !a.isDeleted)) -
          Number(Boolean(b.isActive && !b.isDeleted));
      } else if (sortConfig.key === "isSystemIndicator") {
        comparison = Number(Boolean(aValue)) - Number(Boolean(bValue));
      } else {
        comparison = String(aValue ?? "").localeCompare(
          String(bValue ?? ""),
          undefined,
          { sensitivity: "base", numeric: true }
        );
      }

      return sortConfig.direction === "asc" ? comparison : -comparison;
    });

    return result;
  }, [items, searchTerm, advancedFilters, sortConfig]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredItems.length / pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, advancedFilters, sortConfig]);

  const hasAdvancedFilters = Object.values(advancedFilters).some(Boolean);
  const canReorder =
    !searchTerm.trim() &&
    !hasAdvancedFilters &&
    sortConfig.key === "sequence" &&
    sortConfig.direction === "asc";

  const handleSort = (key) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const updateAdvancedFilter = (field, value) => {
    setAdvancedFilters((current) => ({ ...current, [field]: value }));
  };

  const clearFilters = () => {
    setSearchTerm("");
    setAdvancedFilters({
      lookupCode: "",
      description: "",
      sequence: "",
    });
    setSortConfig({ key: "sequence", direction: "asc" });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async ({ active, over }) => {
    // Reordering is only meaningful while the grid is in its canonical order.
    if (!canReorder) return;

    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.findIndex((i) => i.id === active.id);
        const newIndex = prev.findIndex((i) => i.id === over.id);
        const next = arrayMove(prev, oldIndex, newIndex);
        handleSequenceUpdate(next);
        return next.map((item, index) => ({ ...item, sequence: index }));
      });
    }
  };

  const handleSequenceUpdate = async (newItems) => {
    setUpdateLoading(true);
    setPageError("");
    try {
      const updates = newItems
        .map((item, index) => {
          const seq = index;
          return item.sequence !== seq ? { ...item, sequence: seq } : null;
        })
        .filter(Boolean);

      if (!updates.length) return;
      for (const item of updates) await codesApi.update(item.id, item);
      toast(`Reordered ${updates.length} item${updates.length > 1 ? "s" : ""}.`);
      refetch();
    } catch (error) {
      setPageError(getApiErrorMessage(error));
      refetch();
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleCreateOrUpdate = async (payload) => {
    setUpdateLoading(true);
    try {
      if (actionItem && actionType === "edit") {
        await codesApi.update(actionItem.id, payload);
        toast("Code updated.");
      } else {
        await codesApi.create(payload);
        toast("Code created.");
      }
      setModalOpen(false);
      setActionItem(null);
      refetch();
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!actionItem) return;
    setUpdateLoading(true);
    setPageError("");
    try {
      if (actionType === "disable") {
        await codesApi.disable(actionItem.id);
        toast("Record disabled.");
      } else if (actionType === "enable") {
        await codesApi.enable(actionItem.id);
        toast("Record enabled.");
      }
      setActionItem(null);
      setActionType("");
      refetch();
    } catch (error) {
      setPageError(getApiErrorMessage(error));
    } finally {
      setUpdateLoading(false);
    }
  };

  // Modal helpers
  const isView = actionType === "view";
  const isDisable = actionType === "disable";
  const isEnable = actionType === "enable";
  const isToggleAction = isDisable || isEnable;

  const resetActionState = () => {
    setModalOpen(false);
    setActionItem(null);
    setActionType("");
  };

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-full w-full bg-[#f8fafc] dark:bg-slate-950 p-1 pb-[10px] flex flex-col relative overflow-visible font-[Arial] text-slate-900 dark:text-white"
    >
      <style>{`
        *::-webkit-scrollbar { display: none !important; }
        * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
      `}</style>

      {/* ── Unified Full-Screen Card ── */}
      <Motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex-1 w-full bg-white dark:bg-[#161920] border border-slate-200 dark:border-slate-800/50 shadow-sm flex flex-col relative rounded-3xl overflow-hidden"
      >
        {/* ── Header ── */}
        <div className="flex flex-col gap-6 py-6 px-4 md:px-8 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">

            <div className="flex items-center gap-4">
              <div>
                <nav className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-600 mb-1 flex-wrap">
                  <span>Home</span>
                  <span className="text-slate-300 dark:text-slate-700">/</span>
                  <span>Management</span>
                  <span className="text-slate-300 dark:text-slate-700">/</span>
                  <span>Lookups</span>
                  <span className="text-slate-300 dark:text-slate-700">/</span>
                  <span className="text-pink-500">Codes</span>
                </nav>
                <h1 className="text-4xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tighter">
                  Codes
                  <AnimatePresence>
                    {updateLoading && (
                      <Motion.span
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Loader2 size={15} className="animate-spin text-indigo-400" />
                      </Motion.span>
                    )}
                  </AnimatePresence>
                </h1>
              </div>
            </div>

            {canCreate && (
              <Motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setActionItem(null);
                  setActionType("create");
                  setModalOpen(true);
                }}
                className="app-primary-button inline-flex items-center justify-center px-5 py-2.5 w-full sm:w-auto text-xs uppercase tracking-tight"
              >
                <Plus size={14} className="mr-2" strokeWidth={3} />
                New Code
              </Motion.button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative group w-full sm:w-[32rem] max-w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search
                  size={14}
                  className={
                    searchTerm
                      ? "text-pink-500"
                      : "text-slate-400 dark:text-slate-600 transition-colors"
                  }
                />
              </div>
              <input
                type="text"
                placeholder="Search all code columns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/50 text-[12px] outline-none transition-all focus:border-pink-600 focus:ring-4 focus:ring-pink-600/10 shadow-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-pink-500 transition-colors"
                  aria-label="Clear general search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowAdvancedSearch((visible) => !visible)}
              className={`w-full sm:w-auto h-[42px] inline-flex items-center justify-center gap-2 px-4 rounded-xl border text-xs font-bold transition-all ${showAdvancedSearch ? "bg-pink-50 text-pink-600 border-pink-200 dark:bg-pink-500/10 dark:border-pink-500/30 dark:text-pink-400" : "bg-white text-slate-500 border-slate-200/60 dark:bg-slate-900/50 dark:border-slate-800/50 dark:text-slate-400 hover:text-pink-600"}`}
              aria-expanded={showAdvancedSearch}
            >
              <Filter size={14} />
              Advanced Search
              {hasAdvancedFilters && (
                <span className="h-2 w-2 rounded-full bg-pink-500" aria-label="Filters active" />
              )}
            </button>

            <button
              type="button"
              onClick={clearFilters}
              className="app-primary-button inline-flex h-[42px] w-full sm:w-auto items-center justify-center px-4 text-xs"
            >
              Clear
            </button>
          </div>

          {showAdvancedSearch && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/50">
              <input
                type="text"
                value={advancedFilters.lookupCode}
                onChange={(e) => updateAdvancedFilter("lookupCode", e.target.value)}
                placeholder="Filter by lookup code..."
                className="px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10"
              />
              <input
                type="text"
                value={advancedFilters.description}
                onChange={(e) => updateAdvancedFilter("description", e.target.value)}
                placeholder="Filter by description..."
                className="px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10"
              />
              <input
                type="number"
                min="0"
                value={advancedFilters.sequence}
                onChange={(e) => updateAdvancedFilter("sequence", e.target.value)}
                placeholder="Exact sequence..."
                className="px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10"
              />
            </div>
          )}
        </div>

        {/* ── Table Area ── */}
        <div className="flex flex-col w-full h-auto relative">
          {resourceLoading && filteredItems.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] animate-pulse py-20 w-full">
              Refreshing data...
            </div>
          ) : !resourceLoading && filteredItems.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] py-20 w-full">
              No codes found
            </div>
          ) : (
            <div className="overflow-x-auto px-4 pb-4 pt-2 custom-scrollbar">
              <table className="w-full table-fixed text-left border-separate border-spacing-y-1 text-[11px]">
                <colgroup>
                  <col style={{ width: '16.66%' }} />
                  <col style={{ width: '16.66%' }} />
                  <col style={{ width: '16.66%' }} />
                  <col style={{ width: '16.66%' }} />
                  <col style={{ width: '16.66%' }} />
                  <col style={{ width: '16.66%' }} />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-[56px] text-slate-500 dark:text-slate-400">
                    <SortableHeader label="Lookup Code" column="lookupCode" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableHeader label="Description" column="description" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableHeader label="Sequence" column="sequence" sortConfig={sortConfig} onSort={handleSort} align="center" />
                    <SortableHeader label="System Indicator" column="isSystemIndicator" sortConfig={sortConfig} onSort={handleSort} align="center" />
                    <SortableHeader label="Status" column="isActive" sortConfig={sortConfig} onSort={handleSort} align="center" />
                    <th className="px-5 h-[56px] text-[10px] font-black uppercase tracking-widest text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={paginatedItems.map((i) => i.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <AnimatePresence>
                        {paginatedItems.map((row, idx) => (
                          <SortableRow
                            key={row.id}
                            row={row}
                            index={idx}
                            searchTerm={searchTerm}
                            advancedFilters={advancedFilters}
                            dragDisabled={!canReorder}
                            onEdit={canEdit ? (r) => {
                              setActionItem(r);
                              setActionType("edit");
                              setModalOpen(true);
                            } : undefined}
                            onDisable={canDelete ? (r) => {
                              setActionItem(r);
                              setActionType("disable");
                            } : undefined}
                            onEnable={canDelete ? (r) => {
                              setActionItem(r);
                              setActionType("enable");
                            } : undefined}
                            onAuditLog={canViewAuditLog ? (r) => navigate(`/audit-logs?primaryKey=${encodeURIComponent(r.id)}&entityName=Lookup`) : undefined}
                          />
                        ))}
                      </AnimatePresence>
                    </SortableContext>
                  </DndContext>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer & Standard Pagination - INSIDE CARD */}
        {items.length > 0 && (
          <div className="w-full px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 transition-colors shrink-0">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Page Size:</span>
                <AppSelect
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 h-7 text-[10px] font-black bg-white dark:bg-slate-800 text-pink-600 dark:text-pink-400 border border-slate-200 dark:border-slate-700/50 rounded-lg outline-none transition-all cursor-pointer shadow-sm hover:border-pink-500/50 uppercase tracking-widest"
                >
                  {[10, 25, 50, 100].map((s) => (
                    <option key={s} value={s} className="font-sans text-slate-900 dark:text-white">{s}</option>
                  ))}
                </AppSelect>
              </div>

              <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  <span className="text-slate-900 dark:text-white tabular-nums">{filteredItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span>
                  <span className="mx-1.5 text-slate-400 dark:text-slate-600">—</span>
                  <span className="text-slate-900 dark:text-white tabular-nums">{Math.min(currentPage * pageSize, filteredItems.length)}</span>
                  <span className="mx-2 lowercase font-bold italic tracking-normal text-slate-400 dark:text-slate-500">of</span>
                  <span className="text-slate-900 dark:text-white tabular-nums font-black">{filteredItems.length}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white dark:bg-slate-800/50 p-1 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              >
                <ChevronsLeft size={14} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              >
                <ChevronLeft size={14} strokeWidth={2.5} />
              </button>

              <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1" />

              <div className="px-3 flex items-center gap-2 py-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Page</span>
                <div className="flex items-center gap-1.5 min-w-[40px] justify-center">
                  <span className="text-[11px] font-black text-pink-600 dark:text-pink-400 tabular-nums leading-none">{currentPage}</span>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-600">/</span>
                  <span className="text-[10px] font-black text-slate-900 dark:text-white tabular-nums leading-none">{totalPages || 1}</span>
                </div>
              </div>

              <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1" />

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              >
                <ChevronRight size={14} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              >
                <ChevronsRight size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}
      </Motion.div>

      <PremiumErrorAlert
        open={Boolean(pageError)}
        message={pageError}
        onClose={() => setPageError("")}
      />


      {/* ── Modals ── */}
      <CodeModal
        open={modalOpen}
        onClose={resetActionState}
        onSubmit={handleCreateOrUpdate}
        item={actionItem}
        readOnly={isView}
        localize={localize}
      />

      <DeleteConfirmModal
        open={Boolean(actionItem) && isToggleAction}
        item={actionItem}
        loading={updateLoading}
        blurBackdrop={false}
        title={isDisable ? "Disable Lookup Code" : "Enable Lookup Code"}
        confirmText={isDisable ? "Yes, Disable" : "Yes, Enable"}
        onClose={resetActionState}
        onConfirm={handleConfirmAction}
      />
    </Motion.div>
  );
}
