import { useEffect, useState } from 'react'
import { Card, Button, Input, Select, SearchableSelect, Modal, Badge, TextArea, EmptyState, LoadingSpinner } from '../components/common/UI'
import { useInventoryStore } from '../stores/inventoryStore'
import { useBeneficiaryStore } from '../stores/beneficiaryStore'
import { formatDate } from '../utils/helpers'
import { Plus, Search, Eye, Edit, Trash2, Package, RotateCcw, ArrowLeftRight, CheckCircle } from 'lucide-react'
import type { Article, Loan, LoanItem } from '../types'

// ---- Constants ----

const STATUS_LABELS: Record<string, string> = {
  disponible: 'متاح',
  prete: 'مُعار',
  endommage: 'تالف',
  hors_service: 'خارج الخدمة',
}

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'danger' | 'default' | 'info'> = {
  disponible: 'success',
  prete: 'info',
  endommage: 'warning',
  hors_service: 'danger',
}

const LOAN_STATUS_LABELS: Record<string, string> = {
  en_cours: 'جاري',
  partiellement_retourne: 'مرتجع جزئياً',
  retourne: 'مرتجع',
  definitif: 'نهائي',
}

const LOAN_STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'danger' | 'default' | 'info'> = {
  en_cours: 'info',
  partiellement_retourne: 'warning',
  retourne: 'success',
  definitif: 'default',
}

const EMPTY_ARTICLE_FORM = {
  nameAr: '',
  name: '',
  descriptionAr: '',
  description: '',
  categoryAr: '',
  category: '',
  quantity: 1,
  status: 'disponible' as Article['status'],
  storageLocationAr: '',
  storageLocation: '',
  conditionAr: '',
  condition: '',
  isPermanent: false,
  notes: '',
}

// ---- Component ----

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'stock' | 'loans'>('stock')

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">إدارة المخزون والإعارات</h1>
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
            المخزون
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
            الإعارات
          </button>
        </nav>
      </div>

      {activeTab === 'stock' ? <StockTab /> : <LoansTab />}
    </div>
  )
}

// ============================================================
// STOCK TAB
// ============================================================

