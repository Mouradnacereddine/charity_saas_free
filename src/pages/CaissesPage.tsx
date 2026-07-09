import { useEffect, useState } from 'react';
import { Card, Button, Input, Modal, EmptyState, LoadingSpinner } from '../components/common/UI';
import { useCaisseStore } from '../stores/caisseStore';
import { formatCurrency } from '../utils/helpers';
import { Plus, Edit, Trash2, FolderOpen, Tag } from 'lucide-react';
import type { Caisse, SubCategory } from '../types';

const generateCaisseReference = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth()+1).padStart(2,'0');
  const r = String(Math.floor(Math.random()*10000)).padStart(4,'0');
  return `CAI-${y}${m}-${r}`;
};

export default function CaissesPage() {
  const { caisses, loading, loadCaisses, addCaisse, updateCaisse, deleteCaisse, addSubCategory, updateSubCategory, deleteSubCategory } = useCaisseStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editCaisse, setEditCaisse] = useState<Caisse | null>(null);
  const [showSubCatModal, setShowSubCatModal] = useState<string | null>(null);
  const [editSubCat, setEditSubCat] = useState<{ caisseId: string; subCat: SubCategory } | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [subName, setSubName] = useState('');
  const [subNameAr, setSubNameAr] = useState('');

  useEffect(() => {
    loadCaisses();
  }, []);

  const handleAddCaisse = async () => {
    if (!nameAr.trim()) return;
    await addCaisse(name || nameAr, nameAr, generateCaisseReference());
    setName('');
    setNameAr('');
    setShowAddModal(false);
  };

  const handleUpdateCaisse = async () => {
    if (!editCaisse || !nameAr.trim()) return;
    await updateCaisse(editCaisse.id, { name: name || nameAr, nameAr });
    setName('');
    setNameAr('');
    setEditCaisse(null);
  };

  const handleDeleteCaisse = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الصندوق؟')) {
      await deleteCaisse(id);
    }
  };

  const handleAddSubCategory = async () => {
    if (!showSubCatModal || !subNameAr.trim()) return;
    await addSubCategory(showSubCatModal, subName || subNameAr, subNameAr);
    setSubName('');
    setSubNameAr('');
    setShowSubCatModal(null);
  };

  const handleUpdateSubCategory = async () => {
    if (!editSubCat || !subNameAr.trim()) return;
    await updateSubCategory(editSubCat.caisseId, editSubCat.subCat.id, subName || subNameAr, subNameAr);
    setSubName('');
    setSubNameAr('');
    setEditSubCat(null);
  };

  const handleDeleteSubCategory = async (caisseId: string, subCatId: string) => {
    if (confirm('هل أنت متأكد من حذف هذه الفئة الفرعية؟')) {
      await deleteSubCategory(caisseId, subCatId);
    }
  };

  const openEditCaisse = (caisse: Caisse) => {
    setName(caisse.name);
    setNameAr(caisse.nameAr);
    setEditCaisse(caisse);
  };

  const openEditSubCat = (caisseId: string, subCat: SubCategory) => {
    setSubName(subCat.name);
    setSubNameAr(subCat.nameAr);
    setEditSubCat({ caisseId, subCat });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">إدارة الصناديق</h2>
          <p className="text-sm text-gray-500 mt-1">إنشاء وتعديل وحذف الصناديق والفئات الفرعية</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" />
          إضافة صندوق
        </Button>
      </div>

      {/* Caisses Grid */}
      {caisses.length === 0 ? (
        <EmptyState message="لا توجد صناديق بعد" icon={<FolderOpen className="w-12 h-12" />} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {caisses.map((caisse) => (
            <Card key={caisse.id} className="relative">
              {/* Caisse Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{caisse.nameAr}</h3>
                      <span className="text-xs text-primary-500 font-mono" dir="ltr">{caisse.reference || '—'}</span>
                    </div>
                    <p className="text-xs text-gray-500">{caisse.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditCaisse(caisse)}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCaisse(caisse.id)}
                    className="p-1.5 text-gray-400 hover:text-danger-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Balance */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-500 mb-1">الرصيد</p>
                <p className={`text-lg font-bold ${caisse.balance >= 0 ? 'text-success-600' : 'text-danger-500'}`}>
                  {formatCurrency(caisse.balance)}
                </p>
              </div>

              {/* Sub-categories */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">الفئات الفرعية</p>
                  <button
                    onClick={() => setShowSubCatModal(caisse.id)}
                    className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    إضافة
                  </button>
                </div>
                {caisse.subCategories.length === 0 ? (
                  <p className="text-xs text-gray-400">لا توجد فئات فرعية</p>
                ) : (
                  <div className="space-y-1.5">
                    {caisse.subCategories.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <Tag className="w-3 h-3 text-gray-400" />
                          <span className="text-sm text-gray-700">{sub.nameAr}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditSubCat(caisse.id, sub)}
                            className="p-1 text-gray-400 hover:text-primary-600"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteSubCategory(caisse.id, sub.id)}
                            className="p-1 text-gray-400 hover:text-danger-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Caisse Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setName(''); setNameAr(''); }}
        title="إضافة صندوق جديد"
      >
        <div className="space-y-4">
          <Input
            labelAr="اسم الصندوق بالعربية"
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            placeholder="مثال: صندوق الزكاة"
          />
          <Input
            labelAr="اسم الصندوق بالفرنسية (اختياري)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Caisse Zakat"
            dir="ltr"
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => { setShowAddModal(false); setName(''); setNameAr(''); }}>
              إلغاء
            </Button>
            <Button onClick={handleAddCaisse} disabled={!nameAr.trim()}>
              إضافة
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Caisse Modal */}
      <Modal
        isOpen={!!editCaisse}
        onClose={() => { setEditCaisse(null); setName(''); setNameAr(''); }}
        title="تعديل الصندوق"
      >
        <div className="space-y-4">
          <Input
            labelAr="اسم الصندوق بالعربية"
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
          />
          <Input
            labelAr="اسم الصندوق بالفرنسية (اختياري)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            dir="ltr"
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => { setEditCaisse(null); setName(''); setNameAr(''); }}>
              إلغاء
            </Button>
            <Button onClick={handleUpdateCaisse} disabled={!nameAr.trim()}>
              حفظ التعديلات
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Sub-Category Modal */}
      <Modal
        isOpen={!!showSubCatModal}
        onClose={() => { setShowSubCatModal(null); setSubName(''); setSubNameAr(''); }}
        title="إضافة فئة فرعية"
      >
        <div className="space-y-4">
          <Input
            labelAr="اسم الفئة بالعربية"
            value={subNameAr}
            onChange={(e) => setSubNameAr(e.target.value)}
            placeholder="مثال: تحاليل طبية"
          />
          <Input
            labelAr="اسم الفئة بالفرنسية (اختياري)"
            value={subName}
            onChange={(e) => setSubName(e.target.value)}
            placeholder="Ex: Analyses médicales"
            dir="ltr"
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => { setShowSubCatModal(null); setSubName(''); setSubNameAr(''); }}>
              إلغاء
            </Button>
            <Button onClick={handleAddSubCategory} disabled={!subNameAr.trim()}>
              إضافة
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Sub-Category Modal */}
      <Modal
        isOpen={!!editSubCat}
        onClose={() => { setEditSubCat(null); setSubName(''); setSubNameAr(''); }}
        title="تعديل الفئة الفرعية"
      >
        <div className="space-y-4">
          <Input
            labelAr="اسم الفئة بالعربية"
            value={subNameAr}
            onChange={(e) => setSubNameAr(e.target.value)}
          />
          <Input
            labelAr="اسم الفئة بالفرنسية (اختياري)"
            value={subName}
            onChange={(e) => setSubName(e.target.value)}
            dir="ltr"
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => { setEditSubCat(null); setSubName(''); setSubNameAr(''); }}>
              إلغاء
            </Button>
            <Button onClick={handleUpdateSubCategory} disabled={!subNameAr.trim()}>
              حفظ التعديلات
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
