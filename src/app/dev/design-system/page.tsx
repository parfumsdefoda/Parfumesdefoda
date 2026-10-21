import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CONTRAST_PAIRS,
  PALETTE,
  TYPE_SCALE,
  contrastRatio,
} from "@/lib/design-tokens";

/**
 * /dev/design-system — the living reference for the token layer.
 *
 * Development only: it renders notFound() when NODE_ENV is production, so the
 * production build ships a 404 for this route.
 */

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

const SCALES: { title: string; keys: string[] }[] = [
  {
    title: "Brand inputs (data/theme.json)",
    keys: ["brand-purple", "brand-gold", "brand-green", "brand-white"],
  },
  {
    title: "Purple — brand & action",
    keys: ["purple-50", "purple-100", "purple-200", "purple-400", "purple-600", "purple-700", "purple-950"],
  },
  {
    title: "Gold — signature detail",
    keys: ["gold-50", "gold-100", "gold-300", "gold-500", "gold-700"],
  },
  {
    title: "Green — status & freshness",
    keys: ["green-50", "green-100", "green-700"],
  },
  {
    title: "Neutrals — warm, purple-tinted",
    keys: [
      "neutral-50",
      "neutral-100",
      "neutral-200",
      "neutral-300",
      "neutral-400",
      "neutral-500",
      "neutral-600",
      "neutral-700",
      "neutral-800",
      "neutral-900",
    ],
  },
  {
    title: "Semantic tokens",
    keys: [
      "bg",
      "surface",
      "surface-muted",
      "border",
      "border-strong",
      "text",
      "text-muted",
      "brand",
      "positive",
      "gold-text",
      "danger",
    ],
  },
];

const BUTTON_VARIANTS = ["primary", "secondary", "tertiary", "destructive"] as const;
const BUTTON_SIZES = [
  { key: "sm", label: "sm · 40" },
  { key: "default", label: "md · 44" },
  { key: "lg", label: "lg · 52" },
] as const;

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border py-10 first:border-t-0">
      <h2 className="text-title-3 font-bold text-foreground">{title}</h2>
      {description && (
        <p className="mt-1 mb-6 text-caption text-muted-foreground">{description}</p>
      )}
      <div className={description ? "" : "mt-6"}>{children}</div>
    </section>
  );
}

