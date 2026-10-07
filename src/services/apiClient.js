import axios from "axios";
import qs from "qs";
import { getSession, getValidAccessToken } from "./tokenAuth.js";

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

apiClient.interceptors.request.use(async (config) => {
  let accessToken;
  try {
    accessToken = await getValidAccessToken();
  } catch (error) {
    if (error.status) {
      window.dispatchEvent(new CustomEvent("auth:expired"));
    }
    throw error;
  }

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
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
      if (config && !config._authRetry) {
        config._authRetry = true;
        const sessionWasActive = Boolean(getSession());

        try {
          const accessToken = await getValidAccessToken({ forceRefresh: true });
          if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
            return apiClient(config);
          }

          // A valid access token can receive a 401 from an individual endpoint
          // for reasons unrelated to token expiry. Do not destroy the whole
          // login when the server did not provide a refresh token.
          if (sessionWasActive) return Promise.reject(error);
        } catch (refreshError) {
          // Keep the user signed in during temporary connectivity failures.
          if (!refreshError.status) return Promise.reject(error);

          // The token endpoint explicitly rejected the refresh token.
          window.dispatchEvent(new CustomEvent("auth:expired"));
          return Promise.reject(error);
        }
      }

      // Only end the session if there is no longer a usable token. A second
      // 401 after a successful refresh may simply be endpoint authorization.
      if (!getSession()) {
        window.dispatchEvent(new CustomEvent("auth:expired"));
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
