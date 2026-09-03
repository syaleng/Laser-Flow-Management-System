import {
  BarChart3,
  Bell,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  CircleUserRound,
  Clock3,
  Code2,
  DatabaseBackup,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Menu,
  ReceiptText,
  ScanLine,
  Users,
  UserCog,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { twMerge } from "tailwind-merge";

import { useAuth } from "@/features/auth/auth-context";
import type { Permission } from "@/features/auth/permissions";
import { useOverdueDebtReminders } from "@/features/design-orders/hooks";

interface NavigationItem {
  label: string;
  description: string;
  to: string;
  icon: typeof LayoutDashboard;
  permission?: Permission;
}

const navigation: NavigationItem[] = [
  { label: "عمومي مالي حالت", description: "د دوکان لنډ او مهم حساب", to: "/dashboard", icon: LayoutDashboard, permission: "view_reports" },
  { label: "مشتریان", description: "نومونه، اړیکې او پاتې حساب", to: "/customers", icon: Users, permission: "manage_customers" },
  {
    label: "ډیزاین فرمایشونه",
    description: "نوی کار، حالت او سپارل",
    to: "/design-orders",
    icon: ScanLine,
    permission: "manage_design_orders",
  },
  { label: "ترلاسه شوې پیسې", description: "د مشتریانو ورکړې", to: "/payments", icon: CircleDollarSign, permission: "manage_payments" },
  { label: "ورځنی حساب کتاب", description: "لګښت، پور او ورځنۍ راکړه ورکړه", to: "/expenses", icon: ReceiptText, permission: "manage_expenses" },
  { label: "عرضه کوونکو ته پاتې پیسې", description: "هغه پیسې چې دوکان یې باید ورکړي", to: "/suppliers", icon: WalletCards, permission: "manage_expenses" },
  { label: "تفصیلي راپورونه", description: "چاڼ، پرتله، چاپ او CSV", to: "/reports", icon: BarChart3, permission: "view_reports" },
  { label: "Backup او Restore", description: "د سیستم معلومات خوندي او بېرته راګرځول", to: "/backups", icon: DatabaseBackup, permission: "manage_backups" },
  { label: "د کاروونکو مدیریت", description: "کاروونکي، Role او Password اداره کړئ", to: "/users", icon: UserCog, permission: "manage_users" },
  { label: "زما حساب", description: "شخصي معلومات او Password", to: "/account", icon: CircleUserRound },
];

const pashtoWeekdays = ["یکشنبه", "دوشنبه", "سې‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];
const pashtoMonths = [
  "جنوري", "فبروري", "مارچ", "اپرېل", "مې", "جون",
  "جولای", "اګست", "سپتمبر", "اکتوبر", "نومبر", "ډسمبر",
];

function toPashtoDigits(value: number): string {
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".charAt(Number(digit)));
}

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const { user, logout, hasPermission } = useAuth();
  const canSeeDebtReminders = user?.role === "OWNER" || user?.role === "MANAGER";
  const debtReminders = useOverdueDebtReminders(canSeeDebtReminders);
  const roleLabels = {
    OWNER: "مالک",
    MANAGER: "مدیر",
    OPERATOR: "کارکوونکی",
    VIEWER: "کتونکی",
  } as const;
  const visibleNavigation = navigation.filter(
    ({ permission }) => !permission || hasPermission(permission),
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const currentDate = `${pashtoWeekdays[now.getDay()]}، د ${pashtoMonths[now.getMonth()]} ${toPashtoDigits(now.getDate())}، ${toPashtoDigits(now.getFullYear())}`;
  const currentTime = new Intl.DateTimeFormat("ps-AF", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(now);

  const sidebar = (
    <div className="flex h-full flex-col text-right" dir="rtl">
      <div className="flex min-h-28 items-center gap-4 border-b border-slate-800/80 px-5 pb-5 pt-6">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-blue-400/20 bg-gradient-to-br from-brand-600/30 to-blue-400/10 text-blue-400 shadow-lg shadow-black/20">
          <ScanLine className="size-7" strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[1.35rem] font-extrabold leading-8 tracking-tight text-white">
            بلال احمدزی
          </p>
          <p className="mt-1 truncate text-xs font-medium leading-5 text-slate-400">
            د لیزر ډیزاین مرکز
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 px-3 py-5">
        {visibleNavigation.map(({ label, description, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              twMerge(
                "group relative flex min-h-14 items-center gap-3 rounded-2xl px-4 py-3 text-slate-300 transition-[background-color,color,transform] duration-200 hover:translate-x-0.5 hover:bg-slate-800 hover:text-white",
                isActive && "bg-brand-600/90 text-white shadow-lg shadow-brand-950/30 ring-1 ring-blue-400/30 hover:bg-brand-600 before:absolute before:right-0 before:top-3 before:h-8 before:w-1 before:rounded-l-full before:bg-blue-300",
              )
            }
          >
            <Icon className="size-5 shrink-0" />
            <span className="min-w-0"><span className="block text-sm font-bold">{label}</span><span className="mt-0.5 block truncate text-[11px] font-normal text-slate-400 group-[.active]:text-blue-100">{description}</span></span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="mb-3 px-3">
          <p className="truncate text-sm font-semibold text-white">{user?.full_name}</p>
          <p className="mt-1 truncate text-xs text-slate-400">
            {user ? roleLabels[user.role] : ""}
          </p>
        </div>
        <button
          onClick={() => void logout()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          <LogOut className="size-4 shrink-0" />
          <span>وتل</span>
        </button>
        <p className="developer-credit mt-4 px-3 text-center text-[11px] text-slate-500">جوړونکی: نقیب الله سیال</p>
      </div>
    </div>
  );

  return (
    <div className="app-frame min-h-screen bg-slate-50">
      <aside className="sidebar-scroll fixed inset-y-0 right-0 z-30 hidden w-64 overflow-y-auto bg-slate-950 text-white lg:block">
        {sidebar}
      </aside>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={twMerge(
          "sidebar-scroll fixed inset-y-0 right-0 z-50 w-72 translate-x-full overflow-y-auto bg-slate-950 text-white transition lg:hidden",
          open && "translate-x-0",
        )}
      >
        <button
          className="absolute left-4 top-5 z-10 rounded-lg p-1 text-slate-300 hover:bg-slate-800 hover:text-white"
          onClick={() => setOpen(false)}
          aria-label="مینو بندول"
        >
          <X />
        </button>
        {sidebar}
      </aside>
      <div className="lg:pr-64">
        <header
          role="banner"
          className="sticky top-0 z-20 flex min-h-24 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 py-3 shadow-[0_6px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:px-8 before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-gradient-to-l before:from-blue-700 before:via-indigo-500 before:to-cyan-400"
          dir="rtl"
        >
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="مینو پرانیستل"
            >
              <Menu className="size-5" />
            </button>
            <div className="flex min-w-0 items-center gap-3">
              <span className="hidden size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#102b5c] to-blue-600 text-white shadow-lg shadow-blue-900/20 ring-4 ring-blue-50 sm:grid">
                <ScanLine className="size-6" strokeWidth={1.8} />
              </span>
              <div className="min-w-0 text-right">
                <div className="flex items-center gap-2">
                  <p className="truncate text-lg font-black leading-7 tracking-tight text-slate-950 sm:text-xl">
                    بلال احمدزی
                  </p>
                  <span className="hidden rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[9px] font-extrabold text-blue-700 sm:inline">LASER FLOW</span>
                </div>
                <p className="truncate text-xs font-semibold text-slate-500 sm:text-sm">
                  د لیزر ډیزاین مرکز
                </p>
              </div>
            </div>

            <div className="mr-1 hidden h-11 w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent xl:block" />

            <div className="hidden items-stretch gap-2.5 xl:flex">
              <div className="group flex min-w-56 items-center gap-3 overflow-hidden rounded-2xl border border-slate-200/90 bg-white px-3 py-2 shadow-[0_3px_12px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_8px_22px_rgba(37,99,235,0.10)]">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20">
                  <CalendarDays className="size-5" strokeWidth={2} />
                </span>
                <span className="min-w-0 text-right">
                  <span className="block text-[11px] font-extrabold tracking-wide text-slate-500">تاریخ</span>
                  <span dir="ltr" className="mt-0.5 block whitespace-nowrap text-[13px] font-extrabold text-slate-800">{currentDate}</span>
                </span>
              </div>

              <div dir="ltr" className="group flex min-w-40 items-center gap-3 overflow-hidden rounded-2xl border border-[#173768] bg-gradient-to-br from-[#0A1F44] to-[#163b76] px-3 py-2 text-white shadow-[0_5px_16px_rgba(10,31,68,0.20)] transition hover:-translate-y-0.5 hover:shadow-[0_9px_24px_rgba(10,31,68,0.28)]">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/10 text-blue-200">
                  <Clock3 className="size-5" strokeWidth={2} />
                </span>
                <span className="min-w-0">
                  <span dir="rtl" className="block text-[11px] font-extrabold tracking-wide text-blue-200">وخت</span>
                  <span className="mt-0.5 block whitespace-nowrap text-[15px] font-black tracking-wide tabular-nums">{currentTime}</span>
                </span>
              </div>
            </div>

            <div dir="ltr" className="hidden items-center gap-2 rounded-xl border border-[#173768] bg-[#0A1F44] px-3 py-2 text-xs font-extrabold tabular-nums text-white shadow-md md:flex xl:hidden">
              <Clock3 className="size-4 text-blue-300" />
              {currentTime}
            </div>

            <div className="relative">
              <button type="button" onClick={() => { setNotificationsOpen((current) => !current); setProfileOpen(false); }} className="relative grid size-14 place-items-center rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 text-slate-600 shadow-[0_3px_12px_rgba(15,23,42,0.07)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-brand-700 hover:shadow-[0_8px_20px_rgba(37,99,235,0.12)]" aria-label="خبرتیاوې" aria-expanded={notificationsOpen}>
                <Bell className="size-5" />
                {(debtReminders.data?.count ?? 0) > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold leading-4 text-white shadow-sm">{debtReminders.data?.count}</span>}
              </button>
              {notificationsOpen && <div className="absolute right-0 top-full mt-2 w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white text-right shadow-xl shadow-slate-900/10"><div className="flex items-center justify-between border-b px-4 py-3"><h2 className="font-bold text-slate-950">د پورونو خبرتیاوې</h2><span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">{debtReminders.data?.count ?? 0}</span></div><div className="max-h-96 overflow-y-auto p-2">{debtReminders.isLoading && <p className="p-4 text-sm text-slate-500">خبرتیاوې راځي…</p>}{debtReminders.data?.data.map((reminder) => <article key={reminder.order_id} className="rounded-xl p-3 hover:bg-slate-50"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{reminder.customer_name}</p><p className="mt-1 text-xs text-slate-500">{reminder.order_number} · تر {reminder.payment_due_date}</p><p dir="ltr" className="mt-1.5 text-right text-xs font-bold text-emerald-700">WhatsApp: {reminder.whatsapp_number || "شمېره نشته"}</p></div><p dir="ltr" className="shrink-0 text-sm font-bold text-red-700">{Number(reminder.remaining_amount).toLocaleString()} AFN</p></div><div className="mt-3 flex flex-wrap gap-2"><Link to={`/design-orders/${reminder.order_id}`} onClick={() => setNotificationsOpen(false)} className="inline-flex h-9 items-center rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white">فرمایش کتل</Link>{reminder.whatsapp_url ? <a href={reminder.whatsapp_url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white"><MessageCircle className="size-3.5" /> همدې شمېرې ته پیغام</a> : <span className="inline-flex h-9 items-center rounded-lg bg-amber-50 px-3 text-xs font-semibold text-amber-700">WhatsApp اجازه نشته</span>}</div></article>)}{debtReminders.data?.count === 0 && <p className="p-6 text-center text-sm text-slate-500">اوس مهال د پور خبرتیا نشته.</p>}</div></div>}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden min-w-48 items-center gap-3 rounded-2xl border border-blue-200 bg-gradient-to-l from-blue-50 via-white to-white px-3.5 py-2.5 shadow-[0_4px_14px_rgba(37,99,235,0.10)] ring-1 ring-blue-50 md:flex" title="د سیستم جوړونکی: نقیب الله سیال">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20">
                <Code2 className="size-5" />
              </span>
              <span className="text-right leading-tight">
                <span className="block text-[10px] font-extrabold text-blue-600">د سیستم جوړونکی</span>
                <span className="mt-1 block whitespace-nowrap text-sm font-black text-slate-900">نقیب الله سیال</span>
              </span>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => { setProfileOpen((current) => !current); setNotificationsOpen(false); }}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 text-right transition hover:border-brand-200 hover:bg-slate-50 sm:gap-3 sm:pl-3"
                aria-expanded={profileOpen}
                aria-haspopup="menu"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white shadow-sm">
                  {user?.full_name.slice(0, 2).toUpperCase() || "SY"}
                </span>
                <span className="hidden min-w-24 sm:block">
                  <span className="block max-w-36 truncate text-sm font-bold text-slate-900">
                    {user?.full_name || "syal"}
                  </span>
                  <span className="mt-0.5 block text-xs font-medium text-slate-500">
                    {user ? roleLabels[user.role] : "مالک"}
                  </span>
                </span>
                <ChevronDown
                  className={twMerge(
                    "hidden size-4 text-slate-400 transition sm:block",
                    profileOpen && "rotate-180",
                  )}
                />
              </button>

              {profileOpen && (
                <div
                  role="menu"
                  className="absolute left-0 top-full mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 text-right shadow-xl shadow-slate-900/10"
                >
                  <Link
                    to="/account"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <CircleUserRound className="size-4" />
                    زما حساب
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void logout()}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="size-4" />
                    وتل
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="app-main px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="page-shell"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}
