import apiClient from "../apiClient";

const BASE = "/api/account/my-profile";

export const myAccountApi = {
  getMyProfile: () => apiClient.get(BASE).then((r) => r.data),
  
  updateMyProfile: (data) => apiClient.put(BASE, data).then((r) => r.data),

  changePassword: (data) => apiClient.post(`${BASE}/change-password`, data).then((r) => r.data),
};

export default myAccountApi;
