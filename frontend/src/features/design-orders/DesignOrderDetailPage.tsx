import { ArrowLeft, Banknote, CheckCircle2, Clock3, CreditCard, Download, Edit3, LoaderCircle, Trash2, User, UserPen } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Button, primaryButtonClass } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/auth-context";
import { ApiError } from "@/lib/api-client";
import { formatAfn, formatDate, formatDateTime } from "@/lib/format";

import { designCategoryLabel } from "./display";
import { DesignOrderStatusBadge } from "./DesignOrderStatusBadge";
import { useChangeDesignOrderStatus, useDesignOrder, useRecordDesignOrderPayment, useVoidDesignOrderPayment } from "./hooks";
import { nextStatuses, statusLabels } from "./status";
import type { DesignOrderStatus } from "./types";

const paymentStatusLabels: Record<string, string> = { CASH: "نغدي", PARTIAL: "نیمه ورکړه", CREDIT: "قرضه", FULLY_PAID: "بشپړه ورکړه", UNPAID: "قرضه" };
const paymentStatusStyles: Record<string, string> = {
  CASH: "border-emerald-200 bg-emerald-50 text-emerald-700",
  FULLY_PAID: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PARTIAL: "border-amber-200 bg-amber-50 text-amber-700",
  CREDIT: "border-red-200 bg-red-50 text-red-700",
  UNPAID: "border-red-200 bg-red-50 text-red-700",
};
function PaymentStatusBadge({ status }: { status: string }) {
  const Icon = status === "FULLY_PAID" || status === "CASH"
    ? CheckCircle2
    : status === "PARTIAL"
      ? Clock3
      : CreditCard;
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm ${paymentStatusStyles[status] ?? paymentStatusStyles.UNPAID}`}><Icon className="size-4 shrink-0" aria-hidden="true" /><span>{paymentStatusLabels[status] ?? paymentStatusLabels.UNPAID}</span></span>;
}
const money = formatAfn;
const historyNote = (note: string) => {
  if (note === "Order created") return "فرمایش جوړ شو";
  if (note === "Work started") return "کار شروع شو";
  return note;
};
const detailItemClass = "order-detail-item rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-slate-50 p-4 shadow-[0_2px_8px_rgba(15,23,42,0.035)] transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_8px_20px_rgba(37,99,235,0.08)]";

export function DesignOrderDetailPage() {
  const { orderId = "" } = useParams();
  const order = useDesignOrder(orderId);
  const transition = useChangeDesignOrderStatus(orderId);
  const recordPayment = useRecordDesignOrderPayment(orderId);
  const voidPayment = useVoidDesignOrderPayment(orderId);
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);

  if (order.isLoading) return <div className="text-slate-500">فرمایش راځي…</div>;
  if (!order.data || order.isError) return <div role="alert" className="rounded-xl bg-red-50 p-5 text-red-700">{order.error instanceof ApiError ? order.error.message : "فرمایش پیدا نه شو."}</div>;

  const data = order.data;
  const canCorrectPayments = user?.role === "OWNER" || user?.role === "MANAGER";
  const remaining = Number(data.remaining_amount ?? data.total_amount);
  const isSettled = remaining === 0;
  const changeStatus = async (status: DesignOrderStatus) => {
    if (status === "CANCELLED" && !window.confirm("دا فرمایش لغوه شي؟ بېرته نه شي راګرځېدای.")) return;
    setError(null);
    try { await transition.mutateAsync({ status }); } catch (caught) { setError(caught instanceof ApiError ? caught.message : "د فرمایش حالت بدل نه شو."); }
  };
  const submitPayment = async (event: FormEvent) => {
    event.preventDefault();
    setPaymentError(null);
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError("د تادیې اندازه باید له صفر څخه زیاته وي.");
      return;
    }
    if (amount > remaining) {
      setPaymentError("نوې تادیه له پاتې پیسو څخه زیاته ده.");
      return;
    }
    try {
      await recordPayment.mutateAsync({ amount, note: paymentNote.trim(), payment_date: paymentDate });
      setPaymentAmount("");
      setPaymentNote("");
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setPaymentFormOpen(false);
    } catch (caught) {
      setPaymentError(caught instanceof ApiError ? caught.message : "تادیه ثبت نه شوه.");
    }
  };

  const removePayment = async (paymentId: string) => {
    const reason = window.prompt("د تادیې د لغوه کولو دلیل ولیکئ:");
    if (!reason?.trim() || reason.trim().length < 3) return;
    if (!window.confirm("دا تادیه لغوه شي؟ پاتې حساب او راپورونه به په اتومات ډول سم شي.")) return;
    setError(null);
    try {
      await voidPayment.mutateAsync({ paymentId, reason: reason.trim() });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "تادیه لغوه نه شوه.");
    }
  };

  return <section dir="rtl" className="design-order-detail text-right">
    <Link to="/design-orders" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft className="size-4" /> فرمایشونو ته بېرته</Link>
    <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold text-slate-950">{data.design_name}</h1><DesignOrderStatusBadge status={data.status} /></div><p className="mt-2 text-sm text-slate-500">{data.order_number}{data.design_category ? ` · ${designCategoryLabel(data.design_category.name)}` : ""}</p></div>
      <div className="flex flex-wrap gap-3">
        {data.status !== "DELIVERED" && data.status !== "CANCELLED" && <Link to={`/design-orders/${data.id}/edit`} className={primaryButtonClass}><Edit3 className="size-4" /> بدلون</Link>}
        {nextStatuses[data.status].map((status) => {
          const isComplete = status === "READY_FOR_DELIVERY" || status === "DELIVERED";
          const label = status === "CANCELLED" ? "لغوه کول" : status === "READY_FOR_DELIVERY" ? "بشپړول" : status === "DELIVERED" ? "مشتري ته سپارل" : `${statusLabels[status]} ته وړل`;
          return <Button key={status} disabled={transition.isPending} className={status === "CANCELLED" ? "bg-red-600 hover:bg-red-700 active:bg-red-800 focus:ring-red-500" : isComplete ? "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 focus:ring-emerald-500" : undefined} onClick={() => void changeStatus(status)}>{label}</Button>;
        })}
      </div>
    </div>
    {error && <div role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</div>}

    <div className="grid gap-6 xl:grid-cols-[1fr_0.55fr]">
      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">د فرمایش معلومات</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className={detailItemClass}><dt className="text-xs font-semibold text-slate-500">د فرمایش شمېره</dt><dd dir="ltr" className="mt-2 text-right font-bold text-slate-950">{data.order_number}</dd></div>
          <div className={detailItemClass}><dt className="text-xs font-semibold text-slate-500">د پرېکولو شمېر</dt><dd className="mt-2 text-lg font-bold text-slate-950">{data.cut_quantity.toLocaleString()}</dd></div>
          <div className={detailItemClass}><dt className="text-xs font-semibold text-slate-500">بیه</dt><dd dir="ltr" className="mt-2 text-right font-semibold">{money(data.unit_price)}</dd></div>
          <div className={detailItemClass}><dt className="text-xs font-semibold text-slate-500">د ډایانو شمېر</dt><dd className="mt-2 text-lg font-bold text-slate-950">{data.material_quantity.toLocaleString()}</dd></div>
          <div className="rounded-xl bg-slate-950 p-4 text-white shadow-sm"><dt className="text-xs font-semibold text-slate-400">ټول مقدار</dt><dd dir="ltr" className="mt-2 text-right text-xl font-bold tracking-tight text-white">{money(data.total_amount)}</dd></div>
          <div className={detailItemClass}><dt className="text-xs font-semibold text-slate-500">ورکړل شوې پیسې</dt><dd dir="ltr" className="mt-2 text-right font-bold text-slate-900">{money(data.paid_amount ?? "0")}</dd></div>
          <div className={`rounded-xl border p-4 ${isSettled ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}><div className="flex items-center justify-between gap-2"><dt className={`text-xs font-semibold ${isSettled ? "text-emerald-700" : "text-amber-700"}`}>پاتې پیسې</dt><span className={`rounded-full px-2 py-1 text-xs font-semibold ${isSettled ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{isSettled ? "حساب تصفیه شوی" : "لاپاتي دي"}</span></div><dd dir="ltr" className={`mt-2 text-right text-xl font-bold ${isSettled ? "text-emerald-900" : "text-amber-900"}`}>{money(data.remaining_amount ?? data.total_amount)}</dd></div>
          <div className={detailItemClass}><dt className="text-xs font-semibold text-slate-500">د تادیې حالت</dt><dd className="mt-2"><PaymentStatusBadge status={data.payment_status ?? "UNPAID"} /></dd></div>
          <div className={detailItemClass}><dt className="text-xs font-semibold text-slate-500">د ډیزاین ډول</dt><dd className="mt-2">{data.design_type === "JAR" ? "جر" : "ساده"}</dd></div>
          <div className={detailItemClass}><dt className="text-xs font-semibold text-slate-500">رنګونه</dt><dd className="mt-2">{data.color_count === "2" ? "۲ رنګونه" : "۱ رنګ"}</dd></div>
          <div className={detailItemClass}><dt className="text-xs font-semibold text-slate-500">د غمي سایز</dt><dd className="mt-2">{data.gemstone_size}</dd></div>
          <div className={detailItemClass}><dt className="text-xs font-semibold text-slate-500">د باران سایز</dt><dd dir="ltr" className="mt-2 text-right">{Number(data.baran_size_mm)} mm</dd></div>
          <div className={detailItemClass}><dt className="text-xs font-semibold text-slate-500">د فرمایش نېټه</dt><dd className="mt-2">{formatDate(data.order_date)}</dd></div>
          <div className={detailItemClass}><dt className="text-xs font-semibold text-slate-500">د سپارلو نېټه</dt><dd className="mt-2">{formatDate(data.expected_delivery_date)}</dd></div>
        </dl>
        {data.design_description && <div className="mt-6 border-t pt-5"><p className="text-xs font-semibold text-slate-500">د ډیزاین معلومات</p><p className="mt-2 whitespace-pre-wrap leading-7 text-slate-700">{data.design_description}</p></div>}
        {data.notes && <div className="mt-5"><p className="text-xs font-semibold text-slate-500">نوټ</p><p className="mt-2 whitespace-pre-wrap leading-7 text-slate-700">{data.notes}</p></div>}
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-blue-50 text-brand-600"><User className="size-5" /></div><div><h2 className="font-semibold">مشتري</h2><p className="text-sm text-slate-500">د فرمایش څښتن</p></div></div>
        <div className="mt-5 flex items-center justify-between gap-3"><Link to={`/customers/${data.customer.id}`} className="block text-lg font-semibold text-brand-700">{data.customer.full_name}</Link><Link to={`/customers/${data.customer.id}/edit`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-100"><UserPen className="size-3.5" /> د مشتری اصلاح</Link></div>
        <p className="mt-1 text-sm text-slate-500">{data.customer.customer_code}</p><p className="mt-4 text-sm">{data.customer.phone || "موبایل نه دی ثبت شوی"}</p><p className="mt-1 text-sm">واټساپ: {data.customer.whatsapp_number || "نه دی ثبت شوی"}</p>
        {data.design_file_reference && <a href={data.design_file_reference} target="_blank" rel="noreferrer" className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white"><Download className="size-4" /> {data.design_file_name || "د ډیزاین فایل"} ښکته کول</a>}
      </article>
    </div>

    <article className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">د تادیاتو تاریخچه</h2><p className="mt-1 text-sm text-slate-500">هره ترلاسه شوې تادیه له مقدار، کاروونکي او وخت سره ثبتېږي.</p></div>{remaining > 0 && data.status !== "CANCELLED" && <Button type="button" onClick={() => { setPaymentError(null); setPaymentFormOpen((open) => !open); }}><Banknote className="size-4" /> تادیه ثبتول</Button>}</div>
      {paymentFormOpen && <form className="mt-5 grid gap-4 rounded-xl border border-brand-100 bg-brand-50/40 p-4 md:grid-cols-[1fr_1fr_1.5fr_auto] md:items-end" onSubmit={submitPayment} noValidate><label className="text-sm font-semibold text-slate-700">نوې تادیه (AFN)<input type="number" min="0.01" max={remaining} step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} onBlur={() => { const amount = Number(paymentAmount); setPaymentError(amount > remaining ? "نوې تادیه له پاتې پیسو څخه زیاته ده." : amount <= 0 ? "د تادیې اندازه باید له صفر څخه زیاته وي." : null); }} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-right font-normal outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100" autoFocus /></label><label className="text-sm font-semibold text-slate-700">د حساب نېټه<input type="date" required value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100" /></label><label className="text-sm font-semibold text-slate-700">نوټ <span className="font-normal text-slate-400">(اختیاري)</span><input value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} maxLength={500} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100" placeholder="د تادیې لنډ معلومات" /></label><Button type="submit" disabled={recordPayment.isPending}>{recordPayment.isPending && <LoaderCircle className="size-4 animate-spin" />} ثبتول</Button>{paymentError && <p role="alert" className="text-sm font-semibold text-red-600 md:col-span-4">{paymentError}</p>}</form>}
      {data.payment_history && data.payment_history.length > 0 ? <div className="mt-5 overflow-hidden rounded-xl border border-slate-200"><div className="divide-y divide-slate-100">{data.payment_history.map((payment) => <div key={payment.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center"><div><p dir="ltr" className="text-right font-bold text-emerald-700">{money(payment.amount)}</p>{payment.note && <p className="mt-1 text-sm text-slate-500">{payment.note}</p>}</div><p className="text-sm text-slate-600">{payment.recorded_by_name}</p><time className="text-sm text-slate-500">{formatDateTime(payment.created_at)}</time>{canCorrectPayments && <button type="button" disabled={voidPayment.isPending} onClick={() => void removePayment(payment.id)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"><Trash2 className="size-3.5" /> تادیه لغوه کول</button>}</div>)}</div></div> : <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">تر اوسه تادیه نه ده ثبت شوې.</p>}
    </article>

    <article className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">د حالت تاریخچه</h2>
      <ol className="mt-5 space-y-3">{data.status_history?.map((entry) => <li key={entry.id} className="relative rounded-xl border border-slate-100 bg-slate-50 p-4 pr-9"><span className="absolute right-4 top-5 size-3 rounded-full bg-brand-500 ring-4 ring-brand-100" /><dl className="grid gap-3 sm:grid-cols-3"><div><dt className="text-xs font-semibold text-slate-400">حالت</dt><dd className="mt-1 font-semibold text-slate-900">{statusLabels[entry.to_status]}</dd></div><div><dt className="text-xs font-semibold text-slate-400">کاروونکی</dt><dd className="mt-1 text-sm text-slate-700">{entry.changed_by_name}</dd></div><div><dt className="text-xs font-semibold text-slate-400">نېټه او وخت</dt><dd className="mt-1 text-sm text-slate-700">{formatDateTime(entry.created_at)}</dd></div></dl>{entry.note && <p className="mt-3 border-t border-slate-200 pt-3 text-sm text-slate-600">{historyNote(entry.note)}</p>}</li>)}</ol>
    </article>
  </section>;
}
