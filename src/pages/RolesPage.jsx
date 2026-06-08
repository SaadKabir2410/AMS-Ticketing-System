import { useMemo, useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { rolesApi } from "../services/api/roles";
import { useToast } from "../component/common/ToastContext";
import PremiumErrorAlert from "../component/common/PremiumErrorAlert";
import { X, ShieldCheck, ChevronDown, ChevronRight, Search, RefreshCw, ArrowLeft, ChevronLeft, ChevronsLeft, ChevronsRight, Loader2 } from "lucide-react";
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

const ROW_HEIGHT = "h-[60px]";

const PermissionTree = ({
  permissions,
  parentName,
  checkedPerms,
  onToggle,
}) => {
  const children = permissions.filter((p) => {
    if (p.parentName !== parentName) return false;
    if (parentName !== null && !checkedPerms[p.name]) return false;
    return true;
  });
  if (children.length === 0) return null;

  return (
    <div
      className={`space-y-2 ${parentName ? "ml-6 mt-2 border-l-2 border-slate-700/50 pl-4" : "mt-2"}`}
    >
      {children.map((perm) => (
        <div key={perm.name} className="flex flex-col">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id={perm.name}
              checked={!!checkedPerms[perm.name]}
              onChange={(e) => onToggle(perm, e.target.checked)}
              className="w-4 h-4 rounded ring-offset-0 focus:ring-0 cursor-pointer accent-pink-500 bg-slate-950 border-slate-600 text-pink-500"
            />
            <label
              htmlFor={perm.name}
              className={`text-sm cursor-pointer ${parentName ? "text-slate-400" : "text-slate-200 font-semibold"}`}
            >
              {perm.displayName || perm.name}
            </label>
          </div>
          <PermissionTree
            permissions={permissions}
            parentName={perm.name}
            checkedPerms={checkedPerms}
            onToggle={onToggle}
          />
        </div>
      ))}
    </div>
  );
};

export default function RolesPage() {
  const { toast } = useToast();
  const { dark } = useTheme();
  const isDark = dark === "dark";

  // Data State
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Pagination & Search State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");

  // Modals & Action items State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

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
        search: search || undefined,
      });
      if (res && res.items) {
        setRoles(res.items);
        setTotalCount(res.totalCount || res.items.length);
      }
    } catch (err) {
      toast(`Error loading roles: ${err.message || "Network error"}`, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [page, pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchRoles();
    }, 400);
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
        toast(`${payload.name} role updated successfully`);
      } else {
        await rolesApi.create(payload);
        toast(`${payload.name} role created successfully`);
      }
      setIsModalOpen(false);
      setActiveItem(null);
      fetchRoles();
    } catch (err) {
      setSubmitError(err.response?.data?.error?.message || err.message || "Operation failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const RoleModal = ({
    open,
    onClose,
    item,
    onSubmit,
    loading,
    submitError,
  }) => {
    if (!open) return null;

    const handleSubmit = () => {
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

    return (
      <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="relative bg-white dark:bg-slate-900 rounded-[24px] p-6 w-full max-w-[360px] shadow-2xl shadow-pink-500/10 border border-slate-100 dark:border-slate-700 transition-all duration-300">
          <h2 className="text-base dark:text-slate-200 mb-4 text-slate-800">
            {item ? "Edit Role" : "Create Role"}
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-slate-500 mb-1.5 ml-1">
                Role Name
              </label>
              <input
                id="role-name-input"
                type="text"
                defaultValue={item?.name || ""}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-pink-500/20 dark:text-slate-200 text-sm transition-all duration-200"
                placeholder="Enter role name..."
              />
            </div>

            {submitError && (
              <PremiumErrorAlert
                open={!!submitError}
                message={submitError}
                onClose={() => { }}
              />
            )}

            {/* Boolean Checks */}
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 px-3 py-2 border-2 border-slate-100 dark:border-slate-700 rounded-xl hover:bg-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 dark:hover:bg-white/5 cursor-pointer transition-all duration-200 group">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-700 dark:text-slate-400 group-hover:text-[#ec4899] transition-colors">
                    Default
                  </span>
                  <input
                    type="checkbox"
                    id="role-isdefault-input"
                    defaultChecked={item?.isDefault || false}
                    className="w-4 h-4 rounded ring-offset-0 focus:ring-0 cursor-pointer accent-pink-500 bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-600 text-pink-500"
                  />
                </div>
                <span className="text-[8px] text-slate-400">
                  Assign new users
                </span>
              </label>
              <label className="flex flex-col gap-1 px-3 py-2 border-2 border-slate-100 dark:border-slate-700 rounded-xl hover:bg-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 dark:hover:bg-white/5 cursor-pointer transition-all duration-200 group">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-700 dark:text-slate-400 group-hover:text-[#ec4899] transition-colors">
                    Public
                  </span>
                  <input
                    type="checkbox"
                    id="role-ispublic-input"
                    defaultChecked={item?.isPublic || false}
                    className="w-4 h-4 rounded ring-offset-0 focus:ring-0 cursor-pointer accent-pink-500 bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-600 text-pink-500"
                  />
                </div>
                <span className="text-[8px] text-slate-400">
                  Visible to everyone
                </span>
              </label>
            </div>
          </div>
          <div className="flex gap-2.5 mt-5">
            <button
              onClick={onClose}
              className="flex-1 btn-flagship !h-[38px] !text-[11px] !border-slate-200 dark:border-slate-700! !text-slate-500 hover:bg-slate-50! dark:hover:bg-white/5!"
            >
              Cancel
            </button>
            <button
              disabled={loading}
              onClick={handleSubmit}
              className="flex-1 btn-flagship !h-[38px] !text-[11px]"
            >
              {loading ? "Wait..." : item ? "Save" : "Create"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handlePermissions = (role) => {
    setPermissionRole(role);
    setLoadingPermissions(true);
    rolesApi
      .getPermissions("R", role.name)
      .then((data) => {
        setPermissionsData(data);
        const initial = {};
        if (data && data.groups) {
          data.groups.forEach((g) => {
            g.permissions.forEach((p) => {
              initial[p.name] = p.isGranted;
            });
          });
        }
        setCheckedPerms(initial);
        setLoadingPermissions(false);
      })
      .catch((err) => {
        toast(`Failed to load permissions: ${err.message}`, "error");
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

  const handleSavePermissions = () => {
    setLoadingPermissions(true);
    const payload = {
      permissions: Object.entries(checkedPerms).map(([name, isGranted]) => ({
        name,
        isGranted,
      })),
    };

    rolesApi
      .updatePermissions("R", permissionRole.name, payload)
      .then(() => {
        toast(`Permissions for ${permissionRole.name} updated successfully`);
        handleClosePermissions();
      })
      .catch((err) => {
        toast(`Failed to save permissions: ${err.message}`, "error");
        setLoadingPermissions(false);
      });
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
      toast("Error: The Admin role cannot be deleted.", "error");
      return;
    }

    rolesApi
      .delete(role.id)
      .then(() => {
        toast(`${role.name} role deleted successfully`);
        fetchRoles();
      })
      .catch((err) => toast(`Error: ${err.message}`, "error"));
  };

  return (
    <div className="min-h-full w-full bg-[#f8fafc] dark:bg-slate-950 p-1 pb-[10px] flex flex-col relative overflow-visible font-[Arial]">
      <style>{`
        *::-webkit-scrollbar { display: none !important; }
        * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
      `}</style>

      <div className="flex-1 w-full bg-white dark:bg-[#161920] border border-slate-200 dark:border-slate-800/50 shadow-sm flex flex-col rounded-3xl overflow-visible min-h-0">

        {/* Header Section */}
        <div className="flex flex-col gap-6 py-8 px-4 md:px-8 border-b border-slate-100 dark:border-slate-800/50 transition-colors">
          <nav className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-600 mb-1 flex-wrap">
            <span>Home</span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span>Administration</span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span>Identity Management</span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-pink-500">Roles</span>
          </nav>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.history.back()}
                className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-600 hover:text-pink-600 transition-all border border-slate-200/60 dark:border-slate-700/50 shadow-sm"
                title="Go Back"
              >
                <ArrowLeft size={20} strokeWidth={2.5} />
              </button>
              <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                Roles
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCreateOpen}
                className="inline-flex items-center px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-pink-500/20 transition-all bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white active:scale-95"
              >
                New Role
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar Section */}
        <div className="relative z-20 px-4 py-4 sm:px-6 sm:py-6 flex items-center justify-between bg-transparent flex-wrap gap-4 sm:gap-6">
          <div className="flex items-center gap-4 sm:gap-6 flex-1 min-w-[200px]">
            {/* Search Box */}
            <div className="relative w-full max-w-[400px] group">
              <input
                type="text"
                placeholder="Search roles by name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-11 pr-10 py-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/50 text-sm outline-none transition-all focus:border-pink-600 focus:ring-4 focus:ring-pink-600/10 shadow-sm font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            </div>
          </div>

          <button
            onClick={fetchRoles}
            disabled={loading}
            className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/50 flex items-center justify-center text-slate-500 hover:text-pink-600 hover:border-pink-500/40 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            title="Refresh Roles"
          >
            <RefreshCw size={16} className={`${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Table Area */}
        <div className="flex-1 flex flex-col min-h-0 relative px-6 pb-6 pt-2 overflow-visible">

          <div className="overflow-x-auto flex-1 no-scrollbar min-h-0">
            <table className="w-full text-left border-separate border-spacing-y-1 min-w-max">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 h-[56px]">
                  <th className="px-5 h-[56px] text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 pl-8">
                    Role Name
                  </th>
                  <th className="px-5 h-[56px] text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-right pr-8">
                    Actions
                  </th>
                </tr>
              </thead>

              <motion.tbody
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="relative min-h-0"
              >
                {loading && (
                  <div className="absolute inset-0 z-10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center h-full">
                    <Loader2 className="animate-spin text-pink-500" size={32} />
                  </div>
                )}

                {roles.length === 0 && !loading ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="py-32 text-center text-sm font-black text-slate-400 uppercase tracking-widest"
                    >
                      No roles found
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
                            <span className="text-sm text-slate-800 dark:text-slate-200 font-bold uppercase truncate">
                              {row.name}
                            </span>
                            {row.isDefault && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                Default
                              </span>
                            )}
                            {row.isPublic && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400">
                                Public
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`px-5 ${ROW_HEIGHT} text-[12px] font-medium text-slate-500 dark:text-slate-400 text-right pr-8 rounded-r-2xl`}>
                          <ActionsMenu
                            onPermissions={() => handlePermissions(row)}
                            onEdit={() => handleEditOpen(row)}
                            onDelete={row.name?.toLowerCase() !== "admin" ? () => handleDelete(row) : null}
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
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/50 mt-4 pt-4 shrink-0">
              <div className="text-[11px] font-bold text-slate-400 tracking-wider">
                Showing <span className="text-pink-500">{(page - 1) * pageSize + 1}</span> to{" "}
                <span className="text-pink-500">{Math.min(page * pageSize, totalCount)}</span> of{" "}
                <span className="text-pink-500">{totalCount}</span> entries
              </div>

              <div className="flex items-center gap-3">
                {/* Rows per page dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Show:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="h-8 px-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-pink-500 transition-all cursor-pointer"
                  >
                    {[5, 10, 15, 20, 50].map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-slate-100/60 dark:bg-slate-800/40 p-1 border border-slate-200/60 dark:border-slate-700/50 rounded-xl shadow-sm">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 transition-all"
                    title="First Page"
                  >
                    <ChevronsLeft size={16} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 transition-all"
                    title="Previous Page"
                  >
                    <ChevronLeft size={16} strokeWidth={2.5} />
                  </button>

                  <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1" />

                  <div className="px-3 flex items-center gap-2 select-none">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Page</span>
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
                    title="Next Page"
                  >
                    <ChevronRight size={16} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 transition-all"
                    title="Last Page"
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
      />

      {/* Material UI Permissions Dialog */}
      <Dialog
        open={Boolean(permissionRole)}
        onClose={handleClosePermissions}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "20px",
            backgroundImage: "none",
            backgroundColor: "#0f172a", // Dark Blue
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", // Extra shadow for depth since border is gone
          },
        }}
      >
        <DialogTitle className="flex items-center justify-between px-6 pt-5 pb-2">
          <span className="text-lg font-bold text-slate-200">
            Permissions - {permissionRole?.name}
          </span>
          <IconButton onClick={() => handleClosePermissions()} size="small" sx={{ color: "rgba(255, 255, 255, 0.6)" }}>
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ border: "none" }}>
          {loadingPermissions ? (
            <div className="flex justify-center items-center py-10">
              <CircularProgress sx={{ color: "#3b82f6" }} />
            </div>
          ) : (
            <div className="text-sm text-slate-400 space-y-3">
              <div className="flex justify-between items-center mb-4 pb-2">
                <p>
                  Control what <strong className="text-slate-200">{permissionRole?.name}</strong> can do.
                </p>

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
                      className="w-4 h-4 rounded ring-offset-0 focus:ring-0 cursor-pointer accent-pink-500 bg-slate-950 border-slate-600 text-pink-500"
                    />
                    <label
                      htmlFor="grant-all-permissions"
                      className="text-sm text-slate-200 cursor-pointer font-medium"
                    >
                      Grant all permissions
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
                  <div
                    key={idx}
                    className="mb-3"
                  >
                    {/* Collapsible Header (Combobox style) */}
                    <div
                      onClick={() => toggleGroup(group.name)}
                      className="flex items-center justify-between px-4 py-2.5 bg-slate-800/40 rounded-xl hover:bg-slate-800/80 cursor-pointer transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
                          <ChevronDown size={18} className="text-slate-500 group-hover:text-[#ec4899]" />
                        </div>
                        <h4 className="text-slate-200 text-[14px] font-bold uppercase tracking-wider">
                          {group.displayName || group.name}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          id={`select-all-${group.name}`}
                          checked={isAllChecked}
                          onChange={(e) =>
                            handleSelectAllGroup(group.name, e.target.checked)
                          }
                          className="w-4 h-4 rounded ring-offset-0 focus:ring-0 cursor-pointer accent-pink-500 bg-slate-950 border-slate-600 text-pink-500"
                        />
                        <label
                          htmlFor={`select-all-${group.name}`}
                          className="text-[10px] text-slate-500 uppercase font-black tracking-widest cursor-pointer hover:text-[#ec4899] transition-colors"
                        >
                          Select all
                        </label>
                      </div>
                    </div>

                    {/* Drop Down Menu (Content) */}
                    {isExpanded && (
                      <div className="mt-2 ml-2 p-3 bg-slate-800/20 rounded-xl animate-in slide-in-from-top-2 duration-200">
                        <PermissionTree
                          permissions={groupPerms}
                          parentName={null}
                          checkedPerms={checkedPerms}
                          onToggle={handleTogglePerm}
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {!permissionsData?.groups?.length && (
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 text-center text-slate-400">
                  No specific permissions defined.
                </div>
              )}
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1.5, backgroundColor: "#0f172a", border: "none" }}>
          <button
            onClick={() => handleClosePermissions()}
            className="flex-1 btn-flagship !h-[38px] !text-[11px] !border-slate-700 !text-slate-400 hover:bg-white/5!"
          >
            Cancel
          </button>
          <button
            onClick={handleSavePermissions}
            disabled={loadingPermissions}
            className="flex-1 btn-flagship !h-[38px] !text-[11px]"
          >
            {loadingPermissions ? "Wait..." : "Save Changes"}
          </button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
