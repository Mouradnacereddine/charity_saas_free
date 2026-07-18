import { useState, useEffect } from 'react'
import { Card, Button, Input, Select, SearchableSelect, Modal, Badge, TextArea, StatCard, EmptyState, LoadingSpinner } from '../components/common/UI'
import { formatCurrency, formatDate, numberToArabicWords, numberToFrenchWords } from '../utils/helpers'
import { printReceipt } from '../lib/receipt'
import { Plus, Banknote, Building2, ArrowUpCircle, ArrowDownCircle, Search, Filter, Printer, HeartHandshake, Edit } from 'lucide-react'
import { useTransactions, useCreateTransaction, useBankAccounts, useCreateBankAccount, useUpdateBankAccount, useConfirmTransaction, useCancelTransaction } from '../hooks/useFinance'
import { useBeneficiaries } from '../hooks/useBeneficiaries'
import { useDonors } from '../hooks/useDonors'
import { useAuth } from '../hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { caissesApi, financeApi } from '../lib/api'
import type { Transaction, BankAccount, Caisse, Beneficiary, Donor, DonationAllocation } from '../types'

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
  // ---- Data Hooks ----
  const [txFilters, setTxFilters] = useState<Record<string, string> | undefined>(undefined)
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions(txFilters)
  const { data: bankAccounts = [] } = useBankAccounts()
  const { data: caisses = [] } = useQuery({
    queryKey: ['caisses'],
    queryFn: () => caissesApi.list().then(r => r.data),
  })
  const { association } = useAuth()
  const { data: beneficiaries = [] } = useBeneficiaries()
  const { data: donors = [] } = useDonors()

  // ---- Mutations ----
  const createTransaction = useCreateTransaction()
  const createBankAccount = useCreateBankAccount()
  const updateBankAccount = useUpdateBankAccount()
  const confirmTransaction = useConfirmTransaction()
  const cancelTransaction = useCancelTransaction()

  // ---- Bank Account Modal State ----
  const [bankModalOpen, setBankModalOpen] = useState(false)
  const [editingBankId, setEditingBankId] = useState<string | null>(null)
  const [bankFormData, setBankFormData] = useState<BankAccountFormData>(emptyBankForm)
  const [detailBankAccount, setDetailBankAccount] = useState<BankAccount | null>(null)
  const [detailTx, setDetailTx] = useState<Transaction | null>(null)

  // ---- Transaction Form State ----
  const [txType, setTxType] = useState<'credit' | 'debit'>('credit')
  const [txFundSource, setTxFundSource] = useState<'banque' | 'caisse_physique'>('caisse_physique')
  const [txBankAccountId, setTxBankAccountId] = useState('')
  const [txCaisseId, setTxCaisseId] = useState('')
  const [txSubCategoryId, setTxSubCategoryId] = useState('')
  const [txDonorId, setTxDonorId] = useState('')
  const [txBeneficiaryId, setTxBeneficiaryId] = useState('')
  const [txAllocatedBeneficiaryId, setTxAllocatedBeneficiaryId] = useState('')
  const [txAllocationId, setTxAllocationId] = useState('')
  const [txAmount, setTxAmount] = useState('')
  const [txDescription, setTxDescription] = useState('')
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0])
  const [txAllocSearch, setTxAllocSearch] = useState('')
  const [txPending, setTxPending] = useState(false)
  const [txSubmitting, setTxSubmitting] = useState(false)
  const [txError, setTxError] = useState('')
  const [confirmingTxId, setConfirmingTxId] = useState<string | null>(null)
  const [confirmTxAmount, setConfirmTxAmount] = useState('')
  const [cancellingTxId, setCancellingTxId] = useState<string | null>(null)

  // ---- Allocations Data ----
  const { data: allocations = [] } = useQuery({
    queryKey: ['finance-allocations'],
    queryFn: async () => {
      const res = await financeApi.allocations();
      return res.data;
    },
  })
  const [allocFilterOpen, setAllocFilterOpen] = useState(false)
  const [allocBeneficiaryName, setAllocBeneficiaryName] = useState('')
  const [allocDonorName, setAllocDonorName] = useState('')
  const [allocCaisseId, setAllocCaisseId] = useState('')
  const [allocMinAmount, setAllocMinAmount] = useState('')
  const [allocMaxAmount, setAllocMaxAmount] = useState('')
  const [allocRemaining, setAllocRemaining] = useState('')
  const [allocStatus, setAllocStatus] = useState('')
  const [allocNotes, setAllocNotes] = useState('')
  const [committedAllocSearch, setCommittedAllocSearch] = useState({ donor: '', beneficiary: '', caisseId: '', minAmount: '', maxAmount: '', remaining: '', status: '', notes: '' })
  const [selectedAlloc, setSelectedAlloc] = useState<DonationAllocation | null>(null)

  const applyAllocFilters = () => {
    setCommittedAllocSearch({ donor: allocDonorName, beneficiary: allocBeneficiaryName, caisseId: allocCaisseId, minAmount: allocMinAmount, maxAmount: allocMaxAmount, remaining: allocRemaining, status: allocStatus, notes: allocNotes })
  }

  const resetAllocFilters = () => {
    setAllocDonorName('')
    setAllocBeneficiaryName('')
    setAllocCaisseId('')
    setAllocMinAmount('')
    setAllocMaxAmount('')
    setAllocRemaining('')
    setAllocStatus('')
    setAllocNotes('')
    setCommittedAllocSearch({ donor: '', beneficiary: '', caisseId: '', minAmount: '', maxAmount: '', remaining: '', status: '', notes: '' })
  }

  const filteredAllocations = allocations.filter((a: DonationAllocation) => {
    const c = committedAllocSearch
    if (c.donor && !(a.donor.lastNameAr.includes(c.donor) || a.donor.firstNameAr.includes(c.donor))) return false
    if (c.beneficiary && !(a.beneficiary.lastNameAr.includes(c.beneficiary) || a.beneficiary.firstNameAr.includes(c.beneficiary))) return false
    if (c.caisseId && a.creditTransaction?.caisseId !== c.caisseId) return false
    if (c.minAmount && a.amount < Number(c.minAmount)) return false
    if (c.maxAmount && a.amount > Number(c.maxAmount)) return false
    if (c.remaining === 'zero' && a.remainingAmount !== 0) return false
    if (c.remaining === 'positive' && a.remainingAmount <= 0) return false
    if (c.status === 'pending' && a.creditTransaction?.status !== 'pending') return false
    if (c.status === 'completed' && a.creditTransaction?.status !== 'completed') return false
    if (c.status === 'cancelled' && a.creditTransaction?.status !== 'cancelled') return false
    if (c.remaining === 'distributed' && !a.debitTransactionId) return false
    if (c.remaining === 'not_distributed' && a.debitTransactionId) return false
    if (c.notes && !(a.notes?.includes(c.notes))) return false
    return true
  })

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
  const [filterTxStatus, setFilterTxStatus] = useState('')

  // ---- Pagination State ----
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  // ---- Computed Values ----
  const amountNum = parseFloat(txAmount) || 0
  const amountInWordsAr = amountNum > 0 ? numberToArabicWords(amountNum) : ''
  const amountInWordsFr = amountNum > 0 ? numberToFrenchWords(amountNum) : ''

  const selectedCaisse = caisses.find((c: Caisse) => c.id === txCaisseId)
  const subCategories = selectedCaisse?.subCategories ?? []

  const totalBankBalance = bankAccounts.reduce((sum: number, acc: BankAccount) => sum + acc.balance, 0)
  const totalCash = caisses.reduce((sum: number, c: Caisse) => sum + c.balance, 0)

  const totalPages = Math.max(1, Math.ceil(transactions.length / pageSize))
  const paginatedTransactions = transactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  // ---- Handlers ----
  const handleOpenAddBank = () => {
    setEditingBankId(null)
    setBankFormData(emptyBankForm)
    setBankModalOpen(true)
  }

  const handleOpenEditBank = (id: string) => {
    const account = bankAccounts.find((a: BankAccount) => a.id === id)
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
      await updateBankAccount.mutateAsync({
        id: editingBankId,
        data: {
          bankNameAr: data.bankNameAr,
          bankName: data.bankNameAr,
          accountNumber: data.accountNumber,
          rib: data.rib,
          iban: data.iban,
          swift: data.swift,
        },
      })
    } else {
      await createBankAccount.mutateAsync({
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

  const handlePrintReceipt = (tx: any) => {
    const caisse = caisses.find((c: Caisse) => c.id === tx.caisseId)
    const subCat = caisse?.subCategories.find((s: { id: string; name: string; nameAr: string }) => s.id === tx.subCategoryId)
    const subCatRow = subCat ? `<div class="row"><span class="lbl">الفئة الفرعية</span><span class="val">${subCat.nameAr}</span></div>` : ''

    // Generate proper amount in words at print time (handles old data with numeric-only strings)
    const amount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : (tx.amount || 0)
    const wordsAr = tx.amountInWordsAr && !tx.amountInWordsAr.match(/^\d/) ? tx.amountInWordsAr : numberToArabicWords(amount)
    const wordsFr = tx.amountInWords && !tx.amountInWords.match(/^\d/) ? tx.amountInWords : numberToFrenchWords(amount)

    if (tx.type === 'credit') {
      const donor = donors.find((d: Donor) => d.id === tx.donorId)
      printReceipt(
        'وصل تبرع', 'Reçu de Don',
        `<div class="col"><div class="row"><span class="lbl">رقم الوصل</span><span class="val">${tx.receiptNumber || '—'}</span></div>
<div class="row"><span class="lbl">التاريخ</span><span class="val">${formatDate(tx.date)}</span></div>
<div class="row"><span class="lbl">المتبرع</span><span class="val">${donor ? `${donor.lastNameAr} ${donor.firstNameAr}` : '—'} <i>${donor ? `${donor.firstName} ${donor.lastName}` : ''}</i></span></div></div>
<div class="col"><div class="row"><span class="lbl">الصندوق</span><span class="val">${caisse?.nameAr || '—'}</span></div>${subCatRow}
${tx.descriptionAr ? `<div class="row"><span class="lbl">البيان</span><span class="val">${tx.descriptionAr}</span></div>` : ''}</div>`,
        'color:#16a34a',
        formatCurrency(amount), wordsAr, wordsFr,
        'توقيع المتبرع', 'ختم الجمعية',
        association?.nameAr
      )
    } else {
      const benef = beneficiaries.find((b: Beneficiary) => b.id === tx.beneficiaryId)
      printReceipt(
        'وصل صرف', 'Bon de Sortie',
        `<div class="col"><div class="row"><span class="lbl">رقم الوصل</span><span class="val">${tx.receiptNumber || '—'}</span></div>
<div class="row"><span class="lbl">التاريخ</span><span class="val">${formatDate(tx.date)}</span></div>
<div class="row"><span class="lbl">المستفيد</span><span class="val">${benef ? `${benef.lastNameAr} ${benef.firstNameAr}` : '—'} <i>${benef ? `${benef.firstName} ${benef.lastName}` : ''}</i></span></div></div>
<div class="col"><div class="row"><span class="lbl">الصندوق</span><span class="val">${caisse?.nameAr || '—'}</span></div>${subCatRow}
<div class="row"><span class="lbl">المصدر</span><span class="val">${tx.fundSource === 'banque' ? 'بنك' : 'صندوق نقدي'}</span></div>
${tx.descriptionAr ? `<div class="row"><span class="lbl">البيان</span><span class="val">${tx.descriptionAr}</span></div>` : ''}</div>`,
        'background:#fff0f0;color:#dc2626',
        `- ${formatCurrency(amount)}`, wordsAr, wordsFr,
        'إمضاء المستفيد', 'ختم الجمعية',
        association?.nameAr
      )
    }
  }

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!txCaisseId || amountNum <= 0) return

    setTxSubmitting(true)
    try {
      await createTransaction.mutateAsync({
        type: txType,
        amount: amountNum,
        amountInWords: numberToFrenchWords(amountNum),
        amountInWordsAr: numberToArabicWords(amountNum),
        fundSource: txFundSource,
        caisseId: txCaisseId,
        subCategoryId: txSubCategoryId || undefined,
        bankAccountId: txFundSource === 'banque' ? txBankAccountId || undefined : undefined,
        donorId: txDonorId || undefined,
        beneficiaryId: txBeneficiaryId || undefined,
        allocationId: txType === 'debit' ? txAllocationId || undefined : undefined,
        description: txDescription,
        descriptionAr: txDescription,
        date: txDate,
        status: txPending ? 'pending' : 'completed',
      })

      // Reset form
      setTxAmount('')
      setTxDescription('')
      setTxDonorId('')
      setTxBeneficiaryId('')
      setTxAllocatedBeneficiaryId('')
      setTxAllocationId('')
      setTxSubCategoryId('')
      setTxPending(false)
    } catch (err: any) {
      setTxError(err?.response?.data?.error || err?.message || 'فشل في إضافة المعاملة')
    } finally {
      setTxSubmitting(false)
    }
  }

  const handleApplyFilter = () => {
    const params: Record<string, string> = {}
    if (filterType) params.type = filterType
    if (filterFundSource) params.fundSource = filterFundSource
    if (filterCaisseId) params.caisseId = filterCaisseId
    if (filterDateFrom) params.dateFrom = filterDateFrom
    if (filterDateTo) params.dateTo = filterDateTo
    if (filterMinAmount) params.minAmount = filterMinAmount
    if (filterMaxAmount) params.maxAmount = filterMaxAmount
    if (filterSearchTerm) params.searchTerm = filterSearchTerm
    if (filterTxStatus) params.status = filterTxStatus

    setCurrentPage(1)
    setTxFilters(Object.keys(params).length > 0 ? params : undefined)
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
    setFilterTxStatus('')
    setCurrentPage(1)
    setTxFilters(undefined)
  }

  const handleConfirmTransaction = async (id: string) => {
    try {
      await confirmTransaction.mutateAsync(id)
      setConfirmingTxId(null)
      setConfirmTxAmount('')
      setDetailTx(null)
    } catch (err: any) {
      alert(err?.response?.data?.error || err?.message || 'فشل في تأكيد المعاملة')
    }
  }

  const handleCancelTransaction = async (id: string) => {
    try {
      await cancelTransaction.mutateAsync(id)
      setCancellingTxId(null)
      setDetailTx(null)
    } catch (err: any) {
      alert(err?.response?.data?.error || err?.message || 'فشل في إلغاء المعاملة')
    }
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
          subtitle={`${transactions.filter((t: Transaction) => t.type === 'credit').length} إيداع | ${transactions.filter((t: Transaction) => t.type === 'debit').length} سحب`}
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
                {bankAccounts.map((account: BankAccount) => (
                  <tr
                    key={account.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setDetailBankAccount(account)}
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

      {/* Allocations Section */}
      <Card
        titleAr="توزيع التبرعات"
        action={
          <Button
            size="sm"
            variant={allocFilterOpen ? 'primary' : 'secondary'}
            onClick={() => setAllocFilterOpen(!allocFilterOpen)}
          >
            <Filter size={16} />
            {allocFilterOpen ? 'إخفاء' : 'بحث متقدم'}
          </Button>
        }
      >
        {allocFilterOpen && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <Input labelAr="المتبرع" value={allocDonorName} onChange={(e) => setAllocDonorName(e.target.value)} placeholder="بحث..." />
              <Input labelAr="المستفيد" value={allocBeneficiaryName} onChange={(e) => setAllocBeneficiaryName(e.target.value)} placeholder="بحث..." />
              <SearchableSelect labelAr="الصندوق" value={allocCaisseId} onChange={setAllocCaisseId} options={caisses.map((c: any) => ({ value: c.id, label: c.nameAr }))} />
              <Input labelAr="المبلغ من" value={allocMinAmount} onChange={(e) => setAllocMinAmount(e.target.value)} type="number" placeholder="0" />
              <Input labelAr="المبلغ إلى" value={allocMaxAmount} onChange={(e) => setAllocMaxAmount(e.target.value)} type="number" placeholder="0" />
              <SearchableSelect labelAr="المبلغ المتبقي" value={allocRemaining} onChange={setAllocRemaining} options={[
                { value: '', label: 'الكل' },
                { value: 'zero', label: 'مصرف بالكامل' },
                { value: 'positive', label: 'متبقي' },
                { value: 'distributed', label: 'تم الصرف' },
                { value: 'not_distributed', label: 'لم يصرف بعد' },
              ]} />
              <SearchableSelect labelAr="حالة التبرع الأصلي" value={allocStatus} onChange={setAllocStatus} options={[
                { value: '', label: 'الكل' },
                { value: 'pending', label: 'معلق' },
                { value: 'completed', label: 'مكتمل' },
                { value: 'cancelled', label: 'ملغي' },
              ]} />
              <Input labelAr="ملاحظات" value={allocNotes} onChange={(e) => setAllocNotes(e.target.value)} placeholder="بحث..." />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={applyAllocFilters}><Search className="w-4 h-4" /> بحث</Button>
              <Button size="sm" variant="secondary" onClick={resetAllocFilters}>إعادة تعيين</Button>
            </div>
          </div>
        )}
        {filteredAllocations.length === 0 ? (
          <EmptyState message="لا توجد توزيعات" icon={<HeartHandshake size={48} />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">رقم الوصل</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">المتبرع</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">المستفيد</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600 hidden md:table-cell">الصندوق</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">المبلغ</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">المتبقي</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">الحالة</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {filteredAllocations.map((a: DonationAllocation) => {
                  const allocCaisse = caisses.find((c: any) => c.id === a.creditTransaction?.caisseId);
                  return (
                  <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedAlloc(a)}>
                    <td className="py-3 px-4 text-gray-500 font-mono text-xs" dir="ltr">{a.creditTransaction?.receiptNumber || '—'}</td>
                    <td className="py-3 px-4 font-medium">{a.donor.lastNameAr} {a.donor.firstNameAr}</td>
                    <td className="py-3 px-4 font-medium text-gray-900">{a.beneficiary.lastNameAr} {a.beneficiary.firstNameAr}</td>
                    <td className="py-3 px-4 hidden md:table-cell text-gray-700">{allocCaisse?.nameAr || '—'}</td>
                    <td className="py-3 px-4"><Badge variant="success">{formatCurrency(a.amount)}</Badge></td>
                    <td className="py-3 px-4">{a.remainingAmount > 0 ? formatCurrency(a.remainingAmount) : <Badge variant="success">0</Badge>}</td>
                    <td className="py-3 px-4">{(() => {
                      const txStatus = a.creditTransaction?.status;
                      if (txStatus === 'pending') return <Badge variant="warning">مرتبط بوعد</Badge>;
                      if (txStatus === 'cancelled') return <Badge variant="danger">ملغي</Badge>;
                      if (a.remainingAmount <= 0) return <Badge variant="success">مصرف بالكامل</Badge>;
                      if (a.debitTransactionId) return <Badge variant="info">مصرف جزئياً</Badge>;
                      return <Badge variant="info">نشط</Badge>;
                    })()}</td>
                    <td className="py-3 px-4 text-gray-600">{formatDate(a.createdAt)}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Allocation Detail Modal */}
      <Modal isOpen={!!selectedAlloc} onClose={() => setSelectedAlloc(null)} title="تفاصيل التوزيع" size="md">
        {selectedAlloc && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center"><span className="text-xs text-gray-500">المتبرع</span><span className="font-medium text-gray-900">{selectedAlloc.donor.lastNameAr} {selectedAlloc.donor.firstNameAr}</span></div>
              <div className="flex justify-between items-center"><span className="text-xs text-gray-500">المستفيد</span><span className="font-medium text-gray-900">{selectedAlloc.beneficiary.lastNameAr} {selectedAlloc.beneficiary.firstNameAr}</span></div>
              <div className="flex justify-between items-center"><span className="text-xs text-gray-500">الصندوق</span><span className="font-medium text-gray-900">{(() => { const ac = caisses.find((c: any) => c.id === selectedAlloc.creditTransaction?.caisseId); return ac?.nameAr || '—'; })()}</span></div>
              <div className="flex justify-between items-center"><span className="text-xs text-gray-500">المبلغ</span><span className="font-bold text-green-600">{formatCurrency(selectedAlloc.amount)}</span></div>
              <div className="flex justify-between items-center"><span className="text-xs text-gray-500">المبلغ المتبقي</span><span className="font-medium">{selectedAlloc.remainingAmount > 0 ? formatCurrency(selectedAlloc.remainingAmount) : 'مصرف بالكامل'}</span></div>
              {selectedAlloc.notes && <div className="flex justify-between items-center"><span className="text-xs text-gray-500">ملاحظات</span><span className="font-medium text-gray-900">{selectedAlloc.notes}</span></div>}
              <div className="flex justify-between items-center"><span className="text-xs text-gray-500">حالة التبرع الأصلي</span><span className="font-medium">{selectedAlloc.creditTransaction?.status === 'pending' ? <Badge variant="warning">معلق</Badge> : selectedAlloc.creditTransaction?.status === 'cancelled' ? <Badge variant="danger">ملغي</Badge> : <Badge variant="success">مكتمل</Badge>}</span></div>
              {selectedAlloc.debitTransactionId && <div className="flex justify-between items-center"><span className="text-xs text-gray-500">تم الصرف</span><span className="font-medium text-green-600">نعم</span></div>}
            </div>
            <div className="flex justify-end">
              <Button size="sm" variant="secondary" onClick={() => setSelectedAlloc(null)}>إغلاق</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Transaction Form */}
      <Card titleAr="إضافة معاملة جديدة">
        <form onSubmit={handleSubmitTransaction} className="space-y-6">
          {/* Row 1: Type & Fund Source */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Transaction Type */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">نوع المعاملة</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTxType('credit')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                    txType === 'credit'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <ArrowUpCircle size={18} />
                  إيداع (دائن)
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('debit')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                    txType === 'debit'
                      ? 'bg-red-50 border-red-400 text-red-700 shadow-sm'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <ArrowDownCircle size={18} />
                  سحب (مدين)
                </button>
              </div>
            </div>

            {/* Fund Source */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">مصدر التمويل</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTxFundSource('banque')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                    txFundSource === 'banque'
                      ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Building2 size={18} />
                  بنك
                </button>
                <button
                  type="button"
                  onClick={() => setTxFundSource('caisse_physique')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                    txFundSource === 'caisse_physique'
                      ? 'bg-amber-50 border-amber-400 text-amber-700 shadow-sm'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Banknote size={18} />
                  نقدي (صندوق)
                </button>
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
                options={bankAccounts.map((a: BankAccount) => ({
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
              options={caisses.map((c: Caisse) => ({
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
                options={subCategories.map((sc: { id: string; name: string; nameAr: string }) => ({
                  value: sc.id,
                  label: sc.nameAr,
                }))}
              />
            )}
          </div>

          {/* Row 3: Donor / Beneficiary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {txType === 'credit' && (
              <>
                <SearchableSelect
                  labelAr="المتبرع (اختياري)"
                  value={txDonorId}
                  onChange={setTxDonorId}
                  options={donors.map((d: Donor) => ({
                    value: d.id,
                    label: `${d.lastNameAr} ${d.firstNameAr} (${d.reference || ''})`,
                  }))}
                />
                <SearchableSelect
                  labelAr="المستفيد (اختياري)"
                  value={txBeneficiaryId}
                  onChange={setTxBeneficiaryId}
                  options={beneficiaries.map((b: Beneficiary) => ({
                    value: b.id,
                    label: `${b.lastNameAr} ${b.firstNameAr} (${b.reference || ''})`,
                  }))}
                />
              </>
            )}
            {txType === 'debit' && (
              <SearchableSelect
                labelAr="المستفيد (اختياري)"
                value={txBeneficiaryId}
                onChange={setTxBeneficiaryId}
                options={beneficiaries.map((b: Beneficiary) => ({
                  value: b.id,
                  label: `${b.lastNameAr} ${b.firstNameAr} (${b.reference || ''})`,
                }))}
              />
            )}
          </div>

          {/* Row 4: Amount & Date */}          {/* Row 4: Amount & Date */}
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
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={txPending}
                onChange={(e) => setTxPending(e.target.checked)}
                className="w-4 h-4 text-amber-500 focus:ring-amber-500 rounded"
              />
              <span className="text-sm text-gray-600">معاملة معلقة</span>
            </label>
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
            {filterOpen ? 'إخفاء' : 'بحث متقدم'}
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
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterCaisseId(e.target.value)}
                options={caisses.map((c: Caisse) => ({ value: c.id, label: c.nameAr }))}
              />
              <Select
                labelAr="الحالة"
                value={filterTxStatus}
                onChange={(e) => setFilterTxStatus(e.target.value)}
                options={[
                  { value: 'completed', label: 'مكتمل' },
                  { value: 'pending', label: 'معلق' },
                  { value: 'cancelled', label: 'ملغي' },
                ]}
              />
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

            <div className="flex gap-3 pt-2">
              <Button size="sm" onClick={handleApplyFilter}>
                <Search size={14} />
                بحث
              </Button>
              <Button size="sm" variant="secondary" onClick={handleResetFilter}>
                إعادة تعيين
              </Button>
            </div>
          </div>
        )}

        {/* Transaction Table */}
        {transactionsLoading ? (
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
                    <th className="text-right py-3 px-3 font-medium text-gray-500">رقم الوصل</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500">النوع</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500">الحالة</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500">المصدر</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500">المبلغ</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500 hidden sm:table-cell">المتبرع</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500 hidden sm:table-cell">المستفيد</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500 hidden sm:table-cell">الصندوق</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500 hidden lg:table-cell">الوصف</th>
                    <th className="text-center py-3 px-3 font-medium text-gray-500">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.map((tx: Transaction) => {
                    const caisse = caisses.find((c: Caisse) => c.id === tx.caisseId)
                    const txDonor = donors.find((d: Donor) => d.id === tx.donorId)
                    const txBenef = beneficiaries.find((b: Beneficiary) => b.id === tx.beneficiaryId)
                    return (
                      <tr
                        key={tx.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => setDetailTx(tx)}
                      >
                        <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                          {formatDate(tx.date)}
                        </td>
                        <td className="py-3 px-3 text-gray-500 font-mono text-xs" dir="ltr">{tx.receiptNumber || '—'}</td>
                        <td className="py-3 px-3">
                          {tx.type === 'credit' ? (
                            <Badge variant="success">إيداع</Badge>
                          ) : (
                            <Badge variant="danger">سحب</Badge>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {(tx.status || 'completed') === 'pending' ? (
                            <Badge variant="warning">معلق</Badge>
                          ) : (tx.status || 'completed') === 'cancelled' ? (
                            <Badge variant="danger">ملغي</Badge>
                          ) : (
                            <Badge variant="success">مكتمل</Badge>
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
                        <td className="py-3 px-3 text-gray-700 hidden sm:table-cell">
                          {txDonor ? `${txDonor.lastNameAr} ${txDonor.firstNameAr}` : '—'}
                        </td>
                        <td className="py-3 px-3 text-gray-700 hidden sm:table-cell">
                          {txBenef ? `${txBenef.lastNameAr} ${txBenef.firstNameAr}` : '—'}
                        </td>
                        <td className="py-3 px-3 text-gray-600 hidden sm:table-cell">{caisse?.nameAr ?? '-'}</td>
                        <td className="py-3 px-3 text-gray-600 max-w-[160px] truncate hidden lg:table-cell">
                          {tx.descriptionAr || tx.description || '-'}
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

      {/* Bank Account Detail Modal */}
      <Modal isOpen={!!detailBankAccount} onClose={() => setDetailBankAccount(null)} title="تفاصيل الحساب البنكي" size="md">
        {detailBankAccount && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 bg-gray-50 rounded-lg p-4">
              <div><p className="text-xs text-gray-500">اسم البنك</p><p className="font-semibold text-gray-900">{detailBankAccount.bankNameAr}</p></div>
              <div><p className="text-xs text-gray-500">رقم الحساب</p><p className="font-mono text-gray-900" dir="ltr">{detailBankAccount.accountNumber}</p></div>
              <div><p className="text-xs text-gray-500">RIB</p><p className="font-mono text-gray-900" dir="ltr">{detailBankAccount.rib}</p></div>
              <div><p className="text-xs text-gray-500">IBAN</p><p className="font-mono text-gray-900" dir="ltr">{detailBankAccount.iban}</p></div>
              <div><p className="text-xs text-gray-500">SWIFT</p><p className="font-mono text-gray-900" dir="ltr">{detailBankAccount.swift}</p></div>
              <div><p className="text-xs text-gray-500">الرصيد</p><p className="font-bold text-lg text-green-600">{formatCurrency(detailBankAccount.balance)}</p></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="primary" onClick={() => { handleOpenEditBank(detailBankAccount.id); setDetailBankAccount(null); }}>
                <Edit size={14} /> تعديل
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setDetailBankAccount(null)}>إغلاق</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Transaction Detail Modal */}
      <Modal isOpen={!!detailTx} onClose={() => setDetailTx(null)} title="تفاصيل المعاملة" size="lg">
        {detailTx && (() => {
          const caisse = caisses.find((c: Caisse) => c.id === detailTx.caisseId)
          const bankAcc = bankAccounts.find((b: BankAccount) => b.id === detailTx.bankAccountId)
          const donor = donors.find((d: Donor) => d.id === detailTx.donorId)
          const benef = beneficiaries.find((b: Beneficiary) => b.id === detailTx.beneficiaryId)
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                <div><p className="text-xs text-gray-500">النوع</p><p className="font-medium">{detailTx.type === 'credit' ? 'إيداع' : 'سحب'}</p></div>
                <div><p className="text-xs text-gray-500">المبلغ</p><p className={`font-bold text-lg ${detailTx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(detailTx.amount)}</p></div>
                <div><p className="text-xs text-gray-500">الحالة</p><p className="font-medium">{(detailTx.status || 'completed') === 'pending' ? <Badge variant="warning">معلق</Badge> : (detailTx.status || 'completed') === 'cancelled' ? <Badge variant="danger">ملغي</Badge> : <Badge variant="success">مكتمل</Badge>}</p></div>
                <div><p className="text-xs text-gray-500">الصندوق</p><p className="font-medium text-gray-900">{caisse?.nameAr || '—'}</p></div>
                <div><p className="text-xs text-gray-500">مصدر التمويل</p><p className="font-medium">{detailTx.fundSource === 'banque' ? 'بنك' : 'صندوق نقدي'}</p></div>
                {detailTx.fundSource === 'banque' && bankAcc && <div><p className="text-xs text-gray-500">الحساب البنكي</p><p className="font-medium">{bankAcc.bankNameAr}</p></div>}
                {donor && <div><p className="text-xs text-gray-500">المتبرع</p><p className="font-medium">{donor.lastNameAr} {donor.firstNameAr}</p></div>}
                {benef && <div><p className="text-xs text-gray-500">المستفيد</p><p className="font-medium">{benef.lastNameAr} {benef.firstNameAr}</p></div>}
                {detailTx.descriptionAr && <div className="sm:col-span-2"><p className="text-xs text-gray-500">الوصف</p><p className="font-medium text-gray-900">{detailTx.descriptionAr || detailTx.description}</p></div>}
                <div><p className="text-xs text-gray-500">رقم الوصل</p><p className="font-mono text-gray-900" dir="ltr">{detailTx.receiptNumber || '—'}</p></div>
                <div><p className="text-xs text-gray-500">التاريخ</p><p className="font-medium text-gray-900">{formatDate(detailTx.date)}</p></div>
              </div>
              <div className="flex justify-end gap-2">
                {detailTx.type === 'credit' && (detailTx.status === 'completed' || !detailTx.status) && (
                  <Button size="sm" variant="success" onClick={() => { handlePrintReceipt(detailTx); setDetailTx(null); }}>
                    <Printer size={14} /> طباعة الوصل
                  </Button>
                )}
                {(detailTx.status || 'completed') === 'pending' && (
                  <>
                    <Button size="sm" variant="primary" onClick={() => { setConfirmingTxId(detailTx.id); setConfirmTxAmount(String(detailTx.amount)); }}>
                      تأكيد المعاملة
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleCancelTransaction(detailTx.id)}>
                      إلغاء المعاملة
                    </Button>
                  </>
                )}
                <Button size="sm" variant="secondary" onClick={() => setDetailTx(null)}>إغلاق</Button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Confirm Transaction Modal */}
      <Modal isOpen={!!confirmingTxId} onClose={() => { setConfirmingTxId(null); setConfirmTxAmount(''); }} title="تأكيد المعاملة" size="sm">
        {confirmingTxId && detailTx && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">رقم الوصل</span><span className="font-mono" dir="ltr">{detailTx.receiptNumber || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">النوع</span><span>{detailTx.type === 'credit' ? 'إيداع' : 'سحب'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">المبلغ الأصلي</span><span className="font-bold">{formatCurrency(detailTx.amount)}</span></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">أدخل المبلغ المراد تأكيده</label>
              <input
                type="number"
                value={confirmTxAmount}
                onChange={(e) => { setConfirmTxAmount(e.target.value); }}
                max={detailTx.amount}
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                dir="ltr"
              />
              {Number(confirmTxAmount) > 0 && (
                <p className="text-xs text-gray-500 mt-1">{numberToArabicWords(Number(confirmTxAmount))}</p>
              )}
              {Number(confirmTxAmount) > detailTx.amount && (
                <p className="text-xs text-red-500 mt-1">المبلغ يتجاوز الحد المسموح به ({formatCurrency(detailTx.amount)})</p>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="secondary" onClick={() => { setConfirmingTxId(null); setConfirmTxAmount(''); }}>إلغاء</Button>
              <Button size="sm" variant="primary" onClick={() => handleConfirmTransaction(confirmingTxId!)} disabled={!confirmTxAmount || Number(confirmTxAmount) <= 0 || Number(confirmTxAmount) > detailTx.amount}>تأكيد</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
