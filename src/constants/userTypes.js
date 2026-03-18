export const ORGANIZATION_TYPES = [
  { value: 0, label: "Select An Option" },
  { value: 1, label: "Customer" },
  { value: 2, label: "Vendor-Sureze" },
  { value: 3, label: "Vendor-Abbott" },
  { value: -1, label: "All" },
];

export const getOrganizationTypeName = (val) => {
  if (val === null || val === undefined) return "Unknown";
  const numVal = Number(val);
  const org = ORGANIZATION_TYPES.find((o) => o.value === numVal);
  return org?.label ?? "Unknown";
};
