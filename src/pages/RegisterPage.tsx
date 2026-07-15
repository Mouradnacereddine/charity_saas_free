import { useState, useEffect, useRef } from 'react';
import { Button } from '../components/common/UI';
import { authApi } from '../lib/api';
import { CheckCircle } from 'lucide-react';

export default function RegisterPage({ onSuccess }: { onSuccess: () => void }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<{
    email: string; role: string; name?: string; nameAr?: string;
    associationNameAr: string;
  } | null>(null);
  const [inviteToken, setInviteToken] = useState('');
  const [checkingInvite, setCheckingInvite] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Detect invite code in URL hash on mount
  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/[?&]invite=([^&]+)/);
    const token = match ? decodeURIComponent(match[1]) : null;
    if (token) {
      setInviteToken(token);
      setCheckingInvite(true);
      authApi.inviteDetails(token)
        .then(res => {
          setInviteInfo(res.data);
        })
        .catch(err => {
          setError(err.response?.data?.error || 'رمز الدعوة غير صالح');
        })
        .finally(() => setCheckingInvite(false));
    }
  }, []);

  // Load Google Sign-In
  useEffect(() => {
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
          theme: 'outline', size: 'large', width: 300,
          text: 'signup_with', locale: 'ar',
        });
      }
    };
    document.head.appendChild(script);
  }, []);

  const handleGoogleCredential = async (response: any) => {
    setLoading(true);
    setError('');
    try {
      const { authApi } = await import('../lib/api');
      const res = await authApi.googleLogin({
        credential: response.credential,
        inviteToken: inviteToken || undefined,
      });
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'فشل تسجيل الدخول بواسطة Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-700">🕌 جمعية خيرية</h1>
          <p className="text-gray-500 mt-2">
            {inviteInfo ? 'انضمام إلى جمعية عن طريق الدعوة' : 'إنشاء حساب جديد للجمعية'}
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

        {inviteInfo && (
          <div className="text-center text-sm text-gray-500 mb-6">
            قم بتسجيل الدخول باستخدام Google للانضمام إلى الجمعية
          </div>
        )}

        {!inviteInfo && !inviteToken && (
          <div className="text-center text-sm text-gray-500 mb-6">
            سيتم إنشاء جمعية جديدة عند تسجيل الدخول باستخدام Google
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 text-center mb-6">
            {error}
          </div>
        )}

        <div className="flex justify-center mb-6">
          <div ref={googleBtnRef}></div>
        </div>

        {loading && (
          <p className="text-center text-sm text-gray-500 mb-4">جاري تسجيل الدخول...</p>
        )}

        {checkingInvite && (
          <p className="text-center text-sm text-gray-500 mb-4">جاري التحقق من رمز الدعوة...</p>
        )}

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
