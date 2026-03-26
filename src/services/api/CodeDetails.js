import apiClient from "../apiClient";

/**
 * Expert Full Stack Debugging Assistant Refactor
 * Root Cause: Many child-details endpoints in ABP don't support paging/sorting on specialized 
 * 'by-code/{id}' routes. Sending these params (SkipCount/Sorting) can sometimes result 
 * in 200 { items: [] } if the backend fails to parse the query correctly.
 */

export const codeDetailsApi = {
  // GET all records — matched to EXACT expert working pattern
  getAll: async (params) => {
    // If no lookupId is provided, safely return empty array
    if (!params?.lookupId) return [];

    // The 'code' property must be Passed as a query param (it should match the parent's lookupCode)
    const requestParams = {
      code: params?.code || params?.lookupCode || "",
      loadIsDeleted: true
    };

    // If search is needed, use 'filter' for ABP
    if (params?.search) {
      requestParams.filter = params.search;
    }

    try {
      const response = await apiClient.get(`/api/app/lookup-detail/by-code/${params.lookupId}`, {
        params: requestParams
      });

      // ABP standard return normalization
      const data = response.data?.items || response.data || [];
      console.log(`[CodeDetails] Fetched ${data.length} records for ${params.lookupId}`);
      return data;
    } catch (err) {
      console.error("[CodeDetails] Fetch failed:", err);
      // Fallback empty array to keep UI from crashing
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

  // DELETE - Remove record
  delete: async (id) => {
    const response = await apiClient.delete(`/api/app/lookup-detail/${id}`);
    return response.data;
  },

  // POST - Enable/Disable record — pass only ID
  enable: async (id) => {
    await apiClient.post(`/api/app/lookup-detail/${id}/enable`);
    return true;
  },

  // GET by lookup codes
  getByLookupCodes: async (params) => {
    const response = await apiClient.get("/api/app/lookup-detail/by-lookup-codes", { params });
    return response.data;
  },

  // POST - Toggle sub category
  toggleSubCategory: async (id, hasSubCategory) => {
    const response = await apiClient.post(
      `/api/app/lookup-detail/${id}/has-sub-task-category`,
      null,
      { params: { hasSubTaskCategory: !!hasSubCategory } }
    );
    return response.data;
  },

  // POST - Toggle required field
  toggleRequiredField: async (id, isRequired) => {
    const response = await apiClient.post(
      `/api/app/lookup-detail/${id}/is-required-field`,
      null,
      { params: { isRequiredField: !!isRequired } }
    );
    return response.data;
  },

  // GET by group code
  getByGroupCode: async (id) => {
    const response = await apiClient.get(`/api/app/lookup-detail/${id}/by-group-code`);
    return response.data;
  },
};

export default codeDetailsApi;