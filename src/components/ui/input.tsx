import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-none border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-[14px] text-[var(--ink)] transition-colors outline-none placeholder:text-[var(--ink-muted)] focus-visible:border-[var(--color-brand)] focus-visible:ring-1 focus-visible:ring-[var(--color-brand)] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[var(--color-danger)] aria-invalid:ring-1 aria-invalid:ring-[var(--color-danger)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
