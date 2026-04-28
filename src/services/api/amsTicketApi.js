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
    if (typeof value === "string") return value.trim() || null;
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
        if (typeof candidate === "string") return candidate.trim() || null;
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

// Strips timezone Z and milliseconds → "2026-04-28T12:00:00"
const formatDate = (val) => {
    if (val === null || val === undefined || val === "") return null;
    return String(val).replace("Z", "").split(".")[0];
};

// ── Enum label → integer maps (exact form dropdown values) ───────────────────

const ticketTypeMap = {
    "Corrective": 1,
    "Service Planned": 2,
    "Project": 3,
};

const ticketIncomingChannelMap = {
    "Phone": 1,
    "Email": 2,
    "Walk In": 3,
    "WhatsApp": 4,
    "Whatsapp": 4,
    "Whatsapp/viber": 4,
    "Whatsapp/Viber": 4,
    "Viber": 4,
};

const servicePlannedTypeMap = {
    "Preventive Maintenance": 1,
    "Upgrade": 2,
    "Installation": 3,
    "Report": 4,
};

const activityTypeMap = {
    "Documentaion": 1,
    "Documentation": 1,
    "Testing": 2,
    "Installation": 3,
    "Configuration": 4,
    "Maintenance": 5,
};

// Case-insensitive string enum resolver
const resolveStringEnum = (map, value, fallback = 0) => {
    if (isNil(value)) return fallback;
    if (typeof value === "string" && isNaN(Number(value))) {
        if (map[value] !== undefined) return map[value];
        const lower = value.trim().toLowerCase();
        const match = Object.keys(map).find((k) => k.toLowerCase() === lower);
        return match ? map[match] : fallback;
    }
    return normalizeEnum(value, fallback);
};

// Builds activity/detail row — form calls them "activities", API calls them "amsTicketDetails"
const buildDetailPayload = (detail = {}) => ({
    id: pickId(detail.id) || "00000000-0000-0000-0000-000000000000",
    amsTicketId: pickId(detail.amsTicketId) || "00000000-0000-0000-0000-000000000000",
    startDate: toIsoOrNull(detail.startDate),
    endDate: toIsoOrNull(detail.endDate),
    // form sends string label e.g. " Documentaion "
    activityType: resolveStringEnum(activityTypeMap, detail.activityType?.trim?.(), 0),
    // form sends "workDoneCode" as "28040 - Rule Testing and Verification"
    workDoneCodeId: pickId(detail.workDoneCodeId || detail.workDoneCode) || null,
    afterWorkingHoursReasonId: pickId(detail.afterWorkingHoursReasonId) || null,
    afterWorkingHoursReasonRemarks: detail.afterWorkingHoursReasonRemarks || "",
    workDoneCodeAndDescription: detail.workDoneCodeAndDescription || detail.workDoneCode || "",
    // API uses "isLikelyCause", form uses "likelyCause"
    isLikelyCause: toBoolean(
        detail.isLikelyCause ?? detail.likelyCauseOfIssue ?? detail.likelyCause
    ),
    isActive: toBoolean(detail.isActive ?? true),
    isActivityDuringWorkingHours: toBoolean(detail.isActivityDuringWorkingHours),
    amsTicketDetailUserIds: Array.isArray(detail.amsTicketDetailUserIds)
        ? detail.amsTicketDetailUserIds.map(pickId).filter(Boolean)
        : Array.isArray(detail.users)
            ? detail.users.map(pickId).filter(Boolean)
            : Array.isArray(detail.performedByUsers)
                ? detail.performedByUsers.map(pickId).filter(Boolean)
                : [],
});

