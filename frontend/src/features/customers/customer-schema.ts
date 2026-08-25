import { z } from "zod";

export const customerSchema = z
  .object({
    full_name: z.string().trim().min(2, "نوم باید لږ تر لږه دوه توري ولري").max(150),
    phone: z.string().trim().min(1, "د موبایل شمېره ولیکئ").max(30, "د موبایل شمېره ډېره اوږده ده"),
    whatsapp_number: z.string().trim().max(20, "د WhatsApp شمېره ډېره اوږده ده"),
    whatsapp_consent: z.boolean(),
    address: z.string().trim().max(1000, "پته ډېره اوږده ده"),
    notes: z.string().trim().max(2000, "نوټ ډېر اوږد دی"),
  })
  .refine((data) => !data.whatsapp_consent || Boolean(data.whatsapp_number), {
    path: ["whatsapp_number"],
    message: "له اجازې ثبتولو مخکې د WhatsApp شمېره ولیکئ",
  });

export type CustomerFormValues = z.infer<typeof customerSchema>;
