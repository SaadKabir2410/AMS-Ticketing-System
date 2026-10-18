import React from "react";

const escapeRegExp = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default function SearchTextHighlight({ text, query }) {
  const label = String(text ?? "");
  const normalizedQuery = String(query ?? "").trim();

  if (!normalizedQuery) return label;

  const parts = label.split(
    new RegExp(`(${escapeRegExp(normalizedQuery)})`, "gi"),
  );

  return parts.map((part, index) =>
    part.toLowerCase() === normalizedQuery.toLowerCase() ? (
      <mark
        key={`${part}-${index}`}
        className="rounded-sm bg-pink-200 px-0.5 text-pink-900 dark:bg-pink-500/40 dark:text-pink-100"
      >
        {part}
      </mark>
    ) : (
      <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
    ),
  );
}
