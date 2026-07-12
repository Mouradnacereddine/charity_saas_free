import { useState } from 'react';
import { Card, Button, Badge, EmptyState, LoadingSpinner } from '../components/common/UI';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../lib/api';
import { UserCog, Trash2, CheckCircle, XCircle, Shield, User as UserIcon } from 'lucide-react';
import type { UserStatus } from '../types';

interface UserData {
  id: string;
  email: string;
  name: string;
  nameAr: string;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

const STATUS_BADGE: Record<string, 'warning' | 'success' | 'danger' | 'default' | 'info'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد المراجعة',
  approved: 'مقبول',
  rejected: 'مرفوض',
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'مدير',
  user: 'متطوع',
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [actionMsg, setActionMsg] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await authApi.users();
      return res.data;
    },
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

  const handleUpdate = async (id: string, updates: { status?: string; role?: string }) => {
    setActionMsg('');
    try {
      await updateMutation.mutateAsync({ id, data: updates });
      setActionMsg('✅ تم التحديث بنجاح');
      setTimeout(() => setActionMsg(''), 3000);
    } catch {
      setActionMsg('❌ فشل التحديث');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    setActionMsg('');
    try {
      await deleteMutation.mutateAsync(id);
      setActionMsg('✅ تم حذف المستخدم');
      setTimeout(() => setActionMsg(''), 3000);
    } catch {
      setActionMsg('❌ فشل الحذف');
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
          <UserCog size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة المستخدمين</h1>
          <p className="text-sm text-gray-500">{users.length} مستخدم</p>
        </div>
      </div>

      {actionMsg && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg p-3 text-center">
          {actionMsg}
        </div>
      )}

      <Card>
        {users.length === 0 ? (
          <EmptyState message="لا يوجد مستخدمون بعد" icon={<UserCog size={48} />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">الاسم</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600 hidden sm:table-cell">البريد الإلكتروني</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">الدور</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">الحالة</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600 hidden md:table-cell">تاريخ التسجيل</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600">الإجراءات</th>
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
                      <Badge variant={user.role === 'admin' ? 'info' : 'default'}>
                        {ROLE_LABELS[user.role] || user.role}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={STATUS_BADGE[user.status] || 'default'}>
                        {STATUS_LABELS[user.status] || user.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-gray-500 hidden md:table-cell">
                      {new Date(user.createdAt).toLocaleDateString('ar-DZ')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {user.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleUpdate(user.id, { status: 'approved' })}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="قبول المستخدم"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              onClick={() => handleUpdate(user.id, { status: 'rejected' })}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="رفض المستخدم"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                        {user.role === 'user' && (
                          <button
                            onClick={() => handleUpdate(user.id, { role: 'admin' })}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            title="ترقية إلى مدير"
                          >
                            <Shield size={16} />
                          </button>
                        )}
                        {user.role === 'admin' && user.status === 'approved' && (
                          <button
                            onClick={() => handleUpdate(user.id, { role: 'user' })}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="تحويل إلى متطوع"
                          >
                            <UserIcon size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="حذف المستخدم"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
