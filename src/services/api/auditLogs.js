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
      ...searchParams,
      Sorting: `${sortFieldMap[sortKey] || "DateTime"} ${sortDir === "asc" ? "ASC" : "DESC"}`,
      SkipCount: (page - 1) * perPage,
      MaxResultCount: perPage,
      "api-version": "1.0",
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
      .then((r) => r.data || {});
  },
};

export default auditLogsApi;
