import { WebStorageStateStore } from "oidc-client-ts";

export const oidcConfig = {
    authority: "https://sureze.ddns.net:3333",
    client_id: "Billing_React",
    redirect_uri: `${window.location.origin}/auth/callback`,
    scope: "openid profile email roles offline_access",
    userStore: new WebStorageStateStore({
        store: window.localStorage,
    }),
    automaticSilentRenew: true
}