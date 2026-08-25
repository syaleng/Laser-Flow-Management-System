import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { useCustomers } from "@/features/customers/hooks";
import { calculatePaymentStatus, designOrderSchema, type DesignOrderFormValues } from "./design-order-schema";

const inputClass = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-right font-normal text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
interface Props { defaultValues: DesignOrderFormValues; submitLabel: string; cancelTo: string; serverError?: string | null; isEditing?: boolean; onSubmit: (values: DesignOrderFormValues) => Promise<void>; }
function FieldError({ message }: { message?: string }) { return message ? <span className="mt-1 block text-sm text-red-600">{message}</span> : null; }

export function DesignOrderForm({ defaultValues, submitLabel, cancelTo, serverError, isEditing = false, onSubmit }: Props) {
  const [customerSearch, setCustomerSearch] = useState("");
  const customers = useCustomers({ search: customerSearch, is_active: "true", ordering: "full_name", page_size: 100 });
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<DesignOrderFormValues>({
    resolver: zodResolver(designOrderSchema),
    defaultValues,
    mode: "onBlur",
    reValidateMode: "onChange",
  });
  const quantity = watch("cut_quantity");
  const price = watch("unit_price");
  const paidAmount = watch("paid_amount");
  const total = (Number(quantity) || 0) * (Number(price) || 0);
  const remaining = Math.max(0, total - (Number(paidAmount) || 0));
  const calculatedPaymentStatus = calculatePaymentStatus(total, Number(paidAmount) || 0);

  useEffect(() => {
    setValue("payment_status", calculatedPaymentStatus, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [calculatedPaymentStatus, setValue]);

  return <form dir="rtl" className="space-y-7 rounded-2xl border border-slate-200 bg-white p-6 text-right shadow-sm" onSubmit={handleSubmit(onSubmit)} noValidate>
    <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900"><strong className="block">فرمایش په پنځو اسانه ګامونو ثبت کړئ</strong>مشتري وټاکئ، ډیزاین مشخص کړئ، شمېر او بیه ورکړئ، تادیه ثبت کړئ او نېټې وټاکئ.</div>
    <section className="rounded-2xl bg-slate-50 p-5"><h2 className="text-lg font-semibold text-slate-950"><span className="ml-2 inline-grid size-7 place-items-center rounded-full bg-brand-600 text-sm text-white">۱</span>مشتري وټاکئ</h2><p className="mt-1 text-sm text-slate-500">مشتري ولټوئ او بیا یې له لېست څخه وټاکئ.</p><div className="mt-4 grid gap-5 md:grid-cols-2">
      <label className="block text-sm font-semibold text-slate-700">د مشتري لټون<span className="relative block"><Search className="absolute right-3 top-5 size-4 text-slate-400" /><input className={`${inputClass} pr-10`} value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="د مشتري نوم، موبایل شمېره یا کوډ ولیکئ" /></span></label>
      <label className="block text-sm font-semibold text-slate-700">مشتري <span className="text-red-500">*</span><select className={inputClass} {...register("customer_id")}><option value="">مشتري وټاکئ</option>{(customers.data?.data ?? []).map((customer) => <option key={customer.id} value={customer.id}>{customer.full_name} · {customer.customer_code} · {customer.phone || "شمېره نشته"}</option>)}</select><FieldError message={errors.customer_id?.message} /></label>
    </div></section>

    <section className="rounded-2xl bg-slate-50 p-5"><h2 className="text-lg font-semibold text-slate-950"><span className="ml-2 inline-grid size-7 place-items-center rounded-full bg-brand-600 text-sm text-white">۲</span>د ډیزاین معلومات</h2><p className="mt-1 text-sm text-slate-500">د کار ډول، رنګ او اندازه مشخص کړئ.</p><div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
      <label className="text-sm font-semibold text-slate-700 lg:col-span-2">د ډیزاین نوم <span className="font-normal text-slate-400">(اختیاري)</span><input className={inputClass} {...register("design_name")} /><FieldError message={errors.design_name?.message} /></label>
      <label className="text-sm font-semibold text-slate-700">د ډیزاین ډول <span className="text-red-500">*</span><select className={inputClass} {...register("design_type")}><option value="JAR">جر</option><option value="SIMPLE">ساده</option></select><FieldError message={errors.design_type?.message} /></label>
      <label className="text-sm font-semibold text-slate-700">څو رنګه <span className="text-red-500">*</span><select className={inputClass} {...register("color_count")}><option value="1">1 رنګ</option><option value="2">2 رنګونه</option></select><FieldError message={errors.color_count?.message} /></label>
      <label className="text-sm font-semibold text-slate-700">د غمي سایز <span className="text-red-500">*</span><input type="number" min="1" list="gemstone-sizes" className={inputClass} {...register("gemstone_size", { valueAsNumber: true })} /><datalist id="gemstone-sizes"><option value="6" /><option value="10" /></datalist><span className="mt-1 block text-xs font-normal text-slate-500">6، 10 یا خپل سایز ولیکئ</span><FieldError message={errors.gemstone_size?.message} /></label>
      <label className="text-sm font-semibold text-slate-700">د باران سایز (mm) <span className="text-red-500">*</span><input type="number" min="0.01" step="0.01" placeholder="5 mm" className={inputClass} {...register("baran_size_mm", { valueAsNumber: true })} /><FieldError message={errors.baran_size_mm?.message} /></label>
      <label className="text-sm font-semibold text-slate-700 md:col-span-2 lg:col-span-4">د ډیزاین تشریح<textarea rows={3} className={inputClass} {...register("design_description")} /><FieldError message={errors.design_description?.message} /></label>
    </div></section>

    <section className="rounded-2xl bg-slate-50 p-5"><h2 className="text-lg font-semibold text-slate-950"><span className="ml-2 inline-grid size-7 place-items-center rounded-full bg-brand-600 text-sm text-white">۳</span>شمېر او بیه</h2><p className="mt-1 text-sm text-slate-500">سیستم ټول مقدار په اتومات ډول حسابوي.</p><div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
      <label className="text-sm font-semibold text-slate-700">شمېر <span className="text-red-500">*</span><input type="number" min="1" className={inputClass} {...register("cut_quantity", { valueAsNumber: true })} /><FieldError message={errors.cut_quantity?.message} /></label>
      <label className="text-sm font-semibold text-slate-700">بیه (AFN) <span className="text-red-500">*</span><input type="number" min="0.01" step="0.01" className={inputClass} {...register("unit_price", { valueAsNumber: true })} /><FieldError message={errors.unit_price?.message} /></label>
      <label className="text-sm font-semibold text-slate-700">د فرمایش حالت<select className={`${inputClass} pointer-events-none bg-slate-50 text-slate-600`} {...register("status")} aria-disabled="true" tabIndex={-1}><option value="NEW">نوی فرمایش</option><option value="DESIGN_PREPARATION">کار روان دی</option><option value="CUTTING">پرې کول روان دي</option><option value="READY_FOR_DELIVERY">بشپړ شوی</option><option value="DELIVERED">مشتري ته سپارل شوی</option><option value="CANCELLED">لغوه شوی</option></select><span className="mt-1 block text-xs font-normal text-slate-500">حالت د فرمایش له پاڼې څخه بدلېږي.</span></label>
    </div></section>

    <section className="border-t border-slate-100 pt-6"><h2 className="text-lg font-semibold text-slate-950">د تادیې معلومات</h2><p className="mt-1 text-sm text-slate-500">د ورځني حساب لپاره ټولې، ورکړل شوې او پاتې پیسې.</p><div className="mt-4 grid gap-5 md:grid-cols-3">
      <div className="flex min-h-28 h-full flex-col justify-between rounded-xl bg-slate-950 p-4 text-white shadow-sm"><p className="text-xs font-semibold text-slate-400">ټول مقدار (AFN)</p><p dir="ltr" className="mt-3 text-right text-2xl font-bold tracking-tight">{total.toLocaleString()} AFN</p></div>
      <label className="text-sm font-semibold text-slate-700">ورکړل شوې پیسې (AFN) <span className="text-red-500">*</span><input type="number" min="0" step="0.01" readOnly={isEditing} className={`${inputClass} ${isEditing ? "cursor-not-allowed bg-slate-50 text-slate-600" : ""}`} {...register("paid_amount", { valueAsNumber: true })} /><FieldError message={errors.paid_amount?.message} />{isEditing && <span className="mt-1 block text-xs font-normal text-slate-500">نوې پیسې د فرمایش په پاڼه کې د «تادیه ثبتول» له لارې ثبت کړئ.</span>}</label>
      <div className={`flex min-h-28 h-full flex-col justify-between rounded-xl border p-4 shadow-sm transition-colors ${remaining === 0 ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}><div className="flex items-center justify-between gap-3"><p className={`text-xs font-semibold ${remaining === 0 ? "text-emerald-700" : "text-amber-700"}`}>پاتې پیسې (AFN)</p><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${remaining === 0 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{remaining === 0 ? "حساب تصفیه شوی" : "لاپاتي دي"}</span></div><p dir="ltr" className={`mt-3 text-right text-2xl font-bold tracking-tight ${remaining === 0 ? "text-emerald-900" : "text-amber-900"}`}>{remaining.toLocaleString()} AFN</p></div>
    </div><label className="mt-5 block max-w-sm text-sm font-semibold text-slate-700">د تادیې حالت <span className="text-red-500">*</span><select className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-600`} {...register("payment_status")} aria-readonly="true"><option value="CASH" disabled>نغدي</option><option value="CREDIT" disabled={calculatedPaymentStatus !== "CREDIT"}>قرضه</option><option value="PARTIAL" disabled={calculatedPaymentStatus !== "PARTIAL"}>نیمه ورکړه</option><option value="FULLY_PAID" disabled={calculatedPaymentStatus !== "FULLY_PAID"}>بشپړه ورکړه</option></select><FieldError message={errors.payment_status?.message} /><span className="mt-1 block text-xs font-normal text-slate-500">د تادیې حالت د ورکړل شوو پیسو له مخې په اتومات ډول ټاکل کېږي.</span></label></section>

    <section className="border-t border-slate-100 pt-6"><h2 className="text-lg font-semibold text-slate-950">نېټې</h2><div className="mt-4 grid gap-5 md:grid-cols-2"><label className="text-sm font-semibold text-slate-700">د فرمایش نېټه <span className="text-red-500">*</span><input type="date" className={inputClass} {...register("order_date")} /><FieldError message={errors.order_date?.message} /></label><label className="text-sm font-semibold text-slate-700">د سپارلو نېټه <span className="text-red-500">*</span><input type="date" className={inputClass} {...register("expected_delivery_date")} /><FieldError message={errors.expected_delivery_date?.message} /></label></div></section>
    <label className="block border-t border-slate-100 pt-6 text-sm font-semibold text-slate-700">نوټ<textarea className={inputClass} rows={3} {...register("notes")} /><FieldError message={errors.notes?.message} /></label>
    {serverError && <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</div>}
    <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-start"><Link to={cancelTo} className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2">بیرته</Link><Button type="submit" disabled={isSubmitting}>{isSubmitting && <LoaderCircle className="ml-2 size-4 animate-spin" />}{submitLabel}</Button></div>
  </form>;
}
