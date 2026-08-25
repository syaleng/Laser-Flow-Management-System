import { ChevronLeft, ChevronRight, Plus, Search, Users } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { ApiError } from "@/lib/api-client";
import { primaryButtonClass } from "@/components/ui/Button";

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

  const setFilter = (name: string, value: string, resetPage = true) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(name, value);
    else next.delete(name);
    if (resetPage) next.delete("page");
    setSearchParams(next);
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setFilter("search", search.trim());
  };

  return (
    <section dir="rtl" className="text-right">
      <div className="mb-7 flex flex-col items-start gap-4 text-right">
        <div className="w-full text-right">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            د مشتريانو لېست
          </h1>
          <p className="mt-2 text-base leading-7 text-slate-500">
            د مشتريانو معلومات او اړیکې اداره کړئ.
          </p>
        </div>
        <Link
          to="/customers/new"
          className={`${primaryButtonClass} self-start`}
        >
          <Plus className="size-4" /> نوی مشتري اضافه کول
        </Link>
      </div>

      <div dir="rtl" className="mb-5 flex flex-col items-stretch gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-right shadow-sm lg:flex-row lg:items-end">
        <form className="lg:min-w-0 lg:flex-1" onSubmit={submitSearch}>
          <label className="block text-sm font-semibold text-slate-700">
            د مشتري لټون
            <span className="relative mt-2 block">
              <Search className="absolute right-3 top-3.5 size-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-xl border border-slate-300 py-3 pl-4 pr-10 font-normal outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                placeholder="نوم، شمېره یا کوډ ولیکئ"
                aria-label="د مشتري لټون"
              />
            </span>
          </label>
        </form>
        <label className="flex flex-col text-sm font-semibold text-slate-700 lg:w-[180px]">
          حالت
          <select
          className="mt-2 rounded-xl border border-slate-300 px-3 py-3 font-normal text-right outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          value={params.is_active}
          onChange={(event) => setFilter("is_active", event.target.value)}
          aria-label="حالت"
        >
          <option value="">ټول مشتريان</option>
          <option value="true">فعال مشتريان</option>
          <option value="false">پخواني مشتريان</option>
          </select>
        </label>
        <label className="flex flex-col text-sm font-semibold text-slate-700 lg:w-[200px]">
          WhatsApp
          <select
          className="mt-2 rounded-xl border border-slate-300 px-3 py-3 font-normal text-right outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          value={params.whatsapp_consent}
          onChange={(event) =>
            setFilter("whatsapp_consent", event.target.value)
          }
          aria-label="WhatsApp"
        >
          <option value="">ټول مشتريان</option>
          <option value="true">فعال WhatsApp</option>
          <option value="false">غیر فعال WhatsApp</option>
          </select>
        </label>
        <label className="flex flex-col text-sm font-semibold text-slate-700 lg:w-[190px]">
          ترتیب
          <select
          className="mt-2 rounded-xl border border-slate-300 px-3 py-3 font-normal text-right outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          value={params.ordering}
          onChange={(event) => setFilter("ordering", event.target.value)}
          aria-label="د مشتریانو ترتیب"
        >
          <option value="full_name">نوم (الف - ی)</option>
          <option value="-full_name">نوم (ی - الف)</option>
          <option value="-created_at">نوي مشتريان لومړی</option>
          <option value="created_at">زاړه مشتريان لومړی</option>
          </select>
        </label>
      </div>

      {customers.isLoading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          د مشتریانو لېست راځي…
        </div>
      )}

      {customers.isError && (
        <div role="alert" className="rounded-2xl bg-red-50 p-5 text-red-700">
          {customers.error instanceof ApiError
            ? customers.error.message
            : "د مشتریانو لېست را نه غی. بیا هڅه وکړئ."}
        </div>
      )}

      {customers.data?.data.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Users className="mx-auto size-10 text-slate-300" />
          <h2 className="mt-4 font-semibold text-slate-900">
            مشتري پیدا نه شو
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            فلټر بدل کړئ یا نوی مشتري اضافه کړئ.
          </p>
        </div>
      )}

      {customers.data && customers.data.data.length > 0 && (
        <div dir="rtl" className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-right shadow-sm">
          <div className="overflow-x-auto">
            <table dir="rtl" className="w-full text-right text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">مشتري</th>
                  <th className="px-5 py-4">اړیکه</th>
                  <th className="px-5 py-4">WhatsApp</th>
                  <th className="px-5 py-4">حالت</th>
                  <th className="px-5 py-4 text-left">عمل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.data.data.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {customer.full_name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {customer.customer_code}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {customer.phone || "نه ده لیکل شوې"}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-slate-700">
                        {customer.whatsapp_number || "نه ده لیکل شوې"}
                      </p>
                      <p
                        className={
                          customer.whatsapp_consent
                            ? "text-xs text-emerald-600"
                            : "text-xs text-slate-400"
                        }
                      >
                        {customer.whatsapp_consent
                          ? "اجازه ثبت شوې"
                          : "اجازه نشته"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={
                          customer.is_active
                            ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                            : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                        }
                      >
                        {customer.is_active ? "فعال" : "آرشیف شوی"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-left">
                      <Link
                        className="inline-flex min-h-9 items-center justify-center rounded-lg bg-brand-50 px-3 font-semibold text-brand-700 transition hover:bg-brand-100"
                        to={`/customers/${customer.id}`}
                      >
                        کتل
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div dir="rtl" className="flex flex-col items-start justify-between gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
            <p className="text-sm text-slate-500">
              ټول مشتریان: {customers.data.meta.count}
            </p>
            <div dir="rtl" className="flex items-center gap-2">
              <button
                disabled={!customers.data.meta.previous}
                onClick={() =>
                  setFilter("page", String(Math.max(1, params.page! - 1)), false)
                }
                className="rounded-lg border border-slate-300 p-2 disabled:opacity-40"
                aria-label="مخکینۍ پاڼه"
              >
                <ChevronRight className="size-4" />
              </button>
              <span className="text-sm text-slate-600">
                پاڼه {customers.data.meta.page} له{" "}
                {customers.data.meta.total_pages}
              </span>
              <button
                disabled={!customers.data.meta.next}
                onClick={() => setFilter("page", String(params.page! + 1), false)}
                className="rounded-lg border border-slate-300 p-2 disabled:opacity-40"
                aria-label="راتلونکې پاڼه"
              >
                <ChevronLeft className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
