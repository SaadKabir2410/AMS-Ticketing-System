/**
 * DB.js — Real API Integration
 * This file replaces the simulated localStorage DB with real network calls.
 */
import apiClient from "../services/apiClient";

const DB = {
  tickets: {
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
        .get("ams/tickets", {
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
    getById: (id) => apiClient.get(`tickets/${id}`).then((r) => r.data),
    create: (data) => apiClient.post("tickets", data).then((r) => r.data),
    update: (id, data) =>
      apiClient.put(`tickets/${id}`, data).then((r) => r.data),
    delete: (id) => apiClient.delete(`tickets/${id}`).then((r) => r.data),
    getStats: () => apiClient.get("tickets/stats").then((r) => r.data),
  },

  sites: {
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
      const sortFieldMap = {
        id: "Id",
        name: "Name",
        ocn: "OCN",
        countryName: "Country.Name",
        address: "Address",
      };
      const columnFilterParamMap = {
        name: "SiteSearch.Name",
        ocn: "SiteSearch.OCN",
        countryName: "SiteSearch.CountryName",
        address: "SiteSearch.Address",
      };

      let siteSearchParams = {};
      if (columnFilter?.value && columnFilterParamMap[columnFilter.field]) {
        const backendParam = columnFilterParamMap[columnFilter.field];
        siteSearchParams = {
          [backendParam]: columnFilter.value,
          [`${backendParam}Operator`]:
            operatorMap[columnFilter.operator] || backendOperator,
        };
      }

      const params = {
        SkipCount: (page - 1) * perPage,
        MaxResultCount: perPage,
        Filter: search || undefined,
        FilterOperator: backendOperator,
        ...siteSearchParams,
        Sorting: `${sortFieldMap[sortKey] || "Id"} ${sortDir}`,
      };

      console.log("[DB.sites] getAll:", params);
      return apiClient.get("site/paged-list", { params }).then((r) => {
        console.log("[DB.sites] getAll success:", r.data);
        return r.data;
      });
    },
    checkOcnExists: (ocn, signal) => {
      const params = {
        SkipCount: 0,
        MaxResultCount: 1,
        "SiteSearch.OCN": ocn,
        "SiteSearch.OCNOperator": "Equals",
        Sorting: "Name asc",
      };
      console.log("[DB.sites] checking OCN:", ocn);
      return apiClient
        .get("site/paged-list", { params, signal })
        .then((r) => r.data);
    },
    getById: (id) => apiClient.get(`site/${id}/by-id`).then((r) => r.data),
    create: (data) => {
      console.log("[DB.sites] creating:", data);
      return apiClient.post("site", data).then((r) => r.data);
    },
    update: (id, data) => {
      console.log("[DB.sites] updating:", id, data);
      return apiClient.put(`site/${id}`, data).then((r) => r.data);
    },
    delete: (id) => {
      console.log("[DB.sites] deleting:", id);
      return apiClient.delete(`site/${id}`).then((r) => r.data);
    },
  },

  countries: {
    getAll: () => {
      console.log("[DB.countries] getAll");
      return apiClient.get("country").then((r) => {
        console.log("[DB.countries] getAll success:", r.data);
        return r.data;
      });
    },
    create: (data) => {
      console.log("[DB.countries] creating:", data);
      return apiClient.post("country", data).then((r) => r.data);
    },
    update: (id, data) => {
      console.log("[DB.countries] updating:", id, data);
      return apiClient.put(`country/${id}`, data).then((r) => r.data);
    },
    delete: (id) => {
      console.log("[DB.countries] deleting:", id);
      return apiClient.delete(`country/${id}`).then((r) => r.data);
    },
  },

  workCodes: {
    getAll: () => {
      console.log("[DB.workCodes] getAll");
      return apiClient.get("work-done-code").then((r) => {
        console.log("[DB.workCodes] getAll success:", r.data);
        return r.data;
      });
    },
    checkCodeExists: (code, signal) => {
      const params = {
        SkipCount: 0,
        MaxResultCount: 1,
        "WorkDoneCodeSearch.Code": code,
        "WorkDoneCodeSearch.CodeOperator": "Equals",
        Sorting: "Code asc",
      };
      console.log("[DB.workCodes] checking code:", code);
      return apiClient
        .get("work-done-code/paged-list", { params, signal })
        .then((r) => r.data);
    },
    create: (data) => {
      console.log("[DB.workCodes] creating:", data);
      return apiClient.post("work-done-code", data).then((r) => r.data);
    },
    update: (id, data) => {
      console.log("[DB.workCodes] updating:", id, data);
      return apiClient.put(`work-done-code/${id}`, data).then((r) => r.data);
    },
    delete: (id) => {
      console.log("[DB.workCodes] deleting:", id);
      return apiClient.delete(`work-done-code/${id}`).then((r) => r.data);
    },
  },

  holidays: (() => {
    let _cache = null,
      _cacheTs = 0,
      _inflight = null;
    const TTL = 60000;

    const getSource = () => {
      const now = Date.now();
      if (_cache && now - _cacheTs < TTL) {
        console.log("[DB.holidays] Cache HIT");
        return Promise.resolve(_cache);
      }
      if (_inflight) {
        console.log("[DB.holidays] Sharing inflight request");
        return _inflight;
      }
      console.log("[DB.holidays] Fetching from backend: GET /holiday");
      return (_inflight = apiClient
        .get("holiday")
        .then((r) => {
          _cache = Array.isArray(r.data) ? r.data : (r.data?.items ?? []);
          _cacheTs = Date.now();
          _inflight = null;
          console.log(
            `[DB.holidays] Fetch complete. Found ${_cache.length} records.`,
          );
          return _cache;
        })
        .catch((err) => {
          _inflight = null;
          console.error("[DB.holidays] Fetch FAILED:", err);
          throw err;
        }));
    };
    const match = (field, query) =>
      !query ||
      String(field ?? "")
        .toLowerCase()
        .includes(String(query).toLowerCase());
    return {
      getAll: ({
        search,
        Name,
        Description,
        Type,
        Date: filterDate,
        Year,
        CountryName,
        Locations,
      } = {}) =>
        getSource().then((raw) => {
          const result = raw.filter((h) => {
            if (
              search &&
              !Object.values(h).some((v) =>
                String(v ?? "")
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
            )
              return false;
            if (
              !match(h.name, Name) ||
              !match(h.description, Description) ||
              !match(h.type, Type) ||
              !match(h.countryName, CountryName) ||
              !match(h.locations, Locations)
            )
              return false;
            if (filterDate && !String(h.date ?? "").startsWith(filterDate))
              return false;
            if (Year && String(h.year) !== String(Year)) return false;
            return true;
          });
          return { items: result, totalCount: result.length };
        }),
    };
  })(),

  workingHours: {
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
        "user-working-hour/paged-list",
        params,
      );
      return apiClient
        .get("user-working-hour/paged-list", { params })
        .then((r) => {
          console.log("[DB.workingHours] Response:", r.data);
          return r.data;
        })
        .catch((err) => {
          console.error("[DB.workingHours] Error:", err);
          throw err;
        });
    },
  },

  jobsheets: {
    getAll: ({
      page = 1,
      perPage = 10,
      search,
      sortKey,
      sortDir = "desc",
      ...extraParams
    } = {}) => {
      const params = {
        SkipCount: (page - 1) * perPage,
        MaxResultCount: perPage,
        Filter: search || undefined,
        "JobsheetSearch.CurrentUserId": extraParams.CurrentUserId || undefined,
        "JobsheetSearch.UserIdsSearchValues":
          extraParams.UserIdsSearchValues || undefined,
        "JobsheetSearch.JobsheetDetailUserIdsSearchValues":
          extraParams.JobsheetDetailUserIdsSearchValues || undefined,
        "JobsheetSearch.ProjectIdSearchValue":
          extraParams.Project || extraParams.ProjectIdSearchValue || undefined,
        "JobsheetSearch.DateFrom":
          extraParams.FromDate || extraParams.DateFrom || undefined,
        "JobsheetSearch.DateTo":
          extraParams.ToDate || extraParams.DateTo || undefined,
        Sorting: sortKey ? `${sortKey} ${sortDir}` : "Date desc",
      };
      console.log("[DB.jobsheets] Fetching:", "jobsheets/paged", params);
      return apiClient
        .get("jobsheets/paged", { params })
        .then((r) => r.data)
        .catch((err) => {
          console.error("[DB.jobsheets] Error:", err);
          throw err;
        });
    },
    create: (data) => apiClient.post("job-sheet", data).then((r) => r.data),
  },

  auditLogs: {
    id: "auditLogs",
    getAll: ({
      page = 1,
      perPage = 10,
      search,
      sortKey,
      sortDir = "desc",
      ...extraParams
    } = {}) => {
      const columnFilterParamMap = {
        primaryKey: "AuditedLogSearch.PrimaryKey",
        entityName: "AuditedLogSearch.EntityName",
        userName: "AuditedLogSearch.UserName",
        schemaName: "AuditedLogSearch.SchemaName",
        tableName: "AuditedLogSearch.TableName",
        serviceName: "AuditedLogSearch.ServiceName",
        userId: "AuditedLogSearch.UserId",
        fromDate: "AuditedLogSearch.FromDate",
        toDate: "AuditedLogSearch.ToDate",
        operationType: "AuditedLogSearch.OperationType",
        countryName: "AuditedLogSearch.CountryName",
      };
      let searchParams = {};
      if (search) searchParams["AuditedLogSearch.EntityName"] = search;
      Object.keys(extraParams).forEach((key) => {
        if (extraParams[key] != null)
          searchParams[columnFilterParamMap[key] || key] = extraParams[key];
      });
      const sortFieldMap = {
        operationType: "OperationType",
        primaryKey: "PrimaryKey",
        entityName: "EntityName",
        schemaName: "SchemaName",
        userName: "UserName",
        dateTime: "DateTime",
      };
      const apiClientParams = {
        SkipCount: (page - 1) * perPage,
        MaxResultCount: perPage,
        Sorting: `${sortFieldMap[sortKey] || "DateTime"} ${sortDir === "asc" ? "Asc" : "Desc"}`,
        ...searchParams,
      };
      const sp = new URLSearchParams();
      Object.keys(apiClientParams).forEach((k) => {
        if (apiClientParams[k] != null) sp.append(k, apiClientParams[k]);
      });
      return apiClient
        .get("audited-log/paged-list", {
          params: sp,
          paramsSerializer: (p) => p.toString(),
        })
        .then((r) => {
          const data = r.data || {};
          if (data.items) {
            data.items = data.items.filter((item) => {
              if (!item || item.operationType === 3) return false;
              const hasOld =
                (item.oldValuesDic &&
                  Object.keys(item.oldValuesDic).length > 0) ||
                (item.oldValues &&
                  item.oldValues !== "{}" &&
                  item.oldValues !== "null");
              if (extraParams.operationType == 1) return !hasOld;
              if (extraParams.operationType == 2) return hasOld;
              return true;
            });
          }
          return data;
        });
    },
  },
};

// ── UI Dropdown Constants ──────────────────────────────────────────────────
export const ASSIGNEES = [
  "Ahmad Jamil",
  "Saad Kabir",
  "Kareem Sureze",
  "System Admin",
  "John Doe",
];
export const STATUSES = ["Open", "In Progress", "Closed"];
export const OCNS = ["1001", "1002", "1003", "1004", "1005"];
export const SITES = [
  "NHSBT FILTON (MSC)",
  "PENANG ADVENTIST HOSPITAL (PAH)",
  "WILLIAM HARVEY HPL(MSC)",
  "CHARING CROSS HOSPITAL",
  "GLASGOW ROYAL INFIRMARY",
  "ST PETERS HOSPITAL",
  "SUNWAY MEDICAL CENTRE IPOH SDN BHD",
  "JAMES PAGET HOSPITAL (ABB MSC)",
  "ALDER HEY CHILDRENS HOSPITAL(LIVERPOOL)",
  "ABERDEEN ROYAL INFIRMARY",
  "ROYAL VICTORIA HOSPITAL",
  "MANCHESTER ROYAL INFIRMARY",
];

export { DB, apiClient };
export default DB;
