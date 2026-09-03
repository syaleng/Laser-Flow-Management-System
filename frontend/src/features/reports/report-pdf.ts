import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import notoNaskhArabicUrl from "@/assets/fonts/NotoNaskhArabic.ttf?url";
import { formatAfn, paymentMethodLabels } from "@/lib/format";
import type { ReportData, ReportFilters } from "./types";

const PRIMARY = "#0A1F44";
const GOLD = "#D4A017";
const SLATE = "#334155";
const MUTED = "#64748B";
const LIGHT = "#F8FAFC";
const BORDER = "#E2E8F0";
const FONT = "NotoNaskhArabic";
const PASHTO = /[\u0600-\u06FF]/;

const periodLabels: Record<ReportFilters["period"], string> = {
  daily: "ورځنی",
  weekly: "اوونیز",
  monthly: "میاشتنی",
  yearly: "کلنی",
  custom: "ټاکلې موده",
};

const statusLabels: Record<string, string> = {
  NEW: "نوی",
  DESIGN_PREPARATION: "د ډیزاین چمتووالی",
  CUTTING: "پرې کول",
  READY_FOR_DELIVERY: "سپارلو ته چمتو",
  DELIVERED: "سپارل شوی",
  CANCELLED: "لغوه شوی",
};

const paymentStatusLabels: Record<string, string> = {
  CREDIT: "پور",
  PARTIAL: "نیمه تادیه",
  FULLY_PAID: "بشپړه تادیه",
  CASH: "نغدي",
};

const money = formatAfn;

function pdfText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  options?: Parameters<jsPDF["text"]>[3],
): void {
  const rtl = PASHTO.test(text);
  doc.text(text, x, y, {
    ...options,
    isInputVisual: false,
    isInputRtl: rtl,
    isOutputVisual: true,
    isOutputRtl: false,
    isSymmetricSwapping: rtl,
  });
}

