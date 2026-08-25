import { useLocation } from "react-router-dom";

export function ComingSoonPage() {
  const location = useLocation();
  const route = location.pathname.split("/")[1];
  const title = route === "payments" ? "تادیات" : route === "expenses" ? "Expenses" : route === "reports" ? "Reports" : "پاڼه";
  return <section><p className="text-sm font-semibold text-brand-600">بلال احمدزی</p><h1 className="mt-1 text-3xl font-bold text-slate-950">{title}</h1><div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">دا برخه به ډېر ژر د کار لپاره تیاره شي.</div></section>;
}
