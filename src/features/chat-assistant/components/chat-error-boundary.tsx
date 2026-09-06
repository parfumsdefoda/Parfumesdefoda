"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * ChatErrorBoundary — catches errors from the ChatWidget tree
 * so a failure in the chat feature never crashes the entire layout.
 *
 * Renders nothing on error (silent failure) — the site works fine
 * without the chat widget.
 */
export class ChatErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Log but don't show to user — the site works without the chat widget
    console.warn("[ChatWidget] Failed to render:", error.message);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
