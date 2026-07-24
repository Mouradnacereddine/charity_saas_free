import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Card, Button, Input, SearchableSelect, Modal, Badge, TextArea, EmptyState, LoadingSpinner } from '../components/common/UI'
import { formatDate, generateLoanReference } from '../utils/helpers'
import { Plus, Search, Eye, Edit, Trash2, Package, RotateCcw, ArrowLeftRight, CheckCircle, Filter, Settings, FolderTree, MapPin, Printer } from 'lucide-react'
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
  nameAr: '',
  name: '',
  descriptionAr: '',
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

function getCategoryNameAr(category: any, categories: ArticleCategory[]): string {
  if (!category) return '—'
  // API may return an object (with include) or a string ID
  if (typeof category === 'object') return category.nameAr || category.name || '—'
  const found = categories.find((c: ArticleCategory) => c.id === category)
  return found ? found.nameAr : category
}

function getStorageNameAr(storageLocation: any, locations: StorageLocation[]): string {
  if (!storageLocation) return '—'
  if (typeof storageLocation === 'object') return storageLocation.nameAr || storageLocation.name || '—'
  const found = locations.find((l: StorageLocation) => l.id === storageLocation)
  return found ? found.nameAr : storageLocation
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
          <h1 className="text-2xl font-bold text-gray-900">{t('inventory.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeTab === 'stock' ? t('inventory.subtitleStock', 'إدارة المواد والمخزون') : activeTab === 'loans' ? t('inventory.subtitleLoans', 'إدارة الإعارات والمرتجعات') : t('inventory.subtitleSettings', 'إدارة التصنيفات والمواقع')}
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
      <div className="border-b border-gray-200">
        <nav className="flex gap-2 sm:gap-4">
          <button
            onClick={() => setActiveTab('stock')}
            className={`flex-1 sm:flex-initial pb-3 px-3 sm:px-1 text-sm font-medium border-b-2 transition-colors min-h-[44px] ${
              activeTab === 'stock'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Package className="inline-block w-4 h-4 ml-2" />
            {t('inventory.tabStock')}
          </button>
          <button
            onClick={() => setActiveTab('loans')}
            className={`flex-1 sm:flex-initial pb-3 px-3 sm:px-1 text-sm font-medium border-b-2 transition-colors min-h-[44px] ${
              activeTab === 'loans'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ArrowLeftRight className="inline-block w-4 h-4 ml-2" />
            {t('inventory.tabLoans')}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 sm:flex-initial pb-3 px-3 sm:px-1 text-sm font-medium border-b-2 transition-colors min-h-[44px] ${
              activeTab === 'settings'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Settings className="inline-block w-4 h-4 ml-2" />
            {t('inventory.tabSettings')}
          </button>
        </nav>
      </div>

      {activeTab === 'stock' ? (
        <StockTab actionsRef={stockActions} t={t} i18n={i18n} statusLabels={STATUS_LABELS} />
      ) : activeTab === 'loans' ? (
        <LoansTab actionsRef={loansActions} t={t} i18n={i18n} statusLabels={STATUS_LABELS} loanStatusLabels={loanStatusLabels} />
      ) : (
        <SettingsTab t={t} i18n={i18n} />
      )}
    </div>
  )
}

// ============================================================
// SETTINGS TAB — Categories & Storage Locations
// ============================================================

function SettingsTab({ t, i18n }: { t: any; i18n: any }) {
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
  const [newCatNameAr, setNewCatNameAr] = useState('')
  const [newCatName, setNewCatName] = useState('')
  const [editCatId, setEditCatId] = useState<string | null>(null)
  const [editCatNameAr, setEditCatNameAr] = useState('')
  const [editCatName, setEditCatName] = useState('')

  // Location form state
  const [newLocNameAr, setNewLocNameAr] = useState('')
  const [newLocName, setNewLocName] = useState('')
  const [editLocId, setEditLocId] = useState<string | null>(null)
  const [editLocNameAr, setEditLocNameAr] = useState('')
  const [editLocName, setEditLocName] = useState('')

  // Status form state
  const [newStsNameAr, setNewStsNameAr] = useState('')
  const [newStsName, setNewStsName] = useState('')
  const [newStsDescAr, setNewStsDescAr] = useState('')
  const [newStsDesc, setNewStsDesc] = useState('')
  const [editStsId, setEditStsId] = useState<string | null>(null)
  const [editStsNameAr, setEditStsNameAr] = useState('')
  const [editStsName, setEditStsName] = useState('')
  const [editStsDescAr, setEditStsDescAr] = useState('')
  const [editStsDesc, setEditStsDesc] = useState('')
  const [newStsIsPermanent, setNewStsIsPermanent] = useState(false)
  const [editStsIsPermanent, setEditStsIsPermanent] = useState(false)

  // School grade form state

  // ---- Category CRUD ----

  const handleAddCategory = async () => {
    if (!newCatNameAr.trim()) return
    await createCat.mutateAsync({ name: newCatName.trim(), nameAr: newCatNameAr.trim() })
    setNewCatNameAr('')
    setNewCatName('')
  }

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm(t('inventory.confirmDeleteCategory'))) return
    await deleteCat.mutateAsync(id)
  }

  const startEditCategory = (cat: ArticleCategory) => {
    setEditCatId(cat.id)
    setEditCatNameAr(cat.nameAr)
    setEditCatName(cat.name)
  }

  const handleUpdateCategory = async () => {
    if (!editCatId || !editCatNameAr.trim()) return
    await updateCat.mutateAsync({ id: editCatId, data: { name: editCatName.trim(), nameAr: editCatNameAr.trim() } })
    setEditCatId(null)
    setEditCatNameAr('')
    setEditCatName('')
  }

  const cancelEditCategory = () => {
    setEditCatId(null)
    setEditCatNameAr('')
    setEditCatName('')
  }

  // ---- Location CRUD ----

  const handleAddLocation = async () => {
    if (!newLocNameAr.trim()) return
    await createLoc.mutateAsync({ name: newLocName.trim(), nameAr: newLocNameAr.trim() })
    setNewLocNameAr('')
    setNewLocName('')
  }

  const handleDeleteLocation = async (id: string) => {
    if (!window.confirm(t('inventory.confirmDeleteLocation'))) return
    await deleteLoc.mutateAsync(id)
  }

  const startEditLocation = (loc: StorageLocation) => {
    setEditLocId(loc.id)
    setEditLocNameAr(loc.nameAr)
    setEditLocName(loc.name)
  }

  const handleUpdateLocation = async () => {
    if (!editLocId || !editLocNameAr.trim()) return
    await updateLoc.mutateAsync({ id: editLocId, data: { name: editLocName.trim(), nameAr: editLocNameAr.trim() } })
    setEditLocId(null)
    setEditLocNameAr('')
    setEditLocName('')
  }

  const cancelEditLocation = () => {
    setEditLocId(null)
    setEditLocNameAr('')
    setEditLocName('')
  }

  // ---- Status CRUD ----

  const handleAddStatus = async () => {
    if (!newStsNameAr.trim()) return
    await createSts.mutateAsync({ name: newStsName.trim(), nameAr: newStsNameAr.trim(), description: newStsDesc.trim() || undefined, descriptionAr: newStsDescAr.trim() || undefined })
    setNewStsNameAr('')
    setNewStsName('')
    setNewStsDescAr('')
    setNewStsDesc('')
  }

  const handleDeleteStatus = async (id: string) => {
    if (!window.confirm(t('inventory.confirmDeleteStatus'))) return
    await deleteSts.mutateAsync(id)
  }

  const startEditStatus = (sts: ArticleStatus) => {
    setEditStsId(sts.id)
    setEditStsNameAr(sts.nameAr)
    setEditStsName(sts.name)
    setEditStsDescAr(sts.descriptionAr || '')
    setEditStsDesc(sts.description || '')
  }

  const handleUpdateStatus = async () => {
    if (!editStsId || !editStsNameAr.trim()) return
    await updateSts.mutateAsync({ id: editStsId, data: { name: editStsName.trim(), nameAr: editStsNameAr.trim(), description: editStsDesc.trim() || undefined, descriptionAr: editStsDescAr.trim() || undefined } })
    setEditStsId(null)
    setEditStsNameAr('')
    setEditStsName('')
    setEditStsDescAr('')
    setEditStsDesc('')
  }

  const cancelEditStatus = () => {
    setEditStsId(null)
    setEditStsNameAr('')
    setEditStsName('')
    setEditStsDescAr('')
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
              labelAr={t('inventory.nameAr')}
              value={newCatNameAr}
              onChange={(e) => setNewCatNameAr(e.target.value)}
              placeholder={t('inventory.nameArPlaceholder', 'مثال: طبي')}
            />
          </div>
          <div className="flex-1">
            <Input
              labelAr={t('inventory.nameLatin')}
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Ex: Medical"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleAddCategory} disabled={!newCatNameAr.trim()}>
              <Plus className="w-4 h-4" />
              إضافة
            </Button>
          </div>
        </div>

        {/* Table */}
        {categories.length === 0 ? (
          <EmptyState message={t('inventory.noCategories', 'لا توجد تصنيفات بعد')} icon={<FolderTree className="w-12 h-12" />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-right py-3 px-4 font-medium text-gray-500">{t('inventory.nameAr')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">{t('inventory.nameLatin')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat: ArticleCategory) => (
                  <tr key={cat.id} className="border-b border-gray-100 hover:bg-gray-50">
                    {editCatId === cat.id ? (
                      <>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={editCatNameAr}
                            onChange={(e) => setEditCatNameAr(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                            autoFocus
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={editCatName}
                            onChange={(e) => setEditCatName(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={handleUpdateCategory} disabled={!editCatNameAr.trim()}>
                              حفظ
                            </Button>
                            <Button size="sm" variant="secondary" onClick={cancelEditCategory}>
                              إلغاء
                            </Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-4 font-medium text-gray-900">{cat.nameAr}</td>
                        <td className="py-3 px-4 text-gray-600">{cat.name || '—'}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEditCategory(cat)}
                              className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                              title={t('common.edit')}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="p-1 text-gray-400 hover:text-danger-600 transition-colors"
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
              labelAr={t('inventory.nameAr')}
              value={newLocNameAr}
              onChange={(e) => setNewLocNameAr(e.target.value)}
              placeholder={t('inventory.locationPlaceholder', 'مثال: المستودع أ - الرف 1')}
            />
          </div>
          <div className="flex-1">
            <Input
              labelAr={t('inventory.nameLatin')}
              value={newLocName}
              onChange={(e) => setNewLocName(e.target.value)}
              placeholder="Ex: Dépôt A - Rayon 1"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleAddLocation} disabled={!newLocNameAr.trim()}>
              <Plus className="w-4 h-4" />
              إضافة
            </Button>
          </div>
        </div>

        {/* Table */}
        {locations.length === 0 ? (
          <EmptyState message={t('inventory.noLocations', 'لا توجد مواقع تخزين بعد')} icon={<MapPin className="w-12 h-12" />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-right py-3 px-4 font-medium text-gray-500">{t('inventory.nameAr')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">{t('inventory.nameLatin')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc: StorageLocation) => (
                  <tr key={loc.id} className="border-b border-gray-100 hover:bg-gray-50">
                    {editLocId === loc.id ? (
                      <>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={editLocNameAr}
                            onChange={(e) => setEditLocNameAr(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                            autoFocus
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={editLocName}
                            onChange={(e) => setEditLocName(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={handleUpdateLocation} disabled={!editLocNameAr.trim()}>
                              حفظ
                            </Button>
                            <Button size="sm" variant="secondary" onClick={cancelEditLocation}>
                              إلغاء
                            </Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-4 font-medium text-gray-900">{loc.nameAr}</td>
                        <td className="py-3 px-4 text-gray-600">{loc.name || '—'}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEditLocation(loc)}
                              className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                              title={t('common.edit')}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteLocation(loc.id)}
                              className="p-1 text-gray-400 hover:text-danger-600 transition-colors"
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
      <Card titleAr={t("inventory.addStatus", "الحالات")}>
        {/* Add form — single field */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <Input
              labelAr={t('common.status')}
              value={newStsNameAr}
              onChange={(e) => {
                setNewStsNameAr(e.target.value)
                setNewStsName(e.target.value)
              }}
              placeholder="Ex: très bon état"
              required
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleAddStatus} disabled={!newStsNameAr.trim()}>
              <Plus className="w-4 h-4" />{t('common.add')}
            </Button>
          </div>
        </div>

        {/* Table */}
        {statuses.length === 0 ? (
          <EmptyState message={t('inventory.noStatuses', 'لا توجد حالات بعد')} icon={<CheckCircle className="w-12 h-12" />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-right py-3 px-4 font-medium text-gray-500">{t('common.status')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {statuses.map((sts: ArticleStatus) => (
                  <tr key={sts.id} className="border-b border-gray-100 hover:bg-gray-50">
                    {editStsId === sts.id ? (
                      <>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={editStsNameAr}
                            onChange={(e) => setEditStsNameAr(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                            autoFocus
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={handleUpdateStatus} disabled={!editStsNameAr.trim()}>
                              حفظ
                            </Button>
                            <Button size="sm" variant="secondary" onClick={cancelEditStatus}>
                              إلغاء
                            </Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-4 font-medium text-gray-900">{sts.nameAr}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEditStatus(sts)}
                              className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                              title={t('common.edit')}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteStatus(sts.id)}
                              className="p-1 text-gray-400 hover:text-danger-600 transition-colors"
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

function StockTab({ actionsRef, t, i18n, statusLabels }: { actionsRef: React.MutableRefObject<{ toggleFilter: () => void; addItem: () => void }>; t: any; i18n: any; statusLabels: Record<string, string> }) {
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
    setFilterStorage('')
    setFilterType('')
    setCommittedFilters({ searchTerm: '', category: '', status: '', storage: '', type: '' })
  }

  const filtered = articles.filter((a: Article) => {
    const acat = a as any
    const catNameAr = getCategoryNameAr(acat.category, categories)
    const st = committedFilters.searchTerm

    const matchesSearch =
      !st ||
      a.nameAr.includes(st) ||
      a.name.toLowerCase().includes(st.toLowerCase()) ||
      catNameAr.includes(st) ||
      (a.reference || '').toLowerCase().includes(st.toLowerCase()) ||
      (typeof acat.category === 'object' ? acat.category.nameAr?.includes(st) : (acat.category || '').toLowerCase().includes(st.toLowerCase()))
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
      nameAr: article.nameAr,
      name: article.name,
      descriptionAr: article.descriptionAr || '',
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
      setFormError(t('inventory.selectLocation', 'يرجى اختيار مكان التخزين'))
      return
    }
    const data = {
      nameAr: form.nameAr,
      name: form.name,
      descriptionAr: form.descriptionAr || undefined,
      description: form.description || undefined,
      category: form.category,
      categoryAr: '',  // kept for backward compatibility with existing data
      quantity: form.quantity,
      status: form.statusId ? 'disponible' : (form.status || 'disponible'),
      statusId: form.statusId || undefined,
      storageLocation: form.storageLocation,
      storageLocationAr: '',  // kept for backward compatibility with existing data
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
      const msg = err?.response?.data?.error || err?.message || t('inventory.addFailed', 'فشل في إضافة المقال')
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
    label: `${c.nameAr} (${c.name || ''})`,
  }))

  const locationOptions = locations.map((l: StorageLocation) => ({
    value: l.id,
    label: `${l.nameAr} (${l.name || ''})`,
  }))

  const statusOptions = [
    { value: '', label: t('common.all') },
    ...statuses.map((s: ArticleStatus) => ({ value: s.name, label: s.nameAr })),
  ]

  const typeOptions = [
    { value: '', label: t('common.all') },
    { value: 'permanent', label: t('inventory.final') },
    { value: 'returnable', label: t('inventory.returnable', 'قابل للإرجاع') },
  ]

  if (loading) return <LoadingSpinner />

  return (
    <>
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder={t('inventory.searchArticle')}
          value={filterSearchTerm}
          onChange={(e) => setFilterSearchTerm(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') applyStockFilters(); }}
          className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
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
              <Search className="w-4 h-4" /> بحث
            </Button>
            <Button variant="secondary" size="sm" onClick={resetStockFilters}>
              إعادة تعيين
            </Button>
          </div>
        </Card>
      )}

      {/* Articles table */}
      <Card>
        {filtered.length === 0 ? (
          <EmptyState message={t('inventory.noArticles', 'لا توجد مقالات في المخزون')} icon={<Package className="w-12 h-12" />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-right py-3 px-4 font-medium text-gray-500">{t('inventory.refCode')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">{t('inventory.sectionName', 'الاسم')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 hidden sm:table-cell">{t('inventory.category')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">{t('inventory.quantity')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">{t('inventory.available')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">{t('common.status')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 hidden md:table-cell">{t('inventory.storageLocation')}</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((article: Article) => (
                  <tr key={article.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => openEdit(article)}>
                    <td className="py-3 px-4 font-semibold text-primary-700" dir="ltr">
                      {article.reference || '—'}
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">{article.nameAr}</td>
                    <td className="py-3 px-4 text-gray-600 hidden sm:table-cell">
                      {getCategoryNameAr(article.category, categories)}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{article.quantity}</td>
                    <td className="py-3 px-4 text-gray-600">{article.availableQuantity}</td>
                    <td className="py-3 px-4">
                      <Badge variant="default">
                        {(article as any).statusModel?.nameAr || statusLabels[article.status] || article.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-gray-600 hidden md:table-cell">
                      {getStorageNameAr(article.storageLocation, locations)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(article); }}
                        className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
              <div><p className="text-xs text-gray-500">{t('inventory.nameAr')}</p><p className="font-medium">{form.nameAr}</p></div>
              <div><p className="text-xs text-gray-500">{t('inventory.nameLatin')}</p><p className="font-medium">{form.name}</p></div>
              {form.descriptionAr && <div><p className="text-xs text-gray-500">{t('doctors.arabicLabel')}</p><p className="font-medium">{form.descriptionAr}</p></div>}
              {form.description && <div><p className="text-xs text-gray-500">{t('inventory.descriptionLatin')}</p><p className="font-medium">{form.description}</p></div>}
              <div><p className="text-xs text-gray-500">{t('inventory.category')}</p><p className="font-medium">{categories.find((c) => c.id === form.category)?.nameAr || '—'}</p></div>
              <div><p className="text-xs text-gray-500">{t('inventory.quantity')}</p><p className="font-medium">{form.quantity}</p></div>
              <div><SearchableSelect labelAr={t('inventory.storageLocation')} value={form.storageLocation} onChange={(val) => setForm({ ...form, storageLocation: val })} options={locationOptions} required /></div>
              <div><SearchableSelect labelAr={t('common.status')} value={form.statusId} onChange={(val) => { const s = statuses.find((st: ArticleStatus) => st.id === val); setForm({ ...form, statusId: val, isPermanent: s ? s.isPermanent : false }); }} options={statuses.map((s: ArticleStatus) => ({ value: s.id, label: s.nameAr }))} /></div>
            </div>
            <TextArea labelAr={t('common.notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            {formError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{formError}</div>}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowModal(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleSubmit}>{t('common.update')}</Button>
            </div>
          </div>
        ) : (
          /* ---- CREATE MODE: all fields editable ---- */
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input labelAr={t('inventory.nameAr')} value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} required />
              <Input labelAr={t('inventory.nameLatin')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <SearchableSelect labelAr={t('inventory.category')} value={form.category} onChange={(val) => setForm({ ...form, category: val })} options={categoryOptions} required />
              <SearchableSelect labelAr={t('inventory.storageLocation')} value={form.storageLocation} onChange={(val) => setForm({ ...form, storageLocation: val })} options={locationOptions} required />
              <Input labelAr={t('inventory.quantity')} type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} required />
              <SearchableSelect labelAr={t('common.status')} value={form.statusId} onChange={(val) => { const s = statuses.find((st: ArticleStatus) => st.id === val); setForm({ ...form, statusId: val, isPermanent: s ? s.isPermanent : false }); }} options={statuses.map((s: ArticleStatus) => ({ value: s.id, label: s.nameAr }))} />
              <div className="md:col-span-2"><TextArea labelAr={t('common.notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            {formError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mt-4">{formError}</div>}
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowModal(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleSubmit} disabled={!form.nameAr || !form.name || !form.category}>{t('common.add')}</Button>
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

function LoansTab({ actionsRef, t, i18n, statusLabels, loanStatusLabels }: { actionsRef: React.MutableRefObject<{ toggleFilter: () => void; addItem: () => void }>; t: any; i18n: any; statusLabels: Record<string, string>; loanStatusLabels: Record<string, string> }) {
  const queryClient = useQueryClient()
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
  const [committedLoanFilters, setCommittedLoanFilters] = useState({ searchTerm: '', status: '', beneficiary: '', dateFrom: '', dateTo: '' })
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterBeneficiary, setFilterBeneficiary] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  const applyLoanFilters = () => {
    setCommittedLoanFilters({ searchTerm, status: filterStatus, beneficiary: filterBeneficiary, dateFrom: filterDateFrom, dateTo: filterDateTo })
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

  // Expose actions to parent header buttons
  useEffect(() => {
    actionsRef.current = { toggleFilter: () => setFilterOpen((v) => !v), addItem: () => { queryClient.invalidateQueries({ queryKey: ['articles'] }); setShowCreateModal(true); } }
  })

  // Create loan form state
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState('')
  const [loanItems, setLoanItems] = useState<{ articleId: string; quantity: number; conditionOnLoan: string }[]>([])
  const [expectedReturnDate, setExpectedReturnDate] = useState('')
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
      (l.beneficiaryNameAr || '').includes(st) ||
      (l.beneficiaryName || '').toLowerCase().includes(st.toLowerCase())
    const matchesStatus = !committedLoanFilters.status || l.status === committedLoanFilters.status
    const matchesBeneficiary =
      !committedLoanFilters.beneficiary ||
      l.beneficiaryId === committedLoanFilters.beneficiary ||
      (l.beneficiaryNameAr || '').includes(committedLoanFilters.beneficiary) ||
      (l.beneficiaryName || '').toLowerCase().includes(committedLoanFilters.beneficiary.toLowerCase())
    const matchesDateFrom = !committedLoanFilters.dateFrom || l.loanDate >= committedLoanFilters.dateFrom
    const matchesDateTo = !committedLoanFilters.dateTo || l.loanDate <= committedLoanFilters.dateTo
    return matchesSearch && matchesStatus && matchesBeneficiary && matchesDateFrom && matchesDateTo
  })

  const availableArticles = articles.filter((a: Article) => a.availableQuantity > 0 && !a.isPermanent)

  // Pre-computed beneficiary options for SearchableSelect
  const beneficiaryOptions = beneficiaries.map((b: Beneficiary) => ({
    value: b.id,
    label: `${b.lastNameAr} ${b.firstNameAr} (${b.firstName} ${b.lastName})`,
  }))

  const loanStatusOptions = [
    { value: '', label: t('common.all') },
    { value: 'en_cours', label: t('inventory.ongoing') },
    { value: 'partiellement_retourne', label: t('inventory.partiallyReturned') },
    { value: 'definitif', label: t('inventory.final') },
  ]

  // ---- Create Loan ----

  const addLoanItemRow = () => {
    setLoanItems([...loanItems, { articleId: '', quantity: 1, conditionOnLoan: '' }])
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
          articleNameAr: article?.nameAr || '',
          quantity: li.quantity,
          returnedQuantity: 0,
          conditionOnLoan: li.conditionOnLoan,
        }
      })

    await createLoan.mutateAsync({
      reference: generateLoanReference(),
      beneficiaryId: beneficiary.id,
      beneficiaryName: `${beneficiary.firstName} ${beneficiary.lastName}`,
      beneficiaryNameAr: `${beneficiary.lastNameAr} ${beneficiary.firstNameAr}`,
      beneficiaryReference: beneficiary.reference,
      items,
      status: 'en_cours',
      loanDate: new Date().toISOString().split('T')[0],
      expectedReturnDate: expectedReturnDate || undefined,
      notes: loanNotes || undefined,
    })

    setShowCreateModal(false)
    setSelectedBeneficiaryId('')
    setLoanItems([])
    setExpectedReturnDate('')
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
        articleNameAr: article.nameAr,
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
    if (!window.confirm(t('inventory.confirmRemoveItemFromLoan', 'هل أنت متأكد من إزالة هذا المقال من الإعارة؟'))) return

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
    if (!window.confirm(t('inventory.confirmMakeDefinitive', 'هل أنت متأكد من تحويل هذه الإعارة إلى نهائية؟'))) return

    await markLoanDefinitive.mutateAsync(selectedLoan.id)
    await queryClient.invalidateQueries({ queryKey: ['loans'] })
    setShowDetailModal(null)
    setSelectedLoan(null)
  }

  // ---- Print Loan ----

  const handlePrintLoan = (loan: Loan) => {
    const itemsHtml = loan.items.map((item: any) =>
      `<div class="row"><span class="lbl">${t('inventory.category')}</span><span class="val">${item.articleNameAr} <i>×${item.quantity}</i></span></div>`
    ).join('')

    const statusLabel = loanStatusLabels[loan.status] || loan.status

    printReceipt(
      t('inventory.loanDetails'),
      'Détail du Prêt',
      `<div class="col">
        <div class="row"><span class="lbl">{t('inventory.refCode')}</span><span class="val">${loan.reference || '—'}</span></div>
        <div class="row"><span class="lbl">${t('medical.beneficiary')}</span><span class="val">${loan.beneficiaryNameAr}</span></div>
        <div class="row"><span class="lbl">${t('medical.beneficiaryRef')}</span><span class="val">${loan.beneficiaryReference || '—'}</span></div>
        <div class="row"><span class="lbl">{t('common.status')}</span><span class="val">${statusLabel}</span></div>
        <div class="row"><span class="lbl">${t('inventory.loanDate', 'تاريخ الإعارة')}</span><span class="val">${formatDate(loan.loanDate)}</span></div>
        ${loan.expectedReturnDate ? `<div class="row"><span class="lbl">${t('inventory.expectedReturnDate', 'تاريخ الإرجاع المتوقع')}</span><span class="val">${formatDate(loan.expectedReturnDate)}</span></div>` : ''}
        ${loan.actualReturnDate ? `<div class="row"><span class="lbl">${t('inventory.actualReturnDate', 'تاريخ الإرجاع الفعلي')}</span><span class="val">${formatDate(loan.actualReturnDate)}</span></div>` : ''}
       </div>
       <div class="col">
        ${itemsHtml}
       </div>`,
      loan.status === 'definitif' ? 'color:#dc2626' : loan.status === 'retourne' ? 'color:#16a34a' : 'color:#2563eb',
      loan.items.reduce((sum: number, item: any) => sum + item.quantity, 0).toString(),
      `{t('inventory.totalSummary', 'المجموع')}: ${loan.items.length} {t('inventory.articles')} — ${loan.items.reduce((sum: number, item: any) => sum + item.quantity, 0)} {t('inventory.pieces', 'قطعة')} — ${statusLabel}`,
      '',
      t('receipt.beneficiarySign'),
      t('receipt.stampSignature'),
      association?.nameAr
    )
  }

  if (loading) return <LoadingSpinner />

  return (
    <>
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder={t('inventory.searchLoan')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') applyLoanFilters(); }}
          className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Filters */}
      {filterOpen && (
        <Card titleAr={t("inventory.advancedSearch")}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <SearchableSelect
              labelAr={t('common.status')}
              value={filterStatus}
              onChange={setFilterStatus}
              options={loanStatusOptions}
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
              <Search className="w-4 h-4" /> بحث
            </Button>
            <Button variant="secondary" size="sm" onClick={resetLoanFilters}>
              إعادة تعيين
            </Button>
          </div>
        </Card>
      )}

      {/* Loans table */}
      <Card>
        {filteredLoans.length === 0 ? (
          <EmptyState message={t("inventory.noLoans", "لا توجد إعارات")} icon={<ArrowLeftRight className="w-12 h-12" />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-right py-3 px-4 font-medium text-gray-500">{t('inventory.refCode')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">{t('medical.beneficiary')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 hidden lg:table-cell">{t('medical.beneficiaryRef')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">{t('inventory.quantity', 'المقالات')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">{t('inventory.returnedItems', 'المُرتجع')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 hidden md:table-cell">{t('finance.remainingAmount', 'المتبقي')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">{t('common.status')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">{t('inventory.loanDate', 'تاريخ الإعارة')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">{t('inventory.expectedReturnDate', 'تاريخ الإرجاع المتوقع')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">{t('inventory.actualReturnDate', 'تاريخ الإرجاع الفعلي')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredLoans.map((loan: Loan) => (
                  <tr key={loan.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => openLoanDetail(loan)}>
                    <td className="py-3 px-4 font-semibold text-primary-700" dir="ltr">
                      {loan.reference || '—'}
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">{loan.beneficiaryNameAr}</td>
                    <td className="py-3 px-4 text-gray-600 hidden lg:table-cell" dir="ltr">
                      {loan.beneficiaryReference || '—'}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {loan.items.map((item) => item.articleNameAr).filter(Boolean).join('، ') || `(${loan.items.length} مقالات)`}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {loan.items.map((item) => item.returnedQuantity || 0).reduce((a, b) => a + b, 0) || '—'}
                    </td>
                    <td className="py-3 px-4 text-gray-600 hidden md:table-cell">
                      {loan.items.map((item) => item.quantity - (item.returnedQuantity || 0)).reduce((a, b) => a + b, 0)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={LOAN_STATUS_VARIANTS[loan.status] || 'default'}>
                        {loanStatusLabels[loan.status] || loan.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{formatDate(loan.loanDate)}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {loan.expectedReturnDate ? formatDate(loan.expectedReturnDate) : '—'}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {loan.actualReturnDate ? formatDate(loan.actualReturnDate) : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); openLoanDetail(loan); }}
                        className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                        title={t("common.details", "التفاصيل")}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ============ CREATE LOAN MODAL ============ */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setSelectedBeneficiaryId(''); setLoanItems([]); setExpectedReturnDate(''); setLoanNotes(''); }}
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
              if (b) {
              } else {
              }
            }}
            options={beneficiaryOptions}
            required
          />

          {/* Dynamic items list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">{t('inventory.quantity', 'المقالات')}</label>
              <Button size="sm" variant="secondary" onClick={addLoanItemRow}>
                <Plus className="w-3 h-3" />
                إضافة مقال
              </Button>
            </div>
            {loanItems.length === 0 && (
              <p className="text-sm text-gray-400">{t('inventory.noArticles')}</p>
            )}
            {loanItems.map((item: { articleId: string; quantity: number; conditionOnLoan: string }, index: number) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg">
                <SearchableSelect
                  labelAr={t("inventory.category")}
                  value={item.articleId}
                  onChange={(val) => updateLoanItemRow(index, 'articleId', val)}
                  options={availableArticles.map((a: Article) => ({
                    value: a.id,
                    label: `${a.nameAr} (متاح: ${a.availableQuantity})`,
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
                <SearchableSelect
                  labelAr={t("inventory.loanStatusAtLoan", "الحالة عند الإعارة")}
                  value={item.conditionOnLoan}
                  onChange={(val) => updateLoanItemRow(index, 'conditionOnLoan', val)}
                  options={
                    statuses.length > 0
                      ? statuses.map((s: ArticleStatus) => ({ value: s.nameAr, label: s.nameAr }))
                      : []
                  }
                />
                <div className="flex items-end">
                  <Button size="sm" variant="danger" onClick={() => removeLoanItemRow(index)}>
                    <Trash2 className="w-3 h-3" />
                    إزالة
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
              إلغاء
            </Button>
            <Button
              onClick={handleCreateLoan}
              disabled={!selectedBeneficiaryId || loanItems.length === 0 || loanItems.some((li) => !li.articleId)}
            >
              إنشاء الإعارة
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
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700">{t("medical.beneficiary")}</h4>
                  <p className="text-sm text-gray-900">{selectedLoan.beneficiaryNameAr}</p>
                  <p className="text-xs text-gray-500" dir="ltr">{t('medical.beneficiaryRef')}: {selectedLoan.beneficiaryReference || '—'}</p>
                </div>
                <div className="text-left">
                  <span className="text-xs text-gray-500">{t("inventory.loanRefCode", "الرمز المرجعي للإعارة")}</span>
                  <p className="text-sm font-bold text-primary-700" dir="ltr">{selectedLoan.reference || '—'}</p>
                  <div className="mt-1">
                    <Badge variant={LOAN_STATUS_VARIANTS[selectedLoan.status] || 'default'}>
                      {loanStatusLabels[selectedLoan.status] || selectedLoan.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{t('inventory.loanDate')}: {formatDate(selectedLoan.loanDate)}</span>
                {selectedLoan.expectedReturnDate && (
                  <span>{t('inventory.expectedReturnDate')}: {formatDate(selectedLoan.expectedReturnDate)}</span>
                )}
                {selectedLoan.actualReturnDate && (
                  <span>{t('inventory.actualReturnDate')}: {formatDate(selectedLoan.actualReturnDate)}</span>
                )}
              </div>
            </div>

            {/* Items list */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('inventory.quantity', 'المقالات')}</h4>
              <div className="flex flex-wrap gap-2 mb-3 text-xs text-gray-500">
                {selectedLoan.items.map((item) => {
                  const art = articles.find((a: Article) => a.id === item.articleId)
                  return art ? (
                    <span key={item.articleId} className="bg-gray-50 px-2 py-1 rounded">
                      {art.nameAr}: المخزون {art.quantity} | المتاح {art.availableQuantity}
                    </span>
                  ) : null
                })}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-right py-2 px-3 font-medium text-gray-500">{t('inventory.category')}</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-500">{t('inventory.quantity')}</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-500">{t('inventory.returnedItems', 'المُرتجع')}</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-500">{t('finance.remainingAmount', 'المتبقي')}</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-500">{t('inventory.loanStatusAtLoan', 'الحالة عند الإعارة')}</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-500">{t('inventory.loanStatusAtReturn', 'الحالة عند الإرجاع')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedLoan.items.map((item) => (
                      <tr key={item.articleId} className="border-b border-gray-100">
                        <td className="py-2 px-3 text-gray-900">{item.articleNameAr}</td>
                        <td className="py-2 px-3 text-gray-600">{item.quantity}</td>
                        <td className="py-2 px-3">
                          <span
                            className={
                              item.returnedQuantity >= item.quantity
                                ? 'text-green-600 font-medium'
                                : item.returnedQuantity > 0
                                ? 'text-yellow-600 font-medium'
                                : 'text-gray-600'
                            }
                          >
                            {item.returnedQuantity}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-gray-600">{item.quantity - item.returnedQuantity}</td>
                        <td className="py-2 px-3 text-gray-600">{item.conditionOnLoan || '—'}</td>
                        <td className="py-2 px-3 text-gray-600">{item.conditionOnReturn || '—'}</td>
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
                  إرجاع مقالات
                </Button>
                <Button size="sm" variant="secondary" onClick={openAddItemForm}>
                  <Plus className="w-4 h-4" />
                  إضافة مقال
                </Button>
                <Button size="sm" variant="danger" onClick={handleMarkDefinitive}>
                  <CheckCircle className="w-4 h-4" />
                  تحويل إلى نهائي
                </Button>
              </div>
            )}

            {/* Return Items Form */}
            {showReturnForm && (
              <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                <h4 className="text-sm font-semibold text-gray-700">{t("inventory.returnItems")}</h4>
                {returnEntries.map((entry: { articleId: string; quantity: number; condition: string }, index: number) => {
                  const loanItem = selectedLoan.items.find((i) => i.articleId === entry.articleId)
                  if (!loanItem) return null
                  const remaining = loanItem.quantity - loanItem.returnedQuantity
                  return (
                    <div key={entry.articleId} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-500">{t('inventory.category')}</label>
                        <p className="text-sm font-medium text-gray-900">{loanItem.articleNameAr}</p>
                        <p className="text-xs text-gray-400">{t('finance.remainingAmount')}: {remaining}</p>
                      </div>
                      <Input
                        labelAr={t("inventory.returnedQuantity", "الكمية المُرتجعة")}
                        type="number"
                        min={0}
                        max={remaining}
                        value={entry.quantity}
                        onChange={(e) =>
                          updateReturnEntry(index, 'quantity', Math.min(parseInt(e.target.value) || 0, remaining))
                        }
                      />
                      <SearchableSelect
                        labelAr={t("inventory.loanStatusAtReturn", "الحالة عند الإرجاع")}
                        value={entry.condition}
                        onChange={(val) => updateReturnEntry(index, 'condition', val)}
                        options={
                          statuses.length > 0
                            ? statuses.map((s: ArticleStatus) => ({ value: s.nameAr, label: s.nameAr }))
                            : []
                        }
                      />
                    </div>
                  )
                })}
                <div className="flex justify-end gap-3">
                  <Button size="sm" variant="secondary" onClick={() => setShowReturnForm(false)}>
                    إلغاء
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
              <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                <h4 className="text-sm font-semibold text-gray-700">{t("inventory.addArticleToLoan", "إضافة مقال إلى الإعارة")}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <SearchableSelect
                    labelAr={t("inventory.category")}
                    value={newItemArticleId}
                    onChange={setNewItemArticleId}
                    options={availableArticles.map((a: Article) => ({
                      value: a.id,
                      label: `${a.nameAr} (متاح: ${a.availableQuantity})`,
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
                        ? statuses.map((s: ArticleStatus) => ({ value: s.nameAr, label: s.nameAr }))
                        : []
                    }
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button size="sm" variant="secondary" onClick={() => setShowAddItemForm(false)}>
                    إلغاء
                  </Button>
                  <Button size="sm" onClick={handleAddItemToLoan} disabled={!newItemArticleId}>
                    <Plus className="w-4 h-4" />
                    إضافة
                  </Button>
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedLoan.notes && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-1">{t('common.notes')}</h4>
                <p className="text-sm text-gray-600">{selectedLoan.notes}</p>
              </div>
            )}

            {/* Print button */}
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
              <Button size="sm" variant="secondary" onClick={() => handlePrintLoan(selectedLoan)}>
                <Printer className="w-4 h-4" /> طباعة تفاصيل الإعارة
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
