import { useState } from 'react'
import { StatCard, Card, Modal, Badge, Button, LoadingSpinner } from '../components/common/UI'
import { useDashboardStats } from '../hooks/useDashboard'
import { useAuth } from '../hooks/useAuth'
import { formatCurrency, formatDate } from '../utils/helpers'
import { Wallet, Banknote, Users, HeartHandshake, Package, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats()
  const { isAdmin } = useAuth()
  const [detailTx, setDetailTx] = useState<any>(null)

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">لوحة التحكم</h1>
        <p className="text-sm text-gray-500 mt-1">نظرة عامة على نشاط الجمعية</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isAdmin && (
          <>
            <StatCard
              title="رصيد البنك الإجمالي"
              value={formatCurrency(stats?.totalBankBalance ?? 0)}
              icon={<Banknote className="w-6 h-6" />}
              color="bg-blue-500"
            />
            <StatCard
              title="رصيد الصندوق النقدي"
              value={formatCurrency(stats?.totalCashBalance ?? 0)}
              icon={<Wallet className="w-6 h-6" />}
              color="bg-emerald-500"
            />
          </>
        )}
        <StatCard
          title="إجمالي المستفيدين"
          value={stats?.totalBeneficiaries ?? 0}
          icon={<Users className="w-6 h-6" />}
          color="bg-purple-500"
        />
        <StatCard
          title="إجمالي المتبرعين"
          value={stats?.totalDonors ?? 0}
          icon={<HeartHandshake className="w-6 h-6" />}
          color="bg-pink-500"
        />
        <StatCard
          title="إجمالي المواد"
          value={stats?.totalArticles ?? 0}
          icon={<Package className="w-6 h-6" />}
          color="bg-amber-500"
        />
        <StatCard
          title="الإعارات النشطة"
          value={stats?.activeLoans ?? 0}
          icon={<Package className="w-6 h-6" />}
          color="bg-orange-500"
        />
      </div>

      {/* Caisse Balances */}
      {isAdmin && (
        <Card titleAr="أرصدة الصناديق">
          {(!stats?.caissesBalances || stats.caissesBalances.length === 0) ? (
            <p className="text-sm text-gray-400 text-center py-4">لا توجد صناديق مسجلة</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.caissesBalances.map((caisse: any) => (
                <div
                  key={caisse.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <div>
                    <p className="font-medium text-gray-900">{caisse.nameAr}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{caisse.name}</p>
                  </div>
                  <span className={`text-lg font-bold ${caisse.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(caisse.balance)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Recent Transactions */}
      {isAdmin && (
        <Card titleAr="آخر المعاملات">
          {(!stats?.recentTransactions || stats.recentTransactions.length === 0) ? (
            <p className="text-sm text-gray-400 text-center py-4">لا توجد معاملات مسجلة</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-right py-3 px-4 font-semibold text-gray-600">النوع</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-600 hidden xl:table-cell">رقم الوصل</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-600">المبلغ</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-600 hidden sm:table-cell">الوصف</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-600 hidden sm:table-cell">الحالة</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-600">التاريخ</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-600 hidden sm:table-cell">المصدر</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentTransactions.map((tx: any) => (
                    <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setDetailTx(tx)}>
                      <td className="py-3 px-4">
                        {tx.type === 'credit' ? (
                          <ArrowUpCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <ArrowDownCircle className="w-5 h-5 text-red-500" />
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-500 font-mono text-xs hidden xl:table-cell" dir="ltr">{tx.receiptNumber || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700 hidden sm:table-cell">{tx.descriptionAr}</td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        {(tx.status || 'completed') === 'pending' ? (
                          <Badge variant="warning">معلق</Badge>
                        ) : (tx.status || 'completed') === 'cancelled' ? (
                          <Badge variant="danger">ملغي</Badge>
                        ) : (
                          <Badge variant="success">مكتمل</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-500">{formatDate(tx.date)}</td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        <Badge variant={tx.fundSource === 'banque' ? 'info' : 'warning'}>
                          {tx.fundSource === 'banque' ? 'بنك' : 'صندوق نقدي'}
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
      <Modal isOpen={!!detailTx} onClose={() => setDetailTx(null)} title="تفاصيل المعاملة" size="lg">
        {detailTx && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
              <div><p className="text-xs text-gray-500">النوع</p><p className="font-medium">{detailTx.type === 'credit' ? 'إيداع' : 'سحب'}</p></div>
              <div><p className="text-xs text-gray-500">المبلغ</p><p className={`font-bold text-lg ${detailTx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(detailTx.amount)}</p></div>
              <div><p className="text-xs text-gray-500">الصندوق</p><p className="font-medium text-gray-900">{detailTx.caisse?.nameAr || detailTx.caisseId || '—'}</p></div>
              <div><p className="text-xs text-gray-500">مصدر التمويل</p><p className="font-medium">{detailTx.fundSource === 'banque' ? 'بنك' : 'صندوق نقدي'}</p></div>
              {detailTx.descriptionAr && <div className="sm:col-span-2"><p className="text-xs text-gray-500">الوصف</p><p className="font-medium text-gray-900">{detailTx.descriptionAr}</p></div>}
              {detailTx.receiptNumber && <div><p className="text-xs text-gray-500">رقم الوصل</p><p className="font-mono text-gray-900" dir="ltr">{detailTx.receiptNumber}</p></div>}
              <div><p className="text-xs text-gray-500">التاريخ</p><p className="font-medium text-gray-900">{formatDate(detailTx.date)}</p></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setDetailTx(null)}>إغلاق</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
