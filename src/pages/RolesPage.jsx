import { useMemo, useState } from "react";
import ResourcePage from "../component/common/ResourcePage";
import { rolesApi } from "../services/api/roles";
import { useToast } from "../component/common/ToastContext";
import PremiumErrorAlert from "../component/common/PremiumErrorAlert";
import { X, ShieldCheck, ChevronDown, ChevronRight } from "lucide-react";
import IconButton from "@mui/material/IconButton";



// MUI Imports for Permission Dialog
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";


const PermissionTree = ({
  permissions,
  parentName,
  checkedPerms,
  onToggle,
}) => {
  const children = permissions.filter((p) => p.parentName === parentName);
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
              className="w-4 h-4 rounded ring-offset-0 focus:ring-0 cursor-pointer accent-blue-500 bg-slate-950 border-slate-600 text-blue-500"
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
  const [permissionRole, setPermissionRole] = useState(null);
  const [permissionsData, setPermissionsData] = useState(null);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [checkedPerms, setCheckedPerms] = useState({});
  const [expandedGroups, setExpandedGroups] = useState({});

  const toggleGroup = (groupName) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "ROLE NAME",
        bold: true,
        flex: 1,
        render: (val, row) => (
          <div className="flex items-center gap-2.5">
            <span className="text-sm text-slate-800 dark:text-slate-200 capitalize truncate">
              {val}
            </span>
            {row.isDefault && (
              <span className="text-blue-500 text-[10px] capitalize ">
                Default
              </span>
            )}
            {row.isPublic && (
              <span className="text-[#4188a1] text-[10px] capitalize ">
                Public
              </span>
            )}
          </div>
        ),
      },
    ],
    [],
  );

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
        <div className="relative bg-white dark:bg-slate-900 rounded-[24px] p-6 w-full max-w-[360px] shadow-2xl shadow-blue-500/10 border border-slate-100 dark:border-slate-700 transition-all duration-300">
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
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-slate-200 text-sm transition-all duration-200"
                placeholder="Enter role name..."
              />
            </div>

            {submitError && (
              <PremiumErrorAlert 
                open={!!submitError} 
                message={submitError} 
                onClose={() => {}} 
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
                    className="w-4 h-4 rounded ring-offset-0 focus:ring-0 cursor-pointer accent-blue-500 bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-600 text-blue-500"
                  />
                </div>
                <span className="text-[8px] text-slate-400 ">
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
                    className="w-4 h-4 rounded ring-offset-0 focus:ring-0 cursor-pointer accent-blue-500 bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-600 text-blue-500"
                  />
                </div>
                <span className="text-[8px] text-slate-400 ">
                  Visible to everyone
                </span>
              </label>
            </div>


          </div>
          <div className="flex gap-2.5 mt-5">
            <button
              onClick={onClose}
              className="flex-1 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 transition-colors "
            >
              Cancel
            </button>
            <button
              disabled={loading}
              onClick={handleSubmit}
              className="flex-1 py-2 text-xs rounded-xl bg-blue-600 text-slate-200 shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 transition-all duration-200 "
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
    // Load actual permissions for this role using the API
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
        toast(`Permissions for ${permissionRole.name} updated successfully!`);
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

  const handleDelete = (role) => {
    if (role.name.toLowerCase() === "admin") {
      toast("Error: The Admin role cannot be deleted.", "error");
      return;
    }

    rolesApi
      .delete(role.id)
      .then(() => {
        toast(`${role.name} role deleted successfully!`);
        window.location.reload();
      })
      .catch((err) => toast(`Error: ${err.message}`, "error"));
  };

  return (
    <>
      <ResourcePage
        title="Roles"
        apiObject={rolesApi}
        columns={columns}
        ModalComponent={RoleModal}
        searchPlaceholder="Search roles by name..."
        createButtonText="New Role"
        breadcrumb={["Home", "Administration", "Identity Management", "Roles"]}
        smallHeaderButton={true}
        showPagination={true}
        showSearchBar={false}
        showFilterBar={false}
        showAuditLog={false}
        initialPageSize={10}
        entityName="Role"
        onPermissions={handlePermissions}
        onDelete={handleDelete}
        onDeleteVisibilityCheck={(role) => role.name.toLowerCase() !== "admin"}
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
                      className="w-4 h-4 rounded ring-offset-0 focus:ring-0 cursor-pointer accent-blue-500 bg-slate-950 border-slate-600 text-blue-500"
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
                          className="w-4 h-4 rounded ring-offset-0 focus:ring-0 cursor-pointer accent-blue-500 bg-slate-950 border-slate-600 text-blue-500"
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
        <DialogActions sx={{ padding: "16px 24px", backgroundColor: "#0f172a", border: "none" }}>
          <Button
            onClick={() => handleClosePermissions()}
            variant="outlined"
            sx={{ 
              fontWeight: 600, 
              borderRadius: "8px", 
              textTransform: "none", 
              color: "#94a3b8", 
              borderColor: "#334155",
              "&:hover": { borderColor: "#475569", backgroundColor: "rgba(255, 255, 255, 0.05)" }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSavePermissions}
            variant="contained"
            color="primary"
            disabled={loadingPermissions}
            sx={{ fontWeight: 600, borderRadius: "8px", textTransform: "none", px: 4, boxShadow: "none" }}
          >
            {loadingPermissions ? "Wait..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
