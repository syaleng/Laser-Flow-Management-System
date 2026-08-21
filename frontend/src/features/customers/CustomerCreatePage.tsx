import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError } from "@/lib/api-client";

import type { CustomerFormValues } from "./customer-schema";
import { CustomerForm } from "./CustomerForm";
import { useCreateCustomer } from "./hooks";

export function CustomerCreatePage() {
  const navigate = useNavigate();
  const mutation = useCreateCustomer();
  const [error, setError] = useState<string | null>(null);

  const submit = async (values: CustomerFormValues) => {
    setError(null);
    try {
      const customer = await mutation.mutateAsync(values);
      navigate(`/customers/${customer.id}`, { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to create customer.");
    }
  };

  return (
    <section className="mx-auto max-w-4xl">
      <Link to="/customers" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
        <ArrowLeft className="size-4" /> Back to customers
      </Link>
      <div className="mb-7">
        <p className="text-sm font-semibold text-brand-600">NEW CUSTOMER</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Create customer</h1>
        <p className="mt-2 text-slate-500">Add contact details and record messaging consent accurately.</p>
      </div>
      <CustomerForm submitLabel="Create customer" cancelTo="/customers" serverError={error} onSubmit={submit} />
    </section>
  );
}

