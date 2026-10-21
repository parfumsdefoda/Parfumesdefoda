import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Badge — small status/label chip.
 *
 *   neutral   surface-muted background, muted text (categories, houses)
 *   gold      gold-50 + gold-700 text — the signature detail (فاخر)
 *   positive  green-50 + green-700 text — availability, success
 *   primary   purple fill + white text
 *
 * Gold and positive never use white text: both pass 4.5:1 on their tint.
 */
const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-pill border border-transparent px-2.5 py-1 text-caption font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 aria-invalid:border-destructive [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        neutral:
          "bg-[var(--ui-surface-muted)] text-[var(--ui-text-muted)]",
        gold: "bg-[var(--gold-50)] text-[var(--color-gold-text)] ring-1 ring-[var(--brand-gold)]/25",
        positive:
          "bg-[var(--green-50)] text-[var(--color-positive)]",
        primary: "bg-[var(--color-brand)] text-white",
        /* ── legacy aliases ── */
        default: "bg-[var(--color-brand)] text-white",
        secondary: "bg-[var(--ui-surface-muted)] text-[var(--ui-text-muted)]",
        destructive: "bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
        outline:
          "border-[var(--ui-border-strong)] text-[var(--ui-text)]",
        ghost: "text-[var(--ui-text-muted)]",
        link: "px-0 text-[var(--color-brand)] underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

function Badge({
  className,
  variant = "neutral",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
