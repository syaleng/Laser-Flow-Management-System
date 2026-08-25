import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ApiError } from "@/lib/api-client";

import type { CustomerFormValues } from "./customer-schema";
import { CustomerForm } from "./CustomerForm";
import { useCustomer, useUpdateCustomer } from "./hooks";

export function CustomerEditPage() {
  const { customerId = "" } = useParams();
  const navigate = useNavigate();
  const customer = useCustomer(customerId);
  const mutation = useUpdateCustomer(customerId);
  const [error, setError] = useState<string | null>(null);

  if (customer.isLoading) return <div className="text-slate-500">معلومات راځي…</div>;
  if (!customer.data || customer.isError) {
    return <div role="alert" className="rounded-xl bg-red-50 p-5 text-red-700">د مشتري معلومات را نه غلل.</div>;
  }

  const submit = async (values: CustomerFormValues) => {
    setError(null);
    try {
      await mutation.mutateAsync(values);
      navigate(`/customers/${customerId}`, { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "د مشتري معلومات بدل نه شول.");
    }
  };

  return (
    <section className="mx-auto max-w-4xl">
      <Link to={`/customers/${customerId}`} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
        <ArrowLeft className="size-4" /> د مشتري معلوماتو ته بېرته
      </Link>
      <div className="mb-7">
        <p className="text-sm font-semibold text-brand-600">مشتري</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">د مشتري معلومات بدلول</h1>
        <p className="mt-2 text-slate-500">ضروري معلومات سم کړئ او بیا «بدلونونه ساتل» کېکاږئ.</p>
      </div>
      <CustomerForm
        defaultValues={{
          full_name: customer.data.full_name,
          phone: customer.data.phone,
          whatsapp_number: customer.data.whatsapp_number,
          whatsapp_consent: customer.data.whatsapp_consent,
          address: customer.data.address,
          notes: customer.data.notes,
        }}
        submitLabel="بدلونونه ساتل"
        cancelTo={`/customers/${customerId}`}
        serverError={error}
        onSubmit={submit}
      />
    </section>
  );
}