const buildTicketPayload = (data = {}) => {
    // ── Resolve IDs — handles both form keys and direct API keys ─────────────
    const siteId = pickId(data.siteId || data.site || data.siteName);
    const customerUserId = pickId(data.customerUserId || data.customer || data.customerName);
    const ticketAssignedToId = pickId(data.ticketAssignedToId || data.ticketAssignedTo);
    const ticketForwardedById = pickId(data.ticketForwardedById || data.ticketForwardedBy);
    const cmsTicketAddedById = pickId(
        data.cmsTicketAddedById || data.cmsTicketAddedBy ||
        data.cMSTicketAddedById || data.cMSTicketAddedBy
    );
    const cmsTicketClosedById = pickId(
        data.cmsTicketClosedById || data.cmsTicketClosedBy ||
        data.cMSTicketClosedById || data.cMSTicketClosedBy
    );
    const ticketResolutionVerifiedById = pickId(
        data.ticketResolutionVerifiedById || data.ticketResolutionVerifiedBy
    );

    // ── Activities: form sends "activities", API needs "amsTicketDetails" ────
    const rawActivities =
        Array.isArray(data.amsTicketDetails) && data.amsTicketDetails.length > 0
            ? data.amsTicketDetails
            : Array.isArray(data.activities)
                ? data.activities
                : [];

    const payload = {
        // ── Audit ──────────────────────────────────────────────────────────────
        id: data.id || "00000000-0000-0000-0000-000000000000",
        creationTime: data.creationTime || "0001-01-01T00:00:00",
        creatorId: data.creatorId || null,
        lastModificationTime: data.lastModificationTime || null,
        lastModifierId: data.lastModifierId || null,
        concurrencyStamp: data.concurrencyStamp || null,
        createdBy: data.createdBy || null,
        settings: data.settings || null,

        // ── IDs ────────────────────────────────────────────────────────────────
        siteId,
        siteName: null,                     // never pass siteId GUID as siteName
        siteOCN: null,
        customerUserId,
        ticketAssignedToId,
        ticketAssignedToName: null,
        ticketForwardedById,
        cmsTicketAddedById,
        cmsTicketClosedById,
        ticketClosedByName: null,
        ticketResolutionVerifiedById,
        ticketReOpenedById: data.ticketReOpenedById || null,

        // ── Enums ──────────────────────────────────────────────────────────────
        // New tickets are always status=1 (Open)
        status: data.status ? normalizeEnum(data.status, 1) : 1,
        // form sends string labels → resolve to integers
        ticketType: resolveStringEnum(ticketTypeMap, data.ticketType, 0),
        servicePlannedType: resolveStringEnum(servicePlannedTypeMap, data.servicePlannedType, 0),
        ticketIncomingChannel: resolveStringEnum(ticketIncomingChannelMap, data.ticketIncomingChannel, 0),

        // ── Booleans ───────────────────────────────────────────────────────────
        // form sends "pre", API needs "isPRE"
        isPRE: toBoolean(data.isPRE ?? data.pre),
        isTicketForwarded: toBoolean(data.isTicketForwarded),
        isComingFromEditScreen: toBoolean(data.isComingFromEditScreen),
        isComingFromReOpenScreen: toBoolean(data.isComingFromReOpenScreen),

        // ── Required text ──────────────────────────────────────────────────────
        // cmsNextTicketNo is auto-generated by server — send "0" as placeholder
        cmsNextTicketNo: data.cmsNextTicketNo || data.cMSNextTicketNo || "0",
        // form sends "notes", API needs "ticketNotes"
        ticketNotes: data.ticketNotes || data.notes || "",
        issueDescription: data.issueDescription || null,
        possibleRootCause: data.possibleRootCause || null,
        emailAddress: data.emailAddress || null,

        // ── Dates ──────────────────────────────────────────────────────────────
        // form sends "receivedAt", API needs "ticketReceivedDate"
        ticketReceivedDate:
            formatDate(data.ticketReceivedDate || data.receivedAt) ||
            formatDate(new Date().toISOString()),
        cmsTicketAddedOn:
            formatDate(data.cmsTicketAddedOn || data.cMSTicketAddedOn) ||
            formatDate(new Date().toISOString()),
        cmsTicketClosedOn: formatDate(data.cmsTicketClosedOn || data.cMSTicketClosedOn),
        serviceClosedDate: formatDate(data.serviceClosedDate),
        ticketResolutionVerifiedOn: formatDate(data.ticketResolutionVerifiedOn),

        // ── Numeric ────────────────────────────────────────────────────────────
        // form sends "totalDuration", API needs "activityTotalDuration"
        activityTotalDuration:
            toNumberOrNull(data.activityTotalDuration ?? data.totalDuration) ?? 0,
        afterWorkingHoursActivityTotalAmountForSpecificUser:
            toNumberOrNull(data.afterWorkingHoursActivityTotalAmountForSpecificUser) ?? 0,
        afterWorkingHoursActivityTotalDurationForSpecificUser:
            toNumberOrNull(data.afterWorkingHoursActivityTotalDurationForSpecificUser) ?? 0,
        afterWorkingHoursActivityTotalDurationForSpecificUserSpendTime:
            toNumberOrNull(data.afterWorkingHoursActivityTotalDurationForSpecificUserSpendTime) ?? 0,

        // ── Details ────────────────────────────────────────────────────────────
        // form sends "activities", API needs "amsTicketDetails"
        amsTicketDetails: rawActivities.map(buildDetailPayload),
    };

    // Remove undefined — keep null (API expects nulls)
    Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) delete payload[key];
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
            ...(cmsNextTicketNumbers && { "AMSTicketSearch.CMSNextTicketNumbers": cmsNextTicketNumbers }),
            ...(issueDiscription && { "AMSTicketSearch.IssueDescription": issueDiscription }),
            ...(ticketReceivedDate && { "AMSTicketSearch.TicketReceivedDate": ticketReceivedDate }),
            ...(cmsTicketClosedOn && { "AMSTicketSearch.CMSTicketClosedOn": cmsTicketClosedOn }),
            ...(ticketResolutionVerifiedOn && {
                "AMSTicketSearch.TicketResolutionVerifiedOn": ticketResolutionVerifiedOn,
            }),
            ...(servicePlannedTypes && { "AMSTicketSearch.ServicePlannedTypes": servicePlannedTypes }),
            ...(countryId && { "AMSTicketSearch.CountryId": countryId }),
            ...(customerUserId && { "AMSTicketSearch.CustomerUserId": customerUserId }),
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
        console.log("AMS create payload:", JSON.stringify(payload, null, 2));
        return apiClient.post(BASE, payload)
            .then((r) => r.data)
            .catch((error) => {
                console.error("AMS create error:", JSON.stringify(error.response?.data, null, 2));
                throw error;
            });
    },

    update: (id, data) => {
        const payload = buildTicketPayload(data);
        console.log("AMS update payload:", JSON.stringify(payload, null, 2));
        return apiClient.put(`${BASE}/${id}`, payload)
            .then((r) => r.data)
            .catch((error) => {
                console.error("AMS update error:", JSON.stringify(error.response?.data, null, 2));
                throw error;
            });
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
                        headers: { "Content-Type": "application/json" },
                    })
                    .then((r) => r.data);
            })
            .catch((error) => {
                console.error("DELETE ERROR:", error.response?.data?.error || error.message);
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
        apiClient.get(`${BASE}/a-mSTicket-reports`, { params, ...config }).then((r) => r.data),

    getRulesReportCommission: (params, config = {}) =>
        apiClient.get(`${BASE}/rules-report-aMSTicket-commission`, { params, ...config }).then((r) => r.data),

    getAfterOfficeHoursReport: (params, config = {}) =>
        apiClient.get(`${BASE}/after-office-hours-report`, { params, ...config }).then((r) => r.data),

    compareTickets: (data) =>
        apiClient.post("/api/app/AMSTicket/CompareTickets", data).then((r) => r.data),

    isSettingsSameAfterReOpening: (data) =>
        apiClient.post(`${BASE}/is-settings-same-after-re-opening-ticket`, data).then((r) => r.data),

    isActivityDuringWorkingHours: (data) =>
        apiClient.post(`${BASE}/is-activity-during-working-hours`, data).then((r) => r.data),

    uploadViaPDF: (data, config = {}) =>
        apiClient.post(`${BASE}/ticket-via-pDF`, data, config).then((r) => r.data),
};

export default amsTicketApi;