import { Component } from "react";

const degradedState = { errors: [], mode: "normal", timestamp: null };

export function getDegradedState() {
  return degradedState;
}

export function clearDegradedState() {
  degradedState.errors = [];
  degradedState.mode = "normal";
  degradedState.timestamp = null;
}

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, _errorInfo) {
    const isChunkError = error?.message?.includes("dynamically imported module") || error?.message?.includes("Loading chunk");
    console.error("ClinicOS error:", error?.message || "Unknown error");
    if (isChunkError) return;
    const entry = {
      message: error?.message || "Unknown error",
      timestamp: new Date().toISOString(),
    };
    degradedState.errors.push(entry);
    degradedState.mode = "degraded";
    degradedState.timestamp = entry.timestamp;
  }

  render() {
    if (this.state.hasError) {
      const isChunkError = this.state.error?.message?.includes("dynamically imported module") || this.state.error?.message?.includes("Loading chunk");
      if (isChunkError) {
        return (
          <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <div className="w-full max-w-md space-y-4 rounded-xl border p-6 text-center">
              <h1 className="text-xl font-semibold">New version deployed</h1>
              <p className="text-sm text-muted-foreground">A new version of the app was deployed. Please refresh to continue.</p>
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Refresh page
              </button>
            </div>
          </div>
        );
      }
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="w-full max-w-md space-y-4 rounded-xl border p-6 text-center">
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">Please try again. If the problem persists, contact support.</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
