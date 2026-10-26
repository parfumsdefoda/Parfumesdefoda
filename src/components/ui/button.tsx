import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Button — the only button in the system.
 *
 * Variants (one job each):
 *   primary      purple fill, white text — the one action on a screen
 *   secondary    purple outline, transparent — the alternative action
 *   tertiary     purple text, no chrome — inline "learn more" actions
 *   destructive  danger fill for irreversible actions
 *
 * `default`/`outline`/`ghost`/`link` are kept as aliases because older
 * call sites still use the pre-token names. `outline` is deliberately the
 * NEUTRAL outlined control (quantity steppers, dialog close) so chrome does
 * not turn purple.
 *
 * Sizes respect the 44px minimum touch target; icon-only sizes extend their
 * hit area with a transparent ::after instead of growing the visual.
 */
const buttonVariants = cva(
  [
    "group/button relative inline-flex shrink-0 items-center justify-center gap-2",
    "rounded-pill border border-transparent bg-clip-padding",
    "text-caption font-medium whitespace-nowrap select-none",
    "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-apple)]",
    "outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ui-surface)]",
    "disabled:pointer-events-none disabled:opacity-50",
    "aria-invalid:ring-2 aria-invalid:ring-[var(--color-danger)]/30",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-brand)] text-white hover:bg-[var(--purple-700)] active:bg-[var(--purple-700)]",
        secondary:
          "border-[var(--color-brand)] bg-transparent text-[var(--color-brand)] hover:bg-[var(--purple-50)]",
        tertiary:
          "px-0 text-[var(--color-brand)] underline-offset-4 hover:underline",
        destructive:
          "bg-[var(--color-danger)] text-white hover:opacity-90",

        /* ── legacy aliases ── */
        default:
          "bg-[var(--color-brand)] text-white hover:bg-[var(--purple-700)]",
        outline:
          "border-[var(--ui-border-strong)] bg-transparent text-[var(--ui-text)] hover:bg-[var(--ui-surface-muted)]",
        ghost:
          "text-[var(--ui-text)] hover:bg-[var(--ui-surface-muted)] hover:text-[var(--ui-text)]",
        link: "px-0 text-[var(--color-brand)] underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-10 px-4",
        default: "h-11 px-5",
        md: "h-11 px-5",
        lg: "h-13 px-7 text-body",
        xs: "h-9 px-3",
        icon: "size-11",
        "icon-sm": "size-10",
        // 36px visual + 4px transparent bleed = 44px touch target.
        "icon-xs": "size-9 after:absolute after:-inset-1 after:content-['']",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
)

function Button({
  className,
  variant = "primary",
  size = "default",
  render,
  nativeButton,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      // A Button composed onto a link is not a native <button>; saying so is
      // what keeps Base UI from warning about lost button semantics.
      nativeButton={nativeButton ?? (render ? false : undefined)}
      render={render}
      {...props}
    />
  )
}

export { Button, buttonVariants }
