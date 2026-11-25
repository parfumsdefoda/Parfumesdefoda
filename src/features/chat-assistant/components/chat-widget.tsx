"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/providers/CartProvider";
import { useChat } from "../hooks/use-chat";
import { consumeAdvisorOpen, subscribeAdvisor } from "../advisor-bus";
import { ChatWindow } from "./chat-window";

export interface AdvisorLabels {
  title: string;
  close: string;
}

export interface ChatWidgetProps {
  labels: AdvisorLabels;
}

/**
 * ChatWidget — the advisor panel, bottom-left.
 *
 * A fixed 330px card (full width minus 16px on phones) with the gold-ink
 * header, message bubbles, suggestion chips and one input row. The
 * conversation, `/api/chat`, the lazy chunk and the cart/route rules are
 * unchanged; only the doorway and the surface are new. Focus goes to the input
 * on open, Esc closes, Tab stays inside, and closing hands focus back.
 */
export function ChatWidget({ labels }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(() => consumeAdvisorOpen());
  const [closing, setClosing] = useState(false);
  const { messages, isLoading, error, sendMessage, clearMessages } = useChat();
  const { isDrawerOpen } = useCart();
  const pathname = usePathname();
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // Collapse the panel when the cart drawer opens — render-time adjustment.
  const [prevDrawerOpen, setPrevDrawerOpen] = useState(isDrawerOpen);
  if (prevDrawerOpen !== isDrawerOpen) {
    setPrevDrawerOpen(isDrawerOpen);
    if (isDrawerOpen) setIsOpen(false);
  }

  // Entry points outside this component ask for the panel through the bus.
  useEffect(
    () =>
      subscribeAdvisor(() => {
        const active = document.activeElement;
        // Safari does not focus a button when it is tapped, so fall back to
        // the launcher itself: closing must always hand focus back.
        returnFocusRef.current =
          active instanceof HTMLElement && active !== document.body
            ? active
            : document.querySelector<HTMLElement>("[data-advisor-launcher-button]");
        setIsOpen(true);
        setClosing(false);
      }),
    [],
  );

  const close = useCallback(() => {
    setClosing(true);
    window.setTimeout(() => {
      setIsOpen(false);
      setClosing(false);
      // Focus after React has removed the panel, so the launcher is visible
      // (and therefore focusable) again.
      window.requestAnimationFrame(() => returnFocusRef.current?.focus());
    }, 140);
  }, []);

  // Esc closes; Tab stays inside the panel.
  useEffect(() => {
    if (!isOpen) return;
    const getPanel = () => document.querySelector<HTMLElement>("[data-advisor-panel]");

    const focusable = () => {
      const panel = getPanel();
      if (!panel) return [];
      return Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close, isOpen]);

  // The checkout flow keeps its reduced shell and must not open a panel.
  const isCheckoutRoute = pathname?.startsWith("/checkout") ?? false;
  if (isCheckoutRoute || !isOpen) return null;

  return (
    <div
      data-advisor-panel=""
      role="dialog"
      aria-modal="true"
      aria-label={labels.title}
      className={`pf-panel-shadow fixed bottom-24 left-4 z-50 flex max-h-[70vh] w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl border border-[var(--boutique-line)] bg-[var(--boutique-white)] sm:left-6 sm:w-[330px] ${
        closing ? "pf-panel-out" : "pf-panel-in"
      }`}
    >
      <ChatWindow
        messages={messages}
        isLoading={isLoading}
        error={error}
        onSendMessage={sendMessage}
        onClearMessages={clearMessages}
        onClose={close}
        closeLabel={labels.close}
        onNavigateToProduct={close}
      />
    </div>
  );
}
