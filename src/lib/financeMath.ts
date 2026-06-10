import { isBefore, startOfDay, parseISO } from 'date-fns'
import { Database } from '@/integrations/supabase/types'

type Transaction = Database['public']['Tables']['transactions']['Row'] & {
  category?: { ignore_in_totals?: boolean | null } | null
}
type Account = Database['public']['Tables']['financial_accounts']['Row']
type Debt = Database['public']['Tables']['debts']['Row']

export function calcularSaldoTotal(contas: Account[]): number {
  return contas
    .filter(c => c.is_active !== false)
    .reduce((acc, c) => acc + c.current_balance, 0)
}

export function calcularReceitasMes(transactions: Transaction[]): number {
  return transactions
    .filter(t => t.type === 'receita' && t.category?.ignore_in_totals !== true)
    .reduce((acc, t) => acc + t.amount, 0)
}

export function calcularDespesasMes(transactions: Transaction[]): number {
  return transactions
    .filter(t => t.type === 'despesa' && t.category?.ignore_in_totals !== true)
    .reduce((acc, t) => acc + t.amount, 0)
}

export function calcularResultadoMes(transactions: Transaction[]): number {
  const receitas = transactions
    .filter(t => t.type === 'receita' && t.status === 'recebida' && t.category?.ignore_in_totals !== true)
    .reduce((acc, t) => acc + t.amount, 0)
    
  const despesas = transactions
    .filter(t => t.type === 'despesa' && t.status === 'paga' && t.category?.ignore_in_totals !== true)
    .reduce((acc, t) => acc + t.amount, 0)
    
  return receitas - despesas
}

export function calcularComprometimentoMensal(
  renda: number, 
  despesasFixas: number, 
  dividasMensais: number
): number {
  if (renda <= 0) return 0
  return ((despesasFixas + dividasMensais) / renda) * 100
}

export function calcularSobraPrevista(receitasPrevistasTotal: number, despesasPrevistasTotal: number): number {
  return receitasPrevistasTotal - despesasPrevistasTotal
}

export function calcularSobraReal(receitasRecebidas: number, despesasPagas: number): number {
  return receitasRecebidas - despesasPagas
}

export function calcularPercentualQuitado(valorOriginal: number, valorAtual: number): number {
  if (valorOriginal <= 0) return 100
  if (valorAtual <= 0) return 100
  if (valorAtual >= valorOriginal) return 0
  
  return ((valorOriginal - valorAtual) / valorOriginal) * 100
}

export function calcularMesesParaQuitar(valorAtual: number, pagamentoMensal: number | null): number | null {
  if (!pagamentoMensal || pagamentoMensal <= 0) return null
  if (valorAtual <= 0) return 0
  
  return Math.ceil(valorAtual / pagamentoMensal)
}

export function detectarContasAtrasadas(transactions: Transaction[]): Transaction[] {
  const today = startOfDay(new Date())
  
  return transactions.filter(t => {
    if (t.type !== 'despesa') return false
    if (t.status === 'paga' || t.status === 'cancelada') return false
    
    const dueDate = parseISO(t.due_date)
    return isBefore(dueDate, today) || t.status === 'atrasada'
  })
}

export function gerarAlertasFinanceiros(dados: {
  transactions: Transaction[],
  debts: Debt[],
  rendaMensal: number,
  despesasMensais: number,
  dividasMensais: number
}): string[] {
  const alertas: string[] = []
  
  // 1. Contas atrasadas
  const atrasadas = detectarContasAtrasadas(dados.transactions)
  if (atrasadas.length > 0) {
    alertas.push(`Você possui ${atrasadas.length} contas em atraso.`)
  }
  
  // 2. Comprometimento
  const comprometimento = calcularComprometimentoMensal(
    dados.rendaMensal, 
    dados.despesasMensais, 
    dados.dividasMensais
  )
  
  if (comprometimento > 70) {
    alertas.push(`Cuidado! Seu comprometimento de renda está muito alto (${Math.round(comprometimento)}%).`)
  } else if (comprometimento > 50) {
    alertas.push(`Atenção: Mais da metade da sua renda já está comprometida (${Math.round(comprometimento)}%).`)
  }
  
  // 3. Dívidas críticas
  const dividasCriticas = dados.debts.filter(d => 
    d.status !== 'quitada' && 
    (d.status === 'atrasada' || d.priority === 'critica')
  )
  
  if (dividasCriticas.length > 0) {
    alertas.push(`Você tem ${dividasCriticas.length} dívidas críticas precisando de atenção.`)
  }
  
  // 4. Mês negativo (previsto vs realizado)
  const resultadoPrevisto = calcularSobraPrevista(dados.rendaMensal, dados.despesasMensais + dados.dividasMensais)
  if (resultadoPrevisto < 0) {
    alertas.push(`Alerta: O fechamento previsto para este mês é negativo.`)
  }

  return alertas
}
