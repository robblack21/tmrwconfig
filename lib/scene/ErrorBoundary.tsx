"use client";
import React from "react";

type State = { error?: Error };
type Props = { children: React.ReactNode };

export class SceneErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {};
  }
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surface to the browser console with full stack for debugging.
    // eslint-disable-next-line no-console
    console.error("[Scene] crash:", error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="max-w-md p-5 neumorph-raised rounded-[16px] pointer-events-auto">
            <div className="t-label mb-2">Scene failed to mount</div>
            <pre className="t-row text-[color:var(--color-text)] whitespace-pre-wrap break-words text-[0.7rem]">
              {this.state.error.message}
            </pre>
            <button
              onClick={() => this.setState({ error: undefined })}
              className="mt-3 h-7 px-3 rounded-[6px] neumorph-raised text-[color:var(--color-accent)] text-[0.7rem]"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
