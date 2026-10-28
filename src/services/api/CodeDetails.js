import apiClient from "../apiClient";

const buildPayload = (data, includeStamp = false) => ({
  lookupId: data.lookupId || "",
  newCode: data.newCode || "",
  description: data.description || "",
  isActive: data.isActive ?? true,
  comments: data.comments || "",
  sequence: Number(data.sequence) || 0,
  isDefaultIndicator: !!data.isDefaultIndicator,
  value1: data.value1 || "",
  value2: data.value2 || "",
  groupCode: data.groupCode || "",
  groupCodeDetail: data.groupCodeDetail || "",
  isRequiredField: !!data.isRequiredField,
  hasExtraDescription: !!data.hasExtraDescription,
  extraDescriptionLable: data.extraDescriptionLable || "",
  lookupCode: data.lookupCode || "",
  hasSubCategory: !!data.hasSubCategory,
  ...(includeStamp && { concurrencyStamp: data.concurrencyStamp || "" }),
});

const BASE = "/api/app/lookup-detail";

const includeDeletedRecords = (params = {}) => {
  const requestParams = { ...params };
  delete requestParams.isDeleted;
  delete requestParams.IsDeleted;
  return { ...requestParams, IsDeleted: true };
};

export const codeDetailsApi = {
  getById: async (id) => {
    const response = await apiClient.get(`${BASE}/${id}/by-id`);
    return response.data;
  },

  // Kept as-is for the single-lookupId use case (different from getByLookupCodes below)
  getAll: async (params) => {
    if (!params?.lookupCode && !params?.lookupId) return [];

    if (params.lookupId) {
      const response = await apiClient.get("/get-list-by-lookup-code", {
        params: includeDeletedRecords({ lookupId: params.lookupId }),
      });
      return Array.isArray(response.data)
        ? response.data
        : response.data?.items || [];
    }

    const codesArray = params.lookupCode ? [params.lookupCode] : [];
    const urlParams = new URLSearchParams();
    codesArray.forEach((code, i) => urlParams.append(`codes[${i}]`, code));
    urlParams.append("IsDeleted", "true");
    urlParams.append("api-version", "1.0");

    const response = await apiClient.get(`${BASE}/by-lookup-codes?${urlParams.toString()}`);
    return Array.isArray(response.data)
      ? response.data
      : response.data?.items || [];
  },

  getByCode: async (lookupId) => {
    const response = await apiClient.get(`${BASE}/by-code/${lookupId}`);
    return response.data;
  },

  // Legacy bare routes — kept in case other parts of the app still use them
  getListByLookupCode: async (params) => {
    const response = await apiClient.get(`/get-list-by-lookup-code`, {
      params: includeDeletedRecords(params),
    });
    return response.data;
  },

  getListByLookupCodes: async (params) => {
    const response = await apiClient.get(`/get-list-by-lookup-codes`, {
      params: includeDeletedRecords(params),
    });
    return response.data;
  },

  // FIXED: matches confirmed production request format —
  // GET /api/app/lookup-detail/by-lookup-codes?codes[0]=TSK&codes[1]=STS&codes[2]=PRJ&api-version=1.0
  // Accepts an array of code strings, e.g. getByLookupCodes(['TSK', 'STS', 'PRJ'])
  getByLookupCodes: async (codesArray = []) => {
    const params = new URLSearchParams();
    codesArray.forEach((code, i) => params.append(`codes[${i}]`, code));
    params.append("IsDeleted", "true");
    params.append("api-version", "1.0");

    const response = await apiClient.get(`${BASE}/by-lookup-codes?${params.toString()}`);
    return response.data;
  },

  getByGroupCode: async (id) => {
    const response = await apiClient.get(`${BASE}/${id}/by-group-code`);
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post(BASE, buildPayload(data));
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.put(`${BASE}/${id}`, buildPayload(data, true));
    return response.data;
  },

  disable: async (id) => {
    const response = await apiClient.delete(`${BASE}/${id}`);
    return response.data;
  },

  enable: async (id) => {
    const response = await apiClient.post(`${BASE}/${id}/enable`);
    return response.data;
  },

  toggleHasSubTaskCategory: async (id, hasSub) => {
    const response = await apiClient.post(
      `${BASE}/${id}/has-sub-task-category`,
      null,
      { params: { hasSub } }
    );
    return response.data;
  },

  toggleRequiredField: async (id, isRequired) => {
    const response = await apiClient.post(
      `${BASE}/${id}/is-required-field`,
      null,
      { params: { isRequired } }
    );
    return response.data;
  },

  // Backend LookupDetailAppService.HasSubTaskCategoryAsync / IsRequiredFieldAsync:
  // whether a task category has sub task categories, and whether choosing it
  // makes collaborators required. Both return true/false.
  hasSubTaskCategory: async (id) => {
    const response = await apiClient.post(`${BASE}/${id}/has-sub-task-category`);
    return Boolean(response.data);
  },

  isRequiredField: async (id) => {
    const response = await apiClient.post(`${BASE}/${id}/is-required-field`);
    return Boolean(response.data);
  },

  id: "lookupDetail",
  entityName: "LookupDetail",
};

export default codeDetailsApi;
