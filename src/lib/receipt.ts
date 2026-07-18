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
  assocNameAr?: string,
) {
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(`
<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>${title}</title><style>${RECEIPT_CSS}</style></head>
<body>
<div class="page"><div class="receipt">
  <div class="hdr"><h1>🕌 ${assocNameAr || 'الجمعية الخيرية'}</h1><span class="sub">${subtitle}</span></div>
  <div class="info">${rows}</div>
  <div class="amt" style="${amountClass}"><div class="num">${amount}</div><div class="words">${wordsAr}<span class="fr">${wordsFr}</span></div></div>
  <div class="sign"><div><span class="label">${signLeft}</span><div class="line"></div></div><div><span class="label">${signRight}</span><div class="line"></div></div></div>
</div></div>
<script>window.print();window.close();</script>
</body></html>
`)
  w.document.close()
}

/**
 * Full A4 card using the same visual style as printReceipt (blue header, row/lbl/val, sign)
 * but on full page width with margins — exactly like the Orientation Médicale layout but wide.
 */
export const FULL_CARD_CSS = `
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; direction: rtl; font-size: 11px; color: #1a1a1a; background: #fff; padding: 15mm; }
  @media print { body { padding: 15mm; } }
  .hdr { border-bottom: 2px solid #2563eb; padding-bottom: 4px; margin-bottom: 8px; }
  .hdr h1 { font-size: 16px; color: #2563eb; margin: 0; display: inline; }
  .hdr .sub { float: left; font-size: 10px; color: #999; }
  .section { margin-bottom: 10px; }
  .section-title { font-size: 12px; font-weight: 700; color: #1e40af; margin: 0 0 4px; padding: 3px 8px; background: #eff6ff; border-right: 3px solid #2563eb; }
  .info { display: flex; flex-wrap: wrap; gap: 0 10px; }
  .col { width: 48%; }
  .row { margin: 0.3mm 0; line-height: 1.45; }
  .row .lbl { display: block; font-size: 8px; color: #aaa; }
  .row .val { display: block; font-size: 11px; color: #222; }
  .row .val i { font-style: normal; font-size: 9px; color: #999; }
  .border-row { padding: 2px 0; border-bottom: 1px dotted #e5e7eb; margin: 0.3mm 0; }
  .children-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1px 8px; margin-top: 2px; }
  .children-grid .child-item { border-bottom: 1px dotted #e5e7eb; padding: 1px 0; font-size: 10px; }
  .amt { background: #f0f4ff; border-radius: 4px; padding: 4px 10px; text-align: center; margin: 6px 0; }
  .amt .num { font-size: 16px; font-weight: bold; }
  .amt .words { font-size: 9px; color: #555; line-height: 1.3; margin-top: 0.3mm; }
  .sign { display: flex; justify-content: space-between; padding-top: 4px; border-top: 1px dashed #ccc; font-size: 9px; color: #999; margin-top: 10px; }
  .sign > div { text-align: center; min-width: 100px; flex: 1; }
  .sign .label { display: block; margin-bottom: 2px; }
  .sign .line { border-top: 1px solid #444; height: 28px; }
  .no-print { display: block; width: 200px; margin: 20px auto; padding: 10px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; text-align: center; }
  @media print { .no-print { display: none; } }
`

