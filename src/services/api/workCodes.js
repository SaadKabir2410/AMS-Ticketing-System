import apiClient from "../apiClient";

export const workCodesApi = {
  // sorting is passed to the backend as-is, e.g. "Code asc" or "Description desc".
  getAll: ({ sorting = "Code asc" } = {}) => {
    const params = {
      SkipCount: 0,
      MaxResultCount: 1000,
      Sorting: sorting,
    };
    return apiClient
      .get("/api/app/work-done-code/paged-list", { params })
      .then((r) => r.data?.items || r.data || []);
  },
  checkCodeExists: (code, signal) => {
    const params = {
      SkipCount: 0,
      // The backend matches codes with "contains", so fetch every match and
      // let the modal look for the exact one.
      MaxResultCount: 1000,
      "WorkDoneCodeSearch.Code": code,
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
};

export default workCodesApi;
