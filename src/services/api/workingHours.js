import apiClient from "../apiClient";

export const workingHoursApi = {
  getAll: ({ page = 1, perPage = 100, search, ...extraParams } = {}) => {
    const params = {
      SkipCount: (page - 1) * perPage,
      MaxResultCount: perPage,
      "UserWorkingHourSearch.UserId":
        extraParams.UserId || extraParams.userId || undefined,
      "UserWorkingHourSearch.WeekDay":
        extraParams.WeekDay || extraParams.weekDay || undefined,
      Filter: search || undefined,
      Sorting: "WeekDay asc",
    };
    console.log(
      "[DB.workingHours] Fetching:",
      "/api/app/user-working-hour/paged-list",
      params,
    );
    return apiClient
      .get("/api/app/user-working-hour/paged-list", { params })
      .then((r) => {
        console.log("[DB.workingHours] Response:", r.data);
        return r.data;
      })
      .catch((err) => {
        console.error("[DB.workingHours] Error:", err);
        throw err;
      });
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
  delete: (id) => apiClient.delete(`/api/app/user-working-hour/${id}`),
};

export default workingHoursApi;
