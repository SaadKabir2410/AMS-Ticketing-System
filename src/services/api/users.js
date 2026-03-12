import apiClient from "../apiClient";

export const usersApi = {
  getAll: ({
    page = 1,
    perPage = 10,
    search,
    sortKey,
    sortDir = "desc",
    columnFilter,
    filterOperator,
    ...extraParams
  } = {}) => {
    const operatorMap = {
      contains: "Contains",
      equals: "Equals",
      startsWith: "StartsWith",
    };
    const backendOperator = operatorMap[filterOperator] || "Contains";

    const columnFilterParamMap = {
      name: "UserSearch.Name",
      email: "UserSearch.Email",
      phoneNumber: "UserSearch.PhoneNumber",
      organizationType: "UserSearch.OrganizationType",
      siteName: "UserSearch.SiteName",
    };

    let userSearchParams = {};

    // Handle the "show customer toggle" via extraParams if provided
    if (extraParams.isCustomer !== undefined) {
      userSearchParams["UserSearch.IsCustomer"] = extraParams.isCustomer;
    }

    if (columnFilter?.value && columnFilterParamMap[columnFilter.field]) {
      const backendParam = columnFilterParamMap[columnFilter.field];
      userSearchParams = {
        ...userSearchParams,
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
      ...userSearchParams,
      Sorting: sortKey ? `${sortKey} ${sortDir}` : "Name asc",
    };

    return apiClient.get("/api/app/user/paged-list", { params }).then(r => r.data);
  },
  create: (data) => apiClient.post("/api/app/user", data).then(r => r.data),
  update: (id, data) => apiClient.put(`/api/app/user/${id}`, data).then(r => r.data),
  delete: (id) => apiClient.delete(`/api/app/user/${id}`).then(r => r.data),
};

export default usersApi;
