import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, Button, Input, SearchableSelect, Modal, Badge, TextArea, EmptyState, LoadingSpinner } from '../components/common/UI'
import { formatCurrency, formatDate, numberToArabicWords, numberToFrenchWords } from '../utils/helpers'
import { dirForInput } from '../utils/localized'
import { printReceipt } from '../lib/receipt'
import { Plus, Search, Filter, Eye, Edit, Trash2, Printer, HeartHandshake, X } from 'lucide-react'
import type { Donor, DonationReceipt, Beneficiary } from '../types'
import { useDonors, useCreateDonor, useUpdateDonor, useDeleteDonor, useDonorReceipts, useUnsponsorBeneficiary } from '../hooks/useDonors'
import { useBeneficiaries } from '../hooks/useBeneficiaries'
import { useAuth } from '../hooks/useAuth'

const emptyDonorForm = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
  gender: 'male',
  sponsoredBeneficiaryIds: [] as string[],
}

type DonorFormData = typeof emptyDonorForm

export default function DonorsPage() {
  const { t, i18n } = useTranslation()
  const { association } = useAuth()
  const [queryParams] = useState<Record<string, string> | undefined>(undefined)
  const { data: donors = [], isLoading } = useDonors(queryParams)
  const { data: beneficiaries = [] } = useBeneficiaries()

  const createDonor = useCreateDonor()
  const updateDonor = useUpdateDonor()
  const deleteDonor = useDeleteDonor()
  const unsponsorBeneficiary = useUnsponsorBeneficiary()

  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState<Donor | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterName, setFilterName] = useState('')
  const [filterPhone, setFilterPhone] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [filterSponsored, setFilterSponsored] = useState('')
  const [committedName, setCommittedName] = useState('')
  const [committedPhone, setCommittedPhone] = useState('')
  const [committedGender, setCommittedGender] = useState('')
  const [committedSponsored, setCommittedSponsored] = useState('')

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
      gender: donor.gender || 'male',
      sponsoredBeneficiaryIds: [...(donor.sponsoredBeneficiaryIds || [])],
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
    setCommittedSponsored(filterSponsored)
  }
  const resetFilters = () => {
    setFilterName(''); setFilterPhone(''); setFilterGender(''); setFilterSponsored('')
    setCommittedName(''); setCommittedPhone(''); setCommittedGender(''); setCommittedSponsored('')
  }

  const filteredDonors = donors.filter((d: Donor) => {
    const name = `${d.lastName} ${d.firstName} ${d.lastName} ${d.firstName}`.toLowerCase()
    if (committedName && !name.includes(committedName.toLowerCase())) return false
    if (committedPhone && !(d.phone || '').includes(committedPhone)) return false
    if (committedGender && d.gender !== committedGender) return false
    if (committedSponsored && !(d.sponsoredBeneficiaryIds || []).includes(committedSponsored)) return false
    return true
  })

  // ---- Bénéficiaires pris en charge (panneau commun à la fiche détail) ----
  function SponsoredBeneficiariesPanel({ donor, onRemove }: { donor: Donor; onRemove?: (beneficiaryId: string) => void }) {
    const sponsoredIds = donor.sponsoredBeneficiaryIds || []
    if (sponsoredIds.length === 0) {
      return <p className="text-xs text-muted-foreground">{t('donors.noneSponsored')}</p>
    }
    const sponsored = beneficiaries.filter((b: Beneficiary) => sponsoredIds.includes(b.id))
    return (
      <div className="space-y-2">
        {sponsored.map((b: Beneficiary) => (
          <div key={b.id} className="flex items-center justify-between bg-muted rounded-lg p-3">
            <div>
              <p className="text-sm font-medium">{b.lastName} {b.firstName}</p>
              <p className="text-xs text-muted-foreground font-mono" dir="ltr">{b.reference || '—'}</p>
              {b.attribut && <p className="text-xs text-muted-foreground">{b.attribut}</p>}
            </div>
            {onRemove && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(b.id) }}
                className="p-1.5 text-muted-foreground hover:text-destructive rounded"
                title={t('donors.removeBeneficiary')}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    )
  }

  // ---- Receipt Modal (détail du donateur) ----
  function ReceiptModal({ donor, onClose }: { donor: Donor; onClose: () => void }) {
    const { data: receipts = [] } = useDonorReceipts(donor.id)

    const handleRemoveSponsored = async (beneficiaryId: string) => {
      if (!window.confirm(t('donors.removeBeneficiaryConfirm'))) return
      await unsponsorBeneficiary.mutateAsync({ id: donor.id, beneficiaryId })
    }

    // Le donateur affiché suit la liste (données fraîches après mutation)
    const freshDonor = donors.find((d: Donor) => d.id === donor.id) || donor

    return (
      <Modal isOpen={true} onClose={onClose} title={t('donors.details')} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between p-2 bg-muted rounded"><span className="text-muted-foreground">{t('donors.refCode')}</span><span className="font-medium" dir="ltr">{donor.reference}</span></div>
            <div className="flex justify-between p-2 bg-muted rounded"><span className="text-muted-foreground">{t('donors.fullName')}</span><span className="font-medium">{donor.lastName} {donor.firstName}</span></div>
            <div className="flex justify-between p-2 bg-muted rounded"><span className="text-muted-foreground">{t('donors.phone')}</span><span className="font-medium" dir="ltr">{donor.phone}</span></div>
            {donor.email && <div className="flex justify-between p-2 bg-muted rounded"><span className="text-muted-foreground">{t('donors.email')}</span><span className="font-medium" dir="ltr">{donor.email}</span></div>}
            {donor.address && <div className="flex justify-between p-2 bg-muted rounded"><span className="text-muted-foreground">{t('donors.address')}</span><span className="font-medium">{donor.address}</span></div>}
            {donor.gender && <div className="flex justify-between p-2 bg-muted rounded"><span className="text-muted-foreground">{t('donors.gender')}</span><span className="font-medium">{donor.gender === 'female' ? t('common.female') : t('common.male')}</span></div>}
            <div className="flex justify-between p-2 bg-muted rounded"><span className="text-muted-foreground">{t('donors.totalDonations')}</span><span className="font-medium text-success">{formatCurrency(freshDonor.totalDonated || 0)}</span></div>
            <div className="flex justify-between p-2 bg-muted rounded"><span className="text-muted-foreground">{t('donors.donationCount')}</span><span className="font-medium">{freshDonor.receiptCount ?? 0}</span></div>
            {donor.notes && <div className="flex justify-between p-2 bg-muted rounded md:col-span-2"><span className="text-muted-foreground">{t('common.notes')}</span><span className="font-medium">{donor.notes}</span></div>}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">{t('donors.sponsoredBeneficiaries')}</h4>
            <SponsoredBeneficiariesPanel donor={freshDonor} onRemove={handleRemoveSponsored} />
          </div>

          {receipts.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">{t('donors.receiptTitle')}</h4>
              <div className="space-y-2">
                {receipts.slice(0, 10).map((r: DonationReceipt) => (
                  <div key={r.id} className="flex items-center justify-between bg-muted rounded-lg p-3">
                    <div>
                      <p className="text-sm font-medium">{formatDate(r.date)}</p>
                      <p className="text-xs text-muted-foreground font-mono" dir="ltr">{r.receiptNumber || '—'}</p>
                      <p className="text-xs text-muted-foreground">{r.caisseName || '—'} - {formatCurrency(r.amount)}</p>
                      {r.subCategoryName && <p className="text-xs text-muted-foreground">{t('receipt.subCategory')} : {r.subCategoryName}</p>}
                      {(() => {
                        const b = (r as any).transaction?.beneficiary;
                        return b ? <p className="text-xs text-muted-foreground">{t('dashboard.beneficiary')} : {b.firstName} {b.lastName}</p> : null;
                      })()}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => printReceipt(
                        t('donors.receiptTitle'), t('donors.receiptTitle'),
                        `<div class="col"><div class="row"><span class="lbl">${t('receipt.receiptNo')}</span><span class="val">${r.receiptNumber || '—'}</span></div>
<div class="row"><span class="lbl">${t('common.date')}</span><span class="val">${formatDate(r.date)}</span></div>
<div class="row"><span class="lbl">${t('dashboard.donor')}</span><span class="val">${r.donorName || '—'}</span></div></div>
<div class="col"><div class="row"><span class="lbl">${t('dashboard.fund')}</span><span class="val">${r.caisseName || '—'}</span></div>
${r.subCategoryName ? `<div class="row"><span class="lbl">${t('receipt.subCategory')}</span><span class="val">${r.subCategoryName}</span></div>` : ''}
${(() => { const b = (r as any).transaction?.beneficiary; return b ? `<div class="row"><span class="lbl">${t('dashboard.beneficiary')}</span><span class="val">${b.firstName} ${b.lastName}</span></div>` : ''; })()}</div>`,
                        'color:#16a34a',
                        formatCurrency(r.amount), numberToArabicWords(r.amount), numberToFrenchWords(r.amount),
                        t('donors.donorSignature'), t('receipt.stampSignature'),
                        association?.name,
                        i18n.language === 'ar' ? 'rtl' : 'ltr',
                        i18n.language
                      )}>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input labelAr={t('donors.fullName')} value={filterName} onChange={(e) => setFilterName(e.target.value)} placeholder={t('common.search')} />
              <Input labelAr={t('donors.phone')} value={filterPhone} onChange={(e) => setFilterPhone(e.target.value)} placeholder={t('common.search')} />
              <SearchableSelect labelAr={t('donors.gender')} value={filterGender} onChange={setFilterGender}
                options={[{ value: 'male', label: t('common.male') }, { value: 'female', label: t('common.female') }]} />
              <SearchableSelect labelAr={t('donors.filterSponsored')} value={filterSponsored} onChange={setFilterSponsored}
                options={beneficiaries.map((b: Beneficiary) => ({
                  value: b.id,
                  label: `${b.lastName} ${b.firstName} (${b.reference || ''})`,
                }))}
                placeholder={t('common.all')} />
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
                  <th className="text-start py-3 px-4 text-muted-foreground font-medium">{t('donors.fullName')}</th>
                  <th className="text-start py-3 px-4 text-muted-foreground font-medium hidden sm:table-cell">{t('donors.phone')}</th>
                  <th className="text-start py-3 px-4 text-muted-foreground font-medium hidden md:table-cell">{t('donors.totalDonations')}</th>
                  <th className="text-start py-3 px-4 text-muted-foreground font-medium hidden md:table-cell">{t('donors.donationCount')}</th>
                  <th className="text-start py-3 px-4 text-muted-foreground font-medium hidden md:table-cell">{t('donors.sponsoredBeneficiaries')}</th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredDonors.map((donor: Donor) => (
                  <tr key={donor.id} className="border-b border-border hover:bg-muted transition-colors cursor-pointer" onClick={() => setShowDetailModal(donor)}>
                    <td className="py-3 px-4 font-semibold text-primary" dir="ltr">{donor.reference}</td>
                    <td className="py-3 px-4 font-medium text-foreground">{donor.lastName} {donor.firstName}</td>
                    <td className="py-3 px-4 hidden sm:table-cell text-foreground" dir="ltr">{donor.phone}</td>
                    <td className="py-3 px-4 hidden md:table-cell text-success font-semibold">{formatCurrency(donor.totalDonated || 0)}</td>
                    <td className="py-3 px-4 hidden md:table-cell"><Badge>{donor.receiptCount ?? 0}</Badge></td>
                    <td className="py-3 px-4 hidden md:table-cell"><Badge variant="info">{(donor.sponsoredBeneficiaryIds || []).length}</Badge></td>
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
            <Input label={t('donors.lastName')} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder={t('donors.lastNamePlaceholder')} required dir={dirForInput(i18n.language)} />
            <Input label={t('donors.firstName')} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder={t('donors.firstNamePlaceholder')} required dir={dirForInput(i18n.language)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label={t('donors.phone')} type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="05XX XX XX XX" dir="ltr" required />
            <Input label={t('donors.email')} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" dir="ltr" />
          </div>
          <Input label={t('donors.address')} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder={t('donors.addressPlaceholder')} />
          <SearchableSelect
            label={t('donors.gender')}
            options={[{ value: 'male', label: t('common.male') }, { value: 'female', label: t('common.female') }]}
            value={form.gender || 'male'}
            onChange={(val) => setForm({ ...form, gender: val })}
          />
          <TextArea label={t('common.notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

          {/* Bénéficiaires pris en charge */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">{t('donors.sponsoredBeneficiaries')}</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <SponsoredPicker
                  beneficiaries={beneficiaries}
                  selectedIds={form.sponsoredBeneficiaryIds}
                  onAdd={(id) => setForm({ ...form, sponsoredBeneficiaryIds: [...form.sponsoredBeneficiaryIds, id] })}
                />
              </div>
            </div>
            {form.sponsoredBeneficiaryIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.sponsoredBeneficiaryIds.map((id) => {
                  const b = beneficiaries.find((x: Beneficiary) => x.id === id)
                  if (!b) return null
                  return (
                    <Badge key={id} variant="info" className="pl-2.5 pr-1 py-1 gap-1">
                      <span>{b.lastName} {b.firstName}</span>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, sponsoredBeneficiaryIds: form.sponsoredBeneficiaryIds.filter(x => x !== id) })}
                        className="p-0.5 rounded hover:bg-primary/20"
                        title={t('donors.removeBeneficiary')}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </Badge>
                  )
                })}
              </div>
            )}
          </div>

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

// ---- Sélecteur d'ajout de bénéficiaire pris en charge ----
function SponsoredPicker({ beneficiaries, selectedIds, onAdd }: {
  beneficiaries: Beneficiary[]
  selectedIds: string[]
  onAdd: (id: string) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const remaining = beneficiaries.filter((b) =>
    !selectedIds.includes(b.id) &&
    `${b.lastName} ${b.firstName} ${b.reference}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2 border rounded-lg text-sm min-h-[44px] bg-background flex items-center justify-between text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring border-input"
      >
        <span>{t('donors.addBeneficiaryPlaceholder')}</span>
        <span className="text-muted-foreground text-xs">▼</span>
      </button>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg max-h-60 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-border bg-muted flex items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('common.search')}
              className="w-full px-2.5 py-1.5 text-xs border border-input bg-background text-foreground rounded focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {remaining.length === 0 ? (
              <p className="p-3 text-xs text-muted-foreground text-center">{t('common.noResults')}</p>
            ) : (
              remaining.slice(0, 50).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => { onAdd(b.id); setOpen(false); setSearch('') }}
                  className="w-full text-right px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors border-b border-border last:border-0 text-foreground"
                >
                  {b.lastName} {b.firstName}
                  <span className="text-xs text-muted-foreground font-mono ms-2" dir="ltr">{b.reference || ''}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
