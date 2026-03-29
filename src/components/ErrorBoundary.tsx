import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error) {
            errorMessage = `Firestore Error: ${parsed.error}`;
          }
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Something went wrong</h2>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">
            {errorMessage}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-700 text-white rounded-xl font-bold hover:bg-emerald-800 transition-all"
          >
            <RefreshCw size={18} /> Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
