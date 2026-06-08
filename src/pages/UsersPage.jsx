import { useState, useMemo, useEffect, useCallback } from "react";
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
      className={`space-y-2 ${parentName ? "ml-6 mt-2 border-l-2 border-slate-200 dark:border-slate-700/50 pl-4" : "mt-2"}`}
    >
      {children.map((perm) => (
        <div key={perm.name} className="flex flex-col">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id={perm.name}
              checked={!!checkedPerms[perm.name]}
              onChange={(e) => onToggle(perm, e.target.checked)}
              className="w-4 h-4 rounded ring-offset-0 focus:ring-0 cursor-pointer accent-pink-500 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-600 text-pink-500"
            />
            <label
              htmlFor={perm.name}
              className={`text-sm cursor-pointer ${parentName ? "text-slate-600 dark:text-slate-400" : "text-slate-800 dark:text-slate-200 font-bold"}`}
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

export default function UsersPage() {
  const { toast } = useToast();
  const { dark } = useTheme();
  const isDark = dark === "dark";

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
  const [expandedGroups, setExpandedGroups] = useState({});

  const canCreate = usePermission("AbpIdentity.Users.Create");

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
      // Step 1 — get permission structure for display
      const userPerms = await usersApi.getPermissions(user.id);
      setPermissionsData(userPerms);

      // Step 2 — get user's role
      const userRolesObj = await usersApi.getUserRoles(user.id);
      const userRoles = userRolesObj?.items || [];

      // Store role name for saving later
      const roleName = userRoles[0]?.name || null;
      setPermissionUser(prev => ({ ...prev, roleName }));

      // Step 3 — fetch role permissions and use them as checked state
      const initial = {};

      // First set all to false
      userPerms.groups?.forEach((g) => {
        g.permissions.forEach((p) => {
          initial[p.name] = false;
        });
      });

      // Then check what role has
      if (roleName) {
        try {
          const rolePerms = await rolesApi.getPermissions("R", roleName);
          rolePerms.groups?.forEach((g) => {
            g.permissions.forEach((p) => {
              if (p.isGranted) {
                initial[p.name] = true; // ✅ show role permissions as checked
              }
            });
          });
        } catch (err) {
          console.warn("Failed to fetch role permissions:", err);
        }
      }

      setCheckedPerms(initial);
    } catch (err) {
      toast(`Failed to load permissions: ${err.message}`, "error");
    } finally {
      setLoadingPermissions(false);
    }
  };
  const handleClosePermissions = () => {
    setPermissionUser(null);
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
    setLoadingPermissions(true);
    try {
      const roleName = permissionUser?.roleName;

      if (!roleName) {
        toast("No role found for this user", "error");
        setLoadingPermissions(false);
        return;
      }

      // ✅ Save to ROLE, not user-level
      const payload = {
        permissions: Object.entries(checkedPerms).map(([name, isGranted]) => ({
          name,
          isGranted: !!isGranted,
        })),
      };

      await rolesApi.updatePermissions("R", roleName, payload);
      toast(`Permissions for role "${roleName}" updated successfully`);
      handleClosePermissions();
    } catch (err) {
      toast(`Failed to save permissions: ${err.message}`, "error");
    } finally {
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
      // Auto-check parents
      const allPerms = permissionsData.groups.flatMap((g) => g.permissions);
      let currentParentName = perm.parentName;
      while (currentParentName) {
        updated[currentParentName] = true;
        const parentObj = allPerms.find((p) => p.name === currentParentName);
        currentParentName = parentObj ? parentObj.parentName : null;
      }
    } else {
      // Auto-uncheck children
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

  const handleCreateOpen = () => {
    setActiveItem(null);
    setSubmitError("");
    setIsModalOpen(true);
  };

  const handleEditOpen = (row) => {
    setActiveItem(row);
    setSubmitError("");
    setIsModalOpen(true);
  };

  const handleDelete = (row) => {
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

        usersApi
          .getAssignableRoles()
          .then((res) => setAvailableRoles(res.items || res || []))
          .catch((e) => console.error("Error fetching assignable roles", e));

        if (item) {
          setIsLoadingData(true);
          Promise.all([
            usersApi.getById(item.id).catch((e) => {
              console.error("Error fetching getById:", e);
              return null;
            }),
            usersApi.getUserRoles(item.id).catch((e) => {
              console.error("Error fetching getUserRoles:", e);
              return null;
            }),
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
              } else if (item.roleNames) {
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
      setSelectedRoles((prev) => {
        const found = prev.find(
          (r) =>
            typeof r === "string" &&
            typeof role === "string" &&
            r.toLowerCase() === role.toLowerCase()
        );
        return found ? prev.filter((r) => r !== found) : [...prev, role];
      });
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
      if (!item && !data.password?.trim())
        errors.password = "The Password field is required";
      if (!data.phoneNumber?.trim())
        errors.phoneNumber = "The Phone number field is required";
      if (!orgType || orgType === "" || orgType === "0") {
        errors.organizationType = "The Organization Type field is required";
      }
      if (orgType === "1" && !selectedSite) {
        errors.siteId = "Site is required for Customer organization type";
      }

      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        setTabIndex(0);
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
        mustCompleteJobsheet: formData.get("mustCompleteJobsheet") === "on",
        isITS: formData.get("isITS") === "on",
        isActive: formData.get("isActive") === "on",
        lockoutEnabled: formData.get("lockoutEnabled") === "on",
        baseRateFirstHourAfterWorkingHours:
          parseFloat(data.baseRateFirstHourAfterWorkingHours) || 0,
        baseRateAfterFirstHourAfterWorkingHours:
          parseFloat(data.baseRateAfterFirstHourAfterWorkingHours) || 0,
        roleNames: selectedRoles,
      };

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
          },
        }}
      >
        <div className="bg-white dark:bg-slate-900 px-6 py-5 border-b border-slate-100 dark:border-slate-700 shrink-0 flex justify-between items-center">
          <h2 className="text-base font-bold dark:text-white text-slate-800 flex items-center gap-2">
            {item ? "Edit User" : "Create User"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-[#ec4899] dark:hover:text-[#ec4899] transition-colors rounded-lg bg-slate-50 dark:bg-slate-800"
          >
            <X size={16} />
          </button>
        </div>

        <form
          key={userData ? `${userData.id}-${userData.concurrencyStamp}` : "new"}
          onSubmit={handleSubmit}
          noValidate
          autoComplete="off"
        >
          <DialogContent dividers sx={{ minHeight: "400px", p: 0, position: "relative" }}>
            {isLoadingData && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-slate-900/80">
                <p className="text-sm text-slate-500 animate-pulse">Loading user details...</p>
              </div>
            )}
            <Box sx={{ borderBottom: 1, borderColor: "divider", px: 3, pt: 1 }}>
              <Tabs
                value={tabIndex}
                onChange={(e, val) => setTabIndex(val)}
                indicatorColor="primary"
                textColor="primary"
              >
                <Tab label="User Information" sx={{ fontWeight: "bold" }} />
                <Tab label="Roles" sx={{ fontWeight: "bold" }} />
              </Tabs>
            </Box>

            <div className="p-4">
              {submitError && (
                <PremiumErrorAlert
                  open={!!submitError}
                  message={submitError}
                  onClose={() => { }}
                />
              )}

              {/* TAB 1: USER INFORMATION */}
              <div style={{ display: tabIndex === 0 ? "block" : "none" }}>
                <div className="flex flex-col gap-2 mb-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1 ml-1 font-bold">
                      User name *
                    </label>
                    <input
                      name="userName"
                      autoComplete="new-password"
                      defaultValue={userData?.userName || ""}
                      className={`w-full px-3 py-1.5 bg-transparent border ${validationErrors.userName
                        ? "border-red-500 focus:ring-red-500/20"
                        : "border-slate-200 dark:border-slate-700 focus:ring-blue-500/20"
                        } rounded-lg outline-none focus:ring-2 text-sm transition-all duration-200 font-medium`}
                    />
                    {validationErrors.userName && (
                      <p className="text-red-500 text-[9px] mt-1 ml-1">
                        {validationErrors.userName}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1 ml-1 font-bold">
                      Name *
                    </label>
                    <input
                      name="name"
                      defaultValue={userData?.name || ""}
                      className={`w-full px-3 py-1.5 bg-transparent border ${validationErrors.name
                        ? "border-red-500 focus:ring-red-500/20"
                        : "border-slate-200 dark:border-slate-700 focus:ring-blue-500/20"
                        } rounded-lg outline-none focus:ring-2 text-sm transition-all duration-200 font-medium`}
                    />
                    {validationErrors.name && (
                      <p className="text-red-500 text-[9px] mt-1 ml-1">
                        {validationErrors.name}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1 ml-1 font-bold">
                      Surname
                    </label>
                    <input
                      name="surname"
                      defaultValue={userData?.surname || ""}
                      className="w-full px-3 py-1.5 bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 text-sm transition-all duration-200 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1 ml-1 font-bold">
                      Password {item ? "(Leave blank to keep)" : "*"}
                    </label>
                    <div className="relative">
                      <input
                        name="password"
                        autoComplete="new-password"
                        type={showPassword ? "text" : "password"}
                        className={`w-full px-3 py-1.5 bg-transparent border ${validationErrors.password
                          ? "border-red-500 focus:ring-red-500/20"
                          : "border-slate-200 dark:border-slate-700 focus:ring-blue-500/20"
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
                    <label className="block text-[10px] text-slate-500 mb-1 ml-1 font-bold">
                      Email Address
                    </label>
                    <input
                      name="email"
                      type="email"
                      defaultValue={userData?.email || ""}
                      className="w-full px-3 py-1.5 bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 text-sm transition-all duration-200 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1 ml-1 font-bold">
                      Phone Number *
                    </label>
                    <input
                      name="phoneNumber"
                      defaultValue={userData?.phoneNumber || ""}
                      className={`w-full px-3 py-1.5 bg-transparent border ${validationErrors.phoneNumber
                        ? "border-red-500 focus:ring-red-500/20"
                        : "border-slate-200 dark:border-slate-700 focus:ring-blue-500/20"
                        } rounded-lg outline-none focus:ring-2 text-sm transition-all duration-200 font-medium`}
                    />
                    {validationErrors.phoneNumber && (
                      <p className="text-red-500 text-[9px] mt-1 ml-1">
                        {validationErrors.phoneNumber}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <div className="w-full">
                      <label className="block text-[10px] text-slate-500 mb-1 ml-1 font-bold">
                        Organization Type *
                      </label>
                      <select
                        name="organizationType"
                        value={orgType}
                        onChange={(e) => {
                          const val = e.target.value;
                          setOrgType(val);
                          if (val !== "1") {
                            setSelectedSite(null);
                          }
                        }}
                        className={`w-full px-3 py-1.5 bg-transparent border ${validationErrors.organizationType
                          ? "border-red-500 focus:ring-red-500/20"
                          : "border-slate-200 dark:border-slate-700 focus:ring-blue-500/20"
                          } rounded-lg outline-none focus:ring-2 text-sm transition-all duration-200 font-bold`}
                      >
                        <option value="" disabled>
                          Select an option
                        </option>
                        {ORGANIZATION_TYPES.map((org) => (
                          <option key={org.value} value={org.value}>
                            {org.label}
                          </option>
                        ))}
                      </select>
                      {validationErrors.organizationType && (
                        <p className="text-red-500 text-[9px] mt-1 ml-1">
                          {validationErrors.organizationType}
                        </p>
                      )}
                    </div>

                    {orgType === "1" && (
                      <div className="w-full">
                        <label className="block text-[10px] text-slate-500 mb-1 ml-1 font-bold">
                          Site *
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
                                border: "1px solid #e2e8f0",
                                ".dark &": {
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  backgroundColor: "slate-900",
                                },
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
                                  minHeight: "34px",
                                  backgroundColor: "transparent",
                                  transition: "all 0.2s",
                                  "& fieldset": {
                                    borderColor: validationErrors.siteId ? "#ef4444" : "#e2e8f0",
                                  },
                                  "&:hover fieldset": {
                                    borderColor: validationErrors.siteId ? "#ef4444" : "#cbd5e1",
                                  },
                                  "&.Mui-focused fieldset": {
                                    borderColor: validationErrors.siteId ? "#ef4444" : "#e2e8f0",
                                  },
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

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1 ml-1 font-bold">
                      Rate First Hour After Working Hours
                    </label>
                    <input
                      name="baseRateFirstHourAfterWorkingHours"
                      type="number"
                      step="0.01"
                      defaultValue={userData?.baseRateFirstHourAfterWorkingHours || ""}
                      className="w-full px-3 py-1.5 bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 text-sm transition-all duration-200 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1 ml-1 font-bold">
                      Rate After First Hour (Each 15 Min) After Working Hours
                    </label>
                    <input
                      name="baseRateAfterFirstHourAfterWorkingHours"
                      type="number"
                      step="0.01"
                      defaultValue={userData?.baseRateAfterFirstHourAfterWorkingHours || ""}
                      className="w-full px-3 py-1.5 bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 text-sm transition-all duration-200 font-medium"
                    />
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="flex flex-col gap-2 bg-transparent rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isPrimary"
                      defaultChecked={userData?.isPrimary}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-200 font-semibold">Primary</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isITS"
                      defaultChecked={userData?.isITS}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-200 font-semibold">ITS</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isActive"
                      defaultChecked={userData ? userData.isActive : false}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-200 font-semibold">Active</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="lockoutEnabled"
                      defaultChecked={userData ? userData.lockoutEnabled : false}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-200 font-semibold">
                      Account lockout
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="mustCompleteJobsheet"
                      defaultChecked={userData?.mustCompleteJobsheet}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-200 font-semibold">
                      Must Complete JobSheet
                    </span>
                  </label>
                </div>
              </div>

              {/* TAB 2: ROLES */}
              <div style={{ display: tabIndex === 1 ? "block" : "none" }}>
                <div className="flex flex-col gap-2 w-full p-4 py-6">
                  <p className="text-[11px] text-slate-400 font-bold mb-6 text-center uppercase tracking-wider">
                    Assign Roles to User
                  </p>
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
            </div>
          </DialogContent>

          <div className="flex gap-2.5 px-6 py-4 bg-slate-50 dark:bg-[#1a1f2e] border-t border-slate-100 dark:border-slate-700 w-full rounded-b-[24px]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-200 dark:border-slate-700 h-[38px] text-[11px] text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 font-bold rounded-xl transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold h-[38px] text-[11px] rounded-xl transition-all duration-200 shadow-md shadow-pink-500/10 active:scale-95 disabled:opacity-60 disabled:pointer-events-none"
            >
              {loading ? "Wait..." : item ? "Save" : "Create"}
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
    const canUpdate = usePermission("AbpIdentity.Users.Update");
    const canDelete = usePermission("AbpIdentity.Users.Delete");
    const canManagePermissions = usePermission("AbpIdentity.Users.ManagePermissions");
    const isTicketing = user?.role?.toLowerCase().includes("ticketing");
    const showPermissions = canUpdate && canManagePermissions && !isTicketing;

    // If the user has no rights to edit or delete, do not display the actions button
    if (!canUpdate && !canDelete) {
      return null;
    }

    return (
      <div className="inline-block relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setAnchorEl(open ? null : e.currentTarget);
          }}
          className={`text-pink-500 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-950/30 border hover:border-pink-500 transition-all text-[11px] px-4 py-1.5 flex items-center justify-center gap-1 rounded-xl font-bold tracking-wider  shadow-sm ${open ? 'bg-pink-50 dark:bg-pink-950/30 border-pink-500' : 'bg-transparent border-pink-500/20'}`}
        >
          Actions <ChevronDown size={10} strokeWidth={2.5} className="transition-transform group-hover:rotate-90" />
        </button>
        <Popper
          open={open}
          anchorEl={anchorEl}
          placement="bottom-end"
          style={{ zIndex: 1300 }}
        >
          <ClickAwayListener onClickAway={(e) => { if (e) e.stopPropagation(); setAnchorEl(null); }}>
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
                    <ListItemText primary="Edit" primaryTypographyProps={{ fontSize: "12px", fontWeight: 600 }} />
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
                    <ListItemText primary="Permission" primaryTypographyProps={{ fontSize: "12px", fontWeight: 600 }} />
                  </MenuItem>
                )}
                {canDelete && row.userName?.toLowerCase() !== "admin" && (
                  <MenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setAnchorEl(null);
                      handleDelete(row);
                    }}
                    sx={{ py: 1, "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" } }}
                  >
                    <ListItemText
                      primary="Delete"
                      primaryTypographyProps={{ fontSize: "12px", fontWeight: 600, color: "error.main" }}
                    />
                  </MenuItem>
                )}
              </MenuList>
            </Paper>
          </ClickAwayListener>
        </Popper>
      </div>
    );
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
            <span className="text-pink-500">Users</span>
          </nav>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">

              <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                Users
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {canCreate && (
                <button
                  onClick={handleCreateOpen}
                  className="inline-flex items-center px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-pink-500/20 transition-all bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white active:scale-95"
                >
                  New User
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

          <button
            onClick={fetchUsers}
            disabled={loading}
            className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/50 flex items-center justify-center text-slate-500 hover:text-pink-600 hover:border-pink-500/40 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            title="Refresh Users"
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
              <div className="text-[11px] font-bold text-slate-400 tracking-wider">
                Showing <span className="text-pink-500">{(page - 1) * pageSize + 1}</span> to{" "}
                <span className="text-pink-500">{Math.min(page * pageSize, totalCount)}</span> of{" "}
                <span className="text-pink-500">{totalCount}</span> users
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

      {/* Material UI Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteUser)}
        onClose={() => setDeleteUser(null)}
        maxWidth="xs"
        PaperProps={{
          sx: { borderRadius: "24px", padding: "4px", maxWidth: "340px", width: "100%" },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: "#1e293b", fontSize: "16px" }}>
          Confirm Deletion
        </DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          <div className="text-[13px] text-slate-600 dark:text-slate-400">
            Are you sure you want to delete the user{" "}
            <strong className="text-rose-500">{deleteUser?.userName}</strong>? This action cannot be undone.
          </div>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1.5 }}>
          <button
            onClick={() => setDeleteUser(null)}
            className="flex-1 font-bold text-[11px] h-[36px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={confirmDelete}
            className="flex-1 font-bold text-[11px] h-[36px] bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-all shadow-md shadow-rose-500/10 active:scale-95"
          >
            Delete
          </button>
        </DialogActions>
      </Dialog>

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
            backgroundColor: "#0f172a", // Dark Blue
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          },
        }}
      >
        <DialogTitle className="flex items-center justify-between px-6 pt-5 pb-2">
          <span className="text-lg font-bold text-slate-200">
            Permissions - {permissionUser?.userName}
          </span>
          <button
            type="button"
            onClick={handleClosePermissions}
            className="p-1.5 text-slate-400 hover:text-[#ec4899] dark:hover:text-[#ec4899] transition-colors rounded-lg bg-slate-50 dark:bg-slate-800"
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
            <div className="text-sm text-slate-400 space-y-3">
              <div className="flex justify-between items-center mb-4 pb-2">
                <p>
                  Control what <strong className="text-slate-200">{permissionUser?.userName}</strong> can do.
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
                    {/* Collapsible Header */}
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
            className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold h-[38px] text-[11px] rounded-xl transition-all duration-200 shadow-md shadow-pink-500/10 active:scale-95"
          >
            {loadingPermissions ? "Wait..." : "Save Changes"}
          </button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
