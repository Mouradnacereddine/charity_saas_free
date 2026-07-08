import { useEffect, useState } from 'react'
import { StatCard, Card, Badge, LoadingSpinner } from '../components/common/UI'
import { useFinanceStore } from '../stores/financeStore'
import { useCaisseStore } from '../stores/caisseStore'
import { useBeneficiaryStore } from '../stores/beneficiaryStore'
import { useDonorStore } from '../stores/donorStore'
import { useInventoryStore } from '../stores/inventoryStore'
import { formatCurrency, formatDate } from '../utils/helpers'
import { Wallet, Banknote, Users, HeartHandshake, Package, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true)

  const { transactions, totalCash, loadTransactions, loadBankAccounts, calculateTotalCash, getTotalBankBalance } = useFinanceStore()
  const { caisses, loadCaisses } = useCaisseStore()
  const { beneficiaries, loadBeneficiaries } = useBeneficiaryStore()
  const { donors, loadDonors } = useDonorStore()
  const { articles, loans, loadArticles, loadLoans } = useInventoryStore()

  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true)
      await Promise.all([
        loadTransactions(),
        loadBankAccounts(),
        calculateTotalCash(),
        loadCaisses(),
        loadBeneficiaries(),
        loadDonors(),
        loadArticles(),
        loadLoans(),
      ])
      setIsLoading(false)
    }
    loadAll()
  }, [])

  if (isLoading) {
    return <LoadingSpinner />
  }

  const totalBankBalance = getTotalBankBalance()
  const activeLoans = loans.filter((l) => l.status === 'en_cours' || l.status === 'partiellement_retourne')
  const recentTransactions = transactions.slice(0, 10)

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">لوحة التحكم</h1>
        <p className="text-sm text-gray-500 mt-1">نظرة عامة على نشاط الجمعية</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="رصيد البنك الإجمالي"
          value={formatCurrency(totalBankBalance)}
          icon={<Banknote className="w-6 h-6" />}
          color="bg-blue-500"
        />
        <StatCard
          title="رصيد الصندوق النقدي"
          value={formatCurrency(totalCash)}
          icon={<Wallet className="w-6 h-6" />}
          color="bg-emerald-500"
        />
        <StatCard
          title="إجمالي المستفيدين"
          value={beneficiaries.length}
          icon={<Users className="w-6 h-6" />}
          color="bg-purple-500"
        />
        <StatCard
          title="إجمالي المتبرعين"
          value={donors.length}
          icon={<HeartHandshake className="w-6 h-6" />}
          color="bg-pink-500"
        />
        <StatCard
          title="إجمالي المواد"
          value={articles.length}
          icon={<Package className="w-6 h-6" />}
          color="bg-amber-500"
        />
        <StatCard
          title="الإعارات النشطة"
          value={activeLoans.length}
          icon={<Package className="w-6 h-6" />}
          color="bg-orange-500"
        />
      </div>

      {/* Caisse Balances */}
      <Card titleAr="أرصدة الصناديق">
        {caisses.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">لا توجد صناديق مسجلة</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {caisses.map((caisse) => (
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

      {/* Recent Transactions */}
      <Card titleAr="آخر المعاملات">
        {recentTransactions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">لا توجد معاملات مسجلة</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">النوع</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">المبلغ</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600 hidden sm:table-cell">الوصف</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">التاريخ</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600 hidden sm:table-cell">المصدر</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      {tx.type === 'credit' ? (
                        <ArrowUpCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <ArrowDownCircle className="w-5 h-5 text-red-500" />
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-semibold ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700 hidden sm:table-cell">{tx.descriptionAr}</td>
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
    </div>
  )
}
