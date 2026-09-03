import { useEffect, useState } from "react";
import { Edit3, Trash2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { formatAfn } from "@/lib/format";
import { useSupplier, useSupplierMutations, useSupplierTransactions } from "./hooks";

const today = new Date().toISOString().slice(0, 10);
const inputClass = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-brand-500";

export function SupplierTransactionForm({ supplierId, type, remainingBalance = "0" }: { supplierId: string; type: "debit" | "credit"; remainingBalance?: string }) {
  const { transaction: mutation } = useSupplierMutations();
  const [form, setForm] = useState({ amount: "", transaction_date: today, description: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    if (type === "credit" && form.amount && Number(form.amount) > Number(remainingBalance)) {
      setError(`دا مقدار له پاتې حساب (${formatAfn(remainingBalance)}) څخه زیات دی.`);
    } else setError((current) => current ? "" : current);
  }, [form.amount, type, remainingBalance]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      setError("مقدار باید له صفر څخه زیات وي.");
      return;
    }
    if (type === "credit" && Number(form.amount) > Number(remainingBalance)) {
      setError(`دا ورکړه له پاتې حساب (${formatAfn(remainingBalance)}) څخه زیاته ده.`);
      return;
    }
    setError("");
    setSuccess(false);
    await mutation.mutateAsync({ id: supplierId, type, amount: Number(form.amount), transaction_date: form.transaction_date, description: form.description });
    setForm({ amount: "", transaction_date: today, description: "" });
    setSuccess(true);
  };
  return <form onSubmit={submit} className="grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-[1fr_1fr_2fr_auto] md:items-end">
    <label className="text-sm font-semibold">مقدار *<input aria-label="مقدار" required min="0.01" step="0.01" type="number" className={inputClass} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
    <label className="text-sm font-semibold">نېټه *<input aria-label="نېټه" required type="date" className={inputClass} value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} /></label>
    <label className="text-sm font-semibold">تشریح *<input aria-label="تشریح" required className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
    <Button type="submit">{type === "debit" ? "اخیستل ثبتول" : "ورکړه ثبتول"}</Button>
    <p className="text-xs text-slate-500 md:col-span-4">{type === "debit" ? "دلته هغه مال یا خدمت ولیکئ چې له دې عرضه کوونکي څخه مو اخیستی." : "دلته هغه پیسې ولیکئ چې دې عرضه کوونکي ته مو ورکړې."}</p>
    {error && <p role="alert" className="text-sm text-red-700 md:col-span-4">{error}</p>}
    {success && <p role="status" className="text-sm font-semibold text-emerald-700 md:col-span-4">معامله په بریالیتوب ثبت شوه.</p>}
  </form>;
}

export function SupplierDetailPage() {
  const { supplierId = "" } = useParams();
  const supplier = useSupplier(supplierId);
  const transactions = useSupplierTransactions(supplierId);
  const [type, setType] = useState<"debit" | "credit">("debit");
  const { voidTransaction } = useSupplierMutations();
  const removeTransaction = async (transactionId: string) => {
    const reason = window.prompt("د معاملې د لغوه کولو دلیل ولیکئ:");
    if (!reason?.trim() || reason.trim().length < 3) return;
    if (!window.confirm("دا معامله لغوه شي؟ حسابونه به بېرته محاسبه شي.")) return;
    await voidTransaction.mutateAsync({ id: supplierId, transactionId, reason: reason.trim() });
  };
  const ledger = transactions.data;
  return <section dir="rtl" className="detail-page text-right">
    <Link to={`/suppliers/${supplierId}/edit`} className="mb-3 inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white"><Edit3 className="size-4" /> بدلول</Link>
    <Link to="/suppliers" className="text-sm font-semibold text-brand-700">د عرضه کوونکو لېست ته ستنېدل</Link>
    <header className="my-5 border-b border-slate-200 pb-5"><h1 className="text-3xl font-bold">{supplier.data?.name ?? "د عرضه کوونکي حساب"}</h1><p className="mt-2 text-slate-500">{supplier.data?.phone}</p></header>
    {transactions.isError && <p role="alert" className="mb-4 text-red-700">حساب بار نه شو.</p>}
    {ledger && <div className="grid gap-3 sm:grid-cols-3"><Summary label="ټول اخیستل شوي مواد او خدمتونه" value={ledger.total_payable} /><Summary label="ورکړل شوې پیسې" value={ledger.total_paid} /><Summary label="پاتې پیسې" value={ledger.remaining_balance} /></div>}
    <article className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 rounded-xl bg-slate-50 p-2 sm:flex-row"><Button type="button" aria-pressed={type === "debit"} onClick={() => setType("debit")} className={type === "debit" ? "flex-1 bg-red-600" : "flex-1 bg-white text-slate-700 shadow-none ring-1 ring-slate-200 hover:bg-slate-100"}>مواد یا خدمت ثبتول</Button><Button type="button" aria-pressed={type === "credit"} onClick={() => setType("credit")} className={type === "credit" ? "flex-1 bg-emerald-600" : "flex-1 bg-white text-slate-700 shadow-none ring-1 ring-slate-200 hover:bg-slate-100"}>عرضه کوونکي ته ورکړه</Button></div>
      <SupplierTransactionForm supplierId={supplierId} type={type} remainingBalance={ledger?.remaining_balance ?? "0"} />
      {ledger && <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3">نېټه</th><th className="px-4 py-3">تشریح</th><th className="px-4 py-3 text-red-700">اخیستل شوي مواد یا خدمت</th><th className="px-4 py-3 text-emerald-700">ورکړل شوې پیسې</th><th className="px-4 py-3">پاتې پیسې</th><th className="px-4 py-3">کار</th></tr></thead><tbody className="divide-y divide-slate-100">{ledger.entries.map((entry) => <tr key={entry.id}><td className="px-4 py-3">{entry.transaction_date}</td><td className="px-4 py-3">{entry.description}</td><td dir="ltr" className="px-4 py-3 font-bold text-red-700">{entry.type === "DEBIT" ? `+${formatAfn(entry.amount)}` : "—"}</td><td dir="ltr" className="px-4 py-3 font-bold text-emerald-700">{entry.type === "CREDIT" ? `-${formatAfn(entry.amount)}` : "—"}</td><td dir="ltr" className="px-4 py-3 font-bold">{formatAfn(entry.balance)}</td><td className="px-4 py-3"><button type="button" disabled={voidTransaction.isPending} onClick={() => void removeTransaction(entry.id)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100"><Trash2 className="size-3.5" /> لغوه</button></td></tr>)}</tbody></table></div>}
    </article>
  </section>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="supplier-summary-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold text-slate-600">{label}</p><p dir="ltr" className="mt-3 text-2xl font-extrabold tracking-tight">{formatAfn(value)}</p></div>;
}
