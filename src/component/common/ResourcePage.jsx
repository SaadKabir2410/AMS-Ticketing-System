import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import {
  Search,
  Plus,
  MoreVertical,
  History,
  Pencil,
  Trash2,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  SlidersHorizontal,
  Info,
  Eye,
} from "lucide-react";
import { DataGrid, getGridStringOperators } from "@mui/x-data-grid";
import { useResource } from "../hooks/useResource";
import { useToast } from "./Toast";

import { Menu, MenuItem, ListItemIcon, ListItemText, Box } from "@mui/material";

function ActionsMenu({ onAuditLog, onEdit, onDetail }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors text-slate-400"
      >
        <MoreVertical size={16} />
      </button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: "12px",
            boxShadow:
              "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            border: "1px solid",
            borderColor: "divider",
            minWidth: 160,
          },
        }}
      >
        {onDetail && (
          <MenuItem
            onClick={() => {
              onDetail();
              handleClose();
            }}
            sx={{ py: 1.5 }}
          >
            <ListItemIcon>
              <Eye size={18} className="text-blue-500" />
            </ListItemIcon>
            <ListItemText
              primary="View Details"
              primaryTypographyProps={{ fontSize: "13px", fontWeight: 700 }}
            />
          </MenuItem>
        )}
        {onAuditLog && (
          <MenuItem
            onClick={() => {
              onAuditLog();
              handleClose();
            }}
            sx={{ py: 1.5 }}
          >
            <ListItemIcon>
              <History size={18} className="text-slate-400" />
            </ListItemIcon>
            <ListItemText
              primary="Audit Log"
              primaryTypographyProps={{ fontSize: "13px", fontWeight: 700 }}
            />
          </MenuItem>
        )}
        {onEdit && (
          <MenuItem
            onClick={() => {
              onEdit();
              handleClose();
            }}
            sx={{ py: 1.5 }}
          >
            <ListItemIcon>
              <Pencil size={18} className="text-amber-500" />
            </ListItemIcon>
            <ListItemText
              primary="Update Data"
              primaryTypographyProps={{ fontSize: "13px", fontWeight: 700 }}
            />
          </MenuItem>
        )}
      </Menu>
    </div>
  );
}

