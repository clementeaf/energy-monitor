import { Component, type ErrorInfo, type ReactNode } from 'react';

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

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="text-4xl">⚠</div>
          <h2 className="text-lg font-bold text-text">Algo salió mal</h2>
          <p className="max-w-md text-sm text-muted">
            Ocurrió un error inesperado. Puedes intentar recargar la sección o volver al inicio.
          </p>
          {this.state.error && (
            <pre className="max-w-lg overflow-auto rounded-lg bg-raised p-3 text-left text-xs text-subtle">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-raised"
            >
              Reintentar
            </button>
            <button
              onClick={() => { window.location.href = '/'; }}
              className="rounded-lg bg-accent px-4 py-2 text-sm text-white hover:bg-accent/80"
            >
              Ir al inicio
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
