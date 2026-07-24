import { useState, Fragment } from 'react'
import { Card, Button, Input, SearchableSelect, Modal, Badge, TextArea, EmptyState, LoadingSpinner } from '../components/common/UI'
import { calculateAge, formatDate, formatCurrency, numberToArabicWords, numberToFrenchWords } from '../utils/helpers'
import { printReceipt, printBeneficiaryCard } from '../lib/receipt'
import { Plus, Search, Filter, Eye, Edit, Trash2, Users, Baby, Settings, FolderTree, Printer, ChevronDown, ChevronUp } from 'lucide-react'
import type { Beneficiary, Child, BeneficiaryAttribut } from '../types'
import { useBeneficiaries, useCreateBeneficiary, useUpdateBeneficiary, useDeleteBeneficiary } from '../hooks/useBeneficiaries'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { caissesApi, attributsApi, inventoryApi, api, financeApi, medicalApi } from '../lib/api'
import type { DonationAllocation } from '../types'
import { useAuth } from '../hooks/useAuth'

// ---- Constants ----

const ATTRIBUT_LABELS: Record<string, string> = {
  veuve: 'أرملة',
  orphelin: 'يتيم',
  personne_agee: 'شخص مسن',
  handicape: 'معاق',
  famille_demunie: 'عائلة معوزة',
  autre: 'أخرى',
}

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
    gender: 'male',
    healthStatus: 'bonne_sante',
    healthDetails: '',
    schoolGradeId: '',
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
  gender: string
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
    gender: 'male',
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
    gender: b.gender ?? 'male',
    onBehalfOf: b.onBehalfOfName ?? '',
    situation: b.situation ?? '',
    situationAr: b.situationAr ?? '',
    caisseId: b.caisseId ?? '',
    subCategoryId: b.subCategoryId ?? '',
    children: b.children.map((c: any) => ({ ...c, schoolGradeId: c.schoolGradeId ?? '' })),
    notes: b.notes ?? '',
  }
}

// ============================================
// Main component
// ============================================

