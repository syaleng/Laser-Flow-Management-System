import { ArrowRight, Building2, Phone, Save, Text } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { PageHeader, StatePanel } from "@/components/ui/Page";
import { useSupplier, useSupplierMutations } from "./hooks";

const fieldClass = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export function SupplierEditPage() {
  const { supplierId = "" } = useParams();
  const navigate = useNavigate();
  const supplier = useSupplier(supplierId);
  const { update } = useSupplierMutations();
  const [form, setForm] = useState({ name: "", phone: "", description: "" });

  useEffect(() => {
    if (supplier.data) setForm({ name: supplier.data.name, phone: supplier.data.phone, description: supplier.data.description });
  }, [supplier.data]);

  if (supplier.isLoading) return <StatePanel title="معلومات راځي…" detail="د عرضه کوونکي معلومات پورته کېږي." />;
  if (supplier.isError || !supplier.data) return <StatePanel title="عرضه کوونکی پیدا نه شو" detail="معلومات بیا تازه کړئ یا بېرته لېست ته لاړ شئ." action={<Link to="/suppliers" className="text-sm font-bold text-blue-700">لېست ته بېرته</Link>} />;

  return <section dir="rtl" className="mx-auto max-w-3xl text-right">
    <PageHeader eyebrow="د عرضه کوونکي حساب" title="معلومات اصلاح کول" description="نوم، د اړیکې شمېره او تشریح په خوندي ډول تازه کړئ." actions={<Link to={`/suppliers/${supplierId}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"><ArrowRight className="size-4" /> حساب ته بېرته</Link>} />
    <form className="surface-panel overflow-hidden" onSubmit={async (event) => { event.preventDefault(); await update.mutateAsync({ id: supplierId, ...form }); navigate(`/suppliers/${supplierId}`); }}>
      <div className="border-b border-slate-100 bg-gradient-to-l from-blue-50 to-white px-6 py-5"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-blue-600 text-white shadow-md"><Building2 className="size-5" /></span><div><h2 className="font-black text-slate-950">بنسټیز معلومات</h2><p className="mt-1 text-xs text-slate-500">صحیح معلومات د حسابونو په پېژندنه کې مرسته کوي.</p></div></div></div>
      <div className="space-y-5 p-6">
        <label className="block text-sm font-bold text-slate-700"><span className="inline-flex items-center gap-2"><Building2 className="size-4 text-blue-500" /> نوم *</span><input required className={fieldClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label className="block text-sm font-bold text-slate-700"><span className="inline-flex items-center gap-2"><Phone className="size-4 text-emerald-500" /> موبایل</span><input dir="ltr" className={fieldClass} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
        <label className="block text-sm font-bold text-slate-700"><span className="inline-flex items-center gap-2"><Text className="size-4 text-violet-500" /> تشریح</span><textarea rows={4} className={fieldClass} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
      </div>
      <div className="flex justify-end border-t border-slate-100 bg-slate-50/70 px-6 py-4"><button disabled={update.isPending} className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white shadow-md hover:bg-blue-700 disabled:opacity-50"><Save className="size-4" />{update.isPending ? "ساتل کېږي…" : "بدلونونه ساتل"}</button></div>
    </form>
  </section>;
}
