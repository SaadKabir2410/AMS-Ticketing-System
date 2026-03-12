import apiClient from "../apiClient";

export const jobsheetsApi = {
  getAll: ({
    page = 1,
    perPage = 10,
    search,
    sortKey,
    sortDir = "desc",
    ...extraParams
  } = {}) => {
    const params = {
      SkipCount: (page - 1) * perPage,
      MaxResultCount: perPage,
      Filter: search || undefined,
      "JobsheetSearch.CurrentUserId": extraParams.CurrentUserId || undefined,
      "JobsheetSearch.UserIdsSearchValues":
        extraParams.UserIdsSearchValues || undefined,
      "JobsheetSearch.JobsheetDetailUserIdsSearchValues":
        extraParams.JobsheetDetailUserIdsSearchValues || undefined,
      "JobsheetSearch.ProjectIdSearchValue":
        extraParams.Project || extraParams.ProjectIdSearchValue || undefined,
      "JobsheetSearch.DateFrom":
        extraParams.FromDate || extraParams.DateFrom || undefined,
      "JobsheetSearch.DateTo":
        extraParams.ToDate || extraParams.DateTo || undefined,
      Sorting: sortKey ? `${sortKey} ${sortDir}` : "Date desc",
    };
    console.log("[DB.jobsheets] Fetching:", "/api/app/jobsheets/paged", params);
    return apiClient
      .get("/api/app/jobsheets/paged", { params })
      .then((r) => r.data)
      .catch((err) => {
        console.error("[DB.jobsheets] Error:", err);
        throw err;
      });
  },
  create: (data) => apiClient.post("/api/app/job-sheet", data).then((r) => r.data),
};

export default jobsheetsApi;
