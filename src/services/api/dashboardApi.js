import apiClient from "../apiClient";

export const dashboardApi = {
  getDashboardData: async (userIds = []) => {
    try {
      const params = userIds.length > 0 ? { userIds } : {};
      const response = await apiClient.get(
        "/api/app/dashboard/dashboard-data",
        { params },
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching dashboard data", error);
      throw error;
    }
  },
};

export default dashboardApi;
