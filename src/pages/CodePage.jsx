import { useState, useEffect, useMemo } from "react";
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
import { GripVertical, Edit2, Power, PowerOff, Loader2, Plus, Code2, Search, MoreVertical, X, ChevronLeft, ChevronsLeft, ChevronsRight, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContextHook";
import { ActionsMenu } from "../component/common/ResourcePage";

import codesApi from "../services/api/Code";
import CodeModal from "../component/common/CodeModal";
import DeleteConfirmModal from "../component/common/DeleteConfirmation";
import { useToast } from "../component/common/ToastContext";
import { useResource } from "../component/hooks/useResource";

// ── Animation variants ────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.045 } },
};

const rowVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.18 } },
};

const ROW_HEIGHT = "h-[56px]";

// ── Skeleton row ──────────────────────────────────────────────────
function SkeletonRow({ delay = 0 }) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className={`border-b border-slate-100 dark:border-slate-800/60 ${ROW_HEIGHT}`}
    >
      {[8, 22, 38, 8, 8, 12, 8].map((w, i) => (
        <td key={i} className={`px-5 ${ROW_HEIGHT}`}>
          <div
            className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse"
            style={{ width: `${w}%`, minWidth: 20 }}
          />
        </td>
      ))}
    </motion.tr>
  );
}

