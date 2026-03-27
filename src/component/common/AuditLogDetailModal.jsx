import { Dialog, IconButton, Box, Typography, Paper } from "@mui/material";

import { DataGrid } from "@mui/x-data-grid";

const OPERATION_LABELS = {
  0: { label: "None", color: "slate" },
  1: { label: "Create", color: "success" },
  2: { label: "Update", color: "warning" },
};

function DetailsListView({ rows, opLabel }) {
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-slate-100/50 dark:bg-slate-900/50 rounded-lg mb-2">
        <div className="col-span-4 text-[9px] text-slate-400 ">Property</div>
        {opLabel !== "Create" && (
          <div className="col-span-4 text-[9px] text-slate-400 ">Old Value</div>
        )}
        <div
          className={`${opLabel !== "Create" ? "col-span-4" : "col-span-8"} text-[9px] text-slate-400 `}
        >
          New Value
        </div>
      </div>
      {rows.map((row, idx) => (
        <div
          key={idx}
          className="grid grid-cols-12 gap-4 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b border-slate-100 dark:border-white/5 items-center"
        >
          <div className="col-span-4">
            <span className=" text-[11px] text-slate-500 dark:text-slate-400 ">{row.property}</span>
          </div>
          {opLabel !== "Create" && (
            <div className="col-span-4">
              <span className="text-[12px] text-slate-400 line-through decoration-slate-300 break-all">
                {row.old}
              </span>
            </div>
          )}
          <div
            className={`${opLabel !== "Create" ? "col-span-4" : "col-span-8"}`}
          >
            <span className=" text-[12px] text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-100/50 break-all">
              {row.new}
            </span>
          </div>
        </div>
      ))}
      {rows.length === 0 && (
        <div className="p-8 text-center text-slate-400 text-xs italic">
          No detailed changes detected
        </div>
      )}
    </div>
  );
}

function formatDate(val) {
  if (!val) return "—";
  try {
    return new Date(val).toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return val;
  }
}