export function printBeneficiaryCard(params: {
  assocNameAr: string;
  reference: string;
  lastNameAr: string;
  firstNameAr: string;
  firstName: string;
  lastName: string;
  nationalCardNumber: string;
  phone: string;
  dateOfBirth: string;
  ageDisplay: string;
  attribut: string;
  gender: string;
  caisseNameAr: string;
  situation?: string;
  childrenHtml: string;
}) {
  const w = window.open('', '_blank')
  if (!w) return
  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>بطاقة مستفيد</title><style>${FULL_CARD_CSS}</style></head><body>
  <div class="hdr"><h1>🕌 ${params.assocNameAr || 'الجمعية الخيرية'}</h1><span class="sub">Carte Bénéficiaire — ${params.reference || ''}</span></div>
  <div class="section">
    <div class="section-title">المعلومات الشخصية</div>
    <div class="info">
      <div class="col">
        <div class="border-row"><span class="lbl">الاسم بالعربية</span><span class="val">${params.lastNameAr} ${params.firstNameAr}</span></div>
        <div class="border-row"><span class="lbl">الصفة</span><span class="val">${params.attribut}</span></div>
        <div class="border-row"><span class="lbl">تاريخ الميلاد</span><span class="val">${params.dateOfBirth}</span></div>
        <div class="border-row"><span class="lbl">رقم البطاقة الوطنية</span><span class="val">${params.nationalCardNumber || '—'}</span></div>
        <div class="border-row"><span class="lbl">الصندوق</span><span class="val">${params.caisseNameAr || '—'}</span></div>
      </div>
      <div class="col">
        <div class="border-row"><span class="lbl">الاسم باللاتينية</span><span class="val">${params.firstName} ${params.lastName}</span></div>
        <div class="border-row"><span class="lbl">الجنس</span><span class="val">${params.gender}</span></div>
        <div class="border-row"><span class="lbl">العمر</span><span class="val">${params.ageDisplay}</span></div>
        <div class="border-row"><span class="lbl">الهاتف</span><span class="val">${params.phone}</span></div>
        ${params.situation ? `<div class="border-row"><span class="lbl">الحالة</span><span class="val">${params.situation}</span></div>` : ''}
      </div>
    </div>
  </div>
  ${params.childrenHtml}
  <div class="sign">
    <div><span class="label">توقيع المستفيد</span><div class="line"></div></div>
    <div><span class="label">ختم الجمعية</span><div class="line"></div></div>
  </div>
  <button class="no-print" onclick="window.print()">طباعة</button>
</body></html>`
  w.document.write(html)
  w.document.close()
}

/**
 * Professional A4 analytics report for experts — portrait mode, margins, full layout.
 */
export function printAnalyticsReport(params: {
  assocNameAr: string;
  title: string;
  periodLabel: string;
  dateLabel: string;
  credits: string;
  debits: string;
  balance: string;
  ratio: string;
  bodyRows: string;
}) {
  const REPORT_CSS = `
    @page { size: A4 portrait; margin: 18mm 15mm 15mm 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; font-size: 11px; color: #1a1a1a; background: #fff; line-height: 1.5; }
    .header { text-align: center; margin-bottom: 18px; padding-bottom: 10px; border-bottom: 3px double #2563eb; }
    .header h1 { font-size: 20px; color: #1e40af; margin: 0 0 2px; }
    .header .sub { font-size: 11px; color: #6b7280; }
    .header .period { font-size: 10px; color: #9ca3af; margin-top: 2px; }
    .kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
    .kpi { border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 10px; background: #fafafa; }
    .kpi .kpi-label { font-size: 10px; color: #6b7280; font-weight: 600; }
    .kpi .kpi-value { font-size: 14px; font-weight: 700; margin-top: 2px; }
    .kpi .kpi-sub { font-size: 9px; color: #9ca3af; margin-top: 1px; }
    .section { margin-bottom: 14px; page-break-inside: avoid; }
    .section-title { font-size: 12px; font-weight: 700; color: #1e40af; margin: 0 0 6px; padding: 4px 8px; background: #eff6ff; border-right: 3px solid #2563eb; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 9.5px; margin: 0; }
    .data-table thead th { background: #2563eb; color: #fff; padding: 5px 6px; text-align: center; font-weight: 600; font-size: 9px; border: 1px solid #1d4ed8; }
    .data-table tbody td { padding: 4px 6px; border: 1px solid #d1d5db; text-align: center; }
    .data-table tbody tr:nth-child(even) { background: #f9fafb; }
    .data-table tbody td.credit { color: #10b981; font-weight: 700; }
    .data-table tbody td.debit { color: #ef4444; font-weight: 700; }
    .footer { text-align: center; margin-top: 20px; padding-top: 8px; border-top: 1px solid #d1d5db; font-size: 9px; color: #9ca3af; }
    .no-print { display: block; width: 200px; margin: 20px auto; padding: 10px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; text-align: center; }
    @media print { .no-print { display: none; } }
  `
  const w = window.open('', '_blank')
  if (!w) return
  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>${params.title}</title><style>${REPORT_CSS}</style></head><body>
  <div class="header">
    <h1>🕌 ${params.assocNameAr}</h1>
    <div class="sub">${params.title}</div>
    <div class="period">${params.dateLabel} — ${params.periodLabel}</div>
  </div>
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-label">إجمالي المقبوضات</div><div class="kpi-value" style="color:#10b981">${params.credits}</div></div>
    <div class="kpi"><div class="kpi-label">إجمالي المدفوعات</div><div class="kpi-value" style="color:#ef4444">${params.debits}</div></div>
    <div class="kpi"><div class="kpi-label">الصافي المالي للمرحلة</div><div class="kpi-value" style="${(params.balance.startsWith('-')) ? 'color:#ef4444' : 'color:#2563eb'}">${params.balance}</div></div>
    <div class="kpi"><div class="kpi-label">معدل المصاريف إلى المداخيل</div><div class="kpi-value">${params.ratio}</div></div>
  </div>
  <div class="section">
    ${params.bodyRows}
  </div>
  <div class="footer">تم إنشاؤه بواسطة نظام الجمعية — ${new Date().toLocaleDateString('ar-DZ')}</div>
  <button class="no-print" onclick="window.print()">طباعة التقرير</button>
</body></html>`
  w.document.write(html)
  w.document.close()
}
