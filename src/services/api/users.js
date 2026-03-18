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
    // The only supported custom param is ShowCustomers
    const params = {
      SkipCount: (page - 1) * perPage,
      MaxResultCount: perPage,
      Filter: search || undefined,
      Sorting: sortKey ? `${sortKey} ${sortDir}` : "Name asc",
    };

    if (extraParams.isCustomer !== undefined && extraParams.isCustomer !== null) {
      params.ShowCustomers = extraParams.isCustomer;
    }

    return apiClient
      .get("/api/app/user/paged-list", { params })
      .then((r) => r.data);
  },
  getById: (id) =>
    apiClient.get(`/api/identity/users/${id}`).then((r) => r.data),
  getUsers: () => apiClient.get("/api/identity/users").then((r) => r.data),
  getUserRoles: (id) =>
    apiClient.get(`/api/identity/users/${id}/roles`).then((r) => r.data),
  getAssignableRoles: () =>
    apiClient.get("/api/identity/users/assignable-roles").then((r) => r.data),
  getByUsername: (userName) =>
    apiClient
      .get(`/api/identity/users/by-username/${userName}`)
      .then((r) => r.data),
  getByEmail: (email) =>
    apiClient.get(`/api/identity/users/by-email/${email}`).then((r) => r.data),
  getCustomerUsers: (siteId) =>
    apiClient.get(`/api/app/user/customer-users/${siteId}`).then((r) => r.data),
  getUsersList: (organizationTypes) => {
    let url = "/api/app/user/users-list";
    if (organizationTypes && Array.isArray(organizationTypes)) {
      const q = organizationTypes.map(t => `organizationTypes=${t}`).join('&');
      url += `?${q}`;
    }
    return apiClient.get(url).then((r) => r.data);
  },
  getCustomerList: () =>
    apiClient
      .get("/api/app/user/paged-list", {
        params: { ShowCustomers: true, MaxResultCount: 1000 },
      })
      .then((r) => r.data),
  create: async (data) => {
    // Separate roles from user data
    const { roleNames, ...userData } = data;

    // Step 1: Build the clean payload for create
    const payload = {
      userName: userData.userName,
      name: userData.name,
      surname: userData.surname?.trim() || undefined,
      email: userData.email?.trim() || undefined,
      phoneNumber: userData.phoneNumber,
      isActive: userData.isActive ?? true,
      lockoutEnabled: userData.lockoutEnabled ?? false,
      twoFactorEnabled: false,
      password: userData.password,
      roleNames: roleNames ?? [],
      extraProperties: {
        organizationType: Number(userData.organizationType) || undefined,
        isPrimary: userData.isPrimary ?? false,
        mustCompleteJobsheet: userData.mustCompleteJobsheet ?? false,
        isITS: userData.isITS ?? false,
        baseRateFirstHourAfterWorkingHours:
          Number(userData.baseRateFirstHourAfterWorkingHours) || 0,
        baseRateAfterFirstHourAfterWorkingHours:
          Number(userData.baseRateAfterFirstHourAfterWorkingHours) || 0,
        siteId: userData.siteId ?? null,
      },
    };

    // Remove any undefined or empty string values from root and extra properties if needed,
    // but the mapped defaults cover most cases cleanly.
    if (!payload.password?.trim()) {
      delete payload.password; // some backends might have random password generation or don't allow empty string
    }

    // Step 2: Create the user
    const createdUser = await apiClient
      .post("/api/identity/users", payload)
      .then((r) => r.data);

    // Step 3: Assign roles separately if the POST doesn't persist them (often required by custom generic setups)
    if (roleNames && roleNames.length > 0) {
      await apiClient.put(`/api/identity/users/${createdUser.id}/roles`, {
        roleNames,
      });
    }

    return createdUser;
  },
  update: async (id, data) => {
    // Step 1: Always fetch fresh concurrencyStamp before PUT
    // Never trust the stale value from the table row
    const freshUser = await apiClient
      .get(`/api/identity/users/${id}`)
      .then((r) => r.data);

    // Step 2: Build the clean payload
    const payload = {
      userName: data.userName,
      name: data.name,
      surname: data.surname?.trim() || undefined,
      email: data.email?.trim() || undefined,
      phoneNumber: data.phoneNumber,
      isActive: data.isActive ?? true,
      lockoutEnabled: data.lockoutEnabled ?? false,
      twoFactorEnabled: false,
      roleNames: data.roleNames ?? [],
      concurrencyStamp: freshUser.concurrencyStamp, // always fresh
      extraProperties: {
        ...freshUser.extraProperties,
        organizationType: Number(data.organizationType) || undefined,
        isPrimary: data.isPrimary ?? false,
        mustCompleteJobsheet: data.mustCompleteJobsheet ?? false,
        isITS: data.isITS ?? false,
        baseRateFirstHourAfterWorkingHours:
          Number(data.baseRateFirstHourAfterWorkingHours) || 0,
        baseRateAfterFirstHourAfterWorkingHours:
          Number(data.baseRateAfterFirstHourAfterWorkingHours) || 0,
        siteId: data.siteId ?? null,
      },
    };

    // Step 3: Only include password if user typed a new one
    if (data.password?.trim()) {
      payload.password = data.password;
    }

    try {
      // Step 4: Update the user
      await apiClient.put(`/api/identity/users/${id}`, payload);

      // Step 5: Update roles separately (required by ABP identity)
      if (data.roleNames) {
        await apiClient.put(`/api/identity/users/${id}/roles`, {
          roleNames: data.roleNames,
        });
      }

      return { success: true };
    } catch (error) {

      debugger;
      console.error(
        "UPDATE ERROR DETAILS:",
        JSON.stringify(error.response?.data, null, 2)
      );
      debugger;
      throw error;
    }
  },
  delete: (id) =>
    apiClient.delete(`/api/identity/users/${id}`).then((r) => r.data),
};

export default usersApi;
