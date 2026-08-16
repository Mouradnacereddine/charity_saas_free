import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { HeartHandshake, Lock } from 'lucide-react';
import { Card, Button, Input } from '../components/common/UI';
import { lemonSqueezyApi } from '../lib/api';

const QUICK_AMOUNTS = [5, 10, 25, 50];

/** Montants rapides en euros, ex : 5 -> "5 €" */
function formatQuickAmount(amount: number): string {
  return `${amount} €`;
}

export default function DonationPage() {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [amount, setAmount] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Vérifie que LemonSqueezy est configuré (GET /api/lemon-squeezy/config)
  useEffect(() => {
    let cancelled = false;
    lemonSqueezyApi
      .getConfig()
      .then((res) => {
        if (!cancelled) setEnabled(res.data.enabled);
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

    setLoading(true);
    setError('');
    try {
      const { data } = await lemonSqueezyApi.createCheckout({ amount: value });
      if (data.checkoutUrl) {
        window.location.assign(data.checkoutUrl);
      } else {
        setError(t('donation.error'));
      }
    } catch {
      setError(t('donation.error'));
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
                {QUICK_AMOUNTS.map((value) => (
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
                    {formatQuickAmount(value)}
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
                placeholder={t('donation.customPlaceholder')}
                aria-label={t('donation.customAmount')}
              />
              <p className="text-xs text-muted-foreground mt-1">{t('donation.customAmount')}</p>
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