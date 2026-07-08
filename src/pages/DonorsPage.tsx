import { useEffect, useState } from 'react'
import { Card, Button, Input, Select, Modal, Badge, TextArea, EmptyState, LoadingSpinner } from '../components/common/UI'
import { useDonorStore } from '../stores/donorStore'
import { useCaisseStore } from '../stores/caisseStore'
import { formatCurrency, formatDate } from '../utils/helpers'
import { Plus, Search, Eye, Edit, Trash2, Printer, HeartHandshake, Receipt } from 'lucide-react'
import type { DonorFilter, Donor, DonationReceipt } from '../types'

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
  // ---- Stores ----
  const { donors, receipts, loading, loadDonors, addDonor, updateDonor, deleteDonor, loadReceipts } = useDonorStore()
  const { caisses, loadCaisses } = useCaisseStore()

  // ---- Local state ----
  const [filter, setFilter] = useState<DonorFilter>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null)
  const [selectedReceipt, setSelectedReceipt] = useState<DonationReceipt | null>(null)
  const [donorToDelete, setDonorToDelete] = useState<Donor | null>(null)
  const [formData, setFormData] = useState<DonorFormData>(emptyDonorForm)
  const [isEditing, setIsEditing] = useState(false)

  // ---- Initial load ----
  useEffect(() => {
    loadDonors()
    loadCaisses()
  }, [])

  // ---- Reload when filter changes ----
  useEffect(() => {
    loadDonors(filter)
  }, [filter])

  // ---- Handlers ----

  function handleSearch() {
    setFilter((prev) => ({ ...prev, searchTerm }))
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch()
  }

  function handleFilterChange(key: keyof DonorFilter, value: string) {
    setFilter((prev) => {
      const next = { ...prev }
      if (key === 'caisseId') {
        next.caisseId = value || undefined
      } else if (key === 'minDonation') {
        next.minDonation = value ? Number(value) : undefined
      } else if (key === 'maxDonation') {
        next.maxDonation = value ? Number(value) : undefined
      }
      return next
    })
  }

  function handleResetFilters() {
    setSearchTerm('')
    setFilter({})
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
    await loadReceipts(donor.id)
    setShowDetailModal(true)
  }

  function openDeleteConfirm(donor: Donor) {
    setDonorToDelete(donor)
    setShowDeleteConfirm(true)
  }

  async function handleDelete() {
    if (!donorToDelete) return
    await deleteDonor(donorToDelete.id)
    setShowDeleteConfirm(false)
    setDonorToDelete(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isEditing && selectedDonor) {
      await updateDonor(selectedDonor.id, {
        firstNameAr: formData.firstNameAr,
        lastNameAr: formData.lastNameAr,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        email: formData.email || undefined,
        address: formData.address || undefined,
        notes: formData.notes || undefined,
      })
    } else {
      await addDonor({
        firstNameAr: formData.firstNameAr,
        lastNameAr: formData.lastNameAr,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        email: formData.email || undefined,
        address: formData.address || undefined,
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
    window.print()
  }

  function updateField(field: keyof DonorFormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // ---- Computed values ----
  const donorCount = donors.length

  // ---- Caisse options for filter ----
  const caisseOptions = caisses.map((c) => ({ value: c.id, label: c.nameAr }))

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
        <Button onClick={openAddModal}>
          <Plus size={18} />
          إضافة متبرع
        </Button>
      </div>

      {/* ---- Search & Filters ---- */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="flex gap-2 flex-col sm:flex-row">
            <Input
              labelAr="بحث بالاسم أو الهاتف"
              placeholder="ابحث..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            <Button variant="secondary" className="sm:mt-6 shrink-0" onClick={handleSearch}>
              <Search size={16} />
            </Button>
          </div>

          {/* Filter by caisse */}
          <Select
            labelAr="تصفية حسب الصندوق"
            options={caisseOptions}
            value={filter.caisseId ?? ''}
            onChange={(e) => handleFilterChange('caisseId', e.target.value)}
          />

          {/* Min donation */}
          <Input
            labelAr="الحد الأدنى للتبرعات"
            type="number"
            placeholder="0"
            value={filter.minDonation ?? ''}
            onChange={(e) => handleFilterChange('minDonation', e.target.value)}
          />

          {/* Max donation */}
          <Input
            labelAr="الحد الأقصى للتبرعات"
            type="number"
            placeholder="0"
            value={filter.maxDonation ?? ''}
            onChange={(e) => handleFilterChange('maxDonation', e.target.value)}
          />
        </div>

        {/* Reset filters */}
        {(filter.searchTerm || filter.caisseId || filter.minDonation !== undefined || filter.maxDonation !== undefined) && (
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" size="sm" onClick={handleResetFilters}>
              إعادة تعيين الفلاتر
            </Button>
          </div>
        )}
      </Card>

      {/* ---- Donors Table ---- */}
      <Card>
        {loading ? (
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
                {donors.map((donor) => (
                  <tr key={donor.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
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
                      {/* Number of donations is tracked via receipts; show totalDonated as proxy or badge */}
                      <Badge variant="info">--</Badge>
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
        onClose={() => { setShowDetailModal(false); setSelectedDonor(null) }}
        title="تفاصيل المتبرع"
        size="xl"
      >
        {selectedDonor && (
          <div className="space-y-6">
            {/* Donor info grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
              <div>
                <p className="text-xs text-gray-500">الرمز المرجعي</p>
                <p className="font-semibold text-primary-700" dir="ltr">
                  {selectedDonor.reference || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">الاسم الكامل بالعربية</p>
                <p className="font-semibold text-gray-900">
                  {selectedDonor.lastNameAr} {selectedDonor.firstNameAr}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">الاسم الكامل باللاتينية</p>
                <p className="font-semibold text-gray-900" dir="ltr">
                  {selectedDonor.lastName} {selectedDonor.firstName}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">الهاتف</p>
                <p className="font-semibold text-gray-900" dir="ltr">{selectedDonor.phone}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">البريد الإلكتروني</p>
                <p className="font-semibold text-gray-900" dir="ltr">
                  {selectedDonor.email || '---'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">العنوان</p>
                <p className="font-semibold text-gray-900">
                  {selectedDonor.address || '---'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">إجمالي التبرعات</p>
                <p className="font-bold text-lg text-green-600">
                  {formatCurrency(selectedDonor.totalDonated)}
                </p>
              </div>
              {selectedDonor.notes && (
                <div className="md:col-span-2">
                  <p className="text-xs text-gray-500">ملاحظات</p>
                  <p className="text-gray-700">{selectedDonor.notes}</p>
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
                        <th className="text-right py-2 px-3 font-semibold text-gray-600">التاريخ</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-600">طباعة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receipts.map((r) => (
                        <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3 font-mono text-xs">{r.receiptNumber}</td>
                          <td className="py-2 px-3">
                            <Badge variant="success">{formatCurrency(r.amount)}</Badge>
                          </td>
                          <td className="py-2 px-3 text-gray-700">{r.caisseNameAr}</td>
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

            {/* Receipt content — print-friendly */}
            <div
              id="receipt-print-area"
              className="border-2 border-gray-300 rounded-lg p-8 bg-white print:border-black print:shadow-none"
            >
              {/* Association header */}
              <div className="text-center border-b-2 border-gray-300 pb-4 mb-6 print:border-black">
                <h2 className="text-xl font-bold text-gray-900">الجمعية الخيرية</h2>
                <p className="text-sm text-gray-500 mt-1">Association Charitable</p>
                <p className="text-xs text-gray-400 mt-1">وصل تبرع / Recu de Don</p>
              </div>

              {/* Receipt number & date */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs text-gray-500">رقم الوصل</p>
                  <p className="font-bold font-mono text-lg">{selectedReceipt.receiptNumber}</p>
                </div>
                <div className="text-left">
                  <p className="text-xs text-gray-500">التاريخ</p>
                  <p className="font-bold">{formatDate(selectedReceipt.date)}</p>
                </div>
              </div>

              {/* Donor info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6 print:bg-transparent print:border print:border-gray-300">
                <h3 className="font-semibold text-gray-900 mb-2">المتبرع</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">الاسم: </span>
                    <span className="font-medium">{selectedReceipt.donorNameAr}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Nom: </span>
                    <span className="font-medium" dir="ltr">{selectedReceipt.donorName}</span>
                  </div>
                </div>
              </div>

              {/* Amount section */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-6 text-center print:border-black">
                <p className="text-sm text-gray-500 mb-2">المبلغ</p>
                <p className="text-3xl font-bold text-green-600 print:text-black">
                  {formatCurrency(selectedReceipt.amount)}
                </p>
                <div className="mt-3 bg-gray-50 rounded p-2 print:bg-transparent">
                  <p className="text-sm text-gray-700">
                    <span className="text-gray-500">بالحروف: </span>
                    {selectedReceipt.amountInWordsAr}
                  </p>
                  <p className="text-xs text-gray-500 mt-1" dir="ltr">
                    En lettres: {selectedReceipt.amountInWords}
                  </p>
                </div>
              </div>

              {/* Caisse / Fund */}
              <div className="mb-8 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">الصندوق:</span>
                  <span className="font-semibold">{selectedReceipt.caisseNameAr}</span>
                  <span className="text-gray-400">({selectedReceipt.caisseName})</span>
                </div>
              </div>

              {/* Signature line */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-gray-200 print:border-gray-400">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-12">توقيع المتبرع</p>
                  <div className="border-t border-gray-400 mx-8" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-12">ختم الجمعية وتوقيع المسؤول</p>
                  <div className="border-t border-gray-400 mx-8" />
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

      {/* ---- Print-only styles (injected) ---- */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-print-area,
          #receipt-print-area * {
            visibility: visible;
          }
          #receipt-print-area {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            width: 100%;
            padding: 2rem;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
