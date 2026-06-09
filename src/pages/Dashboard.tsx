import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  calcularSaldoTotal, 
  calcularReceitasMes, 
  calcularDespesasMes, 
  calcularResultadoMes,
  detectarContasAtrasadas,
  gerarAlertasFinanceiros
} from '@/lib/financeMath'
import { formatCurrencyBRL, formatDateBR } from '@/lib/formatters'
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  AlertCircle, 
  Clock, 
  CreditCard,
  AlertTriangle
} from 'lucide-react'

export function Dashboard() {
  const { user } = useAuth()

  // Buscando todos os dados necessários para o dashboard de uma vez
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated')

      const [accountsRes, transactionsRes, debtsRes] = await Promise.all([
        supabase.from('financial_accounts').select('*').eq('is_active', true),
        // Pegamos transações do mês atual e as atrasadas
        supabase.from('transactions').select('*'),
        supabase.from('debts').select('*').in('status', ['ativa', 'atrasada'])
      ])

      if (accountsRes.error) throw accountsRes.error
      if (transactionsRes.error) throw transactionsRes.error
      if (debtsRes.error) throw debtsRes.error

      return {
        accounts: accountsRes.data,
        transactions: transactionsRes.data,
        debts: debtsRes.data
      }
    },
    enabled: !!user,
  })

  if (isLoading) {
    return <div className="p-6">Carregando dashboard...</div>
  }

  const { accounts = [], transactions = [], debts = [] } = dashboardData || {}

  // Lógica de cálculo
  const saldoTotal = calcularSaldoTotal(accounts)
  
  // Para simplificar, pegamos transações do mês atual (poderia ter um filtro de data melhor)
  const currentMonthStr = new Date().toISOString().slice(0, 7) // YYYY-MM
  const txMes = transactions.filter(t => t.due_date.startsWith(currentMonthStr))
  
  const receitasMes = calcularReceitasMes(txMes)
  const despesasMes = calcularDespesasMes(txMes)
  const resultadoMes = calcularResultadoMes(txMes)
  
  const contasAtrasadas = detectarContasAtrasadas(transactions)
  
  const contasEmAberto = txMes.filter(t => t.type === 'despesa' && t.status === 'em_aberto')
  
  const dividasAtivasTotal = debts.reduce((acc, d) => acc + d.current_amount, 0)

  // Próximos 7 dias
  const today = new Date()
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)
  const todayStr = today.toISOString().split('T')[0]
  const nextWeekStr = nextWeek.toISOString().split('T')[0]
  
  const proximosVencimentos = transactions
    .filter(t => t.type === 'despesa' && t.status === 'em_aberto' && t.due_date >= todayStr && t.due_date <= nextWeekStr)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))

  const alertas = gerarAlertasFinanceiros({
    transactions,
    debts,
    rendaMensal: receitasMes, // Aproximação
    despesasMensais: despesasMes, // Aproximação
    dividasMensais: debts.reduce((acc, d) => acc + (d.monthly_payment || 0), 0)
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground text-sm mt-1">Visão geral do seu controle financeiro</p>
      </div>

      {alertas.length > 0 && (
        <div className="flex flex-col gap-2">
          {alertas.map((alerta, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg bg-finance-overdue/10 p-4 text-sm font-medium text-finance-overdue border border-finance-overdue/20">
              <AlertTriangle className="h-5 w-5" />
              {alerta}
            </div>
          ))}
        </div>
      )}

      {/* Linha 1: Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${saldoTotal >= 0 ? 'text-finance-balance' : 'text-finance-expense'}`}>
              {formatCurrencyBRL(saldoTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Soma de todas as contas ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas do Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-finance-income" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-finance-income">{formatCurrencyBRL(receitasMes)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de receitas do mês atual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas do Mês</CardTitle>
            <TrendingDown className="h-4 w-4 text-finance-expense" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-finance-expense">{formatCurrencyBRL(despesasMes)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de despesas do mês atual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resultado do Mês</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${resultadoMes >= 0 ? 'text-finance-income' : 'text-finance-expense'}`}>
              {formatCurrencyBRL(resultadoMes)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Receitas recebidas - Despesas pagas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Linha 2: Alertas e Dívidas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-finance-overdue/30 bg-finance-overdue/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-finance-overdue">Contas Atrasadas</CardTitle>
            <AlertCircle className="h-4 w-4 text-finance-overdue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-finance-overdue">{contasAtrasadas.length}</div>
            <p className="text-xs text-finance-overdue/80 mt-1">
              {formatCurrencyBRL(contasAtrasadas.reduce((a, b) => a + b.amount, 0))}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Pagar no Mês</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contasEmAberto.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrencyBRL(contasEmAberto.reduce((a, b) => a + b.amount, 0))}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dívidas Ativas</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{debts.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrencyBRL(dividasAtivasTotal)} restante
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Linha 3: Listas e Resumos */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Próximos Vencimentos (7 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            {proximosVencimentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma conta para vencer nos próximos 7 dias.</p>
            ) : (
              <div className="space-y-4">
                {proximosVencimentos.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDateBR(tx.due_date)}</p>
                    </div>
                    <div className="font-medium text-finance-expense">
                      {formatCurrencyBRL(tx.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contas em Atraso</CardTitle>
          </CardHeader>
          <CardContent>
            {contasAtrasadas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Parabéns! Nenhuma conta em atraso.</p>
            ) : (
              <div className="space-y-4">
                {contasAtrasadas.slice(0, 5).map(tx => (
                  <div key={tx.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-finance-overdue">{tx.description}</p>
                      <p className="text-xs text-finance-overdue/80">{formatDateBR(tx.due_date)}</p>
                    </div>
                    <div className="font-medium text-finance-overdue">
                      {formatCurrencyBRL(tx.amount)}
                    </div>
                  </div>
                ))}
                {contasAtrasadas.length > 5 && (
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    E mais {contasAtrasadas.length - 5} contas...
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
