import apiClient from "../apiClient";

export const countriesApi = {
  getAll: () => {
    console.log("[DB.countries] getAll");
    return apiClient.get("/api/app/country").then((r) => {
      console.log("[DB.countries] getAll success:", r.data);
      return r.data;
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
