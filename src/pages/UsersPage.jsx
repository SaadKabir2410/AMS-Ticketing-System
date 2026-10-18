import { useState, useMemo, useEffect, useCallback } from "react";
import AppSelect from "../component/common/AppSelect";
import { useToast } from "../component/common/ToastContext";
import { usersApi } from "../services/api/users";
import { rolesApi } from "../services/api/roles";
import {
  ORGANIZATION_TYPES,
  getOrganizationTypeName,
} from "../constants/userTypes";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import apiClient from "../services/apiClient";
import {
  getCachedApplicationConfig,
  loadApplicationConfig,
} from "../services/applicationConfigCache";
import PremiumErrorAlert from "../component/common/PremiumErrorAlert";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowLeft,
  Search,
  RefreshCw,
  X,
  Sliders,
  Loader2,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { Menu, MenuItem, ListItemText, Popper, Paper, ClickAwayListener, MenuList } from "@mui/material";
import { usePermission } from "../hooks/usePermission";
import { useAuth } from "../context/AuthContextHook";

const getPermissionParentName = (permission) =>
  permission.parentName?.trim() || null;

const PermissionTree = ({
  permissions,
  parentName,
  checkedPerms,
  lockedPerms,
  onToggle,
}) => {
  const permissionNames = new Set(permissions.map((permission) => permission.name));
  const children = permissions.filter((permission) => {
    const backendParentName = getPermissionParentName(permission);
    const resolvedParentName = backendParentName && permissionNames.has(backendParentName)
      ? backendParentName
      : null;
    return resolvedParentName === parentName;
  });
  if (children.length === 0) return null;

  return (
    <div
      className={`space-y-2 ${parentName ? "ml-6 mt-2 border-l-2 border-slate-200 dark:border-slate-700/50 pl-4" : "mt-2"}`}
    >
      {children.map((perm) => {
        const isLocked = !!lockedPerms[perm.name];

        return (
          <div key={perm.name} className="flex flex-col">
            <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id={perm.name}
              checked={!!checkedPerms[perm.name]}
              disabled={isLocked}
              onChange={(event) => onToggle(perm, event.target.checked)}
              className={`w-4 h-4 rounded ring-offset-0 focus:ring-0 accent-pink-500 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-600 text-pink-500 disabled:opacity-70 ${isLocked ? "cursor-not-allowed" : "cursor-pointer"}`}
            />
            <label
              htmlFor={perm.name}
              className={`text-sm ${isLocked ? "cursor-not-allowed" : "cursor-pointer"} ${parentName ? "text-slate-600 dark:text-slate-400" : "text-slate-800 dark:text-slate-200 font-bold"}`}
            >
              {perm.displayName}
            </label>
            </div>
            <PermissionTree
              permissions={permissions}
              parentName={perm.name}
              checkedPerms={checkedPerms}
              lockedPerms={lockedPerms}
              onToggle={onToggle}
            />
          </div>
        );
      })}
    </div>
  );
};

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

