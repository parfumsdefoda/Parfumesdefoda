import { z } from "zod";

/**
 * Checkout form validation schema.
 *
 * - Name: required, minimum 2 characters
 * - Phone: required, must be a valid Egyptian mobile number
 * - Governorate: required, from predefined list
 * - City: required, from predefined list (dependent on governorate)
 * - AddressDetails: required, minimum 5 characters (street, building, landmark)
 */
export const checkoutSchema = z.object({
  name: z
    .string()
    .min(2, "الاسم يجب أن يكون على الأقل حرفين"),
  phone: z
    .string()
    .min(10, "يرجى إدخال رقم هاتف صحيح")
    .regex(
      /^(?:\+20|0020|0)1[0-25]{1}[0-9]{8}$/,
      "يرجى إدخال رقم هاتف مصري صحيح",
    ),
  governorate: z
    .string()
    .min(1, "يرجى اختيار المحافظة"),
  city: z
    .string()
    .min(1, "يرجى اختيار المدينة"),
  addressDetails: z
    .string()
    .min(5, "العنوان بالتفصيل يجب أن يكون على الأقل 5 أحرف"),
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;
