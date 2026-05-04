import qs from "qs";

// ── Helper: get XSRF token from cookie ───────────────────────────────────────
const getXsrfToken = () => {
    const cookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("XSRF-TOKEN="))
        ?.split("=")[1];
    return cookie ? decodeURIComponent(cookie) : null;
};

// ── Helper: ALWAYS refresh XSRF token before any POST ────────────────────────
// The cookie goes stale — we must fetch fresh token every time
const refreshXsrfToken = async () => {
    await fetch("/api/abp/application-configuration", {
        headers: {
            "X-Requested-With": "XMLHttpRequest",
            "__tenant": "",
        },
    });
};

// ── Core POST helper using native fetch (bypasses Axios quirks) ───────────────
const publicPost = async (url, body) => {
    // Always refresh token first
    await refreshXsrfToken();
    const token = getXsrfToken();

    const response = await fetch(`${url}?api-version=1.0`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "__tenant": "",
            ...(token ? { "RequestVerificationToken": token } : {}),
        },
        body: JSON.stringify(body),
    });

    // 204 No Content = success (no body)
    if (response.status === 204 || response.status === 200) {
        return true;
    }

    // Any other status = error — try to parse error body
    let errorData = null;
    try {
        const text = await response.text();
        errorData = text ? JSON.parse(text) : null;
    } catch (_) {
        // ignore parse errors
    }

    const error = new Error(
        errorData?.error?.message ||
        errorData?.error?.details ||
        `Request failed with status ${response.status}`
    );
    error.response = { status: response.status, data: errorData };
    throw error;
};

export const accountApi = {
    /**
     * Step 1 — Send password reset email
     * POST /api/account/send-password-reset-code
     * Returns 204 No Content on success
     */
    sendPasswordResetCode: (email) =>
        publicPost("/api/account/send-password-reset-code", {
            email: email.trim(),
            appName: "MVC",
            returnUrl: "https://sureze.ddns.net:3001/reset-password",
            returnUrlHash: "",
        }),

    /**
     * Step 2 — Verify reset token (called on ResetPasswordPage mount)
     * POST /api/account/verify-password-reset-token
     */
    verifyPasswordResetToken: (userId, resetToken) =>
        publicPost("/api/account/verify-password-reset-token", {
            userId,
            resetToken,
        }),

    /**
     * Step 3 — Submit new password
     * POST /api/account/reset-password
     */
    resetPassword: (userId, resetToken, password) =>
        publicPost("/api/account/reset-password", {
            userId,
            resetToken,
            password,
        }),
};

export default accountApi;