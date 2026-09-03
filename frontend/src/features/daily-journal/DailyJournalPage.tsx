import {
  Banknote,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  HandCoins,
  Plus,
  Pencil,
  ReceiptText,
  Scale,
  ShieldCheck,
  Trash2,
  WalletCards,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { ApiError } from "@/lib/api-client";
import { formatAfn } from "@/lib/format";

import { useJournal } from "./hooks";
import type {
  MoneyLoan,
  PayableAccount,
  PaymentMethod,
  Repayment,
} from "./types";

const today = new Date().toISOString().slice(0, 10);
const money = formatAfn;

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

const debtTypes = [
  { value: "PERSONAL", label: "شخصي پور" },
  { value: "COMPANY_SUPPLIER", label: "دوکاندار" },
  { value: "OTHER", label: "نور پور" },
];

const debtStatus = (amount: string | number, paid: string | number) =>
  Number(paid) <= 0
    ? "پاتې"
    : Number(paid) >= Number(amount)
      ? "بشپړ تصفیه شوی"
      : "جزوي ورکړل شوی";

const remaining = (amount: string, paid: string) =>
  Math.max(Number(amount) - (Number(paid) || 0), 0);

export function DailyJournalPage() {
  const [date, setDate] = useState(today);
  useEffect(() => {
    if (window.location.hash === "#payables-records") {
      requestAnimationFrame(() => document.getElementById("payables-records")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }, []);

  const [expenseForm, setExpenseForm] = useState({
    category: "FOOD_STAFF",
    amount: "",
    note: "",
  });

  const [loanForm, setLoanForm] = useState({
    person_name: "",
    debt_type: "PERSONAL",
    amount: "",
    returned_amount: "",
    purpose: "",
    note: "",
  });

  const [payableForm, setPayableForm] = useState({
    person_name: "",
    debt_type: "COMPANY_SUPPLIER",
    origin: "CREDIT_PURCHASE" as "CREDIT_PURCHASE" | "CASH_LOAN",
    amount: "",
    paid_amount: "",
    purpose: "",
    note: "",
  });
  const [actualCash, setActualCash] = useState("");
  const [reconciliationReason, setReconciliationReason] = useState("");

  const journal = useJournal(date);

  const summary = journal.summary.data;

  const error =
    journal.summary.error ??
    journal.expenses.error ??
    journal.loans.error ??
    journal.payables.error;

  const submissionError =
    journal.addExpense.error ??
    journal.addLoan.error ??
    journal.addPayable.error;

  const submitExpense = async (event: React.FormEvent) => {
    event.preventDefault();

    await journal.addExpense.mutateAsync({
      ...expenseForm,
      amount: Number(expenseForm.amount),
      expense_date: date,
    });

    setExpenseForm({
      category: "FOOD_STAFF",
      amount: "",
      note: "",
    });
  };

  const submitLoan = async (event: React.FormEvent) => {
    event.preventDefault();

    await journal.addLoan.mutateAsync({
      ...loanForm,
      amount: Number(loanForm.amount),
      returned_amount: Number(loanForm.returned_amount) || 0,
      loan_date: date,
    });

    setLoanForm({
      person_name: "",
      debt_type: "PERSONAL",
      amount: "",
      returned_amount: "",
      purpose: "",
      note: "",
    });
  };

  const submitPayable = async (event: React.FormEvent) => {
    event.preventDefault();

    await journal.addPayable.mutateAsync({
      ...payableForm,
      amount: Number(payableForm.amount),
      paid_amount: Number(payableForm.paid_amount) || 0,
      payable_date: date,
    });

    setPayableForm({
      person_name: "",
      debt_type: "COMPANY_SUPPLIER",
      origin: "CREDIT_PURCHASE",
      amount: "",
      paid_amount: "",
      purpose: "",
      note: "",
    });
  };

  const submitReconciliation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (actualCash === "" || Number(actualCash) < 0 || reconciliationReason.trim().length < 3) return;
    const difference = Number(actualCash) - Number(summary?.closing_balance ?? 0);
    if (!window.confirm(`د سیستم او حقیقي نغدو توپیر ${money(difference)} دی. دا سمون ثبت شي؟`)) return;
    await journal.reconcileCash.mutateAsync({
      reconciliation_date: date,
      actual_balance: Number(actualCash),
      reason: reconciliationReason.trim(),
    });
    setActualCash("");
    setReconciliationReason("");
  };

  return (
    <section dir="rtl" className="daily-accounting-page min-w-0 overflow-x-hidden text-right">
      <header className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-600">مالي مدیریت</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            ورځنۍ حساب پاڼه
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            د نن ورځې نغدې پیسې، لګښتونه او پورونه په ساده ډول ثبت او وګورئ
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <CalendarDays className="size-4 text-slate-400" />
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
          />
        </label>
      </header>

      <a href="#payables-records" className="daily-supplier-alert mb-5 flex items-center justify-between rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-100 p-4 text-orange-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        <span><strong className="block">د عرضه کوونکو پاتې حسابونه</strong><span className="text-xs">د هغو کسانو حسابونه وګورئ چې لا پیسې ورته پاتې دي.</span></span><span className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white">تادیه ثبتول</span>
      </a>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error instanceof ApiError
            ? error.message
            : "Journal data could not be loaded."}
        </div>
      )}

      {submissionError && (
        <div
          role="alert"
          className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {submissionError instanceof ApiError
            ? submissionError.message
            : "ثبت ناکام شو. مهرباني وکړئ بیا هڅه وکړئ."}
        </div>
      )}

      <div className="daily-summary-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        {[
          {
            label: "د ورځې پیل موجودي",
            value: summary?.opening_balance,
            icon: CreditCard,
            color: "text-slate-600 bg-slate-100",
            description: "د تېرې ورځې له پای څخه",
          },
          {
            label: "ترلاسه شوې پیسې",
            value: summary?.customer_payments,
            icon: Banknote,
            color: "text-emerald-600 bg-emerald-50",
            description: "له مشتریانو ترلاسه شوې نغدې پیسې",
          },
          {
            label: "لګښتونه",
            value: summary?.expenses,
            icon: ReceiptText,
            color: "text-rose-600 bg-rose-50",
            description: "له دوکان څخه مصرف شوې پیسې",
          },
          {
            label: "پور بېرته ترلاسه شوی",
            value: summary?.loan_returns,
            icon: HandCoins,
            color: "text-emerald-600 bg-emerald-50",
            description: "له ورکړل شوو پورونو بېرته راغلې پیسې",
          },
          {
            label: "ورکړل شوي پورونه",
            value: summary?.loan_given,
            icon: HandCoins,
            color: "text-rose-600 bg-rose-50",
            description: "هغه پیسې چې موږ نورو ته پور ورکړې",
          },
          {
            label: "دوکاندار/پور تادیات",
            value: summary?.payable_payments,
            icon: WalletCards,
            color: "text-orange-600 bg-orange-50",
            description: "دوکاندار یا پور ورکوونکي ته ورکړې پیسې",
          },
          {
            label: "موجوده نغدي",
            value: summary?.closing_balance,
            icon: CreditCard,
            color: "text-blue-600 bg-blue-50",
            description: "د ټولو داخلو او وتلو پیسو وروسته",
          },
        ].map((item, index) => (
          <article
            key={item.label}
            className={`daily-kpi-card rounded-2xl border p-4 shadow-sm ${index === 6 ? "daily-kpi-featured" : ""} ${["border-slate-200 bg-slate-50/70", "border-emerald-200 bg-emerald-50/60", "border-rose-200 bg-rose-50/60", "border-emerald-200 bg-emerald-50/60", "border-rose-200 bg-rose-50/60", "border-orange-200 bg-orange-50/60", "border-blue-200 bg-blue-50/60"][index] ?? "border-slate-200 bg-white"}`}
          >
            <div
              className={`mb-4 grid size-10 place-items-center rounded-xl ${item.color}`}
            >
              <item.icon className="size-5" />
            </div>
            <p className={`text-xs font-bold ${index === 6 ? "text-blue-100" : "text-slate-500"}`}>{item.label}</p>
            <p dir="ltr" className={`mt-2 text-lg font-black ${index === 6 ? "text-white" : "text-slate-950"}`}>
              {item.value ? money(item.value) : "—"}
            </p>
            <p className={`mt-1 text-[11px] ${index === 6 ? "text-blue-200" : "text-slate-400"}`}>
              {item.description}
            </p>
          </article>
        ))}
      </div>

      <section className="daily-cash-flow mt-5">
        <article className="rounded-2xl border border-blue-200 bg-blue-50/60 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-blue-950">د نغدو جریان</h2>
              <p className="mt-1 text-xs text-blue-700">
                + پیسې داخلې شوې &nbsp; • &nbsp; − پیسې له دوکان څخه ووتلې
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <FlowRow
              label="د ورځې پیل موجودي"
              value={summary?.opening_balance}
            />
            <FlowRow
              label="ترلاسه شوې پیسې"
              value={summary?.customer_payments}
              positive
            />
            <FlowRow label="نور عاید" value={summary?.other_income} positive />
            <FlowRow
              label="د نغدو سمون"
              value={summary?.cash_adjustments}
              positive={Number(summary?.cash_adjustments ?? 0) >= 0}
              negative={Number(summary?.cash_adjustments ?? 0) < 0}
            />
            <FlowRow
              label="موږ پور واخیست"
              value={summary?.money_received}
              positive
            />
            <FlowRow
              label="پور بېرته ترلاسه شوی"
              value={summary?.loan_returns}
              positive
            />
            <FlowRow label="لګښتونه" value={summary?.expenses} negative />
            <FlowRow
              label="ورکړل شوي پورونه"
              value={summary?.loan_given}
              negative
            />
            <FlowRow
              label="دوکاندار/پور تادیات"
              value={summary?.payable_payments}
              negative
            />

            <div className="mt-3 flex justify-between border-t border-blue-200 pt-3 font-bold text-blue-950">
              <span>موجوده نغدي</span>
              <span dir="ltr">
                {summary ? money(summary.closing_balance) : "—"}
              </span>
            </div>
          </div>
        </article>

      </section>

      <section className="mt-6 overflow-hidden rounded-3xl border border-indigo-200 bg-white shadow-lg shadow-indigo-950/5">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-l from-[#0b2450] to-indigo-700 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15"><Scale className="size-6 text-indigo-100" /></span>
            <div><h2 className="text-lg font-black">د نغدو پیسو سمون</h2><p className="mt-1 text-xs text-indigo-100/80">حقیقي نغدې وشمېرئ او د سیستم له حساب سره یې برابرې کړئ.</p></div>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-2 text-left ring-1 ring-white/15"><span className="block text-[10px] text-indigo-100">د سیستم موجودي</span><strong dir="ltr" className="mt-0.5 block text-lg">{money(summary?.closing_balance ?? 0)}</strong></div>
        </div>

        <form onSubmit={submitReconciliation} className="grid gap-4 p-6 lg:grid-cols-[1fr_1.5fr_auto] lg:items-end">
          <label className="text-xs font-bold text-slate-700">حقیقي موجودې نغدې
            <input required min="0" step="0.01" type="number" value={actualCash} onChange={(event) => setActualCash(event.target.value)} placeholder="0.00" className={inputClass} />
          </label>
          <label className="text-xs font-bold text-slate-700">د توپیر دلیل
            <input required minLength={3} value={reconciliationReason} onChange={(event) => setReconciliationReason(event.target.value)} placeholder="لکه: د پیل موجودي ناسمه ثبت شوې وه" className={inputClass} />
          </label>
          <button type="submit" disabled={journal.reconcileCash.isPending || actualCash === "" || reconciliationReason.trim().length < 3} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-black text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-50"><ShieldCheck className="size-4" />{journal.reconcileCash.isPending ? "ثبتېږي…" : "موجودي برابره کړئ"}</button>
          {actualCash !== "" && <div className={`rounded-xl px-4 py-3 text-sm font-bold lg:col-span-3 ${Number(actualCash) - Number(summary?.closing_balance ?? 0) < 0 ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}><span>توپیر: </span><span dir="ltr">{money(Number(actualCash) - Number(summary?.closing_balance ?? 0))}</span></div>}
        </form>

        {(journal.reconciliations.data?.length ?? 0) > 0 && <div className="border-t border-slate-100 px-6 py-4"><h3 className="mb-3 text-sm font-black text-slate-900">د همدې ورځې د سمون تاریخچه</h3><div className="space-y-2">{journal.reconciliations.data?.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 text-xs"><div><strong className="text-slate-900">{item.reason}</strong><p className="mt-1 text-slate-500">{item.created_by_name} · {new Date(item.created_at).toLocaleString("ps-AF")}</p></div><div className="flex items-center gap-3"><span dir="ltr" className={Number(item.difference) < 0 ? "font-black text-rose-700" : "font-black text-emerald-700"}>{money(item.difference)}</span><button type="button" onClick={() => { const reason = window.prompt("د لغوه کولو دلیل ولیکئ"); if (reason && reason.trim().length >= 3 && window.confirm("دا سمون لغوه شي؟")) void journal.removeReconciliation.mutateAsync({ id: item.id, reason: reason.trim() }); }} className="rounded-lg bg-rose-100 p-2 text-rose-700" title="سمون لغوه کړئ"><Trash2 className="size-4" /></button></div></div>)}</div></div>}
      </section>

      <section className="daily-entry-panel mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-950">نوی مالي ثبت</h2>
          <p className="mt-1 text-sm text-slate-500">
            د کار ډول وټاکئ؛ هره معامله په خپل سم حساب کې ثبتېږي.
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <a
            href="#expense-entry"
            className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 transition hover:border-rose-300"
          >
            <ReceiptText className="size-5" />
            <strong className="mt-2 block text-sm">لګښت ثبتول</strong>
            <span className="mt-1 block text-xs">
              خوراکي، ورځني، د ماشین اړوند او نور لګښتونه
            </span>
          </a>

          <Link
            to="/customers"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 transition hover:border-emerald-300"
          >
            <Banknote className="size-5" />
            <strong className="mt-2 block text-sm">د مشتری پیسې اخیستل</strong>
            <span className="mt-1 block text-xs">
              مشتري وټاکئ او ورکړه یې ثبت کړئ
            </span>
          </Link>

          <a
            href="#payables-records"
            className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-orange-800 transition hover:border-orange-300"
          >
            <WalletCards className="size-5" />
            <strong className="mt-2 block text-sm">پور او حساب ثبتول</strong>
            <span className="mt-1 block text-xs">
              موږ پور ورکړ، پور مو واخیست، یا مو مال په پور واخیست
            </span>
          </a>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div id="expense-entry">
          <JournalForm
            title="نوی لګښت ثبتول"
            icon={ReceiptText}
            onSubmit={submitExpense}
            submitting={journal.addExpense.isPending}
          >
            <label className="text-sm font-semibold text-slate-700">
              د لګښت ډول
              <select
                className={inputClass}
                value={expenseForm.category}
                onChange={(event) =>
                  setExpenseForm({
                    ...expenseForm,
                    category: event.target.value,
                  })
                }
              >
                <option value="FOOD_STAFF">خوراکي او ورځني مصارف</option>
                <option value="MATERIALS">د ماشین اړوند مصارف</option>
                <option value="DIAMONDS">د ډایانو اخیستل</option>
                <option value="ELECTRICITY_WATER">برېښنا او اوبه</option>
                <option value="RENT">کرایه</option>
                <option value="TRANSPORTATION">ترانسپورټ</option>
                <option value="MAINTENANCE">ساتنه او ترمیم</option>
                <option value="OTHER">نور مصارف</option>
              </select>
            </label>

            <label className="text-sm font-semibold text-slate-700">
              مقدار (AFN)
              <input
                required
                min="0.01"
                step="0.01"
                type="number"
                className={inputClass}
                value={expenseForm.amount}
                onChange={(event) =>
                  setExpenseForm({
                    ...expenseForm,
                    amount: event.target.value,
                  })
                }
              />
            </label>

            <label className="text-sm font-semibold text-slate-700">
              تشریح
              <textarea
                className={inputClass}
                value={expenseForm.note}
                onChange={(event) =>
                  setExpenseForm({
                    ...expenseForm,
                    note: event.target.value,
                  })
                }
              />
            </label>
          </JournalForm>
        </div>

        <div id="debt-entry">
          <JournalForm
            title="موږ پور ورکړ"
            description="شخص یا دوکاندار ته ورکړې پیسې چې بېرته یې ترې اخلو."
            icon={HandCoins}
            onSubmit={submitLoan}
            submitting={journal.addLoan.isPending}
          >
          <label className="text-sm font-semibold text-slate-700">
            د شخص نوم
            <input
              required
              className={inputClass}
              value={loanForm.person_name}
              onChange={(event) =>
                setLoanForm({
                  ...loanForm,
                  person_name: event.target.value,
                })
              }
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            د پور ډول
            <select
              className={inputClass}
              value={loanForm.debt_type}
              onChange={(event) =>
                setLoanForm({
                  ...loanForm,
                  debt_type: event.target.value,
                })
              }
            >
              {debtTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            د ورکړل شوي پور مقدار (AFN)
            <input
              required
              min="0.01"
              step="0.01"
              type="number"
              className={inputClass}
              value={loanForm.amount}
              onChange={(event) =>
                setLoanForm({
                  ...loanForm,
                  amount: event.target.value,
                })
              }
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            بېرته ترلاسه شوی مقدار (AFN)
            <input
              min="0"
              step="0.01"
              type="number"
              className={inputClass}
              value={loanForm.returned_amount}
              onChange={(event) =>
                setLoanForm({
                  ...loanForm,
                  returned_amount: event.target.value,
                })
              }
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            پاتې مقدار (AFN)
            <input
              readOnly
              className={`${inputClass} bg-slate-50`}
              value={remaining(loanForm.amount, loanForm.returned_amount)}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            موخه
            <input
              className={inputClass}
              value={loanForm.purpose}
              onChange={(event) =>
                setLoanForm({
                  ...loanForm,
                  purpose: event.target.value,
                })
              }
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            نېټه
            <input type="date" readOnly className={inputClass} value={date} />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            یادښت
            <textarea
              className={inputClass}
              value={loanForm.note}
              onChange={(event) =>
                setLoanForm({
                  ...loanForm,
                  note: event.target.value,
                })
              }
            />
          </label>
          </JournalForm>
        </div>

        <JournalForm
          title="موږ پور واخیست / مال مو په پور واخیست"
          description="نغدې پیسې چې موږ پور اخیستې، یا د دوکاندار هغه حساب چې وروسته یې ورکوو."
          icon={WalletCards}
          onSubmit={submitPayable}
          submitting={journal.addPayable.isPending}
        >
          <label className="text-sm font-semibold text-slate-700">
            د حساب ډول
            <select
              className={inputClass}
              value={payableForm.origin}
              onChange={(event) =>
                setPayableForm({
                  ...payableForm,
                  origin: event.target.value as "CREDIT_PURCHASE" | "CASH_LOAN",
                })
              }
            >
              <option value="CREDIT_PURCHASE">
                مال مو په پور واخیست — نغدې نه دي راغلې
              </option>
              <option value="CASH_LOAN">موږ نغدې پیسې پور واخیستې</option>
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            د شخص / دوکاندار نوم
            <input
              required
              className={inputClass}
              value={payableForm.person_name}
              onChange={(event) =>
                setPayableForm({
                  ...payableForm,
                  person_name: event.target.value,
                })
              }
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            د پور ډول
            <select
              className={inputClass}
              value={payableForm.debt_type}
              onChange={(event) =>
                setPayableForm({
                  ...payableForm,
                  debt_type: event.target.value,
                })
              }
            >
              {debtTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            ټول مقدار (AFN)
            <input
              required
              min="0.01"
              step="0.01"
              type="number"
              className={inputClass}
              value={payableForm.amount}
              onChange={(event) =>
                setPayableForm({
                  ...payableForm,
                  amount: event.target.value,
                })
              }
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            ورکړل شوی مقدار (AFN)
            <input
              min="0"
              step="0.01"
              type="number"
              className={inputClass}
              value={payableForm.paid_amount}
              onChange={(event) =>
                setPayableForm({
                  ...payableForm,
                  paid_amount: event.target.value,
                })
              }
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            پاتې مقدار (AFN)
            <input
              readOnly
              className={`${inputClass} bg-slate-50`}
              value={remaining(payableForm.amount, payableForm.paid_amount)}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            موخه
            <input
              required
              className={inputClass}
              value={payableForm.purpose}
              onChange={(event) =>
                setPayableForm({
                  ...payableForm,
                  purpose: event.target.value,
                })
              }
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            نېټه
            <input type="date" readOnly className={inputClass} value={date} />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            یادښت
            <textarea
              className={inputClass}
              value={payableForm.note}
              onChange={(event) =>
                setPayableForm({
                  ...payableForm,
                  note: event.target.value,
                })
              }
            />
          </label>
        </JournalForm>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <RecordTable
          title="د نن ورځې لګښتونه"
          rows={
            journal.expenses.data?.map((item) => [
              item.category_label,
              money(item.amount),
              item.note || "—",
              <div className="flex gap-2">
                <button type="button" onClick={() => {
                  const amount = window.prompt("نوی مقدار", item.amount);
                  if (!amount) return;
                  const note = window.prompt("تشریح", item.note) ?? item.note;
                  void journal.editExpense.mutateAsync({ id: item.id, amount: Number(amount), note });
                }} className="rounded-lg bg-blue-50 p-2 text-blue-700" title="اصلاح"><Pencil className="size-4" /></button>
                <button type="button" onClick={() => {
                  const reason = window.prompt("د لغوه کولو دلیل ولیکئ");
                  if (reason && reason.trim().length >= 3 && window.confirm("دا لګښت لغوه شي؟")) void journal.removeExpense.mutateAsync({ id: item.id, reason: reason.trim() });
                }} className="rounded-lg bg-rose-50 p-2 text-rose-700" title="لغوه"><Trash2 className="size-4" /></button>
              </div>,
            ]) ?? []
          }
          headers={["ډول", "مقدار", "تشریح", "عمل"]}
        />

        <DebtRecordTable
          title="موږ ته پاتې حسابونه"
          records={journal.loans.data ?? []}
          paidKey="returned_amount"
          onRepay={(input) => journal.repayLoan.mutateAsync(input)}
          onEdit={(input) => journal.editLoan.mutateAsync(input)}
          onVoid={(input) => journal.removeLoan.mutateAsync(input)}
          onVoidRepayment={(input) => journal.removeLoanRepayment.mutateAsync(input)}
          pending={journal.repayLoan.isPending}
        />

        <div id="payables-records"><DebtRecordTable
          title="زموږ پر غاړه پاتې پورونه"
          records={journal.payables.data ?? []}
          paidKey="paid_amount"
          onRepay={(input) => journal.repayPayable.mutateAsync(input)}
          onEdit={(input) => journal.editPayable.mutateAsync(input)}
          onVoid={(input) => journal.removePayable.mutateAsync(input)}
          onVoidRepayment={(input) => journal.removePayableRepayment.mutateAsync(input)}
          pending={journal.repayPayable.isPending}
        /></div>
      </div>

      <section className="daily-history-panel mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              د ورځې تړلو تاریخچه
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              د ورځې نغدې پیسې او ګټه ثبت
            </p>
          </div>

          <BookOpen className="size-5 text-slate-400" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void journal.closeDay.mutateAsync(date)}
            disabled={journal.closeDay.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            <CheckCircle2 className="size-4" />
            {journal.closeDay.isPending ? "ثبتېږي..." : "نن ورځ وتړئ"}
          </button>

          <span className="text-sm text-slate-500">
            د ټاکلې ورځې نغدې پیسې، لګښت او ګټه ثبتېږي.
          </span>
        </div>

        <div className="mt-5 divide-y divide-slate-100">
          {journal.closings.data?.slice(0, 5).map((closing) => (
            <div
              key={closing.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
            >
              <span className="font-semibold text-slate-800">
                {closing.closing_date}
              </span>

              <span>پیل: {money(closing.opening_balance)}</span>

              <span className="text-emerald-700">
                ترلاسه: {money(closing.customer_payments)}
              </span>

              <span className="text-rose-700">
                لګښت: {money(closing.total_expenses)}
              </span>

              <span className="font-bold text-blue-700">
                پای: {money(closing.closing_balance)}
              </span>

              <span className="text-xs text-slate-400">
                {closing.closed_by_name}
              </span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function FlowRow({
  label,
  value,
  positive,
  negative,
}: {
  label: string;
  value?: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flow-row flex items-center justify-between gap-3 rounded-xl px-3 py-2.5">
      <span>{label}</span>

      <span
        dir="ltr"
        className={
          positive
            ? "text-emerald-700"
            : negative
              ? "text-rose-700"
              : "text-slate-700"
        }
      >
        {value ? `${positive ? "+ " : negative ? "− " : ""}${money(value)}` : "—"}
      </span>
    </div>
  );
}

function JournalForm({
  title,
  description,
  icon: Icon,
  children,
  onSubmit,
  submitting,
}: {
  title: string;
  description?: string;
  icon: typeof ReceiptText;
  children: React.ReactNode;
  onSubmit: (event: React.FormEvent) => void;
  submitting: boolean;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="journal-entry-form rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">{title}</h2>

          {description && (
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {description}
            </p>
          )}
        </div>

        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100"><Icon className="size-5" /></span>
      </div>

      <div className="space-y-4">{children}</div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-px hover:bg-brand-700 hover:shadow-md disabled:opacity-50"
      >
        <Plus className="size-4" />
        {submitting ? "ثبتېږي..." : "ثبتول"}
      </button>
    </form>
  );
}

function RecordTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b px-5 py-4">
        <h2 className="font-bold text-slate-950">{title}</h2>
      </div>

      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                {headers.map((header) => (
                  <th key={header} className="px-5 py-3">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => (
                <tr key={index}>
                  {row.map((value, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-5 py-3 text-slate-700"
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="p-8 text-center text-sm text-slate-500">
          د دې ورځې لپاره معلومات نشته.
        </p>
      )}
    </section>
  );
}

function DebtRecordTable({
  title,
  records,
  paidKey,
  onRepay,
  onEdit,
  onVoid,
  onVoidRepayment,
  pending,
}: {
  title: string;
  records: (MoneyLoan | PayableAccount)[];
  paidKey: "returned_amount" | "paid_amount";
  onRepay: (input: {
    id: string;
    amount: number;
    payment_date: string;
    payment_method: PaymentMethod;
    note: string;
  }) => Promise<unknown>;
  onEdit: (input: { id: string; amount?: number; person_name?: string; purpose?: string; note?: string }) => Promise<unknown>;
  onVoid: (input: { id: string; reason: string }) => Promise<unknown>;
  onVoidRepayment: (input: { id: string; repaymentId: string; reason: string }) => Promise<unknown>;
  pending: boolean;
}) {
  const outstanding = records.filter((record) => Number(record.remaining_balance) > 0);
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b px-5 py-4">
        <h2 className="font-bold text-slate-950">{title}</h2>
      </div>

      {outstanding.length ? (
        <div className="divide-y divide-slate-100">
          {outstanding.map((record) => (
            <DebtRecord
              key={record.id}
              record={record}
              paid={
                paidKey === "returned_amount"
                  ? (record as MoneyLoan).returned_amount
                  : (record as PayableAccount).paid_amount
              }
              onRepay={onRepay}
              onEdit={onEdit}
              onVoid={onVoid}
              onVoidRepayment={onVoidRepayment}
              pending={pending}
            />
          ))}
        </div>
      ) : (
        <p className="p-8 text-center text-sm text-slate-500">
          د دې ورځې لپاره معلومات نشته.
        </p>
      )}
    </section>
  );
}

function DebtRecord({
  record,
  paid,
  onRepay,
  onEdit,
  onVoid,
  onVoidRepayment,
  pending,
}: {
  record: MoneyLoan | PayableAccount;
  paid: string;
  onRepay: (input: {
    id: string;
    amount: number;
    payment_date: string;
    payment_method: PaymentMethod;
    note: string;
  }) => Promise<unknown>;
  onEdit: (input: { id: string; amount?: number; person_name?: string; purpose?: string; note?: string }) => Promise<unknown>;
  onVoid: (input: { id: string; reason: string }) => Promise<unknown>;
  onVoidRepayment: (input: { id: string; repaymentId: string; reason: string }) => Promise<unknown>;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const repayments = record.repayments ?? [];
  const remainingAmount = Number(record.remaining_balance);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (Number(amount) <= 0 || Number(amount) > remainingAmount) {
      setError(`د ورکړې اندازه باید له پاتې حساب (${money(record.remaining_balance)}) څخه زیاته نه وي.`);
      return;
    }
    setError("");

    await onRepay({
      id: record.id,
      amount: Number(amount),
      payment_date: date,
      payment_method: method,
      note,
    });

    setAmount("");
    setNote("");
    setOpen(false);
  };

  return (
    <div className="p-5">
      <div className="grid gap-3 sm:grid-cols-5">
        <div>
          <p className="text-xs text-slate-500">{record.person_name}</p>
          <p className="mt-1 font-semibold text-slate-900">
            {record.purpose || "—"}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">نېټه</p>
          <p className="mt-1 font-semibold text-slate-700">{"loan_date" in record ? record.loan_date : record.payable_date}</p>
        </div>

        <div>
          <p className="text-xs text-slate-500">اصلي مقدار</p>
          <p className="mt-1 font-bold">{money(record.amount)}</p>
        </div>

        <div>
          <p className="text-xs text-slate-500">ورکړل / ترلاسه شوي</p>
          <p className="mt-1 font-bold text-emerald-700">{money(paid)}</p>
        </div>

        <div>
          <p className="text-xs text-slate-500">پاتې مقدار</p>
          <p className="mt-1 font-bold text-rose-700">
            {money(record.remaining_balance)} ·{" "}
            {debtStatus(record.amount, paid)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          disabled={remainingAmount <= 0}
          className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          قسط ثبتول
        </button>

        <button type="button" onClick={() => {
          const person_name = window.prompt("د شخص نوم", record.person_name);
          if (!person_name) return;
          const amountValue = window.prompt("اصلي مقدار", record.amount);
          if (!amountValue) return;
          const purpose = window.prompt("موخه", record.purpose) ?? record.purpose;
          void onEdit({ id: record.id, person_name, amount: Number(amountValue), purpose });
        }} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
          <Pencil className="size-4" /> اصلاح
        </button>

        <button type="button" onClick={() => {
          const reason = window.prompt("د لغوه کولو دلیل ولیکئ");
          if (reason && reason.trim().length >= 3 && window.confirm("دا ریکارډ لغوه شي؟")) void onVoid({ id: record.id, reason: reason.trim() });
        }} className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
          <Trash2 className="size-4" /> لغوه
        </button>

        {repayments.length > 0 && (
          <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
            {repayments.length} معاملې
          </span>
        )}
      </div>

      {open && (
        <form
          onSubmit={submit}
          className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-4"
        >
          <input
            required
            min="0.01"
            step="0.01"
            type="number"
            value={amount}
            onBlur={() => { if (Number(amount) > remainingAmount) setError(`د ورکړې اندازه باید له پاتې حساب (${money(record.remaining_balance)}) څخه زیاته نه وي.`); }}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="مقدار"
            className={inputClass}
          />

          <input
            required
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={inputClass}
          />

          <select
            value={method}
            onChange={(event) => setMethod(event.target.value as PaymentMethod)}
            className={inputClass}
          >
            <option value="CASH">نغدي</option>
            <option value="BANK">بانک</option>
            <option value="OTHER">نور</option>
          </select>

          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="یادښت"
            className={inputClass}
          />

          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-4"
          >
            {pending ? "ثبتېږي..." : "قسط ثبتول"}
          </button>
          {error && <p role="alert" className="text-sm font-semibold text-red-600 sm:col-span-4">{error}</p>}
        </form>
      )}

      {repayments.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-right text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {["نېټه", "مقدار", "طریقه", "ثبتوونکی", "یادښت", "عمل"].map(
                  (header) => (
                    <th key={header} className="px-3 py-2">
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {repayments.map((repayment: Repayment) => (
                <tr key={repayment.id}>
                  <td className="px-3 py-2">{repayment.payment_date}</td>

                  <td className="px-3 py-2 font-bold text-emerald-700">
                    {money(repayment.amount)}
                  </td>

                  <td className="px-3 py-2">
                    {repayment.payment_method === "CASH"
                      ? "نغدي"
                      : repayment.payment_method === "BANK"
                        ? "بانک"
                        : "نور"}
                  </td>

                  <td className="px-3 py-2">{repayment.created_by_name}</td>

                  <td className="px-3 py-2">{repayment.note || "—"}</td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => {
                      const reason = window.prompt("د قسط د لغوه کولو دلیل ولیکئ");
                      if (reason && reason.trim().length >= 3 && window.confirm("دا قسط لغوه شي؟")) void onVoidRepayment({ id: record.id, repaymentId: repayment.id, reason: reason.trim() });
                    }} className="rounded-lg bg-rose-50 p-2 text-rose-700" title="قسط لغوه کړئ"><Trash2 className="size-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
