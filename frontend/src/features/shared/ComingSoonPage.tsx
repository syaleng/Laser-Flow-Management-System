import { useLocation } from "react-router-dom";

export function ComingSoonPage() {
  const location = useLocation();
  const title = location.pathname.split("/")[1]?.replace("-", " ") ?? "Module";
  return <section><p className="text-sm font-semibold text-brand-600">PHASE 2</p><h1 className="mt-1 text-3xl font-bold capitalize text-slate-950">{title}</h1><div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">This module is reserved in the navigation and will be implemented in the approved business phase.</div></section>;
}

