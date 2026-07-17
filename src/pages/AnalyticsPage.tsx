import { useState, useEffect, useMemo } from 'react';
import { Card, StatCard, LoadingSpinner, Badge, Button } from '../components/common/UI';
import { useTransactions } from '../hooks/useFinance';
import { useDonors } from '../hooks/useDonors';
import { useQuery } from '@tanstack/react-query';
import { caissesApi } from '../lib/api';
import { formatCurrency, formatDate } from '../utils/helpers';
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
        nameAr: c.nameAr,
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
      nameAr: maxDonor ? `${maxDonor.firstNameAr} ${maxDonor.lastNameAr}` : null,
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
    if (!subId) return 'عام';
    const caisse = caisses.find((c) => c.id === caisseId);
    if (!caisse) return 'عام';
    const sub = caisse.subCategories?.find((s) => s.id === subId);
    return sub ? sub.nameAr : 'عام';
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
      const caisseNameAr = caisse ? caisse.nameAr : 'صندوق غير معروف';
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
        tx.descriptionAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">التحليلات والتقارير المالية</h1>
          <p className="text-sm text-gray-500 mt-1">
            نظرة تفصيلية ومؤشرات ذكية حول المداخيل والمصاريف وحالة السيولة في الصناديق.
          </p>
        </div>
      </div>

      <Card titleAr="تصفية الفترة الزمنية" className="no-print">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="w-full md:w-1/4">
            <label className="block text-sm font-medium text-gray-700 mb-1">الفترة الزمنية</label>
            <select
              value={quickFilter}
              onChange={(e) => setQuickFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="this_month">الشهر الحالي</option>
              <option value="last_3_months">آخر 3 أشهر</option>
              <option value="this_year">السنة الحالية</option>
              <option value="custom">تاريخ مخصص</option>
            </select>
          </div>
          <div className="w-full md:w-1/4">
            <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setQuickFilter('custom');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="w-full md:w-1/4">
            <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setQuickFilter('custom');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="md:mr-auto flex gap-2 w-full md:w-auto">
            <Button
              variant="secondary"
              onClick={() => window.print()}
              size="md"
              className="w-full md:w-auto"
            >
              طباعة التقرير
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي المقبوضات (المداخيل)"
          value={formatCurrency(stats.credits)}
          icon={<ArrowUpRight className="w-6 h-6" />}
          color="bg-emerald-500"
          subtitle={`${filteredTx.filter((t) => t.type === 'credit').length} عملية إيداع`}
        />
        <StatCard
          title="إجمالي المدفوعات (المصاريف)"
          value={formatCurrency(stats.debits)}
          icon={<ArrowDownRight className="w-6 h-6" />}
          color="bg-red-500"
          subtitle={`${filteredTx.filter((t) => t.type === 'debit').length} عملية سحب`}
        />
        <StatCard
          title="الصافي المالي للمرحلة"
          value={formatCurrency(stats.balance)}
          icon={<TrendingUp className="w-6 h-6" />}
          color={stats.balance >= 0 ? 'bg-blue-500' : 'bg-orange-500'}
          subtitle={stats.balance >= 0 ? 'فائض مالي' : 'عجز في التدفق'}
        />
        <StatCard
          title="معدل المصاريف إلى المداخيل"
          value={`${stats.ratio.toFixed(1)}%`}
          icon={<Percent className="w-6 h-6" />}
          color={stats.ratio > 85 ? 'bg-red-500' : stats.ratio > 50 ? 'bg-amber-500' : 'bg-emerald-500'}
          subtitle={stats.ratio > 85 ? 'معدل إنفاق حرج' : stats.ratio > 50 ? 'معدل إنفاق متوسط' : 'معدل إنفاق ممتاز'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card titleAr="التطور الشهري للمداخيل والمصاريف" className="lg:col-span-2">
          {monthlyProgression.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-gray-400">
              <Calendar className="w-12 h-12 mb-2 stroke-1" />
              <p className="text-sm">لا توجد بيانات لعرض المخطط البياني في هذه الفترة</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-4 text-xs font-semibold justify-end">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-500 rounded-sm" /> المداخيل</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-500 rounded-sm" /> المصاريف</span>
              </div>
              {/* Professional bar chart */}
              <div className="relative" style={{ overflowX: 'auto' }}>
                {(() => {
                  const N = monthlyProgression.length;
                  const monthsAr = ['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

                  // ---- Layout dimensions ----
                  const MARGIN_L = 46;       // left margin for Y-axis labels
                  const MARGIN_R = 10;       // right margin
                  const MARGIN_T = 8;        // top margin
                  const PLOT_H = 170;        // height of the actual plot area
                  const LABEL_H = 42;        // height reserved for X-axis labels at bottom
                  const svgH = MARGIN_T + PLOT_H + LABEL_H;

                  // ---- Width logic: scale with number of months ----
                  const pxPerGroup = Math.max(28, Math.min(60, 520 / N));
                  const svgW = Math.max(400, MARGIN_L + N * pxPerGroup + MARGIN_R);
                  const chartW = svgW - MARGIN_L - MARGIN_R;
                  const groupW = chartW / N;
                  const barW = Math.max(4, groupW * 0.4);
                  const gap = barW * 0.15;

                  // ---- Y-axis ----
                  const rawMax = Math.max(...monthlyProgression.map(m => Math.max(m.credits, m.debits)), 1);
                  const nice = rawMax > 1000000 ? 500000 : rawMax > 500000 ? 200000 : rawMax > 100000 ? 100000 : rawMax > 50000 ? 25000 : rawMax > 10000 ? 10000 : rawMax > 5000 ? 5000 : rawMax > 1000 ? 1000 : 500;
                  const yMax = Math.ceil(rawMax * 1.15 / nice) * nice;

                  // ---- X-axis labels: skip strategy ----
                  let labelStep = 1;
                  if (N > 18) labelStep = 2;
                  if (N > 36) labelStep = 3;
                  if (N > 60) labelStep = 6;
                  if (N > 96) labelStep = 12;

                  // ---- Compute a nice set of Y-axis numbers ----
                  const ySteps = 4;
                  const yValues = Array.from({ length: ySteps + 1 }, (_, i) => (i / ySteps) * yMax);

                  return (
                    <div style={{ overflowX: N > 18 ? 'auto' : 'visible', paddingBottom: '4px' }}>
                      <svg
                        viewBox={`0 0 ${svgW} ${svgH}`}
                        style={{ minWidth: svgW > 700 ? svgW + 'px' : '100%', display: 'block' }}
                        className={svgW <= 700 ? 'w-full' : ''}
                      >
                        {/* ---- Grid + Y-axis labels ---- */}
                        {yValues.map((val, i) => {
                          const y = MARGIN_T + PLOT_H - (i / ySteps) * PLOT_H;
                          return (
                            <g key={`y${i}`}>
                              <line x1={MARGIN_L} y1={y} x2={svgW - MARGIN_R} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,4" />
                              <text x={MARGIN_L - 6} y={y + 3} fill="#9ca3af" fontSize="10" textAnchor="end" fontFamily="sans-serif">
                                {val >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val.toFixed(0)}
                              </text>
                            </g>
                          );
                        })}

                        {/* ---- Baseline (zero) ---- */}
                        <line x1={MARGIN_L} y1={MARGIN_T + PLOT_H} x2={svgW - MARGIN_R} y2={MARGIN_T + PLOT_H} stroke="#cbd5e1" strokeWidth="1.5" />
                        {/* Y-axis vertical line */}
                        <line x1={MARGIN_L} y1={MARGIN_T} x2={MARGIN_L} y2={MARGIN_T + PLOT_H} stroke="#cbd5e1" strokeWidth="1" />

                        {/* ---- Bars ---- */}
                        {monthlyProgression.map((item, idx) => {
                          const cx = MARGIN_L + idx * groupW + groupW / 2;
                          const credH = (item.credits / yMax) * PLOT_H;
                          const debH = (item.debits / yMax) * PLOT_H;
                          const baseY = MARGIN_T + PLOT_H;
                          const [yr, mo] = item.month.split('-');

                          let shortLabel: string;
                          if (N > 60) {
                            shortLabel = idx % 6 === 0 ? yr : '';
                          } else if (N > 36) {
                            const labelIdx = Math.floor((parseInt(mo) - 1) / 4);
                            shortLabel = idx % 3 === 0 ? `${yr}-Q${labelIdx + 1}` : '';
                          } else if (N > 18) {
                            const m = monthsAr[parseInt(mo) - 1].slice(0, 2);
                            shortLabel = idx % 2 === 0 ? `${m} ${yr.slice(2)}` : '';
                          } else {
                            shortLabel = `${monthsAr[parseInt(mo) - 1].slice(0, 3)} ${yr}`;
                          }

                          return (
                            <g key={idx}>
                              {/* Credit */}
                              <rect x={cx - gap - barW} y={baseY - credH} width={barW} height={credH || 0} fill="#10b981" rx="2" />
                              {/* Debit */}
                              <rect x={cx + gap} y={baseY - debH} width={barW} height={debH || 0} fill="#ef4444" rx="2" />
                              {/* Tooltip */}
                              <title>
                                {`${monthsAr[parseInt(mo) - 1]} ${yr}\n📈 مداخيل: ${formatCurrency(item.credits)}\n📉 مصاريف: ${formatCurrency(item.debits)}`}
                              </title>
                              {/* X-axis label */}
                              {shortLabel && (
                                <g>
                                  <text
                                    x={cx}
                                    y={baseY + 14}
                                    fill="#6b7280"
                                    fontSize={N > 36 ? '8' : '10'}
                                    fontFamily="sans-serif"
                                    textAnchor="end"
                                    transform={`rotate(-40, ${cx}, ${baseY + 14})`}
                                  >
                                    {shortLabel}
                                  </text>
                                </g>
                              )}
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </Card>

        <Card titleAr="مقارنة مصادر التمويل">
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <div className="relative w-36 h-36">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  <circle cx="50" cy="50" r="40" className="stroke-gray-100 fill-none" strokeWidth="8" />
                  {(() => {
                    const totalCred = fundSourceBreakdown.bank.credits + fundSourceBreakdown.cash.credits;
                    const bankShare = totalCred > 0 ? fundSourceBreakdown.bank.credits / totalCred : 0.5;
                    const circ = 2 * Math.PI * 40;
                    const offset = circ - bankShare * circ;
                    return (
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        className="stroke-primary-500 fill-none"
                        strokeWidth="8"
                        strokeDasharray={circ}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                      />
                    );
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-gray-400">حصة البنك</span>
                  <span className="text-lg font-bold text-primary-600">
                    {(() => {
                      const totalCred = fundSourceBreakdown.bank.credits + fundSourceBreakdown.cash.credits;
                      return totalCred > 0 ? `${((fundSourceBreakdown.bank.credits / totalCred) * 100).toFixed(0)}%` : '50%';
                    })()}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-gray-800 text-sm flex items-center gap-1">
                    <span className="w-3 h-3 bg-primary-500 rounded-full" /> البنك (Banque)
                  </span>
                  <span className="text-xs text-gray-500">رصيد الفترة الصافي</span>
                </div>
                <div className="flex justify-between text-xs mt-2">
                  <span className="text-emerald-600">مداخيل: {formatCurrency(fundSourceBreakdown.bank.credits)}</span>
                  <span className="text-red-600">مصاريف: {formatCurrency(fundSourceBreakdown.bank.debits)}</span>
                </div>
                <div className="text-left font-bold text-sm text-gray-900 border-t border-blue-100/50 mt-1.5 pt-1" dir="ltr">
                  {formatCurrency(fundSourceBreakdown.bank.net)}
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-gray-800 text-sm flex items-center gap-1">
                    <span className="w-3 h-3 bg-gray-300 rounded-full" /> الصندوق النقدي (Cash)
                  </span>
                  <span className="text-xs text-gray-500">رصيد الفترة الصافي</span>
                </div>
                <div className="flex justify-between text-xs mt-2">
                  <span className="text-emerald-600">مداخيل: {formatCurrency(fundSourceBreakdown.cash.credits)}</span>
                  <span className="text-red-600">مصاريف: {formatCurrency(fundSourceBreakdown.cash.debits)}</span>
                </div>
                <div className="text-left font-bold text-sm text-gray-900 border-t border-amber-100/50 mt-1.5 pt-1" dir="ltr">
                  {formatCurrency(fundSourceBreakdown.cash.net)}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card titleAr="توزيع التدفق المالي حسب الصناديق">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {caisseBreakdown.map((c) => {
            const sum = c.periodCredits + c.periodDebits;
            const credPercent = sum > 0 ? (c.periodCredits / sum) * 100 : 0;
            const debPercent = sum > 0 ? (c.periodDebits / sum) * 100 : 0;

            return (
              <div key={c.id} className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-3">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-gray-900">{c.nameAr}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    c.actualBalance >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}>
                    رصيد فعلي: {formatCurrency(c.actualBalance)}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500 h-full" style={{ width: `${credPercent}%` }} />
                    <div className="bg-red-500 h-full" style={{ width: `${debPercent}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>مداخيل الفترة: {formatCurrency(c.periodCredits)}</span>
                    <span>مصاريف الفترة: {formatCurrency(c.periodDebits)}</span>
                  </div>
                </div>
                <div className={`text-xs font-medium ${c.periodFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  تدفق الفترة الصافي: {c.periodFlow >= 0 ? '+' : ''}{formatCurrency(c.periodFlow)}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card titleAr="التحليلات الذكية والتوصيات الماليّة">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            {stats.ratio > 85 ? (
              <div className="flex gap-3 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-800">
                <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
                <div>
                  <h4 className="font-bold">تنبيه: معدل نفقات حرج جداً</h4>
                  <p className="mt-1 text-xs text-red-700 leading-relaxed">
                    نسبة نفقات الفترة مقارنة بالمداخيل تتجاوز عتبة الأمان 85% حيث بلغت{' '}
                    <span className="font-bold">{stats.ratio.toFixed(1)}%</span>. يُخشى أن تتعرض الجمعية لشح في السيولة. ننصح بترشيد النفقات التشغيلية.
                  </p>
                </div>
              </div>
            ) : stats.ratio > 50 ? (
              <div className="flex gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm text-amber-800">
                <Info className="w-5 h-5 shrink-0 text-amber-500" />
                <div>
                  <h4 className="font-bold">ملاحظة: معدل نفقات متوسط</h4>
                  <p className="mt-1 text-xs text-amber-700 leading-relaxed">
                    تبلغ نسبة الإنفاق مقارنة بالإيرادات{' '}
                    <span className="font-bold">{stats.ratio.toFixed(1)}%</span>. هذا المؤشر مقبول ولكنه يتطلب متابعة يقظة لضمان ألا تتجاوز المصاريف الحد المطلوب.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-sm text-emerald-800">
                <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
                <div>
                  <h4 className="font-bold">مؤشر ممتاز: توازن مالي إيجابي</h4>
                  <p className="mt-1 text-xs text-emerald-700 leading-relaxed">
                    معدل النفقات مستقر عند <span className="font-bold">{stats.ratio.toFixed(1)}%</span> من المداخيل. يعكس هذا هيكلاً مالياً ممتازاً وهو ما يسمح بتكوين احتياطي مستدام.
                  </p>
                </div>
              </div>
            )}

            {(() => {
              const deficits = caisseBreakdown.filter((c) => c.periodFlow < 0);
              if (deficits.length === 0) return null;
              return (
                <div className="flex gap-3 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-800">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
                  <div>
                    <h4 className="font-bold">عجز مالي في بعض الصناديق</h4>
                    <p className="mt-1 text-xs text-red-700 leading-relaxed">
                      الصناديق التالية تعاني من عجز مالي في معاملات هذه الفترة:{' '}
                      <span className="font-bold">{deficits.map((d) => d.nameAr).join('، ')}</span>. يرجى تسوية الحسابات المالية أو تحويل أرصدة لتغطية النفقات.
                    </p>
                  </div>
                </div>
              );
            })()}

            {donorConcentration.isRisk && (
              <div className="flex gap-3 p-3 bg-orange-50 border border-orange-100 rounded-lg text-sm text-orange-800">
                <AlertTriangle className="w-5 h-5 shrink-0 text-orange-500" />
                <div>
                  <h4 className="font-bold">تركيز عالي في مصادر التبرعات</h4>
                  <p className="mt-1 text-xs text-orange-700 leading-relaxed">
                    يساهم المتبرع <span className="font-bold">"{donorConcentration.nameAr}"</span> بأكثر من 50% من إجمالي المداخيل، بنسبة{' '}
                    <span className="font-bold">{donorConcentration.share.toFixed(1)}%</span> (مبلغ {formatCurrency(donorConcentration.amount)}). الاعتماد المفرط يمثل خطورة؛ نقترح تكثيف جهود تنويع مصادر الدعم المالي.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
              <TrendingUp className="w-5 h-5 shrink-0 text-blue-500" />
              <div>
                <h4 className="font-bold">هامش أمان الطوارئ الموصى به (20%)</h4>
                <p className="mt-1 text-xs text-blue-700 leading-relaxed">
                  توصي المعايير المالية بالاحتفاظ بهامش أمان يعادل <span className="font-bold">20%</span> من المقبوضات كاحتياطي طوارئ. لهاته الفترة، يجب الاحتفاظ بـ{' '}
                  <span className="font-bold text-gray-900">{formatCurrency(stats.credits * 0.2)}</span> كاحتياطي.
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-3 bg-purple-50 border border-purple-100 rounded-lg text-sm text-purple-800">
              <Activity className="w-5 h-5 shrink-0 text-purple-500" />
              <div>
                <h4 className="font-bold">مؤشر سرعة تدفق المعاملات</h4>
                <p className="mt-1 text-xs text-purple-700 leading-relaxed">
                  تم تسجيل <span className="font-bold">{velocity.total}</span> عملية مالية خلال{' '}
                  <span className="font-bold">{velocity.days} يوماً</span>، بمعدل{' '}
                  <span className="font-bold">{velocity.avgPerDay} عملية/يوم</span>. حركة التدفق المالي نشطة وتتطلب مطابقة مستمرة للأوصال والتأكيد على المعاملات المعلقة.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card titleAr="تفاصيل العمليات وحسابات الأستاذ">
        <div className="flex border-b border-gray-200 mb-6 no-print">
          <button
            onClick={() => setActiveTab('caisses')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'caisses'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            تجميع حسب الصناديق
          </button>
          <button
            onClick={() => setActiveTab('subcategories')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'subcategories'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            تجميع حسب التصنيفات الفرعية
          </button>
          <button
            onClick={() => setActiveTab('log')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'log'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            سجل العمليات التفصيلي
          </button>
        </div>

        {activeTab === 'caisses' && (
          <div className="space-y-6">
            {groupedByCaisse.map((group) => (
              <div key={group.caisse?.id || 'unknown'} className="border border-gray-100 rounded-lg overflow-hidden bg-white">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700 font-bold text-base">{group.caisse?.nameAr || 'صندوق غير محدد'}</span>
                    <span className="text-xs text-gray-400">({group.caisse?.reference || '—'})</span>
                  </div>
                  <div className="flex gap-4 text-xs font-semibold">
                    <span className="text-emerald-600">إجمالي المداخيل: +{formatCurrency(group.credits)}</span>
                    <span className="text-red-600">إجمالي المصاريف: -{formatCurrency(group.debits)}</span>
                    <span className={group.credits - group.debits >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                      الصافي: {formatCurrency(group.credits - group.debits)}
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/50 text-right">
                        <th className="py-2.5 px-4 font-semibold text-gray-500">التاريخ</th>
                        <th className="py-2.5 px-4 font-semibold text-gray-500">النوع</th>
                        <th className="py-2.5 px-4 font-semibold text-gray-500">التصنيف الفرعي</th>
                        <th className="py-2.5 px-4 font-semibold text-gray-500">البيان/الوصف</th>
                        <th className="py-2.5 px-4 font-semibold text-gray-500">رقم الوصل</th>
                        <th className="py-2.5 px-4 font-semibold text-gray-500">المصدر</th>
                        <th className="py-2.5 px-4 font-semibold text-gray-500">المبلغ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.txs.map((tx) => (
                        <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2 px-4 text-gray-500">{formatDate(tx.date)}</td>
                          <td className="py-2 px-4">
                            <Badge variant={tx.type === 'credit' ? 'success' : 'danger'}>
                              {tx.type === 'credit' ? 'إيداع' : 'سحب'}
                            </Badge>
                          </td>
                          <td className="py-2 px-4 text-gray-600">{getSubCategoryNameAr(tx.caisseId, tx.subCategoryId)}</td>
                          <td className="py-2 px-4 text-gray-700 font-medium">{tx.descriptionAr}</td>
                          <td className="py-2 px-4 text-gray-500 font-mono" dir="ltr">{tx.receiptNumber || '—'}</td>
                          <td className="py-2 px-4">
                            <Badge variant={tx.fundSource === 'banque' ? 'info' : 'warning'}>
                              {tx.fundSource === 'banque' ? 'بنك' : 'صندوق نقدي'}
                            </Badge>
                          </td>
                          <td className={`py-2 px-4 font-bold text-left ${tx.type === 'credit' ? 'text-emerald-600' : 'text-red-600'}`}>
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
              <div key={idx} className="border border-gray-100 rounded-lg overflow-hidden bg-white">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-gray-800 font-bold text-sm">التصنيف الفرعي: {group.subNameAr}</span>
                    <span className="text-xs text-gray-400 mr-2">({group.caisseNameAr})</span>
                  </div>
                  <div className="flex gap-4 text-xs font-semibold">
                    <span className="text-emerald-600">إجمالي المداخيل: +{formatCurrency(group.credits)}</span>
                    <span className="text-red-600">إجمالي المصاريف: -{formatCurrency(group.debits)}</span>
                    <span className={group.credits - group.debits >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                      الصافي: {formatCurrency(group.credits - group.debits)}
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/50 text-right">
                        <th className="py-2.5 px-4 font-semibold text-gray-500">التاريخ</th>
                        <th className="py-2.5 px-4 font-semibold text-gray-500">النوع</th>
                        <th className="py-2.5 px-4 font-semibold text-gray-500">البيان/الوصف</th>
                        <th className="py-2.5 px-4 font-semibold text-gray-500">رقم الوصل</th>
                        <th className="py-2.5 px-4 font-semibold text-gray-500">المصدر</th>
                        <th className="py-2.5 px-4 font-semibold text-gray-500">المبلغ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.txs.map((tx) => (
                        <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2 px-4 text-gray-500">{formatDate(tx.date)}</td>
                          <td className="py-2 px-4">
                            <Badge variant={tx.type === 'credit' ? 'success' : 'danger'}>
                              {tx.type === 'credit' ? 'إيداع' : 'سحب'}
                            </Badge>
                          </td>
                          <td className="py-2 px-4 text-gray-700 font-medium">{tx.descriptionAr}</td>
                          <td className="py-2 px-4 text-gray-500 font-mono" dir="ltr">{tx.receiptNumber || '—'}</td>
                          <td className="py-2 px-4">
                            <Badge variant={tx.fundSource === 'banque' ? 'info' : 'warning'}>
                              {tx.fundSource === 'banque' ? 'بنك' : 'صندوق نقدي'}
                            </Badge>
                          </td>
                          <td className={`py-2 px-4 font-bold text-left ${tx.type === 'credit' ? 'text-emerald-600' : 'text-red-600'}`}>
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
                  placeholder="بحث في البيان أو رقم الوصل..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-8 pl-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 text-right"
                  dir="rtl"
                />
                <Search className="absolute right-2.5 top-2 w-4 h-4 text-gray-400" />
              </div>
              <select
                value={logCaisseFilter}
                onChange={(e) => setLogCaisseFilter(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 text-right font-medium"
              >
                <option value="">كل الصناديق</option>
                {caisses.map((c) => (
                  <option key={c.id} value={c.id}>{c.nameAr}</option>
                ))}
              </select>
              <select
                value={logTypeFilter}
                onChange={(e) => setLogTypeFilter(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 text-right font-medium"
              >
                <option value="">كل أنواع العمليات</option>
                <option value="credit">الإيداعات فقط</option>
                <option value="debit">السحوبات فقط</option>
              </select>
              <select
                value={logSourceFilter}
                onChange={(e) => setLogSourceFilter(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 text-right font-medium"
              >
                <option value="">كل مصادر التمويل</option>
                <option value="banque">البنك</option>
                <option value="caisse_physique">الصندوق النقدي</option>
              </select>
            </div>

            {/* Totaux des lignes filtrées */}
            {(() => {
              const totalCredits = logTx.filter(tx => tx.status !== 'cancelled' && tx.type === 'credit').reduce((s, tx) => s + tx.amount, 0);
              const totalDebits = logTx.filter(tx => tx.status !== 'cancelled' && tx.type === 'debit').reduce((s, tx) => s + tx.amount, 0);
              return (
                <div className="flex flex-wrap gap-4 px-4 py-3 bg-gray-50 rounded-lg border border-gray-100 mb-3 text-sm">
                  <span className="text-emerald-700 font-semibold">
                    إجمالي الإيداعات: +{formatCurrency(totalCredits)}
                  </span>
                  <span className="text-red-700 font-semibold">
                    إجمالي السحوبات: -{formatCurrency(totalDebits)}
                  </span>
                  <span className={`font-semibold ${totalCredits - totalDebits >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    الصافي: {totalCredits - totalDebits >= 0 ? '+' : ''}{formatCurrency(totalCredits - totalDebits)}
                  </span>
                  <span className="text-gray-500 text-xs mr-auto">
                    ({logTx.length} عملية)
                  </span>
                </div>
              );
            })()}

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50 text-right">
                    <th className="py-2.5 px-4 font-semibold text-gray-600">النوع</th>
                    <th className="py-2.5 px-4 font-semibold text-gray-600">رقم الوصل</th>
                    <th className="py-2.5 px-4 font-semibold text-gray-600">الصندوق المالي</th>
                    <th className="py-2.5 px-4 font-semibold text-gray-600">التصنيف الفرعي</th>
                    <th className="py-2.5 px-4 font-semibold text-gray-600">البيان/الوصف</th>
                    <th className="py-2.5 px-4 font-semibold text-gray-600">التاريخ</th>
                    <th className="py-2.5 px-4 font-semibold text-gray-600">المصدر</th>
                    <th className="py-2.5 px-4 font-semibold text-gray-600">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {logTx.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-gray-400">لا توجد عمليات تطابق البحث والتصفية</td>
                    </tr>
                  ) : (
                    logTx.map((tx) => {
                      const caisse = caisses.find((c) => c.id === tx.caisseId);
                      return (
                        <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2 px-4">
                            <Badge variant={tx.type === 'credit' ? 'success' : 'danger'}>
                              {tx.type === 'credit' ? 'إيداع' : 'سحب'}
                            </Badge>
                          </td>
                          <td className="py-2 px-4 text-gray-500 font-mono" dir="ltr">{tx.receiptNumber || '—'}</td>
                          <td className="py-2 px-4 text-gray-800 font-medium">{caisse ? caisse.nameAr : '—'}</td>
                          <td className="py-2 px-4 text-gray-500">{getSubCategoryNameAr(tx.caisseId, tx.subCategoryId)}</td>
                          <td className="py-2 px-4 text-gray-700">{tx.descriptionAr}</td>
                          <td className="py-2 px-4 text-gray-500">{formatDate(tx.date)}</td>
                          <td className="py-2 px-4">
                            <Badge variant={tx.fundSource === 'banque' ? 'info' : 'warning'}>
                              {tx.fundSource === 'banque' ? 'بنك' : 'صندوق نقدي'}
                            </Badge>
                          </td>
                          <td className={`py-2 px-4 font-bold text-left ${tx.type === 'credit' ? 'text-emerald-600' : 'text-red-600'}`}>
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
