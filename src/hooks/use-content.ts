"use client";

import type { SiteContent } from "@/types/services";
import type { FaqItem } from "@/features/faq";
import type { PolicySection } from "@/features/policies";

export interface UseContentReturn {
  /** Full site content */
  content: SiteContent;
  /** Whether content is loading */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Hero content */
  hero: SiteContent["hero"];
  /** FAQ items */
  faq: FaqItem[];
  /** Policy sections */
  policies: PolicySection[];
}

const defaultContent: SiteContent = {
  hero: { title: "", description: "" },
  homepage: { hero: { title: "", subtitle: "" }, sections: [] },
  about: { title: "", description: "" },
  faq: [],
  policies: [],
};

/**
 * Hook for consuming page content.
 *
 * Data is pre-loaded by the Server Component and passed as initialContent.
 * No client-side fetching — all file I/O happens server-side.
 */
export function useContent(
  initialContent: SiteContent = defaultContent,
): UseContentReturn {
  return {
    content: initialContent,
    isLoading: false,
    error: null,
    hero: initialContent.hero,
    faq: initialContent.faq,
    policies: initialContent.policies,
  };
}
