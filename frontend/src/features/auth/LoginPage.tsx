import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardCheck, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, ScanLine, Settings2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import laserMachineImage from "@/assets/login/laser-machine-new.png";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api-client";

import { useAuth } from "./auth-context";
import { defaultPathForUser } from "./permissions";

const schema = z.object({
  email: z.string().trim().min(1, "Username ولیکئ."),
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

  if (user) return <Navigate to={defaultPathForUser(user)} replace />;

  const onSubmit = async (values: LoginForm) => {
    setServerError(null);
    try {
      await login(values);
      const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(destination ?? "/", { replace: true });
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Sign in failed. Please try again.");
    }
  };

  const inputClass = "h-14 w-full rounded-xl border border-slate-200 bg-slate-50 py-0 pl-12 pr-12 text-left text-sm text-slate-950 outline-none transition placeholder:text-left placeholder:text-sm placeholder:text-slate-400 hover:border-slate-300 focus:border-[#0A1F44] focus:bg-white focus:ring-4 focus:ring-[#0A1F44]/10";

  return (
    <main dir="ltr" className="min-h-screen overflow-x-hidden bg-white">
      <div className="grid min-h-screen w-full lg:grid-cols-2">
        <section className="flex min-h-screen items-center justify-center bg-gradient-to-br from-white via-white to-slate-50 px-5 py-10 text-left sm:px-10 lg:px-12 xl:px-20">
          <div className="w-full max-w-[430px]">
            <div className="mb-9">
              <div className="relative mb-5 grid size-16 place-items-center rounded-2xl border border-[#C9A227]/70 bg-[#0A1F44] text-white shadow-lg shadow-[#0A1F44]/15">
                <ScanLine className="size-8" strokeWidth={1.7} />
                <ClipboardCheck className="absolute right-0.5 top-1 size-5 text-[#E2BD46]" />
                <Settings2 className="absolute bottom-0.5 left-0.5 size-5 text-[#E2BD46]" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-[#0A1F44] sm:text-[2.15rem]">Bilal Ahmadzai</h1>
              <p className="mt-2 text-sm font-semibold tracking-wide text-[#B38A12]">Laser Dai Management System</p>
            </div>

            <section className="rounded-3xl border border-slate-200/80 bg-white p-6 text-left shadow-xl shadow-slate-900/[0.06] sm:p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight text-[#0A1F44]">Welcome back</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Enter your details to access your account.</p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} autoComplete="off" noValidate>
                <label className="block text-sm font-semibold text-slate-700">
                  <span className="mb-2 block">Username</span>
                  <span className="relative block">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                    <input dir="ltr" className={inputClass} type="text" placeholder="bilal" autoComplete="username" autoFocus aria-invalid={Boolean(errors.email)} {...register("email")} />
                  </span>
                  {errors.email && <span className="mt-1.5 block text-sm font-normal text-red-600">{errors.email.message}</span>}
                </label>

                <label className="block text-sm font-semibold text-slate-700">
                  <span className="mb-2 block">Password</span>
                  <span className="relative block">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                    <input dir="ltr" className={inputClass} type={showPassword ? "text" : "password"} placeholder="Password" autoComplete="current-password" aria-invalid={Boolean(errors.password)} {...register("password")} />
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

              <p className="mt-7 border-t border-slate-100 pt-5 text-center text-xs leading-5 text-slate-400">For account access or password help, contact the system owner.</p>
              <p className="developer-credit login-developer-credit mt-3 text-center text-xs text-slate-400">جوړونکی: نقیب الله سیال</p>
            </section>
          </div>
        </section>

        <section className="relative hidden min-h-screen overflow-hidden bg-[#07152f] lg:block" aria-label="Laser cutting machine">
          <img src={laserMachineImage} alt="Open compact laser cutting machine" className="absolute inset-0 size-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#07152f]/20 via-transparent to-[#07152f]/50" />
          <div className="absolute right-8 top-8 flex items-center gap-3 text-white xl:right-10 xl:top-10">
            <span className="grid size-11 place-items-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-md"><ScanLine className="size-5" /></span>
            <span dir="ltr" className="text-sm font-semibold tracking-[0.18em] uppercase">LaserFlow</span>
          </div>
          <div className="absolute bottom-10 left-10 max-w-sm text-left text-white xl:bottom-12 xl:left-12">
            <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-[#E2BD46]">Precision in every cut</p>
            <h2 className="text-3xl font-bold leading-tight xl:text-4xl">Smarter management for your workshop</h2>
            <p className="mt-4 text-sm text-white/75">Orders, customers, and production in one place</p>
          </div>
        </section>
      </div>
    </main>
  );
}
