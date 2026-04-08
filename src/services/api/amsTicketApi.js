import apiClient from "../apiClient";

const BASE = "/api/app/a-mSTicket";

// Operator map shared across filter usages
const operatorMap = {
    contains: "Contains",
    equals: "Equals",
    startsWith: "StartsWith",
};

// Maps DataGrid column keys → backend AMSTicketSearch param names
const columnFilterParamMap = {
    siteName: "AMSTicketSearch.SiteName",
    siteOcn: "AMSTicketSearch.SiteOcn",
    ticketNo: "AMSTicketSearch.TicketNo",
    status: "AMSTicketSearch.Status",
    pre: "AMSTicketSearch.Pre",
    ticketClosedBy: "AMSTicketSearch.TicketClosedBy",
    createdBy: "AMSTicketSearch.CreatedBy",
};

export const amsTicketApi = {
    // ─── Core CRUD ────────────────────────────────────────────────────────────

    /**
     * Paged list — used by ResourcePage as `getAll`
     */
    getAll: ({
        page = 1,
        perPage = 10,
        search,
        sortKey,
        sortDir = "desc",
        columnFilter,
        filterOperator,
        // Advanced search extras (pass from AMSTicketsPage when isAdvancedSearch=true)
        userId,
        status,
        dateFrom,
        dateTo,
    } = {}) => {
        const backendOperator = operatorMap[filterOperator] || "Contains";

        // Build column-level filter params
        let columnFilterParams = {};
        if (columnFilter?.value && columnFilterParamMap[columnFilter.field]) {
            const backendParam = columnFilterParamMap[columnFilter.field];
            columnFilterParams = {
                [backendParam]: columnFilter.value,
                [`${backendParam}Operator`]:
                    operatorMap[columnFilter.operator] || backendOperator,
            };
        }

        // Build advanced search params (only include if provided)
        const advancedParams = {
            ...(userId !== undefined && {
                "AMSTicketSearch.UserId": userId,
            }),
            ...(status && { "AMSTicketSearch.Status": status }),
            ...(dateFrom && { "AMSTicketSearch.DateFrom": dateFrom }),
            ...(dateTo && { "AMSTicketSearch.DateTo": dateTo }),
        };

        return apiClient
            .get(`${BASE}/paged-list`, {
                params: {
                    SkipCount: (page - 1) * perPage,
                    MaxResultCount: perPage,
                    Filter: search || undefined,
                    Sorting: sortKey
                        ? sortKey === "id"
                            ? "CreationTime desc"
                            : `${sortKey} ${sortDir}`
                        : "CreationTime desc",
                    ...columnFilterParams,
                    ...advancedParams,
                    "api-version": "1.0",
                },
            })
            .then((r) => r.data);
    },

    /** Get single ticket by ID */
    getById: (id) =>
        apiClient.get(`${BASE}/${id}/by-id`).then((r) => r.data),

    /** Create a new AMS ticket */
    create: (data) =>
        apiClient.post(BASE, data).then((r) => r.data),

    /** Update an existing AMS ticket */
    update: (id, data) =>
        apiClient.put(`${BASE}/${id}`, data).then((r) => r.data),

    /** Soft-delete / void an AMS ticket */
    delete: (id, data = {}) =>
        apiClient.post(`${BASE}/${id}/void-aMSTicket`, data).then((r) => r.data),

    // ─── Status Actions ────────────────────────────────────────────────────────

    close: (id, data) =>
        apiClient.post(`${BASE}/${id}/close-aMSTicket`, data).then((r) => r.data),

    reOpen: (id, data) =>
        apiClient.post(`${BASE}/${id}/re-open-aMSTicket`, data).then((r) => r.data),

    isAnyOpen: (data) =>
        apiClient.post(`${BASE}/is-any-tickets-open`, data).then((r) => r.data),

    // ─── Lookup Helpers ────────────────────────────────────────────────────────

    getIdByTicketNumber: (params) =>
        apiClient
            .get(`${BASE}/id-by-ticket-number`, { params })
            .then((r) => r.data),

    // ─── Reports ──────────────────────────────────────────────────────────────

    getReports: (params, config = {}) =>
        apiClient
            .get(`${BASE}/a-mSTicket-reports`, { params, ...config })
            .then((r) => r.data),

    getRulesReportCommission: (params, config = {}) =>
        apiClient
            .get(`${BASE}/rules-report-aMSTicket-commission`, { params, ...config })
            .then((r) => r.data),

    getAfterOfficeHoursReport: (params, config = {}) =>
        apiClient
            .get(`${BASE}/after-office-hours-report`, { params, ...config })
            .then((r) => r.data),

    // ─── Validation / Checks ──────────────────────────────────────────────────

    compareTickets: (data) =>
        apiClient
            .post("/api/app/AMSTicket/CompareTickets", data)
            .then((r) => r.data),

    isSettingsSameAfterReOpening: (data) =>
        apiClient
            .post(`${BASE}/is-settings-same-after-re-opening-ticket`, data)
            .then((r) => r.data),

    isActivityDuringWorkingHours: (data) =>
        apiClient
            .post(`${BASE}/is-activity-during-working-hours`, data)
            .then((r) => r.data),

    // ─── File / PDF ───────────────────────────────────────────────────────────

    uploadViaPDF: (data, config = {}) =>
        apiClient
            .post(`${BASE}/ticket-via-pDF`, data, config)
            .then((r) => r.data),
};

export default amsTicketApi;