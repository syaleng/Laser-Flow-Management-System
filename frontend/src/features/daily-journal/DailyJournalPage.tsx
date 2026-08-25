import { Banknote, BookOpen, CalendarDays, CheckCircle2, CircleDollarSign, CreditCard, HandCoins, Plus, ReceiptText, WalletCards } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { ApiError } from "@/lib/api-client";
import { formatAfn } from "@/lib/format";

import { getJournalReport } from "./api";
import { useJournal } from "./hooks";
import type { JournalTransaction, MoneyLoan, PayableAccount, PaymentMethod, Repayment } from "./types";

const today = new Date().toISOString().slice(0, 10);
const money = formatAfn;
const inputClass = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const debtTypes = [{ value: "PERSONAL", label: "شخصي پور" }, { value: "COMPANY_SUPPLIER", label: "شرکت / عرضه کوونکی" }, { value: "MACHINE_EQUIPMENT", label: "ماشین یا وسایل" }, { value: "OTHER", label: "نور" }];
const debtStatus = (amount: string | number, paid: string | number) => Number(paid) <= 0 ? "پاتې" : Number(paid) >= Number(amount) ? "بشپړ تصفیه شوی" : "جزوي ورکړل شوی";
const remaining = (amount: string, paid: string) => Math.max(Number(amount) - (Number(paid) || 0), 0);

