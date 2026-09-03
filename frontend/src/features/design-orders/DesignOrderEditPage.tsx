import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader, StatePanel } from "@/components/ui/Page";
import { ApiError } from "@/lib/api-client";
import type { DesignOrderFormValues } from "./design-order-schema";
import { DesignOrderForm } from "./DesignOrderForm";
import { useDesignOrder, useUpdateDesignOrder } from "./hooks";

export function DesignOrderEditPage() {
  const { orderId = "" } = useParams(); const navigate = useNavigate(); const order = useDesignOrder(orderId); const mutation = useUpdateDesignOrder(orderId); const [error, setError] = useState<string | null>(null);
  if (order.isLoading) return <StatePanel title="فرمایش راخیستل کېږي…" detail="لږه شېبه انتظار وکړئ." />;
  if (!order.data || order.isError) return <StatePanel title="فرمایش پیدا نه شو" detail="بیا هڅه وکړئ یا د فرمایشونو لست ته لاړ شئ." className="border-red-200 bg-red-50" />;
  const data = order.data;
  const defaults: DesignOrderFormValues = { customer_id: data.customer?.id ?? "", design_name: data.design_name ?? "", design_description: data.design_description ?? "", cut_quantity: data.cut_quantity, unit_price: Number(data.unit_price), material_quantity: data.material_quantity ?? 1, payment_status: data.payment_status ?? "CREDIT", paid_amount: Number(data.paid_amount) || 0, status: data.status, design_type: data.design_type ?? "SIMPLE", color_count: data.color_count ?? "1", gemstone_size: data.gemstone_size ?? 6, baran_size_mm: Number(data.baran_size_mm) || 5, order_date: data.order_date, expected_delivery_date: data.expected_delivery_date, notes: data.notes ?? "" };
  const submit = async (values: DesignOrderFormValues) => { setError(null); try { await mutation.mutateAsync(values); navigate(`/design-orders/${orderId}`, { replace: true }); } catch (caught) { setError(caught instanceof ApiError ? caught.message : "فرمایش بدل نه شو."); } };
  return <section dir="rtl" className="mx-auto max-w-6xl text-right"><PageHeader eyebrow={data.order_number} title="د ډیزاین فرمایش بدلول" description="فرمایش په احتیاط اصلاح کړئ؛ مالي حسابونه به هم ورسره تازه شي." actions={<Link to={`/design-orders/${orderId}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"><ArrowLeft className="size-4" /> فرمایش ته بېرته</Link>} /><DesignOrderForm defaultValues={defaults} submitLabel="بدلونونه ساتل" cancelTo={`/design-orders/${orderId}`} serverError={error} isEditing onSubmit={submit} /></section>;
}
