import { useState, useEffect } from 'react';
import { Button, Input } from '../components/common/UI';
import { authApi } from '../lib/api';
import { CheckCircle } from 'lucide-react';

export default function RegisterPage({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    associationName: '', associationNameAr: '',
    email: '', password: '',
    adminName: '', adminNameAr: '',
    inviteToken: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<{
    email: string; role: string;
    associationNameAr: string;
  } | null>(null);
  const [checkingInvite, setCheckingInvite] = useState(false);

  // Detect invite code in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite');
    if (token) {
      setForm(f => ({ ...f, inviteToken: token }));
      setCheckingInvite(true);
      authApi.inviteDetails(token)
        .then(res => {
          setInviteInfo(res.data);
          setForm(f => ({ ...f, email: res.data.email }));
        })
        .catch(err => {
          setError(err.response?.data?.error || 'رمز الدعوة غير صالح');
        })
        .finally(() => setCheckingInvite(false));
    }
  }, []);

  // Fetch invite info when manual token changes
  useEffect(() => {
    if (!form.inviteToken) {
      setInviteInfo(null);
      return;
    }
    // Only fetch if not already matching (avoid duplicate fetch)
    if (inviteInfo && form.inviteToken === (window.location.search.includes(form.inviteToken) ? form.inviteToken : '')) return;
    const timer = setTimeout(() => {
      if (!form.inviteToken) return;
      setCheckingInvite(true);
      authApi.inviteDetails(form.inviteToken)
        .then(res => {
          setInviteInfo(res.data);
          setForm(f => ({ ...f, email: res.data.email }));
          setError('');
        })
        .catch(err => {
          setInviteInfo(null);
          setError(err.response?.data?.error || 'رمز الدعوة غير صالح');
        })
        .finally(() => setCheckingInvite(false));
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.inviteToken]);

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const isInviteFlow = !!form.inviteToken && !!inviteInfo;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
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
          <p className="text-gray-500 mt-2">
            {isInviteFlow ? 'انضمام إلى جمعية عن طريق الدعوة' : 'إنشاء حساب جديد للجمعية'}
          </p>
        </div>

        {/* Invite info banner */}
        {inviteInfo && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-800">
                دعوة للانضمام إلى: {inviteInfo.associationNameAr}
              </p>
              <p className="text-xs text-green-600">
                {inviteInfo.role === 'treasurer' ? 'أمين المال' : 'متطوع'}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Invite code field — always visible */}
          <Input
            labelAr="رمز الدعوة (إن وجد)"
            value={form.inviteToken}
            onChange={(e) => update('inviteToken', e.target.value)}
            placeholder="أدخل رمز الدعوة"
            dir="ltr"
          />

          {/* Association fields — only for new association registration */}
          {!isInviteFlow && (
            <>
              <Input labelAr="اسم الجمعية بالعربية" value={form.associationNameAr}
                onChange={(e) => update('associationNameAr', e.target.value)}
                placeholder="مثال: جمعية الخير" required />
              <Input labelAr="اسم الجمعية بالفرنسية" value={form.associationName}
                onChange={(e) => update('associationName', e.target.value)}
                placeholder="Ex: Association El-Kheir" dir="ltr" required />
              <Input labelAr="اسم المدير بالعربية" value={form.adminNameAr}
                onChange={(e) => update('adminNameAr', e.target.value)}
                placeholder="مثال: محمد" required />
              <Input labelAr="اسم المدير بالفرنسية" value={form.adminName}
                onChange={(e) => update('adminName', e.target.value)}
                placeholder="Ex: Mohamed" dir="ltr" required />
            </>
          )}

          {/* Name fields — always shown for invite flow */}
          {isInviteFlow && (
            <>
              <Input labelAr="الاسم بالعربية" value={form.adminNameAr}
                onChange={(e) => update('adminNameAr', e.target.value)}
                placeholder="مثال: محمد" required />
              <Input labelAr="الاسم باللاتينية" value={form.adminName}
                onChange={(e) => update('adminName', e.target.value)}
                placeholder="Ex: Mohamed" dir="ltr" />
            </>
          )}

          <Input labelAr="البريد الإلكتروني" type="email" value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="admin@example.com" required dir="ltr" />
          <Input labelAr="كلمة المرور" type="password" value={form.password}
            onChange={(e) => update('password', e.target.value)}
            placeholder="••••••••" required dir="ltr" />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 text-center">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading || checkingInvite}>
            {checkingInvite ? 'جاري التحقق من الدعوة...' :
             loading ? 'جاري إنشاء الحساب...' :
             isInviteFlow ? 'انضمام إلى الجمعية' : 'إنشاء الحساب'}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          لديك حساب بالفعل؟{' '}
          <button onClick={() => window.location.hash = 'login'}
            className="text-primary-600 hover:text-primary-700 font-medium">
            تسجيل الدخول
          </button>
        </p>
      </div>
    </div>
  );
}
