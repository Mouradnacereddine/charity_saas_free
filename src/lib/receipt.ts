/**
 * Shared compact receipt template — optimized 1/4 A4 per bon
 * Aligned right, vertical list layout, clean typography
 */

export const RECEIPT_CSS = `
  @page { size: A4; margin: 3mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; direction: rtl; font-size: 9px; background: #eee; padding: 3mm; display: flex; justify-content: flex-end; }
  .grid { display: flex; flex-wrap: wrap; gap: 2mm; }
  .receipt { width: 94mm; min-height: 62mm; border: 1px solid #bbb; border-radius: 3px; padding: 2.5mm 3mm; background: #fff; break-inside: avoid; }
  .hdr { border-bottom: 1.5px solid #2563eb; padding-bottom: 1.2mm; margin-bottom: 1.8mm; }
  .hdr h1 { font-size: 9.5px; color: #2563eb; margin: 0; display: inline; }
  .hdr .sub { float: left; font-size: 7px; color: #888; }
  .info { margin-bottom: 1.5mm; }
  .row { clear: both; margin: 0.6mm 0; line-height: 1.45; }
  .row .lbl { display: inline-block; min-width: 22mm; font-size: 7px; color: #999; vertical-align: top; }
  .row .val { display: inline; font-size: 8.5px; color: #222; }
  .row .val i { font-style: normal; font-size: 7px; color: #999; margin-right: 1mm; }
  .amt { background: #f0f4ff; border-radius: 3px; padding: 1.2mm 2mm; text-align: center; margin: 1.5mm 0; }
  .amt .num { font-size: 17px; font-weight: bold; }
  .amt .words { font-size: 7px; color: #555; line-height: 1.3; margin-top: 0.5mm; }
  .amt .words .fr { font-style: italic; display: block; direction: ltr; }
  .sign { display: flex; justify-content: space-between; margin-top: 2mm; padding-top: 1.2mm; border-top: 1px dashed #ccc; font-size: 7px; color: #777; }
  .sign > div { text-align: center; min-width: 28mm; }
  .sign .line { border-top: 1px solid #444; margin-top: 6mm; padding-top: 0.5mm; font-size: 6.5px; }
  @media print { body { background: #fff; padding: 0; } .receipt { border: 1px solid #ccc; } }
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
<div class="grid"><div class="receipt">
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
