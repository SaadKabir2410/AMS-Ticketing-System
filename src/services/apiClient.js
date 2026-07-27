import axios from "axios";
import qs from "qs";

const apiClient = axios.create({
  baseURL: "",
  headers: {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  params: {
    "api-version": "1.0", // ← add this
  },
  paramsSerializer: {
    serialize: (params) => {
      return qs.stringify(params, { allowDots: true, arrayFormat: "repeat" });
    },
  },
});

apiClient.interceptors.request.use((config) => {
  const manualKey = "tokenAuth:session";

  try {
    const manualSession = JSON.parse(localStorage.getItem(manualKey));
    if (manualSession?.access_token) {
      config.headers.Authorization = `Bearer ${manualSession.access_token}`;
    }
  } catch (e) {
    console.error("Failed to parse auth user:", e);
  }

  // Add tenant header for ABP Framework
  config.headers["__tenant"] = "";

  // Add antiforgery token for POST/PUT/DELETE
  const xsrfToken = document.cookie
    .split("; ")
    .find((row) => row.startsWith("XSRF-TOKEN="))
    ?.split("=")[1];

  if (xsrfToken && ["post", "put", "delete"].includes(config.method?.toLowerCase())) {
    config.headers["RequestVerificationToken"] = decodeURIComponent(xsrfToken);
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {

    const config = error.config;
    // Auto-retry 502 Bad Gateway proxy errors once
    if (config && error.response?.status === 502 && !config._retry) {
      config._retry = true;
      await new Promise((resolve) => setTimeout(resolve, 200)); // brief wait before retry
      return apiClient(config);
    }

    if (error.response?.status === 401) {
      // Trigger event for App.jsx to handle redirect
      window.dispatchEvent(new CustomEvent("auth:expired"));
    }
    return Promise.reject(error);
  },
);

export default apiClient;