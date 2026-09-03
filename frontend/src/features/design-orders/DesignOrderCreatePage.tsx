import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/Page";
import { ApiError } from "@/lib/api-client";
import type { DesignOrderFormValues } from "./design-order-schema";
import { DesignOrderForm } from "./DesignOrderForm";
import { useCreateDesignOrder } from "./hooks";

function dateValue(offsetDays = 0) { const date = new Date(); date.setDate(date.getDate() + offsetDays); return date.toISOString().slice(0, 10); }
export function DesignOrderCreatePage() {
  const navigate = useNavigate(); const [params] = useSearchParams(); const mutation = useCreateDesignOrder(); const [error, setError] = useState<string | null>(null);
  const defaults: DesignOrderFormValues = { customer_id: params.get("customer_id") ?? "", design_name: "", design_description: "", cut_quantity: 1, unit_price: 0, material_quantity: 1, payment_status: "CREDIT", paid_amount: 0, status: "NEW", design_type: "SIMPLE", color_count: "1", gemstone_size: 6, baran_size_mm: 5, order_date: dateValue(), expected_delivery_date: dateValue(7), notes: "" };
  const submit = async (values: DesignOrderFormValues) => { setError(null); try { const order = await mutation.mutateAsync(values); navigate(`/design-orders/${order.id}`, { replace: true }); } catch (caught) { setError(caught instanceof ApiError ? caught.message : "نوی فرمایش جوړ نه شو."); } };
  return <section dir="rtl" className="mx-auto max-w-6xl text-right"><PageHeader eyebrow="د فرمایشونو مدیریت" title="نوی ډیزاین فرمایش جوړول" description="مشتري، ډیزاین، شمېر، بیه، تادیه او نېټې په منظم ډول ثبت کړئ." actions={<Link to="/design-orders" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"><ArrowLeft className="size-4" /> لست ته بېرته</Link>} /><DesignOrderForm defaultValues={defaults} submitLabel="د ډیزاین فرمایش ثبتول" cancelTo="/design-orders" serverError={error} onSubmit={submit} /></section>;
}
