import { ChevronLeft, ChevronRight, CircleDollarSign, RefreshCw, Search } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { ApiError } from "@/lib/api-client";
import { formatAfn, formatDate } from "@/lib/format";

import { usePayments } from "./hooks";

const paymentDate = formatDate;

export function PaymentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const activeSearch = searchParams.get("search") ?? "";
  const page = Number(searchParams.get("page") ?? 1);
  const payments = usePayments(activeSearch, page);
  const totalCollected = useMemo(
    () => payments.data?.data.reduce((total, payment) => total + Number(payment.amount), 0) ?? 0,
    [payments.data],
  );

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (search.trim()) next.set("search", search.trim()); else next.delete("search");
    next.delete("page");
    setSearchParams(next);
  };

  const changePage = (nextPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(nextPage));
    setSearchParams(next);
  };

  return (
    <section dir="rtl" className="payments-page text-right">
      <div className="page-header block">
        <p className="text-sm font-semibold text-brand-600">مالي مديريت</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">تادیات</h1>
        <p className="mt-2 text-base leading-7 text-slate-500">د ډیزاین فرمایشونو ټول ترلاسه شوي تادیات وګورئ.</p>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600"><CircleDollarSign className="size-5" /></div>
          <p className="text-sm font-medium text-slate-500">ثبت شوي تادیات</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{payments.data?.meta.count ?? "—"}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><CircleDollarSign className="size-5" /></div>
          <p className="text-sm font-medium text-slate-500">د اوسنۍ پاڼې مجموعه</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{payments.data ? formatAfn(totalCollected) : "—"}</p>
        </article>
      </div>

      <form onSubmit={submitSearch} className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block text-sm font-semibold text-slate-700">په تادیاتو کې لټون
          <span className="relative mt-2 block max-w-xl"><Search className="absolute left-3 top-3.5 size-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 font-normal outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100" placeholder="مشتري، د فرمایش شمېره یا ډیزاین" /></span>
        </label>
      </form>

      {payments.isLoading && <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">تادیات بارېږي...</div>}
      {payments.isError && <div role="alert" className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-red-50 p-5 text-red-700"><span>{payments.error instanceof ApiError ? payments.error.message : "تادیات بار نه شول."}</span><button type="button" onClick={() => void payments.refetch()} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"><RefreshCw className="size-4" />بیا هڅه وکړئ</button></div>}
      {payments.data?.data.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">هیڅ تادیه ونه موندل شوه.</div>}
      {payments.data && payments.data.data.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto"><table className="w-full text-right text-sm"><thead className="border-b bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-4">نېټه</th><th className="px-5 py-4">مشتري</th><th className="px-5 py-4">فرمایش</th><th className="px-5 py-4">ډیزاین</th><th className="px-5 py-4">مقدار</th><th className="px-5 py-4">ثبتوونکی</th></tr></thead><tbody className="divide-y divide-slate-100">{payments.data.data.map((payment) => <tr key={payment.id} className="hover:bg-slate-50"><td className="whitespace-nowrap px-5 py-4 text-slate-500">{paymentDate(payment.payment_date)}</td><td className="px-5 py-4 font-semibold text-slate-900">{payment.customer_name}</td><td className="px-5 py-4 text-slate-600">{payment.order_number}</td><td className="px-5 py-4 text-slate-600">{payment.design_name || "بې نومه ډیزاین"}</td><td className="whitespace-nowrap px-5 py-4 font-bold text-emerald-700">{formatAfn(payment.amount)}</td><td className="px-5 py-4 text-slate-600">{payment.recorded_by_name}</td></tr>)}</tbody></table></div>
          <div className="flex items-center justify-between border-t px-5 py-4"><p className="text-sm text-slate-500">پاڼه {payments.data.meta.page} له {payments.data.meta.total_pages}</p><div className="flex gap-2"><button type="button" aria-label="مخکنۍ پاڼه" className="rounded-lg border p-2 disabled:opacity-40" disabled={!payments.data.meta.previous} onClick={() => changePage(Math.max(1, page - 1))}><ChevronRight className="size-4" /></button><button type="button" aria-label="راتلونکې پاڼه" className="rounded-lg border p-2 disabled:opacity-40" disabled={!payments.data.meta.next} onClick={() => changePage(page + 1)}><ChevronLeft className="size-4" /></button></div></div>
        </div>
      )}
    </section>
  );
}
