"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { User, Phone, MapPin, Send, Building2, Map } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { checkoutSchema, type CheckoutFormData } from "@/schemas/checkout";

// ─── Governorates & cities data ────────────────────────────────────────────
// Static import — the JSON file is small (~5 KB) and bundled at build time.
import governoratesData from "../../../../data/egypt-governorates.json";

type GovernorateEntry = { name: string; cities: string[] };
type GovernoratesMap = Record<string, GovernorateEntry>;

const GOVERNORATES = governoratesData as GovernoratesMap;

const governorateOptions = Object.entries(GOVERNORATES).map(([key, val]) => ({
  value: key,
  label: val.name,
}));

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
  /** Governorate label */
  governorateLabel?: string;
  /** City label */
  cityLabel?: string;
  /** Address details label */
  addressDetailsLabel?: string;
  /** Address details placeholder */
  addressDetailsPlaceholder?: string;
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
 * CheckoutForm — guest checkout form with name, phone, structured address.
 * Uses React Hook Form + Zod for validation.
 * Pure presentational — all labels via props, no API calls.
 */
export function CheckoutForm({
  title = "بيانات التوصيل",
  nameLabel = "الاسم بالكامل",
  namePlaceholder = "أدخل اسمك الكامل",
  phoneLabel = "رقم الموبايل",
  phonePlaceholder = "01XXXXXXXXX",
  governorateLabel = "المحافظة",
  cityLabel = "المدينة",
  addressDetailsLabel = "العنوان بالتفصيل — أقرب علامة مميزة",
  addressDetailsPlaceholder = "الشارع، رقم المبنى، العلامة القريبة",
  submitLabel = "تأكيد الطلب",
  disabled = false,
  onSubmit,
  isSubmitting = false,
  className,
}: CheckoutFormProps) {
  const [selectedGovernorate, setSelectedGovernorate] = useState<string>("");

  const cityOptions = useMemo(() => {
    if (!selectedGovernorate) return [];
    const entry = GOVERNORATES[selectedGovernorate];
    return entry ? entry.cities : [];
  }, [selectedGovernorate]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: "",
      phone: "",
      governorate: "",
      city: "",
      addressDetails: "",
    },
  });

  const handleGovernorateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedGovernorate(value);
    setValue("governorate", value, { shouldValidate: true });
    // Reset city when governorate changes
    setValue("city", "", { shouldValidate: true });
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setValue("city", e.target.value, { shouldValidate: true });
  };

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

          {/* Governorate */}
          <div className="space-y-1.5">
            <Label htmlFor="checkout-governorate" className="gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-[var(--neutral-400)]" />
              {governorateLabel}
            </Label>
            <select
              id="checkout-governorate"
              value={selectedGovernorate}
              onChange={handleGovernorateChange}
              aria-invalid={!!errors.governorate}
              aria-describedby={errors.governorate ? "governorate-error" : undefined}
              className="flex h-11 w-full items-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--neutral-800)] outline-none transition-colors focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: "left 0.5rem center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "1.5em 1.5em",
                paddingRight: "2.5rem",
              }}
            >
              <option value="">اختر المحافظة</option>
              {governorateOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.governorate && (
              <p id="governorate-error" className="text-xs text-[var(--color-error)]" role="alert">
                {errors.governorate.message}
              </p>
            )}
          </div>

          {/* City */}
          <div className="space-y-1.5">
            <Label htmlFor="checkout-city" className="gap-1.5">
              <Map className="h-3.5 w-3.5 text-[var(--neutral-400)]" />
              {cityLabel}
            </Label>
            <select
              id="checkout-city"
              onChange={handleCityChange}
              disabled={!selectedGovernorate}
              aria-invalid={!!errors.city}
              aria-describedby={errors.city ? "city-error" : undefined}
              className="flex h-11 w-full items-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--neutral-800)] outline-none transition-colors focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: "left 0.5rem center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "1.5em 1.5em",
                paddingRight: "2.5rem",
              }}
            >
              <option value="">
                {selectedGovernorate ? "اختر المدينة" : "اختر المحافظة أولاً"}
              </option>
              {cityOptions.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
            {errors.city && (
              <p id="city-error" className="text-xs text-[var(--color-error)]" role="alert">
                {errors.city.message}
              </p>
            )}
          </div>

          {/* Address Details */}
          <div className="space-y-1.5">
            <Label htmlFor="checkout-address-details" className="gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[var(--neutral-400)]" />
              {addressDetailsLabel}
            </Label>
            <Input
              id="checkout-address-details"
              {...register("addressDetails")}
              placeholder={addressDetailsPlaceholder}
              aria-invalid={!!errors.addressDetails}
              className="h-11"
            />
            {errors.addressDetails && (
              <p className="text-xs text-[var(--color-error)]" role="alert">
                {errors.addressDetails.message}
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
