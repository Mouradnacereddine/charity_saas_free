/**
 * Shared compact receipt template — 6 per A4 sheet (3 cols &times; 2 rows)
 * Right-aligned, margins respected, print-optimized
 */

export const RECEIPT_CSS = `
  @page { size: A4; margin: 10mm 5mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; direction: rtl; font-size: 8px; background: #eee; padding: 8mm 0 0 0; }
  .page { width: 200mm; margin: 0 auto 0 0; display: flex; flex-wrap: wrap; gap: 2mm; justify-content: flex-start; }
  .receipt { width: 65mm; height: 133mm; border: 1px solid #bbb; border-radius: 2px; padding: 2mm 2.5mm; background: #fff; break-inside: avoid; display: flex; flex-direction: column; }
  .hdr { border-bottom: 1.2px solid #2563eb; padding-bottom: 1mm; margin-bottom: 1.5mm; }
  .hdr h1 { font-size: 8.5px; color: #2563eb; margin: 0; display: inline; }
  .hdr .sub { float: left; font-size: 6px; color: #999; }
  .info { margin-bottom: 1.2mm; }
  .row { clear: both; margin: 0.4mm 0; line-height: 1.5; }
  .row .lbl { display: block; font-size: 6px; color: #aaa; }
  .row .val { display: block; font-size: 8px; color: #222; }
  .row .val i { font-style: normal; font-size: 6.5px; color: #999; }
  .amt { background: #f0f4ff; border-radius: 2px; padding: 1mm 1.5mm; text-align: center; margin: 1.2mm 0; }
  .amt .num { font-size: 15px; font-weight: bold; }
  .amt .words { font-size: 6.5px; color: #555; line-height: 1.3; margin-top: 0.3mm; }
  .amt .words .fr { font-style: italic; display: block; direction: ltr; }
  .sign { margin-top: auto; display: flex; justify-content: space-between; padding-top: 1mm; border-top: 1px dashed #ccc; font-size: 6px; color: #999; }
  .sign > div { text-align: center; min-width: 20mm; }
  .sign .line { border-top: 0.8px solid #444; margin-top: 1mm; padding-top: 0.3mm; font-size: 5.5px; }
  @media print { body { background: #fff; } .receipt { border: 0.5px solid #ccc; } }
`

export function printReceipt(
  title: string, subtitle: string,
  rows: string,
  amountClass: string, amount: string, wordsAr: string, wordsFr: string,
  extra: string,
  signLeft: string, signRight: string,
) {
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(`
<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>${title}</title><style>${RECEIPT_CSS}</style></head>
<body>
<div class="page"><div class="receipt">
  <div class="hdr"><h1>🕌 الجمعية الخيرية</h1><span class="sub">${subtitle}</span></div>
  <div class="info">${rows}</div>
  <div class="amt" style="${amountClass}"><div class="num">${amount}</div><div class="words">${wordsAr}<span class="fr">${wordsFr}</span></div></div>
  ${extra}
  <div class="sign"><div><div class="line">${signLeft}</div></div><div><div class="line">${signRight}</div></div></div>
</div></div>
<script>window.print();window.close();</script>
</body></html>
`)
  w.document.close()
}