function StockTab() {
  const { articles, loading, loadArticles, addArticle, updateArticle, deleteArticle } = useInventoryStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)
  const [form, setForm] = useState(EMPTY_ARTICLE_FORM)

  useEffect(() => {
    loadArticles()
  }, [loadArticles])

  const filtered = articles.filter(
    (a) =>
      a.nameAr.includes(searchTerm) ||
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.categoryAr.includes(searchTerm) ||
      a.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const openAdd = () => {
    setEditingArticle(null)
    setForm(EMPTY_ARTICLE_FORM)
    setShowModal(true)
  }

  const openEdit = (article: Article) => {
    setEditingArticle(article)
    setForm({
      nameAr: article.nameAr,
      name: article.name,
      descriptionAr: article.descriptionAr || '',
      description: article.description || '',
      categoryAr: article.categoryAr,
      category: article.category,
      quantity: article.quantity,
      status: article.status,
      storageLocationAr: article.storageLocationAr,
      storageLocation: article.storageLocation,
      conditionAr: article.conditionAr,
      condition: article.condition,
      isPermanent: article.isPermanent,
      notes: article.notes || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async () => {
    const data = {
      nameAr: form.nameAr,
      name: form.name,
      descriptionAr: form.descriptionAr || undefined,
      description: form.description || undefined,
      categoryAr: form.categoryAr,
      category: form.category,
      quantity: form.quantity,
      status: form.status,
      storageLocationAr: form.storageLocationAr,
      storageLocation: form.storageLocation,
      conditionAr: form.conditionAr,
      condition: form.condition,
      isPermanent: form.isPermanent,
      notes: form.notes || undefined,
    }

    if (editingArticle) {
      await updateArticle(editingArticle.id, data)
    } else {
      await addArticle(data)
    }

    setShowModal(false)
    setForm(EMPTY_ARTICLE_FORM)
    setEditingArticle(null)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المقال؟')) {
      await deleteArticle(id)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="بحث عن مقال..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4" />
          إضافة مقال
        </Button>
      </div>

      {/* Articles table */}
      <Card>
        {filtered.length === 0 ? (
          <EmptyState message="لا توجد مقالات في المخزون" icon={<Package className="w-12 h-12" />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-right py-3 px-4 font-medium text-gray-500">الرمز المرجعي</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">الاسم</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 hidden sm:table-cell">الفئة</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">الكمية</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">المتاح</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">الحالة</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 hidden md:table-cell">مكان التخزين</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 hidden md:table-cell">الوضع</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 hidden sm:table-cell">النوع</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((article) => (
                  <tr key={article.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-semibold text-primary-700" dir="ltr">
                      {article.reference || '—'}
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">{article.nameAr}</td>
                    <td className="py-3 px-4 text-gray-600 hidden sm:table-cell">{article.categoryAr}</td>
                    <td className="py-3 px-4 text-gray-600">{article.quantity}</td>
                    <td className="py-3 px-4 text-gray-600">{article.availableQuantity}</td>
                    <td className="py-3 px-4">
                      <Badge variant={STATUS_VARIANTS[article.status] || 'default'}>
                        {STATUS_LABELS[article.status] || article.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-gray-600 hidden md:table-cell">{article.storageLocationAr}</td>
                    <td className="py-3 px-4 text-gray-600 hidden md:table-cell">{article.conditionAr}</td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      {article.isPermanent ? (
                        <Badge variant="default">نهائي</Badge>
                      ) : (
                        <Badge variant="info">قابل للإرجاع</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(article)}
                          className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                          title="تعديل"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(article.id)}
                          className="p-1 text-gray-400 hover:text-danger-600 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
        onClose={() => setShowModal(false)}
        title={editingArticle ? 'تعديل المقال' : 'إضافة مقال جديد'}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            labelAr="الاسم بالعربية"
            value={form.nameAr}
            onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
            required
          />
          <Input
            labelAr="الاسم بالفرنسية"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            labelAr="الوصف بالعربية"
            value={form.descriptionAr}
            onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })}
          />
          <Input
            labelAr="الوصف بالفرنسية"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            labelAr="الفئة بالعربية"
            value={form.categoryAr}
            onChange={(e) => setForm({ ...form, categoryAr: e.target.value })}
            required
          />
          <Input
            labelAr="الفئة بالفرنسية"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <Input
            labelAr="الكمية"
            type="number"
            min={0}
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })}
            required
          />
          <Select
            labelAr="الحالة"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as Article['status'] })}
            options={[
              { value: 'disponible', label: 'متاح' },
              { value: 'prete', label: 'مُعار' },
              { value: 'endommage', label: 'تالف' },
              { value: 'hors_service', label: 'خارج الخدمة' },
            ]}
          />
          <Input
            labelAr="مكان التخزين بالعربية"
            value={form.storageLocationAr}
            onChange={(e) => setForm({ ...form, storageLocationAr: e.target.value })}
          />
          <Input
            labelAr="مكان التخزين بالفرنسية"
            value={form.storageLocation}
            onChange={(e) => setForm({ ...form, storageLocation: e.target.value })}
          />
          <Input
            labelAr="الوضع بالعربية"
            value={form.conditionAr}
            onChange={(e) => setForm({ ...form, conditionAr: e.target.value })}
          />
          <Input
            labelAr="الوضع بالفرنسية"
            value={form.condition}
            onChange={(e) => setForm({ ...form, condition: e.target.value })}
          />
          <div className="flex items-center gap-3 md:col-span-2">
            <input
              type="checkbox"
              id="isPermanent"
              checked={form.isPermanent}
              onChange={(e) => setForm({ ...form, isPermanent: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="isPermanent" className="text-sm font-medium text-gray-700">
              نهائي (لا يُعاد)
            </label>
          </div>
          <div className="md:col-span-2">
            <TextArea
              labelAr="ملاحظات"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={!form.nameAr || !form.categoryAr}>
            {editingArticle ? 'تحديث' : 'إضافة'}
          </Button>
        </div>
      </Modal>
    </>
  )
}

// ============================================================
// LOANS TAB
// ============================================================

function LoansTab() {
  const { articles, loans, loading, loadArticles, loadLoans, createLoan, returnItems, addItemToLoan, removeItemFromLoan, markLoanDefinitive } = useInventoryStore()
  const { beneficiaries, loadBeneficiaries } = useBeneficiaryStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)

  // Create loan form state
  const [beneficiarySearch, setBeneficiarySearch] = useState('')
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState('')
  const [loanItems, setLoanItems] = useState<{ articleId: string; quantity: number; conditionOnLoan: string }[]>([])
  const [expectedReturnDate, setExpectedReturnDate] = useState('')
  const [loanNotes, setLoanNotes] = useState('')

  // Return items form state
  const [showReturnForm, setShowReturnForm] = useState(false)
  const [returnEntries, setReturnEntries] = useState<{ articleId: string; quantity: number; condition: string }[]>([])

  // Add item to existing loan form state
  const [showAddItemForm, setShowAddItemForm] = useState(false)
  const [newItemArticleId, setNewItemArticleId] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState(1)
  const [newItemCondition, setNewItemCondition] = useState('')

  useEffect(() => {
    loadLoans()
    loadArticles()
    loadBeneficiaries()
  }, [loadLoans, loadArticles, loadBeneficiaries])

  const filteredLoans = loans.filter(
    (l) =>
      l.beneficiaryNameAr.includes(searchTerm) ||
      l.beneficiaryName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredBeneficiaries = beneficiaries.filter(
    (b) =>
      b.firstNameAr.includes(beneficiarySearch) ||
      b.lastNameAr.includes(beneficiarySearch) ||
      b.firstName.toLowerCase().includes(beneficiarySearch.toLowerCase()) ||
      b.lastName.toLowerCase().includes(beneficiarySearch.toLowerCase())
  )

  const availableArticles = articles.filter((a) => a.availableQuantity > 0 && !a.isPermanent)

  // ---- Create Loan ----

  const openCreateLoan = () => {
    setSelectedBeneficiaryId('')
    setBeneficiarySearch('')
    setLoanItems([])
    setExpectedReturnDate('')
    setLoanNotes('')
    setShowCreateModal(true)
  }

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
    const beneficiary = beneficiaries.find((b) => b.id === selectedBeneficiaryId)
    if (!beneficiary || loanItems.length === 0) return

    const items: LoanItem[] = loanItems
      .filter((li) => li.articleId)
      .map((li) => {
        const article = articles.find((a) => a.id === li.articleId)
        return {
          articleId: li.articleId,
          articleName: article?.name || '',
          articleNameAr: article?.nameAr || '',
          quantity: li.quantity,
          returnedQuantity: 0,
          conditionOnLoan: li.conditionOnLoan,
        }
      })

    await createLoan({
      beneficiaryId: beneficiary.id,
      beneficiaryName: `${beneficiary.firstName} ${beneficiary.lastName}`,
      beneficiaryNameAr: `${beneficiary.firstNameAr} ${beneficiary.lastNameAr}`,
      items,
      status: 'en_cours',
      loanDate: new Date().toISOString().split('T')[0],
      expectedReturnDate: expectedReturnDate || undefined,
      notes: loanNotes || undefined,
    })

    setShowCreateModal(false)
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
    if (!selectedLoan) return
    const validReturns = returnEntries.filter((r) => r.quantity > 0)
    if (validReturns.length === 0) return

    await returnItems(selectedLoan.id, validReturns)
    // Reload the updated loan
    await loadLoans()
    const updatedLoan = useInventoryStore.getState().loans.find((l) => l.id === selectedLoan.id)
    if (updatedLoan) setSelectedLoan(updatedLoan)
    setShowReturnForm(false)
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
    const article = articles.find((a) => a.id === newItemArticleId)
    if (!article) return

    await addItemToLoan(selectedLoan.id, {
      articleId: newItemArticleId,
      articleName: article.name,
      articleNameAr: article.nameAr,
      quantity: newItemQuantity,
      returnedQuantity: 0,
      conditionOnLoan: newItemCondition,
    })

    await loadLoans()
    const updatedLoan = useInventoryStore.getState().loans.find((l) => l.id === selectedLoan.id)
    if (updatedLoan) setSelectedLoan(updatedLoan)
    setShowAddItemForm(false)
  }

  // ---- Remove Item from Loan ----

  const handleRemoveItem = async (articleId: string) => {
    if (!selectedLoan) return
    if (!window.confirm('هل أنت متأكد من إزالة هذا المقال من الإعارة؟')) return

    await removeItemFromLoan(selectedLoan.id, articleId)
    await loadLoans()
    const updatedLoan = useInventoryStore.getState().loans.find((l) => l.id === selectedLoan.id)
    if (updatedLoan) setSelectedLoan(updatedLoan)
  }

  // ---- Mark Definitive ----

  const handleMarkDefinitive = async () => {
    if (!selectedLoan) return
    if (!window.confirm('هل أنت متأكد من تحويل هذه الإعارة إلى نهائية؟ لن تُسترجع المقالات.')) return

    await markLoanDefinitive(selectedLoan.id)
    await loadLoans()
    const updatedLoan = useInventoryStore.getState().loans.find((l) => l.id === selectedLoan.id)
    if (updatedLoan) setSelectedLoan(updatedLoan)
  }

  if (loading) return <LoadingSpinner />

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="بحث عن إعارة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <Button onClick={openCreateLoan}>
          <Plus className="w-4 h-4" />
          إنشاء إعارة
        </Button>
      </div>

      {/* Loans table */}
      <Card>
        {filteredLoans.length === 0 ? (
          <EmptyState message="لا توجد إعارات" icon={<ArrowLeftRight className="w-12 h-12" />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-right py-3 px-4 font-medium text-gray-500">الرمز المرجعي</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">المستفيد</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">عدد المقالات</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">الحالة</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">تاريخ الإعارة</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">تاريخ الإرجاع المتوقع</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">تاريخ الإرجاع الفعلي</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredLoans.map((loan) => (
                  <tr key={loan.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-semibold text-primary-700" dir="ltr">
                      {loan.reference || '—'}
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">{loan.beneficiaryNameAr}</td>
                    <td className="py-3 px-4 text-gray-600">{loan.items.length}</td>
                    <td className="py-3 px-4">
                      <Badge variant={LOAN_STATUS_VARIANTS[loan.status] || 'default'}>
                        {LOAN_STATUS_LABELS[loan.status] || loan.status}
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
                        onClick={() => openLoanDetail(loan)}
                        className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                        title="التفاصيل"
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
        onClose={() => setShowCreateModal(false)}
        title="إنشاء إعارة جديدة"
        size="xl"
      >
        <div className="space-y-6">
          {/* Beneficiary selector */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">المستفيد</label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="بحث عن مستفيد..."
                value={beneficiarySearch}
                onChange={(e) => setBeneficiarySearch(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            {beneficiarySearch && !selectedBeneficiaryId && (
              <div className="border border-gray-200 rounded-lg max-h-40 overflow-auto">
                {filteredBeneficiaries.length === 0 ? (
                  <p className="p-3 text-sm text-gray-400">لا توجد نتائج</p>
                ) : (
                  filteredBeneficiaries.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setSelectedBeneficiaryId(b.id)
                        setBeneficiarySearch(`${b.firstNameAr} ${b.lastNameAr}`)
                      }}
                      className="w-full text-right px-4 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      {b.firstNameAr} {b.lastNameAr}
                      <span className="text-gray-400 mr-2">({b.firstName} {b.lastName})</span>
                    </button>
                  ))
                )}
              </div>
            )}
            {selectedBeneficiaryId && (
              <div className="flex items-center gap-2">
                <Badge variant="success">تم الاختيار</Badge>
                <button
                  onClick={() => {
                    setSelectedBeneficiaryId('')
                    setBeneficiarySearch('')
                  }}
                  className="text-xs text-danger-500 hover:underline"
                >
                  تغيير
                </button>
              </div>
            )}
          </div>

          {/* Dynamic items list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">المقالات</label>
              <Button size="sm" variant="secondary" onClick={addLoanItemRow}>
                <Plus className="w-3 h-3" />
                إضافة مقال
              </Button>
            </div>
            {loanItems.length === 0 && (
              <p className="text-sm text-gray-400">لم يتم إضافة أي مقال بعد</p>
            )}
            {loanItems.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg">
                <SearchableSelect
                  labelAr="المقال"
                  value={item.articleId}
                  onChange={(val) => updateLoanItemRow(index, 'articleId', val)}
                  options={availableArticles.map((a) => ({
                    value: a.id,
                    label: `${a.nameAr} (متاح: ${a.availableQuantity})`,
                  }))}
                />
                <Input
                  labelAr="الكمية"
                  type="number"
                  min={1}
                  max={
                    item.articleId
                      ? articles.find((a) => a.id === item.articleId)?.availableQuantity || 1
                      : 1
                  }
                  value={item.quantity}
                  onChange={(e) => updateLoanItemRow(index, 'quantity', parseInt(e.target.value) || 1)}
                />
                <Input
                  labelAr="الحالة عند الإعارة"
                  value={item.conditionOnLoan}
                  onChange={(e) => updateLoanItemRow(index, 'conditionOnLoan', e.target.value)}
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

          {/* Expected return date */}
          <Input
            labelAr="تاريخ الإرجاع المتوقع"
            type="date"
            value={expectedReturnDate}
            onChange={(e) => setExpectedReturnDate(e.target.value)}
          />

          {/* Notes */}
          <TextArea
            labelAr="ملاحظات"
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
        title="تفاصيل الإعارة"
        size="xl"
      >
        {selectedLoan && (
          <div className="space-y-6">
            {/* Beneficiary info */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700">معلومات المستفيد</h4>
                  <p className="text-sm text-gray-900">{selectedLoan.beneficiaryNameAr}</p>
                </div>
                <div className="text-left">
                  <span className="text-xs text-gray-500">الرمز المرجعي للإعارة</span>
                  <p className="text-sm font-bold text-primary-700" dir="ltr">{selectedLoan.reference || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>تاريخ الإعارة: {formatDate(selectedLoan.loanDate)}</span>
                {selectedLoan.expectedReturnDate && (
                  <span>الإرجاع المتوقع: {formatDate(selectedLoan.expectedReturnDate)}</span>
                )}
                {selectedLoan.actualReturnDate && (
                  <span>الإرجاع الفعلي: {formatDate(selectedLoan.actualReturnDate)}</span>
                )}
              </div>
              <Badge variant={LOAN_STATUS_VARIANTS[selectedLoan.status] || 'default'}>
                {LOAN_STATUS_LABELS[selectedLoan.status] || selectedLoan.status}
              </Badge>
            </div>

            {/* Items list */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">المقالات</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-right py-2 px-3 font-medium text-gray-500">المقال</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-500">الكمية</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-500">المُرتجع</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-500">الحالة عند الإعارة</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-500">الحالة عند الإرجاع</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-500">الإجراءات</th>
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
                        <td className="py-2 px-3 text-gray-600">{item.conditionOnLoan || '—'}</td>
                        <td className="py-2 px-3 text-gray-600">{item.conditionOnReturn || '—'}</td>
                        <td className="py-2 px-3">
                          {selectedLoan.status !== 'definitif' && selectedLoan.status !== 'retourne' && (
                            <button
                              onClick={() => handleRemoveItem(item.articleId)}
                              className="p-1 text-gray-400 hover:text-danger-600 transition-colors"
                              title="إزالة"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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
                <h4 className="text-sm font-semibold text-gray-700">إرجاع المقالات</h4>
                {returnEntries.map((entry, index) => {
                  const loanItem = selectedLoan.items.find((i) => i.articleId === entry.articleId)
                  if (!loanItem) return null
                  const remaining = loanItem.quantity - loanItem.returnedQuantity
                  return (
                    <div key={entry.articleId} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-500">المقال</label>
                        <p className="text-sm font-medium text-gray-900">{loanItem.articleNameAr}</p>
                        <p className="text-xs text-gray-400">المتبقي: {remaining}</p>
                      </div>
                      <Input
                        labelAr="الكمية المُرتجعة"
                        type="number"
                        min={0}
                        max={remaining}
                        value={entry.quantity}
                        onChange={(e) =>
                          updateReturnEntry(index, 'quantity', Math.min(parseInt(e.target.value) || 0, remaining))
                        }
                      />
                      <Input
                        labelAr="الحالة عند الإرجاع"
                        value={entry.condition}
                        onChange={(e) => updateReturnEntry(index, 'condition', e.target.value)}
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
                    disabled={returnEntries.every((r) => r.quantity === 0)}
                  >
                    <RotateCcw className="w-4 h-4" />
                    تأكيد الإرجاع
                  </Button>
                </div>
              </div>
            )}

            {/* Add Item to Loan Form */}
            {showAddItemForm && (
              <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                <h4 className="text-sm font-semibold text-gray-700">إضافة مقال إلى الإعارة</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <SearchableSelect
                    labelAr="المقال"
                    value={newItemArticleId}
                    onChange={setNewItemArticleId}
                    options={availableArticles.map((a) => ({
                      value: a.id,
                      label: `${a.nameAr} (متاح: ${a.availableQuantity})`,
                    }))}
                  />
                  <Input
                    labelAr="الكمية"
                    type="number"
                    min={1}
                    max={
                      newItemArticleId
                        ? articles.find((a) => a.id === newItemArticleId)?.availableQuantity || 1
                        : 1
                    }
                    value={newItemQuantity}
                    onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)}
                  />
                  <Input
                    labelAr="الحالة"
                    value={newItemCondition}
                    onChange={(e) => setNewItemCondition(e.target.value)}
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
                <h4 className="text-sm font-semibold text-gray-700 mb-1">ملاحظات</h4>
                <p className="text-sm text-gray-600">{selectedLoan.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
