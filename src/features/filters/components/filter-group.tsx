"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";

export interface FilterOption {
  slug: string;
  label: string;
}

export interface FilterGroupProps {
  /** Group heading */
  name: string;
  /** Available filter options */
  options: FilterOption[];
  /** Currently active slugs */
  activeSlugs: string[];
  /** Called when a checkbox changes */
  onToggle: (slug: string) => void;
  className?: string;
}

export function FilterGroup({
  name,
  options,
  activeSlugs,
  onToggle,
  className,
}: FilterGroupProps) {
  return (
    <div className={className ?? ""}>
      <h4 className="text-sm font-semibold text-[var(--neutral-800)] mb-3">
        {name}
      </h4>
      <div className="space-y-2.5">
        {options.map((option) => {
          const id = `filter-${name}-${option.slug}`;
          const checked = activeSlugs.includes(option.slug);
          return (
            <motion.div
              key={option.slug}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2.5"
            >
              <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={() => onToggle(option.slug)}
              />
              <Label
                htmlFor={id}
                className="cursor-pointer text-sm text-[var(--neutral-700)] font-normal"
              >
                {option.label}
              </Label>
            </motion.div>
          );
        })}
      </div>
      <Separator className="mt-4" />
    </div>
  );
}
