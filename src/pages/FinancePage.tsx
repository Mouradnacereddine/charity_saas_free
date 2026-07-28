import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, Button, Input, Select, SearchableSelect, Modal, Badge, TextArea, StatCard, EmptyState, LoadingSpinner } from '../components/common/UI'
import { formatCurrency, formatDate, numberToArabicWords, numberToFrenchWords, numberToWords, localizedDesc } from '../utils/helpers'
import { printReceipt } from '../lib/receipt'
import { Plus, Banknote, Building2, ArrowUpCircle, ArrowDownCircle, Search, Filter, Printer, HeartHandshake, Edit, ListOrdered } from 'lucide-react'
import { useTransactions, useCreateTransaction, useBankAccounts, useCreateBankAccount, useUpdateBankAccount, useConfirmTransaction, useCancelTransaction } from '../hooks/useFinance'
import { useBeneficiaries } from '../hooks/useBeneficiaries'
import { useDonors } from '../hooks/useDonors'
import { useAuth } from '../hooks/useAuth'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { caissesApi, financeApi } from '../lib/api'
import type { Transaction, BankAccount, Caisse, Beneficiary, Donor, DonationAllocation } from '../types'

// ---- Bank Account Modal ----

interface BankAccountFormData {
  bankName: string
  accountNumber: string
  rib: string
  iban: string
  swift: string
}

