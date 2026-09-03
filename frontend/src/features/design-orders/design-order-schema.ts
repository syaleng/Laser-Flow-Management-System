import { z } from "zod";

export type CalculatedPaymentStatus = "CREDIT" | "PARTIAL" | "FULLY_PAID";

export function calculatePaymentStatus(
  total: number,
  paidAmount: number,
): CalculatedPaymentStatus {
  if (total > 0 && paidAmount >= total) return "FULLY_PAID";
  if (paidAmount <= 0) return "CREDIT";
  return "PARTIAL";
}

export const designOrderSchema = z
  .object({
    customer_id: z.string().uuid("مشتري وټاکئ."),
    design_name: z.string().trim().max(200),
    design_description: z.string().trim().max(3000),
    cut_quantity: z.number().int().positive("د پرېکولو شمېر باید له صفر څخه زیات وي."),
    unit_price: z.number().positive("بیه باید له صفر څخه زیاته وي."),
    material_quantity: z.number().int().positive("د ډایانو شمېر باید له صفر څخه زیات وي."),
    payment_status: z.enum(["CASH", "PARTIAL", "CREDIT", "FULLY_PAID"]),
    paid_amount: z.number().min(0, "ورکړل شوې پیسې له صفر څخه کمېدای نه شي."),
    status: z.enum(["NEW", "DESIGN_PREPARATION", "CUTTING", "READY_FOR_DELIVERY", "DELIVERED", "CANCELLED"]),
    design_type: z.enum(["JAR", "SIMPLE"]),
    color_count: z.enum(["1", "2"]),
    gemstone_size: z.number().int().positive("د غمي سایز باید له صفر څخه زیات وي."),
    baran_size_mm: z.number().positive("د باران سایز باید له صفر څخه زیات وي."),
    order_date: z.string().min(1, "د فرمایش نېټه ولیکئ."),
    expected_delivery_date: z.string().min(1, "د سپارلو نېټه ولیکئ."),
    notes: z.string().trim().max(3000),
  })
  .refine((data) => data.expected_delivery_date >= data.order_date, {
    path: ["expected_delivery_date"],
    message: "د سپارلو نېټه د فرمایش له نېټې مخکې نه شي کېدای.",
  })
  .refine((data) => data.paid_amount <= data.material_quantity * data.unit_price, {
    path: ["paid_amount"],
    message: "ورکړل شوې پیسې له ټول مقدار څخه زیاتېدای نه شي.",
  })
  .refine(
    (data) =>
      data.payment_status ===
      calculatePaymentStatus(data.material_quantity * data.unit_price, data.paid_amount),
    {
      path: ["payment_status"],
      message: "ټولې پیسې ترلاسه شوې دي، د تادیې حالت بدلول امکان نه لري.",
    },
  );

export type DesignOrderFormValues = z.infer<typeof designOrderSchema>;
