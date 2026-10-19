const FEATURE_MANAGEMENT_PERMISSION = "FeatureManagement";

const isFeatureManagementPermission = (permission) => {
  const name = permission?.name;
  return (
    name === FEATURE_MANAGEMENT_PERMISSION ||
    name?.startsWith(`${FEATURE_MANAGEMENT_PERMISSION}.`)
  );
};

export const excludeFeatureManagementPermissions = (data) => {
  if (!data?.groups) return data;

  return {
    ...data,
    groups: data.groups
      .map((group) => ({
        ...group,
        permissions: (group.permissions || []).filter(
          (permission) => !isFeatureManagementPermission(permission),
        ),
      }))
      .filter(
        (group) =>
          group.name !== FEATURE_MANAGEMENT_PERMISSION &&
          group.permissions.length > 0,
      ),
  };
};