export default function UsersPage() {
  const { toast } = useToast();
  const { dark } = useTheme();
  const { user } = useAuth();
  const isDark = dark === "dark";
  const isAdmin = String(user?.role || "")
    .split(",")
    .some((role) => role.trim().toLowerCase() === "admin");
  const [applicationConfig, setApplicationConfig] = useState(
    getCachedApplicationConfig,
  );
  const localize = (key) => getLocalizationValue(applicationConfig, key);

  useEffect(() => {
    let isCurrent = true;
    loadApplicationConfig()
      .then((config) => {
        if (isCurrent) setApplicationConfig(config);
      })
      .catch((error) => {
        console.error("Failed to load user form localization:", error);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  // Data State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Pagination & Search State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(14);
  const [search, setSearch] = useState("");
  const [isAdvancedSearch, setIsAdvancedSearch] = useState(false);

  // Modals State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [deleteUser, setDeleteUser] = useState(null);

  // Permissions Modal State
  const [permissionUser, setPermissionUser] = useState(null);
  const [permissionsData, setPermissionsData] = useState(null);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [checkedPerms, setCheckedPerms] = useState({});
  const [lockedPerms, setLockedPerms] = useState({});
  const [expandedGroups, setExpandedGroups] = useState({});

  const canCreate = usePermission("AbpIdentity.Users.Create");
  const canUpdate = usePermission("AbpIdentity.Users.Update");
  const canDelete = usePermission("AbpIdentity.Users.Delete");
  const canManagePermissions = usePermission("AbpIdentity.Users.ManagePermissions");
  const canManageUserRoles = usePermission("AbpIdentity.Roles");

  // Filter Toggles State
  const [filters, setFilters] = useState({
    isCustomer: false,
    notActive: false,
    mustCompleteJobsheet: false,
    isITS: false,
    onlyLoadCurrentUser: false,
    organizationTypes: "",
  });

  const toggleFilter = (key) =>
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));

  // Load Users from API
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await usersApi.getAll({
        page,
        perPage: pageSize,
        search,
        isCustomer: filters.isCustomer || undefined,
        notActive: filters.notActive || undefined,
        mustCompleteJobsheet: filters.mustCompleteJobsheet || undefined,
        isITS: filters.isITS || undefined,
        onlyLoadCurrentUser: filters.onlyLoadCurrentUser || undefined,
        organizationTypes: filters.organizationTypes
          ? [parseInt(filters.organizationTypes, 10)]
          : undefined,
      });

      setUsers(res.items || res.data || []);
      setTotalCount(res.totalCount || 0);
    } catch (err) {
      toast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, filters, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleClearFilters = () => {
    setFilters({
      isCustomer: false,
      notActive: false,
      mustCompleteJobsheet: false,
      isITS: false,
      onlyLoadCurrentUser: false,
      organizationTypes: "",
    });
    setSearch("");
  };

  const toggleGroup = (groupName) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const handlePermissions = async (user) => {
    setPermissionUser(user);
    setLoadingPermissions(true);
    try {
      const userPerms = await usersApi.getPermissions(user.id);
      setPermissionsData(userPerms);

      const initial = {};
      const locked = {};

      userPerms.groups?.forEach((g) => {
        g.permissions.forEach((p) => {
          initial[p.name] = p.isGranted || false;
          locked[p.name] = p.isGranted === true;
        });
      });

      setCheckedPerms(initial);
      setLockedPerms(locked);
    } catch (err) {
      toast(err.message || localize("DefaultErrorMessage"), "error");
    } finally {
      setLoadingPermissions(false);
    }
  };
  const handleClosePermissions = () => {
    setPermissionUser(null);
    setPermissionsData(null);
    setCheckedPerms({});
    setLockedPerms({});
    setExpandedGroups({});
  };

  const handleGrantAll = (isChecked) => {
    if (!permissionsData?.groups) return;
    const updated = { ...checkedPerms };
    permissionsData.groups.forEach((group) => {
      group.permissions.forEach((permission) => {
        if (!lockedPerms[permission.name]) {
          updated[permission.name] = isChecked;
        }
      });
    });
    setCheckedPerms(updated);
  };

  const handleSavePermissions = async () => {
    setLoadingPermissions(true);
    try {
      const payload = {
        permissions: Object.entries(checkedPerms)
          .filter(([name]) => !lockedPerms[name])
          .map(([name, isGranted]) => ({
            name,
            isGranted: !!isGranted,
          })),
      };

      await usersApi.updatePermissions(permissionUser.id, payload);
      toast(localize("SavedSuccessfully"));
      handleClosePermissions();
    } catch (err) {
      toast(err.message || localize("DefaultErrorMessage"), "error");
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handleSelectAllGroup = (groupName, isChecked) => {
    const group = permissionsData?.groups?.find((item) => item.name === groupName);
    if (!group) return;
    const updated = { ...checkedPerms };
    group.permissions.forEach((permission) => {
      if (!lockedPerms[permission.name]) {
        updated[permission.name] = isChecked;
      }
    });
    setCheckedPerms(updated);
  };

  const handleTogglePerm = (permission, isChecked) => {
    if (lockedPerms[permission.name]) return;

    const updated = { ...checkedPerms };
    const allPermissions = permissionsData.groups.flatMap(
      (group) => group.permissions || [],
    );
    updated[permission.name] = isChecked;

    const uncheckDescendants = (parentName) => {
      allPermissions
        .filter((item) => getPermissionParentName(item) === parentName)
        .forEach((childPermission) => {
          if (!lockedPerms[childPermission.name]) {
            updated[childPermission.name] = false;
          }
          uncheckDescendants(childPermission.name);
        });
    };

    if (isChecked) {
      let currentParentName = getPermissionParentName(permission);
      while (currentParentName) {
        updated[currentParentName] = true;
        const parentPermission = allPermissions.find(
          (item) => item.name === currentParentName,
        );
        currentParentName = parentPermission
          ? getPermissionParentName(parentPermission)
          : null;
      }
    } else {
      uncheckDescendants(permission.name);
    }

    setCheckedPerms(updated);
  };

  const handleCreateOpen = () => {
    if (!canCreate) return;

    setActiveItem(null);
    setSubmitError("");
    setIsModalOpen(true);
  };

  const handleEditOpen = (row) => {
    if (!canUpdate) return;

    setActiveItem(row);
    setSubmitError("");
    setIsModalOpen(true);
  };

  const handleDelete = (row) => {
    if (!canDelete) return;

    if (row.userName?.toLowerCase() === "admin") {
      toast("Error: The Admin user cannot be deleted.", "error");
      return;
    }
    setDeleteUser(row);
  };

  const confirmDelete = () => {
    if (!deleteUser) return;
    usersApi
      .delete(deleteUser.id)
      .then(() => {
        toast(`${deleteUser.userName} deleted successfully`);
        fetchUsers();
      })
      .catch((err) => toast(`Error: ${err.message}`, "error"))
      .finally(() => setDeleteUser(null));
  };

  const handleModalSubmit = async (payload) => {
    if ((activeItem && !canUpdate) || (!activeItem && !canCreate)) return;

    try {
      setModalLoading(true);
      if (activeItem) {
        await usersApi.update(activeItem.id, payload);
        toast("User updated successfully");
      } else {
        await usersApi.create(payload);
        toast("User created successfully");
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || "Operation failed";
      setSubmitError(msg);
    } finally {
      setModalLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Render modal component
  const UserModal = ({ open, onClose, item, onSubmit, loading, submitError }) => {
    const [tabIndex, setTabIndex] = useState(0);
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [availableRoles, setAvailableRoles] = useState([]);
    const [validationErrors, setValidationErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [userData, setUserData] = useState(null);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [rolesPage, setRolesPage] = useState(1);
    const rolesPerPage = 5;

    const [orgType, setOrgType] = useState("");
    const [sites, setSites] = useState([]);
    const [selectedSite, setSelectedSite] = useState(null);
    const organizationTypeOptions = ORGANIZATION_TYPES.filter(
      (organizationType) => organizationType.value > 0,
    );

    useEffect(() => {
      apiClient
        .get("/api/app/site/", { params: { MaxResultCount: 1000 } })
        .then((res) => setSites(res.data?.items || res.data || []))
        .catch((err) => console.error("Error fetching sites:", err));
    }, []);

    useEffect(() => {
      if (open) {
        setTabIndex(0);
        setRolesPage(1);
        setValidationErrors({});
        setShowPassword(false);

        if (canManageUserRoles) {
          usersApi
            .getAssignableRoles()
            .then((res) => setAvailableRoles(res.items || res || []))
            .catch((e) => console.error("Error fetching assignable roles", e));
        } else {
          setAvailableRoles([]);
          setSelectedRoles([]);
        }

        if (item) {
          setIsLoadingData(true);
          Promise.all([
            usersApi.getById(item.id).catch((e) => {
              console.error("Error fetching getById:", e);
              return null;
            }),
            canManageUserRoles
              ? usersApi.getUserRoles(item.id).catch((e) => {
                console.error("Error fetching getUserRoles:", e);
                return null;
              })
              : Promise.resolve(null),
          ])
            .then(([userRes, rolesRes]) => {
              const loadedUser = userRes || item;
              const mergedUser = loadedUser
                ? { ...loadedUser, ...(loadedUser.extraProperties || {}) }
                : null;
              setUserData(mergedUser);

              const orgTypeVal = mergedUser?.organizationType;
              setOrgType(
                orgTypeVal != null && orgTypeVal !== 0 ? orgTypeVal.toString() : ""
              );

              let rolesArray = [];
              if (rolesRes) {
                rolesArray = rolesRes.items || rolesRes || [];
              } else if (canManageUserRoles && item.roleNames) {
                rolesArray = item.roleNames;
              }
              setSelectedRoles(rolesArray.map((r) => r.name || r));
            })
            .catch((error) => {
              console.error("Failed to resolve promises", error);
              setUserData(item);
              setSelectedRoles(item.roleNames || []);
            })
            .finally(() => {
              setIsLoadingData(false);
            });
        } else {
          setUserData(null);
          setSelectedRoles([]);
          setIsLoadingData(false);
          setOrgType("");
          setSelectedSite(null);
        }
      }
    }, [open, item]);

    useEffect(() => {
      if (!userData?.siteId || sites.length === 0) {
        if (!userData?.siteId) setSelectedSite(null);
        return;
      }
      const match = sites.find((s) => s.id === userData.siteId) ?? null;
      setSelectedSite(match);
    }, [userData?.siteId, sites]);

    const toggleRole = (role) => {
      const found = selectedRoles.find(
        (selectedRole) =>
          typeof selectedRole === "string" &&
          typeof role === "string" &&
          selectedRole.toLowerCase() === role.toLowerCase(),
      );
      const nextRoles = found
        ? selectedRoles.filter((selectedRole) => selectedRole !== found)
        : [...selectedRoles, role];

      setSelectedRoles(nextRoles);
      if (nextRoles.length > 0) {
        setValidationErrors((currentErrors) => ({
          ...currentErrors,
          roles: null,
        }));
      }
    };

    if (!open) return null;

    const handleSubmit = (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData.entries());

      const errors = {};
      if (!data.userName?.trim())
        errors.userName = "The User name field is required";
      if (!data.name?.trim()) errors.name = "The Name field is required";
      if (!item && !data.password?.trim()) {
        errors.password = "The Password field is required";
      } else if (data.password?.trim()) {
        const pwd = data.password.trim();
        const hasUpper = /[A-Z]/.test(pwd);
        const hasLower = /[a-z]/.test(pwd);
        const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
        if (!hasUpper || !hasLower || !hasSpecial) {
          errors.password = "Password must contain uppercase, lowercase, and special character";
        }
      }
      if (!data.phoneNumber?.trim())
        errors.phoneNumber = "The Phone number field is required";
      if (!orgType || orgType === "" || orgType === "0") {
        errors.organizationType = "The Organization Type field is required";
      }
      if (orgType === "1" && !selectedSite) {
        errors.siteId = "Site is required for Customer organization type";
      }
      if (canManageUserRoles && !item && selectedRoles.length === 0) {
        errors.roles = "At least one role is required when creating a user";
      }

      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        setTabIndex(errors.roles && Object.keys(errors).length === 1 ? 1 : 0);
        return;
      }

      setValidationErrors({});

      const payload = {
        userName: data.userName?.trim(),
        name: data.name?.trim(),
        surname: data.surname?.trim() || "",
        email: data.email?.trim() || "",
        phoneNumber: data.phoneNumber?.trim(),
        organizationType: Number(orgType),
        siteId: orgType === "1" && selectedSite ? selectedSite.id : null,
        isPrimary: formData.get("isPrimary") === "on",
        isITS: formData.get("isITS") === "on",
        isActive: formData.get("isActive") === "on",
        lockoutEnabled: formData.get("lockoutEnabled") === "on",
      };

      if (isAdmin) {
        payload.mustCompleteJobsheet =
          formData.get("mustCompleteJobsheet") === "on";
        payload.baseRateFirstHourAfterWorkingHours =
          parseFloat(data.baseRateFirstHourAfterWorkingHours) || 0;
        payload.baseRateAfterFirstHourAfterWorkingHours =
          parseFloat(data.baseRateAfterFirstHourAfterWorkingHours) || 0;
      }

      if (canManageUserRoles) {
        payload.roleNames = selectedRoles;
      }

      if (data.password?.trim()) {
        payload.password = data.password.trim();
      }

      if (item) {
        payload.concurrencyStamp = userData?.concurrencyStamp ?? item.concurrencyStamp;
      }

      onSubmit(payload);
    };

    return (
      <Dialog
        open={open}
        onClose={(event, reason) => {
          if (reason !== "backdropClick" && reason !== "escapeKeyDown") {
            onClose();
          }
        }}
        maxWidth="xs"
        fullWidth
        scroll="body"
        PaperProps={{
          sx: {
            borderRadius: "24px",
            padding: 0,
            boxShadow: "0 25px 50px -12px rgba(59, 130, 246, 0.15)",
            bgcolor: isDark ? "#0f172a" : "#ffffff",
            backgroundImage: "none",
            colorScheme: isDark ? "dark" : "light",
          },
        }}
      >
        <div className="bg-white dark:bg-[#0f172a] px-6 py-6 border-b border-slate-100 dark:border-slate-800 shrink-0 flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-rose-500"></div>
          <h2 className="text-xl font-black bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent flex items-center">
            <div className="w-10 h-10 rounded-2xl bg-pink-50 dark:bg-pink-500/10 flex items-center justify-center text-pink-500 mr-3 shadow-inner shadow-pink-500/20">
              <ShieldCheck size={20} strokeWidth={2.5} />
            </div>
            {item
              ? `${localize("Edit")} ${localize("User")}`
              : localize("NewUser")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-pink-500 hover:rotate-90 transition-all duration-300 rounded-xl hover:bg-pink-50 dark:hover:bg-pink-500/10"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        <form
          key={userData ? `${userData.id}-${userData.concurrencyStamp}` : "new"}
          onSubmit={handleSubmit}
          noValidate
          autoComplete="off"
        >
          <DialogContent
            dividers
            sx={{
              minHeight: "400px",
              p: 0,
              position: "relative",
              bgcolor: isDark ? "#0f172a" : "#ffffff",
              color: isDark ? "#e2e8f0" : "#334155",
              borderColor: isDark ? "#1e293b" : "#e2e8f0",
            }}
          >
            {isLoadingData && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-slate-900/80">
                <p className="text-sm text-slate-500 dark:text-slate-300 animate-pulse">Loading user details...</p>
              </div>
            )}
            <Box sx={{ borderBottom: 1, borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", px: 3, pt: 1, bgcolor: isDark ? "#0f172a" : "#f8fafc" }}>
              <Tabs
                value={tabIndex}
                onChange={(e, val) => setTabIndex(val)}
                TabIndicatorProps={{ style: { backgroundColor: '#ec4899', height: 3, borderRadius: '3px 3px 0 0' } }}
              >
                <Tab label="User Information" sx={{ fontWeight: 800, textTransform: 'none', fontSize: '13px', color: isDark ? '#94a3b8' : '#64748b', '&.Mui-selected': { color: '#ec4899' } }} />
                {canManageUserRoles && (
                  <Tab label="Roles" sx={{ fontWeight: 800, textTransform: 'none', fontSize: '13px', color: isDark ? '#94a3b8' : '#64748b', '&.Mui-selected': { color: '#ec4899' } }} />
                )}
              </Tabs>
            </Box>

            <div className="p-4 bg-white dark:bg-[#0f172a]">
              {submitError && (
                <PremiumErrorAlert
                  open={!!submitError}
                  message={submitError}
                  onClose={() => setSubmitError("")}
                />
              )}

              {/* TAB 1: USER INFORMATION */}
              <div style={{ display: tabIndex === 0 ? "block" : "none" }}>
                <div className="flex flex-col gap-5 mb-6">
                  <div>
                    <label className="block text-[10px] text-slate-500 dark:text-slate-300 mb-1 ml-1 font-bold">
                      {localize("DisplayName:UserName")} <span className="required-asterisk">*</span>
                    </label>
                    <div className="relative group">
                      <input
                        name="userName"
                        autoComplete="new-password"
                        defaultValue={userData?.userName || ""}
                        className={`w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 caret-slate-900 dark:caret-slate-100 border-0 ${validationErrors.userName
                          ? "focus:ring-red-500/20"
                          : "focus:ring-blue-500/20"
                          } rounded-lg outline-none focus:ring-2 text-sm pr-8 transition-all duration-200 font-medium`}
                      />
                      <button type="button" onClick={(e) => { if (e.currentTarget.previousSibling) e.currentTarget.previousSibling.value = '' }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <X size={14} />
                      </button>
                    </div>
                    {validationErrors.userName && (
                      <p className="text-red-500 text-[9px] mt-1 ml-1">
                        {validationErrors.userName}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 dark:text-slate-300 mb-1 ml-1 font-bold">
                      {localize("DisplayName:Name")} <span className="required-asterisk">*</span>
                    </label>
                    <div className="relative group">
                      <input
                        name="name"
                        defaultValue={userData?.name || ""}
                        className={`w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 caret-slate-900 dark:caret-slate-100 border-0 ${validationErrors.name
                          ? "focus:ring-red-500/20"
                          : "focus:ring-blue-500/20"
                          } rounded-lg outline-none focus:ring-2 text-sm pr-8 transition-all duration-200 font-medium`}
                      />
                      <button type="button" onClick={(e) => { if (e.currentTarget.previousSibling) e.currentTarget.previousSibling.value = '' }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <X size={14} />
                      </button>
                    </div>
                    {validationErrors.name && (
                      <p className="text-red-500 text-[9px] mt-1 ml-1">
                        {validationErrors.name}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 dark:text-slate-300 mb-1 ml-1 font-bold">
                      {localize("DisplayName:Surname")}
                    </label>
                    <div className="relative group">
                      <input
                        name="surname"
                        defaultValue={userData?.surname || ""}
                        className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 caret-slate-900 dark:caret-slate-100 border-0 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 text-sm pr-8 transition-all duration-200 font-medium"
                      />
                      <button type="button" onClick={(e) => { if (e.currentTarget.previousSibling) e.currentTarget.previousSibling.value = '' }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 dark:text-slate-300 mb-1 ml-1 font-bold">
                      {localize("DisplayName:Password")} {!item && <span className="required-asterisk">*</span>}
                    </label>
                    <div className="relative group">
                      <input
                        name="password"
                        autoComplete="new-password"
                        type={showPassword ? "text" : "password"}
                        className={`w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 caret-slate-900 dark:caret-slate-100 border-0 ${validationErrors.password
                          ? "focus:ring-red-500/20"
                          : "focus:ring-blue-500/20"
                          } rounded-lg outline-none focus:ring-2 text-sm pr-12 transition-all duration-200 font-medium`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors text-xs font-semibold"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    {validationErrors.password && (
                      <p className="text-red-500 text-[9px] mt-1 ml-1">
                        {validationErrors.password}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 dark:text-slate-300 mb-1 ml-1 font-bold">
                      {localize("DisplayName:Email")}
                    </label>
                    <div className="relative group">
                      <input
                        name="email"
                        type="email"
                        defaultValue={userData?.email || ""}
                        className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 caret-slate-900 dark:caret-slate-100 border-0 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 text-sm pr-8 transition-all duration-200 font-medium"
                      />
                      <button type="button" onClick={(e) => { if (e.currentTarget.previousSibling) e.currentTarget.previousSibling.value = '' }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 dark:text-slate-300 mb-1 ml-1 font-bold">
                      {localize("DisplayName:PhoneNumber")} <span className="required-asterisk">*</span>
                    </label>
                    <div className="relative group">
                      <input
                        name="phoneNumber"
                        defaultValue={userData?.phoneNumber || ""}
                        className={`w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 caret-slate-900 dark:caret-slate-100 border-0 ${validationErrors.phoneNumber
                          ? "focus:ring-red-500/20"
                          : "focus:ring-blue-500/20"
                          } rounded-lg outline-none focus:ring-2 text-sm pr-8 transition-all duration-200 font-medium`}
                      />
                      <button type="button" onClick={(e) => { if (e.currentTarget.previousSibling) e.currentTarget.previousSibling.value = '' }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <X size={14} />
                      </button>
                    </div>
                    {validationErrors.phoneNumber && (
                      <p className="text-red-500 text-[9px] mt-1 ml-1">
                        {validationErrors.phoneNumber}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-5">
                    <div className="w-full">
                      <label className="block text-[10px] text-slate-500 dark:text-slate-300 mb-1 ml-1 font-bold">
                        {localize("DisplayName:OrganizationType")} <span className="required-asterisk">*</span>
                      </label>
                      <Autocomplete
                        size="small"
                        options={organizationTypeOptions}
                        getOptionLabel={(option) => option.label}
                        isOptionEqualToValue={(option, value) => option.value === value?.value}
                        value={
                          organizationTypeOptions.find(
                            (organizationType) => String(organizationType.value) === orgType,
                          ) || null
                        }
                        onChange={(event, newValue) => {
                          const value = newValue ? String(newValue.value) : "";
                          setOrgType(value);
                          if (value !== "1") {
                            setSelectedSite(null);
                          }
                          setValidationErrors((currentErrors) => ({
                            ...currentErrors,
                            organizationType: null,
                          }));
                        }}
                        slotProps={{
                          popper: { placement: "bottom-start" },
                          paper: {
                            sx: {
                              mt: 1,
                              borderRadius: "14px",
                              border: "none",
                              bgcolor: isDark ? "#0f172a" : "#ffffff",
                              color: isDark ? "#e2e8f0" : "#334155",
                              boxShadow: "0 18px 45px -18px rgba(15, 23, 42, 0.45)",
                              overflow: "hidden",
                            },
                          },
                        }}
                        ListboxProps={{
                          sx: {
                            p: 0.75,
                            "& .MuiAutocomplete-option": {
                              minHeight: 40,
                              borderRadius: "10px",
                              px: 1.5,
                              fontSize: "0.8125rem",
                              fontWeight: 700,
                              "&[aria-selected='true']": {
                                bgcolor: isDark ? "rgba(148, 163, 184, 0.16)" : "#f1f5f9",
                                color: isDark ? "#e2e8f0" : "#475569",
                              },
                              "&.Mui-focused": {
                                bgcolor: isDark ? "rgba(255,255,255,0.06)" : "#f8fafc",
                              },
                            },
                          },
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Select organization type"
                            error={!!validationErrors.organizationType}
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                minHeight: "44px",
                                borderRadius: "12px",
                                px: "10px !important",
                                bgcolor: isDark ? "#1e293b" : "#f1f5f9",
                                fontSize: "0.875rem",
                                fontWeight: 700,
                                color: isDark ? "#f1f5f9" : "#334155",
                                transition: "all 0.2s ease",
                                "& fieldset": {
                                  border: "none",
                                },
                                "&:hover fieldset": {
                                  border: "none",
                                },
                                "&.Mui-focused": {
                                  boxShadow: validationErrors.organizationType
                                    ? "0 0 0 4px rgba(239, 68, 68, 0.1)"
                                    : "0 0 0 4px rgba(100, 116, 139, 0.14)",
                                },
                                "&.Mui-focused fieldset": {
                                  border: "none",
                                },
                              },
                              "& .MuiInputBase-input::placeholder": {
                                color: isDark ? "#64748b" : "#94a3b8",
                                opacity: 1,
                              },
                              "& .MuiSvgIcon-root": {
                                color: isDark ? "#94a3b8" : "#64748b",
                              },
                            }}
                          />
                        )}
                      />
                      {validationErrors.organizationType && (
                        <p className="text-red-500 text-[9px] mt-1 ml-1">
                          {validationErrors.organizationType}
                        </p>
                      )}
                    </div>

                    {orgType === "1" && (
                      <div className="w-full">
                        <label className="block text-[10px] text-slate-500 dark:text-slate-300 mb-1 ml-1 font-bold">
                        {localize("DisplayName:SiteId")} <span className="required-asterisk">*</span>
                        </label>
                        <Autocomplete
                          size="small"
                          options={sites}
                          getOptionKey={(option) => option.id}
                          getOptionLabel={(option) =>
                            option.name || option.Name || String(option.id || "")
                          }
                          isOptionEqualToValue={(option, value) => option.id === value?.id}
                          value={selectedSite}
                          onChange={(e, newValue) => {
                            setSelectedSite(newValue);
                          }}
                          slotProps={{
                            popper: {
                              placement: "bottom-start",
                              modifiers: [
                                { name: "flip", enabled: false },
                                { name: "preventOverflow", enabled: false },
                              ],
                            },
                            paper: {
                              sx: {
                                mt: 1,
                                borderRadius: "0.75rem",
                                boxShadow:
                                  "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                                border: "none",
                                backgroundColor: isDark ? "#0f172a" : "#ffffff",
                                color: isDark ? "#e2e8f0" : "#334155",
                              },
                            },
                          }}
                          ListboxProps={{
                            sx: {
                              maxHeight: "160px",
                              fontSize: "0.875rem",
                              padding: "0.5rem",
                              "&::-webkit-scrollbar": { display: "none" },
                              msOverflowStyle: "none",
                              scrollbarWidth: "none",
                              "& .MuiAutocomplete-option": {
                                borderRadius: "0.5rem",
                                padding: "6px 12px",
                                minHeight: "auto",
                                color: isDark ? "#e2e8f0" : "#475569",
                                "&[aria-selected='true']": {
                                  backgroundColor: isDark
                                    ? "rgba(148, 163, 184, 0.16)"
                                    : "#f1f5f9",
                                },
                                "&.Mui-focused": {
                                  backgroundColor: isDark
                                    ? "rgba(255,255,255,0.06)"
                                    : "#f8fafc",
                                },
                              },
                            },
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder="Select Site"
                              sx={{
                                "& .MuiOutlinedInput-root": {
                                  borderRadius: "0.5rem",
                                  fontSize: "0.875rem",
                                  padding: "0px 9px !important",
                                  minHeight: "42px",
                                  backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
                                  color: isDark ? "#f1f5f9" : "#334155",
                                  transition: "all 0.2s",
                                  "& fieldset": {
                                    border: "none",
                                  },
                                  "&:hover fieldset": {
                                    border: "none",
                                  },
                                  "&.Mui-focused fieldset": {
                                    border: "none",
                                  },
                                  "&.Mui-focused": {
                                    boxShadow: validationErrors.siteId
                                      ? "0 0 0 4px rgba(239, 68, 68, 0.1)"
                                      : "0 0 0 4px rgba(100, 116, 139, 0.14)",
                                  },
                                },
                                "& .MuiSvgIcon-root": {
                                  color: isDark ? "#94a3b8" : "#64748b",
                                },
                              }}
                            />
                          )}
                        />
                        {validationErrors.siteId && (
                          <p className="text-red-500 text-[9px] mt-1 ml-1">
                            {validationErrors.siteId}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {isAdmin && (
                    <>
                      <div>
                        <label className="block text-[10px] text-slate-500 dark:text-slate-300 mb-1 ml-1 font-bold">
                          {localize("DisplayName:BaseRateFirstHourAfterWorkingHours")}
                        </label>
                        <input
                          name="baseRateFirstHourAfterWorkingHours"
                          type="number"
                          step="0.01"
                          defaultValue={userData?.baseRateFirstHourAfterWorkingHours || ""}
                          className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 caret-slate-900 dark:caret-slate-100 border-0 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 text-sm transition-all duration-200 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 dark:text-slate-300 mb-1 ml-1 font-bold">
                          {localize("DisplayName:BaseRateAfterFirstHourAfterWorkingHours")}
                        </label>
                        <input
                          name="baseRateAfterFirstHourAfterWorkingHours"
                          type="number"
                          step="0.01"
                          defaultValue={userData?.baseRateAfterFirstHourAfterWorkingHours || ""}
                          className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 caret-slate-900 dark:caret-slate-100 border-0 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 text-sm transition-all duration-200 font-medium"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Checkboxes */}
                <div className="flex flex-col gap-3 bg-transparent rounded-xl p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isPrimary"
                      defaultChecked={userData?.isPrimary}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-200 font-semibold">
                      {localize("DisplayName:IsPrimary")}
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isITS"
                      defaultChecked={userData?.isITS}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-200 font-semibold">
                      {localize("DisplayName:IsITS")}
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isActive"
                      defaultChecked={userData ? userData.isActive : true}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-200 font-semibold">
                      {localize("DisplayName:IsActive")}
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="lockoutEnabled"
                      defaultChecked={userData ? userData.lockoutEnabled : true}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-200 font-semibold">
                      {localize("DisplayName:LockoutEnabled")}
                    </span>
                  </label>
                  {isAdmin && (
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="mustCompleteJobsheet"
                        defaultChecked={userData?.mustCompleteJobsheet}
                        className="w-4 h-4 rounded text-blue-600 border-slate-300"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-200 font-semibold">
                        {localize("DisplayName:MustCompleteJobsheet")}
                      </span>
                    </label>
                  )}
                </div>
              </div>

              {/* TAB 2: ROLES */}
              {canManageUserRoles && (
                <div style={{ display: tabIndex === 1 ? "block" : "none" }}>
                  <div className="flex flex-col gap-2 w-full p-4 py-6">
                  <p className="text-[11px] text-slate-400 font-bold mb-6 text-center uppercase tracking-wider">
                    Assign Roles to User {!item && <span className="required-asterisk">*</span>}
                  </p>
                  {validationErrors.roles && (
                    <div
                      role="alert"
                      className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-[11px] font-bold text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400"
                    >
                      {validationErrors.roles}
                    </div>
                  )}
                  {availableRoles
                    .slice((rolesPage - 1) * rolesPerPage, rolesPage * rolesPerPage)
                    .map((roleObj) => {
                      const roleName = typeof roleObj === "object" ? roleObj.name : roleObj;
                      if (!roleName) return null;
                      const isChecked = selectedRoles.some(
                        (r) =>
                          typeof r === "string" &&
                          r.toLowerCase() === roleName.toLowerCase()
                      );
                      const displayRole = roleName.charAt(0).toUpperCase() + roleName.slice(1);
                      return (
                        <label
                          key={roleName}
                          className="flex items-center gap-3 p-3 border-2 border-slate-100 dark:border-slate-700 rounded-xl hover:bg-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 dark:hover:bg-white/5 cursor-pointer transition-all duration-200 group"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleRole(roleName)}
                            className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-[#ec4899] transition-colors">
                            {displayRole}
                          </span>
                        </label>
                      );
                    })}

                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-800/50 p-1 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm mx-auto">
                      <button
                        type="button"
                        onClick={() => setRolesPage(1)}
                        disabled={rolesPage === 1}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                        title="First Page"
                      >
                        <ChevronsLeft size={14} strokeWidth={2.5} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRolesPage((prev) => Math.max(1, prev - 1))}
                        disabled={rolesPage === 1}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                        title="Previous Page"
                      >
                        <ChevronLeft size={14} strokeWidth={2.5} />
                      </button>

                      <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1"></div>

                      <div className="px-3 flex items-center gap-2 py-1">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          Page
                        </span>
                        <div className="flex items-center gap-1.5 min-w-[40px] justify-center">
                          <span className="text-[11px] font-black text-pink-600 dark:text-pink-400 tabular-nums leading-none">
                            {rolesPage}
                          </span>
                          <span className="text-[10px] font-black text-slate-300 dark:text-slate-600">
                            /
                          </span>
                          <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 tabular-nums leading-none">
                            {Math.ceil(availableRoles.length / rolesPerPage) || 1}
                          </span>
                        </div>
                      </div>

                      <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1"></div>

                      <button
                        type="button"
                        onClick={() =>
                          setRolesPage((prev) =>
                            Math.min(
                              Math.ceil(availableRoles.length / rolesPerPage),
                              prev + 1
                            )
                          )
                        }
                        disabled={rolesPage === Math.ceil(availableRoles.length / rolesPerPage)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                        title="Next Page"
                      >
                        <ChevronRight size={14} strokeWidth={2.5} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setRolesPage(Math.ceil(availableRoles.length / rolesPerPage))
                        }
                        disabled={rolesPage === Math.ceil(availableRoles.length / rolesPerPage)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                        title="Last Page"
                      >
                        <ChevronsRight size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>

          <div className="flex gap-2.5 px-6 py-4 bg-slate-50 dark:bg-[#1a1f2e] border-t border-slate-100 dark:border-slate-700 w-full rounded-b-[24px]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-200 dark:border-slate-700 h-[38px] text-[11px] text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 font-bold rounded-xl transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="app-primary-button flex-1 h-[38px] text-[11px]"
            >
              {loading
                ? localize("SavingWithThreeDot")
                : item
                  ? localize("Save")
                  : localize("Permission:Create")}
            </button>
          </div>
        </form>
      </Dialog>
    );
  };

  const ActionsMenu = ({ row }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const { user } = useAuth();
    const isTicketing = user?.role?.toLowerCase().includes("ticketing");
    const showPermissions = canUpdate && canManagePermissions && !isTicketing;

    // If the user has no rights to edit or delete, do not display the actions button
    if (!canUpdate && !canDelete) {
      return null;
    }

    return (
      <ClickAwayListener onClickAway={(e) => { setAnchorEl(null); }}>
        <div className="inline-block relative">
          <button
            onClick={(e) => {
              setAnchorEl(open ? null : e.currentTarget);
            }}
            className={`text-pink-500 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-950/30 border hover:border-pink-500 transition-all text-[11px] px-4 py-1.5 flex items-center justify-center gap-1 rounded-xl font-bold tracking-wider  shadow-sm ${open ? 'bg-pink-50 dark:bg-pink-950/30 border-pink-500' : 'bg-transparent border-pink-500/20'}`}
          >
            {localize("Actions")} <ChevronDown size={10} strokeWidth={2.5} className="transition-transform group-hover:rotate-90" />
          </button>
          <Popper
            open={open}
            anchorEl={anchorEl}
            placement="bottom-end"
            style={{ zIndex: 1300 }}
          >
            <Paper
              elevation={8}
              sx={{
                mt: 0.5,
                borderRadius: "12px",
                border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.05)",
                bgcolor: isDark ? "#0f172a" : "#ffffff",
                color: isDark ? "#f1f5f9" : "inherit",
                minWidth: 140,
                overflow: 'hidden'
              }}
            >
              <MenuList>
                {canUpdate && (
                  <MenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setAnchorEl(null);
                      handleEditOpen(row);
                    }}
                    sx={{ py: 1, "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" } }}
                  >
                    <ListItemText primary={localize("Edit")} primaryTypographyProps={{ fontSize: "12px", fontWeight: 600 }} />
                  </MenuItem>
                )}
                {showPermissions && (
                  <MenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setAnchorEl(null);
                      handlePermissions(row);
                    }}
                    sx={{ py: 1, "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" } }}
                  >
                    <ListItemText primary={localize("Permissions")} primaryTypographyProps={{ fontSize: "12px", fontWeight: 600 }} />
                  </MenuItem>
                )}
                {canDelete && row.userName?.toLowerCase() !== "admin" && (
                  <MenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setAnchorEl(null);
                      setTimeout(() => handleDelete(row), 50);
                    }}
                    sx={{ py: 1, "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" } }}
                  >
                    <ListItemText
                      primary={localize("Delete")}
                      primaryTypographyProps={{ fontSize: "12px", fontWeight: 600, color: "error.main" }}
                    />
                  </MenuItem>
                )}
              </MenuList>
            </Paper>
          </Popper>
        </div>
      </ClickAwayListener>
    );
  };

  return (
    <div className="min-h-full w-full bg-[#f8fafc] dark:bg-slate-950 p-1 pb-[10px] flex flex-col relative overflow-visible font-[Arial]">
      <style>{`
        *::-webkit-scrollbar { display: none !important; }
        * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
        
        .custom-scrollbar::-webkit-scrollbar:horizontal { height: 8px; display: block !important; }
        .custom-scrollbar::-webkit-scrollbar:vertical { display: none !important; width: 0 !important; }
        .custom-scrollbar { scrollbar-width: thin !important; }
        .custom-scrollbar::-webkit-scrollbar-track:horizontal { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb:horizontal { background-color: #cbd5e1; border-radius: 20px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:horizontal,
        :is(.dark) .custom-scrollbar::-webkit-scrollbar-thumb:horizontal,
        html.dark .custom-scrollbar::-webkit-scrollbar-thumb:horizontal { background-color: #334155 !important; border-radius: 20px; }
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
            <span className="text-pink-500">Users</span>
          </nav>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">

              <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                {localize("Users")}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {canCreate && (
                <button
                  onClick={handleCreateOpen}
                  className="app-primary-button inline-flex items-center px-5 py-2.5 text-xs"
                >
                  {localize("NewUser")}
                </button>
              )}
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
                placeholder="Search users by name, email or phone..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-11 pr-10 py-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/50 text-sm outline-none transition-all focus:border-pink-600 focus:ring-4 focus:ring-pink-600/10 shadow-sm font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full"
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              )}
            </div>

            {/* Show Customer toggle directly in the toolbar */}
            <div className="flex items-center gap-3 bg-white/80 dark:bg-slate-900/40 px-4 py-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/50 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
                Show Customer
              </span>
              <button
                type="button"
                onClick={() => {
                  toggleFilter("isCustomer");
                  setPage(1);
                }}
                className={`relative w-8 h-4.5 rounded-full transition-colors duration-200 focus:outline-none shrink-0 border ${filters.isCustomer
                  ? "bg-pink-500 border-pink-500"
                  : "bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                  }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${filters.isCustomer ? "translate-x-3.5" : "translate-x-0"
                    }`}
                />
              </button>
            </div>
          </div>
        </div>


        {/* Table Area */}
        <div className="flex-1 flex flex-col min-h-0 relative px-6 pb-6 pt-2 overflow-visible">

          <div className="overflow-x-auto flex-1 min-h-0 custom-scrollbar pb-2">
            <table className="w-full text-left border-separate border-spacing-y-1 min-w-max">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 h-[56px]">
                  <th className="px-5 h-[56px] text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 pl-8">
                    Display Name
                  </th>
                  <th className="px-5 h-[56px] text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Username
                  </th>
                  <th className="px-5 h-[56px] text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Email Address
                  </th>
                  <th className="px-5 h-[56px] text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Phone Number
                  </th>
                  <th className="px-5 h-[56px] text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    User Type
                  </th>
                  <th className="px-5 h-[56px] text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Site Name
                  </th>
                  <th className="px-5 h-[56px] text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center">
                    Primary
                  </th>
                  <th className="px-5 h-[56px] text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-right pr-8">
                    {localize("Actions")}
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

                {users.length === 0 && !loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-32 text-center text-sm font-black text-slate-400 uppercase tracking-widest"
                    >
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((row, idx) => {
                    const orgTypeVal = row.organizationType ?? row.extraProperties?.organizationType;
                    const isPrimaryVal = row.isPrimary ?? row.extraProperties?.isPrimary;
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
                          {row.name}
                        </td>
                        <td className={`px-5 ${ROW_HEIGHT} text-[12px] font-medium text-slate-700 dark:text-slate-300`}>
                          {row.userName}
                        </td>
                        <td className={`px-5 ${ROW_HEIGHT} text-[12px] font-medium text-slate-500 dark:text-slate-400`}>
                          {row.email || "-"}
                        </td>
                        <td className={`px-5 ${ROW_HEIGHT} text-[12px] font-medium text-slate-500 dark:text-slate-400`}>
                          {row.phoneNumber || "-"}
                        </td>
                        <td className={`px-5 ${ROW_HEIGHT} text-[12px] font-medium text-slate-500 dark:text-slate-400`}>
                          {getOrganizationTypeName(orgTypeVal)}
                        </td>
                        <td className={`px-5 ${ROW_HEIGHT} text-[12px] font-medium text-slate-500 dark:text-slate-400`}>
                          {row.siteName || "-"}
                        </td>
                        <td className={`px-5 ${ROW_HEIGHT} text-[12px] font-medium text-slate-500 dark:text-slate-400 text-center`}>
                          <div className="flex items-center justify-center">
                            <div
                              className={`w-3 h-3 rounded-full ${isPrimaryVal
                                ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                : "bg-slate-200 dark:bg-slate-700"
                                }`}
                            />
                          </div>
                        </td>
                        <td className={`px-5 ${ROW_HEIGHT} text-[12px] font-medium text-slate-500 dark:text-slate-400 text-right pr-8 rounded-r-2xl`}>
                          <ActionsMenu row={row} />
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
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400 tracking-wider">Rows per page:</span>
                  <AppSelect
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1); // Reset to first page when changing page size
                    }}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-pink-500/50"
                  >
                    {[14, 25, 50, 100].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </AppSelect>
                </div>
                <div className="text-[11px] font-bold text-slate-400 tracking-wider">
                  Showing <span className="text-pink-500">{(page - 1) * pageSize + 1}</span> to{" "}
                  <span className="text-pink-500">{Math.min(page * pageSize, totalCount)}</span> of{" "}
                  <span className="text-pink-500">{totalCount}</span> users
                </div>
              </div>
              <div className="flex items-center gap-1 bg-white dark:bg-slate-800/50 p-1 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm">
                <button
                  type="button"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  title="First Page"
                >
                  <ChevronsLeft size={16} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  title="Previous Page"
                >
                  <ChevronLeft size={16} strokeWidth={2.5} />
                </button>

                <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1"></div>

                <div className="px-3 flex items-center gap-2 py-1 select-none">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Page
                  </span>
                  <div className="flex items-center gap-1.5 min-w-[40px] justify-center">
                    <span className="text-[12px] font-black text-pink-600 dark:text-pink-400 tabular-nums">
                      {page}
                    </span>
                    <span className="text-[10px] font-black text-slate-300 dark:text-slate-600">/</span>
                    <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 tabular-nums">
                      {totalPages}
                    </span>
                  </div>
                </div>

                <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1"></div>

                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  title="Next Page"
                >
                  <ChevronRight size={16} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  title="Last Page"
                >
                  <ChevronsRight size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Edit / Create Modal */}
      <UserModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        item={activeItem}
        onSubmit={handleModalSubmit}
        loading={modalLoading}
        submitError={submitError}
      />

      {/* Delete Confirmation Card - Custom Overlay */}
      {deleteUser && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 9999 }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteUser(null); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Card */}
          <div
            className={`relative rounded-3xl p-6 w-[340px] flex flex-col items-center gap-4 shadow-2xl ${isDark ? 'bg-[#0f172a] border border-white/5' : 'bg-white border border-slate-100'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center border-4 border-rose-100 dark:border-rose-500/20">
              <X size={30} className="text-rose-500" strokeWidth={3} />
            </div>

            {/* Text */}
            <div className="text-center">
              <h3 className="text-[17px] font-black text-slate-800 dark:text-slate-100 mb-1">
                Confirm Deletion
              </h3>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Are you sure you want to delete{" "}
                <strong className="text-rose-500">{deleteUser?.userName}</strong>?
                <br />This action cannot be undone.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 w-full pt-1">
              <button
                onClick={() => setDeleteUser(null)}
                className="flex-1 font-bold text-[12px] h-[42px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
              >
                {localize("Cancel")}
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 font-bold text-[12px] h-[42px] bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-all shadow-md shadow-rose-500/20 active:scale-95"
              >
                {localize("Delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Material UI Permissions Dialog */}
      <Dialog
        open={Boolean(permissionUser)}
        onClose={handleClosePermissions}
        maxWidth="sm"
        fullWidth
        disableScrollLock={true}
        PaperProps={{
          sx: {
            borderRadius: "20px",
            backgroundImage: "none",
            backgroundColor: isDark ? "#0f172a" : "#ffffff",
            boxShadow: isDark ? "0 25px 50px -12px rgba(0, 0, 0, 0.5)" : "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          },
        }}
      >
        <DialogTitle className="flex items-center justify-between px-6 pt-5 pb-2">
          <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
            {localize("Permissions")} - {permissionUser?.userName}
          </span>
          <button
            type="button"
            onClick={handleClosePermissions}
            className="p-1.5 text-slate-400 hover:text-[#ec4899] dark:hover:text-[#ec4899] transition-colors rounded-lg bg-slate-100 dark:bg-slate-800"
          >
            <X size={16} />
          </button>
        </DialogTitle>
        <DialogContent sx={{ border: "none" }}>
          {loadingPermissions ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="animate-spin text-pink-500" size={32} />
            </div>
          ) : (
            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-3">
              {permissionsData?.groups && (
                <div className="flex justify-end items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <input
                      type="checkbox"
                      id="grant-all-permissions"
                      checked={
                        permissionsData.groups.flatMap((group) => group.permissions)
                          .length > 0 &&
                        permissionsData.groups
                          .flatMap((group) => group.permissions)
                          .every((permission) => checkedPerms[permission.name])
                      }
                      onChange={(event) => handleGrantAll(event.target.checked)}
                      className="w-4 h-4 rounded ring-offset-0 focus:ring-0 cursor-pointer accent-pink-500 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-600 text-pink-500"
                    />
                    <label
                      htmlFor="grant-all-permissions"
                      className="text-sm text-slate-700 dark:text-slate-200 cursor-pointer font-medium"
                    >
                      {localize("SelectAllInAllTabs")}
                    </label>
                  </div>
                </div>
              )}

              {/* Render permissions if available */}
              {permissionsData?.groups?.map((group, idx) => {
                const groupPerms = group.permissions;
                const isAllChecked =
                  groupPerms.length > 0 &&
                  groupPerms.every((permission) => checkedPerms[permission.name]);
                const isExpanded = !!expandedGroups[group.name];

                return (
                  <div
                    key={idx}
                    className="mb-3"
                  >
                    {/* Collapsible Header */}
                    <div
                      onClick={() => toggleGroup(group.name)}
                      className="flex items-center justify-between px-4 py-2.5 bg-slate-100 dark:bg-slate-800/40 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800/80 cursor-pointer transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
                          <ChevronDown size={18} className="text-slate-500 group-hover:text-[#ec4899]" />
                        </div>
                        <h4 className="text-slate-800 dark:text-slate-200 text-[14px] font-bold uppercase tracking-wider">
                          {group.displayName}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          id={`select-all-${group.name}`}
                          checked={isAllChecked}
                          onChange={(event) =>
                            handleSelectAllGroup(group.name, event.target.checked)
                          }
                          className="w-4 h-4 rounded ring-offset-0 focus:ring-0 cursor-pointer accent-pink-500 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-600 text-pink-500"
                        />
                        <label
                          htmlFor={`select-all-${group.name}`}
                          className="text-[10px] text-slate-500 uppercase font-black tracking-widest cursor-pointer hover:text-[#ec4899] transition-colors"
                        >
                          {localize("SelectAllInThisTab")}
                        </label>
                      </div>
                    </div>

                    {/* Drop Down Menu (Content) */}
                    {isExpanded && (
                      <div className="mt-2 ml-2 p-3 bg-slate-50 dark:bg-slate-800/20 rounded-xl animate-in slide-in-from-top-2 duration-200">
                        <PermissionTree
                          permissions={groupPerms}
                          parentName={null}
                          checkedPerms={checkedPerms}
                          lockedPerms={lockedPerms}
                          onToggle={handleTogglePerm}
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {!permissionsData?.groups?.length && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-center text-slate-500 dark:text-slate-400">
                  {localize("NoDataAvailableInDatatable")}
                </div>
              )}
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1.5, backgroundColor: isDark ? "#0f172a" : "#f8fafc", borderTop: isDark ? "1px solid #1e293b" : "1px solid #e2e8f0" }}>
          <button
            onClick={() => handleClosePermissions()}
            className={`flex-1 border h-[38px] text-[11px] font-bold rounded-xl transition-all duration-200 ${isDark ? 'border-slate-700 text-slate-400 hover:bg-white/5' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
          >
            {localize("Cancel")}
          </button>
          <button
            onClick={handleSavePermissions}
            disabled={loadingPermissions}
            className="app-primary-button flex-1 h-[38px] text-[11px]"
          >
            {loadingPermissions
              ? localize("SavingWithThreeDot")
              : localize("Save")}
          </button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
