import { useEffect, useState } from 'react'
import { Card, Button, Input, Select, SearchableSelect, Modal, Badge, TextArea, StatCard, EmptyState, LoadingSpinner } from '../components/common/UI'
import { useFinanceStore } from '../stores/financeStore'
import { useCaisseStore } from '../stores/caisseStore'
import { useBeneficiaryStore } from '../stores/beneficiaryStore'
import { useDonorStore } from '../stores/donorStore'
import { formatCurrency, formatDate, numberToArabicWords, numberToFrenchWords } from '../utils/helpers'
import { Plus, Banknote, Building2, ArrowUpCircle, ArrowDownCircle, Search, Filter, Printer } from 'lucide-react'
import type { TransactionFilter } from '../types'

// ---- Bank Account Modal ----

interface BankAccountFormData {
  bankNameAr: string
  accountNumber: string
  rib: string
  iban: string
  swift: string
}

const emptyBankForm: BankAccountFormData = {
  bankNameAr: '',
  accountNumber: '',
  rib: '',
  iban: '',
  swift: '',
}

function BankAccountModal({
  isOpen,
  onClose,
  editingId,
  initialData,
  onSave,
}: {
  isOpen: boolean
  onClose: () => void
  editingId: string | null
  initialData: BankAccountFormData
  onSave: (data: BankAccountFormData) => void
}) {
  const [form, setForm] = useState<BankAccountFormData>(initialData)

  useEffect(() => {
    setForm(initialData)
  }, [initialData, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingId ? 'تعديل الحساب البنكي' : 'إضافة حساب بنكي جديد'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          labelAr="اسم البنك"
          value={form.bankNameAr}
          onChange={(e) => setForm({ ...form, bankNameAr: e.target.value })}
          required
          dir="rtl"
        />
        <Input
          labelAr="رقم الحساب"
          value={form.accountNumber}
          onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
          required
          dir="ltr"
          className="text-left"
        />
        <Input
          labelAr="RIB"
          value={form.rib}
          onChange={(e) => setForm({ ...form, rib: e.target.value })}
          required
          dir="ltr"
          className="text-left"
        />
        <Input
          labelAr="IBAN"
          value={form.iban}
          onChange={(e) => setForm({ ...form, iban: e.target.value })}
          required
          dir="ltr"
          className="text-left"
        />
        <Input
          labelAr="SWIFT"
          value={form.swift}
          onChange={(e) => setForm({ ...form, swift: e.target.value })}
          required
          dir="ltr"
          className="text-left"
        />
        <div className="flex gap-3 justify-end pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" variant="primary">
            {editingId ? 'تحديث' : 'إضافة'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ---- Main Page ----

export default function FinancePage() {
  const {
    transactions,
    bankAccounts,
    totalCash,
    loading,
    loadTransactions,
    loadBankAccounts,
    addTransaction,
    addBankAccount,
    updateBankAccount,
    calculateTotalCash,
    getTotalBankBalance,
  } = useFinanceStore()

  const { caisses, loadCaisses } = useCaisseStore()
  const { beneficiaries, loadBeneficiaries } = useBeneficiaryStore()
  const { donors, loadDonors } = useDonorStore()

  // ---- Bank Account Modal State ----
  const [bankModalOpen, setBankModalOpen] = useState(false)
  const [editingBankId, setEditingBankId] = useState<string | null>(null)
  const [bankFormData, setBankFormData] = useState<BankAccountFormData>(emptyBankForm)

  // ---- Transaction Form State ----
  const [txType, setTxType] = useState<'credit' | 'debit'>('credit')
  const [txFundSource, setTxFundSource] = useState<'banque' | 'caisse_physique'>('caisse_physique')
  const [txBankAccountId, setTxBankAccountId] = useState('')
  const [txCaisseId, setTxCaisseId] = useState('')
  const [txSubCategoryId, setTxSubCategoryId] = useState('')
  const [txDonorId, setTxDonorId] = useState('')
  const [txBeneficiaryId, setTxBeneficiaryId] = useState('')
  const [txAmount, setTxAmount] = useState('')
  const [txDescription, setTxDescription] = useState('')
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0])
  const [txSubmitting, setTxSubmitting] = useState(false)
  const [txError, setTxError] = useState('')

  // ---- Filter State ----
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterSearchTerm, setFilterSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterFundSource, setFilterFundSource] = useState('')
  const [filterCaisseId, setFilterCaisseId] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterMinAmount, setFilterMinAmount] = useState('')
  const [filterMaxAmount, setFilterMaxAmount] = useState('')

  // ---- Pagination State ----
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  // ---- Computed Values ----
  const amountNum = parseFloat(txAmount) || 0
  const amountInWordsAr = amountNum > 0 ? numberToArabicWords(amountNum) : ''
  const amountInWordsFr = amountNum > 0 ? numberToFrenchWords(amountNum) : ''

  const selectedCaisse = caisses.find((c) => c.id === txCaisseId)
  const subCategories = selectedCaisse?.subCategories ?? []

  const totalBankBalance = getTotalBankBalance()

  const totalPages = Math.max(1, Math.ceil(transactions.length / pageSize))
  const paginatedTransactions = transactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  // ---- Load Data ----
  useEffect(() => {
    loadTransactions()
    loadBankAccounts()
    loadCaisses()
    loadBeneficiaries()
    loadDonors()
    calculateTotalCash()
  }, [])

  // ---- Handlers ----
  const handleOpenAddBank = () => {
    setEditingBankId(null)
    setBankFormData(emptyBankForm)
    setBankModalOpen(true)
  }

  const handleOpenEditBank = (id: string) => {
    const account = bankAccounts.find((a) => a.id === id)
    if (!account) return
    setEditingBankId(id)
    setBankFormData({
      bankNameAr: account.bankNameAr,
      accountNumber: account.accountNumber,
      rib: account.rib,
      iban: account.iban,
      swift: account.swift,
    })
    setBankModalOpen(true)
  }

  const handleSaveBank = async (data: BankAccountFormData) => {
    if (editingBankId) {
      await updateBankAccount(editingBankId, {
        bankNameAr: data.bankNameAr,
        bankName: data.bankNameAr,
        accountNumber: data.accountNumber,
        rib: data.rib,
        iban: data.iban,
        swift: data.swift,
      })
    } else {
      await addBankAccount({
        bankName: data.bankNameAr,
        bankNameAr: data.bankNameAr,
        accountNumber: data.accountNumber,
        rib: data.rib,
        iban: data.iban,
        swift: data.swift,
      })
    }
    setBankModalOpen(false)
  }

  const compactReceiptCSS = `
    @page { size: A5 landscape; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; direction: rtl; font-size: 11px; padding: 8mm; }
    .receipt { max-width: 210mm; margin: 0 auto; border: 1px solid #ccc; border-radius: 4px; padding: 6mm 8mm; background: #fff; }
    .hdr { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 4mm; margin-bottom: 4mm; }
    .hdr h1 { font-size: 14px; color: #2563eb; }
    .hdr span { font-size: 9px; color: #666; }
    .info { display: flex; flex-wrap: wrap; gap: 3mm 6mm; margin-bottom: 4mm; font-size: 10px; }
    .info > div { min-width: 80px; }
    .info label { color: #888; display: block; font-size: 8px; text-transform: uppercase; }
    .info strong { font-size: 11px; color: #222; }
    .amt { background: #f0f4ff; border-radius: 4px; padding: 3mm 4mm; text-align: center; margin-bottom: 3mm; }
    .amt .num { font-size: 22px; font-weight: bold; color: #16a34a; }
    .amt .words { font-size: 9px; color: #555; margin-top: 1mm; line-height: 1.4; }
    .sign { display: flex; justify-content: space-between; margin-top: 4mm; padding-top: 3mm; border-top: 1px dashed #ccc; font-size: 9px; color: #555; }
    .sign > div { text-align: center; min-width: 80px; }
    .sign .line { border-top: 1px solid #333; margin-top: 10mm; padding-top: 1mm; font-size: 8px; }
    @media print { body { padding: 4mm; } .receipt { border: none; padding: 4mm 6mm; } }
  `

  const printReceiptDocument = (title: string, subtitle: string, rows: string, amountSection: string, extraSection: string, signatureL: string, signatureR: string) => {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`
      <!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>${title}</title><style>${compactReceiptCSS}</style></head>
      <body><div class="receipt">
        <div class="hdr"><h1>🕌 الجمعية الخيرية</h1><span>${subtitle}</span></div>
        <div class="info">${rows}</div>
        ${amountSection}
        ${extraSection}
        <div class="sign">
          <div><div class="line">${signatureL}</div></div>
          <div><div class="line">${signatureR}</div></div>
        </div>
      </div><script>window.print();window.close();</script></body></html>
    `)
    w.document.close()
  }

  const handlePrintReceipt = (tx: any) => {
    if (tx.type === 'credit') {
      const donor = donors.find((d) => d.id === tx.donorId)
      const caisse = caisses.find((c) => c.id === tx.caisseId)
      const donorNameAr = donor ? `${donor.firstNameAr} ${donor.lastNameAr}` : 'متبرع'
      const donorName = donor ? `${donor.firstName} ${donor.lastName}` : 'Anonyme'

      printReceiptDocument(
        'وصل تبرع', 'Reçu de Don',
        `
          <div><label>رقم الوصل</label><strong>${tx.receiptNumber || '—'}</strong></div>
          <div><label>التاريخ</label><strong>${formatDate(tx.date)}</strong></div>
          <div><label>المتبرع</label><strong>${donorNameAr}</strong><br><span style="font-size:8px;color:#888" dir="ltr">${donorName}</span></div>
          <div><label>الصندوق</label><strong>${caisse?.nameAr || '—'}</strong></div>
        `,
        `<div class="amt"><div class="num">${formatCurrency(tx.amount)}</div><div class="words">${tx.amountInWordsAr}<br><span dir="ltr">${tx.amountInWords}</span></div></div>`,
        tx.descriptionAr ? `<div style="font-size:10px;color:#555;margin-bottom:2mm"><label style="color:#888;font-size:8px">البيان</label><p>${tx.descriptionAr}</p></div>` : '',
        'توقيع المتبرع', 'ختم الجمعية'
      )
    } else {
      // Debit / withdrawal receipt
      const caisse = caisses.find((c) => c.id === tx.caisseId)
      const benef = beneficiaries.find((b) => b.id === tx.beneficiaryId)
      const benefNameAr = benef ? `${benef.firstNameAr} ${benef.lastNameAr}` : 'مستفيد'
      const benefName = benef ? `${benef.firstName} ${benef.lastName}` : 'Bénéficiaire'

      printReceiptDocument(
        'وصل صرف', 'Bon de Sortie',
        `
          <div><label>رقم الوصل</label><strong>${tx.receiptNumber || '—'}</strong></div>
          <div><label>التاريخ</label><strong>${formatDate(tx.date)}</strong></div>
          <div><label>المستفيد</label><strong>${benefNameAr}</strong><br><span style="font-size:8px;color:#888" dir="ltr">${benefName}</span></div>
          <div><label>الصندوق</label><strong>${caisse?.nameAr || '—'}</strong></div>
          <div><label>المصدر</label><strong>${tx.fundSource === 'banque' ? 'بنك' : 'صندوق نقدي'}</strong></div>
        `,
        `<div class="amt" style="background:#fff0f0"><div class="num" style="color:#dc2626">- ${formatCurrency(tx.amount)}</div><div class="words">${tx.amountInWordsAr}<br><span dir="ltr">${tx.amountInWords}</span></div></div>`,
        tx.descriptionAr ? `<div style="font-size:10px;color:#555;margin-bottom:2mm"><label style="color:#888;font-size:8px">البيان</label><p>${tx.descriptionAr}</p></div>` : '',
        'إمضاء المستفيد', 'ختم الجمعية'
      )
    }
  }

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!txCaisseId || amountNum <= 0) return

    setTxSubmitting(true)
    try {
      await addTransaction({
        type: txType,
        amount: amountNum,
        fundSource: txFundSource,
        caisseId: txCaisseId,
        subCategoryId: txSubCategoryId || undefined,
        bankAccountId: txFundSource === 'banque' ? txBankAccountId || undefined : undefined,
        donorId: txType === 'credit' ? txDonorId || undefined : undefined,
        beneficiaryId: txType === 'debit' ? txBeneficiaryId || undefined : undefined,
        description: txDescription,
        descriptionAr: txDescription,
        date: txDate,
      })

      // Reset form
      setTxAmount('')
      setTxDescription('')
      setTxDonorId('')
      setTxBeneficiaryId('')
      setTxSubCategoryId('')
    } catch (err: any) {
      setTxError(err?.message || 'فشل في إضافة المعاملة')
    } finally {
      setTxSubmitting(false)
    }
  }

  const handleApplyFilter = () => {
    const newFilter: TransactionFilter = {}
    if (filterType) newFilter.type = filterType as 'credit' | 'debit'
    if (filterFundSource) newFilter.fundSource = filterFundSource as 'banque' | 'caisse_physique'
    if (filterCaisseId) newFilter.caisseId = filterCaisseId
    if (filterDateFrom) newFilter.dateFrom = filterDateFrom
    if (filterDateTo) newFilter.dateTo = filterDateTo
    if (filterMinAmount) newFilter.minAmount = parseFloat(filterMinAmount)
    if (filterMaxAmount) newFilter.maxAmount = parseFloat(filterMaxAmount)
    if (filterSearchTerm) newFilter.searchTerm = filterSearchTerm

    setCurrentPage(1)
    loadTransactions(newFilter)
  }

  const handleResetFilter = () => {
    setFilterType('')
    setFilterFundSource('')
    setFilterCaisseId('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterMinAmount('')
    setFilterMaxAmount('')
    setFilterSearchTerm('')
    setCurrentPage(1)
    loadTransactions()
  }

  // ---- Render ----

  return (
    <div dir="rtl" className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">الإدارة المالية</h1>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="إجمالي الرصيد البنكي"
          value={formatCurrency(totalBankBalance)}
          icon={<Building2 size={24} />}
          color="bg-blue-500"
        />
        <StatCard
          title="النقدية (الصندوق)"
          value={formatCurrency(totalCash)}
          icon={<Banknote size={24} />}
          color="bg-green-500"
        />
        <StatCard
          title="إجمالي المعاملات"
          value={transactions.length}
          subtitle={`${transactions.filter((t) => t.type === 'credit').length} إيداع | ${transactions.filter((t) => t.type === 'debit').length} سحب`}
          icon={<ArrowUpCircle size={24} />}
          color="bg-purple-500"
        />
      </div>

      {/* Bank Accounts Section */}
      <Card
        titleAr="الحسابات البنكية"
        action={
          <Button size="sm" onClick={handleOpenAddBank}>
            <Plus size={16} />
            إضافة حساب
          </Button>
        }
      >
        {bankAccounts.length === 0 ? (
          <EmptyState message="لا توجد حسابات بنكية مسجّلة" icon={<Building2 size={48} />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-right py-3 px-4 font-medium text-gray-500">اسم البنك</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">رقم الحساب</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 hidden md:table-cell">RIB</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 hidden md:table-cell">IBAN</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">الرصيد</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {bankAccounts.map((account) => (
                  <tr
                    key={account.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-gray-900">{account.bankNameAr}</td>
                    <td className="py-3 px-4 text-gray-600" dir="ltr">{account.accountNumber}</td>
                    <td className="py-3 px-4 text-gray-600 hidden md:table-cell" dir="ltr">{account.rib}</td>
                    <td className="py-3 px-4 text-gray-600 hidden md:table-cell" dir="ltr">{account.iban}</td>
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      {formatCurrency(account.balance)}
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEditBank(account.id)}
                      >
                        تعديل
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Transaction Form */}
      <Card titleAr="إضافة معاملة جديدة">
        <form onSubmit={handleSubmitTransaction} className="space-y-6">
          {/* Row 1: Type & Fund Source */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Transaction Type */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">نوع المعاملة</label>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="txType"
                    value="credit"
                    checked={txType === 'credit'}
                    onChange={() => setTxType('credit')}
                    className="w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <span className="flex items-center gap-1 text-sm">
                    <ArrowUpCircle size={16} className="text-green-500" />
                    إيداع (دائن)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="txType"
                    value="debit"
                    checked={txType === 'debit'}
                    onChange={() => setTxType('debit')}
                    className="w-4 h-4 text-red-600 focus:ring-red-500"
                  />
                  <span className="flex items-center gap-1 text-sm">
                    <ArrowDownCircle size={16} className="text-red-500" />
                    سحب (مدين)
                  </span>
                </label>
              </div>
            </div>

            {/* Fund Source */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">مصدر التمويل</label>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="fundSource"
                    value="banque"
                    checked={txFundSource === 'banque'}
                    onChange={() => setTxFundSource('banque')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="flex items-center gap-1 text-sm">
                    <Building2 size={16} className="text-blue-500" />
                    بنك
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="fundSource"
                    value="caisse_physique"
                    checked={txFundSource === 'caisse_physique'}
                    onChange={() => setTxFundSource('caisse_physique')}
                    className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="flex items-center gap-1 text-sm">
                    <Banknote size={16} className="text-amber-500" />
                    نقدي (صندوق)
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Row 2: Bank Account (conditional) & Caisse & SubCategory */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {txFundSource === 'banque' && (
              <SearchableSelect
                labelAr="الحساب البنكي"
                value={txBankAccountId}
                onChange={setTxBankAccountId}
                options={bankAccounts.map((a) => ({
                  value: a.id,
                  label: `${a.bankNameAr} - ${a.accountNumber}`,
                }))}
                required
              />
            )}
            <SearchableSelect
              labelAr="الصندوق (الكيس)"
              value={txCaisseId}
              onChange={(val) => {
                setTxCaisseId(val)
                setTxSubCategoryId('')
              }}
              options={caisses.map((c) => ({
                value: c.id,
                label: c.nameAr,
              }))}
              required
            />
            {subCategories.length > 0 && (
              <SearchableSelect
                labelAr="الفئة الفرعية"
                value={txSubCategoryId}
                onChange={setTxSubCategoryId}
                options={subCategories.map((sc) => ({
                  value: sc.id,
                  label: sc.nameAr,
                }))}
              />
            )}
          </div>

          {/* Row 3: Donor / Beneficiary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {txType === 'credit' && (
              <SearchableSelect
                labelAr="المتبرع (اختياري)"
                value={txDonorId}
                onChange={setTxDonorId}
                options={donors.map((d) => ({
                  value: d.id,
                  label: `${d.firstNameAr} ${d.lastNameAr} (${d.reference || ''})`,
                }))}
              />
            )}
            {txType === 'debit' && (
              <SearchableSelect
                labelAr="المستفيد (اختياري)"
                value={txBeneficiaryId}
                onChange={setTxBeneficiaryId}
                options={beneficiaries.map((b) => ({
                  value: b.id,
                  label: `${b.firstNameAr} ${b.lastNameAr} (${b.reference || ''})`,
                }))}
              />
            )}
          </div>

          {/* Row 4: Amount & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Input
                labelAr="المبلغ (دج)"
                type="number"
                min="0"
                step="0.01"
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                required
                dir="ltr"
                className="text-left"
              />
              {amountNum > 0 && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">بالعربية:</span>{' '}
                    <span className="text-gray-800">{amountInWordsAr}</span>
                  </p>
                  <p className="text-xs text-gray-500" dir="ltr">
                    <span className="font-medium">En fran&ccedil;ais:</span>{' '}
                    <span className="text-gray-800">{amountInWordsFr}</span>
                  </p>
                </div>
              )}
            </div>
            <Input
              labelAr="التاريخ"
              type="date"
              value={txDate}
              onChange={(e) => setTxDate(e.target.value)}
              required
              dir="ltr"
              className="text-left"
            />
          </div>

          {/* Row 5: Description */}
          <TextArea
            labelAr="الوصف"
            value={txDescription}
            onChange={(e) => setTxDescription(e.target.value)}
            dir="rtl"
            placeholder="وصف المعاملة..."
          />

          {txError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <span>⚠️</span>
              <span>{txError}</span>
              <button onClick={() => setTxError('')} className="mr-auto text-red-500 hover:text-red-700">✕</button>
            </div>
          )}
          <div className="flex justify-end">
            <Button type="submit" disabled={txSubmitting || amountNum <= 0 || !txCaisseId}>
              {txSubmitting ? 'جاري الحفظ...' : 'حفظ المعاملة'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Transaction History */}
      <Card
        titleAr="سجل المعاملات"
        action={
          <Button
            size="sm"
            variant={filterOpen ? 'primary' : 'secondary'}
            onClick={() => setFilterOpen(!filterOpen)}
          >
            <Filter size={16} />
            {filterOpen ? 'إخفاء الفلتر' : 'فلترة'}
          </Button>
        }
      >
        {/* Collapsible Filter Section */}
        {filterOpen && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search
                size={16}
                className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400"
              />
              <input
                type="text"
                value={filterSearchTerm}
                onChange={(e) => setFilterSearchTerm(e.target.value)}
                placeholder="بحث في الوصف أو رقم الوصل..."
                className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                dir="rtl"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select
                labelAr="النوع"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                options={[
                  { value: 'credit', label: 'إيداع' },
                  { value: 'debit', label: 'سحب' },
                ]}
              />
              <Select
                labelAr="مصدر التمويل"
                value={filterFundSource}
                onChange={(e) => setFilterFundSource(e.target.value)}
                options={[
                  { value: 'banque', label: 'بنك' },
                  { value: 'caisse_physique', label: 'نقدي' },
                ]}
              />
              <Select
                labelAr="الصندوق"
                value={filterCaisseId}
                onChange={(e) => setFilterCaisseId(e.target.value)}
                options={caisses.map((c) => ({ value: c.id, label: c.nameAr }))}
              />
              <div /> {/* spacer */}
              <Input
                labelAr="من تاريخ"
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                dir="ltr"
                className="text-left"
              />
              <Input
                labelAr="إلى تاريخ"
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                dir="ltr"
                className="text-left"
              />
              <Input
                labelAr="الحد الأدنى للمبلغ"
                type="number"
                min="0"
                value={filterMinAmount}
                onChange={(e) => setFilterMinAmount(e.target.value)}
                dir="ltr"
                className="text-left"
              />
              <Input
                labelAr="الحد الأقصى للمبلغ"
                type="number"
                min="0"
                value={filterMaxAmount}
                onChange={(e) => setFilterMaxAmount(e.target.value)}
                dir="ltr"
                className="text-left"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button size="sm" variant="secondary" onClick={handleResetFilter}>
                إعادة تعيين
              </Button>
              <Button size="sm" onClick={handleApplyFilter}>
                <Search size={14} />
                تطبيق الفلتر
              </Button>
            </div>
          </div>
        )}

        {/* Transaction Table */}
        {loading ? (
          <LoadingSpinner />
        ) : transactions.length === 0 ? (
          <EmptyState message="لا توجد معاملات مسجّلة" icon={<Banknote size={48} />} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-right py-3 px-3 font-medium text-gray-500">التاريخ</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500">النوع</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500">المصدر</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500">المبلغ</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500 hidden sm:table-cell">الصندوق</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500 hidden md:table-cell">الوصف</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500 hidden md:table-cell">رقم الوصل</th>
                    <th className="text-center py-3 px-3 font-medium text-gray-500">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.map((tx) => {
                    const caisse = caisses.find((c) => c.id === tx.caisseId)
                    return (
                      <tr
                        key={tx.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                          {formatDate(tx.date)}
                        </td>
                        <td className="py-3 px-3">
                          {tx.type === 'credit' ? (
                            <Badge variant="success">إيداع</Badge>
                          ) : (
                            <Badge variant="danger">سحب</Badge>
                          )}
                        </td>
                        <td className="py-3 px-3 text-gray-600">
                          {tx.fundSource === 'banque' ? (
                            <span className="flex items-center gap-1">
                              <Building2 size={14} className="text-blue-500" />
                              بنك
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Banknote size={14} className="text-amber-500" />
                              نقدي
                            </span>
                          )}
                        </td>
                        <td
                          className={`py-3 px-3 font-semibold whitespace-nowrap ${
                            tx.type === 'credit' ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {tx.type === 'credit' ? '+' : '-'}
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="py-3 px-3 text-gray-600 hidden sm:table-cell">{caisse?.nameAr ?? '-'}</td>
                        <td className="py-3 px-3 text-gray-600 max-w-[200px] truncate hidden md:table-cell">
                          {tx.descriptionAr || tx.description || '-'}
                        </td>
                        <td className="py-3 px-3 text-gray-400 text-xs hidden md:table-cell" dir="ltr">
                          {tx.receiptNumber || '-'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handlePrintReceipt(tx)}
                            className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors"
                            title={tx.type === 'credit' ? 'طباعة وصل التبرع' : 'طباعة وصل الصرف'}
                          >
                            <Printer size={16} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4 border-t border-gray-100 mt-4">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  السابق
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      // Show first, last, current, and neighbors
                      if (page === 1 || page === totalPages) return true
                      if (Math.abs(page - currentPage) <= 1) return true
                      return false
                    })
                    .reduce<(number | 'ellipsis')[]>((acc, page, idx, arr) => {
                      if (idx > 0) {
                        const prev = arr[idx - 1]
                        if (page - prev > 1) acc.push('ellipsis')
                      }
                      acc.push(page)
                      return acc
                    }, [])
                    .map((item, idx) =>
                      item === 'ellipsis' ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
                          ...
                        </span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => setCurrentPage(item)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === item
                              ? 'bg-primary-600 text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  التالي
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Bank Account Modal */}
      <BankAccountModal
        isOpen={bankModalOpen}
        onClose={() => setBankModalOpen(false)}
        editingId={editingBankId}
        initialData={bankFormData}
        onSave={handleSaveBank}
      />
    </div>
  )
}
