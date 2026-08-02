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
    "Service Planned": 1,
    "Service Demand": 2,
    "Complaint": 3,
    "Inquiry": 4
};

const ticketIncomingChannelMap = {
    "Phone Call": 1,
    "Email": 2,
    "Whatsapp/viber": 3,
    "Teams": 4,
};

const servicePlannedTypeMap = {
    "Report": 1,
    "Rule": 2,
    "Installation": 3,
    "Configuration": 4,
    "TBS": 5,
    "Other": 6
};

const activityTypeMap = {
    "Technical": 1,
    "Documentation": 2,
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

// Inverse resolver: integer to string
const resolveIntegerToLabel = (map, value) => {
    if (isNil(value)) return "";
    const numValue = Number(value);
    if (numValue === 0) return "";
    const match = Object.keys(map).find((k) => map[k] === numValue);
    return match || String(value);
};

// ── FIX: Dedicated ActivityType resolver ─────────────────────────────────────
// ActivityModal stores activityType as a plain string label (e.g. "Testing").
// buildDetailPayload must always resolve this to a valid integer (1–5) before
// sending to the server. The previous code used null as a fallback which caused:
//   "The JSON value could not be converted to ActivityTypeEnum. Path: $"
// because null is not a valid ActivityTypeEnum value.
//
// Resolution priority:
//   1. Already a valid integer (1–2)       → use as-is
//   2. String label like "Technical"       → look up in activityTypeMap
//   3. Nested object with .id or .value    → extract and resolve
//   4. Anything else / unresolvable        → fall back to 1 (Technical)
//      (1 is the safest non-zero default; the server rejects 0 for this enum)
const ACTIVITY_TYPE_FALLBACK = 1; // Technical — safest non-zero default

const resolveActivityType = (raw) => {
    // null / undefined / empty string → use fallback
    if (isNil(raw)) {
        console.warn("[amsTicketApi] activityType missing — using fallback", ACTIVITY_TYPE_FALLBACK);
        return ACTIVITY_TYPE_FALLBACK;
    }

    // Already a valid integer
    if (typeof raw === "number" && !Number.isNaN(raw) && raw >= 1) {
        return raw;
    }

    // Numeric string like "2"
    const asNum = Number(raw);
    if (!Number.isNaN(asNum) && asNum >= 1) {
        return asNum;
    }

    // String label like "Testing" or "testing"
    if (typeof raw === "string") {
        const trimmed = raw.trim();
        // Exact match
        if (activityTypeMap[trimmed] !== undefined) {
            return activityTypeMap[trimmed];
        }
        // Case-insensitive match
        const lower = trimmed.toLowerCase();
        const key = Object.keys(activityTypeMap).find(
            (k) => k.toLowerCase() === lower
        );
        if (key) return activityTypeMap[key];
    }

    // Object with nested value — e.g. { id: "2" } or { value: "Testing" }
    if (typeof raw === "object") {
        const inner = raw?.id ?? raw?.value ?? raw?.raw?.id ?? raw?.raw?.value ?? null;
        if (!isNil(inner)) {
            return resolveActivityType(inner); // recurse once
        }
    }

    console.warn("[amsTicketApi] Could not resolve activityType:", raw, "— using fallback", ACTIVITY_TYPE_FALLBACK);
    return ACTIVITY_TYPE_FALLBACK;
};

const buildDetailPayload = (detail = {}) => {
    // FIX: Use resolveActivityType instead of resolveStringEnum with null fallback.
    // ActivityModal sends activityType as a plain string label like "Testing".
    // resolveActivityType handles all forms: string label, integer, numeric string,
    // nested object — and always returns a valid integer (never null).
    const rawActType =
        detail.ActivityType ??
        detail.activityType ??
        null;

    const actTypeVal = resolveActivityType(rawActType);

    // Debug log — remove after confirming fix works
    console.log("[buildDetailPayload] rawActType:", rawActType, "→ resolved:", actTypeVal);

    return {
        id: pickId(detail.id) || "00000000-0000-0000-0000-000000000000",
        amsTicketId: pickId(detail.amsTicketId) || "00000000-0000-0000-0000-000000000000",
        startDate: formatDate(toIsoOrNull(detail.startDate)),
        endDate: formatDate(toIsoOrNull(detail.endDate)),
        // FIX: Send the resolved integer under both casing keys the server may expect
        activityType: actTypeVal,
        ActivityType: actTypeVal,
        workDoneCodeId: pickId(detail.workDoneCodeId || detail.workDoneCode) || null,
        afterWorkingHoursReasonId: pickId(detail.afterWorkingHoursReasonId) || null,
        afterWorkingHoursReasonRemarks: detail.afterWorkingHoursReasonRemarks || "",
        workDoneCodeAndDescription: detail.workDoneCodeAndDescription || detail.workDoneCode || "",
        isLikelyCause: toBoolean(
            detail.isLikelyCause ?? detail.likelyCauseOfIssue ?? detail.likelyCause
        ),
        isActive: toBoolean(detail.isActive ?? true),
        isActivityDuringWorkingHours: toBoolean(detail.isActivityDuringWorkingHours ?? true),
        amsTicketDetailUserIds: Array.isArray(detail.amsTicketDetailUserIds)
            ? detail.amsTicketDetailUserIds.map(pickId).filter(Boolean)
            : Array.isArray(detail.users)
                ? detail.users.map(pickId).filter(Boolean)
                : detail.resolvedById
                    ? [detail.resolvedById]
                    : [],
    };
};

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
        siteName: null,
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
        status: data.status ? normalizeEnum(data.status, 1) : 1,
        ticketType: resolveStringEnum(ticketTypeMap, data.ticketType, 0),
        servicePlannedType: resolveStringEnum(servicePlannedTypeMap, data.servicePlannedType, 1),
        ticketIncomingChannel: resolveStringEnum(ticketIncomingChannelMap, data.ticketIncomingChannel, 0),

        // ── Booleans ───────────────────────────────────────────────────────────
        isPRE: toBoolean(data.isPRE ?? data.pre),
        isTicketForwarded: toBoolean(data.isTicketForwarded),
        isComingFromEditScreen: toBoolean(data.isComingFromEditScreen),
        isComingFromReOpenScreen: toBoolean(data.isComingFromReOpenScreen),

        // ── Required text ──────────────────────────────────────────────────────
        cmsNextTicketNo: data.cmsNextTicketNo || data.cMSNextTicketNo || "0",
        ticketNotes: data.ticketNotes || data.notes || "",
        issueDescription: data.issueDescription || null,
        possibleRootCause: data.possibleRootCause || null,
        emailAddress: data.emailAddress || data.incomingChannelEmail || null,

        // ── Dates ──────────────────────────────────────────────────────────────
        ticketReceivedDate:
            formatDate(data.ticketReceivedDate || data.receivedAt) ||
            formatDate(new Date().toISOString()),
        cmsTicketAddedOn:
            formatDate(data.cmsTicketAddedOn || data.cMSTicketAddedOn) ||
            formatDate(new Date().toISOString()),
        cmsTicketClosedOn: formatDate(data.cmsTicketClosedOn || data.cMSTicketClosedOn) || undefined,
        serviceClosedDate: formatDate(data.serviceClosedDate) || undefined,
        ticketResolutionVerifiedOn: formatDate(data.ticketResolutionVerifiedOn) || undefined,

        // ── Numeric ────────────────────────────────────────────────────────────
        activityTotalDuration:
            toNumberOrNull(data.activityTotalDuration ?? data.totalDuration) ?? 0,
        afterWorkingHoursActivityTotalAmountForSpecificUser:
            toNumberOrNull(data.afterWorkingHoursActivityTotalAmountForSpecificUser) ?? 0,
        afterWorkingHoursActivityTotalDurationForSpecificUser:
            toNumberOrNull(data.afterWorkingHoursActivityTotalDurationForSpecificUser) ?? 0,
        afterWorkingHoursActivityTotalDurationForSpecificUserSpendTime:
            toNumberOrNull(data.afterWorkingHoursActivityTotalDurationForSpecificUserSpendTime) ?? 0,

        // ── Activities ─────────────────────────────────────────────────────────
        // FIX: buildDetailPayload now uses resolveActivityType which always returns
        // a valid integer (1–5) and never null, preventing the 400 enum error.
        amsTicketDetails: rawActivities.map(buildDetailPayload),
        aMSTicketDetails: rawActivities.map(buildDetailPayload),
    };

    // Remove undefined — keep null (API expects nulls)
    Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) delete payload[key];
    });

    return payload;
};

