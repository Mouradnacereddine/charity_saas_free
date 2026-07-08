import { useEffect, useState } from 'react';
import { Card, Button, Input, SearchableSelect, Modal, TextArea, EmptyState, LoadingSpinner } from '../components/common/UI';
import { useMedicalStore } from '../stores/medicalStore';
import { useBeneficiaryStore } from '../stores/beneficiaryStore';
import { useCaisseStore } from '../stores/caisseStore';
import { formatCurrency, numberToArabicWords } from '../utils/helpers';
import { printReceipt } from '../lib/receipt';
import { Plus, Search, Eye, Trash2, Stethoscope, Printer } from 'lucide-react';
import type { MedicalReferral } from '../types';

export default function MedicalPage() {
  const { referrals, loading, loadReferrals, addReferral, deleteReferral } = useMedicalStore();
  const { beneficiaries, loadBeneficiaries } = useBeneficiaryStore();
  const { caisses, loadCaisses } = useCaisseStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<MedicalReferral | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [caisseId, setCaisseId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [doctorNameAr, setDoctorNameAr] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [analysisTypeAr, setAnalysisTypeAr] = useState('');
  const [analysisType, setAnalysisType] = useState('');
  const [hospitalAr, setHospitalAr] = useState('');
  const [hospital, setHospital] = useState('');
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadReferrals();
    loadBeneficiaries();
    loadCaisses();
  }, []);

  // Find medical caisses
  const medicalCaisses = caisses.filter(
    (c) => c.nameAr.includes('طب') || c.nameAr.includes('صح') || c.name.toLowerCase().includes('médic')
  );
  const allCaisses = medicalCaisses.length > 0 ? medicalCaisses : caisses;

  const selectedCaisse = caisses.find((c) => c.id === caisseId);

  const resetForm = () => {
    setBeneficiaryId('');
    setCaisseId('');
    setSubCategoryId('');
    setDoctorNameAr('');
    setDoctorName('');
    setAnalysisTypeAr('');
    setAnalysisType('');
    setHospitalAr('');
    setHospital('');
    setAmount(0);
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
  };

  const handleAddReferral = async () => {
    if (!beneficiaryId || !caisseId || !doctorNameAr) return;

    const beneficiary = beneficiaries.find((b) => b.id === beneficiaryId);
    if (!beneficiary) return;

    await addReferral({
      beneficiaryId,
      beneficiaryName: `${beneficiary.firstName} ${beneficiary.lastName}`,
      beneficiaryNameAr: `${beneficiary.firstNameAr} ${beneficiary.lastNameAr}`,
      caisseId,
      subCategoryId: subCategoryId || undefined,
      doctorName: doctorName || doctorNameAr,
      doctorNameAr,
      analysisType: analysisType || undefined,
      analysisTypeAr: analysisTypeAr || undefined,
      hospital: hospital || undefined,
      hospitalAr: hospitalAr || undefined,
      amount,
      date,
      notes: notes || undefined,
    });

    resetForm();
    setShowAddModal(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا التوجيه الطبي؟')) {
      await deleteReferral(id);
    }
  };

  const handlePrint = (referral: MedicalReferral) => {
    printReceipt(
      'توجيه طبي', 'Orientation Médicale',
      `
        <div class="row"><label>الرمز المرجعي</label><strong>${referral.reference || '—'}</strong></div>
        <div class="row"><label>المستفيد</label><strong>${referral.beneficiaryNameAr}</strong></div>
        <div class="row"><label>الطبيب</label><strong>${referral.doctorNameAr}</strong></div>
        ${referral.analysisTypeAr ? `<div class="row"><label>التحليل</label><strong>${referral.analysisTypeAr}</strong></div>` : ''}
        ${referral.hospitalAr ? `<div class="row"><label>المستشفى</label><strong>${referral.hospitalAr}</strong></div>` : ''}
        <div class="row"><label>التاريخ</label><strong>${referral.date}</strong></div>
      `,
      'color:#2563eb',
      formatCurrency(referral.amount),
      referral.amountInWordsAr,
      '',
      referral.notes ? `<div class="row"><label>ملاحظات</label><strong>${referral.notes}</strong></div>` : '',
      'توقيع المسؤول', 'ختم الجمعية'
    );
  };

  const filteredReferrals = referrals.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.beneficiaryNameAr.includes(term) ||
      r.beneficiaryName.toLowerCase().includes(term) ||
      r.doctorNameAr.includes(term) ||
      r.doctorName.toLowerCase().includes(term) ||
      r.analysisTypeAr?.includes(term) ||
      r.hospitalAr?.includes(term)
    );
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">التوجيه الطبي</h2>
          <p className="text-sm text-gray-500 mt-1">إدارة التوجيهات الطبية للمستفيدين</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" />
          إضافة توجيه طبي
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="بحث بالاسم، الطبيب، نوع التحليل..."
          className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Referrals Table */}
      {filteredReferrals.length === 0 ? (
        <EmptyState message="لا توجد توجيهات طبية" icon={<Stethoscope className="w-12 h-12" />} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-right py-3 px-4 text-gray-600 font-medium">الرمز المرجعي</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-medium">المستفيد</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-medium hidden sm:table-cell">الطبيب</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-medium hidden md:table-cell">نوع التحليل</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-medium">المبلغ</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-medium hidden sm:table-cell">التاريخ</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-medium">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredReferrals.map((referral) => (
                  <tr key={referral.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-semibold text-primary-700" dir="ltr">
                      {referral.reference || '—'}
                    </td>
                    <td className="py-3 px-4 font-medium">{referral.beneficiaryNameAr}</td>
                    <td className="py-3 px-4 hidden sm:table-cell">{referral.doctorNameAr}</td>
                    <td className="py-3 px-4 hidden md:table-cell">{referral.analysisTypeAr || '—'}</td>
                    <td className="py-3 px-4 font-medium text-primary-600">{formatCurrency(referral.amount)}</td>
                    <td className="py-3 px-4 text-gray-500 hidden sm:table-cell">{referral.date}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setShowDetailModal(referral)}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePrint(referral)}
                          className="p-1.5 text-gray-400 hover:text-success-600 hover:bg-green-50 rounded"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(referral.id)}
                          className="p-1.5 text-gray-400 hover:text-danger-500 hover:bg-red-50 rounded"
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
        </Card>
      )}

      {/* Add Referral Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); resetForm(); }}
        title="إضافة توجيه طبي"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchableSelect
              labelAr="المستفيد"
              value={beneficiaryId}
              onChange={setBeneficiaryId}
              options={beneficiaries.map((b) => ({
                value: b.id,
                label: `${b.firstNameAr} ${b.lastNameAr} (${b.reference || ''})`,
              }))}
            />
            <SearchableSelect
              labelAr="الصندوق"
              value={caisseId}
              onChange={(val) => {
                setCaisseId(val);
                setSubCategoryId('');
              }}
              options={allCaisses.map((c) => ({
                value: c.id,
                label: c.nameAr,
              }))}
            />
          </div>

          {selectedCaisse && selectedCaisse.subCategories.length > 0 && (
            <SearchableSelect
              labelAr="الفئة الفرعية"
              value={subCategoryId}
              onChange={setSubCategoryId}
              options={selectedCaisse.subCategories.map((s) => ({
                value: s.id,
                label: s.nameAr,
              }))}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              labelAr="اسم الطبيب بالعربية"
              value={doctorNameAr}
              onChange={(e) => setDoctorNameAr(e.target.value)}
              placeholder="د. محمد ..."
            />
            <Input
              labelAr="اسم الطبيب بالفرنسية (اختياري)"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              dir="ltr"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              labelAr="نوع التحليل / الفحص بالعربية"
              value={analysisTypeAr}
              onChange={(e) => setAnalysisTypeAr(e.target.value)}
              placeholder="تحليل دم، أشعة..."
            />
            <Input
              labelAr="نوع التحليل بالفرنسية (اختياري)"
              value={analysisType}
              onChange={(e) => setAnalysisType(e.target.value)}
              dir="ltr"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              labelAr="المستشفى / العيادة بالعربية"
              value={hospitalAr}
              onChange={(e) => setHospitalAr(e.target.value)}
            />
            <Input
              labelAr="المستشفى بالفرنسية (اختياري)"
              value={hospital}
              onChange={(e) => setHospital(e.target.value)}
              dir="ltr"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                labelAr="المبلغ (دج)"
                type="number"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                min={0}
              />
              {amount > 0 && (
                <p className="text-xs text-gray-500 mt-1">{numberToArabicWords(amount)}</p>
              )}
            </div>
            <Input
              labelAr="التاريخ"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <TextArea
            labelAr="ملاحظات"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex gap-3 justify-end pt-4">
            <Button variant="secondary" onClick={() => { setShowAddModal(false); resetForm(); }}>
              إلغاء
            </Button>
            <Button onClick={handleAddReferral} disabled={!beneficiaryId || !caisseId || !doctorNameAr}>
              إضافة التوجيه
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={!!showDetailModal}
        onClose={() => setShowDetailModal(null)}
        title="تفاصيل التوجيه الطبي"
        size="lg"
      >
        {showDetailModal && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">الرمز المرجعي</p>
                <p className="font-semibold text-primary-700" dir="ltr">{showDetailModal.reference || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">المستفيد</p>
                <p className="font-medium">{showDetailModal.beneficiaryNameAr}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">الطبيب</p>
                <p className="font-medium">{showDetailModal.doctorNameAr}</p>
              </div>
              {showDetailModal.analysisTypeAr && (
                <div>
                  <p className="text-xs text-gray-500">نوع التحليل</p>
                  <p className="font-medium">{showDetailModal.analysisTypeAr}</p>
                </div>
              )}
              {showDetailModal.hospitalAr && (
                <div>
                  <p className="text-xs text-gray-500">المستشفى</p>
                  <p className="font-medium">{showDetailModal.hospitalAr}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500">التاريخ</p>
                <p className="font-medium">{showDetailModal.date}</p>
              </div>
            </div>

            <div className="bg-primary-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-primary-700">{formatCurrency(showDetailModal.amount)}</p>
              <p className="text-sm text-primary-600 mt-1">{showDetailModal.amountInWordsAr}</p>
            </div>

            {showDetailModal.notes && (
              <div>
                <p className="text-xs text-gray-500">ملاحظات</p>
                <p className="text-sm bg-gray-50 rounded-lg p-3">{showDetailModal.notes}</p>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => handlePrint(showDetailModal)} variant="success">
                <Printer className="w-4 h-4" />
                طباعة التوجيه
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
