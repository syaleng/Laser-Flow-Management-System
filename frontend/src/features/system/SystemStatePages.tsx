import { ArrowRight, Home, LockKeyhole, SearchX } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/auth-context";
import { defaultPathForUser } from "@/features/auth/permissions";

function StatePage({ denied = false }: { denied?: boolean }) {
  const navigate = useNavigate(); const { user } = useAuth();
  const home = defaultPathForUser(user);
  return <section dir="rtl" className="grid min-h-[65vh] place-items-center p-4 text-center"><div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-12 shadow-xl shadow-slate-200/60 sm:px-12"><div className={`absolute inset-x-0 top-0 h-1.5 ${denied ? "bg-gradient-to-l from-amber-400 to-orange-600" : "bg-gradient-to-l from-blue-500 to-indigo-700"}`} /><span className={`mx-auto grid size-20 place-items-center rounded-3xl ring-8 ${denied ? "bg-amber-50 text-amber-600 ring-amber-50/60" : "bg-blue-50 text-blue-600 ring-blue-50/60"}`}>{denied ? <LockKeyhole className="size-9" /> : <SearchX className="size-9" />}</span><p className={`mt-7 text-sm font-black ${denied ? "text-amber-600" : "text-blue-600"}`}>{denied ? "403 — محدود لاسرسی" : "404 — ناسم ادرس"}</p><h1 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">{denied ? "دې برخې ته صلاحیت نه لرئ" : "غوښتل شوې پاڼه پیدا نه شوه"}</h1><p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-slate-500">{denied ? "ستاسو Role ته د دې معلوماتو د لیدلو یا بدلولو اجازه نه ده ورکړل شوې. که اړتیا وي، له مالک سره اړیکه ونیسئ." : "کېدای شي ادرس ناسم وي یا پاڼه بل ځای ته انتقال شوې وي. اصلي برخې ته بېرته لاړ شئ."}</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Link to={home} className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white shadow-md hover:bg-blue-700"><Home className="size-4" /> اصلي برخې ته</Link><button type="button" onClick={() => navigate(-1)} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50"><ArrowRight className="size-4" /> شاته تلل</button></div></div></section>;
}

export function AccessDeniedPage() { return <StatePage denied />; }
export function NotFoundPage() { return <StatePage />; }
