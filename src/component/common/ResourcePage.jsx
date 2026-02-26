import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, Plus, MoreVertical, Eye, Pencil, Trash2,
    Loader2, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    ChevronDown, ChevronUp, ArrowLeft, SlidersHorizontal
} from 'lucide-react';
import { DataGrid, getGridStringOperators } from '@mui/x-data-grid';
import { useResource } from "../hooks/useResource";
import { useToast } from './Toast';

function ActionsMenu({ onDetail, onEdit }) {
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
                        <Pencil size={14} /> Update Data
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
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sortKey, setSortKey] = useState('id');
    const [sortDir, setSortDir] = useState('desc');
    const [activeItem, setActiveItem] = useState(null);
    const [modals, setModals] = useState({ create: false, edit: false, detail: false });
    const [filterModel, setFilterModel] = useState({ items: [] }); // MUI DataGrid column filter state
    const [columnFilter, setColumnFilter] = useState(null);        // debounced active filter
    // Filter bar UI state — always pre-selected and active
    const [filterField, setFilterField] = useState('');          // '' = All Columns
    const [filterOperator, setFilterOperator] = useState('');     // '' = All Operators
    const [filterValue, setFilterValue] = useState('');



    // Debounce search: waits 500ms after typing stops before calling API
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // Debounce column filter: waits 500ms after user stops typing in filter panel
    useEffect(() => {
        const active = filterModel.items.find(item => item.value !== undefined && item.value !== '');
        const timer = setTimeout(() => {
            setColumnFilter(active ? { field: active.field, operator: active.operator, value: active.value } : null);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [filterModel]);

    const params = useMemo(() => ({
        search: debouncedSearch,
        page,
        perPage: pageSize,
        sortKey,
        sortDir,
        columnFilter, // column-level filter from DataGrid panel
        filterOperator, // global or column-specific operator
    }), [debouncedSearch, page, pageSize, sortKey, sortDir, columnFilter, filterOperator]);
    const { data, total, totalPages, loading, error, refetch } = useResource(apiObject, params);

    // Auto-reset sort if it causes a server error (e.g. backend doesn't support sorting by that field)
    useEffect(() => {
        if (error && sortKey !== 'id') {
            console.warn(`Sort by '${sortKey}' caused an error. Resetting to default sort.`);
            setSortKey('id');
            setSortDir('desc');
        }
    }, [error]);

    // Enforce page size in UI in case server returns too much data
    const visibleData = useMemo(() => {
        if (!data) return [];
        // If server data length exceeds pageSize, it's likely the server ignored the limit
        // In that case, we slice it on the client as a fallback.
        return data.length > pageSize ? data.slice(0, pageSize) : data;
    }, [data, pageSize]);

    const onHandleCreate = async (p) => {
        try {
            await apiObject.create(p);
            toast(`${title} created!`);
            setModals(m => ({ ...m, create: false }));
            setPage(1);         // Jump back to page 1
            setSortKey('id');   // Reset sort → maps to 'CreationTime desc' on server
            setSortDir('desc'); // These state changes automatically trigger re-fetch via useEffect
        } catch (error) {
            console.error("Create failed:", error);
            toast(`Failed to create ${title}: ` + (error.response?.data?.message || error.message || 'Server Error'));
        }
    };
    const onHandleUpdate = async (p) => {
        try {
            await apiObject.update(activeItem.id, p);
            toast(`${title} updated!`);
            setModals(m => ({ ...m, edit: false }));
            refetch(); // explicitly re-fetch after update so table shows latest data
        } catch (error) {
            console.error("Update failed:", error);
            toast(`Failed to update ${title}: ` + (error.response?.data?.message || error.message || 'Server Error'));
        }
    };

    const handleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    }

    const handleNextPage = () => {
        if (page < totalPages) setPage(p => p + 1);
    };

    const handleFirstPage = () => {
        if (page > 1) setPage(1);
    };

    const handleLastPage = () => {
        if (page < (totalPages || 1)) setPage(totalPages || 1);
    };
    const handlePrevPage = () => {
        if (page > 1) setPage(p => p - 1);
    };

    const SortIcon = ({ col }) => {
        if (sortKey !== col) return <ChevronDown size={12} className="text-slate-300 dark:text-slate-600" />
        return sortDir === 'asc' ? <ChevronUp size={12} className="text-blue-500" /> : <ChevronDown size={12} className="text-blue-500" />
    }

    const muiColumns = useMemo(() => {
        // Only keep the 3 operators your backend can handle
        const textFilterOperators = getGridStringOperators().filter(op =>
            ['contains', 'equals', 'startsWith'].includes(op.value)
        ).map(op => ({
            ...op,
            label: op.value === 'contains' ? 'Contains'
                : op.value === 'equals' ? 'Equals'
                    : op.value === 'startsWith' ? 'Starts With'
                        : op.label,
        }));

        // Highlights matching substring in yellow inside a cell
        const HighlightText = ({ text, searchTerm, className }) => {
            if (!searchTerm || !text) return <span className={className}>{text || '—'}</span>;
            const str = String(text);
            const idx = str.toLowerCase().indexOf(searchTerm.toLowerCase());
            if (idx === -1) return <span className={className}>{str}</span>;
            return (
                <span className={className}>
                    {str.slice(0, idx)}
                    <mark style={{
                        background: '#fde047',
                        color: '#713f12',
                        borderRadius: '3px',
                        padding: '0 2px',
                        fontWeight: 700,
                    }}>
                        {str.slice(idx, idx + searchTerm.length)}
                    </mark>
                    {str.slice(idx + searchTerm.length)}
                </span>
            );
        };

        const cols = columns.map(col => ({
            field: col.key,
            headerName: col.label,
            flex: 1,
            minWidth: 150,
            sortable: col.sortable !== false,
            filterable: col.filterable !== false,
            filterOperators: textFilterOperators,
            renderCell: (params) => {
                const val = params.value;
                const row = params.row;
                // Highlight if searching a specific col OR if searching All Columns
                const termToHighlight = filterField
                    ? (filterField === col.key ? filterValue : null)
                    : search;

                if (col.render) {
                    // Pass searchTerm as 3rd arg so custom renders can apply their own highlighting
                    return col.render(val, row, termToHighlight);
                }

                const textClass = `text-sm ${col.bold ? 'font-bold text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`;
                return (
                    <HighlightText
                        text={val}
                        searchTerm={termToHighlight}
                        className={textClass}
                    />
                );
            }
        }));

        cols.push({
            field: 'actions',
            headerName: 'ACTIONS',
            width: 100,
            sortable: false,
            filterable: false,
            renderCell: (params) => (
                <ActionsMenu
                    onDetail={() => { setActiveItem(params.row); setModals(m => ({ ...m, detail: true })) }}
                    onEdit={() => { setActiveItem(params.row); setModals(m => ({ ...m, edit: true })) }}
                />
            )
        });

        return cols;
    }, [columns, filterField, filterValue]);

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
            {/* Breadcrumb */}
            {breadcrumb.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    {breadcrumb.map((item, i) => (
                        <span key={i} className="flex items-center gap-2">
                            <span
                                onClick={() => item === 'Home' && navigate('/')}
                                className={`${item === 'Home' ? 'hover:text-blue-500 cursor-pointer' : ''} transition-colors`}
                            >
                                {item}
                            </span>
                            {i < breadcrumb.length - 1 && <span>/</span>}
                        </span>
                    ))}
                </div>
            )}

            <div className="flex justify-between items-end">
                <div className="flex items-center gap-5">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-400 hover:text-blue-500 hover:border-blue-500/30 transition-all active:scale-95"
                        title="Go Back"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-none">{title}</h1>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Management Portal</p>
                    </div>
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
                            onChange={e => {
                                const val = e.target.value;
                                setSearch(val);
                                if (!filterField) setFilterValue(val);
                            }}
                            className="w-full pl-11 pr-4 py-2.5 text-sm bg-white dark:bg-[#242938] border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                        {search && <button onClick={() => { setSearch(''); if (!filterField) setFilterValue(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
                    </div>
                </div>

                <div className="w-full bg-white dark:bg-[#1e2436] rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">

                    {/* ── Filter Bar (always visible above column headers) ──────── */}
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/3 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            <SlidersHorizontal size={13} />
                            Filter
                        </div>

                        {/* Column selector — always active, defaults to All Columns */}
                        <select
                            value={filterField}
                            onChange={(e) => {
                                const field = e.target.value;
                                setFilterField(field);
                                setFilterValue('');
                                setSearch('');         // clear global search too
                                setFilterModel({ items: [] });
                            }}
                            className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-[#242938] border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 outline-none cursor-pointer hover:border-blue-400 transition-colors"
                        >
                            <option value="">All Columns</option>
                            {columns.filter(c => c.filterable !== false).map(col => (
                                <option key={col.key} value={col.key}>{col.label}</option>
                            ))}
                        </select>

                        {/* Operator selector — always active, defaults to All Operators */}
                        <select
                            value={filterOperator}
                            onChange={(e) => {
                                const operator = e.target.value;
                                setFilterOperator(operator);
                                // If there's already a value, refresh the filter model
                                if (filterValue && filterField) {
                                    setFilterModel({
                                        items: [{ id: 1, field: filterField, operator: operator || 'contains', value: filterValue }]
                                    });
                                }
                            }}
                            className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-[#242938] border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 outline-none cursor-pointer hover:border-blue-400 transition-colors"
                        >
                            <option value="">All Operators</option>
                            <option value="contains">Contains</option>
                            <option value="equals">Equals</option>
                            <option value="startsWith">Starts With</option>
                        </select>

                        {/* Value input — routes to global search or column filter */}
                        <input
                            type="text"
                            placeholder={filterField ? `Filter by ${columns.find(c => c.key === filterField)?.label || filterField}...` : 'Search all columns...'}
                            value={filterValue}
                            onChange={(e) => {
                                const value = e.target.value;
                                setFilterValue(value);
                                if (!filterField) {
                                    // All Columns → use global Filter param (existing search debounce)
                                    setSearch(value);
                                    setFilterModel({ items: [] });
                                } else {
                                    // Specific column → use SiteSearch.* param via filterModel
                                    setSearch('');
                                    if (value) {
                                        setFilterModel({
                                            items: [{ id: 1, field: filterField, operator: filterOperator || 'contains', value }]
                                        });
                                    } else {
                                        setFilterModel({ items: [] });
                                    }
                                }
                            }}
                            className="flex-1 min-w-[160px] max-w-xs px-3 py-1.5 text-xs bg-white dark:bg-[#242938] border border-slate-200 dark:border-white/10 rounded-lg text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-yellow-400/30 focus:border-yellow-400 transition-all placeholder:text-slate-400"
                        />

                        {/* Clear button */}
                        {filterValue && (
                            <button
                                onClick={() => {
                                    setFilterValue('');
                                    setSearch('');
                                    setFilterModel({ items: [] });
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                            >
                                <X size={11} /> Clear
                            </button>
                        )}
                    </div>

                    <DataGrid
                        autoHeight
                        rows={visibleData}
                        columns={muiColumns}
                        rowCount={total || 0}
                        loading={loading}
                        pageSizeOptions={[2, 5, 10, 25, 50, 100]}
                        paginationModel={{ page: page - 1, pageSize: pageSize }}
                        paginationMode="server"
                        filterMode="server"
                        hideFooter={true} // Hide default footer to use custom pagination

                        filterModel={filterModel}
                        onFilterModelChange={(model) => {
                            setFilterModel(model); // direct update — safe here since this fires on user input, not during render
                        }}
                        sortModel={[{ field: sortKey, sort: sortDir }]}
                        sortingMode="server"
                        onSortModelChange={(newModel) => {
                            // Defer state updates until after DataGrid finishes rendering
                            // to avoid: "Cannot update a component while rendering a different component"
                            setTimeout(() => {
                                if (newModel.length > 0) {
                                    setSortKey(newModel[0].field);
                                    setSortDir(newModel[0].sort);
                                } else {
                                    setSortKey('id');
                                    setSortDir('desc');
                                }
                            }, 0);
                        }}
                        disableRowSelectionOnClick
                        disableColumnMenu
                        // Highlight the column chosen in the filter bar's Column dropdown
                        getCellClassName={(params) =>
                            filterField && params.field === filterField ? 'col-selected' : ''
                        }
                        sx={{
                            border: 'none',
                            '& .MuiDataGrid-cell': {
                                borderColor: 'rgba(226, 232, 240, 1)',
                                display: 'flex',
                                alignItems: 'center',
                                outline: 'none !important',
                                overflow: 'visible !important',
                            },
                            '& .MuiDataGrid-columnHeaders': {
                                backgroundColor: 'rgba(248, 250, 252, 0.5)',
                                borderColor: 'rgba(226, 232, 240, 1)',
                            },
                            '& .MuiDataGrid-row:hover': {
                                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                            },
                            '& .MuiDataGrid-footerContainer': {
                                display: 'none'
                            },
                            // Yellow highlight for the filter-selected column cells
                            '& .col-selected': {
                                backgroundColor: 'rgba(253, 224, 71, 0.15) !important',
                                borderColor: 'rgba(253, 224, 71, 0.35) !important',
                            },
                            '& .MuiDataGrid-row:hover .col-selected': {
                                backgroundColor: 'rgba(253, 224, 71, 0.25) !important',
                            },
                            // Yellow highlight for the filter-selected column header
                            '& .col-header-selected': {
                                backgroundColor: 'rgba(253, 224, 71, 0.25) !important',
                            },
                        }}
                        // Also highlight the column header of the filter-panel-selected column
                        getColumnHeaderClassName={(params) =>
                            filterField && params.field === filterField ? 'col-header-selected' : ''
                        }
                        className="dark:text-slate-300! [&_.MuiDataGrid-cell]:dark:border-white/5! [&_.MuiDataGrid-columnHeaders]:dark:bg-white/2! [&_.MuiDataGrid-columnHeaders]:dark:border-white/5! [&_.MuiDataGrid-footerContainer]:dark:border-white/5! [&_.MuiDataGrid-iconSeparator]:dark:hidden!"
                    />
                </div>

                {/* Custom Pagination Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-white/1 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Page Size:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setPage(1);
                                }}
                                className="px-2 py-1 text-xs font-bold bg-white dark:bg-[#242938] border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 outline-none hover:border-blue-500/50 transition-colors cursor-pointer"
                            >
                                {[10, 25, 50, 100].map(size => (
                                    <option key={size} value={size}>{size}</option>
                                ))}
                            </select>
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                            Showing <span className="text-slate-900 dark:text-white">{total > 0 ? (page - 1) * pageSize + 1 : 0}</span> to <span className="text-slate-900 dark:text-white">{Math.min(page * pageSize, total)}</span> of <span className="text-slate-900 dark:text-white">{total}</span> results
                        </div>
                    </div>

                    <div className="flex items-center gap-2">

                        <button
                            onClick={handleFirstPage}
                            disabled={page === 1 || loading}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-bold transition-all ${page === 1 || loading
                                ? 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                : 'bg-white dark:bg-[#242938] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-blue-500/50 hover:text-blue-500 active:scale-95 shadow-sm'
                                }`}
                            title="First Page"
                        >
                            <ChevronsLeft size={16} /> First
                        </button>

                        <button
                            onClick={handlePrevPage}
                            disabled={page === 1 || loading}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-bold transition-all ${page === 1 || loading
                                ? 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                : 'bg-white dark:bg-[#242938] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-blue-500/50 hover:text-blue-500 active:scale-95 shadow-sm'
                                }`}
                        >
                            <ChevronLeft size={16} /> Prev
                        </button>

                        <div className="flex items-center px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-bold">
                            Page {page} of {totalPages || 1}
                        </div>

                        <button
                            onClick={handleNextPage}
                            disabled={page >= (totalPages || 1) || loading}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-bold transition-all ${page >= (totalPages || 1) || loading
                                ? 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                : 'bg-white dark:bg-[#242938] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-blue-500/50 hover:text-blue-500 active:scale-95 shadow-sm'
                                }`}
                        >
                            Next <ChevronRight size={16} />
                        </button>
                        <button
                            onClick={handleLastPage}
                            disabled={page >= (totalPages || 1) || loading}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-bold transition-all ${page >= (totalPages || 1) || loading
                                ? 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                : 'bg-white dark:bg-[#242938] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-blue-500/50 hover:text-blue-500 active:scale-95 shadow-sm'
                                }`}
                            title="Last Page"
                        >
                            Last <ChevronsRight size={16} />
                        </button>

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
        </div>
    );
}
