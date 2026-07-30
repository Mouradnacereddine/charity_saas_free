import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Card, Button, Input, SearchableSelect, Modal, Badge, TextArea, EmptyState, LoadingSpinner } from '../components/common/UI'
import { formatDate, generateLoanReference } from '../utils/helpers'
import { dirForInput } from '../utils/localized'
import { Plus, Search, Eye, Edit, Trash2, Package, RotateCcw, ArrowLeftRight, CheckCircle, Filter, Settings, FolderTree, MapPin, Printer, ChevronDown, ChevronUp } from 'lucide-react'
import { printReceipt } from '../lib/receipt'
import { useAuth } from '../hooks/useAuth'
import type { Article, Loan, LoanItem, ArticleCategory, ArticleStatus, StorageLocation, Beneficiary } from '../types'
import {
  useArticles,
  useCreateArticle,
  useUpdateArticle,
  useDeleteArticle,
  useArticleCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useStorageLocations,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
  useLoans,
  useCreateLoan,
  useReturnItems,
  useAddItemToLoan,
  useRemoveItemFromLoan,
  useMarkLoanDefinitive,
  useArticleStatuses,
  useCreateStatus,
  useUpdateStatus,
  useDeleteStatus,
} from '../hooks/useInventory'
import { useBeneficiaries } from '../hooks/useBeneficiaries'

// ---- Constants ----

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'danger' | 'default' | 'info'> = {
  disponible: 'success',
  prete: 'info',
  endommage: 'warning',
  hors_service: 'danger',
}

const LOAN_STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'danger' | 'default' | 'info'> = {
  en_cours: 'info',
  partiellement_retourne: 'warning',
  retourne: 'default',
  definitif: 'default',
}

const EMPTY_ARTICLE_FORM = {
  name: '',
  description: '',
  category: '',
  quantity: 1,
  status: 'disponible' as Article['status'],
  statusId: '',
  storageLocation: '',
  isPermanent: false,
  notes: '',
}

// ---- Helpers ----

function getCategoryName(category: any, categories: ArticleCategory[]): string {
  if (!category) return '—'
  // API may return an object (with include) or a string ID
  if (typeof category === 'object') return category.name || '—'
  const found = categories.find((c: ArticleCategory) => c.id === category)
  return found ? found.name : category
}

function getStorageName(storageLocation: any, locations: StorageLocation[]): string {
  if (!storageLocation) return '—'
  if (typeof storageLocation === 'object') return storageLocation.name || '—'
  const found = locations.find((l: StorageLocation) => l.id === storageLocation)
  return found ? found.name : storageLocation
}

/** Guess French status name from Arabic input (simple transliteration helper). */
function getDefaultFrenchName(arName: string): string {
  const map: Record<string, string> = {
    'متاح': 'Disponible',
    'معار': 'Prêté',
    'تالف': 'Endommagé',
    'مفقود': 'Perdu',
    'مستهلك': 'Consommé',
    'قيد الإصلاح': 'En réparation',
    'جديد': 'Neuf',
    'مستعمل': 'Usage',
  }
  return map[arName] || arName
}

// ---- Component ----

