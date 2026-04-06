import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContextHook";
import { useTheme } from "../../context/ThemeContext";
import { DataGrid, getGridStringOperators } from "@mui/x-data-grid";
import { useResource } from "../hooks/useResource";
import { useToast } from "./ToastContext";
import { ArrowLeft, ChevronDown, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, Database, Search } from "lucide-react";
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
  actionButtonText = "Actions",
  className = "btn-flagship-solid h-[22px]! px-2! text-[9px]!",
}) {
  const { dark } = useTheme();
  const isDark = dark === "dark";
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const hasActions = onAuditLog || onEdit || onDetail || onPermissions || onDelete || onDisable || onEnable;

  if (!hasActions) return null;

  const menuItemHover = { py: 1, "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" } };

  return (
    <div>
      <button
        onClick={handleClick}
        className={className}
      >
        {actionButtonText} <ChevronDown size={className.includes('h-[22px]') ? 9 : 10} strokeWidth={2.5} className="ml-1" />
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
            border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.05)",
            bgcolor: isDark ? "#0f172a" : "#ffffff",
            color: isDark ? "#f1f5f9" : "inherit",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1)",
            minWidth: 160,
          },
        }}
      >
        {onDetail && (
          <MenuItem onClick={() => { onDetail(); handleClose(); }} sx={menuItemHover}>
            <ListItemText primary="View Details" primaryTypographyProps={{ fontSize: "12px", fontWeight: 600 }} />
          </MenuItem>
        )}
        {onAuditLog && (
          <MenuItem onClick={() => { onAuditLog(); handleClose(); }} sx={menuItemHover}>
            <ListItemText primary="Audit Log" primaryTypographyProps={{ fontSize: "12px", fontWeight: 600 }} />
          </MenuItem>
        )}
        {onPermissions && (
          <MenuItem onClick={() => { onPermissions(); handleClose(); }} sx={menuItemHover}>
            <ListItemText primary="Permissions" primaryTypographyProps={{ fontSize: "12px", fontWeight: 600 }} />
          </MenuItem>
        )}
        {onEdit && (
          <MenuItem onClick={() => { onEdit(); handleClose(); }} sx={menuItemHover}>
            <ListItemText primary="Update Data" primaryTypographyProps={{ fontSize: "12px", fontWeight: 600 }} />
          </MenuItem>
        )}
        {onDisable && (
          <MenuItem onClick={() => { onDisable(); handleClose(); }} sx={menuItemHover}>
            <ListItemText primary="Disable" primaryTypographyProps={{ fontSize: "12px", fontWeight: 600, color: "warning.main" }} />
          </MenuItem>
        )}
        {onEnable && (
          <MenuItem onClick={() => { onEnable(); handleClose(); }} sx={menuItemHover}>
            <ListItemText primary="Enable" primaryTypographyProps={{ fontSize: "12px", fontWeight: 600, color: "success.main" }} />
          </MenuItem>
        )}
        {onDelete && (
          <MenuItem onClick={() => { onDelete(); handleClose(); }} sx={menuItemHover}>
            <ListItemText primary={deleteButtonText} primaryTypographyProps={{ fontSize: "12px", fontWeight: 600, color: "error.main" }} />
          </MenuItem>
        )}
      </Menu>
    </div>
  );
}


