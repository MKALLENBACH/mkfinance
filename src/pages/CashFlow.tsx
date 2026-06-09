import { useState, useMemo } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { useAccounts } from '@/hooks/useAccounts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrencyBRL, formatDateBR } from '@/lib/formatters'
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
  Line,
  AreaChart,
  Area
} from 'recharts'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarDays,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Wallet,
  Filter,
  BarChart3
} from 'lucide-react'

type PeriodPreset = 'hoje' | '7d' | '15d' | '30d' | '60d' | '90d' | 'custom'
type ViewTab = 'resumo' | 'a_vencer' | 'a_receber' | 'atrasados'

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0]
}

function diffDays(a: string, b: string): number {
  const dateA = new Date(a + 'T00:00:00')
  const dateB = new Date(b + 'T00:00:00')
  return Math.ceil((dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24))
}

export function CashFlow() {
  const today = new Date()
  const todayStr = toDateStr(today)

  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('hoje')
  const [customStart, setCustomStart] = useState(todayStr)
  const [customEnd, setCustomEnd] = useState(toDateStr(addDays(today, 30)))
  const [activeTab, setActiveTab] = useState<ViewTab>('resumo')

  const { data: allTransactions, isLoading: isLoadingTx } = useTransactions()
  const { data: accounts, isLoading: isLoadingAcc } = useAccounts()

  // Calculate period based on preset
  const { startDate, endDate } = useMemo(() => {
    if (periodPreset === 'hoje') {
      return { startDate: todayStr, endDate: todayStr }
    }
    if (periodPreset === 'custom') {
      return { startDate: customStart, endDate: customEnd }
    }
    const days = parseInt(periodPreset.replace('d', ''))
    return {
      startDate: todayStr,
      endDate: toDateStr(addDays(today, days)),
    }
  }, [periodPreset, customStart, customEnd, todayStr])

  const saldoAtual = useMemo(() => {
    return accounts?.filter(a => a.is_active).reduce((sum, acc) => sum + acc.current_balance, 0) || 0
  }, [accounts])

  // Filter transactions for the selected period
  const filteredTransactions = useMemo(() => {
    if (!allTransactions) return []
    return allTransactions.filter(t => t.due_date >= startDate && t.due_date <= endDate)
  }, [allTransactions, startDate, endDate])

  // Categorized lists
  const despesasAVencer = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === 'despesa' && (t.status === 'em_aberto' || t.status === 'prevista'))
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
  }, [filteredTransactions])

  const receitasAReceber = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === 'receita' && (t.status === 'prevista' || t.status === 'em_aberto'))
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
  }, [filteredTransactions])

  const atrasados = useMemo(() => {
    if (!allTransactions) return []
    return allTransactions
      .filter(t => (t.status === 'em_aberto' || t.status === 'prevista' || t.status === 'atrasada') && t.due_date < todayStr)
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
  }, [allTransactions, todayStr])

  // Summary cards
  const totals = useMemo(() => {
    const totalAVencer = despesasAVencer.reduce((acc, t) => acc + t.amount, 0)
    const totalAReceber = receitasAReceber.reduce((acc, t) => acc + t.amount, 0)
    const totalAtrasado = atrasados.reduce((acc, t) => acc + t.amount, 0)
    const saldoProjetado = saldoAtual + totalAReceber - totalAVencer

    return { totalAVencer, totalAReceber, totalAtrasado, saldoProjetado }
  }, [despesasAVencer, receitasAReceber, atrasados, saldoAtual])

  // Daily cash flow for chart
  const dailyChartData = useMemo(() => {
    if (!filteredTransactions.length) return []

    const dayMap: Record<string, { receitas: number; despesas: number }> = {}
    
    // Generate all days in the range
    let cursor = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T00:00:00')
    while (cursor <= end) {
      const key = toDateStr(cursor)
      dayMap[key] = { receitas: 0, despesas: 0 }
      cursor = addDays(cursor, 1)
    }

    // Fill in transactions
    filteredTransactions.forEach(t => {
      if (!dayMap[t.due_date]) dayMap[t.due_date] = { receitas: 0, despesas: 0 }
      if (t.type === 'receita') {
        dayMap[t.due_date].receitas += t.amount
      } else {
        dayMap[t.due_date].despesas += t.amount
      }
    })

    // Build array with running balance
    let runningBalance = saldoAtual
    const sortedDays = Object.keys(dayMap).sort()
    
    return sortedDays.map(day => {
      const d = dayMap[day]
      runningBalance += d.receitas - d.despesas
      const dateObj = new Date(day + 'T12:00:00')
      const label = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}`
      return {
        dia: label,
        fullDate: day,
        receitas: d.receitas,
        despesas: d.despesas,
        saldo: runningBalance,
      }
    })
  }, [filteredTransactions, startDate, endDate, saldoAtual])

  if (isLoadingTx || isLoadingAcc) {
    return <div className="p-6">Carregando fluxo de caixa...</div>
  }

  const presetButtons: { key: PeriodPreset; label: string }[] = [
    { key: 'hoje', label: 'Hoje' },
    { key: '7d', label: '7 dias' },
    { key: '15d', label: '15 dias' },
    { key: '30d', label: '30 dias' },
    { key: '60d', label: '60 dias' },
    { key: '90d', label: '90 dias' },
    { key: 'custom', label: 'Personalizado' },
  ]

  const tabs: { key: ViewTab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'resumo', label: 'Resumo', icon: <BarChart3 className="h-4 w-4" />, count: 0 },
    { key: 'a_vencer', label: 'A Vencer', icon: <ArrowUpFromLine className="h-4 w-4" />, count: despesasAVencer.length },
    { key: 'a_receber', label: 'A Receber', icon: <ArrowDownToLine className="h-4 w-4" />, count: receitasAReceber.length },
    { key: 'atrasados', label: 'Atrasados', icon: <AlertTriangle className="h-4 w-4" />, count: atrasados.length },
  ]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border p-3 rounded-md shadow-md text-sm">
          <p className="font-bold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 py-0.5">
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

  const renderDaysUntilBadge = (dueDate: string) => {
    const days = diffDays(dueDate, todayStr)
    if (days < 0) {
      return <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-destructive/15 text-destructive">{Math.abs(days)}d atrasado</span>
    }
    if (days === 0) {
      return <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-finance-overdue/15 text-finance-overdue">Hoje</span>
    }
    if (days <= 3) {
      return <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-finance-overdue/15 text-finance-overdue">em {days}d</span>
    }
    if (days <= 7) {
      return <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/15 text-yellow-500">em {days}d</span>
    }
    return <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">em {days}d</span>
  }

  const renderTransactionTable = (transactions: typeof allTransactions, emptyMessage: string) => {
    if (!transactions || transactions.length === 0) {
      return (
        <Card className="p-12 text-center text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>{emptyMessage}</p>
        </Card>
      )
    }

    return (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Prazo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.description}</TableCell>
                <TableCell>
                  {t.category ? (
                    <div className="flex items-center gap-1.5">
                      {t.category.color && (
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.category.color }} />
                      )}
                      <span className="text-sm">{t.category.name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.account?.name || '—'}</TableCell>
                <TableCell className="text-sm">{formatDateBR(t.due_date)}</TableCell>
                <TableCell>{renderDaysUntilBadge(t.due_date)}</TableCell>
                <TableCell>
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                    t.status === 'paga' || t.status === 'recebida' ? 'bg-finance-income/10 text-finance-income' :
                    t.status === 'atrasada' ? 'bg-destructive/10 text-destructive' :
                    t.status === 'cancelada' ? 'bg-muted text-muted-foreground line-through' :
                    'bg-finance-overdue/10 text-finance-overdue'
                  }`}>
                    {t.status}
                  </span>
                </TableCell>
                <TableCell className={`text-right font-semibold ${t.type === 'receita' ? 'text-finance-income' : 'text-finance-expense'}`}>
                  {t.type === 'receita' ? '+' : '-'} {formatCurrencyBRL(t.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="border-t px-4 py-3 flex justify-between items-center text-sm">
          <span className="text-muted-foreground">{transactions.length} lançamento(s)</span>
          <span className="font-bold">
            Total: {formatCurrencyBRL(transactions.reduce((acc: number, t: any) => acc + t.amount, 0))}
          </span>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Fluxo de Caixa</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Projeção financeira e lançamentos futuros
          </p>
        </div>
      </div>

      {/* Period Filter Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground mr-2">Período:</span>
              {presetButtons.map(p => (
                <Button
                  key={p.key}
                  variant={periodPreset === p.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPeriodPreset(p.key)}
                  className="text-xs"
                >
                  {p.label}
                </Button>
              ))}
            </div>

            {periodPreset === 'custom' && (
              <div className="flex items-center gap-3 pl-6">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    className="w-auto"
                    value={customStart}
                    onChange={e => setCustomStart(e.target.value)}
                  />
                </div>
                <span className="text-muted-foreground">até</span>
                <Input
                  type="date"
                  className="w-auto"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                />
              </div>
            )}

            <p className="text-xs text-muted-foreground pl-6">
              Exibindo de <strong>{formatDateBR(startDate)}</strong> até <strong>{formatDateBR(endDate)}</strong>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${saldoAtual >= 0 ? 'text-finance-income' : 'text-finance-expense'}`}>
              {formatCurrencyBRL(saldoAtual)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Soma de todas as contas ativas</p>
          </CardContent>
        </Card>

        <Card className="border-finance-expense/20 bg-finance-expense/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-finance-expense">A Vencer</CardTitle>
            <ArrowUpFromLine className="h-4 w-4 text-finance-expense" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-finance-expense">
              {formatCurrencyBRL(totals.totalAVencer)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{despesasAVencer.length} despesa(s) no período</p>
          </CardContent>
        </Card>

        <Card className="border-finance-income/20 bg-finance-income/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-finance-income">A Receber</CardTitle>
            <ArrowDownToLine className="h-4 w-4 text-finance-income" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-finance-income">
              {formatCurrencyBRL(totals.totalAReceber)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{receitasAReceber.length} receita(s) no período</p>
          </CardContent>
        </Card>

        <Card className={atrasados.length > 0 ? "border-destructive/30 bg-destructive/5" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${atrasados.length > 0 ? 'text-destructive' : ''}`}>Atrasados</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${atrasados.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${atrasados.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {formatCurrencyBRL(totals.totalAtrasado)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{atrasados.length} lançamento(s)</p>
          </CardContent>
        </Card>

        <Card className="border-finance-balance/20 bg-finance-balance/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-finance-balance">Saldo Projetado</CardTitle>
            {totals.saldoProjetado >= saldoAtual ? (
              <TrendingUp className="h-4 w-4 text-finance-income" />
            ) : (
              <TrendingDown className="h-4 w-4 text-finance-expense" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totals.saldoProjetado >= 0 ? 'text-finance-balance' : 'text-finance-expense'}`}>
              {formatCurrencyBRL(totals.saldoProjetado)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ao final do período</p>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key 
                  ? 'bg-primary/10 text-primary' 
                  : tab.key === 'atrasados' && tab.count > 0 
                    ? 'bg-destructive/10 text-destructive' 
                    : 'bg-muted text-muted-foreground'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'resumo' && (
        <div className="grid gap-6">
          {/* Projected Balance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Projeção de Saldo no Período</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyChartData.length > 0 ? (
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyChartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="saldoGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground)/0.2)" vertical={false} />
                      <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(v) => `R$ ${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="saldo" 
                        name="Saldo Projetado" 
                        stroke="#3b82f6" 
                        strokeWidth={2.5}
                        fill="url(#saldoGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Sem dados para o período selecionado.</p>
              )}
            </CardContent>
          </Card>

          {/* Daily Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Entradas vs Saídas por Dia</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyChartData.length > 0 ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyChartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground)/0.2)" vertical={false} />
                      <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(v) => `R$ ${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ paddingTop: '10px' }} />
                      <Bar dataKey="receitas" name="Entradas" fill="#22c55e" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="despesas" name="Saídas" fill="#ef4444" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Sem dados para o período selecionado.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'a_vencer' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ArrowUpFromLine className="h-5 w-5 text-finance-expense" />
            <h3 className="text-lg font-semibold">Despesas a Vencer</h3>
            <span className="text-sm text-muted-foreground">({formatDateBR(startDate)} — {formatDateBR(endDate)})</span>
          </div>
          {renderTransactionTable(despesasAVencer as any, 'Nenhuma despesa a vencer neste período. Ótimo!')}
        </div>
      )}

      {activeTab === 'a_receber' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="h-5 w-5 text-finance-income" />
            <h3 className="text-lg font-semibold">Receitas a Receber</h3>
            <span className="text-sm text-muted-foreground">({formatDateBR(startDate)} — {formatDateBR(endDate)})</span>
          </div>
          {renderTransactionTable(receitasAReceber as any, 'Nenhuma receita prevista para este período.')}
        </div>
      )}

      {activeTab === 'atrasados' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h3 className="text-lg font-semibold">Lançamentos Atrasados</h3>
            <span className="text-sm text-muted-foreground">(todos os períodos)</span>
          </div>
          {renderTransactionTable(atrasados as any, 'Nenhum lançamento atrasado. Parabéns!')}
        </div>
      )}
    </div>
  )
}