export default function BeneficiariesPage() {
  const queryClient = useQueryClient()
  const { association } = useAuth()
  const [queryParams, setQueryParams] = useState<Record<string, string> | undefined>(undefined)
  const { data: beneficiaries = [], isLoading } = useBeneficiaries(queryParams)
  const { data: caisses = [] } = useQuery({
    queryKey: ['caisses'],
    queryFn: () => caissesApi.list().then(r => r.data),
  })
  const { data: attributs = [] } = useQuery({
    queryKey: ['attributs'],
    queryFn: () => attributsApi.list().then(r => r.data),
  })
  const { data: schoolGrades = [] } = useQuery({
    queryKey: ['school-grades'],
    queryFn: () => inventoryApi.schoolGrades().then(r => r.data),
  })

  const createBeneficiary = useCreateBeneficiary()
  const updateBeneficiary = useUpdateBeneficiary()
  const deleteBeneficiary = useDeleteBeneficiary()

  // ---- UI state ----
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<BeneficiaryFormData>(emptyForm())
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // ---- Attribut management (إدارة التصنيفات) ----
  const [newAttrNameAr, setNewAttrNameAr] = useState('')
  const [newAttrName, setNewAttrName] = useState('')
  const [editAttrId, setEditAttrId] = useState<string | null>(null)
  const [editAttrNameAr, setEditAttrNameAr] = useState('')
  const [editAttrName, setEditAttrName] = useState('')

  // School grade management state
  const [newGradeNameAr, setNewGradeNameAr] = useState('')
  const [newGradeName, setNewGradeName] = useState('')
  const [editGradeId, setEditGradeId] = useState<string | null>(null)
  const [editGradeNameAr, setEditGradeNameAr] = useState('')
  const [editGradeName, setEditGradeName] = useState('')

  const createAttributMutation = useMutation({
    mutationFn: (data: { name: string; nameAr: string }) => attributsApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attributs'] }),
  })

  const deleteAttributMutation = useMutation({
    mutationFn: (name: string) => attributsApi.delete(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attributs'] }),
  })

  const createGradeMutation = useMutation({
    mutationFn: (data: { name: string; nameAr: string }) => inventoryApi.createSchoolGrade(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['school-grades'] }),
  })
  const deleteGradeMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.deleteSchoolGrade(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['school-grades'] }),
  })

  const handleAddAttribut = async () => {
    if (!newAttrNameAr.trim()) return
    await createAttributMutation.mutateAsync({ name: newAttrName.trim(), nameAr: newAttrNameAr.trim() })
    setNewAttrNameAr('')
    setNewAttrName('')
  }

  const handleUpdateAttribut = async () => {
    if (!editAttrId || !editAttrNameAr.trim()) return
    await api.put(`/beneficiary-attributs/${encodeURIComponent(editAttrId)}`, {
      name: editAttrName.trim(),
      nameAr: editAttrNameAr.trim(),
    })
    setEditAttrId(null)
    setEditAttrNameAr('')
    setEditAttrName('')
    queryClient.invalidateQueries({ queryKey: ['attributs'] })
  }

  const handleDeleteAttribut = async (name: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الصفة؟')) return
    try {
      await deleteAttributMutation.mutateAsync(name)
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'لا يمكن حذف الصفة لأنها مستخدمة من قبل مستفيدين'
      window.alert(msg)
    }
  }

  const handleAddGrade = async () => {
    if (!newGradeNameAr.trim()) return
    await createGradeMutation.mutateAsync({ name: newGradeName.trim(), nameAr: newGradeNameAr.trim() })
    setNewGradeNameAr('')
    setNewGradeName('')
  }

  const handleUpdateGrade = async () => {
    if (!editGradeId || !editGradeNameAr.trim()) return
    await inventoryApi.updateSchoolGrade(editGradeId, { name: editGradeName.trim(), nameAr: editGradeNameAr.trim() })
    setEditGradeId(null); setEditGradeNameAr(''); setEditGradeName('')
    queryClient.invalidateQueries({ queryKey: ['school-grades'] })
  }

  const handleDeleteGrade = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المستوى؟')) return
    await deleteGradeMutation.mutateAsync(id)
  }

  // ---- Filter state ----
  const [filterSearchTerm, setFilterSearchTerm] = useState('')
  const [filterAttribut, setFilterAttribut] = useState('')
  const [filterCaisseId, setFilterCaisseId] = useState('')
  const [filterMinChildren, setFilterMinChildren] = useState('')
  const [filterMaxChildAge, setFilterMaxChildAge] = useState('')
  const [filterSituation, setFilterSituation] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [filterChildGender, setFilterChildGender] = useState('')
  const [filterChildHealthStatus, setFilterChildHealthStatus] = useState('')
  const [filterChildSchoolGradeId, setFilterChildSchoolGradeId] = useState('')
  const [filterMinChildAge, setFilterMinChildAge] = useState('')
  const [filterMaxChildAge2, setFilterMaxChildAge2] = useState('')
  const [filterMinAge, setFilterMinAge] = useState('')
  const [filterMaxAge, setFilterMaxAge] = useState('')
  const [filterTab, setFilterTab] = useState<'beneficiary' | 'children'>('beneficiary')

  // ---- Tab state ----
  const [activeTab, setActiveTab] = useState<'list' | 'settings'>('list')

  const handleSettingsTab = () => {
    setActiveTab('settings')
  }

  // ---- Caisse options ----
  const caisseOptions = caisses.map((c: any) => ({
    value: c.id,
    label: c.nameAr || c.name,
  }))

  const attributOptions = attributs.map((a: BeneficiaryAttribut) => ({
    value: a.name,
    label: a.nameAr,
  }))

  const gradeOptions = schoolGrades.map((g: any) => ({ value: g.id, label: g.nameAr }))

  // Compute display list (show only beneficiaries with the most children)
  const [widowFilterActive, setWidowFilterActive] = useState(false)

  const displayBeneficiaries = (() => {
    if (widowFilterActive && beneficiaries.length > 0) {
      const childrenCounts = beneficiaries.map((b: any) => (b.children || []).length)
      const maxChildren = Math.max(...childrenCounts)
      return beneficiaries.filter((b: any) => (b.children || []).length === maxChildren)
    }
    return beneficiaries
  })()

  // ---- Allocations for detail ----
  const { data: beneficiaryAllocations = [] } = useQuery({
    queryKey: ['beneficiary-allocations', selectedBeneficiary?.id],
    queryFn: async () => {
      const res = await financeApi.allocations({ beneficiaryId: selectedBeneficiary!.id });
      return res.data;
    },
    enabled: !!selectedBeneficiary?.id,
  })

  // ---- Medical referrals for detail ----
  const { data: beneficiaryReferrals = [] } = useQuery({
    queryKey: ['beneficiary-referrals', selectedBeneficiary?.id],
    queryFn: async () => {
      const res = await medicalApi.referrals({ beneficiaryId: selectedBeneficiary!.id });
      return res.data;
    },
    enabled: !!selectedBeneficiary?.id,
  })

  // ---- Debit transactions (disbursements) for detail ----
  const { data: beneficiaryDebits = [] } = useQuery({
    queryKey: ['beneficiary-debits', selectedBeneficiary?.id],
    queryFn: async () => {
      const res = await financeApi.transactions({ beneficiaryId: selectedBeneficiary!.id, type: 'debit' });
      return res.data;
    },
    enabled: !!selectedBeneficiary?.id,
  })

  // ---- Filter application ----
  const buildParams = () => {
    const params: Record<string, string> = {}
    if (filterSearchTerm) params.searchTerm = filterSearchTerm
    if (filterAttribut) params.attribut = filterAttribut
    if (filterCaisseId) params.caisseId = filterCaisseId
    if (filterMinChildren) params.minChildren = filterMinChildren
    if (filterMaxChildAge) params.maxChildAge = filterMaxChildAge
    if (filterSituation) params.situation = filterSituation
    if (filterGender) params.gender = filterGender
    if (filterChildGender) params.childGender = filterChildGender
    if (filterChildHealthStatus) params.childHealthStatus = filterChildHealthStatus
    if (filterChildSchoolGradeId) params.childSchoolGradeId = filterChildSchoolGradeId
    if (filterMinChildAge) params.minChildAge = filterMinChildAge
    if (filterMaxChildAge2) params.maxChildAge = filterMaxChildAge2
    if (filterMinAge) params.minAge = filterMinAge
    if (filterMaxAge) params.maxAge = filterMaxAge
    return Object.keys(params).length > 0 ? params : undefined
  }

  const applyFilters = () => {
    setQueryParams(buildParams())
  }

  const resetFilters = () => {
    setFilterSearchTerm('')
    setFilterAttribut('')
    setFilterCaisseId('')
    setFilterMinChildren('')
    setFilterMaxChildAge('')
    setFilterSituation('')
    setFilterGender('')
    setFilterChildGender('')
    setFilterChildHealthStatus('')
    setFilterChildSchoolGradeId('')
    setFilterMinChildAge('')
    setFilterMaxChildAge2('')
    setFilterMinAge('')
    setFilterMaxAge('')
    setWidowFilterActive(false)
    setQueryParams(undefined)
  }

  const handleFindWidowWithMostChildren = async () => {
    applyFilters()
    setWidowFilterActive(true)
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

  const handleSave = async () => {
    const data: any = {
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
      gender: form.gender || 'male',
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
        gender: c.gender || 'male',
        healthStatus: c.healthStatus as Child['healthStatus'],
        healthDetails: c.healthDetails || undefined,
        schoolGradeId: c.schoolGradeId || undefined,
      })),
      notes: form.notes || undefined,
    }

    if (editingId) {
      await updateBeneficiary.mutateAsync({ id: editingId, data })
    } else {
      await createBeneficiary.mutateAsync(data)
    }
    closeFormModal()
  }

  // ---- Delete ----
  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المستفيد؟')) return
    await deleteBeneficiary.mutateAsync(id)
  }

  // ---- Detail view ----
  const openDetail = async (b: Beneficiary) => {
    setSelectedBeneficiary(b)
    setShowDetailModal(true)
  }

  const closeDetail = () => {
    setShowDetailModal(false)
    setSelectedBeneficiary(null)
  }

  // ---- Print ----
  const handlePrintCard = (b: Beneficiary) => {
    const caisse = caisses.find((c: any) => c.id === b.caisseId)

    // Children as inline grid items (no table, matches Orientation Médicale style)
    const childrenHtml = (b.children || []).length > 0
      ? `<div class="section"><div class="section-title">الأطفال (${b.children.length})</div>
         <div class="info"><div class="col"><div class="row"><span class="lbl">الأسماء</span>
         ${b.children.map((ch: any) =>
           `<span class="val">${ch.lastNameAr} ${ch.firstNameAr}</span><br>`
         ).join('')}
         </div></div><div class="col"><div class="row"><span class="lbl">الجنس / العمر / الحالة</span>
         ${b.children.map((ch: any) =>
           `<span class="val">${ch.gender === 'female' ? 'أنثى' : 'ذكر'} — ${calculateAge(ch.dateOfBirth).displayAr} — ${HEALTH_STATUS_LABELS[ch.healthStatus] || ch.healthStatus}</span><br>`
         ).join('')}
         </div></div></div></div>`
      : ''

    printBeneficiaryCard({
      assocNameAr: association?.nameAr || 'الجمعية الخيرية',
      reference: b.reference || '—',
      lastNameAr: b.lastNameAr,
      firstNameAr: b.firstNameAr,
      firstName: b.firstName,
      lastName: b.lastName,
      nationalCardNumber: b.nationalCardNumber || '—',
      phone: b.phone,
      dateOfBirth: b.dateOfBirth ? formatDate(b.dateOfBirth) : '—',
      ageDisplay: b.dateOfBirth ? calculateAge(b.dateOfBirth).displayAr : '—',
      attribut: ATTRIBUT_LABELS[b.attribut] || b.attribut,
      gender: b.gender === 'female' ? 'أنثى' : 'ذكر',
      caisseNameAr: caisse?.nameAr || '—',
      situation: b.situationAr ? `${HEALTH_STATUS_LABELS[b.situationAr] || b.situationAr}${b.situation ? ` (${b.situation})` : ''}` : undefined,
      childrenHtml,
    })
  }

  // ---- Print Full File (A4) ----
  const handlePrintFullFile = (b: Beneficiary, allocations: DonationAllocation[], debits: any[], referrals: any[]) => {
    const caisse = caisses.find((c: any) => c.id === b.caisseId)

    // personalInfoHtml is now inlined directly in the template

    const childrenHtml = (b.children || []).length > 0 ? `
      <div class="section">
        <div class="section-title">الأطفال (${b.children.length})</div>
        <table class="data-table">
          <thead><tr><th>الاسم</th><th>الجنس</th><th>العمر</th><th>الحالة الصحية</th><th>المستوى الدراسي</th></tr></thead>
          <tbody>${b.children.map((ch: any) => `
            <tr>
              <td>${ch.lastNameAr} ${ch.firstNameAr}</td>
              <td>${ch.gender === 'female' ? 'أنثى' : 'ذكر'}</td>
              <td>${calculateAge(ch.dateOfBirth).displayAr}</td>
              <td>${HEALTH_STATUS_LABELS[ch.healthStatus] || ch.healthStatus}</td>
              <td>${getGradeName(ch.schoolGradeId)}</td>
            </tr>`).join('')}</tbody>
        </table>
      </div>` : ''

    const allocsHtml = allocations.length > 0 ? `
      <div class="section">
        <div class="section-title">التبرعات الواردة (${allocations.length})</div>
        <table class="data-table">
          <thead><tr><th>المتبرع</th><th>المبلغ</th><th>المصرف</th><th>المتبقي</th><th>الحالة</th><th>التاريخ</th></tr></thead>
          <tbody>${allocations.map((a: DonationAllocation) => {
            const spent = a.amount - a.remainingAmount
            const s = a.creditTransaction?.status
            const statusLabel = s === 'pending' ? 'معلق' : s === 'cancelled' ? 'ملغي' : a.remainingAmount <= 0 ? 'مصرف بالكامل' : a.debitTransactionId ? 'مصرف جزئياً' : 'نشط'
          return `<tr>
            <td>${a.donor.lastNameAr} ${a.donor.firstNameAr}</td>
            <td>${formatCurrency(a.amount)}</td>
            <td>${spent > 0 ? formatCurrency(spent) : '—'}</td>
            <td>${a.remainingAmount > 0 ? formatCurrency(a.remainingAmount) : '0'}</td>
            <td>${statusLabel}</td>
            <td>${formatDate(a.createdAt)}</td>
          </tr>`
        }).join('')}</tbody>
        <tfoot><tr>
          <td colspan="2"><strong>الإجمالي: ${formatCurrency(allocations.reduce((s: number, a: DonationAllocation) => s + a.amount, 0))}</strong></td>
          <td><strong>${formatCurrency(allocations.reduce((s: number, a: DonationAllocation) => s + (a.amount - a.remainingAmount), 0))}</strong></td>
          <td><strong>${formatCurrency(allocations.reduce((s: number, a: DonationAllocation) => s + a.remainingAmount, 0))}</strong></td>
          <td colspan="2"></td>
        </tr></tfoot>
      </table>
      </div>` : ''

    const debitsHtml = debits.length > 0 ? `
      <div class="section">
        <div class="section-title">المبالغ المصروفة (${debits.length})</div>
        <table class="data-table">
          <thead><tr><th>التاريخ</th><th>المبلغ</th><th>المصدر</th><th>الصندوق</th><th>الحالة</th><th>الوصف</th></tr></thead>
          <tbody>${debits.map((tx: any) => {
            const c = caisses.find((c: any) => c.id === tx.caisseId)
            const s = (tx.status || 'completed') === 'pending' ? 'معلق' : (tx.status || 'completed') === 'cancelled' ? 'ملغي' : 'مكتمل'
            return `<tr>
              <td>${formatDate(tx.date)}</td>
              <td>${formatCurrency(tx.amount)}</td>
              <td>${tx.fundSource === 'banque' ? 'بنك' : 'صندوق نقدي'}</td>
              <td>${c?.nameAr || '—'}</td>
              <td>${s}</td>
              <td>${tx.descriptionAr || '—'}</td>
            </tr>`
          }).join('')}</tbody>
        </table>
      </div>` : ''

    const refsHtml = referrals.length > 0 ? `
      <div class="section">
        <div class="section-title">التوجيه الطبي (${referrals.length})</div>
        <table class="data-table">
          <thead><tr><th>التاريخ</th><th>الطبيب</th><th>المبلغ</th><th>التحليل</th><th>المستشفى</th><th>الأطفال</th></tr></thead>
          <tbody>${referrals.map((ref: any) => {
            const childrenNames = ref.children && Array.isArray(ref.children) && ref.children.length > 0
              ? ref.children.map((c: any) => c.nameAr).join(', ')
              : '—'
            return `<tr>
              <td>${formatDate(ref.date)}</td>
              <td>${ref.doctorNameAr}</td>
              <td>${formatCurrency(ref.amount)}</td>
              <td>${ref.analysisTypeAr || '—'}</td>
              <td>${ref.hospitalAr || '—'}</td>
              <td>${childrenNames}</td>
            </tr>`
          }).join('')}</tbody>
        </table>
      </div>` : ''

    const fullHtml = `
      <!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8">
      <style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; font-size: 11.5px; color: #1a1a1a; padding: 0; line-height: 1.6; background: #fff; }
        .page-wrap { width: 100%; min-height: 100vh; padding: 25mm 25mm 20mm 25mm; }
        @media print { body { background: #fff; } .page-wrap { padding: 25mm 25mm 20mm 25mm; } }
        .header { text-align: center; margin-bottom: 22px; padding-bottom: 12px; border-bottom: 3px double #2563eb; }
        .header h1 { font-size: 22px; color: #1e40af; margin: 0 0 4px; }
        .header .sub { font-size: 11px; color: #6b7280; }
        .section { margin-bottom: 18px; page-break-inside: avoid; }
        .section-title { font-size: 14px; font-weight: 700; color: #1e40af; margin: 0 0 10px; padding: 6px 12px; background: #eff6ff; border-right: 4px solid #2563eb; border-radius: 0 4px 4px 0; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 20px; padding: 8px 4px; }
        .info-grid .item { display: flex; padding: 2px 0; border-bottom: 1px dotted #e5e7eb; }
        .info-grid .item .lbl { min-width: 140px; font-weight: 600; color: #4b5563; font-size: 11px; }
        .info-grid .item .val { flex: 1; font-size: 11.5px; }
        .data-table { width: 100%; border-collapse: collapse; margin: 0 0 4px; font-size: 10.5px; }
        .data-table thead th { background: #2563eb; color: #fff; padding: 7px 6px; text-align: center; font-weight: 600; font-size: 10.5px; border: 1px solid #1d4ed8; }
        .data-table tbody td { padding: 5px 6px; border: 1px solid #d1d5db; text-align: center; vertical-align: middle; }
        .data-table tbody tr:nth-child(even) { background: #f9fafb; }
        .data-table tbody tr:hover { background: #eff6ff; }
        .data-table tfoot td { font-weight: 700; background: #eff6ff; padding: 6px; border: 1px solid #93c5fd; font-size: 11px; }
        .footer { text-align: center; margin-top: 25px; padding-top: 10px; border-top: 1px solid #d1d5db; font-size: 10px; color: #9ca3af; }
        .no-print { display: block; width: 200px; margin: 20px auto; padding: 10px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; text-align: center; }
        @media print { body { padding: 0; } .no-print { display: none; } }
      </style></head><body>
        <div class="page-wrap">
        <div class="header">
          <h1>ملف المستفيد</h1>
          <div class="sub">${b.reference || ''}</div>
        </div>
        <div class="section">
          <div class="section-title">المعلومات الشخصية</div>
          <div class="info-grid">
            <div class="item"><span class="lbl">الاسم بالعربية</span><span class="val">${b.lastNameAr} ${b.firstNameAr}</span></div>
            <div class="item"><span class="lbl">الاسم باللاتينية</span><span class="val">${b.firstName} ${b.lastName}</span></div>
            <div class="item"><span class="lbl">رقم البطاقة الوطنية</span><span class="val">${b.nationalCardNumber || '—'}</span></div>
            <div class="item"><span class="lbl">الهاتف</span><span class="val">${b.phone}</span></div>
            <div class="item"><span class="lbl">تاريخ الميلاد</span><span class="val">${b.dateOfBirth ? `${formatDate(b.dateOfBirth)} (${calculateAge(b.dateOfBirth).displayAr})` : '—'}</span></div>
            <div class="item"><span class="lbl">الصفة</span><span class="val">${ATTRIBUT_LABELS[b.attribut] || b.attribut}</span></div>
            <div class="item"><span class="lbl">الجنس</span><span class="val">${b.gender === 'female' ? 'أنثى' : 'ذكر'}</span></div>
            <div class="item"><span class="lbl">العنوان</span><span class="val">${b.addressAr || '—'}</span></div>
            <div class="item"><span class="lbl">الصندوق</span><span class="val">${caisse?.nameAr || '—'}${b.subCategoryId ? ` (${getSubCaisseName(b.caisseId, b.subCategoryId)})` : ''}</span></div>
            ${b.situationAr ? `<div class="item"><span class="lbl">الحالة</span><span class="val">${HEALTH_STATUS_LABELS[b.situationAr] || b.situationAr}${b.situation ? ` (${b.situation})` : ''}</span></div>` : ''}
            ${b.notes ? `<div class="item"><span class="lbl" style="min-width:140px">ملاحظات</span><span class="val">${b.notes}</span></div>` : ''}
          </div>
        </div>
        ${childrenHtml}
        ${allocsHtml}
        ${debitsHtml}
        ${refsHtml}
        <button class="no-print" onclick="window.print()">طباعة الملف</button>
        <div class="footer">تم إنشاؤه بواسطة نظام الجمعية — ${new Date().toLocaleDateString('ar-DZ')}</div>
      </div>
      </body></html>`

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(fullHtml)
      win.document.close()
    }
  }

  // ---- Helpers ----
  const getCaisseName = (caisseId?: string) => {
    if (!caisseId) return '—'
    const c = caisses.find((c: any) => c.id === caisseId)
    return c?.nameAr || c?.name || '—'
  }

  const getSubCaisseName = (caisseId?: string, subCatId?: string) => {
    if (!caisseId || !subCatId) return '—'
    const c = caisses.find((c: any) => c.id === caisseId)
    const sc = c?.subCategories.find((s: any) => s.id === subCatId)
    return sc?.nameAr || sc?.name || '—'
  }

  const getGradeName = (gradeId?: string) => {
    if (!gradeId) return '—'
    const g = schoolGrades.find((g: any) => g.id === gradeId)
    return g?.nameAr || '—'
  }

  // ---- Render helpers ----
  const renderListTab = () => (
    <div>
      {/* ---- Quick Search ---- */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="البحث بالاسم، رقم البطاقة، أو الهاتف..."
          className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          value={filterSearchTerm}
          onChange={(e) => setFilterSearchTerm(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
        />
      </div>

      {/* ---- Advanced Filters (collapsible) ---- */}
      {showFilters && (
        <Card titleAr="بحث متقدم">
          {/* Filter tabs */}
          <div className="flex gap-1 mb-4 border-b border-gray-200">
            <button
              onClick={() => setFilterTab('beneficiary')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                filterTab === 'beneficiary'
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-4 h-4 inline ml-1" />
              معلومات المستفيد
            </button>
            <button
              onClick={() => setFilterTab('children')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                filterTab === 'children'
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Baby className="w-4 h-4 inline ml-1" />
              الأطفال
            </button>
          </div>

          {/* Beneficiary filters */}
          {filterTab === 'beneficiary' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <SearchableSelect
                labelAr="الصفة"
                options={attributOptions}
                value={filterAttribut}
                onChange={(val) => setFilterAttribut(val)}
                required={false}
              />
              <SearchableSelect
                labelAr="الصندوق"
                options={caisseOptions}
                value={filterCaisseId}
                onChange={(val) => setFilterCaisseId(val)}
              />
              <SearchableSelect
                labelAr="الجنس"
                options={[{ value: '', label: 'الكل' }, { value: 'male', label: 'ذكر' }, { value: 'female', label: 'أنثى' }]}
                value={filterGender}
                onChange={(val) => setFilterGender(val)}
              />
              <SearchableSelect
                labelAr="الحالة"
                options={[{ value: '', label: 'الكل' }, ...HEALTH_STATUS_OPTIONS]}
                value={filterSituation}
                onChange={(val) => setFilterSituation(val)}
              />
              <Input
                labelAr="الحد الأدنى لعدد الأطفال"
                type="number"
                min="0"
                value={filterMinChildren}
                onChange={(e) => setFilterMinChildren(e.target.value)}
              />
              <Input
                labelAr="العمر الأقصى للمستفيد"
                type="number"
                min="0"
                value={filterMaxAge}
                onChange={(e) => setFilterMaxAge(e.target.value)}
              />
            </div>
          )}

          {/* Children filters */}
          {filterTab === 'children' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <SearchableSelect
                labelAr="جنس الطفل"
                options={[{ value: '', label: 'الكل' }, { value: 'male', label: 'ذكر' }, { value: 'female', label: 'أنثى' }]}
                value={filterChildGender}
                onChange={(val) => setFilterChildGender(val)}
              />
              <SearchableSelect
                labelAr="الحالة الصحية للطفل"
                options={[
                  { value: '', label: 'الكل' },
                  { value: 'bonne_sante', label: 'بصحة جيدة' },
                  { value: 'malade', label: 'مريض' },
                  { value: 'handicape', label: 'معاق' },
                  { value: 'autre', label: 'أخرى' },
                ]}
                value={filterChildHealthStatus}
                onChange={(val) => setFilterChildHealthStatus(val)}
              />
              <SearchableSelect
                labelAr="المستوى الدراسي للطفل"
                options={[
                  { value: '', label: 'الكل' },
                  ...gradeOptions,
                ]}
                value={filterChildSchoolGradeId}
                onChange={(val) => setFilterChildSchoolGradeId(val)}
              />
              <Input
                labelAr="الحد الأدنى لعمر الطفل"
                type="number"
                min="0"
                value={filterMinChildAge}
                onChange={(e) => setFilterMinChildAge(e.target.value)}
              />
              <Input
                labelAr="الحد الأقصى لعمر الطفل"
                type="number"
                min="0"
                value={filterMaxChildAge2}
                onChange={(e) => setFilterMaxChildAge2(e.target.value)}
              />
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={applyFilters}>
              <Search className="w-4 h-4" />
              بحث
            </Button>
            <Button variant="secondary" size="sm" onClick={resetFilters}>
              إعادة تعيين
            </Button>
            <Button
              variant={widowFilterActive ? 'primary' : 'secondary'}
              size="sm"
              onClick={handleFindWidowWithMostChildren}
              className="mr-auto"
            >
              <Users className="w-4 h-4" />
              {widowFilterActive ? '✓ المستفيد ذو أكثر أطفال (نشط)' : 'البحث عن المستفيد ذو أكثر أطفال'}
            </Button>
          </div>
        </Card>
      )}

      {/* ---- Table ---- */}
      <Card>
        {isLoading ? (
          <LoadingSpinner />
        ) : displayBeneficiaries.length === 0 ? (
          <EmptyState
            message="لا يوجد مستفيدون حالياً. أضف مستفيداً جديداً للبدء."
            icon={<Users className="w-12 h-12" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="py-3 px-4 text-right font-medium w-8"></th>
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
                {displayBeneficiaries.map((b: Beneficiary) => {
                  const age = b.dateOfBirth ? calculateAge(b.dateOfBirth) : null
                  const isExpanded = expandedRows.has(b.id)
                  return (
                    <Fragment key={b.id}>
                      <tr
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => openDetail(b)}
                      >
                        <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                          {(b.children || []).length > 0 && (
                            <button
                              onClick={() => toggleExpand(b.id)}
                              className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                              title={isExpanded ? 'إخفاء الأطفال' : 'عرض الأطفال'}
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-3 font-semibold text-primary-700" dir="ltr">
                          {b.reference || '—'}
                        </td>
                        <td className="py-3 px-3 font-medium text-gray-900">
                          {b.lastNameAr} {b.firstNameAr}
                        </td>
                        <td className="py-3 px-3 text-gray-600 hidden md:table-cell">{b.nationalCardNumber}</td>
                        <td className="py-3 px-3 text-gray-600 hidden lg:table-cell" dir="ltr">
                          {b.phone}
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant={ATTRIBUT_BADGE_VARIANT[b.attribut] ?? 'default'}>
                            {ATTRIBUT_LABELS[b.attribut] ?? b.attribut}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-gray-600 hidden sm:table-cell">
                          {age ? age.displayAr : '—'}
                        </td>
                        <td className="py-3 px-3 text-gray-600">
                          <span className="inline-flex items-center gap-1">
                            <Baby className="w-3.5 h-3.5" />
                            {b.children.length}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-600 hidden lg:table-cell">
                          {getCaisseName(b.caisseId)}
                          {b.subCategoryId && (
                            <span className="text-gray-400 text-xs block mt-0.5">
                              ({getSubCaisseName(b.caisseId, b.subCategoryId)})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-center gap-1">
                            <button className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors" title="عرض التفاصيل"
                              onClick={(e) => { e.stopPropagation(); openDetail(b) }}>
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="تعديل"
                              onClick={(e) => { e.stopPropagation(); openEditForm(b) }}>
                              <Edit className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 rounded-lg text-gray-400 hover:text-danger-500 hover:bg-red-50 transition-colors" title="حذف"
                              onClick={(e) => { e.stopPropagation(); handleDelete(b.id) }}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && b.children && b.children.length > 0 && (
                        <tr key={`${b.id}-children`}>
                          <td colSpan={10} className="px-4 pb-4 pt-1 bg-gray-50">
                            <div className="rounded-lg border border-gray-200 overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-gray-100 text-gray-600">
                                    <th className="py-2 px-3 text-right font-medium">الاسم</th>
                                    <th className="py-2 px-3 text-right font-medium">الجنس</th>
                                    <th className="py-2 px-3 text-right font-medium">العمر</th>
                                    <th className="py-2 px-3 text-right font-medium">الحالة الصحية</th>
                                    <th className="py-2 px-3 text-right font-medium">المستوى الدراسي</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {b.children.map((child: any, ci: number) => (
                                    <tr key={ci} className="border-t border-gray-100 hover:bg-white">
                                      <td className="py-2 px-3 font-medium text-gray-900">{child.lastNameAr} {child.firstNameAr}</td>
                                      <td className="py-2 px-3 text-gray-600">{child.gender === 'female' ? 'أنثى' : 'ذكر'}</td>
                                      <td className="py-2 px-3 text-gray-600">{calculateAge(child.dateOfBirth).displayAr}</td>
                                      <td className="py-2 px-3"><Badge variant={child.healthStatus === 'bonne_sante' ? 'success' : child.healthStatus === 'malade' ? 'warning' : 'info'}>{HEALTH_STATUS_LABELS[child.healthStatus] || child.healthStatus}</Badge></td>
                                      <td className="py-2 px-3 text-gray-600">{getGradeName(child.schoolGradeId)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ---- Add / Edit Form Modal ---- */}
      <Modal
        isOpen={showFormModal}
        onClose={closeFormModal}
        title={editingId ? 'تعديل مستفيد' : 'إضافة مستفيد جديد'}
        size="xl"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
          {/* Names */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-100 pb-2">الاسم</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input labelAr="الاسم بالعربية" value={form.firstNameAr} onChange={(e) => handleFormChange('firstNameAr', e.target.value)} required />
              <Input labelAr="اللقب بالعربية" value={form.lastNameAr} onChange={(e) => handleFormChange('lastNameAr', e.target.value)} required />
              <Input labelAr="الاسم باللاتينية" value={form.firstName} onChange={(e) => handleFormChange('firstName', e.target.value)} dir="ltr" required />
              <Input labelAr="اللقب باللاتينية" value={form.lastName} onChange={(e) => handleFormChange('lastName', e.target.value)} dir="ltr" required />
            </div>
          </div>

          {/* Address */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">العنوان</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input labelAr="العنوان بالعربية" value={form.addressAr} onChange={(e) => handleFormChange('addressAr', e.target.value)} required />
              <Input labelAr="العنوان باللاتينية" value={form.address} onChange={(e) => handleFormChange('address', e.target.value)} dir="ltr" required />
            </div>
          </div>

          {/* Identity & Contact */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">المعلومات الشخصية</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input labelAr="رقم البطاقة الوطنية" value={form.nationalCardNumber} onChange={(e) => handleFormChange('nationalCardNumber', e.target.value)} required />
              <Input labelAr="رقم الهاتف" value={form.phone} onChange={(e) => handleFormChange('phone', e.target.value)} dir="ltr" required />
              <div className="space-y-1">
                <Input labelAr="تاريخ الميلاد" type="date" value={form.dateOfBirth} onChange={(e) => handleFormChange('dateOfBirth', e.target.value)} required />
                {form.dateOfBirth && (
                  <p className="text-xs text-gray-500">العمر: {calculateAge(form.dateOfBirth).displayAr}</p>
                )}
              </div>
            </div>
          </div>

          {/* Classification */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">التصنيف</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SearchableSelect
                labelAr="الصفة"
                options={attributOptions}
                value={form.attribut}
                onChange={(val) => handleFormChange('attribut', val)}
                required
              />
              <SearchableSelect
                labelAr="الجنس"
                options={[{ value: 'male', label: 'ذكر' }, { value: 'female', label: 'أنثى' }]}
                value={form.gender || 'male'}
                onChange={(val) => handleFormChange('gender', val)}
              />
              <div className="space-y-1">
                <Input labelAr="باسم من" placeholder="مثال: باسم الأرملة فاطمة" value={form.onBehalfOf} onChange={(e) => handleFormChange('onBehalfOf', e.target.value)} />
                <p className="text-xs text-gray-400">عندما يأتي طفل نيابة عن أرملة أو مستفيد آخر</p>
              </div>
            </div>
          </div>

          {/* Situation */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">الحالة</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SearchableSelect
                labelAr="الحالة"
                options={HEALTH_STATUS_OPTIONS}
                value={form.situationAr}
                onChange={(val) => handleFormChange('situationAr', val)}
              />
              <Input labelAr="تفاصيل الحالة" placeholder="تفاصيل إضافية..." value={form.situation} onChange={(e) => handleFormChange('situation', e.target.value)} />
            </div>
          </div>

          {/* Children */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700">الأطفال</h4>
              <Button size="sm" variant="secondary" onClick={addChild}>
                <Plus className="w-4 h-4" /> إضافة طفل
              </Button>
            </div>
            {form.children.length > 0 && (
              <div className="space-y-4">
                {form.children.map((child, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-medium text-gray-700">الطفل {index + 1}</span>
                      <button onClick={() => removeChild(index)} className="text-xs text-red-500 hover:text-red-700">✕ إزالة</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input labelAr="الاسم بالعربية" value={child.firstNameAr} onChange={(e) => updateChild(index, 'firstNameAr', e.target.value)} />
                      <Input labelAr="اللقب بالعربية" value={child.lastNameAr} onChange={(e) => updateChild(index, 'lastNameAr', e.target.value)} />
                      <Input labelAr="تاريخ الميلاد" type="date" value={child.dateOfBirth} onChange={(e) => updateChild(index, 'dateOfBirth', e.target.value)} />
                      <SearchableSelect
                        labelAr="جنس الطفل"
                        options={[{ value: 'male', label: 'ذكر' }, { value: 'female', label: 'أنثى' }]}
                        value={child.gender || 'male'}
                        onChange={(val) => updateChild(index, 'gender', val)}
                      />
                      <SearchableSelect
                        labelAr="الحالة الصحية"
                        options={HEALTH_STATUS_OPTIONS}
                        value={child.healthStatus}
                        onChange={(val) => updateChild(index, 'healthStatus', val)}
                      />
                      <Input labelAr="تفاصيل الحالة الصحية" placeholder="تفاصيل إضافية..." value={child.healthDetails || ''} onChange={(e) => updateChild(index, 'healthDetails', e.target.value)} />
                      {gradeOptions.length > 0 && (
                        <SearchableSelect
                          labelAr="المستوى الدراسي"
                          options={gradeOptions}
                          value={child.schoolGradeId || ''}
                          onChange={(val) => updateChild(index, 'schoolGradeId', val)}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <TextArea labelAr="ملاحظات" value={form.notes} onChange={(e) => handleFormChange('notes', e.target.value)} />

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <Button variant="secondary" onClick={closeFormModal}>إلغاء</Button>
            <Button onClick={handleSave}>{editingId ? 'تحديث' : 'إضافة'}</Button>
          </div>
        </div>
      </Modal>

      {/* ---- Detail View Modal ---- */}
      {selectedBeneficiary && (
        <Modal isOpen={showDetailModal} onClose={closeDetail} title={`${selectedBeneficiary.lastNameAr} ${selectedBeneficiary.firstNameAr}`} size="xl">
          <div className="space-y-6" dir="rtl">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-100 pb-2">المعلومات الشخصية</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">الرمز المرجعي</span><span className="font-semibold text-primary-700" dir="ltr">{selectedBeneficiary.reference || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">الاسم بالعربية</span><span className="font-medium text-gray-900">{selectedBeneficiary.lastNameAr} {selectedBeneficiary.firstNameAr}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">الاسم باللاتينية</span><span className="font-medium text-gray-900" dir="ltr">{selectedBeneficiary.firstName} {selectedBeneficiary.lastName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">رقم البطاقة الوطنية</span><span className="font-medium text-gray-900">{selectedBeneficiary.nationalCardNumber}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">الهاتف</span><span className="font-medium text-gray-900" dir="ltr">{selectedBeneficiary.phone}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">تاريخ الميلاد</span><span className="font-medium text-gray-900">{selectedBeneficiary.dateOfBirth ? `${formatDate(selectedBeneficiary.dateOfBirth)} (${calculateAge(selectedBeneficiary.dateOfBirth).displayAr})` : '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">الصفة</span><Badge variant={ATTRIBUT_BADGE_VARIANT[selectedBeneficiary.attribut] ?? 'default'}>{ATTRIBUT_LABELS[selectedBeneficiary.attribut] ?? selectedBeneficiary.attribut}</Badge></div>
                <div className="flex justify-between"><span className="text-gray-500">الجنس</span><span className="font-medium text-gray-900">{selectedBeneficiary.gender === 'female' ? 'أنثى' : 'ذكر'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">العنوان بالعربية</span><span className="font-medium text-gray-900">{selectedBeneficiary.addressAr || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">العنوان باللاتينية</span><span className="font-medium text-gray-900" dir="ltr">{selectedBeneficiary.address || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">الصندوق</span><span className="font-medium text-gray-900">{getCaisseName(selectedBeneficiary.caisseId)}{selectedBeneficiary.subCategoryId ? <span className="text-gray-500 mr-2">({getSubCaisseName(selectedBeneficiary.caisseId, selectedBeneficiary.subCategoryId)})</span> : ''}</span></div>
                {selectedBeneficiary.onBehalfOfName && <div className="flex justify-between"><span className="text-gray-500">باسم من</span><span className="font-medium text-gray-900">{selectedBeneficiary.onBehalfOfName}</span></div>}
                {(selectedBeneficiary.situationAr || selectedBeneficiary.situation) && <div className="flex justify-between md:col-span-2"><span className="text-gray-500">الحالة</span><span className="font-medium text-gray-900">{HEALTH_STATUS_LABELS[selectedBeneficiary.situationAr] || selectedBeneficiary.situationAr}{selectedBeneficiary.situation && <span className="text-gray-400 mr-2" dir="ltr">({selectedBeneficiary.situation})</span>}</span></div>}
                {selectedBeneficiary.notes && <div className="flex justify-between md:col-span-2"><span className="text-gray-500">ملاحظات</span><span className="font-medium text-gray-900">{selectedBeneficiary.notes}</span></div>}
              </div>
            </div>

            {selectedBeneficiary.children.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-100 pb-2">الأطفال ({selectedBeneficiary.children.length})</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="py-2 px-3 text-right font-medium">الاسم</th>
                        <th className="py-2 px-3 text-right font-medium">الجنس</th>
                        <th className="py-2 px-3 text-right font-medium">العمر</th>
                        <th className="py-2 px-3 text-right font-medium">الحالة الصحية</th>
                        <th className="py-2 px-3 text-right font-medium">المستوى الدراسي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBeneficiary.children.map((child: any) => (
                        <tr key={child.id} className="border-b border-gray-100">
                          <td className="py-2 px-3">{child.lastNameAr} {child.firstNameAr}</td>
                          <td className="py-2 px-3">{child.gender === 'female' ? 'أنثى' : 'ذكر'}</td>
                          <td className="py-2 px-3">{calculateAge(child.dateOfBirth).displayAr}</td>
                          <td className="py-2 px-3"><Badge variant={child.healthStatus === 'bonne_sante' ? 'success' : child.healthStatus === 'malade' ? 'warning' : 'info'}>{HEALTH_STATUS_LABELS[child.healthStatus] || child.healthStatus}</Badge></td>
                          <td className="py-2 px-3">{getGradeName(child.schoolGradeId)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {beneficiaryAllocations.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-100 pb-2">التبرعات الواردة ({beneficiaryAllocations.length})</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="py-2 px-3 text-right font-medium">المتبرع</th>
                        <th className="py-2 px-3 text-right font-medium">المبلغ</th>
                        <th className="py-2 px-3 text-right font-medium">المصرف</th>
                        <th className="py-2 px-3 text-right font-medium">المتبقي</th>
                        <th className="py-2 px-3 text-right font-medium">الحالة</th>
                        <th className="py-2 px-3 text-right font-medium">التاريخ</th>
                        <th className="py-2 px-3 text-right font-medium">رقم الوصل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {beneficiaryAllocations.map((a: DonationAllocation) => {
                        const spent = a.amount - a.remainingAmount;
                        return (
                        <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3 font-medium text-gray-900">{a.donor.lastNameAr} {a.donor.firstNameAr}</td>
                          <td className="py-2 px-3"><Badge variant="success">{formatCurrency(a.amount)}</Badge></td>
                          <td className="py-2 px-3">{spent > 0 ? formatCurrency(spent) : '—'}</td>
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
                          <td className="py-2 px-3 text-gray-400 text-xs" dir="ltr">{a.creditTransaction?.receiptNumber || '—'}</td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
                {/* Total allocations summary */}
                <div className="mt-2 p-3 bg-gray-50 rounded-lg flex gap-6 text-sm">
                  <span>إجمالي التبرعات: <strong className="text-green-600">{formatCurrency(beneficiaryAllocations.reduce((sum: number, a: DonationAllocation) => sum + a.amount, 0))}</strong></span>
                  <span>إجمالي المصروف: <strong className="text-blue-600">{formatCurrency(beneficiaryAllocations.reduce((sum: number, a: DonationAllocation) => sum + (a.amount - a.remainingAmount), 0))}</strong></span>
                  <span>المتبقي: <strong className="text-amber-600">{formatCurrency(beneficiaryAllocations.reduce((sum: number, a: DonationAllocation) => sum + a.remainingAmount, 0))}</strong></span>
                </div>
              </div>
            )}

            {/* Debit transactions (money actually disbursed) */}
            {beneficiaryDebits.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-100 pb-2">المبالغ المصروفة للمستفيد ({beneficiaryDebits.length})</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="py-2 px-3 text-right font-medium">التاريخ</th>
                        <th className="py-2 px-3 text-right font-medium">المبلغ</th>
                        <th className="py-2 px-3 text-right font-medium">مصدر التمويل</th>
                        <th className="py-2 px-3 text-right font-medium">الصندوق</th>
                        <th className="py-2 px-3 text-right font-medium">الحالة</th>
                        <th className="py-2 px-3 text-right font-medium">الوصف</th>
                        <th className="py-2 px-3 text-right font-medium">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {beneficiaryDebits.map((tx: any) => {
                        const caisse = caisses.find((c: any) => c.id === tx.caisseId);
                        return (
                        <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3 text-gray-700">{formatDate(tx.date)}</td>
                          <td className="py-2 px-3 font-semibold text-red-600">-{formatCurrency(tx.amount)}</td>
                          <td className="py-2 px-3 text-gray-600">{tx.fundSource === 'banque' ? 'بنك' : 'صندوق نقدي'}</td>
                          <td className="py-2 px-3 text-gray-600">{caisse?.nameAr || '—'}</td>
                          <td className="py-2 px-3">
                            {(tx.status || 'completed') === 'pending' ? <Badge variant="warning">معلق</Badge> :
                             (tx.status || 'completed') === 'cancelled' ? <Badge variant="danger">ملغي</Badge> :
                             <Badge variant="success">مكتمل</Badge>}
                          </td>
                          <td className="py-2 px-3 text-gray-500 text-xs max-w-[150px] truncate">{tx.descriptionAr || '—'}</td>
                          <td className="py-2 px-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const caisse = caisses.find((c: any) => c.id === tx.caisseId)
                                const amount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : (tx.amount || 0)
                                const wordsAr = tx.amountInWordsAr && !tx.amountInWordsAr.match(/^\d/) ? tx.amountInWordsAr : numberToArabicWords(amount)
                                const wordsFr = tx.amountInWords && !tx.amountInWords.match(/^\d/) ? tx.amountInWords : numberToFrenchWords(amount)
                                printReceipt(
                                  'وصل صرف', 'Bon de Sortie',
                                  `<div class="col"><div class="row"><span class="lbl">رقم العملية</span><span class="val">${tx.id.slice(0, 8) || '—'}</span></div>
<div class="row"><span class="lbl">التاريخ</span><span class="val">${formatDate(tx.date)}</span></div>
<div class="row"><span class="lbl">المستفيد</span><span class="val">${selectedBeneficiary?.lastNameAr || ''} ${selectedBeneficiary?.firstNameAr || ''}</span></div></div>
<div class="col"><div class="row"><span class="lbl">الصندوق</span><span class="val">${caisse?.nameAr || '—'}</span></div>
<div class="row"><span class="lbl">المصدر</span><span class="val">${tx.fundSource === 'banque' ? 'بنك' : 'صندوق نقدي'}</span></div>
${tx.descriptionAr ? `<div class="row"><span class="lbl">الوصف</span><span class="val">${tx.descriptionAr}</span></div>` : ''}</div>`,
                                  'background:#fff0f0;color:#dc2626',
                                  `- ${formatCurrency(amount)}`, wordsAr, wordsFr,
                                  'إمضاء المستفيد', 'ختم الجمعية',
                                  association?.nameAr
                                )
                              }}
                              className="p-1 text-gray-400 hover:text-primary-600"
                              title="طباعة"
                            >
                              <Printer size={14} />
                            </button>
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 p-3 bg-red-50 rounded-lg text-sm">
                  <span>إجمالي المبالغ المصروفة: <strong className="text-red-600">{formatCurrency(beneficiaryDebits
                    .filter((tx: any) => (tx.status || 'completed') !== 'cancelled')
                    .reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0)
                  )}</strong> <span className="text-gray-400 text-xs mr-2">({beneficiaryDebits.filter((tx: any) => (tx.status || 'completed') === 'cancelled').length} ملغية غير محتسبة)</span></span>
                </div>
              </div>
            )}

            {/* Medical referrals (التوجيه الطبي) */}
            {beneficiaryReferrals.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-100 pb-2">التوجيه الطبي ({beneficiaryReferrals.length})</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="py-2 px-3 text-right font-medium">التاريخ</th>
                        <th className="py-2 px-3 text-right font-medium">الطبيب</th>
                        <th className="py-2 px-3 text-right font-medium">المبلغ</th>
                        <th className="py-2 px-3 text-right font-medium">الحالة</th>
                        <th className="py-2 px-3 text-right font-medium">الصندوق</th>
                        <th className="py-2 px-3 text-right font-medium">التحليل</th>
                        <th className="py-2 px-3 text-right font-medium">المستشفى</th>
                        <th className="py-2 px-3 text-right font-medium">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {beneficiaryReferrals.map((ref: any) => {
                        const caisse = caisses.find((c: any) => c.id === ref.caisseId);
                        return (
                        <tr key={ref.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3 text-gray-700">{formatDate(ref.date)}</td>
                          <td className="py-2 px-3 font-medium text-gray-900">{ref.doctorNameAr}</td>
                          <td className="py-2 px-3"><Badge variant="warning">{formatCurrency(ref.amount)}</Badge></td>
                          <td className="py-2 px-3">
                            {(ref.status || 'pending') === 'pending' ? <Badge variant="warning">قيد الانتظار</Badge> :
                             (ref.status || 'pending') === 'completed' ? <Badge variant="success">مكتمل</Badge> :
                             <Badge variant="danger">ملغي</Badge>}
                          </td>
                          <td className="py-2 px-3 text-gray-600">{caisse?.nameAr || '—'}</td>
                          <td className="py-2 px-3 text-gray-600">{ref.analysisTypeAr || '—'}</td>
                          <td className="py-2 px-3 text-gray-600">{ref.hospitalAr || '—'}</td>
                          <td className="py-2 px-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const caisse = caisses.find((c: any) => c.id === ref.caisseId)
                                const subCat = caisse?.subCategories.find((s: any) => s.id === ref.subCategoryId)
                                const caisseRow = caisse ? `<div class="row"><span class="lbl">الصندوق</span><span class="val">${caisse.nameAr}</span></div>` : ''
                                const subCatRow = subCat ? `<div class="row"><span class="lbl">الفئة الفرعية</span><span class="val">${subCat.nameAr}</span></div>` : ''
                                const childrenHtml = ref.children && Array.isArray(ref.children) && ref.children.length > 0
                                  ? `<div class="row"><span class="lbl">الأطفال المستفيدون</span><span class="val">${ref.children.map((c: any) => c.nameAr || c.name).join(', ')}</span></div>`
                                  : ''
                                printReceipt(
                                  'توجيه طبي', 'Orientation Médicale',
                                  `<div class="col"><div class="row"><span class="lbl">الرمز المرجعي</span><span class="val">${ref.reference || '—'}</span></div>
<div class="row"><span class="lbl">المستفيد</span><span class="val">${ref.beneficiaryNameAr || ''}</span></div>
<div class="row"><span class="lbl">الطبيب</span><span class="val">${ref.doctorNameAr}</span></div>
${ref.analysisTypeAr ? `<div class="row"><span class="lbl">التحليل</span><span class="val">${ref.analysisTypeAr}</span></div>` : ''}</div>
<div class="col">${caisseRow}${subCatRow}
<div class="row"><span class="lbl">التاريخ</span><span class="val">${formatDate(ref.date)}</span></div>
${ref.hospitalAr ? `<div class="row"><span class="lbl">المستشفى</span><span class="val">${ref.hospitalAr}</span></div>` : ''}
${childrenHtml}
${ref.notes ? `<div class="row"><span class="lbl">ملاحظات</span><span class="val">${ref.notes}</span></div>` : ''}</div>`,
                                  'color:#2563eb',
                                  formatCurrency(ref.amount), ref.amountInWordsAr || '', '',
                                  'توقيع المسؤول', 'ختم الجمعية',
                                  association?.nameAr
                                )
                              }}
                              className="p-1 text-gray-400 hover:text-primary-600"
                              title="طباعة"
                            >
                              <Printer size={14} />
                            </button>
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 p-3 bg-orange-50 rounded-lg text-sm">
                  <span>إجمالي التوجيه الطبي: <strong className="text-orange-600">{formatCurrency(beneficiaryReferrals
                    .filter((ref: any) => (ref.status || 'pending') !== 'cancelled')
                    .reduce((sum: number, ref: any) => sum + (ref.amount || 0), 0)
                  )}</strong> <span className="text-gray-400 text-xs mr-2">({beneficiaryReferrals.filter((ref: any) => (ref.status || 'pending') === 'cancelled').length} ملغية غير محتسبة)</span></span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button size="sm" variant="secondary" onClick={() => handlePrintCard(selectedBeneficiary)}>
                <Printer className="w-4 h-4" /> بطاقة المستفيد
              </Button>
              <Button size="sm" variant="primary" onClick={() => handlePrintFullFile(
                selectedBeneficiary,
                beneficiaryAllocations,
                beneficiaryDebits,
                beneficiaryReferrals
              )}>
                <Printer className="w-4 h-4" /> طباعة الملف
              </Button>
              <Button size="sm" variant="secondary" onClick={closeDetail}>إغلاق</Button>
              <Button size="sm" onClick={() => { closeDetail(); openEditForm(selectedBeneficiary) }}>
                <Edit className="w-4 h-4" /> تعديل
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )

  return (
    <div className="space-y-6" dir="rtl">
      {/* ---- Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">المستفيدون</h1>
          <p className="text-sm text-gray-500 mt-1">
            إدارة المستفيدين وبياناتهم — إجمالي: {displayBeneficiaries.length}{widowFilterActive ? ' (الأكثر أطفالاً — طبقاً للفلاتر المطبقة)' : ''}
          </p>
        </div>
        {activeTab === 'list' && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-4 h-4" /> بحث متقدم
            </Button>
            <Button size="sm" onClick={openAddForm}>
              <Plus className="w-4 h-4" /> إضافة مستفيد
            </Button>
          </div>
        )}
      </div>

      {/* ---- Tabs ---- */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-2 sm:gap-4">
          <button onClick={() => setActiveTab('list')}
            className={`flex-1 sm:flex-initial pb-3 px-3 sm:px-1 text-sm font-medium border-b-2 transition-colors min-h-[44px] ${activeTab === 'list' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            <Users className="inline-block w-4 h-4 ml-2" /> المستفيدون
          </button>
          <button onClick={handleSettingsTab}
            className={`flex-1 sm:flex-initial pb-3 px-3 sm:px-1 text-sm font-medium border-b-2 transition-colors min-h-[44px] ${activeTab === 'settings' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            <Settings className="inline-block w-4 h-4 ml-2" /> إدارة التصنيفات
          </button>
        </nav>
      </div>

      {activeTab === 'list' ? renderListTab() : (
        <div className="space-y-8">
          {/* ---- Attributs Section ---- */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary-600" />
              الصفات
            </h3>
            <p className="text-sm text-gray-500 mb-4">إضافة وتعديل وحذف الصفات (الخصائص) للمستفيدين</p>
            <div className="flex flex-col sm:flex-row gap-3 items-end mb-4">
              <Input labelAr="الاسم بالعربية" value={newAttrNameAr} onChange={(e) => setNewAttrNameAr(e.target.value)} placeholder="مثال: يتيم" />
              <Input labelAr="الاسم باللاتينية" value={newAttrName} onChange={(e) => setNewAttrName(e.target.value)} placeholder="Ex: orphelin" dir="ltr" />
              <Button onClick={handleAddAttribut} disabled={!newAttrNameAr.trim()}>إضافة</Button>
            </div>
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-right py-3 px-4 font-medium text-gray-500">بالعربية</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500">باللاتينية</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-500">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attributs.map((a: BeneficiaryAttribut) => (
                      <tr key={a.name} className="border-b border-gray-100 hover:bg-gray-50">
                        {editAttrId === a.name ? (
                          <>
                            <td className="py-2 px-4"><input value={editAttrNameAr} onChange={(e) => setEditAttrNameAr(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" /></td>
                            <td className="py-2 px-4"><input value={editAttrName} onChange={(e) => setEditAttrName(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" dir="ltr" /></td>
                            <td className="py-2 px-4 text-center flex gap-1 justify-center">
                              <Button size="sm" onClick={handleUpdateAttribut}>حفظ</Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditAttrId(null)}>إلغاء</Button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 px-4 font-medium text-gray-900">{a.nameAr}</td>
                            <td className="py-3 px-4 text-gray-600">{a.name}</td>
                            <td className="py-3 px-4 text-center">
                              <button onClick={() => { setEditAttrId(a.name); setEditAttrNameAr(a.nameAr); setEditAttrName(a.name); }} className="p-1.5 text-gray-400 hover:text-primary-600 rounded"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteAttribut(a.name)} className="p-1.5 text-gray-400 hover:text-danger-500 rounded"><Trash2 className="w-4 h-4" /></button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* ---- School Grades Section ---- */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-primary-600" />
              المستوى الدراسي
            </h3>
            <p className="text-sm text-gray-500 mb-4">إدارة المستويات الدراسية للأطفال</p>
            <div className="flex flex-col sm:flex-row gap-3 items-end mb-4">
              <Input labelAr="الاسم بالعربية" value={newGradeNameAr} onChange={(e) => setNewGradeNameAr(e.target.value)} placeholder="مثال: السنة الأولى" />
              <Input labelAr="الاسم باللاتينية" value={newGradeName} onChange={(e) => setNewGradeName(e.target.value)} placeholder="Ex: CP1" dir="ltr" />
              <Button onClick={handleAddGrade} disabled={!newGradeNameAr.trim()}>إضافة</Button>
            </div>
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-right py-3 px-4 font-medium text-gray-500">بالعربية</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500">باللاتينية</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-500">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schoolGrades.map((g: any) => (
                      <tr key={g.id} className="border-b border-gray-100 hover:bg-gray-50">
                        {editGradeId === g.id ? (
                          <>
                            <td className="py-2 px-4"><input value={editGradeNameAr} onChange={(e) => setEditGradeNameAr(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" /></td>
                            <td className="py-2 px-4"><input value={editGradeName} onChange={(e) => setEditGradeName(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" dir="ltr" /></td>
                            <td className="py-2 px-4 text-center flex gap-1 justify-center">
                              <Button size="sm" onClick={handleUpdateGrade}>حفظ</Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditGradeId(null)}>إلغاء</Button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 px-4 font-medium text-gray-900">{g.nameAr}</td>
                            <td className="py-3 px-4 text-gray-600">{g.name}</td>
                            <td className="py-3 px-4 text-center">
                              <button onClick={() => { setEditGradeId(g.id); setEditGradeNameAr(g.nameAr); setEditGradeName(g.name); }} className="p-1.5 text-gray-400 hover:text-primary-600 rounded"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteGrade(g.id)} className="p-1.5 text-gray-400 hover:text-danger-500 rounded"><Trash2 className="w-4 h-4" /></button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                    {schoolGrades.length === 0 && (
                      <tr><td colSpan={3} className="py-8 text-center text-gray-400">لا توجد مستويات دراسية بعد. أضف مستوى جديداً.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}