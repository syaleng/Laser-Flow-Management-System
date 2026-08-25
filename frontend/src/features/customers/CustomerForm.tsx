import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/Button";

import { customerSchema, type CustomerFormValues } from "./customer-schema";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

interface CustomerFormProps {
  defaultValues?: CustomerFormValues;
  submitLabel: string;
  cancelTo: string;
  serverError?: string | null;
  onSubmit: (values: CustomerFormValues) => Promise<void>;
}

export function CustomerForm({
  defaultValues,
  submitLabel,
  cancelTo,
  serverError,
  onSubmit,
}: CustomerFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: defaultValues ?? {
      full_name: "",
      phone: "",
      whatsapp_number: "",
      whatsapp_consent: false,
      address: "",
      notes: "",
    },
  });

  return (
    <form
      dir="rtl"
      className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 text-right shadow-sm sm:p-7"
      onSubmit={handleSubmit((values) => onSubmit(values))}
      noValidate
    >
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
        <strong className="block">څنګه یې ډک کړئ؟</strong>
        یوازې د ستوري (*) لرونکي معلومات ضروري دي. نور معلومات که نه لرئ، تش یې پرېږدئ.
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700 md:col-span-2">
          بشپړ نوم <span className="text-red-500">*</span>
          <input className={inputClass} autoComplete="name" placeholder="لکه: احمد خان" {...register("full_name")} />
          {errors.full_name && (
            <span className="mt-1 block text-sm text-red-600">{errors.full_name.message}</span>
          )}
        </label>

        <label className="block text-sm font-medium text-slate-700">
          د موبایل شمېره <span className="text-red-500">*</span>
          <input
            className={inputClass}
            inputMode="tel"
            autoComplete="tel"
            placeholder="0700 123 456"
            {...register("phone")}
          />
          {errors.phone && (
            <span className="mt-1 block text-sm text-red-600">{errors.phone.message}</span>
          )}
        </label>

        <label className="block text-sm font-medium text-slate-700">
          WhatsApp شمېره
          <input
            className={inputClass}
            inputMode="tel"
            placeholder="+93 700 123 456"
            {...register("whatsapp_number")}
          />
          {errors.whatsapp_number && (
            <span className="mt-1 block text-sm text-red-600">
              {errors.whatsapp_number.message}
            </span>
          )}
        </label>
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
        <input
          type="checkbox"
          className="mt-1 size-4 rounded border-slate-300 text-brand-600"
          {...register("whatsapp_consent")}
        />
        <span>
          <span className="block text-sm font-semibold text-slate-900">
            د WhatsApp خبرتیا اجازه
          </span>
          <span className="mt-1 block text-sm leading-5 text-slate-600">
            فعال یې کړئ که مشتري غواړي د WhatsApp له لارې خبرتیاوې ترلاسه کړي.
          </span>
        </span>
      </label>

      <label className="block text-sm font-medium text-slate-700">
        پته
        <textarea className={inputClass} rows={3} {...register("address")} />
        {errors.address && (
          <span className="mt-1 block text-sm text-red-600">{errors.address.message}</span>
        )}
      </label>

      <label className="block text-sm font-medium text-slate-700">
        یادښت
        <textarea className={inputClass} rows={4} placeholder="د مشتري په اړه اړین معلومات (اختیاري)" {...register("notes")} />
        {errors.notes && (
          <span className="mt-1 block text-sm text-red-600">{errors.notes.message}</span>
        )}
      </label>

      {serverError && (
        <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-start">
        <Link
          to={cancelTo}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 font-semibold text-slate-700 hover:bg-slate-50"
        >
          لغوه کول
        </Link>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <LoaderCircle className="mr-2 size-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
