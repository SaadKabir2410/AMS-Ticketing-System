import apiClient from "../apiClient";

const isGuid = (val) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);

const formatDateStart = (d) => {
  if (!d) return undefined;
  return d.includes("T") ? d : `${d}T00:00:00.0000000Z`;
};

const formatDateEnd = (d) => {
  if (!d) return undefined;
  return d.includes("T") ? d : `${d}T23:59:59.9999999Z`;
};

export const jobsheetsApi = {
  getAll: ({
    page = 1,
    perPage = 10,
    search,
    sortKey,
    sortDir = "desc",
    ...extraParams
  } = {}) => {
    const formatUserIds = (val) => {
      if (!val) return undefined;
      const arr = Array.isArray(val) ? val : [val];
      const validGuids = arr.filter((id) => isGuid(id));
      return validGuids.length > 0 ? validGuids : undefined;
    };

    const params = {
      SkipCount: (page - 1) * perPage,
      MaxResultCount: perPage,
      Filter: search || undefined,
      date: extraParams.date || undefined,
      userId: extraParams.userId || undefined,
      "JobsheetSearch.CurrentUserId": extraParams.CurrentUserId || undefined,
      "JobsheetSearch.UserIdsSearchValues": formatUserIds(extraParams.UserIdsSearchValues),
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
      Sorting: sortKey ? `${sortKey} ${sortDir}` : "",
    };

    return apiClient
      .get("/api/app/jobsheets/paged", { params })
      .then((r) => r.data);
  },

  getReport: ({ filters, currentUserId }) => {
    // Use the exact same flat key format as getAll — proven to work with the backend.
    // The global qs serializer (arrayFormat: "repeat") turns arrays into:
    //   JobsheetSearch.UserIdsSearchValues=id1&JobsheetSearch.UserIdsSearchValues=id2
    const userIds = Array.isArray(filters.user)
      ? filters.user.filter(isGuid)
      : filters.user && isGuid(filters.user) ? [filters.user] : [];

    const collabIds = Array.isArray(filters.collaborator)
      ? filters.collaborator.filter(isGuid)
      : filters.collaborator && isGuid(filters.collaborator) ? [filters.collaborator] : [];

    const allUserIds = [...new Set([...userIds, ...collabIds])];

    const params = {
      "JobsheetSearch.CurrentUserId": currentUserId && isGuid(currentUserId) ? currentUserId : undefined,
      "JobsheetSearch.UserIdsSearchValues": allUserIds.length > 0 ? allUserIds : undefined,
      "JobsheetSearch.JobsheetDetailUserIdsSearchValues": allUserIds.length > 0 ? allUserIds : undefined,
      "JobsheetSearch.ProjectIdSearchValue": filters.project && isGuid(filters.project) ? filters.project : undefined,
      "JobsheetSearch.DateFrom": filters.dateFrom ? formatDateStart(filters.dateFrom) : undefined,
      "JobsheetSearch.DateTo": filters.dateTo ? formatDateEnd(filters.dateTo) : undefined,
    };

    return apiClient.get("/api/app/jobsheet/jobsheet-report", {
      params,
      responseType: "blob",
      headers: {
        Accept:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/pdf, application/json",
      },
    });
  },


  create: (data) =>
    apiClient.post("/api/app/jobsheets", data).then((r) => r.data),

  getById: (id) =>
    apiClient.get(`/api/app/jobsheets/${id}`).then((r) => r.data),

  update: (id, data) =>
    apiClient.put(`/api/app/jobsheets/${id}`, data).then((r) => r.data),

  getByDateAndUser: (date, userId) =>
    apiClient.get(`/api/app/jobsheets/${date}/${userId}`).then((r) => r.data),

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