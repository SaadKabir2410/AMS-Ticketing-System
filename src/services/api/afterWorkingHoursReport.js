import apiClient from "../apiClient";

export const afterWorkingHoursReportApi = {
  getReport: (params) =>
    apiClient
      .get("/api/app/a-mSTicket/after-office-hours-report", {
        params: {
          "api-version": "1.0",
          ...params,
        },
      })
      .then((r) => r.data),
};

export default afterWorkingHoursReportApi;
