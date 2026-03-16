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
  getById: (id) => apiClient.get(`/api/identity/users/${id}`).then(r => r.data),
  getUsers: () => apiClient.get("/api/identity/users").then(r => r.data),
  getUserRoles: (id) => apiClient.get(`/api/identity/users/${id}/roles`).then(r => r.data),
  getAssignableRoles: () => apiClient.get("/api/identity/users/assignable-roles").then(r => r.data),
  getByUsername: (userName) => apiClient.get(`/api/identity/users/by-username/${userName}`).then(r => r.data),
  getByEmail: (email) => apiClient.get(`/api/identity/users/by-email/${email}`).then(r => r.data),
  getCustomerUsers: (siteId) => apiClient.get(`/api/app/user/customer-users/${siteId}`).then(r => r.data),
  getUsersList: () => apiClient.get("/api/app/user/users-list").then(r => r.data),
  create: async (data) => {
    // Separate roles from user data
    const { roleNames, ...userData } = data;

    const cleanData = Object.fromEntries(
      Object.entries(userData).filter(([_, v]) => v !== "" && v !== null && v !== undefined)
    );

    // Step 1: Create the user
    const createdUser = await apiClient.post("/api/identity/users", cleanData).then(r => r.data);

    // Step 2: Assign roles separately if any selected
    if (roleNames && roleNames.length > 0) {
      await apiClient.put(`/api/identity/users/${createdUser.id}/roles`, { roleNames });
    }

    return createdUser;
  },
  update: async (id, data) => {
    // Construct the payload matching the required request body
    const payload = {
      userName: data.userName,
      name: data.name,
      surname: data.surname,
      email: data.email,
      phoneNumber: data.phoneNumber,
      organizationType: data.organizationType !== null && data.organizationType !== undefined ? parseInt(data.organizationType, 10) : undefined,
      siteId: data.siteId,
      isPrimary: data.isPrimary,
      mustCompleteJobsheet: data.mustCompleteJobsheet,
      isITS: data.isITS,
      isActive: data.isActive,
      lockoutEnabled: data.lockoutEnabled,
      baseRateFirstHourAfterWorkingHours: data.baseRateFirstHourAfterWorkingHours,
      baseRateAfterFirstHourAfterWorkingHours: data.baseRateAfterFirstHourAfterWorkingHours,
      roleNames: data.roleNames,
      password: data.password || undefined, // Only send if user typed one
      concurrencyStamp: data.concurrencyStamp
    };

    // Remove empty string or undefined/null fields
    // NOTE: Keep booleans like false and numbers like 0
    const cleanData = Object.fromEntries(
      Object.entries(payload).filter(([_, v]) => v !== "" && v !== undefined && v !== null)
    );

    // console.log("PAYLOAD BEING SENT: ", JSON.stringify(cleanData, null, 2));
    // debugger; // Pauses execution here if DevTools are open

    await apiClient.put(`/api/identity/users/${id}`, cleanData);
    return { success: true };
  },
  delete: (id) => apiClient.delete(`/api/identity/users/${id}`).then(r => r.data),
};

export default usersApi;
