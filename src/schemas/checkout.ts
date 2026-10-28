import { z } from "zod";

const ARABIC_DIGIT_MAP: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};

/** Convert accepted Egyptian mobile formats to the canonical local 01xxxxxxxxx form. */
export function normalizeEgyptianPhone(value: string): string {
  let normalized = value.replace(/[٠-٩۰-۹]/g, (digit) => ARABIC_DIGIT_MAP[digit] ?? digit)
    .trim()
    .replace(/[\s()-]/g, "");

  if (normalized.startsWith("+20")) normalized = `0${normalized.slice(3)}`;
  else if (normalized.startsWith("0020")) normalized = `0${normalized.slice(4)}`;

  return normalized;
}

const egyptianPhoneSchema = (label: string) => z
  .string()
  .transform(normalizeEgyptianPhone)
  .pipe(z.string().regex(/^01[0-25]\d{8}$/, `يرجى إدخال رقم ${label} مصري صحيح (01xxxxxxxxx)`));

/**
 * Shared client/server checkout contract. Phone values normalize to the local
 * canonical format before they are returned by validation or persisted.
 */
export const checkoutSchema = z.object({
  name: z.string().trim().min(2, "الاسم يجب أن يكون على الأقل حرفين"),
  phone: egyptianPhoneSchema("هاتف"),
  whatsapp: egyptianPhoneSchema("واتساب"),
  governorate: z.string().min(1, "يرجى اختيار المحافظة"),
  city: z.string().min(1, "يرجى اختيار المدينة"),
  addressDetails: z.string().trim().min(5, "العنوان بالتفصيل يجب أن يكون على الأقل 5 أحرف"),
  notes: z.string().trim().max(1000, "الملاحظات لا يمكن أن تتجاوز 1000 حرف").default(""),
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;
