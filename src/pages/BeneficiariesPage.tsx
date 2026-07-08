import { useEffect, useState } from 'react'
import { Card, Button, Input, Select, SearchableSelect, Modal, Badge, TextArea, EmptyState, LoadingSpinner } from '../components/common/UI'
import { useBeneficiaryStore } from '../stores/beneficiaryStore'
import { useCaisseStore } from '../stores/caisseStore'
import { calculateAge, formatDate } from '../utils/helpers'
import { Plus, Search, Filter, Eye, Edit, Trash2, Users, Baby } from 'lucide-react'
import type { BeneficiaryFilter, Beneficiary, Child } from '../types'

// ---- Constants ----

const ATTRIBUT_LABELS: Record<string, string> = {
  veuve: 'أرملة',
  orphelin: 'يتيم',
  personne_agee: 'شخص مسن',
  handicape: 'معاق',
  famille_demunie: 'عائلة معوزة',
  autre: 'أخرى',
}

const ATTRIBUT_OPTIONS = Object.entries(ATTRIBUT_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const HEALTH_STATUS_LABELS: Record<string, string> = {
  bonne_sante: 'بصحة جيدة',
  malade: 'مريض',
  handicape: 'معاق',
  autre: 'أخرى',
}

const HEALTH_STATUS_OPTIONS = Object.entries(HEALTH_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const ATTRIBUT_BADGE_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  veuve: 'info',
  orphelin: 'warning',
  personne_agee: 'default',
  handicape: 'danger',
  famille_demunie: 'success',
  autre: 'default',
}

// ---- Empty form data helpers ----

function emptyChild(): Omit<Child, 'id'> & { id?: string } {
  return {
    firstNameAr: '',
    lastNameAr: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    healthStatus: 'bonne_sante',
    healthDetails: '',
  }
}

type BeneficiaryFormData = {
  firstNameAr: string
  lastNameAr: string
  firstName: string
  lastName: string
  addressAr: string
  address: string
  phone: string
  nationalCardNumber: string
  dateOfBirth: string
  attribut: string
  onBehalfOf: string
  situation: string
  situationAr: string
  caisseId: string
  subCategoryId: string
  children: (Omit<Child, 'id'> & { id?: string })[]
  notes: string
}

function emptyForm(): BeneficiaryFormData {
  return {
    firstNameAr: '',
    lastNameAr: '',
    firstName: '',
    lastName: '',
    addressAr: '',
    address: '',
    phone: '',
    nationalCardNumber: '',
    dateOfBirth: '',
    attribut: '',
    onBehalfOf: '',
    situation: '',
    situationAr: '',
    caisseId: '',
    subCategoryId: '',
    children: [],
    notes: '',
  }
}

function beneficiaryToForm(b: Beneficiary): BeneficiaryFormData {
  return {
    firstNameAr: b.firstNameAr,
    lastNameAr: b.lastNameAr,
    firstName: b.firstName,
    lastName: b.lastName,
    addressAr: b.addressAr,
    address: b.address,
    phone: b.phone,
    nationalCardNumber: b.nationalCardNumber,
    dateOfBirth: b.dateOfBirth,
    attribut: b.attribut,
    onBehalfOf: b.onBehalfOfName ?? '',
    situation: b.situation ?? '',
    situationAr: b.situationAr ?? '',
    caisseId: b.caisseId ?? '',
    subCategoryId: b.subCategoryId ?? '',
    children: b.children.map((c) => ({ ...c })),
    notes: b.notes ?? '',
  }
}

// ============================================
// Main component
// ============================================

export default function BeneficiariesPage() {
  const {
    beneficiaries,
    loading,
    loadBeneficiaries,
    addBeneficiary,
    updateBeneficiary,
    deleteBeneficiary,
    findWidowsWithMostChildren,
  } = useBeneficiaryStore()

  const { caisses, loadCaisses } = useCaisseStore()

  // ---- UI state ----
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<BeneficiaryFormData>(emptyForm())
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // ---- Filter state ----
  const [filter, setFilter] = useState<BeneficiaryFilter>({})
  const [filterSearchTerm, setFilterSearchTerm] = useState('')
  const [filterAttribut, setFilterAttribut] = useState('')
  const [filterCaisseId, setFilterCaisseId] = useState('')
  const [filterMinChildren, setFilterMinChildren] = useState('')
  const [filterMaxChildAge, setFilterMaxChildAge] = useState('')
  const [filterSituation, setFilterSituation] = useState('')

  // ---- Detail view related data ----
  const [detailTransactions, setDetailTransactions] = useState<any[]>([])
  const [detailLoans, setDetailLoans] = useState<any[]>([])
  const [detailReferrals, setDetailReferrals] = useState<any[]>([])

  // ---- Initial load ----
  useEffect(() => {
    loadBeneficiaries()
    loadCaisses()
  }, [loadBeneficiaries, loadCaisses])

  // ---- Caisse options ----
  const caisseOptions = caisses.map((c) => ({
    value: c.id,
    label: c.nameAr || c.name,
  }))

  // ---- Filter application ----
  const applyFilters = () => {
    const f: BeneficiaryFilter = {}
    if (filterSearchTerm) f.searchTerm = filterSearchTerm
    if (filterAttribut) f.attribut = filterAttribut as any
    if (filterCaisseId) f.caisseId = filterCaisseId
    if (filterMinChildren) f.minChildren = parseInt(filterMinChildren, 10)
    if (filterMaxChildAge) f.maxChildAge = parseInt(filterMaxChildAge, 10)
    if (filterSituation) f.situation = filterSituation
    setFilter(f)
    loadBeneficiaries(f)
  }

  const resetFilters = () => {
    setFilterSearchTerm('')
    setFilterAttribut('')
    setFilterCaisseId('')
    setFilterMinChildren('')
    setFilterMaxChildAge('')
    setFilterSituation('')
    setFilter({})
    loadBeneficiaries()
  }

  const handleFindWidowWithMostChildren = async () => {
    const maxAge = filterMaxChildAge ? parseInt(filterMaxChildAge, 10) : undefined
    const widows = await findWidowsWithMostChildren(maxAge)
    if (widows.length > 0) {
      openDetail(widows[0])
    }
  }

  // ---- Form handlers ----
  const openAddForm = () => {
    setEditingId(null)
    setForm(emptyForm())
    setShowFormModal(true)
  }

  const openEditForm = (b: Beneficiary) => {
    setEditingId(b.id)
    setForm(beneficiaryToForm(b))
    setShowFormModal(true)
  }

  const closeFormModal = () => {
    setShowFormModal(false)
    setEditingId(null)
    setForm(emptyForm())
  }

  const handleFormChange = (field: keyof BeneficiaryFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const addChild = () => {
    setForm((prev) => ({
      ...prev,
      children: [...prev.children, emptyChild()],
    }))
  }

  const removeChild = (index: number) => {
    setForm((prev) => ({
      ...prev,
      children: prev.children.filter((_, i) => i !== index),
    }))
  }

  const updateChild = (index: number, field: string, value: string) => {
    setForm((prev) => {
      const updated = [...prev.children]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, children: updated }
    })
  }

  const handleSubmit = async () => {
    const data = {
      firstNameAr: form.firstNameAr,
      lastNameAr: form.lastNameAr,
      firstName: form.firstName,
      lastName: form.lastName,
      addressAr: form.addressAr,
      address: form.address,
      phone: form.phone,
      nationalCardNumber: form.nationalCardNumber,
      dateOfBirth: form.dateOfBirth,
      attribut: form.attribut as Beneficiary['attribut'],
      onBehalfOfName: form.onBehalfOf || undefined,
      situation: form.situation || undefined,
      situationAr: form.situationAr || undefined,
      caisseId: form.caisseId || undefined,
      subCategoryId: form.subCategoryId || undefined,
      children: form.children.map((c) => ({
        id: c.id || crypto.randomUUID(),
        firstNameAr: c.firstNameAr,
        lastNameAr: c.lastNameAr,
        firstName: c.firstName ?? '',
        lastName: c.lastName ?? '',
        dateOfBirth: c.dateOfBirth,
        healthStatus: c.healthStatus as Child['healthStatus'],
        healthDetails: c.healthDetails || undefined,
      })),
      notes: form.notes || undefined,
    }

    if (editingId) {
      await updateBeneficiary(editingId, data)
    } else {
      await addBeneficiary(data as any)
    }

    closeFormModal()
  }

  // ---- Delete ----
  const handleDelete = async (id: string) => {
    await deleteBeneficiary(id)
    setDeleteConfirmId(null)
  }

  // ---- Detail view ----
  const openDetail = async (b: Beneficiary) => {
    setSelectedBeneficiary(b)
    setShowDetailModal(true)

    // Load related data
    try {
      const { db } = await import('../lib/db')
      const transactions = await db.transactions
        .where('beneficiaryId')
        .equals(b.id)
        .toArray()
      setDetailTransactions(transactions)

      const loans = await db.loans
        .where('beneficiaryId')
        .equals(b.id)
        .toArray()
      setDetailLoans(loans)

      const referrals = await db.medicalReferrals
        .where('beneficiaryId')
        .equals(b.id)
        .toArray()
      setDetailReferrals(referrals)
    } catch {
      setDetailTransactions([])
      setDetailLoans([])
      setDetailReferrals([])
    }
  }

  const closeDetail = () => {
    setShowDetailModal(false)
    setSelectedBeneficiary(null)
    setDetailTransactions([])
    setDetailLoans([])
    setDetailReferrals([])
  }

  // ---- Helpers ----
  const getCaisseName = (caisseId?: string) => {
    if (!caisseId) return '—'
    const c = caisses.find((c) => c.id === caisseId)
    return c?.nameAr || c?.name || '—'
  }

  const getSubCaisseName = (caisseId?: string, subCatId?: string) => {
    if (!caisseId || !subCatId) return '—'
    const c = caisses.find((c) => c.id === caisseId)
    const sc = c?.subCategories.find((s) => s.id === subCatId)
    return sc?.nameAr || sc?.name || '—'
  }

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-6" dir="rtl">
      {/* ---- Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">المستفيدون</h1>
          <p className="text-sm text-gray-500 mt-1">
            إدارة المستفيدين وبياناتهم — إجمالي: {beneficiaries.length}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4" />
            بحث متقدم
          </Button>
          <Button size="sm" onClick={openAddForm}>
            <Plus className="w-4 h-4" />
            إضافة مستفيد
          </Button>
        </div>
      </div>

      {/* ---- Quick Search ---- */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="البحث بالاسم، رقم البطاقة، أو الهاتف..."
          className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          value={filterSearchTerm}
          onChange={(e) => {
            setFilterSearchTerm(e.target.value)
            const f: BeneficiaryFilter = { ...filter, searchTerm: e.target.value || undefined }
            loadBeneficiaries(f)
          }}
        />
      </div>

      {/* ---- Advanced Filters (collapsible) ---- */}
      {showFilters && (
        <Card titleAr="بحث متقدم">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Select
              labelAr="الصفة"
              options={ATTRIBUT_OPTIONS}
              value={filterAttribut}
              onChange={(e) => setFilterAttribut(e.target.value)}
            />
            <Select
              labelAr="الصندوق"
              options={caisseOptions}
              value={filterCaisseId}
              onChange={(e) => setFilterCaisseId(e.target.value)}
            />
            <Input
              labelAr="الحالة (المرض أو غيره)"
              placeholder="مثال: مرض السكري"
              value={filterSituation}
              onChange={(e) => setFilterSituation(e.target.value)}
            />
            <Input
              labelAr="الحد الأدنى لعدد الأطفال"
              type="number"
              min="0"
              value={filterMinChildren}
              onChange={(e) => setFilterMinChildren(e.target.value)}
            />
            <Input
              labelAr="الحد الأقصى لعمر الطفل"
              type="number"
              min="0"
              value={filterMaxChildAge}
              onChange={(e) => setFilterMaxChildAge(e.target.value)}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={applyFilters}>
              <Search className="w-4 h-4" />
              بحث
            </Button>
            <Button variant="secondary" size="sm" onClick={resetFilters}>
              إعادة تعيين
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleFindWidowWithMostChildren}
              className="mr-auto"
            >
              <Users className="w-4 h-4" />
              البحث عن الأرملة ذات أكثر أطفال
            </Button>
          </div>
        </Card>
      )}

      {/* ---- Table ---- */}
      <Card>
        {loading ? (
          <LoadingSpinner />
        ) : beneficiaries.length === 0 ? (
          <EmptyState
            message="لا يوجد مستفيدون حالياً. أضف مستفيداً جديداً للبدء."
            icon={<Users className="w-12 h-12" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="py-3 px-4 text-right font-medium">الرمز المرجعي</th>
                  <th className="py-3 px-4 text-right font-medium">الاسم</th>
                  <th className="py-3 px-4 text-right font-medium hidden md:table-cell">رقم البطاقة الوطنية</th>
                  <th className="py-3 px-4 text-right font-medium hidden lg:table-cell">الهاتف</th>
                  <th className="py-3 px-4 text-right font-medium">الصفة</th>
                  <th className="py-3 px-4 text-right font-medium hidden sm:table-cell">العمر</th>
                  <th className="py-3 px-4 text-right font-medium">عدد الأطفال</th>
                  <th className="py-3 px-4 text-right font-medium hidden lg:table-cell">الصندوق</th>
                  <th className="py-3 px-4 text-center font-medium">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {beneficiaries.map((b) => {
                  const age = b.dateOfBirth ? calculateAge(b.dateOfBirth) : null
                  return (
                    <tr
                      key={b.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => openDetail(b)}
                    >
                      <td className="py-3 px-4 font-semibold text-primary-700" dir="ltr">
                        {b.reference || '—'}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {b.lastNameAr} {b.firstNameAr}
                      </td>
                      <td className="py-3 px-4 text-gray-600 hidden md:table-cell">{b.nationalCardNumber}</td>
                      <td className="py-3 px-4 text-gray-600 hidden lg:table-cell" dir="ltr">
                        {b.phone}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={ATTRIBUT_BADGE_VARIANT[b.attribut] ?? 'default'}>
                          {ATTRIBUT_LABELS[b.attribut] ?? b.attribut}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-600 hidden sm:table-cell">
                        {age ? age.displayAr : '—'}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <Baby className="w-3.5 h-3.5" />
                          {b.children.length}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 hidden lg:table-cell">
                        {getCaisseName(b.caisseId)}
                        {b.subCategoryId && (
                          <span className="text-gray-400 text-xs block mt-0.5">
                            ({getSubCaisseName(b.caisseId, b.subCategoryId)})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                            title="عرض التفاصيل"
                            onClick={(e) => {
                              e.stopPropagation()
                              openDetail(b)
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="تعديل"
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditForm(b)
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="حذف"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteConfirmId(b.id)
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ---- Delete Confirmation Modal ---- */}
      <Modal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="تأكيد الحذف"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-6">
          هل أنت متأكد من حذف هذا المستفيد؟ لا يمكن التراجع عن هذا الإجراء.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={() => setDeleteConfirmId(null)}>
            إلغاء
          </Button>
          <Button variant="danger" size="sm" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
            <Trash2 className="w-4 h-4" />
            حذف
          </Button>
        </div>
      </Modal>

      {/* ---- Add / Edit Form Modal ---- */}
      <Modal
        isOpen={showFormModal}
        onClose={closeFormModal}
        title={editingId ? 'تعديل مستفيد' : 'إضافة مستفيد جديد'}
        size="xl"
      >
        <div className="space-y-6" dir="rtl">
          {/* Arabic names */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">الاسم بالعربية</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                labelAr="الاسم الأول بالعربية"
                value={form.firstNameAr}
                onChange={(e) => handleFormChange('firstNameAr', e.target.value)}
                required
              />
              <Input
                labelAr="اللقب بالعربية"
                value={form.lastNameAr}
                onChange={(e) => handleFormChange('lastNameAr', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Latin names */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">الاسم باللاتينية</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                labelAr="الاسم الأول باللاتينية"
                value={form.firstName}
                onChange={(e) => handleFormChange('firstName', e.target.value)}
                dir="ltr"
              />
              <Input
                labelAr="اللقب باللاتينية"
                value={form.lastName}
                onChange={(e) => handleFormChange('lastName', e.target.value)}
                dir="ltr"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">العنوان</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                labelAr="العنوان بالعربية"
                value={form.addressAr}
                onChange={(e) => handleFormChange('addressAr', e.target.value)}
              />
              <Input
                labelAr="العنوان باللاتينية"
                value={form.address}
                onChange={(e) => handleFormChange('address', e.target.value)}
                dir="ltr"
              />
            </div>
          </div>

          {/* Identity & Contact */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">المعلومات الشخصية</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                labelAr="رقم البطاقة الوطنية"
                value={form.nationalCardNumber}
                onChange={(e) => handleFormChange('nationalCardNumber', e.target.value)}
                required
              />
              <Input
                labelAr="رقم الهاتف"
                value={form.phone}
                onChange={(e) => handleFormChange('phone', e.target.value)}
                dir="ltr"
              />
              <div className="space-y-1">
                <Input
                  labelAr="تاريخ الميلاد"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => handleFormChange('dateOfBirth', e.target.value)}
                  dir="ltr"
                />
                {form.dateOfBirth && (
                  <p className="text-xs text-primary-600 font-medium">
                    العمر: {calculateAge(form.dateOfBirth).displayAr}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Attribut & On behalf */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">التصنيف</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                labelAr="الصفة"
                options={ATTRIBUT_OPTIONS}
                value={form.attribut}
                onChange={(e) => handleFormChange('attribut', e.target.value)}
                required
              />
              <div className="space-y-1">
                <Input
                  labelAr="باسم من"
                  placeholder="مثال: باسم الأرملة فاطمة"
                  value={form.onBehalfOf}
                  onChange={(e) => handleFormChange('onBehalfOf', e.target.value)}
                />
                <p className="text-xs text-gray-400">
                  عندما يأتي طفل نيابة عن أرملة أو مستفيد آخر
                </p>
              </div>
              <SearchableSelect
                labelAr="الصندوق"
                options={caisseOptions}
                value={form.caisseId}
                onChange={(val) => {
                  handleFormChange('caisseId', val)
                  handleFormChange('subCategoryId', '')
                }}
              />
              {(() => {
                const activeCaisse = caisses.find((c) => c.id === form.caisseId)
                const activeSubCats = activeCaisse?.subCategories || []
                if (activeSubCats.length === 0) return null
                return (
                  <Select
                    labelAr="الفئة الفرعية"
                    options={activeSubCats.map((sc) => ({ value: sc.id, label: sc.nameAr }))}
                    value={form.subCategoryId}
                    onChange={(e) => handleFormChange('subCategoryId', e.target.value)}
                  />
                )
              })()}
            </div>
          </div>

          {/* Situation */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">الحالة</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                labelAr="الحالة بالعربية (مرض أو غيره)"
                placeholder="مثال: مرض السكري"
                value={form.situationAr}
                onChange={(e) => handleFormChange('situationAr', e.target.value)}
              />
              <Input
                labelAr="الحالة باللاتينية"
                placeholder="Ex: Diabète"
                value={form.situation}
                onChange={(e) => handleFormChange('situation', e.target.value)}
                dir="ltr"
              />
            </div>
          </div>

          {/* Children */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Baby className="w-4 h-4" />
                الأطفال ({form.children.length})
              </h4>
              <Button variant="secondary" size="sm" onClick={addChild}>
                <Plus className="w-3.5 h-3.5" />
                إضافة طفل
              </Button>
            </div>

            {form.children.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">
                لا يوجد أطفال. اضغط "إضافة طفل" لإضافة طفل.
              </p>
            ) : (
              <div className="space-y-4">
                {form.children.map((child, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50 relative"
                  >
                    <button
                      type="button"
                      onClick={() => removeChild(index)}
                      className="absolute top-2 left-2 p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="إزالة الطفل"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <p className="text-xs text-gray-500 mb-3 font-medium">
                      الطفل {index + 1}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input
                        labelAr="الاسم الأول بالعربية"
                        value={child.firstNameAr}
                        onChange={(e) => updateChild(index, 'firstNameAr', e.target.value)}
                      />
                      <Input
                        labelAr="اللقب بالعربية"
                        value={child.lastNameAr}
                        onChange={(e) => updateChild(index, 'lastNameAr', e.target.value)}
                      />
                      <div className="space-y-1">
                        <Input
                          labelAr="تاريخ الميلاد"
                          type="date"
                          value={child.dateOfBirth}
                          onChange={(e) => updateChild(index, 'dateOfBirth', e.target.value)}
                          dir="ltr"
                        />
                        {child.dateOfBirth && (
                          <p className="text-xs text-primary-600 font-medium">
                            العمر: {calculateAge(child.dateOfBirth).displayAr}
                          </p>
                        )}
                      </div>
                      <Select
                        labelAr="الحالة الصحية"
                        options={HEALTH_STATUS_OPTIONS}
                        value={child.healthStatus}
                        onChange={(e) => updateChild(index, 'healthStatus', e.target.value)}
                      />
                      <Input
                        labelAr="تفاصيل الحالة الصحية"
                        placeholder="تفاصيل إضافية..."
                        value={child.healthDetails || ''}
                        onChange={(e) => updateChild(index, 'healthDetails', e.target.value)}
                        className="md:col-span-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <TextArea
            labelAr="ملاحظات"
            value={form.notes}
            onChange={(e) => handleFormChange('notes', e.target.value)}
            placeholder="ملاحظات إضافية..."
          />

          {/* Submit */}
          <div className="flex gap-2 justify-end border-t border-gray-100 pt-4">
            <Button variant="secondary" onClick={closeFormModal}>
              إلغاء
            </Button>
            <Button onClick={handleSubmit}>
              {editingId ? 'حفظ التعديلات' : 'إضافة المستفيد'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ---- Detail View Modal ---- */}
      {selectedBeneficiary && (
        <Modal
          isOpen={showDetailModal}
          onClose={closeDetail}
          title={`${selectedBeneficiary.lastNameAr} ${selectedBeneficiary.firstNameAr}`}
          size="xl"
        >
          <div className="space-y-6" dir="rtl">
            {/* Personal Info */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-100 pb-2">
                المعلومات الشخصية
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">الرمز المرجعي:</span>
                  <span className="font-semibold text-primary-700" dir="ltr">
                    {selectedBeneficiary.reference || '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">الاسم بالعربية:</span>
                  <span className="font-medium text-gray-900">
                    {selectedBeneficiary.lastNameAr} {selectedBeneficiary.firstNameAr}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">الاسم باللاتينية:</span>
                  <span className="font-medium text-gray-900" dir="ltr">
                    {selectedBeneficiary.firstName} {selectedBeneficiary.lastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">رقم البطاقة الوطنية:</span>
                  <span className="font-medium text-gray-900">
                    {selectedBeneficiary.nationalCardNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">الهاتف:</span>
                  <span className="font-medium text-gray-900" dir="ltr">
                    {selectedBeneficiary.phone}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">تاريخ الميلاد:</span>
                  <span className="font-medium text-gray-900">
                    {selectedBeneficiary.dateOfBirth
                      ? `${formatDate(selectedBeneficiary.dateOfBirth)} (${calculateAge(selectedBeneficiary.dateOfBirth).displayAr})`
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">الصفة:</span>
                  <Badge variant={ATTRIBUT_BADGE_VARIANT[selectedBeneficiary.attribut] ?? 'default'}>
                    {ATTRIBUT_LABELS[selectedBeneficiary.attribut] ?? selectedBeneficiary.attribut}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">العنوان بالعربية:</span>
                  <span className="font-medium text-gray-900">
                    {selectedBeneficiary.addressAr || '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">العنوان باللاتينية:</span>
                  <span className="font-medium text-gray-900" dir="ltr">
                    {selectedBeneficiary.address || '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">الصندوق:</span>
                  <span className="font-medium text-gray-900">
                    {getCaisseName(selectedBeneficiary.caisseId)}
                    {selectedBeneficiary.subCategoryId && (
                      <span className="text-gray-500 mr-2">
                        ({getSubCaisseName(selectedBeneficiary.caisseId, selectedBeneficiary.subCategoryId)})
                      </span>
                    )}
                  </span>
                </div>
                {selectedBeneficiary.onBehalfOfName && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">باسم من:</span>
                    <span className="font-medium text-gray-900">
                      {selectedBeneficiary.onBehalfOfName}
                    </span>
                  </div>
                )}
                {(selectedBeneficiary.situationAr || selectedBeneficiary.situation) && (
                  <div className="flex justify-between md:col-span-2">
                    <span className="text-gray-500">الحالة:</span>
                    <span className="font-medium text-gray-900">
                      {selectedBeneficiary.situationAr}
                      {selectedBeneficiary.situation && (
                        <span className="text-gray-400 mr-2" dir="ltr">
                          ({selectedBeneficiary.situation})
                        </span>
                      )}
                    </span>
                  </div>
                )}
                {selectedBeneficiary.notes && (
                  <div className="flex justify-between md:col-span-2">
                    <span className="text-gray-500">ملاحظات:</span>
                    <span className="font-medium text-gray-900">{selectedBeneficiary.notes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Children */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-100 pb-2 flex items-center gap-2">
                <Baby className="w-4 h-4" />
                الأطفال ({selectedBeneficiary.children.length})
              </h4>
              {selectedBeneficiary.children.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">لا يوجد أطفال مسجلون</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500">
                        <th className="py-2 px-3 text-right font-medium">الاسم</th>
                        <th className="py-2 px-3 text-right font-medium">تاريخ الميلاد</th>
                        <th className="py-2 px-3 text-right font-medium">العمر</th>
                        <th className="py-2 px-3 text-right font-medium">الحالة الصحية</th>
                        <th className="py-2 px-3 text-right font-medium">التفاصيل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBeneficiary.children.map((child) => {
                        const childAge = child.dateOfBirth ? calculateAge(child.dateOfBirth) : null
                        return (
                          <tr key={child.id} className="border-b border-gray-100">
                            <td className="py-2 px-3 font-medium text-gray-900">
                              {child.lastNameAr} {child.firstNameAr}
                            </td>
                            <td className="py-2 px-3 text-gray-600">
                              {child.dateOfBirth ? formatDate(child.dateOfBirth) : '—'}
                            </td>
                            <td className="py-2 px-3 text-gray-600">
                              {childAge ? childAge.displayAr : '—'}
                            </td>
                            <td className="py-2 px-3">
                              <Badge
                                variant={
                                  child.healthStatus === 'bonne_sante'
                                    ? 'success'
                                    : child.healthStatus === 'malade'
                                      ? 'danger'
                                      : child.healthStatus === 'handicape'
                                        ? 'warning'
                                        : 'default'
                                }
                              >
                                {HEALTH_STATUS_LABELS[child.healthStatus] ?? child.healthStatus}
                              </Badge>
                            </td>
                            <td className="py-2 px-3 text-gray-600">
                              {child.healthDetails || '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Associated Transactions */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-100 pb-2">
                المعاملات المالية ({detailTransactions.length})
              </h4>
              {detailTransactions.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">لا توجد معاملات مالية</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500">
                        <th className="py-2 px-3 text-right font-medium">التاريخ</th>
                        <th className="py-2 px-3 text-right font-medium">النوع</th>
                        <th className="py-2 px-3 text-right font-medium">المبلغ</th>
                        <th className="py-2 px-3 text-right font-medium">الوصف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailTransactions.map((t: any) => (
                        <tr key={t.id} className="border-b border-gray-100">
                          <td className="py-2 px-3 text-gray-600">{formatDate(t.date)}</td>
                          <td className="py-2 px-3">
                            <Badge variant={t.type === 'credit' ? 'success' : 'danger'}>
                              {t.type === 'credit' ? 'إيراد' : 'مصروف'}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 font-medium text-gray-900">
                            {t.amount?.toLocaleString('ar-DZ')} د.ج
                          </td>
                          <td className="py-2 px-3 text-gray-600">
                            {t.descriptionAr || t.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Associated Loans */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-100 pb-2">
                الإعارات ({detailLoans.length})
              </h4>
              {detailLoans.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">لا توجد إعارات</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500">
                        <th className="py-2 px-3 text-right font-medium">تاريخ الإعارة</th>
                        <th className="py-2 px-3 text-right font-medium">الحالة</th>
                        <th className="py-2 px-3 text-right font-medium">المواد</th>
                        <th className="py-2 px-3 text-right font-medium">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailLoans.map((loan: any) => (
                        <tr key={loan.id} className="border-b border-gray-100">
                          <td className="py-2 px-3 text-gray-600">
                            {formatDate(loan.loanDate)}
                          </td>
                          <td className="py-2 px-3">
                            <Badge
                              variant={
                                loan.status === 'retourne'
                                  ? 'success'
                                  : loan.status === 'en_cours'
                                    ? 'warning'
                                    : loan.status === 'definitif'
                                      ? 'info'
                                      : 'default'
                              }
                            >
                              {loan.status === 'en_cours'
                                ? 'جارية'
                                : loan.status === 'retourne'
                                  ? 'مرتجعة'
                                  : loan.status === 'partiellement_retourne'
                                    ? 'مرتجعة جزئياً'
                                    : loan.status === 'definitif'
                                      ? 'نهائية'
                                      : loan.status}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-gray-600">
                            {loan.items?.map((i: any) => i.articleNameAr || i.articleName).join('، ') || '—'}
                          </td>
                          <td className="py-2 px-3 text-gray-600">
                            {loan.notes || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Associated Medical Referrals */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-100 pb-2">
                التحويلات الطبية ({detailReferrals.length})
              </h4>
              {detailReferrals.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">لا توجد تحويلات طبية</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500">
                        <th className="py-2 px-3 text-right font-medium">التاريخ</th>
                        <th className="py-2 px-3 text-right font-medium">الطبيب</th>
                        <th className="py-2 px-3 text-right font-medium">نوع التحليل</th>
                        <th className="py-2 px-3 text-right font-medium">المستشفى</th>
                        <th className="py-2 px-3 text-right font-medium">المبلغ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailReferrals.map((r: any) => (
                        <tr key={r.id} className="border-b border-gray-100">
                          <td className="py-2 px-3 text-gray-600">{formatDate(r.date)}</td>
                          <td className="py-2 px-3 text-gray-900">
                            {r.doctorNameAr || r.doctorName}
                          </td>
                          <td className="py-2 px-3 text-gray-600">
                            {r.analysisTypeAr || r.analysisType || '—'}
                          </td>
                          <td className="py-2 px-3 text-gray-600">
                            {r.hospitalAr || r.hospital || '—'}
                          </td>
                          <td className="py-2 px-3 font-medium text-gray-900">
                            {r.amount?.toLocaleString('ar-DZ')} د.ج
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Actions in detail view */}
            <div className="flex gap-2 justify-end border-t border-gray-100 pt-4">
              <Button variant="secondary" onClick={closeDetail}>
                إغلاق
              </Button>
              <Button
                onClick={() => {
                  closeDetail()
                  openEditForm(selectedBeneficiary)
                }}
              >
                <Edit className="w-4 h-4" />
                تعديل
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
