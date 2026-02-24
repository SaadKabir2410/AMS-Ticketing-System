// src/component/common/ResourcePage.jsx
import { useState, useMemo, useRef, useEffect } from 'react';
import {
    Search, Plus, MoreVertical, Eye, Pencil, Trash2,
    Loader2, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    ChevronDown, ChevronUp
} from 'lucide-react';
import { useResource } from "../hooks/useResource";
import { useToast } from './Toast';

function ActionsMenu({ onDetail, onEdit, onDelete }) {
    const [open, setOpen] = useState(false);
    const ref = useRef();
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <button onClick={() => setOpen(!open)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors text-slate-400">
                <MoreVertical size={16} />
            </button>
            {open && (
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-[#1e2436] rounded-xl border border-slate-200 dark:border-white/10 shadow-xl z-50 py-1 overflow-hidden animate-fade-in">
                    <button onClick={() => { onDetail(); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-500 transition-colors">
                        <Eye size={14} /> View Details
                    </button>
                    <button onClick={() => { onEdit(); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-500 transition-colors">
                        <Pencil size={14} /> Edit Record
                    </button>
                    <div className="h-px bg-slate-100 dark:bg-white/5 my-1" />
                    <button onClick={() => { onDelete(); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                        <Trash2 size={14} /> Delete
                    </button>
                </div>
            )}
        </div>
    );
}

export default function ResourcePage({
    title, apiObject, columns, ModalComponent, DetailComponent, DeleteModal,
    searchPlaceholder = "Search records...", createButtonText = "New",
    breadcrumb = []
}) {
    const { toast } = useToast();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [sortKey, setSortKey] = useState('createdAt');
    const [sortDir, setSortDir] = useState('desc');
    const [activeItem, setActiveItem] = useState(null);
    const [modals, setModals] = useState({ create: false, edit: false, detail: false, delete: false });

    const params = useMemo(() => ({ search, page, perPage, sortKey, sortDir }), [search, page, perPage, sortKey, sortDir]);
    const { data, total, totalPages, loading, refetch } = useResource(apiObject, params);

    const onHandleCreate = async (p) => {
        const res = await apiObject.create(p);
        if (res) { toast(`${title} created!`); setModals(m => ({ ...m, create: false })); refetch(); }
    };
    const onHandleUpdate = async (p) => {
        const res = await apiObject.update(activeItem.id, p);
        if (res) { toast(`${title} updated!`); setModals(m => ({ ...m, edit: false })); refetch(); }
    };
    const onHandleDelete = async () => {
        const ok = await apiObject.delete(activeItem.id);
        if (ok) { toast(`${title} deleted!`); setModals(m => ({ ...m, delete: false })); refetch(); }
    };

    const handleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    }

    const SortIcon = ({ col }) => {
        if (sortKey !== col) return <ChevronDown size={12} className="text-slate-300 dark:text-slate-600" />
        return sortDir === 'asc' ? <ChevronUp size={12} className="text-blue-500" /> : <ChevronDown size={12} className="text-blue-500" />
    }

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
            {/* Breadcrumb */}
            {breadcrumb.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    {breadcrumb.map((item, i) => (
                        <span key={i} className="flex items-center gap-2">
                            <span className="hover:text-blue-500 cursor-pointer transition-colors">{item}</span>
                            {i < breadcrumb.length - 1 && <span>/</span>}
                        </span>
                    ))}
                </div>
            )}

            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-none">{title}</h1>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Management Portal</p>
                </div>
                <button onClick={() => setModals(m => ({ ...m, create: true }))} className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all active:scale-95">
                    <Plus size={18} /> {createButtonText}
                </button>
            </div>

            <div className="bg-white dark:bg-[#1e2436] rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/2">
                    <div className="relative max-w-md">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            className="w-full pl-11 pr-4 py-2.5 text-sm bg-white dark:bg-[#242938] border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-white/2">
                                {columns.map(col => (
                                    <th
                                        key={col.key}
                                        onClick={() => handleSort(col.key)}
                                        className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-600 dark:hover:text-slate-200 select-none transition-colors"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            {col.label}
                                            <SortIcon col={col.key} />
                                        </div>
                                    </th>
                                ))}
                                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {loading ? (
                                <tr><td colSpan={columns.length + 1} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" /></td></tr>
                            ) : data.length === 0 ? (
                                <tr><td colSpan={columns.length + 1} className="py-20 text-center text-slate-400 text-sm font-medium">No records found.</td></tr>
                            ) : (
                                data.map(row => (
                                    <tr key={row.id} className="hover:bg-blue-50/30 dark:hover:bg-white/5 transition-colors group">
                                        {columns.map(col => (
                                            <td key={col.key} className={`px-6 py-4 text-sm font-bold ${col.bold ? 'text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                                                {col.render ? col.render(row[col.key], row) : (row[col.key] || '—')}
                                            </td>
                                        ))}
                                        <td className="px-6 py-4 text-right">
                                            <ActionsMenu
                                                onDetail={() => { setActiveItem(row); setModals(m => ({ ...m, detail: true })) }}
                                                onEdit={() => { setActiveItem(row); setModals(m => ({ ...m, edit: true })) }}
                                                onDelete={() => { setActiveItem(row); setModals(m => ({ ...m, delete: true })) }}
                                            />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-white/5 gap-4 bg-slate-50/30 dark:bg-white/1">
                    <div className="flex items-center gap-1.5">
                        <button onClick={() => setPage(1)} disabled={page === 1} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-20 transition-all"><ChevronsLeft size={16} /></button>
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-20 transition-all"><ChevronLeft size={16} /></button>

                        <div className="flex items-center gap-1 px-2">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pg = totalPages <= 5 ? i + 1 : (page <= 3 ? i + 1 : (page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i));
                                return (
                                    <button
                                        key={pg}
                                        onClick={() => setPage(pg)}
                                        className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${page === pg ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                                    >
                                        {pg}
                                    </button>
                                )
                            })}
                        </div>

                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-20 transition-all"><ChevronRight size={16} /></button>
                        <button onClick={() => setPage(totalPages)} disabled={page === totalPages || totalPages === 0} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-20 transition-all"><ChevronsRight size={16} /></button>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-bold uppercase">Show</span>
                            <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }} className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#242938] text-slate-600 dark:text-slate-200 outline-none cursor-pointer">
                                {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest bg-slate-100/50 dark:bg-white/5 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/5">
                            {total > 0 ? (page - 1) * perPage + 1 : 0}–{Math.min(page * perPage, total)} OF {total}
                        </span>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <ModalComponent
                open={modals.create}
                onClose={() => setModals(m => ({ ...m, create: false }))}
                onSubmit={onHandleCreate}
            />
            <ModalComponent
                open={modals.edit}
                item={activeItem}
                ticket={activeItem} // Backwards compatibility
                site={activeItem}   // Backwards compatibility
                onClose={() => setModals(m => ({ ...m, edit: false }))}
                onSubmit={onHandleUpdate}
            />
            {DetailComponent && (
                <DetailComponent
                    open={modals.detail}
                    item={activeItem}
                    ticket={activeItem}
                    site={activeItem}
                    onClose={() => setModals(m => ({ ...m, detail: false }))}
                />
            )}
            {DeleteModal && (
                <DeleteModal
                    open={modals.delete}
                    item={activeItem}
                    ticket={activeItem}
                    site={activeItem}
                    onClose={() => setModals(m => ({ ...m, delete: false }))}
                    onConfirm={onHandleDelete}
                />
            )}
        </div>
    );
}
