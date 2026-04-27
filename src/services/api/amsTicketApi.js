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

const isNil = (value) => value === null || value === undefined || value === "";

const isGuid = (value) =>
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value.trim()
    );

const toIsoOrNull = (value) => {
    if (isNil(value)) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const toNumberOrNull = (value) => {
    if (isNil(value)) return null;
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
};

const toBoolean = (value) => !!value;

const pickId = (value) => {
    if (isNil(value)) return null;

    if (typeof value === "string") {
        return value.trim() || null;
    }

    if (typeof value === "object") {
        const candidate =
            value.id ??
            value.value ??
            value.userId ??
            value.siteId ??
            value.customerUserId ??
            value.raw?.id ??
            value.raw?.value ??
            null;

        if (typeof candidate === "string") {
            return candidate.trim() || null;
        }

        return null;
    }

    return null;
};

const normalizeEnum = (value, fallback = 0) => {
    if (isNil(value)) return fallback;

    if (typeof value === "object") {
        if (!isNil(value.id)) {
            const enumValue = Number(value.id);
            return Number.isNaN(enumValue) ? fallback : enumValue;
        }
        if (!isNil(value.raw?.value)) {
            const enumValue = Number(value.raw.value);
            return Number.isNaN(enumValue) ? fallback : enumValue;
        }
    }

    const enumValue = Number(value);
    return Number.isNaN(enumValue) ? fallback : enumValue;
};

const buildDetailPayload = (detail = {}) => ({
    id: pickId(detail.id) || undefined,
    amsTicketId: pickId(detail.amsTicketId) || undefined,
    startDate: toIsoOrNull(detail.startDate),
    endDate: toIsoOrNull(detail.endDate),
    activityType: normalizeEnum(detail.activityType, 0),
    workDoneCodeId: pickId(detail.workDoneCodeId || detail.workDoneCode),
    afterWorkingHoursReasonId: pickId(detail.afterWorkingHoursReasonId),
    afterWorkingHoursReasonRemarks: detail.afterWorkingHoursReasonRemarks || "",
    workDoneCodeAndDescription: detail.workDoneCodeAndDescription || "",
    amsTicketDetailUserIds: Array.isArray(detail.amsTicketDetailUserIds)
        ? detail.amsTicketDetailUserIds.map(pickId).filter(Boolean)
        : Array.isArray(detail.users)
            ? detail.users.map(pickId).filter(Boolean)
            : Array.isArray(detail.performedByUsers)
                ? detail.performedByUsers.map(pickId).filter(Boolean)
                : [],
    likelyCauseOfIssue: toBoolean(detail.likelyCauseOfIssue || detail.likelyCause),
});

const buildTicketPayload = (data = {}) => {
    const siteId = pickId(data.siteId || data.site || data.siteName);
    const customerUserId = pickId(
        data.customerUserId || data.customer || data.customerName
    );
    const ticketAssignedToId = pickId(
        data.ticketAssignedToId || data.ticketAssignedTo
    );
    const ticketForwardedById = pickId(
        data.ticketForwardedById || data.ticketForwardedBy
    );
    const cmsTicketAddedById = pickId(
        data.cmsTicketAddedById || data.cmsTicketAddedBy
    );
    const cmsTicketClosedById = pickId(
        data.cmsTicketClosedById || data.cmsTicketClosedBy
    );
    const ticketResolutionVerifiedById = pickId(
        data.ticketResolutionVerifiedById || data.ticketResolutionVerifiedBy
    );

    const payload = {
        id: pickId(data.id) || undefined,
        siteId,
        ticketAssignedToId,
        ticketReceivedDate: toIsoOrNull(
            data.ticketReceivedDate || data.receivedAt
        ),
        customerUserId,
        ticketIncomingChannel: normalizeEnum(data.ticketIncomingChannel, 0),
        emailAddress: data.emailAddress || "",
        isTicketForwarded: toBoolean(data.isTicketForwarded),
        ticketForwardedById: toBoolean(data.isTicketForwarded)
            ? ticketForwardedById
            : null,
        cmsNextTicketNo: data.cmsNextTicketNo || "",
        issueDescription: data.issueDescription || "",
        possibleRootCause: data.possibleRootCause || "",
        status: normalizeEnum(data.status, 0),
        cmsTicketAddedById,
        cmsTicketAddedOn: toIsoOrNull(data.cmsTicketAddedOn),
        cmsTicketClosedById,
        cmsTicketClosedOn: toIsoOrNull(data.cmsTicketClosedOn),
        ticketResolutionVerifiedById,
        ticketResolutionVerifiedOn: toIsoOrNull(data.ticketResolutionVerifiedOn),
        isPRE: toBoolean(data.isPRE ?? data.pre),
        activityTotalDuration:
            toNumberOrNull(data.activityTotalDuration ?? data.totalDuration) ?? 0,
        amsTicketDetails: Array.isArray(data.amsTicketDetails)
            ? data.amsTicketDetails.map(buildDetailPayload)
            : Array.isArray(data.activities)
                ? data.activities.map(buildDetailPayload)
                : [],
        ticketType: normalizeEnum(data.ticketType, 0),
        servicePlannedType: normalizeEnum(data.servicePlannedType, 0),
        ticketNotes: data.ticketNotes ?? data.notes ?? "",
        concurrencyStamp: data.concurrencyStamp || undefined,
        serviceClosedDate: toIsoOrNull(data.serviceClosedDate),
        isComingFromEditScreen: toBoolean(data.isComingFromEditScreen),
        isComingFromReOpenScreen: toBoolean(data.isComingFromReOpenScreen),
    };

    Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) {
            delete payload[key];
        }
    });

    return payload;
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
            siteName: "Site.Name",
            siteOCN: "Site.OCN",
            cmsNextTicketNo: "CMSNextTicketNo",
            ticketReceivedDate: "TicketReceivedDate",
            status: "Status",
            isPRE: "IsPRE",
            ticketClosedByName: "TicketClosedBy",
            createdBy: "CreatedBy",
            activityTotalDuration: "ActivityTotalDuration",
            cmsTicketClosedOn: "CMSTicketClosedOn",
            serviceClosedDate: "ServiceClosedDate",
        };

        const backendSortKey = sortKey
            ? sortKey === "id"
                ? "CreationTime"
                : sortMap[sortKey] ||
                `${sortKey.charAt(0).toUpperCase()}${sortKey.slice(1)}`
            : "CreationTime";

        const params = {
            Filter: search || "",
            Sorting: `${backendSortKey} ${sortDir}`,
            SkipCount: (page - 1) * perPage,
            MaxResultCount: perPage,
            "api-version": "1.0",

            ...columnFilterParams,

            ...(userId && { "AMSTicketSearch.UserId": userId }),
            ...(workDoneCodeIds && { "AMSTicketSearch.WorkDoneCodeIds": workDoneCodeIds }),
            ...(performedByUsers && { "AMSTicketSearch.PerformedByUsers": performedByUsers }),
            ...(siteName && { "AMSTicketSearch.SiteName": siteName }),
            ...(siteOcn && { "AMSTicketSearch.SiteOCN": siteOcn }),
            ...(ticketForwardedBy && { "AMSTicketSearch.TicketForwardedBy": ticketForwardedBy }),
            ...(cmsNextTicketNo && { "AMSTicketSearch.CMSNextTicketNo": cmsNextTicketNo }),
            ...(cmsNextTicketNumbers && {
                "AMSTicketSearch.CMSNextTicketNumbers": cmsNextTicketNumbers,
            }),
            ...(issueDiscription && {
                "AMSTicketSearch.IssueDescription": issueDiscription,
            }),
            ...(ticketReceivedDate && {
                "AMSTicketSearch.TicketReceivedDate": ticketReceivedDate,
            }),
            ...(cmsTicketClosedOn && {
                "AMSTicketSearch.CMSTicketClosedOn": cmsTicketClosedOn,
            }),
            ...(ticketResolutionVerifiedOn && {
                "AMSTicketSearch.TicketResolutionVerifiedOn":
                    ticketResolutionVerifiedOn,
            }),
            ...(servicePlannedTypes && {
                "AMSTicketSearch.ServicePlannedTypes": servicePlannedTypes,
            }),
            ...(countryId && { "AMSTicketSearch.CountryId": countryId }),
            ...(customerUserId && {
                "AMSTicketSearch.CustomerUserId": customerUserId,
            }),
            ...(ticketNumbers && { "AMSTicketSearch.TicketNumbers": ticketNumbers }),
            ...(compressedTicketNumbers && {
                "AMSTicketSearch.CompressedTicketNumbers": compressedTicketNumbers,
            }),
            ...(dateFrom && { "AMSTicketSearch.DateFrom": dateFrom }),
            ...(dateTo && { "AMSTicketSearch.DateTo": dateTo }),
            ...(status && { "AMSTicketSearch.Status": status }),
            ...(ticketIncomingChannel && {
                "AMSTicketSearch.TicketIncomingChannel": ticketIncomingChannel,
            }),
            ...(ticketType && { "AMSTicketSearch.TicketType": ticketType }),
            ...(servicePlannedType && { "AMSTicketSearch.ServicePlannedType": servicePlannedType }),
        };

        return apiClient.get(`${BASE}/paged-list`, { params }).then((r) => r.data);
    },

    getById: (id) =>
        apiClient.get(`${BASE}/${id}/by-id`).then((r) => r.data),

    create: (data) => {
        const payload = buildTicketPayload(data);
        console.log("AMS create payload:", payload);
        return apiClient.post(BASE, payload).then((r) => r.data);
    },

    update: (id, data) => {
        const payload = buildTicketPayload(data);
        console.log("AMS update payload:", payload);
        return apiClient.put(`${BASE}/${id}`, payload).then((r) => r.data);
    },

    delete: (ticketData) => {
        const id = typeof ticketData === "string" ? ticketData : ticketData.id;

        return apiClient
            .get(`${BASE}/${id}/by-id`)
            .then((response) => {
                const completeTicket = response.data;

                const cleanPayload = {};
                Object.keys(completeTicket).forEach((key) => {
                    const value = completeTicket[key];
                    if (value !== null && value !== undefined) {
                        cleanPayload[key] = value;
                    } else if (key === "servicePlannedType") {
                        cleanPayload[key] = 0;
                    }
                });

                return apiClient
                    .post(`${BASE}/${id}/void-aMSTicket`, cleanPayload, {
                        headers: {
                            "Content-Type": "application/json",
                        },
                    })
                    .then((r) => r.data);
            })
            .catch((error) => {
                console.error(
                    "DELETE ERROR:",
                    error.response?.data?.error || error.message
                );
                throw error;
            });
    },

    close: (id, data) =>
        apiClient.post(`${BASE}/${id}/close-aMSTicket`, data).then((r) => r.data),

    reOpen: (id, data) =>
        apiClient.post(`${BASE}/${id}/re-open-aMSTicket`, data).then((r) => r.data),

    isAnyOpen: (data) =>
        apiClient.post(`${BASE}/is-any-tickets-open`, data).then((r) => r.data),

    getIdByTicketNumber: (params) =>
        apiClient.get(`${BASE}/id-by-ticket-number`, { params }).then((r) => r.data),

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

    compareTickets: (data) =>
        apiClient.post("/api/app/AMSTicket/CompareTickets", data).then((r) => r.data),

    isSettingsSameAfterReOpening: (data) =>
        apiClient
            .post(`${BASE}/is-settings-same-after-re-opening-ticket`, data)
            .then((r) => r.data),

    isActivityDuringWorkingHours: (data) =>
        apiClient
            .post(`${BASE}/is-activity-during-working-hours`, data)
            .then((r) => r.data),

    uploadViaPDF: (data, config = {}) =>
        apiClient
            .post(`${BASE}/ticket-via-pDF`, data, config)
            .then((r) => r.data),
};

export default amsTicketApi;
