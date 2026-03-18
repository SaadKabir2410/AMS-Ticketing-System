import apiClient from "../apiClient";

export const workCodesApi = {
  getAll: () => {
    const params = {
      SkipCount: 0,
      MaxResultCount: 1000,
      Sorting: "Code asc",
    };
    return apiClient
      .get("/api/app/work-done-code/paged-list", { params })
      .then((r) => r.data?.items || r.data || []);
  },
  checkCodeExists: (code, signal) => {
    const params = {
      SkipCount: 0,
      MaxResultCount: 1,
      "WorkDoneCodeSearch.Code": code,
      "WorkDoneCodeSearch.CodeOperator": "Equals",
      Sorting: "Code asc",
    };
    console.log("[DB.workCodes] checking code:", code);
    return apiClient
      .get("/api/app/work-done-code/paged-list", { params, signal })
      .then((r) => r.data);
  },
  create: (data) => {
    console.log("[DB.workCodes] creating:", data);
    return apiClient.post("/api/app/work-done-code", data).then((r) => r.data);
  },
  update: (id, data) => {
    console.log("[DB.workCodes] updating:", id, data);
    return apiClient
      .put(`/api/app/work-done-code/${id}`, data)
      .then((r) => r.data);
  },
  delete: (id) => {
    console.log("[DB.workCodes] deleting:", id);
    return apiClient
      .delete(`/api/app/work-done-code/${id}`)
      .then((r) => r.data);
  },
};

export default workCodesApi;
