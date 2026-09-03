import { BarChart3, CircleDollarSign, CreditCard, RefreshCw, ReceiptText, ShoppingBag, TrendingDown, TrendingUp, Users, Wallet } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { PageHeader, StatePanel } from "@/components/ui/Page";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAfn } from "@/lib/format";
import { useDashboard } from "./hooks";
import type { DateFilter } from "./types";

const periods: { value: Exclude<DateFilter, "custom">; label: string }[] = [
  { value: "today", label: "نن" }, { value: "week", label: "دا اوونۍ" },
  { value: "month", label: "دا میاشت" }, { value: "year", label: "سږ کال" },
];

export function DashboardPage() {
  const [period, setPeriod] = useState<Exclude<DateFilter, "custom">>("today");
  const dashboard = useDashboard({ filter: period });
  const navigate = useNavigate();
  const data = dashboard.data;

  if (dashboard.isLoading) return <div aria-label="معلومات پورته کېږي" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-40 rounded-2xl" />)}</div>;
  if (dashboard.isError) return <StatePanel title="معلومات پورته نه شول" detail="له سرور سره اړیکه ونه نیول شوه." action={<button type="button" onClick={() => void dashboard.refetch()} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white"><RefreshCw className="size-4" /> بیا هڅه وکړئ</button>} />;

  const loss = Number(data?.profit ?? 0) < 0;
  const cards = [
    { title: "خرڅلاو", value: data?.totalSales ?? 0, detail: "د ټاکلې مودې ټول خرڅلاو", icon: ShoppingBag, tone: "blue", to: "/design-orders" },
    { title: "موجوده نغدي", value: data?.cash ?? 0, detail: "د ټولو داخلو او وتلو وروسته", icon: Wallet, tone: "navy", to: "/expenses" },
    { title: "موږ ته پاتې حسابونه", value: data?.receivables ?? 0, detail: "له مشتریانو ترلاسه کېدونکې پیسې", icon: Users, tone: "violet", to: "/customers?debt=true" },
    { title: "زموږ پر غاړه پاتې پورونه", value: data?.payables ?? 0, detail: "عرضه کوونکو ته ورکول کېدونکې پیسې", icon: CreditCard, tone: "amber", to: "/expenses#payables-records" },
    { title: "ټول لګښتونه", value: data?.totalExpenses ?? 0, detail: "د ټاکلې مودې ثبت شوي لګښتونه", icon: ReceiptText, tone: "rose", to: "/expenses" },
    { title: loss ? "زیان" : "ګټه", value: Math.abs(data?.profit ?? 0), detail: "خرڅلاو منفي ثبت شوي لګښتونه", icon: loss ? TrendingDown : TrendingUp, tone: loss ? "rose" : "emerald", to: "/reports" },
  ];
  const max = Math.max(data?.totalSales ?? 0, data?.totalExpenses ?? 0, Math.abs(data?.profit ?? 0), 1);

  return <section dir="rtl" className="dashboard-page text-right">
    <PageHeader eyebrow="عمومي مالي کتنه" title="مالي ډشبورډ" description="د خرڅلاو، نغدو، لګښتونو او پاتې حسابونو تازه وضعیت." actions={<div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white/80 p-1.5">{periods.map((item) => <button key={item.value} type="button" onClick={() => setPeriod(item.value)} className={`min-w-20 rounded-lg px-3 py-2 text-xs font-extrabold transition ${period === item.value ? "bg-blue-600 text-white shadow-md" : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"}`}>{item.label}</button>)}</div>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(({ title, value, detail, icon: Icon, tone, to }) => <button key={title} type="button" onClick={() => navigate(to)} className={`dashboard-metric dashboard-tone-${tone} group rounded-2xl border bg-white p-5 text-right shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl`}><div className="flex items-start justify-between gap-4"><span className="min-w-0"><span className="dashboard-metric-label block text-sm font-extrabold text-slate-600">{title}</span><strong dir="ltr" className="mt-2 block text-right text-2xl font-black tracking-tight">{formatAfn(value)}</strong></span><span className="grid size-11 shrink-0 place-items-center rounded-xl"><Icon className="size-5" /></span></div><p className="mt-3 border-t border-current/10 pt-3 text-xs leading-5 text-slate-500">{detail}</p></button>)}</div>
    <div className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <section className="surface-panel p-6"><div className="mb-6 flex items-center justify-between"><div><h2 className="font-black text-slate-950">مالي پرتله</h2><p className="mt-1 text-xs text-slate-500">خرڅلاو، لګښت او ګټه په یوه نظر</p></div><BarChart3 className="size-5 text-blue-600" /></div><div className="space-y-5">{[{label:"خرڅلاو",value:data?.totalSales ?? 0,color:"bg-blue-600"},{label:"لګښتونه",value:data?.totalExpenses ?? 0,color:"bg-rose-500"},{label:loss?"زیان":"ګټه",value:Math.abs(data?.profit ?? 0),color:loss?"bg-amber-500":"bg-emerald-500"}].map((item)=><div key={item.label}><div className="mb-2 flex justify-between text-sm"><span className="font-bold text-slate-700">{item.label}</span><span dir="ltr" className="font-black text-slate-900">{formatAfn(item.value)}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.color}`} style={{width:`${Math.max((item.value/max)*100,2)}%`}} /></div></div>)}</div></section>
      <section className="surface-panel p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-black text-slate-950">وروستي فعالیتونه</h2><p className="mt-1 text-xs text-slate-500">تازه مالي حرکتونه</p></div><CircleDollarSign className="size-5 text-emerald-600" /></div>{(data?.activities?.length ?? 0) > 0 ? <div className="space-y-2">{data?.activities.slice(0,6).map((activity)=><div key={activity.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5"><div><p className="text-xs font-bold text-slate-800">{activity.label}</p><p dir="ltr" className="mt-0.5 text-right text-[10px] text-slate-400">{activity.detail} · {activity.date}</p></div><span className="text-[10px] font-bold text-slate-500">{activity.user}</span></div>)}</div> : <div className="grid min-h-44 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-center"><div><CircleDollarSign className="mx-auto size-8 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-600">په دې موده کې معلومات نشته</p></div></div>}</section>
    </div>
  </section>;
}

export default DashboardPage;
