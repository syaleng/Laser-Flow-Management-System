import { Archive, ArrowLeft, CreditCard, Edit3, MessageCircle, Printer, ReceiptText, RotateCcw, WalletCards, type LucideIcon } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Children } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api-client";
import { formatAfn, formatDate } from "@/lib/format";
import { CustomerDesignOrdersPanel } from "@/features/design-orders/CustomerDesignOrdersPanel";

import { CustomerPaymentForm } from "./CustomerPaymentForm";
import { useCreateCustomerPayment, useCustomer, useCustomerLedger, useCustomerStatement, useSetCustomerArchived } from "./hooks";

const money = formatAfn;
const paymentStatusLabels: Record<string, string> = {
  CREDIT: "قرضه",
  PARTIAL: "نیمه ورکړه",
  FULLY_PAID: "بشپړه ورکړه",
  CASH: "نغدي",
};

export function CustomerDetailPage() {
  const { customerId = "" } = useParams();
  const customer = useCustomer(customerId);
  const statement = useCustomerStatement(customerId);
  const ledger = useCustomerLedger(customerId);
  const archiveMutation = useSetCustomerArchived(customerId);
  const paymentMutation = useCreateCustomerPayment(customerId);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  if (customer.isLoading) return <div className="text-slate-500">معلومات راځي…</div>;
  if (customer.isError || !customer.data) {
    return (
      <div role="alert" className="rounded-xl bg-red-50 p-5 text-red-700">
        {customer.error instanceof ApiError ? customer.error.message : "مشتري پیدا نه شو."}
      </div>
    );
  }

  const data = customer.data;
  const submitPayment = async (values: { amount: number; payment_date: string; description: string }) => {
    await paymentMutation.mutateAsync(values);
    setShowPaymentForm(false);
  };
  const changeArchiveState = async () => {
    const action = data.is_active ? "archive" : "restore";
    if (data.is_active && !window.confirm("دا مشتري آرشیف شي؟ پخواني معلومات به یې خوندي وي.")) return;
    try {
      await archiveMutation.mutateAsync(action === "archive");
    } catch {
      // The mutation error is rendered below with the normalized API message.
    }
  };

  return (
    <section className="detail-page">
      <Link to="/customers" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
        <ArrowLeft className="size-4" /> د مشتریانو لېست ته بېرته
      </Link>

      <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">{data.full_name}</h1>
            <span className={data.is_active ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700" : "rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600"}>
              {data.is_active ? "فعال" : "آرشیف شوی"}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">{data.customer_code}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setShowPaymentForm((visible) => !visible)} disabled={Number(ledger.data?.remaining_debt_balance ?? data.current_debt) <= 0}>
            <CreditCard className="mr-2 size-4" /> تادیه اضافه کول
          </Button>
          <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50 print:hidden">
            <Printer className="size-4" /> د مشتری راپور چاپ
          </button>
          <Link to={`/customers/${data.id}/edit`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50">
            <Edit3 className="size-4" /> بدلول
          </Link>
          <Button
            className={data.is_active ? "bg-slate-700 hover:bg-slate-800" : "bg-emerald-600 hover:bg-emerald-700"}
            onClick={() => void changeArchiveState()}
            disabled={archiveMutation.isPending}
          >
            {data.is_active ? <Archive className="mr-2 size-4" /> : <RotateCcw className="mr-2 size-4" />}
            {data.is_active ? "آرشیف کول" : "بیا فعالول"}
          </Button>
        </div>
      </div>

      {archiveMutation.isError && (
        <div role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {archiveMutation.error instanceof ApiError ? archiveMutation.error.message : "د مشتري حالت بدل نه شو."}
        </div>
      )}

      {showPaymentForm && (
        <CustomerPaymentForm
          onSubmit={submitPayment}
          onCancel={() => setShowPaymentForm(false)}
          serverError={paymentMutation.error instanceof ApiError ? paymentMutation.error.message : null}
          maxAmount={Math.max(0, Number(ledger.data?.remaining_debt_balance ?? data.current_debt))}
        />
      )}

      <section className="mb-6" aria-labelledby="customer-financial-summary">
        <h2 id="customer-financial-summary" className="mb-4 text-xl font-bold text-slate-950">مشتري حساب</h2>
        {ledger.data ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {([
              ["د فرمایشونو ټول مقدار", money(ledger.data.total_orders_amount), ReceiptText, "bg-blue-50 text-blue-600"],
              ["ټولې ورکړې", money(ledger.data.total_paid_amount), CreditCard, "bg-emerald-50 text-emerald-600"],
              ["پاتې حساب", money(ledger.data.remaining_debt_balance), WalletCards, Number(ledger.data.remaining_debt_balance) > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"],
            ] as [string, string, LucideIcon, string][]).map(([title, value, Icon, color], index) => (
              <article key={title} className={`customer-summary-card rounded-2xl border p-5 shadow-sm ${index === 0 ? "border-blue-200 bg-blue-50/70" : index === 1 ? "border-emerald-200 bg-emerald-50/70" : "border-rose-200 bg-rose-50/70"}`}><div className={`mb-4 grid size-11 place-items-center rounded-xl ring-4 ring-white/70 ${color}`}><Icon className="size-5" /></div><p className="text-sm font-semibold text-slate-600">{title}</p><p dir="ltr" className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">{value}</p></article>
            ))}
          </div>
        ) : ledger.isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">مالي معلومات راځي…</div>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">د مشتري معلومات</h2>
          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            <div><dt className="text-xs font-semibold tracking-wide text-slate-400">د موبایل شمېره</dt><dd className="mt-1 text-slate-900">{data.phone || "نه ده لیکل شوې"}</dd></div>
            <div><dt className="text-xs font-semibold tracking-wide text-slate-400">د WhatsApp شمېره</dt><dd className="mt-1 text-slate-900">{data.whatsapp_number || "نه ده لیکل شوې"}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs font-semibold tracking-wide text-slate-400">پته</dt><dd className="mt-1 whitespace-pre-wrap text-slate-900">{data.address || "نه ده لیکل شوې"}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs font-semibold tracking-wide text-slate-400">نوټ</dt><dd className="mt-1 whitespace-pre-wrap text-slate-900">{data.notes || "نوټ نشته"}</dd></div>
          </dl>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><MessageCircle className="size-5" /></div><div><h2 className="font-semibold text-slate-950">د WhatsApp اجازه</h2><p className="text-sm text-slate-500">د پیغامونو اجازه</p></div></div>
          <div className={data.whatsapp_consent ? "mt-6 rounded-xl bg-emerald-50 p-4" : "mt-6 rounded-xl bg-amber-50 p-4"}>
            <p className={data.whatsapp_consent ? "font-semibold text-emerald-800" : "font-semibold text-amber-800"}>{data.whatsapp_consent ? "اجازه ثبت شوې" : "اجازه نه ده ثبت شوې"}</p>
            <p className="mt-1 text-sm text-slate-600">{data.whatsapp_consent ? `ثبت شوې: ${formatDate(data.whatsapp_consent_at)}` : "دې مشتري ته اتومات یادونه مه لېږئ."}</p>
          </div>
        </article>
      </div>

      <CustomerDesignOrdersPanel customerId={data.id} active={data.is_active} />
      <section className="mt-6" aria-live="polite">
        <div className="mb-4 flex items-center gap-3"><ReceiptText className="size-5 text-brand-600" /><h2 className="text-xl font-bold text-slate-950">د حساب تفصیل</h2></div>

        {ledger.isLoading && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">د لجر تاریخچه راځي…</div>}
        {ledger.isError && <div role="alert" className="rounded-xl bg-red-50 p-5 text-red-700">د لجر تاریخچه ترلاسه نه شو. مهرباني وکړئ بیا هڅه وکړئ.</div>}

        {ledger.data && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-slate-500">مشتري</p>
                <h3 className="text-xl font-bold text-slate-950">{ledger.data.customer_name}</h3>
              </div>
              <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">د حساب ثبتونه: {ledger.data.entries.length}</div>
            </div>

            {ledger.data.entries.length === 0 ? (
              <p className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">تر اوسه د حساب معلومات نشته</p>
            ) : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[680px] text-right text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="px-4 py-3">نیټه</th>
                      <th className="px-4 py-3">تشریح</th>
                      <th className="px-4 py-3 text-rose-700">نوی فرمایش</th>
                      <th className="px-4 py-3 text-emerald-700">ترلاسه شوې تادیه</th>
                      <th className="px-4 py-3">پاتې بیلانس</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledger.data.entries.map((entry) => (
                      <tr key={`${entry.date}-${entry.type}-${entry.description}-${entry.source_id}`}>
                        <td className="px-4 py-3 text-slate-600">{new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "short", day: "numeric" }).format(new Date(entry.date))}</td>
                        <td className="px-4 py-3 text-slate-700">{entry.description}</td>
                        <td className="px-4 py-3 font-bold text-rose-700" dir="ltr">{entry.type === "Order" ? `+${money(entry.amount)}` : "-"}</td>
                        <td className="px-4 py-3 font-bold text-emerald-700" dir="ltr">{entry.type === "Payment" ? `-${money(Math.abs(Number(entry.amount)))}` : "-"}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900" dir="ltr">{money(entry.balance_after_transaction)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {statement.isLoading && <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">مالي معلومات راځي…</div>}
        {statement.isError && <div role="alert" className="mt-4 rounded-xl bg-red-50 p-5 text-red-700">مالي حساب ترلاسه نه شو. مهرباني وکړئ بیا هڅه وکړئ.</div>}
        {statement.data && (
          <>
            <div className="mt-5 grid gap-5 xl:grid-cols-2">
              <StatementTable title="د فرمایشونو حساب" empty="تر اوسه مالي فرمایش نشته." headers={["فرمایش", "نېټه", "ټول مقدار", "ورکړې", "پاتې", "حالت"]}>
                {statement.data.orders.map((order) => <tr key={order.order_number}><td className="px-4 py-3 font-semibold text-slate-900">{order.order_number}</td><td className="px-4 py-3 text-slate-600">{order.date}</td><td className="px-4 py-3">{money(order.total_amount)}</td><td className="px-4 py-3 text-emerald-700">{money(order.paid_amount)}</td><td className="px-4 py-3 text-rose-700">{money(order.remaining_amount)}</td><td className="px-4 py-3">{paymentStatusLabels[order.payment_status] ?? order.payment_status}</td></tr>)}
              </StatementTable>
              <StatementTable title="د تادیاتو تاریخچه" empty="تر اوسه تادیه نه ده ثبت شوې." headers={["نېټه", "مقدار", "اړوند فرمایش", "ثبتوونکی", "یادښت"]}>
                {statement.data.payments.map((payment) => <tr key={`${payment.payment_date}-${payment.order_number}-${payment.amount}`}><td className="px-4 py-3 text-slate-600">{formatDate(payment.payment_date)}</td><td className="px-4 py-3 font-bold text-emerald-700">{money(payment.amount)}</td><td className="px-4 py-3 font-semibold text-slate-900">{payment.order_number}</td><td className="px-4 py-3 text-slate-600">{payment.recorded_user}</td><td className="px-4 py-3 text-slate-500">{payment.note || "—"}</td></tr>)}
              </StatementTable>
            </div>
          </>
        )}
      </section>
    </section>
  );
}

function StatementTable({ title, empty, headers, children }: { title: string; empty: string; headers: string[]; children: React.ReactNode }) {
  const hasRows = Children.count(children) > 0;
  return <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><h3 className="border-b px-5 py-4 font-bold text-slate-950">{title}</h3>{hasRows ? <div className="overflow-x-auto"><table className="w-full min-w-155 text-right text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{headers.map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{children}</tbody></table></div> : <p className="p-8 text-center text-sm text-slate-500">{empty}</p>}</article>;
}