// ── Sortable row ──────────────────────────────────────────────────
function SortableRow({ row, index, onEdit, onDisable, onEnable, isAdmin }) {
  const navigate = useNavigate();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  const hideManagement = row.isSystemIndicator || isAdmin;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
  };

  const rowBgClass = isDragging
    ? "bg-indigo-50/80 dark:bg-indigo-900/20"
    : index % 2 === 0
      ? "bg-white dark:bg-[#161920]/40"
      : "bg-gray-200/50 dark:bg-white/[0.03]";

  return (
    <motion.tr
      layout
      whileHover={{ scale: 1.006, y: -2 }}
      variants={rowVariants}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group transition-all duration-200 ${ROW_HEIGHT} ${isDragging ? "shadow-2xl shadow-indigo-200 dark:shadow-indigo-900/40 z-50 relative pointer-events-none" : "cursor-grab active:cursor-grabbing"}`}
    >


      {/* Lookup Code */}
      <td className={`pl-8 pr-5 ${ROW_HEIGHT} rounded-l-2xl ${rowBgClass}`}>
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 tracking-tight leading-none">
          {row.lookupCode}
        </span>
      </td>

      {/* Description */}
      <td className={`px-5 ${ROW_HEIGHT} ${rowBgClass}`}>
        <span className="text-sm text-slate-500 dark:text-slate-400 leading-none line-clamp-1">
          {row.description || (
            <span className="italic text-slate-300 dark:text-slate-700">No description</span>
          )}
        </span>
      </td>

      {/* Sequence */}
      <td className={`px-5 ${ROW_HEIGHT} text-center ${rowBgClass}`}>
        <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-md bg-slate-100/50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-mono text-xs font-medium">
          {row.sequence}
        </span>
      </td>

      {/* System indicator */}
      <td className={`px-5 ${ROW_HEIGHT} text-center ${rowBgClass}`}>
        <span
          className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${row.isSystemIndicator
            ? "bg-slate-100 dark:bg-slate-500/15 text-slate-600 dark:text-slate-400"
            : "bg-slate-100/50 dark:bg-slate-800/80 text-slate-300 dark:text-slate-700"
            }`}
        >
          {row.isSystemIndicator ? "✓" : "–"}
        </span>
      </td>

      {/* Status */}
      <td className={`px-5 ${ROW_HEIGHT} text-center ${rowBgClass}`}>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${row.isActive
            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500"
            }`}
        >
          <span
            className={`w-1 h-1 rounded-full ${row.isActive ? "bg-emerald-500" : "bg-slate-400 dark:bg-slate-600"
              }`}
          />
          {row.isActive ? "Active" : "Inactive"}
        </span>
      </td>

      {/* Actions */}
      <td className={`px-5 ${ROW_HEIGHT} text-right rounded-r-2xl ${rowBgClass}`}>
        {!row.isSystemIndicator && (
          <div className="flex justify-end items-center h-full">
            <ActionsMenu
              onAuditLog={isAdmin ? () => navigate(`/audit-logs?primaryKey=${row.id}&entityName=Lookup`) : null}
              onEdit={() => onEdit(row)}
              onDisable={row.isActive ? () => onDisable(row) : null}
              onEnable={!row.isActive ? () => onEnable(row) : null}
              className="border border-pink-500 text-pink-500 bg-transparent hover:bg-pink-50 dark:hover:bg-pink-500/10 rounded-xl px-4 py-1.5 text-[11px] font-bold flex items-center transition-all"
            />
          </div>
        )}
      </td>
    </motion.tr>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function CodePage() {
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase().includes("admin");
  const { toast } = useToast();
  const { data, loading: resourceLoading, refetch } = useResource(codesApi, { perPage: 1000 });

  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [actionItem, setActionItem] = useState(null);
  const [actionType, setActionType] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (data) {
      const sorted = [...data].sort((a, b) => (a.sequence || 999) - (b.sequence || 999));
      setItems(sorted);
    }
  }, [data]);

  const filteredItems = useMemo(() => {
    let result = items;
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      result = items.filter(
        (i) =>
          i.lookupCode?.toLowerCase().includes(s) ||
          i.description?.toLowerCase().includes(s)
      );
    }
    return result;
  }, [items, searchTerm]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage]);

  const totalPages = Math.ceil(filteredItems.length / pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async ({ active, over }) => {
    // Disable sorting when search is active to prevent confusion
    if (searchTerm.trim()) return;

    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.findIndex((i) => i.id === active.id);
        const newIndex = prev.findIndex((i) => i.id === over.id);
        const next = arrayMove(prev, oldIndex, newIndex);
        handleSequenceUpdate(next);
        return next;
      });
    }
  };

  const handleSequenceUpdate = async (newItems) => {
    setUpdateLoading(true);
    try {
      const updates = newItems
        .map((item, index) => {
          const seq = index + 1;
          return item.sequence !== seq ? { ...item, sequence: seq } : null;
        })
        .filter(Boolean);

      if (!updates.length) return;
      for (const item of updates) await codesApi.update(item.id, item);
      toast(`Reordered ${updates.length} item${updates.length > 1 ? "s" : ""}.`);
      refetch();
    } catch {
      toast("Failed to update order.", "error");
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
    } catch (err) {
      throw err;
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!actionItem) return;
    setUpdateLoading(true);
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
    } catch {
      toast("Action failed.", "error");
    } finally {
      setUpdateLoading(false);
    }
  };

  const isEmpty = !resourceLoading && items.length === 0;
  const activeCount = items.filter((i) => i.isActive).length;

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="h-full bg-transparent dark:bg-[rgb(172,172,172)] p-1 pb-[10px] flex flex-col relative overflow-hidden"
    >

      {/* ── Unified Full-Screen Card ── */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex-1 w-full bg-white dark:bg-[#161920] shadow-[0_8px_30px_rgba(0,0,0,0.06)] flex flex-col relative rounded-3xl overflow-hidden"      >
        {/* ── Header ── */}
        <div className="flex flex-col gap-6 py-6 px-6 md:px-8 transition-colors">
          <div className="flex items-center justify-between gap-4">
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
                  <span>Management</span>
                  <span className="text-slate-300 dark:text-slate-700">/</span>
                  <span>Lookups</span>
                  <span className="text-slate-300 dark:text-slate-700">/</span>
                  <span className="text-indigo-400 dark:text-indigo-500">Codes</span>
                </nav>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tighter">
                  Codes
                  <AnimatePresence>
                    {updateLoading && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Loader2 size={15} className="animate-spin text-indigo-400" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </h1>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setActionItem(null);
                setActionType("create");
                setModalOpen(true);
              }}
              className="inline-flex items-center px-5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-pink-500/20 transition-all bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white"
            >
              New Code
            </motion.button>
          </div>

          {/* Search bar row */}
          <div className="w-full">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search
                  size={16}
                  className={
                    searchTerm
                      ? "text-pink-500"
                      : "text-slate-400 dark:text-slate-600 transition-colors"
                  }
                />
              </div>
              <input
                type="text"
                placeholder="Search codes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-10 py-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/50 text-sm outline-none transition-all focus:border-pink-600 focus:ring-4 focus:ring-pink-600/10 shadow-sm font-medium"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-300 hover:text-slate-500 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Table Area ── */}
        <div className="flex-1 w-full overflow-hidden no-scrollbar">
          <div className="overflow-x-auto px-4 pb-4">
            <table className="w-full text-left border-separate border-spacing-y-0">
              <thead>
                <tr className={`bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 ${ROW_HEIGHT}`}>
                  {[
                    { label: "Lookup Code", align: "left" },
                    { label: "Description", align: "left" },
                    { label: "Sequence", align: "center" },
                    { label: "System", align: "center" },
                    { label: "Status", align: "center" },
                    { label: "Actions", align: "right" },
                  ].map(({ label, align }, i) => (
                    <th
                      key={label}
                      className={`px-5 ${ROW_HEIGHT} text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-${align} ${i === 0 ? "pl-8" : ""
                        }`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {/* Skeleton */}
                {resourceLoading && filteredItems.length === 0 &&
                  [0, 0.05, 0.1, 0.15, 0.2].map((d, i) => <SkeletonRow key={i} delay={d} />)
                }

                {/* Empty state */}
                {(!resourceLoading && filteredItems.length === 0) && (
                  <tr>
                    <td colSpan={7} className="py-24 text-center">
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center gap-3"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <Code2 size={20} className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <p className="text-sm text-slate-400 dark:text-slate-600">
                          {searchTerm ? (
                            <>No records match "<span className="text-slate-800 dark:text-slate-200 font-medium">{searchTerm}</span>"</>
                          ) : (
                            "No codes yet."
                          )}{" "}
                          {(!isAdmin && !searchTerm) && (
                            <button
                              onClick={() => {
                                setActionItem(null);
                                setActionType("create");
                                setModalOpen(true);
                              }}
                              className="text-indigo-500 hover:underline font-medium"
                            >
                              Create one
                            </button>
                          )}
                        </p>
                      </motion.div>
                    </td>
                  </tr>
                )}

                {/* Data rows with DnD */}
                {!resourceLoading && paginatedItems.length > 0 && (
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
                            onEdit={(r) => {
                              setActionItem(r);
                              setActionType("edit");
                              setModalOpen(true);
                            }}
                            onDisable={(r) => {
                              setActionItem(r);
                              setActionType("disable");
                            }}
                            onEnable={(r) => {
                              setActionItem(r);
                              setActionType("enable");
                            }}
                            isAdmin={isAdmin}
                          />
                        ))}
                      </AnimatePresence>
                    </SortableContext>
                  </DndContext>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {/* Footer & Standard Pagination - INSIDE CARD */}
        <AnimatePresence>
          {items.length > 0 && (
            <div className="w-full px-6 py-4 dark:bg-[#161920] border-t border-slate-100 dark:border-slate-800/60 flex flex-col md:flex-row items-center justify-between gap-4 transition-colors shrink-0">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Page Size:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-3 h-7 text-[10px] font-black bg-slate-50 dark:bg-slate-800 text-pink-600 dark:text-pink-400 border border-slate-200 dark:border-slate-700/50 rounded-lg outline-none cursor-pointer hover:border-pink-500/50 uppercase tracking-widest"
                  >
                    {[10, 25, 50, 100].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    <span className="text-slate-900 dark:text-white">{filteredItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span>
                    <span className="mx-1.5 text-slate-400">—</span>
                    <span className="text-slate-900 dark:text-white">{Math.min(currentPage * pageSize, filteredItems.length)}</span>
                    <span className="mx-2 lowercase font-bold italic tracking-normal">of</span>
                    <span className="text-slate-900 dark:text-white">{filteredItems.length}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 transition-all"
                >
                  <ChevronsLeft size={16} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 transition-all"
                >
                  <ChevronLeft size={16} strokeWidth={2.5} />
                </button>

                <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1" />

                <div className="px-3 flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page</span>
                  <div className="flex items-center gap-1.5 min-w-[40px] justify-center">
                    <span className="text-[12px] font-black text-pink-600 leading-none">{currentPage}</span>
                    <span className="text-[10px] font-black text-slate-300">/</span>
                    <span className="text-[10px] font-black text-slate-500 leading-none">{totalPages || 1}</span>
                  </div>
                </div>

                <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1" />

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 transition-all"
                >
                  <ChevronRight size={16} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 transition-all"
                >
                  <ChevronsRight size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>


      {/* ── Modals ── */}
      <CodeModal
        open={modalOpen}
        onClose={resetActionState}
        onSubmit={handleCreateOrUpdate}
        item={actionItem}
        readOnly={isView}
      />

      <DeleteConfirmModal
        open={Boolean(actionItem) && isToggleAction}
        item={actionItem}
        loading={updateLoading}
        title={isDisable ? "Disable Lookup Code" : "Enable Lookup Code"}
        confirmText={isDisable ? "Yes, Disable" : "Yes, Enable"}
        onClose={resetActionState}
        onConfirm={handleConfirmAction}
      />
    </motion.div>
  );
}