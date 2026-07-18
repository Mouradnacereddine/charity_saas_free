import { useState } from 'react';
import { Card, Button, Input, SearchableSelect, Modal, TextArea, Badge, EmptyState, LoadingSpinner } from '../components/common/UI';
import { formatDate } from '../utils/helpers';
import { Plus, Search, Filter, Eye, Edit, Trash2, Stethoscope, Settings, Phone, Mail, MapPin, Activity, Calendar } from 'lucide-react';
import type { Doctor, DoctorSpecialty, DoctorStats } from '../types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { doctorsApi } from '../lib/api';
import { useDoctors, useCreateDoctor, useUpdateDoctor, useDeleteDoctor, useDoctorStats, useDoctorSpecialties, useCreateDoctorSpecialty, useUpdateDoctorSpecialty, useDeleteDoctorSpecialty } from '../hooks/useDoctors';

export default function DoctorsPage() {
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
    if (!window.confirm('هل أنت متأكد من حذف هذا الطبيب؟')) return;
    try {
      await deleteDoctor.mutateAsync(id);
    } catch (err: any) {
      alert(err.response?.data?.error || 'فشل الحذف');
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
    if (!window.confirm('هل أنت متأكد من حذف هذا التخصص؟')) return;
    try { await deleteSpecialty.mutateAsync(id); } catch (err: any) { alert(err.response?.data?.error || 'فشل الحذف'); }
  };

  // ---- Renderers ----
  const renderListTab = () => (
    <>
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="بحث باسم الطبيب، رقم الهاتف..."
          className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          value={filterSearchTerm} onChange={(e) => setFilterSearchTerm(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }} />
      </div>

      {filterOpen && (
        <Card titleAr="بحث متقدم">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SearchableSelect labelAr="التخصص" value={filterSpecialtyId} onChange={setFilterSpecialtyId}
                options={specialties.map((s: DoctorSpecialty) => ({ value: s.id, label: s.nameAr }))} />
              <Input labelAr="العنوان" value={filterAddress} onChange={(e) => setFilterAddress(e.target.value)} placeholder="بحث بالعنوان..." />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={applyFilters}><Search className="w-4 h-4" /> بحث</Button>
              <Button size="sm" variant="secondary" onClick={resetFilters}>إعادة تعيين</Button>
            </div>
          </div>
        </Card>
      )}

      {isLoading ? <LoadingSpinner /> : filteredDoctors.length === 0 ? (
        <EmptyState message="لا يوجد أطباء بعد" icon={<Stethoscope className="w-12 h-12" />} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-right py-3 px-4 text-gray-600 font-medium">الرمز المرجعي</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-medium">الاسم</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-medium hidden sm:table-cell">التخصص</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-medium hidden lg:table-cell">العنوان</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-medium hidden md:table-cell">الهاتف</th>
                  <th className="text-center py-3 px-4 text-gray-600 font-medium hidden lg:table-cell">عدد المرضى</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-medium hidden md:table-cell">تاريخ الإضافة</th>
                  <th className="text-center py-3 px-4 text-gray-600 font-medium">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredDoctors.map((doc: Doctor) => (
                  <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => { setShowDetailModal(doc); setStatsDoctorId(doc.id); }}>
                    <td className="py-3 px-4 font-semibold text-primary-700" dir="ltr">{doc.reference}</td>
                    <td className="py-3 px-4 font-medium">{doc.lastNameAr} {doc.firstNameAr}</td>
                    <td className="py-3 px-4 hidden sm:table-cell text-gray-600">{doc.specialty?.nameAr || '—'}</td>
                    <td className="py-3 px-4 hidden lg:table-cell text-gray-500 max-w-[200px] truncate" title={doc.addressAr || doc.address || '—'}>{doc.addressAr || doc.address || '—'}</td>
                    <td className="py-3 px-4 hidden md:table-cell text-gray-600" dir="ltr">{doc.phone}</td>
                    <td className="py-3 px-4 text-center hidden lg:table-cell">
                      <Badge variant="info">{doc._count?.referrals ?? 0}</Badge>
                    </td>
                    <td className="py-3 px-4 text-gray-500 hidden md:table-cell">{formatDate(doc.createdAt)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => { setShowDetailModal(doc); setStatsDoctorId(doc.id); }}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); openEditForm(doc); }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                          className="p-1.5 text-gray-400 hover:text-danger-500 hover:bg-red-50 rounded">
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
        title={editingId ? 'تعديل طبيب' : 'إضافة طبيب جديد'} size="lg">
        <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-100 pb-2">الاسم</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input labelAr="الاسم الأخير بالعربية" value={lastNameAr} onChange={(e) => setLastNameAr(e.target.value)} placeholder="مثال: بلقاسم" required />
              <Input labelAr="الاسم الأول بالعربية" value={firstNameAr} onChange={(e) => setFirstNameAr(e.target.value)} placeholder="مثال: أمينة" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <Input labelAr="الاسم الأخير باللاتينية" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Ex: Belkacem" dir="ltr" />
              <Input labelAr="الاسم الأول باللاتينية" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ex: Amina" dir="ltr" />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-100 pb-2">معلومات الاتصال</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input labelAr="رقم الهاتف" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05XX XX XX XX" dir="ltr" required />
              <Input labelAr="البريد الإلكتروني" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="doctor@example.com" dir="ltr" />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-100 pb-2">معلومات إضافية</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SearchableSelect labelAr="التخصص" value={specialtyId} onChange={setSpecialtyId}
                options={specialties.map((s: DoctorSpecialty) => ({ value: s.id, label: s.nameAr }))}
                placeholder="اختر تخصص..." />
              <Input labelAr="العنوان" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="مثال: 15 شارع الإخوة، الجزائر" />
            </div>
            <TextArea labelAr="ملاحظات" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex gap-3 justify-end border-t border-gray-100 pt-4">
            <Button variant="secondary" onClick={() => { setShowAddModal(false); resetForm(); }}>إلغاء</Button>
            <Button onClick={handleSave} disabled={!lastNameAr.trim() || !phone.trim() || createDoctor.isPending || updateDoctor.isPending}>
              {editingId ? 'تحديث' : 'إضافة'}
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
              <div className="flex justify-between p-2 bg-gray-50 rounded"><span className="text-gray-500">الرمز المرجعي</span><span className="font-medium" dir="ltr">{showDetailModal.reference}</span></div>
              <div className="flex justify-between p-2 bg-gray-50 rounded"><span className="text-gray-500">الاسم الكامل</span><span className="font-medium">{showDetailModal.lastNameAr} {showDetailModal.firstNameAr}</span></div>
              <div className="flex justify-between p-2 bg-gray-50 rounded"><span className="text-gray-500"><Phone className="inline w-3 h-3 ml-1" />الهاتف</span><span className="font-medium" dir="ltr">{showDetailModal.phone}</span></div>
              <div className="flex justify-between p-2 bg-gray-50 rounded"><span className="text-gray-500"><Mail className="inline w-3 h-3 ml-1" />البريد</span><span className="font-medium" dir="ltr">{showDetailModal.email || '—'}</span></div>
              <div className="flex justify-between p-2 bg-gray-50 rounded"><span className="text-gray-500">التخصص</span><span className="font-medium">{showDetailModal.specialty?.nameAr || '—'}</span></div>
              <div className="flex justify-between p-2 bg-gray-50 rounded"><span className="text-gray-500"><MapPin className="inline w-3 h-3 ml-1" />العنوان</span><span className="font-medium">{showDetailModal.address || '—'}</span></div>
            </div>
            {showDetailModal.notes && <div className="bg-gray-50 rounded-lg p-3 text-sm"><span className="text-gray-500">ملاحظات</span><p className="mt-1">{showDetailModal.notes}</p></div>}

            {/* Stats section */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary-600" /> إحصائيات المرضى
              </h4>
              <p className="text-xs text-gray-400 mb-3">عدد المرات التي تم فيها توجيه مرضى إلى هذا الطبيب</p>
              {doctorStats ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <StatBox label="الإجمالي" value={doctorStats.totalReferrals} color="text-primary-600" />
                    <StatBox label="هذا الشهر" value={doctorStats.referralsThisMonth} color="text-green-600" />
                    <StatBox label="هذا الأسبوع" value={doctorStats.referralsThisWeek} color="text-amber-600" />
                    <StatBox label="آخر توجيه" value={doctorStats.lastReferral ? formatDate(doctorStats.lastReferral) : '—'} color="text-gray-600" />
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> عدد المرضى حسب الشهر
                    </p>
                    <div className="flex items-end gap-1 h-20">
                      {doctorStats.referralsByMonth?.map((m: { month: string; count: number }) => {
                        const max = Math.max(...doctorStats.referralsByMonth.map((x: any) => x.count), 1);
                        const height = Math.max((m.count / max) * 100, 4);
                        return (
                          <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[10px] text-gray-500 font-medium">{m.count}</span>
                            <div className="w-full bg-primary-200 rounded-t" style={{ height: `${height}%`, minHeight: '4px' }} />
                            <span className="text-[9px] text-gray-400">{m.month.slice(5)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-400">جاري تحميل الإحصائيات...</p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
              <Button size="sm" variant="secondary" onClick={() => setShowDetailModal(null)}>إغلاق</Button>
              <Button size="sm" onClick={() => { const d = showDetailModal; setShowDetailModal(null); openEditForm(d); }}>تعديل</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary-600" />
          التخصصات
        </h3>
        <p className="text-sm text-gray-500 mb-4">إدارة تخصصات الأطباء</p>
        <div className="flex flex-col sm:flex-row gap-3 items-end mb-4">
          <Input labelAr="الاسم بالعربية" value={newSpecAr} onChange={(e) => setNewSpecAr(e.target.value)} placeholder="مثال: طب عام" />
          <Input labelAr="الاسم بالفرنسية" value={newSpecFr} onChange={(e) => setNewSpecFr(e.target.value)} placeholder="Ex: Généraliste" dir="ltr" />
          <Button onClick={handleAddSpecialty} disabled={!newSpecAr.trim()}>إضافة</Button>
        </div>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-right py-3 px-4 font-medium text-gray-500">بالعربية</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">بالفرنسية</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 hidden sm:table-cell">الأطباء</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {specialties.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-gray-400">لا توجد تخصصات بعد</td></tr>
                ) : specialties.map((s: DoctorSpecialty) => (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                    {editSpecId === s.id ? (
                      <>
                        <td className="py-2 px-4"><input value={editSpecAr} onChange={(e) => setEditSpecAr(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" /></td>
                        <td className="py-2 px-4"><input value={editSpecFr} onChange={(e) => setEditSpecFr(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" dir="ltr" /></td>
                        <td className="py-2 px-4 hidden sm:table-cell" />
                        <td className="py-2 px-4 text-center flex gap-1 justify-center">
                          <Button size="sm" onClick={handleUpdateSpecialty}>حفظ</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditSpecId(null)}>إلغاء</Button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-4 font-medium text-gray-900">{s.nameAr}</td>
                        <td className="py-3 px-4 text-gray-600">{s.name}</td>
                        <td className="py-3 px-4 hidden sm:table-cell"><Badge>{s._count?.doctors ?? 0}</Badge></td>
                        <td className="py-3 px-4 text-center">
                          <button onClick={() => { setEditSpecId(s.id); setEditSpecAr(s.nameAr); setEditSpecFr(s.name); }} className="p-1.5 text-gray-400 hover:text-primary-600 rounded"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteSpecialty(s.id)} className="p-1.5 text-gray-400 hover:text-danger-500 rounded"><Trash2 className="w-4 h-4" /></button>
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
          <h2 className="text-2xl font-bold text-gray-900">الأطباء</h2>
          <p className="text-sm text-gray-500 mt-1">إدارة الأطباء وبياناتهم</p>
        </div>
        {activeTab === 'list' && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setFilterOpen(!filterOpen)}>
              <Filter className="w-4 h-4" /> بحث متقدم
            </Button>
            <Button size="sm" onClick={openAddForm}>
              <Plus className="w-4 h-4" /> إضافة طبيب
            </Button>
          </div>
        )}
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-2 sm:gap-4">
          <button onClick={() => setActiveTab('list')}
            className={`flex-1 sm:flex-initial pb-3 px-3 sm:px-1 text-sm font-medium border-b-2 transition-colors min-h-[44px] ${
              activeTab === 'list' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}>
            <Stethoscope className="inline-block w-4 h-4 ml-2" />
            الأطباء
          </button>
          <button onClick={() => setActiveTab('settings')}
            className={`flex-1 sm:flex-initial pb-3 px-3 sm:px-1 text-sm font-medium border-b-2 transition-colors min-h-[44px] ${
              activeTab === 'settings' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}>
            <Settings className="inline-block w-4 h-4 ml-2" />
            إدارة التصنيفات
          </button>
        </nav>
      </div>

      {activeTab === 'list' ? renderListTab() : renderSettingsTab()}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
