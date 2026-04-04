import apiClient from "../apiClient";

export const ticketCommissionReportApi = {
  getReport: (params) => {
    const queryParams = {
      "api-version": "1.0",
      UserId: params.UserId || "00000000-0000-0000-0000-000000000000",
      Status: params.Status,
      TicketType: params.TicketType,
      DateFrom: params.DateFrom,
      DateTo: params.DateTo,
    };

    //  ServicePlannedTypes as indexed string array
    if (params.ServicePlannedTypes?.length) {
      params.ServicePlannedTypes.forEach((val, index) => {
        queryParams[`ServicePlannedTypes[${index}]`] = val;
      });
    }

    //  PerformedByUsers as indexed array
    if (params.PerformedByUsers?.length) {
      params.PerformedByUsers.forEach((userId, index) => {
        queryParams[`PerformedByUsers[${index}]`] = userId;
      });
    }

    // Remove undefined/null/empty values
    const cleanParams = Object.fromEntries(
      Object.entries(queryParams).filter(
        ([_, v]) => v !== undefined && v !== null && v !== "",
      ),
    );

    return apiClient
      .get("/api/app/a-mSTicket/rules-report-aMSTicket-commission", {
        params: cleanParams,
      })
      .then((r) => r.data);
  },
};

export default ticketCommissionReportApi;
