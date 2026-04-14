const IS_PROD = import.meta.env.PROD; // true when `vite build`
const LOG_LEVEL = import.meta.env.VITE_LOG_LEVEL ?? (IS_PROD ? "error" : "debug");
const LOG_ENDPOINT = "/api/logs"; // your backend receives this

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

async function sendToServer(level, tag, args) {
  try {
    await fetch(LOG_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level,
        tag,
        message: args.map(a =>
          typeof a === "object" ? JSON.stringify(a) : String(a)
        ).join(" "),
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      }),
    });
  } catch {
    // never let logging crash the app
  }
}

function log(level, tag, args) {
  if (LEVELS[level] < LEVELS[LOG_LEVEL]) return;

  // Always show in browser console (visible in dev)
  console[level]?.(`[${tag}]`, ...args);

  // In production, send warn + error to your server
  if (IS_PROD && LEVELS[level] >= LEVELS["warn"]) {
    sendToServer(level, tag, args);
  }
}

export function createLogger(tag) {
  return {
    debug: (...args) => log("debug", tag, args),
    info:  (...args) => log("info",  tag, args),
    warn:  (...args) => log("warn",  tag, args),
    error: (...args) => log("error", tag, args),
  };
}
