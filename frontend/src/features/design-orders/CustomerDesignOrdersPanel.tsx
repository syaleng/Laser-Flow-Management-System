import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { primaryButtonClass } from "@/components/ui/Button";

import { useDesignOrders } from "./hooks";
import { DesignOrderStatusBadge } from "./DesignOrderStatusBadge";

export function CustomerDesignOrdersPanel({ customerId, active }: { customerId: string; active: boolean }) {
  const orders = useDesignOrders({ customer_id: customerId, ordering: "-created_at", page: 1, page_size: 5 });
  return <article className="customer-orders-panel mt-6 rounded-2xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/40 p-6 shadow-md">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-slate-950">د ډیزاین فرمایشونو لست</h2><p className="mt-1 text-sm text-slate-500">د دې مشتري وروستي د لیزر کارونه.</p></div>{active && <Link to={`/design-orders/new?customer_id=${customerId}`} className={primaryButtonClass}><Plus className="size-4" /> نوی ډیزاین فرمایش</Link>}</div>
    {orders.isLoading && <p className="mt-5 text-sm text-slate-500">فرمایشونه راځي…</p>}
    {orders.data?.data.length === 0 && <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">د دې مشتري لپاره فرمایش نشته. له پورته تڼۍ څخه لومړی فرمایش جوړ کړئ.</p>}
    {orders.data && orders.data.data.length > 0 && <div className="mt-5 overflow-x-auto"><table className="w-full text-right text-sm"><thead className="border-b text-xs text-slate-400"><tr><th className="pb-3">فرمایش</th><th className="pb-3">د ډایانو شمېر</th><th className="pb-3">ټول مقدار</th><th className="pb-3">حالت</th></tr></thead><tbody className="divide-y">{orders.data.data.map((order) => <tr key={order.id}><td className="py-3"><Link className="font-semibold text-brand-700" to={`/design-orders/${order.id}`}>{order.design_name}</Link><p className="text-xs text-slate-500">{order.order_number}</p></td><td className="py-3 font-semibold">{order.material_quantity}</td><td dir="ltr" className="py-3 text-right">{Number(order.total_amount).toLocaleString()} AFN</td><td className="py-3"><DesignOrderStatusBadge status={order.status} /></td></tr>)}</tbody></table><Link to={`/design-orders?customer_id=${customerId}`} className="mt-4 inline-block text-sm font-semibold text-brand-700">ټول {orders.data.meta.count} فرمایشونه کتل</Link></div>}
  </article>;
}
