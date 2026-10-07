/**
 * tokenAuth.js
 * Resource Owner Password Credentials (ROPC) login utility.
 *
 * Trades a username + password for an access_token directly with the OpenIddict token endpoint.
 */

const TOKEN_ENDPOINT = "/connect/token";
const CLIENT_ID = "Billing_React";
const SCOPE = "email profile roles Billing offline_access";
const STORAGE_KEY = "tokenAuth:session";
const EXPIRY_BUFFER_MS = 60_000;

let refreshPromise = null;

function readSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function requestToken(body) {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    const error = new Error(
      data?.error_description || data?.error || `Authentication failed (HTTP ${res.status})`,
    );
    error.status = res.status;
    throw error;
  }

  return data;
}

function persistSession(data, fallbackRefreshToken = null) {
  const session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? fallbackRefreshToken,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000,
    token_type: data.token_type ?? "Bearer",
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

/**
 * Attempt login with username / password.
 * Returns the parsed token response or throws an Error.
 */
export async function loginWithPassword(username, password) {
  const body = new URLSearchParams({
    grant_type: "password",
    client_id: CLIENT_ID,
    username,
    password,
    scope: SCOPE,
  });

  const data = await requestToken(body);
  return persistSession(data);
}

/** Read the current session from storage. */
export function getSession() {
  const session = readSession();
  if (!session?.access_token) return null;
  if (session.expires_at - Date.now() < EXPIRY_BUFFER_MS) return null;
  return session;
}

/** Return a usable token, refreshing it once when it is close to expiry. */
export async function getValidAccessToken({ forceRefresh = false } = {}) {
  const currentSession = readSession();
  if (!currentSession) return null;

  if (
    !forceRefresh &&
    currentSession.access_token &&
    currentSession.expires_at - Date.now() >= EXPIRY_BUFFER_MS
  ) {
    return currentSession.access_token;
  }

  if (!currentSession.refresh_token) return null;

  // All requests arriving around token expiry share one refresh operation.
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const body = new URLSearchParams({
        grant_type: "refresh_token",
        client_id: CLIENT_ID,
        refresh_token: currentSession.refresh_token,
      });

      try {
        const data = await requestToken(body);
        return persistSession(data, currentSession.refresh_token).access_token;
      } catch (error) {
        // An HTTP rejection means the refresh token is no longer valid. A
        // network failure is temporary, so keep the session for a later retry.
        if (error.status) clearSession();
        throw error;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

/** Remove the stored session. */
export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

/** Simple helper — returns { isAuthenticated, accessToken } */
export function getAuthState() {
  const session = getSession();
  return {
    isAuthenticated: !!session,
    accessToken: session?.access_token ?? null,
  };
}
