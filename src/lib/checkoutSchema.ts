import { z } from "zod";

// Zod 4 probes for eval (new Function) to JIT its parsers; under the site CSP
// that probe is a logged violation on every checkout. Jitless is plenty fast here.
z.config({ jitless: true });

export const checkoutSchema = z.object({
  customer_name: z.string().min(2, "error_required_field"),
  customer_phone: z.string().regex(/^0[5-7][0-9]{8}$/, "error_invalid_phone"),
  wilaya: z.string().min(1, "error_required_field"),
  city: z.string().min(1, "error_required_field"),
  delivery_type: z.enum(["home", "office"]),
  website: z.string().optional(), // honeypot, must stay empty
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;