export function DailyJournalPage() {
  const [date, setDate] = useState(today);
  const [period, setPeriod] = useState("daily");
  const [expenseForm, setExpenseForm] = useState({ category: "ELECTRICITY_WATER", amount: "", note: "" });
  const [loanForm, setLoanForm] = useState({ person_name: "", debt_type: "PERSONAL", amount: "", returned_amount: "", purpose: "", note: "" });
  const [payableForm, setPayableForm] = useState({ person_name: "", debt_type: "PERSONAL", amount: "", paid_amount: "", purpose: "", note: "" });
  const journal = useJournal(date);
  const report = useQuery({ queryKey: ["journal", "report", date, period], queryFn: () => getJournalReport(date, period) });
  const summary = journal.summary.data;
  const error = journal.summary.error ?? journal.expenses.error ?? journal.loans.error ?? journal.payables.error;
  const submissionError = journal.addExpense.error ?? journal.addLoan.error ?? journal.addPayable.error;

  const submitExpense = async (event: React.FormEvent) => {
    event.preventDefault();
    await journal.addExpense.mutateAsync({ ...expenseForm, amount: Number(expenseForm.amount), expense_date: date });
    setExpenseForm({ category: "ELECTRICITY_WATER", amount: "", note: "" });
  };
  const submitLoan = async (event: React.FormEvent) => {
    event.preventDefault();
    await journal.addLoan.mutateAsync({ ...loanForm, amount: Number(loanForm.amount), returned_amount: Number(loanForm.returned_amount) || 0, loan_date: date });
    setLoanForm({ person_name: "", debt_type: "PERSONAL", amount: "", returned_amount: "", purpose: "", note: "" });
  };
  const submitPayable = async (event: React.FormEvent) => {
    event.preventDefault();
    await journal.addPayable.mutateAsync({ ...payableForm, amount: Number(payableForm.amount), paid_amount: Number(payableForm.paid_amount) || 0, payable_date: date });
    setPayableForm({ person_name: "", debt_type: "PERSONAL", amount: "", paid_amount: "", purpose: "", note: "" });
  };

  return (
    <section dir="rtl" className="text-right">
      <header className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-semibold text-brand-600">مالي مدیریت</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">ورځنۍ روزنامه</h1><p className="mt-2 text-sm text-slate-500">د ورځني عاید، لګښتونو، پورونو او نغدو پیسو بشپړ ثبت</p></div>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><CalendarDays className="size-4 text-slate-400" /><input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal" /></label>
      </header>

      {error && <div role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error instanceof ApiError ? error.message : "Journal data could not be loaded."}</div>}
      {submissionError && <div role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{submissionError instanceof ApiError ? submissionError.message : "ثبت ناکام شو. مهرباني وکړئ بیا هڅه وکړئ."}</div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[{ label: "نن ترلاسه شوې پیسې", value: summary?.customer_payments, icon: Banknote, color: "text-emerald-600 bg-emerald-50", description: "د مشتریانو واقعي تادیې" }, { label: "د نن ورځې لګښتونه", value: summary?.expenses, icon: ReceiptText, color: "text-rose-600 bg-rose-50", description: "نن مصرف شوې پیسې" }, { label: "مشتریانو پاتې حساب", value: summary?.customer_debts, icon: WalletCards, color: "text-amber-600 bg-amber-50", description: "له مشتریانو ترلاسه کېدونکې پیسې" }, { label: "د دوکان پاتې پور", value: summary?.total_payables, icon: CircleDollarSign, color: "text-orange-600 bg-orange-50", description: "دوکان یې باید نورو ته ورکړي" }, { label: "د پورونو پاتې حساب", value: summary?.money_loan_receivables, icon: HandCoins, color: "text-indigo-600 bg-indigo-50", description: "له نورو کسانو ترلاسه کېدونکې پیسې" }, { label: "د نغدو موجودي", value: summary?.closing_balance, icon: CreditCard, color: "text-blue-600 bg-blue-50", description: "د ورځې تر پایه cash" }, { label: "د خرڅلاو ګټه / زیان", value: summary?.net_profit, icon: summary && Number(summary.net_profit) >= 0 ? CheckCircle2 : CircleDollarSign, color: summary && Number(summary.net_profit) >= 0 ? "text-teal-600 bg-teal-50" : "text-red-600 bg-red-50", description: "خرڅلاو منفي لګښتونه" }].map((item) => <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className={`mb-4 grid size-10 place-items-center rounded-xl ${item.color}`}><item.icon className="size-5" /></div><p className="text-xs font-medium text-slate-500">{item.label}</p><p dir="ltr" className="mt-2 text-lg font-bold text-slate-950">{item.value ? money(item.value) : "—"}</p><p className="mt-1 text-[11px] text-slate-400">{item.description}</p></article>)}
      </div>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <article className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 shadow-sm"><h2 className="text-lg font-bold text-blue-950">د نغدو حرکت</h2><div className="mt-4 space-y-2 text-sm"><FlowRow label="د ورځې پیل موجودي" value={summary?.opening_balance} /><FlowRow label="مشتریانو تادیې" value={summary?.customer_payments} positive /><FlowRow label="نور عاید" value={summary?.other_income} positive /><FlowRow label="د پور بېرته ورکړه" value={summary?.loan_returns} positive /><FlowRow label="لګښتونه" value={summary?.expenses} negative /><FlowRow label="ورکړل شوي پورونه" value={summary?.loan_given} negative /><FlowRow label="د دوکان پور تادیات" value={summary?.payable_payments} negative /><div className="mt-3 flex justify-between border-t border-blue-200 pt-3 font-bold text-blue-950"><span>د ورځې پای موجودي</span><span dir="ltr">{summary ? money(summary.closing_balance) : "—"}</span></div></div></article>
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm"><h2 className="text-lg font-bold text-emerald-950">د ګټې او خرڅلاو حساب</h2><p className="mt-1 text-sm text-emerald-800">ګټه د خرڅلاو له ارزښت څخه محاسبه کېږي، نه یوازې له ترلاسه شوو پیسو.</p><div className="mt-6 space-y-3"><FlowRow label="ټول خرڅلاو" value={summary?.sales} positive /><FlowRow label="لګښتونه" value={summary?.expenses} negative /><div className="flex justify-between border-t border-emerald-200 pt-3 font-bold text-emerald-950"><span>خالصه ګټه / زیان</span><span dir="ltr">{summary ? money(summary.net_profit) : "—"}</span></div></div></article>
      </section>

      <section className="mt-5"><h2 className="mb-3 text-lg font-bold text-slate-950">د پورونو لنډیز</h2><div className="grid gap-4 sm:grid-cols-3"><article className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4"><p className="text-sm text-emerald-800">ټول ترلاسه کېدونکي</p><p dir="ltr" className="mt-2 text-xl font-bold text-emerald-900">{summary ? money(summary.total_receivables) : "—"}</p><p className="mt-1 text-xs text-emerald-700">مشتریانو پاتې حسابونه + د ترلاسه کېدونکو پورونو حساب</p></article><article className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4"><p className="text-sm text-rose-800">ټول ورکولو وړ</p><p dir="ltr" className="mt-2 text-xl font-bold text-rose-900">{summary ? money(summary.total_payables) : "—"}</p><p className="mt-1 text-xs text-rose-700">د ورکولو وړ پورونو حساب</p></article><article className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4"><p className="text-sm text-blue-800">خالص مالي حالت</p><p dir="ltr" className="mt-2 text-xl font-bold text-blue-900">{summary ? money(summary.net_financial_position) : "—"}</p><p className="mt-1 text-xs text-blue-700">ټول ترلاسه کېدونکي - ټول ورکولو وړ</p></article></div></section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-950">مالي راپور</h2><p className="mt-1 text-sm text-slate-500">د ټاکلې مودې عاید، لګښتونه او ګټه</p></div><select value={period} onChange={(event) => setPeriod(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value="daily">ورځنی راپور</option><option value="weekly">اونیز راپور</option><option value="monthly">میاشتنی راپور</option><option value="yearly">کلنی راپور</option></select></div><div className="mt-4 grid gap-3 sm:grid-cols-4">{report.data && [{ label: "عاید", value: report.data.income }, { label: "لګښتونه", value: report.data.expenses }, { label: "ورکړل شوي پورونه", value: report.data.loans_given }, { label: "خالصه ګټه", value: report.data.net_profit }].map((item) => <div key={item.label} className="rounded-xl bg-slate-50 px-4 py-3"><p className="text-xs text-slate-500">{item.label}</p><p dir="ltr" className="mt-1 font-bold text-slate-900">{money(item.value)}</p></div>)}</div></section>

      <TransactionTable transactions={report.data?.transactions ?? []} />

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <JournalForm title="نوی ورځنی لګښت" icon={ReceiptText} onSubmit={submitExpense} submitting={journal.addExpense.isPending}>
          <label className="text-sm font-semibold text-slate-700">د لګښت ډول<select className={inputClass} value={expenseForm.category} onChange={(event) => setExpenseForm({ ...expenseForm, category: event.target.value })}><option value="ELECTRICITY_WATER">برېښنا او اوبه</option><option value="RENT">کرایه</option><option value="FOOD_STAFF">خوراک او د کارکوونکو ورځني لګښتونه</option><option value="TRANSPORTATION">ترانسپورټ</option><option value="MAINTENANCE">ساتنه او ترمیم</option><option value="MATERIALS">مواد</option><option value="OTHER">نور لګښتونه</option></select></label>
          <label className="text-sm font-semibold text-slate-700">مقدار (AFN)<input required min="0.01" step="0.01" type="number" className={inputClass} value={expenseForm.amount} onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })} /></label>
          <label className="text-sm font-semibold text-slate-700">یادښت<textarea className={inputClass} value={expenseForm.note} onChange={(event) => setExpenseForm({ ...expenseForm, note: event.target.value })} /></label>
        </JournalForm>
        <JournalForm title="د ترلاسه کېدونکو پورونو حساب" description="هغه پیسې چې موږ نورو کسانو ته ورکړي او باید بېرته ترلاسه یې کړو." icon={HandCoins} onSubmit={submitLoan} submitting={journal.addLoan.isPending}>
          <label className="text-sm font-semibold text-slate-700">د شخص نوم<input required className={inputClass} value={loanForm.person_name} onChange={(event) => setLoanForm({ ...loanForm, person_name: event.target.value })} /></label>
          <label className="text-sm font-semibold text-slate-700">د پور ډول<select className={inputClass} value={loanForm.debt_type} onChange={(event) => setLoanForm({ ...loanForm, debt_type: event.target.value })}>{debtTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
          <label className="text-sm font-semibold text-slate-700">د ورکړل شوي پور مقدار (AFN)<input required min="0.01" step="0.01" type="number" className={inputClass} value={loanForm.amount} onChange={(event) => setLoanForm({ ...loanForm, amount: event.target.value })} /></label>
          <label className="text-sm font-semibold text-slate-700">بېرته ترلاسه شوی مقدار (AFN)<input min="0" step="0.01" type="number" className={inputClass} value={loanForm.returned_amount} onChange={(event) => setLoanForm({ ...loanForm, returned_amount: event.target.value })} /></label>
          <label className="text-sm font-semibold text-slate-700">پاتې مقدار (AFN)<input readOnly className={`${inputClass} bg-slate-50`} value={remaining(loanForm.amount, loanForm.returned_amount)} /></label>
          <label className="text-sm font-semibold text-slate-700">موخه<input className={inputClass} value={loanForm.purpose} onChange={(event) => setLoanForm({ ...loanForm, purpose: event.target.value })} /></label>
          <label className="text-sm font-semibold text-slate-700">نېټه<input type="date" readOnly className={inputClass} value={date} /></label>
          <label className="text-sm font-semibold text-slate-700">یادښت<textarea className={inputClass} value={loanForm.note} onChange={(event) => setLoanForm({ ...loanForm, note: event.target.value })} /></label>
        </JournalForm>
        <JournalForm title="د ورکولو وړ پورونو حساب" description="هغه پیسې چې دوکان له اشخاصو، شرکتونو یا نورو سرچینو اخیستي او باید یې ورکړي." icon={WalletCards} onSubmit={submitPayable} submitting={journal.addPayable.isPending}>
          <label className="text-sm font-semibold text-slate-700">د شخص / شرکت نوم<input required className={inputClass} value={payableForm.person_name} onChange={(event) => setPayableForm({ ...payableForm, person_name: event.target.value })} /></label>
          <label className="text-sm font-semibold text-slate-700">د پور ډول<select className={inputClass} value={payableForm.debt_type} onChange={(event) => setPayableForm({ ...payableForm, debt_type: event.target.value })}>{debtTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
          <label className="text-sm font-semibold text-slate-700">ټول مقدار (AFN)<input required min="0.01" step="0.01" type="number" className={inputClass} value={payableForm.amount} onChange={(event) => setPayableForm({ ...payableForm, amount: event.target.value })} /></label>
          <label className="text-sm font-semibold text-slate-700">ورکړل شوی مقدار (AFN)<input min="0" step="0.01" type="number" className={inputClass} value={payableForm.paid_amount} onChange={(event) => setPayableForm({ ...payableForm, paid_amount: event.target.value })} /></label>
          <label className="text-sm font-semibold text-slate-700">پاتې مقدار (AFN)<input readOnly className={`${inputClass} bg-slate-50`} value={remaining(payableForm.amount, payableForm.paid_amount)} /></label>
          <label className="text-sm font-semibold text-slate-700">موخه<input required className={inputClass} value={payableForm.purpose} onChange={(event) => setPayableForm({ ...payableForm, purpose: event.target.value })} /></label>
          <label className="text-sm font-semibold text-slate-700">نېټه<input type="date" readOnly className={inputClass} value={date} /></label>
          <label className="text-sm font-semibold text-slate-700">یادښت<textarea className={inputClass} value={payableForm.note} onChange={(event) => setPayableForm({ ...payableForm, note: event.target.value })} /></label>
        </JournalForm>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <RecordTable title="د نن ورځې لګښتونه" rows={journal.expenses.data?.map((item) => [item.category_label, money(item.amount), item.note || "—"]) ?? []} headers={["ډول", "مقدار", "یادښت"]} />
        <DebtRecordTable title="د ترلاسه کېدونکو پورونو حساب" records={journal.loans.data ?? []} paidKey="returned_amount" onRepay={(input) => journal.repayLoan.mutateAsync(input)} pending={journal.repayLoan.isPending} />
        <DebtRecordTable title="د ورکولو وړ پورونو حساب" records={journal.payables.data ?? []} paidKey="paid_amount" onRepay={(input) => journal.repayPayable.mutateAsync(input)} pending={journal.repayPayable.isPending} />
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-bold text-slate-950">د ورځې تړلو تاریخچه</h2><p className="mt-1 text-sm text-slate-500">د ورځې cash او profit ثبت</p></div><BookOpen className="size-5 text-slate-400" /></div><div className="flex flex-wrap items-center gap-3"><button type="button" onClick={() => void journal.closeDay.mutateAsync(date)} disabled={journal.closeDay.isPending} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"><CheckCircle2 className="size-4" />{journal.closeDay.isPending ? "ثبتېږي..." : "نن ورځ وتړئ"}</button><span className="text-sm text-slate-500">د ټاکلې ورځې cash، لګښت او ګټه ثبتېږي.</span></div><div className="mt-5 divide-y divide-slate-100">{journal.closings.data?.slice(0, 5).map((closing) => <div key={closing.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span className="font-semibold text-slate-800">{closing.closing_date}</span><span>پیل: {money(closing.opening_balance)}</span><span className="text-emerald-700">ترلاسه: {money(closing.customer_payments)}</span><span className="text-rose-700">لګښت: {money(closing.total_expenses)}</span><span className="font-bold text-blue-700">پای: {money(closing.closing_balance)}</span><span className="text-xs text-slate-400">{closing.closed_by_name}</span></div>)}</div></section>
    </section>
  );
}

function FlowRow({ label, value, positive, negative }: { label: string; value?: string; positive?: boolean; negative?: boolean }) {
  return <div className="flex justify-between gap-3"><span>{label}</span><span dir="ltr" className={positive ? "text-emerald-700" : negative ? "text-rose-700" : "text-slate-700"}>{value ? money(value) : "—"}</span></div>;
}

function JournalForm({ title, description, icon: Icon, children, onSubmit, submitting }: { title: string; description?: string; icon: typeof ReceiptText; children: React.ReactNode; onSubmit: (event: React.FormEvent) => void; submitting: boolean }) {
  return <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-950">{title}</h2>{description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}</div><Icon className="size-5 shrink-0 text-slate-400" /></div><div className="space-y-4">{children}</div><button type="submit" disabled={submitting} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"><Plus className="size-4" />{submitting ? "ثبتېږي..." : "ثبتول"}</button></form>;
}

function TransactionTable({ transactions }: { transactions: JournalTransaction[] }) {
  const labels: Record<string, string> = { customer_payment: "د مشتری تادیه", expense: "لګښت", loan_given: "ورکړل شوی پور", loan_repayment: "د پور بېرته ورکړه", payable_created: "ترلاسه شوی پور", payable_payment: "د دوکان پور تادیه" };
  return <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b px-5 py-4"><h2 className="font-bold text-slate-950">د ورځې معاملې</h2><p className="mt-1 text-sm text-slate-500">هره مالي معامله د ډول، مبلغ او ثبتوونکي سره</p></div>{transactions.length ? <div className="overflow-x-auto"><table className="w-full min-w-180 text-right text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3">ډول</th><th className="px-5 py-3">مبلغ</th><th className="px-5 py-3">اړوند شخص / شرکت</th><th className="px-5 py-3">فرمایش</th><th className="px-5 py-3">وخت</th><th className="px-5 py-3">ثبتوونکی</th></tr></thead><tbody className="divide-y divide-slate-100">{transactions.map((transaction) => { const amountClass = transaction.direction === "in" ? "text-emerald-700" : transaction.direction === "out" ? "text-rose-700" : "text-slate-500"; const prefix = transaction.direction === "in" ? "+" : transaction.direction === "out" ? "-" : ""; return <tr key={`${transaction.transaction_type}-${transaction.date}-${transaction.time}-${transaction.amount}-${transaction.related}`}><td className="px-5 py-3">{labels[transaction.transaction_type] ?? transaction.transaction_type}</td><td dir="ltr" className={`px-5 py-3 font-bold ${amountClass}`}>{prefix}{money(transaction.amount)}{transaction.direction === "non_cash" && <span className="mr-1 text-xs font-normal">(غیر نغدي)</span>}</td><td className="px-5 py-3">{transaction.related}</td><td className="px-5 py-3">{transaction.order_number}</td><td dir="ltr" className="px-5 py-3">{transaction.time}</td><td className="px-5 py-3 text-slate-600">{transaction.user}</td></tr>; })}</tbody></table></div> : <p className="p-8 text-center text-sm text-slate-500">د دې ورځې لپاره مالي معامله نشته.</p>}</section>;
}

function RecordTable({ title, headers, rows }: { title: string; headers: string[]; rows: string[][] }) {
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b px-5 py-4"><h2 className="font-bold text-slate-950">{title}</h2></div>{rows.length ? <div className="overflow-x-auto"><table className="w-full text-right text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{headers.map((header) => <th key={header} className="px-5 py-3">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row, index) => <tr key={`${row[0]}-${index}`}><>{row.map((value, cellIndex) => <td key={`${value}-${cellIndex}`} className="px-5 py-3 text-slate-700">{value}</td>)}</></tr>)}</tbody></table></div> : <p className="p-8 text-center text-sm text-slate-500">د دې ورځې لپاره معلومات نشته.</p>}</section>;
}

