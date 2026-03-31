import apiClient from "../apiClient";

// ✅ Moved outside — available to all methods
const getVerificationToken = () => {
  const match = document.cookie
    .split(";")
    .find((c) => c.trim().startsWith("XSRF-TOKEN="));
  return match ? decodeURIComponent(match.split("=")[1]) : "";
};

export const rolesApi = {
  getAll: ({
    page = 1,
    perPage = 10,
    search,
    sortKey,
    sortDir = "desc",
  } = {}) => {
    const params = {
      SkipCount: (page - 1) * perPage,
      MaxResultCount: perPage,
      Filter: search || undefined,
      Sorting: sortKey ? `${sortKey} ${sortDir}` : "Name asc",
    };
    return apiClient.get("/api/identity/roles", { params }).then((r) => r.data);
  },

  create: (data) =>
    apiClient.post("/api/identity/roles", data).then((r) => r.data),

  update: (id, data) =>
    apiClient.put(`/api/identity/roles/${id}`, data).then((r) => r.data),

  delete: (id) =>
    apiClient.delete(`/api/identity/roles/${id}`).then((r) => r.data),

  getPermissions: (providerName, providerKey) =>
    apiClient
      .get("/api/permission-management/permissions", {
        params: { providerName, providerKey },
      })
      .then((r) => r.data),

  updatePermissions: (providerName, providerKey, data) =>
    apiClient
      .put("/api/permission-management/permissions", data, {
        params: { providerName, providerKey },
        headers: {
          "Content-Type": "application/json",
          "RequestVerificationToken": getVerificationToken(),
        },
        validateStatus: (status) => status === 204 || status === 200,
      })
      .then((r) => r.data),
};

export default rolesApi;