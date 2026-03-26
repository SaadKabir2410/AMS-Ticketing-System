import apiClient from "../apiClient";

export const codesApi = {
  // Fetch all lookup records (loadIsDeleted: true fetches the disabled ones too)
  getAll: async () => {
    const response = await apiClient.get("/api/app/lookup", {
      params: { loadIsDeleted: true }
    });
    return response.data?.items || response.data || [];
  },

  // Fetch single record by ID before editing
  getById: async (id) => {
    const response = await apiClient.get(`/api/app/lookup/${id}/by-id`);
    return response.data;
  },

  // Create a new lookup record
  create: async (data) => {
    const payload = {
      lookupCode: data.lookupCode,
      description: data.description,
      sequence: Number(data.sequence),
      isSystemIndicator: data.isSystemIndicator ?? false,
      isActive: data.isActive ?? true,
    };
    const response = await apiClient.post("/api/app/lookup", payload);
    return response.data;
  },

  // Update existing record
  update: async (id, data) => {
    const payload = {
      lookupCode: data.lookupCode,
      description: data.description,
      sequence: Number(data.sequence),
      isSystemIndicator: data.isSystemIndicator ?? false,
      isActive: data.isActive ?? true,
      concurrencyStamp: data.concurrencyStamp,
    };
    const response = await apiClient.put(`/api/app/lookup/${id}`, payload);
    return response.data;
  },

  // Disable — Use standard HTTP DELETE (Soft Delete disables the record)
  disable: async (id) => {
    const response = await apiClient.delete(`/api/app/lookup/${id}`);
    return response.data;
  },

  // Enable — strictly POST to /enable with no body
  enable: async (id) => {
    const response = await apiClient.post(`/api/app/lookup/${id}/enable`);
    return response.data;
  },
};

export default codesApi;
