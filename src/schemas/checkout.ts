import { z } from "zod";

/**
 * Checkout form validation schema.
 *
 * - Name: required, minimum 2 characters
 * - Phone: required, must be a valid Egyptian phone number
 * - Address: required, minimum 5 characters
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
  address: z
    .string()
    .min(5, "العنوان يجب أن يكون على الأقل 5 أحرف"),
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;
