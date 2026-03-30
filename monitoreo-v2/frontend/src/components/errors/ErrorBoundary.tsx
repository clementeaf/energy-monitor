import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** UI cuando hay error; reset() vuelve a intentar el render del árbol bajo el boundary */
  fallback: (args: { error: Error; reset: () => void }) => ReactNode;
  /** Si cambia, se limpia el error (p. ej. pathname para rutas) */
  resetKeys?: ReadonlyArray<string | number>;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Boundary genérico para aislar fallos de render en subárboles.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { error: null };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  public componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    const { resetKeys } = this.props;
    const prevKeys = prevProps.resetKeys;
    if (this.state.error != null && resetKeys !== undefined && prevKeys !== undefined) {
      const changed = resetKeys.length !== prevKeys.length || resetKeys.some((k, i) => k !== prevKeys[i]);
      if (changed) {
        this.setState({ error: null });
      }
    }
  }

  private readonly reset = (): void => {
    this.setState({ error: null });
  };

  public render(): ReactNode {
    const { error } = this.state;
    const { children, fallback } = this.props;
    if (error != null) {
      return fallback({ error, reset: this.reset });
    }
    return children;
  }
}
