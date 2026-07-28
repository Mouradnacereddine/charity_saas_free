import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../lib/api';
import { CheckCircle, LogIn, UserPlus } from 'lucide-react';

let googleInitialized = false;

declare global {
  interface Window {
    google?: any;
  }
}

export default function AuthPage({ onSuccess }: { onSuccess: () => void }) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<{
    email: string; role: string;
    associationName: string;
    associationLocale?: 'ar' | 'fr' | 'en';
  } | null>(null);
  const [inviteToken, setInviteToken] = useState('');
  const [checkingInvite, setCheckingInvite] = useState(false);
  const [checkingAccount, setCheckingAccount] = useState(true);
  const [assocName, setAssocName] = useState('');
  const [assocLocale, setAssocLocale] = useState<'ar' | 'fr' | 'en'>('ar');
  const [showAssocForm, setShowAssocForm] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const renderAttempted = useRef(false);
  const pendingCredential = useRef<string | null>(null);

  // Detect invite code
  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/[?&]invite=([^&]+)/);
    const token = match ? decodeURIComponent(match[1]) : null;

    if (token) {
      setInviteToken(token);
      setInviteInfo({ email: '', role: '', associationName: '...' });
      setCheckingInvite(true);
      authApi.inviteDetails(token)
        .then(res => {
          setInviteInfo(res.data);
          // If invite returns association locale, pre-fill the new user form with same locale
          if (res.data.associationLocale) setAssocLocale(res.data.associationLocale);
        })
        .catch(err => setError(err.response?.data?.error || t('auth.inviteCodeInvalid')))
        .finally(() => setCheckingInvite(false));
    }
    setCheckingAccount(false);
  }, []);

  // Load Google Sign-In
  useEffect(() => {
    const loadGoogle = () => {
      if (!window.google || !googleBtnRef.current) return;
      if (!googleInitialized) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '1074847403581-qs7gvuumokefa5cid6cu0m0cibt67nc4.apps.googleusercontent.com',
          callback: handleGoogleCredential,
          cancel_on_tap_outside: false,
        });
        googleInitialized = true;
      }
      if (!renderAttempted.current) {
        renderAttempted.current = true;
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline', size: 'large', width: 300,
          text: 'signin_with', locale: i18n.language === 'ar' ? 'ar' : i18n.language,
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
    return () => {
      googleInitialized = false;
    };
  }, [i18n.language]);

  const handleGoogleCredential = async (response: any) => {
    setLoading(true);
    setError('');
    // Réinitialiser le formulaire d'association pour un nouveau compte
    setShowAssocForm(false);
    setAssocNameAr('');
    setAssocName('');

    const hash = window.location.hash;
    const match = hash.match(/[?&]invite=([^&]+)/);
    const currentInviteToken = match ? decodeURIComponent(match[1]) : null;

    try {
      const res = await authApi.googleLogin({
        credential: response.credential,
        inviteToken: currentInviteToken || undefined,
        mode: 'login',
      });
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      queryClient.resetQueries({ queryKey: ['auth', 'me'] });
      onSuccess();
    } catch (err: any) {
      const hasInviteInUrl = window.location.hash.includes('invite=');
      if (err.response?.status === 404 && !hasInviteInUrl) {
        pendingCredential.current = response.credential;
        setShowAssocForm(true);
        setError('');
      } else {
        setError(err.response?.data?.error || t('auth.googleLoginFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterWithName = async () => {
    if (!assocName.trim() || !pendingCredential.current) return;
    setLoading(true);
    setError('');
    try {
      const res = await authApi.googleLogin({
        credential: pendingCredential.current,
        mode: 'register',
        associationName: assocName,
        locale: assocLocale,
      });
      pendingCredential.current = null;
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      queryClient.resetQueries({ queryKey: ['auth', 'me'] });
      // Synchronize UI language with the association locale
      if (assocLocale) i18n.changeLanguage(assocLocale);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || t('auth.createAssociationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const isInvite = !!inviteInfo && !error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 p-4">
      <div className="w-full max-w-md bg-card text-card-foreground rounded-2xl shadow-xl border border-border p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🕌</div>
          <h1 className="text-3xl font-bold text-primary">{t('app.title')}</h1>
          <p className="text-muted-foreground mt-2">{t('app.subtitle')}</p>
        </div>

        {/* Invite info banner */}
        {inviteInfo && inviteInfo.associationName && (
          <div className="bg-success/10 border border-success/30 rounded-lg p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-success shrink-0" />
            <div>
              <p className="text-sm font-medium text-success">
                {t('auth.inviteBanner')} {inviteInfo.associationName}
              </p>
              <p className="text-xs text-success/80 mt-1">
                {inviteInfo.role === 'treasurer' ? t('userMenu.treasurer') : t('userMenu.volunteer')}
              </p>
            </div>
          </div>
        )}

        {/* Association name form (shown after Google auth for new users) — un seul champ, direction selon la locale */}
        {showAssocForm ? (
          <div className="mb-6">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-sm font-medium text-foreground text-center mb-4">
              {t('auth.newUserTitle')}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{t('auth.assocName')}</label>
                <input
                  type="text"
                  value={assocName}
                  onChange={(e) => setAssocName(e.target.value)}
                  placeholder={t('auth.namePlaceholder')}
                  className="w-full px-3 py-2 text-sm border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  dir={assocLocale === 'ar' ? 'rtl' : 'ltr'}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{t('settings.locale')}</label>
                <select
                  value={assocLocale}
                  onChange={(e) => setAssocLocale(e.target.value as 'ar' | 'fr' | 'en')}
                  className="w-full px-3 py-2 text-sm border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                >
                  <option value="ar">{t('settings.localeAr')}</option>
                  <option value="fr">{t('settings.localeFr')}</option>
                  <option value="en">{t('settings.localeEn')}</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">{t('settings.localeHint')}</p>
              </div>
              <button
                onClick={handleRegisterWithName}
                disabled={loading || !assocName.trim()}
                className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? t('auth.creating') : t('auth.createAssociation')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              {isInvite ? (
                <>
                  <div className="flex justify-center mb-3">
                    <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                      <UserPlus className="w-6 h-6 text-success" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{t('auth.loginGoogle')}</p>
                </>
              ) : (
                <>
                  <div className="flex justify-center mb-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <LogIn className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('auth.loginGoogleButton')}
                  </p>
                  <p className="text-xs text-muted-foreground/80 mt-2">
                    {t('auth.loginInfo')}
                  </p>
                </>
              )}
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg p-3 text-center mb-6">
                {error}
              </div>
            )}

            <div className="flex justify-center mb-3">
              <div ref={googleBtnRef}></div>
            </div>
            {error && !showAssocForm && (
              <button
                onClick={() => {
                  if (window.google?.accounts?.id) {
                    window.google.accounts.id.disableAutoSelect();
                    googleInitialized = false;
                    renderAttempted.current = false;
                    setTimeout(() => {
                      if (window.google?.accounts?.id) {
                        window.google.accounts.id.initialize({
                          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '1074847403581-qs7gvuumokefa5cid6cu0m0cibt67nc4.apps.googleusercontent.com',
                          callback: handleGoogleCredential,
                          cancel_on_tap_outside: false,
                        });
                        googleInitialized = true;
                        window.google.accounts.id.renderButton(googleBtnRef.current!, {
                          theme: 'outline', size: 'large', width: 300,
                          text: 'signin_with', locale: i18n.language === 'ar' ? 'ar' : i18n.language,
                        });
                      }
                    }, 300);
                  }
                }}
                className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                {t('auth.useAnotherAccount')}
              </button>
            )}

            {(loading || checkingInvite) && (
              <p className="text-center text-sm text-muted-foreground mb-4">
                {checkingInvite ? t('auth.checkingInvite') : t('auth.loggingIn')}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
