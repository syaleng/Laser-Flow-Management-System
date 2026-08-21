import { z } from "zod";

export const customerSchema = z
  .object({
    full_name: z.string().trim().min(2, "Full name must contain at least 2 characters").max(150),
    phone: z.string().trim().max(30, "Phone number is too long"),
    whatsapp_number: z.string().trim().max(20, "WhatsApp number is too long"),
    whatsapp_consent: z.boolean(),
    address: z.string().trim().max(1000, "Address is too long"),
    notes: z.string().trim().max(2000, "Notes are too long"),
  })
  .refine((data) => !data.whatsapp_consent || Boolean(data.whatsapp_number), {
    path: ["whatsapp_number"],
    message: "Enter a WhatsApp number before recording consent",
  });

export type CustomerFormValues = z.infer<typeof customerSchema>;

