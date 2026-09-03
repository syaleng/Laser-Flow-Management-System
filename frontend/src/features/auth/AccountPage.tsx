import { CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/Page";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "./auth-context";
import { changePassword } from "./auth-service";

const roleInfo = {
  OWNER: { label: "مالک", detail: "ټول سیسټم ته بشپړ لاسرسی", permissions: ["کاروونکي", "مشتریان", "فرمایشونه", "تادیات", "ورځنی حساب", "راپورونه", "Backup"] },
  MANAGER: { label: "مدیر", detail: "د ورځنیو او مالي چارو مدیریت", permissions: ["مشتریان", "فرمایشونه", "تادیات", "ورځنی حساب", "راپورونه"] },
  OPERATOR: { label: "کارکوونکی", detail: "د مشتریانو او فرمایشونو چارې", permissions: ["مشتریان", "فرمایشونه"] },
  VIEWER: { label: "کتونکی", detail: "یوازې د راپورونو لیدل", permissions: ["راپورونه"] },
} as const;
const inputClass = "mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 pl-12 text-left outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export function AccountPage() {
  const { user, logout } = useAuth(); const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState(""); const [newPassword, setNewPassword] = useState(""); const [confirmPassword, setConfirmPassword] = useState(""); const [show, setShow] = useState(false); const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  if (!user) return null;
  const info = roleInfo[user.role]; const username = user.email.split("@")[0] ?? user.email;
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setError(""); if (newPassword.length < 8) { setError("نوی Password باید لږ تر لږه ۸ توري ولري."); return; } if (newPassword !== confirmPassword) { setError("دواړه نوي Passwordونه یو شان نه دي."); return; } setPending(true); try { await changePassword(currentPassword, newPassword); await logout(); navigate("/login", { replace: true }); } catch (caught) { setError(caught instanceof ApiError ? caught.message : "Password بدل نه شو."); } finally { setPending(false); } };
  return <section dir="rtl" className="text-right"><PageHeader eyebrow="شخصي تنظیمات" title="زما حساب" description="خپل حساب، Role، صلاحیتونه او Password په خوندي ډول اداره کړئ." />
    <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="bg-gradient-to-l from-[#0a2148] to-blue-700 p-6 text-white"><div className="flex items-center gap-4"><span className="grid size-16 place-items-center rounded-2xl bg-white/10 text-xl font-black ring-1 ring-white/20">{user.full_name.slice(0,2).toUpperCase()}</span><div><h2 className="text-xl font-black">{user.full_name}</h2><p dir="ltr" className="mt-1 text-right text-sm text-blue-100">@{username}</p></div></div></div><div className="space-y-4 p-6"><Info label="Username" value={username} /><Info label="Email" value={user.email} ltr /><Info label="د اړیکې شمېره" value={user.phone || "شمېره نشته"} /><Info label="د حساب حالت" value={user.is_active ? "فعال" : "غیرفعال"} /><div className="rounded-2xl border border-blue-100 bg-blue-50 p-4"><div className="flex items-center gap-2"><ShieldCheck className="size-5 text-blue-600" /><strong className="text-blue-950">{info.label}</strong></div><p className="mt-1 text-xs text-blue-700">{info.detail}</p><div className="mt-3 flex flex-wrap gap-1.5">{info.permissions.map((item) => <span key={item} className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-blue-700 shadow-sm">{item}</span>)}</div></div></div></article>
      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-5"><span className="grid size-12 place-items-center rounded-xl bg-amber-50 text-amber-600"><KeyRound className="size-6" /></span><div><h2 className="text-lg font-black">Password بدلول</h2><p className="mt-1 text-xs text-slate-500">له بدلولو وروسته به د امنیت لپاره بیا Login کوئ.</p></div></div>{error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}<form onSubmit={submit} className="space-y-4"><PasswordField label="اوسنی Password" value={currentPassword} onChange={setCurrentPassword} show={show} /><PasswordField label="نوی Password" value={newPassword} onChange={setNewPassword} show={show} /><PasswordField label="نوی Password بیا ولیکئ" value={confirmPassword} onChange={setConfirmPassword} show={show} /><button type="button" onClick={() => setShow(!show)} className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600">{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}{show ? "Password پټول" : "Password ښکاره کول"}</button><div className="rounded-xl bg-slate-50 p-3 text-xs leading-6 text-slate-500"><CheckCircle2 className="ml-1 inline size-4 text-emerald-500" />لږ تر لږه ۸ توري وکاروئ او داسې Password وټاکئ چې بل څوک یې اټکل نه کړي.</div><button disabled={pending} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 font-black text-white shadow-md hover:bg-blue-700 disabled:opacity-50"><LockKeyhole className="size-5" />{pending ? "بدلېږي…" : "Password بدلول"}</button></form></article>
    </div>
  </section>;
}

function Info({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) { return <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3"><span className="text-xs font-bold text-slate-500">{label}</span><strong dir={ltr ? "ltr" : undefined} className="text-sm text-slate-900">{value}</strong></div>; }
function PasswordField({ label, value, onChange, show }: { label: string; value: string; onChange: (value: string) => void; show: boolean }) { return <label className="block text-sm font-bold text-slate-700">{label}<span className="relative block"><input required minLength={label === "اوسنی Password" ? 1 : 8} type={show ? "text" : "password"} dir="ltr" value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} /><LockKeyhole className="absolute left-4 top-6 size-4 text-slate-400" /></span></label>; }

export default AccountPage;
