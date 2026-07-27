import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Input, SearchableSelect, Modal, TextArea, Badge, EmptyState, LoadingSpinner } from '../components/common/UI';
import { formatDate } from '../utils/helpers';
import { Plus, Search, Filter, Eye, Edit, Trash2, Stethoscope, Settings, Phone, Mail, MapPin, Activity, Calendar } from 'lucide-react';
import type { Doctor, DoctorSpecialty, DoctorStats } from '../types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { doctorsApi } from '../lib/api';
import { useDoctors, useCreateDoctor, useUpdateDoctor, useDeleteDoctor, useDoctorStats, useDoctorSpecialties, useCreateDoctorSpecialty, useUpdateDoctorSpecialty, useDeleteDoctorSpecialty } from '../hooks/useDoctors';

const MONTH_KEYS = ['analytics.january','analytics.february','analytics.march','analytics.april','analytics.may','analytics.june','analytics.july','analytics.august','analytics.september','analytics.october','analytics.november','analytics.december'];

export default function DoctorsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: doctors = [], isLoading } = useDoctors();
  const { data: specialties = [] } = useDoctorSpecialties();
  const createDoctor = useCreateDoctor();
  const updateDoctor = useUpdateDoctor();
  const deleteDoctor = useDeleteDoctor();
  const createSpecialty = useCreateDoctorSpecialty();
  const updateSpecialty = useUpdateDoctorSpecialty();
  const deleteSpecialty = useDeleteDoctorSpecialty();

  const [activeTab, setActiveTab] = useState<'list' | 'settings'>('list');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<Doctor | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterSearchTerm, setFilterSearchTerm] = useState('');
  const [committedSearchTerm, setCommittedSearchTerm] = useState('');
  const [filterSpecialtyId, setFilterSpecialtyId] = useState('');
  const [committedSpecialtyId, setCommittedSpecialtyId] = useState('');
  const [filterAddress, setFilterAddress] = useState('');
  const [committedAddress, setCommittedAddress] = useState('');

  // Form states
  const [firstNameAr, setFirstNameAr] = useState('');
  const [lastNameAr, setLastNameAr] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [specialtyId, setSpecialtyId] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Settings form states
  const [newSpecAr, setNewSpecAr] = useState('');
  const [newSpecFr, setNewSpecFr] = useState('');
  const [editSpecId, setEditSpecId] = useState<string | null>(null);
  const [editSpecAr, setEditSpecAr] = useState('');
  const [editSpecFr, setEditSpecFr] = useState('');

  // Stats detail
  const [statsDoctorId, setStatsDoctorId] = useState<string | null>(null);
  const { data: doctorStats } = useDoctorStats(statsDoctorId || '');

  const monthNames = MONTH_KEYS.map(k => t(k));

  const resetForm = () => {
    setFirstNameAr('');
    setLastNameAr('');
    setFirstName('');
    setLastName('');
    setPhone('');
    setEmail('');
    setSpecialtyId('');
    setAddress('');
    setNotes('');
    setEditingId(null);
  };

  const openAddForm = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditForm = (doc: Doctor) => {
    setEditingId(doc.id);
    setFirstNameAr(doc.firstNameAr);
    setLastNameAr(doc.lastNameAr);
    setFirstName(doc.firstName);
    setLastName(doc.lastName);
    setPhone(doc.phone);
    setEmail(doc.email || '');
    setSpecialtyId(doc.specialtyId || '');
    setAddress(doc.address || '');
    setNotes(doc.notes || '');
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!lastNameAr.trim()) return;
    const data = {
      firstNameAr: firstNameAr.trim(),
      lastNameAr: lastNameAr.trim(),
      firstName: firstName.trim() || lastNameAr.trim(),
      lastName: lastName.trim() || '',
      phone: phone.trim(),
      email: email.trim() || undefined,
      specialtyId: specialtyId || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (editingId) {
      await updateDoctor.mutateAsync({ id: editingId, data });
    } else {
      await createDoctor.mutateAsync(data);
    }
    resetForm();
    setShowAddModal(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('doctors.confirmDelete'))) return;
    try {
      await deleteDoctor.mutateAsync(id);
    } catch (err: any) {
      alert(err.response?.data?.error || t('common.error'));
    }
  };

  const applyFilters = () => {
    setCommittedSearchTerm(filterSearchTerm);
    setCommittedSpecialtyId(filterSpecialtyId);
    setCommittedAddress(filterAddress);
  };
  const resetFilters = () => {
    setFilterSearchTerm('');
    setCommittedSearchTerm('');
    setFilterSpecialtyId('');
    setCommittedSpecialtyId('');
    setFilterAddress('');
    setCommittedAddress('');
  };

  const filteredDoctors = doctors.filter((d: Doctor) => {
    const term = committedSearchTerm.toLowerCase();
    if (term && !`${d.firstNameAr} ${d.lastNameAr} ${d.phone} ${d.email || ''} ${d.address || ''}`.includes(term)) return false;
    if (committedSpecialtyId && d.specialtyId !== committedSpecialtyId) return false;
    if (committedAddress && !(d.addressAr || d.address || '').includes(committedAddress)) return false;
    return true;
  });

  // ---- Specialties CRUD ----
  const handleAddSpecialty = async () => {
    if (!newSpecAr.trim()) return;
    await createSpecialty.mutateAsync({ name: newSpecFr.trim() || newSpecAr.trim(), nameAr: newSpecAr.trim() });
    setNewSpecAr(''); setNewSpecFr('');
  };
  const handleUpdateSpecialty = async () => {
    if (!editSpecId || !editSpecAr.trim()) return;
    await updateSpecialty.mutateAsync({ id: editSpecId, data: { name: editSpecFr.trim(), nameAr: editSpecAr.trim() } });
    setEditSpecId(null); setEditSpecAr(''); setEditSpecFr('');
  };
  const handleDeleteSpecialty = async (id: string) => {
    if (!window.confirm(t('doctors.confirmDeleteSpecialty'))) return;
    try { await deleteSpecialty.mutateAsync(id); } catch (err: any) { alert(err.response?.data?.error || t('common.error')); }
  };

  // ---- Renderers ----
  const renderListTab = () => (
    <>
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
        <input type="text" placeholder={t('doctors.searchPlaceholder')}
          className="w-full pr-10 pl-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
          value={filterSearchTerm} onChange={(e) => setFilterSearchTerm(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }} />
      </div>

      {filterOpen && (
        <Card titleAr={t('doctors.advancedSearch')}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SearchableSelect labelAr={t('doctors.specialty')} value={filterSpecialtyId} onChange={setFilterSpecialtyId}
                options={specialties.map((s: DoctorSpecialty) => ({ value: s.id, label: s.nameAr }))} />
              <Input labelAr={t('doctors.address')} value={filterAddress} onChange={(e) => setFilterAddress(e.target.value)} placeholder={t('doctors.searchAddressPlaceholder')} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={applyFilters}><Search className="w-4 h-4" /> {t('common.search')}</Button>
              <Button size="sm" variant="secondary" onClick={resetFilters}>{t('doctors.reset')}</Button>
            </div>
          </div>
        </Card>
      )}

      {isLoading ? <LoadingSpinner /> : filteredDoctors.length === 0 ? (
        <EmptyState message={t('doctors.empty')} icon={<Stethoscope className="w-12 h-12" />} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-start py-3 px-4 text-muted-foreground font-medium">{t('doctors.refCode')}</th>
                  <th className="text-start py-3 px-4 text-muted-foreground font-medium">{t('doctors.sectionName')}</th>
                  <th className="text-start py-3 px-4 text-muted-foreground font-medium hidden sm:table-cell">{t('doctors.specialty')}</th>
                  <th className="text-start py-3 px-4 text-muted-foreground font-medium hidden lg:table-cell">{t('doctors.address')}</th>
                  <th className="text-start py-3 px-4 text-muted-foreground font-medium hidden md:table-cell">{t('doctors.phone')}</th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-medium hidden lg:table-cell">{t('doctors.patientCount')}</th>
                  <th className="text-start py-3 px-4 text-muted-foreground font-medium hidden md:table-cell">{t('doctors.addDate')}</th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredDoctors.map((doc: Doctor) => (
                  <tr key={doc.id} className="border-b border-border hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => { setShowDetailModal(doc); setStatsDoctorId(doc.id); }}>
                    <td className="py-3 px-4 font-semibold text-primary" dir="ltr">{doc.reference}</td>
                    <td className="py-3 px-4 font-medium">{doc.lastNameAr} {doc.firstNameAr}</td>
                    <td className="py-3 px-4 hidden sm:table-cell text-muted-foreground">{doc.specialty?.nameAr || '—'}</td>
                    <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground max-w-[200px] truncate" title={doc.addressAr || doc.address || '—'}>{doc.addressAr || doc.address || '—'}</td>
                    <td className="py-3 px-4 hidden md:table-cell text-muted-foreground" dir="ltr">{doc.phone}</td>
                    <td className="py-3 px-4 text-center hidden lg:table-cell">
                      <Badge variant="info">{doc._count?.referrals ?? 0}</Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{formatDate(doc.createdAt)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => { setShowDetailModal(doc); setStatsDoctorId(doc.id); }}
                          className="p-1.5 text-muted-foreground/70 hover:text-primary hover:bg-primary/10 rounded">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); openEditForm(doc); }}
                          className="p-1.5 text-muted-foreground/70 hover:text-accent-foreground hover:bg-accent rounded">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                          className="p-1.5 text-muted-foreground/70 hover:text-danger-500 hover:bg-destructive/10 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
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
        title={editingId ? t('doctors.editTitle') : t('doctors.addTitle')} size="lg">
        <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-2">{t('doctors.sectionName')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input labelAr={t('doctors.lastNameAr')} value={lastNameAr} onChange={(e) => setLastNameAr(e.target.value)} placeholder={t('doctors.lastNameArPlaceholder')} required />
              <Input labelAr={t('doctors.firstNameAr')} value={firstNameAr} onChange={(e) => setFirstNameAr(e.target.value)} placeholder={t('doctors.firstNameArPlaceholder')} required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <Input labelAr={t('doctors.lastNameLatin')} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder={t('doctors.lastNameArPlaceholder')} dir="ltr" />
              <Input labelAr={t('doctors.firstNameLatin')} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={t('doctors.firstNameArPlaceholder')} dir="ltr" />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-2">{t('doctors.contactInfo')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input labelAr={t('doctors.phone')} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05XX XX XX XX" dir="ltr" required />
              <Input labelAr={t('doctors.email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="doctor@example.com" dir="ltr" />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-2">{t('doctors.additionalInfo')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SearchableSelect labelAr={t('doctors.specialty')} value={specialtyId} onChange={setSpecialtyId}
                options={specialties.map((s: DoctorSpecialty) => ({ value: s.id, label: s.nameAr }))}
                placeholder={t('doctors.specialtyPlaceholder')} />
              <Input labelAr={t('doctors.address')} value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t('doctors.addressPlaceholder')} />
            </div>
            <TextArea labelAr={t('common.notes')} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex gap-3 justify-end border-t border-border pt-4">
            <Button variant="secondary" onClick={() => { setShowAddModal(false); resetForm(); }}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={!lastNameAr.trim() || !phone.trim() || createDoctor.isPending || updateDoctor.isPending}>
              {editingId ? t('common.update') : t('common.add')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={!!showDetailModal} onClose={() => { setShowDetailModal(null); setStatsDoctorId(null); }}
        title={showDetailModal ? `${showDetailModal.lastNameAr} ${showDetailModal.firstNameAr}` : ''} size="lg">
        {showDetailModal && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between p-2 bg-muted rounded"><span className="text-muted-foreground">{t('doctors.refCode')}</span><span className="font-medium" dir="ltr">{showDetailModal.reference}</span></div>
              <div className="flex justify-between p-2 bg-muted rounded"><span className="text-muted-foreground">{t('doctors.fullName')}</span><span className="font-medium">{showDetailModal.lastNameAr} {showDetailModal.firstNameAr}</span></div>
              <div className="flex justify-between p-2 bg-muted rounded"><span className="text-muted-foreground"><Phone className="inline w-3 h-3 ml-1" />{t('doctors.phone')}</span><span className="font-medium" dir="ltr">{showDetailModal.phone}</span></div>
              <div className="flex justify-between p-2 bg-muted rounded"><span className="text-muted-foreground"><Mail className="inline w-3 h-3 ml-1" />{t('doctors.email')}</span><span className="font-medium" dir="ltr">{showDetailModal.email || '—'}</span></div>
              <div className="flex justify-between p-2 bg-muted rounded"><span className="text-muted-foreground">{t('doctors.specialty')}</span><span className="font-medium">{showDetailModal.specialty?.nameAr || '—'}</span></div>
              <div className="flex justify-between p-2 bg-muted rounded"><span className="text-muted-foreground"><MapPin className="inline w-3 h-3 ml-1" />{t('doctors.address')}</span><span className="font-medium">{showDetailModal.address || '—'}</span></div>
            </div>
            {showDetailModal.notes && <div className="bg-muted rounded-lg p-3 text-sm"><span className="text-muted-foreground">{t('common.notes')}</span><p className="mt-1">{showDetailModal.notes}</p></div>}

            {/* Stats section */}
            <div className="border-t border-border pt-4">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> {t('doctors.patientStats')}
              </h4>
              <p className="text-xs text-muted-foreground/70 mb-3">{t('doctors.patientStatsDesc')}</p>
              {doctorStats ? (
                <>
                  {/* Summary boxes */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <StatBox label={t('doctors.total')} value={doctorStats.totalReferrals} color="text-primary" />
                    <StatBox label={t('doctors.thisMonth')} value={doctorStats.referralsThisMonth} color="text-success" />
                    <StatBox label={t('doctors.thisWeek')} value={doctorStats.referralsThisWeek} color="text-warning" />
                    <StatBox label={t('doctors.lastReferral')} value={doctorStats.lastReferral ? formatDate(doctorStats.lastReferral) : '—'} color="text-muted-foreground" />
                  </div>

                  {/* Daily breakdown */}
                  {doctorStats.referralsByDay && doctorStats.referralsByDay.length > 0 && (
                    <div className="bg-muted rounded-lg p-3 mb-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {t('doctors.last7Days')}
                      </p>
                      <div className="flex items-end gap-1 h-16">
                        {doctorStats.referralsByDay.map((d: { day: string; count: number }) => {
                          const max = Math.max(...doctorStats.referralsByDay.map((x: any) => x.count), 1);
                          const height = Math.max((d.count / max) * 100, 4);
                          return (
                            <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                              <span className="text-[10px] text-muted-foreground font-medium">{d.count}</span>
                              <div className="w-full bg-success/30 rounded-t" style={{ height: `${height}%`, minHeight: '4px' }} />
                              <span className="text-[9px] text-muted-foreground/70">{d.day.slice(8)}/{d.day.slice(5,7)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Monthly breakdown */}
                  {doctorStats.referralsByMonth && doctorStats.referralsByMonth.length > 0 && (
                    <div className="bg-muted rounded-lg p-3 mb-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {t('doctors.last12Months')}
                      </p>
                      <div className="space-y-1">
                        {doctorStats.referralsByMonth.slice().reverse().map((m: { month: string; count: number }) => {
                          const y = m.month.slice(0,4);
                          const mo = parseInt(m.month.slice(5), 10);
                          const label = `${monthNames[mo-1]} ${y}`;
                          const max = Math.max(...doctorStats.referralsByMonth.map((x: any) => x.count), 1);
                          const pct = Math.round((m.count / max) * 100);
                          return (
                            <div key={m.month} className="flex items-center gap-2 text-xs">
                              <span className="w-24 text-left text-muted-foreground">{label}</span>
                              <div className="flex-1 bg-muted/80 rounded-full h-4 overflow-hidden">
                                <div className="bg-primary/100 h-full rounded-full transition-all" style={{ width: `${Math.max(pct, m.count > 0 ? 8 : 0)}%` }} />
                              </div>
                              <span className="w-6 text-center font-medium text-foreground">{m.count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Beneficiary history table */}
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <Activity className="w-3 h-3" /> {t('doctors.recentBeneficiaries')}
                    </p>
                    <div className="max-h-48 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-start py-1 px-2 font-medium text-muted-foreground">{t('common.date')}</th>
                            <th className="text-start py-1 px-2 font-medium text-muted-foreground">{t('doctors.beneficiary')}</th>
                            <th className="text-start py-1 px-2 font-medium text-muted-foreground">{t('doctors.beneficiaryRef')}</th>
                            <th className="text-center py-1 px-2 font-medium text-muted-foreground">{t('common.status')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {doctorStats.referralBeneficiaries?.map((r: any) => (
                            <tr key={r.id} className="border-b border-border">
                              <td className="py-1 px-2 text-muted-foreground">{formatDate(r.date)}</td>
                              <td className="py-1 px-2 text-foreground">{r.beneficiary?.nameAr || '—'}</td>
                              <td className="py-1 px-2 text-muted-foreground font-mono" dir="ltr">{r.beneficiary?.reference || '—'}</td>
                              <td className="py-1 px-2 text-center">
                                <Badge variant={r.status === 'completed' ? 'success' : r.status === 'pending' ? 'warning' : 'danger'}>
                                  {r.status === 'completed' ? t('dashboard.completed') : r.status === 'pending' ? t('dashboard.pending') : t('dashboard.cancelled')}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                          {(!doctorStats.referralBeneficiaries || doctorStats.referralBeneficiaries.length === 0) && (
                            <tr><td colSpan={4} className="py-2 text-center text-muted-foreground/70">{t('doctors.noPreviousReferrals')}</td></tr>
                          )}
                          </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground/70">{t('doctors.loadingStats')}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button size="sm" variant="secondary" onClick={() => setShowDetailModal(null)}>{t('common.close')}</Button>
              <Button size="sm" onClick={() => { const d = showDetailModal; setShowDetailModal(null); openEditForm(d); }}>{t('common.edit')}</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          {t('doctors.specialties')}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">{t('doctors.manageSpecialties')}</p>
        <div className="flex flex-col sm:flex-row gap-3 items-end mb-4">
          <Input labelAr={t('doctors.nameAr')} value={newSpecAr} onChange={(e) => setNewSpecAr(e.target.value)} placeholder={t('doctors.nameArPlaceholder')} />
          <Input labelAr={t('doctors.nameLatin')} value={newSpecFr} onChange={(e) => setNewSpecFr(e.target.value)} placeholder={t('doctors.nameArPlaceholder')} dir="ltr" />
          <Button onClick={handleAddSpecialty} disabled={!newSpecAr.trim()}>{t('common.add')}</Button>
        </div>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('doctors.arabicLabel')}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('doctors.latinLabel')}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground hidden sm:table-cell">{t('doctors.doctorCount')}</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {specialties.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-muted-foreground/70">{t('doctors.noSpecialties')}</td></tr>
                ) : specialties.map((s: DoctorSpecialty) => (
                  <tr key={s.id} className="border-b border-border hover:bg-muted">
                    {editSpecId === s.id ? (
                      <>
                        <td className="py-2 px-4"><input value={editSpecAr} onChange={(e) => setEditSpecAr(e.target.value)} className="w-full border border-border rounded px-2 py-1 text-sm" /></td>
                        <td className="py-2 px-4"><input value={editSpecFr} onChange={(e) => setEditSpecFr(e.target.value)} className="w-full border border-border rounded px-2 py-1 text-sm" dir="ltr" /></td>
                        <td className="py-2 px-4 hidden sm:table-cell" />
                        <td className="py-2 px-4 text-center flex gap-1 justify-center">
                          <Button size="sm" onClick={handleUpdateSpecialty}>{t('common.save')}</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditSpecId(null)}>{t('common.cancel')}</Button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-4 font-medium text-foreground">{s.nameAr}</td>
                        <td className="py-3 px-4 text-muted-foreground">{s.name}</td>
                        <td className="py-3 px-4 hidden sm:table-cell"><Badge>{s._count?.doctors ?? 0}</Badge></td>
                        <td className="py-3 px-4 text-center">
                          <button onClick={() => { setEditSpecId(s.id); setEditSpecAr(s.nameAr); setEditSpecFr(s.name); }} className="p-1.5 text-muted-foreground/70 hover:text-primary rounded"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteSpecialty(s.id)} className="p-1.5 text-muted-foreground/70 hover:text-danger-500 rounded"><Trash2 className="w-4 h-4" /></button>
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
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('doctors.title')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('doctors.subtitle')}</p>
        </div>
        {activeTab === 'list' && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setFilterOpen(!filterOpen)}>
              <Filter className="w-4 h-4" /> {t('doctors.advancedSearch')}
            </Button>
            <Button size="sm" onClick={openAddForm}>
              <Plus className="w-4 h-4" /> {t('doctors.addDoctor')}
            </Button>
          </div>
        )}
      </div>

      <div className="border-b border-border">
        <nav className="flex gap-2 sm:gap-4">
          <button onClick={() => setActiveTab('list')}
            className={`flex-1 sm:flex-initial pb-3 px-3 sm:px-1 text-sm font-medium border-b-2 transition-colors min-h-[44px] ${
              activeTab === 'list' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}>
            <Stethoscope className="inline-block w-4 h-4 ml-2" />
            {t('doctors.tabDoctors')}
          </button>
          <button onClick={() => setActiveTab('settings')}
            className={`flex-1 sm:flex-initial pb-3 px-3 sm:px-1 text-sm font-medium border-b-2 transition-colors min-h-[44px] ${
              activeTab === 'settings' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}>
            <Settings className="inline-block w-4 h-4 ml-2" />
            {t('doctors.tabSettings')}
          </button>
        </nav>
      </div>

      {activeTab === 'list' ? renderListTab() : renderSettingsTab()}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-muted rounded-lg p-3 text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
