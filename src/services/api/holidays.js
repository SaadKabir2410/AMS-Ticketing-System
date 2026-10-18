import apiClient from "../apiClient";

export const holidaysApi = {
  getAll: ({
    Search,
    Name,
    Description,
    Type,
    Date,
    Year,
    CountryISOCode,
  } = {}) => {
    const params = {
      SkipCount: 0,
      MaxResultCount: 1000,
      Sorting: "Date desc",
      Filter: Search || (Year ? String(Year) : undefined),
      "HolidaySearch.Name": Name || undefined,
      "HolidaySearch.Description": Description || undefined,
      "HolidaySearch.Type": Type || undefined,
      "HolidaySearch.Date": Date ? `${Date}T00:00:00` : undefined,
      "HolidaySearch.CountryISOCode": CountryISOCode || undefined,
    };

    return apiClient
      .get("/api/app/holiday/paged-list", { params })
      .then((response) => response.data);
  },

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
