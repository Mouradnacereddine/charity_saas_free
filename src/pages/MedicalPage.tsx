import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Input, SearchableSelect, Modal, TextArea, Badge, EmptyState, LoadingSpinner } from '../components/common/UI';
import { formatCurrency, formatDate, numberToArabicWords, numberToWords, calculateAge } from '../utils/helpers';
import { Plus, Search, Eye, Edit, Trash2, Stethoscope, Printer, Filter, Settings } from 'lucide-react';
import type { MedicalReferral, Beneficiary, Caisse, MedicalAnalysisType, MedicalHospital, SubCategory } from '../types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { caissesApi } from '../lib/api';
import { useMedicalReferrals, useCreateMedicalReferral, useDeleteMedicalReferral, useAnalysisTypes, useCreateAnalysisType, useUpdateAnalysisType, useDeleteAnalysisType, useHospitals, useCreateHospital, useUpdateHospital, useDeleteHospital } from '../hooks/useMedical';
import { useBeneficiaries } from '../hooks/useBeneficiaries';
import { api, doctorsApi, financeApi } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

export default function MedicalPage() {
  const { t, i18n } = useTranslation();
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
    veuve: t('beneficiaries.widow'), orphelin: t('beneficiaries.orphan'), personne_agee: t('beneficiaries.elderly'),
    handicape: t('beneficiaries.disabled'), famille_demunie: t('beneficiaries.needyFamily'), autre: t('beneficiaries.other'),
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
    if (!window.confirm(t('medical.confirmDeleteAnalysis'))) return
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
    if (!window.confirm(t('medical.confirmDeleteHospital'))) return
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
      const child = (beneficiary.children || []).find((c: any) => c.id === childId || `${c.firstName} ${c.lastName}` === childId);
      return child ? {
        id: child.id || childId,
        nameAr: `${child.lastName || ''} ${child.firstName || ''}`.trim(),
        name: `${child.firstName || ''} ${child.lastName || ''}`.trim(),
        age: calculateAge(child.dateOfBirth).displayAr,
        gender: child.gender || 'male',
      } : { id: childId, nameAr: childId, name: '', age: '', gender: 'male' };
    });

    try {
      await createMedicalReferral.mutateAsync({
        beneficiaryId,
        beneficiaryName: `${beneficiary.firstName} ${beneficiary.lastName}`,
        beneficiaryNameAr: `${beneficiary.lastName} ${beneficiary.firstName}`,
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
    if (window.confirm(t('medical.confirmDeleteReferral'))) {
      await deleteMedicalReferral.mutateAsync(id);
    }
  };

  const handlePrint = (referral: MedicalReferral) => {
    const caisse = caisses.find((c: Caisse) => c.id === referral.caisseId)
    const subCat = caisse?.subCategories.find((s: SubCategory) => s.id === referral.subCategoryId)
    const caisseRow = caisse ? `<span class="lbl">${t('medical.caisse')}</span><span class="val">${caisse.nameAr}</span>` : ''
    const subCatRow = subCat ? `<span class="lbl">${t('medical.subCategory')}</span><span class="val">${subCat.nameAr}</span>` : ''

    const childrenHtml = referral.children && Array.isArray(referral.children) && referral.children.length > 0
      ? referral.children.map((c: any) => {
          const nameAr = c.nameAr || `${c.lastName || ''} ${c.firstName || ''}`.trim() || '—'
          let ageDisplay = ''
          try {
            if (c.dateOfBirth) {
              const age = calculateAge(c.dateOfBirth)
              ageDisplay = age?.displayAr || ''
            } else if (c.age) {
              ageDisplay = `${c.age} ${t('receipt.age')}`
            }
          } catch { ageDisplay = '' }
          const gender = c.gender === 'female' ? t('common.female') : c.gender === 'male' ? t('common.male') : ''
          return `<div class="child-item"><span class="child-name">${nameAr}</span>${ageDisplay ? ` — ${ageDisplay}` : ''}${gender ? ` — ${gender}` : ''}</div>`
        }).join('')
      : ''

    const fullBeneficiary = beneficiaries.find((b: Beneficiary) => b.id === referral.beneficiaryId)
    const ageDisplay = fullBeneficiary ? calculateAge(fullBeneficiary.dateOfBirth).displayAr : ''
    const genderDisplay = fullBeneficiary?.gender === 'female' ? t('common.female') : fullBeneficiary?.gender === 'male' ? t('common.male') : ''

    const isLtr = i18n.language !== 'ar';
    const MEDICAL_CSS = `
      @page { size: 148mm 210mm; margin: 15mm 12mm 10mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Segoe UI', Tahoma, sans-serif; direction: ${isLtr ? 'ltr' : 'rtl'}; font-size: 10px; background: #fff; padding: 0; max-width: 124mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
      .notice { font-size: 7px; color: #666; text-align: center; margin-top: 8px; line-height: 1.6; }
    `

    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`
<!DOCTYPE html><html dir="${isLtr ? 'ltr' : 'rtl'}" lang="${i18n.language}"><head><meta charset="UTF-8"><title></title><style>${MEDICAL_CSS}</style>
</head>
<body>
  <div class="header">
    <span class="assoc">🕌 ${association?.nameAr || t('app.title')}</span>
    <span class="title">${t('medical.title')}</span>
  </div>
  <div class="info-grid">
    <div class="info-item"><span class="lbl">${t('doctors.refCode')}</span><span class="val">${referral.reference || '—'}</span></div>
    <div class="info-item"><span class="lbl">${t('common.date')}</span><span class="val">${formatDate(referral.date)}</span></div>
    <div class="info-item"><span class="lbl">${t('medical.beneficiary')}</span><span class="val">${referral.beneficiaryName}</span></div>
    <div class="info-item"><span class="lbl">${t('medical.beneficiaryRef')}</span><span class="val">${referral.beneficiaryReference || '—'}</span></div>
    ${fullBeneficiary?.nationalCardNumber ? `<div class="info-item"><span class="lbl">${t('receipt.idNumber')}</span><span class="val">${fullBeneficiary.nationalCardNumber}</span></div>` : ''}
    ${ageDisplay ? `<div class="info-item"><span class="lbl">${t('receipt.age')} / ${t('receipt.gender')}</span><span class="val">${ageDisplay} — ${genderDisplay}</span></div>` : ''}
    <div class="info-item"><span class="lbl">${t('medical.doctor')}</span><span class="val">${referral.doctorName || (referral.doctor ? referral.doctor.lastName + ' ' + referral.doctor.firstName : '')}${referral.doctor?.specialty?.nameAr ? ` (${referral.doctor.specialty.nameAr})` : ''}</span></div>
    ${referral.doctor?.address ? `<div class="info-item"><span class="lbl">${t('medical.doctorAddress')}</span><span class="val">${referral.doctor.address}</span></div>` : ''}
    ${referral.analysisType ? `<div class="info-item"><span class="lbl">${t('medical.analysisType')}</span><span class="val">${referral.analysisType}</span></div>` : ''}
    ${referral.hospital ? `<div class="info-item"><span class="lbl">${t('medical.hospital')}</span><span class="val">${referral.hospital}</span></div>` : ''}
    ${caisseRow ? `<div class="info-item">${caisseRow}</div>` : ''}
    ${subCatRow ? `<div class="info-item">${subCatRow}</div>` : ''}
  </div>
  ${childrenHtml ? `<div class="section-title">${t('medical.childrenReferral')}</div><div class="children-grid">${childrenHtml}</div>` : ''}
  ${referral.notes ? `<div class="section-title">${t('common.notes')}</div><div class="info-item" style="width:100%"><span class="val">${referral.notes}</span></div>` : ''}
  ${referral.amount > 0
    ? `<div class="amt"><div class="num">${formatCurrency(referral.amount)}</div><div class="words">${referral.amountInWords && !referral.amountInWords.match(/^\d/) ? referral.amountInWords : numberToArabicWords(referral.amount)}</div></div>`
    : `<div class="amt" style="background:#fef9e7"><div class="words" style="font-size:9px;color:#b8860b;font-weight:600">${t('medical.pendingAmount')}</div></div>`
  }
  <div class="sign-section">
    <div class="sign-row">
      <div class="sign-box"><span class="label">${t('medical.presidentSignature')}</span><div class="line"></div></div>
      <div class="sign-box"><span class="label">${t('medical.assocStamp')}</span><div class="line"></div></div>
    </div>
  </div>
  <div class="notice">${t('medical.notice')}</div>
  <script>window.print();window.close();</script>
</body></html>
`)
    w.document.close()
  };

  const appliedTerm = committedSearchTerm.toLowerCase();
  const filteredReferrals = referrals.filter((r: MedicalReferral) => {
    if (appliedTerm && !(
      (r.beneficiaryName || '').includes(appliedTerm) ||
      (r.beneficiaryName || '').toLowerCase().includes(appliedTerm) ||
      (r.doctorName || (r.doctor ? `${r.doctor.lastName} ${r.doctor.firstName}` : '')).includes(appliedTerm) ||
      (r.doctorName || (r.doctor ? `${r.doctor.firstName} ${r.doctor.lastName}` : '')).toLowerCase().includes(appliedTerm) ||
      (r.analysisType || '').includes(appliedTerm) ||
      (r.hospital || '').includes(appliedTerm) ||
      (r.reference || '').toLowerCase().includes(appliedTerm)
    )) return false;

    if (committedCaisseId && r.caisseId !== committedCaisseId) return false;

    if (committedMinAmount && r.amount < Number(committedMinAmount)) return false;
    if (committedMaxAmount && r.amount > Number(committedMaxAmount)) return false;

    if (committedDateFrom && r.date < committedDateFrom) return false;
    if (committedDateTo && r.date > committedDateTo) return false;

    const docNameAr = r.doctorName || (r.doctor ? `${r.doctor.lastName} ${r.doctor.firstName}` : '');
    if (committedDoctor && !docNameAr.includes(committedDoctor)) return false;

    if (committedAnalysis && !(r.analysisType?.includes(committedAnalysis))) return false;
    if (committedStatus && (r.status || 'pending') !== committedStatus) return false;

    const docSpecialtyAr = r.doctor?.specialty?.nameAr || '';
    if (committedSpecialty && !docSpecialtyAr.includes(committedSpecialty)) return false;

    return true;
  });
  const renderListTab = () => (
    <>
      {/* Quick Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
        <input
          type="text"
          placeholder={t('medical.searchPlaceholder')}
          className="w-full pr-10 pl-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
          value={filterSearchTerm}
          onChange={(e) => setFilterSearchTerm(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
        />
      </div>

      {/* Advanced Filters */}
      {filterOpen && (
        <Card titleAr={t('beneficiaries.advancedSearch')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <SearchableSelect
                labelAr={t('dashboard.fund')}
                value={filterCaisseId}
                onChange={setFilterCaisseId}
                options={caisses.map((c: Caisse) => ({
                  value: c.id,
                  label: c.nameAr,
                }))}
              />
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{t('medical.amountFrom')}</label>
                <input
                  type="number" min="0" placeholder="0"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={filterMinAmount} onChange={(e) => setFilterMinAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{t('medical.amountTo')}</label>
                <input
                  type="number" min="0" placeholder="0"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={filterMaxAmount} onChange={(e) => setFilterMaxAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{t('analytics.fromDate')}</label>
                <input type="date"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{t('analytics.toDate')}</label>
                <input type="date"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
                />
              </div>
              <SearchableSelect
                labelAr={t('medical.doctorName')}
                value={filterDoctor}
                onChange={setFilterDoctor}
                options={allDoctors.map((d: any) => ({
                  value: `${d.lastName} ${d.firstName}`,
                  label: `${d.lastName} ${d.firstName}${d.specialty ? ' (' + d.specialty.nameAr + ')' : ''}`,
                }))}
                placeholder={t('doctors.specialtyPlaceholder')}
              />
              <SearchableSelect
                labelAr={t('medical.analysisType')}
                value={filterAnalysis}
                onChange={setFilterAnalysis}
                options={analysisTypes.map((a: any) => ({
                  value: a.nameAr,
                  label: a.nameAr,
                }))}
                placeholder={t('doctors.specialtyPlaceholder')}
              />
              <SearchableSelect
                labelAr={t('doctors.specialty')}
                value={filterSpecialty}
                onChange={setFilterSpecialty}
                options={specialties.map((s: any) => ({
                  value: s.nameAr,
                  label: s.nameAr,
                }))}
                placeholder={t('doctors.specialtyPlaceholder')}
              />
              <SearchableSelect
                labelAr={t('common.status')}
                options={[
                  { value: '', label: t('common.all') },
                  { value: 'pending', label: t('dashboard.pending') },
                  { value: 'completed', label: t('dashboard.completed') },
                  { value: 'cancelled', label: t('dashboard.cancelled') },
                ]}
                value={filterStatus}
                onChange={setFilterStatus}
              />
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={applyFilters}>
              <Search className="w-4 h-4" /> {t('common.search')}
            </Button>
            <Button size="sm" variant="secondary" onClick={resetFilters}>
              {t('doctors.reset')}
            </Button>
          </div>
        </Card>
      )}

      {/* Referrals Table */}
      {filteredReferrals.length === 0 ? (
        <EmptyState message={t('medical.noReferrals')} icon={<Stethoscope className="w-12 h-12" />} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-start py-3 px-4 text-muted-foreground font-medium">{t('doctors.refCode')}</th>
                  <th className="text-start py-3 px-4 text-muted-foreground font-medium">{t('medical.beneficiary')}</th>
                  <th className="text-start py-3 px-4 text-muted-foreground font-medium hidden lg:table-cell">{t('receipt.idNumber')}</th>
                  <th className="text-start py-3 px-4 text-muted-foreground font-medium hidden sm:table-cell">{t('medical.doctor')}</th>
                  <th className="text-start py-3 px-4 text-muted-foreground font-medium hidden md:table-cell">{t('medical.analysisType')}</th>
                  <th className="text-start py-3 px-4 text-muted-foreground font-medium">{t('common.amount')}</th>
                  <th className="text-start py-3 px-4 text-muted-foreground font-medium hidden sm:table-cell">{t('common.status')}</th>
                  <th className="text-start py-3 px-4 text-muted-foreground font-medium hidden sm:table-cell">{t('common.date')}</th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredReferrals.map((referral: MedicalReferral) => {
                  const benef = beneficiaries.find((b: Beneficiary) => b.id === referral.beneficiaryId);
                  return (
                  <tr key={referral.id} className="border-b border-border hover:bg-muted transition-colors cursor-pointer" onClick={() => setShowDetailModal(referral)}>
                    <td className="py-3 px-4 font-semibold text-primary" dir="ltr">{referral.reference || '—'}</td>
                    <td className="py-3 px-4 font-medium">{referral.beneficiaryName}</td>
                    <td className="py-3 px-4 hidden lg:table-cell font-mono text-xs" dir="ltr">{benef?.nationalCardNumber || '—'}</td>
                    <td className="py-3 px-4 hidden sm:table-cell">{referral.doctorName || (referral.doctor ? `${referral.doctor.lastName} ${referral.doctor.firstName}` : '—')}</td>
                    <td className="py-3 px-4 hidden md:table-cell">{referral.analysisType || '—'}</td>
                    <td className="py-3 px-4 font-medium">{referral.amount > 0 ? <span className="text-primary">{formatCurrency(referral.amount)}</span> : <Badge variant="warning">{t('medical.pendingAmountLabel')}</Badge>}</td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      {(referral.status || 'pending') === 'pending' ? <Badge variant="warning">{t('dashboard.pending')}</Badge> :
                       (referral.status || 'pending') === 'completed' ? <Badge variant="success">{t('dashboard.completed')}</Badge> :
                       <Badge variant="danger">{t('dashboard.cancelled')}</Badge>}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">{formatDate(referral.date)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); setShowDetailModal(referral); }} className="p-1.5 text-muted-foreground/70 hover:text-primary hover:bg-primary/10 rounded"><Eye className="w-4 h-4" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handlePrint(referral); }} className="p-1.5 text-muted-foreground/70 hover:text-success-600 hover:bg-success/10 rounded"><Printer className="w-4 h-4" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(referral.id); }} className="p-1.5 text-muted-foreground/70 hover:text-danger-500 hover:bg-destructive/10 rounded"><Trash2 className="w-4 h-4" /></button>
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
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); resetForm(); }} title={t('medical.addReferral')} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchableSelect labelAr={t('medical.beneficiary')} value={beneficiaryId} onChange={setBeneficiaryId}
              options={beneficiaries.map((b: Beneficiary) => ({ value: b.id, label: `${b.lastName} ${b.firstName} (${b.reference || ''})` }))} />
            <SearchableSelect labelAr={t('dashboard.fund')} value={caisseId} onChange={(val) => { setCaisseId(val); setSubCategoryId(''); }}
              options={caisses.map((c: Caisse) => ({ value: c.id, label: c.nameAr }))} />
          </div>
          {selectedBeneficiary && (
            <div className="px-3 py-2 bg-accent border border-accent/30 rounded-lg text-xs flex gap-3 flex-wrap">
              <span><span className="text-accent-foreground font-medium">{t('receipt.attribute')}: </span><span className="text-foreground">{ATTRIBUT_LABELS[selectedBeneficiary.attribut] || selectedBeneficiary.attribut}</span></span>
              {selectedBeneficiary.gender && <span><span className="text-accent-foreground font-medium">| {t('receipt.gender')}: </span><span className="text-foreground">{selectedBeneficiary.gender === 'female' ? t('common.female') : t('common.male')}</span></span>}
              {selectedBeneficiary.nationalCardNumber && <span><span className="text-accent-foreground font-medium">| {t('receipt.idNumber')}: </span><span className="text-foreground" dir="ltr">{selectedBeneficiary.nationalCardNumber}</span></span>}
            </div>
          )}
          {/* Children selection */}
          {selectedBeneficiary && (selectedBeneficiary.children || []).length > 0 && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">{t('medical.childrenReferralDesc')}</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-3 border border-border rounded-lg bg-muted">
                {selectedBeneficiary.children.map((child: any, idx: number) => {
                  const childKey = child.id || `${child.firstName} ${child.lastName}_${idx}`;
                  return (
                    <label key={idx} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors">
                      <input type="checkbox" checked={selectedChildren.includes(childKey)}
                        onChange={() => setSelectedChildren(prev => prev.includes(childKey) ? prev.filter(id => id !== childKey) : [...prev, childKey])}
                        className="w-4 h-4 text-primary rounded" />
                      <span className="text-sm text-foreground">{child.lastName} {child.firstName}</span>
                      {child.dateOfBirth && <span className="text-xs text-muted-foreground/70">({calculateAge(child.dateOfBirth).displayAr})</span>}
                      <span className="text-xs text-muted-foreground/70">{child.gender === 'female' ? t('common.female') : t('common.male')}</span>
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
            return <SearchableSelect labelAr={t('medical.subCategory')} value={subCategoryId} onChange={setSubCategoryId}
              options={subs.map((s: SubCategory) => ({ value: s.id, label: s.nameAr }))} />
          })()}
          <div className="md:col-span-2">
            <SearchableSelect labelAr={t('medical.doctor')} value={doctorId} onChange={setDoctorId}
              options={allDoctors.map((d: any) => ({
                value: d.id,
                label: `${d.lastName} ${d.firstName}${d.specialty ? ' (' + d.specialty.nameAr + ')' : ''} | ${d.phone}${d.address ? ' - ' + d.address : ''}`,
              }))}
              placeholder={t('doctors.specialtyPlaceholder')} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchableSelect labelAr={t('medical.analysisType')} value={analysisTypeAr} onChange={(val) => { const a = analysisTypes.find((x: MedicalAnalysisType) => x.nameAr === val); setAnalysisTypeAr(val); setAnalysisType(a?.name || val); }}
              options={analysisTypes.map((a: MedicalAnalysisType) => ({ value: a.nameAr, label: a.nameAr }))} placeholder={t('doctors.specialtyPlaceholder')} />
            <SearchableSelect labelAr={t('medical.hospital')} value={hospitalAr} onChange={(val) => { const h = hospitals.find((x: MedicalHospital) => x.nameAr === val); setHospitalAr(val); setHospital(h?.name || val); }}
              options={hospitals.map((h: MedicalHospital) => ({ value: h.nameAr, label: h.nameAr }))} placeholder={t('doctors.specialtyPlaceholder')} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input labelAr={t('medical.amountOptional')} type="number" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} min={0} />
              {amount > 0 && <p className="text-xs text-muted-foreground mt-1">{numberToWords(amount)}</p>}
            </div>
            <Input labelAr={t('common.date')} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex items-center gap-3 p-3 bg-warning/10 border border-warning/30 rounded-lg">
            <input
              type="checkbox"
              id="pendingStatus"
              checked={txStatus === 'pending'}
              onChange={(e) => setTxStatus(e.target.checked ? 'pending' : 'completed')}
              className="w-4 h-4 text-warning-foreground rounded"
            />
            <label htmlFor="pendingStatus" className="text-sm text-warning-foreground cursor-pointer">
              {t('medical.noPaymentCheck')}
            </label>
          </div>
          <TextArea labelAr={t('common.notes')} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="secondary" onClick={() => { setShowAddModal(false); resetForm(); }}>{t('common.cancel')}</Button>
            <Button onClick={handleAddReferral} disabled={!beneficiaryId || !caisseId || !doctorId}>{t('medical.addReferral')}</Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={!!showDetailModal} onClose={() => setShowDetailModal(null)} title={t('medical.referralDetails')} size="lg">
        {showDetailModal && (
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center"><span className="text-xs text-muted-foreground">{t('medical.referenceLabel')}</span><span className="font-semibold text-primary" dir="ltr">{showDetailModal.reference || '—'}</span></div>
              <div className="flex justify-between items-center"><span className="text-xs text-muted-foreground">{t('medical.beneficiaryLabel')}</span><span className="font-medium text-foreground">{showDetailModal.beneficiaryName} <span dir="ltr" className="text-xs text-muted-foreground/70">({showDetailModal.beneficiaryReference || ''})</span></span></div>
              {(() => {
                const b = beneficiaries.find((b: Beneficiary) => b.id === showDetailModal.beneficiaryId);
                return b?.nationalCardNumber ? <div className="flex justify-between items-center"><span className="text-xs text-muted-foreground">{t('medical.nationalCardLabel')}</span><span className="font-medium text-foreground" dir="ltr">{b.nationalCardNumber}</span></div> : null;
              })()}
              <div className="flex justify-between items-center"><span className="text-xs text-muted-foreground">{t('medical.doctor')}</span><span className="font-medium text-foreground">{showDetailModal.doctorName || (showDetailModal.doctor ? `${showDetailModal.doctor.lastName} ${showDetailModal.doctor.firstName}` : '')}{showDetailModal.doctor?.specialty?.nameAr ? <span className="text-xs text-muted-foreground/70 mr-2">({showDetailModal.doctor.specialty.nameAr})</span> : ''}</span></div>
              {showDetailModal.analysisType && <div className="flex justify-between items-center"><span className="text-xs text-muted-foreground">{t('medical.analysisType')}</span><span className="font-medium text-foreground">{showDetailModal.analysisType}</span></div>}
              {showDetailModal.hospital && <div className="flex justify-between items-center"><span className="text-xs text-muted-foreground">{t('medical.hospital')}</span><span className="font-medium text-foreground">{showDetailModal.hospital}</span></div>}
              <div className="flex justify-between items-center"><span className="text-xs text-muted-foreground">{t('common.date')}</span><span className="font-medium text-foreground">{formatDate(showDetailModal.date)}</span></div>
              {showDetailModal.children && Array.isArray(showDetailModal.children) && showDetailModal.children.length > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{t('medical.referralChildrenLabel')}</span>
                  <span className="font-medium text-foreground text-left">{showDetailModal.children.map((c: any) => c.nameAr || c.name || c.id).join('، ')}</span>
                </div>
              )}
              {showDetailModal.children && Array.isArray(showDetailModal.children) && showDetailModal.children.length > 0 && (
                <div className="border-t border-border pt-2 mt-1">
                  <p className="text-xs text-muted-foreground mb-2">{t('medical.childrenReferral')}:</p>
                  <div className="space-y-1">
                    {showDetailModal.children.map((c: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 text-sm bg-white rounded-lg px-3 py-2 border border-border">
                        <span className="font-medium text-foreground">{c.nameAr || c.name || c.id}</span>
                        {c.age && <span className="text-xs text-muted-foreground/70">{t('receipt.age')}: {c.age}</span>}
                        <span className="text-xs text-muted-foreground/70">| {c.gender === 'female' ? t('common.female') : t('common.male')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center">
              <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                (showDetailModal.status || 'pending') === 'pending' ? 'bg-warning/10 text-warning-foreground border border-warning/30' :
                (showDetailModal.status || 'pending') === 'completed' ? 'bg-success/10 text-success-foreground border border-success/30' :
                'bg-destructive/10 text-destructive border border-destructive/30'
              }`}>
                {(showDetailModal.status || 'pending') === 'pending' ? `🟡 ${t('dashboard.pending')}` :
                 (showDetailModal.status || 'pending') === 'completed' ? `🟢 ${t('dashboard.completed')}` : `🔴 ${t('dashboard.cancelled')}`}
              </div>
            </div>
            <div className="bg-primary/10 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-primary">{showDetailModal.amount > 0 ? formatCurrency(showDetailModal.amount) : '—'}</p>
              <p className="text-sm text-primary mt-1">{showDetailModal.amount > 0 ? numberToWords(showDetailModal.amount) : t('medical.pendingAmountLabel')}</p>
            </div>
            {showDetailModal.notes && (
              <div><p className="text-xs text-muted-foreground">{t('common.notes')}</p><p className="text-sm bg-muted rounded-lg p-3">{showDetailModal.notes}</p></div>
            )}
            <div className="flex justify-end gap-2">
              {(showDetailModal.status || 'pending') === 'pending' && (
                <>
                  <Button size="sm" variant="primary" onClick={() => { setConfirmingId(showDetailModal.id); setConfirmAmount(''); }}>
                    {t('medical.confirmReferral')}
                  </Button>
                  <Button size="sm" variant="danger" onClick={async () => {
                    if (window.confirm(t('medical.confirmCancelReferral'))) {
                      try {
                        await api.put(`/medical/referrals/${showDetailModal.id}/cancel`);
                        queryClient.invalidateQueries({ queryKey: ['medical-referrals'] });
                        queryClient.invalidateQueries({ queryKey: ['caisses'] });
                        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                        setShowDetailModal(null);
                      } catch (err: any) {
                        alert(err?.response?.data?.error || t('common.error'));
                      }
                    }
                  }}>
                    {t('common.cancel')}
                  </Button>
                </>
              )}
              <Button size="sm" onClick={() => handlePrint(showDetailModal)} variant="success"><Printer className="w-4 h-4" /> {t('medical.printReferral')}</Button>
            </div>
            {/* Confirm modal for entering doctor's amount */}
            <Modal isOpen={confirmingId === showDetailModal.id} onClose={() => setConfirmingId(null)} title={t('medical.confirmReferral')} size="sm">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{t('medical.confirmAmount')}</p>
                <Input labelAr={t('common.amount')} type="number" value={confirmAmount} onChange={(e) => setConfirmAmount(e.target.value)} min={0} />
                {Number(confirmAmount) > 0 && <p className="text-xs text-muted-foreground">{numberToWords(Number(confirmAmount))}</p>}
                <div className="flex gap-2 justify-end">
                  <Button variant="secondary" onClick={() => setConfirmingId(null)}>{t('common.cancel')}</Button>
                  <Button onClick={async () => {
                    try {
                      await api.put(`/medical/referrals/${showDetailModal.id}/confirm`, { amount: Number(confirmAmount) || 0 });
                      queryClient.invalidateQueries({ queryKey: ['medical-referrals'] });
                      queryClient.invalidateQueries({ queryKey: ['caisses'] });
                      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                      setConfirmingId(null);
                      setShowDetailModal(null);
                    } catch (err: any) {
                      alert(err?.response?.data?.error || t('common.error'));
                    }
                  }}>{t('common.confirm')}</Button>
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
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary" />
            {t('medical.analysisTypes')}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">{t('medical.manageAnalysis')}</p>
          <div className="flex flex-col sm:flex-row gap-3 items-end mb-4">
            <Input labelAr={t('medical.nameAr')} value={newAnalysisAr} onChange={(e) => setNewAnalysisAr(e.target.value)} placeholder={t('medical.analysisPlaceholder')} />
            <Input labelAr={t('medical.nameLatin')} value={newAnalysisFr} onChange={(e) => setNewAnalysisFr(e.target.value)} placeholder={t('medical.analysisPlaceholder')} dir="ltr" />
            <Button onClick={handleAddAnalysis} disabled={!newAnalysisAr.trim()}>{t('common.add')}</Button>
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('medical.tableArabic')}</th>
                    <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('medical.tableLatin')}</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">{t('medical.tableActions')}</th>
                  </tr>
                </thead>
                <tbody>{analysisTypes.map((a: MedicalAnalysisType) => (
                  <tr key={a.id} className="border-b border-border hover:bg-muted">
                    {editAnalysisId === a.id ? (
                      <>
                        <td className="py-2 px-4"><input value={editAnalysisAr} onChange={(e) => setEditAnalysisAr(e.target.value)} className="w-full border border-border rounded px-2 py-1 text-sm" /></td>
                        <td className="py-2 px-4"><input value={editAnalysisFr} onChange={(e) => setEditAnalysisFr(e.target.value)} className="w-full border border-border rounded px-2 py-1 text-sm" dir="ltr" /></td>
                        <td className="py-2 px-4 text-center flex gap-1 justify-center">
                          <Button size="sm" onClick={handleUpdateAnalysis}>{t('common.save')}</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditAnalysisId(null)}>{t('common.cancel')}</Button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-4 font-medium text-foreground">{a.nameAr}</td>
                        <td className="py-3 px-4 text-muted-foreground">{a.name}</td>
                        <td className="py-3 px-4 text-center">
                          <button onClick={() => { setEditAnalysisId(a.id); setEditAnalysisAr(a.nameAr); setEditAnalysisFr(a.name); }} className="p-1.5 text-muted-foreground/70 hover:text-primary rounded"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteAnalysis(a.id)} className="p-1.5 text-muted-foreground/70 hover:text-danger-500 rounded"><Trash2 className="w-4 h-4" /></button>
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
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            {t('medical.hospitals')}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">{t('medical.manageHospitals')}</p>
          <div className="flex flex-col sm:flex-row gap-3 items-end mb-4">
            <Input labelAr={t('medical.nameAr')} value={newHospAr} onChange={(e) => setNewHospAr(e.target.value)} placeholder={t('medical.hospitalPlaceholder')} />
            <Input labelAr={t('medical.nameLatin')} value={newHospFr} onChange={(e) => setNewHospFr(e.target.value)} placeholder={t('medical.hospitalPlaceholder')} dir="ltr" />
            <Button onClick={handleAddHospital} disabled={!newHospAr.trim()}>{t('common.add')}</Button>
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('medical.tableArabic')}</th>
                    <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('medical.tableLatin')}</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">{t('medical.tableActions')}</th>
                  </tr>
                </thead>
                <tbody>{hospitals.map((h: MedicalHospital) => (
                  <tr key={h.id} className="border-b border-border hover:bg-muted">
                    {editHospId === h.id ? (
                      <>
                        <td className="py-2 px-4"><input value={editHospAr} onChange={(e) => setEditHospAr(e.target.value)} className="w-full border border-border rounded px-2 py-1 text-sm" /></td>
                        <td className="py-2 px-4"><input value={editHospFr} onChange={(e) => setEditHospFr(e.target.value)} className="w-full border border-border rounded px-2 py-1 text-sm" dir="ltr" /></td>
                        <td className="py-2 px-4 text-center flex gap-1 justify-center">
                          <Button size="sm" onClick={handleUpdateHospital}>{t('common.save')}</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditHospId(null)}>{t('common.cancel')}</Button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-4 font-medium text-foreground">{h.nameAr}</td>
                        <td className="py-3 px-4 text-muted-foreground">{h.name}</td>
                        <td className="py-3 px-4 text-center">
                          <button onClick={() => { setEditHospId(h.id); setEditHospAr(h.nameAr); setEditHospFr(h.name); }} className="p-1.5 text-muted-foreground/70 hover:text-primary rounded"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteHospital(h.id)} className="p-1.5 text-muted-foreground/70 hover:text-danger-500 rounded"><Trash2 className="w-4 h-4" /></button>
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
          <h2 className="text-2xl font-bold text-foreground">{t('medical.title')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('medical.subtitle')}</p>
        </div>
        {activeTab === 'list' && (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setFilterOpen(!filterOpen)}>
            <Filter className="w-4 h-4" /> {t('beneficiaries.advancedSearch')}
          </Button>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" /> {t('medical.addReferral')}
          </Button>
        </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-2 sm:gap-4">
          <button onClick={() => setActiveTab('list')}
            className={`flex-1 sm:flex-initial pb-3 px-3 sm:px-1 text-sm font-medium border-b-2 transition-colors min-h-[44px] ${
              activeTab === 'list' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}>
            <Stethoscope className="inline-block w-4 h-4 ml-2" />
            {t('medical.tabReferrals')}
          </button>
          <button onClick={() => setActiveTab('settings')}
            className={`flex-1 sm:flex-initial pb-3 px-3 sm:px-1 text-sm font-medium border-b-2 transition-colors min-h-[44px] ${
              activeTab === 'settings' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}>
            <Settings className="inline-block w-4 h-4 ml-2" />
            {t('medical.tabSettings')}
          </button>
        </nav>
      </div>

      {activeTab === 'list' ? renderListTab() : renderSettingsTab()}
    </div>
  )
}
