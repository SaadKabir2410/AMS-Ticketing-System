import apiClient from "../apiClient";

export const ticketsApi = {
  getAll: ({
    page = 1,
    perPage = 10,
    search,
    sortKey,
    sortDir = "desc",
    columnFilter,
    filterOperator,
  } = {}) => {
    const operatorMap = {
      contains: "Contains",
      equals: "Equals",
      startsWith: "StartsWith",
    };
    const backendOperator = operatorMap[filterOperator] || "Contains";
    const columnFilterParamMap = {
      id: "TicketSearch.Id",
      subject: "TicketSearch.Subject",
      status: "TicketSearch.Status",
      assigneeName: "TicketSearch.AssigneeName",
      siteName: "TicketSearch.SiteName",
    };

    let ticketSearchParams = {};
    if (columnFilter?.value && columnFilterParamMap[columnFilter.field]) {
      const backendParam = columnFilterParamMap[columnFilter.field];
      ticketSearchParams = {
        [backendParam]: columnFilter.value,
        [`${backendParam}Operator`]:
          operatorMap[columnFilter.operator] || backendOperator,
      };
    }

    return apiClient
      .get("/api/app/ams/tickets", {
        params: {
          SkipCount: (page - 1) * perPage,
          MaxResultCount: perPage,
          Filter: search || undefined,
          FilterOperator: backendOperator,
          ...ticketSearchParams,
          Sorting: sortKey
            ? sortKey === "id"
              ? "CreationTime desc"
              : `${sortKey} ${sortDir}`
            : "CreationTime desc",
        },
      })
      .then((r) => r.data);
  },
  getById: (id) => apiClient.get(`/api/app/tickets/${id}`).then((r) => r.data),
  create: (data) =>
    apiClient.post("/api/app/tickets", data).then((r) => r.data),
  update: (id, data) =>
    apiClient.put(`/api/app/tickets/${id}`, data).then((r) => r.data),
  delete: (id) =>
    apiClient.delete(`/api/app/tickets/${id}`).then((r) => r.data),
  getStats: () => apiClient.get("/api/app/tickets/stats").then((r) => r.data),

  // AMS Ticket specific APIs
  createAMSTicket: (data) =>
    apiClient.post("/api/app/a-mSTicket", data).then((r) => r.data),
  getAMSTicket: () => apiClient.get("/api/app/a-mSTicket").then((r) => r.data),
  getAMSTicketById: (id) =>
    apiClient.get(`/api/app/a-mSTicket/${id}/by-id`).then((r) => r.data),
  getAMSTicketIdByTicketNumber: (params) =>
    apiClient
      .get("/api/app/a-mSTicket/id-by-ticket-number", { params })
      .then((r) => r.data),
  getAMSTicketsPagedList: (params) =>
    apiClient
      .get("/api/app/a-mSTicket/paged-list", { params })
      .then((r) => r.data),
  isAnyTicketsOpen: (data) =>
    apiClient
      .post("/api/app/a-mSTicket/is-any-tickets-open", data)
      .then((r) => r.data),
  closeAMSTicket: (id, data) =>
    apiClient
      .post(`/api/app/a-mSTicket/${id}/close-aMSTicket`, data)
      .then((r) => r.data),
  reOpenAMSTicket: (id, data) =>
    apiClient
      .post(`/api/app/a-mSTicket/${id}/re-open-aMSTicket`, data)
      .then((r) => r.data),
  voidAMSTicket: (id, data) =>
    apiClient
      .post(`/api/app/a-mSTicket/${id}/void-aMSTicket`, data)
      .then((r) => r.data),
  updateAMSTicket: (id, data) =>
    apiClient.put(`/api/app/a-mSTicket/${id}`, data).then((r) => r.data),
  getAMSTicketReports: (params, config = {}) =>
    apiClient
      .get("/api/app/a-mSTicket/a-mSTicket-reports", { params, ...config })
      .then((r) => r.data),
  getRulesReportAMSTicketCommission: (params, config = {}) =>
    apiClient
      .get("/api/app/a-mSTicket/rules-report-aMSTicket-commission", {
        params,
        ...config,
      })
      .then((r) => r.data),
  getAfterOfficeHoursReport: (params, config = {}) =>
    apiClient
      .get("/api/app/a-mSTicket/after-office-hours-report", {
        params,
        ...config,
      })
      .then((r) => r.data),
  compareTickets: (data) =>
    apiClient
      .post("/api/app/AMSTicket/CompareTickets", data)
      .then((r) => r.data),
  isSettingsSameAfterReOpeningTicket: (data) =>
    apiClient
      .post(
        "/api/app/a-mSTicket/is-settings-same-after-re-opening-ticket",
        data,
      )
      .then((r) => r.data),
  isActivityDuringWorkingHours: (data) =>
    apiClient
      .post("/api/app/a-mSTicket/is-activity-during-working-hours", data)
      .then((r) => r.data),
  ticketViaPDF: (data, config = {}) =>
    apiClient
      .post("/api/app/a-mSTicket/ticket-via-pDF", data, config)
      .then((r) => r.data),
};

export default ticketsApi;
