// Report exports for the Dashboard — Excel (data-heavy, multi-sheet) and PDF
// (clean tabular one-pager). Both run client-side from the current dashboard.

import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { DashboardData } from "./analytics";

function stamp() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
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
