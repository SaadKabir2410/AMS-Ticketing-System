import apiClient from "../apiClient";

/**
 * Lookup Detail API
 * Strictly matches confirmed endpoints:
 *
 *  POST   /api/app/lookup-detail
 *  GET    /api/app/lookup-detail/{id}/by-id
 *  PUT    /api/app/lookup-detail/{id}
 *  DELETE /api/app/lookup-detail/{id}
 *  GET    /api/app/lookup-detail/by-lookup-codes
 *  GET    /api/app/lookup-detail/by-code/{lookupId}
 *  GET    /get-list-by-lookup-code
 *  GET    /get-list-by-lookup-codes
 *  POST   /api/app/lookup-detail/{id}/enable
 *  POST   /api/app/lookup-detail/{id}/has-sub-task-category
 *  GET    /api/app/lookup-detail/{id}/by-group-code
 *  POST   /api/app/lookup-detail/{id}/is-required-field
 */

// Shared payload builder — used by create & update
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

export const codeDetailsApi = {

  // ── READ ───────────────────────────────────────────────────────────────────

  // GET /api/app/lookup-detail/{id}/by-id
  getById: async (id) => {
    const response = await apiClient.get(`/api/app/lookup-detail/${id}/by-id`);
    return response.data;
  },

  // GET /api/app/lookup-detail/by-lookup-codes
  // Do NOT send SkipCount/Sorting — ABP returns [] if it cannot parse them
  getAll: async (params) => {
    if (!params?.lookupId) return [];
    try {
      const response = await apiClient.get(`/get-list-by-lookup-code`, {
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

  // GET /api/app/lookup-detail/by-code/{lookupId}
  getByCode: async (lookupId) => {
    const response = await apiClient.get(`/api/app/lookup-detail/by-code/${lookupId}`);
    return response.data;
  },

  // GET /get-list-by-lookup-code
  getListByLookupCode: async (params) => {
    const response = await apiClient.get(`/get-list-by-lookup-code`, { params });
    return response.data;
  },

  // GET /get-list-by-lookup-codes
  getListByLookupCodes: async (params) => {
    const response = await apiClient.get(`/get-list-by-lookup-codes`, { params });
    return response.data;
  },

  // GET /api/app/lookup-detail/{id}/by-group-code
  getByGroupCode: async (id) => {
    const response = await apiClient.get(`/api/app/lookup-detail/${id}/by-group-code`);
    return response.data;
  },

  // ── WRITE ──────────────────────────────────────────────────────────────────

  // POST /api/app/lookup-detail
  create: async (data) => {
    const response = await apiClient.post(`/api/app/lookup-detail`, buildPayload(data));
    return response.data;
  },

  // PUT /api/app/lookup-detail/{id}
  update: async (id, data) => {
    const response = await apiClient.put(`/api/app/lookup-detail/${id}`, buildPayload(data, true));
    return response.data;
  },

  // DISABLE — soft delete via DELETE (same pattern as Code.js — ABP sets isActive+isDeleted automatically)
  disable: async (id) => {
    const response = await apiClient.delete(`/api/app/lookup-detail/${id}`);
    return response.data;
  },

  // ENABLE — POST /api/app/lookup-detail/{id}/enable
  enable: async (id) => {
    const response = await apiClient.post(`/api/app/lookup-detail/${id}/enable`);
    return response.data;
  },

  // ── TOGGLES ────────────────────────────────────────────────────────────────

  // POST /api/app/lookup-detail/{id}/has-sub-task-category
  toggleHasSubTaskCategory: async (id, hasSub) => {
    const response = await apiClient.post(
      `/api/app/lookup-detail/${id}/has-sub-task-category`,
      null,
      { params: { hasSub } }
    );
    return response.data;
  },

  // POST /api/app/lookup-detail/{id}/is-required-field
  toggleRequiredField: async (id, isRequired) => {
    const response = await apiClient.post(
      `/api/app/lookup-detail/${id}/is-required-field`,
      null,
      { params: { isRequired } }
    );
    return response.data;
  },

  // ── METADATA ───────────────────────────────────────────────────────────────
  id: "lookupDetail",
  entityName: "LookupDetail",
};

export default codeDetailsApi;