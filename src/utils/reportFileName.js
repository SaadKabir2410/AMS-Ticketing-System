export const buildReportFileName = (
  pageName,
  date = new Date(),
  extension = "xlsx",
) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const safePageName = pageName
    .trim()
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "");
  const safeExtension = extension.replace(/^\./, "");

  return `${safePageName}-${day}_${month}_${year}.${safeExtension}`;
};

const formatFileNameDateTime = (value) => {
  const match = String(value || "").match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/,
  );

  if (!match) return "";

  const [, year, month, day, hour = "23", minute = "59"] = match;
  return `${day}_${month}_${year} ${hour}_${minute}`;
};

export const buildDateRangeReportFileName = (
  pageName,
  dateFrom,
  dateTo,
  extension = "xlsx",
) => {
  const safePageName = pageName
    .trim()
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "");
  const safeExtension = extension.replace(/^\./, "");
  const from = formatFileNameDateTime(dateFrom);
  const to = formatFileNameDateTime(dateTo);

  return `${safePageName}-${from}-${to}.${safeExtension}`;
};
