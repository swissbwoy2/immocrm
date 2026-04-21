import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Local error boundary for 3D / WebGL scenes. Prevents WebGL context
 * creation failures (Safari low-power, blocked GPU, missing extensions)
 * from bringing down the whole page via the global ErrorBoundary.
 */
export class WebGLErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[WebGLErrorBoundary] 3D scene disabled:', error.message, info.componentStack);
  }

  public render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}
