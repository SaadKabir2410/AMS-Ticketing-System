import { useMemo, useState, useEffect } from "react";
import AppSelect from "../component/common/AppSelect";
import { useTheme } from "../context/ThemeContext";
import { rolesApi } from "../services/api/roles";
import { useToast } from "../component/common/ToastContext";
import { usePermissionContext } from "../context/PermissionContext";
import SearchTextHighlight from "../component/common/SearchTextHighlight";
import { X, AlertCircle, ShieldCheck, ChevronDown, ChevronRight, Search, RefreshCw, ChevronLeft, ChevronsLeft, ChevronsRight, Loader2 } from "lucide-react";
import IconButton from "@mui/material/IconButton";
import { motion, AnimatePresence } from "framer-motion";

// MUI Imports for Permission Dialog
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { ActionsMenu } from "../component/common/ResourcePage";
import { useAuth } from "../context/AuthContextHook";
import {
  getCachedApplicationConfig,
  loadApplicationConfig,
} from "../services/applicationConfigCache";
import { excludeFeatureManagementPermissions } from "../utils/permissionGroups";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

const ROW_HEIGHT = "h-[48px]";

const getPermissionDisplayName = (permission) => permission.displayName;

const getLocalizationValue = (applicationConfig, key) => {
  const resources = applicationConfig?.localization?.values;
  if (!resources || typeof resources !== "object") return key;

  const identityValue = resources.AbpIdentity?.[key];
  if (typeof identityValue === "string" && identityValue.trim()) {
    return identityValue.trim();
  }

  for (const resource of Object.values(resources)) {
    const value = resource?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return key;
};

const PermissionTree = ({
  permissions,
  parentName,
  checkedPerms,
  onToggle,
  isDark,
}) => {
  const children = permissions.filter((p) => {
    if (p.parentName !== parentName) return false;
    return true;
  });
  if (children.length === 0) return null;

  return (
    <div
      className={`space-y-2 ${parentName ? `ml-6 mt-2 border-l-2 pl-4 ${isDark ? 'border-slate-700/50' : 'border-slate-300/70'}` : "mt-2"}`}
    >
      {children.map((perm) => (
        <div key={perm.name} className="flex flex-col">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id={perm.name}
              checked={!!checkedPerms[perm.name]}
              onChange={(e) => onToggle(perm, e.target.checked)}
              className={`w-4 h-4 rounded ring-offset-0 focus:ring-0 cursor-pointer accent-pink-500 border-slate-600 text-pink-500 ${isDark ? 'bg-slate-950' : 'bg-white'}`}
            />
            <label
              htmlFor={perm.name}
              className={`text-sm cursor-pointer ${
                parentName
                  ? isDark ? 'text-slate-400' : 'text-slate-500'
                  : isDark ? 'text-slate-200 font-semibold' : 'text-slate-700 font-semibold'
              }`}
            >
              {getPermissionDisplayName(perm)}
            </label>
          </div>
          <PermissionTree
            permissions={permissions}
            parentName={perm.name}
            checkedPerms={checkedPerms}
            onToggle={onToggle}
            isDark={isDark}
          />
        </div>
      ))}
    </div>
  );
};

// Create/edit role dialog. Defined outside RolesPage so a page re-render
// (for example while saving) does not remount it and wipe the typed values.
function RoleModal({ open, onClose, item, onSubmit, loading, submitError, onErrorClose, text }) {
  if (!open) return null;

  const handleSubmit = (event) => {
    event?.preventDefault();
    const inputName = document.getElementById("role-name-input").value;
    const isDefault = document.getElementById("role-isdefault-input").checked;
    const isPublic = document.getElementById("role-ispublic-input").checked;

    const payload = {
      name: inputName,
      isDefault,
      isPublic,
    };

    if (item) {
      payload.id = item.id;
      payload.concurrencyStamp = item.concurrencyStamp;
    }

    onSubmit(payload);
  };

  const optionCardClass =
    "flex items-center justify-between gap-2 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-pink-300 dark:hover:bg-white/5 cursor-pointer transition-colors group";
  const checkboxClass =
    "w-4 h-4 rounded cursor-pointer accent-pink-500";

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/40"
      />
      <form
        onSubmit={handleSubmit}
        noValidate
        className="relative bg-white dark:bg-slate-900 rounded-2xl px-5 py-4 w-full max-w-[360px] shadow-2xl border border-slate-100 dark:border-slate-700"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            {item ? text("Edit", "Edit") : text("NewRole", "New Role")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-pink-500 rounded-lg transition-colors"
            aria-label={text("Close", "Close")}
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label htmlFor="role-name-input" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              {text("RoleName", "Role Name")} <span className="required-asterisk">*</span>
            </label>
            <input
              id="role-name-input"
              type="text"
              autoFocus
              defaultValue={item?.name || ""}
              onChange={() => submitError && onErrorClose()}
              className={`w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg outline-none focus:ring-2 text-slate-800 dark:text-slate-200 text-sm transition-colors ${
                submitError
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
                  : "border-slate-200 dark:border-slate-700 focus:border-pink-500 focus:ring-pink-500/15"
              }`}
            />
            {submitError && (
              <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                <AlertCircle size={14} className="mt-px shrink-0" />
                <span>{submitError}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className={optionCardClass}>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-pink-600 transition-colors">
                {text("DisplayName:IsDefault", "Default")}
              </span>
              <input
                type="checkbox"
                id="role-isdefault-input"
                defaultChecked={item?.isDefault || false}
                className={checkboxClass}
              />
            </label>
            <label className={optionCardClass}>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-pink-600 transition-colors">
                {text("DisplayName:IsPublic", "Public")}
              </span>
              <input
                type="checkbox"
                id="role-ispublic-input"
                defaultChecked={item?.isPublic || false}
                className={checkboxClass}
              />
            </label>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-9 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
          >
            {text("Cancel", "Cancel")}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="app-primary-button flex-1 h-9 text-sm !rounded-lg"
          >
            {loading ? text("SavingWithThreeDot", "Saving...") : text("Save", "Save")}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function RolesPage() {
  const { toast } = useToast();
  const { refetchPermissions } = usePermissionContext();
  const { user } = useAuth();
  const { dark } = useTheme();
  const isDark = dark === "dark";
  const isAdmin = String(user?.role || "")
    .split(",")
    .some((role) => role.trim().toLowerCase() === "admin");
  const [applicationConfig, setApplicationConfig] = useState(
    getCachedApplicationConfig,
  );
  const localize = (key) => getLocalizationValue(applicationConfig, key);
  const text = (key, fallback) => {
    const value = localize(key);
    return value && value !== key ? value : fallback;
  };

  useEffect(() => {
    let isCurrent = true;
    loadApplicationConfig()
      .then((config) => {
        if (isCurrent) setApplicationConfig(config);
      })
      .catch(() => null);

    return () => {
      isCurrent = false;
    };
  }, []);

  // Data State
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Pagination & Search State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Modals & Action items State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteRole, setDeleteRole] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Permissions Dialog State
  const [permissionRole, setPermissionRole] = useState(null);
  const [permissionsData, setPermissionsData] = useState(null);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [checkedPerms, setCheckedPerms] = useState({});
  const [expandedGroups, setExpandedGroups] = useState({});

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await rolesApi.getAll({
        page,
        perPage: pageSize,
        search: debouncedSearch || undefined,
      });
      if (res && res.items) {
        setRoles(res.items);
        setTotalCount(res.totalCount || res.items.length);
      }
    } catch (err) {
      toast(err.message || localize("DefaultErrorMessage"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const toggleGroup = (groupName) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const handleCreateOpen = () => {
    setActiveItem(null);
    setSubmitError("");
    setIsModalOpen(true);
  };

  const handleEditOpen = (role) => {
    setActiveItem(role);
    setSubmitError("");
    setIsModalOpen(true);
  };

  const handleCreateOrUpdate = async (payload) => {
    setActionLoading(true);
    setSubmitError("");
    try {
      if (activeItem) {
        await rolesApi.update(activeItem.id, payload);
        toast(text("SavedSuccessfully", "Saved successfully"));
      } else {
        await rolesApi.create(payload);
        toast(text("SavedSuccessfully", "Saved successfully"));
      }
      setIsModalOpen(false);
      setActiveItem(null);
      fetchRoles();
    } catch (err) {
      setSubmitError(err.response?.data?.error?.message || err.message || localize("DefaultErrorMessage"));
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermissions = (role) => {
    if (!isAdmin) return;

    setPermissionRole(role);
    setLoadingPermissions(true);
    rolesApi
      .getPermissions("R", role.name)
      .then((data) => {
        const visiblePermissions = excludeFeatureManagementPermissions(data);
        setPermissionsData(visiblePermissions);
        const initial = {};
        if (visiblePermissions?.groups) {
          // ✅ Initialize checked state from backend response
          visiblePermissions.groups.forEach((g) => {
            g.permissions.forEach((p) => {
              initial[p.name] = p.isGranted;
            });
          });
        }
        setCheckedPerms(initial);
        setLoadingPermissions(false);
      })
      .catch((err) => {
        toast(err.message || localize("DefaultErrorMessage"), "error");
        setLoadingPermissions(false);
      });
  };

  const handleClosePermissions = (event, reason) => {
    if (reason === "backdropClick") return;
    setPermissionRole(null);
    setPermissionsData(null);
    setCheckedPerms({});
    setExpandedGroups({});
  };

  const handleGrantAll = (isChecked) => {
    if (!permissionsData || !permissionsData.groups) return;
    const updated = { ...checkedPerms };
    permissionsData.groups.forEach((g) => {
      g.permissions.forEach((p) => {
        updated[p.name] = isChecked;
      });
    });
    setCheckedPerms(updated);
  };

  const handleSavePermissions = async () => {
    if (!isAdmin) return;

    setLoadingPermissions(true);
    const payload = {
      permissions: Object.entries(checkedPerms).map(([name, isGranted]) => ({
        name,
        isGranted,
      })),
    };

    try {
      await rolesApi.updatePermissions("R", permissionRole.name, payload);

      // The application configuration is user-specific. Refresh it after a
      // role change so the current user's buttons react without another login.
      await refetchPermissions();

      toast(localize("SavedSuccessfully"));
      handleClosePermissions();
    } catch (err) {
      toast(err.message || localize("DefaultErrorMessage"), "error");
      setLoadingPermissions(false);
    }
  };

  const handleSelectAllGroup = (groupName, isChecked) => {
    const group = permissionsData.groups.find((g) => g.name === groupName);
    if (!group) return;
    const updated = { ...checkedPerms };
    group.permissions.forEach((p) => {
      updated[p.name] = isChecked;
    });
    setCheckedPerms(updated);
  };

  const handleTogglePerm = (perm, isChecked) => {
    const updated = { ...checkedPerms };
    updated[perm.name] = isChecked;

    if (isChecked) {
      const allPerms = permissionsData.groups.flatMap((g) => g.permissions);
      let currentParentName = perm.parentName;
      while (currentParentName) {
        updated[currentParentName] = true;
        const parentObj = allPerms.find((p) => p.name === currentParentName);
        currentParentName = parentObj ? parentObj.parentName : null;
      }
    } else {
      const allPerms = permissionsData.groups.flatMap((g) => g.permissions);
      const uncheckChildren = (parentName) => {
        const kids = allPerms.filter((p) => p.parentName === parentName);
        kids.forEach((k) => {
          updated[k.name] = false;
          uncheckChildren(k.name);
        });
      };
      uncheckChildren(perm.name);
    }

    setCheckedPerms(updated);
  };

  const handleDelete = (role) => {
    if (role.name.toLowerCase() === "admin") {
      toast(localize("Volo.Abp.Identity:010006"), "error");
      return;
    }
    setDeleteRole(role);
  };

  const confirmDelete = () => {
    if (!deleteRole || deleting) return;
    setDeleting(true);
    rolesApi
      .delete(deleteRole.id)
      .then(() => {
        toast(text("SuccessfullyDeleted", "Successfully deleted"));
        fetchRoles();
      })
      .catch((err) => toast(err.message || localize("DefaultErrorMessage"), "error"))
      .finally(() => {
        setDeleting(false);
        setDeleteRole(null);
      });
  };

  return (
    <div className="min-h-full w-full bg-[#f8fafc] dark:bg-slate-950 p-1 pb-[10px] flex flex-col relative overflow-visible font-[Arial]">
      <style>{`
        *::-webkit-scrollbar { display: none !important; }
        * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
      `}</style>

      <div className="flex-1 w-full bg-white dark:bg-[#161920] border border-slate-200 dark:border-slate-800/50 shadow-sm flex flex-col rounded-3xl overflow-visible min-h-0">

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-4 md:px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800/50">
          <div className="flex flex-col">
            <nav className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400 mb-1 flex-wrap">
              <span>{text("Home", "Home")}</span>
              <span className="text-slate-400">/</span>
              <span>{text("Menu:Administration", "Administration")}</span>
              <span className="text-slate-400">/</span>
              <span>{text("Menu:IdentityManagement", "Identity Management")}</span>
              <span className="text-slate-400">/</span>
              <span className="text-pink-500">{text("Roles", "Roles")}</span>
            </nav>
            <h1 className="text-[28px] leading-tight font-bold text-slate-900 dark:text-white">
              {text("Roles", "Roles")}
            </h1>
          </div>
          <button
            onClick={handleCreateOpen}
            className="app-primary-button inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm rounded-xl shrink-0"
          >
            {text("NewRole", "New Role")}
          </button>
        </div>

        {/* Toolbar Section */}
        <div className="relative z-20 px-4 py-3 sm:px-6 flex items-center justify-between bg-transparent flex-wrap gap-4 sm:gap-6">
          <div className="flex items-center gap-4 sm:gap-6 flex-1 min-w-0">
            {/* Search Box */}
            <div className="relative w-full max-w-[400px] min-w-0 group">
              <input
                type="text"
                placeholder={text("Search", "Search")}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                aria-label={text("Search", "Search")}
                className="w-full h-10 pl-10 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-sm outline-none transition-colors focus:border-pink-500 focus:ring-2 focus:ring-pink-500/15 font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  aria-label={text("Clear", "Clear")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full"
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table Area */}
        <div className="flex-1 flex flex-col min-h-0 relative px-4 sm:px-6 pb-4 pt-1 overflow-visible">

          <div className="relative overflow-x-auto flex-1 no-scrollbar min-h-0">
            {loading && (
              <div className="absolute inset-0 z-10 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center">
                <Loader2 className="animate-spin text-pink-500" size={28} />
              </div>
            )}
            <table className="w-full text-left border-separate border-spacing-y-1">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 h-[56px]">
                  <th className="px-5 h-11 text-[12px] font-semibold text-slate-600 dark:text-slate-300 pl-8 rounded-l-xl">
                    {text("RoleName", "Role Name")}
                  </th>
                  <th className="px-5 h-11 text-[12px] font-semibold text-slate-600 dark:text-slate-300 text-right pr-8 rounded-r-xl">
                    {text("Actions", "Actions")}
                  </th>
                </tr>
              </thead>

              <motion.tbody
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="relative min-h-0"
              >
                {roles.length === 0 && !loading ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="py-24 text-center text-sm font-medium text-slate-400"
                    >
                      {text("NoDataAvailableInDatatable", "No data available")}
                    </td>
                  </tr>
                ) : (
                  roles.map((row, idx) => {
                    return (
                      <motion.tr
                        key={row.id}
                        variants={rowVariants}
                        className={`group transition-all duration-200 border-b border-slate-50 dark:border-slate-800/30 ${ROW_HEIGHT} ${idx % 2 === 0
                          ? "bg-white dark:bg-[#161920]/40"
                          : "bg-gray-200/50 dark:bg-white/[0.03]"
                          }`}
                      >
                        <td className={`px-5 ${ROW_HEIGHT} text-[12px] pl-8 rounded-l-2xl text-slate-800 dark:text-slate-200 font-bold`}>
                          <div className="flex items-center gap-2.5">
                            <span className="text-[13px] text-slate-800 dark:text-slate-200 font-semibold truncate">
                              <SearchTextHighlight text={row.name} query={search} />
                            </span>
                            {row.isDefault && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                {text("DisplayName:IsDefault", "Default")}
                              </span>
                            )}
                            {row.isPublic && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400">
                                {text("DisplayName:IsPublic", "Public")}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`px-5 ${ROW_HEIGHT} text-[12px] font-medium text-slate-500 dark:text-slate-400 text-right pr-8 rounded-r-2xl`}>
                          <ActionsMenu
                            onPermissions={isAdmin ? () => handlePermissions(row) : null}
                            onEdit={() => handleEditOpen(row)}
                            onDelete={row.name?.toLowerCase() !== "admin" ? () => handleDelete(row) : null}
                            actionButtonText={localize("Actions")}
                            editButtonText={localize("Edit")}
                            permissionButtonText={localize("Permissions")}
                            deleteButtonText={localize("Delete")}
                            className="text-pink-500 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-950/30 border hover:border-pink-500 transition-all text-[11px] px-4 py-1.5 flex items-center justify-center gap-1 rounded-xl font-bold tracking-wider bg-transparent border-pink-500/20 hover:border-pink-500 shadow-sm"
                          />
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </motion.tbody>
            </table>
          </div>

          {/* Pagination Section */}
          {totalPages > 0 && (
            <div className="flex flex-wrap items-center justify-center sm:justify-between gap-3 border-t border-slate-100 dark:border-slate-800/50 mt-4 pt-4 shrink-0">
              <div className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                {totalCount > 0
                  ? text("PagerInfo{0}{1}{2}", "Showing {0} to {1} of {2} entries")
                    .replace("{0}", (page - 1) * pageSize + 1)
                    .replace("{1}", Math.min(page * pageSize, totalCount))
                    .replace("{2}", totalCount)
                  : text("PagerInfoEmpty", "Showing 0 to 0 of 0 entries")}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                {/* Rows per page dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">{text("PagerShowMenuEntries", "Show _MENU_ entries").split("_MENU_")[0].trim() || "Show"}</span>
                  <AppSelect
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="h-8 !rounded-lg !text-[12px]"
                  >
                    {[10, 25, 50, 100].map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </AppSelect>
                </div>

                <div className="flex items-center gap-1 bg-slate-100/60 dark:bg-slate-800/40 p-1 border border-slate-200/60 dark:border-slate-700/50 rounded-xl shadow-sm">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 transition-all"
                    title={text("PagerFirst", "First")}
                  >
                    <ChevronsLeft size={16} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 transition-all"
                    title={text("PagerPrevious", "Previous")}
                  >
                    <ChevronLeft size={16} strokeWidth={2.5} />
                  </button>

                  <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1" />

                  <div className="px-3 flex items-center gap-2 select-none">

                    <div className="flex items-center gap-1.5 min-w-[40px] justify-center">
                      <span className="text-[12px] font-black text-pink-600 leading-none">{page}</span>
                      <span className="text-[11px] font-bold text-slate-300">/</span>
                      <span className="text-[11px] font-bold text-slate-500 leading-none">{totalPages}</span>
                    </div>
                  </div>

                  <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1" />

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 transition-all"
                    title={text("PagerNext", "Next")}
                  >
                    <ChevronRight size={16} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 transition-all"
                    title={text("PagerLast", "Last")}
                  >
                    <ChevronsRight size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <RoleModal
        open={isModalOpen}
        onClose={() => { setIsModalOpen(false); setActiveItem(null); setSubmitError(""); }}
        item={activeItem}
        onSubmit={handleCreateOrUpdate}
        loading={actionLoading}
        submitError={submitError}
        onErrorClose={() => setSubmitError("")}
        text={text}
      />

      {/* Material UI Permissions Dialog */}
      <Dialog
        open={Boolean(permissionRole)}
        onClose={(_event, reason) => {
          if (reason === "backdropClick" || reason === "escapeKeyDown") return;
          handleClosePermissions();
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "16px",
            backgroundImage: "none",
            backgroundColor: isDark ? "#0f172a" : "#ffffff",
            boxShadow: isDark ? "0 25px 50px -12px rgba(0, 0, 0, 0.5)" : "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          },
        }}
      >
        <DialogTitle className="flex items-center justify-between px-5 pt-4 pb-2">
          <span className="text-base font-semibold text-slate-800 dark:text-slate-200">
            {localize("Permissions")} - {permissionRole?.name}
          </span>
          <button
            type="button"
            onClick={handleClosePermissions}
            className="p-1.5 text-slate-400 hover:text-[#ec4899] dark:hover:text-[#ec4899] transition-colors rounded-lg bg-slate-100 dark:bg-slate-800"
          >
            <X size={16} />
          </button>
        </DialogTitle>
        <DialogContent sx={{ border: "none", backgroundColor: isDark ? "#0f172a" : "#ffffff" }}>
          {loadingPermissions ? (
            <div className="flex justify-center items-center py-10">
              <CircularProgress sx={{ color: "#ec4899" }} />
            </div>
          ) : (
            <div className={`text-sm space-y-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              <div className={`flex justify-end items-center mb-2 pb-1 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                {/* Grant All Checkbox */}
                {permissionsData?.groups && (
                  <div className="flex items-center gap-2 px-3 py-2">
                    <input
                      type="checkbox"
                      id="grant-all-permissions"
                      checked={
                        permissionsData.groups.flatMap((g) => g.permissions)
                          .length > 0 &&
                        permissionsData.groups
                          .flatMap((g) => g.permissions)
                          .every((p) => checkedPerms[p.name])
                      }
                      onChange={(e) => handleGrantAll(e.target.checked)}
                      className={`w-4 h-4 rounded ring-offset-0 focus:ring-0 cursor-pointer accent-pink-500 border-slate-300 text-pink-500 ${isDark ? 'bg-slate-950 border-slate-600' : 'bg-white border-slate-300'}`}
                    />
                    <label
                      htmlFor="grant-all-permissions"
                      className={`text-sm cursor-pointer font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}
                    >
                      {localize("SelectAllInAllTabs")}
                    </label>
                  </div>
                )}
              </div>

              {/* Render permissions if available */}
              {permissionsData?.groups?.map((group, idx) => {
                const groupPerms = group.permissions;
                const isAllChecked =
                  groupPerms.length > 0 &&
                  groupPerms.every((p) => checkedPerms[p.name]);
                const isExpanded = !!expandedGroups[group.name];

                return (
                  <div key={idx} className="mb-2">
                    {/* Collapsible Header */}
                    <div
                      onClick={() => toggleGroup(group.name)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 group ${
                        isDark
                          ? 'bg-slate-800/40 hover:bg-slate-800/80'
                          : 'bg-slate-100 hover:bg-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
                          <ChevronDown size={18} className={`group-hover:text-[#ec4899] ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                        </div>
                        <h4 className={`text-[14px] font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          {group.displayName}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          id={`select-all-${group.name}`}
                          checked={isAllChecked}
                          onChange={(e) => handleSelectAllGroup(group.name, e.target.checked)}
                          className={`w-4 h-4 rounded ring-offset-0 focus:ring-0 cursor-pointer accent-pink-500 text-pink-500 ${isDark ? 'bg-slate-950 border-slate-600' : 'bg-white border-slate-300'}`}
                        />
                        <label
                          htmlFor={`select-all-${group.name}`}
                          className={`text-[11px] font-medium cursor-pointer hover:text-[#ec4899] transition-colors ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
                        >
                          {localize("SelectAllInThisTab")}
                        </label>
                      </div>
                    </div>

                    {/* Drop Down Content */}
                    {isExpanded && (
                      <div className={`mt-2 ml-2 p-3 rounded-xl animate-in slide-in-from-top-2 duration-200 ${
                        isDark ? 'bg-slate-800/20' : 'bg-slate-50 border border-slate-200'
                      }`}>
                        <PermissionTree
                          permissions={groupPerms}
                          parentName={null}
                          checkedPerms={checkedPerms}
                          onToggle={handleTogglePerm}
                          isDark={isDark}
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {!permissionsData?.groups?.length && (
                <div className={`p-4 rounded-xl border text-center ${
                  isDark
                    ? 'bg-slate-800/50 border-slate-700 text-slate-400'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  {localize("NoDataAvailableInDatatable")}
                </div>
              )}
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.5, gap: 1, backgroundColor: isDark ? "#0f172a" : "#f8fafc", borderTop: isDark ? "1px solid #1e293b" : "1px solid #e2e8f0" }}>
          <button
            onClick={() => handleClosePermissions()}
            className={`flex-1 border h-9 text-sm font-semibold rounded-lg transition-colors ${isDark ? 'border-slate-700 text-slate-400 hover:bg-white/5' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
          >
            {localize("Cancel")}
          </button>
          <button
            onClick={handleSavePermissions}
            disabled={loadingPermissions}
            className="app-primary-button flex-1 h-9 text-sm !rounded-lg"
          >
            {loadingPermissions
              ? localize("SavingWithThreeDot")
              : localize("Save")}
          </button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Card - Custom Overlay */}
      {deleteRole && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 9999 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" />

          {/* Card */}
          <div
            className={`relative rounded-2xl px-5 py-4 w-[320px] max-w-[90vw] flex flex-col items-center gap-3 shadow-2xl ${isDark ? 'bg-[#0f172a] border border-white/5' : 'bg-white border border-slate-100'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-500/15 flex items-center justify-center">
              <X size={20} className="text-rose-500" strokeWidth={2.25} />
            </div>

            {/* Text */}
            <div className="text-center">
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">
                {text("AreYouSure", "Are you sure?")}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-snug break-words">
                {text("RoleDeletionConfirmationMessage", "Role '{0}' will be deleted. Do you confirm that?")
                  .replace("{0}", deleteRole?.name ?? "")}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 w-full pt-1">
              <button
                onClick={() => setDeleteRole(null)}
                disabled={deleting}
                className="flex-1 font-semibold text-sm h-8 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
              >
                {text("Cancel", "Cancel")}
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 font-semibold text-sm h-8 bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white rounded-lg transition-colors"
              >
                {text("Delete", "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
