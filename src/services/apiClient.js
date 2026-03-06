import axios from "axios";

const apiClient = axios.create({
  baseURL: "/api/app", // Prefix all calls with /app to hit ABP services
});

apiClient.interceptors.request.use(
  (config) => {
    let accessToken = null;

    // 1. Try the ROPC session first (our custom login)
    try {
      const raw = localStorage.getItem("tokenAuth:session");
      if (raw) {
        const session = JSON.parse(raw);
        if (session?.access_token && session.expires_at - Date.now() > 30_000) {
          accessToken = session.access_token;
        }
      }
    } catch {
      /* ignore */
    }

    // 2. Fall back to the OIDC session (react-oidc-context)
    if (!accessToken) {
      try {
        const origin = window.location.origin;
        const oidcKey = `oidc.user:${origin}:Billing_React`;
        const userJson = localStorage.getItem(oidcKey);
        if (userJson) {
          const user = JSON.parse(userJson);
          if (user?.access_token) accessToken = user.access_token;
        }
      } catch {
        /* ignore */
      }
    }

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export default apiClient;
