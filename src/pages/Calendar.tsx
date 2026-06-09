import { useState, useMemo } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrencyBRL } from '@/lib/formatters'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'

export function Calendar() {
  const dataAtual = new Date()
  const [currentDate, setCurrentDate] = useState(new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1))

  const { data: transactions, isLoading } = useTransactions()

  const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`

  const changeMonth = (delta: number) => {
    setCurrentDate(prev => {
      const nova = new Date(prev)
      nova.setMonth(nova.getMonth() + delta)
      return nova
    })
  }

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)
    
    const daysInMonth = lastDayOfMonth.getDate()
    const startingDayOfWeek = firstDayOfMonth.getDay() // 0 = Sunday
    
    const days = []
    
    // Previous month padding
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      
      // Find transactions for this day
      const dayTxs = transactions?.filter(t => t.due_date === dateStr) || []
      
      const receitas = dayTxs.filter(t => t.type === 'receita')
      const despesas = dayTxs.filter(t => t.type === 'despesa')
      
      days.push({
        day: i,
        dateStr,
        receitas,
        despesas,
        hasActivity: receitas.length > 0 || despesas.length > 0
      })
    }
    
    return days
  }, [currentDate, transactions])

  if (isLoading) {
    return <div className="p-6">Carregando calendário...</div>
  }

  const nomesDias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const nomesMeses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Calendário</h2>
          <p className="text-muted-foreground text-sm mt-1">Sua agenda financeira do mês</p>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => changeMonth(-1)}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 font-medium w-40 justify-center">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            {nomesMeses[currentDate.getMonth()]} {currentDate.getFullYear()}
          </div>
          <button 
            onClick={() => changeMonth(1)}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 sm:p-6">
          <div className="grid grid-cols-7 border-b sm:border-none">
            {nomesDias.map(dia => (
              <div key={dia} className="text-center py-3 text-sm font-medium text-muted-foreground border-r last:border-r-0 sm:border-none">
                {dia}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 border-l border-t sm:border-none sm:gap-2">
            {calendarDays.map((dia, index) => {
              if (dia === null) {
                return (
                  <div key={`empty-${index}`} className="min-h-[100px] border-r border-b sm:border sm:rounded-md bg-muted/20" />
                )
              }

              const isToday = dia.dateStr === dataAtual.toISOString().split('T')[0]

              return (
                <div 
                  key={dia.dateStr} 
                  className={`min-h-[100px] p-2 border-r border-b sm:border sm:rounded-md flex flex-col ${
                    isToday ? 'bg-primary/5 border-primary/30' : 'bg-card'
                  }`}
                >
                  <div className={`text-right text-sm font-medium mb-2 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                    <span className={isToday ? 'bg-primary text-primary-foreground w-6 h-6 inline-flex items-center justify-center rounded-full' : ''}>
                      {dia.day}
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[80px] sm:max-h-none scrollbar-thin">
                    {dia.receitas.map(tx => (
                      <div 
                        key={tx.id} 
                        className={`text-[10px] leading-tight px-1.5 py-1 rounded border-l-2 ${
                          tx.status === 'recebida' 
                            ? 'bg-finance-income/10 border-finance-income/50 text-finance-income/90' 
                            : 'bg-muted border-muted-foreground/30 text-muted-foreground'
                        }`}
                        title={`${tx.description} - ${formatCurrencyBRL(tx.amount)}`}
                      >
                        <div className="truncate font-medium">{tx.description}</div>
                        <div>{formatCurrencyBRL(tx.amount)}</div>
                      </div>
                    ))}
                    
                    {dia.despesas.map(tx => (
                      <div 
                        key={tx.id} 
                        className={`text-[10px] leading-tight px-1.5 py-1 rounded border-l-2 ${
                          tx.status === 'paga' 
                            ? 'bg-muted border-muted-foreground/30 text-muted-foreground line-through' 
                            : tx.status === 'atrasada'
                            ? 'bg-finance-overdue/10 border-finance-overdue/50 text-finance-overdue/90 font-medium'
                            : 'bg-finance-expense/10 border-finance-expense/50 text-finance-expense/90'
                        }`}
                        title={`${tx.description} - ${formatCurrencyBRL(tx.amount)}`}
                      >
                        <div className="truncate font-medium">{tx.description}</div>
                        <div>{formatCurrencyBRL(tx.amount)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
