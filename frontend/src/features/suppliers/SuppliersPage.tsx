import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/Page";
import { formatAfn } from "@/lib/format";
import { useSupplierMutations, useSuppliers } from "./hooks";

const inputClass = "mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-brand-500";

export function SuppliersPage() {
  const suppliers = useSuppliers();
  const { create } = useSupplierMutations();
  const [form, setForm] = useState({ name: "", phone: "", description: "" });
  const [search, setSearch] = useState("");
  const visibleSuppliers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return suppliers.data ?? [];
    return (suppliers.data ?? []).filter((supplier) => `${supplier.name} ${supplier.phone}`.toLocaleLowerCase().includes(term));
  }, [search, suppliers.data]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await create.mutateAsync(form);
    setForm({ name: "", phone: "", description: "" });
  };

  return <section dir="rtl" className="detail-page list-page text-right">
    <PageHeader eyebrow="مالي مدیریت" title="عرضه کوونکو ته پاتې پیسې" description="هغه پیسې چې دوکان یې عرضه کوونکو ته باید ورکړي" />
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <article className="supplier-list-panel rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold">عرضه کوونکي</h2><p className="mt-1 text-xs text-slate-500">نوم، موبایل او پاتې ورکړه په یوه ځای کې</p></div><label className="relative block sm:w-72"><Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input aria-label="عرضه کوونکي لټون" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="په نوم یا موبایل لټون" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-3 text-sm outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100" /></label></div>
        {suppliers.isLoading && <p className="mt-4 text-slate-500">حسابونه بارېږي...</p>}
        {suppliers.isError && <p role="alert" className="mt-4 text-red-700">حسابونه بار نه شول.</p>}
        <div className="mt-4 space-y-3">{visibleSuppliers.map((supplier) => <Link key={supplier.id} to={`/suppliers/${supplier.id}`} className="block rounded-xl border border-slate-200 p-4 transition hover:border-brand-200 hover:bg-brand-50/40"><div className="flex flex-wrap items-start justify-between gap-3"><span className="font-bold text-slate-950">{supplier.name}</span><span className="text-left"><span className="block text-[11px] text-slate-400">پاتې ورکړه</span><span dir="ltr" className="block font-bold text-red-700">{formatAfn(supplier.remaining_balance)}</span></span></div><div className="mt-3 flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:justify-between"><span dir="ltr" className="text-right">{supplier.phone || "شمېره نشته"}</span><span>{supplier.last_transaction_date ? `وروستۍ راکړه ورکړه: ${supplier.last_transaction_date}` : "راکړه ورکړه نشته"}</span></div></Link>)}</div>
        {visibleSuppliers.length === 0 && <p className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">{search ? "د دې لټون لپاره عرضه کوونکی ونه موندل شو." : "تر اوسه عرضه کوونکی نشته."}</p>}
      </article>
      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">نوی عرضه کوونکی</h2><label className="mt-4 block text-sm font-semibold">نوم *<input aria-label="نوم" required className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label className="mt-3 block text-sm font-semibold">موبایل<input aria-label="موبایل" className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label className="mt-3 block text-sm font-semibold">تشریح<textarea aria-label="تشریح" className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><Button type="submit" className="mt-4">ثبتول</Button></form>
    </div>
  </section>;
}
