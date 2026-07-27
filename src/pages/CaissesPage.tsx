import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Input, Modal, EmptyState, LoadingSpinner } from '../components/common/UI';
import { formatCurrency, generateId, generateReceiptNumber } from '../utils/helpers';
import { Plus, Edit, Trash2, FolderOpen, Tag } from 'lucide-react';
import type { Caisse, SubCategory } from '../types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { caissesApi } from '../lib/api';

const generateCaisseReference = () => {
  return generateReceiptNumber().replace('BON', 'CAI');
};

export default function CaissesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: caisses = [], isLoading } = useQuery({
    queryKey: ['caisses'],
    queryFn: () => caissesApi.list().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => caissesApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['caisses'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => caissesApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['caisses'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => caissesApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['caisses'] }),
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [editCaisse, setEditCaisse] = useState<Caisse | null>(null);
  const [showSubCatModal, setShowSubCatModal] = useState<string | null>(null);
  const [editSubCat, setEditSubCat] = useState<{ caisseId: string; subCat: SubCategory } | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [subName, setSubName] = useState('');
  const [subNameAr, setSubNameAr] = useState('');

  const handleAddCaisse = async () => {
    if (!nameAr.trim()) return;
    await createMutation.mutateAsync({ name: name || nameAr, nameAr, reference: generateCaisseReference() });
    setName('');
    setNameAr('');
    setShowAddModal(false);
  };

  const handleUpdateCaisse = async () => {
    if (!editCaisse || !nameAr.trim()) return;
    await updateMutation.mutateAsync({ id: editCaisse.id, data: { name: name || nameAr, nameAr } });
    setName('');
    setNameAr('');
    setEditCaisse(null);
  };

  const handleDeleteCaisse = async (id: string) => {
    if (window.confirm(t('caisses.deleteFundConfirm'))) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleAddSubCategory = async () => {
    if (!showSubCatModal || !subNameAr.trim()) return;
    const caisse = caisses.find((c: Caisse) => c.id === showSubCatModal);
    if (!caisse) return;
    const newSub: SubCategory = {
      id: generateId(),
      name: subName || subNameAr,
      nameAr: subNameAr.trim(),
    };
    await updateMutation.mutateAsync({
      id: showSubCatModal,
      data: { subCategories: [...(caisse.subCategories || []), newSub] },
    });
    setSubName('');
    setSubNameAr('');
    setShowSubCatModal(null);
  };

  const handleUpdateSubCategory = async () => {
    if (!editSubCat || !subNameAr.trim()) return;
    const caisse = caisses.find((c: Caisse) => c.id === editSubCat.caisseId);
    if (!caisse) return;
    const updatedSubs = (caisse.subCategories || []).map((s: SubCategory) =>
      s.id === editSubCat.subCat.id
        ? { ...s, name: subName || subNameAr, nameAr: subNameAr.trim() }
        : s
    );
    await updateMutation.mutateAsync({
      id: editSubCat.caisseId,
      data: { subCategories: updatedSubs },
    });
    setSubName('');
    setSubNameAr('');
    setEditSubCat(null);
  };

  const handleDeleteSubCategory = async (caisseId: string, subCatId: string) => {
    if (window.confirm(t('caisses.deleteCategoryConfirm'))) {
      const caisse = caisses.find((c: Caisse) => c.id === caisseId);
      if (!caisse) return;
      const updatedSubs = (caisse.subCategories || []).filter((s: SubCategory) => s.id !== subCatId);
      await updateMutation.mutateAsync({
        id: caisseId,
        data: { subCategories: updatedSubs },
      });
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

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('caisses.title')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('caisses.subtitle')}</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" />
          {t('caisses.addFund')}
        </Button>
      </div>

      {/* Caisses Grid */}
      {caisses.length === 0 ? (
        <EmptyState message={t('caisses.noFunds')} icon={<FolderOpen className="w-12 h-12" />} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {caisses.map((caisse: Caisse) => (
            <Card key={caisse.id} className="relative">
              {/* Caisse Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{caisse.nameAr}</h3>
                      <span className="text-xs text-primary/70 font-mono" dir="ltr">{caisse.reference || '—'}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{caisse.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditCaisse(caisse)}
                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCaisse(caisse.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Balance */}
              <div className="bg-muted rounded-lg p-3 mb-4">
                <p className="text-xs text-muted-foreground mb-1">{t('caisses.balance')}</p>
                <p className={`text-lg font-bold ${caisse.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(caisse.balance)}
                </p>
              </div>

              {/* Sub-categories */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-foreground">{t('caisses.subCategories')}</p>
                  <button
                    onClick={() => setShowSubCatModal(caisse.id)}
                    className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    {t('common.add')}
                  </button>
                </div>
                {(caisse.subCategories || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t('caisses.noFunds')}</p>
                ) : (
                  <div className="space-y-1.5">
                    {caisse.subCategories.map((sub: SubCategory) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between bg-muted rounded-lg px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <Tag className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm text-foreground">{sub.nameAr}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditSubCat(caisse.id, sub)}
                            className="p-1 text-muted-foreground hover:text-primary"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteSubCategory(caisse.id, sub.id)}
                            className="p-1 text-muted-foreground hover:text-destructive"
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
        title={t('caisses.addFundTitle')}
      >
        <div className="space-y-4">
          <Input
            labelAr={t('caisses.nameAr')}
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            placeholder={t('caisses.nameArPlaceholder', 'مثال: صندوق الزكاة')}
          />
          <Input
            labelAr={t('caisses.nameLatin')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('caisses.nameArPlaceholder')}
            dir="ltr"
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => { setShowAddModal(false); setName(''); setNameAr(''); }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddCaisse} disabled={!nameAr.trim()}>
              {t('common.add')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Caisse Modal */}
      <Modal
        isOpen={!!editCaisse}
        onClose={() => { setEditCaisse(null); setName(''); setNameAr(''); }}
        title={t('caisses.editFundTitle')}
      >
        <div className="space-y-4">
          <Input
            labelAr={t('caisses.nameAr')}
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
          />
          <Input
            labelAr={t('caisses.nameLatin')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            dir="ltr"
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => { setEditCaisse(null); setName(''); setNameAr(''); }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleUpdateCaisse} disabled={!nameAr.trim()}>
              {t('caisses.saveChanges')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Sub-Category Modal */}
      <Modal
        isOpen={!!showSubCatModal}
        onClose={() => { setShowSubCatModal(null); setSubName(''); setSubNameAr(''); }}
        title={t('caisses.addCategoryTitle')}
      >
        <div className="space-y-4">
          <Input
            labelAr={t('caisses.categoryNameAr')}
            value={subNameAr}
            onChange={(e) => setSubNameAr(e.target.value)}
            placeholder={t('caisses.categoryNameArPlaceholder', 'مثال: تحاليل طبية')}
          />
          <Input
            labelAr={t('caisses.categoryNameLatin')}
            value={subName}
            onChange={(e) => setSubName(e.target.value)}
            placeholder={t('caisses.categoryNameArPlaceholder')}
            dir="ltr"
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => { setShowSubCatModal(null); setSubName(''); setSubNameAr(''); }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddSubCategory} disabled={!subNameAr.trim()}>
              {t('common.add')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Sub-Category Modal */}
      <Modal
        isOpen={!!editSubCat}
        onClose={() => { setEditSubCat(null); setSubName(''); setSubNameAr(''); }}
        title={t('caisses.editCategoryTitle')}
      >
        <div className="space-y-4">
          <Input
            labelAr={t('caisses.categoryNameAr')}
            value={subNameAr}
            onChange={(e) => setSubNameAr(e.target.value)}
          />
          <Input
            labelAr={t('caisses.categoryNameLatin')}
            value={subName}
            onChange={(e) => setSubName(e.target.value)}
            dir="ltr"
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => { setEditSubCat(null); setSubName(''); setSubNameAr(''); }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleUpdateSubCategory} disabled={!subNameAr.trim()}>
              {t('caisses.saveChanges')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
