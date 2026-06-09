import { useState, useEffect } from 'react'
import { useMonthlyPlan, useSaveMonthlyPlan } from '@/hooks/useMonthlyPlan'
import { useTransactions } from '@/hooks/useTransactions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrencyBRL } from '@/lib/formatters'
import { Target, TrendingUp, TrendingDown, Save } from 'lucide-react'

const meses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export function Planning() {
  const dataAtual = new Date()
  const [selectedMonth, setSelectedMonth] = useState(dataAtual.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(dataAtual.getFullYear())

  // Fetch plan
  const { data: plan, isLoading: isLoadingPlan } = useMonthlyPlan(selectedYear, selectedMonth)
  const savePlan = useSaveMonthlyPlan()

  // Fetch real data to compare
  const { data: allTransactions } = useTransactions()
  
  const [formData, setFormData] = useState({
    expected_income: 0,
    expected_expenses: 0,
    savings_goal: 0,
    notes: ''
  })

  // Sync form with loaded data
  useEffect(() => {
    if (plan) {
      setFormData({
        expected_income: plan.expected_income,
        expected_expenses: plan.expected_expenses,
        savings_goal: plan.savings_goal,
        notes: plan.notes || ''
      })
    } else {
      setFormData({
        expected_income: 0,
        expected_expenses: 0,
        savings_goal: 0,
        notes: ''
      })
    }
  }, [plan, selectedMonth, selectedYear])

  // Calculate real values for the selected month
  const currentMonthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`
  const txMes = allTransactions?.filter(t => t.due_date.startsWith(currentMonthStr)) || []
  
  const realIncome = txMes.filter(t => t.type === 'receita' && t.status === 'recebida').reduce((acc, t) => acc + t.amount, 0)
  const realExpenses = txMes.filter(t => t.type === 'despesa' && t.status === 'paga').reduce((acc, t) => acc + t.amount, 0)
  const realBalance = realIncome - realExpenses

  const handleSave = () => {
    savePlan.mutate({
      id: plan?.id,
      year: selectedYear,
      month: selectedMonth,
      expected_income: formData.expected_income,
      expected_expenses: formData.expected_expenses,
      savings_goal: formData.savings_goal,
      notes: formData.notes
    })
  }

  // Helper calculations
  const expectedBalance = formData.expected_income - formData.expected_expenses
  const diffIncome = realIncome - formData.expected_income
  const diffExpenses = realExpenses - formData.expected_expenses

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Planejamento Mensal</h2>
          <p className="text-muted-foreground text-sm mt-1">Crie metas e acompanhe o orçado vs realizado</p>
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {meses.map((m, i) => (
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
        {/* Formulário de Planejamento */}
        <Card>
          <CardHeader>
            <CardTitle>Metas para {meses[selectedMonth - 1]} de {selectedYear}</CardTitle>
            <CardDescription>Defina o que você espera que aconteça neste mês.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Receita Esperada</label>
              <div className="relative">
                <TrendingUp className="absolute left-2.5 top-2.5 h-4 w-4 text-finance-income" />
                <Input 
                  type="number" step="0.01" className="pl-9"
                  value={formData.expected_income || ''}
                  onChange={e => setFormData({...formData, expected_income: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Despesa Esperada (Teto de Gastos)</label>
              <div className="relative">
                <TrendingDown className="absolute left-2.5 top-2.5 h-4 w-4 text-finance-expense" />
                <Input 
                  type="number" step="0.01" className="pl-9"
                  value={formData.expected_expenses || ''}
                  onChange={e => setFormData({...formData, expected_expenses: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Meta de Economia (Caixinha/Investimento)</label>
              <div className="relative">
                <Target className="absolute left-2.5 top-2.5 h-4 w-4 text-finance-balance" />
                <Input 
                  type="number" step="0.01" className="pl-9"
                  value={formData.savings_goal || ''}
                  onChange={e => setFormData({...formData, savings_goal: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Anotações do Mês</label>
              <textarea 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Ex: Mês de IPVA, bônus da empresa cai dia 15..."
                value={formData.notes || ''}
                onChange={e => setFormData({...formData, notes: e.target.value})}
              />
            </div>

            <div className="pt-2">
              <Button onClick={handleSave} disabled={savePlan.isPending || isLoadingPlan} className="w-full">
                <Save className="mr-2 h-4 w-4" /> 
                {plan ? 'Atualizar Planejamento' : 'Salvar Planejamento'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Comparativo Realizado vs Planejado */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análise do Mês</CardTitle>
              <CardDescription>Comparação com o que já aconteceu.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Resultado Previsto */}
              <div className="p-4 rounded-lg bg-muted/50 border">
                <p className="text-sm text-muted-foreground mb-1">Sobra Prevista (Receita Esperada - Despesa Esperada)</p>
                <div className="flex items-center justify-between">
                  <p className={`text-2xl font-bold ${expectedBalance >= 0 ? 'text-finance-balance' : 'text-finance-expense'}`}>
                    {formatCurrencyBRL(expectedBalance)}
                  </p>
                  {expectedBalance >= formData.savings_goal && formData.savings_goal > 0 ? (
                    <span className="text-xs text-finance-income font-medium bg-finance-income/10 px-2 py-1 rounded">
                      Cobre a meta de economia!
                    </span>
                  ) : formData.savings_goal > 0 ? (
                    <span className="text-xs text-finance-overdue font-medium bg-finance-overdue/10 px-2 py-1 rounded">
                      Falta R$ {(formData.savings_goal - expectedBalance).toFixed(2)} para cobrir a meta.
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Real vs Previsto */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Receitas (Real vs Previsto)</span>
                    <span className={diffIncome >= 0 ? 'text-finance-income' : 'text-finance-expense'}>
                      {formatCurrencyBRL(realIncome)} / {formatCurrencyBRL(formData.expected_income)}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-finance-income transition-all" 
                      style={{ width: `${Math.min(100, formData.expected_income ? (realIncome / formData.expected_income) * 100 : 0)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Despesas (Real vs Teto)</span>
                    <span className={diffExpenses <= 0 ? 'text-finance-income' : 'text-finance-expense'}>
                      {formatCurrencyBRL(realExpenses)} / {formatCurrencyBRL(formData.expected_expenses)}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                    <div 
                      className={`h-full transition-all ${diffExpenses > 0 ? 'bg-destructive' : 'bg-finance-expense'}`}
                      style={{ width: `${Math.min(100, formData.expected_expenses ? (realExpenses / formData.expected_expenses) * 100 : 0)}%` }}
                    />
                  </div>
                  {diffExpenses > 0 && (
                    <p className="text-xs text-destructive text-right">
                      Você estourou o teto em {formatCurrencyBRL(diffExpenses)}!
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Sobra Real do Mês (Receitas recebidas - Despesas pagas)</p>
              <p className={`text-3xl font-bold ${realBalance >= 0 ? 'text-finance-balance' : 'text-finance-expense'}`}>
                {formatCurrencyBRL(realBalance)}
              </p>
              
              {formData.savings_goal > 0 && (
                <p className="text-sm mt-2 font-medium">
                  Status da Meta de Economia: {' '}
                  {realBalance >= formData.savings_goal ? (
                    <span className="text-finance-income">Atingida! Você já pode guardar o dinheiro.</span>
                  ) : (
                    <span className="text-finance-overdue">Ainda faltam {formatCurrencyBRL(formData.savings_goal - realBalance)}.</span>
                  )}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
