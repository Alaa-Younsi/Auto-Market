import { Component, type ErrorInfo, type ReactNode } from "react";

const RELOAD_FLAG = "am-chunk-reload";

/** A lazy route chunk that no longer exists: the site was redeployed while this tab was open. */
export function isStaleChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /loading chunk|dynamically imported module|importing a module script failed|failed to fetch dynamically/i.test(
    message
  );
}

/** Reload once to pick up the new deploy; the session flag stops a reload loop. */
export function reloadOnceForNewDeploy(): boolean {
  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) return false;
    sessionStorage.setItem(RELOAD_FLAG, "1");
  } catch {
    // storage blocked (private mode): reloading at most once is still safe
  }
  window.location.reload();
  return true;
}

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/**
 * Last line of defence against a white screen. React only supports error
 * boundaries as class components, which is why this one file is a class.
 * It renders OUTSIDE the theme/language providers, so it uses the CSS tokens
 * directly and prints both languages.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (isStaleChunkError(error) && reloadOnceForNewDeploy()) return;
    // The only crash signal the operator gets from a static SPA.
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-6 text-center text-ink">
        <p className="font-heading text-xl font-extrabold">Une erreur est survenue.</p>
        <p className="text-lg font-bold" dir="rtl">
          حدث خطأ غير متوقع.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white"
        >
          Recharger · إعادة التحميل
        </button>
      </div>
    );
  }
}
