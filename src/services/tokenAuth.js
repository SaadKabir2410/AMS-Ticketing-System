/**
 * tokenAuth.js
 * Resource Owner Password Credentials (ROPC) login utility.
 *
 * Trades a username + password for an access_token directly with the OpenIddict token endpoint.
 */

const TOKEN_ENDPOINT = "/connect/token"; 
const CLIENT_ID = "Billing_React";
const SCOPE = "email profile roles Billing";
const STORAGE_KEY = "tokenAuth:session";

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

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await res.json();

  if (!res.ok) {
    const msg =
      data?.error_description ||
      data?.error ||
      `Login failed (HTTP ${res.status})`;
    throw new Error(msg);
  }

  // Persist session
  const session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? null,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000,
    token_type: data.token_type ?? "Bearer",
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));

  return session;
}

/** Read the current session from storage. */
export function getSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session.expires_at - Date.now() < 30_000) return null;
    return session;
  } catch {
    return null;
  }
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
