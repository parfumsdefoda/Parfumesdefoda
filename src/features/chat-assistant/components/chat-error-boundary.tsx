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
 * so a failure in the chat feature never crashes the rest of the site.
 *
 * Renders nothing on error (silent failure) and logs the full error
 * to the console so the next debugging session has evidence.
 */
export class ChatErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log fully but don't show to user — the site works without the chat widget
    console.error("[ChatWidget] Failed to render:", error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}