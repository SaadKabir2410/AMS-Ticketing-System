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
};

export default workingHoursApi;
