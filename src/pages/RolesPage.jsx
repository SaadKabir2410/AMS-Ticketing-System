import { useMemo, useState } from "react";
import ResourcePage from "../component/common/ResourcePage";
import { rolesApi } from "../services/api/roles";
import { useToast } from "../component/common/ToastContext";

// MUI Imports for Permission Dialog
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { CheckCircle2 } from "lucide-react";

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
      className={`space-y-2 ${parentName ? "ml-6 mt-2 border-l-2 border-slate-100 pl-4" : "mt-2"}`}
    >
      {children.map((perm) => (
        <div key={perm.name} className="flex flex-col">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id={perm.name}
              checked={!!checkedPerms[perm.name]}
              onChange={(e) => onToggle(perm, e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
            />
            <label
              htmlFor={perm.name}
              className={`text-sm cursor-pointer ${parentName ? "text-slate-600" : "text-slate-800 "}`}
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

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "ROLE NAME",
        bold: true,
        flex: 1,
        render: (val, row) => (
          <div className="flex items-center gap-2.5">
            <span className="text-sm text-slate-800 dark:text-white capitalize truncate">
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
        <div className="relative bg-white dark:bg-[#1e2436] rounded-[24px] p-6 w-full max-w-[360px] shadow-2xl shadow-blue-500/10 border border-slate-100 dark:border-white/10 transition-all duration-300">
          <h2 className="text-base dark:text-white mb-4 text-slate-800">
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
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white text-sm transition-all duration-200"
                placeholder="Enter role name..."
              />
            </div>

            {/* Boolean Checks */}
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 px-3 py-2 border-2 border-slate-100 dark:border-white/10 rounded-xl hover:bg-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 dark:hover:bg-white/5 cursor-pointer transition-all duration-200 group">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-700 dark:text-slate-300 group-hover:text-blue-600 transition-colors">
                    Default
                  </span>
                  <input
                    type="checkbox"
                    id="role-isdefault-input"
                    defaultChecked={item?.isDefault || false}
                    className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer transition-transform"
                  />
                </div>
                <span className="text-[8px] text-slate-400 ">
                  Assign new users
                </span>
              </label>
              <label className="flex flex-col gap-1 px-3 py-2 border-2 border-slate-100 dark:border-white/10 rounded-xl hover:bg-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 dark:hover:bg-white/5 cursor-pointer transition-all duration-200 group">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-700 dark:text-slate-300 group-hover:text-blue-600 transition-colors">
                    Public
                  </span>
                  <input
                    type="checkbox"
                    id="role-ispublic-input"
                    defaultChecked={item?.isPublic || false}
                    className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer transition-transform"
                  />
                </div>
                <span className="text-[8px] text-slate-400 ">
                  Visible to everyone
                </span>
              </label>
            </div>

            {submitError && (
              <p className="text-[10px] text-rose-500 text-center pt-2">
                {submitError}
              </p>
            )}
          </div>
          <div className="flex gap-2.5 mt-5">
            <button
              onClick={onClose}
              className="flex-1 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-300 hover:bg-slate-200 transition-colors "
            >
              Cancel
            </button>
            <button
              disabled={loading}
              onClick={handleSubmit}
              className="flex-1 py-2 text-xs rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 transition-all duration-200 "
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

  const handleClosePermissions = () => {
    setPermissionRole(null);
    setPermissionsData(null);
    setCheckedPerms({});
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
          sx: { borderRadius: "20px", padding: "10px" },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: "#1e293b" }}>
          Permissions - {permissionRole?.name}
        </DialogTitle>
        <DialogContent dividers>
          {loadingPermissions ? (
            <div className="flex justify-center items-center py-10">
              <CircularProgress />
            </div>
          ) : (
            <div className="text-sm text-slate-600 space-y-3">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
                <p>
                  Here you can control what{" "}
                  <strong>{permissionRole?.name}</strong> can do in the
                  application.
                </p>

                {/* Grant All Checkbox */}
                {permissionsData?.groups && (
                  <div className="flex items-center gap-2 bg-blue-50/50 px-3 py-1.5 rounded-lg border border-blue-100">
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
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <label
                      htmlFor="grant-all-permissions"
                      className="text-sm text-blue-900 cursor-pointer"
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
                return (
                  <div
                    key={idx}
                    className="mb-6 p-4 border border-slate-100 rounded-xl bg-slate-50/50"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
                      <h4 className=" text-slate-800 text-lg">
                        {group.displayName || group.name}
                      </h4>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`select-all-${group.name}`}
                          checked={isAllChecked}
                          onChange={(e) =>
                            handleSelectAllGroup(group.name, e.target.checked)
                          }
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        <label
                          htmlFor={`select-all-${group.name}`}
                          className="text-sm text-slate-600 cursor-pointer hover:text-blue-600 transition-colors"
                        >
                          Select all
                        </label>
                      </div>
                    </div>
                    <PermissionTree
                      permissions={groupPerms}
                      parentName={null}
                      checkedPerms={checkedPerms}
                      onToggle={handleTogglePerm}
                    />
                  </div>
                );
              })}

              {!permissionsData?.groups?.length && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  No specific permissions defined.
                </div>
              )}
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ paddingTop: "20px" }}>
          <Button
            onClick={handleClosePermissions}
            color="inherit"
            sx={{ fontWeight: 700, borderRadius: "10px" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSavePermissions}
            variant="contained"
            color="primary"
            disabled={loadingPermissions}
            sx={{ fontWeight: 700, borderRadius: "10px", boxShadow: "none" }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
