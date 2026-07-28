import type { SiteContent } from "@/types/services";
import type { PolicySection } from "@/features/policies";
import { readJsonFile } from "@/lib/json-loader";

// Re-export type for backward compatibility
export type { SiteContent, HeroContent, HomepageContent, AboutContent } from "@/types/services";

/**
 * Load all site content from the content/ directory using server-side file reading.
 */
export async function loadContent(): Promise<SiteContent> {
  const defaults: SiteContent = {
    hero: { title: "", description: "" },
    homepage: { hero: { title: "", subtitle: "" }, sections: [] },
    about: { title: "", description: "" },
    faq: [],
    policies: [],
  };

  try {
    const [hero, homepage, about, faq, policiesData] = await Promise.all([
      readJsonFile<Record<string, unknown>>("content/hero.json", {}),
      readJsonFile<Record<string, unknown>>("content/homepage.json", {}),
      readJsonFile<Record<string, unknown>>("content/about.json", {}),
      readJsonFile<unknown>("content/faq.json", []),
      readJsonFile<Record<string, unknown> | null>("content/policies.json", null),
    ]);

    // Convert policies object to array
    let policySections: PolicySection[] = defaults.policies;
    if (policiesData && typeof policiesData === "object" && !Array.isArray(policiesData)) {
      policySections = Object.entries(policiesData).map(
        ([key, value]) => ({
          key,
          title: (value && typeof value === "object" && "title" in value ? (value as { title: string }).title : null) ?? key,
          body: (value && typeof value === "object" && "body" in value ? (value as { body: string }).body : "") ?? "",
        }),
      );
    }

    return {
      hero: {
        title: (hero.title as string) ?? defaults.hero.title,
        description: (hero.description as string) ?? defaults.hero.description,
      },
      homepage: {
        hero: {
          title: (homepage.hero as { title?: string })?.title ?? defaults.homepage.hero.title,
          subtitle: (homepage.hero as { subtitle?: string })?.subtitle ?? defaults.homepage.hero.subtitle,
        },
        sections: Array.isArray(homepage.sections) ? homepage.sections : [],
      },
      about: {
        title: (about.title as string) ?? defaults.about.title,
        description: (about.description as string) ?? defaults.about.description,
      },
      faq: Array.isArray(faq) ? faq : defaults.faq,
      policies: policySections,
    };
  } catch {
    return defaults;
  }
}
