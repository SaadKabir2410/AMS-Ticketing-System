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
    const params = {
      SkipCount: (page - 1) * perPage,
      MaxResultCount: perPage,
      Filter: search || undefined,
      Sorting: sortKey ? `${sortKey} ${sortDir}` : "Name asc",
    };

    if (
      extraParams.isCustomer !== undefined &&
      extraParams.isCustomer !== null
    ) {
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
  getUsersList: ({ organizationTypes = [], mustCompleteJobsheet = true, onlyLoadCurrentUser = false } = {}) => {
    const params = {
      mustCompleteJobsheet,
      onlyLoadCurrentUser,
      "api-version": "1.0",
    };
    organizationTypes.forEach((type, i) => {
      params[`organizationTypes[${i}]`] = type;
    });
    return apiClient.get("/api/app/user/users-list", { params }).then((r) => r.data);
  },
  getCustomerList: () =>
    apiClient
      .get("/api/app/user/paged-list", {
        params: { ShowCustomers: true, MaxResultCount: 1000 },
      })
      .then((r) => r.data),

  create: async (data) => {
    const { roleNames, ...userData } = data;

    // FIX: All custom fields at top level, matching API contract
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

      // ✅ TOP-LEVEL fields (not inside extraProperties)
      organizationType: Number(userData.organizationType) || 0,
      siteId: userData.siteId ?? null,
      isPrimary: userData.isPrimary ?? false,
      mustCompleteJobsheet: userData.mustCompleteJobsheet ?? false,
      isITS: userData.isITS ?? false,
      baseRateFirstHourAfterWorkingHours:
        Number(userData.baseRateFirstHourAfterWorkingHours) || 0,
      baseRateAfterFirstHourAfterWorkingHours:
        Number(userData.baseRateAfterFirstHourAfterWorkingHours) || 0,
    };

    if (!payload.password?.trim()) {
      delete payload.password;
    }

    try {
      const res = await apiClient.post("/api/identity/users", payload);
      const createdUser = res.data;

      return { success: true, data: createdUser };
    } catch (error) {
      console.error(
        "CREATE ERROR DETAILS:",
        JSON.stringify(error.response?.data, null, 2),
      );
      throw error;
    }
  },

  update: async (id, data) => {
    // Step 1: Always fetch fresh concurrencyStamp before PUT
    const freshUser = await apiClient
      .get(`/api/identity/users/${id}`)
      .then((r) => r.data);

    // Step 2: Build clean payload — all fields at TOP LEVEL matching API contract
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
      concurrencyStamp: freshUser.concurrencyStamp, // always fresh from GET

      // ✅ FIX: These must be TOP-LEVEL, NOT inside extraProperties
      // The API validates organizationType at root level — putting it in
      // extraProperties causes "Organization Type is required" 400 error
      organizationType: Number(data.organizationType) || 0,
      siteId: data.siteId ?? null,
      isPrimary: data.isPrimary ?? false,
      mustCompleteJobsheet: data.mustCompleteJobsheet ?? false,
      isITS: data.isITS ?? false,
      baseRateFirstHourAfterWorkingHours:
        Number(data.baseRateFirstHourAfterWorkingHours) || 0,
      baseRateAfterFirstHourAfterWorkingHours:
        Number(data.baseRateAfterFirstHourAfterWorkingHours) || 0,
    };

    // Step 3: Only include password if user typed a new one
    if (data.password?.trim()) {
      payload.password = data.password;
    }

    try {
      // Step 4: Update the user
      // `roleNames` array is mapped properly in `payload`, ABP identity will naturally update the user's roles!
      await apiClient.put(`/api/identity/users/${id}`, payload);

      return { success: true };
    } catch (error) {
      console.error(
        "UPDATE ERROR DETAILS:",
        JSON.stringify(error.response?.data, null, 2),
      );
      throw error;
    }
  },

  delete: (id) =>
    apiClient.delete(`/api/identity/users/${id}`).then((r) => r.data),

  getPermissions: (userId) =>
    apiClient
      .get("/api/permission-management/permissions", {
        params: { providerName: "U", providerKey: userId },
      })
      .then((r) => r.data),

  updatePermissions: (userId, data) =>
    apiClient
      .put("/api/permission-management/permissions", data, {
        params: { providerName: "U", providerKey: userId },
      })
      .then((r) => r.data),
};

export default usersApi;
