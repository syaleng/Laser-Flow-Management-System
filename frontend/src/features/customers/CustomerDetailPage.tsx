import { Archive, ArrowLeft, Edit3, MessageCircle, RotateCcw } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api-client";

import { useCustomer, useSetCustomerArchived } from "./hooks";

function formatDate(value: string | null): string {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function CustomerDetailPage() {
  const { customerId = "" } = useParams();
  const customer = useCustomer(customerId);
  const archiveMutation = useSetCustomerArchived(customerId);

  if (customer.isLoading) return <div className="text-slate-500">Loading customer…</div>;
  if (customer.isError || !customer.data) {
    return (
      <div role="alert" className="rounded-xl bg-red-50 p-5 text-red-700">
        {customer.error instanceof ApiError ? customer.error.message : "Customer not found."}
      </div>
    );
  }

  const data = customer.data;
  const changeArchiveState = async () => {
    const action = data.is_active ? "archive" : "restore";
    if (data.is_active && !window.confirm("Archive this customer? Their history will remain available.")) return;
    try {
      await archiveMutation.mutateAsync(action === "archive");
    } catch {
      // The mutation error is rendered below with the normalized API message.
    }
  };

  return (
    <section>
      <Link to="/customers" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
        <ArrowLeft className="size-4" /> Back to customers
      </Link>

      <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">{data.full_name}</h1>
            <span className={data.is_active ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700" : "rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600"}>
              {data.is_active ? "Active" : "Archived"}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">{data.customer_code}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to={`/customers/${data.id}/edit`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50">
            <Edit3 className="size-4" /> Edit
          </Link>
          <Button
            className={data.is_active ? "bg-slate-700 hover:bg-slate-800" : "bg-emerald-600 hover:bg-emerald-700"}
            onClick={() => void changeArchiveState()}
            disabled={archiveMutation.isPending}
          >
            {data.is_active ? <Archive className="mr-2 size-4" /> : <RotateCcw className="mr-2 size-4" />}
            {data.is_active ? "Archive" : "Restore"}
          </Button>
        </div>
      </div>

      {archiveMutation.isError && (
        <div role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {archiveMutation.error instanceof ApiError ? archiveMutation.error.message : "Unable to update customer status."}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Contact information</h2>
          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Phone</dt><dd className="mt-1 text-slate-900">{data.phone || "Not provided"}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">WhatsApp</dt><dd className="mt-1 text-slate-900">{data.whatsapp_number || "Not provided"}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Address</dt><dd className="mt-1 whitespace-pre-wrap text-slate-900">{data.address || "Not provided"}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notes</dt><dd className="mt-1 whitespace-pre-wrap text-slate-900">{data.notes || "No notes"}</dd></div>
          </dl>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><MessageCircle className="size-5" /></div><div><h2 className="font-semibold text-slate-950">WhatsApp consent</h2><p className="text-sm text-slate-500">Messaging permission record</p></div></div>
          <div className={data.whatsapp_consent ? "mt-6 rounded-xl bg-emerald-50 p-4" : "mt-6 rounded-xl bg-amber-50 p-4"}>
            <p className={data.whatsapp_consent ? "font-semibold text-emerald-800" : "font-semibold text-amber-800"}>{data.whatsapp_consent ? "Consent recorded" : "Consent not recorded"}</p>
            <p className="mt-1 text-sm text-slate-600">{data.whatsapp_consent ? `Recorded ${formatDate(data.whatsapp_consent_at)}` : "Automated reminders must not be sent to this customer."}</p>
          </div>
        </article>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {["Design orders", "Payments", "Outstanding balance"].map((title) => (
          <article key={title} className="rounded-2xl border border-dashed border-slate-300 bg-white p-6">
            <h2 className="font-semibold text-slate-900">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Available when the related approved business module is implemented. No financial value is estimated in Phase 2A.</p>
          </article>
        ))}
      </div>
    </section>
  );
}
