/**
 * tokenAuth.js
 * Resource Owner Password Credentials (ROPC) login utility.
 */

const TOKEN_ENDPOINT = "/connect/token";
const CLIENT_ID = "Billing_React_Staging";
const SCOPE = "email profile roles Billing";
const STORAGE_KEY = "tokenAuth:session";

// ─── Logger ───────────────────────────────────────────────────────────────────
const IS_PROD = import.meta.env.PROD;
const LOG_LEVEL = import.meta.env.VITE_LOG_LEVEL ?? (IS_PROD ? "error" : "debug");
const LOG_ENDPOINT = "/api/logs";
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

async function sendToServer(level, args) {
  try {
    await fetch(LOG_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level,
        tag: "tokenAuth",
        message: args
          .map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a)))
          .join(" "),
        timestamp: new Date().toISOString(),
        url: window.location.href,
      }),
    });
  } catch {
    // never let logging crash the app
  }
}

function log(level, ...args) {
  if (LEVELS[level] < LEVELS[LOG_LEVEL]) return;
  console[level]("[tokenAuth]", ...args);
  if (IS_PROD && LEVELS[level] >= LEVELS["warn"]) {
    sendToServer(level, args);
  }
}

const logger = {
  debug: (...a) => log("debug", ...a),
  info: (...a) => log("info", ...a),
  warn: (...a) => log("warn", ...a),
  error: (...a) => log("error", ...a),
};
// ──────────────────────────────────────────────────────────────────────────────

export async function loginWithPassword(username, password) {
  logger.info("loginWithPassword() → attempting login", { username });

  const body = new URLSearchParams({
    grant_type: "password",
    client_id: CLIENT_ID,
    username,
    password,
    scope: SCOPE,
  });

  let res, data;

  try {
    res = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  } catch (networkErr) {
    logger.error("Network error — could not reach token endpoint", String(networkErr));
    throw new Error("Network error — server unreachable. Please try again.");
  }

  logger.debug("Token endpoint responded", { status: res.status, ok: res.ok });

  // ── Safely parse response (handles 502 HTML pages, empty body, etc.) ────────
  const contentType = res.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text();
      logger.error("Non-JSON response from token endpoint", {
        status: res.status,
        body: text.slice(0, 300),
      });
      data = {};
    }
  } catch (parseErr) {
    logger.error("Failed to parse token endpoint response", String(parseErr));
    data = {};
  }

  if (!res.ok) {
    const msg =
      data?.error_description ||
      data?.error ||
      `Login failed (HTTP ${res.status})`;
    logger.warn("Login failed", {
      status: res.status,
      error: data?.error,
      description: data?.error_description,
    });
    throw new Error(msg);
  }

  const session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? null,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000,
    token_type: data.token_type ?? "Bearer",
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  logger.info("Login successful — session stored", {
    token_type: session.token_type,
    expires_in: data.expires_in,
    has_refresh: !!session.refresh_token,
  });

  return session;
}

export function getSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      logger.debug("getSession() → no session in storage");
      return null;
    }

    const session = JSON.parse(raw);
    const ttl = session.expires_at - Date.now();

    if (ttl <= 0) {
      logger.warn("getSession() → session expired", { ttl_ms: ttl });
      return null;
    }

    logger.debug("getSession() → valid session", { ttl_ms: ttl });
    return session;
  } catch (err) {
    logger.error("getSession() → failed to parse session from storage", String(err));
    return null;
  }
}

export function clearSession() {
  logger.info("clearSession() → session removed");
  localStorage.removeItem(STORAGE_KEY);
}

export async function refreshAccessToken() {
  const session = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (!session?.refresh_token) {
    logger.warn("refreshAccessToken() → no refresh token available");
    return null;
  }

  logger.info("refreshAccessToken() → attempting refresh");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: CLIENT_ID,
    refresh_token: session.refresh_token,
    scope: SCOPE,
  });

  try {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) throw new Error(`Refresh failed: ${res.status}`);

    const data = await res.json();
    const newSession = {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? session.refresh_token,
      expires_at: Date.now() + (data.expires_in || 3600) * 1000,
      token_type: data.token_type ?? "Bearer",
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
    logger.info("Refresh successful — new session stored");
    return newSession;
  } catch (err) {
    logger.error("refreshAccessToken() → failed", String(err));
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function getAuthState() {
  const session = getSession();
  const state = {
    isAuthenticated: !!session,
    accessToken: session?.access_token ?? null,
  };
  logger.debug("getAuthState()", { isAuthenticated: state.isAuthenticated });
  return state;
}