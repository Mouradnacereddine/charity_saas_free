import { useState, useEffect, useRef } from 'react';
import { authApi } from '../lib/api';
import { CheckCircle, LogIn, UserPlus } from 'lucide-react';

let googleInitialized = false;

export default function AuthPage({ onSuccess }: { onSuccess: () => void }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<{
    email: string; role: string;
    associationNameAr: string;
  } | null>(null);
  const [inviteToken, setInviteToken] = useState('');
  const [checkingInvite, setCheckingInvite] = useState(false);
  const [existingAccount, setExistingAccount] = useState(false);
  const [checkingAccount, setCheckingAccount] = useState(true);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const renderAttempted = useRef(false);

  // Detect invite code + check if user exists
  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/[?&]invite=([^&]+)/);
    const token = match ? decodeURIComponent(match[1]) : null;

    if (token) {
      setInviteToken(token);
      setInviteInfo({ email: '', role: '', associationNameAr: '...' });
      setCheckingInvite(true);
      authApi.inviteDetails(token)
        .then(res => setInviteInfo(res.data))
        .catch(err => setError(err.response?.data?.error || 'رمز الدعوة غير صالح'))
        .finally(() => setCheckingInvite(false));
      setCheckingAccount(false);
    } else {
      // Check if there's a recent auth token (user is returning)
      // We can't check the server without logging in, so we show the unified UI
      setCheckingAccount(false);
    }
  }, []);

  // Load Google Sign-In
  useEffect(() => {
    renderAttempted.current = false;
    const loadGoogle = () => {
      if (!window.google || !googleBtnRef.current) return;
      if (!googleInitialized) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '1074847403581-qs7gvuumokefa5cid6cu0m0cibt67nc4.apps.googleusercontent.com',
          callback: handleGoogleCredential,
        });
        googleInitialized = true;
      }
      if (!renderAttempted.current) {
        renderAttempted.current = true;
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline', size: 'large', width: 300,
          text: 'signin_with', locale: 'ar',
        });
      }
    };

    if (window.google) {
      loadGoogle();
    } else if (!document.getElementById('google-gsi-script')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = loadGoogle;
      document.head.appendChild(script);
    }
  }, []);

  const handleGoogleCredential = async (response: any) => {
    setLoading(true);
    setError('');
    try {
      // Use 'register' mode for everyone — it creates if new, logs in if existing
      const res = await authApi.googleLogin({
        credential: response.credential,
        inviteToken: inviteToken || undefined,
        mode: 'register',
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

  const isInvite = !!inviteInfo && !error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🕌</div>
          <h1 className="text-3xl font-bold text-primary-700">جمعية خيرية</h1>
          <p className="text-gray-500 mt-2">نظام إدارة شامل</p>
        </div>

        {/* Invite info banner */}
        {inviteInfo && inviteInfo.associationNameAr && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-800">
                دعوة للانضمام إلى: {inviteInfo.associationNameAr}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {inviteInfo.role === 'treasurer' ? 'أمين المال' : 'متطوع'}
              </p>
            </div>
          </div>
        )}

        {/* Main message */}
        <div className="text-center mb-6">
          {isInvite ? (
            <>
              <div className="flex justify-center mb-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600">قم بتسجيل الدخول باستخدام Google للانضمام إلى الجمعية</p>
            </>
          ) : (
            <>
              <div className="flex justify-center mb-3">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <LogIn className="w-6 h-6 text-primary-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600">
                قم بتسجيل الدخول باستخدام حساب Google
              </p>
              <p className="text-xs text-gray-400 mt-2">
                إذا كان لديك حساب بالفعل، سيتم تسجيل الدخول مباشرة.<br />
                إذا لم يكن لديك حساب، سيتم إنشاء جمعية جديدة تلقائياً.
              </p>
            </>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 text-center mb-6">
            {error}
          </div>
        )}

        <div className="flex justify-center mb-6">
          <div ref={googleBtnRef}></div>
        </div>

        {(loading || checkingInvite) && (
          <p className="text-center text-sm text-gray-500 mb-4">
            {checkingInvite ? 'جاري التحقق من رمز الدعوة...' : 'جاري تسجيل الدخول...'}
          </p>
        )}
      </div>
    </div>
  );
}
