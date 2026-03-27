import apiClient from "../apiClient";

/**
 * Expert Full Stack Debugging Assistant Refactor
 * Root Cause: Many child-details endpoints in ABP don't support paging/sorting on specialized 
 * 'by-code/{id}' routes. Sending these params (SkipCount/Sorting) can sometimes result 
 * in 200 { items: [] } if the backend fails to parse the query correctly.
 */

export const codeDetailsApi = {
  // GET all records — matched to EXACT working backend pattern (by-lookup-codes)
  getAll: async (params) => {
    if (!params?.code && !params?.lookupCode) return [];
    const code = params.code || params.lookupCode;
    try {
      const response = await apiClient.get(`/api/app/lookup-detail/by-lookup-codes`, {
        params: {
          codes: code,          // ← only this
          loadIsDeleted: true,  // ← always hardcoded
          // DO NOT spread params here — causes duplicate &code=TSK
        }
      });
      const data = Array.isArray(response.data) ? response.data : response.data?.items || [];
      console.log(`[CodeDetails] Fetched ${data.length} records for code: ${code}`);
      return data;
    } catch (err) {
      console.error("[CodeDetails] Fetch failed:", err);
      return [];
    }
  },




  // GET single record by ID
  getById: async (id) => {
    const response = await apiClient.get(`/api/app/lookup-detail/${id}/by-id`);
    return response.data;
  },

  // POST - Create new record
  create: async (data) => {
    const payload = {
      lookupId: data.lookupId || "",
      newCode: data.newCode || "",
      description: data.description || "",
      isActive: data.isActive ?? true, // added status
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
    };
    const response = await apiClient.post("/api/app/lookup-detail", payload);
    return response.data;
  },


  // PUT - Update existing record
  update: async (id, data) => {
    const payload = {
      lookupId: data.lookupId || "",
      newCode: data.newCode || "",
      description: data.description || "",
      isActive: data.isActive ?? true, // added status
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
      concurrencyStamp: data.concurrencyStamp || "",
    };
    const response = await apiClient.put(`/api/app/lookup-detail/${id}`, payload);
    return response.data;
  },


  // Disable — Soft Delete (same pattern as Code.js)
  disable: async (id) => {
    const response = await apiClient.delete(`/api/app/lookup-detail/${id}`);
    return response.data;
  },

  // Enable — Recover (same pattern as Code.js)
  enable: async (id) => {
    const response = await apiClient.post(`/api/app/lookup-detail/${id}/enable`);
    return response.data;
  },






  // GET by lookup codes
  getByLookupCodes: async (params) => {
    const response = await apiClient.get("/api/app/lookup-detail/by-lookup-codes", { params });
    return response.data;
  },

  // DELETE record (Direct delete if needed)
  delete: async (id) => {
    const response = await apiClient.delete(`/api/app/lookup-detail/${id}`);
    return response.data;
  },

  // POST - Toggle default indicator
  toggleDefaultIndicator: async (id, isDefault) => {
    const response = await apiClient.post(
      `/api/app/lookup-detail/${id}/is-default-indicator`,
      null,
      { params: { isDefault } }
    );
    return response.data;
  },

  // POST - Toggle required field
  toggleRequiredField: async (id, isRequired) => {
    const response = await apiClient.post(
      `/api/app/lookup-detail/${id}/is-required-field`,
      null,
      { params: { isRequired } }
    );
    return response.data;
  },

  // POST - Toggle has extra description
  toggleHasExtraDescription: async (id, hasExtra) => {
    const response = await apiClient.post(
      `/api/app/lookup-detail/${id}/has-extra-description`,
      null,
      { params: { hasExtra } }
    );
    return response.data;
  },

  // POST - Toggle sub category
  toggleHasSubCategory: async (id, hasSub) => {
    const response = await apiClient.post(
      `/api/app/lookup-detail/${id}/has-sub-category`,
      null,
      { params: { hasSub } }
    );
    return response.data;
  },

  // GET by group code
  getByGroupCode: async (id) => {
    const response = await apiClient.get(`/api/app/lookup-detail/${id}/by-group-code`);
    return response.data;
  },

  // Metadata for generic connections (Audit Log, etc.)
  id: "lookupDetail",
  entityName: "LookupDetail",
};

export default codeDetailsApi;