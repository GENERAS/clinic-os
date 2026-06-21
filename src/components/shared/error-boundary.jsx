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

  componentDidCatch(error, errorInfo) {
    const entry = {
      message: error?.message || "Unknown error",
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
    };
    degradedState.errors.push(entry);
    degradedState.mode = "degraded";
    degradedState.timestamp = entry.timestamp;
    console.error("ClinicOS error:", entry);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="w-full max-w-md space-y-4 rounded-xl border p-6 text-center">
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">The application encountered an unexpected error.</p>
            <pre className="overflow-auto rounded-lg bg-muted p-3 text-xs text-left max-h-40">{this.state.error?.message}</pre>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (degradedState.errors.length > 0) {
                  degradedState.errors = [];
                  degradedState.mode = "recovering";
                }
              }}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
