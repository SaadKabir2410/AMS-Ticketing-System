import apiClient from "../apiClient";

export const countriesApi = {
  getAll: () => {
    console.log("[DB.countries] getAll");
    const params = {
      SkipCount: 0,
      MaxResultCount: 1000,
      Sorting: "Name asc",
    };
    return apiClient
      .get("/api/app/country/paged-list", { params })
      .then((r) => {
        console.log("[DB.countries] getAll success:", r.data);
        return r.data?.items || r.data || [];
      });
  },
  create: (data) => {
    console.log("[DB.countries] creating:", data);
    return apiClient.post("/api/app/country", data).then((r) => r.data);
  },
  update: (id, data) => {
    console.log("[DB.countries] updating:", id, data);
    return apiClient.put(`/api/app/country/${id}`, data).then((r) => r.data);
  },
  delete: (id) => {
    console.log("[DB.countries] deleting:", id);
    return apiClient.delete(`/api/app/country/${id}`).then((r) => r.data);
  },
};

export default countriesApi;