export default function InventoryPage() {
  const { t, i18n } = useTranslation();
  const STATUS_LABELS: Record<string, string> = {
    disponible: t('inventory.available_status'),
    prete: t('inventory.onLoan'),
    endommage: t('inventory.damaged'),
    hors_service: t('inventory.outOfService'),
  }

  const loanStatusLabels: Record<string, string> = {
    en_cours: t('inventory.ongoing'),
    partiellement_retourne: t('inventory.partiallyReturned'),
    retourne: t('inventory.final'),
    definitif: t('inventory.final'),
  }
  const { association } = useAuth()
  const [activeTab, setActiveTab] = useState<'stock' | 'loans' | 'settings'>('stock')
  const stockActions = useRef<{ toggleFilter: () => void; addItem: () => void }>({ toggleFilter: () => {}, addItem: () => {} })
  const loansActions = useRef<{ toggleFilter: () => void; addItem: () => void }>({ toggleFilter: () => {}, addItem: () => {} })

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('inventory.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeTab === 'stock' ? t('inventory.subtitleStock') : activeTab === 'loans' ? t('inventory.subtitleLoans') : t('inventory.subtitleSettings')}
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'stock' && (
            <>
              <Button variant="secondary" size="sm" onClick={() => stockActions.current.toggleFilter()}>
                <Filter className="w-4 h-4" /> {t('inventory.advancedSearch')}
              </Button>
              <Button size="sm" onClick={() => stockActions.current.addItem()}>
                <Plus className="w-4 h-4" /> {t('inventory.addArticle')}
              </Button>
            </>
          )}
          {activeTab === 'loans' && (
            <>
              <Button variant="secondary" size="sm" onClick={() => loansActions.current.toggleFilter()}>
                <Filter className="w-4 h-4" /> {t('inventory.advancedSearch')}
              </Button>
              <Button size="sm" onClick={() => loansActions.current.addItem()}>
                <Plus className="w-4 h-4" /> {t('inventory.newLoan')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-2 sm:gap-4">
          <button
            onClick={() => setActiveTab('stock')}
            className={`flex-1 sm:flex-initial pb-3 px-3 sm:px-1 text-sm font-medium border-b-2 transition-colors min-h-[44px] ${
              activeTab === 'stock'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <Package className="inline-block w-4 h-4 ml-2" />
            {t('inventory.tabStock')}
          </button>
          <button
            onClick={() => setActiveTab('loans')}
            className={`flex-1 sm:flex-initial pb-3 px-3 sm:px-1 text-sm font-medium border-b-2 transition-colors min-h-[44px] ${
              activeTab === 'loans'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <ArrowLeftRight className="inline-block w-4 h-4 ml-2" />
            {t('inventory.tabLoans')}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 sm:flex-initial pb-3 px-3 sm:px-1 text-sm font-medium border-b-2 transition-colors min-h-[44px] ${
              activeTab === 'settings'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <Settings className="inline-block w-4 h-4 ml-2" />
            {t('inventory.tabSettings')}
          </button>
        </nav>
      </div>

      {activeTab === 'stock' ? (
        <StockTab actionsRef={stockActions} statusLabels={STATUS_LABELS} />
      ) : activeTab === 'loans' ? (
        <LoansTab actionsRef={loansActions} statusLabels={STATUS_LABELS} loanStatusLabels={loanStatusLabels} />
      ) : (
        <SettingsTab />
      )}
    </div>
  )
}

// ============================================================
// SETTINGS TAB — Categories & Storage Locations
// ============================================================

function SettingsTab() {
  const { t, i18n } = useTranslation();
  const { association } = useAuth();

  const { data: categories = [], isLoading: catsLoading } = useArticleCategories()
  const { data: locations = [], isLoading: locsLoading } = useStorageLocations()
  const { data: statuses = [], isLoading: stsLoading } = useArticleStatuses()
  const createCat = useCreateCategory()
  const updateCat = useUpdateCategory()
  const deleteCat = useDeleteCategory()
  const createLoc = useCreateLocation()
  const updateLoc = useUpdateLocation()
  const deleteLoc = useDeleteLocation()
  const createSts = useCreateStatus()
  const updateSts = useUpdateStatus()
  const deleteSts = useDeleteStatus()
  // Category form state
  const [newCatName, setNewCatName] = useState('')
  const [editCatId, setEditCatId] = useState<string | null>(null)
  const [editCatName, setEditCatName] = useState('')

  // Location form state
  const [newLocName, setNewLocName] = useState('')
  const [editLocId, setEditLocId] = useState<string | null>(null)
  const [editLocName, setEditLocName] = useState('')

  // Status form state
  const [newStsName, setNewStsName] = useState('')
  const [newStsDesc, setNewStsDesc] = useState('')
  const [editStsId, setEditStsId] = useState<string | null>(null)
  const [editStsName, setEditStsName] = useState('')
  const [editStsDesc, setEditStsDesc] = useState('')
  const [newStsIsPermanent, setNewStsIsPermanent] = useState(false)
  const [editStsIsPermanent, setEditStsIsPermanent] = useState(false)

  // School grade form state

  // ---- Category CRUD ----

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return
    await createCat.mutateAsync({ name: newCatName.trim() })
    setNewCatName('')
  }

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm(t('inventory.confirmDeleteCategory'))) return
    await deleteCat.mutateAsync(id)
  }

  const startEditCategory = (cat: ArticleCategory) => {
    setEditCatId(cat.id)
    setEditCatName(cat.name)
  }

  const handleUpdateCategory = async () => {
    if (!editCatId || !editCatName.trim()) return
    await updateCat.mutateAsync({ id: editCatId, data: { name: editCatName.trim() } })
    setEditCatId(null)
    setEditCatName('')
  }

  const cancelEditCategory = () => {
    setEditCatId(null)
    setEditCatName('')
  }

  // ---- Location CRUD ----

  const handleAddLocation = async () => {
    if (!newLocName.trim()) return
    await createLoc.mutateAsync({ name: newLocName.trim() })
    setNewLocName('')
  }

  const handleDeleteLocation = async (id: string) => {
    if (!window.confirm(t('inventory.confirmDeleteLocation'))) return
    await deleteLoc.mutateAsync(id)
  }

  const startEditLocation = (loc: StorageLocation) => {
    setEditLocId(loc.id)
    setEditLocName(loc.name)
  }

  const handleUpdateLocation = async () => {
    if (!editLocId || !editLocName.trim()) return
    await updateLoc.mutateAsync({ id: editLocId, data: { name: editLocName.trim() } })
    setEditLocId(null)

    setEditLocName('')
  }

  const cancelEditLocation = () => {
    setEditLocId(null)
    setEditLocName('')
  }

  // ---- Status CRUD ----

  const handleAddStatus = async () => {
    if (!newStsName.trim()) return
    await createSts.mutateAsync({ name: newStsName.trim(), description: newStsDesc.trim() || undefined })
    setNewStsName('')
    setNewStsDesc('')
  }

  const handleDeleteStatus = async (id: string) => {
    if (!window.confirm(t('inventory.confirmDeleteStatus'))) return
    await deleteSts.mutateAsync(id)
  }

  const startEditStatus = (sts: ArticleStatus) => {
    setEditStsId(sts.id)
    setEditStsName(sts.name)
    setEditStsDesc(sts.description || '')
  }

  const handleUpdateStatus = async () => {
    if (!editStsId || !editStsName.trim()) return
    await updateSts.mutateAsync({ id: editStsId, data: { name: editStsName.trim(), description: editStsDesc.trim() || undefined } })
    setEditStsId(null)
    setEditStsName('')
    setEditStsDesc('')
  }

  const cancelEditStatus = () => {
    setEditStsId(null)
    setEditStsName('')
    setEditStsDesc('')
  }

  if (catsLoading || locsLoading || stsLoading) return <LoadingSpinner />

  return (
    <div className="space-y-8">
      {/* ========== Article Categories Section ========== */}
      <Card titleAr={t("inventory.addCategory")}>
        {/* Add form */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <Input
              label={t('inventory.name')}
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder={t('inventory.namePlaceholder')}
              dir={dirForInput(i18n.language)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleAddCategory} disabled={!newCatName.trim()}>
              <Plus className="w-4 h-4" />
{t("common.add")}
            </Button>
          </div>
        </div>

        {/* Table */}
        {categories.length === 0 ? (
          <EmptyState message={t('inventory.noCategories')} icon={<FolderTree className="w-12 h-12" />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('inventory.name')}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat: ArticleCategory) => (
                  <tr key={cat.id} className="border-b border-border hover:bg-muted">
                    {editCatId === cat.id ? (
                      <>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={editCatName}
                            onChange={(e) => setEditCatName(e.target.value)}
                            className="w-full px-2 py-1 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            dir={dirForInput(i18n.language)}
                            autoFocus
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={handleUpdateCategory} disabled={!editCatName.trim()}>
{t("common.save")}
                            </Button>
                            <Button size="sm" variant="secondary" onClick={cancelEditCategory}>
{t("common.cancel")}
                            </Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-4 font-medium text-foreground">{cat.name}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEditCategory(cat)}
                              className="p-1 text-muted-foreground/70 hover:text-primary transition-colors"
                              title={t('common.edit')}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="p-1 text-muted-foreground/70 hover:text-danger-600 transition-colors"
                              title={t('common.delete')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ========== Storage Locations Section ========== */}
      <Card titleAr={t("inventory.addLocation")}>
        {/* Add form */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <Input
              label={t('inventory.name')}
              value={newLocName}
              onChange={(e) => setNewLocName(e.target.value)}
              placeholder={t('inventory.locationPlaceholder')}
              dir={dirForInput(i18n.language)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleAddLocation} disabled={!newLocName.trim()}>
              <Plus className="w-4 h-4" />
{t("common.add")}
            </Button>
          </div>
        </div>

        {/* Table */}
        {locations.length === 0 ? (
          <EmptyState message={t('inventory.noLocations')} icon={<MapPin className="w-12 h-12" />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('inventory.name')}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc: StorageLocation) => (
                  <tr key={loc.id} className="border-b border-border hover:bg-muted">
                    {editLocId === loc.id ? (
                      <>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={editLocName}
                            onChange={(e) => setEditLocName(e.target.value)}
                            className="w-full px-2 py-1 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            dir={dirForInput(i18n.language)}
                            autoFocus
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={handleUpdateLocation} disabled={!editLocName.trim()}>
{t("common.save")}
                            </Button>
                            <Button size="sm" variant="secondary" onClick={cancelEditLocation}>
{t("common.cancel")}
                            </Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-4 font-medium text-foreground">{loc.name}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEditLocation(loc)}
                              className="p-1 text-muted-foreground/70 hover:text-primary transition-colors"
                              title={t('common.edit')}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteLocation(loc.id)}
                              className="p-1 text-muted-foreground/70 hover:text-danger-600 transition-colors"
                              title={t('common.delete')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ========== Article Statuses Section ========== */}
      <Card titleAr={t("inventory.addStatus")}>
        {/* Add form — single field */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <Input
              label={t('common.status')}
              value={newStsName}
              onChange={(e) => setNewStsName(e.target.value)}
              placeholder={t('inventory.namePlaceholder')}
              required
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleAddStatus} disabled={!newStsName.trim()}>
              <Plus className="w-4 h-4" />{t('common.add')}
            </Button>
          </div>
        </div>

        {/* Table */}
        {statuses.length === 0 ? (
          <EmptyState message={t('inventory.noStatuses')} icon={<CheckCircle className="w-12 h-12" />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('common.status')}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {statuses.map((sts: ArticleStatus) => (
                  <tr key={sts.id} className="border-b border-border hover:bg-muted">
                    {editStsId === sts.id ? (
                      <>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={editStsName}
                            onChange={(e) => setEditStsName(e.target.value)}
                            className="w-full px-2 py-1 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            autoFocus
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={handleUpdateStatus} disabled={!editStsName.trim()}>
{t("common.save")}
                            </Button>
                            <Button size="sm" variant="secondary" onClick={cancelEditStatus}>
{t("common.cancel")}
                            </Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-4 font-medium text-foreground">{sts.name}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEditStatus(sts)}
                              className="p-1 text-muted-foreground/70 hover:text-primary transition-colors"
                              title={t('common.edit')}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteStatus(sts.id)}
                              className="p-1 text-muted-foreground/70 hover:text-danger-600 transition-colors"
                              title={t('common.delete')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

    </div>
  )
}

// ============================================================
// STOCK TAB
// ============================================================

function StockTab({ actionsRef, statusLabels }: { actionsRef: React.MutableRefObject<{ toggleFilter: () => void; addItem: () => void }>; statusLabels: Record<string, string> }) { const { t, i18n } = useTranslation();
  const { association } = useAuth();
  const { data: articles = [], isLoading: loading } = useArticles()
  const { data: categories = [] } = useArticleCategories()
  const { data: locations = [] } = useStorageLocations()
  const { data: statuses = [] } = useArticleStatuses()
  const createArticle = useCreateArticle()
  const updateArticle = useUpdateArticle()
  const deleteArticle = useDeleteArticle()

  // Expose actions to parent header buttons via effect
  useEffect(() => {
    actionsRef.current = { toggleFilter: () => setFilterOpen((v) => !v), addItem: openAdd }
  })
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterSearchTerm, setFilterSearchTerm] = useState('')
  const [committedFilters, setCommittedFilters] = useState<{
    searchTerm: string; category: string; status: string; storage: string; type: string;
  }>({ searchTerm: '', category: '', status: '', storage: '', type: '' })
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterArticleStatus, setFilterArticleStatus] = useState('')
  const [filterStorage, setFilterStorage] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)
  const [form, setForm] = useState(EMPTY_ARTICLE_FORM)

  const applyStockFilters = () => {
    setCommittedFilters({ searchTerm: filterSearchTerm, category: filterCategory, status: filterStatus, storage: filterStorage, type: filterType })
  }

  const resetStockFilters = () => {
    setFilterSearchTerm('')
    setFilterCategory('')
    setFilterStatus('')
    setFilterArticleStatus('')
    setFilterStorage('')
    setFilterType('')
    setCommittedFilters({ searchTerm: '', category: '', status: '', storage: '', type: '' })
  }

  const filtered = articles.filter((a: Article) => {
    const acat = a as any
    const catName = getCategoryName(acat.category, categories)
    const st = committedFilters.searchTerm

    const matchesSearch =
      !st ||
      a.name.toLowerCase().includes(st.toLowerCase()) ||
      catName.toLowerCase().includes(st.toLowerCase()) ||
      (a.reference || '').toLowerCase().includes(st.toLowerCase()) ||
      (typeof acat.category === 'object' ? acat.category.name?.toLowerCase().includes(st.toLowerCase()) : (acat.category || '').toLowerCase().includes(st.toLowerCase()))
    const matchesCategory =
      !committedFilters.category || (typeof acat.category === 'object' ? acat.category.id === committedFilters.category : acat.category === committedFilters.category)
    const matchesStatus = !committedFilters.status || a.status === committedFilters.status
    const matchesStorage =
      !committedFilters.storage || a.storageLocation === committedFilters.storage
    const matchesType =
      !committedFilters.type ||
      (committedFilters.type === 'permanent' ? a.isPermanent : !a.isPermanent)
    return matchesSearch && matchesCategory && matchesStatus && matchesStorage && matchesType
  })

  const openAdd = () => {
    setEditingArticle(null)
    setForm(EMPTY_ARTICLE_FORM)
    setShowModal(true)
  }

  function resolveId(v: any): string {
    if (!v) return ''
    return typeof v === 'object' ? (v.id || '') : v
  }

  const openEdit = (article: Article) => {
    setEditingArticle(article)
    setForm({
      name: article.name,
      description: article.description || '',
      category: resolveId(article.category),
      quantity: article.quantity,
      status: article.status,
      statusId: resolveId(article.statusModel),
      storageLocation: resolveId(article.storageLocation),
      isPermanent: article.isPermanent,
      notes: article.notes || '',
    })
    setShowModal(true)
  }

  const [formError, setFormError] = useState('')

  const handleSubmit = async () => {
    setFormError('')
    // Client-side validation before sending
    if (!form.storageLocation) {
      setFormError(t('inventory.selectLocation'))
      return
    }
    const data = {
      name: form.name,
      description: form.description || undefined,
      category: form.category,
      quantity: form.quantity,
      status: form.statusId ? 'disponible' : (form.status || 'disponible'),
      statusId: form.statusId || undefined,
      storageLocation: form.storageLocation,
      isPermanent: form.isPermanent,
      notes: form.notes || undefined,
    }

    try {
      if (editingArticle) {
        await updateArticle.mutateAsync({ id: editingArticle.id, data })
      } else {
        await createArticle.mutateAsync(data)
      }
      setShowModal(false)
      setForm(EMPTY_ARTICLE_FORM)
      setEditingArticle(null)
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || t('inventory.addFailed')
      setFormError(msg)
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm(t('inventory.confirmDeleteArticle'))) {
      await deleteArticle.mutateAsync(id)
    }
  }

  const categoryOptions = categories.map((c: ArticleCategory) => ({
    value: c.id,
    label: `${c.name}`,
  }))

  const locationOptions = locations.map((l: StorageLocation) => ({
    value: l.id,
    label: `${l.name}`,
  }))

  const statusOptions = [
    { value: '', label: t('common.all') },
    ...statuses.map((s: ArticleStatus) => ({ value: s.name, label: s.name })),
  ]

  const typeOptions = [
    { value: '', label: t('common.all') },
    { value: 'permanent', label: t('inventory.final') },
    { value: 'returnable', label: t('inventory.returnable') },
  ]

  if (loading) return <LoadingSpinner />

  return (
    <>
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
        <input
          type="text"
          placeholder={t('inventory.searchArticle')}
          value={filterSearchTerm}
          onChange={(e) => setFilterSearchTerm(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') applyStockFilters(); }}
          className="w-full pr-10 pl-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Filters */}
      {filterOpen && (
        <Card titleAr={t("inventory.advancedSearch")}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <SearchableSelect
              labelAr={t('inventory.category')}
              value={filterCategory}
              onChange={setFilterCategory}
              options={[
                { value: '', label: t('common.all') },
                ...categoryOptions,
              ]}
              placeholder={t('common.all')}
            />
            <SearchableSelect
              labelAr={t('common.status')}
              value={filterStatus}
              onChange={setFilterStatus}
              options={statusOptions}
              placeholder={t('common.all')}
            />
            <SearchableSelect
              labelAr={t('inventory.storageLocation')}
              value={filterStorage}
              onChange={setFilterStorage}
              options={[
                { value: '', label: t('common.all') },
                ...locationOptions,
              ]}
              placeholder={t('common.all')}
            />
            <SearchableSelect
              labelAr={t('dashboard.type')}
              value={filterType}
              onChange={setFilterType}
              options={typeOptions}
              placeholder={t('common.all')}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={applyStockFilters}>
              <Search className="w-4 h-4" /> {t("common.search")}
            </Button>
            <Button variant="secondary" size="sm" onClick={resetStockFilters}>
{t("doctors.reset")}
            </Button>
          </div>
        </Card>
      )}

      {/* Articles table */}
      <Card>
        {filtered.length === 0 ? (
          <EmptyState message={t('inventory.noArticles')} icon={<Package className="w-12 h-12" />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('inventory.refCode')}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('inventory.sectionName')}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground hidden sm:table-cell">{t('inventory.category')}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('inventory.quantity')}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('inventory.available')}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('common.status')}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">{t('inventory.storageLocation')}</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((article: Article) => (
                  <tr key={article.id} className="border-b border-border hover:bg-muted transition-colors cursor-pointer" onClick={() => openEdit(article)}>
                    <td className="py-3 px-4 font-semibold text-primary" dir="ltr">
                      {article.reference || '—'}
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">{article.name}</td>
                    <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">
                      {getCategoryName(article.category, categories)}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{article.quantity}</td>
                    <td className="py-3 px-4 text-muted-foreground">{article.availableQuantity}</td>
                    <td className="py-3 px-4">
                      <Badge variant="default">
                        {(article as any).statusModel?.name || statusLabels[article.status] || article.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">
                      {getStorageName(article.storageLocation, locations)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(article); }}
                        className="p-1.5 text-muted-foreground/70 hover:text-primary transition-colors"
                        title={t('common.edit')}
                      >
                        <Edit size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setForm(EMPTY_ARTICLE_FORM); setEditingArticle(null); }}
        title={editingArticle ? t('inventory.articleDetails') : t('inventory.newArticle')}
        size="lg"
      >
        {editingArticle ? (
          /* ---- EDIT MODE: only storageLocation, status, notes are editable ---- */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted rounded-lg p-4">
              <div><p className="text-xs text-muted-foreground">{t('inventory.name')}</p><p className="font-medium">{form.name}</p></div>
              {form.description && <div><p className="text-xs text-muted-foreground">{t('inventory.description')}</p><p className="font-medium">{form.description}</p></div>}
              <div><p className="text-xs text-muted-foreground">{t('inventory.category')}</p><p className="font-medium">{categories.find((c) => c.id === form.category)?.name || '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">{t('inventory.quantity')}</p><p className="font-medium">{form.quantity}</p></div>
              <div><SearchableSelect label={t('inventory.storageLocation')} value={form.storageLocation} onChange={(val) => setForm({ ...form, storageLocation: val })} options={locationOptions} required /></div>
              <div><SearchableSelect label={t('common.status')} value={form.statusId} onChange={(val) => { const s = statuses.find((st: ArticleStatus) => st.id === val); setForm({ ...form, statusId: val, isPermanent: s ? s.isPermanent : false }); }} options={statuses.map((s: ArticleStatus) => ({ value: s.id, label: s.name }))} /></div>
            </div>
            <TextArea label={t('common.notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            {formError && <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3">{formError}</div>}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowModal(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleSubmit}>{t('common.update')}</Button>
            </div>
          </div>
        ) : (
          /* ---- CREATE MODE: all fields editable ---- */
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label={t('inventory.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required dir={dirForInput(i18n.language)} />
              <SearchableSelect label={t('inventory.category')} value={form.category} onChange={(val) => setForm({ ...form, category: val })} options={categoryOptions} required />
              <SearchableSelect label={t('inventory.storageLocation')} value={form.storageLocation} onChange={(val) => setForm({ ...form, storageLocation: val })} options={locationOptions} required />
              <Input label={t('inventory.quantity')} type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} required />
              <SearchableSelect label={t('common.status')} value={form.statusId} onChange={(val) => { const s = statuses.find((st: ArticleStatus) => st.id === val); setForm({ ...form, statusId: val, isPermanent: s ? s.isPermanent : false }); }} options={statuses.map((s: ArticleStatus) => ({ value: s.id, label: s.name }))} />
              <div className="md:col-span-2"><TextArea label={t('common.notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            {formError && <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3 mt-4">{formError}</div>}
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowModal(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleSubmit} disabled={!form.name || !form.category}>{t('common.add')}</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

// ============================================================
// LOANS TAB
// ============================================================

function LoansTab({ actionsRef, statusLabels, loanStatusLabels }: { actionsRef: React.MutableRefObject<{ toggleFilter: () => void; addItem: () => void }>; statusLabels: Record<string, string>; loanStatusLabels: Record<string, string> }) { const { t, i18n } = useTranslation();
  const queryClient = useQueryClient()
  const { association } = useAuth()
  const { data: loans = [], isLoading: loading } = useLoans()
  const { data: articles = [] } = useArticles()
  const { data: beneficiaries = [] } = useBeneficiaries()
  const { data: statuses = [] } = useArticleStatuses()
  const createLoan = useCreateLoan()
  const returnItems = useReturnItems()
  const addItemToLoan = useAddItemToLoan()
  const removeItemFromLoan = useRemoveItemFromLoan()
  const markLoanDefinitive = useMarkLoanDefinitive()

  const [searchTerm, setSearchTerm] = useState('')
  const [committedLoanFilters, setCommittedLoanFilters] = useState({ searchTerm: '', status: '', articleStatus: '', beneficiary: '', dateFrom: '', dateTo: '' })
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterBeneficiary, setFilterBeneficiary] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  const applyLoanFilters = () => {
    setCommittedLoanFilters({ searchTerm, status: filterStatus, articleStatus: filterArticleStatus, beneficiary: filterBeneficiary, dateFrom: filterDateFrom, dateTo: filterDateTo })
  }

  const resetLoanFilters = () => {
    setSearchTerm('')
    setFilterStatus('')
    setFilterBeneficiary('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setCommittedLoanFilters({ searchTerm: '', status: '', beneficiary: '', dateFrom: '', dateTo: '' })
  }
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [expandedLoans, setExpandedLoans] = useState<Set<string>>(new Set())

  const toggleExpandLoan = (id: string) => {
    setExpandedLoans(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // Expose actions to parent header buttons
  useEffect(() => {
    actionsRef.current = { toggleFilter: () => setFilterOpen((v) => !v), addItem: () => { queryClient.invalidateQueries({ queryKey: ['articles'] }); setShowCreateModal(true); } }
  })

  // Create loan form state
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState('')
  const [loanItems, setLoanItems] = useState<{ articleId: string; quantity: number; conditionOnLoan: string; expectedReturnDate: string }[]>([])
  // expectedReturnDate is now per-item in loanItems
  const [loanNotes, setLoanNotes] = useState('')

  // Return items form state
  const [showReturnForm, setShowReturnForm] = useState(false)
  const [isReturning, setIsReturning] = useState(false)
  const [returnEntries, setReturnEntries] = useState<{ articleId: string; quantity: number; condition: string }[]>([])

  // Add item to existing loan form state
  const [showAddItemForm, setShowAddItemForm] = useState(false)
  const [newItemArticleId, setNewItemArticleId] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState(1)
  const [newItemCondition, setNewItemCondition] = useState('')

  const filteredLoans = loans.filter((l: Loan) => {
    const st = committedLoanFilters.searchTerm
    const matchesSearch =
      !st ||
      (l.beneficiaryName || '').toLowerCase().includes(st.toLowerCase())
    const matchesStatus = !committedLoanFilters.status || l.status === committedLoanFilters.status
    const matchesBeneficiary =
      !committedLoanFilters.beneficiary ||
      l.beneficiaryId === committedLoanFilters.beneficiary ||
      (l.beneficiaryName || '').toLowerCase().includes((committedLoanFilters.beneficiary || '').toLowerCase()) ||
      (l.beneficiaryName || '').toLowerCase().includes(committedLoanFilters.beneficiary.toLowerCase())
    const matchesDateFrom = !committedLoanFilters.dateFrom || l.loanDate >= committedLoanFilters.dateFrom
    const matchesDateTo = !committedLoanFilters.dateTo || l.loanDate <= committedLoanFilters.dateTo
    const matchesArticleStatus = !committedLoanFilters.articleStatus || l.items.some((item) => {
      if (committedLoanFilters.articleStatus === 'settled') return item.returnedQuantity >= item.quantity
      if (committedLoanFilters.articleStatus === 'partiallyReturned') return item.returnedQuantity > 0 && item.returnedQuantity < item.quantity
      if (committedLoanFilters.articleStatus === 'unreturned') return item.returnedQuantity === 0
      return true
    })
    return matchesSearch && matchesStatus && matchesBeneficiary && matchesDateFrom && matchesDateTo && matchesArticleStatus
  })

  const availableArticles = articles.filter((a: Article) => a.availableQuantity > 0 && !a.isPermanent)

  // Pre-computed beneficiary options for SearchableSelect
  const beneficiaryOptions = beneficiaries.map((b: Beneficiary) => ({
    value: b.id,
    label: `${b.lastName} ${b.firstName}`,
  }))

  const loanStatusOptions = [
    { value: '', label: t('common.all') },
    { value: 'en_cours', label: t('inventory.ongoing') },
    { value: 'partiellement_retourne', label: t('inventory.partiallyReturned') },
    { value: 'definitif', label: t('inventory.final') },
  ]

  // ---- Create Loan ----

  const addLoanItemRow = () => {
    setLoanItems([...loanItems, { articleId: '', quantity: 1, conditionOnLoan: '', expectedReturnDate: '' }])
  }

  const updateLoanItemRow = (index: number, field: string, value: string | number) => {
    const updated = [...loanItems]
    updated[index] = { ...updated[index], [field]: value }
    setLoanItems(updated)
  }

  const removeLoanItemRow = (index: number) => {
    setLoanItems(loanItems.filter((_, i) => i !== index))
  }

  const handleCreateLoan = async () => {
    const beneficiary = beneficiaries.find((b: Beneficiary) => b.id === selectedBeneficiaryId)
    if (!beneficiary || loanItems.length === 0) return

    const items: LoanItem[] = loanItems
      .filter((li) => li.articleId)
      .map((li) => {
        const article = articles.find((a: Article) => a.id === li.articleId)
        return {
          articleId: li.articleId,
          articleName: article?.name || '',
          quantity: li.quantity,
          returnedQuantity: 0,
          conditionOnLoan: li.conditionOnLoan,
          expectedReturnDate: li.expectedReturnDate || undefined,
        }
      })

    await createLoan.mutateAsync({
      reference: generateLoanReference(),
      beneficiaryId: beneficiary.id,
      beneficiaryName: `${beneficiary.firstName} ${beneficiary.lastName}`,
      beneficiaryReference: beneficiary.reference,
      items,
      status: 'en_cours',
      loanDate: new Date().toISOString().split('T')[0],
      notes: loanNotes || undefined,
    })

    setShowCreateModal(false)
    setSelectedBeneficiaryId('')
    setLoanItems([])
    setLoanNotes('')
  }

  // ---- Loan Detail ----

  const openLoanDetail = (loan: Loan) => {
    setSelectedLoan(loan)
    setShowReturnForm(false)
    setShowAddItemForm(false)
    setReturnEntries([])
    setShowDetailModal(true)
  }

  // ---- Return Items ----

  const openReturnForm = () => {
    if (!selectedLoan) return
    setReturnEntries(
      selectedLoan.items
        .filter((item) => item.returnedQuantity < item.quantity)
        .map((item) => ({
          articleId: item.articleId,
          quantity: 0,
          condition: '',
        }))
    )
    setShowReturnForm(true)
    setShowAddItemForm(false)
  }

  const updateReturnEntry = (index: number, field: string, value: string | number) => {
    const updated = [...returnEntries]
    updated[index] = { ...updated[index], [field]: value }
    setReturnEntries(updated)
  }

  const handleReturnItems = async () => {
    if (!selectedLoan || isReturning) return
    const validReturns = returnEntries.filter((r) => r.quantity > 0)
    if (validReturns.length === 0) return

    setIsReturning(true)
    try {
      await returnItems.mutateAsync({ id: selectedLoan.id, items: validReturns })
      await queryClient.invalidateQueries({ queryKey: ['loans'] })
      setShowReturnForm(false)
      setShowDetailModal(null)
      setSelectedLoan(null)
    } catch (err) {
      console.error('Return failed:', err)
    } finally {
      setIsReturning(false)
    }
  }

  // ---- Add Item to Loan ----

  const openAddItemForm = () => {
    setNewItemArticleId('')
    setNewItemQuantity(1)
    setNewItemCondition('')
    setShowAddItemForm(true)
    setShowReturnForm(false)
  }

  const handleAddItemToLoan = async () => {
    if (!selectedLoan || !newItemArticleId) return
    const article = articles.find((a: Article) => a.id === newItemArticleId)
    if (!article) return

    await addItemToLoan.mutateAsync({
      id: selectedLoan.id,
      data: {
        articleId: newItemArticleId,
        articleName: article.name,
        quantity: newItemQuantity,
        returnedQuantity: 0,
        conditionOnLoan: newItemCondition,
      },
    })

    await queryClient.invalidateQueries({ queryKey: ['loans'] })
    const loansData = queryClient.getQueryData<Loan[]>(['loans'])
    if (loansData) {
      const updated = loansData.find((l) => l.id === selectedLoan.id)
      if (updated) setSelectedLoan(updated)
    }
    setShowAddItemForm(false)
  }

  // ---- Remove Item from Loan ----

  const handleRemoveItem = async (articleId: string) => {
    if (!selectedLoan) return
    if (!window.confirm(t('inventory.confirmRemoveItemFromLoan'))) return

    await removeItemFromLoan.mutateAsync({ id: selectedLoan.id, articleId })
    await queryClient.invalidateQueries({ queryKey: ['loans'] })
    const loansData = queryClient.getQueryData<Loan[]>(['loans'])
    if (loansData) {
      const updated = loansData.find((l) => l.id === selectedLoan.id)
      if (updated) setSelectedLoan(updated)
    }
  }

  // ---- Mark Definitive ----

  const handleMarkDefinitive = async () => {
    if (!selectedLoan) return
    if (!window.confirm(t('inventory.confirmMakeDefinitive'))) return

    await markLoanDefinitive.mutateAsync(selectedLoan.id)
    await queryClient.invalidateQueries({ queryKey: ['loans'] })
    setShowDetailModal(null)
    setSelectedLoan(null)
  }

  // ---- Print Loan ----

  const handlePrintLoan = (loan: Loan) => {
    const itemsHtml = loan.items.map((item: any) =>
      `<div class="row"><span class="lbl">${t('common.article')}</span><span class="val">${item.articleName} <i>×${item.quantity}</i></span></div>`
    ).join('')

    const statusLabel = loanStatusLabels[loan.status] || loan.status

    printReceipt(
      t('inventory.loanDetails'),
      t('inventory.loanDetails'),
      `<div class="col">
        <div class="row"><span class="lbl">${t('inventory.refCode')}</span><span class="val">${loan.reference || '—'}</span></div>
        <div class="row"><span class="lbl">${t('medical.beneficiary')}</span><span class="val">${loan.beneficiaryName}</span></div>
        <div class="row"><span class="lbl">${t('medical.beneficiaryRef')}</span><span class="val">${loan.beneficiaryReference || '—'}</span></div>
        <div class="row"><span class="lbl">${t('common.status')}</span><span class="val">${statusLabel}</span></div>
        <div class="row"><span class="lbl">${t('inventory.loanDate')}</span><span class="val">${formatDate(loan.loanDate)}</span></div>
        ${loan.expectedReturnDate ? `<div class="row"><span class="lbl">${t('inventory.expectedReturnDate')}</span><span class="val">${formatDate(loan.expectedReturnDate)}</span></div>` : ''}
        ${loan.actualReturnDate ? `<div class="row"><span class="lbl">${t('inventory.actualReturnDate')}</span><span class="val">${formatDate(loan.actualReturnDate)}</span></div>` : ''}
       </div>
       <div class="col">
        ${itemsHtml}
       </div>`,
      loan.status === 'definitif' ? 'color:#dc2626' : loan.status === 'retourne' ? 'color:#16a34a' : 'color:#2563eb',
      loan.items.reduce((sum: number, item: any) => sum + item.quantity, 0).toString(),
      `${t('inventory.totalSummary')}: ${loan.items.length} ${t('inventory.articles')} — ${loan.items.reduce((sum: number, item: any) => sum + item.quantity, 0)} ${t('inventory.pieces')} — ${statusLabel}`,
      '',
      t('receipt.beneficiarySign'),
      t('receipt.stampSignature'),
      association?.name
    )
  }

  if (loading) return <LoadingSpinner />

  return (
    <>
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
        <input
          type="text"
          placeholder={t('inventory.searchLoan')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') applyLoanFilters(); }}
          className="w-full pr-10 pl-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Filters */}
      {filterOpen && (
        <Card titleAr={t("inventory.advancedSearch")}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <SearchableSelect
              labelAr={t('inventory.loanStatus')}
              value={filterStatus}
              onChange={setFilterStatus}
              options={loanStatusOptions}
              placeholder={t('common.all')}
            />
            <SearchableSelect
              labelAr={t('inventory.articleStatus')}
              value={filterArticleStatus}
              onChange={setFilterArticleStatus}
              options={[
                { value: '', label: t('common.all') },
                { value: 'settled', label: t('inventory.settled') },
                { value: 'partiallyReturned', label: t('inventory.partiallyReturned') },
                { value: 'unreturned', label: t('inventory.unreturned') },
              ]}
              placeholder={t('common.all')}
            />
            <SearchableSelect
              labelAr={t('medical.beneficiary')}
              value={filterBeneficiary}
              onChange={setFilterBeneficiary}
              options={[
                { value: '', label: t('common.all') },
                ...beneficiaryOptions,
              ]}
              placeholder={t('common.all')}
            />
            <Input
              labelAr={t('analytics.fromDate')}
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
            />
            <Input
              labelAr={t('analytics.toDate')}
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={applyLoanFilters}>
              <Search className="w-4 h-4" /> {t("common.search")}
            </Button>
            <Button variant="secondary" size="sm" onClick={resetLoanFilters}>
{t("doctors.reset")}
            </Button>
          </div>
        </Card>
      )}

      {/* Loans table */}
      <Card>
        {filteredLoans.length === 0 ? (
          <EmptyState message={t("inventory.noLoans")} icon={<ArrowLeftRight className="w-12 h-12" />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-8"></th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('inventory.refCode')}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('medical.beneficiary')}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">{t('medical.beneficiaryRef')}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('inventory.quantity')}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('inventory.returnedItems')}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">{t('finance.remainingAmount')}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('common.status')}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('inventory.loanDate')}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('inventory.expectedReturnDate')}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('inventory.actualReturnDate')}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredLoans.map((loan: Loan) => {
                  const isExpanded = expandedLoans.has(loan.id)
                  return (
                  <React.Fragment key={loan.id}>
                  <tr className="border-b border-border hover:bg-muted transition-colors cursor-pointer" onClick={() => openLoanDetail(loan)}>
                    <td className="py-3 px-2 text-muted-foreground">
                      <button onClick={(e) => { e.stopPropagation(); toggleExpandLoan(loan.id); }}
                        className="p-1 hover:text-primary transition-colors">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-semibold text-primary" dir="ltr">
                      {loan.reference || '—'}
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">{loan.beneficiaryName}</td>
                    <td className="py-3 px-4 text-muted-foreground hidden lg:table-cell" dir="ltr">
                      {loan.beneficiaryReference || '—'}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {loan.items.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {loan.items.map((item) => item.returnedQuantity || 0).reduce((a, b) => a + b, 0) || '—'}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">
                      {loan.items.map((item) => item.quantity - (item.returnedQuantity || 0)).reduce((a, b) => a + b, 0)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={LOAN_STATUS_VARIANTS[loan.status] || 'default'}>
                        {loanStatusLabels[loan.status] || loan.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{formatDate(loan.loanDate)}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {(() => {
                        const dates = loan.items.map(i => i.expectedReturnDate).filter(Boolean);
                        if (dates.length === 0) return '—';
                        const earliest = [...dates].sort()[0];
                        return formatDate(earliest!);
                      })()}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {loan.actualReturnDate ? formatDate(loan.actualReturnDate) : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); openLoanDetail(loan); }}
                        className="p-1 text-muted-foreground/70 hover:text-primary transition-colors"
                        title={t("common.details")}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${loan.id}-items`} className="bg-muted/50">
                      <td colSpan={12} className="p-0">
                        <div className="px-6 py-3">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-start py-2 px-3 font-medium text-muted-foreground">{t('common.article')}</th>
                                <th className="text-start py-2 px-3 font-medium text-muted-foreground">{t('inventory.quantity')}</th>
                                <th className="text-start py-2 px-3 font-medium text-muted-foreground">{t('inventory.returnedItems')}</th>
                                <th className="text-start py-2 px-3 font-medium text-muted-foreground">{t('finance.remainingAmount')}</th>
                                <th className="text-start py-2 px-3 font-medium text-muted-foreground">{t('inventory.expectedReturnDate')}</th>
                                <th className="text-start py-2 px-3 font-medium text-muted-foreground">{t('common.status')}</th>
                                <th className="text-start py-2 px-3 font-medium text-muted-foreground">{t('inventory.situation')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {loan.items.map((item) => {
                                const itemOverdue = item.expectedReturnDate && new Date(item.expectedReturnDate) < new Date()
                                return (
                                <tr key={item.articleId} className="border-b border-border/50">
                                  <td className="py-2 px-3 font-medium text-foreground">{item.articleName}</td>
                                  <td className="py-2 px-3 text-muted-foreground">{item.quantity}</td>
                                  <td className="py-2 px-3">
                                    <span className={item.returnedQuantity >= item.quantity ? 'text-success font-medium' : item.returnedQuantity > 0 ? 'text-warning font-medium' : 'text-muted-foreground'}>
                                      {item.returnedQuantity}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-muted-foreground">{item.quantity - item.returnedQuantity}</td>
                                  <td className="py-2 px-3 text-muted-foreground">{item.expectedReturnDate ? formatDate(item.expectedReturnDate) : '—'}</td>
                                  <td className="py-2 px-3">
                                    {item.returnedQuantity >= item.quantity ? <Badge variant="success">{t('inventory.settled')}</Badge> : item.returnedQuantity > 0 ? <Badge variant="warning">{t('inventory.partiallyReturned')}</Badge> : <Badge variant="info">{t('inventory.unreturned')}</Badge>}
                                  </td>
                                  <td className="py-2 px-3">
                                    {loan.status === 'retourne' || loan.status === 'definitif' ? <Badge variant="success">{t('inventory.settled')}</Badge> :
                                     !item.expectedReturnDate ? <span className="text-muted-foreground/50">—</span> :
                                     itemOverdue ? <Badge variant="danger">{t('inventory.overdue')}</Badge> :
                                     <Badge variant="info">{t('inventory.onTime')}</Badge>}
                                  </td>
                                </tr>
                              )})}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ============ CREATE LOAN MODAL ============ */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setSelectedBeneficiaryId(''); setLoanItems([]); setLoanNotes(''); }}
        title={t("inventory.newLoan")}
        size="xl"
      >
        <div className="space-y-6">
          {/* Beneficiary selector */}
          <SearchableSelect
            labelAr={t('medical.beneficiary')}
            value={selectedBeneficiaryId}
            onChange={(val) => {
              setSelectedBeneficiaryId(val)
              const b = beneficiaries.find((ben: Beneficiary) => ben.id === val)
            }}
            options={beneficiaryOptions}
            required
          />

          {/* Dynamic items list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-foreground">{t('inventory.quantity')}</label>
              <Button size="sm" variant="secondary" onClick={addLoanItemRow}>
                <Plus className="w-3 h-3" />
{t("inventory.addArticle")}
              </Button>
            </div>
            {loanItems.length === 0 && (
              <p className="text-sm text-muted-foreground/70">{t('inventory.noArticles')}</p>
            )}
            {loanItems.map((item: { articleId: string; quantity: number; conditionOnLoan: string; expectedReturnDate: string }, index: number) => (
              <div key={index} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 p-3 bg-muted rounded-lg">
                <SearchableSelect
                  labelAr={t('common.article')}
                  value={item.articleId}
                  onChange={(val) => updateLoanItemRow(index, 'articleId', val)}
                  options={availableArticles.map((a: Article) => ({
                    value: a.id,
                    label: `${a.name} ({t('inventory.available')}: ${a.availableQuantity})`,
                  }))}
                />
                <Input
                  labelAr={t('inventory.quantity')}
                  type="number"
                  min={1}
                  max={
                    item.articleId
                      ? articles.find((a: Article) => a.id === item.articleId)?.availableQuantity || 1
                      : 1
                  }
                  value={item.quantity}
                  onChange={(e) => updateLoanItemRow(index, 'quantity', parseInt(e.target.value) || 1)}
                />
                <div>
                  <Input
                    label={t('inventory.expectedReturnDate')}
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={item.expectedReturnDate}
                    onChange={(e) => updateLoanItemRow(index, 'expectedReturnDate', e.target.value)}
                    dir="ltr"
                  />
                </div>
                <SearchableSelect
                  labelAr={t("inventory.loanStatusAtLoan")}
                  value={item.conditionOnLoan}
                  onChange={(val) => updateLoanItemRow(index, 'conditionOnLoan', val)}
                  options={
                    statuses.length > 0
                      ? statuses.map((s: ArticleStatus) => ({ value: s.name, label: s.name }))
                      : []
                  }
                />
                <div className="flex items-end">
                  <Button size="sm" variant="danger" onClick={() => removeLoanItemRow(index)}>
                    <Trash2 className="w-3 h-3" />
{t("common.remove")}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          <TextArea
            labelAr={t('common.notes')}
            value={loanNotes}
            onChange={(e) => setLoanNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
{t("common.cancel")}
            </Button>
            <Button
              onClick={handleCreateLoan}
              disabled={!selectedBeneficiaryId || loanItems.length === 0 || loanItems.some((li) => !li.articleId)}
            >
{t("inventory.newLoan")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ============ LOAN DETAIL MODAL ============ */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={t("inventory.loanDetails")}
        size="xl"
      >
        {selectedLoan && (
          <div className="space-y-6">
            {/* Beneficiary info */}
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{t("medical.beneficiary")}</h4>
                  <p className="text-sm text-foreground">{selectedLoan.beneficiaryName}</p>
                  <p className="text-xs text-muted-foreground" dir="ltr">{t('medical.beneficiaryRef')}: {selectedLoan.beneficiaryReference || '—'}</p>
                </div>
                <div className="text-left">
                  <span className="text-xs text-muted-foreground">{t("inventory.loanRefCode")}</span>
                  <p className="text-sm font-bold text-primary" dir="ltr">{selectedLoan.reference || '—'}</p>
                  <div className="mt-1">
                    <Badge variant={LOAN_STATUS_VARIANTS[selectedLoan.status] || 'default'}>
                      {loanStatusLabels[selectedLoan.status] || selectedLoan.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span> {t('inventory.loanDate')}: {formatDate(selectedLoan.loanDate)}</span>
                {selectedLoan.expectedReturnDate && (
                  <span> {t('inventory.expectedReturnDate')}: {formatDate(selectedLoan.expectedReturnDate)}</span>
                )}
                {selectedLoan.actualReturnDate && (
                  <span> {t('inventory.actualReturnDate')}: {formatDate(selectedLoan.actualReturnDate)}</span>
                )}
              </div>
            </div>

            {/* Items list */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">{t('inventory.quantity')}</h4>
              <div className="flex flex-wrap gap-2 mb-3 text-xs text-muted-foreground">
                {selectedLoan.items.map((item) => {
                  const art = articles.find((a: Article) => a.id === item.articleId)
                  return art ? (
                    <span key={item.articleId} className="bg-muted px-2 py-1 rounded">
                      {art.name}: {t('inventory.quantity')} {art.quantity} | {t('inventory.available')} {art.availableQuantity}
                    </span>
                  ) : null
                })}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-start py-2 px-3 font-medium text-muted-foreground">{t('common.article')}</th>
                      <th className="text-start py-2 px-3 font-medium text-muted-foreground">{t('inventory.category')}</th>
                      <th className="text-start py-2 px-3 font-medium text-muted-foreground">{t('inventory.quantity')}</th>
                      <th className="text-start py-2 px-3 font-medium text-muted-foreground">{t('inventory.returnedItems')}</th>
                      <th className="text-start py-2 px-3 font-medium text-muted-foreground">{t('finance.remainingAmount')}</th>
                      <th className="text-start py-2 px-3 font-medium text-muted-foreground">{t('inventory.expectedReturnDate')}</th>
                      <th className="text-start py-2 px-3 font-medium text-muted-foreground">{t('inventory.loanStatusAtLoan')}</th>
                      <th className="text-start py-2 px-3 font-medium text-muted-foreground">{t('inventory.loanStatusAtReturn')}</th>
                      <th className="text-start py-2 px-3 font-medium text-muted-foreground">{t('common.status')}</th>
                      <th className="text-start py-2 px-3 font-medium text-muted-foreground">{t('inventory.situation')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedLoan.items.map((item) => (
                      <tr key={item.articleId} className="border-b border-border">
                        <td className="py-2 px-3 text-foreground">{item.articleName}</td>
                        <td className="py-2 px-3 text-muted-foreground">{item.categoryName || '—'}</td>
                        <td className="py-2 px-3 text-muted-foreground">{item.quantity}</td>
                        <td className="py-2 px-3">
                          <span
                            className={
                              item.returnedQuantity >= item.quantity
                                ? 'text-success font-medium'
                                : item.returnedQuantity > 0
                                ? 'text-warning font-medium'
                                : 'text-muted-foreground'
                            }
                          >
                            {item.returnedQuantity}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">{item.quantity - item.returnedQuantity}</td>
                        <td className="py-2 px-3 text-muted-foreground">{item.expectedReturnDate ? formatDate(item.expectedReturnDate) : '—'}</td>
                        <td className="py-2 px-3 text-muted-foreground">{item.conditionOnLoan || '—'}</td>
                        <td className="py-2 px-3 text-muted-foreground">{item.conditionOnReturn || '—'}</td>
                        <td className="py-2 px-3">
                          {item.returnedQuantity >= item.quantity ? <Badge variant="success">{t('inventory.settled')}</Badge> : item.returnedQuantity > 0 ? <Badge variant="warning">{t('inventory.partiallyReturned')}</Badge> : <Badge variant="info">{t('inventory.unreturned')}</Badge>}
                        </td>
                        <td className="py-2 px-3">
                          {(() => {
                            if (selectedLoan.status === 'retourne' || selectedLoan.status === 'definitif') return <Badge variant="success">{t('inventory.settled')}</Badge>;
                            if (!item.expectedReturnDate) return <span className="text-muted-foreground/50">—</span>;
                            const now = new Date();
                            const expected = new Date(item.expectedReturnDate);
                            if (expected < now) return <Badge variant="danger">{t('inventory.overdue')}</Badge>;
                            return <Badge variant="info">{t('inventory.onTime')}</Badge>;
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action buttons */}
            {selectedLoan.status !== 'retourne' && selectedLoan.status !== 'definitif' && (
              <div className="flex flex-wrap gap-3">
                <Button size="sm" variant="secondary" onClick={openReturnForm}>
                  <RotateCcw className="w-4 h-4" />
{t("inventory.returnItems")}
                </Button>
                <Button size="sm" variant="secondary" onClick={openAddItemForm}>
                  <Plus className="w-4 h-4" />
{t("inventory.addArticle")}
                </Button>
                <Button size="sm" variant="danger" onClick={handleMarkDefinitive}>
                  <CheckCircle className="w-4 h-4" />
{t("inventory.convertToFinal")}
                </Button>
              </div>
            )}

            {/* Return Items Form */}
            {showReturnForm && (
              <div className="border border-border rounded-lg p-4 space-y-4">
                <h4 className="text-sm font-semibold text-foreground">{t("inventory.returnItems")}</h4>
                {returnEntries.map((entry: { articleId: string; quantity: number; condition: string }, index: number) => {
                  const loanItem = selectedLoan.items.find((i) => i.articleId === entry.articleId)
                  if (!loanItem) return null
                  const remaining = loanItem.quantity - loanItem.returnedQuantity
                  return (
                    <div key={entry.articleId} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-muted rounded-lg">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-muted-foreground">{t('inventory.category')}</label>
                        <p className="text-sm font-medium text-foreground">{loanItem.articleName}</p>
                        <p className="text-xs text-muted-foreground/70">{t('finance.remainingAmount')}: {remaining}</p>
                      </div>
                      <Input
                        labelAr={t("inventory.returnedQuantity")}
                        type="number"
                        min={0}
                        max={remaining}
                        value={entry.quantity}
                        onChange={(e) =>
                          updateReturnEntry(index, 'quantity', Math.min(parseInt(e.target.value) || 0, remaining))
                        }
                      />
                      <SearchableSelect
                        labelAr={t("inventory.loanStatusAtReturn")}
                        value={entry.condition}
                        onChange={(val) => updateReturnEntry(index, 'condition', val)}
                        options={
                          statuses.length > 0
                            ? statuses.map((s: ArticleStatus) => ({ value: s.name, label: s.name }))
                            : []
                        }
                      />
                    </div>
                  )
                })}
                <div className="flex justify-end gap-3">
                  <Button size="sm" variant="secondary" onClick={() => setShowReturnForm(false)}>
{t("common.cancel")}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleReturnItems}
                    disabled={returnEntries.every((r) => r.quantity === 0) || isReturning}
                  >
                    <RotateCcw className="w-4 h-4" />
                    {isReturning ? t('common.saving') : t('inventory.confirmReturn')}
                  </Button>
                </div>
              </div>
            )}

            {/* Add Item to Loan Form */}
            {showAddItemForm && (
              <div className="border border-border rounded-lg p-4 space-y-4">
                <h4 className="text-sm font-semibold text-foreground">{t("inventory.addArticleToLoan")}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <SearchableSelect
                    labelAr={t('common.article')}
                    value={newItemArticleId}
                    onChange={setNewItemArticleId}
                    options={availableArticles.map((a: Article) => ({
                      value: a.id,
                      label: `${a.name} ({t('inventory.available')}: ${a.availableQuantity})`,
                    }))}
                  />
                  <Input
                    labelAr={t('inventory.quantity')}
                    type="number"
                    min={1}
                    max={
                      newItemArticleId
                        ? articles.find((a: Article) => a.id === newItemArticleId)?.availableQuantity || 1
                        : 1
                    }
                    value={newItemQuantity}
                    onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)}
                  />
                  <SearchableSelect
                    labelAr={t('common.status')}
                    value={newItemCondition}
                    onChange={(val) => setNewItemCondition(val)}
                    options={
                      statuses.length > 0
                        ? statuses.map((s: ArticleStatus) => ({ value: s.name, label: s.name }))
                        : []
                    }
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button size="sm" variant="secondary" onClick={() => setShowAddItemForm(false)}>
{t("common.cancel")}
                  </Button>
                  <Button size="sm" onClick={handleAddItemToLoan} disabled={!newItemArticleId}>
                    <Plus className="w-4 h-4" />
{t("common.add")}
                  </Button>
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedLoan.notes && (
              <div className="bg-muted rounded-lg p-4">
                <h4 className="text-sm font-semibold text-foreground mb-1">{t('common.notes')}</h4>
                <p className="text-sm text-muted-foreground">{selectedLoan.notes}</p>
              </div>
            )}

            {/* Print button */}
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button size="sm" variant="secondary" onClick={() => handlePrintLoan(selectedLoan)}>
                <Printer className="w-4 h-4" /> {t('inventory.loanDetails')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
