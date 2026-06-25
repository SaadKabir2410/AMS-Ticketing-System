import { useState } from "react";
import { Activity, Database } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  2: {
    label: "UPDATE",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
};

function safeParseJson(val) {
  if (!val || val === "{}" || val === "null") return {};
  if (typeof val === "object") return val;
  try { return JSON.parse(val); } catch { return {}; }
}

function formatVal(val) {
  if (val === undefined || val === null) return "";
  if (typeof val === "object") {
    if (val.Name !== undefined) return String(val.Name);
    if (val.name) return String(val.name);
    if (val.displayName) return String(val.displayName);
    try {
      const j = JSON.stringify(val);
      return j === "{}" || j === "[]" ? "" : j;
    } catch { return "[Object]"; }
  }
  return String(val);
}

function buildDetailRows(row) {
  const parsedOld = {
    ...safeParseJson(row.oldValues),
    ...(row.oldValuesDic && typeof row.oldValuesDic === "object" ? row.oldValuesDic : {}),
  };
  const parsedNew = {
    ...safeParseJson(row.newValues),
    ...(row.newValuesDic && typeof row.newValuesDic === "object" ? row.newValuesDic : {}),
  };
  const affectedArr = Array.isArray(row.affectedColumnsArr) ? row.affectedColumnsArr : [];
  const allKeys = Array.from(
    new Set([...Object.keys(parsedOld), ...Object.keys(parsedNew), ...affectedArr])
  ).filter(Boolean);

  const opType = row.operationType;
  let finalKeys = allKeys;
  if (opType === 2) {
    finalKeys = allKeys.filter((k) => String(parsedOld[k]) !== String(parsedNew[k]));
  } else if (opType === 1) {
    finalKeys = allKeys.filter((k) => parsedNew[k] !== undefined && parsedNew[k] !== null);
  }
  return { parsedOld, parsedNew, finalKeys, opType };
}

function DetailTable({ row }) {
  const { parsedOld, parsedNew, finalKeys, opType } = buildDetailRows(row);

  if (finalKeys.length === 0) {
    return (
      <p className="text-[10px] text-slate-400 italic py-2 px-3">
        No detailed changes detected.
      </p>
    );
  }

  const isCreate = opType === 1;

  return (
    <div className="w-full overflow-x-auto">
      <table className="border-collapse w-full">
        <thead>
          <tr>
            <th className="border border-slate-300 dark:border-slate-600 bg-blue-50 dark:bg-slate-700 px-1.5 py-1" />
            {finalKeys.map((key) => (
              <th
                key={key}
                className="border border-slate-300 dark:border-slate-600 bg-blue-50 dark:bg-slate-700 px-1.5 py-1 text-center font-semibold text-[9px] text-slate-600 dark:text-slate-300 leading-tight align-bottom"
              >
                {key.replace(/([A-Z])/g, " $1").trim()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!isCreate && (
            <tr>
              <td className="border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-1.5 py-1 font-semibold text-[9px] text-slate-500 dark:text-slate-400 whitespace-nowrap align-top">
                Old Values
              </td>
              {finalKeys.map((key) => (
                <td
                  key={key}
                  className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-1.5 py-1 align-top"
                >
                  <span className="break-words block text-[10px] leading-snug text-slate-400 line-through decoration-slate-300">
                    {formatVal(parsedOld[key])}
                  </span>
                </td>
              ))}
            </tr>
          )}
          <tr>
            <td className="border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-1.5 py-1 font-semibold text-[9px] text-slate-500 dark:text-slate-400 whitespace-nowrap align-top">
              New Values
            </td>
            {finalKeys.map((key) => (
              <td
                key={key}
                className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-1.5 py-1 align-top"
              >
                <span className="break-words block text-[10px] leading-snug text-emerald-600 dark:text-emerald-400">
                  {formatVal(parsedNew[key])}
                </span>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

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
        className={`group transition-all duration-200 cursor-pointer hover:brightness-95 ${
          open
            ? "bg-slate-100 dark:bg-slate-800/50"
            : row.operationType === 1
              ? "bg-emerald-50/80 dark:bg-emerald-900/30"
              : row.operationType === 2
                ? "bg-amber-50/80 dark:bg-amber-900/30"
                : "bg-white dark:bg-slate-900"
        }`}
      >
        <td className="px-5 py-3 text-left w-[50px]">
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
            className={`w-6 h-6 flex items-center justify-center rounded-md text-sm font-bold transition-colors ${
              open
                ? "bg-pink-100 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400"
                : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
            }`}
          >
            {open ? "−" : "+"}
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
          <span className="font-mono text-xs text-slate-400">{row.primaryKey || "—"}</span>
        </td>
        <td className="px-5 py-3 text-left">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-blue-500 rounded-md border border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20">
              <Database size={12} />
            </div>
            <span className="text-xs text-slate-700 dark:text-slate-200 font-medium">{row.entityName}</span>
          </div>
        </td>
        <td className="px-5 py-3 text-left">
          <span className="text-[11px] text-slate-400 font-medium">{row.schemaName || "public"}</span>
        </td>
        <td className="px-5 py-3 text-left">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-500 border border-slate-200 dark:border-slate-700">
              {row.userName?.[0]?.toUpperCase() || "U"}
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">{row.userName || "System"}</span>
          </div>
        </td>
        <td className="px-5 py-3 text-right">
          <div className="flex flex-col items-end leading-tight">
            <span className="text-[10px] font-bold text-slate-800 dark:text-white">
              {date.toLocaleDateString("en-GB")}
            </span>
            <span className="text-[9px] text-slate-400 font-medium mt-0.5">
              {date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>
        </td>
      </motion.tr>

      <AnimatePresence>
        {open && (
          <tr style={{ marginTop: 0, marginBottom: 0 }}>
            <td colSpan={7} className="p-0" style={{ paddingTop: 0, paddingBottom: 0 }}>
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {/* Sticky wrapper: keeps content at left edge within viewport width */}
                <div style={{ position: "sticky", left: 0, width: "100%", maxWidth: "100vw", overflow: "hidden" }}>
                  {/* Metadata bar */}
                  <div className="flex items-center gap-12 px-5 py-2 bg-slate-500 dark:bg-slate-700 text-white overflow-x-auto flex-nowrap">
                    <span className={`shrink-0 font-bold text-[10px] px-2.5 py-0.5 rounded ${
                      row.operationType === 1
                        ? "bg-emerald-400/30 text-emerald-100"
                        : row.operationType === 2
                          ? "bg-amber-400/30 text-amber-100"
                          : "bg-slate-400/30 text-slate-100"
                    }`}>
                      {op.label}
                    </span>
                    <span className="font-mono text-[10px] opacity-70 shrink-0">
                      {`{"Id":"${row.primaryKey}"}`}
                    </span>
                    <span className="text-blue-200 text-[10px] shrink-0">{row.entityName}</span>
                    <span className="text-slate-300 text-[10px] shrink-0">{row.schemaName || "public"}</span>
                    <span className="text-amber-200 text-[10px] shrink-0">{row.userName}</span>
                    <span className="ml-auto text-[9px] opacity-60 shrink-0 whitespace-nowrap">
                      {date.toLocaleDateString("en-GB")} {date.toLocaleTimeString("en-GB")}
                    </span>
                  </div>
                  {/* Property table */}
                  <div className="overflow-x-auto">
                    <DetailTable row={row} />
                  </div>
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}

export default function CollapsibleAuditLogTable({ data, loading }) {
  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full text-left border-separate border-spacing-y-[3px] min-w-max">
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
        <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
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
  );
}