function Swatch({ token, value }: { token: string; value: string }) {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-card">
      <div className="h-16 w-full" style={{ backgroundColor: value }} />
      <div className="px-3 py-2">
        <p className="text-caption font-medium text-foreground">{token}</p>
        <p className="text-caption text-muted-foreground" dir="ltr">
          {value}
        </p>
      </div>
    </div>
  );
}

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const failing = CONTRAST_PAIRS.filter(
    (pair) => contrastRatio(pair.foreground, pair.background) < pair.min,
  );

  return (
    <main
      id="main-content"
      dir="ltr"
      className="container mx-auto max-w-5xl px-4 py-[var(--space-section)]"
    >
      <header className="pb-8">
        <p className="text-caption font-medium text-muted-foreground" dir="ltr">
          Development only
        </p>
        <h1 className="text-title-1 font-bold text-foreground" dir="ltr">
          Design system
        </h1>
        <p className="mt-2 max-w-2xl text-body text-muted-foreground" dir="ltr">
          Tokens live in <code>src/app/globals.css</code>. Brand colours come from{" "}
          <code>data/theme.json</code> and are injected during the server render.
          Radii: three. Shadows: two. Type: seven sizes, three weights.
        </p>
        <p className="mt-4 text-caption font-medium" dir="ltr">
          {failing.length === 0
            ? `All ${CONTRAST_PAIRS.length} text pairs pass WCAG AA.`
            : `${failing.length} pairs below WCAG AA — see Contrast below.`}
        </p>
      </header>

      <Section
        title="Colour tokens"
        description={
          "Purple owns brand and action, gold is a signature detail, green is status only. " +
          "Gold and green are never used for body text; gold-text and positive are the text-safe shades."
        }
      >
        <div className="space-y-8">
          {SCALES.map((scale) => (
            <div key={scale.title}>
              <h3 className="mb-3 text-caption font-bold text-muted-foreground" dir="ltr">
                {scale.title}
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {scale.keys.map((key) => (
                  <Swatch key={key} token={key} value={PALETTE[key]} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Contrast"
        description="Every foreground/background pair the system uses, measured with the WCAG 2.1 formula."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-caption" dir="ltr">
            <thead>
              <tr className="border-b border-border text-start">
                <th className="py-2 text-start font-bold text-foreground">Pair</th>
                <th className="py-2 text-start font-bold text-foreground">Fg</th>
                <th className="py-2 text-start font-bold text-foreground">Bg</th>
                <th className="py-2 text-start font-bold text-foreground">Ratio</th>
                <th className="py-2 text-start font-bold text-foreground">Min</th>
              </tr>
            </thead>
            <tbody>
              {CONTRAST_PAIRS.map((pair) => {
                const ratio = contrastRatio(pair.foreground, pair.background);
                const passes = ratio >= pair.min;
                return (
                  <tr key={pair.label} className="border-b border-border/60">
                    <td className="py-2 text-foreground">{pair.label}</td>
                    <td className="py-2 text-muted-foreground">{pair.foreground}</td>
                    <td className="py-2 text-muted-foreground">{pair.background}</td>
                    <td
                      className={
                        passes
                          ? "py-2 font-medium text-[color:var(--color-positive)]"
                          : "py-2 font-bold text-[color:var(--color-danger)]"
                      }
                    >
                      {ratio.toFixed(2)}:1
                    </td>
                    <td className="py-2 text-muted-foreground">{pair.min}:1</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title="Type scale"
        description="Seven fluid sizes with Arabic line heights. 14px is the floor; weights are 400/500/700 only."
      >
        <div className="space-y-5">
          {TYPE_SCALE.map((step) => (
            <div key={step.name} className="flex flex-wrap items-baseline justify-between gap-2">
              <p className={step.className} dir="rtl">
                {step.sample}
              </p>
              <p className="text-caption text-muted-foreground" dir="ltr">
                {step.className} — {step.note}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Buttons"
        description="One primary action per view. Every size meets the 44px touch target; focus rings are 2px purple with a 2px offset."
      >
        <div className="space-y-8">
          {BUTTON_SIZES.map((size) => (
            <div key={size.key} className="flex flex-wrap items-center gap-3">
              <span className="w-20 text-caption text-muted-foreground" dir="ltr">
                {size.label}
              </span>
              {BUTTON_VARIANTS.map((variant) => (
                <Button key={variant} variant={variant} size={size.key}>
                  {variant}
                </Button>
              ))}
              <Button variant="primary" size={size.key} disabled>
                disabled
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <span className="w-20 text-caption text-muted-foreground" dir="ltr">
              legacy
            </span>
            <Button variant="outline">outline</Button>
            <Button variant="ghost">ghost</Button>
            <Button variant="link">link</Button>
            <Button size="icon" aria-label="icon button">
              ★
            </Button>
          </div>
        </div>
      </Section>

      <Section
        title="Badges"
        description="Neutral for facts, gold for the signature label, positive for status. No white text on gold or green."
      >
        <div className="flex flex-wrap items-center gap-3" dir="rtl">
          <Badge variant="neutral">neutral</Badge>
          <Badge variant="gold">★ فاخر</Badge>
          <Badge variant="positive">متوفر</Badge>
          <Badge variant="primary">جديد</Badge>
          <Badge variant="destructive">غير متوفر</Badge>
        </div>
      </Section>

      <Section
        title="Form controls"
        description="Inputs carry a 3.7:1 border so the field edge is visible without a shadow."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ds-name">Default input</Label>
            <Input id="ds-name" placeholder="01XXXXXXXXX" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ds-invalid">Invalid input</Label>
            <Input id="ds-invalid" defaultValue="abc" aria-invalid />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ds-disabled">Disabled input</Label>
            <Input id="ds-disabled" placeholder="—" disabled />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-caption text-foreground">
              <Checkbox /> Checkbox
            </label>
            <label className="flex items-center gap-2 text-caption text-muted-foreground">
              <Checkbox disabled /> Disabled
            </label>
          </div>
        </div>
      </Section>

      <Section
        title="Radius & elevation"
        description="Three radii, two shadows — nothing else is allowed."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "rounded-control · 12px", className: "rounded-control" },
            { label: "rounded-card · 20px", className: "rounded-card" },
            { label: "rounded-pill · 9999px", className: "rounded-pill" },
          ].map((item) => (
            <div
              key={item.label}
              className={`flex h-24 items-end border border-border bg-card p-3 ${item.className}`}
            >
              <span className="text-caption text-muted-foreground" dir="ltr">
                {item.label}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {[
            { label: "shadow-soft", className: "shadow-soft" },
            { label: "shadow-lifted", className: "shadow-lifted" },
          ].map((item) => (
            <div
              key={item.label}
              className={`flex h-24 items-end rounded-card bg-card p-3 ${item.className}`}
            >
              <span className="text-caption text-muted-foreground" dir="ltr">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Motion"
        description="One easing curve, three durations, and a global prefers-reduced-motion override."
      >
        <ul className="space-y-1 text-caption text-muted-foreground" dir="ltr">
          <li>--ease-apple: cubic-bezier(0.28, 0.11, 0.32, 1)</li>
          <li>--duration-fast: 150ms · --duration-base: 300ms · --duration-slow: 500ms</li>
          <li>--space-section: clamp(64px, 8vw, 112px)</li>
        </ul>
      </Section>
    </main>
  );
}
