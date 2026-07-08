/**
 * Shared compact receipt template — optimized 1/4 A4 per bon
 * 4 bons per page (2 columns × 2 rows)
 */

export const RECEIPT_CSS = `
  @page { size: A4; margin: 3mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; direction: rtl; font-size: 8.5px; background: #eee; padding: 2mm; }
  .page { display: flex; flex-wrap: wrap; gap: 2mm; justify-content: center; }
  .receipt { width: 95mm; min-height: 65mm; border: 1px solid #bbb; border-radius: 3px; padding: 3mm 3.5mm; background: #fff; display: inline-block; break-inside: avoid; }
  .hdr { display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #2563eb; padding-bottom: 1.5mm; margin-bottom: 2mm; }
  .hdr h1 { font-size: 9px; color: #2563eb; margin: 0; }
  .hdr span { font-size: 7px; color: #888; }
  .info { margin-bottom: 2mm; }
  .row { display: flex; margin: 0.8mm 0; }
  .row label { color: #888; min-width: 22mm; font-size: 7px; }
  .row strong { font-size: 8.5px; color: #222; }
  .amt { background: #f0f4ff; border-radius: 3px; padding: 1.5mm 2mm; text-align: center; margin: 1.5mm 0; }
  .amt .num { font-size: 16px; font-weight: bold; }
  .amt .words { font-size: 7px; color: #555; line-height: 1.3; }
  .sign { display: flex; justify-content: space-between; margin-top: 2mm; padding-top: 1.5mm; border-top: 1px dashed #ccc; font-size: 7px; color: #777; }
  .sign > div { text-align: center; min-width: 30mm; }
  .sign .line { border-top: 1px solid #444; margin-top: 6mm; padding-top: 0.5mm; font-size: 6.5px; }
  @media print { body { background: #fff; padding: 0; } .receipt { border: 1px solid #ccc; } }
`

export function printReceipt(title: string, subtitle: string, rows: string, amountClass: string, amount: string, wordsAr: string, wordsFr: string, extra: string, signLeft: string, signRight: string) {
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>${title}</title><style>${RECEIPT_CSS}</style></head>
<body><div class="page"><div class="receipt">
  <div class="hdr"><h1>🕌 الجمعية الخيرية</h1><span>${subtitle}</span></div>
  <div class="info">${rows}</div>
  <div class="amt" style="${amountClass}"><div class="num">${amount}</div><div class="words">${wordsAr}<br><span dir="ltr" style="font-style:italic">${wordsFr}</span></div></div>
  ${extra}
  <div class="sign"><div><div class="line">${signLeft}</div></div><div><div class="line">${signRight}</div></div></div>
</div></div><script>window.print();window.close();</script></body></html>`)
  w.document.close()
}
