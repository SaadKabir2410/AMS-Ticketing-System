import { useState } from "react";
import { Activity, Database, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { AuditLogDetailsContent } from "./AuditLogDetailModal";

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

const OPERATION_COLORS = {
  1: {
    label: "CREATE",
    color: "emerald",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  2: {
    label: "UPDATE",
    color: "amber",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
};

function CollapsibleRow({ row }) {
  const [open, setOpen] = useState(false);
  const op = OPERATION_COLORS[row.operationType] || {
    label: "NONE",
    bg: "bg-slate-50 dark:bg-slate-800",
    text: "text-slate-400 dark:text-slate-500",
    border: "border-slate-200 dark:border-slate-700",
  };
  const date = new Date(row.dateTime);

  return (
    <>
      <motion.tr
        variants={rowVariants}
        onClick={() => setOpen(!open)}
        className={`group transition-all duration-200 border-b border-slate-50 dark:border-slate-800/30 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/20 ${open ? "bg-slate-50 dark:bg-slate-800/30" : "bg-white dark:bg-slate-900"}`}
      >
        <td className="px-5 py-3 text-left w-[50px]">
          <button className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
            {open ? "-" : "+"}
          </button>
        </td>
        <td className="px-5 py-3 text-left">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${op.bg} ${op.text} border ${op.border}`}>
              <Activity size={16} />
            </div>
            <span className={`text-[10px] px-2.5 py-1 font-semibold rounded-full border ${op.bg} ${op.text} ${op.border}`}>
              {op.label}
            </span>
          </div>
        </td>
        <td className="px-5 py-3 text-left">
          <span className="font-mono text-xs text-slate-400">
            {row.primaryKey || "—"}
          </span>
        </td>
        <td className="px-5 py-3 text-left">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-blue-500 rounded-md border border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20">
              <Database size={12} />
            </div>
            <span className="text-xs text-slate-700 dark:text-slate-200 font-medium">
              {row.entityName}
            </span>
          </div>
        </td>
        <td className="px-5 py-3 text-left">
          <span className="text-[11px] text-slate-400 font-medium">
            {row.schemaName || "public"}
          </span>
        </td>
        <td className="px-5 py-3 text-left">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-500 border border-slate-200 dark:border-slate-700">
              {row.userName?.[0]?.toUpperCase() || "U"}
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              {row.userName || "System"}
            </span>
          </div>
        </td>
        <td className="px-5 py-3 text-right">
          <div className="flex flex-col items-end leading-tight">
            <span className="text-[10px] font-bold text-slate-800 dark:text-white">
              {date.toLocaleDateString("en-GB")}
            </span>
            <span className="text-[9px] text-slate-400 font-medium mt-0.5">
              {date.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>
        </td>
      </motion.tr>

      <AnimatePresence>
        {open && (
          <tr>
            <td colSpan={7} className="p-0 border-b border-slate-100 dark:border-slate-800/50">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden bg-slate-50/50 dark:bg-slate-900/40"
              >
                <div className="p-6 border-l-4 border-l-blue-500/30">
                  <div className="flex items-center gap-2 mb-6">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Detailed Audit Information
                    </h3>
                  </div>
                  <AuditLogDetailsContent item={row} hideHeader isCollapsible />
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}

export default function CollapsibleAuditLogTable({
  data,
  loading,
  total,
  page,
  onPageChange,
  pageSize,
  onPageSizeChange,
}) {
  const totalPages = Math.ceil(total / pageSize) || 1;

  const handleFirstPage = () => onPageChange(1);
  const handlePrevPage = () => onPageChange(Math.max(1, page - 1));
  const handleNextPage = () => onPageChange(Math.min(totalPages, page + 1));
  const handleLastPage = () => onPageChange(totalPages);
  if (loading && !data.length) {
    return (
      <div className="absolute inset-0 z-10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-pink-500" size={32} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-transparent relative">
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-separate border-spacing-y-1 min-w-max">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 h-[48px] bg-white dark:bg-slate-900">
              <th className="px-5 w-[50px]"></th>
              <th className="px-5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">OPERATION</th>
              <th className="px-5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">RECORD KEY</th>
              <th className="px-5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">ENTITY NAME</th>
              <th className="px-5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">SCHEMA NAME</th>
              <th className="px-5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">USER NAME</th>
              <th className="px-5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap text-right">DATE TIME</th>
            </tr>
          </thead>
          <motion.tbody
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {(!data || data.length === 0) && !loading ? (
              <tr>
                <td colSpan={7} className="py-32 text-center text-sm font-medium text-slate-400 uppercase tracking-widest">
                  No audit logs found.
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <CollapsibleRow key={row.id || index} row={row} />
              ))
            )}
          </motion.tbody>
        </table>
      </div>

      {/* Standard Pagination Footer (Site Style) */}
      <div className="px-8 py-4 bg-slate-50/80 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 transition-colors rounded-b-3xl mt-auto">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Page Size:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-3 h-7 text-[10px] font-black bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/50 rounded-lg outline-none transition-all cursor-pointer shadow-sm hover:border-pink-500/50 uppercase tracking-widest text-pink-600 dark:text-pink-400"
            >
              {[10, 25, 50, 100].map((s) => (
                <option key={s} value={s} className="dark:bg-slate-900 font-sans">
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-slate-800">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              <span className="text-slate-900 dark:text-white tabular-nums">
                {total > 0 ? (page - 1) * pageSize + 1 : 0}
              </span>
              <span className="text-slate-400 dark:text-slate-600 mx-1.5">—</span>
              <span className="text-slate-900 dark:text-white tabular-nums">
                {Math.min(page * pageSize, total)}
              </span>
              <span className="text-slate-400 dark:text-slate-600 mx-2 lowercase font-bold tracking-normal italic">of</span>
              <span className="text-slate-900 dark:text-white tabular-nums font-black">
                {total}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800/50 p-1 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm">
            <button
              onClick={handleFirstPage}
              disabled={page === 1 || loading}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              title="First Page"
            >
              <ChevronsLeft size={14} strokeWidth={2.5} />
            </button>
            <button
              onClick={handlePrevPage}
              disabled={page === 1 || loading}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              title="Previous Page"
            >
              <ChevronLeft size={14} strokeWidth={2.5} />
            </button>

            <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1"></div>

            <div className="px-3 flex items-center gap-2 py-1">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Page</span>
              <div className="flex items-center gap-1.5 min-w-[40px] justify-center">
                <span className="text-[11px] font-black text-pink-600 dark:text-pink-400 tabular-nums leading-none">{page}</span>
                <span className="text-[10px] font-black text-slate-300 dark:text-slate-600">/</span>
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 tabular-nums leading-none">{totalPages}</span>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1"></div>

            <button
              onClick={handleNextPage}
              disabled={page >= totalPages || loading}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              title="Next Page"
            >
              <ChevronRight size={14} strokeWidth={2.5} />
            </button>
            <button
              onClick={handleLastPage}
              disabled={page >= totalPages || loading}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              title="Last Page"
            >
              <ChevronsRight size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}




