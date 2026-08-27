import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { formatAfn } from "@/lib/format";
import { useSupplier, useSupplierMutations, useSupplierTransactions } from "./hooks";

const today = new Date().toISOString().slice(0, 10);
const inputClass = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-brand-500";

export function SupplierTransactionForm({ supplierId, type }: { supplierId: string; type: "debit" | "credit" }) {
  const { transaction: mutation } = useSupplierMutations();
  const [form, setForm] = useState({ amount: "", transaction_date: today, description: "" });
  const [error, setError] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      setError("مقدار باید له صفر څخه زیات وي.");
      return;
    }
    setError("");
    await mutation.mutateAsync({ id: supplierId, type, amount: Number(form.amount), transaction_date: form.transaction_date, description: form.description });
    setForm({ amount: "", transaction_date: today, description: "" });
  };
  return <form onSubmit={submit} className="grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-[1fr_1fr_2fr_auto] md:items-end">
    <label className="text-sm font-semibold">مقدار *<input aria-label="مقدار" required min="0.01" step="0.01" type="number" className={inputClass} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
    <label className="text-sm font-semibold">نېټه *<input aria-label="نېټه" required type="date" className={inputClass} value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} /></label>
    <label className="text-sm font-semibold">تشریح *<input aria-label="تشریح" required className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
    <Button type="submit">{type === "debit" ? "اخیستل ثبتول" : "ورکړه ثبتول"}</Button>
    {error && <p role="alert" className="text-sm text-red-700 md:col-span-4">{error}</p>}
  </form>;
}

export function SupplierDetailPage() {
  const { supplierId = "" } = useParams();
  const supplier = useSupplier(supplierId);
  const transactions = useSupplierTransactions(supplierId);
  const [type, setType] = useState<"debit" | "credit">("debit");
  const ledger = transactions.data;
  return <section dir="rtl" className="text-right">
    <Link to="/suppliers" className="text-sm font-semibold text-brand-700">د عرضه کوونکو لېست ته ستنېدل</Link>
    <header className="my-5 border-b border-slate-200 pb-5"><h1 className="text-3xl font-bold">{supplier.data?.name ?? "د عرضه کوونکي حساب"}</h1><p className="mt-2 text-slate-500">{supplier.data?.phone}</p></header>
    {transactions.isError && <p role="alert" className="mb-4 text-red-700">حساب بار نه شو.</p>}
    {ledger && <div className="grid gap-3 sm:grid-cols-3"><Summary label="ټول اخیستل شوي مواد او خدمتونه" value={ledger.total_payable} /><Summary label="ورکړل شوې پیسې" value={ledger.total_paid} /><Summary label="پاتې پیسې" value={ledger.remaining_balance} /></div>}
    <article className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 rounded-xl bg-slate-50 p-2 sm:flex-row"><Button type="button" aria-pressed={type === "debit"} onClick={() => setType("debit")} className={type === "debit" ? "flex-1 bg-red-600" : "flex-1 bg-white text-slate-700 shadow-none ring-1 ring-slate-200 hover:bg-slate-100"}>مواد یا خدمت ثبتول</Button><Button type="button" aria-pressed={type === "credit"} onClick={() => setType("credit")} className={type === "credit" ? "flex-1 bg-emerald-600" : "flex-1 bg-white text-slate-700 shadow-none ring-1 ring-slate-200 hover:bg-slate-100"}>عرضه کوونکي ته ورکړه</Button></div>
      <SupplierTransactionForm supplierId={supplierId} type={type} />
      {ledger && <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3">نېټه</th><th className="px-4 py-3">تشریح</th><th className="px-4 py-3 text-red-700">اخیستل شوي مواد یا خدمت</th><th className="px-4 py-3 text-emerald-700">ورکړل شوې پیسې</th><th className="px-4 py-3">پاتې پیسې</th></tr></thead><tbody className="divide-y divide-slate-100">{ledger.entries.map((entry) => <tr key={entry.id}><td className="px-4 py-3">{entry.transaction_date}</td><td className="px-4 py-3">{entry.description}</td><td dir="ltr" className="px-4 py-3 font-bold text-red-700">{entry.type === "DEBIT" ? `+${formatAfn(entry.amount)}` : "—"}</td><td dir="ltr" className="px-4 py-3 font-bold text-emerald-700">{entry.type === "CREDIT" ? `-${formatAfn(entry.amount)}` : "—"}</td><td dir="ltr" className="px-4 py-3 font-bold">{formatAfn(entry.balance)}</td></tr>)}</tbody></table></div>}
    </article>
  </section>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">{label}</p><p dir="ltr" className="mt-2 text-xl font-bold">{formatAfn(value)}</p></div>;
}
