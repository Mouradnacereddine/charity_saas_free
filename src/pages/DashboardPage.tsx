import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StatCard, Card, Badge, LoadingSpinner, Button, Modal } from '../components/common/UI'
import { useDashboardStats } from '../hooks/useDashboard'
import { useLoans } from '../hooks/useInventory'
import { useAuth } from '../hooks/useAuth'
import { formatCurrency, formatDate, localizedDesc } from '../utils/helpers'
import { Wallet, Banknote, Users, HeartHandshake, Package, Handshake, AlertTriangle, Eye, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import type { Loan } from '../types'

export default function DashboardPage() {
  const { t, i18n } = useTranslation()
  const { data: stats, isLoading } = useDashboardStats()
  const { data: allLoans = [] } = useLoans()
  const { isAdmin } = useAuth()
  const [detailTx, setDetailTx] = useState<any>(null)
  const [detailLoan, setDetailLoan] = useState<Loan | null>(null)

  const loanStatusLabels: Record<string, string> = {
    en_cours: t('inventory.ongoing'),
    partiellement_retourne: t('inventory.partiallyReturned'),
    retourne: t('inventory.final'),
    definitif: t('inventory.final'),
  }

  // Overdue loans: active loans with at least one item past its expected return date
  const overdueLoans = allLoans.filter((loan: Loan) => {
    if (loan.status === 'retourne' || loan.status === 'definitif') return false
    return loan.items.some((item) => {
      if (!item.expectedReturnDate) return false
      return new Date(item.expectedReturnDate) < new Date()
    })
  })

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('dashboard.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('dashboard.subtitle')}</p>
      </div>

      {/* Stat Cards — variantes alignees MediCare */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isAdmin && (
          <>
            <StatCard
              title={t('dashboard.bankBalance')}
              value={formatCurrency(stats?.totalBankBalance ?? 0)}
              icon={<Banknote className="w-6 h-6" />}
              color="bg-primary"
            />
            <StatCard
              title={t('dashboard.cashBalance')}
              value={formatCurrency(stats?.totalCashBalance ?? 0)}
              icon={<Wallet className="w-6 h-6" />}
              color="bg-primary"
            />
          </>
        )}
        <StatCard
          title={t('dashboard.totalBeneficiaries')}
          value={stats?.totalBeneficiaries ?? 0}
          icon={<Users className="w-6 h-6" />}
          color="bg-primary"
        />
        <StatCard
          title={t('dashboard.totalDonors')}
          value={stats?.totalDonors ?? 0}
          icon={<HeartHandshake className="w-6 h-6" />}
          color="bg-primary"
        />
        <StatCard
          title={t('dashboard.totalItems')}
          value={stats?.totalArticles ?? 0}
          icon={<Package className="w-6 h-6" />}
          color="bg-primary"
        />
        <StatCard
          title={t('dashboard.activeLoans')}
          value={stats?.activeLoans ?? 0}
          icon={<Handshake className="w-6 h-6" />}
          color="bg-primary"
        />
      </div>

      {/* Caisse Balances — chaque solde affiché en StatCard pour cohérence */}
      {isAdmin && (
        <Card titleAr={t('dashboard.fundBalances')}>
          {(!stats?.caissesBalances || stats.caissesBalances.length === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t('dashboard.noFunds')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.caissesBalances.map((caisse: any) => (
                <StatCard
                  key={caisse.id}
                  title={caisse.name}
                  value={formatCurrency(caisse.balance)}
                  icon={caisse.balance >= 0 ? <Banknote className="w-6 h-6" /> : <Wallet className="w-6 h-6" />}
                  color={caisse.balance >= 0 ? 'bg-primary' : 'bg-destructive'}
                />
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Recent Transactions */}
      {isAdmin && (
        <Card titleAr={t('dashboard.recentTransactions')}>
          {(!stats?.recentTransactions || stats.recentTransactions.length === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t('dashboard.noTransactions')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-start py-3 px-4 font-semibold text-muted-foreground">{t('dashboard.type')}</th>
                    <th className="text-start py-3 px-4 font-semibold text-muted-foreground hidden xl:table-cell">{t('dashboard.receiptNo')}</th>
                    <th className="text-start py-3 px-4 font-semibold text-muted-foreground hidden md:table-cell">{t('dashboard.fund')}</th>
                    <th className="text-start py-3 px-4 font-semibold text-muted-foreground">{t('common.amount')}</th>
                    <th className="text-start py-3 px-4 font-semibold text-muted-foreground hidden lg:table-cell">{t('dashboard.donor')}</th>
                    <th className="text-start py-3 px-4 font-semibold text-muted-foreground hidden lg:table-cell">{t('dashboard.beneficiary')}</th>
                    <th className="text-start py-3 px-4 font-semibold text-muted-foreground hidden sm:table-cell">{t('common.description')}</th>
                    <th className="text-start py-3 px-4 font-semibold text-muted-foreground hidden sm:table-cell">{t('common.status')}</th>
                    <th className="text-start py-3 px-4 font-semibold text-muted-foreground">{t('common.date')}</th>
                    <th className="text-start py-3 px-4 font-semibold text-muted-foreground hidden sm:table-cell">{t('dashboard.source')}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentTransactions.map((tx: any) => (
                    <tr key={tx.id} className="border-b border-border hover:bg-muted transition-colors cursor-pointer" onClick={() => setDetailTx(tx)}>
                      <td className="py-3 px-4">
                        {tx.type === 'credit' ? (
                          <ArrowUpCircle className="w-5 h-5 text-success" />
                        ) : (
                          <ArrowDownCircle className="w-5 h-5 text-destructive" />
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-mono text-xs hidden xl:table-cell" dir="ltr">{tx.receiptNumber || '—'}</td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <span className="text-foreground">{tx.caisse?.name || '—'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${tx.type === 'credit' ? 'text-success' : 'text-destructive'}`}>
                          {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-foreground hidden lg:table-cell">
                        {tx.type === 'credit' && tx.donor ? `${tx.donor.lastName} ${tx.donor.firstName}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-foreground hidden lg:table-cell">
                        {tx.type === 'debit' && tx.beneficiary ? `${tx.beneficiary.lastName} ${tx.beneficiary.firstName}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-foreground hidden sm:table-cell">{localizedDesc(tx.description)}</td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        {(tx.status || 'completed') === 'pending' ? (
                          <Badge variant="warning">{t('dashboard.pending')}</Badge>
                        ) : (tx.status || 'completed') === 'cancelled' ? (
                          <Badge variant="danger">{t('dashboard.cancelled')}</Badge>
                        ) : (
                          <Badge variant="success">{t('dashboard.completed')}</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{formatDate(tx.date)}</td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        <Badge variant={tx.fundSource === 'banque' ? 'info' : 'warning'}>
                          {tx.fundSource === 'banque' ? t('dashboard.bank') : t('dashboard.cash')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Transaction Detail Modal */}
      <Modal isOpen={!!detailTx} onClose={() => setDetailTx(null)} title={t('dashboard.transactionDetails')} size="lg">
        {detailTx && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted rounded-lg p-4">
              <div><p className="text-xs text-muted-foreground">{t('dashboard.type')}</p><p className="font-medium text-foreground">{detailTx.type === 'credit' ? t('dashboard.deposit') : t('dashboard.withdrawal')}</p></div>
              <div><p className="text-xs text-muted-foreground">{t('common.amount')}</p><p className={`font-bold text-lg ${detailTx.type === 'credit' ? 'text-success' : 'text-destructive'}`}>{formatCurrency(detailTx.amount)}</p></div>
              <div><p className="text-xs text-muted-foreground">{t('dashboard.fund')}</p><p className="font-medium text-foreground">{detailTx.caisse?.name || detailTx.caisseId || '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">{t('dashboard.source')}</p><p className="font-medium text-foreground">{detailTx.fundSource === 'banque' ? t('dashboard.bank') : t('dashboard.cash')}</p></div>
              {detailTx.type === 'credit' && detailTx.donor && (
                <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">{t('dashboard.donor')}</p><p className="font-medium text-foreground">{detailTx.donor.lastName} {detailTx.donor.firstName}</p></div>
              )}
              {detailTx.type === 'debit' && detailTx.beneficiary && (
                <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">{t('dashboard.beneficiary')}</p><p className="font-medium text-foreground">{detailTx.beneficiary.lastName} {detailTx.beneficiary.firstName}</p></div>
              )}
              {detailTx.description && <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">{t('common.description')}</p><p className="font-medium text-foreground">{localizedDesc(detailTx.description)}</p></div>}
              {detailTx.receiptNumber && <div><p className="text-xs text-muted-foreground">{t('dashboard.receiptNo')}</p><p className="font-mono text-foreground" dir="ltr">{detailTx.receiptNumber}</p></div>}
              <div><p className="text-xs text-muted-foreground">{t('common.date')}</p><p className="font-medium text-foreground">{formatDate(detailTx.date)}</p></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setDetailTx(null)}>{t('common.close')}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Overdue Loans */}
      {overdueLoans.length > 0 && (
        <Card titleAr={t('dashboard.overdueLoans')}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('inventory.refCode')}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('medical.beneficiary')}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('inventory.expectedReturnDate')}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('inventory.quantity')}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('dashboard.daysOverdue')}</th>
                  <th className="text-start py-3 px-4 font-medium text-muted-foreground">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {overdueLoans.slice(0, 10).map((loan: Loan) => {
                  const daysOverdue = loan.expectedReturnDate
                    ? Math.floor((new Date().getTime() - new Date(loan.expectedReturnDate).getTime()) / (1000 * 60 * 60 * 24))
                    : 0
                  const totalQty = loan.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
                  return (
                    <tr key={loan.id} className="border-b border-border hover:bg-muted transition-colors cursor-pointer" onClick={() => setDetailLoan(loan)}>
                      <td className="py-3 px-4 font-semibold text-primary" dir="ltr">{loan.reference || '—'}</td>
                      <td className="py-3 px-4 font-medium text-foreground">{loan.beneficiaryName}</td>
                      <td className="py-3 px-4 text-destructive font-medium">{formatDate(loan.expectedReturnDate!)}</td>
                      <td className="py-3 px-4 text-muted-foreground">{totalQty}</td>
                      <td className="py-3 px-4">
                        <Badge variant="danger">{daysOverdue} {t('common.days')}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <button onClick={(e) => { e.stopPropagation(); setDetailLoan(loan); }}
                          className="p-1 text-muted-foreground/70 hover:text-primary transition-colors" title={t("common.details")}>
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {overdueLoans.length > 10 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                {t('dashboard.andMore', { count: overdueLoans.length - 10 })}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Loan Detail Modal */}
      <Modal isOpen={!!detailLoan} onClose={() => setDetailLoan(null)} title={t('inventory.loanDetails')} size="md">
        {detailLoan && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted rounded-lg p-4">
              <div><p className="text-xs text-muted-foreground">{t('inventory.refCode')}</p><p className="font-mono text-foreground" dir="ltr">{detailLoan.reference || '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">{t('medical.beneficiary')}</p><p className="font-medium text-foreground">{detailLoan.beneficiaryName}</p></div>
              <div><p className="text-xs text-muted-foreground">{t('common.status')}</p><p className="font-medium text-foreground">{loanStatusLabels[detailLoan.status] || detailLoan.status}</p></div>
              <div><p className="text-xs text-muted-foreground">{t('inventory.loanDate')}</p><p className="font-medium text-foreground">{formatDate(detailLoan.loanDate)}</p></div>
              <div><p className="text-xs text-muted-foreground">{t('inventory.expectedReturnDate')}</p><p className="font-medium text-foreground">{detailLoan.expectedReturnDate ? formatDate(detailLoan.expectedReturnDate) : '—'}</p></div>
              {detailLoan.actualReturnDate && <div><p className="text-xs text-muted-foreground">{t('inventory.actualReturnDate')}</p><p className="font-medium text-foreground">{formatDate(detailLoan.actualReturnDate)}</p></div>}
              {detailLoan.notes && <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">{t('common.notes')}</p><p className="font-medium text-foreground">{detailLoan.notes}</p></div>}
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setDetailLoan(null)}>{t('common.close')}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
