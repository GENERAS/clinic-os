import "./styles/globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ErrorBoundary, getDegradedState } from "@/components/shared/error-boundary";
import App from "./App";

document.documentElement.style.setProperty("--font-sans", "system-ui, -apple-system, sans-serif");
document.documentElement.style.setProperty("--font-mono", "'Cascadia Code', 'Fira Code', monospace");

// Global error handler for uncaught errors
window.addEventListener("error", (event) => {
  const state = getDegradedState();
  state.errors.push({
    message: event.error?.message || event.message,
    stack: event.error?.stack,
    timestamp: new Date().toISOString(),
    type: "uncaught",
  });
  state.mode = "degraded";
  state.timestamp = new Date().toISOString();
});

window.addEventListener("unhandledrejection", (event) => {
  const state = getDegradedState();
  state.errors.push({
    message: event.reason?.message || "Unhandled Promise rejection",
    stack: event.reason?.stack,
    timestamp: new Date().toISOString(),
    type: "unhandled_rejection",
  });
  state.mode = "degraded";
  state.timestamp = new Date().toISOString();
});

// Register Service Worker for offline support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

createRoot(document.getElementById("root")).render(<StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>);
