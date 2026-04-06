import { useState } from "react";
import { Activity, Database, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Collapse,
  Box,
  Typography,
  Badge,
  Chip,
  Pagination,
  Skeleton,
} from "@mui/material";

import { AuditLogDetailsContent } from "./AuditLogDetailModal";

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
    bg: "bg-slate-50",
    text: "text-slate-400",
    border: "border-slate-200",
  };
  const date = new Date(row.dateTime);

  return (
    <>
      <TableRow
        onClick={() => setOpen(!open)}
        sx={{
          cursor: "pointer",
          "& > *": { borderBottom: "unset !important" },
          transition: "background-color 0.2s",
          "&:hover": { bgcolor: "rgba(59, 130, 246, 0.04)" },
          bgcolor: open ? "rgba(59, 130, 246, 0.02)" : "transparent",
        }}
      >
        <TableCell width={50}>
          <IconButton size="small">
            {open ? "-" : "+"}
          </IconButton>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${op.bg} ${op.text} border ${op.border}`}
            >
              <Activity size={16} />
            </div>
            <span
              className={`text-[10px] px-2.5 py-1 rounded-full border ${op.bg} ${op.text} ${op.border}`}
            >
              {op.label}
            </span>
          </div>
        </TableCell>
        <TableCell>
          <Typography variant="caption" className="font-mono text-slate-400 ">
            {row.primaryKey || "—"}
          </Typography>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-blue-500 rounded-md border border-blue-100">
              <Database size={12} />
            </div>
            <span className="text-xs text-slate-700 dark:text-slate-200 ">
              {row.entityName}
            </span>
          </div>
        </TableCell>
        <TableCell>
          <span className="text-[11px] text-slate-400 ">
            {row.schemaName || "public"}
          </span>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-500 border border-slate-200">
              {row.userName?.[0] || "U"}
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-300">
              {row.userName || "System"}
            </span>
          </div>
        </TableCell>
        <TableCell align="right">
          <div className="flex flex-col items-end leading-tight">
            <span className="text-[10px] text-slate-800 dark:text-white">
              {date.toLocaleDateString("en-GB")}
            </span>
            <span className="text-[9px] text-slate-400 ">
              {date.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell
          style={{
            paddingBottom: 0,
            paddingTop: 0,
            paddingLeft: 0,
            paddingRight: 0,
          }}
          colSpan={7}
        >
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box
              sx={{
                p: 4,
                bgcolor: "rgba(248, 250, 252, 0.5)",
                border: "none",
                ".dark &": {
                  bgcolor: "rgba(15, 23, 42, 0.4)",
                  borderColor: "transparent",
                }
              }}
            >
              <div className="flex items-center gap-2 mb-6">
                <Typography variant="subtitle2" className=" text-slate-800 dark:text-slate-200 ">
                  Detailed Audit Information
                </Typography>
              </div>

              {/* This is the Detail Panel Content without internal scroll */}
              <AuditLogDetailsContent item={row} hideHeader isCollapsible />
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
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
      <div className="space-y-4 p-8">
        {[...Array(5)].map((_, i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            height={60}
            className="rounded-2xl"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-transparent">
      <TableContainer className="flex-1 overflow-auto">
        <Table stickyHeader sx={{ minWidth: 800 }}>
          <TableHead>
            <TableRow sx={{ 
              "& th": { 
                bgcolor: "rgba(248, 250, 252, 0.9)", 
                borderBottom: "none !important",
                ".dark &": {
                  bgcolor: "#0f172a",
                  borderColor: "transparent",
                  color: "#94a3b8"
                }
              } 
            }}>
              <TableCell width={50} />
              <TableCell className="text-xs text-slate-500 tracking-wider">OPERATION</TableCell>
              <TableCell className="text-xs text-slate-500 tracking-wider">RECORD KEY</TableCell>
              <TableCell className="text-xs text-slate-500 tracking-wider">TYPE</TableCell>
              <TableCell className="text-xs text-slate-500 tracking-wider">NAMESPACE</TableCell>
              <TableCell className="text-xs text-slate-500 tracking-wider">ACTOR</TableCell>
              <TableCell align="right" className="text-xs text-slate-500 tracking-wider">TIMESTAMP</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(!data || data.length === 0) && !loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-20 text-slate-400">
                  No audit logs found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => (
                <CollapsibleRow key={row.id || index} row={row} />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Standard Pagination Footer (Site Style) */}
      <div className="px-8 py-4 bg-slate-50/80 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 transition-colors">
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




