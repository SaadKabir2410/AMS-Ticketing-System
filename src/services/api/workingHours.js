import apiClient from "../apiClient";

const SORT_FIELD_MAP = {
  UserName: "IdentityUser.UserName",
  WeekDay: "WeekDay",
  StartTime: "StartTime",
  EndTime: "EndTime",
};

export const workingHoursApi = {
  getPagedList: ({
    page = 1,
    perPage = 100,
    search,
    userId,
    weekDay,
    sortField = "WeekDay",
    sortDirection = "asc",
  } = {}) => {
    const backendSortField = SORT_FIELD_MAP[sortField] || SORT_FIELD_MAP.WeekDay;
    const backendSortDirection = sortDirection === "desc" ? "Desc" : "Asc";
    const params = {
      SkipCount: (page - 1) * perPage,
      MaxResultCount: perPage,
      "UserWorkingHourSearch.UserId": userId || undefined,
      "UserWorkingHourSearch.WeekDay": weekDay || undefined,
      Filter: search || undefined,
      Sorting: `${backendSortField} ${backendSortDirection}, Id Asc`,
    };

    return apiClient
      .get("/api/app/user-working-hour/paged-list", { params })
      .then((response) => response.data);
  },

  getById: (id) =>
    apiClient.get(`/api/app/user-working-hour/${id}/by-id`).then((r) => r.data),

  create: (data) => {
    const payload = {
      ...data,
      startTime: data.startTime?.length === 5 ? `${data.startTime}:00` : data.startTime,
      endTime: data.endTime?.length === 5 ? `${data.endTime}:00` : data.endTime,
    };
    return apiClient.post("/api/app/user-working-hour", payload).then((r) => r.data);
  },

  update: async (id, data) => {
    // Step 1: Fetch fresh concurrencyStamp before PUT
    const fresh = await apiClient
      .get(`/api/app/user-working-hour/${id}/by-id`)
      .then((r) => r.data);

    // Step 2: Build payload with concurrencyStamp
    const payload = {
      ...data,
      concurrencyStamp: fresh.concurrencyStamp,
      startTime: data.startTime?.length === 5 ? `${data.startTime}:00` : data.startTime,
      endTime: data.endTime?.length === 5 ? `${data.endTime}:00` : data.endTime,
    };

    return apiClient
      .put(`/api/app/user-working-hour/${id}`, payload)
      .then((r) => r.data);
  },
};

export default workingHoursApi;
