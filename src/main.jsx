import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "react-oidc-context";
import { WebStorageStateStore } from "oidc-client-ts";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "./component/common/Toast";
import { Component } from "react";
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", color: "red" }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error && this.state.error.toString()}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

const oidcConfig = {
  authority: "https://sureze.ddns.net:3000",
  client_id: "Billing_React",
  redirect_uri: window.location.origin + "/auth/callback",
  post_logout_redirect_uri: window.location.origin + "/",
  scope: "openid profile email roles Billing offline_access",
  automaticSilentRenew: true,
  userStore: new WebStorageStateStore({ store: window.localStorage }),

  // BYPASS CORS: Manually telling the library where to find endpoints via our proxy
  metadata: {
    issuer: "https://sureze.ddns.net:3000",
    authorization_endpoint: window.location.origin + "/connect/authorize",
    token_endpoint: window.location.origin + "/connect/token",
    userinfo_endpoint: window.location.origin + "/connect/userinfo",
    end_session_endpoint: window.location.origin + "/connect/endsession",
    jwks_uri: window.location.origin + "/.well-known/openid-configuration/jwks",
  },

  onSigninCallback: (_user) => {
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider {...oidcConfig}>
          <ThemeProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
