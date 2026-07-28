import { useState, useEffect, useMemo } from 'react';
import i18nInstance from '../i18n';
import { Card, StatCard, LoadingSpinner, Badge, Button } from '../components/common/UI';
import { SmartText } from '../components/common/SmartText';
import { localizedDesc } from '../utils/helpers';

// Use i18nInstance.t directly instead of the hook-based t to avoid
// "t is not a function" errors during React Query re-renders (react-i18next#1950)
const t = (key: string, options?: Record<string, any> | string) => {
  try { return i18nInstance.t(key, options); }
  catch {
    if (typeof options === 'string') return options;
    return key;
  }
};
import { useTransactions } from '../hooks/useFinance';
import { useDonors } from '../hooks/useDonors';
import { useAuth } from '../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { caissesApi } from '../lib/api';
import { formatCurrency, formatDate } from '../utils/helpers';
import { printAnalyticsReport } from '../lib/receipt';
import {
  Calendar,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Info,
  CheckCircle,
  Activity,
  Search,
  Percent,
} from 'lucide-react';
import type { Transaction, Caisse } from '../types';

export default function AnalyticsPage() {
  const [quickFilter, setQuickFilter] = useState<'this_month' | 'last_3_months' | 'this_year' | 'custom'>('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState<'caisses' | 'subcategories' | 'log'>('caisses');

  const [searchTerm, setSearchTerm] = useState('');
  const [logCaisseFilter, setLogCaisseFilter] = useState('');
  const [logTypeFilter, setLogTypeFilter] = useState('');
  const [logSourceFilter, setLogSourceFilter] = useState('');

  const { association } = useAuth();
  const { data: transactions = [], isLoading: txLoading } = useTransactions();
  const { data: caisses = [], isLoading: caissesLoading } = useQuery<Caisse[]>({
    queryKey: ['caisses'],
    queryFn: () => caissesApi.list().then((r) => r.data),
  });
  const { data: donors = [], isLoading: donorsLoading } = useDonors();

  useEffect(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (quickFilter === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (quickFilter === 'last_3_months') {
      start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (quickFilter === 'this_year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
    } else {
      return;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, [quickFilter]);

  const filteredTx = useMemo(() => {
    if (!startDate || !endDate) return transactions;
    return transactions.filter((tx: Transaction) => {
      const txDate = tx.date.split('T')[0];
      return txDate >= startDate && txDate <= endDate;
    });
  }, [transactions, startDate, endDate]);

  const stats = useMemo(() => {
    let credits = 0;
    let debits = 0;
    filteredTx.forEach((tx) => {
      if (tx.status === 'cancelled') return;
      if (tx.type === 'credit') credits += tx.amount;
      else if (tx.type === 'debit') debits += tx.amount;
    });
    const balance = credits - debits;
    const ratio = credits > 0 ? (debits / credits) * 100 : 0;
    return { credits, debits, balance, ratio };
  }, [filteredTx]);

  const monthlyProgression = useMemo(() => {
    const map: Record<string, { month: string; credits: number; debits: number }> = {};
    filteredTx.forEach((tx) => {
      if (tx.status === 'cancelled') return;
      const month = tx.date.substring(0, 7);
      if (!map[month]) {
        map[month] = { month, credits: 0, debits: 0 };
      }
      if (tx.type === 'credit') map[month].credits += tx.amount;
      else map[month].debits += tx.amount;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredTx]);

  const caisseBreakdown = useMemo(() => {
    return caisses.map((c) => {
      let periodCredits = 0;
      let periodDebits = 0;
      filteredTx.forEach((tx) => {
        if (tx.status === 'cancelled') return;
        if (tx.caisseId === c.id) {
          if (tx.type === 'credit') periodCredits += tx.amount;
          else periodDebits += tx.amount;
        }
      });
      return {
        id: c.id,
        name: c.name,
        actualBalance: c.balance,          // real balance from database
        periodCredits,
        periodDebits,
        periodFlow: periodCredits - periodDebits,
      };
    });
  }, [caisses, filteredTx]);

  const fundSourceBreakdown = useMemo(() => {
    let bankCredits = 0;
    let bankDebits = 0;
    let cashCredits = 0;
    let cashDebits = 0;

    filteredTx.forEach((tx) => {
      if (tx.status === 'cancelled') return;
      if (tx.fundSource === 'banque') {
        if (tx.type === 'credit') bankCredits += tx.amount;
        else bankDebits += tx.amount;
      } else {
        if (tx.type === 'credit') cashCredits += tx.amount;
        else cashDebits += tx.amount;
      }
    });

    return {
      bank: { credits: bankCredits, debits: bankDebits, net: bankCredits - bankDebits },
      cash: { credits: cashCredits, debits: cashDebits, net: cashCredits - cashDebits },
    };
  }, [filteredTx]);

  const donorConcentration = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTx.forEach((tx) => {
      if (tx.status === 'cancelled' || tx.type !== 'credit' || !tx.donorId) return;
      map[tx.donorId] = (map[tx.donorId] || 0) + tx.amount;
    });

    let maxDonorId = '';
    let maxAmount = 0;
    Object.entries(map).forEach(([id, amt]) => {
      if (amt > maxAmount) {
        maxAmount = amt;
        maxDonorId = id;
      }
    });

    const maxDonor = donors.find((d) => d.id === maxDonorId);
    const share = stats.credits > 0 ? (maxAmount / stats.credits) * 100 : 0;

    return {
      name: maxDonor ? `${maxDonor.firstName} ${maxDonor.lastName}` : null,
      amount: maxAmount,
      share,
      isRisk: share > 50,
    };
  }, [filteredTx, donors, stats.credits]);

  const velocity = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1);
    const count = filteredTx.length;
    return {
      days: diff,
      avgPerDay: parseFloat((count / diff).toFixed(1)),
      total: count,
    };
  }, [filteredTx, startDate, endDate]);

  const getSubCategoryNameAr = (caisseId: string, subId?: string) => {
    if (!subId) return t('common.general');
    const caisse = caisses.find((c) => c.id === caisseId);
    if (!caisse) return t('common.general');
    const sub = caisse.subCategories?.find((s) => s.id === subId);
    return sub ? sub.name : 'عام';
  };

  const groupedByCaisse = useMemo(() => {
    const groups: Record<string, { caisse: Caisse | undefined; txs: Transaction[]; credits: number; debits: number }> = {};
    filteredTx.forEach((tx) => {
      if (!groups[tx.caisseId]) {
        groups[tx.caisseId] = {
          caisse: caisses.find((c) => c.id === tx.caisseId),
          txs: [],
          credits: 0,
          debits: 0,
        };
      }
      groups[tx.caisseId].txs.push(tx);
      if (tx.status !== 'cancelled') {
        if (tx.type === 'credit') groups[tx.caisseId].credits += tx.amount;
        else groups[tx.caisseId].debits += tx.amount;
      }
    });
    return Object.values(groups);
  }, [filteredTx, caisses]);

  const groupedBySubcategory = useMemo(() => {
    const groups: Record<string, { subNameAr: string; caisseNameAr: string; txs: Transaction[]; credits: number; debits: number }> = {};
    filteredTx.forEach((tx) => {
      const subNameAr = getSubCategoryNameAr(tx.caisseId, tx.subCategoryId);
      const caisse = caisses.find((c) => c.id === tx.caisseId);
      const caisseNameAr = caisse ? caisse.name : t('caisses.noFunds');
      const key = `${tx.caisseId}-${tx.subCategoryId || 'general'}`;
      if (!groups[key]) {
        groups[key] = {
          subNameAr,
          caisseNameAr,
          txs: [],
          credits: 0,
          debits: 0,
        };
      }
      groups[key].txs.push(tx);
      if (tx.status !== 'cancelled') {
        if (tx.type === 'credit') groups[key].credits += tx.amount;
        else groups[key].debits += tx.amount;
      }
    });
    return Object.values(groups);
  }, [filteredTx, caisses]);

  const logTx = useMemo(() => {
    return filteredTx.filter((tx) => {
      const matchesSearch =
        (tx.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.receiptNumber && tx.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCaisse = logCaisseFilter === '' || tx.caisseId === logCaisseFilter;
      const matchesType = logTypeFilter === '' || tx.type === logTypeFilter;
      const matchesSource = logSourceFilter === '' || tx.fundSource === logSourceFilter;
      return matchesSearch && matchesCaisse && matchesType && matchesSource;
    });
  }, [filteredTx, searchTerm, logCaisseFilter, logTypeFilter, logSourceFilter]);

  if (txLoading || caissesLoading || donorsLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('analytics.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('analytics.subtitle')}
          </p>
        </div>
      </div>

      <Card titleAr={t('analytics.periodFilter')} className="no-print">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="w-full md:w-1/4">
            <label className="block text-sm font-medium text-foreground mb-1">{t('analytics.periodFilter')}</label>
            <select
              value={quickFilter}
              onChange={(e) => setQuickFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="this_month">{t('analytics.currentMonth')}</option>
              <option value="last_3_months">{t('analytics.last3Months')}</option>
              <option value="this_year">{t('analytics.currentYear')}</option>
              <option value="custom">{t('analytics.customDate')}</option>
            </select>
          </div>
          <div className="w-full md:w-1/4">
            <label className="block text-sm font-medium text-foreground mb-1">{t('analytics.fromDate')}</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setQuickFilter('custom');
              }}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="w-full md:w-1/4">
            <label className="block text-sm font-medium text-foreground mb-1">{t('analytics.toDate')}</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setQuickFilter('custom');
              }}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="md:mr-auto flex gap-2 w-full md:w-auto">
            <Button
              variant="secondary"
              onClick={() => {
                const totalCredits = filteredTx.filter((t: any) => t.status !== 'cancelled' && t.type === 'credit').reduce((s: number, t: any) => s + t.amount, 0);
                const totalDebits = filteredTx.filter((t: any) => t.status !== 'cancelled' && t.type === 'debit').reduce((s: number, t: any) => s + t.amount, 0);
                const MONTHS = ['analytics.january','analytics.february','analytics.march','analytics.april','analytics.may','analytics.june','analytics.july','analytics.august','analytics.september','analytics.october','analytics.november','analytics.december'];
                let bodyRows = `<div class="section-title">${t('analytics.byFund')}</div>`;
                caisseBreakdown.forEach((c: any) => {
                  const sum = c.periodCredits + c.periodDebits;
                  const credPct = sum > 0 ? (c.periodCredits / sum) * 100 : 0;
                  bodyRows += `<div class="bar-row"><span class="bar-label">${c.name}</span><div class="bar-track"><div class="bar-cred" style="width:${credPct}%"></div><div class="bar-deb" style="width:${100 - credPct}%"></div></div><span class="bar-amt">${formatCurrency(c.periodFlow)}</span></div>`;
                });
                bodyRows += `<div class="section-title">${t('analytics.detailedLog')}</div><div class="section"><table class="data-table"><thead><tr><th>${t('common.date')}</th><th>${t('dashboard.type')}</th><th>${t('common.amount')}</th><th>${t('receipt.description')}</th><th>${t('dashboard.fund')}</th></tr></thead><tbody>`;
                filteredTx.slice(0, 20).forEach((tx: any) => {
                  const caisse = caisses.find((c: any) => c.id === tx.caisseId);
                  bodyRows += `<tr><td>${formatDate(tx.date)}</td><td>${tx.type === 'credit' ? t('dashboard.deposit') : t('dashboard.withdrawal')}</td><td class="${tx.type === 'credit' ? 'credit' : 'debit'}">${formatCurrency(tx.amount)}</td><td>${tx.description || '—'}</td><td>${caisse?.name || '—'}</td></tr>`;
                });
                bodyRows += '</tbody></table></div>';
                const isLtr = i18nInstance.language !== 'ar';
                printAnalyticsReport({
                  assocName: association?.name || t('app.title'),
                  title: t('analytics.title'),
                  periodLabel:  quickFilter === 'this_month' ? t('analytics.currentMonth') : quickFilter === 'last_3_months' ? t('analytics.last3Months') : quickFilter === 'this_year' ? t('analytics.currentYear') : `${startDate} ${t('medical.toDate').toLowerCase()} ${endDate}`,
                  dateLabel: new Date().toLocaleDateString(i18nInstance.language === 'ar' ? 'ar-DZ' : i18nInstance.language === 'fr' ? 'fr-DZ' : 'en-DZ'),
                  credits: formatCurrency(totalCredits),
                  debits: formatCurrency(totalDebits),
                  balance: formatCurrency(totalCredits - totalDebits),
                  ratio: `${totalCredits > 0 ? ((totalDebits / totalCredits) * 100).toFixed(1) : '0.0'}%`,
                  bodyRows,
                  labels: {
                    totalIncome: t('analytics.totalIncome'),
                    totalExpenses: t('analytics.totalExpenses'),
                    netFinancial: t('analytics.netFinancial'),
                    expenseToIncome: t('analytics.expenseToIncome'),
                    generatedBy: t('receipt.generatedBy'),
                    printReport: t('receipt.printReport')
                  },
                  dir: isLtr ? 'ltr' : 'rtl',
                  lang: i18nInstance.language
                });
              }}
              size="md"
              className="w-full md:w-auto"
            >
              {t('receipt.printReport')}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('analytics.totalIncome')}
          value={formatCurrency(stats.credits)}
          icon={<ArrowUpRight className="w-6 h-6" />}
          color="bg-primary"
          subtitle={`${filteredTx.filter((t) => t.type === 'credit').length} ${t('analytics.depositCount')}`}
        />
        <StatCard
          title={t('analytics.totalExpenses')}
          value={formatCurrency(stats.debits)}
          icon={<ArrowDownRight className="w-6 h-6" />}
          color="bg-destructive"
          subtitle={`${filteredTx.filter((t) => t.type === 'debit').length} ${t('analytics.withdrawalCount')}`}
        />
        <StatCard
          title={t('analytics.netFinancial')}
          value={formatCurrency(stats.balance)}
          icon={<TrendingUp className="w-6 h-6" />}
          color="bg-primary"
          subtitle={stats.balance >= 0 ? t('analytics.surplus') : t('analytics.deficit')}
        />
        <StatCard
          title={t('analytics.expenseToIncome')}
          value={`${stats.ratio.toFixed(1)}%`}
          icon={<Percent className="w-6 h-6" />}
          color="bg-primary"
          subtitle={
            stats.credits === 0
              ? t('common.noOperations')
              : stats.ratio > 85
                ? t('analytics.criticalSpending')
                : stats.ratio > 50
                  ? t('analytics.averageSpending')
                  : t('analytics.excellentSpending')
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card titleAr={t('analytics.monthlyEvolution')} className="lg:col-span-2">
          {monthlyProgression.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground/70">
              <Calendar className="w-12 h-12 mb-2 stroke-1" />
              <p className="text-sm">{t('analytics.noChartData')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-4 text-xs font-semibold justify-end">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-success rounded-sm" /> {t('analytics.income')}</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-destructive rounded-sm" /> {t('analytics.expenses')}</span>
              </div>
              {/* Table-based bar chart: never overlaps, always readable */}
              <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '420px' }}>
                <table className="w-full text-xs border-collapse" dir="ltr">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr className="border-b border-border">
                      <th className="text-start py-2 px-2 font-semibold text-muted-foreground w-24">{t('analytics.month')}</th>
                      <th className="text-start py-2 px-2 font-semibold text-muted-foreground w-20">{t('analytics.income')}</th>
                      <th className="py-2 px-2 w-1/2 min-w-[200px]"></th>
                      <th className="text-left py-2 px-2 font-semibold text-muted-foreground w-20">{t('analytics.expenses')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const MONTHS = ['analytics.january','analytics.february','analytics.march','analytics.april','analytics.may','analytics.june','analytics.july','analytics.august','analytics.september','analytics.october','analytics.november','analytics.december'];
                      const rawMax = Math.max(...monthlyProgression.map(m => Math.max(m.credits, m.debits)), 1);
                      const barMax = Math.max(rawMax * 1.15, 1);

                      return monthlyProgression.map((item, idx) => {
                        const [yr, mo] = item.month.split('-');
                        const monthName = t(MONTHS[parseInt(mo) - 1]);
                        const credPct = Math.max(0, Math.min(100, (item.credits / barMax) * 100));
                        const debPct = Math.max(0, Math.min(100, (item.debits / barMax) * 100));
                        const credBarW = Math.max(credPct, item.credits > 0 ? 3 : 0);
                        const debBarW = Math.max(debPct, item.debits > 0 ? 3 : 0);

                        return (
                          <tr key={idx} className="border-b border-border hover:bg-muted transition-colors">
                            <td className="py-2.5 px-2 text-foreground font-medium text-start whitespace-nowrap">
                              {monthName} {yr}
                            </td>
                            <td className="py-2.5 px-2 text-success-foreground font-semibold text-start whitespace-nowrap" title={formatCurrency(item.credits)}>
                              {item.credits >= 1000000
                                ? (item.credits / 1000000).toFixed(1) + 'M'
                                : item.credits >= 1000
                                ? (item.credits / 1000).toFixed(1) + 'k'
                                : item.credits.toFixed(0)}
                            </td>
                            <td className="py-2.5 px-1">
                              <div className="flex items-center gap-0.5" style={{ minHeight: '18px' }}>
                                <div className="h-3 bg-success rounded-sm transition-all" style={{ width: credBarW + '%', minWidth: item.credits > 0 ? '3px' : '0' }} />
                                <div className="h-3 bg-destructive rounded-sm transition-all" style={{ width: debBarW + '%', minWidth: item.debits > 0 ? '3px' : '0' }} />
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-destructive font-semibold text-left whitespace-nowrap" title={formatCurrency(item.debits)}>
                              {item.debits >= 1000000
                                ? (item.debits / 1000000).toFixed(1) + 'M'
                                : item.debits >= 1000
                                ? (item.debits / 1000).toFixed(1) + 'k'
                                : item.debits.toFixed(0)}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>

        <Card titleAr={t('analytics.fundingComparison')}>
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <div className="relative w-48 h-48">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="44" className="stroke-gray-100 fill-none" strokeWidth="8" />
                  {(() => {
                    const bankC = fundSourceBreakdown.bank.credits;
                    const cashC = fundSourceBreakdown.cash.credits;
                    const total = bankC + cashC;
                    if (total <= 0) return <circle cx="50" cy="50" r="44" className="stroke-gray-200 fill-none" strokeWidth="8" />;
                    const circ = 2 * Math.PI * 44;
                    const bankPct = bankC / total;
                    const bankLen = bankPct * circ;
                    return (
                      <>
                        <circle cx="50" cy="50" r="44" className="stroke-primary-500 fill-none" strokeWidth="8"
                          strokeDasharray={`${bankLen} ${circ - bankLen}`} strokeDashoffset="0" strokeLinecap="butt" />
                        <circle cx="50" cy="50" r="44" className="stroke-amber-400 fill-none" strokeWidth="8"
                          strokeDasharray={`${circ - bankLen} ${bankLen}`} strokeDashoffset={`-${bankLen}`} strokeLinecap="butt" />
                      </>
                    );
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  {(() => {
                    const totalFunding = fundSourceBreakdown.bank.credits + fundSourceBreakdown.cash.credits;
                    if (totalFunding <= 0) return <><span className="text-xs text-muted-foreground/70">{t('analytics.noIncome')}</span></>;
                    const bankPct = ((fundSourceBreakdown.bank.credits / totalFunding) * 100).toFixed(0);
                    const cashPct = ((fundSourceBreakdown.cash.credits / totalFunding) * 100).toFixed(0);
                    return (
                      <>
                        <span className="text-xs text-muted-foreground/70 mb-1">{t('analytics.fundingSources')}</span>
                        <span className="text-sm font-semibold text-primary">🔵 {t('dashboard.bank')} {bankPct}%</span>
                        <span className="text-sm font-semibold text-warning-foreground">🟠 {t('dashboard.cash')} {cashPct}%</span>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-accent border border-accent/30 rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-foreground text-sm flex items-center gap-1">
                    <span className="w-3 h-3 bg-primary-500 rounded-full" /> {t('dashboard.bank')} (Banque)
                  </span>
                  <span className="text-xs text-muted-foreground">{t('analytics.netPeriodBalance')}</span>
                </div>
                <div className="flex justify-between text-xs mt-2">
                  <span className="text-success-foreground">{t('analytics.income')}: {formatCurrency(fundSourceBreakdown.bank.credits)}</span>
                  <span className="text-destructive">{t('analytics.expenses')}: {formatCurrency(fundSourceBreakdown.bank.debits)}</span>
                </div>
                <div className="text-left font-bold text-sm text-foreground border-t border-accent/30/50 mt-1.5 pt-1" dir="ltr">
                  {formatCurrency(fundSourceBreakdown.bank.net)}
                </div>
              </div>

              <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-foreground text-sm flex items-center gap-1">
                    <span className="w-3 h-3 bg-warning rounded-full" /> {t('finance.cashFund')} (Cash)
                  </span>
                  <span className="text-xs text-muted-foreground">{t('analytics.netPeriodBalance')}</span>
                </div>
                <div className="flex justify-between text-xs mt-2">
                  <span className="text-success-foreground">{t('analytics.income')}: {formatCurrency(fundSourceBreakdown.cash.credits)}</span>
                  <span className="text-destructive">{t('analytics.expenses')}: {formatCurrency(fundSourceBreakdown.cash.debits)}</span>
                </div>
                <div className="text-left font-bold text-sm text-foreground border-t border-warning/30/50 mt-1.5 pt-1" dir="ltr">
                  {formatCurrency(fundSourceBreakdown.cash.net)}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card titleAr={t('analytics.flowDistribution')}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {caisseBreakdown.map((c) => {
            const sum = c.periodCredits + c.periodDebits;
            const credPercent = sum > 0 ? (c.periodCredits / sum) * 100 : 0;
            const debPercent = sum > 0 ? (c.periodDebits / sum) * 100 : 0;

            return (
              <div key={c.id} className="p-4 bg-muted border border-border rounded-xl space-y-3">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-foreground">{c.name}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    c.actualBalance >= 0 ? 'bg-success/10 text-success-foreground' : 'bg-destructive/10 text-destructive'
                  }`}>
                    {t('analytics.actualBalance', 'رصيد فعلي')}: {formatCurrency(c.actualBalance)}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden flex">
                    <div className="bg-success h-full" style={{ width: `${credPercent}%` }} />
                    <div className="bg-destructive h-full" style={{ width: `${debPercent}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground/70">
                    <span>{t('analytics.periodIncome')}: {formatCurrency(c.periodCredits)}</span>
                    <span>{t('analytics.periodExpenses')}: {formatCurrency(c.periodDebits)}</span>
                  </div>
                </div>
                <div className={`text-xs font-medium ${c.periodFlow >= 0 ? 'text-success-foreground' : 'text-destructive'}`}>
                  {t('analytics.netPeriodFlow')}: {c.periodFlow >= 0 ? '+' : ''}{formatCurrency(c.periodFlow)}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card titleAr={t('analytics.smartAnalytics')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            {stats.ratio > 85 ? (
              <div className="flex gap-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
                <AlertTriangle className="w-5 h-5 shrink-0 text-destructive" />
                <div>
                  <h4 className="font-bold">{t('analytics.criticalAlert')}</h4>
                  <SmartText
                    i18nKey="analytics.criticalText"
                    values={{ ratio: stats.ratio.toFixed(1) }}
                    className="mt-1 text-xs text-destructive leading-relaxed"
                  />
                </div>
              </div>
            ) : stats.ratio > 50 ? (
              <div className="flex gap-3 p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm text-warning-foreground">
                <Info className="w-5 h-5 shrink-0 text-warning-foreground" />
                <div>
                  <h4 className="font-bold">{t('analytics.averageNote')}</h4>
                  <SmartText
                    i18nKey="analytics.averageText"
                    values={{ ratio: stats.ratio.toFixed(1) }}
                    className="mt-1 text-xs text-warning-foreground leading-relaxed"
                  />
                </div>
              </div>
            ) : (
              <div className="flex gap-3 p-3 bg-success/10 border border-success/30 rounded-lg text-sm text-success-foreground">
                <CheckCircle className="w-5 h-5 shrink-0 text-success" />
                <div>
                  <h4 className="font-bold">{t('analytics.excellentIndicator')}</h4>
                  <SmartText
                    i18nKey="analytics.excellentText"
                    values={{ ratio: stats.ratio.toFixed(1) }}
                    className="mt-1 text-xs text-success-foreground leading-relaxed"
                  />
                </div>
              </div>
            )}

            {(() => {
              const deficits = caisseBreakdown.filter((c) => c.periodFlow < 0);
              if (deficits.length === 0) return null;
              return (
                <div className="flex gap-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-destructive" />
                  <div>
                    <h4 className="font-bold">{t('analytics.fundDeficit')}</h4>
                    <SmartText
                      i18nKey="analytics.deficitText"
                      values={{ funds: deficits.map((d) => d.name).join('، ') }}
                      className="mt-1 text-xs text-destructive leading-relaxed"
                    />
                  </div>
                </div>
              );
            })()}

            {donorConcentration.isRisk && (
              <div className="flex gap-3 p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm text-warning-foreground">
                <AlertTriangle className="w-5 h-5 shrink-0 text-warning" />
                <div>
                  <h4 className="font-bold">{t('analytics.donorConcentration')}</h4>
                  <SmartText
                    i18nKey="analytics.donorRiskText"
                    values={{
                      donor: donorConcentration.name,
                      share: donorConcentration.share.toFixed(1),
                      amount: formatCurrency(donorConcentration.amount),
                    }}
                    className="mt-1 text-xs text-warning-foreground leading-relaxed"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex gap-3 p-3 bg-accent border border-accent/30 rounded-lg text-sm text-accent-foreground">
              <TrendingUp className="w-5 h-5 shrink-0 text-accent-foreground" />
              <div>
                <h4 className="font-bold">{t('analytics.safetyMargin')}</h4>
                <SmartText
                  i18nKey="analytics.safetyMarginText"
                  values={{ reserve: formatCurrency(stats.credits * 0.2) }}
                  className="mt-1 text-xs text-accent-foreground leading-relaxed"
                />
              </div>
            </div>

            <div className="flex gap-3 p-3 bg-accent border border-accent/30 rounded-lg text-sm text-accent-foreground">
              <Activity className="w-5 h-5 shrink-0 text-accent-foreground" />
              <div>
                <h4 className="font-bold">{t('analytics.velocity')}</h4>
                <SmartText
                  i18nKey="analytics.velocityText"
                  values={{
                    total: velocity.total,
                    days: velocity.days,
                    avgPerDay: velocity.avgPerDay,
                  }}
                  className="mt-1 text-xs text-accent-foreground leading-relaxed"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card titleAr={t('analytics.detailedLog')}>
        <div className="flex border-b border-border mb-6 no-print">
          <button
            onClick={() => setActiveTab('caisses')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'caisses'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            {t('analytics.byFund')}
          </button>
          <button
            onClick={() => setActiveTab('subcategories')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'subcategories'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            {t('analytics.byCategory')}
          </button>
          <button
            onClick={() => setActiveTab('log')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'log'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            {t('analytics.detailedLog')}
          </button>
        </div>

        {activeTab === 'caisses' && (
          <div className="space-y-6">
            {groupedByCaisse.map((group) => (
              <div key={group.caisse?.id || 'unknown'} className="border border-border rounded-lg overflow-hidden bg-card">
                <div className="bg-muted px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground font-bold text-base">{group.caisse?.name || t('caisses.noFunds')}</span>
                    <span className="text-xs text-muted-foreground/70">({group.caisse?.reference || '—'})</span>
                  </div>
                  <div className="flex gap-4 text-xs font-semibold">
                    <span className="text-success-foreground">{t('analytics.totalIncome')}: +{formatCurrency(group.credits)}</span>
                    <span className="text-destructive">{t('analytics.totalExpenses')}: -{formatCurrency(group.debits)}</span>
                    <span className={group.credits - group.debits >= 0 ? 'text-success-foreground' : 'text-destructive'}>
                      {t('analytics.netFinancial')}: {formatCurrency(group.credits - group.debits)}
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/50 text-start">
                        <th className="py-2.5 px-4 font-semibold text-muted-foreground">{t('analytics.logDate')}</th>
                        <th className="py-2.5 px-4 font-semibold text-muted-foreground">{t('analytics.logType')}</th>
                        <th className="py-2.5 px-4 font-semibold text-muted-foreground">{t('analytics.logSubcategory')}</th>
                        <th className="py-2.5 px-4 font-semibold text-muted-foreground">{t('analytics.logDescription')}</th>
                        <th className="py-2.5 px-4 font-semibold text-muted-foreground">{t('analytics.logReceiptNo')}</th>
                        <th className="py-2.5 px-4 font-semibold text-muted-foreground">{t('analytics.logSource')}</th>
                        <th className="py-2.5 px-4 font-semibold text-muted-foreground">{t('analytics.logAmount')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.txs.map((tx) => (
                        <tr key={tx.id} className="border-b border-border hover:bg-muted">
                          <td className="py-2 px-4 text-muted-foreground">{formatDate(tx.date)}</td>
                          <td className="py-2 px-4">
                            <Badge variant={tx.type === 'credit' ? 'success' : 'danger'}>
                              {tx.type === 'credit' ? t('dashboard.deposit') : t('dashboard.withdrawal')}
                            </Badge>
                          </td>
                          <td className="py-2 px-4 text-muted-foreground">{getSubCategoryNameAr(tx.caisseId, tx.subCategoryId)}</td>
                          <td className="py-2 px-4 text-foreground font-medium">{localizedDesc(tx.description, tx.description)}</td>
                          <td className="py-2 px-4 text-muted-foreground font-mono" dir="ltr">{tx.receiptNumber || '—'}</td>
                          <td className="py-2 px-4">
                            <Badge variant={tx.fundSource === 'banque' ? 'info' : 'warning'}>
                              {tx.fundSource === 'banque' ? t('dashboard.bank') : t('finance.cashFund')}
                            </Badge>
                          </td>
                          <td className={`py-2 px-4 font-bold text-left ${tx.type === 'credit' ? 'text-success-foreground' : 'text-destructive'}`}>
                            {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'subcategories' && (
          <div className="space-y-6">
            {groupedBySubcategory.map((group, idx) => (
              <div key={idx} className="border border-border rounded-lg overflow-hidden bg-card">
                <div className="bg-muted px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-foreground font-bold text-sm">{t('analytics.logSubcategory')}: {group.subName}</span>
                    <span className="text-xs text-muted-foreground/70 mr-2">({group.caisseName})</span>
                  </div>
                  <div className="flex gap-4 text-xs font-semibold">
                    <span className="text-success-foreground">{t('analytics.totalIncome')}: +{formatCurrency(group.credits)}</span>
                    <span className="text-destructive">{t('analytics.totalExpenses')}: -{formatCurrency(group.debits)}</span>
                    <span className={group.credits - group.debits >= 0 ? 'text-success-foreground' : 'text-destructive'}>
                      {t('analytics.netFinancial')}: {formatCurrency(group.credits - group.debits)}
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/50 text-start">
                        <th className="py-2.5 px-4 font-semibold text-muted-foreground">{t('analytics.logDate')}</th>
                        <th className="py-2.5 px-4 font-semibold text-muted-foreground">{t('analytics.logType')}</th>
                        <th className="py-2.5 px-4 font-semibold text-muted-foreground">{t('analytics.logDescription')}</th>
                        <th className="py-2.5 px-4 font-semibold text-muted-foreground">{t('analytics.logReceiptNo')}</th>
                        <th className="py-2.5 px-4 font-semibold text-muted-foreground">{t('analytics.logSource')}</th>
                        <th className="py-2.5 px-4 font-semibold text-muted-foreground">{t('analytics.logAmount')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.txs.map((tx) => (
                        <tr key={tx.id} className="border-b border-border hover:bg-muted">
                          <td className="py-2 px-4 text-muted-foreground">{formatDate(tx.date)}</td>
                          <td className="py-2 px-4">
                            <Badge variant={tx.type === 'credit' ? 'success' : 'danger'}>
                              {tx.type === 'credit' ? t('dashboard.deposit') : t('dashboard.withdrawal')}
                            </Badge>
                          </td>
                          <td className="py-2 px-4 text-foreground font-medium">{localizedDesc(tx.description, tx.description)}</td>
                          <td className="py-2 px-4 text-muted-foreground font-mono" dir="ltr">{tx.receiptNumber || '—'}</td>
                          <td className="py-2 px-4">
                            <Badge variant={tx.fundSource === 'banque' ? 'info' : 'warning'}>
                              {tx.fundSource === 'banque' ? t('dashboard.bank') : t('finance.cashFund')}
                            </Badge>
                          </td>
                          <td className={`py-2 px-4 font-bold text-left ${tx.type === 'credit' ? 'text-success-foreground' : 'text-destructive'}`}>
                            {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'log' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-2 no-print">
              <div className="relative">
                <input
                  type="text"
                  placeholder={t('analytics.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-8 pl-3 py-1.5 border border-border rounded-lg text-xs bg-card focus:outline-none focus:ring-1 focus:ring-ring text-start"
                  dir="rtl"
                />
                <Search className="absolute right-2.5 top-2 w-4 h-4 text-muted-foreground/70" />
              </div>
              <select
                value={logCaisseFilter}
                onChange={(e) => setLogCaisseFilter(e.target.value)}
                className="w-full px-3 py-1.5 border border-border rounded-lg text-xs bg-card focus:outline-none focus:ring-1 focus:ring-ring text-start font-medium"
              >
                <option value="">{t('analytics.filterAllFunds')}</option>
                {caisses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                value={logTypeFilter}
                onChange={(e) => setLogTypeFilter(e.target.value)}
                className="w-full px-3 py-1.5 border border-border rounded-lg text-xs bg-card focus:outline-none focus:ring-1 focus:ring-ring text-start font-medium"
              >
                <option value="">{t('analytics.filterAllOperations')}</option>
                <option value="credit">{t('analytics.filterCreditOnly')}</option>
                <option value="debit">{t('analytics.filterDebitOnly')}</option>
              </select>
              <select
                value={logSourceFilter}
                onChange={(e) => setLogSourceFilter(e.target.value)}
                className="w-full px-3 py-1.5 border border-border rounded-lg text-xs bg-card focus:outline-none focus:ring-1 focus:ring-ring text-start font-medium"
              >
                <option value="">{t('analytics.allSources')}</option>
                <option value="banque">{t('dashboard.bank')}</option>
                <option value="caisse_physique">{t('finance.cashFund')}</option>
              </select>
            </div>

            {/* Totaux des lignes filtrées */}
            {(() => {
              const totalCredits = logTx.filter(tx => tx.status !== 'cancelled' && tx.type === 'credit').reduce((s, tx) => s + tx.amount, 0);
              const totalDebits = logTx.filter(tx => tx.status !== 'cancelled' && tx.type === 'debit').reduce((s, tx) => s + tx.amount, 0);
              return (
                <div className="flex flex-wrap gap-4 px-4 py-3 bg-muted rounded-lg border border-border mb-3 text-sm">
                  <span className="text-success-foreground font-semibold">
                    {t('analytics.totalIncome')}: +{formatCurrency(totalCredits)}
                  </span>
                  <span className="text-destructive font-semibold">
                    {t('analytics.totalExpenses')}: -{formatCurrency(totalDebits)}
                  </span>
                  <span className={`font-semibold ${totalCredits - totalDebits >= 0 ? 'text-success-foreground' : 'text-destructive'}`}>
                    {t('analytics.netFinancial')}: {totalCredits - totalDebits >= 0 ? '+' : ''}{formatCurrency(totalCredits - totalDebits)}
                  </span>
                  <span className="text-muted-foreground text-xs mr-auto">
                    ({logTx.length} {t('analytics.operations')})
                  </span>
                </div>
              );
            })()}

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-start">
                    <th className="py-2.5 px-4 font-semibold text-muted-foreground">{t('analytics.logType')}</th>
                    <th className="py-2.5 px-4 font-semibold text-muted-foreground">{t('analytics.logReceiptNo')}</th>
                    <th className="py-2.5 px-4 font-semibold text-muted-foreground">{t("dashboard.fund")}</th>
                    <th className="py-2.5 px-4 font-semibold text-muted-foreground">{t('analytics.logSubcategory')}</th>
                    <th className="py-2.5 px-4 font-semibold text-muted-foreground">{t('analytics.logDescription')}</th>
                    <th className="py-2.5 px-4 font-semibold text-muted-foreground">{t('analytics.logDate')}</th>
                    <th className="py-2.5 px-4 font-semibold text-muted-foreground">{t('analytics.logSource')}</th>
                    <th className="py-2.5 px-4 font-semibold text-muted-foreground">{t('analytics.logAmount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {logTx.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-muted-foreground/70">{t('analytics.noOperationsFound')}</td>
                    </tr>
                  ) : (
                    logTx.map((tx) => {
                      const caisse = caisses.find((c) => c.id === tx.caisseId);
                      return (
                        <tr key={tx.id} className="border-b border-border hover:bg-muted">
                          <td className="py-2 px-4">
                            <Badge variant={tx.type === 'credit' ? 'success' : 'danger'}>
                              {tx.type === 'credit' ? t('dashboard.deposit') : t('dashboard.withdrawal')}
                            </Badge>
                          </td>
                          <td className="py-2 px-4 text-muted-foreground font-mono" dir="ltr">{tx.receiptNumber || '—'}</td>
                          <td className="py-2 px-4 text-foreground font-medium">{caisse ? caisse.name : '—'}</td>
                          <td className="py-2 px-4 text-muted-foreground">{getSubCategoryNameAr(tx.caisseId, tx.subCategoryId)}</td>
                          <td className="py-2 px-4 text-foreground">{localizedDesc(tx.description, tx.description)}</td>
                          <td className="py-2 px-4 text-muted-foreground">{formatDate(tx.date)}</td>
                          <td className="py-2 px-4">
                            <Badge variant={tx.fundSource === 'banque' ? 'info' : 'warning'}>
                              {tx.fundSource === 'banque' ? t('dashboard.bank') : t('finance.cashFund')}
                            </Badge>
                          </td>
                          <td className={`py-2 px-4 font-bold text-left ${tx.type === 'credit' ? 'text-success-foreground' : 'text-destructive'}`}>
                            {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
