import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { ApiError } from "@/lib/api-client";

import type { DesignOrderFormValues } from "./design-order-schema";
import { DesignOrderForm } from "./DesignOrderForm";
import { useCreateDesignOrder } from "./hooks";

function dateValue(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function DesignOrderCreatePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mutation = useCreateDesignOrder();
  const [error, setError] = useState<string | null>(null);
  const defaults: DesignOrderFormValues = { customer_id: params.get("customer_id") ?? "", design_name: "", design_description: "", cut_quantity: 1, unit_price: 0, payment_status: "CREDIT", paid_amount: 0, status: "NEW", design_type: "SIMPLE", color_count: "1", gemstone_size: 6, baran_size_mm: 5, order_date: dateValue(), expected_delivery_date: dateValue(7), notes: "" };
  const submit = async (values: DesignOrderFormValues) => { setError(null); try { const order = await mutation.mutateAsync(values); navigate(`/design-orders/${order.id}`, { replace: true }); } catch (caught) { setError(caught instanceof ApiError ? caught.message : "نوی فرمایش جوړ نه شو."); } };
  return <section dir="rtl" className="mx-auto max-w-6xl text-right"><Link to="/design-orders" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft className="size-4" /> د ډیزاین فرمایشونو لست ته بیرته</Link><div className="mb-7"><p className="text-sm font-semibold text-brand-600">نوی ډیزاین فرمایش</p><h1 className="mt-1 text-3xl font-bold text-slate-950">نوی ډیزاین فرمایش جوړول</h1><p className="mt-2 text-slate-500">د مشتري، ډیزاین، فرمایش او تادیې معلومات ثبت کړئ.</p></div><DesignOrderForm defaultValues={defaults} submitLabel="د ډیزاین فرمایش ثبتول" cancelTo="/design-orders" serverError={error} onSubmit={submit} /></section>;
}
