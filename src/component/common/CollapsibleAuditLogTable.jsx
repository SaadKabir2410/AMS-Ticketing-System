import { useState, useMemo } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, IconButton, Collapse, Box, Typography, Badge, Chip,
    Pagination, Skeleton, useTheme
} from '@mui/material';
import {
    ChevronDown, ChevronUp, History, User, Calendar, ExternalLink,
    Search, SlidersHorizontal, Info, ShieldCheck, Activity, Database,
    ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { AuditLogDetailsContent } from './AuditLogDetailModal';

const OPERATION_COLORS = {
    1: { label: 'CREATE', color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    2: { label: 'UPDATE', color: 'amber', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
};

function CollapsibleRow({ row }) {
    const [open, setOpen] = useState(false);
    const op = OPERATION_COLORS[row.operationType] || { label: 'NONE', bg: 'bg-slate-50', text: 'text-slate-400', border: 'border-slate-200' };
    const date = new Date(row.dateTime);

    return (
        <>
            <TableRow
                onClick={() => setOpen(!open)}
                sx={{
                    cursor: 'pointer',
                    '& > *': { borderBottom: 'unset !important' },
                    transition: 'background-color 0.2s',
                    '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.04)' },
                    bgcolor: open ? 'rgba(59, 130, 246, 0.02)' : 'transparent'
                }}
            >
                <TableCell width={50}>
                    <IconButton size="small">
                        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </IconButton>
                </TableCell>
                <TableCell>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${op.bg} ${op.text} border ${op.border}`}>
                            <Activity size={16} />
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${op.bg} ${op.text} ${op.border}`}>
                            {op.label}
                        </span>
                    </div>
                </TableCell>
                <TableCell>
                    <Typography variant="caption" className="font-mono text-slate-400 font-bold">
                        {row.primaryKey || '—'}
                    </Typography>
                </TableCell>
                <TableCell>
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-50 text-blue-500 rounded-md border border-blue-100">
                            <Database size={12} />
                        </div>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">
                            {row.entityName}
                        </span>
                    </div>
                </TableCell>
                <TableCell>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        {row.schemaName || 'public'}
                    </span>
                </TableCell>
                <TableCell>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200">
                            {row.userName?.[0] || 'U'}
                        </div>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                            {row.userName || 'System'}
                        </span>
                    </div>
                </TableCell>
                <TableCell align="right">
                    <div className="flex flex-col items-end leading-tight">
                        <span className="text-[10px] font-black text-slate-800 dark:text-white">
                            {date.toLocaleDateString('en-GB')}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">
                            {date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                    </div>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0, paddingLeft: 0, paddingRight: 0 }} colSpan={7}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 4, bgcolor: 'rgba(248, 250, 252, 0.5)', borderY: '1px solid rgba(226, 232, 240, 1)' }}>
                            <div className="flex items-center gap-2 mb-6">
                                <ShieldCheck size={18} className="text-blue-500" />
                                <Typography variant="subtitle2" className="font-black text-slate-800 uppercase tracking-widest">
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

export default function CollapsibleAuditLogTable({ data, loading, total, page, onPageChange, pageSize, onPageSizeChange }) {
    const totalPages = Math.ceil(total / pageSize) || 1;

    const handleFirstPage = () => onPageChange(1);
    const handlePrevPage = () => onPageChange(Math.max(1, page - 1));
    const handleNextPage = () => onPageChange(Math.min(totalPages, page + 1));
    const handleLastPage = () => onPageChange(totalPages);
    if (loading && !data.length) {
        return (
            <div className="space-y-4 p-8">
                {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} variant="rectangular" height={60} className="rounded-2xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-transparent">
            <TableContainer className="flex-1 overflow-auto">
                <Table stickyHeader aria-label="collapsible table" size="medium">
                    <TableHead>
                        <TableRow>
                            <TableCell style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }} width={50} />
                            <TableCell style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Operation Type</span>
                            </TableCell>
                            <TableCell style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Primary Key</span>
                            </TableCell>
                            <TableCell style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Entity Name</span>
                            </TableCell>
                            <TableCell style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Schema Name</span>
                            </TableCell>
                            <TableCell style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">User</span>
                            </TableCell>
                            <TableCell style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }} align="right">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Date & Time</span>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.map((row) => (
                            <CollapsibleRow key={row.id} row={row} />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Standard Pagination Footer (Site Style) */}
            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rows:</span>
                    <select
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                        className="px-3 py-1.5 text-xs font-black bg-white border border-slate-200 rounded-xl outline-none transition-all cursor-pointer shadow-sm"
                    >
                        {[10, 25, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="ml-4 h-4 w-px bg-slate-200 hidden sm:block"></div>
                    <div className="text-xs text-slate-500 font-bold hidden sm:block">
                        <span className="text-slate-900">{total > 0 ? (page - 1) * pageSize + 1 : 0}</span>
                        {' — '}
                        <span className="text-slate-900">{Math.min(page * pageSize, total)}</span>
                        <span className="text-slate-400 font-medium"> of </span>
                        <span className="text-slate-900">{total}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleFirstPage}
                        disabled={page === 1 || loading}
                        className="p-2.5 rounded-xl border border-slate-200 disabled:opacity-30 hover:bg-white transition-all shadow-sm"
                    >
                        <ChevronsLeft size={18} />
                    </button>
                    <button
                        onClick={handlePrevPage}
                        disabled={page === 1 || loading}
                        className="px-5 py-2.5 rounded-xl border border-slate-200 disabled:opacity-30 hover:bg-white text-xs font-black uppercase tracking-widest transition-all shadow-sm"
                    >
                        Prev
                    </button>

                    <div className="px-6 py-2.5 bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/25">
                        Page {page} of {totalPages}
                    </div>

                    <button
                        onClick={handleNextPage}
                        disabled={page >= totalPages || loading}
                        className="px-5 py-2.5 rounded-xl border border-slate-200 disabled:opacity-30 hover:bg-white text-xs font-black uppercase tracking-widest transition-all shadow-sm"
                    >
                        Next
                    </button>
                    <button
                        onClick={handleLastPage}
                        disabled={page >= totalPages || loading}
                        className="p-2.5 rounded-xl border border-slate-200 disabled:opacity-30 hover:bg-white transition-all shadow-sm"
                    >
                        <ChevronsRight size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
