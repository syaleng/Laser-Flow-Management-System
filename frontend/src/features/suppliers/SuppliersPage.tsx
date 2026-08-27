import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { formatAfn } from "@/lib/format";
import { useSupplierMutations, useSuppliers } from "./hooks";

const inputClass = "mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-brand-500";

export function SuppliersPage() {
  const suppliers = useSuppliers();
  const { create } = useSupplierMutations();
  const [form, setForm] = useState({ name: "", phone: "", description: "" });
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await create.mutateAsync(form);
    setForm({ name: "", phone: "", description: "" });
  };

  return <section dir="rtl" className="text-right">
    <header className="mb-6 border-b border-slate-200 pb-5"><h1 className="text-3xl font-bold">عرضه کوونکو ته پاتې پیسې</h1><p className="mt-2 text-sm text-slate-500">هغه پیسې چې دوکان یې عرضه کوونکو ته باید ورکړي</p></header>
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold">عرضه کوونکي</h2>
        {suppliers.isLoading && <p className="mt-4 text-slate-500">حسابونه بارېږي...</p>}
        {suppliers.isError && <p role="alert" className="mt-4 text-red-700">حسابونه بار نه شول.</p>}
        <div className="mt-4 space-y-3">{suppliers.data?.map((supplier) => <Link key={supplier.id} to={`/suppliers/${supplier.id}`} className="block rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50"><div className="flex justify-between gap-3"><span className="font-bold">{supplier.name}</span><span dir="ltr" className="font-bold text-red-700">{formatAfn(supplier.remaining_balance)}</span></div><div className="mt-2 flex justify-between text-xs text-slate-500"><span>{supplier.phone || "شمېره نشته"}</span><span>{supplier.last_transaction_date ? `وروستۍ راکړه ورکړه: ${supplier.last_transaction_date}` : "راکړه ورکړه نشته"}</span></div></Link>)}</div>
        {suppliers.data?.length === 0 && <p className="mt-4 text-slate-500">تر اوسه عرضه کوونکی نشته.</p>}
      </article>
      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">نوی عرضه کوونکی</h2><label className="mt-4 block text-sm font-semibold">نوم *<input aria-label="نوم" required className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label className="mt-3 block text-sm font-semibold">موبایل<input aria-label="موبایل" className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label className="mt-3 block text-sm font-semibold">تشریح<textarea aria-label="تشریح" className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><Button type="submit" className="mt-4">ثبتول</Button></form>
    </div>
  </section>;
}
