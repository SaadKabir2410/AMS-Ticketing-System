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
import { GripVertical, Edit2, Power, PowerOff, Loader2, Plus, Code2, Search, MoreVertical, X } from "lucide-react";
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

// ── Skeleton row ──────────────────────────────────────────────────
function SkeletonRow({ delay = 0 }) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className="border-b border-slate-100 dark:border-slate-800/60"
    >
      {[8, 22, 38, 8, 8, 12, 8].map((w, i) => (
        <td key={i} className="px-5 py-4">
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
function SortableRow({ row, onEdit, onDisable, onEnable, onView, isAdmin }) {
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

  return (
    <motion.tr
      layout
      variants={rowVariants}
      ref={setNodeRef}
      style={style}
      className={`group border-b border-slate-100 dark:border-slate-800/60 transition-colors duration-150 ${isDragging
        ? "bg-indigo-50/80 dark:bg-indigo-900/20 shadow-lg shadow-indigo-100 dark:shadow-indigo-900/30"
        : "hover:bg-slate-50/80 dark:hover:bg-slate-800/30"
        }`}
    >
      {/* Drag handle */}
      <td className="w-10 pl-4 pr-1 py-3.5">
        <button
          {...attributes}
          {...listeners}
          className="p-1 rounded text-slate-300 dark:text-slate-700 hover:text-slate-500 dark:hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-all cursor-grab active:cursor-grabbing"
        >
          <GripVertical size={14} />
        </button>
      </td>

      {/* Lookup Code */}
      <td className="px-5 py-3.5">
        <span className="inline-flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
            {row.lookupCode}
          </span>
        </span>
      </td>

      {/* Description */}
      <td className="px-5 py-3.5">
        <span className="text-sm text-slate-500 dark:text-slate-400 leading-snug">
          {row.description || (
            <span className="italic text-slate-300 dark:text-slate-700">No description</span>
          )}
        </span>
      </td>

      {/* Sequence */}
      <td className="px-5 py-3.5 text-center">
        <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-md bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-mono text-xs font-medium">
          {row.sequence}
        </span>
      </td>

      {/* System indicator */}
      <td className="px-5 py-3.5 text-center">
        <span
          className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${row.isSystemIndicator
            ? "bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400"
            : "bg-slate-100 dark:bg-slate-800/80 text-slate-300 dark:text-slate-700"
            }`}
        >
          {row.isSystemIndicator ? "✓" : "–"}
        </span>
      </td>

      {/* Status */}
      <td className="px-5 py-3.5 text-center">
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
      <td className="px-5 py-3.5 text-right">
        {!row.isSystemIndicator && (
          <ActionsMenu
            onAuditLog={isAdmin ? () => navigate(`/audit-logs?primaryKey=${row.id}&entityName=Code`) : null}
            onDetail={() => onView(row)}
            onEdit={() => onEdit(row)}
            onDisable={row.isActive ? () => onDisable(row) : null}
            onEnable={!row.isActive ? () => onEnable(row) : null}
          />
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

  useEffect(() => {
    if (data) {
      const sorted = [...data].sort((a, b) => (a.sequence || 999) - (b.sequence || 999));
      setItems(sorted);
    }
  }, [data]);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const s = searchTerm.toLowerCase();
    return items.filter(
      (i) =>
        i.lookupCode?.toLowerCase().includes(s) ||
        i.description?.toLowerCase().includes(s)
    );
  }, [items, searchTerm]);

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-full bg-slate-50 dark:bg-[#0d0f14] p-6 md:p-8 overflow-y-auto no-scrollbar"
    >
      {/* ── Header ── */}
      <motion.div
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
      >
        <div className="flex items-start gap-3.5">
          <div className="mt-0.5 w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/15 flex items-center justify-center shrink-0">
            <Code2 size={18} className="text-indigo-500" />
          </div>
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
            <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2.5">
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

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search bar */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search
                size={14}
                className={
                  searchTerm
                    ? "text-indigo-500"
                    : "text-slate-400 dark:text-slate-600 transition-colors"
                }
              />
            </div>
            <input
              type="text"
              placeholder="Search codes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-[220px] pl-10 pr-10 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-white/[0.02] text-sm outline-none transition-all focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-300 hover:text-slate-500 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setActionItem(null);
              setActionType("create");
              setModalOpen(true);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all bg-pink-500 hover:bg-pink-600 active:bg-pink-700 text-white shadow-pink-200 dark:shadow-pink-900/40`}
          >
            New Code
          </motion.button>
        </div>
      </motion.div>

      {/* ── Table card ── */}
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.32, delay: 0.08 }}
        className="bg-white dark:bg-[#161920] rounded-2xl border border-slate-200/80 dark:border-slate-800/60 overflow-hidden shadow-sm"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/60 dark:bg-white/[0.02]">
                <th className="w-10 pl-4 pr-1 py-3.5" />
                {[
                  { label: "Lookup Code", align: "left" },
                  { label: "Description", align: "left" },
                  { label: "Sequence", align: "center" },
                  { label: "System", align: "center" },
                  { label: "Status", align: "center" },
                  { label: "Actions", align: "right" },
                ].map(({ label, align }) => (
                  <th
                    key={label}
                    className={`px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600 text-${align}`}
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
              {!resourceLoading && filteredItems.length > 0 && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={filteredItems.map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <AnimatePresence>
                      {filteredItems.map((row) => (
                        <SortableRow
                          key={row.id}
                          row={row}
                          onView={(r) => {
                            setActionItem(r);
                            setActionType("view");
                            setModalOpen(true);
                          }}
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

        {/* Footer */}
        <AnimatePresence>
          {items.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-5 py-3 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-white/[0.01] flex items-center gap-4"
            >
              <p className="text-xs text-slate-400 dark:text-slate-600">
                {items.length} record{items.length !== 1 ? "s" : ""}
              </p>
              {activeCount > 0 && (
                <span className="text-xs text-emerald-500 dark:text-emerald-600 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 dark:bg-emerald-600" />
                  {activeCount} active
                </span>
              )}
              {items.length - activeCount > 0 && (
                <span className="text-xs text-slate-400 dark:text-slate-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                  {items.length - activeCount} inactive
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Modals (no logic changes) ── */}
      <CodeModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setActionItem(null);
          setActionType("");
        }}
        onSubmit={handleCreateOrUpdate}
        item={actionItem}
        readOnly={actionType === "view"}
      />

      <DeleteConfirmModal
        open={!!actionItem && (actionType === "disable" || actionType === "enable")}
        item={actionItem}
        loading={updateLoading}
        title={actionType === "disable" ? "Disable Lookup Code" : "Enable Lookup Code"}
        confirmText={actionType === "disable" ? "Yes, Disable" : "Yes, Enable"}
        onClose={() => {
          setActionItem(null);
          setActionType("");
        }}
        onConfirm={handleConfirmAction}
      />
    </motion.div>
  );
}