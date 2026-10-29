"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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

/** Desktop side panel from this breakpoint up; a bottom sheet below it. */
const DESKTOP_QUERY = "(min-width: 1024px)";

function subscribeDesktop(callback: () => void): () => void {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function desktopSnapshot(): boolean {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

/** The server render and the first client render agree on the sheet. */
function serverSnapshot(): boolean {
  return false;
}

/**
 * ChatWidget — the perfume advisor panel.
 *
 * Replaces the floating pulsing card. There is no permanent trigger on the
 * page: the header's "اختر عطرك", the hero's tertiary link and the homepage's
 * advisor band all ask for the panel through the advisor bus, so nothing
 * overlaps a CTA on a phone.
 *
 * A side panel from 1024px up, a bottom sheet below it. The conversation, the
 * /api/chat contract and the recommendation cards are unchanged; only the
 * doorway is. Focus goes to the input when it opens and back to whatever
 * opened it when it closes, and Tab stays inside the panel.
 */
export function ChatWidget({ labels }: ChatWidgetProps) {
  // A click made while this chunk was still downloading is not lost.
  const [isOpen, setIsOpen] = useState(() => consumeAdvisorOpen());
  const { messages, isLoading, error, sendMessage, clearMessages } = useChat();
  const { isDrawerOpen } = useCart();
  const pathname = usePathname();
  const isDesktop = useSyncExternalStore(
    subscribeDesktop,
    desktopSnapshot,
    serverSnapshot,
  );

  /** The control that opened the panel, so focus can go back to it. */
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // Collapse the panel when the cart drawer opens — render-time state
  // adjustment, the documented pattern for reacting to context changes.
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
        returnFocusRef.current =
          active instanceof HTMLElement ? active : null;
        setIsOpen(true);
      }),
    [],
  );

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
  }, []);

  // Focus contract: Tab stays inside the panel, and closing hands focus back to
  // the control the shopper used. Base UI's dialog parts do not move focus in
  // this build, so the small amount a keyboard user needs lives here.
  useEffect(() => {
    if (!isOpen) return;

    const getPanel = () =>
      document.querySelector<HTMLElement>("[data-advisor-panel]");

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
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [isOpen]);

  // The checkout flow keeps its own reduced shell and must not open a panel
  // over the form.
  const isCheckoutRoute = pathname?.startsWith("/checkout") ?? false;
  if (isCheckoutRoute) return null;

  /* A side panel from the desktop breakpoint up, a bottom sheet below it. */
  const panelClass = isDesktop
    ? "w-[420px] max-w-[92vw] p-0"
    : "min-h-[78dvh] rounded-t-card border-t border-[var(--color-border)] p-0";

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent
        side={isDesktop ? "left" : "bottom"}
        data-advisor-panel=""
        closeLabel={labels.close}
        className={`flex flex-col gap-0 ${panelClass}`}
      >
        {/* The chat window already shows the advisor's name; this title exists
            for the dialog's accessible name, not for the eye. */}
        <SheetHeader className="sr-only">
          <SheetTitle>{labels.title}</SheetTitle>
        </SheetHeader>
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          error={error}
          onSendMessage={sendMessage}
          onClearMessages={clearMessages}
          onNavigateToProduct={() => setIsOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
