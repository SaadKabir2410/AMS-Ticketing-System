import axios from 'axios';

const apiClient = axios.create({
  baseURL: '', // Use relative path to take advantage of Vite proxy
  headers: {
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
});

apiClient.interceptors.request.use((config) => {
  const manualKey = "tokenAuth:session";

  try {
    // 1. Try manual login token
    const manualSession = JSON.parse(localStorage.getItem(manualKey));
    if (manualSession?.access_token) {
      config.headers.Authorization = `Bearer ${manualSession.access_token}`;
    }
  } catch (e) {
    console.error('Failed to parse auth user:', e);
  }

  // DEBUGGER: Log outgoing request
  console.log(`%c[DEBUGGER] Outgoing Request: ${config.method?.toUpperCase()} ${config.url}`, 'color: #3b82f6; font-weight: bold', {
    baseURL: config.baseURL,
    params: config.params,
    headers: config.headers
  });

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    // DEBUGGER: Log successful response
    console.log(`%c[DEBUGGER] API Response Success: ${response.config.url}`, 'color: #10b981; font-weight: bold', response.data);
    return response;
  },
  async (error) => {
    // DEBUGGER: Log error response
    console.error(`%c[DEBUGGER] API Response Error: ${error.config?.url}`, 'color: #ef4444; font-weight: bold', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });

    const config = error.config;
    // Auto-retry 502 Bad Gateway proxy errors once
    if (config && error.response?.status === 502 && !config._retry) {
      config._retry = true;
      console.warn(`%c[DEBUGGER] Retrying 502 Bad Gateway for ${config.url}`, 'color: #f59e0b; font-weight: bold');
      await new Promise(resolve => setTimeout(resolve, 800)); // wait slightly before retry
      return apiClient(config);
    }

    if (error.response?.status === 401) {
      // Trigger event for App.jsx to handle redirect
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    return Promise.reject(error);
  }
);

export default apiClient;
