import apiClient from "./apiClient";

const CACHE_KEY = "ams_application_configuration";
const CACHE_TTL_MS = 30 * 60 * 1000;

const readSessionCache = () => {
  try {
    const stored = sessionStorage.getItem(CACHE_KEY);
    if (!stored) return null;

    const { cachedAt, config } = JSON.parse(stored);
    if (!cachedAt || !config || Date.now() - cachedAt > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return config;
  } catch {
    return null;
  }
};

let cachedApplicationConfig = readSessionCache();
let applicationConfigRequest = null;

// The localization texts are public (the backend serves them to anonymous
// users too), so they are kept separately and survive a logout. The login page
// can then show its texts at once instead of waiting for a new download.
const LOCALIZATION_CACHE_KEY = "ams_localization";

const readLocalizationCache = () => {
  try {
    return JSON.parse(localStorage.getItem(LOCALIZATION_CACHE_KEY) || "null");
  } catch {
    return null;
  }
};

let cachedLocalizationConfig = readLocalizationCache();

export const getCachedLocalizationConfig = () => cachedLocalizationConfig;

const cacheApplicationConfig = (config) => {
  if (!config) return null;
  cachedApplicationConfig = config;
  if (config.localization) {
    cachedLocalizationConfig = { localization: config.localization };
    try {
      localStorage.setItem(LOCALIZATION_CACHE_KEY, JSON.stringify(cachedLocalizationConfig));
    } catch {
      // In-memory caching still works when browser storage is unavailable.
    }
  }
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ cachedAt: Date.now(), config }),
    );
  } catch {
    // In-memory caching still works when browser storage is unavailable.
  }
  return config;
};

export const getCachedApplicationConfig = () => cachedApplicationConfig;

export const loadApplicationConfig = ({ force = false } = {}) => {
  if (!force && cachedApplicationConfig) {
    return Promise.resolve(cachedApplicationConfig);
  }
  if (applicationConfigRequest) return applicationConfigRequest;

  applicationConfigRequest = apiClient.get("/api/abp/application-configuration", {
    params: {
      IncludeLocalizationResources: true,
      ...(force ? { _permissionRefresh: Date.now() } : {}),
    },
    headers: force
      ? {
        "Cache-Control": "no-cache, no-store",
        Pragma: "no-cache",
      }
      : undefined,
  }).then((response) => cacheApplicationConfig(response.data)).finally(() => {
    applicationConfigRequest = null;
  });

  return applicationConfigRequest;
};

export const clearApplicationConfigCache = () => {
  cachedApplicationConfig = null;
  applicationConfigRequest = null;
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    // Nothing else is required when browser storage is unavailable.
  }
};
