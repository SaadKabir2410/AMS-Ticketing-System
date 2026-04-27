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

  console.log(
    `%c[DEBUGGER] Outgoing Request: ${config.method?.toUpperCase()} ${config.url}`,
    "color: #3b82f6; font-weight: bold",
    {
      baseURL: config.baseURL,
      params: config.params,
      headers: config.headers,
    },
  );

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    // DEBUGGER: Log successful response
    console.log(
      `%c[DEBUGGER] API Response Success: ${response.config.url}`,
      "color: #10b981; font-weight: bold",
      response.data,
    );
    return response;
  },
  async (error) => {
    // DEBUGGER: Log error response
    console.error(
      `%c[DEBUGGER] API Response Error: ${error.config?.url}`,
      "color: #ef4444; font-weight: bold",
      {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      },
    );

    const config = error.config;
    // Auto-retry 502 Bad Gateway proxy errors once
    if (config && error.response?.status === 502 && !config._retry) {
      config._retry = true;
      console.warn(
        `%c[DEBUGGER] Retrying 502 Bad Gateway for ${config.url}`,
        "color: #f59e0b; font-weight: bold",
      );
      await new Promise((resolve) => setTimeout(resolve, 800)); // wait slightly before retry
      return apiClient(config);
    }

    if (error.response?.status === 401) {
      // Avoid infinite loop if refresh also returns 401
      if (config && !config._isRetry) {
        config._isRetry = true;
        try {
          const { refreshAccessToken } = await import("./tokenAuth");
          const newSession = await refreshAccessToken();
          if (newSession?.access_token) {
            config.headers.Authorization = `Bearer ${newSession.access_token}`;
            return apiClient(config);
          }
        } catch (refreshErr) {
          console.error("[apiClient] Token refresh failed:", refreshErr);
        }
      }

      // If refresh failed or was already tried, trigger logout
      window.dispatchEvent(new CustomEvent("auth:expired"));
    }
    return Promise.reject(error);
  },
);

export default apiClient;
