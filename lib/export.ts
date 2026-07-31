// Report exports for the Dashboard — Excel (data-heavy, multi-sheet) and PDF
// (clean tabular one-pager). Both run client-side from the current dashboard.

import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { DashboardData } from "./analytics";

function stamp() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export interface POLine {
  sku: string;
  reorder: number;
  /** Per-unit cost, when the source data carries a price/cost column. */
  price?: number;
}

export interface POOptions {
  /** The logged-in company's real name — never a fallback/sample value. */
  businessName: string;
  /** The logged-in user who clicked Generate PO — shown as the Requisitioner. */
  generatedBy?: string;
  currency?: string;
}

type AutoTableDoc = jsPDF & { lastAutoTable: { finalY: number } };

/** Generate a Purchase Order PDF matching a standard vendor-PO template. */
export function exportPO(lines: POLine[], { businessName, generatedBy, currency = "$" }: POOptions) {
  const marginX = 14;
  const pageWidth = 210;
  const contentWidth = pageWidth - marginX * 2;
  const brand: [number, number, number] = [29, 78, 216];
  // jsPDF's built-in fonts only support WinAnsi (Latin-1) glyphs — $, €, £
  // render fine, but ₹ (U+20B9) has no glyph and silently prints as a
  // garbled superscript. Substitute a safe ASCII label for it here.
  const currencyLabel = currency === "₹" ? "Rs. " : currency;
  const money = (n: number) => `${currencyLabel}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const poNumber = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 900 + 100)}`;

  // Page height scales with content instead of a fixed A4, so a short PO
  // doesn't leave most of the sheet blank. Clamped to standard A4 height —
  // beyond that, autoTable paginates normally rather than clipping.
  const pageHeight = Math.min(Math.max(200 + lines.length * 7, 210), 297);
  const doc = new jsPDF({ unit: "mm", format: [pageWidth, pageHeight] }) as AutoTableDoc;

  let y = 18;

  // Letterhead (left) + document title (right).
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(20);
  doc.text(businessName, marginX, y);
  doc.setTextColor(...brand);
  doc.setFontSize(22);
  doc.text("PURCHASE ORDER", pageWidth - marginX, y, { align: "right" });

  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text("DATE", pageWidth - marginX - 55, y);
  doc.text(stamp(), pageWidth - marginX, y, { align: "right" });
  y += 6;
  doc.text("PO #", pageWidth - marginX - 55, y);
  doc.text(poNumber, pageWidth - marginX, y, { align: "right" });

  y += 8;
  doc.setDrawColor(...brand);
  doc.setLineWidth(0.8);
  doc.line(marginX, y, pageWidth - marginX, y);
  doc.setLineWidth(0.2);

  // Vendor / Ship To boxes, side by side.
  y += 8;
  const boxW = (contentWidth - 6) / 2;
  const boxH = 24;
  function box(x: number, title: string, body: string[]) {
    doc.setFillColor(...brand);
    doc.rect(x, y, boxW, 7, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title, x + 3, y + 4.8);
    doc.setDrawColor(226, 232, 240);
    doc.rect(x, y + 7, boxW, boxH - 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60);
    body.forEach((line, i) => doc.text(line, x + 3, y + 13 + i * 5.5, { maxWidth: boxW - 6 }));
  }
  box(marginX, "VENDOR", ["To be confirmed", "Confirm with your supplier before dispatch."]);
  box(
    marginX + boxW + 6,
    "SHIP TO",
    [businessName, generatedBy ? `Attn: ${generatedBy}` : ""].filter(Boolean),
  );
  y += boxH + 6;

  // Requisitioner / Ship Via / F.O.B. / Shipping Terms.
  autoTable(doc, {
    startY: y,
    head: [["REQUISITIONER", "SHIP VIA", "F.O.B.", "SHIPPING TERMS"]],
    body: [[generatedBy ?? "—", "—", "—", "—"]],
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: brand, fontSize: 8 },
    margin: { left: marginX, right: marginX },
  });
  y = doc.lastAutoTable.finalY + 8;

  // Line items.
  const hasPricing = lines.length > 0 && lines.every((l) => typeof l.price === "number");
  autoTable(doc, {
    startY: y,
    head: [["ITEM #", "DESCRIPTION", "QTY", "UNIT PRICE", "TOTAL"]],
    body: lines.map((l, i) => [
      String(i + 1),
      l.sku,
      String(l.reorder),
      typeof l.price === "number" ? money(l.price) : "—",
      typeof l.price === "number" ? money(l.reorder * l.price) : "—",
    ]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: brand },
    columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    margin: { left: marginX, right: marginX },
  });
  y = doc.lastAutoTable.finalY + 6;

  // Totals summary (right) — run first so the comments box can match its height.
  const subtotal = hasPricing ? lines.reduce((sum, l) => sum + l.reorder * (l.price ?? 0), 0) : null;
  const commentsW = 110;
  const summaryX = marginX + commentsW + 8;
  autoTable(doc, {
    startY: y,
    margin: { left: summaryX, right: marginX },
    tableWidth: pageWidth - marginX - summaryX,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 1.6 },
    columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right" } },
    body: [
      ["SUBTOTAL", subtotal !== null ? money(subtotal) : "—"],
      ["TAX", "—"],
      ["SHIPPING", "—"],
      ["OTHER", "—"],
      ["TOTAL", subtotal !== null ? money(subtotal) : "—"],
    ],
    didParseCell: (data) => {
      if (data.row.index === 4) {
        data.cell.styles.fillColor = brand;
        data.cell.styles.textColor = 255;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
  const summaryFinalY = doc.lastAutoTable.finalY;
  const commentsH = Math.max(summaryFinalY - y, 26);

  // Comments box (left), height-matched to the totals block.
  doc.setFillColor(226, 232, 240);
  doc.rect(marginX, y, commentsW, 7, "F");
  doc.setTextColor(30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("COMMENTS OR SPECIAL INSTRUCTIONS", marginX + 3, y + 4.8);
  doc.setDrawColor(226, 232, 240);
  doc.rect(marginX, y + 7, commentsW, commentsH - 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(90);
  doc.text(
    "Auto-generated from SmartOps stock alerts. Confirm quantities and pricing with your supplier before dispatch.",
    marginX + 3,
    y + 13,
    { maxWidth: commentsW - 6 },
  );

  doc.save(`${poNumber}.pdf`);
}

function baseName(d: DashboardData) {
  const src = d.isSample ? "Sample" : d.source.replace(/\.[^.]+$/, "").replace(/[^a-z0-9]+/gi, "_");
  return `SmartOps_Report_${src}_${stamp()}`;
}

/** Multi-sheet .xlsx: one tab per report section. */
export function exportExcel(d: DashboardData) {
  const wb = XLSX.utils.book_new();

  const summary = d.kpiCards.map((c) => ({ Metric: c.label, Value: c.value, Note: c.sub ?? "" }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "Summary");

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(d.topSkus.map((s) => ({ SKU: s.sku, "Units Sold": s.units }))),
    "Top SKUs",
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(d.abcBreakdown.map((c) => ({ Class: c.name, SKUs: c.skus, "Revenue %": c.revenuePct }))),
    "ABC",
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      d.stockoutRisks.map((s) => ({
        SKU: s.sku,
        "On Hand": s.onHand,
        "Daily Sales": s.dailySales,
        "Days Left": s.daysLeft,
        "Reorder Qty": s.reorder,
      })),
    ),
    "Stockout Risks",
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      d.slowMovers.map((m) => ({
        SKU: m.sku,
        Units: m.units,
        Value: m.value,
        Status: m.daysIdle > 0 ? `${m.daysIdle}d idle` : "low sales",
      })),
    ),
    "Slow Movers",
  );

  XLSX.writeFile(wb, `${baseName(d)}.xlsx`);
}

/** Clean tabular PDF report. */
export function exportPdf(d: DashboardData) {
  const doc = new jsPDF();
  const marginX = 14;

  doc.setFontSize(18);
  doc.text("SmartOps — Operations Report", marginX, 20);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Source: ${d.source}   ·   Generated ${stamp()}`, marginX, 27);
  doc.setTextColor(0);

  let y = 34;
  const section = (title: string, head: string[], body: (string | number)[][]) => {
    if (body.length === 0) return;
    autoTable(doc, {
      startY: y,
      head: [[title]],
      body: [],
      theme: "plain",
      headStyles: { fontStyle: "bold", fontSize: 12, textColor: 30 },
    });
    autoTable(doc, {
      startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY,
      head: [head],
      body,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [29, 78, 216] },
      margin: { left: marginX, right: marginX },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  };

  section("Key Metrics", ["Metric", "Value", "Note"], d.kpiCards.map((c) => [c.label, c.value, c.sub ?? ""]));
  section(
    "Reorder Now",
    ["SKU", "On Hand", "Daily", "Days Left", "Reorder"],
    d.stockoutRisks.map((s) => [s.sku, s.onHand, s.dailySales, s.daysLeft, s.reorder]),
  );
  section(
    "Slow-Movers",
    ["SKU", "Units", "Value", "Status"],
    d.slowMovers.map((m) => [m.sku, m.units, m.value, m.daysIdle > 0 ? `${m.daysIdle}d idle` : "low sales"]),
  );
  section("Top SKUs", ["SKU", "Units Sold"], d.topSkus.map((s) => [s.sku, s.units]));
  section("ABC Classification", ["Class", "SKUs", "Revenue %"], d.abcBreakdown.map((c) => [c.name, c.skus, `${c.revenuePct}%`]));

  doc.save(`${baseName(d)}.pdf`);
}
