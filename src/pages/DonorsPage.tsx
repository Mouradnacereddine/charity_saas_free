import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, Button, Input, SearchableSelect, Modal, Badge, TextArea, EmptyState, LoadingSpinner } from '../components/common/UI'
import { formatCurrency, formatDate, numberToArabicWords, numberToFrenchWords } from '../utils/helpers'
import { dirForInput } from '../utils/localized'
import { printReceipt } from '../lib/receipt'
import { Plus, Search, Filter, Eye, Edit, Trash2, Printer, HeartHandshake, Receipt } from 'lucide-react'
import type { Donor, DonationReceipt } from '../types'
import { useDonors, useCreateDonor, useUpdateDonor, useDeleteDonor, useDonorReceipts } from '../hooks/useDonors'
import { useQuery } from '@tanstack/react-query'
import { caissesApi, financeApi } from '../lib/api'
import { useAuth } from '../hooks/useAuth'

const emptyDonorForm = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
}

type DonorFormData = typeof emptyDonorForm

export default function DonorsPage() {
  const { t, i18n } = useTranslation()
  const { association } = useAuth()
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
  const [showDetailModal, setShowDetailModal] = useState<Donor | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterName, setFilterName] = useState('')
  const [filterPhone, setFilterPhone] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [committedName, setCommittedName] = useState('')
  const [committedPhone, setCommittedPhone] = useState('')
  const [committedGender, setCommittedGender] = useState('')

  const [form, setForm] = useState<DonorFormData>(emptyDonorForm)

  const resetForm = () => { setForm(emptyDonorForm); setEditingId(null) }

  const openEditForm = (donor: Donor) => {
    setEditingId(donor.id)
    setForm({
      firstName: donor.firstName || '',
      lastName: donor.lastName || '',
      phone: donor.phone || '',
      email: donor.email || '',
      address: donor.address || '',
      notes: donor.notes || '',
    })
    setShowAddModal(true)
  }

  const handleSave = async () => {
    if (!form.lastName.trim()) return
    const data = {
      ...form,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
    }
    if (editingId) {
      await updateDonor.mutateAsync({ id: editingId, data })
    } else {
      await createDonor.mutateAsync(data)
    }
    resetForm()
    setShowAddModal(false)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('donors.deleteConfirm'))) return
    await deleteDonor.mutateAsync(id)
  }

  const applyFilters = () => {
    setCommittedName(filterName)
    setCommittedPhone(filterPhone)
    setCommittedGender(filterGender)
  }
  const resetFilters = () => {
    setFilterName(''); setFilterPhone(''); setFilterGender('')
    setCommittedName(''); setCommittedPhone(''); setCommittedGender('')
  }

  const filteredDonors = donors.filter((d: Donor) => {
    const name = `${d.lastName} ${d.firstName} ${d.lastName} ${d.firstName}`.toLowerCase()
    if (committedName && !name.includes(committedName.toLowerCase())) return false
    if (committedPhone && !(d.phone || '').includes(committedPhone)) return false
    if (committedGender && d.gender !== committedGender) return false
    return true
  })

  // ---- Receipt Modal ----
  function ReceiptModal({ donor, onClose }: { donor: Donor; onClose: () => void }) {
    const [showReceipt, setShowReceipt] = useState(false)
    const { data: receipts = [] } = useDonorReceipts(donor.id)

    return (
      <Modal isOpen={true} onClose={onClose} title={t('donors.details')} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between p-2 bg-muted rounded"><span className="text-muted-foreground">{t('donors.refCode')}</span><span className="font-medium" dir="ltr">{donor.reference}</span></div>
            <div className="flex justify-between p-2 bg-muted rounded"><span className="text-muted-foreground">{t('common.sectionName')}</span><span className="font-medium">{donor.lastName} {donor.firstName}</span></div>
            <div className="flex justify-between p-2 bg-muted rounded"><span className="text-muted-foreground">{t('donors.phone')}</span><span className="font-medium" dir="ltr">{donor.phone}</span></div>
            <div className="flex justify-between p-2 bg-muted rounded"><span className="text-muted-foreground">{t('donors.totalDonations')}</span><span className="font-medium text-success">{formatCurrency(donor._sum?.amount || 0)}</span></div>
            <div className="flex justify-between p-2 bg-muted rounded"><span className="text-muted-foreground">{t('donors.donationCount')}</span><span className="font-medium">{donor._count?.transactions || 0}</span></div>
          </div>

          {receipts.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">{t('donors.receiptTitle')}</h4>
              <div className="space-y-2">
                {receipts.slice(0, 10).map((r: DonationReceipt) => (
                  <div key={r.id} className="flex items-center justify-between bg-muted rounded-lg p-3">
                    <div>
                      <p className="text-sm font-medium">{formatDate(r.date)}</p>
                      <p className="text-xs text-muted-foreground">{r.caisse?.nameAr} - {formatCurrency(r.amount)}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => printReceipt({ receipt: r, association: association || undefined, wordsAr: numberToArabicWords(r.amount), wordsFr: numberToFrenchWords(r.amount) })}>
                      <Printer className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button size="sm" variant="secondary" onClick={onClose}>{t('common.close')}</Button>
            <Button size="sm" onClick={() => { const d = showDetailModal; setShowDetailModal(null); openEditForm(d!); }}>{t('common.edit')}</Button>
          </div>
        </div>
      </Modal>
    )
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('donors.title')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{donors.length} {t('donors.title')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setFilterOpen(!filterOpen)}>
            <Filter className="w-4 h-4" /> {t('donors.advancedSearch')}
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setShowAddModal(true); }}>
            <Plus className="w-4 h-4" /> {t('donors.add')}
          </Button>
        </div>
      </div>

      {filterOpen && (
        <Card titleAr={t('donors.advancedSearch')}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input labelAr={t('common.sectionName')} value={filterName} onChange={(e) => setFilterName(e.target.value)} placeholder={t('common.search')} />
              <Input labelAr={t('donors.phone')} value={filterPhone} onChange={(e) => setFilterPhone(e.target.value)} placeholder={t('common.search')} />
              <SearchableSelect labelAr={t('donors.gender')} value={filterGender} onChange={setFilterGender}
                options={[{ value: 'male', label: t('common.male') }, { value: 'female', label: t('common.female') }]} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={applyFilters}><Search className="w-4 h-4" /> {t('common.search')}</Button>
              <Button size="sm" variant="secondary" onClick={resetFilters}>{t('common.clear')}</Button>
            </div>
          </div>
        </Card>
      )}

      {filteredDonors.length === 0 ? (
        <EmptyState message="—" icon={<HeartHandshake className="w-12 h-12" />} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-start py-3 px-4 text-muted-foreground font-medium">{t('donors.refCode')}</th>
                  <th className="text-start py-3 px-4 text-muted-foreground font-medium">{t('common.sectionName')}</th>
                  <th className="text-start py-3 px-4 text-muted-foreground font-medium hidden sm:table-cell">{t('donors.phone')}</th>
                  <th className="text-start py-3 px-4 text-muted-foreground font-medium hidden md:table-cell">{t('donors.totalDonations')}</th>
                  <th className="text-start py-3 px-4 text-muted-foreground font-medium hidden md:table-cell">{t('donors.donationCount')}</th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredDonors.map((donor: Donor) => (
                  <tr key={donor.id} className="border-b border-border hover:bg-muted transition-colors cursor-pointer" onClick={() => setShowDetailModal(donor)}>
                    <td className="py-3 px-4 font-semibold text-primary" dir="ltr">{donor.reference}</td>
                    <td className="py-3 px-4 font-medium text-foreground">{donor.lastName} {donor.firstName}</td>
                    <td className="py-3 px-4 hidden sm:table-cell text-foreground" dir="ltr">{donor.phone}</td>
                    <td className="py-3 px-4 hidden md:table-cell text-success font-semibold">{formatCurrency(donor._sum?.amount || 0)}</td>
                    <td className="py-3 px-4 hidden md:table-cell"><Badge>{donor._count?.transactions || 0}</Badge></td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); setShowDetailModal(donor); }} className="p-1.5 text-muted-foreground hover:text-primary rounded"><Eye className="w-4 h-4" /></button>
                        <button onClick={(e) => { e.stopPropagation(); openEditForm(donor); }} className="p-1.5 text-muted-foreground hover:text-primary rounded"><Edit className="w-4 h-4" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(donor.id); }} className="p-1.5 text-muted-foreground hover:text-destructive rounded"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); resetForm(); }}
        title={editingId ? t('donors.edit') : t('donors.addTitle')} size="lg">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label={t('donors.lastName')} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder={t('donors.lastNamePlaceholder')} required dir={dirForInput(association?.locale)} />
            <Input label={t('donors.firstName')} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder={t('donors.firstNamePlaceholder')} required dir={dirForInput(association?.locale)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input labelAr={t('donors.lastNameLatin')} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder={t('donors.lastNamePlaceholder')} dir="ltr" />
            <Input labelAr={t('donors.firstNameLatin')} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder={t('donors.firstNamePlaceholder')} dir="ltr" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input labelAr={t('donors.phone')} type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="05XX XX XX XX" dir="ltr" required />
            <Input labelAr={t('donors.email')} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" dir="ltr" />
          </div>
          <Input labelAr={t('common.address')} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder={t('donors.addressPlaceholder')} />
          <TextArea labelAr={t('common.notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex gap-3 justify-end border-t border-border pt-4">
            <Button variant="secondary" onClick={() => { setShowAddModal(false); resetForm(); }}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={!form.lastName.trim() || !form.phone.trim() || createDonor.isPending || updateDonor.isPending}>
              {editingId ? t('common.update') : t('common.add')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      {showDetailModal && <ReceiptModal donor={showDetailModal} onClose={() => setShowDetailModal(null)} />}
    </div>
  )
}
