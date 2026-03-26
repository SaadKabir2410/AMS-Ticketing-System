import { StrictMode, Component, useMemo } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { AuthProvider as CustomAuthProvider } from "./context/Authcontext";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "./component/common/Toast";
import {
  ThemeProvider as MuiThemeProvider,
  createTheme,
} from "@mui/material/styles";

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

function MuiThemeWrapper({ children }) {
  const { dark } = useTheme();
  
  const muiTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: dark === "dark" ? "dark" : "light",
        },
        typography: {
          fontFamily: '"Inter", sans-serif',
          allVariants: {
            fontWeight: 400,
            textTransform: "none",
          },
          button: {
            fontWeight: 400,
            textTransform: "none",
          },
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                fontWeight: 400,
                textTransform: "none",
              },
            },
          },
          MuiTab: {
            styleOverrides: {
              root: {
                fontWeight: 400,
                textTransform: "none",
              },
            },
          },
          MuiDataGrid: {
            styleOverrides: {
              columnHeaderTitle: {
                fontWeight: 400,
              },
            },
          },
        },
      }),
    [dark]
  );

  return <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <CustomAuthProvider>
          <ThemeProvider>
            <ToastProvider>
              <MuiThemeWrapper>
                <App />
              </MuiThemeWrapper>
            </ToastProvider>
          </ThemeProvider>
        </CustomAuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
