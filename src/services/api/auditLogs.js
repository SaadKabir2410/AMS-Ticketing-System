import apiClient from "../apiClient";

export const auditLogsApi = {
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
      .get("/api/app/audited-log/paged-list", {
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
};

export default auditLogsApi;
