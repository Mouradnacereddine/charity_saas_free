import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Badge, Input, Select, Button, EmptyState, LoadingSpinner } from '../components/common/UI';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../lib/api';
import { ScrollText } from 'lucide-react';
import type { AuditLogResponse } from '../types';

const ACTION_BADGE: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  create: 'success',
  update: 'info',
  delete: 'danger',
  confirm: 'warning',
  cancel: 'warning',
  login: 'default',
  logout: 'default',
  register: 'success',
};

function formatDate(iso: string, locale: string) {
  const d = new Date(iso);
  return d.toLocaleString(locale === 'en' ? 'en-US' : 'fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AuditLogPage() {
  const { t, i18n } = useTranslation();
  const [userId, setUserId] = useState('');
  const [action, setAction] = useState('');
  const [resource, setResource] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit', { userId, action, resource, page }],
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), limit: '50' };
      if (userId) params.userId = userId;
      if (action) params.action = action;
      if (resource) params.resource = resource;
      const res = await auditApi.list(params);
      return res.data as AuditLogResponse;
    },
  });

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / (data?.limit || 50)));

  const ACTION_OPTIONS = [
    { value: '', label: t('audit.allActions') },
    { value: 'create', label: t('audit.actionCreate') },
    { value: 'update', label: t('audit.actionUpdate') },
    { value: 'delete', label: t('audit.actionDelete') },
    { value: 'confirm', label: t('audit.actionConfirm') },
    { value: 'cancel', label: t('audit.actionCancel') },
    { value: 'login', label: t('audit.actionLogin') },
    { value: 'logout', label: t('audit.actionLogout') },
    { value: 'register', label: t('audit.actionRegister') },
  ];

  const RESOURCE_OPTIONS = [
    { value: '', label: t('audit.allResources') },
    { value: 'transaction', label: t('audit.resourceTransaction') },
    { value: 'bank_account', label: t('audit.resourceBankAccount') },
    { value: 'caisse', label: t('audit.resourceCaisse') },
    { value: 'donor', label: t('audit.resourceDonor') },
    { value: 'beneficiary', label: t('audit.resourceBeneficiary') },
    { value: 'article', label: t('audit.resourceArticle') },
    { value: 'loan', label: t('audit.resourceLoan') },
    { value: 'medical_referral', label: t('audit.resourceMedicalReferral') },
    { value: 'doctor', label: t('audit.resourceDoctor') },
    { value: 'user', label: t('audit.resourceUser') },
    { value: 'allocation', label: t('audit.resourceAllocation') },
  ];

  const applyFilters = () => {
    setPage(1);
  };

  const resetFilters = () => {
    setUserId('');
    setAction('');
    setResource('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
          <ScrollText size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('audit.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('audit.subtitle')}</p>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            label={t('audit.filterUser')}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder={t('audit.filterUserPlaceholder')}
          />
          <Select
            label={t('audit.filterAction')}
            value={action}
            onChange={(e) => setAction(e.target.value)}
            options={ACTION_OPTIONS}
          />
          <Select
            label={t('audit.filterResource')}
            value={resource}
            onChange={(e) => setResource(e.target.value)}
            options={RESOURCE_OPTIONS}
          />
          <div className="flex items-end gap-2">
            <Button variant="primary" size="sm" onClick={applyFilters}>{t('audit.filter')}</Button>
            <Button variant="secondary" size="sm" onClick={resetFilters}>{t('audit.reset')}</Button>
          </div>
        </div>
      </Card>

      {/* Liste des logs */}
      {isLoading ? (
        <LoadingSpinner />
      ) : logs.length === 0 ? (
        <EmptyState message={t('audit.noLogs')} icon={<ScrollText size={48} />} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-start py-3 px-4 font-semibold text-muted-foreground">{t('audit.date')}</th>
                  <th className="text-start py-3 px-4 font-semibold text-muted-foreground">{t('audit.user')}</th>
                  <th className="text-start py-3 px-4 font-semibold text-muted-foreground hidden sm:table-cell">{t('audit.role')}</th>
                  <th className="text-start py-3 px-4 font-semibold text-muted-foreground">{t('audit.action')}</th>
                  <th className="text-start py-3 px-4 font-semibold text-muted-foreground">{t('audit.resource')}</th>
                  <th className="text-start py-3 px-4 font-semibold text-muted-foreground hidden md:table-cell">{t('audit.description')}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-border hover:bg-muted transition-colors">
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      {formatDate(log.createdAt, i18n.language)}
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">
                      {log.userName || t('audit.unknownUser')}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">
                      {log.userRole || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={ACTION_BADGE[log.action] || 'default'}>
                        {t(`audit.actionLabel.${log.action}`, { defaultValue: log.action })}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {t(`audit.resourceLabel.${log.resource}`, { defaultValue: log.resource })}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">
                      {log.description || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-sm text-muted-foreground">
                {t('audit.total')} : {total}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {t('audit.prev')}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  {t('audit.next')}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
