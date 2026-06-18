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

export const codeDetailsApi = {
  getById: async (id) => {
    const response = await apiClient.get(`${BASE}/${id}/by-id`);
    return response.data;
  },

  getAll: async (params) => {
    if (!params?.lookupId) return [];
    try {
      const response = await apiClient.get(`${BASE}/get-list-by-lookup-code`, {
        params: {
          lookupId: params.lookupId,
          isDeleted: "True",
        },
      });
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.items || [];
      console.log(`[CodeDetails] getAll -> ${data.length} records`);
      return data;
    } catch (err) {
      console.error("[CodeDetails] getAll failed:", err);
      return [];
    }
  },

  getByCode: async (lookupId) => {
    const response = await apiClient.get(`${BASE}/by-code/${lookupId}`);
    return response.data;
  },

  getListByLookupCode: async (params) => {
    const response = await apiClient.get(`/get-list-by-lookup-code`, { params });
    return response.data;
  },

  getListByLookupCodes: async (params) => {
    const response = await apiClient.get(`/get-list-by-lookup-codes`, { params });
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

  id: "lookupDetail",
  entityName: "LookupDetail",
};

export default codeDetailsApi;