import { BarChart3, CircleDollarSign, LayoutDashboard, LogOut, Menu, ReceiptText, ScanLine, Users, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { twMerge } from "tailwind-merge";

import { useAuth } from "@/features/auth/auth-context";
import type { Permission } from "@/features/auth/permissions";

interface NavigationItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  permission?: Permission;
}

const navigation: NavigationItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Customers", to: "/customers", icon: Users, permission: "manage_customers" },
  { label: "Design Orders", to: "/design-orders", icon: ScanLine },
  { label: "Payments", to: "/payments", icon: CircleDollarSign },
  { label: "Expenses", to: "/expenses", icon: ReceiptText },
  { label: "Reports", to: "/reports", icon: BarChart3 },
];

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const { user, logout, hasPermission } = useAuth();
  const visibleNavigation = navigation.filter(
    ({ permission }) => !permission || hasPermission(permission),
  );

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-20 items-center gap-3 px-6 text-xl font-bold"><ScanLine className="text-blue-400" /> LaserFlow</div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {visibleNavigation.map(({ label, to, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({ isActive }) => twMerge("flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white", isActive && "bg-brand-600 text-white hover:bg-brand-600")}> <Icon className="size-5" /> {label} </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-800 p-4">
        <div className="mb-3 px-2"><p className="truncate text-sm font-semibold text-white">{user?.full_name}</p><p className="truncate text-xs text-slate-400">{user?.role.toLowerCase()}</p></div>
        <button onClick={() => void logout()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"><LogOut className="size-4" /> Sign out</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-slate-950 text-white lg:block">{sidebar}</aside>
      {open && <div className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={twMerge("fixed inset-y-0 left-0 z-50 w-72 -translate-x-full bg-slate-950 text-white transition lg:hidden", open && "translate-x-0")}><button className="absolute right-4 top-5" onClick={() => setOpen(false)} aria-label="Close navigation"><X /></button>{sidebar}</aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur lg:px-8">
          <button className="rounded-lg p-2 text-slate-600 lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu /></button>
          <div><p className="text-sm text-slate-500">Laser cutting operations</p><p className="font-semibold text-slate-900">Management workspace</p></div>
          <div className="grid size-10 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">{user?.full_name.slice(0, 2).toUpperCase()}</div>
        </header>
        <main className="p-5 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
