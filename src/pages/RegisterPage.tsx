import { useState } from 'react';
import { Button, Input } from '../components/common/UI';

export default function RegisterPage({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ associationName: '', associationNameAr: '', email: '', password: '', adminName: '', adminNameAr: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { authApi } = await import('../lib/api');
      const res = await authApi.register(form);
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'فشل إنشاء الحساب');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-700">🕌 جمعية خيرية</h1>
          <p className="text-gray-500 mt-2">إنشاء حساب جديد للجمعية</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input labelAr="اسم الجمعية بالعربية" value={form.associationNameAr} onChange={(e) => update('associationNameAr', e.target.value)} placeholder="مثال: جمعية الخير" required />
          <Input labelAr="اسم الجمعية بالفرنسية" value={form.associationName} onChange={(e) => update('associationName', e.target.value)} placeholder="Ex: Association El-Kheir" dir="ltr" required />
          <Input labelAr="اسم المدير بالعربية" value={form.adminNameAr} onChange={(e) => update('adminNameAr', e.target.value)} placeholder="مثال: محمد" required />
          <Input labelAr="اسم المدير بالفرنسية" value={form.adminName} onChange={(e) => update('adminName', e.target.value)} placeholder="Ex: Mohamed" dir="ltr" required />
          <Input labelAr="البريد الإلكتروني" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="admin@example.com" required dir="ltr" />
          <Input labelAr="كلمة المرور" type="password" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="••••••••" required dir="ltr" />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 text-center">{error}</div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب'}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          لديك حساب بالفعل؟{' '}
          <button onClick={() => window.location.hash = 'login'} className="text-primary-600 hover:text-primary-700 font-medium">
            تسجيل الدخول
          </button>
        </p>
      </div>
    </div>
  );
}