export default function ResourcePage({
  title,
  apiObject,
  columns,
  ModalComponent,
  DetailComponent,
  DeleteModal,
  searchPlaceholder = "Search records...",
  createButtonText = "Create",
  breadcrumb = [],
  operatorLabel = "All Operators",
  operatorOptions = null,
  showBackButton = false,
  showSearchBar = true,
  showFilterBar = true,
  showActions = true,
  customFilterArea = null,
  customHeaderActions = null,
  extraParams = {},
  initialFilterField = "",
  initialFilterValue = "",
  detailViewMode = "modal", // 'modal' or 'side'
  SecondaryDetailComponent = null,
  entityName = "",
  initialSortKey = "id",
  initialSortDir = "desc",
  initialPageSize = 10,
  showPagination = true,
  smallHeaderButton = false,
}) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortKey, setSortKey] = useState(initialSortKey);
  const [sortDir, setSortDir] = useState(initialSortDir);
  const [lastModifiedId, setLastModifiedId] = useState(null);
  const [activeItem, setActiveItem] = useState(null);
  const [modals, setModals] = useState({
    create: false,
    edit: false,
    detail: false,
  });
  const [sidePanelOpen, setSidePanelOpen] = useState(false);

  const initialItem =
    initialFilterValue && initialFilterField
      ? [
          {
            field: initialFilterField,
            operator: "equals",
            value: initialFilterValue,
            id: 1,
          },
        ]
      : [];

  const [filterModel, setFilterModel] = useState({ items: initialItem });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const [columnFilter, setColumnFilter] = useState(null);
  useEffect(() => {
    const active = filterModel.items.find(
      (item) => item.value !== undefined && item.value !== "",
    );
    const timer = setTimeout(() => {
      setColumnFilter(
        active
          ? {
              field: active.field,
              operator: active.operator,
              value: active.value,
            }
          : null,
      );
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [filterModel]);

  const [filterField, setFilterField] = useState(initialFilterField);
  const [filterOperator, setFilterOperator] = useState("");
  const [filterValue, setFilterValue] = useState(initialFilterValue);

  const params = useMemo(
    () => ({
      search: debouncedSearch,
      page,
      perPage: pageSize,
      sortKey,
      sortDir,
      columnFilter,
      filterOperator,
      ...extraParams,
    }),
    [
      debouncedSearch,
      page,
      pageSize,
      sortKey,
      sortDir,
      columnFilter,
      filterOperator,
      JSON.stringify(extraParams),
    ],
  );

  const { data, total, totalPages, loading, error, refetch } = useResource(
    apiObject,
    params,
  );

  useEffect(() => {
    if (error && sortKey !== "id") {
      setSortKey("id");
      setSortDir("desc");
    }
  }, [error]);

  const { visibleData, displayTotal, displayTotalPages } = useMemo(() => {
    if (!data)
      return { visibleData: [], displayTotal: 0, displayTotalPages: 0 };
    let filtered = [...data];
    if (debouncedSearch) {
      const s = debouncedSearch.toLowerCase();
      filtered = filtered.filter((row) =>
        Object.values(row).some((v) =>
          String(v || "")
            .toLowerCase()
            .includes(s),
        ),
      );
    }

    // --- Premium Frontend Sorting with Update Boost ---
    filtered.sort((a, b) => {
      // 1. Boost most recently touched item to row 1
      if (lastModifiedId) {
        if (a.id === lastModifiedId) return -1;
        if (b.id === lastModifiedId) return 1;
      }

      // 2. Default Sort Strategy (Timestamp based if possible)
      // If user hasn't touched the sort, or it's 'id', we try to show latest modifications first
      let effectiveKey = sortKey;

      // Comparison logic
      const getVal = (item, key) => {
        // If it's the default sort, try modification dates first to satisfy "updates show first"
        if (key === "id") {
          return (
            item.lastModificationTime ||
            item.creationTime ||
            item.updatedAt ||
            item.createdAt ||
            item.id
          );
        }
        return item[key];
      };

      const valA = getVal(a, effectiveKey);
      const valB = getVal(b, effectiveKey);

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      const comparison = valA < valB ? -1 : 1;
      return sortDir === "asc" ? comparison : -comparison;
    });

    const filteredTotal =
      debouncedSearch || data.length === total ? filtered.length : total;
    const filteredTotalPages = Math.ceil(filteredTotal / pageSize);
    let finalData = filtered;
    if (filtered.length > pageSize || data.length === total) {
      const start = (page - 1) * pageSize;
      finalData = filtered.slice(start, start + pageSize);
    }
    return {
      visibleData: finalData,
      displayTotal: filteredTotal,
      displayTotalPages: filteredTotalPages,
    };
  }, [
    data,
    pageSize,
    page,
    debouncedSearch,
    total,
    sortKey,
    sortDir,
    lastModifiedId,
  ]);

  const auth = useAuth();
  const [createError, setCreateError] = useState(null);
  const [updateError, setUpdateError] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);

  const onHandleCreate = async (p) => {
    if (!auth.isAuthenticated) {
      auth.signinRedirect();
      return;
    }
    setCreateError(null);
    setCreateLoading(true);
    try {
      const res = await apiObject.create(p);
      toast(`${res?.name || title} created!`);
      setLastModifiedId(res?.id || null);
      setModals((m) => ({ ...m, create: false }));
      setPage(1);
      setTimeout(() => refetch(), 0);
    } catch (error) {
      const msg =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message;
      setCreateError(msg);
      throw error; // Let modal catch it if it wants
    } finally {
      setCreateLoading(false);
    }
  };

  const onHandleUpdate = async (p) => {
    if (!auth.isAuthenticated) {
      auth.signinRedirect();
      return;
    }
    setUpdateError(null);
    setUpdateLoading(true);
    try {
      await apiObject.update(activeItem.id, p);
      toast(`${title} updated!`);
      setLastModifiedId(activeItem.id);
      setModals((m) => ({ ...m, edit: false }));
      refetch();
    } catch (error) {
      const msg =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message;
      setUpdateError(msg);
      throw error; // Let modal catch it if it wants
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleFirstPage = () => page > 1 && setPage(1);
  const handleLastPage = () => page < totalPages && setPage(totalPages);
  const handleNextPage = () => page < totalPages && setPage((p) => p + 1);
  const handlePrevPage = () => page > 1 && setPage((p) => p - 1);

  const muiColumns = useMemo(() => {
    const textFilterOperators = getGridStringOperators().filter((op) =>
      ["contains", "equals", "startsWith"].includes(op.value),
    );

    const HighlightText = ({ text, searchTerm, className }) => {
      if (!searchTerm || !text)
        return <span className={className}>{text || "—"}</span>;
      const str = String(text);
      const idx = str.toLowerCase().indexOf(searchTerm.toLowerCase());
      if (idx === -1) return <span className={className}>{str}</span>;
      return (
        <span className={className}>
          {str.slice(0, idx)}
          <mark className="bg-yellow-200 text-yellow-900 rounded-[2px] px-[2px] font-bold">
            {str.slice(idx, idx + searchTerm.length)}
          </mark>
          {str.slice(idx + searchTerm.length)}
        </span>
      );
    };

    const cols = columns.map((col) => ({
      field: col.key,
      headerName: col.label,
      flex: col.flex !== undefined ? col.flex : col.width ? undefined : 1,
      width: col.width,
      minWidth: col.minWidth || 150,
      sortable: col.sortable !== false,
      filterable: col.filterable !== false,
      filterOperators: textFilterOperators,
      renderCell: (params) => {
        const val = params.value;
        const row = params.row;
        const termToHighlight =
          filterField === col.key ? filterValue : filterField ? null : search;

        if (col.render) {
          return col.render(val, row, termToHighlight);
        }

        return (
          <HighlightText
            text={val}
            searchTerm={termToHighlight}
            className={`text-sm ${col.bold ? "font-bold text-slate-800 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}
          />
        );
      },
    }));

    if (showActions) {
      cols.push({
        field: "actions",
        headerName: "ACTIONS",
        width: 100,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <ActionsMenu
            onDetail={
              apiObject.id === "auditLogs"
                ? () => {
                    setActiveItem(params.row);
                    if (detailViewMode === "side") setSidePanelOpen(true);
                    else setModals((m) => ({ ...m, detail: true }));
                  }
                : null
            }
            onAuditLog={
              apiObject.id !== "auditLogs"
                ? () =>
                    navigate(
                      `/audit-logs?primaryKey=${params.row.id}&entityName=${entityName || title.slice(0, -1)}`,
                    )
                : null
            }
            onEdit={
              ModalComponent
                ? () => {
                    setActiveItem(params.row);
                    setModals((m) => ({ ...m, edit: true }));
                  }
                : null
            }
          />
        ),
      });
    }

    return cols;
  }, [
    columns,
    filterField,
    filterValue,
    search,
    navigate,
    ModalComponent,
    showActions,
    detailViewMode,
  ]);

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
      {/* ── Standard Card Layout ─────────────────── */}
      <div className="bg-white dark:bg-[#1e2436] rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden flex flex-col flex-1">
        {/* Header Section */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/2 shrink-0">
          {breadcrumb.length > 0 && (
            <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
              {breadcrumb.map((b, i) => (
                <span key={i} className="flex items-center gap-2">
                  <span
                    onClick={() => b === "Home" && navigate("/")}
                    className={
                      b === "Home"
                        ? "hover:text-blue-500 cursor-pointer transition-colors"
                        : ""
                    }
                  >
                    {b}
                  </span>
                  {i < breadcrumb.length - 1 && <span>/</span>}
                </span>
              ))}
            </nav>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <button
                onClick={() => navigate(-1)}
                className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-400 hover:text-blue-500 hover:border-blue-500/30 transition-all active:scale-95 shadow-sm"
              >
                <ArrowLeft size={22} />
              </button>
              <div>
                <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight leading-none">
                  {title}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {customHeaderActions}
              {apiObject.create && ModalComponent && (
                <button
                  onClick={() => setModals((m) => ({ ...m, create: true }))}
                  className={
                    smallHeaderButton
                      ? "px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95"
                      : "flex items-center gap-3 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-100 dark:shadow-none transition-all active:scale-95"
                  }
                >
                  {!smallHeaderButton && <Plus size={20} />}
                  {createButtonText}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar Section */}
        {(showSearchBar || showFilterBar || customFilterArea) && (
          <div className="px-8 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-white dark:bg-transparent shrink-0 flex-wrap gap-4">
            <div className="flex items-center gap-6 flex-1 min-w-[300px]">
              {showSearchBar && (
                <div className="relative w-full max-w-sm group">
                  <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"
                  />
                  <input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 text-sm bg-slate-50 dark:bg-[#242938] border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white dark:focus:bg-[#242938] transition-all font-medium"
                  />
                </div>
              )}
              {customFilterArea}
            </div>
          </div>
        )}

        {/* Main Content (Split/Scroll) */}
        <div className="flex-1 flex min-h-0 relative">
          {/* Left: Table */}
          <div className="flex-1 flex flex-col min-w-0">
            {error && (
              <div className="m-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-in fade-in slide-in-from-top-4">
                <X className="shrink-0" size={20} />
                <div className="flex-1">
                  <p className="text-sm font-black uppercase tracking-tight">
                    Failed to load data
                  </p>
                  <p className="text-xs opacity-80 font-medium">
                    {error.message || "Unknown network error"}
                  </p>
                </div>
                <button
                  onClick={refetch}
                  className="px-4 py-2 bg-red-600 text-white text-[10px] font-black uppercase rounded-lg hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <DataGrid
                rows={visibleData}
                columns={muiColumns}
                rowCount={displayTotal || 0}
                loading={loading}
                paginationMode="server"
                sortingMode="server"
                onSortModelChange={(m) => {
                  if (m.length) {
                    setSortKey(m[0].field);
                    setSortDir(m[0].sort);
                  }
                }}
                hideFooter
                disableRowSelectionOnClick
                getRowHeight={() => "auto"}
                sx={{
                  border: "none",
                  "& .MuiDataGrid-columnHeaders": {
                    bgcolor: "rgba(248, 250, 252, 0.8)",
                    borderBottom: "2px solid rgba(226, 232, 240, 1)",
                    "& .MuiDataGrid-columnHeaderTitle": {
                      fontWeight: 800,
                      fontSize: "11px",
                      color: "rgb(71 85 105)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    },
                  },
                  "& .MuiDataGrid-cell": {
                    borderColor: "rgba(241, 245, 249, 1)",
                    py: 2,
                  },
                  "& .MuiDataGrid-row:hover": {
                    bgcolor: "rgba(59, 130, 246, 0.04)",
                  },
                }}
                slots={{
                  noRowsOverlay: () => (
                    <div className="h-full flex flex-col items-center justify-center p-10 space-y-4">
                      <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-3xl flex items-center justify-center text-slate-300 dark:text-slate-600 border border-slate-100 dark:border-white/5">
                        <Search size={32} strokeWidth={1.5} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                          No records found
                        </p>
                      </div>
                    </div>
                  ),
                }}
              />
            </div>

            {/* Standard Pagination Footer */}
            {showPagination && (
              <div className="px-8 py-5 border-t border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-white/1 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Rows:
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="px-3 py-1.5 text-xs font-black bg-white dark:bg-[#242938] border border-slate-200 dark:border-white/10 rounded-xl outline-none transition-all cursor-pointer shadow-sm"
                  >
                    {[10, 25, 50, 100].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <div className="ml-4 h-4 w-[1px] bg-slate-200 dark:bg-white/10 hidden sm:block"></div>
                  <div className="text-xs text-slate-500 font-bold hidden sm:block">
                    <span className="text-slate-900 dark:text-white">
                      {displayTotal > 0 ? (page - 1) * pageSize + 1 : 0}
                    </span>
                    {" — "}
                    <span className="text-slate-900 dark:text-white">
                      {Math.min(page * pageSize, displayTotal)}
                    </span>
                    <span className="text-slate-400 font-medium"> of </span>
                    <span className="text-slate-900 dark:text-white">
                      {displayTotal}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleFirstPage}
                    disabled={page === 1 || loading}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 disabled:opacity-30 hover:bg-white dark:hover:bg-white/5 transition-all shadow-sm"
                  >
                    <ChevronsLeft size={18} />
                  </button>
                  <button
                    onClick={handlePrevPage}
                    disabled={page === 1 || loading}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 disabled:opacity-30 hover:bg-white dark:hover:bg-white/5 text-xs font-black uppercase tracking-widest transition-all shadow-sm"
                  >
                    Prev
                  </button>
                  <div className="px-6 py-2.5 bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/25">
                    Page {page} of {displayTotalPages || 1}{" "}
                  </div>
                  <button
                    onClick={handleNextPage}
                    disabled={page >= displayTotalPages || loading}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 disabled:opacity-30 hover:bg-white dark:hover:bg-white/5 text-xs font-black uppercase tracking-widest transition-all shadow-sm"
                  >
                    Next
                  </button>
                  <button
                    onClick={handleLastPage}
                    disabled={page >= displayTotalPages || loading}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 disabled:opacity-30 hover:bg-white dark:hover:bg-white/5 transition-all shadow-sm"
                  >
                    <ChevronsRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Side Panel (Master-Detail) */}
          {sidePanelOpen && SecondaryDetailComponent && (
            <div className="w-[600px] border-l border-slate-200 dark:border-white/10 bg-white dark:bg-[#1e2436] flex flex-col shadow-2xl animate-in slide-in-from-right duration-500 z-50">
              <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/2">
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                    Review Details
                  </h3>
                  <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">
                    Entry ID: {activeItem?.id?.slice(0, 8)}...
                  </p>
                </div>
                <button
                  onClick={() => setSidePanelOpen(false)}
                  className="p-2 hover:bg-red-50 hover:text-red-500 transition-all rounded-xl border border-transparent hover:border-red-100"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <SecondaryDetailComponent
                  item={activeItem}
                  onClose={() => setSidePanelOpen(false)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals Transferred from Bottom */}
      {ModalComponent && (
        <>
          <ModalComponent
            open={modals.create}
            onClose={() => setModals((m) => ({ ...m, create: false }))}
            onSubmit={onHandleCreate}
            loading={createLoading}
            submitError={createError}
          />
          <ModalComponent
            open={modals.edit}
            item={activeItem}
            ticket={activeItem}
            site={activeItem}
            onClose={() => setModals((m) => ({ ...m, edit: false }))}
            onSubmit={onHandleUpdate}
            loading={updateLoading}
            submitError={updateError}
          />
        </>
      )}
      {DetailComponent && (
        <DetailComponent
          open={modals.detail}
          item={activeItem}
          ticket={activeItem}
          site={activeItem}
          onClose={() => setModals((m) => ({ ...m, detail: false }))}
        />
      )}
    </div>
  );
}
