import { useCallback, useEffect, useState } from "react";
import {
  getCachedApplicationConfig,
  getCachedLocalizationConfig,
  loadApplicationConfig,
} from "../services/applicationConfigCache";

const getLocalizationValue = (applicationConfig, resourceName, key) => {
  const localization = applicationConfig?.localization;
  const resources = localization?.values;
  if (!resources || typeof resources !== "object") return "";

  const preferredValue = resources[resourceName]?.[key];
  if (typeof preferredValue === "string" && preferredValue.trim()) {
    return preferredValue.trim();
  }

  const defaultValue = resources[localization.defaultResourceName]?.[key];
  if (typeof defaultValue === "string" && defaultValue.trim()) {
    return defaultValue.trim();
  }

  for (const resource of Object.values(resources)) {
    const value = resource?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
};

export const useBackendLocalization = (resourceName) => {
  // Saved texts show at once (also right after a logout); the request below
  // refreshes them.
  const [applicationConfig, setApplicationConfig] = useState(
    () => getCachedApplicationConfig() ?? getCachedLocalizationConfig(),
  );

  useEffect(() => {
    let active = true;
    loadApplicationConfig()
      .then((config) => {
        if (active) setApplicationConfig(config);
      })
      .catch(() => {
        // Pages remain usable with server error messages if configuration fails.
      });

    return () => {
      active = false;
    };
  }, []);

  return useCallback(
    (key) => getLocalizationValue(applicationConfig, resourceName, key),
    [applicationConfig, resourceName],
  );
};
