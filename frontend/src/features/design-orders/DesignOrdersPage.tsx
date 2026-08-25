import { ChevronLeft, ChevronRight, Plus, Search, ScanLine } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { ApiError } from "@/lib/api-client";
import { primaryButtonClass } from "@/components/ui/Button";
import { formatAfn } from "@/lib/format";

import { useDesignOrders } from "./hooks";
import { DesignOrderStatusBadge } from "./DesignOrderStatusBadge";
import type { DesignOrderListParams, DesignOrderStatus } from "./types";

const money = formatAfn;

export function DesignOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const params = useMemo<DesignOrderListParams>(() => ({
    search: searchParams.get("search") ?? "",
    status: (searchParams.get("status") as DesignOrderStatus | null) ?? "",
    category_id: searchParams.get("category_id") ?? "",
    customer_id: searchParams.get("customer_id") ?? "",
    payment_filter: (searchParams.get("payment_filter") as DesignOrderListParams["payment_filter"]) ?? "",
    ordering: searchParams.get("ordering") ?? "-created_at",
    page: Number(searchParams.get("page") ?? 1),
    page_size: 20,
  }), [searchParams]);
  const orders = useDesignOrders(params);

  const setFilter = (name: string, value: string, resetPage = true) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(name, value); else next.delete(name);
    if (resetPage) next.delete("page");
    setSearchParams(next);
  };
  const submitSearch = (event: FormEvent) => { event.preventDefault(); setFilter("search", search.trim()); };
  const changeSearch = (value: string) => {
    setSearch(value);
    if (!value.trim()) setFilter("search", "");
  };

  return (
    <section dir="rtl" className="text-right">
      <div className="mb-7 flex flex-col items-start gap-4 text-right">
        <div className="w-full text-right"><h1 className="text-3xl font-bold tracking-tight text-slate-950">د ډیزاین فرمایشونو لست</h1><p className="mt-2 text-base leading-7 text-slate-500">د مشتري له ټاکنې تر سپارلو پورې د تیار ډیزاین فرمایشونه اداره کړئ.</p></div>
        <Link to="/design-orders/new" className={`${primaryButtonClass} self-start`}><Plus className="size-4" /> نوی ډیزاین فرمایش جوړول</Link>
      </div>
      <div className="mb-5 flex flex-col items-stretch gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-end">
        <form className="lg:min-w-0 lg:flex-1" onSubmit={submitSearch}><label className="block text-sm font-semibold text-slate-700">لټون<span className="relative mt-2 block"><Search className="absolute right-3 top-3.5 size-4 text-slate-400" /><input aria-label="د فرمایش لټون" value={search} onChange={(e) => changeSearch(e.target.value)} className="w-full rounded-xl border border-slate-300 py-3 pl-4 pr-10 font-normal outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100" placeholder="د مشتری نوم، شمیره یا ډیزاین ولټوئ" /></span></label></form>
        <label className="flex flex-col text-sm font-semibold text-slate-700 lg:w-[190px]">حالت<select aria-label="د فرمایش حالت" className="mt-2 rounded-xl border border-slate-300 px-3 py-3 font-normal text-right outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100" value={params.status} onChange={(e) => setFilter("status", e.target.value)}><option value="">ټول فرمایشونه</option><option value="NEW">نوی فرمایش</option><option value="READY_FOR_DELIVERY">چمتو شوی</option><option value="CANCELLED">لغوه شوی</option></select></label>
        <label className="flex flex-col text-sm font-semibold text-slate-700 lg:w-[190px]">د تادیې حالت<select aria-label="د تادیې حالت فلټر" className={`mt-2 rounded-xl border px-3 py-3 font-normal text-right outline-none transition focus:ring-2 ${params.payment_filter === "credit" ? "border-amber-300 bg-amber-50 text-amber-800 focus:border-amber-500 focus:ring-amber-100" : "border-slate-300 bg-white focus:border-brand-500 focus:ring-brand-100"}`} value={params.payment_filter} onChange={(e) => setFilter("payment_filter", e.target.value)}><option value="">ټول حسابونه</option><option value="settled">تصفیه شوي</option><option value="credit">قرضه</option></select></label>
        <label className="flex flex-col text-sm font-semibold text-slate-700 lg:w-[190px]">ترتیب<select aria-label="د فرمایشونو ترتیب" className="mt-2 rounded-xl border border-slate-300 px-3 py-3 font-normal text-right outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100" value={params.ordering} onChange={(e) => setFilter("ordering", e.target.value)}><option value="-created_at">نوي اضافه شوي</option><option value="-order_date">وروستي فرمایشونه</option><option value="customer_name">د مشتری نوم</option><option value="status">د حالت له مخې</option></select></label>
      </div>
      {orders.isLoading && <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">فرمایشونه راځي…</div>}
      {orders.isError && <div role="alert" className="rounded-2xl bg-red-50 p-5 text-red-700">{orders.error instanceof ApiError ? orders.error.message : "فرمایشونه را نه غلل."}</div>}
      {orders.data?.data.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><ScanLine className="mx-auto size-10 text-slate-300" /><h2 className="mt-4 font-semibold">فرمایش پیدا نه شو</h2><p className="mt-1 text-sm text-slate-500">فلټر بدل کړئ یا نوی فرمایش جوړ کړئ.</p></div>}
      {orders.data && orders.data.data.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="border-b bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-4">د فرمایش شمېره</th><th className="px-5 py-4">مشتري</th><th className="px-5 py-4">شمېر</th><th className="px-5 py-4">ټول مقدار</th><th className="px-5 py-4">پاتې حساب</th><th className="px-5 py-4">د سپارلو نېټه</th><th className="px-5 py-4">حالت</th><th className="px-5 py-4">کار</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{orders.data.data.map((order) => { const outstanding = Number(order.remaining_amount) > 0 && order.status !== "CANCELLED"; return <tr key={order.id} className="hover:bg-slate-50"><td className="px-5 py-4"><p className="font-semibold text-slate-900">{order.design_name}</p><p className="text-xs text-slate-500">{order.order_number}</p></td><td className="px-5 py-4 text-slate-700">{order.customer.full_name}</td><td className="px-5 py-4">{order.cut_quantity.toLocaleString()}</td><td dir="ltr" className="px-5 py-4 text-right font-semibold">{money(order.total_amount)}</td><td dir="ltr" className={`px-5 py-4 text-right font-bold ${outstanding ? "text-amber-700" : "text-emerald-700"}`}>{outstanding ? money(order.remaining_amount) : "—"}</td><td className="px-5 py-4">{order.expected_delivery_date}</td><td className="px-5 py-4"><DesignOrderStatusBadge status={order.status} /></td><td className="px-5 py-4"><Link className="font-semibold text-brand-600" to={`/design-orders/${order.id}`}>کتل</Link></td></tr>; })}</tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t px-5 py-4"><p className="text-sm text-slate-500">ټول {orders.data.meta.count} فرمایشونه</p><div className="flex items-center gap-2"><button aria-label="مخکینۍ پاڼه" className="rounded-lg border p-2 disabled:opacity-40" disabled={!orders.data.meta.previous} onClick={() => setFilter("page", String(Math.max(1, (params.page ?? 1) - 1)), false)}><ChevronRight className="size-4" /></button><span className="text-sm">پاڼه {orders.data.meta.page} له {orders.data.meta.total_pages}</span><button aria-label="راتلونکې پاڼه" className="rounded-lg border p-2 disabled:opacity-40" disabled={!orders.data.meta.next} onClick={() => setFilter("page", String((params.page ?? 1) + 1), false)}><ChevronLeft className="size-4" /></button></div></div>
        </div>
      )}
    </section>
  );
}

export default DesignOrdersPage;
