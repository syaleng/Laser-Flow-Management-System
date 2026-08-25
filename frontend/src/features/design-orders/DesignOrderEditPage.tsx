import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ApiError } from "@/lib/api-client";

import type { DesignOrderFormValues } from "./design-order-schema";
import { DesignOrderForm } from "./DesignOrderForm";
import { useDesignOrder, useUpdateDesignOrder } from "./hooks";

export function DesignOrderEditPage() {
  const { orderId = "" } = useParams();
  const navigate = useNavigate();
  const order = useDesignOrder(orderId);
  const mutation = useUpdateDesignOrder(orderId);
  const [error, setError] = useState<string | null>(null);
  if (order.isLoading) return <div className="text-slate-500">فرمایش راځي…</div>;
  if (!order.data || order.isError) return <div role="alert" className="rounded-xl bg-red-50 p-5 text-red-700">فرمایش را نه غی.</div>;
  const data = order.data;
  const defaults: DesignOrderFormValues = { customer_id: data.customer?.id ?? "", design_name: data.design_name ?? "", design_description: data.design_description ?? "", cut_quantity: data.cut_quantity, unit_price: Number(data.unit_price), payment_status: data.payment_status ?? "CREDIT", paid_amount: Number(data.paid_amount) || 0, status: data.status, design_type: data.design_type ?? "SIMPLE", color_count: data.color_count ?? "1", gemstone_size: data.gemstone_size ?? 6, baran_size_mm: Number(data.baran_size_mm) || 5, order_date: data.order_date, expected_delivery_date: data.expected_delivery_date, notes: data.notes ?? "" };
  const submit = async (values: DesignOrderFormValues) => { setError(null); try { await mutation.mutateAsync(values); navigate(`/design-orders/${orderId}`, { replace: true }); } catch (caught) { setError(caught instanceof ApiError ? caught.message : "فرمایش بدل نه شو."); } };
  return <section dir="rtl" className="mx-auto max-w-6xl text-right"><Link to={`/design-orders/${orderId}`} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft className="size-4" /> فرمایش ته بیرته</Link><div className="mb-7"><p className="text-sm font-semibold text-brand-600">{data.order_number}</p><h1 className="mt-1 text-3xl font-bold text-slate-950">د ډیزاین فرمایش بدلول</h1></div><DesignOrderForm defaultValues={defaults} submitLabel="بدلونونه ساتل" cancelTo={`/design-orders/${orderId}`} serverError={error} isEditing onSubmit={submit} /></section>;
}
