import { CircleDollarSign, ClipboardList, TrendingUp, Users } from "lucide-react";

const cards = [
  { label: "Today's jobs", value: "—", note: "Available in Phase 2", icon: ClipboardList },
  { label: "Monthly income", value: "— AFN", note: "Available in Phase 2", icon: CircleDollarSign },
  { label: "Net profit", value: "— AFN", note: "Available in Phase 3", icon: TrendingUp },
  { label: "Customer debts", value: "— AFN", note: "Available in Phase 2", icon: Users },
];

export function DashboardPage() {
  return (
    <div>
      <div className="mb-8"><p className="text-sm font-semibold text-brand-600">OVERVIEW</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Dashboard</h1><p className="mt-2 text-slate-500">Your laser shop at a glance.</p></div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, note, icon: Icon }) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Icon className="size-5" /></div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-950">{value}</p><p className="mt-4 text-xs text-slate-400">{note}</p></article>)}
      </div>
      <section className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="font-semibold text-slate-900">Phase 1 foundation is ready</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">Live business metrics will appear as customer, job, payment, and expense modules are introduced.</p></section>
    </div>
  );
}

