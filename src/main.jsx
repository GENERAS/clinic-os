import "./styles/globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import App from "./App";
document.documentElement.style.setProperty("--font-sans", "system-ui, -apple-system, sans-serif");
document.documentElement.style.setProperty("--font-mono", "'Cascadia Code', 'Fira Code', monospace");
createRoot(document.getElementById("root")).render(<StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>);
