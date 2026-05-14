// Open an Eurozone invoice for the current BOM in a new tab. The user prints
// to PDF from there. Keeps the export self-contained — no react-pdf / jsPDF
// dependency, no extra Next route.

import type { ResolvedLine } from "./derive";

type InvoiceMeta = {
  client: string;        // brand name (e.g. "TAG Heuer")
  areaM2: number;
  reuse: number;         // 0–100
};

export function openInvoiceWindow(
  lines: ResolvedLine[],
  byCategory: Record<"materials" | "labour" | "services" | "logistics", number>,
  grandLow: number,
  grandHigh: number,
  meta: InvoiceMeta,
) {
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) {
    alert("Please allow pop-ups to export the invoice.");
    return;
  }
  const today = new Date();
  const invoiceNo = `ETG-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 9000 + 1000)}`;
  const fmtDate = today.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
  const fmtEUR = (n: number) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });

  const subtotal = grandLow;
  const vatRate = 0.19;
  const vat = Math.round(subtotal * vatRate);
  const total = subtotal + vat;

  const rows = lines
    .filter((l) => l.qty > 0)
    .map(
      (l) => `
        <tr>
          <td>${escapeHtml(l.label)}</td>
          <td class="num">${l.qty.toFixed(l.qty % 1 === 0 ? 0 : 2)}</td>
          <td>${escapeHtml(l.unit)}</td>
          <td class="num">${fmtEUR(l.rateResolved)}</td>
          <td class="num">${fmtEUR(l.total)}</td>
        </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Invoice ${invoiceNo} — ${escapeHtml(meta.client)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  body { font: 13px/1.45 -apple-system, "Helvetica Neue", Arial, sans-serif; color: #1a1d24; margin: 0; padding: 24px; }
  header { display: flex; justify-content: space-between; align-items: start; border-bottom: 1px solid #1a1d24; padding-bottom: 14px; margin-bottom: 22px; }
  h1 { font-size: 22px; margin: 0 0 4px 0; letter-spacing: 0.04em; }
  .meta { text-align: right; font-size: 12px; line-height: 1.6; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-bottom: 26px; }
  .label { text-transform: uppercase; letter-spacing: 0.08em; font-size: 10px; color: #6b7282; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
  th, td { padding: 7px 9px; text-align: left; font-size: 12px; }
  thead th { background: #f2f4f8; border-bottom: 1px solid #d5d9e0; text-transform: uppercase; letter-spacing: 0.06em; font-size: 10px; }
  tbody tr:not(:last-child) td { border-bottom: 1px solid #eef0f4; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .subtotals { width: 320px; margin-left: auto; }
  .subtotals tr td { padding: 4px 8px; font-size: 12px; }
  .subtotals tr.grand td { font-weight: 700; font-size: 14px; border-top: 1px solid #1a1d24; padding-top: 8px; }
  footer { margin-top: 26px; padding-top: 14px; border-top: 1px solid #d5d9e0; font-size: 11px; color: #6b7282; line-height: 1.6; }
  .actions { position: fixed; top: 14px; right: 14px; display: flex; gap: 8px; }
  .actions button { font: inherit; padding: 8px 14px; border: 1px solid #1a1d24; background: #1a1d24; color: white; border-radius: 6px; cursor: pointer; }
  @media print { .actions { display: none; } }
</style>
</head>
<body>
  <div class="actions">
    <button onclick="window.print()">Print / save PDF</button>
  </div>
  <header>
    <div>
      <h1>ET GLOBAL</h1>
      <div style="font-size:11px;color:#6b7282;line-height:1.5;">Trade-fair stand design &amp; build<br/>Frankfurt am Main, Germany<br/>USt-IdNr DE000 000 000</div>
    </div>
    <div class="meta">
      <div><strong>Invoice</strong> ${invoiceNo}</div>
      <div>${escapeHtml(fmtDate)}</div>
    </div>
  </header>

  <div class="grid">
    <div>
      <div class="label">Bill to</div>
      <div>${escapeHtml(meta.client)}</div>
    </div>
    <div>
      <div class="label">Project</div>
      <div>${Math.round(meta.areaM2)} m² stand · reuse ${meta.reuse}%</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="num">Qty</th>
        <th>Unit</th>
        <th class="num">Rate</th>
        <th class="num">Line total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <table class="subtotals">
    <tbody>
      <tr><td>Materials</td><td class="num">${fmtEUR(byCategory.materials)}</td></tr>
      <tr><td>Labour</td><td class="num">${fmtEUR(byCategory.labour)}</td></tr>
      <tr><td>Services</td><td class="num">${fmtEUR(byCategory.services)}</td></tr>
      <tr><td>Logistics</td><td class="num">${fmtEUR(byCategory.logistics)}</td></tr>
      <tr><td>Subtotal</td><td class="num">${fmtEUR(subtotal)}</td></tr>
      <tr><td>VAT 19% (DE)</td><td class="num">${fmtEUR(vat)}</td></tr>
      <tr class="grand"><td>Total</td><td class="num">${fmtEUR(total)}</td></tr>
      <tr><td colspan="2" style="padding-top:10px;font-size:11px;color:#6b7282;">Quote range incl. supplier markup: ${fmtEUR(grandLow)}–${fmtEUR(grandHigh)}</td></tr>
    </tbody>
  </table>

  <footer>
    Payment within 30 days. Quoted in EUR, exclusive of additional on-site labour above scheduled days. All modular extrusion components remain ET Global property and are charged on a reuse-discount model; consumables (vinyl, SEG print) are non-returnable. Sustainability metrics computed against the 2026 ET Global baseline. — This invoice was generated by the ET Global Configurator (demo).
  </footer>
</body>
</html>`;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );
}