async function fontAsBase64(): Promise<string> {
  const response = await fetch(notoNaskhArabicUrl);
  if (!response.ok) throw new Error("د PDF لیکدود پورته نه شو.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed <= 190) return y;
  doc.addPage();
  return 20;
}

function sectionTitle(doc: jsPDF, title: string, y: number): number {
  // Reserve room for the heading, table header, and at least one data row.
  const nextY = ensureSpace(doc, y, 32);
  doc.setFillColor(PRIMARY);
  doc.roundedRect(14, nextY, 269, 9, 1.5, 1.5, "F");
  doc.setTextColor("#FFFFFF");
  doc.setFontSize(10);
  pdfText(doc, title, 278, nextY + 6.2, { align: "right" });
  return nextY + 13;
}

function table(
  doc: jsPDF,
  y: number,
  head: string[],
  body: Array<Array<string | number>>,
): number {
  const cellLines = new Map<string, string[]>();

  autoTable(doc, {
    startY: y,
    head: [head],
    body: body.length ? body : [["معلومات نشته"]],
    theme: "grid",
    pageBreak: "auto",
    rowPageBreak: "avoid",
    showHead: "everyPage",
    margin: { left: 14, right: 14, top: 18, bottom: 16 },
    styles: {
      font: FONT,
      fontSize: 8.5,
      halign: "right",
      valign: "middle",
      cellPadding: 3,
      textColor: SLATE,
      lineColor: BORDER,
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: PRIMARY,
      textColor: "#FFFFFF",
      fontStyle: "normal",
      fontSize: 9,
    },
    alternateRowStyles: { fillColor: LIGHT },
    didParseCell: ({ cell, column, row, section }) => {
      cellLines.set(`${section}-${row.index}-${column.index}`, [...cell.text]);
    },
    willDrawCell: ({ cell }) => {
      cell.text = [];
    },
    didDrawCell: ({ cell, column, row, section }) => {
      const lines =
        cellLines.get(`${section}-${row.index}-${column.index}`) ?? [];
      if (!lines.length) return;

      const fontSize = cell.styles.fontSize;
      const lineHeight = (fontSize / doc.internal.scaleFactor) * 1.2;
      const totalHeight = lineHeight * lines.length;
      let textY = cell.y + (cell.height - totalHeight) / 2 + lineHeight * 0.8;

      doc.setFont(FONT, "normal");
      doc.setFontSize(fontSize);
      doc.setTextColor(section === "head" ? "#FFFFFF" : SLATE);

      lines.forEach((line) => {
        pdfText(doc, line, cell.x + cell.width - 3, textY, { align: "right" });
        textY += lineHeight;
      });
    },
  });

  return (
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? y
  );
}

function activeFilters(
  data: ReportData,
  filters: ReportFilters,
): Array<[string, string]> {
  const customer = data.filter_options.customers.find(
    (item) => item.id === filters.customer_id,
  );
  return [
    [periodLabels[filters.period], "موده"],
    [`${data.filters.start_date} — ${data.filters.end_date}`, "د نېټې حد"],
    [customer?.full_name ?? "ټول مشتریان", "مشتري"],
    [
      filters.status
        ? (statusLabels[filters.status] ?? filters.status)
        : "ټول حالتونه",
      "د فرمایش حالت",
    ],
    [
      filters.payment_status
        ? (paymentStatusLabels[filters.payment_status] ??
          filters.payment_status)
        : "ټولې تادیې",
      "د تادیې حالت",
    ],
  ];
}

export async function generateFinancialReportPdf(
  data: ReportData,
  filters: ReportFilters,
): Promise<void> {
  const preview = window.open("", "_blank");
  if (!preview) throw new Error("د PDF د کتلو کړکۍ خلاصه نه شوه.");
  preview.document.title = "LaserFlow PDF";
  preview.document.body.innerHTML =
    '<p style="font-family:system-ui;padding:24px;direction:rtl">د PDF چمتو کېږي...</p>';

  const filename = `LaserFlow_Report_${new Date().toISOString().slice(0, 10)}.pdf`;

  try {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
      putOnlyUsedFonts: true,
    });

    doc.addFileToVFS("NotoNaskhArabic.ttf", await fontAsBase64());
    doc.addFont("NotoNaskhArabic.ttf", FONT, "normal");
    doc.setFont(FONT, "normal");
    doc.setProperties({
      title: filename,
      subject: "LaserFlow financial report",
      creator: "LaserFlow",
    });

    // Header
    doc.setFillColor(PRIMARY);
    doc.rect(0, 0, 297, 26, "F");
    doc.setTextColor("#FFFFFF");
    doc.setFontSize(18);
    pdfText(doc, "LaserFlow", 16, 11);
    doc.setFontSize(13);
    pdfText(doc, "مسلکي مالي راپور", 281, 11, { align: "right" });
    doc.setFontSize(8);
    doc.setTextColor(GOLD);
    pdfText(doc, "جوړېدو نېټه:", 281, 19, { align: "right" });
    pdfText(doc, new Date().toISOString().slice(0, 10), 240, 19, {
      align: "right",
    });

    let y = 34;

    // Filters
    y = sectionTitle(doc, "ټاکل شوي شرایط", y);
    y =
      table(
        doc,
        y,
        ["ارزښت", "شرط"],
        activeFilters(data, filters).map(([value, label]) => [value, label]),
      ) + 6;

    // Summary
    y = sectionTitle(doc, "مالي لنډیز", y);
    const s = data.summary;
    y =
      table(
        doc,
        y,
        ["ارزښت", "نوم"],
        [
          [s.total_orders.toLocaleString(), "ټول فرمایشونه"],
          [money(s.total_sales), "ټول خرڅلاو"],
          [money(s.received_payments), "د مشتریانو ورکړې"],
          [money(s.expenses), "لګښتونه"],
          [money(s.supplier_payments), "عرضه کوونکو ته ورکړې"],
          [money(s.profit_loss), "ګټه / زیان"],
          [money(s.customer_receivables), "موږ ته پاتې حسابونه"],
          [money(s.shop_payables), "زموږ پر غاړه پاتې پورونه"],
          [money(s.loan_balances), "ورکړل شوي پورونه"],
          [money(s.cash_movement), "د نغدو پیسو بدلون"],
          [money(s.cash_balance), "موجوده نغدي"],
        ],
      ) + 6;

    // Expenses
    y = sectionTitle(doc, "د لګښتونو راپور", y);
    y =
      table(
        doc,
        y,
        ["سلنه", "مقدار", "فرعي برخه", "برخه"],
        data.expenses.rows.map((row) => [
          `${row.percentage}%`,
          money(row.amount),
          row.subcategory,
          row.group_label,
        ]),
      ) + 6;

    // Trend numbers
    y = sectionTitle(doc, "د مالي بهیر شمېرې", y);
    y =
      table(
        doc,
        y,
        ["فرمایشونه", "ګټه / زیان", "لګښت", "خرڅلاو", "نېټه"],
        data.charts.financial_trend.map((row) => [
          row.orders,
          money(row.profit),
          money(row.expenses),
          money(row.sales),
          row.date,
        ]),
      ) + 6;

    // Customers
    y = sectionTitle(doc, "د مشتریانو راپور", y);
    y =
      table(
        doc,
        y,
        ["پاتې", "تادیه", "ارزښت", "فرمایشونه", "کوډ", "مشتري"],
        data.customers.map((row) => [
          money(row.remaining_balance),
          money(row.total_paid),
          money(row.total_order_value),
          row.total_orders,
          row.customer_code,
          row.customer_name,
        ]),
      ) + 6;

    // Payment history
    y = sectionTitle(doc, "د مشتریانو د تادیاتو تاریخ", y);
    y =
      table(
        doc,
        y,
        ["یادښت", "ثبتوونکی", "فرمایش", "مقدار", "نېټه", "مشتري"],
        data.customers.flatMap((customer) =>
          customer.payment_history.map((payment) => [
            payment.note || "—",
            payment.recorded_by,
            payment.order_number,
            money(payment.amount),
            payment.date,
            customer.customer_name,
          ]),
        ),
      ) + 6;

    // Receivables
    y = sectionTitle(doc, "موږ ته پاتې حسابونه", y);
    y =
      table(
        doc,
        y,
        ["پاتې بیلانس", "مشتري"],
        data.debts.customer_receivables.map((item) => [
          money(item.remaining_balance),
          item.customer_name,
        ]),
      ) + 6;

    // Payables
    y = sectionTitle(doc, "زموږ پر غاړه پاتې پورونه", y);
    y =
      table(
        doc,
        y,
        ["پاتې بیلانس", "اصلي مقدار", "نېټه", "موخه", "شخص / شرکت"],
        data.debts.shop_payables.map((item) => [
          money(item.remaining_balance),
          money(item.original_amount),
          item.payable_date,
          item.purpose,
          item.person_name,
        ]),
      ) + 6;

    // Loan repayments
    y = sectionTitle(doc, "د پورونو د بېرته ورکړې تاریخ", y);
    y =
      table(
        doc,
        y,
        ["ثبتوونکی", "طریقه", "مقدار", "نېټه", "شخص"],
        data.debts.loan_repayments.map((item) => [
          item.recorded_by,
          paymentMethodLabels[item.payment_method] ?? item.payment_method,
          money(item.amount),
          item.payment_date,
          item.person_name,
        ]),
      );

    // Final summary
    // Reserve the complete section (heading, table header, and all rows) so
    // autoTable cannot split the summary onto a mostly empty trailing page.
    y = ensureSpace(doc, y, 85);
    y = sectionTitle(doc, "وروستی مالي لنډیز", y);
    table(
      doc,
      y,
      ["ارزښت", "نوم"],
      [
        [money(s.total_sales), "ټول خرڅلاو"],
        [money(s.received_payments), "ترلاسه شوې پیسې"],
        [money(s.expenses), "ټول لګښتونه"],
        [money(s.profit_loss), "ګټه / زیان"],
        [money(s.cash_movement), "د نغدو پیسو بدلون"],
        [money(s.cash_balance), "موجوده نغدي"],
      ],
    );

    // Footer
    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page++) {
      doc.setPage(page);
      if (page > 1) {
        doc.setFillColor(PRIMARY);
        doc.rect(0, 0, 297, 10, "F");
        doc.setTextColor("#FFFFFF");
        doc.setFontSize(8);
        pdfText(doc, "LaserFlow", 14, 6.8);
        pdfText(doc, "مسلکي مالي راپور", 283, 6.8, { align: "right" });
        doc.setTextColor(GOLD);
        doc.setFontSize(7);
        pdfText(
          doc,
          `${data.filters.start_date} — ${data.filters.end_date}`,
          148.5,
          6.8,
          { align: "center" },
        );
      }
      doc.setDrawColor(BORDER);
      doc.line(14, 198, 283, 198);
      doc.setTextColor(MUTED);
      doc.setFontSize(7);
      pdfText(doc, `LaserFlow  •  ${page} / ${pages}`, 148.5, 203, {
        align: "center",
      });
      pdfText(doc, "جوړونکی: نقیب الله سیال", 18, 203, { align: "left" });
    }

    const pdfUrl = URL.createObjectURL(doc.output("blob"));
    preview.location.replace(pdfUrl);
    window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 300_000);
  } catch (error) {
    preview.close();
    throw error;
  }
}
