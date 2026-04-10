import apiClient from "../apiClient";

const BASE = "/api/app/a-mSTicket";

const operatorMap = {
    contains: "Contains",
    equals: "Equals",
    startsWith: "StartsWith",
};

const columnFilterParamMap = {
    siteName: "AMSTicketSearch.SiteName",
    siteOcn: "AMSTicketSearch.SiteOCN",
    ticketNo: "AMSTicketSearch.TicketNo",
    status: "AMSTicketSearch.Status",
    pre: "AMSTicketSearch.Pre",
    ticketClosedBy: "AMSTicketSearch.TicketClosedBy",
    createdBy: "AMSTicketSearch.CreatedBy",
};

export const amsTicketApi = {

    getAll: ({
        page = 1,
        perPage = 10,
        search,
        sortKey,
        sortDir = "desc",
        columnFilter,
        filterOperator,
        userId = "",
        siteName = "",
        siteOcn = "",
        ticketIncomingChannel = 0,
        ticketForwardedBy = "",
        cmsNextTicketNo = "",
        cmsNextTicketNumbers = "",
        issueDiscription = "",
        ticketReceivedDate = "",
        cmsTicketClosedOn = "",
        ticketResolutionVerifiedOn = "",
        status = "",
        ticketType = 0,
        servicePlannedType = 0,
        servicePlannedTypes = "",
        countryId = "",
        customerUserId = "",
        workDoneCodeIds = "",
        performedByUsers = "",
        ticketNumbers = "",
        compressedTicketNumbers = "",
        dateFrom = "",
        dateTo = "",
    } = {}) => {
        const backendOperator = operatorMap[filterOperator] || "Contains";

        let columnFilterParams = {};
        if (columnFilter?.value && columnFilterParamMap[columnFilter.field]) {
            const backendParam = columnFilterParamMap[columnFilter.field];
            columnFilterParams = {
                [backendParam]: columnFilter.value,
                [`${backendParam}Operator`]:
                    operatorMap[columnFilter.operator] || backendOperator,
            };
        }

        const sortMap = {
            "siteName": "Site.Name",
            "siteOCN": "Site.OCN",
            "cmsNextTicketNo": "CMSNextTicketNo",
            "ticketReceivedDate": "TicketReceivedDate",
            "status": "Status",
            "isPRE": "IsPRE",
            "ticketClosedByName": "TicketClosedBy",
            "createdBy": "CreatedBy",
            "activityTotalDuration": "ActivityTotalDuration",
            "cmsTicketClosedOn": "CMSTicketClosedOn",
            "serviceClosedDate": "ServiceClosedDate",
        };

        const backendSortKey = sortKey
            ? sortKey === "id"
                ? "CreationTime"
                : sortMap[sortKey] || `${sortKey.charAt(0).toUpperCase()}${sortKey.slice(1)}`
            : "CreationTime";

        const params = {
            //pagination /sorting
            Filter: search || "",
            Sorting: `${backendSortKey} ${sortDir}`,
            SkipCount: (page - 1) * perPage,
            MaxResultCount: perPage,
            "api-version": "1.0",

            ...columnFilterParams,

            // Only include when non-empty (backend rejects empty strings for these)
            ...(userId && { "AMSTicketSearch.UserId": userId }),
            ...(workDoneCodeIds && { "AMSTicketSearch.WorkDoneCodeIds": workDoneCodeIds }),
            ...(performedByUsers && { "AMSTicketSearch.PerformedByUsers": performedByUsers }),

            // Safe string filters
            // ONLY send when value exists
            ...(userId && { "AMSTicketSearch.UserId": userId }),
            ...(workDoneCodeIds && { "AMSTicketSearch.WorkDoneCodeIds": workDoneCodeIds }),
            ...(performedByUsers && { "AMSTicketSearch.PerformedByUsers": performedByUsers }),

            ...(siteName && { "AMSTicketSearch.SiteName": siteName }),
            ...(siteOcn && { "AMSTicketSearch.SiteOCN": siteOcn }),
            ...(ticketForwardedBy && { "AMSTicketSearch.TicketForwardedBy": ticketForwardedBy }),
            ...(cmsNextTicketNo && { "AMSTicketSearch.CMSNextTicketNo": cmsNextTicketNo }),
            ...(cmsNextTicketNumbers && { "AMSTicketSearch.CMSNextTicketNumbers": cmsNextTicketNumbers }),

            //  FIX TYPO HERE
            ...(issueDiscription && { "AMSTicketSearch.IssueDescription": issueDiscription }),

            ...(ticketReceivedDate && { "AMSTicketSearch.TicketReceivedDate": ticketReceivedDate }),
            ...(cmsTicketClosedOn && { "AMSTicketSearch.CMSTicketClosedOn": cmsTicketClosedOn }),
            ...(ticketResolutionVerifiedOn && { "AMSTicketSearch.TicketResolutionVerifiedOn": ticketResolutionVerifiedOn }),
            ...(servicePlannedTypes && { "AMSTicketSearch.ServicePlannedTypes": servicePlannedTypes }),
            ...(countryId && { "AMSTicketSearch.CountryId": countryId }),
            ...(customerUserId && { "AMSTicketSearch.CustomerUserId": customerUserId }),
            ...(ticketNumbers && { "AMSTicketSearch.TicketNumbers": ticketNumbers }),
            ...(compressedTicketNumbers && { "AMSTicketSearch.CompressedTicketNumbers": compressedTicketNumbers }),

            //  CRITICAL FIX (dates)
            ...(dateFrom && { "AMSTicketSearch.DateFrom": dateFrom }),
            ...(dateTo && { "AMSTicketSearch.DateTo": dateTo }),

            ...(status && { "AMSTicketSearch.Status": status }),
            ...(ticketIncomingChannel && { "AMSTicketSearch.TicketIncomingChannel": ticketIncomingChannel }),
            ...(ticketType && { "AMSTicketSearch.TicketType": ticketType }),
            ...(servicePlannedType && { "AMSTicketSearch.ServicePlannedType": servicePlannedType }),
        };

        return apiClient
            .get(`${BASE}/paged-list`, { params })
            .then((r) => r.data);
    },

    // ─── Core CRUD ────────────────────────────────────────────────────────────

    getById: (id) =>
        apiClient.get(`${BASE}/${id}/by-id`).then((r) => r.data),

    create: (data) =>
        apiClient.post(BASE, data).then((r) => r.data),

    update: (id, data) =>
        apiClient.put(`${BASE}/${id}`, data).then((r) => r.data),

    delete: (ticketData) => {
        const id = typeof ticketData === 'string' ? ticketData : ticketData.id;

        return apiClient.get(`${BASE}/${id}/by-id`)
            .then((response) => {
                const completeTicket = response.data;

                console.log('Original ticket:', completeTicket);
                console.log('servicePlannedType:', completeTicket.servicePlannedType);

                // Create a clean payload - remove null/undefined fields
                const cleanPayload = {};
                Object.keys(completeTicket).forEach(key => {
                    const value = completeTicket[key];
                    // Include the field only if it has a value
                    if (value !== null && value !== undefined) {
                        cleanPayload[key] = value;
                    } else if (key === 'servicePlannedType') {
                        // For servicePlannedType, use 0 if null
                        cleanPayload[key] = 0;
                    }
                });

                console.log('Clean payload being sent:', cleanPayload);
                console.log('Cleaned servicePlannedType:', cleanPayload.servicePlannedType);

                // Send void request with cleaned payload
                return apiClient.post(`${BASE}/${id}/void-aMSTicket`, cleanPayload, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                    .then((r) => {
                        console.log('Ticket voided successfully');
                        return r.data;
                    });
            })
            .catch((error) => {
                console.error('DELETE ERROR:', error.response?.data?.error || error.message);
                throw error;
            });
    },

    // ─── Status Actions ───────────────────────────────────────────────────────

    close: (id, data) =>
        apiClient.post(`${BASE}/${id}/close-aMSTicket`, data).then((r) => r.data),

    reOpen: (id, data) =>
        apiClient.post(`${BASE}/${id}/re-open-aMSTicket`, data).then((r) => r.data),

    isAnyOpen: (data) =>
        apiClient.post(`${BASE}/is-any-tickets-open`, data).then((r) => r.data),

    // ─── Lookup Helpers ───────────────────────────────────────────────────────

    getIdByTicketNumber: (params) =>
        apiClient
            .get(`${BASE}/id-by-ticket-number`, { params })
            .then((r) => r.data),

    // ─── Reports ─────────────────────────────────────────────────────────────

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

    // ─── Validation / Checks ─────────────────────────────────────────────────

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