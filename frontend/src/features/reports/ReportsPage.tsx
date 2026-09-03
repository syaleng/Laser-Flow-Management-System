import { useState, type ReactNode } from "react";
import {
  Banknote,
  Download,
  FileText,
  HandCoins,
  Landmark,
  LoaderCircle,
  Printer,
  ReceiptText,
  RefreshCw,
  Scale,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  DesignOrderStatus,
  PaymentStatus,
} from "@/features/design-orders/types";
import { formatAfn, paymentMethodLabels } from "@/lib/format";
import { useFinancialReport } from "./hooks";
import type { ReportData, ReportFilters, ReportPeriod } from "./types";

const today = new Date().toISOString().slice(0, 10);

const periods: { value: ReportPeriod; label: string }[] = [
  { value: "daily", label: "ورځنی" },
  { value: "weekly", label: "اوونیز" },
  { value: "monthly", label: "میاشتنی" },
  { value: "yearly", label: "کلنی" },
  { value: "custom", label: "ټاکلې موده" },
];

const statuses = [
  { value: "", label: "ټول حالتونه" },
  { value: "NEW", label: "نوي" },
  { value: "DESIGN_PREPARATION", label: "د ډیزاین چمتووالی" },
  { value: "CUTTING", label: "پرې کول" },
  { value: "READY_FOR_DELIVERY", label: "سپارلو ته چمتو" },
  { value: "DELIVERED", label: "سپارل شوي" },
  { value: "CANCELLED", label: "لغوه شوي" },
];

const paymentStatuses = [
  { value: "", label: "ټولې تادیې" },
  { value: "CREDIT", label: "پور" },
  { value: "PARTIAL", label: "نیمه تادیه" },
  { value: "FULLY_PAID", label: "بشپړه تادیه" },
  { value: "CASH", label: "نغدي" },
];

const chartMoney = (value: number) => `${Math.round(value / 1000)}k`;

export function ReportsPage() {
  const [filters, setFilters] = useState<ReportFilters>({
    period: "monthly",
    date: today,
    status: "",
    payment_status: "",
  });
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const customReady =
    filters.period !== "custom" ||
    Boolean(
      filters.start_date &&
      filters.end_date &&
      filters.start_date <= filters.end_date,
    );

  const query = useFinancialReport(filters, customReady);

  const update = <K extends keyof ReportFilters>(
    key: K,
    value: ReportFilters[K],
  ) => setFilters((current) => ({ ...current, [key]: value }));

  const exportPdf = async () => {
    if (!query.data) return;
    setPdfError(null);
    setIsExportingPdf(true);
    try {
      const { generateFinancialReportPdf } = await import("./report-pdf");
      await generateFinancialReportPdf(query.data, filters);
    } catch {
      setPdfError("PDF جوړ نه شو. مهرباني وکړئ بیا هڅه وکړئ.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const exportCsv = () => {
    if (!query.data) return;
    const summary = query.data.summary;
    const rows = [
      ["Metric", "Amount"], ["Total sales", summary.total_sales],
      ["Received payments", summary.received_payments], ["Expenses", summary.expenses],
      ["Profit / loss", summary.profit_loss], ["Customer receivables", summary.customer_receivables],
      ["Shop payables", summary.shop_payables], ["Cash balance", summary.cash_balance],
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `laserflow-report-${filters.date}.csv`; anchor.click(); URL.revokeObjectURL(url);
  };

  return (
    <section
      dir="rtl"
      className="text-right print:bg-white"
      aria-label="مالي راپورونه"
    >
      <header className="mb-6 flex flex-col gap-4 border-b border-slate-200/80 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-600">مالي مدیریت</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">
            راپورونه
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            خرڅلاو، لګښتونه، ګټه، نغدې او پاتې حسابونه — ټول په یوه ځای کې
          </p>
        </div>

        {query.data && (
          <div className="flex flex-wrap gap-2 print:hidden">
            <button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50"><Download className="size-4" />CSV</button>
            <button
              type="button"
              onClick={() => void exportPdf()}
              disabled={isExportingPdf}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0A1F44] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0A1F44]/90 disabled:opacity-60"
            >
              {isExportingPdf ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <FileText className="size-4" />
              )}
              PDF
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              <Printer className="size-4" />
              چاپ
            </button>
          </div>
        )}
      </header>

      {pdfError && (
        <div
          role="alert"
          className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 print:hidden"
        >
          {pdfError}
        </div>
      )}

      <Filters filters={filters} data={query.data} update={update} />

      {!customReady && (
        <StatePanel
          title="سمه موده وټاکئ"
          detail="د پیل نېټه باید د پای نېټې څخه مخکې یا برابره وي."
        />
      )}

      {query.isLoading && <ReportSkeleton />}

      {query.isError && (
        <StatePanel
          title="راپور پورته نه شو"
          detail={
            query.error instanceof Error
              ? query.error.message
              : "له سرور سره اړیکه ونه نیول شوه."
          }
          action={
            <button
              type="button"
              onClick={() => query.refetch()}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              <RefreshCw className="size-4" />
              بیا هڅه
            </button>
          }
        />
      )}

      {query.data && (
        <ReportContent
          data={query.data}
          customerFiltered={Boolean(filters.customer_id)}
        />
      )}
    </section>
  );
}

