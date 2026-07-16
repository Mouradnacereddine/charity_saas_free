import { useState } from 'react'
import { Card, Button, Input, SearchableSelect, Modal, Badge, TextArea, EmptyState, LoadingSpinner } from '../components/common/UI'
import { formatCurrency, formatDate, numberToArabicWords, numberToFrenchWords } from '../utils/helpers'
import { printReceipt } from '../lib/receipt'
import { Plus, Search, Filter, Eye, Edit, Trash2, Printer, HeartHandshake, Receipt } from 'lucide-react'
import type { Donor, DonationReceipt } from '../types'
import { useDonors, useCreateDonor, useUpdateDonor, useDeleteDonor, useDonorReceipts } from '../hooks/useDonors'
import { useQuery } from '@tanstack/react-query'
import { caissesApi, financeApi } from '../lib/api'

// ---- Initial form state ----
const emptyDonorForm = {
  firstNameAr: '',
  lastNameAr: '',
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
}

type DonorFormData = typeof emptyDonorForm

export default function DonorsPage() {
  // ---- Query params for filtering ----
  const [queryParams, setQueryParams] = useState<Record<string, string> | undefined>(undefined)
  const { data: donors = [], isLoading } = useDonors(queryParams)
  const { data: caisses = [] } = useQuery({
    queryKey: ['caisses'],
    queryFn: () => caissesApi.list().then(r => r.data),
  })

  const createDonor = useCreateDonor()
  const updateDonor = useUpdateDonor()
  const deleteDonor = useDeleteDonor()

  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null)
  const [selectedReceipt, setSelectedReceipt] = useState<DonationReceipt | null>(null)
  const [donorToDelete, setDonorToDelete] = useState<Donor | null>(null)
  const [gender, setGender] = useState('male')
  const [formData, setFormData] = useState<DonorFormData>(emptyDonorForm)
  const [isEditing, setIsEditing] = useState(false)
  const [detailDonorId, setDetailDonorId] = useState<string | null>(null)

  // Load receipts when a donor is selected for detail view
  const { data: receipts = [] } = useDonorReceipts(detailDonorId || '')
  const { data: allocations = [] } = useQuery({
    queryKey: ['donor-allocations', detailDonorId],
    queryFn: async () => {
      const res = await financeApi.allocations({ donorId: detailDonorId! });
      return res.data;
    },
    enabled: !!detailDonorId,
  })

  // ---- Filter state ----
  const [showFilters, setShowFilters] = useState(false)
  const [filterSearchTerm, setFilterSearchTerm] = useState('')
  const [filterCaisseId, setFilterCaisseId] = useState('')
  const [filterMinDonation, setFilterMinDonation] = useState('')
  const [filterMaxDonation, setFilterMaxDonation] = useState('')
  const [filterGender, setFilterGender] = useState('')

  // ---- Handlers ----

  function handleApplyFilters() {
    const params: Record<string, string> = {}
    if (filterSearchTerm) params.searchTerm = filterSearchTerm
    if (filterCaisseId) params.caisseId = filterCaisseId
    if (filterMinDonation !== '') params.minDonation = filterMinDonation
    if (filterMaxDonation !== '') params.maxDonation = filterMaxDonation
    if (filterGender) params.gender = filterGender
    setQueryParams(Object.keys(params).length > 0 ? params : undefined)
  }

  function handleResetFilters() {
    setFilterSearchTerm('')
    setFilterCaisseId('')
    setFilterMinDonation('')
    setFilterMaxDonation('')
    setFilterGender('')
    setQueryParams(undefined)
  }

  function openAddModal() {
    setFormData(emptyDonorForm)
    setIsEditing(false)
    setShowAddModal(true)
  }

  function openEditModal(donor: Donor) {
    setFormData({
      firstNameAr: donor.firstNameAr,
      lastNameAr: donor.lastNameAr,
      firstName: donor.firstName,
      lastName: donor.lastName,
      phone: donor.phone,
      email: donor.email ?? '',
      address: donor.address ?? '',
      notes: donor.notes ?? '',
    })
    setSelectedDonor(donor)
    setIsEditing(true)
    setShowAddModal(true)
  }

  async function openDetailModal(donor: Donor) {
    setSelectedDonor(donor)
    setDetailDonorId(donor.id)
    setShowDetailModal(true)
  }

  function openDeleteConfirm(donor: Donor) {
    setDonorToDelete(donor)
    setShowDeleteConfirm(true)
  }

  async function handleDelete() {
    if (!donorToDelete) return
    await deleteDonor.mutateAsync(donorToDelete.id)
    setShowDeleteConfirm(false)
    setDonorToDelete(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isEditing && selectedDonor) {
      await updateDonor.mutateAsync({
        id: selectedDonor.id,
        data: {
          firstNameAr: formData.firstNameAr,
          lastNameAr: formData.lastNameAr,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          email: formData.email || undefined,
          address: formData.address || undefined,
          gender: gender || 'male',
        notes: formData.notes || undefined,
        },
      })
    } else {
      await createDonor.mutateAsync({
        firstNameAr: formData.firstNameAr,
        lastNameAr: formData.lastNameAr,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        email: formData.email || undefined,
        address: formData.address || undefined,
        gender: gender || 'male',
        notes: formData.notes || undefined,
      })
    }
    setShowAddModal(false)
    setSelectedDonor(null)
  }

  function openReceiptView(receipt: DonationReceipt) {
    setSelectedReceipt(receipt)
    setShowReceiptModal(true)
  }

  function handlePrintReceipt() {
    if (!selectedReceipt) return
    const amount = selectedReceipt.amount || 0
    const wordsAr = selectedReceipt.amountInWordsAr && !selectedReceipt.amountInWordsAr.match(/^\d/) ? selectedReceipt.amountInWordsAr : numberToArabicWords(amount)
    const wordsFr = selectedReceipt.amountInWords && !selectedReceipt.amountInWords.match(/^\d/) ? selectedReceipt.amountInWords : numberToFrenchWords(amount)
    printReceipt(
      'وصل تبرع', 'Reçu de Don',
      `<div class="col"><div class="row"><span class="lbl">رقم الوصل</span><span class="val">${selectedReceipt.receiptNumber}</span></div>
<div class="row"><span class="lbl">التاريخ</span><span class="val">${formatDate(selectedReceipt.date)}</span></div>
<div class="row"><span class="lbl">المتبرع</span><span class="val">${selectedReceipt.donorNameAr} <i>${selectedReceipt.donorName}</i></span></div></div>
<div class="col"><div class="row"><span class="lbl">الصندوق</span><span class="val">${selectedReceipt.caisseNameAr}</span></div></div>`,
      'color:#16a34a',
      formatCurrency(amount), wordsAr, wordsFr,
      'توقيع المتبرع', 'ختم الجمعية')
  }

  function updateField(field: keyof DonorFormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // ---- Computed values ----
  const donorCount = donors.length

  // ---- Caisse options for filter ----
  const caisseOptions = caisses.map((c: any) => ({ value: c.id, label: c.nameAr }))

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="space-y-6">
      {/* ---- Page header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600">
            <HeartHandshake size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">المتبرعون</h1>
            <p className="text-sm text-gray-500">
              {donorCount} متبرع مسجل
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4" /> بحث متقدم
          </Button>
          <Button onClick={openAddModal}>
            <Plus size={18} />
            إضافة متبرع
          </Button>
        </div>
      </div>

      {/* ---- Quick Search ---- */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="بحث بالاسم أو الهاتف..."
          className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          value={filterSearchTerm}
          onChange={(e) => setFilterSearchTerm(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleApplyFilters(); }}
        />
      </div>

      {/* ---- Advanced Filters (collapsible) ---- */}
      {showFilters && (
        <Card titleAr="بحث متقدم">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <SearchableSelect
              labelAr="الصندوق"
              options={caisseOptions}
              value={filterCaisseId}
              onChange={(val) => setFilterCaisseId(val)}
            />
            <Input
              labelAr="الحد الأدنى للتبرعات"
              type="number"
              min="0"
              placeholder="0"
              value={filterMinDonation}
              onChange={(e) => setFilterMinDonation(e.target.value)}
            />
            <Input
              labelAr="الحد الأقصى للتبرعات"
              type="number"
              min="0"
              placeholder="0"
              value={filterMaxDonation}
              onChange={(e) => setFilterMaxDonation(e.target.value)}
            />
            <SearchableSelect
              labelAr="الجنس"
              options={[{ value: '', label: 'الكل' }, { value: 'male', label: 'ذكر' }, { value: 'female', label: 'أنثى' }]}
              value={filterGender}
              onChange={(val) => setFilterGender(val)}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={handleApplyFilters}>
              <Search className="w-4 h-4" /> بحث
            </Button>
            <Button variant="secondary" size="sm" onClick={handleResetFilters}>
              إعادة تعيين
            </Button>
          </div>
        </Card>
      )}

      {/* ---- Donors Table ---- */}
      <Card>
        {isLoading ? (
          <LoadingSpinner />
        ) : donors.length === 0 ? (
          <EmptyState
            message="لا يوجد متبرعون حاليا"
            icon={<HeartHandshake size={48} />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">الرمز المرجعي</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">الاسم</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">الهاتف</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">إجمالي التبرعات</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600 hidden sm:table-cell">عدد التبرعات</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {donors.map((donor: Donor) => (
                  <tr key={donor.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => openDetailModal(donor)}>
                    <td className="py-3 px-4 font-semibold text-primary-700" dir="ltr">
                      {donor.reference || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {donor.lastNameAr} {donor.firstNameAr}
                        </p>
                        <p className="text-xs text-gray-400">
                          {donor.lastName} {donor.firstName}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-700" dir="ltr">
                      {donor.phone}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={donor.totalDonated > 0 ? 'success' : 'default'}>
                        {formatCurrency(donor.totalDonated)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-gray-700 hidden sm:table-cell">
                      <Badge variant="info">{(donor as any).receiptCount ?? 0}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openDetailModal(donor)} title="عرض التفاصيل">
                          <Eye size={16} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(donor)} title="تعديل">
                          <Edit size={16} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openDeleteConfirm(donor)} title="حذف">
                          <Trash2 size={16} className="text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ============================================ */}
      {/* ADD / EDIT DONOR MODAL                       */}
      {/* ============================================ */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={isEditing ? 'تعديل بيانات المتبرع' : 'إضافة متبرع جديد'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Arabic names */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              labelAr="اللقب بالعربية"
              placeholder="اللقب"
              value={formData.lastNameAr}
              onChange={(e) => updateField('lastNameAr', e.target.value)}
              required
            />
            <Input
              labelAr="الاسم بالعربية"
              placeholder="الاسم"
              value={formData.firstNameAr}
              onChange={(e) => updateField('firstNameAr', e.target.value)}
              required
            />
          </div>

          {/* Latin names */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              labelAr="اللقب باللاتينية"
              placeholder="Nom"
              value={formData.lastName}
              onChange={(e) => updateField('lastName', e.target.value)}
              dir="ltr"
              required
            />
            <Input
              labelAr="الاسم باللاتينية"
              placeholder="Prenom"
              value={formData.firstName}
              onChange={(e) => updateField('firstName', e.target.value)}
              dir="ltr"
              required
            />
          </div>

          {/* Phone & email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              labelAr="رقم الهاتف"
              placeholder="0XXX XX XX XX"
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              dir="ltr"
              required
            />
            <Input
              labelAr="البريد الإلكتروني (اختياري)"
              placeholder="email@example.com"
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              dir="ltr"
            />
          </div>

          {/* Gender */}
          <SearchableSelect
            labelAr="الجنس"
            options={[{ value: 'male', label: 'ذكر' }, { value: 'female', label: 'أنثى' }]}
            value={gender}
            onChange={(val) => setGender(val)}
          />

          {/* Address */}
          <Input
            labelAr="العنوان (اختياري)"
            placeholder="العنوان"
            value={formData.address}
            onChange={(e) => updateField('address', e.target.value)}
          />

          {/* Notes */}
          <TextArea
            labelAr="ملاحظات"
            placeholder="ملاحظات إضافية..."
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
          />

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setShowAddModal(false)}>
              إلغاء
            </Button>
            <Button type="submit">
              {isEditing ? 'حفظ التعديلات' : 'إضافة المتبرع'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================ */}
      {/* DONOR DETAIL MODAL                           */}
      {/* ============================================ */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedDonor(null); setDetailDonorId(null) }}
        title="تفاصيل المتبرع"
        size="xl"
      >
        {selectedDonor && (
          <div className="space-y-6">
            {/* Donor info grid */}
            <div className="space-y-3 bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center"><span className="text-xs text-gray-500">الرمز المرجعي</span><span className="font-semibold text-primary-700" dir="ltr">{selectedDonor.reference || '—'}</span></div>
              <div className="flex justify-between items-center"><span className="text-xs text-gray-500">الاسم الكامل بالعربية</span><span className="font-semibold text-gray-900">{selectedDonor.lastNameAr} {selectedDonor.firstNameAr}</span></div>
              <div className="flex justify-between items-center"><span className="text-xs text-gray-500">الاسم الكامل باللاتينية</span><span className="font-semibold text-gray-900" dir="ltr">{selectedDonor.lastName} {selectedDonor.firstName}</span></div>
              <div className="flex justify-between items-center"><span className="text-xs text-gray-500">الهاتف</span><span className="font-semibold text-gray-900" dir="ltr">{selectedDonor.phone}</span></div>
              <div className="flex justify-between items-center"><span className="text-xs text-gray-500">البريد الإلكتروني</span><span className="font-semibold text-gray-900" dir="ltr">{selectedDonor.email || '---'}</span></div>
              <div className="flex justify-between items-center"><span className="text-xs text-gray-500">العنوان</span><span className="font-semibold text-gray-900">{selectedDonor.address || '---'}</span></div>
              <div className="flex justify-between items-center"><span className="text-xs text-gray-500">الجنس</span><span className="font-semibold text-gray-900">{selectedDonor.gender === 'female' ? 'أنثى' : 'ذكر'}</span></div>
              <div className="flex justify-between items-center"><span className="text-xs text-gray-500">إجمالي التبرعات</span><span className="font-bold text-lg text-green-600">{formatCurrency(selectedDonor.totalDonated)}</span></div>
            </div>
            {selectedDonor.notes && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500">ملاحظات</p>
                <p className="text-gray-700">{selectedDonor.notes}</p>
              </div>
            )}

            {/* Donation allocations */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <HeartHandshake size={18} />
                توزيع التبرعات على المستفيدين
              </h4>
              {allocations.length === 0 ? (
                <EmptyState message="لا توجد توزيعات لهذا المتبرع" icon={<HeartHandshake size={36} />} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-right py-2 px-3 font-semibold text-gray-600">رقم الوصل</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-600">المستفيد</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-600">المبلغ</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-600">المتبقي</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-600">الحالة</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-600">التاريخ</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-600">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocations.map((a: DonationAllocation) => (
                        <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3 text-gray-500 font-mono text-xs" dir="ltr">{a.creditTransaction?.receiptNumber || '—'}</td>
                        <td className="py-2 px-3 font-medium text-gray-900">{a.beneficiary.lastNameAr} {a.beneficiary.firstNameAr}</td>
                          <td className="py-2 px-3"><Badge variant="success">{formatCurrency(a.amount)}</Badge></td>
                          <td className="py-2 px-3">{a.remainingAmount > 0 ? formatCurrency(a.remainingAmount) : <Badge variant="success">0</Badge>}</td>
                          <td className="py-2 px-3">
                            {(() => {
                              const s = a.creditTransaction?.status;
                              if (s === 'pending') return <Badge variant="warning">مرتبط بوعد</Badge>;
                              if (s === 'cancelled') return <Badge variant="danger">ملغي</Badge>;
                              if (a.remainingAmount <= 0) return <Badge variant="success">مصرف بالكامل</Badge>;
                              if (a.debitTransactionId) return <Badge variant="info">مصرف جزئياً</Badge>;
                              return <Badge variant="info">نشط</Badge>;
                            })()}
                          </td>
                          <td className="py-2 px-3 text-gray-700">{formatDate(a.createdAt)}</td>
                          <td className="py-2 px-3 text-gray-500 text-xs">{a.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Donation receipts (bons) */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Receipt size={18} />
                وصولات التبرع
              </h4>
              {receipts.length === 0 ? (
                <EmptyState
                  message="لا توجد وصولات لهذا المتبرع"
                  icon={<Receipt size={36} />}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-right py-2 px-3 font-semibold text-gray-600">رقم الوصل</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-600">المبلغ</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-600">الصندوق</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-600">الفئة الفرعية</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-600">التاريخ</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-600">طباعة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receipts.map((r: DonationReceipt) => (
                        <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3 font-mono text-xs">{r.receiptNumber}</td>
                          <td className="py-2 px-3">
                            <Badge variant="success">{formatCurrency(r.amount)}</Badge>
                          </td>
                          <td className="py-2 px-3 text-gray-700">{r.caisseNameAr || '—'}</td>
                          <td className="py-2 px-3 text-gray-700">{r.subCategoryNameAr || r.subCategoryName || '—'}</td>
                          <td className="py-2 px-3 text-gray-700">{formatDate(r.date)}</td>
                          <td className="py-2 px-3 text-center">
                            <Button variant="ghost" size="sm" onClick={() => openReceiptView(r)}>
                              <Printer size={14} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ============================================ */}
      {/* RECEIPT (BON) PRINT MODAL                    */}
      {/* ============================================ */}
      <Modal
        isOpen={showReceiptModal}
        onClose={() => { setShowReceiptModal(false); setSelectedReceipt(null) }}
        title="وصل التبرع"
        size="lg"
      >
        {selectedReceipt && (
          <div>
            {/* Print button */}
            <div className="flex justify-end mb-4 print:hidden">
              <Button onClick={handlePrintReceipt}>
                <Printer size={16} />
                طباعة الوصل
              </Button>
            </div>

            {/* Receipt content — compact print-friendly */}
            <div
              id="receipt-print-area"
              className="border border-gray-300 rounded-lg p-5 bg-white print:border-0 print:shadow-none"
            >
              {/* Header compact */}
              <div className="flex items-center justify-between border-b-2 border-primary-600 pb-2 mb-3">
                <h2 className="text-sm font-bold text-primary-700">🕌 الجمعية الخيرية</h2>
                <span className="text-[9px] text-gray-500">وصل تبرع</span>
              </div>

              {/* Info row */}
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-[10px] mb-3">
                <div><span className="text-gray-400">رقم الوصل:</span> <strong className="text-xs font-mono">{selectedReceipt.receiptNumber}</strong></div>
                <div><span className="text-gray-400">التاريخ:</span> <strong>{formatDate(selectedReceipt.date)}</strong></div>
                <div><span className="text-gray-400">المتبرع:</span> <strong>{selectedReceipt.donorNameAr}</strong> <span dir="ltr" className="text-[9px] text-gray-400">({selectedReceipt.donorName})</span></div>
                <div><span className="text-gray-400">الصندوق:</span> <strong>{selectedReceipt.caisseNameAr}</strong></div>
              </div>

              {/* Amount compact */}
              <div className="bg-blue-50 border border-blue-100 rounded px-3 py-2 text-center mb-3">
                <div className="text-xl font-bold text-green-600">{formatCurrency(selectedReceipt.amount)}</div>
                <div className="text-[9px] text-gray-600 leading-relaxed mt-0.5">
                  {(selectedReceipt.amountInWordsAr && !selectedReceipt.amountInWordsAr.match(/^\d/)) ? selectedReceipt.amountInWordsAr : numberToArabicWords(selectedReceipt.amount || 0)}<br />
                  <span dir="ltr" className="italic">{(selectedReceipt.amountInWords && !selectedReceipt.amountInWords.match(/^\d/)) ? selectedReceipt.amountInWords : numberToFrenchWords(selectedReceipt.amount || 0)}</span>
                </div>
              </div>

              {/* Signature compact */}
              <div className="flex justify-between pt-2 border-t border-dashed border-gray-300 text-[9px] text-gray-500">
                <div className="text-center">
                  <div className="border-t border-gray-500 w-24 mx-auto mt-8 mb-0.5"></div>
                  توقيع المتبرع
                </div>
                <div className="text-center">
                  <div className="border-t border-gray-500 w-24 mx-auto mt-8 mb-0.5"></div>
                  ختم الجمعية وتوقيع المسؤول
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ============================================ */}
      {/* DELETE CONFIRMATION MODAL                    */}
      {/* ============================================ */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setDonorToDelete(null) }}
        title="تأكيد الحذف"
        size="sm"
      >
        {donorToDelete && (
          <div className="space-y-4">
            <p className="text-gray-700">
              هل أنت متأكد من حذف المتبرع{' '}
              <span className="font-bold">{donorToDelete.lastNameAr} {donorToDelete.firstNameAr}</span>؟
            </p>
            <p className="text-sm text-red-500">
              هذا الإجراء لا يمكن التراجع عنه.
            </p>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="secondary" onClick={() => { setShowDeleteConfirm(false); setDonorToDelete(null) }}>
                إلغاء
              </Button>
              <Button variant="danger" onClick={handleDelete}>
                <Trash2 size={16} />
                حذف
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Print styles removed — uses shared receipt module (src/lib/receipt.ts) */}
    </div>
  )
}