export default function ResourcePage({
  actionButtonText = "Actions",
  actionButtonClassName = null,
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
  onAdd = null,
  hideGrid = false,
  overrideData = null,
  emptyMessage = "No records found",
  wideSearch = false,
  rowHeight = 44,
  headerHeight = 44,
  containerClassName = "bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl backdrop-blur-sm shadow-blue-500/5 dark:shadow-none overflow-hidden flex flex-col flex-1 transition-all duration-300",
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
    overrideData ? null : apiObject,
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
    if (overrideData) {
      return { visibleData: overrideData, displayTotal: overrideData.length, displayTotalPages: 1 };
    }
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
      toast(`${res?.name || title} !created`);
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
      toast(`${title} !updated`);
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
  const handleLastPage = () => page < displayTotalPages && setPage(displayTotalPages);
  const handleNextPage = () => page < displayTotalPages && setPage((p) => p + 1);
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
          <mark className="bg-yellow-200 dark:bg-yellow-500/30 text-yellow-900 dark:text-yellow-100 rounded-[2px] px-[2px] ">
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
            className={`text-sm ${col.bold ? "text-slate-800 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}
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
              actionButtonText={actionButtonText}
              className={actionButtonClassName || "btn-flagship-solid h-[22px]! px-2! text-[9px]!"}
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
    apiObject?.id,
    entityName,
    title,
    columns,
    search,
    filterField,
    filterValue,
  ]);

  return (
    <div className="h-full bg-[#f1f5f9] dark:bg-slate-950 overflow-hidden flex flex-col no-scrollbar p-6 transition-all duration-500 animate-in fade-in">
      {/* Breadcrumb - Moved outside the card to match reference */}
      {breadcrumb.length > 0 && !hideHeader && (
        <nav className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500 mb-4 ml-1">
          {breadcrumb.map((b, i) => (
            <span key={i} className="flex items-center gap-2">
              <span
                onClick={() => b === "Home" && navigate("/")}
                className={
                  b === "Home"
                    ? "hover:text-pink-500 cursor-pointer transition-colors"
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

      <div className={containerClassName}>
        {/* Header Section */}
        {!hideHeader && (
          <div className="px-6 py-6 bg-slate-50/50 dark:bg-transparent shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(-1)}
                  className="p-1 hover:text-[#ec4899] dark:hover:text-[#ec4899] rounded-lg transition-colors text-slate-700 dark:text-slate-200"
                  title="Go Back"
                >
                  <ArrowLeft size={16} strokeWidth={2.5} />
                </button>
                <div>
                  <h1 className="text-[26px] font-black text-slate-800 dark:text-white tracking-tighter leading-none uppercase">
                    {title}
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {customHeaderActions}
                {apiObject?.create && ModalComponent && createButtonText && (
                  <button
                    onClick={onAdd || (() => setModals((m) => ({ ...m, create: true })))}
                    className="btn-flagship-solid"
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
          <div className="relative z-20 px-6 py-6 flex items-center justify-between bg-transparent shrink-0 flex-wrap gap-6">
            <div className={`flex items-center gap-6 flex-1 min-w-[300px] ${wideSearch === "full" ? "max-w-none" : (wideSearch ? "max-w-2xl" : "max-w-[400px]")}`}>
              {showSearchBar && (
                <div className="relative w-full group">
                  <input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-4 focus:ring-pink-500/20 focus:bg-white dark:focus:bg-slate-700 transition-all text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              )}
              {customFilterArea}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex min-h-0 relative px-6 pb-6 pt-2">
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
                  className="btn-flagship py-0 px-2 h-[24px]"
                  title="Retry"
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
                    color: isDark ? "rgba(241, 245, 249, 1)" : "rgb(51, 65, 85)",
                    "& .MuiDataGrid-columnHeaders": {
                      bgcolor: isDark ? "rgba(15, 23, 42, 1)" : "rgba(248, 250, 252, 1)",
                      backgroundImage: "none !important",
                      borderBottom: "none !important",
                      minHeight: `${headerHeight}px !important`,
                      maxHeight: `${headerHeight}px !important`,
                      "& .MuiDataGrid-columnHeaderTitle": {
                        fontWeight: 800,
                        fontSize: "10px",
                        color: isDark ? "rgba(203, 213, 225, 1)" : "rgb(71, 85, 105)",
                        letterSpacing: "0.05em",
                      },
                      "&:focus, &:focus-within": { outline: "none !important" },
                    },
                    "& .MuiDataGrid-columnHeader": {
                      borderRight: "none !important",
                      borderBottom: "none !important",
                    },
                    "& .MuiDataGrid-cell": {
                      border: "none !important",
                      borderBottom: "none !important",
                      display: "flex",
                      alignItems: "center",
                      color: "inherit",
                      "&:focus, &:focus-within": { outline: "none !important" },
                    },
                    "& .MuiDataGrid-row": {
                      borderBottom: "none !important",
                    },
                    "& .MuiDataGrid-withBorderColor": {
                      borderColor: "transparent !important",
                    },
                    "& .MuiDataGrid-footerContainer": {
                      borderTop: "none !important",
                    },
                    "& .MuiDataGrid-row:hover": {
                      bgcolor: isDark ? "rgba(59, 130, 246, 0.1)" : "rgba(59, 130, 246, 0.04)",
                    },
                  }}
                  slots={{
                    noRowsOverlay: () => (
                      <div className="h-full flex flex-col items-center justify-center p-10 space-y-4">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-300 dark:text-slate-400 border border-slate-100 dark:border-slate-700">
                          <Database size={24} className="opacity-50" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-slate-800 dark:text-slate-200 tracking-tighter">
                            {emptyMessage}
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
              <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Page Size:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className="px-3 h-7 text-[10px] font-black bg-white dark:bg-slate-800 text-pink-600 dark:text-pink-400 border border-slate-200 dark:border-slate-700/50 rounded-lg outline-none transition-all cursor-pointer shadow-sm hover:border-pink-500/50 uppercase tracking-widest"
                    >
                      {[14, 25, 50, 100].map((s) => (
                        <option key={s} value={s} className="font-sans">
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      <span className="text-slate-900 dark:text-white tabular-nums">
                        {displayTotal > 0 ? (page - 1) * pageSize + 1 : 0}
                      </span>
                      <span className="text-slate-400 dark:text-slate-600 mx-1.5">—</span>
                      <span className="text-slate-900 dark:text-white tabular-nums">
                        {Math.min(page * pageSize, displayTotal)}
                      </span>
                      <span className="text-slate-400 dark:text-slate-600 mx-2 lowercase font-bold tracking-normal italic">of</span>
                      <span className="text-slate-900 dark:text-white tabular-nums font-black">
                        {displayTotal}
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
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 tabular-nums leading-none">{displayTotalPages || 1}</span>
                      </div>
                    </div>

                    <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1"></div>

                    <button
                      onClick={handleNextPage}
                      disabled={page >= displayTotalPages || loading}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                      title="Next Page"
                    >
                      <ChevronRight size={14} strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={handleLastPage}
                      disabled={page >= displayTotalPages || loading}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                      title="Last Page"
                    >
                      <ChevronsRight size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Side Panel */}
          {sidePanelOpen && SecondaryDetailComponent && (
            <div className="w-[600px] border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col shadow-2xl animate-in slide-in-from-right duration-500 z-50">
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
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
      <style>{`
        .MuiDataGrid-root { border: none !important; }
        .MuiDataGrid-columnHeaders { border-bottom: none !important; }
        .MuiDataGrid-row { border-bottom: none !important; }
        .MuiDataGrid-cell { border-bottom: none !important; border: none !important; outline: none !important; }
        .MuiDataGrid-virtualScroller { border: none !important; }
        .MuiDataGrid-virtualScrollerContent { border: none !important; }
        .MuiDataGrid-filler { display: none !important; border: none !important; }
        .MuiDataGrid-bottomContainer { border: none !important; }
        .MuiDataGrid-bottomContainer::before, .MuiDataGrid-bottomContainer::after { display: none !important; content: none !important; }
        .MuiDataGrid-footerContainer { border-top: none !important; }
        .MuiDataGrid-withBorderColor { border-color: transparent !important; }
        div[class*="MuiDataGrid-"] { outline: none !important; }
        body { overflow: hidden !important; }
        ::-webkit-scrollbar { display: none !important; }
        * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
        .no-scrollbar::-webkit-scrollbar { display: none !important; }
        .no-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }
      `}</style>
    </div>
  );
}



