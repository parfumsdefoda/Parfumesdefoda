"use client";

import { ThemeProvider } from "@/providers/ThemeProvider";
import { CartProvider } from "@/providers/CartProvider";
import { ToastProvider } from "@/features/toast";
import type { Theme } from "@/types/services";

interface ProvidersProps {
  children: React.ReactNode;
  /** Theme data pre-loaded by the Server Component */
  theme?: Theme | null;
}

/**
 * Application providers wrapper.
 *
 * Order matters:
 * 1. ThemeProvider — injects design tokens from data/theme.json (loaded server-side)
 * 2. CartProvider — manages cart state with localStorage persistence
 * 3. ToastProvider — toast notifications (UI-only, no state deps)
 */
export function Providers({ children, theme = null }: ProvidersProps) {
  return (
    <ThemeProvider initialTheme={theme}>
      <CartProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </CartProvider>
    </ThemeProvider>
  );
}
