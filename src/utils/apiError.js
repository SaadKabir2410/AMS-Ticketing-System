const parseJsonString = (value) => {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) {
    return value;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const removeLocalizationKeyPrefix = (value) => {
  if (typeof value !== "string") return "";

  const cleanedValue = value
    .replace(/^\[[A-Za-z][\w.:-]+\]\s*/, "")
    .replace(/^[A-Za-z][\w.-]*:[\w.:-]+\s*:\s*/, "")
    .trim();

  // Never expose an unresolved localization key as the user-facing message.
  if (/^[A-Za-z][\w.-]*:[A-Za-z][\w.-]*$/.test(cleanedValue)) {
    return "";
  }

  return cleanedValue;
};

const getReadableMessage = (value) => {
  const parsedValue = parseJsonString(value);
  return parsedValue === value
    ? removeLocalizationKeyPrefix(value)
    : extractMessage(parsedValue);
};

const extractMessage = (responseData) => {
  if (typeof responseData === "string") {
    return getReadableMessage(responseData);
  }
  if (!responseData || typeof responseData !== "object") return "";

  const apiError = responseData.error || responseData;
  const validationMessages = Array.isArray(apiError.validationErrors)
    ? apiError.validationErrors
        .map((validationError) =>
          getReadableMessage(validationError?.message),
        )
        .filter(Boolean)
    : [];

  if (validationMessages.length) return validationMessages.join("\n");

  const modelStateMessages =
    apiError.errors && typeof apiError.errors === "object"
      ? Object.values(apiError.errors)
          .flat()
          .map((message) => getReadableMessage(message))
          .filter(Boolean)
      : [];

  if (modelStateMessages.length) return modelStateMessages.join("\n");

  return getReadableMessage(
    apiError.message || apiError.details || apiError.detail || apiError.title,
  );
};

const normalizeFieldName = (value) => {
  if (typeof value !== "string") return "";

  const fieldName = value.split(".").pop()?.replace(/\[\d+\]/g, "").trim();
  if (!fieldName) return "";

  return fieldName.charAt(0).toLowerCase() + fieldName.slice(1);
};

export const getApiFieldErrors = (error) => {
  const responseData = parseJsonString(error?.response?.data);
  if (!responseData || typeof responseData !== "object") return {};

  const apiError = responseData.error || responseData;
  const fieldErrors = {};
  const addFieldError = (field, message) => {
    const normalizedField = normalizeFieldName(field);
    const readableMessage = getReadableMessage(message);
    if (!normalizedField || !readableMessage) return;

    fieldErrors[normalizedField] = fieldErrors[normalizedField]
      ? `${fieldErrors[normalizedField]}\n${readableMessage}`
      : readableMessage;
  };

  if (Array.isArray(apiError.validationErrors)) {
    apiError.validationErrors.forEach((validationError) => {
      const members =
        validationError?.members ||
        validationError?.memberNames ||
        validationError?.fields ||
        [];
      const memberList = Array.isArray(members) ? members : [members];
      memberList.forEach((member) =>
        addFieldError(member, validationError?.message),
      );
    });
  }

  if (apiError.errors && typeof apiError.errors === "object") {
    Object.entries(apiError.errors).forEach(([field, messages]) => {
      const messageList = Array.isArray(messages) ? messages : [messages];
      messageList.forEach((message) => addFieldError(field, message));
    });
  }

  return fieldErrors;
};

export const getApiErrorMessage = (error) => {
  return extractMessage(error?.response?.data);
};

export const normalizeApiErrorForDisplay = (error) => {
  const response = error?.response;
  const message = getApiErrorMessage(error);
  if (!response || !message) return error;

  if (typeof response.data === "string") {
    response.data = message;
    return error;
  }

  if (!response.data || typeof response.data !== "object") return error;

  if (response.data.error && typeof response.data.error === "object") {
    response.data.error.message = message;
  } else {
    response.data.message = message;
  }

  return error;
};