function Filters({
  filters,
  data,
  update,
}: {
  filters: ReportFilters;
  data?: ReportData;
  update: <K extends keyof ReportFilters>(
    key: K,
    value: ReportFilters[K],
  ) => void;
}) {
  return (
    <section
      className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden"
      aria-label="د راپور چاڼ"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Filter label="موده">
          <select
            aria-label="موده"
            value={filters.period}
            onChange={(e) => update("period", e.target.value as ReportPeriod)}
            className="field"
          >
            {periods.map((x) => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </select>
        </Filter>

        {filters.period === "custom" ? (
          <>
            <Filter label="له نېټې">
              <input
                aria-label="له نېټې"
                type="date"
                value={filters.start_date ?? ""}
                onChange={(e) => update("start_date", e.target.value)}
                className="field"
              />
            </Filter>
            <Filter label="تر نېټې">
              <input
                aria-label="تر نېټې"
                type="date"
                value={filters.end_date ?? ""}
                onChange={(e) => update("end_date", e.target.value)}
                className="field"
              />
            </Filter>
          </>
        ) : (
          <Filter label="مرجع نېټه">
            <input
              aria-label="مرجع نېټه"
              type="date"
              value={filters.date ?? today}
              onChange={(e) => update("date", e.target.value)}
              className="field"
            />
          </Filter>
        )}

        <Filter label="مشتري">
          <select
            aria-label="مشتري"
            value={filters.customer_id ?? ""}
            onChange={(e) => update("customer_id", e.target.value)}
            className="field"
          >
            <option value="">ټول مشتریان</option>
            {data?.filter_options.customers.map((x) => (
              <option key={x.id} value={x.id}>
                {x.full_name}
              </option>
            ))}
          </select>
        </Filter>

        <Filter label="د فرمایش حالت">
          <select
            aria-label="د فرمایش حالت"
            value={filters.status ?? ""}
            onChange={(e) =>
              update("status", e.target.value as DesignOrderStatus | "")
            }
            className="field"
          >
            {statuses.map((x) => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </select>
        </Filter>

        <Filter label="د تادیې حالت">
          <select
            aria-label="د تادیې حالت"
            value={filters.payment_status ?? ""}
            onChange={(e) =>
              update("payment_status", e.target.value as PaymentStatus | "")
            }
            className="field"
          >
            {paymentStatuses.map((x) => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </select>
        </Filter>
      </div>
    </section>
  );
}

function ReportContent({
  data,
  customerFiltered,
}: {
  data: ReportData;
  customerFiltered: boolean;
}) {
  const s = data.summary;
  const profit = Number(s.profit_loss);

  const cards = [
    {
      label: "خرڅلاو",
      value: s.total_sales,
      icon: Scale,
      description: "په دې موده کې ټول ترلاسه شوي فرمایشونه",
      bg: "bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200",
      iconBg: "bg-emerald-500 text-white",
      valueColor: "text-emerald-700",
    },
    {
      label: "ټول لګښتونه",
      value: s.expenses,
      icon: ReceiptText,
      description: "د دوکان ټول مصرف شوي پیسې",
      bg: "bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200",
      iconBg: "bg-rose-500 text-white",
      valueColor: "text-rose-700",
    },
    {
      label: profit >= 0 ? "ګټه" : "زیان",
      value: String(Math.abs(profit)),
      icon: profit >= 0 ? TrendingUp : TrendingDown,
      description:
        profit >= 0 ? "په دې موده کې ګټه شوې ده" : "په دې موده کې زیان شوی دی",
      bg:
        profit >= 0
          ? "bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-300"
          : "bg-gradient-to-br from-rose-50 to-rose-100 border-rose-300",
      iconBg:
        profit >= 0 ? "bg-emerald-500 text-white" : "bg-rose-500 text-white",
      valueColor: profit >= 0 ? "text-emerald-700" : "text-rose-700",
    },
    {
      label: "موجوده نغدي",
      value: s.cash_balance,
      icon: Banknote,
      description: "اوس په دوکان کې موجودې نغدې پیسې",
      bg:
        Number(s.cash_balance) < 0
          ? "bg-gradient-to-br from-rose-50 to-rose-100 border-rose-300"
          : "bg-gradient-to-br from-sky-50 to-sky-100 border-sky-200",
      iconBg:
        Number(s.cash_balance) < 0
          ? "bg-rose-500 text-white"
          : "bg-sky-500 text-white",
      valueColor: Number(s.cash_balance) < 0 ? "text-rose-700" : "text-sky-700",
    },
    {
      label: "موږ ته پاتې حسابونه",
      value: s.customer_receivables,
      icon: WalletCards,
      description: "هغه پیسې چې مشتریان یې لا موږ ته راکوي",
      bg: "bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200",
      iconBg: "bg-amber-500 text-white",
      valueColor: "text-amber-700",
    },
    {
      label: "موږ ته پاتې پورونه",
      value: s.loan_balances,
      icon: Landmark,
      description: "هغه پورونه چې اشخاص یا دوکانداران یې موږ ته راکوي",
      bg: "bg-gradient-to-br from-violet-50 to-violet-100 border-violet-200",
      iconBg: "bg-violet-500 text-white",
      valueColor: "text-violet-700",
    },
    {
      label: "زموږ پر غاړه پاتې پورونه",
      value: s.shop_payables,
      icon: HandCoins,
      description: "هغه پیسې چې موږ یې اشخاصو یا دوکاندارانو ته ورکوو",
      bg: "bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200",
      iconBg: "bg-orange-500 text-white",
      valueColor: "text-orange-700",
    },
  ];

  const empty =
    s.total_orders === 0 &&
    Number(s.received_payments) === 0 &&
    Number(s.expenses) === 0 &&
    data.customers.length === 0;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <p>
          د راپور موده:{" "}
          <span dir="ltr" className="font-medium text-slate-700">
            {data.filters.start_date} — {data.filters.end_date}
          </span>
        </p>
        {customerFiltered && (
          <p className="rounded-xl bg-blue-50 px-3 py-1.5 text-blue-700 print:hidden">
            د مشتری شمېرې د ټاکلي مشتری دي؛ عمومي پورونه جلا ښودل کېږي.
          </p>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(
          ({
            label,
            value,
            icon: Icon,
            description,
            bg,
            iconBg,
            valueColor,
          }) => (
            <article
              key={label}
              className={`group rounded-2xl border p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${bg}`}
            >
              <div
                className={`mb-4 grid size-11 place-items-center rounded-xl shadow-sm transition-transform duration-300 group-hover:scale-110 ${iconBg}`}
              >
                <Icon className="size-5" />
              </div>

              <p className="text-sm font-medium text-slate-600">{label}</p>
              <p
                dir="ltr"
                className={`mt-1 text-right text-2xl font-bold tracking-tight ${valueColor}`}
              >
                {formatAfn(value)}
              </p>
              {description && (
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {description}
                </p>
              )}
            </article>
          ),
        )}
      </div>

      {empty && (
        <div className="mt-6">
          <StatePanel
            title="معلومات نشته"
            detail="د ټاکلو چاڼونو لپاره مالي معلومات ونه موندل شول."
          />
        </div>
      )}

      {/* Expense Report - په چاپ کې پاتې وي */}
      <ExpenseReport expenses={data.expenses} />

      {/* Charts - په چاپ کې پټ شي */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2 print-hide">
        <Chart title="خرڅلاو، لګښت او ګټه">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data.charts.financial_trend}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis
                tickFormatter={chartMoney}
                width={55}
                tick={{ fontSize: 11 }}
              />
              <ReferenceLine y={0} stroke="#94a3b8" />
              <Tooltip formatter={(v) => formatAfn(Number(v))} />
              <Legend />
              <Bar
                dataKey="sales"
                name="خرڅلاو"
                fill="#16a34a"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="expenses"
                name="لګښت"
                fill="#e11d48"
                radius={[4, 4, 0, 0]}
              />
              <Line
                dataKey="profit"
                name="ګټه / زیان"
                stroke="#7c3aed"
                strokeWidth={3}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Chart>

        <Chart title="د فرمایشونو بهیر">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data.charts.financial_trend}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar
                dataKey="orders"
                name="فرمایشونه"
                fill="#2563eb"
                radius={[4, 4, 0, 0]}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Chart>
      </div>

      {/* Customer Table */}
      <CustomerTable rows={data.customers} />

      {/* Debts */}
      <div className="grid gap-6 xl:grid-cols-2">
        <DebtTable
          title="موږ ته پاتې حسابونه"
          headers={["مشتري", "پاتې حساب"]}
          rows={data.debts.customer_receivables.map((x) => [
            x.customer_name,
            formatAfn(x.remaining_balance),
          ])}
          empty="موږ ته پاتې حساب نشته."
        />
        <DebtTable
          title="زموږ پر غاړه پاتې پورونه"
          headers={["شخص / دوکاندار", "موخه", "پاتې حساب"]}
          rows={data.debts.shop_payables.map((x) => [
            x.person_name,
            x.purpose,
            formatAfn(x.remaining_balance),
          ])}
          empty="زموږ پر غاړه پاتې پور نشته."
        />
      </div>

      {/* Loan repayments - په چاپ کې پټ شي */}
      <div className="print-hide">
        <DebtTable
          title="د پورونو بېرته ترلاسه کولو تاریخ"
          headers={["شخص", "نېټه", "مقدار", "طریقه", "ثبتوونکی"]}
          rows={data.debts.loan_repayments.map((x) => [
            x.person_name,
            x.payment_date,
            formatAfn(x.amount),
            paymentMethodLabels[x.payment_method] ?? x.payment_method,
            x.recorded_by,
          ])}
          empty="په دې موده کې پور نه دی بېرته ترلاسه شوی."
        />
      </div>
    </>
  );
}

function ExpenseReport({ expenses }: { expenses: ReportData["expenses"] }) {
  const chart = expenses.groups.map((x) => ({
    name: x.label,
    amount: Number(x.total),
  }));

  return (
    <section className="expense-report mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-brand-600">
        د لګښتونو ځانګړی راپور
      </p>
      <h2 className="mt-1 text-xl font-bold text-slate-950">
        په کومه برخه کې څومره مصرف شوی؟
      </h2>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {expenses.groups.map((x) => (
          <div
            key={x.key}
            className="expense-metric rounded-xl border border-slate-100 bg-slate-50/80 p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm text-slate-500">{x.label}</p>
            <p
              dir="ltr"
              className="mt-2 text-right text-lg font-bold text-slate-900"
            >
              {formatAfn(x.total)}
            </p>
          </div>
        ))}
        <div className="expense-total rounded-xl border border-blue-100 bg-blue-50 p-4 text-blue-900 transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-sm font-medium">ټول مصارف</p>
          <p dir="ltr" className="mt-2 text-right text-lg font-bold">
            {formatAfn(expenses.total)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div dir="ltr" className="h-64 print-hide">
          <ResponsiveContainer>
            <ComposedChart layout="vertical" data={chart}>
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="#e2e8f0"
              />
              <XAxis type="number" tickFormatter={chartMoney} />
              <YAxis
                type="category"
                dataKey="name"
                width={135}
                tick={{ fontSize: 11 }}
              />
              <Tooltip formatter={(v) => formatAfn(Number(v))} />
              <Bar
                dataKey="amount"
                name="مصارف"
                fill="#2563eb"
                radius={[0, 4, 4, 0]}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          {expenses.rows.length ? (
            <table className="w-full text-sm">
              <thead className="bg-slate-100/80">
                <tr>
                  {["برخه", "فرعي برخه", "مقدار", "سلنه"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-right text-xs font-bold text-slate-600"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.rows.map((x) => (
                  <tr
                    key={`${x.group}-${x.subcategory}`}
                    className="border-t border-slate-100 transition hover:bg-slate-50/80"
                  >
                    <td className="px-4 py-3">{x.group_label}</td>
                    <td className="px-4 py-3 font-semibold">{x.subcategory}</td>
                    <td dir="ltr" className="px-4 py-3 text-right">
                      {formatAfn(x.amount)}
                    </td>
                    <td
                      dir="ltr"
                      className="px-4 py-3 text-right text-slate-500"
                    >
                      {x.percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-8 text-center text-sm text-slate-500">
              په ټاکلې موده کې لګښت نشته.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function CustomerTable({ rows }: { rows: ReportData["customers"] }) {
  return (
    <section className="report-table-card customer-report mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <h2 className="border-b border-slate-100 p-5 text-lg font-bold text-slate-950">
        د مشتریانو راپور
      </h2>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100/80">
              <tr>
                {["مشتري", "فرمایشونه", "ارزښت", "تادیه", "پاتې"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-right text-xs font-bold text-slate-600"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr
                  key={x.customer_id}
                  className="border-t border-slate-100 transition hover:bg-slate-50/80"
                >
                  <td className="px-4 py-3.5 font-semibold text-slate-900">
                    {x.customer_name}
                  </td>
                  <td className="px-4 py-3.5">{x.total_orders}</td>
                  <td className="px-4 py-3.5">
                    {formatAfn(x.total_order_value)}
                  </td>
                  <td className="px-4 py-3.5">{formatAfn(x.total_paid)}</td>
                  <td className="px-4 py-3.5 font-medium">
                    {formatAfn(x.remaining_balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="p-6 text-sm text-slate-500">د مشتریانو معلومات نشته.</p>
      )}
    </section>
  );
}

function DebtTable({
  title,
  headers,
  rows,
  empty,
}: {
  title: string;
  headers: string[];
  rows: string[][];
  empty: string;
}) {
  return (
    <section className="report-table-card debt-report mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <h2 className="border-b border-slate-100 p-5 text-lg font-bold text-slate-950">
        {title}
      </h2>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100/80">
              <tr>
                {headers.map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-right text-xs font-bold text-slate-600"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={`${r[0]}-${i}`}
                  className="border-t border-slate-100 transition hover:bg-slate-50/80"
                >
                  {r.map((c, j) => (
                    <td key={`${c}-${j}`} className="px-4 py-3.5">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="p-6 text-sm text-slate-500">{empty}</p>
      )}
    </section>
  );
}

function Filter({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-medium text-slate-500">
      {label}
      {children}
    </label>
  );
}

function Chart({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="report-chart rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-slate-950">{title}</h2>
      <div dir="ltr">{children}</div>
    </section>
  );
}

function StatePanel({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="status"
      className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center"
    >
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{detail}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div
      aria-label="راپور پورته کېږي"
      className="grid animate-pulse gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-36 rounded-2xl bg-slate-200/80" />
      ))}
    </div>
  );
}
