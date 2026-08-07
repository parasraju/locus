import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[Locus] Render error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-full flex-col items-center justify-center bg-locus-bg px-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-locus-xl bg-locus-danger/10 text-locus-danger">
              <AlertTriangle size={24} />
            </div>
            <h2 className="mt-5 text-lg font-semibold text-locus-ink">Something went wrong</h2>
            <p className="mt-2 max-w-sm text-[13px] text-locus-ink-muted">
              {this.state.error?.message ?? "An unexpected error occurred."}
            </p>
            <button
              className="mt-4 rounded-locus-md bg-locus-accent px-4 py-2 text-[13px] font-semibold text-white hover:bg-locus-accent/90"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              Reload app
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
