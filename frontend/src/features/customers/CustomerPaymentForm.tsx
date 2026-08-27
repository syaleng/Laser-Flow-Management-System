import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/Button";

export const paymentSchema = z.object({
  amount: z.coerce.number({ message: "مقدار ولیکئ" }).positive("مقدار باید له صفر څخه زیات وي"),
  payment_date: z.string().min(1, "د تادیې نېټه وټاکئ"),
  description: z.string().max(255, "تشریح ډېره اوږده ده"),
});

type PaymentFormValues = z.output<typeof paymentSchema>;

export function CustomerPaymentForm({
  onSubmit,
  onCancel,
  serverError,
}: {
  onSubmit: (values: PaymentFormValues) => Promise<void>;
  onCancel: () => void;
  serverError?: string | null;
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<
    z.input<typeof paymentSchema>,
    unknown,
    PaymentFormValues
  >({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: 0, payment_date: new Date().toISOString().slice(0, 10), description: "" },
  });

  return (
    <form dir="rtl" className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm font-semibold text-slate-700">مقدار <span className="text-red-500">*</span>
          <input className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-emerald-500" type="number" min="0.01" step="0.01" inputMode="decimal" {...register("amount")} />
          {errors.amount && <span className="mt-1 block text-xs text-red-600">{errors.amount.message}</span>}
        </label>
        <label className="text-sm font-semibold text-slate-700">د تادیې نېټه
          <input className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-emerald-500" type="date" {...register("payment_date")} />
          {errors.payment_date && <span className="mt-1 block text-xs text-red-600">{errors.payment_date.message}</span>}
        </label>
        <label className="text-sm font-semibold text-slate-700">تشریح (اختیاري)
          <input className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-emerald-500" placeholder="لکه نغدي تادیه" {...register("description")} />
          {errors.description && <span className="mt-1 block text-xs text-red-600">{errors.description.message}</span>}
        </label>
      </div>
      {serverError && <div role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</div>}
      <div className="mt-4 flex gap-2">
        <Button type="submit" disabled={isSubmitting}>{isSubmitting && <LoaderCircle className="mr-2 size-4 animate-spin" />}تادیه ثبتول</Button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 font-semibold text-slate-700">لغوه</button>
      </div>
    </form>
  );
}