function DebtRecordTable({ title, records, paidKey, onRepay, pending }: { title: string; records: (MoneyLoan | PayableAccount)[]; paidKey: "returned_amount" | "paid_amount"; onRepay: (input: { id: string; amount: number; payment_date: string; payment_method: PaymentMethod; note: string }) => Promise<unknown>; pending: boolean }) {
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b px-5 py-4"><h2 className="font-bold text-slate-950">{title}</h2></div>{records.length ? <div className="divide-y divide-slate-100">{records.map((record) => <DebtRecord key={record.id} record={record} paid={paidKey === "returned_amount" ? (record as MoneyLoan).returned_amount : (record as PayableAccount).paid_amount} onRepay={onRepay} pending={pending} />)}</div> : <p className="p-8 text-center text-sm text-slate-500">د دې ورځې لپاره معلومات نشته.</p>}</section>;
}

function DebtRecord({ record, paid, onRepay, pending }: { record: MoneyLoan | PayableAccount; paid: string; onRepay: (input: { id: string; amount: number; payment_date: string; payment_method: PaymentMethod; note: string }) => Promise<unknown>; pending: boolean }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [note, setNote] = useState("");
  const repayments = record.repayments ?? [];
  const remainingAmount = Number(record.remaining_balance);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onRepay({ id: record.id, amount: Number(amount), payment_date: date, payment_method: method, note });
    setAmount(""); setNote(""); setOpen(false);
  };
  return <div className="p-5"><div className="grid gap-3 sm:grid-cols-4"><div><p className="text-xs text-slate-500">{record.person_name}</p><p className="mt-1 font-semibold text-slate-900">{record.purpose || "—"}</p></div><div><p className="text-xs text-slate-500">اصلي مقدار</p><p className="mt-1 font-bold">{money(record.amount)}</p></div><div><p className="text-xs text-slate-500">ورکړل / ترلاسه شوي</p><p className="mt-1 font-bold text-emerald-700">{money(paid)}</p></div><div><p className="text-xs text-slate-500">پاتې مقدار</p><p className="mt-1 font-bold text-rose-700">{money(record.remaining_balance)} · {debtStatus(record.amount, paid)}</p></div></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => setOpen(!open)} disabled={remainingAmount <= 0} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">قسط ثبتول</button>{repayments.length > 0 && <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">{repayments.length} معاملې</span>}</div>{open && <form onSubmit={submit} className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-4"><input required min="0.01" max={remainingAmount} step="0.01" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="مقدار" className={inputClass} /><input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} /><select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)} className={inputClass}><option value="CASH">نغدي</option><option value="BANK">بانک</option><option value="OTHER">نور</option></select><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="یادښت" className={inputClass} /><button type="submit" disabled={pending} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-4">{pending ? "ثبتېږي..." : "قسط ثبتول"}</button></form>}{repayments.length > 0 && <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[560px] text-right text-xs"><thead className="bg-slate-50 text-slate-500"><tr>{["نېټه", "مقدار", "طریقه", "ثبتوونکی", "یادښت"].map((header) => <th key={header} className="px-3 py-2">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{repayments.map((repayment: Repayment) => <tr key={repayment.id}><td className="px-3 py-2">{repayment.payment_date}</td><td className="px-3 py-2 font-bold text-emerald-700">{money(repayment.amount)}</td><td className="px-3 py-2">{repayment.payment_method === "CASH" ? "نغدي" : repayment.payment_method === "BANK" ? "بانک" : "نور"}</td><td className="px-3 py-2">{repayment.created_by_name}</td><td className="px-3 py-2">{repayment.note || "—"}</td></tr>)}</tbody></table></div>}</div>;
}
