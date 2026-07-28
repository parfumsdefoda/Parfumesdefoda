"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { User, Phone, MapPin, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { checkoutSchema, type CheckoutFormData } from "@/schemas/checkout";

/* ---------- Re-export for backward compatibility ---------- */
export type { CheckoutFormData };

/* ---------- Component ---------- */

export interface CheckoutFormProps {
  /** Form heading */
  title?: string;
  /** Name label */
  nameLabel?: string;
  /** Name placeholder */
  namePlaceholder?: string;
  /** Phone label */
  phoneLabel?: string;
  /** Phone placeholder */
  phonePlaceholder?: string;
  /** Address label */
  addressLabel?: string;
  /** Address placeholder */
  addressPlaceholder?: string;
  /** Submit button label */
  submitLabel?: string;
  /** Whether checkout is disabled */
  disabled?: boolean;
  /** Called on valid submit */
  onSubmit?: (data: CheckoutFormData) => void;
  /** Whether form is submitting */
  isSubmitting?: boolean;
  className?: string;
}

/**
 * CheckoutForm — guest checkout form with name, phone, address.
 * Uses React Hook Form + Zod for validation.
 * Pure presentational — all labels via props, no API calls.
 */
export function CheckoutForm({
  title = "بيانات التوصيل",
  nameLabel = "الاسم بالكامل",
  namePlaceholder = "أدخل اسمك الكامل",
  phoneLabel = "رقم الهاتف",
  phonePlaceholder = "01XXXXXXXXX",
  addressLabel = "العنوان",
  addressPlaceholder = "الشارع، المنطقة، رقم المبنى",
  submitLabel = "تأكيد الطلب",
  disabled = false,
  onSubmit,
  isSubmitting = false,
  className,
}: CheckoutFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={className ?? ""}
    >
      <h3 className="text-lg font-bold text-[var(--neutral-800)] mb-4">
        {title}
      </h3>

      <form onSubmit={handleSubmit((data) => onSubmit?.(data))} noValidate>
        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="checkout-name" className="gap-1.5">
              <User className="h-3.5 w-3.5 text-[var(--neutral-400)]" />
              {nameLabel}
            </Label>
            <Input
              id="checkout-name"
              {...register("name")}
              placeholder={namePlaceholder}
              aria-invalid={!!errors.name}
              className="h-11"
            />
            {errors.name && (
              <p className="text-xs text-[var(--color-error)]" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="checkout-phone" className="gap-1.5">
              <Phone className="h-3.5 w-3.5 text-[var(--neutral-400)]" />
              {phoneLabel}
            </Label>
            <Input
              id="checkout-phone"
              {...register("phone")}
              placeholder={phonePlaceholder}
              dir="ltr"
              type="tel"
              aria-invalid={!!errors.phone}
              className="h-11"
            />
            {errors.phone && (
              <p className="text-xs text-[var(--color-error)]" role="alert">
                {errors.phone.message}
              </p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label htmlFor="checkout-address" className="gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[var(--neutral-400)]" />
              {addressLabel}
            </Label>
            <Input
              id="checkout-address"
              {...register("address")}
              placeholder={addressPlaceholder}
              aria-invalid={!!errors.address}
              className="h-11"
            />
            {errors.address && (
              <p className="text-xs text-[var(--color-error)]" role="alert">
                {errors.address.message}
              </p>
            )}
          </div>

          <Separator className="my-4" />

          <Button
            type="submit"
            className="w-full h-12 rounded-full text-sm font-semibold"
            size="lg"
            disabled={isSubmitting || disabled}
          >
            <Send className="h-4 w-4 ms-1.5" />
            {submitLabel}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
