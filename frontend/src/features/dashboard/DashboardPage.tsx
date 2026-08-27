import { useState, type ReactNode } from "react";
import { Banknote, ClipboardList, CreditCard, HandCoins, Landmark, ReceiptText, RefreshCw, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useAuth } from "@/features/auth/auth-context";
import { formatAfn } from "@/lib/format";
import { useDashboard } from "./hooks";
import type { DashboardData, DashboardPeriod } from "./types";

const periods: Array<{ value: DashboardPeriod; label: string }> = [
  { value: "today", label: "نن" }, { value: "week", label: "دا اوونۍ" },
  { value: "month", label: "دا میاشت" }, { value: "year", label: "سږ کال" },
  { value: "custom", label: "ټاکلې نېټې" },
];
const money = formatAfn;

export function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const [period, setPeriod] = useState<DashboardPeriod>("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const customReady = period !== "custom" || Boolean(startDate && endDate && startDate <= endDate);
  const query = useDashboard(
    { period, ...(period === "custom" ? { start_date: startDate, end_date: endDate } : {}) },
    hasPermission("view_reports") && customReady,
  );

  if (!hasPermission("view_reports")) return <StatePanel title="اجازه نشته" detail="تاسو د مالي ډشبورډ د لیدلو اجازه نه لرئ." />;
  return <section dir="rtl" className="text-right" aria-label="مالي ډشبورډ">
    <header className="mb-5 flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="text-sm font-semibold text-brand-600">{user?.full_name}</p><h1 className="mt-1 text-3xl font-bold text-slate-950">مالي ډشبورډ</h1><p className="mt-2 text-sm text-slate-500">د فرمایشونو، پیسو، لګښتونو او پورونو ریښتینی مالي انځور</p></div>
      <Link to="/reports" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-4 font-semibold text-white shadow-sm transition hover:bg-brand-700">تفصیلي راپورونه</Link>
      <div className="flex flex-wrap items-end gap-2" aria-label="د نېټې چاڼ">
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">{periods.map((item) => <button key={item.value} type="button" onClick={() => setPeriod(item.value)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${period === item.value ? "bg-white text-brand-700 shadow-sm" : "text-slate-600"}`}>{item.label}</button>)}</div>
        {period === "custom" && <><DateInput label="له" ariaLabel="پیل نېټه" value={startDate} onChange={setStartDate} /><DateInput label="تر" ariaLabel="پای نېټه" value={endDate} onChange={setEndDate} /></>}
      </div>
    </header>
    {!customReady && <StatePanel title="سمه نېټه وټاکئ" detail="د پیل نېټه باید د پای له نېټې مخکې یا ورسره برابره وي." />}
    {query.isLoading && <DashboardSkeleton />}
    {query.isError && <StatePanel title="معلومات پورته نه شول" detail={query.error instanceof Error ? query.error.message : "له سرور سره اړیکه ونه نیول شوه."} action={<button type="button" onClick={() => query.refetch()} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"><RefreshCw className="size-4" />بیا هڅه</button>} />}
    {query.data && <DashboardContent data={query.data} />}
  </section>;
}

function DashboardContent({ data }: { data: DashboardData }) {
  const { cards, recent_activity: activity } = data;
  const profitLoss = Number(cards.profit_loss);
  const cashBalance = Number(cards.cash_balance);
  const profitLabel = profitLoss > 0 ? "ګټه" : profitLoss < 0 ? "زیان" : "نه ګټه، نه زیان";
  const profitCardStyle = profitLoss > 0
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : profitLoss < 0
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-slate-200 bg-slate-50 text-slate-700";
  const kpis = [
    { label: "خرڅلاو", value: money(cards.sales), icon: ClipboardList, tone: "blue" },
    { label: "نغدې پیسې", value: money(cards.cash_balance), icon: Banknote, tone: cashBalance < 0 ? "rose" : "emerald", cardStyle: cashBalance < 0 ? "border-rose-200 bg-rose-50 text-rose-800" : undefined },
    { label: "د مشتریانو پاتې پور", value: money(cards.customer_receivables), icon: WalletCards, tone: "amber" },
    { label: "عرضه کوونکو ته پاتې پیسې", value: money(cards.shop_payables), icon: HandCoins, tone: "orange" },
    { label: "لګښتونه", value: money(cards.expenses), icon: ReceiptText, tone: "rose" },
    { label: profitLabel, value: money(Math.abs(profitLoss)), icon: profitLoss >= 0 ? TrendingUp : TrendingDown, tone: profitLoss >= 0 ? "emerald" : "rose", cardStyle: profitCardStyle },
  ];
  const empty = cards.orders === 0 && Number(cards.received_payments) === 0 && Number(cards.expenses) === 0 && activity.length === 0;
  return <>
    <p className="mb-4 text-xs text-slate-500">موده: <span dir="ltr">{data.start_date} — {data.end_date}</span></p>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{kpis.map(({ label, value, icon: Icon, tone, cardStyle }) => <article key={label} className={`rounded-2xl border p-5 shadow-sm ${cardStyle ?? "border-slate-200 bg-white text-slate-950"}`}><div className={`mb-4 grid size-10 place-items-center rounded-xl ${toneClass(tone)}`}><Icon className="size-5" /></div><p className={`text-sm ${cardStyle ? "font-bold text-current" : "text-slate-500"}`}>{label}</p><p dir="ltr" className={`mt-2 text-right text-2xl font-bold ${cardStyle ? "text-current" : "text-slate-950"}`}>{value}</p></article>)}</div>
    {empty && <div className="mt-5"><StatePanel title="په دې موده کې معلومات نشته" detail="کله چې فرمایش، تادیه یا لګښت ثبت شي، معلومات به دلته ښکاره شي." /></div>}
    {!empty && <div className="mt-6 grid gap-5 xl:grid-cols-2">
      <DashboardChart title="خرڅلاو، لګښت او ګټه">
        <ResponsiveContainer width="100%" height={260}><ComposedChart data={data.charts.income_expense_profit}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis width={48} tick={{ fontSize: 10 }} /><Tooltip formatter={(value) => money(Number(value))} /><Legend /><Bar dataKey="income" name="خرڅلاو" fill="#2563eb" radius={[4, 4, 0, 0]} /><Bar dataKey="expenses" name="لګښت" fill="#e11d48" radius={[4, 4, 0, 0]} /><Line dataKey="profit" name="ګټه / زیان" stroke="#059669" strokeWidth={3} dot={false} /></ComposedChart></ResponsiveContainer>
      </DashboardChart>
      <DashboardChart title="د مشتریانو ترلاسه شوې پیسې">
        <ResponsiveContainer width="100%" height={260}><ComposedChart data={data.charts.payment_trend}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis width={48} tick={{ fontSize: 10 }} /><Tooltip formatter={(value) => money(Number(value))} /><Bar dataKey="value" name="ترلاسه شوې پیسې" fill="#059669" radius={[5, 5, 0, 0]} /></ComposedChart></ResponsiveContainer>
      </DashboardChart>
    </div>}
    <ActivityList items={activity} />
  </>;
}

function DashboardChart({ title, children }: { title: string; children: ReactNode }) {
  return <section className="surface-panel p-4 sm:p-5"><h2 className="mb-4 text-base font-bold text-slate-900">{title}</h2><div dir="ltr">{children}</div></section>;
}

function ActivityList({ items }: { items: DashboardData["recent_activity"] }) {
  const labels = { order: "نوی فرمایش", payment: "د مشتری ورکړه", expense: "لګښت", loan_repayment: "د پور بېرته ورکړه", payable_repayment: "پخوانۍ ورکړه", supplier_payment: "عرضه کوونکي ته ورکړه" };
  const icons = { order: ClipboardList, payment: CreditCard, expense: ReceiptText, loan_repayment: Landmark, payable_repayment: HandCoins, supplier_payment: HandCoins };
  return <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">وروستي فعالیتونه</h2>{items.length ? <div className="mt-3 divide-y divide-slate-100">{items.map((item) => { const Icon = icons[item.type]; return <div key={`${item.type}-${item.created_at}-${item.detail}`} className="flex items-start gap-3 py-3"><div className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100"><Icon className="size-4" /></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{labels[item.type]}</p><p className="truncate text-xs text-slate-500">{item.detail}</p></div><div className="shrink-0 text-left text-xs text-slate-400"><time dir="ltr">{item.date}</time><p>{item.user}</p></div></div>; })}</div> : <p className="mt-4 text-sm text-slate-500">په ټاکلې موده کې فعالیت نشته.</p>}</section>;
}

function DateInput({ label, ariaLabel, value, onChange }: { label: string; ariaLabel: string; value: string; onChange: (value: string) => void }) { return <label className="text-xs text-slate-500">{label}<input aria-label={ariaLabel} type="date" value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 block rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm" /></label>; }
function StatePanel({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) { return <div role="status" className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm"><h2 className="text-lg font-bold">{title}</h2><p className="mt-2 text-sm text-slate-500">{detail}</p>{action}</div>; }
function DashboardSkeleton() { return <div aria-label="معلومات پورته کېږي" className="grid animate-pulse gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 7 }).map((_, index) => <div key={index} className="h-36 rounded-2xl bg-slate-200" />)}</div>; }
function toneClass(tone: string) { return tone === "blue" ? "bg-blue-50 text-blue-600" : tone === "emerald" ? "bg-emerald-50 text-emerald-600" : tone === "rose" ? "bg-rose-50 text-rose-600" : tone === "amber" ? "bg-amber-50 text-amber-700" : tone === "orange" ? "bg-orange-50 text-orange-600" : "bg-violet-50 text-violet-600"; }
