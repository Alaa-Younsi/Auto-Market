import { Component, type ErrorInfo, type ReactNode } from "react";

interface SceneErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface SceneErrorBoundaryState {
  failed: boolean;
}

/**
 * The hero's 3D scene is decoration, never content. If the GLB fails to fetch
 * or the WebGL context dies mid-session, swap in the static art instead of
 * taking the whole landing page down with it.
 */
export class SceneErrorBoundary extends Component<
  SceneErrorBoundaryProps,
  SceneErrorBoundaryState
> {
  state: SceneErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): SceneErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Swallowed on purpose: a missing decorative model is not worth a console
    // error in production, and the fallback already communicates the outcome.
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
