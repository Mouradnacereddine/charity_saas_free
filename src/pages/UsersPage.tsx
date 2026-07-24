import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Badge, Input, Modal, EmptyState, LoadingSpinner } from '../components/common/UI';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../lib/api';
import { UserCog, Trash2, CheckCircle, XCircle, Shield, User as UserIcon, Mail, Copy, Check } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  name: string;
  nameAr: string;
  role: 'admin' | 'treasurer' | 'user';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface InviteData {
  id: string;
  role: 'admin' | 'treasurer' | 'user';
  name: string | null;
  nameAr: string | null;
  token: string;
  inviteLink: string | null;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
  isExpired: boolean;
}

const STATUS_BADGE: Record<string, 'warning' | 'success' | 'danger' | 'default' | 'info'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

const ROLE_BADGE_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  admin: 'info',
  treasurer: 'warning',
  user: 'default',
};

const INVITE_STATUS_BADGE: Record<string, 'warning' | 'danger' | 'success'> = {
  pending: 'warning',
  expired: 'danger',
  used: 'success',
};

function getInviteStatus(inv: InviteData): 'pending' | 'expired' | 'used' {
  if (inv.usedAt) return 'used';
  if (inv.isExpired) return 'expired';
  return 'pending';
}

// ==========================================
// Invite Modal
// ==========================================

function InviteModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [nameAr, setNameAr] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'user' | 'treasurer'>('user');
  const [result, setResult] = useState<{ inviteLink: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const inviteMutation = useMutation({
    mutationFn: authApi.invite,
    onSuccess: (res) => {
      setResult({ inviteLink: res.data.inviteLink });
      queryClient.invalidateQueries({ queryKey: ['invites'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || t('users.updateFailed'));
    },
  });

  const handleCopy = async () => {
    if (result?.inviteLink) {
      try {
        await navigator.clipboard.writeText(result.inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        const input = document.getElementById('invite-link-input') as HTMLInputElement;
        if (input) { input.select(); (document as any).execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000); }
      }
    }
  };

  const reset = () => {
    setNameAr('');
    setName('');
    setRole('user');
    setResult(null);
    setCopied(false);
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = () => {
    setError('');
    if (!nameAr.trim()) {
      setError(t('users.nameRequired'));
      return;
    }
    inviteMutation.mutate({
      role,
      name: name.trim() || nameAr.trim(),
      nameAr: nameAr.trim(),
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('users.inviteUser')} size="md">
      <div className="space-y-4">
        {!result ? (
          <>
            <p className="text-sm text-gray-600">{t('users.inviteUserDescription')}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input labelAr={t('users.nameAr')} value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder={t('users.nameArPlaceholder', 'Ex: Ahmed')} required />
              <Input labelAr={t('users.nameLatin')} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Ahmed" dir="ltr" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('users.role')}</label>
              <div className="flex gap-3">
                <label className={`flex-1 flex items-center justify-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors ${role === 'user' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="inviteRole" value="user" checked={role === 'user'}
                    onChange={() => setRole('user')} className="sr-only" />
                  <UserIcon className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium">{t('users.volunteer')}</span>
                </label>
                <label className={`flex-1 flex items-center justify-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors ${role === 'treasurer' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="inviteRole" value="treasurer" checked={role === 'treasurer'}
                    onChange={() => setRole('treasurer')} className="sr-only" />
                  <Shield className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium">{t('users.treasurer')}</span>
                </label>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 text-center">
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="secondary" onClick={handleClose}>{t('common.cancel')}</Button>
              <Button onClick={handleSubmit} disabled={!nameAr.trim() || inviteMutation.isPending}>
                {inviteMutation.isPending ? t('users.creating') : t('users.createInviteLink')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-medium text-green-800 mb-2">✅ {t('users.inviteLinkCreated')}</p>
              <p className="text-xs text-gray-500 mb-3">{t('users.inviteLinkCreatedDescription')}</p>
              <div className="flex items-center gap-2">
                <input id="invite-link-input" type="text" readOnly value={result.inviteLink}
                  className="flex-1 bg-white border border-green-300 rounded-lg px-3 py-2 text-xs text-gray-700 font-mono"
                  dir="ltr" />
                <button
                  onClick={handleCopy}
                  className={`p-2 rounded-lg transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  title={t('users.copyLink')}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleClose}>{t('common.done')}</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// ==========================================
// UsersPage Main Component
// ==========================================

export default function UsersPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [actionMsg, setActionMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'invites'>('users');
  const [showInviteModal, setShowInviteModal] = useState(false);

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await authApi.users();
      return res.data;
    },
  });

  const { data: invites = [], isLoading: invitesLoading } = useQuery({
    queryKey: ['invites'],
    queryFn: async () => {
      const res = await authApi.invites();
      return res.data;
    },
    enabled: activeTab === 'invites',
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status?: string; role?: string } }) => authApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: authApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const deleteInviteMutation = useMutation({
    mutationFn: authApi.deleteInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites'] });
    },
  });

  const STATUS_LABELS: Record<string, string> = {
    pending: t('users.pendingReview'),
    approved: t('users.accepted'),
    rejected: t('users.rejected'),
  };

  const ROLE_LABELS: Record<string, string> = {
    admin: t('users.admin'),
    treasurer: t('users.treasurer'),
    user: t('users.volunteer'),
  };

  const INVITE_STATUS_LABELS: Record<string, string> = {
    pending: t('users.waitingRegistration'),
    expired: t('users.expired'),
    used: t('users.registered'),
  };

  const handleUpdate = async (id: string, updates: { status?: string; role?: string }) => {
    setActionMsg('');
    try {
      await updateMutation.mutateAsync({ id, data: updates });
      setActionMsg(`✅ ${t('users.updated')}`);
      setTimeout(() => setActionMsg(''), 3000);
    } catch {
      setActionMsg(`❌ ${t('users.updateFailed')}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('users.deleteUserConfirm'))) return;
    setActionMsg('');
    try {
      await deleteMutation.mutateAsync(id);
      setActionMsg(`✅ ${t('users.deleted')}`);
      setTimeout(() => setActionMsg(''), 3000);
    } catch {
      setActionMsg(`❌ ${t('users.deleteFailed')}`);
    }
  };

  const handleDeleteInvite = async (id: string) => {
    if (!window.confirm(t('users.deleteInviteConfirm'))) return;
    try {
      await deleteInviteMutation.mutateAsync(id);
      setActionMsg(`✅ ${t('users.inviteDeleted')}`);
      setTimeout(() => setActionMsg(''), 3000);
    } catch {
      setActionMsg(`❌ ${t('users.inviteDeleteFailed')}`);
    }
  };

  const isLoading = activeTab === 'users' ? usersLoading : invitesLoading;
  const locale = i18n.language === 'ar' ? 'ar-DZ' : i18n.language === 'fr' ? 'fr-DZ' : 'en-DZ';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
            <UserCog size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('users.title')}</h1>
            <p className="text-sm text-gray-500">
              {activeTab === 'users' ? `${users.length} ${t('users.userCount')}` : `${invites.length} ${t('users.inviteCount')}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="primary" onClick={() => setShowInviteModal(true)}>
            <Mail className="w-4 h-4" /> {t('users.inviteUserButton')}
          </Button>
        </div>
      </div>

      {actionMsg && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg p-3 text-center">
          {actionMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-2 sm:gap-4">
          <button onClick={() => setActiveTab('users')}
            className={`pb-3 px-3 sm:px-1 text-sm font-medium border-b-2 transition-colors min-h-[44px] ${
              activeTab === 'users' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}>
            <UserIcon className="inline-block w-4 h-4 ml-2" />
            {t('users.tabUsers')}
          </button>
          <button onClick={() => setActiveTab('invites')}
            className={`pb-3 px-3 sm:px-1 text-sm font-medium border-b-2 transition-colors min-h-[44px] ${
              activeTab === 'invites' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}>
            <Mail className="inline-block w-4 h-4 ml-2" />
            {t('users.tabInvites')}
          </button>
        </nav>
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <Card>
          {activeTab === 'users' ? (
            users.length === 0 ? (
              <EmptyState message={t('users.noUsers')} icon={<UserCog size={48} />} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-right py-3 px-4 font-semibold text-gray-600">{t('users.name')}</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600 hidden sm:table-cell">{t('users.email')}</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600">{t('users.role')}</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600">{t('users.status')}</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600 hidden md:table-cell">{t('users.registrationDate')}</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-600">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user: UserData) => (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-xs">
                              {user.nameAr?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{user.nameAr}</p>
                              <p className="text-xs text-gray-400">{user.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600 hidden sm:table-cell" dir="ltr">{user.email}</td>
                        <td className="py-3 px-4">
                          <Badge variant={ROLE_BADGE_VARIANT[user.role] || 'default'}>
                            {ROLE_LABELS[user.role] || user.role}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={STATUS_BADGE[user.status] || 'default'}>
                            {STATUS_LABELS[user.status] || user.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-gray-500 hidden md:table-cell">
                          {new Date(user.createdAt).toLocaleDateString(locale)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            {user.status === 'pending' && (
                              <>
                                <button onClick={() => handleUpdate(user.id, { status: 'approved' })}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors" title={t('users.acceptUser')}>
                                  <CheckCircle size={16} />
                                </button>
                                <button onClick={() => handleUpdate(user.id, { status: 'rejected' })}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title={t('users.rejectUser')}>
                                  <XCircle size={16} />
                                </button>
                              </>
                            )}
                            {user.role === 'user' && user.status === 'approved' && (
                              <button onClick={() => handleUpdate(user.id, { role: 'treasurer' })}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors" title={t('users.promoteTreasurer')}>
                                <Shield size={16} />
                              </button>
                            )}
                            {user.role === 'treasurer' && user.status === 'approved' && (
                              <button onClick={() => handleUpdate(user.id, { role: 'user' })}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors" title={t('users.downgradeVolunteer')}>
                                <UserIcon size={16} />
                              </button>
                            )}
                            {user.role === 'treasurer' && (
                              <button onClick={() => handleUpdate(user.id, { role: 'admin' })}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title={t('users.promoteAdmin')}>
                                <UserCog size={16} />
                              </button>
                            )}
                            {user.role === 'admin' && user.status === 'approved' && (
                              <button onClick={() => handleUpdate(user.id, { role: 'treasurer' })}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors" title={t('users.promoteTreasurer')}>
                                <Shield size={16} />
                              </button>
                            )}
                            <button onClick={() => handleDelete(user.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" title={t('users.deleteUserConfirm')}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            invites.length === 0 ? (
              <EmptyState message={t('users.noInvites')} icon={<Mail size={48} />} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-right py-3 px-4 font-semibold text-gray-600">{t('users.name')}</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600">{t('users.role')}</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600">{t('users.status')}</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600 hidden sm:table-cell">{t('users.registrationDate')}</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-600">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invites.map((inv: InviteData) => {
                      const status = getInviteStatus(inv);
                      return (
                        <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 font-medium text-gray-900">{inv.nameAr || t('users.pendingInvite')}</td>
                          <td className="py-3 px-4">
                            <Badge variant={ROLE_BADGE_VARIANT[inv.role] || 'default'}>
                              {ROLE_LABELS[inv.role] || inv.role}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={INVITE_STATUS_BADGE[status]}>
                              {INVITE_STATUS_LABELS[status]}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-gray-500 hidden sm:table-cell">
                            {new Date(inv.createdAt).toLocaleDateString(locale)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1">
                              {status === 'pending' && inv.inviteLink && (
                                <button onClick={() => {
                                  navigator.clipboard.writeText(inv.inviteLink!).then(() => {
                                    setActionMsg(`✅ ${t('users.inviteLinkCopied')}`);
                                    setTimeout(() => setActionMsg(''), 2000);
                                  });
                                }}
                                  className="p-1.5 text-primary-600 hover:bg-primary-50 rounded transition-colors" title={t('users.copyLink')}>
                                  <Copy size={16} />
                                </button>
                              )}
                              {status === 'used' && (
                                <span className="text-xs text-gray-400 italic">{t('users.registered')}</span>
                              )}
                              <button onClick={() => handleDeleteInvite(inv.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" title={t('users.deleteInviteConfirm')}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </Card>
      )}

      {/* Modals */}
      <InviteModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} />
    </div>
  );
}
