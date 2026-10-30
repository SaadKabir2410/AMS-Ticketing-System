import apiClient from "../apiClient";

const BASE = "/api/app/a-mSTicket";

const isNil = (value) => value === null || value === undefined || value === "";

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

// Activity date-times are entered as local wall-clock values. Converting them
// with toISOString() shifts the hour to UTC, so preserve the displayed local
// components and send a timezone-neutral ISO date-time to the API.
const formatActivityDate = (value) => {
    if (isNil(value)) return null;

    const text = String(value).trim();
    const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text);
    const localParts = text.match(
        /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/,
    );

    if (localParts && !hasTimezone) {
        const [, year, month, day, hour, minute, second = "00"] = localParts;
        return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    const pad = (part) => String(part).padStart(2, "0");
    return [
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
        `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
    ].join("T");
};

// ── Enum label → integer maps (exact form dropdown values) ───────────────────

const ticketTypeMap = {
    "Service Planned": 1,
    "Service Demand": 2,
    "Inquiry": 3,
    "Complaint": 4
};

const ticketIncomingChannelMap = {
    "Whatsapp/Viber/Zalo": 1,
    "Phone Call": 2,
    "Email": 3,
    "Teams": 4,
};

export const TICKET_INCOMING_CHANNEL_OPTIONS = Object.entries(ticketIncomingChannelMap)
    .sort(([, leftValue], [, rightValue]) => leftValue - rightValue)
    .map(([label, value]) => ({ label, value }));

const servicePlannedTypeMap = {
    "All": -1,
    "Select An Option": 0,
    "Report": 1,
    "Rule": 2,
    "Installation": 3,
    "Configuration": 4,
    "TSB": 5,
    "Other": 6
};

export const SERVICE_PLANNED_TYPE_OPTIONS = [
    { label: "All", value: "", apiValue: servicePlannedTypeMap.All },
    { label: "Custom Report", value: "Report", apiValue: servicePlannedTypeMap.Report },
    { label: "Custom Rule", value: "Rule", apiValue: servicePlannedTypeMap.Rule },
    { label: "Installation", value: "Installation", apiValue: servicePlannedTypeMap.Installation },
    { label: "Configuration", value: "Configuration", apiValue: servicePlannedTypeMap.Configuration },
    { label: "TSB", value: "TSB", apiValue: servicePlannedTypeMap.TSB },
    { label: "Other", value: "Other", apiValue: servicePlannedTypeMap.Other },
];

const activityTypeMap = {
    "Documentation": 1,
    "Technical": 2,
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
const ACTIVITY_TYPE_FALLBACK = 2; // Technical — safest non-zero default

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
        detail.activityTypeId ??
        detail.activityType ??
        detail.ActivityType ??
        null;

    const actTypeVal = resolveActivityType(rawActType);

    // Debug log — remove after confirming fix works
    console.log("[buildDetailPayload] rawActType:", rawActType, "→ resolved:", actTypeVal);

    const editedResolvedById = pickId(detail.resolvedById);
    const resolvedUserIds = editedResolvedById
        ? [editedResolvedById]
        : Array.isArray(detail.amsTicketDetailUserIds)
            ? detail.amsTicketDetailUserIds.map(pickId).filter(Boolean)
            : Array.isArray(detail.users)
                ? detail.users.map(pickId).filter(Boolean)
                : [];

    return {
        id: pickId(detail.id) || "00000000-0000-0000-0000-000000000000",
        amsTicketId: pickId(detail.amsTicketId) || "00000000-0000-0000-0000-000000000000",
        creationTime: detail.creationTime || "0001-01-01T00:00:00",
        creatorId: pickId(detail.creatorId) || null,
        lastModificationTime: detail.lastModificationTime || null,
        lastModifierId: pickId(detail.lastModifierId) || null,
        concurrencyStamp: detail.concurrencyStamp || null,
        startDate: formatActivityDate(detail.startDate),
        endDate: formatActivityDate(detail.endDate),
        // The DTO contract uses camelCase. Keep a single source of truth so a
        // stale PascalCase property from a fetched row cannot override an edit.
        activityType: actTypeVal,
        workDoneCodeId: pickId(detail.workDoneCodeId || detail.workDoneCode) || null,
        afterWorkingHoursReasonId: pickId(detail.afterWorkingHoursReasonId) || null,
        afterWorkingHoursReasonRemarks: detail.afterWorkingHoursReasonRemarks || "",
        workDoneCodeAndDescription: detail.workDoneCode || detail.workDoneCodeAndDescription || "",
        isLikelyCause: toBoolean(
            detail.isLikelyCause ?? detail.likelyCauseOfIssue ?? detail.likelyCause
        ),
        isActive: toBoolean(detail.isActive ?? true),
        isActivityDuringWorkingHours: toBoolean(detail.isActivityDuringWorkingHours ?? true),
        // An edited Resolved By value must override the IDs from the original
        // activity record that were spread into the form state.
        amsTicketDetailUserIds: resolvedUserIds,
    };
};

const GUID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

// On edit the form state also carries the fetched API record, so the stale
// API id (e.g. ticketAssignedToId) sits next to the edited form value (e.g.
// ticketAssignedTo). Prefer the edited form value whenever it is a real id.
const pickEditedId = (formValue, ...apiValues) => {
    const editedId = pickId(formValue);
    if (editedId && GUID_PATTERN.test(editedId)) return editedId;
    for (const apiValue of apiValues) {
        const apiId = pickId(apiValue);
        if (apiId) return apiId;
    }
    return editedId;
};

const buildTicketPayload = (data = {}) => {
    // ── Resolve IDs — handles both form keys and direct API keys ─────────────
    const siteId = pickEditedId(data.siteName, data.siteId, data.site);
    const customerUserId = pickEditedId(data.customer, data.customerUserId, data.customerName);
    const ticketAssignedToId = pickEditedId(data.ticketAssignedTo, data.ticketAssignedToId);
    const ticketForwardedById = data.isTicketForwarded === false
        ? null
        : pickEditedId(data.ticketForwardedBy, data.ticketForwardedById);
    const cmsTicketAddedById = pickEditedId(
        data.cmsTicketAddedBy,
        data.cmsTicketAddedById, data.cMSTicketAddedById, data.cMSTicketAddedBy
    );
    const cmsTicketClosedById = pickEditedId(
        data.cmsTicketClosedBy,
        data.cmsTicketClosedById, data.cMSTicketClosedById, data.cMSTicketClosedBy
    );
    const ticketResolutionVerifiedById = pickEditedId(
        data.ticketResolutionVerifiedBy, data.ticketResolutionVerifiedById
    );

    // ── Activities: form sends "activities", API needs "amsTicketDetails" ────
    // `activities` is the editable form collection. On edit, the fetched
    // `amsTicketDetails` collection also remains on the ticket object, so it
    // must not take precedence or the API receives the stale pre-edit values.
    const rawActivities = Array.isArray(data.activities)
        ? data.activities
        : Array.isArray(data.amsTicketDetails)
            ? data.amsTicketDetails
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
        // Only Service Planned tickets have a planned type; 0 is stored as none by the backend.
        servicePlannedType: resolveStringEnum(ticketTypeMap, data.ticketType, 0) === ticketTypeMap["Service Planned"]
            ? resolveStringEnum(servicePlannedTypeMap, data.servicePlannedType, 0)
            : 0,
        ticketIncomingChannel: resolveStringEnum(ticketIncomingChannelMap, data.ticketIncomingChannel, 0),

        // ── Booleans ───────────────────────────────────────────────────────────
        isPRE: toBoolean(data.pre ?? data.isPRE),
        isTicketForwarded: toBoolean(data.isTicketForwarded),
        isComingFromEditScreen: toBoolean(data.isComingFromEditScreen),
        isComingFromReOpenScreen: toBoolean(data.isComingFromReOpenScreen),

        // ── Required text ──────────────────────────────────────────────────────
        cmsNextTicketNo: data.cmsNextTicketNo || data.cMSNextTicketNo || "0",
        ticketNotes: data.notes ?? data.ticketNotes ?? "",
        issueDescription: data.issueDescription || null,
        possibleRootCause: data.possibleRootCause || null,
        emailAddress:
            (data.incomingChannelEmail !== undefined
                ? data.incomingChannelEmail
                : data.emailAddress) || null,

        // ── Dates ──────────────────────────────────────────────────────────────
        ticketReceivedDate:
            formatDate(data.receivedAt || data.ticketReceivedDate) ||
            formatDate(new Date().toISOString()),
        cmsTicketAddedOn:
            formatDate(data.cmsTicketAddedOn || data.cMSTicketAddedOn) ||
            formatDate(new Date().toISOString()),
        cmsTicketClosedOn: formatDate(data.cmsTicketClosedOn || data.cMSTicketClosedOn) || undefined,
        serviceClosedDate: formatDate(data.serviceClosedDate) || undefined,
        ticketResolutionVerifiedOn: formatDate(data.ticketResolutionVerifiedOn) || undefined,

        // ── Numeric ────────────────────────────────────────────────────────────
        // totalDuration is recomputed from the edited activities; the fetched
        // activityTotalDuration is the stale pre-edit value.
        activityTotalDuration:
            toNumberOrNull(data.totalDuration ?? data.activityTotalDuration) ?? 0,
        afterWorkingHoursActivityTotalAmountForSpecificUser:
            toNumberOrNull(data.afterWorkingHoursActivityTotalAmountForSpecificUser) ?? 0,
        afterWorkingHoursActivityTotalDurationForSpecificUser:
            toNumberOrNull(data.afterWorkingHoursActivityTotalDurationForSpecificUser) ?? 0,
        afterWorkingHoursActivityTotalDurationForSpecificUserSpendTime:
            toNumberOrNull(data.afterWorkingHoursActivityTotalDurationForSpecificUserSpendTime) ?? 0,

        // ── Activities ─────────────────────────────────────────────────────────
        // FIX: buildDetailPayload now uses resolveActivityType which always returns
        // a valid integer (1–5) and never null, preventing the 400 enum error.
        amsTicketDetails: rawActivities.map((detail) =>
            buildDetailPayload({
                ...detail,
                amsTicketId: detail.amsTicketId || data.id,
            })
        ),
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
        openFirst = false,
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
        dateFrom = "",
        dateTo = "",
    } = {}) => {
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

        // openFirst keeps Opened tickets (lowest status) on top, ordered by the chosen column within each status.
        // Ties fall back to the newest received date and then Id, so every page has a stable, repeatable order.
        const sortParts = backendSortKey === "Status"
            ? [`Status ${sortDir}`]
            : [...(openFirst ? ["Status asc"] : []), `${backendSortKey} ${sortDir}`];
        if (backendSortKey !== "TicketReceivedDate") sortParts.push("TicketReceivedDate desc");
        sortParts.push("Id desc");
        const sorting = sortParts.join(", ");

        const params = {
            Filter: search || "",
            Sorting: sorting,
            SkipCount: (page - 1) * perPage,
            MaxResultCount: perPage,
            "api-version": "1.0",
            ...(userId && { "AMSTicketSearch.UserId": userId }),
            ...(workDoneCodeIds && { "AMSTicketSearch.WorkDoneCodeIds": workDoneCodeIds }),
            ...(performedByUsers && { "AMSTicketSearch.PerformedByUsers": performedByUsers }),
            ...(siteName && { "AMSTicketSearch.SiteName": siteName }),
            ...(siteOcn && { "AMSTicketSearch.SiteOCN": siteOcn }),
            ...(ticketForwardedBy && { "AMSTicketSearch.TicketForwardedBy": ticketForwardedBy }),
            ...(cmsNextTicketNo && { "AMSTicketSearch.CMSNextTicketNo": cmsNextTicketNo }),
            ...(cmsNextTicketNumbers && { "AMSTicketSearch.CMSNextTicketNumbers": cmsNextTicketNumbers }),
            ...(issueDiscription && { "AMSTicketSearch.IssueDiscription": issueDiscription }),
            ...(ticketReceivedDate && { "AMSTicketSearch.TicketReceivedDate": ticketReceivedDate }),
            ...(cmsTicketClosedOn && { "AMSTicketSearch.CMSTicketClosedOn": cmsTicketClosedOn }),
            ...(ticketResolutionVerifiedOn && {
                "AMSTicketSearch.TicketResolutionVerifiedOn": ticketResolutionVerifiedOn,
            }),
            ...(servicePlannedTypes && { "AMSTicketSearch.ServicePlannedTypes": servicePlannedTypes }),
            ...(countryId && { "AMSTicketSearch.CountryId": countryId }),
            ...(customerUserId && { "AMSTicketSearch.CustomerUserId": customerUserId }),
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

    update: (id, data, { setNewSettings = false } = {}) => {
        const payload = buildTicketPayload({
            ...data,
            id,
            isComingFromEditScreen: true,
        });
        console.log("AMS update payload:", JSON.stringify(payload, null, 2));
        return apiClient.put(`${BASE}/${id}`, payload, { params: { setNewSettings } })
            .then((r) => r.data)
            .catch((error) => {
                console.error("AMS update error:", JSON.stringify(error.response?.data, null, 2));
                throw error;
            });
    },

    void: (ticketData) => {
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

                return apiClient
                    .post(`${BASE}/${id}/void-aMSTicket`, cleanPayload, {
                        headers: { "Content-Type": "application/json" },
                    })
                    .then((r) => r.data);
            })
            .catch((error) => {
                console.error("VOID ERROR:", error.response?.data?.error || error.message);
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

                // Reopening starts a new verification cycle. Explicit nulls
                // ensure the previous closure assignment and dates are removed.
                cleanPayload.ticketResolutionVerifiedById = null;
                cleanPayload.ticketResolutionVerifiedOn = null;
                cleanPayload.cmsTicketClosedById = null;
                cleanPayload.cmsTicketClosedOn = null;
                cleanPayload.serviceClosedDate = null;
                cleanPayload.isComingFromReOpenScreen = true;
                return apiClient
                    .post(`${BASE}/${id}/re-open-aMSTicket`, cleanPayload, {
                        headers: { "Content-Type": "application/json" },
                    })
                    .then((r) => r.data);
            });
    },

    isAnyOpen: () =>
        apiClient.post(`${BASE}/is-any-tickets-open`).then((r) => r.data),

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
        apiClient.post(`${BASE}/is-settings-same-after-re-opening-ticket`, buildTicketPayload(data)).then((r) => r.data),

    isActivityDuringWorkingHours: ({ startDate, endDate, startTimeSpan, endTimeSpan, performedByUserIds = [] }) =>
        apiClient.post(
            `${BASE}/is-activity-during-working-hours`,
            performedByUserIds,
            { params: { startDate, endDate, startTimeSpan, endTimeSpan } },
        ).then((r) => r.data),

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
    ACTIVITY_TYPE_OPTIONS: Object.entries(activityTypeMap).map(([label, enumValue]) => ({ label, enumValue })),
};

export default amsTicketApi;
