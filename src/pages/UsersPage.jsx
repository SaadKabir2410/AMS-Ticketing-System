import { useState, useMemo, useEffect } from "react";
import ResourcePage from "../component/common/ResourcePage";
import { useToast } from "../component/common/ToastContext";
import CircularProgress from "@mui/material/CircularProgress";
import { usersApi } from "../services/api/users";
import {
  ORGANIZATION_TYPES,
  getOrganizationTypeName,
} from "../constants/userTypes";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";

import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import apiClient from "../services/apiClient";

export default function UsersPage() {
  const { toast } = useToast();
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

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "DISPLAY NAME",
        bold: true,
        flex: 1.5,
      },
      {
        key: "userName",
        label: "USERNAME",
        flex: 1,
      },
      {
        key: "email",
        label: "EMAIL ADDRESS",
        flex: 2,
      },
      {
        key: "phoneNumber",
        label: "PHONE NUMBER",
        flex: 1.2,
      },
      {
        key: "organizationType",
        label: "USER TYPE",
        sortable: false,
        render: (val, row) => {
          const actualVal = val ?? row?.extraProperties?.organizationType;
          return (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {getOrganizationTypeName(actualVal)}
            </span>
          );
        },
      },
      {
        key: "siteName",
        label: "SITE NAME",
        sortable: false,
        flex: 1.5,
      },
      {
        key: "isPrimary",
        label: "PRIMARY",
        render: (val, row) => (
          <div className="flex items-center justify-center">
            <div
              className={`w-3 h-3 rounded-full ${(val ?? row?.extraProperties?.isPrimary) ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-200 dark:bg-white/10"}`}
            />
          </div>
        ),
      },
    ],
    [],
  );

  const customFilterArea = (
    <div className="flex flex-wrap items-center gap-3 bg-transparent px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 w-fit">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-500 whitespace-nowrap hidden sm:inline">
          Show Customer
        </span>
        <span className="text-[10px] text-slate-500 whitespace-nowrap sm:hidden">
          Customer
        </span>
        <button
          onClick={() => toggleFilter("isCustomer")}
          className={`relative w-8 h-4 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${filters.isCustomer ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-700"}`}
        >
          <div
            className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${filters.isCustomer ? "translate-x-4" : "translate-x-0"}`}
          />
        </button>
      </div>
    </div>
  );

  const [deleteUser, setDeleteUser] = useState(null);

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
        toast(`${deleteUser.userName} deleted successfully!`);
        window.location.reload();
      })
      .catch((err) => toast(`Error: ${err.message}`, "error"))
      .finally(() => setDeleteUser(null));
  };

  const UserModal = ({
    open,
    onClose,
    item,
    onSubmit,
    loading,
    submitError,
  }) => {
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
                orgTypeVal != null && orgTypeVal !== 0
                  ? orgTypeVal.toString()
                  : "",
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

    // Bind selected site once data + sites are loaded
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
            r.toLowerCase() === role.toLowerCase(),
        );
        return found ? prev.filter((r) => r !== found) : [...prev, role];
      });
    };

    if (!open) return null;

    const handleSubmit = (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData.entries());

      // Validation
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

      // Build clean payload matching API contract exactly
      const payload = {
        userName: data.userName?.trim(),
        name: data.name?.trim(),
        surname: data.surname?.trim() || "",
        email: data.email?.trim() || "",
        phoneNumber: data.phoneNumber?.trim(),

        // FIX 1: Always use orgType (controlled state), not formData value
        // formData.get("organizationType") can be stale; orgType is always current
        organizationType: Number(orgType),

        // FIX 2: Only send siteId when orgType is Customer (1), otherwise null
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

      // FIX 3: Password — only include if provided
      if (data.password?.trim()) {
        payload.password = data.password.trim();
      }

      // FIX 4: concurrencyStamp — MUST come from the GET response (userData),
      // not the list item. Missing or wrong stamp = 400 Bad Request.
      if (item) {
        payload.concurrencyStamp =
          userData?.concurrencyStamp ?? item.concurrencyStamp;
      }

      console.log("[DEBUG] PUT payload:", JSON.stringify(payload, null, 2));

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
        <div className="bg-white dark:bg-slate-900 px-6 py-5 border-b border-slate-100 dark:border-white/10 shrink-0 flex justify-between items-center">
          <h2 className="text-base dark:text-white text-slate-800 flex items-center gap-2">
            {item ? "Edit User" : "Create User"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"
          >
            
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
            sx={{ minHeight: "400px", p: 0, position: "relative" }}
          >
            {isLoadingData && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80">
                <p className="text-sm text-slate-500 animate-pulse">
                  Loading user details...
                </p>
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
              {/* TAB 1: USER INFORMATION */}
              <div style={{ display: tabIndex === 0 ? "block" : "none" }}>
                <div className="flex flex-col gap-2 mb-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1 ml-1">
                      User name *
                    </label>
                    <input
                      name="userName"
                      autoComplete="new-password"
                      defaultValue={userData?.userName || ""}
                      className={`w-full px-3 py-1.5 bg-transparent border ${validationErrors.userName ? "border-red-500 focus:ring-red-500/20" : "border-slate-200 dark:border-white/10 focus:ring-blue-500/20"} rounded-lg outline-none focus:ring-2 text-sm transition-all duration-200`}
                    />
                    {validationErrors.userName && (
                      <p className="text-red-500 text-[9px] mt-1 ml-1">
                        {validationErrors.userName}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1 ml-1">
                      Name *
                    </label>
                    <input
                      name="name"
                      defaultValue={userData?.name || ""}
                      className={`w-full px-3 py-1.5 bg-transparent border ${validationErrors.name ? "border-red-500 focus:ring-red-500/20" : "border-slate-200 dark:border-white/10 focus:ring-blue-500/20"} rounded-lg outline-none focus:ring-2 text-sm transition-all duration-200`}
                    />
                    {validationErrors.name && (
                      <p className="text-red-500 text-[9px] mt-1 ml-1">
                        {validationErrors.name}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1 ml-1">
                      Surname
                    </label>
                    <input
                      name="surname"
                      defaultValue={userData?.surname || ""}
                      className="w-full px-3 py-1.5 bg-transparent border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 text-sm transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1 ml-1">
                      Password {item ? "(Leave blank to keep)" : "*"}
                    </label>
                    <div className="relative">
                      <input
                        name="password"
                        autoComplete="new-password"
                        type={showPassword ? "text" : "password"}
                        className={`w-full px-3 py-1.5 bg-transparent border ${validationErrors.password ? "border-red-500 focus:ring-red-500/20" : "border-slate-200 dark:border-white/10 focus:ring-blue-500/20"} rounded-lg outline-none focus:ring-2 text-sm pr-12 transition-all duration-200`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
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
                    <label className="block text-[10px] text-slate-500 mb-1 ml-1">
                      Email Address
                    </label>
                    <input
                      name="email"
                      type="email"
                      defaultValue={userData?.email || ""}
                      className="w-full px-3 py-1.5 bg-transparent border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 text-sm transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1 ml-1">
                      Phone Number *
                    </label>
                    <input
                      name="phoneNumber"
                      defaultValue={userData?.phoneNumber || ""}
                      className={`w-full px-3 py-1.5 bg-transparent border ${validationErrors.phoneNumber ? "border-red-500 focus:ring-red-500/20" : "border-slate-200 dark:border-white/10 focus:ring-blue-500/20"} rounded-lg outline-none focus:ring-2 text-sm transition-all duration-200`}
                    />
                    {validationErrors.phoneNumber && (
                      <p className="text-red-500 text-[9px] mt-1 ml-1">
                        {validationErrors.phoneNumber}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <div className="w-full">
                      <label className="block text-[10px] text-slate-500 mb-1 ml-1">
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
                        className={`w-full px-3 py-1.5 bg-transparent border ${validationErrors.organizationType ? "border-red-500 focus:ring-red-500/20" : "border-slate-200 dark:border-white/10 focus:ring-blue-500/20"} rounded-lg outline-none focus:ring-2 text-sm transition-all duration-200`}
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
                        <label className="block text-[10px] text-slate-500 mb-1 ml-1">
                          Site *
                        </label>
                        <Autocomplete
                          size="small"
                          options={sites}
                          // FIX 5: Use option.id as the key, not the name — prevents duplicate key warnings
                          getOptionKey={(option) => option.id}
                          getOptionLabel={(option) =>
                            option.name ||
                            option.Name ||
                            String(option.id || "")
                          }
                          isOptionEqualToValue={(option, value) =>
                            option.id === value?.id
                          }
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
                                    borderColor: validationErrors.siteId
                                      ? "#ef4444"
                                      : "#e2e8f0",
                                    transition: "all 0.2s",
                                  },
                                  "&:hover fieldset": {
                                    borderColor: validationErrors.siteId
                                      ? "#ef4444"
                                      : "#cbd5e1",
                                  },
                                  "&.Mui-focused fieldset": {
                                    borderColor: validationErrors.siteId
                                      ? "#ef4444"
                                      : "#e2e8f0",
                                    borderWidth: "1px !important",
                                    boxShadow: validationErrors.siteId
                                      ? "0 0 0 2px rgba(239, 68, 68, 0.2)"
                                      : "0 0 0 2px rgba(59, 130, 246, 0.2)",
                                  },
                                  ".dark & fieldset": {
                                    borderColor: validationErrors.siteId
                                      ? "#ef4444"
                                      : "rgba(255, 255, 255, 0.1)",
                                  },
                                  ".dark &:hover fieldset": {
                                    borderColor: validationErrors.siteId
                                      ? "#ef4444"
                                      : "rgba(255, 255, 255, 0.2)",
                                  },
                                  ".dark &.Mui-focused fieldset": {
                                    borderColor: validationErrors.siteId
                                      ? "#ef4444"
                                      : "rgba(255, 255, 255, 0.1)",
                                    borderWidth: "1px !important",
                                  },
                                },
                                "& .MuiInputBase-input": {
                                  padding: "6px 0px !important",
                                  height: "auto",
                                  color: "inherit",
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
                    <label className="block text-[10px] text-slate-500 mb-1 ml-1">
                      Rate First Hour After Working Hours
                    </label>
                    <input
                      name="baseRateFirstHourAfterWorkingHours"
                      type="number"
                      step="0.01"
                      defaultValue={
                        userData?.baseRateFirstHourAfterWorkingHours || ""
                      }
                      className="w-full px-3 py-1.5 bg-transparent border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 text-sm transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1 ml-1">
                      Rate After First Hour (Each 15 Min) After Working Hours
                    </label>
                    <input
                      name="baseRateAfterFirstHourAfterWorkingHours"
                      type="number"
                      step="0.01"
                      defaultValue={
                        userData?.baseRateAfterFirstHourAfterWorkingHours || ""
                      }
                      className="w-full px-3 py-1.5 bg-transparent border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 text-sm transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="flex flex-col gap-2 bg-transparent rounded-xl p-3 border border-slate-200 dark:border-white/10">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isPrimary"
                      defaultChecked={userData?.isPrimary}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300"
                    />
                    <span className="text-sm text-slate-700">Primary</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isITS"
                      defaultChecked={userData?.isITS}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300"
                    />
                    <span className="text-sm text-slate-700">ITS</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isActive"
                      defaultChecked={userData ? userData.isActive : false}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300"
                    />
                    <span className="text-sm text-slate-700">Active</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="lockoutEnabled"
                      defaultChecked={
                        userData ? userData.lockoutEnabled : false
                      }
                      className="w-4 h-4 rounded text-blue-600 border-slate-300"
                    />
                    <span className="text-sm text-slate-700">
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
                    <span className="text-sm text-slate-700">
                      Must Complete JobSheet
                    </span>
                  </label>
                </div>
              </div>

              {/* TAB 2: ROLES */}
              <div style={{ display: tabIndex === 1 ? "block" : "none" }}>
                <div className="flex flex-col gap-2 w-full p-4 py-6">
                  <p className="text-[11px] text-slate-400 mb-6 text-center">
                    Assign Roles to User
                  </p>
                  {availableRoles
                    .slice(
                      (rolesPage - 1) * rolesPerPage,
                      rolesPage * rolesPerPage,
                    )
                    .map((roleObj) => {
                      const roleName =
                        typeof roleObj === "object" ? roleObj.name : roleObj;
                      if (!roleName) return null;
                      const isChecked = selectedRoles.some(
                        (r) =>
                          typeof r === "string" &&
                          r.toLowerCase() === roleName.toLowerCase(),
                      );
                      const displayRole =
                        roleName.charAt(0).toUpperCase() + roleName.slice(1);
                      return (
                        <label
                          key={roleName}
                          className="flex items-center gap-3 p-3 border-2 border-slate-100 dark:border-white/10 rounded-xl hover:bg-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 dark:hover:bg-white/5 cursor-pointer transition-all duration-200 group"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleRole(roleName)}
                            className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer transition-transform"
                          />
                          <span className="text-xs text-slate-700 dark:text-slate-300 group-hover:text-blue-600 transition-colors">
                            {displayRole}
                          </span>
                        </label>
                      );
                    })}

                  {availableRoles.length > rolesPerPage && (
                    <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setRolesPage(1)}
                          disabled={rolesPage === 1}
                          className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          First
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setRolesPage((prev) => Math.max(1, prev - 1))
                          }
                          disabled={rolesPage === 1}
                          className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Prev
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Page {rolesPage} of{" "}
                        {Math.ceil(availableRoles.length / rolesPerPage)}
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setRolesPage((prev) =>
                              Math.min(
                                Math.ceil(availableRoles.length / rolesPerPage),
                                prev + 1,
                              ),
                            )
                          }
                          disabled={
                            rolesPage ===
                            Math.ceil(availableRoles.length / rolesPerPage)
                          }
                          className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Next
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setRolesPage(
                              Math.ceil(availableRoles.length / rolesPerPage),
                            )
                          }
                          disabled={
                            rolesPage ===
                            Math.ceil(availableRoles.length / rolesPerPage)
                          }
                          className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Last
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {submitError && (
                <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                  <p className="text-xs text-rose-500">Error: {submitError}</p>
                </div>
              )}
            </div>
          </DialogContent>

          <div className="flex gap-2.5 px-6 py-4 bg-slate-50 dark:bg-[#1a1f2e] border-t border-slate-100 dark:border-white/10 w-full rounded-b-[24px]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-xs rounded-xl bg-transparent border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 text-xs rounded-xl bg-transparent border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 transition-all duration-200"
            >
              {loading ? "Wait..." : item ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </Dialog>
    );
  };

  return (
    <>
    <ResourcePage
      title="Users"
      apiObject={usersApi}
      columns={columns}
      ModalComponent={UserModal}
      searchPlaceholder="Search users by name, email or phone..."
      createButtonText="New User"
      breadcrumb={["Home", "Administration", "Identity Management", "Users"]}
      smallHeaderButton={true}
      showPagination={true}
      initialPageSize={14}
      entityName="User"
      customFilterArea={customFilterArea}
      extraParams={{
        isCustomer: filters.isCustomer ? true : undefined,
        notActive: filters.notActive ? true : undefined,
        mustCompleteJobsheet: filters.mustCompleteJobsheet ? true : undefined,
        isITS: filters.isITS ? true : undefined,
        onlyLoadCurrentUser: filters.onlyLoadCurrentUser ? true : undefined,

        organizationTypes: filters.organizationTypes
          ? [parseInt(filters.organizationTypes, 10)]
          : undefined,
      }}
      showAuditLog={false}
      onDelete={handleDelete}
      onDeleteVisibilityCheck={(row) => {
        if (row.userName?.toLowerCase() === "admin") return false;
        if (filters.isCustomer) return false;
        const orgType = row.organizationType ?? row.extraProperties?.organizationType;
        if (orgType === 1) return false;
        return true;
      }}
    />


    {/* Material UI Delete Confirmation Dialog */}
    <Dialog
      open={Boolean(deleteUser)}
      onClose={() => setDeleteUser(null)}
      maxWidth="xs"
      PaperProps={{
        sx: { borderRadius: "20px", padding: "4px", maxWidth: "320px", width: "100%" },
      }}
    >
      <DialogTitle sx={{ fontWeight: 800, color: "#1e293b", fontSize: "16px" }}>
        Confirm Deletion
      </DialogTitle>
      <DialogContent sx={{ pb: 1 }}>
        <div className="text-[13px] text-slate-600">
          Are you sure you want to delete the user{" "}
          <strong className="text-rose-500">{deleteUser?.userName}</strong>?
          This action cannot be undone.
        </div>
      </DialogContent>
      <DialogActions sx={{ paddingTop: "10px", paddingBottom: "10px" }}>
        <Button
          onClick={() => setDeleteUser(null)}
          color="inherit"
          sx={{ fontWeight: 700, borderRadius: "10px", textTransform: "none", fontSize: "12px" }}
        >
          Cancel
        </Button>
        <Button
          onClick={confirmDelete}
          variant="contained"
          color="error"
          sx={{ fontWeight: 700, borderRadius: "10px", boxShadow: "none", textTransform: "none", fontSize: "12px" }}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}
