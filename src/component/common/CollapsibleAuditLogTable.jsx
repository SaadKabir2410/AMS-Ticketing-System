import { useMemo, useState } from "react";
import { Database } from "lucide-react";
import { motion as Motion, AnimatePresence } from "framer-motion";

const OPERATION_COLORS = {
  0: {
    bg: "bg-slate-50",
    text: "text-slate-600",
    border: "border-slate-200",
  },
  1: {
    labelKey: "Created",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  2: {
    labelKey: "Updated",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  3: {
    labelKey: "Deleted",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
  },
};

// Operation names are the ABP audit logging texts "Created", "Updated", "Deleted".
const operationLabel = (op, localize) => (op.labelKey ? localize(op.labelKey) : "—");

function HighlightText({ text, query }) {
  const value = String(text ?? "");
  const term = String(query ?? "").trim();
  if (!term || !value) return value;

  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = value.split(new RegExp(`(${escapedTerm})`, "gi"));

  return parts.map((part, index) =>
    part.toLowerCase() === term.toLowerCase() ? (
      <mark
        key={`${part}-${index}`}
        className="rounded-sm bg-pink-200 px-0.5 text-pink-900 dark:bg-pink-500/40 dark:text-pink-100"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function safeParseJson(val) {
  if (!val || val === "{}" || val === "null") return {};
  if (typeof val === "object") return Array.isArray(val) ? {} : val;
  try {
    const parsed = JSON.parse(val);
    if (typeof parsed === "string") return safeParseJson(parsed);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function getAffectedColumns(row) {
  if (Array.isArray(row.affectedColumnsArr)) return row.affectedColumnsArr;
  if (Array.isArray(row.affectedColumns)) return row.affectedColumns;
  if (!row.affectedColumns || typeof row.affectedColumns !== "string") return [];

  try {
    const parsed = JSON.parse(row.affectedColumns);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Some audit providers return a comma-separated string instead of JSON.
  }

  return row.affectedColumns.split(",").map((key) => key.trim()).filter(Boolean);
}

function normalizeOperationType(value) {
  if (typeof value === "number") return value;
  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) return numericValue;

  const operationNames = { none: 0, create: 1, update: 2, delete: 3 };
  return operationNames[String(value || "").toLowerCase()] ?? 0;
}

function comparableValue(value) {
  if (value === undefined) return "__undefined__";
  if (value === null) return "__null__";
  if (typeof value !== "object") return String(value);
  try {
    return JSON.stringify(value, Object.keys(value).sort());
  } catch {
    return String(value);
  }
}

function formatVal(val) {
  if (val === undefined || val === null) return "";
  if (typeof val === "object") {
    if (val.Name !== undefined) return String(val.Name);
    if (val.name) return String(val.name);
    if (val.displayName) return String(val.displayName);
    if (val.LookupCode || val.Description) {
      return [val.LookupCode, val.Description].filter(Boolean).join(" - ");
    }
    try {
      const j = JSON.stringify(val);
      return j === "{}" || j === "[]" ? "" : j;
    } catch { return "[Object]"; }
  }
  return String(val);
}

// AMS Ticket audit records show only these fields, in this order.
const AMS_TICKET_AUDIT_FIELDS = [
  "ActivityTotalDuration",
  "CMSNextTicketNo",
  "CMSTicketAddedOn",
  "CreationTime",
  "IsPRE",
  "IssueDescription",
  "IsTicketForwarded",
  "PossibleRootCause",
  "ServicePlannedType",
  "ServicePlannedTypeDisplayName",
  "Settings",
  "Status",
  "StatusDisplayName",
  "TicketIncomingChannel",
  "TicketIncomingChannelDisplayName",
  "TicketNotes",
  "TicketReceivedDate",
  "TicketType",
  "TicketTypeDisplayName",
].map((field) => field.toLowerCase());

const isAmsTicketEntity = (entityName) =>
  String(entityName || "").split(".").pop().toLowerCase() === "amsticket";

function buildDetailRows(row) {
  const parsedOld = {
    ...(row.oldValuesDic && typeof row.oldValuesDic === "object" ? row.oldValuesDic : {}),
    ...safeParseJson(row.oldValues),
  };
  const parsedNew = {
    ...(row.newValuesDic && typeof row.newValuesDic === "object" ? row.newValuesDic : {}),
    ...safeParseJson(row.newValues),
  };
  const affectedArr = getAffectedColumns(row);
  const opType = normalizeOperationType(row.operationType);
  // The ticket "Settings" snapshot is shown only when the record is created;
  // on updates and deletes it is internal data, not a user-facing change.
  const allKeys = Array.from(
    new Set([...Object.keys(parsedOld), ...Object.keys(parsedNew), ...affectedArr])
  ).filter((key) => key && (opType === 1 || key.toLowerCase() !== "settings"));

  let finalKeys = allKeys;
  if (opType === 2) {
    finalKeys = allKeys.filter(
      (key) => comparableValue(parsedOld[key]) !== comparableValue(parsedNew[key]),
    );
  } else if (opType === 1) {
    finalKeys = allKeys.filter((k) => parsedNew[k] !== undefined && parsedNew[k] !== null);
  } else if (opType === 3) {
    finalKeys = allKeys.filter((k) => parsedOld[k] !== undefined && parsedOld[k] !== null);
  }
  if (isAmsTicketEntity(row.entityName)) {
    const order = (key) => AMS_TICKET_AUDIT_FIELDS.indexOf(key.toLowerCase());
    finalKeys = finalKeys.filter((key) => order(key) !== -1).sort((a, b) => order(a) - order(b));
  }
  return { parsedOld, parsedNew, finalKeys, opType };
}

function getPrimaryKeyDisplay(row) {
  const dictionaryId = row.primaryKeys?.Id ?? row.primaryKeys?.id;
  if (dictionaryId !== undefined && dictionaryId !== null) {
    return String(dictionaryId);
  }

  const parsedPrimaryKey = safeParseJson(row.primaryKey);
  const parsedId = parsedPrimaryKey.Id ?? parsedPrimaryKey.id;
  if (parsedId !== undefined && parsedId !== null) return String(parsedId);

  return row.primaryKey || "—";
}

function DetailTable({ row, localize }) {
  const { parsedOld, parsedNew, finalKeys, opType } = buildDetailRows(row);

  if (finalKeys.length === 0) {
    return (
      <p className="text-[12px] text-slate-400 italic py-3 px-4">
        {localize("NoChanges")}
      </p>
    );
  }

  return (
    <DetailGrid
      parsedOld={parsedOld}
      parsedNew={parsedNew}
      finalKeys={finalKeys}
      opType={opType}
      localize={localize}
    />
  );
}

// Field changes as a bordered grid: one column per changed field (its name is
// the header) and one row each for the old and the new values.
// Each column is as wide as the longest word of its header; the header shows one
// word per line and the values wrap within that width.
let measureContext = null;
const measureText = (text, font) => {
  if (!measureContext) measureContext = document.createElement("canvas").getContext("2d");
  measureContext.font = font;
  return measureContext.measureText(String(text ?? "")).width;
};
const HEADER_FONT = '700 12px "Inter", sans-serif';
const VALUE_FONT = '400 12px "Inter", sans-serif';
const CELL_PADDING = 14; // px-[7px] on both sides
// The Settings snapshot is long JSON, so it gets a fixed standard width instead.
const SETTINGS_COLUMN_WIDTH = 420;

const longestWordWidth = (text, font) =>
  Math.max(0, ...String(text ?? "").split(/\s+/).map((word) => measureText(word, font)));

const fitColumnWidth = (header) =>
  Math.ceil(Math.max(longestWordWidth(header, HEADER_FONT), 24) + CELL_PADDING + 1);

// "cMSNextTicketNo" -> "CMS Next Ticket No", "isPRE" -> "Is PRE"
const splitFieldName = (name) => {
  // Capitalising the first letter turns "cMS..." back into the "CMS" acronym.
  const text = String(name);
  return (text.charAt(0).toUpperCase() + text.slice(1))
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
};

function DetailGrid({ parsedOld, parsedNew, finalKeys, localize }) {
  const rows = useMemo(() => [
    // "Old value" as requested; the backend has no such text yet, and an
    // "OldValue" key added later is used automatically.
    {
      id: "old",
      label: [localize("OldValue")].find((text) => text && text !== "OldValue") || "Old value",
      values: parsedOld,
    },
    { id: "new", label: localize("NewValue"), values: parsedNew },
  ].map((row) => ({
    ...row,
    cells: Object.fromEntries(finalKeys.map((key) => [key, formatVal(row.values[key])])),
  })), [finalKeys, parsedOld, parsedNew, localize]);

  const columns = useMemo(() => finalKeys.map((key) => {
    const header = splitFieldName(key);
    const width = key.toLowerCase() === "settings" ? SETTINGS_COLUMN_WIDTH : fitColumnWidth(header);
    return { key, header, width };
  }), [finalKeys]);

  const labelWidth = Math.ceil(
    Math.max(...rows.map((row) => longestWordWidth(row.label, VALUE_FONT)), 24) + CELL_PADDING + 1,
  );
  const tableWidth = labelWidth + columns.reduce((total, column) => total + column.width, 0);
  const border = "border border-slate-300 dark:border-slate-600";

  return (
    // width:0 keeps the grid from stretching the row; it scrolls sideways when wider.
    <div className="p-3" style={{ width: 0, minWidth: "100%" }}>
      <div className="overflow-x-auto custom-scrollbar">
        <table
          className="table-fixed border-collapse bg-white dark:bg-slate-900 text-[12px]"
          // Fills the full row width; with many fields it grows wider and scrolls.
          style={{ width: tableWidth, minWidth: "100%" }}
        >
          <colgroup>
            <col style={{ width: labelWidth }} />
            {columns.map((column) => (
              <col key={column.key} style={{ width: column.width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className={border} />
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`${border} px-[7px] py-2 text-left align-bottom font-bold leading-[1.5] tracking-wide text-slate-700 dark:text-slate-200`}
                >
                  {column.header.split(" ").map((word, index) => (
                    <span key={index} className="block">{word}</span>
                  ))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className={`${border} px-[7px] py-2 align-top leading-[1.5] text-slate-500 dark:text-slate-400`}>
                  {row.label}
                </td>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`${border} px-[7px] py-2 align-top leading-[1.5] text-slate-600 dark:text-slate-300 [overflow-wrap:anywhere]`}
                  >
                    {row.cells[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CollapsibleRow({ row, localize, searchTerm }) {
  const [open, setOpen] = useState(false);
  const operationType = normalizeOperationType(row.operationType);
  const op = OPERATION_COLORS[operationType] || OPERATION_COLORS[0];
  const date = new Date(row.dateTime);
  const primaryKeyDisplay = getPrimaryKeyDisplay(row);

  return (
    <>
      <tr
        onClick={() => setOpen(!open)}
        className={`group transition-all duration-200 cursor-pointer hover:brightness-95 ${open
          ? "bg-slate-100 dark:bg-slate-800/50"
          : operationType === 1
            ? "bg-emerald-50/80 dark:bg-emerald-900/30"
            : operationType === 2
              ? "bg-amber-50/80 dark:bg-amber-900/30"
              : operationType === 3
                ? "bg-rose-50/80 dark:bg-rose-900/30"
                : "bg-white dark:bg-slate-900"
          }`}
      >
        <td className="px-5 py-3 text-left w-[50px]">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
            className={`w-6 h-6 flex items-center justify-center rounded-md text-sm font-bold transition-colors ${open
              ? "bg-pink-100 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400"
              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              }`}
            aria-expanded={open}
          >
            {open ? "−" : "+"}
          </button>
        </td>
        <td className="px-5 py-3 text-left">
          <span className={`text-[10px] px-2.5 py-1 font-semibold rounded-full border ${op.bg} ${op.text} ${op.border}`}>
            {operationLabel(op, localize)}
          </span>
        </td>
        <td className="px-5 py-3 text-left">
          <span className="font-mono text-xs text-slate-400 [overflow-wrap:anywhere]">{primaryKeyDisplay}</span>
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
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-500 border border-slate-200 dark:border-slate-700">
              {row.userName?.[0]?.toUpperCase() || "—"}
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              <HighlightText text={row.userName || "—"} query={searchTerm} />
            </span>
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
      </tr>

      <AnimatePresence>
        {open && (
          <tr>
            <td colSpan={6} className="p-0">
              <Motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden bg-slate-50 dark:bg-slate-800/30"
              >
                <DetailTable row={row} localize={localize} />
              </Motion.div>
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
  localize = (key) => key,
  searchTerm = "",
}) {
  const headerClass = "px-5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap";
  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full min-w-[760px] text-left border-separate border-spacing-y-[3px]">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 h-[48px] bg-white dark:bg-slate-900">
            <th className="px-5 w-[50px]"></th>
            {/* ABP audit logging texts; the backend has no schema caption, so that column is not shown. */}
            <th className={headerClass}>{localize("ChangeType")}</th>
            <th className={headerClass}>{localize("EntityId")}</th>
            <th className={headerClass}>{localize("Entity")}</th>
            <th className={headerClass}>{localize("UserName")}</th>
            <th className={`${headerClass} text-right`}>{localize("Date")} {localize("Time")}</th>
          </tr>
        </thead>
        <tbody>
          {(!data || data.length === 0) && !loading ? (
            <tr>
              <td colSpan={6} className="py-32 text-center text-sm font-medium text-slate-400 uppercase tracking-widest">
                {localize("NoDataAvailableInDatatable")}
              </td>
            </tr>
          ) : (
            (data || []).map((row, index) => (
              <CollapsibleRow
                key={row.id || index}
                row={row}
                localize={localize}
                searchTerm={searchTerm}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
