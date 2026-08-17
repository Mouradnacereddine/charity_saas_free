import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { HeartHandshake, Lock } from 'lucide-react';
import { Card, Button, Input } from '../components/common/UI';
import { lemonSqueezyApi } from '../lib/api';

// Devise par défaut : DZD (dinar algérien) — devise réelle du store
// LemonSqueezy 453836 « charity-saas-free » (vérifiée via API). Surchargée
// par GET /api/lemon-squeezy/config si l'env LEMONSQUEEZY_CURRENCY diffère.
const DEFAULT_CURRENCY = 'DZD';

// Montants rapides par devise (unités de la devise, pas des centimes).
const QUICK_AMOUNTS_BY_CURRENCY: Record<string, number[]> = {
  DZD: [500, 1000, 2000, 5000], // ≈ 3,5 € à 35 €
  EUR: [5, 10, 25, 50],
};

const CURRENCY_SYMBOL: Record<string, string> = {
  DZD: 'دج',
  EUR: '€',
};

const DEFAULT_AMOUNT_BY_CURRENCY: Record<string, number> = {
  DZD: 1000,
  EUR: 10,
};

function formatQuickAmount(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOL[currency] || currency;
  return `${amount} ${symbol}`;
}

export default function DonationPage() {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [currency, setCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [minAmount, setMinAmount] = useState<number>(66);
  const [amount, setAmount] = useState<number>(DEFAULT_AMOUNT_BY_CURRENCY[DEFAULT_CURRENCY]);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const quickAmounts = QUICK_AMOUNTS_BY_CURRENCY[currency] || QUICK_AMOUNTS_BY_CURRENCY[DEFAULT_CURRENCY];
  const symbol = CURRENCY_SYMBOL[currency] || currency;

  // Vérifie que LemonSqueezy est configuré (GET /api/lemon-squeezy/config)
  useEffect(() => {
    let cancelled = false;
    lemonSqueezyApi
      .getConfig()
      .then((res) => {
        if (cancelled) return;
        setEnabled(res.data.enabled);
        if (res.data.currency) {
          setCurrency(res.data.currency);
          setAmount(DEFAULT_AMOUNT_BY_CURRENCY[res.data.currency] ?? DEFAULT_AMOUNT_BY_CURRENCY[DEFAULT_CURRENCY]);
          if (typeof res.data.minAmount === 'number') setMinAmount(res.data.minAmount);
        }
      })
      .catch(() => {
        if (!cancelled) setEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleQuickAmount = (value: number) => {
    setAmount(value);
    setCustomAmount('');
    setError('');
  };

  const handleCustomChange = (value: string) => {
    setCustomAmount(value);
    // Met à jour le montant sélectionné si la saisie est un nombre valide
    const parsed = parseFloat(value.replace(',', '.'));
    if (!Number.isNaN(parsed) && parsed > 0) setAmount(parsed);
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const value = customAmount ? parseFloat(customAmount.replace(',', '.')) : amount;
    if (!value || value <= 0) {
      setError(t('donation.invalidAmount'));
      return;
    }
    if (value < minAmount) {
      setError(t('donation.minAmount', { amount: minAmount, currency: symbol }));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data } = await lemonSqueezyApi.createCheckout({ amount: value });
      if (data.checkoutUrl) {
        window.location.assign(data.checkoutUrl);
      } else {
        setError(t('donation.error'));
      }
    } catch (err: unknown) {
      // Propager la VRAIE raison renvoyée par le backend (ex : 503 « produit de don
      // non configuré », 400 « montant minimal », 502 « échec API LemonSqueezy »)
      // au lieu d'afficher le message générique — l'utilisateur (et le PDG) doit
      // comprendre pourquoi le don échoue. Fallback i18n si aucune raison précise.
      const apiError = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(apiError || t('donation.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="auto" className="max-w-lg mx-auto mt-4 sm:mt-8">
      <Card title={t('donation.title')} titleAr={t('donation.title')} className="overflow-hidden">
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground leading-relaxed">{t('donation.subtitle')}</p>

          {enabled === false && (
            <p className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
              {t('donation.disabled')}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {t('donation.quickAmounts')}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleQuickAmount(value)}
                    className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      customAmount === '' && amount === value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-foreground border-border hover:bg-muted'
                    }`}
                  >
                    {formatQuickAmount(value, currency)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Input
                type="text"
                inputMode="decimal"
                dir="ltr"
                className="text-center text-lg"
                value={customAmount}
                onChange={(e) => handleCustomChange(e.target.value)}
                placeholder={t('donation.customPlaceholder', { symbol })}
                aria-label={t('donation.customAmount')}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('donation.customAmount')} — {t('donation.minAmount', { amount: minAmount, currency: symbol })}
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={enabled === false || loading}
            >
              <HeartHandshake className="w-5 h-5" />
              {loading ? t('donation.loading') : t('donation.submit')}
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="w-3.5 h-3.5" />
              {t('donation.secure')}
            </p>
          </form>
        </div>
      </Card>
    </div>
  );
}
