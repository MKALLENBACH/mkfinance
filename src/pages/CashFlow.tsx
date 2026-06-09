import { useState, useMemo } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { useAccounts } from '@/hooks/useAccounts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrencyBRL } from '@/lib/formatters'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts'

const meses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export function CashFlow() {
  const dataAtual = new Date()
  const [selectedYear, setSelectedYear] = useState(dataAtual.getFullYear())

  const { data: allTransactions, isLoading: isLoadingTx } = useTransactions()
  const { data: accounts, isLoading: isLoadingAcc } = useAccounts()

  const saldoAtual = useMemo(() => {
    return accounts?.filter(a => a.is_active).reduce((sum, acc) => sum + acc.current_balance, 0) || 0
  }, [accounts])

  // Process data for the selected year
  const monthlyData = useMemo(() => {
    if (!allTransactions) return []

    // We need to calculate a running balance based on current balance and future/past transactions
    // For simplicity in this demo, we'll calculate the net cash flow per month
    // A true running balance requires calculating from the "current" point forwards and backwards

    const data = meses.map((nomeMes, index) => {
      const mesNum = String(index + 1).padStart(2, '0')
      const prefix = `${selectedYear}-${mesNum}`
      
      const txs = allTransactions.filter(t => t.due_date.startsWith(prefix))
      
      const receitasPagas = txs.filter(t => t.type === 'receita' && t.status === 'recebida').reduce((acc, t) => acc + t.amount, 0)
      const despesasPagas = txs.filter(t => t.type === 'despesa' && t.status === 'paga').reduce((acc, t) => acc + t.amount, 0)
      
      const receitasPrevistas = txs.filter(t => t.type === 'receita' && t.status === 'prevista').reduce((acc, t) => acc + t.amount, 0)
      const despesasAbertas = txs.filter(t => t.type === 'despesa' && (t.status === 'em_aberto' || t.status === 'atrasada')).reduce((acc, t) => acc + t.amount, 0)

      const realCashFlow = receitasPagas - despesasPagas
      const projectedCashFlow = receitasPrevistas - despesasAbertas

      return {
        mes: nomeMes,
        mesAbrev: nomeMes.substring(0, 3),
        index,
        receitasPagas,
        despesasPagas,
        receitasPrevistas,
        despesasAbertas,
        receitaTotal: receitasPagas + receitasPrevistas,
        despesaTotal: despesasPagas + despesasAbertas,
        realCashFlow,
        projectedCashFlow,
        saldoProjetadoFinal: 0 // Will be calculated next
      }
    })

    // Calculate running projected balance
    // Assume current balance is the start of the current month (very simplified)
    let runningBalance = saldoAtual
    const currentMonthIndex = dataAtual.getMonth()
    
    for (let i = currentMonthIndex; i < 12; i++) {
      runningBalance += data[i].projectedCashFlow
      data[i].saldoProjetadoFinal = runningBalance
    }

    // Work backwards for past months
    runningBalance = saldoAtual
    for (let i = currentMonthIndex - 1; i >= 0; i--) {
      runningBalance -= data[i].realCashFlow
      data[i].saldoProjetadoFinal = runningBalance
    }

    return data
  }, [allTransactions, selectedYear, saldoAtual, dataAtual])

  if (isLoadingTx || isLoadingAcc) {
    return <div className="p-6">Carregando fluxo de caixa...</div>
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border p-3 rounded-md shadow-md text-sm">
          <p className="font-bold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 py-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-muted-foreground">{entry.name}:</span>
              </div>
              <span className="font-medium" style={{ color: entry.color }}>
                {formatCurrencyBRL(entry.value)}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Fluxo de Caixa</h2>
          <p className="text-muted-foreground text-sm mt-1">Visão anual de entradas, saídas e saldo projetado</p>
        </div>
        
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

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Entradas vs Saídas Anuais ({selectedYear})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground)/0.2)" vertical={false} />
                  <XAxis dataKey="mesAbrev" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `R$ ${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="receitaTotal" name="Entradas (Real + Prev)" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesaTotal" name="Saídas (Real + Prev)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projeção de Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground)/0.2)" vertical={false} />
                  <XAxis dataKey="mesAbrev" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `R$ ${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="saldoProjetadoFinal" 
                    name="Saldo Final Projetado" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalhamento Mensal</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Entradas Recebidas</TableHead>
                <TableHead className="text-right">Entradas Previstas</TableHead>
                <TableHead className="text-right">Saídas Pagas</TableHead>
                <TableHead className="text-right">Saídas Abertas</TableHead>
                <TableHead className="text-right">Resultado Real</TableHead>
                <TableHead className="text-right font-bold">Saldo Projetado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyData.map((data) => (
                <TableRow key={data.index}>
                  <TableCell className="font-medium">{data.mes}</TableCell>
                  <TableCell className="text-right text-finance-income/80">{formatCurrencyBRL(data.receitasPagas)}</TableCell>
                  <TableCell className="text-right text-finance-income/50">{formatCurrencyBRL(data.receitasPrevistas)}</TableCell>
                  <TableCell className="text-right text-finance-expense/80">{formatCurrencyBRL(data.despesasPagas)}</TableCell>
                  <TableCell className="text-right text-finance-expense/50">{formatCurrencyBRL(data.despesasAbertas)}</TableCell>
                  <TableCell className={`text-right font-medium ${data.realCashFlow >= 0 ? 'text-finance-income' : 'text-finance-expense'}`}>
                    {formatCurrencyBRL(data.realCashFlow)}
                  </TableCell>
                  <TableCell className={`text-right font-bold ${data.saldoProjetadoFinal >= 0 ? 'text-finance-balance' : 'text-finance-expense'}`}>
                    {formatCurrencyBRL(data.saldoProjetadoFinal)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  )
}
