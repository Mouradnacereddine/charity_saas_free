import { useState, useEffect, useRef } from 'react';
import { Button, Input } from '../components/common/UI';

declare global {
  interface Window {
    google?: any;
  }
}

export default function LoginPage({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Load Google Sign-In
  useEffect(() => {
    // Load Google script if not already loaded
    if (document.getElementById('google-gsi-script')) return;

    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google && googleBtnRef.current) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '1074847403581-qs7gvuumokefa5cid6cu0m0cibt67nc4.apps.googleusercontent.com',
          callback: handleGoogleCredential,
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: 280,
          text: 'signin_with',
          locale: 'ar',
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup not needed
    };
  }, []);

  const handleGoogleCredential = async (response: any) => {
    setLoading(true);
    setError('');
    try {
      const { authApi } = await import('../lib/api');

      // Check for invite token in hash
      const hash = window.location.hash;
      const inviteMatch = hash.match(/[?&]invite=([^&]+)/);
      const inviteToken = inviteMatch ? decodeURIComponent(inviteMatch[1]) : undefined;

      const res = await authApi.googleLogin({ credential: response.credential, inviteToken });
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'فشل تسجيل الدخول بواسطة Google');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { authApi } = await import('../lib/api');
      const res = await authApi.login({ email, password });
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-700">🕌 جمعية خيرية</h1>
          <p className="text-gray-500 mt-2">نظام إدارة شامل — تسجيل الدخول</p>
        </div>

        {/* Google Sign-In Button */}
        <div className="flex justify-center mb-6">
          <div ref={googleBtnRef}></div>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-4 text-gray-500">أو</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            labelAr="البريد الإلكتروني"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            required
            dir="ltr"
          />
          <Input
            labelAr="كلمة المرور"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            dir="ltr"
          />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 text-center">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          ليس لديك حساب؟{' '}
          <button
            onClick={() => window.location.hash = 'register'}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            إنشاء حساب جديد
          </button>
        </p>
      </div>
    </div>
  );
}
