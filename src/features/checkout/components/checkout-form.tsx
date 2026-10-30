"use client";

import { useState, useMemo, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Phone, MessageCircle, MapPin, Send, Building2, Map, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { formatPrice } from "@/lib/currency";
import { normalizeEgyptianPhone } from "@/schemas/checkout";
import { checkoutSchema, type CheckoutFormData } from "@/schemas/checkout";

// ─── Governorates & cities data ────────────────────────────────────────────
// The list is owner data (`data/egypt-governorates.json`). It is loaded by the
// checkout Server Component and passed in, so the JSON lives in the page's
// markup instead of the client JavaScript.
export type GovernorateEntry = { name: string; cities: string[] };
export type GovernoratesMap = Record<string, GovernorateEntry>;

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
  /** WhatsApp label */
  whatsappLabel?: string;
  /** WhatsApp placeholder */
  whatsappPlaceholder?: string;
  /** Governorate label */
  governorateLabel?: string;
  /** City label */
  cityLabel?: string;
  /** Address details label */
  addressDetailsLabel?: string;
  /** Address details placeholder */
  addressDetailsPlaceholder?: string;
  /** Submit button label — accepts a node so a price can stay unbreakable */
  submitLabel?: ReactNode;
  /** Whether checkout is disabled */
  disabled?: boolean;
  /** Called on valid submit */
  onSubmit?: (data: CheckoutFormData) => void;
  /** Whether form is submitting */
  isSubmitting?: boolean;
  /** Optional total displayed by the mobile sticky submit control. */
  total?: number;
  /** Governorate → cities map from `data/egypt-governorates.json`. */
  governorates: GovernoratesMap;
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
  whatsappLabel = "رقم واتساب للتواصل",
  whatsappPlaceholder = "01XXXXXXXXX",
  governorateLabel = "المحافظة",
  cityLabel = "المدينة",
  addressDetailsLabel = "العنوان بالتفصيل — أقرب معلم",
  addressDetailsPlaceholder = "الشارع، رقم المبنى، العلامة القريبة",
  submitLabel = "تأكيد الطلب",
  disabled = false,
  onSubmit,
  isSubmitting = false,
  total,
  governorates,
  className,
}: CheckoutFormProps) {
  const [selectedGovernorate, setSelectedGovernorate] = useState<string>("");
  const [sameWhatsapp, setSameWhatsapp] = useState(false);
  const [governorateQuery, setGovernorateQuery] = useState("");
  const governorateOptions = useMemo(
    () =>
      Object.entries(governorates).map(([value, entry]) => ({
        value,
        label: entry.name,
      })),
    [governorates],
  );
  const cityOptions = useMemo(() => {
    if (!selectedGovernorate) return [];
    const entry = governorates[selectedGovernorate];
    return entry ? entry.cities : [];
  }, [selectedGovernorate, governorates]);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    getValues,
    setFocus,
    formState: { errors },
  } = useForm({
    // The error summary owns focus after a failed submit; RHF's own
    // focus-first-error would steal it (the spec wants the summary focused).
    shouldFocusError: false,
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: "",
      phone: "",
      whatsapp: "",
      governorate: "",
      city: "",
      addressDetails: "",
      notes: "",
    },
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const formPhone = useWatch({ control, name: "phone" });
  const formWhatsapp = useWatch({ control, name: "whatsapp" });
  const formCity = useWatch({ control, name: "city" });
  const normalizedPhone = formPhone ? normalizeEgyptianPhone(formPhone) : "";
  const visibleGovernorates = governorateOptions.filter((option) =>
    option.label.includes(governorateQuery.trim()),
  );
  const errorEntries = Object.entries(errors) as [keyof CheckoutFormData, { message?: string }][];
  const fieldIds: Partial<Record<keyof CheckoutFormData, string>> = {
    name: "checkout-name", phone: "checkout-phone", whatsapp: "checkout-whatsapp",
    governorate: "checkout-governorate", city: "checkout-city",
    addressDetails: "checkout-address-details", notes: "checkout-notes",
  };

  const handleGovernorateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedGovernorate(value);
    setValue("governorate", value, { shouldValidate: true, shouldTouch: true });
    // Reset city when governorate changes
    setValue("city", "", { shouldValidate: true, shouldTouch: true });
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setValue("city", e.target.value, { shouldValidate: true, shouldTouch: true });
  };

  const handlePhoneBlur = (field: "phone" | "whatsapp") => {
    const current = getValues(field);
    if (!current) return;
    const normalized = normalizeEgyptianPhone(current);
    setValue(field, normalized, { shouldValidate: true, shouldTouch: true });
    if (field === "phone" && sameWhatsapp) {
      setValue("whatsapp", normalized, { shouldValidate: true, shouldTouch: true });
    }
  };

  const onInvalidSubmit = () => {
    // The summary only exists after React commits the errors, so keep looking
    // for a few frames instead of focusing once and losing the race.
    const focusSummary = (attempt: number) => {
      const summary = document.getElementById("checkout-error-summary");
      if (summary) {
        summary.focus();
        return;
      }
      if (attempt < 30) requestAnimationFrame(() => focusSummary(attempt + 1));
    };
    requestAnimationFrame(() => focusSummary(0));
  };

  return (
    <div className={`reveal ${className ?? ""}`}>
      <h3 className="text-headline font-bold text-[var(--neutral-800)] mb-4">
        {title}
      </h3>

      <form id="checkout-form" onSubmit={handleSubmit((data) => onSubmit?.(data), onInvalidSubmit)} noValidate>
        {errorEntries.length > 0 && (
          <div id="checkout-error-summary" tabIndex={-1} role="alert" aria-labelledby="checkout-error-title" className="mb-4 rounded-control border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]">
            <h4 id="checkout-error-title" className="font-bold">يرجى مراجعة البيانات التالية</h4>
            <ul className="mt-2 list-inside list-disc space-y-1">
              {errorEntries.map(([field, error]) => (
                <li key={field}>
                  <a href={`#${fieldIds[field]}`} onClick={(event) => { event.preventDefault(); setFocus(field); }} className="underline underline-offset-2">
                    {error.message}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="space-y-4 pb-24 lg:pb-0">
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
              autoComplete="name"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "checkout-name-error" : undefined}
              className="h-11"
            />
            <p id="checkout-name-error" className="min-h-5 text-caption text-[var(--color-error)]" role={errors.name ? "alert" : undefined}>
                {errors.name?.message ?? " "}
              </p>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="checkout-phone" className="gap-1.5">
              <Phone className="h-3.5 w-3.5 text-[var(--neutral-400)]" />
              {phoneLabel}
            </Label>
            <Input
              id="checkout-phone"
              {...register("phone", {
                onBlur: () => handlePhoneBlur("phone"),
                onChange: (event) => {
                  if (sameWhatsapp) {
                    setValue("whatsapp", normalizeEgyptianPhone(event.target.value), { shouldValidate: true });
                  }
                },
              })}
              placeholder={phonePlaceholder}
              dir="ltr"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? "checkout-phone-error" : undefined}
              className="h-11"
            />
            <p id="checkout-phone-error" className="min-h-5 text-caption text-[var(--color-error)]" role={errors.phone ? "alert" : undefined}>
              {errors.phone?.message ?? (normalizedPhone && /^01[0-25]\d{8}$/.test(normalizedPhone) ? `سيُحفظ بصيغة ${normalizedPhone}` : " ")}
            </p>
          </div>

          {/* WhatsApp */}
          <div className="space-y-1.5">
            <Label htmlFor="checkout-whatsapp" className="gap-1.5">
              <MessageCircle className="h-3.5 w-3.5 text-[var(--neutral-400)]" />
              {whatsappLabel}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="checkout-whatsapp"
                {...register("whatsapp", { onBlur: () => handlePhoneBlur("whatsapp") })}
                placeholder={whatsappPlaceholder}
                dir="ltr"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                aria-invalid={!!errors.whatsapp}
                aria-describedby={errors.whatsapp ? "checkout-whatsapp-error" : undefined}
                readOnly={sameWhatsapp}
                className="h-11"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="checkout-same-whatsapp"
                checked={sameWhatsapp}
                onCheckedChange={(checked) => {
                  const enabled = checked === true;
                  setSameWhatsapp(enabled);
                  if (enabled) setValue("whatsapp", normalizedPhone, { shouldValidate: true, shouldTouch: true });
                }}
              />
              <Label htmlFor="checkout-same-whatsapp">نفس رقم الهاتف</Label>
            </div>
            <p id="checkout-whatsapp-error" className="min-h-5 text-caption text-[var(--color-error)]" role={errors.whatsapp ? "alert" : undefined}>
              {errors.whatsapp?.message ?? (formWhatsapp && /^01[0-25]\d{8}$/.test(normalizeEgyptianPhone(formWhatsapp)) ? `سيُحفظ بصيغة ${normalizeEgyptianPhone(formWhatsapp)}` : " ")}
            </p>
          </div>

          {/* Governorate */}
          <div className="space-y-1.5">
            <Label htmlFor="checkout-governorate" className="gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-[var(--neutral-400)]" />
              {governorateLabel}
            </Label>
            <div className="mb-2 flex h-11 items-center gap-2 rounded-control border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3">
              <Search aria-hidden="true" className="size-4 text-[var(--color-text-muted)]" />
              <input type="search" value={governorateQuery} onChange={(event) => setGovernorateQuery(event.target.value)} placeholder="ابحث عن المحافظة" aria-label="ابحث عن المحافظة" className="h-full min-w-0 flex-1 bg-transparent text-caption outline-none" />
            </div>
            <select
              id="checkout-governorate"
              value={selectedGovernorate}
              onChange={handleGovernorateChange}
              autoComplete="address-level1"
              aria-invalid={!!errors.governorate}
              aria-describedby={errors.governorate ? "governorate-error" : undefined}
              className="flex h-11 w-full items-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-caption text-[var(--neutral-800)] outline-none transition-colors focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: "left 0.5rem center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "1.5em 1.5em",
                paddingRight: "2.5rem",
              }}
            >
              <option value="">اختر المحافظة</option>
              {visibleGovernorates.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p id="governorate-error" className="min-h-5 text-caption text-[var(--color-error)]" role={errors.governorate ? "alert" : undefined}>
              {errors.governorate?.message ?? " "}
            </p>
          </div>

          {/* City */}
          <div className="space-y-1.5">
            <Label htmlFor="checkout-city" className="gap-1.5">
              <Map className="h-3.5 w-3.5 text-[var(--neutral-400)]" />
              {cityLabel}
            </Label>
            <select
              id="checkout-city"
              value={formCity}
              onChange={handleCityChange}
              disabled={!selectedGovernorate}
              autoComplete="address-level2"
              aria-invalid={!!errors.city}
              aria-describedby={errors.city ? "city-error" : undefined}
              className="flex h-11 w-full items-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-caption text-[var(--neutral-800)] outline-none transition-colors focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
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
            <p id="city-error" className="min-h-5 text-caption text-[var(--color-error)]" role={errors.city ? "alert" : undefined}>
              {errors.city?.message ?? " "}
            </p>
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
              autoComplete="street-address"
              aria-invalid={!!errors.addressDetails}
              aria-describedby={errors.addressDetails ? "checkout-address-error" : undefined}
              className="h-11"
            />
            <p id="checkout-address-error" className="min-h-5 text-caption text-[var(--color-error)]" role={errors.addressDetails ? "alert" : undefined}>
              {errors.addressDetails?.message ?? " "}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="checkout-notes">ملاحظات (اختياري)</Label>
            <textarea id="checkout-notes" {...register("notes")} rows={3} aria-invalid={!!errors.notes} aria-describedby={errors.notes ? "checkout-notes-error" : undefined} className="w-full rounded-control border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-caption focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]" placeholder="أي ملاحظات إضافية" />
            <p id="checkout-notes-error" className="min-h-5 text-caption text-[var(--color-error)]" role={errors.notes ? "alert" : undefined}>{errors.notes?.message ?? " "}</p>
          </div>

          <Separator className="my-4" />

          <div className="rounded-control border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
            <p className="font-bold">الدفع عند الاستلام</p>
            <p className="mt-1 text-caption text-[var(--color-text-muted)]">تدفع عند وصول الطلب.</p>
          </div>

          <Button
            type="submit"
            className="w-full h-12 rounded-full text-caption font-bold"
            size="lg"
            disabled={isSubmitting || disabled}
          >
            <Send className="h-4 w-4 ms-1.5" />
            {submitLabel}
          </Button>
        </div>
        {total !== undefined && (
          <div className="sticky bottom-0 z-30 -mx-4 border-t border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-soft lg:hidden">
            <div className="mx-auto flex max-w-[1280px] items-center gap-3">
              <span className="flex-1 text-caption font-bold">الإجمالي: {formatPrice(total)}</span>
              <Button type="submit" size="lg" disabled={isSubmitting || disabled}>{submitLabel}</Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
