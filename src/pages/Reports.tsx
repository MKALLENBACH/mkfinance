import { useState, useMemo } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrencyBRL } from '@/lib/formatters'
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts'

export function Reports() {
  const dataAtual = new Date()
  const [selectedMonth, setSelectedMonth] = useState(dataAtual.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(dataAtual.getFullYear())

  const { data: allTransactions, isLoading: isLoadingTx } = useTransactions()
  const { data: categories, isLoading: isLoadingCat } = useCategories()

  const currentMonthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`

  // Process data for charts
  const { despesasPorCategoria, receitasVsDespesas, maioresDespesas } = useMemo(() => {
    if (!allTransactions || !categories) {
      return { despesasPorCategoria: [], receitasVsDespesas: [], maioresDespesas: [] }
    }

    // Filter to selected month
    const txMes = allTransactions.filter(t => t.due_date.startsWith(currentMonthStr))
    
    // 1. Despesas por Categoria (Pie Chart)
    const despesasPagas = txMes.filter(t => t.type === 'despesa' && t.status === 'paga')
    
    const catMap = new Map()
    despesasPagas.forEach(tx => {
      if (tx.category_id) {
        const cat = categories.find(c => c.id === tx.category_id)
        if (cat) {
          const current = catMap.get(cat.id) || { name: cat.name, value: 0, color: cat.color || '#ccc' }
          catMap.set(cat.id, { ...current, value: current.value + tx.amount })
        }
      }
    })
    
    const despesasPorCategoria = Array.from(catMap.values()).sort((a, b) => b.value - a.value)

    // 2. Receitas vs Despesas do Mês
    const totalReceitas = txMes.filter(t => t.type === 'receita' && t.status === 'recebida').reduce((sum, t) => sum + t.amount, 0)
    const totalDespesas = despesasPagas.reduce((sum, t) => sum + t.amount, 0)
    
    const receitasVsDespesas = [
      { name: 'Receitas', value: totalReceitas, fill: '#22c55e' },
      { name: 'Despesas', value: totalDespesas, fill: '#ef4444' }
    ]

    // 3. Top 5 Maiores Despesas
    const maioresDespesas = [...despesasPagas].sort((a, b) => b.amount - a.amount).slice(0, 5)

    return { despesasPorCategoria, receitasVsDespesas, maioresDespesas }
  }, [allTransactions, categories, currentMonthStr])

  if (isLoadingTx || isLoadingCat) {
    return <div className="p-6">Carregando relatórios...</div>
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border p-3 rounded-md shadow-md text-sm">
          <p className="font-bold mb-1">{payload[0].name}</p>
          <p style={{ color: payload[0].payload.color || payload[0].payload.fill }}>
            {formatCurrencyBRL(payload[0].value)}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Relatórios Analíticos</h2>
          <p className="text-muted-foreground text-sm mt-1">Entenda para onde está indo o seu dinheiro</p>
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select 
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {[selectedYear - 1, selectedYear, selectedYear + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Gráfico de Despesas por Categoria */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Despesas por Categoria (Pagas)</CardTitle>
          </CardHeader>
          <CardContent>
            {despesasPorCategoria.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={despesasPorCategoria}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {despesasPorCategoria.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhuma despesa paga neste mês.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico Receitas vs Despesas */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Balanço do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={receitasVsDespesas} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground)/0.2)" vertical={false} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `R$ ${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                  />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{fill: 'hsl(var(--muted-foreground)/0.1)'}} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {receitasVsDespesas.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Tabela Maiores Despesas */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Top 5 Maiores Despesas do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            {maioresDespesas.length > 0 ? (
              <div className="space-y-4">
                {maioresDespesas.map((tx, i) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-finance-expense/10 text-finance-expense font-bold">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-medium">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{tx.category?.name || 'Sem categoria'}</p>
                      </div>
                    </div>
                    <div className="font-bold text-finance-expense">
                      {formatCurrencyBRL(tx.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                Nenhuma despesa paga neste mês.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
