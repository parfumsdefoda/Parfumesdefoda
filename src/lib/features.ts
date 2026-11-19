import type { FeatureFlags, FullSettings } from "@/types/services";

/**
 * Feature flags — `data/settings.json` → `features`.
 *
 * ABSENT means enabled (backward compatible): a settings file from before
 * the flags existed must behave exactly as it always did. One helper per
 * flag so server and client code can ask without shipping the disabled
 * feature's code path.
 */

export interface ResolvedFeatureFlags {
  premium: boolean;
  assistant: boolean;
}

export function featureFlags(
  settings?: Pick<FullSettings, "features"> | { features?: FeatureFlags } | null,
): ResolvedFeatureFlags {
  const features = settings?.features;
  return {
    premium: features?.premium !== false,
    assistant: features?.assistant !== false,
  };
}

export function isPremiumEnabled(
  settings?: Pick<FullSettings, "features"> | { features?: FeatureFlags } | null,
): boolean {
  return featureFlags(settings).premium;
}

export function isAssistantEnabled(
  settings?: Pick<FullSettings, "features"> | { features?: FeatureFlags } | null,
): boolean {
  return featureFlags(settings).assistant;
}
