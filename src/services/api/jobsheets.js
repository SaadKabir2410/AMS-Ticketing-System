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

  // ✅ FIXED: Changed from URLSearchParams to plain object
  // URLSearchParams was not being serialized by axios into the query string
  // Plain object keys like "UserIdsSearchValues[0]" are serialized correctly by axios
  getReport: ({ filters, currentUserId }) => {
    const params = {};

    if (currentUserId && isGuid(currentUserId)) {
      params["CurrentUserId"] = currentUserId;
    }

    // Support for multiple users (arrays or single string)
    const userIds = Array.isArray(filters.user) ? filters.user : (filters.user ? [filters.user] : []);
    userIds.forEach((id, index) => {
      if (isGuid(id)) {
        params[`UserIdsSearchValues[${index}]`] = id;
        params[`JobsheetDetailUserIdsSearchValues[${index}]`] = id;
      }
    });

    const collabIds = Array.isArray(filters.collaborator) ? filters.collaborator : (filters.collaborator ? [filters.collaborator] : []);
    // Note: Collaborators usually go into the same user filter arrays as the main user for this report
    collabIds.forEach((id, index) => {
      if (isGuid(id)) {
        // We start indexing after the main users to avoid collisions
        const finalIndex = userIds.length + index;
        params[`UserIdsSearchValues[${finalIndex}]`] = id;
        params[`JobsheetDetailUserIdsSearchValues[${finalIndex}]`] = id;
      }
    });

    if (filters.project && isGuid(filters.project)) {
      params["ProjectIdSearchValue"] = filters.project;
    }

    if (filters.dateFrom) params["DateFrom"] = formatDateStart(filters.dateFrom);
    if (filters.dateTo) params["DateTo"] = formatDateEnd(filters.dateTo);

    return apiClient
      .get("/api/app/jobsheet/jobsheet-report", { params })
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