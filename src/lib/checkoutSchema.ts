import { z } from "zod";

export const checkoutSchema = z.object({
  customer_name: z.string().min(2, "error_required_field"),
  customer_phone: z
    .string()
    .regex(/^0[5-7][0-9]{8}$/, "error_invalid_phone"),
  wilaya: z.string().min(1, "error_required_field"),
  city: z.string().min(1, "error_required_field"),
  address: z.string().min(4, "error_required_field"),
  notes: z.string().optional(),
  delivery_type: z.enum(["home", "office"]),
  website: z.string().optional(), // honeypot, must stay empty
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;