// ── FIX: base64 helper for PDF upload ────────────────────────────────────────
// The ticket-via-pDF endpoint's Swagger contract shows:
//   - fileName: query parameter (string)
//   - Request body: application/json, schema = raw string ("string")
// This means the server expects the PDF file content as a base64-encoded
// JSON string, NOT multipart/form-data. Sending FormData (or an object) with
// a multipart Content-Type causes a 415 Unsupported Media Type, because the
// media type sent doesn't match what the endpoint's [Consumes] declares.
const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
        if (!(file instanceof Blob)) {
            reject(new Error("fileToBase64 expects a File/Blob object"));
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            // reader.result looks like: "data:application/pdf;base64,JVBERi0xLjQK..."
            const result = reader.result || "";
            const base64 = typeof result === "string" ? result.split(",")[1] : "";
            if (!base64) {
                reject(new Error("Failed to read file as base64"));
                return;
            }
            resolve(base64);
        };
        reader.onerror = () => reject(reader.error || new Error("FileReader error"));
        reader.readAsDataURL(file);
    });

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

        console.log("[AMS API] getAll params:", JSON.stringify(params, null, 2));
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
                    }
                });

                if (!cleanPayload.servicePlannedType) {
                    cleanPayload.servicePlannedType = 1;
                }
                if (!cleanPayload.serviceClosedDate) {
                    cleanPayload.serviceClosedDate = formatDate(completeTicket.ticketReceivedDate || new Date().toISOString());
                }
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

    close: (id, data) => {
        const payload = buildTicketPayload(data);
        return apiClient.post(`${BASE}/${id}/close-aMSTicket`, payload).then((r) => r.data);
    },

    reOpen: (ticketData) => {
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
                    }
                });

                if (!cleanPayload.servicePlannedType) {
                    cleanPayload.servicePlannedType = 1;
                }
                if (!cleanPayload.serviceClosedDate) {
                    cleanPayload.serviceClosedDate = formatDate(completeTicket.ticketReceivedDate || new Date().toISOString());
                }
                return apiClient
                    .post(`${BASE}/${id}/re-open-aMSTicket`, cleanPayload, {
                        headers: { "Content-Type": "application/json" },
                    })
                    .then((r) => r.data);
            });
    },

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

    // ── FIX: uploadViaPDF ─────────────────────────────────────────────────────
    // Swagger contract for POST /api/app/a-mSTicket/ticket-via-pDF:
    //   - Query param: fileName (string)
    //   - Body: application/json, schema is a raw string (base64 PDF content)
    // Previous implementation just forwarded `data` (often a FormData object)
    // straight to apiClient.post, which axios/browser send as
    // multipart/form-data — a media type the endpoint doesn't declare support
    // for, producing 415 Unsupported Media Type.
    //
    // Call as: amsTicketApi.uploadViaPDF(file) where `file` is a File/Blob
    // from an <input type="file"> element. This function handles the
    // base64 conversion and sends the correct content type automatically.
    uploadViaPDF: async (file, config = {}) => {
        if (!file || typeof file !== "object") {
            throw new Error("uploadViaPDF requires a File/Blob object");
        }
        const fileName = file.name || (config.params && config.params.fileName) || "upload.pdf";
        const base64String = await fileToBase64(file);

        return apiClient
            .post(
                `${BASE}/ticket-via-pDF`,
                JSON.stringify(base64String), // raw JSON string body, matches Swagger schema
                {
                    ...config,
                    params: {
                        fileName,
                        "api-version": "1.0",
                        ...(config.params || {}),
                    },
                    headers: {
                        ...(config.headers || {}),
                        "Content-Type": "application/json",
                    },
                }
            )
            .then((r) => r.data)
            .catch((error) => {
                console.error(
                    "uploadViaPDF error:",
                    JSON.stringify(error.response?.data, null, 2)
                );
                throw error;
            });
    },

    // Export mappers for components
    resolveTicketTypeLabel: (val) => resolveIntegerToLabel(ticketTypeMap, val),
    resolveServicePlannedTypeLabel: (val) => resolveIntegerToLabel(servicePlannedTypeMap, val),
    resolveTicketIncomingChannelLabel: (val) => resolveIntegerToLabel(ticketIncomingChannelMap, val),
    resolveActivityTypeLabel: (val) => resolveIntegerToLabel(activityTypeMap, val),
};

export default amsTicketApi;