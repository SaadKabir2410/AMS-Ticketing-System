import { useEffect, useState } from "react";
import {
  getCachedBackendEnumTypes,
  loadBackendEnumTypes,
} from "../services/backendEnumCache";

// "CustomReport" -> "Custom Report"; acronyms such as "TSB" stay together.
const splitEnumName = (name) =>
  String(name)
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");

/**
 * Options for a backend enum, e.g. useBackendEnumOptions("StatusEnum", localize).
 * Labels use a backend localization key when one exists ("Enum:StatusEnum.Opened",
 * "StatusEnum.Opened" or the member name), otherwise the backend member name.
 */
export const useBackendEnumOptions = (enumName, localize, { exclude = [] } = {}) => {
  const [enumTypes, setEnumTypes] = useState(getCachedBackendEnumTypes);

  useEffect(() => {
    if (enumTypes) return undefined;
    let active = true;
    loadBackendEnumTypes()
      .then((types) => {
        if (active) setEnumTypes(types);
      })
      .catch(() => {
        // Options stay empty when the API definition cannot be loaded.
      });
    return () => {
      active = false;
    };
  }, [enumTypes]);

  // Some localize helpers return the key itself when the backend has no text;
  // that counts as "no text" so a raw key such as "Enum:StatusEnum.Opened" never shows.
  const backendText = (key) => {
    const value = localize(key);
    return value && value !== key ? value : "";
  };

  const members = enumTypes?.[enumName] || [];
  return members
    .filter((member) => !exclude.includes(member.name))
    .sort((first, second) => first.value - second.value)
    .map((member) => ({
      name: member.name,
      value: member.value,
      label:
        backendText(`Enum:${enumName}.${member.name}`) ||
        backendText(`${enumName}.${member.name}`) ||
        backendText(member.name) ||
        splitEnumName(member.name),
    }));
};
