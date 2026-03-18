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
    const isGuid = (val) =>
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
        val,
      );

    // Ensure properly formatted array of GUIDs
    const formatUserIds = (val) => {
      if (!val) return undefined;
      const arr = Array.isArray(val) ? val : [val];
      const validGuids = arr.filter((id) => isGuid(id));
      return validGuids.length > 0 ? validGuids : undefined;
    };

    const formatDateStart = (d) => {
      if (!d) return undefined;
      return d.includes("T") ? d : `${d}T00:00:00.000Z`;
    };

    const formatDateEnd = (d) => {
      if (!d) return undefined;
      return d.includes("T") ? d : `${d}T23:59:59.999Z`;
    };

    const params = {
      SkipCount: (page - 1) * perPage,
      MaxResultCount: perPage,
      Filter: search || undefined,
      date: extraParams.date || undefined,
      userId: extraParams.userId || undefined,
      "JobsheetSearch.CurrentUserId": extraParams.CurrentUserId || undefined,
      "JobsheetSearch.UserIdsSearchValues": formatUserIds(
        extraParams.UserIdsSearchValues,
      ),
      "JobsheetSearch.JobsheetDetailUserIdsSearchValues": formatUserIds(
        extraParams.JobsheetDetailUserIdsSearchValues,
      ),
      "JobsheetSearch.ProjectIdSearchValue": isGuid(
        extraParams.Project || extraParams.ProjectIdSearchValue,
      )
        ? extraParams.Project || extraParams.ProjectIdSearchValue
        : undefined,
      "JobsheetSearch.DateFrom": formatDateStart(
        extraParams.FromDate || extraParams.DateFrom,
      ),
      "JobsheetSearch.DateTo": formatDateEnd(
        extraParams.ToDate || extraParams.DateTo,
      ),
      Sorting: sortKey ? `${sortKey} ${sortDir}` : "Date desc",
    };
    return apiClient
      .get("/api/app/jobsheets/paged", { params })
      .then((r) => r.data);
  },

  create: (data) =>
    apiClient.post("/api/app/jobsheets", data).then((r) => r.data),

  getById: (id) =>
    apiClient.get(`/api/app/jobsheets/${id}`).then((r) => r.data),

  update: (id, data) =>
    apiClient.put(`/api/app/jobsheets/${id}`, data).then((r) => r.data),

  getByDateAndUser: (date, userId) =>
    apiClient.get(`/api/app/jobsheets/${date}/${userId}`).then((r) => r.data),

  getReport: (params) =>
    apiClient
      .get(`/api/app/jobsheet/jobsheet-report`, { params })
      .then((r) => r.data),

  updateJobsheetDetailsAfterAMSTicketDetailsUpdateIsDone: (payload) =>
    apiClient
      .put(
        `/api/app/jobsheets/UpdateJobsheetDetailsAfterAMSTicketDetailsUpdateIsDone`,
        payload,
      )
      .then((r) => r.data),

  checkExists: (params) =>
    apiClient.get(`/api/app/jobsheets/exists`, { params }).then((r) => r.data),

  getTicketDetails: (params) =>
    apiClient
      .get(`/api/app/jobsheets/ticket-details`, { params })
      .then((r) => r.data),

  hasOverlappingJobsheetDetails: (data) =>
    apiClient
      .post(`/api/app/jobsheet/has-overlapping-jobsheet-details`, data)
      .then((r) => r.data),
};

export default jobsheetsApi;
