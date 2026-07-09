/**
 * Shared compact receipt template — 6 per A4 sheet (2 cols × 3 rows)
 * 3 on the right, 3 on the left — signatures just below the amount
 */

export const RECEIPT_CSS = `
  @page { size: A4; margin: 8mm 6mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; direction: rtl; font-size: 10px; background: #eee; padding: 5mm 0 0 0; }
  .page { width: 198mm; margin: 0 auto 0 0; display: flex; flex-wrap: wrap; gap: 2mm; justify-content: flex-start; }
  .receipt { width: 98mm; height: 87mm; border: 1px solid #bbb; border-radius: 2px; padding: 2.5mm 3mm; background: #fff; break-inside: avoid; display: flex; flex-direction: column; }
  .hdr { border-bottom: 1.2px solid #2563eb; padding-bottom: 1mm; margin-bottom: 1.2mm; }
  .hdr h1 { font-size: 11px; color: #2563eb; margin: 0; display: inline; }
  .hdr .sub { float: left; font-size: 7px; color: #999; }
  .info { margin-bottom: 1mm; flex-shrink: 1; display: flex; flex-wrap: wrap; gap: 0.3mm 1.5mm; }
  .col { width: 46%; }
  .row { margin: 0.3mm 0; line-height: 1.35; }
  .row .lbl { display: block; font-size: 7px; color: #aaa; }
  .row .val { display: block; font-size: 9.5px; color: #222; }
  .row .val i { font-style: normal; font-size: 8px; color: #999; }
  .amt { background: #f0f4ff; border-radius: 2px; padding: 1mm 1.5mm; text-align: center; margin: 1mm 0; }
  .amt .num { font-size: 18px; font-weight: bold; }
  .amt .words { font-size: 7.5px; color: #555; line-height: 1.3; margin-top: 0.3mm; }
  .amt .words .fr { font-style: italic; display: block; direction: ltr; }
  .sign { display: flex; justify-content: space-between; padding-top: 0.6mm; border-top: 0.8px dashed #ccc; font-size: 7px; color: #999; }
  .sign > div { text-align: center; min-width: 30mm; }
  .sign .label { display: block; margin-bottom: 0.6mm; }
  .sign .line { border-top: 0.8px solid #444; }
  @media print { body { background: #fff; padding: 5mm 0 0 0; } .receipt { border: 0.5px solid #ccc; } }
`

export function printReceipt(
  title: string, subtitle: string,
  rows: string,
  amountClass: string, amount: string, wordsAr: string, wordsFr: string,
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
  <div class="sign"><div><span class="label">${signLeft}</span><div class="line"></div></div><div><span class="label">${signRight}</span><div class="line"></div></div></div>
</div></div>
<script>window.print();window.close();</script>
</body></html>
`)
  w.document.close()
}
