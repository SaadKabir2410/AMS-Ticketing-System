import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContextHook";
import { useTheme } from "../../context/ThemeContext";
import { DataGrid, getGridStringOperators } from "@mui/x-data-grid";
import { useResource } from "../hooks/useResource";
import { useToast } from "./ToastContext";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { Menu, MenuItem, ListItemIcon, ListItemText, Box } from "@mui/material";

export function ActionsMenu({
  onAuditLog,
  onEdit,
  onDetail,
  onPermissions,
  onDelete,
  onDisable,
  onEnable,
  deleteButtonText = "Delete",
}) {
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
        className="h-[28px] w-fit px-3 bg-white dark:bg-transparent border border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-500 text-[10px] font-medium rounded-lg transition-all inline-flex items-center justify-center gap-1 shadow-sm"
      >
        Actions <ChevronDown size={12} strokeWidth={2.5} />
      </button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: "left", vertical: "top" }}
        anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: "12px",
            boxShadow:
              "0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.1)",
            border: "1px solid",
            borderColor: "divider",
            minWidth: 160,
          },
        }}
      >
        {onDetail && (
          <MenuItem onClick={() => { onDetail(); handleClose(); }} sx={{ py: 1 }}>
            <ListItemText primary="View Details" primaryTypographyProps={{ fontSize: "12px", fontWeight: 600 }} />
          </MenuItem>
        )}
        {onAuditLog && (
          <MenuItem onClick={() => { onAuditLog(); handleClose(); }} sx={{ py: 1 }}>
            <ListItemText primary="Audit Log" primaryTypographyProps={{ fontSize: "12px", fontWeight: 600 }} />
          </MenuItem>
        )}
        {onPermissions && (
          <MenuItem onClick={() => { onPermissions(); handleClose(); }} sx={{ py: 1 }}>
            <ListItemText primary="Permissions" primaryTypographyProps={{ fontSize: "12px", fontWeight: 600 }} />
          </MenuItem>
        )}
        {onEdit && (
          <MenuItem onClick={() => { onEdit(); handleClose(); }} sx={{ py: 1 }}>
            <ListItemText primary="Update Data" primaryTypographyProps={{ fontSize: "12px", fontWeight: 600 }} />
          </MenuItem>
        )}
        {onDisable && (
          <MenuItem onClick={() => { onDisable(); handleClose(); }} sx={{ py: 1 }}>
            <ListItemText primary="Disable" primaryTypographyProps={{ fontSize: "12px", fontWeight: 600, color: "warning.main" }} />
          </MenuItem>
        )}
        {onEnable && (
          <MenuItem onClick={() => { onEnable(); handleClose(); }} sx={{ py: 1 }}>
            <ListItemText primary="Enable" primaryTypographyProps={{ fontSize: "12px", fontWeight: 600, color: "success.main" }} />
          </MenuItem>
        )}
        {onDelete && (
          <MenuItem onClick={() => { onDelete(); handleClose(); }} sx={{ py: 1 }}>
            <ListItemText primary={deleteButtonText} primaryTypographyProps={{ fontSize: "12px", fontWeight: 600, color: "error.main" }} />
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
  searchPlaceholder = "Search records...",
  createButtonText = "Create",
  breadcrumb = [],
  showSearchBar = true,
  showFilterBar = true,
  showActions = true,
  customFilterArea = null,
  customHeaderActions = null,
  extraParams = {},
  initialFilterField = "",
  initialFilterValue = "",
  detailViewMode = "modal",
  SecondaryDetailComponent = null,
  entityName = "",
  initialSortKey = "id",
  initialSortDir = "desc",
  initialPageSize = 14,
  showPagination = true,
  smallHeaderButton = false,
  onPermissions = null,
  showAuditLog = true,
  onDelete = null,
  deleteButtonText = "Delete",
  onDeleteVisibilityCheck = null,
  onDisable = null,
  onDisableVisibilityCheck = null,
  onEnable = null,
  onEnableVisibilityCheck = null,
  onEditVisibilityCheck = null,
  hideActionsCheck = null,
  onRefetchReady = null,
  onEdit = null,
  onDetail = null,
  hideGrid = false,
  wideSearch = false,
  rowHeight = 44,
  headerHeight = 44,
  containerClassName = "bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden flex flex-col flex-1",
  hideHeader = false,
}) {
  const { dark } = useTheme();
  const isDark = dark === "dark";
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

  const [filterModel] = useState({ items: initialItem });

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

  const [filterField] = useState(initialFilterField);
  const [filterOperator] = useState("");
  const [filterValue] = useState(initialFilterValue);

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
      extraParams,
    ],
  );

  const { data, total, totalPages, loading, error, refetch } = useResource(
    apiObject,
    params,
  );

  // ✅ Expose refetch to parent via onRefetchReady
  useEffect(() => {
    if (onRefetchReady) {
      onRefetchReady(refetch);
    }
  }, [refetch, onRefetchReady]);

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

    filtered.sort((a, b) => {
      if (lastModifiedId) {
        if (a.id === lastModifiedId) return -1;
        if (b.id === lastModifiedId) return 1;
      }

      let effectiveKey = sortKey;

      const getVal = (item, key) => {
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

      let comparison = 0;
      // Natural Sort for numbers or numeric strings
      const isNum = (v) => !isNaN(parseFloat(v)) && isFinite(v);
      if (isNum(valA) && isNum(valB)) {
        comparison = parseFloat(valA) - parseFloat(valB);
      } else {
        // Case-insensitive locale-aware string comparison
        comparison = String(valA).localeCompare(String(valB), undefined, {
          numeric: true,
          sensitivity: 'base'
        });
      }
      return sortDir === "asc" ? comparison : -comparison;
    });

    const filteredTotal =
      debouncedSearch || data.length === total ? filtered.length : total;
    const filteredTotalPages = Math.ceil(filteredTotal / pageSize);
    let finalData = filtered;
    if (showPagination && (filtered.length > pageSize || data.length === total)) {
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
      throw error;
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
      throw error;
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
      const baseClass = `flex items-center truncate w-full ${className || ""}`;
      if (!searchTerm || !text)
        return (
          <div className={baseClass} title={text || "—"}>
            {text || "—"}
          </div>
        );
      const str = String(text);
      const idx = str.toLowerCase().indexOf(searchTerm.toLowerCase());
      if (idx === -1)
        return (
          <div className={baseClass} title={str}>
            {str}
          </div>
        );
      return (
        <div className={baseClass} title={str}>
          {str.slice(0, idx)}
          <mark className="bg-yellow-200 text-yellow-900 rounded-[2px] px-[2px] ">
            {str.slice(idx, idx + searchTerm.length)}
          </mark>
          {str.slice(idx + searchTerm.length)}
        </div>
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
            className={`text-sm ${col.bold ? " text-slate-800 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}
          />
        );
      },
    }));

    if (showActions) {
      cols.push({
        field: "actions",
        headerName: "",
        width: 100,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          if (hideActionsCheck && hideActionsCheck(params.row)) return null;
          return (
            <ActionsMenu
              onDetail={
                (onDetail || apiObject.id === "auditLogs")
                  ? () => {
                    if (onDetail) onDetail(params.row);
                    else {
                      setActiveItem(params.row);
                      if (detailViewMode === "side") setSidePanelOpen(true);
                      else setModals((m) => ({ ...m, detail: true }));
                    }
                  }
                  : null
              }
              onAuditLog={
                showAuditLog && apiObject.id !== "auditLogs"
                  ? () =>
                    navigate(
                      `/audit-logs?primaryKey=${params.row.id}&entityName=${entityName || title.slice(0, -1)}`,
                    )
                  : null
              }
              onEdit={
                (onEdit || ModalComponent) && (!onEditVisibilityCheck || onEditVisibilityCheck(params.row))
                  ? () => {
                    if (onEdit) onEdit(params.row);
                    else {
                      setActiveItem(params.row);
                      setModals((m) => ({ ...m, edit: true }));
                    }
                  }
                  : null
              }
              onPermissions={
                onPermissions ? () => onPermissions(params.row) : null
              }
              onDisable={
                onDisable && (!onDisableVisibilityCheck || onDisableVisibilityCheck(params.row))
                  ? () => onDisable(params.row)
                  : null
              }
              onEnable={
                onEnable && (!onEnableVisibilityCheck || onEnableVisibilityCheck(params.row))
                  ? () => onEnable(params.row)
                  : null
              }
              onDelete={
                onDelete &&
                  (!onDeleteVisibilityCheck || onDeleteVisibilityCheck(params.row))
                  ? () => onDelete(params.row)
                  : null
              }
              deleteButtonText={deleteButtonText}
            />
          );
        },
      });
    }

    return cols;
  }, [
    showActions,
    detailViewMode,
    apiObject.id,
    entityName,
    title,
    columns,
    search,
    filterField,
    filterValue,
  ]);

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
      <div className={containerClassName}>
        {/* Header Section */}
        {!hideHeader && (
          <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/2 shrink-0">
            {breadcrumb.length > 0 && (
              <nav className="flex items-center gap-2 text-[10px] text-slate-400 mb-3">
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
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-400 hover:text-blue-500 hover:border-blue-500/30 transition-all active:scale-95 shadow-sm"
                  title="Go Back"
                >
                  <ArrowLeft size={16} strokeWidth={2.5} />
                </button>
                <div>
                  <h1 className="text-2xl text-slate-800 dark:text-white leading-none">
                    {title}
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {customHeaderActions}
                {apiObject.create && ModalComponent && createButtonText && (
                  <button
                    onClick={() => setModals((m) => ({ ...m, create: true }))}
                    className={
                      smallHeaderButton
                        ? "px-3 py-1.5 bg-white border border-blue-500 text-blue-500 hover:bg-blue-50 dark:bg-transparent dark:hover:bg-blue-500/10 rounded-lg text-xs font-medium transition-colors shadow-sm shrink-0 active:scale-95"
                        : "px-4 py-2 bg-white border border-blue-500 text-blue-500 hover:bg-blue-50 dark:bg-transparent dark:hover:bg-blue-500/10 rounded-lg text-[13px] font-medium transition-colors shadow-sm shrink-0 active:scale-95"
                    }
                  >
                    {createButtonText}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Toolbar Section */}
        {(showSearchBar || showFilterBar || customFilterArea) && (
          <div className="px-6 py-3 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-white dark:bg-transparent shrink-0 flex-wrap gap-4">
            <div className={`flex items-center gap-6 flex-1 min-w-[300px] ${wideSearch ? "max-w-2xl" : "max-w-[400px]"}`}>
              {showSearchBar && (
                <div className="relative w-full group">
                  <input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white dark:focus:bg-slate-800 transition-all"
                  />
                </div>
              )}
              {customFilterArea}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex min-h-0 relative">
          <div className="flex-1 flex flex-col min-w-0">
            {error && (
              <div className="m-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-in fade-in slide-in-from-top-4">
                <div className="flex-1">
                  <p className="text-sm">Failed to load data</p>
                  <p className="text-xs opacity-80">
                    {error.message || "Unknown network error"}
                  </p>
                </div>
                <button
                  onClick={refetch}
                  className="px-4 py-2 bg-red-600 text-white text-[10px] rounded-lg hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
            {hideGrid ? (
              <div className="flex-1 overflow-hidden min-h-[400px] bg-white dark:bg-slate-900"></div>
            ) : (
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
                  rowHeight={rowHeight}
                  columnHeaderHeight={headerHeight}
                  sx={{
                    border: "none",
                    bgcolor: isDark ? "transparent" : "inherit",
                    color: isDark ? "rgba(255, 255, 255, 0.85)" : "inherit",
                    "& .MuiDataGrid-columnHeaders": {
                      bgcolor: isDark ? "rgba(30, 41, 59, 0.8)" : "rgba(248, 250, 252, 0.8)",
                      borderBottom: isDark ? "2px solid rgba(51, 65, 85, 1)" : "2px solid rgba(226, 232, 240, 1)",
                      minHeight: `${headerHeight}px !important`,
                      maxHeight: `${headerHeight}px !important`,
                      "& .MuiDataGrid-columnHeaderTitle": {
                        fontWeight: 800,
                        fontSize: "10px",
                        color: isDark ? "rgba(148, 163, 184, 1)" : "rgb(71 85 105)",
                        letterSpacing: "0.05em",
                      },
                    },
                    "& .MuiDataGrid-cell": {
                      borderColor: isDark ? "rgba(51, 65, 85, 0.5)" : "rgba(241, 245, 249, 1)",
                      display: "flex",
                      alignItems: "center",
                      color: "inherit",
                    },
                    "& .MuiDataGrid-row:hover": {
                      bgcolor: isDark ? "rgba(59, 130, 246, 0.1)" : "rgba(59, 130, 246, 0.04)",
                    },
                  }}
                  slots={{
                    noRowsOverlay: () => (
                      <div className="h-full flex flex-col items-center justify-center p-10 space-y-4">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-3xl flex items-center justify-center text-slate-300 dark:text-slate-600 border border-slate-100 dark:border-white/5">
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-slate-800 dark:text-white tracking-tighter">
                            No records found
                          </p>
                        </div>
                      </div>
                    ),
                  }}
                />
              </div>
            )}

            {/* Pagination Footer */}
            {showPagination && (
              <div className="px-6 py-3 border-t border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-white/1 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-400">Rows:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="px-2 py-1 text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg outline-none transition-all cursor-pointer shadow-sm"
                  >
                    {[14, 25, 50, 100].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <div className="ml-4 h-4 w-[1px] bg-slate-200 dark:bg-white/10 hidden sm:block"></div>
                  <div className="text-xs text-slate-500 hidden sm:block">
                    <span className="text-slate-900 dark:text-white">
                      {displayTotal > 0 ? (page - 1) * pageSize + 1 : 0}
                    </span>
                    {" — "}
                    <span className="text-slate-900 dark:text-white">
                      {Math.min(page * pageSize, displayTotal)}
                    </span>
                    <span className="text-slate-400"> of </span>
                    <span className="text-slate-900 dark:text-white">
                      {displayTotal}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleFirstPage}
                    disabled={page === 1 || loading}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-30 hover:bg-white dark:hover:bg-white/5 transition-all shadow-sm flex items-center justify-center bg-white"
                  >
                  </button>
                  <button
                    onClick={handlePrevPage}
                    disabled={page === 1 || loading}
                    className="px-3.5 py-1.5 bg-white rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-30 hover:bg-white dark:hover:bg-white/5 text-[11px] transition-all shadow-sm"
                  >
                    Prev
                  </button>
                  <div className="px-4 py-1.5 bg-blue-500 text-white rounded-lg text-[11px] shadow-md shadow-blue-500/25">
                    Page {page} of {displayTotalPages || 1}
                  </div>
                  <button
                    onClick={handleNextPage}
                    disabled={page >= displayTotalPages || loading}
                    className="px-3.5 py-1.5 bg-white rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-30 hover:bg-white dark:hover:bg-white/5 text-[11px] transition-all shadow-sm"
                  >
                    Next
                  </button>
                  <button
                    onClick={handleLastPage}
                    disabled={page >= displayTotalPages || loading}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-30 hover:bg-white dark:hover:bg-white/5 transition-all shadow-sm flex items-center justify-center bg-white"
                  >
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Side Panel */}
          {sidePanelOpen && SecondaryDetailComponent && (
            <div className="w-[600px] border-l border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 flex flex-col shadow-2xl animate-in slide-in-from-right duration-500 z-50">
              <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/2">
                <div>
                  <h3 className="text-lg text-slate-800 dark:text-white tracking-tighter">
                    Review Details
                  </h3>
                  <p className="text-[10px] text-blue-500">
                    Entry ID: {activeItem?.id?.slice(0, 8)}...
                  </p>
                </div>
                <button
                  onClick={() => setSidePanelOpen(false)}
                  className="p-2 hover:bg-red-50 hover:text-red-500 transition-all rounded-xl border border-transparent hover:border-red-100"
                >
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

      {/* Modals */}
      {ModalComponent && (
        <>
          <ModalComponent
            key="create-modal"
            open={modals.create}
            onClose={() => setModals((m) => ({ ...m, create: false }))}
            onSubmit={onHandleCreate}
            loading={createLoading}
            submitError={createError}
          />
          <ModalComponent
            key={activeItem?.id ? `edit-${activeItem.id}` : "edit-none"}
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
          key={activeItem?.id ? `detail-${activeItem.id}` : "detail-none"}
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