"use client";

import { createContext, useContext, type ReactNode } from "react";
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
 * ThemeProvider — exposes the theme (data/theme.json) to client components.
 *
 * The colour tokens themselves are injected by `layout.tsx` as an inline
 * style on <html> during the server render, so the derived scales
 * (purple/gold/green/neutral) are already correct at first paint. This
 * provider no longer touches the DOM: a client-side `useEffect` injection
 * would repaint after hydration and flash the default palette first.
 */
export function ThemeProvider({ children, initialTheme = null }: ThemeProviderProps) {
  return (
    <ThemeContext.Provider value={{ theme: initialTheme, isLoading: false }}>
      {children}
    </ThemeContext.Provider>
  );
}
