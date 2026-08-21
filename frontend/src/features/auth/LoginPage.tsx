import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, ScanLine } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api-client";

import { useAuth } from "./auth-context";

const schema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
type LoginForm = z.infer<typeof schema>;

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  if (user) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (values: LoginForm) => {
    setServerError(null);
    try {
      await login(values);
      const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(destination ?? "/dashboard", { replace: true });
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Unable to sign in. Please try again.");
    }
  };

  return (
    <main className="grid min-h-screen bg-slate-950 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="hidden overflow-hidden bg-[radial-gradient(circle_at_20%_20%,#2563eb_0,transparent_36%),radial-gradient(circle_at_80%_80%,#0891b2_0,transparent_30%)] p-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3 text-xl font-bold"><ScanLine /> LaserFlow</div>
        <div className="max-w-xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">Built for laser cutting shops</p>
          <h1 className="text-5xl font-semibold leading-tight">Every job, payment, and customer balance in one clear workflow.</h1>
          <p className="mt-6 text-lg leading-8 text-slate-300">From the first design to final delivery and payment, LaserFlow keeps the shop organized.</p>
        </div>
        <p className="text-sm text-slate-400">LaserFlow Management System</p>
      </section>

      <section className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 text-xl font-bold text-slate-950 lg:hidden"><ScanLine className="text-brand-600" /> LaserFlow</div>
          <p className="text-sm font-semibold text-brand-600">WELCOME BACK</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Sign in to your shop</h2>
          <p className="mt-2 text-slate-500">Use your authorized LaserFlow account.</p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            <label className="block text-sm font-medium text-slate-700">
              Email address
              <input className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100" type="email" autoComplete="email" {...register("email")} />
              {errors.email && <span className="mt-1 block text-sm text-red-600">{errors.email.message}</span>}
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Password
              <input className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100" type="password" autoComplete="current-password" {...register("password")} />
              {errors.password && <span className="mt-1 block text-sm text-red-600">{errors.password.message}</span>}
            </label>
            {serverError && <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</div>}
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircle className="mr-2 size-4 animate-spin" />}
              Sign in
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}

