import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardCheck, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, ScanLine, Settings2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import laserDieImage from "@/assets/login/laser-die.webp";
import laserMachineImage from "@/assets/login/laser-cutting-machine.webp";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api-client";

import { useAuth } from "./auth-context";

const schema = z.object({
  email: z.string().trim().min(1, "Enter your email or username."),
  password: z.string().min(1, "Enter your password."),
});
type LoginForm = z.infer<typeof schema>;

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
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
      setServerError(error instanceof ApiError ? error.message : "Sign in failed. Please try again.");
    }
  };

  const inputClass = "h-14 w-full rounded-xl border border-slate-200 bg-slate-50 py-0 pl-12 pr-12 text-left text-sm text-slate-950 outline-none transition placeholder:text-left placeholder:text-sm placeholder:text-slate-400 hover:border-slate-300 focus:border-[#0A1F44] focus:bg-white focus:ring-4 focus:ring-[#0A1F44]/10";

  return (
    <main dir="ltr" className="min-h-screen bg-[#07152f] lg:p-0">
      <div className="mx-auto grid min-h-screen w-full bg-white lg:grid-cols-[42%_58%]">
        <section className="order-2 flex items-center justify-center bg-white px-6 py-12 text-left sm:px-14 lg:order-1 lg:px-14 xl:px-24">
          <div className="w-full max-w-[430px]">
            <div className="mb-8 text-center">
              <div className="relative mx-auto mb-5 grid size-20 place-items-center rounded-full border-2 border-[#C9A227] bg-[#0A1F44] text-white shadow-lg shadow-[#0A1F44]/20">
                <ScanLine className="size-10" strokeWidth={1.7} />
                <ClipboardCheck className="absolute right-1 top-2 size-6 text-[#C9A227]" />
                <Settings2 className="absolute bottom-1 left-1 size-6 text-[#C9A227]" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-[#0A1F44] sm:text-4xl">Bilal Ahmadzai</h1>
              <p className="mt-2 text-base font-semibold text-[#C9A227]">Laser Die Management System</p>
            </div>

            <section className="rounded-2xl border border-slate-100 bg-white p-1 text-left">
              <div className="mb-7">
                <h2 className="text-2xl font-bold text-[#0A1F44]">Welcome back</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Enter your details to access your account.</p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} autoComplete="off" noValidate>
                <label className="block text-sm font-semibold text-slate-700">
                  <span className="mb-2 block">Email / Username</span>
                  <span className="relative block">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                    <input dir="ltr" className={inputClass} type="email" placeholder="Email / Username" autoComplete="off" autoFocus aria-invalid={Boolean(errors.email)} {...register("email")} />
                  </span>
                  {errors.email && <span className="mt-1.5 block text-sm font-normal text-red-600">{errors.email.message}</span>}
                </label>

                <label className="block text-sm font-semibold text-slate-700">
                  <span className="mb-2 block">Password</span>
                  <span className="relative block">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                    <input dir="ltr" className={inputClass} type={showPassword ? "text" : "password"} placeholder="Password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} {...register("password")} />
                    <button type="button" className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-200 hover:text-[#0A1F44] focus:outline-none focus:ring-2 focus:ring-[#C9A227]" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>
                      {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </span>
                  {errors.password && <span className="mt-1.5 block text-sm font-normal text-red-600">{errors.password.message}</span>}
                </label>

                {serverError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">{serverError}</div>}

                <Button className="h-14 w-full bg-[#0A1F44] text-base shadow-lg shadow-[#0A1F44]/20 hover:bg-[#122f61] focus:ring-[#C9A227]" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <><LoaderCircle className="size-5 animate-spin" />Signing in...</> : <>Sign in</>}
                </Button>
              </form>

              <p className="mt-7 text-center text-xs leading-5 text-slate-400">For account access or password help, contact the system owner.</p>
            </section>
          </div>
        </section>

        <section className="order-1 relative min-h-[340px] overflow-hidden bg-[#07152f] lg:order-2 lg:min-h-screen" aria-label="Laser cutting machine">
          <img src={laserMachineImage} alt="Laser cutting machine" className="absolute inset-0 size-full object-cover object-center lg:object-[center_58%]" />
          <div className="absolute inset-0 bg-gradient-to-l from-[#07152f]/5 via-transparent to-[#07152f]/55" />
          <div className="absolute right-7 top-7 flex items-center gap-3 text-white sm:right-10 sm:top-10">
            <span className="grid size-11 place-items-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-md"><ScanLine className="size-5" /></span>
            <span dir="ltr" className="text-sm font-semibold tracking-[0.18em] uppercase">LaserFlow</span>
          </div>
          <div className="absolute bottom-8 right-7 max-w-sm text-left text-white sm:bottom-10 sm:right-10">
            <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-[#E2BD46]">Precision in every cut</p>
            <h2 className="text-2xl font-bold leading-tight sm:text-4xl">Smarter management for your workshop</h2>
            <div className="mt-5 flex items-center justify-end gap-3 text-sm text-white/75">
              <span>Orders, customers, and production in one place</span>
              <img src={laserDieImage} alt="" className="size-10 rounded-lg border border-white/20 bg-white/10 object-contain p-1" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
