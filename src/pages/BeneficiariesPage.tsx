import { useState, Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, Button, Input, SearchableSelect, Modal, Badge, TextArea, EmptyState, LoadingSpinner } from '../components/common/UI'
import { calculateAge, getAgeDisplay, formatDate, formatCurrency, numberToArabicWords, numberToFrenchWords, localizedDesc } from '../utils/helpers'
import { dirForInput } from '../utils/localized'
import { printReceipt, printBeneficiaryCard } from '../lib/receipt'
import { Plus, Search, Filter, Eye, Edit, Trash2, Users, Baby, Settings, FolderTree, Printer, ChevronDown, ChevronUp } from 'lucide-react'
import type { Beneficiary, Child, BeneficiaryAttribut } from '../types'
import { useBeneficiaries, useCreateBeneficiary, useUpdateBeneficiary, useDeleteBeneficiary } from '../hooks/useBeneficiaries'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { caissesApi, attributsApi, inventoryApi, api, financeApi, medicalApi } from '../lib/api'
import type { DonationAllocation } from '../types'
import { useAuth } from '../hooks/useAuth'

// ---- Constants ----

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
  firstName: string
  lastName: string
  address: string
  phone: string
  nationalCardNumber: string
  dateOfBirth: string
  attribut: string
  gender: string
  onBehalfOf: string
  situation: string
  caisseId: string
  subCategoryId: string
  children: (Omit<Child, 'id'> & { id?: string })[]
  notes: string
}

function emptyForm(): BeneficiaryFormData {
  return {
    firstName: '',
    lastName: '',
    address: '',
    phone: '',
    nationalCardNumber: '',
    dateOfBirth: '',
    attribut: '',
    gender: 'male',
    onBehalfOf: '',
    situation: '',
    caisseId: '',
    subCategoryId: '',
    children: [],
    notes: '',
  }
}

