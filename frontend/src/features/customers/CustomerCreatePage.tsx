import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/Page";
import { ApiError } from "@/lib/api-client";
import type { CustomerFormValues } from "./customer-schema";
import { CustomerForm } from "./CustomerForm";
import { useCreateCustomer } from "./hooks";

export function CustomerCreatePage() {
  const navigate = useNavigate(); const mutation = useCreateCustomer(); const [error, setError] = useState<string | null>(null);
  const submit = async (values: CustomerFormValues) => { setError(null); try { const customer = await mutation.mutateAsync(values); navigate(`/customers/${customer.id}`, { replace: true }); } catch (caught) { setError(caught instanceof ApiError ? caught.message : "نوی مشتري جوړ نه شو."); } };
  return <section dir="rtl" className="mx-auto max-w-4xl text-right"><PageHeader eyebrow="د مشتریانو مدیریت" title="نوی مشتري اضافه کول" description="د اړیکې او واتساپ معلومات په سمه توګه ثبت کړئ." actions={<Link to="/customers" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"><ArrowLeft className="size-4" /> لست ته بېرته</Link>} /><CustomerForm submitLabel="مشتري ثبتول" cancelTo="/customers" serverError={error} onSubmit={submit} /></section>;
}
