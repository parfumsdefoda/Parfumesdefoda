"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { Theme } from "@/types/services";

interface ThemeContextValue {
  theme: Theme | null;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: null,
  isLoading: true,
});

export function useTheme() {
  return useContext(ThemeContext);
}

interface ThemeProviderProps {
  children: ReactNode;
  /** Theme data pre-loaded by the Server Component via loadTheme() */
  initialTheme?: Theme | null;
}

/**
 * ThemeProvider injects design tokens as CSS custom properties on :root.
 *
 * Theme data is loaded server-side by layout.tsx and passed as a prop.
 * This component only handles DOM injection (which requires client access).
 */
export function ThemeProvider({ children, initialTheme = null }: ThemeProviderProps) {
  useEffect(() => {
    // Inject theme colors as CSS custom properties
    if (initialTheme?.colors) {
      const root = document.documentElement;
      for (const [key, value] of Object.entries(initialTheme.colors)) {
        root.style.setProperty(`--color-${key}`, value);
      }
    }
  }, [initialTheme]);

  return (
    <ThemeContext.Provider value={{ theme: initialTheme, isLoading: false }}>
      {children}
    </ThemeContext.Provider>
  );
}