function beneficiaryToForm(b: Beneficiary): BeneficiaryFormData {
  return {
    firstName: b.firstName,
    lastName: b.lastName,
    address: b.address,
    phone: b.phone,
    nationalCardNumber: b.nationalCardNumber,
    dateOfBirth: b.dateOfBirth,
    attribut: b.attribut,
    gender: b.gender ?? 'male',
    onBehalfOf: b.onBehalfOfName ?? '',
    situation: b.situation ?? '',
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
  const { t, i18n } = useTranslation();
  const ATTRIBUT_LABELS: Record<string, string> = {
    veuve: t('beneficiaries.widow'),
    orphelin: t('beneficiaries.orphan'),
    personne_agee: t('beneficiaries.elderly'),
    handicape: t('beneficiaries.disabled'),
    famille_demunie: t('beneficiaries.needyFamily'),
    autre: t('beneficiaries.other'),
  }

  const HEALTH_STATUS_LABELS: Record<string, string> = {
    bonne_sante: t('beneficiaries.goodHealth'),
    malade: t('beneficiaries.sick'),
    handicape: t('beneficiaries.disabled'),
    autre: t('beneficiaries.other'),
  }

  const HEALTH_STATUS_OPTIONS = Object.entries(HEALTH_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  }))

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
  const [newAttrName, setNewAttrName] = useState('')
  const [editAttrId, setEditAttrId] = useState<string | null>(null)
  const [editAttrName, setEditAttrName] = useState('')

  // School grade management state
  const [newGradeName, setNewGradeName] = useState('')
  const [editGradeId, setEditGradeId] = useState<string | null>(null)
  const [editGradeName, setEditGradeName] = useState('')

  const createAttributMutation = useMutation({
    mutationFn: (data: { name: string }) => attributsApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attributs'] }),
  })

  const deleteAttributMutation = useMutation({
    mutationFn: (name: string) => attributsApi.delete(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attributs'] }),
  })

  const createGradeMutation = useMutation({
    mutationFn: (data: { name: string }) => inventoryApi.createSchoolGrade(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['school-grades'] }),
  })
  const deleteGradeMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.deleteSchoolGrade(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['school-grades'] }),
  })

  const handleAddAttribut = async () => {
    if (!newAttrName.trim()) return
    await createAttributMutation.mutateAsync({ name: newAttrName.trim() })
    setNewAttrName('')
  }

  const handleUpdateAttribut = async () => {
    if (!editAttrId || !editAttrName.trim()) return
    await api.put(`/beneficiary-attributs/${encodeURIComponent(editAttrId)}`, {
      name: editAttrName.trim(),
    })
    setEditAttrId(null)
    setEditAttrName('')
    queryClient.invalidateQueries({ queryKey: ['attributs'] })
  }

  const handleDeleteAttribut = async (name: string) => {
    if (!window.confirm(t('beneficiaries.confirmDeleteAttribute'))) return
    try {
      await deleteAttributMutation.mutateAsync(name)
    } catch (err: any) {
      const msg = err?.response?.data?.error || t('beneficiaries.attributeDeleteError')
      window.alert(msg)
    }
  }

  const handleAddGrade = async () => {
    if (!newGradeName.trim()) return
    await createGradeMutation.mutateAsync({ name: newGradeName.trim() })
    setNewGradeName('')
  }

  const handleUpdateGrade = async () => {
    if (!editGradeId || !editGradeName.trim()) return
    await inventoryApi.updateSchoolGrade(editGradeId, { name: editGradeName.trim() })
    setEditGradeId(null); setEditGradeName('')
    queryClient.invalidateQueries({ queryKey: ['school-grades'] })
  }

  const handleDeleteGrade = async (id: string) => {
    if (!window.confirm(t('beneficiaries.confirmDeleteGrade'))) return
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
    label: c.name,
  }))

  const attributOptions = attributs.map((a: BeneficiaryAttribut) => ({
    value: a.name,
    label: a.name,
  }))

  const gradeOptions = schoolGrades.map((g: any) => ({ value: g.id, label: g.name }))

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
      firstName: form.firstName,
      lastName: form.lastName,
      address: form.address,
      phone: form.phone,
      nationalCardNumber: form.nationalCardNumber,
      dateOfBirth: form.dateOfBirth,
      attribut: form.attribut as Beneficiary['attribut'],
      gender: form.gender || 'male',
      onBehalfOfName: form.onBehalfOf || undefined,
      situation: form.situation || undefined,
      caisseId: form.caisseId || undefined,
      subCategoryId: form.subCategoryId || undefined,
      children: form.children.map((c) => ({
        id: c.id || crypto.randomUUID(),
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
    if (!window.confirm(t('beneficiaries.confirmDeleteBeneficiary'))) return
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
    const isLtr = i18n.language !== 'ar';
    const cl = i18n.language;

    // Children as inline grid items (no table, matches Orientation Médicale style)
    const childrenHtml = (b.children || []).length > 0
      ? `<div class="section"><div class="section-title">${t('beneficiaries.children')} (${b.children.length})</div>
         <div class="info"><div class="col"><div class="row"><span class="lbl">${t('receipt.nameAr')}</span>
         ${b.children.map((ch: any) =>
           `<span class="val">${ch.lastName} ${ch.firstName}</span><br>`
         ).join('')}
         </div></div><div class="col"><div class="row"><span class="lbl">${t('receipt.gender')} / ${t('receipt.age')} / ${t('common.status')}</span>
         ${b.children.map((ch: any) =>
           `<span class="val">${ch.gender === 'female' ? t('common.female') : t('common.male')} — ${getAgeDisplay(ch.dateOfBirth)} — ${HEALTH_STATUS_LABELS[ch.healthStatus] || ch.healthStatus}</span><br>`
         ).join('')}
         </div></div></div></div>`
      : ''

    printBeneficiaryCard({
      assocName: association?.name || t('app.title'),
      reference: b.reference || '—',
      lastName: b.lastName,
      firstName: b.firstName,
      nationalCardNumber: b.nationalCardNumber || '—',
      phone: b.phone,
      dateOfBirth: b.dateOfBirth ? formatDate(b.dateOfBirth) : '—',
      ageDisplay: b.dateOfBirth ? getAgeDisplay(b.dateOfBirth) : '—',
      attribut: ATTRIBUT_LABELS[b.attribut] || b.attribut,
      gender: b.gender === 'female' ? t('common.female') : t('common.male'),
      caisseName: caisse?.name || '—',
      situation: b.situation ? `${HEALTH_STATUS_LABELS[b.situation] || b.situation}` : undefined,
      childrenHtml,
      dir: isLtr ? 'ltr' : 'rtl',
      lang: cl,
      labels: {
        title: t('receipt.beneficiaryCard'),
        personalInfo: t('receipt.personalInfo'),
        fullName: t('receipt.fullName'),
        fullName: t('receipt.name'),
        name: t('receipt.nameAr'),
        attribut: t('receipt.attribute'),
        birthDate: t('receipt.birthDate'),
        idNumber: t('receipt.idNumber'),
        fund: t('dashboard.fund'),
        nameLatin: t('receipt.nameLatin'),
        gender: t('receipt.gender'),
        age: t('receipt.age'),
        phone: t('receipt.phone'),
        status: t('common.status'),
        beneficiarySignature: t('receipt.beneficiarySign'),
        stampSignature: t('receipt.stampSignature'),
        print: t('receipt.print')
      }
    })
  }

  // ---- Print Full File (A4) ----
  const handlePrintFullFile = (b: Beneficiary, allocations: DonationAllocation[], debits: any[], referrals: any[]) => {
    const caisse = caisses.find((c: any) => c.id === b.caisseId)
    const isLtr = i18n.language !== 'ar';
    const dir = isLtr ? 'ltr' : 'rtl';

    // personalInfoHtml is now inlined directly in the template

    const childrenHtml = (b.children || []).length > 0 ? `
      <div class="section">
        <div class="section-title">${t('beneficiaries.childrenDetails')} (${b.children.length})</div>
        <table class="data-table">
          <thead><tr><th>${t("beneficiaries.sectionName")}</th><th>${t("beneficiaries.filterGender")}</th><th>${t("receipt.age")}</th><th>${t("common.status")}</th><th>${t("beneficiaries.schoolGrade")}</th></tr></thead>
          <tbody>${b.children.map((ch: any) => `
            <tr>
              <td>${ch.lastName} ${ch.firstName}</td>
              <td>${ch.gender === 'female' ? t('common.female') : t('common.male')}</td>
              <td>${getAgeDisplay(ch.dateOfBirth)}</td>
              <td>${HEALTH_STATUS_LABELS[ch.healthStatus] || ch.healthStatus}</td>
              <td>${getGradeName(ch.schoolGradeId)}</td>
            </tr>`).join('')}</tbody>
        </table>
      </div>` : ''

    const allocsHtml = allocations.length > 0 ? `
      <div class="section">
        <div class="section-title">${t('beneficiaries.titleIncomingDonations')} (${allocations.length})</div>
        <table class="data-table">
          <thead><tr><th>${t('beneficiaries.tableDonor')}</th><th>${t("common.amount")}</th><th>${t('beneficiaries.spent')}</th><th>${t('beneficiaries.remaining')}</th><th>${t("common.status")}</th><th>${t("common.date")}</th></tr></thead>
          <tbody>${allocations.map((a: DonationAllocation) => {
            const spent = a.amount - a.remainingAmount
            const s = a.creditTransaction?.status
            const statusLabel = s === 'pending' ? t('beneficiaries.pendingStatus') : s === 'cancelled' ? t('dashboard.cancelled') : a.remainingAmount <= 0 ? t('dashboard.fullyDisbursed') : a.debitTransactionId ? t('dashboard.partiallyDisbursed') : t('beneficiaries.activeStatus')
          return `<tr>
            <td>${a.donor.lastName} ${a.donor.firstName}</td>
            <td>${formatCurrency(a.amount)}</td>
            <td>${spent > 0 ? formatCurrency(spent) : '—'}</td>
            <td>${a.remainingAmount > 0 ? formatCurrency(a.remainingAmount) : '0'}</td>
            <td>${statusLabel}</td>
            <td>${formatDate(a.createdAt)}</td>
          </tr>`
        }).join('')}</tbody>
        <tfoot><tr>
          <td colspan="2"><strong>${t('beneficiaries.totalLabel')} ${formatCurrency(allocations.reduce((s: number, a: DonationAllocation) => s + a.amount, 0))}</strong></td>
          <td><strong>${formatCurrency(allocations.reduce((s: number, a: DonationAllocation) => s + (a.amount - a.remainingAmount), 0))}</strong></td>
          <td><strong>${formatCurrency(allocations.reduce((s: number, a: DonationAllocation) => s + a.remainingAmount, 0))}</strong></td>
          <td colspan="2"></td>
        </tr></tfoot>
      </table>
      </div>` : ''

    const debitsHtml = debits.length > 0 ? `
      <div class="section">
        <div class="section-title">${t('beneficiaries.titleDisbursed')} (${debits.length})</div>
        <table class="data-table">
          <thead><tr><th>${t("common.date")}</th><th>${t("common.amount")}</th><th>${t('beneficiaries.fundingSource')}</th><th>${t("dashboard.fund")}</th><th>${t("common.status")}</th><th>${t("common.description")}</th></tr></thead>
          <tbody>${debits.map((tx: any) => {
            const c = caisses.find((c: any) => c.id === tx.caisseId)
            const s = (tx.status || 'completed') === 'pending' ? t('dashboard.pending') : (tx.status || 'completed') === 'cancelled' ? t('dashboard.cancelled') : t('dashboard.completed')
            return `<tr>
              <td>${formatDate(tx.date)}</td>
              <td>${formatCurrency(tx.amount)}</td>
              <td>${tx.fundSource === 'banque' ? t('beneficiaries.bankLabel') : t('beneficiaries.cashLabel')}</td>
              <td>${c?.name || '—'}</td>
              <td>${s}</td>
              <td>${tx.description || '—'}</td>
            </tr>`
          }).join('')}</tbody>
        </table>
      </div>` : ''

    const refsHtml = referrals.length > 0 ? `
      <div class="section">
        <div class="section-title">${t('beneficiaries.titleMedicalReferrals')} (${referrals.length})</div>
        <table class="data-table">
          <thead><tr><th>${t("common.date")}</th><th>${t('beneficiaries.doctor')}</th><th>${t("common.amount")}</th><th>${t('beneficiaries.analysis')}</th><th>${t('beneficiaries.hospital')}</th><th>${t("common.status")}</th><th>${t("beneficiaries.referralChildren")}</th></tr></thead>
          <tbody>${referrals.map((ref: any) => {
            const childrenNames = ref.children && Array.isArray(ref.children) && ref.children.length > 0
              ? ref.children.map((c: any) => c.name).join(', ')
              : '—'
            const refStatus = (ref.status || 'pending') === 'pending' ? t('dashboard.pending') : (ref.status || 'pending') === 'completed' ? t('dashboard.completed') : t('dashboard.cancelled')
            return `<tr>
              <td>${formatDate(ref.date)}</td>
              <td>${ref.doctorName}</td>
              <td>${formatCurrency(ref.amount)}</td>
              <td>${ref.analysisType || '—'}</td>
              <td>${ref.hospital || '—'}</td>
              <td>${refStatus}</td>
              <td>${childrenNames}</td>
            </tr>`
          }).join('')}</tbody>
        </table>
      </div>` : ''

    const fullHtml = `
      <!DOCTYPE html><html dir="${dir}"><head><meta charset="utf-8">
      <style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: ${dir}; font-size: 11.5px; color: #1a1a1a; padding: 0; line-height: 1.6; background: #fff; }
        .page-wrap { width: 100%; min-height: 100vh; padding: 25mm 25mm 20mm 25mm; }
        @media print { body { background: #fff; } .page-wrap { padding: 25mm 25mm 20mm 25mm; } }
        .header { text-align: center; margin-bottom: 22px; padding-bottom: 12px; border-bottom: 3px double #2563eb; }
        .header h1 { font-size: 22px; color: #1e40af; margin: 0 0 4px; }
        .header .sub { font-size: 11px; color: #6b7280; }
        .section { margin-bottom: 18px; page-break-inside: avoid; }
        .section-title { font-size: 14px; font-weight: 700; color: #1e40af; margin: 0 0 10px; padding: 6px 12px; background: #eff6ff; border-${isLtr ? 'left' : 'right'}: 4px solid #2563eb; border-radius: ${isLtr ? '0 4px 4px 0' : '4px 0 0 4px'}; }
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
          <h1>${t('beneficiaries.printFile')}</h1>
          <div class="sub">${b.reference || ''}</div>
        </div>
        <div class="section">
          <div class="section-title">${t("beneficiaries.personalInfo")}</div>
          <div class="info-grid">
            <div class="item"><span class="lbl">${t('beneficiaries.nameAr')}</span><span class="val">${b.lastName} ${b.firstName}</span></div>
            <div class="item"><span class="lbl">${t('beneficiaries.nameLatin')}</span><span class="val">${b.firstName} ${b.lastName}</span></div>
            <div class="item"><span class="lbl">${t("receipt.idNumber")}</span><span class="val">${b.nationalCardNumber || '—'}</span></div>
            <div class="item"><span class="lbl">${t("receipt.phone")}</span><span class="val">${b.phone}</span></div>
            <div class="item"><span class="lbl">${t("receipt.birthDate")}</span><span class="val">${b.dateOfBirth ? `${formatDate(b.dateOfBirth)} (${getAgeDisplay(b.dateOfBirth)})` : '—'}</span></div>
            <div class="item"><span class="lbl">${t("beneficiaries.filterAttribute")}</span><span class="val">${ATTRIBUT_LABELS[b.attribut] || b.attribut}</span></div>
            <div class="item"><span class="lbl">${t("beneficiaries.filterGender")}</span><span class="val">${b.gender === 'female' ? t('common.female') : t('common.male')}</span></div>
            <div class="item"><span class="lbl">${t('beneficiaries.addressTitle')}</span><span class="val">${b.address || '—'}</span></div>
            <div class="item"><span class="lbl">${t("dashboard.fund")}</span><span class="val">${caisse?.name || '—'}${b.subCategoryId ? ` (${getSubCaisseName(b.caisseId, b.subCategoryId)})` : ''}</span></div>
            ${b.situation ? `<div class="item"><span class="lbl">${t("common.status")}</span><span class="val">${HEALTH_STATUS_LABELS[b.situation] || b.situation}</span></div>` : ''}
            ${b.notes ? `<div class="item"><span class="lbl" style="min-width:140px">${t('common.notes')}</span><span class="val">${b.notes}</span></div>` : ''}
          </div>
        </div>
        ${childrenHtml}
        ${allocsHtml}
        ${debitsHtml}
        ${refsHtml}
        <button class="no-print" onclick="window.print()">${t('beneficiaries.printFileBtn')}</button>
        <div class="footer">${t('receipt.generatedBy')} — ${new Date().toLocaleDateString(i18n.language === 'ar' ? 'ar-DZ' : i18n.language === 'fr' ? 'fr-FR' : 'en-US')}</div>
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
    return c?.name || '—'
  }

  const getSubCaisseName = (caisseId?: string, subCatId?: string) => {
    if (!caisseId || !subCatId) return '—'
    const c = caisses.find((c: any) => c.id === caisseId)
    const sc = c?.subCategories.find((s: any) => s.id === subCatId)
    return sc?.name || '—'
  }

  const getGradeName = (gradeId?: string) => {
    if (!gradeId) return '—'
    const g = schoolGrades.find((g: any) => g.id === gradeId)
    return g?.name || '—'
  }

  // ---- Render helpers ----
  const renderListTab = () => (
    <div>
      {/* ---- Quick Search ---- */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
        <input
          type="text"
          placeholder={t('beneficiaries.searchPlaceholder')}
          className="w-full pr-10 pl-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
          value={filterSearchTerm}
          onChange={(e) => setFilterSearchTerm(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
        />
      </div>

      {/* ---- Advanced Filters (collapsible) ---- */}
      {showFilters && (
        <Card titleAr={t("beneficiaries.advancedSearch")}>
          {/* Filter tabs */}
          <div className="flex gap-1 mb-4 border-b border-border">
            <button
              onClick={() => setFilterTab('beneficiary')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                filterTab === 'beneficiary'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="w-4 h-4 inline ml-1" />
              {t('beneficiaries.personalInfo')}
            </button>
            <button
              onClick={() => setFilterTab('children')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                filterTab === 'children'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Baby className="w-4 h-4 inline ml-1" />
              {t('beneficiaries.children')}
            </button>
          </div>

          {/* Beneficiary filters */}
          {filterTab === 'beneficiary' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <SearchableSelect
                labelAr={t('beneficiaries.filterAttribute')}
                options={attributOptions}
                value={filterAttribut}
                onChange={(val) => setFilterAttribut(val)}
                required={false}
              />
              <SearchableSelect
                labelAr={t('beneficiaries.filterFund')}
                options={caisseOptions}
                value={filterCaisseId}
                onChange={(val) => setFilterCaisseId(val)}
              />
              <SearchableSelect
                labelAr={t('beneficiaries.filterGender')}
                options={[{ value: '', label: t('common.all') }, { value: 'male', label: t('common.male') }, { value: 'female', label: t('common.female') }]}
                value={filterGender}
                onChange={(val) => setFilterGender(val)}
              />
              <SearchableSelect
                labelAr={t('common.status')}
                options={[{ value: '', label: t('common.all') }, ...HEALTH_STATUS_OPTIONS]}
                value={filterSituation}
                onChange={(val) => setFilterSituation(val)}
              />
              <Input
                labelAr={t('beneficiaries.filterMinChildren')}
                type="number"
                min="0"
                value={filterMinChildren}
                onChange={(e) => setFilterMinChildren(e.target.value)}
              />
              <Input
                labelAr={t('beneficiaries.filterMaxAge')}
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
                labelAr={t('beneficiaries.childGender')}
                options={[{ value: '', label: t('common.all') }, { value: 'male', label: t('common.male') }, { value: 'female', label: t('common.female') }]}
                value={filterChildGender}
                onChange={(val) => setFilterChildGender(val)}
              />
              <SearchableSelect
                labelAr={t('beneficiaries.childHealthStatus')}
                options={[
                  { value: '', label: t('common.all') },
                  ...HEALTH_STATUS_OPTIONS,
                ]}
                value={filterChildHealthStatus}
                onChange={(val) => setFilterChildHealthStatus(val)}
              />
              <SearchableSelect
                labelAr={t('beneficiaries.childSchoolLevel')}
                options={[
                  { value: '', label: t('common.all') },
                  ...gradeOptions,
                ]}
                value={filterChildSchoolGradeId}
                onChange={(val) => setFilterChildSchoolGradeId(val)}
              />
              <Input
                labelAr={t('beneficiaries.childMinAge')}
                type="number"
                min="0"
                value={filterMinChildAge}
                onChange={(e) => setFilterMinChildAge(e.target.value)}
              />
              <Input
                labelAr={t('beneficiaries.childMaxAge')}
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
              {t('common.search')}
            </Button>
            <Button variant="secondary" size="sm" onClick={resetFilters}>
              {t('common.clear')}
            </Button>
            <Button
              variant={widowFilterActive ? 'primary' : 'secondary'}
              size="sm"
              onClick={handleFindWidowWithMostChildren}
              className="mr-auto"
            >
              <Users className="w-4 h-4" />
              {widowFilterActive ? t('beneficiaries.widowFilterActiveBtn') : t('beneficiaries.findMostChildrenBtn')}
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
            message={t('beneficiaries.noBeneficiaries')}
            icon={<Users className="w-12 h-12" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-3 px-4 text-start font-medium w-8"></th>
                  <th className="py-3 px-4 text-start font-medium">{t('doctors.refCode')}</th>
                  <th className="py-3 px-4 text-start font-medium">{t('beneficiaries.sectionName')}</th>
                  <th className="py-3 px-4 text-start font-medium hidden md:table-cell">{t('receipt.idNumber')}</th>
                  <th className="py-3 px-4 text-start font-medium hidden lg:table-cell">{t('receipt.phone')}</th>
                  <th className="py-3 px-4 text-start font-medium">{t('beneficiaries.filterAttribute')}</th>
                  <th className="py-3 px-4 text-start font-medium hidden sm:table-cell">{t('receipt.age')}</th>
                  <th className="py-3 px-4 text-start font-medium">{t('beneficiaries.childrenCount')}</th>
                  <th className="py-3 px-4 text-start font-medium hidden lg:table-cell">{t('dashboard.fund')}</th>
                  <th className="py-3 px-4 text-center font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {displayBeneficiaries.map((b: Beneficiary) => {
                  const age = b.dateOfBirth ? calculateAge(b.dateOfBirth) : null
                  const isExpanded = expandedRows.has(b.id)
                  return (
                    <Fragment key={b.id}>
                      <tr
                        className="border-b border-border hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => openDetail(b)}
                      >
                        <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                          {(b.children || []).length > 0 && (
                            <button
                              onClick={() => toggleExpand(b.id)}
                              className="p-1 text-muted-foreground/70 hover:text-primary transition-colors"
                              title={isExpanded ? t('beneficiaries.hideChildren') : t('beneficiaries.showChildren')}
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-3 font-semibold text-primary" dir="ltr">
                          {b.reference || '—'}
                        </td>
                        <td className="py-3 px-3 font-medium text-foreground">
                          {b.lastName} {b.firstName}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground hidden md:table-cell">{b.nationalCardNumber}</td>
                        <td className="py-3 px-3 text-muted-foreground hidden lg:table-cell" dir="ltr">
                          {b.phone}
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant={ATTRIBUT_BADGE_VARIANT[b.attribut] ?? 'default'}>
                            {ATTRIBUT_LABELS[b.attribut] ?? b.attribut}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground hidden sm:table-cell">
                          {age ? getAgeDisplay(b.dateOfBirth) : '—'}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Baby className="w-3.5 h-3.5" />
                            {b.children.length}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground hidden lg:table-cell">
                          {getCaisseName(b.caisseId)}
                          {b.subCategoryId && (
                            <span className="text-muted-foreground/70 text-xs block mt-0.5">
                              ({getSubCaisseName(b.caisseId, b.subCategoryId)})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-center gap-1">
                            <button className="p-1.5 rounded-lg text-muted-foreground/70 hover:text-primary hover:bg-primary/10 transition-colors" title={t('beneficiaries.viewDetailsHint')}
                              onClick={(e) => { e.stopPropagation(); openDetail(b) }}>
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 rounded-lg text-muted-foreground/70 hover:text-accent-foreground hover:bg-accent transition-colors" title={t('beneficiaries.editHint')}
                              onClick={(e) => { e.stopPropagation(); openEditForm(b) }}>
                              <Edit className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 rounded-lg text-muted-foreground/70 hover:text-danger-500 hover:bg-destructive/10 transition-colors" title={t('beneficiaries.deleteHint')}
                              onClick={(e) => { e.stopPropagation(); handleDelete(b.id) }}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && b.children && b.children.length > 0 && (
                        <tr key={`${b.id}-children`}>
                          <td colSpan={10} className="px-4 pb-4 pt-1 bg-muted">
                            <div className="rounded-lg border border-border overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-muted text-muted-foreground">
                                    <th className="py-2 px-3 text-start font-medium">{t('beneficiaries.sectionName')}</th>
                                    <th className="py-2 px-3 text-start font-medium">{t('beneficiaries.filterGender')}</th>
                                    <th className="py-2 px-3 text-start font-medium">{t('receipt.age')}</th>
                                    <th className="py-2 px-3 text-start font-medium">{t('common.status')}</th>
                                    <th className="py-2 px-3 text-start font-medium">{t('beneficiaries.schoolGrade')}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {b.children.map((child: any, ci: number) => (
                                    <tr key={ci} className="border-t border-border hover:bg-card">
                                      <td className="py-2 px-3 font-medium text-foreground">{child.lastName} {child.firstName}</td>
                                      <td className="py-2 px-3 text-muted-foreground">{child.gender === 'female' ? t('common.female') : t('common.male')}</td>
                                      <td className="py-2 px-3 text-muted-foreground">{getAgeDisplay(child.dateOfBirth)}</td>
                                      <td className="py-2 px-3"><Badge variant={child.healthStatus === 'bonne_sante' ? 'success' : child.healthStatus === 'malade' ? 'warning' : 'info'}>{HEALTH_STATUS_LABELS[child.healthStatus] || child.healthStatus}</Badge></td>
                                      <td className="py-2 px-3 text-muted-foreground">{getGradeName(child.schoolGradeId)}</td>
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
        title={editingId ? t('beneficiaries.editBeneficiaryTitle') : t('beneficiaries.newBeneficiaryTitle')}
        size="xl"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
          {/* Names — un seul champ, direction pilotée par la locale de l'association */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-2">{t('beneficiaries.sectionName')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label={t('beneficiaries.firstName')} value={form.firstName} onChange={(e) => handleFormChange('firstName', e.target.value)} required dir={dirForInput(i18n.language)} />
              <Input label={t('beneficiaries.lastName')} value={form.lastName} onChange={(e) => handleFormChange('lastName', e.target.value)} required dir={dirForInput(i18n.language)} />
            </div>
          </div>

          {/* Address — un seul champ */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">{t('beneficiaries.addressTitle')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label={t('beneficiaries.address')} value={form.address} onChange={(e) => handleFormChange('address', e.target.value)} required dir={dirForInput(i18n.language)} />
            </div>
          </div>

          {/* Identity & Contact */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">{t('beneficiaries.personalInfo')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label={t('receipt.idNumber')} value={form.nationalCardNumber} onChange={(e) => handleFormChange('nationalCardNumber', e.target.value)} required />
              <Input label={t('receipt.phone')} value={form.phone} onChange={(e) => handleFormChange('phone', e.target.value)} dir="ltr" required />
              <div className="space-y-1">
                <Input label={t('receipt.birthDate')} type="date" value={form.dateOfBirth} onChange={(e) => handleFormChange('dateOfBirth', e.target.value)} required />
                {form.dateOfBirth && (
                  <p className="text-xs text-muted-foreground">{t('beneficiaries.ageDisplay')} {getAgeDisplay(form.dateOfBirth)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Classification */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">{t('beneficiaries.classificationTitle')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SearchableSelect
                label={t('beneficiaries.filterAttribute')}
                options={attributOptions}
                value={form.attribut}
                onChange={(val) => handleFormChange('attribut', val)}
                required
              />
              <SearchableSelect
                label={t('beneficiaries.filterGender')}
                options={[{ value: 'male', label: t('common.male') }, { value: 'female', label: t('common.female') }]}
                value={form.gender || 'male'}
                onChange={(val) => handleFormChange('gender', val)}
              />
              <div className="space-y-1">
                <Input label={t('beneficiaries.onBehalfOf')} placeholder={t('beneficiaries.onBehalfOfPlaceholder')} value={form.onBehalfOf} onChange={(e) => handleFormChange('onBehalfOf', e.target.value)} />
                <p className="text-xs text-muted-foreground/70">{t('beneficiaries.onBehalfOfHint')}</p>
              </div>
            </div>
          </div>

          {/* Situation */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">{t('common.status')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SearchableSelect
                label={t('common.status')}
                options={HEALTH_STATUS_OPTIONS}
                value={form.situation}
                onChange={(val) => handleFormChange('situation', val)}
              />
              <Input label={t('beneficiaries.situationDetails')} placeholder={t('beneficiaries.situationDetailsPlaceholder')} value={form.situation} onChange={(e) => handleFormChange('situation', e.target.value)} />
            </div>
          </div>

          {/* Children */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground">{t('beneficiaries.children')}</h4>
              <Button size="sm" variant="secondary" onClick={addChild}>
                <Plus className="w-4 h-4" /> {t('beneficiaries.addChild')}
              </Button>
            </div>
            {form.children.length > 0 && (
              <div className="space-y-4">
                {form.children.map((child, index) => (
                  <div key={index} className="border border-border rounded-lg p-4 bg-muted">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-medium text-foreground">{t('beneficiaries.childNumber')} {index + 1}</span>
                      <button onClick={() => removeChild(index)} className="text-xs text-destructive hover:text-destructive">✕ {t('beneficiaries.removeChild')}</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input label={t('beneficiaries.firstName')} value={child.firstName} onChange={(e) => updateChild(index, 'firstName', e.target.value)} dir={dirForInput(i18n.language)} />
                      <Input label={t('beneficiaries.lastName')} value={child.lastName} onChange={(e) => updateChild(index, 'lastName', e.target.value)} dir={dirForInput(i18n.language)} />
                      <Input label={t('receipt.birthDate')} type="date" value={child.dateOfBirth} onChange={(e) => updateChild(index, 'dateOfBirth', e.target.value)} />
                      <SearchableSelect
                        label={t('beneficiaries.childGender')}
                        options={[{ value: 'male', label: t('common.male') }, { value: 'female', label: t('common.female') }]}
                        value={child.gender || 'male'}
                        onChange={(val) => updateChild(index, 'gender', val)}
                      />
                      <SearchableSelect
                        label={t('common.status')}
                        options={HEALTH_STATUS_OPTIONS}
                        value={child.healthStatus}
                        onChange={(val) => updateChild(index, 'healthStatus', val)}
                      />
                      <Input label={t('beneficiaries.childHealthDetails')} placeholder={t('beneficiaries.childHealthDetailsPlaceholder')} value={child.healthDetails || ''} onChange={(e) => updateChild(index, 'healthDetails', e.target.value)} />
                      {gradeOptions.length > 0 && (
                        <SearchableSelect
                          label={t('beneficiaries.schoolGrade')}
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
          <TextArea label={t('common.notes')} value={form.notes} onChange={(e) => handleFormChange('notes', e.target.value)} />

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button variant="secondary" onClick={closeFormModal}>{t('common.cancel')}</Button>
            <Button onClick={handleSave}>{editingId ? t('beneficiaries.updateForm') : t('beneficiaries.saveForm')}</Button>
          </div>
        </div>
      </Modal>

      {/* ---- Detail View Modal ---- */}
      {selectedBeneficiary && (
        <Modal isOpen={showDetailModal} onClose={closeDetail} title={`${selectedBeneficiary.lastName} ${selectedBeneficiary.firstName}`} size="xl">
          <div className="space-y-6" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-2">{t('beneficiaries.personalInfo')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{t('doctors.refCode')}</span><span className="font-semibold text-primary" dir="ltr">{selectedBeneficiary.reference || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t('beneficiaries.fullName')}</span><span className="font-medium text-foreground">{selectedBeneficiary.lastName} {selectedBeneficiary.firstName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t('receipt.idNumber')}</span><span className="font-medium text-foreground">{selectedBeneficiary.nationalCardNumber}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t('receipt.phone')}</span><span className="font-medium text-foreground" dir="ltr">{selectedBeneficiary.phone}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t('receipt.birthDate')}</span><span className="font-medium text-foreground">{selectedBeneficiary.dateOfBirth ? `${formatDate(selectedBeneficiary.dateOfBirth)} (${getAgeDisplay(selectedBeneficiary.dateOfBirth)})` : '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t('beneficiaries.filterAttribute')}</span><Badge variant={ATTRIBUT_BADGE_VARIANT[selectedBeneficiary.attribut] ?? 'default'}>{ATTRIBUT_LABELS[selectedBeneficiary.attribut] ?? selectedBeneficiary.attribut}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t('beneficiaries.filterGender')}</span><span className="font-medium text-foreground">{selectedBeneficiary.gender === 'female' ? t('common.female') : t('common.male')}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t('beneficiaries.address')}</span><span className="font-medium text-foreground">{selectedBeneficiary.address || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t('dashboard.fund')}</span><span className="font-medium text-foreground">{getCaisseName(selectedBeneficiary.caisseId)}{selectedBeneficiary.subCategoryId ? <span className="text-muted-foreground mr-2">({getSubCaisseName(selectedBeneficiary.caisseId, selectedBeneficiary.subCategoryId)})</span> : ''}</span></div>
                {selectedBeneficiary.onBehalfOfName && <div className="flex justify-between"><span className="text-muted-foreground">{t('beneficiaries.onBehalfOf')}</span><span className="font-medium text-foreground">{selectedBeneficiary.onBehalfOfName}</span></div>}
                {selectedBeneficiary.situation && <div className="flex justify-between md:col-span-2"><span className="text-muted-foreground">{t('common.status')}</span><span className="font-medium text-foreground">{HEALTH_STATUS_LABELS[selectedBeneficiary.situation] || selectedBeneficiary.situation}</span></div>}
                {selectedBeneficiary.notes && <div className="flex justify-between md:col-span-2"><span className="text-muted-foreground">{t('common.notes')}</span><span className="font-medium text-foreground">{selectedBeneficiary.notes}</span></div>}
              </div>
            </div>

            {selectedBeneficiary.children.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-2">{t('beneficiaries.childrenDetails')} ({selectedBeneficiary.children.length})</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 px-3 text-start font-medium">{t('beneficiaries.sectionName')}</th>
                        <th className="py-2 px-3 text-start font-medium">{t('beneficiaries.filterGender')}</th>
                        <th className="py-2 px-3 text-start font-medium">{t('receipt.age')}</th>
                        <th className="py-2 px-3 text-start font-medium">{t('common.status')}</th>
                        <th className="py-2 px-3 text-start font-medium">{t('beneficiaries.schoolGrade')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBeneficiary.children.map((child: any) => (
                        <tr key={child.id} className="border-b border-border">
                          <td className="py-2 px-3">{child.lastName} {child.firstName}</td>
                          <td className="py-2 px-3">{child.gender === 'female' ? t('common.female') : t('common.male')}</td>
                          <td className="py-2 px-3">{getAgeDisplay(child.dateOfBirth)}</td>
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
                <h4 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-2">{t('beneficiaries.incomingDonations')} ({beneficiaryAllocations.length})</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 px-3 text-start font-medium">{t('beneficiaries.tableDonor')}</th>
                        <th className="py-2 px-3 text-start font-medium">{t('common.amount')}</th>
                        <th className="py-2 px-3 text-start font-medium">{t('beneficiaries.spent')}</th>
                        <th className="py-2 px-3 text-start font-medium">{t('beneficiaries.remaining')}</th>
                        <th className="py-2 px-3 text-start font-medium">{t('common.status')}</th>
                        <th className="py-2 px-3 text-start font-medium">{t('common.date')}</th>
                        <th className="py-2 px-3 text-start font-medium">{t('beneficiaries.receiptNo')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {beneficiaryAllocations.map((a: DonationAllocation) => {
                        const spent = a.amount - a.remainingAmount;
                        return (
                        <tr key={a.id} className="border-b border-border hover:bg-muted">
                          <td className="py-2 px-3 font-medium text-foreground">{a.donor.lastName} {a.donor.firstName}</td>
                          <td className="py-2 px-3"><Badge variant="success">{formatCurrency(a.amount)}</Badge></td>
                          <td className="py-2 px-3">{spent > 0 ? formatCurrency(spent) : '—'}</td>
                          <td className="py-2 px-3">{a.remainingAmount > 0 ? formatCurrency(a.remainingAmount) : <Badge variant="success">0</Badge>}</td>
                          <td className="py-2 px-3">
                            {(() => {
                              const s = a.creditTransaction?.status;
                              if (s === 'pending') return <Badge variant="warning">{t('dashboard.pending')}</Badge>;
                              if (s === 'cancelled') return <Badge variant="danger">{t('dashboard.cancelled')}</Badge>;
                              if (a.remainingAmount <= 0) return <Badge variant="success">{t('dashboard.fullyDisbursed')}</Badge>;
                              if (a.debitTransactionId) return <Badge variant="info">{t('dashboard.partiallyDisbursed')}</Badge>;
                              return <Badge variant="info">{t('dashboard.active')}</Badge>;
                            })()}
                          </td>
                          <td className="py-2 px-3 text-foreground">{formatDate(a.createdAt)}</td>
                          <td className="py-2 px-3 text-muted-foreground/70 text-xs" dir="ltr">{a.creditTransaction?.receiptNumber || '—'}</td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
                {/* Total allocations summary */}
                <div className="mt-2 p-3 bg-muted rounded-lg flex gap-6 text-sm">
                  <span>{t('beneficiaries.totalAllocations')} <strong className="text-success">{formatCurrency(beneficiaryAllocations.reduce((sum: number, a: DonationAllocation) => sum + a.amount, 0))}</strong></span>
                  <span>{t('beneficiaries.totalDisbursed')} <strong className="text-accent-foreground">{formatCurrency(beneficiaryAllocations.reduce((sum: number, a: DonationAllocation) => sum + (a.amount - a.remainingAmount), 0))}</strong></span>
                  <span>{t('beneficiaries.totalRemaining')} <strong className="text-warning">{formatCurrency(beneficiaryAllocations.reduce((sum: number, a: DonationAllocation) => sum + a.remainingAmount, 0))}</strong></span>
                </div>
              </div>
            )}

            {/* Debit transactions (money actually disbursed) */}
            {beneficiaryDebits.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-2">{t('beneficiaries.amountsDisbursed')} ({beneficiaryDebits.length})</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 px-3 text-start font-medium">{t('common.date')}</th>
                        <th className="py-2 px-3 text-start font-medium">{t('common.amount')}</th>
                        <th className="py-2 px-3 text-start font-medium">{t('beneficiaries.fundingSource')}</th>
                        <th className="py-2 px-3 text-start font-medium">{t('dashboard.fund')}</th>
                        <th className="py-2 px-3 text-start font-medium">{t('common.status')}</th>
                        <th className="py-2 px-3 text-start font-medium">{t('common.description')}</th>
                        <th className="py-2 px-3 text-start font-medium">{t('common.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {beneficiaryDebits.map((tx: any) => {
                        const caisse = caisses.find((c: any) => c.id === tx.caisseId);
                        return (
                        <tr key={tx.id} className="border-b border-border hover:bg-muted">
                          <td className="py-2 px-3 text-foreground">{formatDate(tx.date)}</td>
                          <td className="py-2 px-3 font-semibold text-destructive">-{formatCurrency(tx.amount)}</td>
                          <td className="py-2 px-3 text-muted-foreground">{tx.fundSource === 'banque' ? t('beneficiaries.bankLabel') : t('beneficiaries.cashLabel')}</td>
                          <td className="py-2 px-3 text-muted-foreground">{caisse?.name || '—'}</td>
                          <td className="py-2 px-3">
                            {(tx.status || 'completed') === 'pending' ? <Badge variant="warning">{t('dashboard.pending')}</Badge> :
                             (tx.status || 'completed') === 'cancelled' ? <Badge variant="danger">{t('dashboard.cancelled')}</Badge> :
                             <Badge variant="success">{t('dashboard.completed')}</Badge>}
                          </td>
                          <td className="py-2 px-3 text-muted-foreground text-xs max-w-[150px] truncate">{localizedDesc(tx.description) || '—'}</td>
                          <td className="py-2 px-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const caisse = caisses.find((c: any) => c.id === tx.caisseId)
                                const amount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : (tx.amount || 0)
                                const wordsAr = tx.amountInWords && !tx.amountInWords.match(/^\d/) ? tx.amountInWords : numberToArabicWords(amount)
                                const wordsFr = tx.amountInWords && !tx.amountInWords.match(/^\d/) ? tx.amountInWords : numberToFrenchWords(amount)
                                printReceipt(
                                  t('receipt.expenseTitle'), 'Bon de Sortie',
                                  `<div class="col"><div class="row"><span class="lbl">${t('beneficiaries.receiptNo')}</span><span class="val">${tx.id.slice(0, 8) || '—'}</span></div>
<div class="row"><span class="lbl">{t('common.date')}</span><span class="val">${formatDate(tx.date)}</span></div>
<div class="row"><span class="lbl">${t('dashboard.beneficiary')}</span><span class="val">${selectedBeneficiary?.lastName || ''} ${selectedBeneficiary?.firstName || ''}</span></div></div>
<div class="col"><div class="row"><span class="lbl">{t('dashboard.fund')}</span><span class="val">${caisse?.name || '—'}</span></div>
<div class="row"><span class="lbl">${t('dashboard.source')}</span><span class="val">${tx.fundSource === 'banque' ? t('beneficiaries.bankLabel') : t('beneficiaries.cashLabel')}</span></div>
${tx.description ? `<div class="row"><span class="lbl">{t('common.description')}</span><span class="val">${tx.description}</span></div>` : ''}</div>`,
                                  'background:#fff0f0;color:#dc2626',
                                  `- ${formatCurrency(amount)}`, wordsAr, wordsFr,
                                  t('receipt.beneficiarySign'), t('receipt.stampSignature'),
                                  association?.name
                                )
                              }}
                              className="p-1 text-muted-foreground/70 hover:text-primary"
                              title={t('receipt.print')}
                            >
                              <Printer size={14} />
                            </button>
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 p-3 bg-destructive/10 rounded-lg text-sm">
                  <span>{t('beneficiaries.totalDisbursed')} <strong className="text-destructive">{formatCurrency(beneficiaryDebits
                    .filter((tx: any) => (tx.status || 'completed') !== 'cancelled')
                    .reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0)
                  )}</strong> <span className="text-muted-foreground/70 text-xs mr-2">({beneficiaryDebits.filter((tx: any) => (tx.status || 'completed') === 'cancelled').length} {t('beneficiaries.cancelledNotCounted')})</span></span>
                </div>
              </div>
            )}

            {/* Medical referrals (التوجيه الطبي) */}
            {beneficiaryReferrals.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-2">{t('beneficiaries.medicalReferral')} ({beneficiaryReferrals.length})</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 px-3 text-start font-medium">{t('common.date')}</th>
                        <th className="py-2 px-3 text-start font-medium">{t('medical.doctor')}</th>
                        <th className="py-2 px-3 text-start font-medium">{t('common.amount')}</th>
                        <th className="py-2 px-3 text-start font-medium">{t('common.status')}</th>
                        <th className="py-2 px-3 text-start font-medium">{t('dashboard.fund')}</th>
                        <th className="py-2 px-3 text-start font-medium">{t('medical.analysisType')}</th>
                        <th className="py-2 px-3 text-start font-medium">{t('medical.hospital')}</th>
                        <th className="py-2 px-3 text-start font-medium">{t('common.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {beneficiaryReferrals.map((ref: any) => {
                        const caisse = caisses.find((c: any) => c.id === ref.caisseId);
                        return (
                        <tr key={ref.id} className="border-b border-border hover:bg-muted">
                          <td className="py-2 px-3 text-foreground">{formatDate(ref.date)}</td>
                          <td className="py-2 px-3 font-medium text-foreground">{ref.doctorName}</td>
                          <td className="py-2 px-3"><Badge variant="warning">{formatCurrency(ref.amount)}</Badge></td>
                          <td className="py-2 px-3">
                            {(ref.status || 'pending') === 'pending' ? <Badge variant="warning">{t('dashboard.pending')}</Badge> :
                             (ref.status || 'pending') === 'completed' ? <Badge variant="success">{t('dashboard.completed')}</Badge> :
                             <Badge variant="danger">{t('dashboard.cancelled')}</Badge>}
                          </td>
                          <td className="py-2 px-3 text-muted-foreground">{caisse?.name || '—'}</td>
                          <td className="py-2 px-3 text-muted-foreground">{ref.analysisType || '—'}</td>
                          <td className="py-2 px-3 text-muted-foreground">{ref.hospital || '—'}</td>
                          <td className="py-2 px-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const caisse = caisses.find((c: any) => c.id === ref.caisseId)
                                const subCat = caisse?.subCategories.find((s: any) => s.id === ref.subCategoryId)
                                const caisseRow = caisse ? `<div class="row"><span class="lbl">{t('dashboard.fund')}</span><span class="val">${caisse.name}</span></div>` : ''
                                const subCatRow = subCat ? `<div class="row"><span class="lbl">${t('receipt.subCategory')}</span><span class="val">${subCat.name}</span></div>` : ''
                                const childrenHtml = ref.children && Array.isArray(ref.children) && ref.children.length > 0
                                  ? `<div class="row"><span class="lbl">${t('beneficiaries.referralChildren')}</span><span class="val">${ref.children.map((c: any) => c.name).join(', ')}</span></div>`
                                  : ''
                                printReceipt(
                                  t('medical.referralDetails'), 'Orientation Médicale',
                                  `<div class="col"><div class="row"><span class="lbl">{t('doctors.refCode')}</span><span class="val">${ref.reference || '—'}</span></div>
<div class="row"><span class="lbl">${t('dashboard.beneficiary')}</span><span class="val">${ref.beneficiaryName || ''}</span></div>
<div class="row"><span class="lbl">${t('medical.doctor')}</span><span class="val">${ref.doctorName}</span></div>
${ref.analysisType ? `<div class="row"><span class="lbl">${t('medical.analysisType')}</span><span class="val">${ref.analysisType}</span></div>` : ''}</div>
<div class="col">${caisseRow}${subCatRow}
<div class="row"><span class="lbl">{t('common.date')}</span><span class="val">${formatDate(ref.date)}</span></div>
${ref.hospital ? `<div class="row"><span class="lbl">${t('medical.hospital')}</span><span class="val">${ref.hospital}</span></div>` : ''}
${childrenHtml}
${ref.notes ? `<div class="row"><span class="lbl">{t('common.notes')}</span><span class="val">${ref.notes}</span></div>` : ''}</div>`,
                                  'color:#2563eb',
                                  formatCurrency(ref.amount), ref.amountInWords || '', '',
                                  t('medical.presidentSignature'), t('medical.assocStamp'),
                                  association?.name
                                )
                              }}
                              className="p-1 text-muted-foreground/70 hover:text-primary"
                              title={t('receipt.print')}
                            >
                              <Printer size={14} />
                            </button>
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 p-3 bg-warning/10 rounded-lg text-sm">
                  <span>{t('beneficiaries.medicalReferral')}: <strong className="text-warning">{formatCurrency(beneficiaryReferrals
                    .filter((ref: any) => (ref.status || 'pending') !== 'cancelled')
                    .reduce((sum: number, ref: any) => sum + (ref.amount || 0), 0)
                  )}</strong> <span className="text-muted-foreground/70 text-xs mr-2">({beneficiaryReferrals.filter((ref: any) => (ref.status || 'pending') === 'cancelled').length} {t('beneficiaries.cancelledNotCounted')})</span></span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-border">
              <Button size="sm" variant="secondary" onClick={() => handlePrintCard(selectedBeneficiary)}>
                <Printer className="w-4 h-4" /> {t('beneficiaries.printCardBtn')}
              </Button>
              <Button size="sm" variant="primary" onClick={() => handlePrintFullFile(
                selectedBeneficiary,
                beneficiaryAllocations,
                beneficiaryDebits,
                beneficiaryReferrals
              )}>
                <Printer className="w-4 h-4" /> {t('beneficiaries.printFileBtn')}
              </Button>
              <Button size="sm" variant="secondary" onClick={closeDetail}>{t('beneficiaries.closeBtn')}</Button>
              <Button size="sm" onClick={() => { closeDetail(); openEditForm(selectedBeneficiary) }}>
                <Edit className="w-4 h-4" /> {t('beneficiaries.editBtn')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )

  return (
    <div className="space-y-6" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      {/* ---- Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('beneficiaries.tabList')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('beneficiaries.manageText')} {displayBeneficiaries.length}{widowFilterActive ? ' (' + t('beneficiaries.widowFilterActiveBtn') + ' — ' + t('beneficiaries.findMostChildrenBtn') + ')' : ''}
          </p>
        </div>
        {activeTab === 'list' && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-4 h-4" /> {t('beneficiaries.advancedFiltersBtn')}
            </Button>
            <Button size="sm" onClick={openAddForm}>
              <Plus className="w-4 h-4" /> {t('beneficiaries.addBeneficiaryBtn')}
            </Button>
          </div>
        )}
      </div>

      {/* ---- Tabs ---- */}
      <div className="border-b border-border">
        <nav className="flex gap-2 sm:gap-4">
          <button onClick={() => setActiveTab('list')}
            className={`flex-1 sm:flex-initial pb-3 px-3 sm:px-1 text-sm font-medium border-b-2 transition-colors min-h-[44px] ${activeTab === 'list' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}>
            <Users className="inline-block w-4 h-4 ml-2" /> {t('beneficiaries.tabList')}
          </button>
          <button onClick={handleSettingsTab}
            className={`flex-1 sm:flex-initial pb-3 px-3 sm:px-1 text-sm font-medium border-b-2 transition-colors min-h-[44px] ${activeTab === 'settings' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}>
            <Settings className="inline-block w-4 h-4 ml-2" /> {t('beneficiaries.tabSettings')}
          </button>
        </nav>
      </div>

      {activeTab === 'list' ? renderListTab() : (
        <div className="space-y-8">
          {/* ---- Attributs Section ---- */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              {t('beneficiaries.sectionSettings')}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">{t('beneficiaries.settingsDesc')}</p>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end mb-4">
              <Input label={t('beneficiaries.name')} value={newAttrName} onChange={(e) => setNewAttrName(e.target.value)} placeholder={t('beneficiaries.attributPlaceholder')} dir={dirForInput(i18n.language)} />
              <Button onClick={handleAddAttribut} disabled={!newAttrName.trim()}>{t('common.add')}</Button>
            </div>
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('beneficiaries.sectionName')}</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attributs.map((a: BeneficiaryAttribut) => (
                      <tr key={a.name} className="border-b border-border hover:bg-muted">
                        {editAttrId === a.name ? (
                          <>
                            <td className="py-2 px-4"><input value={editAttrName} onChange={(e) => setEditAttrName(e.target.value)} className="w-full border border-border rounded px-2 py-1 text-sm" dir={dirForInput(i18n.language)} /></td>
                            <td className="py-2 px-4 text-center flex gap-1 justify-center">
                              <Button size="sm" onClick={handleUpdateAttribut}>{t('common.save')}</Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditAttrId(null)}>{t('common.cancel')}</Button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 px-4 font-medium text-foreground">{a.name}</td>
                            <td className="py-3 px-4 text-center">
                              <button onClick={() => { setEditAttrId(a.name); setEditAttrName(a.name); }} className="p-1.5 text-muted-foreground/70 hover:text-primary rounded"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteAttribut(a.name)} className="p-1.5 text-muted-foreground/70 hover:text-danger-500 rounded"><Trash2 className="w-4 h-4" /></button>
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
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-primary" />
              {t('beneficiaries.schoolGradesSection')}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">{t('beneficiaries.addSchoolGrade')}</p>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end mb-4">
              <Input label={t('beneficiaries.sectionName')} value={newGradeName} onChange={(e) => setNewGradeName(e.target.value)} placeholder={t('beneficiaries.gradePlaceholder')} dir={dirForInput(i18n.language)} />
              <Button onClick={handleAddGrade} disabled={!newGradeName.trim()}>{t('common.add')}</Button>
            </div>
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('beneficiaries.sectionName')}</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schoolGrades.map((g: any) => (
                      <tr key={g.id} className="border-b border-border hover:bg-muted">
                        {editGradeId === g.id ? (
                          <>
                            <td className="py-2 px-4"><input value={editGradeName} onChange={(e) => setEditGradeName(e.target.value)} className="w-full border border-border rounded px-2 py-1 text-sm" dir={dirForInput(i18n.language)} /></td>
                            <td className="py-2 px-4 text-center flex gap-1 justify-center">
                              <Button size="sm" onClick={handleUpdateGrade}>{t('common.save')}</Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditGradeId(null)}>{t('common.cancel')}</Button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 px-4 font-medium text-foreground">{g.name}</td>
                            <td className="py-3 px-4 text-center">
                              <button onClick={() => { setEditGradeId(g.id); setEditGradeName(g.name); }} className="p-1.5 text-muted-foreground/70 hover:text-primary rounded"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteGrade(g.id)} className="p-1.5 text-muted-foreground/70 hover:text-danger-500 rounded"><Trash2 className="w-4 h-4" /></button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                    {schoolGrades.length === 0 && (
                      <tr><td colSpan={2} className="py-8 text-center text-muted-foreground/70">{t('beneficiaries.noGrades')}</td></tr>
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