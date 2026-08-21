import { ChevronLeft, ChevronRight, Plus, Search, Users } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { ApiError } from "@/lib/api-client";

import { useCustomers } from "./hooks";
import type { CustomerListParams } from "./types";

export function CustomersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const params = useMemo<CustomerListParams>(
    () => ({
      search: searchParams.get("search") ?? "",
      is_active: (searchParams.get("is_active") as "true" | "false" | null) ?? "true",
      whatsapp_consent:
        (searchParams.get("whatsapp_consent") as "true" | "false" | null) ?? "",
      ordering: searchParams.get("ordering") ?? "full_name",
      page: Number(searchParams.get("page") ?? 1),
      page_size: 20,
    }),
    [searchParams],
  );
  const customers = useCustomers(params);

  const setFilter = (name: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(name, value);
    else next.delete(name);
    next.delete("page");
    setSearchParams(next);
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setFilter("search", search.trim());
  };

  return (
    <section>
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-600">CUSTOMER ACCOUNTS</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Customers</h1>
          <p className="mt-2 text-slate-500">Manage contact details and WhatsApp consent.</p>
        </div>
        <Link
          to="/customers/new"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          <Plus className="size-4" /> Add customer
        </Link>
      </div>

      <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_180px_200px_190px]">
        <form className="relative" onSubmit={submitSearch}>
          <Search className="absolute left-3 top-3.5 size-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            placeholder="Search name, code or phone"
            aria-label="Search customers"
          />
        </form>
        <select
          className="rounded-xl border border-slate-300 px-3 py-3"
          value={params.is_active}
          onChange={(event) => setFilter("is_active", event.target.value)}
          aria-label="Customer status"
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Archived</option>
        </select>
        <select
          className="rounded-xl border border-slate-300 px-3 py-3"
          value={params.whatsapp_consent}
          onChange={(event) => setFilter("whatsapp_consent", event.target.value)}
          aria-label="WhatsApp consent"
        >
          <option value="">Any WhatsApp consent</option>
          <option value="true">Consent recorded</option>
          <option value="false">No consent</option>
        </select>
        <select
          className="rounded-xl border border-slate-300 px-3 py-3"
          value={params.ordering}
          onChange={(event) => setFilter("ordering", event.target.value)}
          aria-label="Sort customers"
        >
          <option value="full_name">Name A–Z</option>
          <option value="-full_name">Name Z–A</option>
          <option value="-created_at">Newest first</option>
          <option value="created_at">Oldest first</option>
        </select>
      </div>

      {customers.isLoading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          Loading customers…
        </div>
      )}

      {customers.isError && (
        <div role="alert" className="rounded-2xl bg-red-50 p-5 text-red-700">
          {customers.error instanceof ApiError
            ? customers.error.message
            : "Unable to load customers."}
        </div>
      )}

      {customers.data?.data.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Users className="mx-auto size-10 text-slate-300" />
          <h2 className="mt-4 font-semibold text-slate-900">No customers found</h2>
          <p className="mt-1 text-sm text-slate-500">
            Change the filters or add the shop’s first customer.
          </p>
        </div>
      )}

      {customers.data && customers.data.data.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Contact</th>
                  <th className="px-5 py-4">WhatsApp</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.data.data.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{customer.full_name}</p>
                      <p className="mt-1 text-xs text-slate-500">{customer.customer_code}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{customer.phone || "Not provided"}</td>
                    <td className="px-5 py-4">
                      <p className="text-slate-700">{customer.whatsapp_number || "Not provided"}</p>
                      <p className={customer.whatsapp_consent ? "text-xs text-emerald-600" : "text-xs text-slate-400"}>
                        {customer.whatsapp_consent ? "Consent recorded" : "No consent"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={customer.is_active ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700" : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"}>
                        {customer.is_active ? "Active" : "Archived"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link className="font-semibold text-brand-600 hover:text-brand-700" to={`/customers/${customer.id}`}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
            <p className="text-sm text-slate-500">
              {customers.data.meta.count} customer{customers.data.meta.count === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={!customers.data.meta.previous}
                onClick={() => setFilter("page", String(Math.max(1, params.page! - 1)))}
                className="rounded-lg border border-slate-300 p-2 disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-sm text-slate-600">
                Page {customers.data.meta.page} of {customers.data.meta.total_pages}
              </span>
              <button
                disabled={!customers.data.meta.next}
                onClick={() => setFilter("page", String(params.page! + 1))}
                className="rounded-lg border border-slate-300 p-2 disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

