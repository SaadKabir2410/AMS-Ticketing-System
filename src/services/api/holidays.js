import apiClient from "../apiClient";

export const holidaysApi = {
  // Full list including disabled holidays (the paged list leaves them out).
  getFilterOptions: () =>
    apiClient.get("/api/app/holiday").then((response) =>
      Array.isArray(response.data) ? response.data : (response.data?.items ?? []),
    ),

  create: (data) =>
    apiClient.post("/api/app/holiday", data).then((r) => r.data),

  update: (id, data) =>
    apiClient.put(`/api/app/holiday/${id}`, data).then((r) => r.data),
  // Disable = soft delete → DELETE
  disable: (row) =>
    apiClient.delete(`/api/app/holiday/${row.id}`).then((r) => r.data),

  // Enable = restore → POST /{id}/enable
  enable: (row) =>
    apiClient.post(`/api/app/holiday/${row.id}/enable`, {}).then((r) => r.data),

  delete: (id) =>
    apiClient.delete(`/api/app/holiday/${id}`).then((r) => r.data),
};

export default holidaysApi;