const emptyBankForm: BankAccountFormData = {
  bankName: '',
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
  const { t, i18n } = useTranslation()
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
      title={editingId ? t('finance.editBankAccount') : t('finance.addBankAccount')}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('finance.bankName')}
          value={form.bankName}
          onChange={(e) => setForm({ ...form, bankName: e.target.value })}
          required
          dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
        />
        <Input
          label={t('finance.accountNumber')}
          value={form.accountNumber}
          onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
          required
          dir="ltr"
          className="text-left"
        />
        <Input
          label={t('finance.rib')}
          value={form.rib}
          onChange={(e) => setForm({ ...form, rib: e.target.value })}
          required
          dir="ltr"
          className="text-left"
        />
        <Input
          label={t('finance.iban')}
          value={form.iban}
          onChange={(e) => setForm({ ...form, iban: e.target.value })}
          required
          dir="ltr"
          className="text-left"
        />
        <Input
          label={t('finance.swift')}
          value={form.swift}
          onChange={(e) => setForm({ ...form, swift: e.target.value })}
          required
          dir="ltr"
          className="text-left"
        />
        <div className="flex gap-3 justify-end pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary">
            {editingId ? t('common.update') : t('common.add')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ---- Main Page ----

export default function FinancePage() {
  const { t, i18n } = useTranslation();
  // ---- Data Hooks ----
  const [txFilters, setTxFilters] = useState<Record<string, string> | undefined>(undefined)
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions(txFilters)
  const { data: bankAccounts = [] } = useBankAccounts()
  const { data: caisses = [] } = useQuery({
    queryKey: ['caisses'],
    queryFn: () => caissesApi.list().then(r => r.data),
  })
  const { association } = useAuth()
  const queryClient = useQueryClient()
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
  const [txAllocSearch, setTxAllocSearch] = useState('')
  const [txPending, setTxPending] = useState(false)
  const [txSubmitting, setTxSubmitting] = useState(false)
  const [txError, setTxError] = useState('')
  const [confirmingTxId, setConfirmingTxId] = useState<string | null>(null)
  const [confirmTxAmount, setConfirmTxAmount] = useState('')
  const [disbursingAllocId, setDisbursingAllocId] = useState<string | null>(null)
  const [disburseAmount, setDisburseAmount] = useState('')
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
    if (c.donor && !(a.donor.lastName.includes(c.donor) || a.donor.firstName.includes(c.donor))) return false
    if (c.beneficiary && !(a.beneficiary.lastName.includes(c.beneficiary) || a.beneficiary.firstName.includes(c.beneficiary))) return false
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
  const amountInWords = amountNum > 0 ? numberToWords(amountNum) : ''

  const selectedCaisse = caisses.find((c: Caisse) => c.id === txCaisseId)
  const subCategories = selectedCaisse?.subCategories ?? []

  const totalBankBalance = bankAccounts.reduce((sum: number, acc: BankAccount) => sum + acc.balance, 0)
  const totalCash = caisses.reduce((sum: number, c: Caisse) => sum + c.balance, 0)

  const totalPages = Math.max(1, Math.ceil(transactions.length / pageSize))
  const paginatedTransactions = transactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  // ---- Pending Reset Effect ----
  // La case "Transaction en attente" est reservee aux dons donateur -> beneficiaire
  useEffect(() => {
    if (!(txType === 'credit' && txDonorId && txBeneficiaryId)) {
      setTxPending(false)
    }
  }, [txType, txDonorId, txBeneficiaryId])

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
      bankName: account.bankName,
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
          bankName: data.bankName,
          bankName: data.bankName,
          accountNumber: data.accountNumber,
          rib: data.rib,
          iban: data.iban,
          swift: data.swift,
        },
      })
    } else {
      await createBankAccount.mutateAsync({
        bankName: data.bankName,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        rib: data.rib,
        iban: data.iban,
        swift: data.swift,
      })
    }
    setBankModalOpen(false)
    setEditingBankId(null)
  }

  const handlePrintReceipt = (tx: any) => {
    const caisse = caisses.find((c: Caisse) => c.id === tx.caisseId)
    const subCat = caisse?.subCategories.find((s: { id: string; name: string; name: string }) => s.id === tx.subCategoryId)
    const subCatRow = subCat ? `<div class="row"><span class="lbl">${t('receipt.subCategory')}</span><span class="val">${subCat.name}</span></div>` : ''

    // Generate proper amount in words at print time (handles old data with numeric-only strings)
    const amount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : (tx.amount || 0)
    const wordsAr = tx.amountInWords && !tx.amountInWords.match(/^\d/) ? tx.amountInWords : numberToArabicWords(amount)
    const wordsFr = tx.amountInWords && !tx.amountInWords.match(/^\d/) ? tx.amountInWords : numberToFrenchWords(amount)

    const isLtr = i18n.language !== 'ar';

    if (tx.type === 'credit') {
      const donor = donors.find((d: Donor) => d.id === tx.donorId)
      printReceipt(
        t('receipt.title'), t('receipt.title'),
        `<div class="col"><div class="row"><span class="lbl">${t('receipt.receiptNo')}</span><span class="val">${tx.receiptNumber || '—'}</span></div>
<div class="row"><span class="lbl">${t('common.date')}</span><span class="val">${formatDate(tx.date)}</span></div>
<div class="row"><span class="lbl">${t('dashboard.donor')}</span><span class="val">${donor ? `${donor.lastName} ${donor.firstName}` : '—'} <i>${donor ? `${donor.firstName} ${donor.lastName}` : ''}</i></span></div></div>
<div class="col"><div class="row"><span class="lbl">${t('dashboard.fund')}</span><span class="val">${caisse?.name || '—'}</span></div>${subCatRow}
${tx.description ? `<div class="row"><span class="lbl">${t('receipt.description')}</span><span class="val">${tx.description}</span></div>` : ''}</div>`,
        'color:#16a34a',
        formatCurrency(amount), wordsAr, wordsFr,
        t('donors.donorSignature'), t('receipt.stampSignature'),
        association?.name,
        isLtr ? 'ltr' : 'rtl',
        i18n.language
      )
    } else {
      const benef = beneficiaries.find((b: Beneficiary) => b.id === tx.beneficiaryId)
      printReceipt(
        t('receipt.expenseTitle'), t('receipt.expenseTitle'),
        `<div class="col"><div class="row"><span class="lbl">${t('receipt.receiptNo')}</span><span class="val">${tx.receiptNumber || '—'}</span></div>
<div class="row"><span class="lbl">${t('common.date')}</span><span class="val">${formatDate(tx.date)}</span></div>
<div class="row"><span class="lbl">${t('dashboard.beneficiary')}</span><span class="val">${benef ? `${benef.lastName} ${benef.firstName}` : '—'} <i>${benef ? `${benef.firstName} ${benef.lastName}` : ''}</i></span></div></div>
<div class="col"><div class="row"><span class="lbl">${t('dashboard.fund')}</span><span class="val">${caisse?.name || '—'}</span></div>${subCatRow}
<div class="row"><span class="lbl">${t('dashboard.source')}</span><span class="val">${tx.fundSource === 'banque' ? t('dashboard.bank') : t('dashboard.cash')}</span></div>
${tx.description ? `<div class="row"><span class="lbl">${t('receipt.description')}</span><span class="val">${tx.description}</span></div>` : ''}</div>`,
        'background:#fff0f0;color:#dc2626',
        `- ${formatCurrency(amount)}`, wordsAr, wordsFr,
        t('receipt.beneficiarySignature'), t('receipt.stampSignature'),
        association?.name,
        isLtr ? 'ltr' : 'rtl',
        i18n.language
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
        amountInWords: numberToArabicWords(amountNum),
        fundSource: txFundSource,
        caisseId: txCaisseId,
        subCategoryId: txSubCategoryId || undefined,
        bankAccountId: txFundSource === 'banque' ? txBankAccountId || undefined : undefined,
        donorId: txDonorId || undefined,
        beneficiaryId: txBeneficiaryId || undefined,
        allocationId: txType === 'debit' ? txAllocationId || undefined : undefined,
        description: txDescription,
        description: txDescription,
        date: new Date().toISOString().split('T')[0],
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
      setTxError(err?.response?.data?.error || err?.message || t('finance.addFailed'))
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
      await confirmTransaction.mutateAsync({ id, amount: Number(confirmTxAmount) })
      setConfirmingTxId(null)
      setConfirmTxAmount('')
      setDetailTx(null)
    } catch (err: any) {
      alert(err?.response?.data?.error || err?.message || t('finance.confirmFailed'))
    }
  }

  const handleCancelTransaction = async (id: string) => {
    try {
      await cancelTransaction.mutateAsync(id)
      setCancellingTxId(null)
      setDetailTx(null)
    } catch (err: any) {
      alert(err?.response?.data?.error || err?.message || t('finance.cancelFailed'))
    }
  }

  const handleDisburseAllocation = async () => {
    if (!disbursingAllocId || !disburseAmount || Number(disburseAmount) <= 0) return
    try {
      await financeApi.disburseAllocation(disbursingAllocId, Number(disburseAmount))
      setDisbursingAllocId(null)
      setDisburseAmount('')
      setDetailTx(null)
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['finance-allocations'] })
      queryClient.invalidateQueries({ queryKey: ['caisses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (err: any) {
      alert(err?.response?.data?.error || err?.message || t('finance.disburseFailed'))
    }
  }

  // ---- Render ----

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">{t('finance.title')}</h1>
      </div>

      {/* Stat Cards — variantes alignees MediCare */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title={t('finance.totalBankBalance')}
          value={formatCurrency(totalBankBalance)}
          icon={<Building2 size={24} />}
          color="bg-primary"
        />
        <StatCard
          title={t('finance.totalCash')}
          value={formatCurrency(totalCash)}
          icon={<Banknote size={24} />}
          color="bg-primary"
        />
        <StatCard
          title={t('finance.totalTransactions')}
          value={transactions.length}
          subtitle={`${transactions.filter((t: Transaction) => t.type === 'credit').length} ${t('dashboard.deposit')} | ${transactions.filter((t: Transaction) => t.type === 'debit').length} ${t('dashboard.withdrawal')}`}
          icon={<ListOrdered size={24} />}
          color="bg-primary"
        />
      </div>

      {/* Bank Accounts Section */}
      <Card
        titleAr={t('finance.bankAccounts')}
        action={
          <Button size="sm" onClick={handleOpenAddBank}>
            <Plus size={16} />
            {t('finance.addBankAccount')}
          </Button>
        }
      >
        {bankAccounts.length === 0 ? (
          <EmptyState message={t('finance.noBankAccounts')} icon={<Building2 size={48} />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('finance.bankName')}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('finance.accountNumber')}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">{t('finance.rib')}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">{t('finance.iban')}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('finance.accountBalance')}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {bankAccounts.map((account: BankAccount) => (
                  <tr
                    key={account.id}
                    className="border-b border-border hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => setDetailBankAccount(account)}
                  >
                    <td className="py-3 px-4 font-medium text-foreground">{account.bankName}</td>
                    <td className="py-3 px-4 text-muted-foreground" dir="ltr">{account.accountNumber}</td>
                    <td className="py-3 px-4 text-muted-foreground hidden md:table-cell" dir="ltr">{account.rib}</td>
                    <td className="py-3 px-4 text-muted-foreground hidden md:table-cell" dir="ltr">{account.iban}</td>
                    <td className="py-3 px-4 font-semibold text-foreground">
                      {formatCurrency(account.balance)}
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); handleOpenEditBank(account.id); }}
                      >
                        {t('common.edit')}
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
        titleAr={t('finance.donationDistribution')}
        action={
          <Button
            size="sm"
            variant={allocFilterOpen ? 'primary' : 'secondary'}
            onClick={() => setAllocFilterOpen(!allocFilterOpen)}
          >
            <Filter size={16} />
            {allocFilterOpen ? t('common.close') : t('beneficiaries.advancedSearch')}
          </Button>
        }
      >
        {allocFilterOpen && (
          <div className="mb-4 p-4 bg-muted rounded-lg border border-border space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <Input label={t('dashboard.donor')} value={allocDonorName} onChange={(e) => setAllocDonorName(e.target.value)} placeholder={t('common.search')} />
              <Input label={t('dashboard.beneficiary')} value={allocBeneficiaryName} onChange={(e) => setAllocBeneficiaryName(e.target.value)} placeholder={t('common.search')} />
              <SearchableSelect label={t('dashboard.fund')} value={allocCaisseId} onChange={setAllocCaisseId} options={caisses.map((c: any) => ({ value: c.id, label: c.name }))} />
              <Input label={t('medical.amountFrom')} value={allocMinAmount} onChange={(e) => setAllocMinAmount(e.target.value)} type="number" placeholder="0" />
              <Input label={t('medical.amountTo')} value={allocMaxAmount} onChange={(e) => setAllocMaxAmount(e.target.value)} type="number" placeholder="0" />
              <SearchableSelect label={t('finance.remainingAmount')} value={allocRemaining} onChange={setAllocRemaining} options={[
                { value: '', label: t('common.all') },
                { value: 'zero', label: t('dashboard.fullyDisbursed') },
                { value: 'positive', label: t('finance.remaining') },
                { value: 'distributed', label: t('finance.disbursed') },
                { value: 'not_distributed', label: t('finance.notDisbursed') },
              ]} />
              <SearchableSelect label={t('finance.originalDonationStatus')} value={allocStatus} onChange={setAllocStatus} options={[
                { value: '', label: t('common.all') },
                { value: 'pending', label: t('dashboard.pending') },
                { value: 'completed', label: t('dashboard.completed') },
                { value: 'cancelled', label: t('dashboard.cancelled') },
              ]} />
              <Input label={t('common.notes')} value={allocNotes} onChange={(e) => setAllocNotes(e.target.value)} placeholder={t('common.search')} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={applyAllocFilters}><Search className="w-4 h-4" /> {t('common.search')}</Button>
              <Button size="sm" variant="secondary" onClick={resetAllocFilters}>{t('doctors.reset')}</Button>
            </div>
          </div>
        )}
        {filteredAllocations.length === 0 ? (
          <EmptyState message={t('finance.noAllocations')} icon={<HeartHandshake size={48} />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-start py-3 px-4 font-semibold text-muted-foreground">{t('dashboard.receiptNo')}</th>
                  <th className="text-start py-3 px-4 font-semibold text-muted-foreground">{t('dashboard.donor')}</th>
                  <th className="text-start py-3 px-4 font-semibold text-muted-foreground">{t('dashboard.beneficiary')}</th>
                  <th className="text-start py-3 px-4 font-semibold text-muted-foreground hidden md:table-cell">{t('dashboard.fund')}</th>
                  <th className="text-start py-3 px-4 font-semibold text-muted-foreground">{t('common.amount')}</th>
                  <th className="text-start py-3 px-4 font-semibold text-muted-foreground">{t('finance.remainingAmount')}</th>
                  <th className="text-start py-3 px-4 font-semibold text-muted-foreground">{t('common.status')}</th>
                  <th className="text-start py-3 px-4 font-semibold text-muted-foreground">{t('common.date')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAllocations.map((a: DonationAllocation) => {
                  const allocCaisse = caisses.find((c: any) => c.id === a.creditTransaction?.caisseId);
                  return (
                  <tr key={a.id} className="border-b border-border hover:bg-muted transition-colors cursor-pointer" onClick={() => setSelectedAlloc(a)}>
                    <td className="py-3 px-4 text-muted-foreground font-mono text-xs" dir="ltr">{a.creditTransaction?.receiptNumber || '—'}</td>
                    <td className="py-3 px-4 font-medium">{a.donor.lastName} {a.donor.firstName}</td>
                    <td className="py-3 px-4 font-medium text-foreground">{a.beneficiary.lastName} {a.beneficiary.firstName}</td>
                    <td className="py-3 px-4 hidden md:table-cell text-foreground">{allocCaisse?.name || '—'}</td>
                    <td className="py-3 px-4"><Badge variant="success">{formatCurrency(a.amount)}</Badge></td>
                    <td className="py-3 px-4">{a.remainingAmount > 0 ? formatCurrency(a.remainingAmount) : <Badge variant="success">0</Badge>}</td>
                    <td className="py-3 px-4">{(() => {
                      const txStatus = a.creditTransaction?.status;
                      if (txStatus === 'pending') return <Badge variant="warning">{t('finance.pledged')}</Badge>;
                      if (txStatus === 'cancelled') return <Badge variant="danger">{t('dashboard.cancelled')}</Badge>;
                      if (a.remainingAmount <= 0) return <Badge variant="success">{t('dashboard.fullyDisbursed')}</Badge>;
                      if (a.debitTransactionId) return <Badge variant="info">{t('dashboard.partiallyDisbursed')}</Badge>;
                      return <Badge variant="info">{t('dashboard.active')}</Badge>;
                    })()}</td>
                    <td className="py-3 px-4 text-muted-foreground">{formatDate(a.createdAt)}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Allocation Detail Modal */}
      <Modal isOpen={!!selectedAlloc} onClose={() => setSelectedAlloc(null)} title={t('finance.allocationDetails')} size="md">
        {selectedAlloc && (
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center"><span className="text-xs text-muted-foreground">{t('dashboard.donor')}</span><span className="font-medium text-foreground">{selectedAlloc.donor.lastName} {selectedAlloc.donor.firstName}</span></div>
              <div className="flex justify-between items-center"><span className="text-xs text-muted-foreground">{t('dashboard.beneficiary')}</span><span className="font-medium text-foreground">{selectedAlloc.beneficiary.lastName} {selectedAlloc.beneficiary.firstName}</span></div>
              <div className="flex justify-between items-center"><span className="text-xs text-muted-foreground">{t('dashboard.fund')}</span><span className="font-medium text-foreground">{(() => { const ac = caisses.find((c: any) => c.id === selectedAlloc.creditTransaction?.caisseId); return ac?.name || '—'; })()}</span></div>
              <div className="flex justify-between items-center"><span className="text-xs text-muted-foreground">{t('common.amount')}</span><span className="font-bold text-success">{formatCurrency(selectedAlloc.amount)}</span></div>
              <div className="flex justify-between items-center"><span className="text-xs text-muted-foreground">{t('finance.remainingAmount')}</span><span className="font-medium">{selectedAlloc.remainingAmount > 0 ? formatCurrency(selectedAlloc.remainingAmount) : t('dashboard.fullyDisbursed')}</span></div>
              {selectedAlloc.notes && <div className="flex justify-between items-center"><span className="text-xs text-muted-foreground">{t('common.notes')}</span><span className="font-medium text-foreground">{selectedAlloc.notes}</span></div>}
              <div className="flex justify-between items-center"><span className="text-xs text-muted-foreground">{t('finance.originalDonationStatus')}</span><span className="font-medium">{selectedAlloc.creditTransaction?.status === 'pending' ? <Badge variant="warning">{t('dashboard.pending')}</Badge> : selectedAlloc.creditTransaction?.status === 'cancelled' ? <Badge variant="danger">{t('dashboard.cancelled')}</Badge> : <Badge variant="success">{t('dashboard.completed')}</Badge>}</span></div>
              {selectedAlloc.debitTransactionId && selectedAlloc.remainingAmount > 0 && <div className="flex justify-between items-center"><span className="text-xs text-muted-foreground">{t('finance.disbursed')}</span><span className="font-medium text-warning">{t('dashboard.partiallyDisbursed')}</span></div>}
              {selectedAlloc.debitTransactionId && selectedAlloc.remainingAmount <= 0 && <div className="flex justify-between items-center"><span className="text-xs text-muted-foreground">{t('finance.disbursed')}</span><span className="font-medium text-success">{t('dashboard.fullyDisbursed')}</span></div>}
            </div>
            <div className="flex justify-end">
              <Button size="sm" variant="secondary" onClick={() => setSelectedAlloc(null)}>{t('common.close')}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Transaction Form */}
      <Card titleAr={t('finance.newTransaction')}>
        <form onSubmit={handleSubmitTransaction} className="space-y-6">
          {/* Row 1: Type & Fund Source */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Transaction Type */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">{t('finance.transactionType')}</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTxType('credit')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                    txType === 'credit'
                      ? 'bg-success/10 border-success/30 text-success-foreground shadow-sm'
                      : 'bg-card border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <ArrowUpCircle size={18} />
                  {t('finance.depositCredit')}
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('debit')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                    txType === 'debit'
                      ? 'bg-destructive/10 border-destructive/30 text-destructive shadow-sm'
                      : 'bg-card border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <ArrowDownCircle size={18} />
                  {t('finance.withdrawalDebit')}
                </button>
              </div>
            </div>

            {/* Fund Source */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">{t('dashboard.source')}</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTxFundSource('banque')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                    txFundSource === 'banque'
                      ? 'bg-accent border-accent text-accent-foreground shadow-sm'
                      : 'bg-card border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Building2 size={18} />
                  {t('dashboard.bank')}
                </button>
                <button
                  type="button"
                  onClick={() => setTxFundSource('caisse_physique')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                    txFundSource === 'caisse_physique'
                      ? 'bg-warning/10 border-warning/30 text-warning-foreground shadow-sm'
                      : 'bg-card border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Banknote size={18} />
                  {t('finance.cashFund')}
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Bank Account (conditional) & Caisse & SubCategory */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {txFundSource === 'banque' && (
              <SearchableSelect
                label={t('finance.editBankAccount')}
                value={txBankAccountId}
                onChange={setTxBankAccountId}
                options={bankAccounts.map((a: BankAccount) => ({
                  value: a.id,
                  label: `${a.bankName} - ${a.accountNumber}`,
                }))}
                required
              />
            )}
            <SearchableSelect
              label={t('dashboard.fund')}
              value={txCaisseId}
              onChange={(val) => {
                setTxCaisseId(val)
                setTxSubCategoryId('')
              }}
              options={caisses.map((c: Caisse) => ({
                value: c.id,
                label: c.name,
              }))}
              required
            />
            {subCategories.length > 0 && (
              <SearchableSelect
                label={t('medical.subCategory')}
                value={txSubCategoryId}
                onChange={setTxSubCategoryId}
                options={subCategories.map((sc: { id: string; name: string; name: string }) => ({
                  value: sc.id,
                  label: sc.name,
                }))}
              />
            )}
          </div>

          {/* Row 3: Donor / Beneficiary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {txType === 'credit' && (
              <>
                <SearchableSelect
                  labelAr={`${t('dashboard.donor')} (${t('common.optional')})`}
                  value={txDonorId}
                  onChange={setTxDonorId}
                  options={donors.map((d: Donor) => ({
                    value: d.id,
                    label: `${d.lastName} ${d.firstName} (${d.reference || ''})`,
                  }))}
                />
                <SearchableSelect
                  labelAr={`${t('dashboard.beneficiary')} (${t('common.optional')})`}
                  value={txBeneficiaryId}
                  onChange={setTxBeneficiaryId}
                  options={beneficiaries.map((b: Beneficiary) => ({
                    value: b.id,
                    label: `${b.lastName} ${b.firstName} (${b.reference || ''})`,
                  }))}
                />
              </>
            )}
            {txType === 'debit' && (
              <SearchableSelect
                labelAr={`${t('dashboard.beneficiary')} (${t('common.optional')})`}
                value={txBeneficiaryId}
                onChange={setTxBeneficiaryId}
                options={beneficiaries.map((b: Beneficiary) => ({
                  value: b.id,
                  label: `${b.lastName} ${b.firstName} (${b.reference || ''})`,
                }))}
              />
            )}
          </div>

          {/* Row 4: Amount & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Input
                label={t('common.amount')}
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
                <div className="mt-2 p-3 bg-muted rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">{t('receipt.amountInWords')}:</span>{' '}
                    <span className="text-foreground">{amountInWords}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <TextArea
            label={t('common.description')}
            value={txDescription}
            onChange={(e) => setTxDescription(e.target.value)}
            dir="rtl"
            placeholder={t('finance.txDescriptionPlaceholder')}
          />

          {txError && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg flex items-center gap-2">
              <span>⚠️</span>
              <span>{txError}</span>
              <button onClick={() => setTxError('')} className="mr-auto text-destructive hover:text-destructive">✕</button>
            </div>
          )}
          <div className="flex items-center justify-between">
            {txType === 'credit' && txDonorId && txBeneficiaryId ? (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={txPending}
                  onChange={(e) => setTxPending(e.target.checked)}
                  className="w-4 h-4 text-warning-foreground focus:ring-amber-500 rounded"
                />
                <span className="text-sm text-muted-foreground">{t('finance.pendingTx')}</span>
              </label>
            ) : (
              <div />
            )}
            <Button type="submit" disabled={txSubmitting || amountNum <= 0 || !txCaisseId}>
              {txSubmitting ? t('common.saving') : t('finance.saveTransaction')}
            </Button>
          </div>
        </form>
      </Card>

      {/* Transaction History */}
      <Card
        titleAr={t('finance.transactionLog')}
        action={
          <Button
            size="sm"
            variant={filterOpen ? 'primary' : 'secondary'}
            onClick={() => setFilterOpen(!filterOpen)}
          >
            <Filter size={16} />
            {filterOpen ? t('common.close') : t('beneficiaries.advancedSearch')}
          </Button>
        }
      >
        {/* Collapsible Filter Section */}
        {filterOpen && (
          <div className="mb-6 p-4 bg-muted rounded-lg border border-border space-y-4">
            {/* Search */}
            <div className="relative">
              <Search
                size={16}
                className="absolute top-1/2 -translate-y-1/2 right-3 text-muted-foreground/70"
              />
              <input
                type="text"
                value={filterSearchTerm}
                onChange={(e) => setFilterSearchTerm(e.target.value)}
                placeholder={t('finance.searchPlaceholder')}
                className="w-full pr-10 pl-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select
                label={t('common.status')}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                options={[
                  { value: 'credit', label: t('finance.depositCredit') },
                  { value: 'debit', label: t('finance.withdrawalDebit') },
                ]}
              />
              <Select
                label={t('dashboard.source')}
                value={filterFundSource}
                onChange={(e) => setFilterFundSource(e.target.value)}
                options={[
                  { value: 'banque', label: t('dashboard.bank') },
                  { value: 'caisse_physique', label: t('finance.cashFund') },
                ]}
              />
              <Select
                label={t('dashboard.fund')}
                value={filterCaisseId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterCaisseId(e.target.value)}
                options={caisses.map((c: Caisse) => ({ value: c.id, label: c.name }))}
              />
              <Select
                label={t('common.status')}
                value={filterTxStatus}
                onChange={(e) => setFilterTxStatus(e.target.value)}
                options={[
                  { value: 'completed', label: t('dashboard.completed') },
                  { value: 'pending', label: t('dashboard.pending') },
                  { value: 'cancelled', label: t('dashboard.cancelled') },
                ]}
              />
              <Input
                label={t('analytics.fromDate')}
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                dir="ltr"
                className="text-left"
              />
              <Input
                label={t('analytics.toDate')}
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                dir="ltr"
                className="text-left"
              />
              <Input
                label={t('medical.amountFrom')}
                type="number"
                min="0"
                value={filterMinAmount}
                onChange={(e) => setFilterMinAmount(e.target.value)}
                dir="ltr"
                className="text-left"
              />
              <Input
                label={t('medical.amountTo')}
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
                {t('common.search')}
              </Button>
              <Button size="sm" variant="secondary" onClick={handleResetFilter}>
                {t('doctors.reset')}
              </Button>
            </div>
          </div>
        )}

        {/* Transaction Table */}
        {transactionsLoading ? (
          <LoadingSpinner />
        ) : transactions.length === 0 ? (
          <EmptyState message={t('dashboard.noTransactions')} icon={<Banknote size={48} />} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-start py-3 px-3 font-medium text-muted-foreground">{t('common.date')}</th>
                    <th className="text-start py-3 px-3 font-medium text-muted-foreground">{t('dashboard.receiptNo')}</th>
                    <th className="text-start py-3 px-3 font-medium text-muted-foreground">{t('dashboard.type')}</th>
                    <th className="text-start py-3 px-3 font-medium text-muted-foreground">{t('common.status')}</th>
                    <th className="text-start py-3 px-3 font-medium text-muted-foreground">{t('dashboard.source')}</th>
                    <th className="text-start py-3 px-3 font-medium text-muted-foreground">{t('common.amount')}</th>
                    <th className="text-start py-3 px-3 font-medium text-muted-foreground">{t('finance.remainingAmount')}</th>
                    <th className="text-start py-3 px-3 font-medium text-muted-foreground">{t('dashboard.donor')}</th>
                    <th className="text-start py-3 px-3 font-medium text-muted-foreground">{t('dashboard.beneficiary')}</th>
                    <th className="text-start py-3 px-3 font-medium text-muted-foreground hidden sm:table-cell">{t('dashboard.fund')}</th>
                    <th className="text-start py-3 px-3 font-medium text-muted-foreground hidden lg:table-cell">{t('receipt.description')}</th>
                    <th className="text-center py-3 px-3 font-medium text-muted-foreground">{t('common.actions')}</th>
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
                        className="border-b border-border hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => setDetailTx(tx)}
                      >
                        <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                          {formatDate(tx.date)}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground font-mono text-xs" dir="ltr">{tx.receiptNumber || '—'}</td>
                        <td className="py-3 px-3">
                          {tx.type === 'credit' ? (
                            <Badge variant="success">{t('dashboard.deposit')}</Badge>
                          ) : (
                            <Badge variant="danger">{t('dashboard.withdrawal')}</Badge>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {(() => {
                            const rawStatus = tx.status || 'completed';
                            if (rawStatus === 'pending') return <Badge variant="warning">{t('dashboard.pending')}</Badge>;
                            if (rawStatus === 'cancelled') return <Badge variant="danger">{t('dashboard.cancelled')}</Badge>;
                            // Completed — check if there's a remaining amount (partial)
                            const rem = (tx as any).remainingAmount;
                            if (rem !== null && typeof rem === 'number') {
                              if (tx.type === 'credit' && rem > 0 && rem < tx.amount) {
                                return <Badge variant="info">{t('dashboard.partiallyDisbursed')}</Badge>;
                              }
                              if (tx.type === 'debit' && rem > 0) {
                                return <Badge variant="warning">{t('dashboard.partiallyDisbursed')}</Badge>;
                              }
                            }
                            return <Badge variant="success">{t('dashboard.completed')}</Badge>;
                          })()}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {tx.fundSource === 'banque' ? (
                            <span className="flex items-center gap-1">
                              <Building2 size={14} className="text-accent-foreground" />
                              {t('dashboard.bank')}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Banknote size={14} className="text-warning-foreground" />
                              {t('finance.cashFund')}
                            </span>
                          )}
                        </td>
                        <td
                          className={`py-3 px-3 font-semibold whitespace-nowrap ${
                            tx.type === 'credit' ? 'text-success' : 'text-destructive'
                          }`}
                        >
                          {tx.type === 'credit' ? '+' : '-'}
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="py-3 px-3">
                          {(() => {
                            const rawStatus = tx.status || 'completed';
                            const rem = (tx as any).remainingAmount;
                            if (rawStatus === 'pending') return <span className="text-muted-foreground/70">—</span>;
                            if (rawStatus === 'cancelled') return <span className="text-muted-foreground/70">—</span>;
                            // null = no allocation (credit without beneficiary)
                            if (rem === null || rem === undefined) return <span className="text-muted-foreground/50">—</span>;
                            if (rem > 0) return <Badge variant="warning">{formatCurrency(rem)}</Badge>;
                            return <Badge variant="success">{t('dashboard.fullyDisbursed')}</Badge>;
                          })()}
                        </td>
                        <td className="py-3 px-3 text-foreground">
                          {txDonor ? `${txDonor.lastName} ${txDonor.firstName}` : '—'}
                        </td>
                        <td className="py-3 px-3 text-foreground">
                          {txBenef ? `${txBenef.lastName} ${txBenef.firstName}` : '—'}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground hidden sm:table-cell">{caisse?.name ?? '-'}</td>
                        <td className="py-3 px-3 text-muted-foreground max-w-[160px] truncate hidden lg:table-cell">
                          {localizedDesc(tx.description, tx.description) || '-'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePrintReceipt(tx); }}
                            className="p-1.5 text-muted-foreground/70 hover:text-primary transition-colors"
                            title={tx.type === 'credit' ? t('donors.printReceipt') : t('donors.printReceipt')}
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
              <div className="flex items-center justify-center gap-2 pt-4 border-t border-border mt-4">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  {t('common.previous')}
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
                        <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground/70">
                          ...
                        </span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => setCurrentPage(item)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === item
                              ? 'bg-primary-600 text-white'
                              : 'text-muted-foreground hover:bg-muted'
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
                  {t('common.next')}
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
      <Modal isOpen={!!detailBankAccount} onClose={() => setDetailBankAccount(null)} title={t('finance.bankAccountDetails')} size="md">
        {detailBankAccount && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 bg-muted rounded-lg p-4">
              <div><p className="text-xs text-muted-foreground">{t('finance.bankName')}</p><p className="font-semibold text-foreground">{detailBankAccount.bankName}</p></div>
              <div><p className="text-xs text-muted-foreground">{t('finance.accountNumber')}</p><p className="font-mono text-foreground" dir="ltr">{detailBankAccount.accountNumber}</p></div>
              <div><p className="text-xs text-muted-foreground">{t('finance.rib')}</p><p className="font-mono text-foreground" dir="ltr">{detailBankAccount.rib}</p></div>
              <div><p className="text-xs text-muted-foreground">{t('finance.iban')}</p><p className="font-mono text-foreground" dir="ltr">{detailBankAccount.iban}</p></div>
              <div><p className="text-xs text-muted-foreground">{t('finance.swift')}</p><p className="font-mono text-foreground" dir="ltr">{detailBankAccount.swift}</p></div>
              <div><p className="text-xs text-muted-foreground">{t('finance.accountBalance')}</p><p className="font-bold text-lg text-success">{formatCurrency(detailBankAccount.balance)}</p></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="primary" onClick={() => { handleOpenEditBank(detailBankAccount.id); setDetailBankAccount(null); }}>
                <Edit size={14} /> {t('common.edit')}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setDetailBankAccount(null)}>{t('common.close')}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Transaction Detail Modal */}
      <Modal isOpen={!!detailTx} onClose={() => setDetailTx(null)} title={t('dashboard.transactionDetails')} size="lg">
        {detailTx && (() => {
          const caisse = caisses.find((c: Caisse) => c.id === detailTx.caisseId)
          const bankAcc = bankAccounts.find((b: BankAccount) => b.id === detailTx.bankAccountId)
          const donor = donors.find((d: Donor) => d.id === detailTx.donorId)
          const benef = beneficiaries.find((b: Beneficiary) => b.id === detailTx.beneficiaryId)
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted rounded-lg p-4">
                <div><p className="text-xs text-muted-foreground">{t('dashboard.type')}</p><p className="font-medium">{detailTx.type === 'credit' ? t('dashboard.deposit') : t('dashboard.withdrawal')}</p></div>
                <div><p className="text-xs text-muted-foreground">{t('common.amount')}</p><p className={`font-bold text-lg ${detailTx.type === 'credit' ? 'text-success' : 'text-destructive'}`}>{formatCurrency(detailTx.amount)}</p></div>
                {(() => {
                  const rem = (detailTx as any).remainingAmount;
                  // Show remaining amount only for credit with allocation (non-null)
                  if (rem !== null && rem !== undefined && typeof rem === 'number' && detailTx.type === 'credit') {
                    const consumed = detailTx.amount - rem;
                    return (
                      <>
                        <div><p className="text-xs text-muted-foreground">{t('finance.disbursed', 'المبلغ المصرف')}</p><p className="font-medium text-warning">{formatCurrency(consumed)}</p></div>
                        <div><p className="text-xs text-muted-foreground">{t('finance.remainingAmount')}</p><p className="font-medium">{rem > 0 ? <Badge variant="warning">{formatCurrency(rem)}</Badge> : <Badge variant="success">{t('dashboard.fullyDisbursed')}</Badge>}</p></div>
                      </>
                    );
                  }
                  // For debit with allocation
                  if (rem !== null && rem !== undefined && typeof rem === 'number' && detailTx.type === 'debit') {
                    return (
                      <div><p className="text-xs text-muted-foreground">{t('finance.remainingDisbursement')}</p><p className="font-medium">{rem > 0 ? <Badge variant="warning">{formatCurrency(rem)}</Badge> : <Badge variant="success">{t('dashboard.fullyDisbursed')}</Badge>}</p></div>
                    );
                  }
                  return null;
                })()}
                <div><p className="text-xs text-muted-foreground">{t('common.status')}</p><p className="font-medium">{(() => {
                  const s = detailTx.status || 'completed';
                  if (s === 'pending') return <Badge variant="warning">{t('dashboard.pending')}</Badge>;
                  if (s === 'cancelled') return <Badge variant="danger">{t('dashboard.cancelled')}</Badge>;
                  const rem = (detailTx as any).remainingAmount;
                  if (rem !== null && typeof rem === 'number') {
                    if (detailTx.type === 'credit' && rem > 0 && rem < detailTx.amount) {
                      return <Badge variant="info">{t('dashboard.partiallyDisbursed')}</Badge>;
                    }
                    if (detailTx.type === 'debit' && rem > 0) {
                      return <Badge variant="warning">{t('dashboard.partiallyDisbursed')}</Badge>;
                    }
                  }
                  return <Badge variant="success">{t('dashboard.completed')}</Badge>;
                })()}</p></div>
                <div><p className="text-xs text-muted-foreground">{t('dashboard.fund')}</p><p className="font-medium text-foreground">{caisse?.name || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">{t('dashboard.source')}</p><p className="font-medium">{detailTx.fundSource === 'banque' ? t('dashboard.bank') : t('finance.cashFund')}</p></div>
                {detailTx.fundSource === 'banque' && bankAcc && <div><p className="text-xs text-muted-foreground">{t('finance.bankAccounts')}</p><p className="font-medium">{bankAcc.bankName}</p></div>}
                {donor && <div><p className="text-xs text-muted-foreground">{t('dashboard.donor')}</p><p className="font-medium">{donor.lastName} {donor.firstName}</p></div>}
                {benef && <div><p className="text-xs text-muted-foreground">{t('dashboard.beneficiary')}</p><p className="font-medium">{benef.lastName} {benef.firstName}</p></div>}
                {(detailTx.description || detailTx.description) && <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">{t('common.description')}</p><p className="font-medium text-foreground">{localizedDesc(detailTx.description, detailTx.description)}</p></div>}
                <div><p className="text-xs text-muted-foreground">{t('dashboard.receiptNo')}</p><p className="font-mono text-foreground" dir="ltr">{detailTx.receiptNumber || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">{t('common.date')}</p><p className="font-medium text-foreground">{formatDate(detailTx.date)}</p></div>
              </div>
              <div className="flex justify-end gap-2 flex-wrap">
                {detailTx.type === 'credit' && (detailTx.status === 'completed' || !detailTx.status) && (
                  <Button size="sm" variant="success" onClick={() => { handlePrintReceipt(detailTx); setDetailTx(null); }}>
                    <Printer size={14} /> {t('donors.printReceipt')}
                  </Button>
                )}
                {(detailTx.status || 'completed') === 'pending' && (
                  <>
                    <Button size="sm" variant="primary" onClick={() => {
                      const defaultAmt = (detailTx as any).remainingAmount !== null && (detailTx as any).remainingAmount !== undefined
                        ? String((detailTx as any).remainingAmount)
                        : String(detailTx.amount);
                      setConfirmingTxId(detailTx.id);
                      setConfirmTxAmount(defaultAmt);
                    }}>
                      {t('finance.confirmTx')}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleCancelTransaction(detailTx.id)}>
                      {t('finance.cancelTx')}
                    </Button>
                  </>
                )}
                {(() => {
                  const status = detailTx.status || 'completed';
                  const rem = (detailTx as any).remainingAmount;
                  const allocId = (detailTx as any).allocationId;
                  if (status === 'completed' && rem !== null && typeof rem === 'number' && rem > 0 && allocId) {
                    if (detailTx.type === 'credit') {
                      // Credit: disburse remaining to beneficiary
                      return (
                        <Button size="sm" variant="primary" onClick={() => {
                          setConfirmingTxId(detailTx.id);
                          setConfirmTxAmount(String(rem));
                        }}>
                          {t('finance.disburseRemaining')} ({formatCurrency(rem)})
                        </Button>
                      );
                    }
                    // Debit: the disbursement is already the action of this debit transaction.
                    // The user should go back to the original credit to continue disbursing.
                  }
                  return null;
                })()}
                <Button size="sm" variant="secondary" onClick={() => setDetailTx(null)}>{t('common.close')}</Button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Confirm Transaction Modal */}
      <Modal isOpen={!!confirmingTxId} onClose={() => { setConfirmingTxId(null); setConfirmTxAmount(''); }} title={t('finance.confirmTx')} size="sm">
        {confirmingTxId && detailTx && (
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t('dashboard.receiptNo')}</span><span className="font-mono" dir="ltr">{detailTx.receiptNumber || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('dashboard.type')}</span><span>{detailTx.type === 'credit' ? t('dashboard.deposit') : t('dashboard.withdrawal')}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('finance.originalAmount', 'المبلغ الأصلي')}</span><span className="font-bold">{formatCurrency(detailTx.amount)}</span></div>
              {(() => {
                const rem = (detailTx as any).remainingAmount;
                if (rem !== null && typeof rem === 'number' && rem > 0 && detailTx.type === 'credit') {
                  return (
                    <div className="flex justify-between"><span className="text-muted-foreground">{t('finance.remainingAmount')}</span><span className="font-bold text-warning">{formatCurrency(rem)}</span></div>
                  );
                }
                return null;
              })()}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('finance.enterConfirmAmount')}</label>
              <input
                type="number"
                value={confirmTxAmount}
                onChange={(e) => { setConfirmTxAmount(e.target.value); }}
                max={(() => {
                  const rem = (detailTx as any).remainingAmount;
                  if (rem !== null && typeof rem === 'number' && rem > 0) return rem;
                  return detailTx.amount;
                })()}
                min={0}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="ltr"
              />
              {Number(confirmTxAmount) > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{numberToWords(Number(confirmTxAmount))}</p>
              )}
              {(() => {
                const maxVal = (() => {
                  const rem = (detailTx as any).remainingAmount;
                  if (rem !== null && typeof rem === 'number' && rem > 0) return rem;
                  return detailTx.amount;
                })();
                if (Number(confirmTxAmount) > maxVal) {
                  return <p className="text-xs text-destructive mt-1">{t('finance.amountExceedsLimit', 'المبلغ يتجاوز الحد المسموح به')} ({formatCurrency(maxVal)})</p>;
                }
                return null;
              })()}
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="secondary" onClick={() => { setConfirmingTxId(null); setConfirmTxAmount(''); }}>{t('common.cancel')}</Button>
              <Button size="sm" variant="primary" onClick={() => handleConfirmTransaction(confirmingTxId!)} disabled={!confirmTxAmount || Number(confirmTxAmount) <= 0 || (() => {
                const maxVal = (() => {
                  const rem = (detailTx as any).remainingAmount;
                  if (rem !== null && typeof rem === 'number' && rem > 0) return rem;
                  return detailTx.amount;
                })();
                return Number(confirmTxAmount) > maxVal;
              })()}>{t('common.confirm')}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Disburse Allocation Modal */}
      <Modal isOpen={!!disbursingAllocId} onClose={() => { setDisbursingAllocId(null); setDisburseAmount(''); }} title={t('finance.disburseRemaining')} size="sm">
        {disbursingAllocId && (
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t('finance.remainingDisbursement')}</span><span className="font-bold text-warning">{formatCurrency(Number(disburseAmount))}</span></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('finance.enterDisburseAmount')}</label>
              <input
                type="number"
                value={disburseAmount}
                onChange={(e) => { setDisburseAmount(e.target.value); }}
                max={disburseAmount}
                min={0}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="ltr"
              />
              {Number(disburseAmount) > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{numberToWords(Number(disburseAmount))}</p>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="secondary" onClick={() => { setDisbursingAllocId(null); setDisburseAmount(''); }}>{t('common.cancel')}</Button>
              <Button size="sm" variant="primary" onClick={handleDisburseAllocation} disabled={!disburseAmount || Number(disburseAmount) <= 0}>{t('common.confirm')}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
