import apiClient from "./apiClient";

// Enum names and values come from the backend's ABP API definition, so the
// options always match the deployed backend enums.
// The API definition is large (~450 KB), so the extracted enums are kept for
// the browser session instead of downloading it again on every page load.
const CACHE_KEY = "ams_backend_enum_types";
const CACHE_TTL_MS = 30 * 60 * 1000;

const readSessionCache = () => {
  try {
    const stored = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
    if (!stored?.enumTypes || Date.now() - stored.cachedAt > CACHE_TTL_MS) return null;
    return stored.enumTypes;
  } catch {
    return null;
  }
};

let cachedEnumTypes = readSessionCache();
let enumTypesRequest = null;

const extractEnumTypes = (apiDefinition) => {
  const enumTypes = {};
  Object.entries(apiDefinition?.types || {}).forEach(([typeName, type]) => {
    if (!type?.isEnum) return;
    const shortName = typeName.split(".").pop();
    enumTypes[shortName] = (type.enumNames || []).map((name, index) => ({
      name,
      value: type.enumValues?.[index],
    }));
  });
  return enumTypes;
};

export const loadBackendEnumTypes = () => {
  if (cachedEnumTypes) return Promise.resolve(cachedEnumTypes);
  if (enumTypesRequest) return enumTypesRequest;

  enumTypesRequest = apiClient
    .get("/api/abp/api-definition", { params: { includeTypes: true } })
    .then((response) => {
      cachedEnumTypes = extractEnumTypes(response.data);
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ cachedAt: Date.now(), enumTypes: cachedEnumTypes }));
      } catch {
        // In-memory caching still works when browser storage is unavailable.
      }
      return cachedEnumTypes;
    })
    .finally(() => {
      enumTypesRequest = null;
    });

  return enumTypesRequest;
};

export const getCachedBackendEnumTypes = () => cachedEnumTypes;
