import { useState } from 'react';
import { Card, Button, Input, SearchableSelect, Modal, TextArea, Badge, EmptyState, LoadingSpinner } from '../components/common/UI';
import { formatCurrency, formatDate, numberToArabicWords, calculateAge } from '../utils/helpers';
import { Plus, Search, Eye, Edit, Trash2, Stethoscope, Printer, Filter, Settings } from 'lucide-react';
import type { MedicalReferral, Beneficiary, Caisse, MedicalAnalysisType, MedicalHospital, SubCategory } from '../types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { caissesApi } from '../lib/api';
import { useMedicalReferrals, useCreateMedicalReferral, useDeleteMedicalReferral, useAnalysisTypes, useCreateAnalysisType, useUpdateAnalysisType, useDeleteAnalysisType, useHospitals, useCreateHospital, useUpdateHospital, useDeleteHospital } from '../hooks/useMedical';
import { useBeneficiaries } from '../hooks/useBeneficiaries';
import { api, doctorsApi, financeApi } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

export default function MedicalPage() {
  const queryClient = useQueryClient();
  const { association } = useAuth();
  const { data: referrals = [] } = useMedicalReferrals();
  const { data: beneficiaries = [] } = useBeneficiaries();
  const { data: caisses = [] } = useQuery({
    queryKey: ['caisses'],
    queryFn: () => caissesApi.list().then(r => r.data),
  });
  const { data: analysisTypes = [], isLoading: analysisTypesLoading } = useAnalysisTypes();
  const { data: hospitals = [], isLoading: hospitalsLoading } = useHospitals();
  const settingsLoading = analysisTypesLoading || hospitalsLoading;

  const createMedicalReferral = useCreateMedicalReferral();
  const deleteMedicalReferral = useDeleteMedicalReferral();
  const createAnalysisMutation = useCreateAnalysisType();
  const updateAnalysisMutation = useUpdateAnalysisType();
  const deleteAnalysisMutation = useDeleteAnalysisType();
  const createHospitalMutation = useCreateHospital();
  const updateHospitalMutation = useUpdateHospital();
  const deleteHospitalMutation = useDeleteHospital();

  const [activeTab, setActiveTab] = useState<'list' | 'settings'>('list');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<MedicalReferral | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterSearchTerm, setFilterSearchTerm] = useState('');
  const [committedSearchTerm, setCommittedSearchTerm] = useState('');
  const [filterCaisseId, setFilterCaisseId] = useState('');
  const [committedCaisseId, setCommittedCaisseId] = useState('');
  const [filterMinAmount, setFilterMinAmount] = useState('');
  const [committedMinAmount, setCommittedMinAmount] = useState('');
  const [filterMaxAmount, setFilterMaxAmount] = useState('');
  const [committedMaxAmount, setCommittedMaxAmount] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [committedDateFrom, setCommittedDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [committedDateTo, setCommittedDateTo] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('');
  const [committedDoctor, setCommittedDoctor] = useState('');
  const [filterAnalysis, setFilterAnalysis] = useState('');
  const [committedAnalysis, setCommittedAnalysis] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [committedStatus, setCommittedStatus] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('');
  const [committedSpecialty, setCommittedSpecialty] = useState('');

  const applyFilters = () => {
    setCommittedSearchTerm(filterSearchTerm);
    setCommittedCaisseId(filterCaisseId);
    setCommittedMinAmount(filterMinAmount);
    setCommittedMaxAmount(filterMaxAmount);
    setCommittedDateFrom(filterDateFrom);
    setCommittedDateTo(filterDateTo);
    setCommittedDoctor(filterDoctor);
    setCommittedAnalysis(filterAnalysis);
    setCommittedStatus(filterStatus);
    setCommittedSpecialty(filterSpecialty);
  };

  const resetFilters = () => {
    setFilterSearchTerm('');
    setCommittedSearchTerm('');
    setFilterCaisseId('');
    setCommittedCaisseId('');
    setFilterMinAmount('');
    setCommittedMinAmount('');
    setFilterMaxAmount('');
    setCommittedMaxAmount('');
    setFilterDateFrom('');
    setCommittedDateFrom('');
    setFilterDateTo('');
    setCommittedDateTo('');
    setFilterDoctor('');
    setCommittedDoctor('');
    setFilterAnalysis('');
    setCommittedAnalysis('');
    setFilterStatus('');
    setCommittedStatus('');
    setFilterSpecialty('');
    setCommittedSpecialty('');
  };

  // Settings tab state
  const [newAnalysisAr, setNewAnalysisAr] = useState('')
  const [newAnalysisFr, setNewAnalysisFr] = useState('')
  const [editAnalysisId, setEditAnalysisId] = useState<string | null>(null)
  const [editAnalysisAr, setEditAnalysisAr] = useState('')
  const [editAnalysisFr, setEditAnalysisFr] = useState('')
  const [newHospAr, setNewHospAr] = useState('')
  const [newHospFr, setNewHospFr] = useState('')
  const [editHospId, setEditHospId] = useState<string | null>(null)
  const [editHospAr, setEditHospAr] = useState('')
  const [editHospFr, setEditHospFr] = useState('')

  // Form states
  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [caisseId, setCaisseId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [doctorId, setDoctorId] = useState('');

  // Load doctors for searchable select
  const { data: allDoctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => doctorsApi.list().then(r => r.data),
  });

  const { data: specialties = [] } = useQuery({
    queryKey: ['doctor-specialties'],
    queryFn: () => doctorsApi.specialties().then(r => r.data),
  });

  const selectedDoctor = allDoctors.find((d: any) => d.id === doctorId);
  const [analysisTypeAr, setAnalysisTypeAr] = useState('');
  const [analysisType, setAnalysisType] = useState('');
  const [hospitalAr, setHospitalAr] = useState('');
  const [hospital, setHospital] = useState('');
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [txStatus, setTxStatus] = useState('pending');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmAmount, setConfirmAmount] = useState('');

  const selectedBeneficiary = beneficiaries.find((b: Beneficiary) => b.id === beneficiaryId);

  const ATTRIBUT_LABELS: Record<string, string> = {
    veuve: 'أرملة', orphelin: 'يتيم', personne_agee: 'شخص مسن',
    handicape: 'معاق', famille_demunie: 'عائلة معوزة', autre: 'أخرى',
  };

  const handleAddAnalysis = async () => {
    if (!newAnalysisAr.trim()) return
    await createAnalysisMutation.mutateAsync({ name: newAnalysisFr.trim(), nameAr: newAnalysisAr.trim() })
    setNewAnalysisAr(''); setNewAnalysisFr('')
  }
  const handleUpdateAnalysis = async () => {
    if (!editAnalysisId || !editAnalysisAr.trim()) return
    await updateAnalysisMutation.mutateAsync({ id: editAnalysisId, data: { name: editAnalysisFr.trim(), nameAr: editAnalysisAr.trim() } })
    setEditAnalysisId(null); setEditAnalysisAr(''); setEditAnalysisFr('')
  }
  const handleDeleteAnalysis = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا التحليل؟')) return
    await deleteAnalysisMutation.mutateAsync(id)
  }
  const handleAddHospital = async () => {
    if (!newHospAr.trim()) return
    await createHospitalMutation.mutateAsync({ name: newHospFr.trim(), nameAr: newHospAr.trim() })
    setNewHospAr(''); setNewHospFr('')
  }
  const handleUpdateHospital = async () => {
    if (!editHospId || !editHospAr.trim()) return
    await updateHospitalMutation.mutateAsync({ id: editHospId, data: { name: editHospFr.trim(), nameAr: editHospAr.trim() } })
    setEditHospId(null); setEditHospAr(''); setEditHospFr('')
  }
  const handleDeleteHospital = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المستشفى؟')) return
    await deleteHospitalMutation.mutateAsync(id)
  }

  const resetForm = () => {
    setBeneficiaryId('');
    setCaisseId('');
    setSubCategoryId('');
    setAnalysisTypeAr('');
    setAnalysisType('');
    setHospitalAr('');
    setHospital('');
    setAmount(0);
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setSelectedChildren([]);
    setTxStatus('pending');
  };

  const handleAddReferral = async () => {
    if (!beneficiaryId || !caisseId || !doctorId) return;

    const beneficiary = beneficiaries.find((b: Beneficiary) => b.id === beneficiaryId);
    if (!beneficiary) return;

    const childrenData = selectedChildren.map((childId: string) => {
      const child = (beneficiary.children || []).find((c: any) => c.id === childId || `${c.firstNameAr} ${c.lastNameAr}` === childId);
      return child ? {
        id: child.id || childId,
        nameAr: `${child.lastNameAr || ''} ${child.firstNameAr || ''}`.trim(),
        name: `${child.firstName || ''} ${child.lastName || ''}`.trim(),
        age: calculateAge(child.dateOfBirth).displayAr,
        gender: child.gender || 'male',
      } : { id: childId, nameAr: childId, name: '', age: '', gender: 'male' };
    });

    try {
      await createMedicalReferral.mutateAsync({
        beneficiaryId,
        beneficiaryName: `${beneficiary.firstName} ${beneficiary.lastName}`,
        beneficiaryNameAr: `${beneficiary.lastNameAr} ${beneficiary.firstNameAr}`,
        caisseId,
        subCategoryId: subCategoryId || undefined,
        doctorId,
        analysisType: analysisType || undefined,
        analysisTypeAr: analysisTypeAr || undefined,
        hospital: hospital || undefined,
        hospitalAr: hospitalAr || undefined,
        amount: amount || 0,
        status: txStatus,
        date,
        notes: notes || undefined,
        children: childrenData.length > 0 ? childrenData : undefined,
      });
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Erreur lors de la création';
      alert(msg);
      return;
    }

    resetForm();
    setShowAddModal(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا التوجيه الطبي؟')) {
      await deleteMedicalReferral.mutateAsync(id);
    }
  };

  const handlePrint = (referral: MedicalReferral) => {
    const caisse = caisses.find((c: Caisse) => c.id === referral.caisseId)
    const subCat = caisse?.subCategories.find((s: SubCategory) => s.id === referral.subCategoryId)
    const caisseRow = caisse ? `<span class="lbl">الصندوق</span><span class="val">${caisse.nameAr}</span>` : ''
    const subCatRow = subCat ? `<span class="lbl">الفئة الفرعية</span><span class="val">${subCat.nameAr}</span>` : ''

    const childrenHtml = referral.children && Array.isArray(referral.children) && referral.children.length > 0
      ? referral.children.map((c: any) => {
          const nameAr = c.nameAr || `${c.lastNameAr || ''} ${c.firstNameAr || ''}`.trim() || '—'
          let ageDisplay = ''
          try {
            if (c.dateOfBirth) {
              const age = calculateAge(c.dateOfBirth)
              ageDisplay = age?.displayAr || ''
            } else if (c.age) {
              ageDisplay = `${c.age} سنة`
            }
          } catch { ageDisplay = '' }
          const gender = c.gender === 'female' ? 'أنثى' : c.gender === 'male' ? 'ذكر' : ''
          return `<div class="child-item"><span class="child-name">${nameAr}</span>${ageDisplay ? ` — ${ageDisplay}` : ''}${gender ? ` — ${gender}` : ''}</div>`
        }).join('')
      : ''

    const fullBeneficiary = beneficiaries.find((b: Beneficiary) => b.id === referral.beneficiaryId)
    const ageDisplay = fullBeneficiary ? calculateAge(fullBeneficiary.dateOfBirth).displayAr : ''
    const genderDisplay = fullBeneficiary?.gender === 'female' ? 'أنثى' : fullBeneficiary?.gender === 'male' ? 'ذكر' : ''

    const MEDICAL_CSS = `
      @page { size: A5 portrait; margin: 5mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Segoe UI', Tahoma, sans-serif; direction: rtl; font-size: 10px; background: #fff; padding: 5mm; width: 148mm; }
      .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #2563eb; padding-bottom: 3px; margin-bottom: 6px; }
      .header .assoc { font-size: 13px; font-weight: bold; color: #2563eb; }
      .header .title { font-size: 11px; color: #1e40af; font-weight: 600; }
      .info-grid { display: flex; flex-wrap: wrap; gap: 1px 4px; margin-bottom: 4px; }
      .info-item { width: 48%; padding: 1.5px 0; }
      .info-item .lbl { font-size: 7px; color: #999; display: block; }
      .info-item .val { font-size: 10px; color: #222; display: block; }
      .section-title { font-size: 9px; font-weight: 700; color: #1e40af; margin: 4px 0 2px; padding: 2px 0; border-bottom: 0.5px solid #dbeafe; }
      .children-grid { display: flex; flex-wrap: wrap; gap: 1px 6px; margin: 2px 0; }
      .child-item { width: 100%; font-size: 9px; padding: 1px 0; border-bottom: 0.5px dotted #e5e7eb; color: #333; }
      .child-item .child-name { font-weight: 600; color: #111; }
      .amt { background: #f0f4ff; border-radius: 3px; padding: 3px 0; text-align: center; margin: 5px 0; }
      .amt .num { font-size: 18px; font-weight: bold; }
      .amt .words { font-size: 7.5px; color: #555; margin-top: 1px; }
      .sign-section { margin-top: 6px; }
      .sign-row { display: flex; justify-content: space-between; align-items: flex-end; padding: 0; }
      .sign-box { width: 60mm; text-align: center; }
      .sign-box .label { font-size: 7.5px; color: #888; display: block; margin-bottom: 1px; }
      .sign-box .line { border-top: 0.8px solid #444; height: 18px; }
      .notice { font-size: 7px; color: #666; text-align: center; margin-top: 4px; line-height: 1.6; }
    `

    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`
<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>توجيه طبي</title><style>${MEDICAL_CSS}</style></head>
<body>
  <div class="header">
    <span class="assoc">🕌 ${association?.nameAr || 'الجمعية الخيرية'}</span>
    <span class="title">توجيه طبي</span>
  </div>
  <div class="info-grid">
    <div class="info-item"><span class="lbl">الرمز المرجعي</span><span class="val">${referral.reference || '—'}</span></div>
    <div class="info-item"><span class="lbl">التاريخ</span><span class="val">${formatDate(referral.date)}</span></div>
    <div class="info-item"><span class="lbl">المستفيد</span><span class="val">${referral.beneficiaryNameAr}</span></div>
    <div class="info-item"><span class="lbl">رمز المستفيد</span><span class="val">${referral.beneficiaryReference || '—'}</span></div>
    ${fullBeneficiary?.nationalCardNumber ? `<div class="info-item"><span class="lbl">رقم البطاقة الوطنية</span><span class="val">${fullBeneficiary.nationalCardNumber}</span></div>` : ''}
    ${ageDisplay ? `<div class="info-item"><span class="lbl">العمر / الجنس</span><span class="val">${ageDisplay} — ${genderDisplay}</span></div>` : ''}
    <div class="info-item"><span class="lbl">الطبيب</span><span class="val">${referral.doctorNameAr || (referral.doctor ? referral.doctor.lastNameAr + ' ' + referral.doctor.firstNameAr : '')}</span></div>
    ${referral.analysisTypeAr ? `<div class="info-item"><span class="lbl">التحليل / الفحص</span><span class="val">${referral.analysisTypeAr}</span></div>` : ''}
    ${referral.hospitalAr ? `<div class="info-item"><span class="lbl">المستشفى / العيادة</span><span class="val">${referral.hospitalAr}</span></div>` : ''}
    ${caisseRow ? `<div class="info-item">${caisseRow}</div>` : ''}
    ${subCatRow ? `<div class="info-item">${subCatRow}</div>` : ''}
  </div>
  ${childrenHtml ? `<div class="section-title">الأطفال المستفيدون</div><div class="children-grid">${childrenHtml}</div>` : ''}
  ${referral.notes ? `<div class="section-title">ملاحظات</div><div class="info-item" style="width:100%"><span class="val">${referral.notes}</span></div>` : ''}
  <div class="amt">
    <div class="num">${formatCurrency(referral.amount)}</div>
    <div class="words">${referral.amountInWordsAr && !referral.amountInWordsAr.match(/^\d/) ? referral.amountInWordsAr : numberToArabicWords(referral.amount || 0)}</div>
  </div>
  <div class="sign-section">
    <div class="sign-row">
      <div class="sign-box"><span class="label">إمضاء رئيس الجمعية</span><div class="line"></div></div>
      <div class="sign-box"><span class="label">ختم الجمعية</span><div class="line"></div></div>
    </div>
  </div>
  <div class="notice">الجمعية تتخلى من مسؤوليتها عن كل توجيه طبي لا يحمل ختم الجمعية و إمضاء رئيس الجمعية، يُعتبر هذا التوجيه غير صالح و غير معترف به.</div>
  <script>window.print();window.close();</script>
</body></html>
`)
    w.document.close()
  };

  const appliedTerm = committedSearchTerm.toLowerCase();
  const filteredReferrals = referrals.filter((r: MedicalReferral) => {
    if (appliedTerm && !(
      (r.beneficiaryNameAr || '').includes(appliedTerm) ||
      (r.beneficiaryName || '').toLowerCase().includes(appliedTerm) ||
      (r.doctorNameAr || (r.doctor ? `${r.doctor.lastNameAr} ${r.doctor.firstNameAr}` : '')).includes(appliedTerm) ||
      (r.doctorName || (r.doctor ? `${r.doctor.firstName} ${r.doctor.lastName}` : '')).toLowerCase().includes(appliedTerm) ||
      (r.analysisTypeAr || '').includes(appliedTerm) ||
      (r.hospitalAr || '').includes(appliedTerm) ||
      (r.reference || '').toLowerCase().includes(appliedTerm)
    )) return false;

    if (committedCaisseId && r.caisseId !== committedCaisseId) return false;

    if (committedMinAmount && r.amount < Number(committedMinAmount)) return false;
    if (committedMaxAmount && r.amount > Number(committedMaxAmount)) return false;

    if (committedDateFrom && r.date < committedDateFrom) return false;
    if (committedDateTo && r.date > committedDateTo) return false;

    const docNameAr = r.doctorNameAr || (r.doctor ? `${r.doctor.lastNameAr} ${r.doctor.firstNameAr}` : '');
    if (committedDoctor && !docNameAr.includes(committedDoctor)) return false;

    if (committedAnalysis && !(r.analysisTypeAr?.includes(committedAnalysis))) return false;
    if (committedStatus && (r.status || 'pending') !== committedStatus) return false;

    const docSpecialtyAr = r.doctor?.specialty?.nameAr || '';
    if (committedSpecialty && !docSpecialtyAr.includes(committedSpecialty)) return false;

    return true;
  });
  const renderListTab = () => (
    <>
      {/* Quick Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="بحث بالاسم، الطبيب، نوع التحليل..."
          className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          value={filterSearchTerm}
          onChange={(e) => setFilterSearchTerm(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
        />
      </div>

      {/* Advanced Filters */}
      {filterOpen && (
        <Card titleAr="بحث متقدم">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <SearchableSelect
                labelAr="الصندوق"
                value={filterCaisseId}
                onChange={setFilterCaisseId}
                options={caisses.map((c: Caisse) => ({
                  value: c.id,
                  label: c.nameAr,
                }))}
              />
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">المبلغ من</label>
                <input
                  type="number" min="0" placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={filterMinAmount} onChange={(e) => setFilterMinAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">المبلغ إلى</label>
                <input
                  type="number" min="0" placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={filterMaxAmount} onChange={(e) => setFilterMaxAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">من تاريخ</label>
                <input type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">إلى تاريخ</label>
                <input type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
                />
              </div>
              <SearchableSelect
                labelAr="اسم الطبيب"
                value={filterDoctor}
                onChange={setFilterDoctor}
                options={allDoctors.map((d: any) => ({
                  value: `${d.lastNameAr} ${d.firstNameAr}`,
                  label: `${d.lastNameAr} ${d.firstNameAr}${d.specialty ? ' (' + d.specialty.nameAr + ')' : ''}`,
                }))}
                placeholder="اختر طبيب..."
              />
              <SearchableSelect
                labelAr="نوع التحليل"
                value={filterAnalysis}
                onChange={setFilterAnalysis}
                options={analysisTypes.map((a: any) => ({
                  value: a.nameAr,
                  label: a.nameAr,
                }))}
                placeholder="اختر تحليل..."
              />
              <SearchableSelect
                labelAr="التخصص الطبي"
                value={filterSpecialty}
                onChange={setFilterSpecialty}
                options={specialties.map((s: any) => ({
                  value: s.nameAr,
                  label: s.nameAr,
                }))}
                placeholder="اختر تخصص..."
              />
              <SearchableSelect
                labelAr="الحالة"
                options={[
                  { value: '', label: 'الكل' },
                  { value: 'pending', label: 'قيد الانتظار' },
                  { value: 'completed', label: 'مكتمل' },
                  { value: 'cancelled', label: 'ملغي' },
                ]}
                value={filterStatus}
                onChange={setFilterStatus}
              />
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={applyFilters}>
              <Search className="w-4 h-4" /> بحث
            </Button>
            <Button size="sm" variant="secondary" onClick={resetFilters}>
              إعادة تعيين
            </Button>
          </div>
        </Card>
      )}

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
                  <th className="text-right py-3 px-4 text-gray-600 font-medium hidden lg:table-cell">رقم البطاقة</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-medium hidden sm:table-cell">الطبيب</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-medium hidden md:table-cell">نوع التحليل</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-medium">المبلغ</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-medium hidden sm:table-cell">الحالة</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-medium hidden sm:table-cell">التاريخ</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-medium">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredReferrals.map((referral: MedicalReferral) => {
                  const benef = beneficiaries.find((b: Beneficiary) => b.id === referral.beneficiaryId);
                  return (
                  <tr key={referral.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setShowDetailModal(referral)}>
                    <td className="py-3 px-4 font-semibold text-primary-700" dir="ltr">{referral.reference || '—'}</td>
                    <td className="py-3 px-4 font-medium">{referral.beneficiaryNameAr}</td>
                    <td className="py-3 px-4 hidden lg:table-cell font-mono text-xs" dir="ltr">{benef?.nationalCardNumber || '—'}</td>
                    <td className="py-3 px-4 hidden sm:table-cell">{referral.doctorNameAr || (referral.doctor ? `${referral.doctor.lastNameAr} ${referral.doctor.firstNameAr}` : '—')}</td>
                    <td className="py-3 px-4 hidden md:table-cell">{referral.analysisTypeAr || '—'}</td>
                    <td className="py-3 px-4 font-medium">{referral.amount > 0 ? <span className="text-primary-600">{formatCurrency(referral.amount)}</span> : <Badge variant="warning">قيد الانتظار</Badge>}</td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      {(referral.status || 'pending') === 'pending' ? <Badge variant="warning">قيد الانتظار</Badge> :
                       (referral.status || 'pending') === 'completed' ? <Badge variant="success">مكتمل</Badge> :
                       <Badge variant="danger">ملغي</Badge>}
                    </td>
                    <td className="py-3 px-4 text-gray-500 hidden sm:table-cell">{formatDate(referral.date)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); setShowDetailModal(referral); }} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"><Eye className="w-4 h-4" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handlePrint(referral); }} className="p-1.5 text-gray-400 hover:text-success-600 hover:bg-green-50 rounded"><Printer className="w-4 h-4" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(referral.id); }} className="p-1.5 text-gray-400 hover:text-danger-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Referral Modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); resetForm(); }} title="إضافة توجيه طبي" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchableSelect labelAr="المستفيد" value={beneficiaryId} onChange={setBeneficiaryId}
              options={beneficiaries.map((b: Beneficiary) => ({ value: b.id, label: `${b.lastNameAr} ${b.firstNameAr} (${b.reference || ''})` }))} />
            <SearchableSelect labelAr="الصندوق" value={caisseId} onChange={(val) => { setCaisseId(val); setSubCategoryId(''); }}
              options={caisses.map((c: Caisse) => ({ value: c.id, label: c.nameAr }))} />
          </div>
          {selectedBeneficiary && (
            <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs flex gap-3 flex-wrap">
              <span><span className="text-blue-600 font-medium">الصفة: </span><span className="text-gray-700">{ATTRIBUT_LABELS[selectedBeneficiary.attribut] || selectedBeneficiary.attribut}</span></span>
              {selectedBeneficiary.gender && <span><span className="text-blue-600 font-medium">| الجنس: </span><span className="text-gray-700">{selectedBeneficiary.gender === 'female' ? 'أنثى' : 'ذكر'}</span></span>}
              {selectedBeneficiary.nationalCardNumber && <span><span className="text-blue-600 font-medium">| رقم البطاقة: </span><span className="text-gray-700" dir="ltr">{selectedBeneficiary.nationalCardNumber}</span></span>}
            </div>
          )}
          {/* Children selection */}
          {selectedBeneficiary && (selectedBeneficiary.children || []).length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الأطفال المستفيدون (اختياري)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-3 border border-gray-200 rounded-lg bg-gray-50">
                {selectedBeneficiary.children.map((child: any, idx: number) => {
                  const childKey = child.id || `${child.firstNameAr} ${child.lastNameAr}_${idx}`;
                  return (
                    <label key={idx} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors">
                      <input type="checkbox" checked={selectedChildren.includes(childKey)}
                        onChange={() => setSelectedChildren(prev => prev.includes(childKey) ? prev.filter(id => id !== childKey) : [...prev, childKey])}
                        className="w-4 h-4 text-primary-600 rounded" />
                      <span className="text-sm text-gray-800">{child.lastNameAr} {child.firstNameAr}</span>
                      {child.dateOfBirth && <span className="text-xs text-gray-400">({calculateAge(child.dateOfBirth).displayAr})</span>}
                      <span className="text-xs text-gray-400">{child.gender === 'female' ? 'أنثى' : 'ذكر'}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          {(() => {
            const sc = caisses.find((c: Caisse) => c.id === caisseId)
            const subs = sc?.subCategories || []
            if (subs.length === 0) return null
            return <SearchableSelect labelAr="الفئة الفرعية" value={subCategoryId} onChange={setSubCategoryId}
              options={subs.map((s: SubCategory) => ({ value: s.id, label: s.nameAr }))} />
          })()}
          <div className="md:col-span-2">
            <SearchableSelect labelAr="الطبيب" value={doctorId} onChange={setDoctorId}
              options={allDoctors.map((d: any) => ({
                value: d.id,
                label: `${d.lastNameAr} ${d.firstNameAr}${d.specialty ? ' (' + d.specialty.nameAr + ')' : ''} | ${d.phone}${d.address ? ' - ' + d.address : ''}`,
              }))}
              placeholder="اختر طبيباً..." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchableSelect labelAr="نوع التحليل / الفحص" value={analysisTypeAr} onChange={(val) => { const a = analysisTypes.find((x: MedicalAnalysisType) => x.nameAr === val); setAnalysisTypeAr(val); setAnalysisType(a?.name || val); }}
              options={analysisTypes.map((a: MedicalAnalysisType) => ({ value: a.nameAr, label: a.nameAr }))} placeholder="اختر تحليلاً..." />
            <SearchableSelect labelAr="المستشفى / العيادة" value={hospitalAr} onChange={(val) => { const h = hospitals.find((x: MedicalHospital) => x.nameAr === val); setHospitalAr(val); setHospital(h?.name || val); }}
              options={hospitals.map((h: MedicalHospital) => ({ value: h.nameAr, label: h.nameAr }))} placeholder="اختر مستشفى..." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input labelAr="المبلغ (دج) — اختياري" type="number" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} min={0} />
              {amount > 0 && <p className="text-xs text-gray-500 mt-1">{numberToArabicWords(amount)}</p>}
            </div>
            <Input labelAr="التاريخ" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <input
              type="checkbox"
              id="pendingStatus"
              checked={txStatus === 'pending'}
              onChange={(e) => setTxStatus(e.target.checked ? 'pending' : 'completed')}
              className="w-4 h-4 text-amber-500 rounded"
            />
            <label htmlFor="pendingStatus" className="text-sm text-amber-800 cursor-pointer">
              توجيه طبي بدون دفع (سيتم تحديد المبلغ لاحقاً من قبل الطبيب)
            </label>
          </div>
          <TextArea labelAr="ملاحظات" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="secondary" onClick={() => { setShowAddModal(false); resetForm(); }}>إلغاء</Button>
            <Button onClick={handleAddReferral} disabled={!beneficiaryId || !caisseId || !doctorId}>إضافة التوجيه</Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={!!showDetailModal} onClose={() => setShowDetailModal(null)} title="تفاصيل التوجيه الطبي" size="lg">
        {showDetailModal && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center"><span className="text-xs text-gray-500">الرمز المرجعي</span><span className="font-semibold text-primary-700" dir="ltr">{showDetailModal.reference || '—'}</span></div>
              <div className="flex justify-between items-center"><span className="text-xs text-gray-500">المستفيد</span><span className="font-medium text-gray-900">{showDetailModal.beneficiaryNameAr} <span dir="ltr" className="text-xs text-gray-400">({showDetailModal.beneficiaryReference || ''})</span></span></div>
              {(() => {
                const b = beneficiaries.find((b: Beneficiary) => b.id === showDetailModal.beneficiaryId);
                return b?.nationalCardNumber ? <div className="flex justify-between items-center"><span className="text-xs text-gray-500">رقم البطاقة الوطنية</span><span className="font-medium text-gray-900" dir="ltr">{b.nationalCardNumber}</span></div> : null;
              })()}
              <div className="flex justify-between items-center"><span className="text-xs text-gray-500">الطبيب</span><span className="font-medium text-gray-900">{showDetailModal.doctorNameAr || (showDetailModal.doctor ? `${showDetailModal.doctor.lastNameAr} ${showDetailModal.doctor.firstNameAr}` : '')}{showDetailModal.doctor?.specialty?.nameAr ? <span className="text-xs text-gray-400 mr-2">({showDetailModal.doctor.specialty.nameAr})</span> : ''}</span></div>
              {showDetailModal.analysisTypeAr && <div className="flex justify-between items-center"><span className="text-xs text-gray-500">نوع التحليل</span><span className="font-medium text-gray-900">{showDetailModal.analysisTypeAr}</span></div>}
              {showDetailModal.hospitalAr && <div className="flex justify-between items-center"><span className="text-xs text-gray-500">المستشفى</span><span className="font-medium text-gray-900">{showDetailModal.hospitalAr}</span></div>}
              <div className="flex justify-between items-center"><span className="text-xs text-gray-500">التاريخ</span><span className="font-medium text-gray-900">{formatDate(showDetailModal.date)}</span></div>
              {showDetailModal.children && Array.isArray(showDetailModal.children) && showDetailModal.children.length > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">الأطفال المستفيدون</span>
                  <span className="font-medium text-gray-900 text-left">{showDetailModal.children.map((c: any) => c.nameAr || c.name || c.id).join('، ')}</span>
                </div>
              )}
              {showDetailModal.children && Array.isArray(showDetailModal.children) && showDetailModal.children.length > 0 && (
                <div className="border-t border-gray-200 pt-2 mt-1">
                  <p className="text-xs text-gray-500 mb-2">تفاصيل الأطفال المستفيدين:</p>
                  <div className="space-y-1">
                    {showDetailModal.children.map((c: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 text-sm bg-white rounded-lg px-3 py-2 border border-gray-100">
                        <span className="font-medium text-gray-900">{c.nameAr || c.name || c.id}</span>
                        {c.age && <span className="text-xs text-gray-400">العمر: {c.age}</span>}
                        <span className="text-xs text-gray-400">| {c.gender === 'female' ? 'أنثى' : c.gender === 'male' ? 'ذكر' : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center">
              <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                (showDetailModal.status || 'pending') === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                (showDetailModal.status || 'pending') === 'completed' ? 'bg-green-50 text-green-700 border border-green-200' :
                'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {(showDetailModal.status || 'pending') === 'pending' ? '🟡 قيد الانتظار' :
                 (showDetailModal.status || 'pending') === 'completed' ? '🟢 مكتمل' : '🔴 ملغي'}
              </div>
            </div>
            <div className="bg-primary-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-primary-700">{showDetailModal.amount > 0 ? formatCurrency(showDetailModal.amount) : '—'}</p>
              <p className="text-sm text-primary-600 mt-1">{showDetailModal.amount > 0 ? showDetailModal.amountInWordsAr : 'لم يحدد المبلغ بعد'}</p>
            </div>
            {showDetailModal.notes && (
              <div><p className="text-xs text-gray-500">ملاحظات</p><p className="text-sm bg-gray-50 rounded-lg p-3">{showDetailModal.notes}</p></div>
            )}
            <div className="flex justify-end gap-2">
              {(showDetailModal.status || 'pending') === 'pending' && (
                <>
                  <Button size="sm" variant="primary" onClick={() => { setConfirmingId(showDetailModal.id); setConfirmAmount(''); }}>
                    تأكيد التوجيه
                  </Button>
                  <Button size="sm" variant="danger" onClick={async () => {
                    if (confirm('هل أنت متأكد من إلغاء هذا التوجيه الطبي؟')) {
                      try {
                        await api.put(`/medical/referrals/${showDetailModal.id}/cancel`);
                        queryClient.invalidateQueries({ queryKey: ['medical-referrals'] });
                        queryClient.invalidateQueries({ queryKey: ['caisses'] });
                        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                        setShowDetailModal(null);
                      } catch (err: any) {
                        alert(err?.response?.data?.error || 'فشل في إلغاء التوجيه');
                      }
                    }
                  }}>
                    إلغاء
                  </Button>
                </>
              )}
              <Button size="sm" onClick={() => handlePrint(showDetailModal)} variant="success"><Printer className="w-4 h-4" /> طباعة التوجيه</Button>
            </div>
            {/* Confirm modal for entering doctor's amount */}
            <Modal isOpen={confirmingId === showDetailModal.id} onClose={() => setConfirmingId(null)} title="تأكيد التوجيه الطبي" size="sm">
              <div className="space-y-4">
                <p className="text-sm text-gray-600">أدخل المبلغ الذي سجله الطبيب على الوصل:</p>
                <Input labelAr="المبلغ (دج)" type="number" value={confirmAmount} onChange={(e) => setConfirmAmount(e.target.value)} min={0} />
                {Number(confirmAmount) > 0 && <p className="text-xs text-gray-500">{numberToArabicWords(Number(confirmAmount))}</p>}
                <div className="flex gap-2 justify-end">
                  <Button variant="secondary" onClick={() => setConfirmingId(null)}>إلغاء</Button>
                  <Button onClick={async () => {
                    try {
                      await api.put(`/medical/referrals/${showDetailModal.id}/confirm`, { amount: Number(confirmAmount) || 0 });
                      queryClient.invalidateQueries({ queryKey: ['medical-referrals'] });
                      queryClient.invalidateQueries({ queryKey: ['caisses'] });
                      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                      setConfirmingId(null);
                      setShowDetailModal(null);
                    } catch (err: any) {
                      alert(err?.response?.data?.error || 'فشل في تأكيد التوجيه');
                    }
                  }}>تأكيد</Button>
                </div>
              </div>
            </Modal>
          </div>
        )}
      </Modal>
    </>
  )

  const renderSettingsTab = () => {
    if (settingsLoading) return <LoadingSpinner />

    return (
      <div className="space-y-6">
        {/* Analysis Types */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary-600" />
            أنواع التحاليل
          </h3>
          <p className="text-sm text-gray-500 mb-4">إدارة أنواع التحاليل والفحوصات الطبية</p>
          <div className="flex flex-col sm:flex-row gap-3 items-end mb-4">
            <Input labelAr="الاسم بالعربية" value={newAnalysisAr} onChange={(e) => setNewAnalysisAr(e.target.value)} placeholder="مثال: تحليل دم" />
            <Input labelAr="الاسم بالفرنسية" value={newAnalysisFr} onChange={(e) => setNewAnalysisFr(e.target.value)} placeholder="Ex: Analyse" dir="ltr" />
            <Button onClick={handleAddAnalysis} disabled={!newAnalysisAr.trim()}>إضافة</Button>
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-right py-3 px-4 font-medium text-gray-500">بالعربية</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">بالفرنسية</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>{analysisTypes.map((a: MedicalAnalysisType) => (
                  <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                    {editAnalysisId === a.id ? (
                      <>
                        <td className="py-2 px-4"><input value={editAnalysisAr} onChange={(e) => setEditAnalysisAr(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" /></td>
                        <td className="py-2 px-4"><input value={editAnalysisFr} onChange={(e) => setEditAnalysisFr(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" dir="ltr" /></td>
                        <td className="py-2 px-4 text-center flex gap-1 justify-center">
                          <Button size="sm" onClick={handleUpdateAnalysis}>حفظ</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditAnalysisId(null)}>إلغاء</Button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-4 font-medium text-gray-900">{a.nameAr}</td>
                        <td className="py-3 px-4 text-gray-600">{a.name}</td>
                        <td className="py-3 px-4 text-center">
                          <button onClick={() => { setEditAnalysisId(a.id); setEditAnalysisAr(a.nameAr); setEditAnalysisFr(a.name); }} className="p-1.5 text-gray-400 hover:text-primary-600 rounded"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteAnalysis(a.id)} className="p-1.5 text-gray-400 hover:text-danger-500 rounded"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Hospitals */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary-600" />
            المستشفيات
          </h3>
          <p className="text-sm text-gray-500 mb-4">إدارة المستشفيات والعيادات</p>
          <div className="flex flex-col sm:flex-row gap-3 items-end mb-4">
            <Input labelAr="الاسم بالعربية" value={newHospAr} onChange={(e) => setNewHospAr(e.target.value)} placeholder="مثال: مستشفى مصطفى باشا" />
            <Input labelAr="الاسم بالفرنسية" value={newHospFr} onChange={(e) => setNewHospFr(e.target.value)} placeholder="Ex: CHU" dir="ltr" />
            <Button onClick={handleAddHospital} disabled={!newHospAr.trim()}>إضافة</Button>
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-right py-3 px-4 font-medium text-gray-500">بالعربية</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">بالفرنسية</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>{hospitals.map((h: MedicalHospital) => (
                  <tr key={h.id} className="border-b border-gray-100 hover:bg-gray-50">
                    {editHospId === h.id ? (
                      <>
                        <td className="py-2 px-4"><input value={editHospAr} onChange={(e) => setEditHospAr(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" /></td>
                        <td className="py-2 px-4"><input value={editHospFr} onChange={(e) => setEditHospFr(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" dir="ltr" /></td>
                        <td className="py-2 px-4 text-center flex gap-1 justify-center">
                          <Button size="sm" onClick={handleUpdateHospital}>حفظ</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditHospId(null)}>إلغاء</Button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-4 font-medium text-gray-900">{h.nameAr}</td>
                        <td className="py-3 px-4 text-gray-600">{h.name}</td>
                        <td className="py-3 px-4 text-center">
                          <button onClick={() => { setEditHospId(h.id); setEditHospAr(h.nameAr); setEditHospFr(h.name); }} className="p-1.5 text-gray-400 hover:text-primary-600 rounded"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteHospital(h.id)} className="p-1.5 text-gray-400 hover:text-danger-500 rounded"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">التوجيه الطبي</h2>
          <p className="text-sm text-gray-500 mt-1">إدارة التوجيهات الطبية للمستفيدين</p>
        </div>
        {activeTab === 'list' && (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setFilterOpen(!filterOpen)}>
            <Filter className="w-4 h-4" /> بحث متقدم
          </Button>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" /> إضافة توجيه طبي
          </Button>
        </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-2 sm:gap-4">
          <button onClick={() => setActiveTab('list')}
            className={`flex-1 sm:flex-initial pb-3 px-3 sm:px-1 text-sm font-medium border-b-2 transition-colors min-h-[44px] ${
              activeTab === 'list' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}>
            <Stethoscope className="inline-block w-4 h-4 ml-2" />
            التوجيه الطبي
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
  )
}