export function AuditLogDetailsContent({
  item,
  onClose,
  hideHeader = false,
  isCollapsible = false,
}) {
  if (!item) return null;

  // Prioritize parsing the raw JSON strings as they are often more detailed than the 'Dic' objects
  let parsedOld = {};
  let parsedNew = {};

  try {
    if (
      item.oldValues &&
      item.oldValues !== "{}" &&
      item.oldValues !== "null"
    ) {
      const po =
        typeof item.oldValues === "string"
          ? JSON.parse(item.oldValues)
          : item.oldValues;
      if (po && typeof po === "object") parsedOld = po;
    }
  } catch (e) {
    console.error("AuditLogDetailsContent: oldValues parse error", e);
  }

  try {
    if (
      item.newValues &&
      item.newValues !== "{}" &&
      item.newValues !== "null"
    ) {
      const pn =
        typeof item.newValues === "string"
          ? JSON.parse(item.newValues)
          : item.newValues;
      if (pn && typeof pn === "object") parsedNew = pn;
    }
  } catch (e) {
    console.error("AuditLogDetailsContent: newValues parse error", e);
  }

  // Supplement with dictionary objects if available
  if (item.oldValuesDic && typeof item.oldValuesDic === "object") {
    parsedOld = { ...item.oldValuesDic, ...parsedOld };
  }
  if (item.newValuesDic && typeof item.newValuesDic === "object") {
    parsedNew = { ...item.newValuesDic, ...parsedNew };
  }

  // Merge affected columns
  const affectedArr = Array.isArray(item.affectedColumnsArr)
    ? item.affectedColumnsArr
    : [];

  const allKeys = Array.from(
    new Set([
      ...Object.keys(parsedOld),
      ...Object.keys(parsedNew),
      ...affectedArr,
    ]),
  ).filter((k) => k);

  const hasOldVal =
    (parsedOld && Object.keys(parsedOld).length > 0) ||
    (item.oldValues && item.oldValues !== "{}" && item.oldValues !== "null");

  // Default to 'None' if undefined
  let opMode = "None";
  if (item.operationType === 1) {
    opMode = "Create";
  } else if (item.operationType === 2) {
    opMode = "Update";
  } else if (item.operationType === 0) {
    opMode = "None";
  } else {
    // Fallback for null operationType based on the payload structure
    if (!hasOldVal) {
      opMode = "Create";
    } else {
      opMode = "Update";
    }
  }

  const opLabel = opMode;

  let finalKeys = allKeys;
  if (opLabel === "Update") {
    finalKeys = allKeys.filter((key) => {
      const o = parsedOld[key];
      const n = parsedNew[key];
      return String(o) !== String(n);
    });
  } else if (opLabel === "Create") {
    finalKeys = allKeys.filter((key) => {
      return parsedNew[key] !== undefined && parsedNew[key] !== null;
    });
  }

  const formatValue = (val) => {
    if (val === undefined || val === null) return "—";

    if (typeof val === "object" && val !== null) {
      // Priority 1: Check for PascalCase 'Name' (Often in nested objects like Country)
      if (val.Name !== undefined && val.Name !== null) {
        const nameStr = Array.isArray(val.Name)
          ? val.Name.join("")
          : String(val.Name);
        if (nameStr.trim()) return nameStr;
      }

      // Priority 2: Check for camelCase 'name'
      if (val.name) return String(val.name);

      // Priority 3: Check for displayName or text
      if (val.displayName) return String(val.displayName);
      if (val.text) return String(val.text);

      // Last resort: JSON stringify but handle empty-looking results
      try {
        const json = JSON.stringify(val);
        if (json === "{}" || json === "[]") return "—";
        return json.length > 60 ? json.slice(0, 60) + "..." : json;
      } catch {
        return "[Object]";
      }
    }

    const res = String(val);
    return res && res !== "[object Object]" ? res : "—";
  };

  const rows = finalKeys.map((key, idx) => ({
    id: idx,
    property:
      key === "Country"
        ? "Country Name"
        : key.replace(/([A-Z])/g, " $1").trim(),
    old: formatValue(parsedOld[key]),
    new: formatValue(parsedNew[key]),
  }));

  const columns = [
    {
      field: "property",
      headerName: "PROPERTY",
      flex: 1,
      renderCell: (params) => (
        <span className=" text-[11px] text-slate-500 ">{params.value}</span>
      ),
    },
  ];

  if (opLabel !== "Create") {
    columns.push({
      field: "old",
      headerName: "OLD VALUES",
      flex: 1.5,
      renderCell: (params) => (
        <span className="text-[12px] text-slate-400 line-through decoration-slate-300">
          {params.value}
        </span>
      ),
    });
    columns.push({
      field: "arrow",
      headerName: "",
      width: 40,
      sortable: false,
      renderCell: () => (
        <div className="flex h-full items-center justify-center">
          <ArrowRight size={14} className="text-slate-300" />
        </div>
      ),
    });
  }

  columns.push({
    field: "new",
    headerName: "NEW VALUES",
    flex: 1.5,
    renderCell: (params) => (
      <span className=" text-[12px] text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-100/50">
        {params.value}
      </span>
    ),
  });

  return (
    <Box
      sx={{
        height: isCollapsible ? "auto" : "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "transparent",
      }}
    >
      {/* ── Metadata Header ─────────────────────── */}
      {!hideHeader && (
        <Box
          sx={{
            px: 3,
            py: 1.5,
            bgcolor: "#1e293b",
            display: "flex",
            alignItems: "center",
            gap: 4,
            color: "white",
            borderRadius: "12px 12px 0 0",
          }}
        >
          <Typography
            variant="body2"
            sx={{ fontWeight: 900, fontSize: "0.7rem", color: "primary.light" }}
          >
            —
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 900,
              textTransform: "",
              letterSpacing: 1.5,
              fontSize: "0.7rem",
            }}
          >
            {opLabel}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontSize: "11px",
              fontFamily: "monospace",
              opacity: 0.6,
              flex: 1,
            }}
          >
            {'{"'}Id{'":"'}
            {item.primaryKey}
            {'"}'}
          </Typography>
          <div className="flex gap-4 text-[10px] ">
            <span className="text-blue-400">{item.entityName}</span>
            <span className="text-amber-400">{item.userName}</span>
          </div>
          <Typography
            variant="body2"
            sx={{ fontWeight: 800, fontSize: "0.7rem", whiteSpace: "nowrap" }}
          >
            {formatDate(item.dateTime)}
          </Typography>
        </Box>
      )}

      {/* ── Data Display ──────────────────── */}
      <Box sx={{ flex: 1, p: isCollapsible ? 0 : 0 }}>
        {isCollapsible ? (
          <DetailsListView rows={rows} opLabel={opLabel} />
        ) : (
          <div style={{ height: 450 }}>
            <DataGrid
              rows={rows}
              columns={columns}
              density="compact"
              hideFooter
              sx={{
                border: "none",
                bgcolor: "inherit",
                color: "inherit",
                "& .MuiDataGrid-columnHeader": {
                  bgcolor: "rgba(240, 244, 250, 0.05)",
                  color: "inherit",
                  fontWeight: 800,
                  fontSize: "10px",
                  letterSpacing: "0.05em",
                },
                "& .MuiDataGrid-cell": {
                  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  alignItems: "center",
                },
                "& .MuiDataGrid-row:hover": {
                  bgcolor: "rgba(240, 244, 250, 0.05)",
                },
              }}
            />
          </div>
        )}
      </Box>

      {/* Footer */}
      {!isCollapsible && (
        <Box
          sx={{
            p: 2,
            borderTop: "1px solid",
            borderColor: "divider",
            bgcolor: "white",
            ".dark &": { bgcolor: "#000000" },
            borderRadius: "0 0 12px 12px",
          }}
        >
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 dark:bg-blue-600 text-white rounded-xl text-[10px] tracking-[0.2em] hover:bg-black dark:hover:bg-blue-700 transition-all shadow-xl shadow-slate-200 dark:shadow-none"
          >
            Close Inspection
          </button>
        </Box>
      )}
    </Box>
  );
}

export default function AuditLogDetailModal({ open, onClose, item }) {
  if (!item) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: "16px", p: 0, overflow: "hidden" },
        className: "dark:bg-slate-900",
      }}
    >
      <Box sx={{ height: 600 }}>
        <AuditLogDetailsContent item={item} onClose={onClose} />
      </Box>
    </Dialog>
  );
}
