import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'
import { queryKeys, invalidateFinanceData } from '@/lib/queryInvalidation'
import { Database } from '@/integrations/supabase/types'

type Debt = Database['public']['Tables']['debts']['Row']
type InsertDebt = Database['public']['Tables']['debts']['Insert']
type UpdateDebt = Database['public']['Tables']['debts']['Update']

async function generateInstallmentTransactions(debtData: any, userId: string) {
  if (debtData && debtData.current_amount > 0) {
    const today = new Date()
    const dueDay = debtData.due_day

    // Se não tiver dia de vencimento/frequência, consideramos parcela única
    if (dueDay === null) {
      let dueDateStr = today.toISOString().split('T')[0]
      if (debtData.target_payoff_date) {
          dueDateStr = debtData.target_payoff_date
      }

      await supabase.from('transactions').insert([{
        user_id: userId,
        type: 'despesa' as const,
        description: `Parcela Única: ${debtData.name}`,
        amount: debtData.current_amount,
        due_date: dueDateStr,
        status: 'em_aberto' as const,
        is_fixed: true,
        person_id: debtData.creditor_id || null,
        notes: `Gerado automaticamente pela dívida: ${debtData.name}`,
        installment_group_id: debtData.id,
        installment_number: 1,
        installment_total: 1
      }])
      return;
    }

    // Lógica para parcelado
    if (!debtData.monthly_payment || debtData.monthly_payment <= 0) return;

    let currentAmount = debtData.current_amount
    let installmentAmount = debtData.monthly_payment
    let numInstallments = Math.ceil(currentAmount / installmentAmount)
    if (numInstallments > 500) numInstallments = 500

    const transactionsToInsert = []
    
    const isWeekly = dueDay >= 100;
    const targetWeekday = isWeekly ? dueDay - 100 : 0;
    
    let currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let currentMonthOffset = 0;
    
    if (debtData.start_date) {
        // Se a data de início foi fornecida, a primeira parcela será exatamente nessa data
        // e os cálculos subsequentes serão baseados nela.
        currentDate = new Date(debtData.start_date + 'T12:00:00');
    } else {
        // Fallback para a lógica original caso não tenha sido preenchido
        if (isWeekly) {
            let currentDay = currentDate.getDay();
            let daysUntilTarget = targetWeekday - currentDay;
            if (daysUntilTarget < 0) {
                daysUntilTarget += 7;
            }
            currentDate.setDate(currentDate.getDate() + daysUntilTarget);
        } else {
            const thisMonthDate = new Date(today.getFullYear(), today.getMonth(), dueDay)
            if (thisMonthDate < today) {
               currentMonthOffset = 1
            }
            currentDate = new Date(today.getFullYear(), today.getMonth() + currentMonthOffset, dueDay)
        }
    }

    for (let i = 1; i <= numInstallments; i++) {
      let amount = installmentAmount
      if (i === numInstallments) {
          const remainder = currentAmount - (installmentAmount * (numInstallments - 1))
          if (remainder > 0 && remainder <= installmentAmount) {
              amount = remainder
          }
      }

      let dateToInsert = new Date(currentDate);

      const dueDateStr = dateToInsert.getFullYear() + '-' + String(dateToInsert.getMonth() + 1).padStart(2, '0') + '-' + String(dateToInsert.getDate()).padStart(2, '0')

      transactionsToInsert.push({
        user_id: userId,
        type: 'despesa' as const,
        description: `Parcela ${i}/${numInstallments}: ${debtData.name}`,
        amount: amount,
        due_date: dueDateStr,
        status: 'em_aberto' as const,
        is_fixed: true,
        person_id: debtData.creditor_id || null,
        notes: `Gerado automaticamente pela dívida: ${debtData.name}`,
        installment_group_id: debtData.id,
        installment_number: i,
        installment_total: numInstallments
      })
      
      // Advance to next installment
      if (isWeekly) {
          currentDate.setDate(currentDate.getDate() + 7);
      } else {
          currentDate.setMonth(currentDate.getMonth() + 1);
          // Only adjust for due_day if start_date wasn't explicitly used as the anchor day,
          // OR we can just respect the day of the explicit start date!
          // We will respect the day of the currentDate.
      }
    }
    if (transactionsToInsert.length > 0) {
      await supabase.from('transactions').insert(transactionsToInsert)
    }
  }
}

export function useDebts() {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.debts,
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('debts')
        .select(`
          *,
          creditor:people(name)
        `)
        .order('priority', { ascending: false })
        .order('current_amount', { ascending: false })

      if (error) throw error
      return data as (Debt & { creditor: { name: string } | null })[]
    },
    enabled: !!user,
  })
}

export function useCreateDebt() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (debt: Omit<InsertDebt, 'user_id'>) => {
      if (!user) throw new Error('Not authenticated')

      // 1. Create the debt
      const { data, error } = await supabase
        .from('debts')
        .insert([{ ...debt, user_id: user.id }])
        .select()
        .single()

      if (error) throw error

      // 2. Auto-create all upcoming expense transactions
      await generateInstallmentTransactions(data, user.id)

      return data
    },
    onSuccess: () => {
      toast.success('Dívida registrada! Lançamento de despesa criado automaticamente.')
      invalidateFinanceData(queryClient)
    },
    onError: (error) => {
      toast.error(`Erro ao registrar dívida: ${error.message}`)
    },
  })
}

export function useUpdateDebt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateDebt & { id: string }) => {
      const { data, error } = await supabase
        .from('debts')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // After updating, delete existing pending transactions for this debt
      await supabase
        .from('transactions')
        .delete()
        .eq('installment_group_id', id)
        .eq('status', 'em_aberto')

      // And regenerate them based on the new settings
      if (data) {
        await generateInstallmentTransactions(data, data.user_id)
      }

      return data
    },
    onSuccess: () => {
      toast.success('Dívida atualizada com sucesso!')
      invalidateFinanceData(queryClient)
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar dívida: ${error.message}`)
    },
  })
}

export function useDeleteDebt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // Delete pending transactions related to this debt
      await supabase
        .from('transactions')
        .delete()
        .eq('installment_group_id', id)
        .eq('status', 'em_aberto')

      const { error } = await supabase
        .from('debts')
        .delete()
        .eq('id', id)

      if (error) throw error
      return id
    },
    onSuccess: () => {
      toast.success('Dívida excluída com sucesso!')
      invalidateFinanceData(queryClient)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

export function useRegisterDebtPayment() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ 
      debtId, 
      transactionId,
      accountId, 
      amount, 
      description,
      paidAt,
      currentDebtAmount
    }: { 
      debtId: string,
      transactionId?: string,
      accountId: string, 
      amount: number,
      description: string,
      paidAt?: string,
      currentDebtAmount: number
    }) => {
      if (!user) throw new Error('Not authenticated')

      const paymentDate = paidAt || new Date().toISOString().split('T')[0]

      // 1. Encontra a transação (se for passada) ou a parcela pendente mais antiga
      let pendingTx = null
      if (transactionId) {
        const { data } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', transactionId)
          .single()
        pendingTx = data
      } else {
        const { data } = await supabase
          .from('transactions')
          .select('*')
          .eq('installment_group_id', debtId)
          .eq('status', 'em_aberto')
          .order('due_date', { ascending: true })
          .limit(1)
          .maybeSingle()
        pendingTx = data
      }

      if (pendingTx) {
        // Atualiza a transação para paga
        const { error: txError } = await supabase
          .from('transactions')
          .update({
            amount,
            paid_at: paymentDate,
            status: 'paga',
            account_id: accountId,
          })
          .eq('id', pendingTx.id)
        if (txError) throw txError
      } else {
        // Cria uma nova se não achar nenhuma
        const { error: txError } = await supabase
          .from('transactions')
          .insert([{
            user_id: user.id,
            type: 'despesa',
            description,
            amount,
            due_date: paymentDate,
            paid_at: paymentDate,
            status: 'paga',
            account_id: accountId,
            installment_group_id: debtId,
          }])
        if (txError) throw txError
      }

      // 2. Busca o valor atual da dívida (segurança contra estados desatualizados no front)
      const { data: currentDebtData } = await supabase
        .from('debts')
        .select('current_amount')
        .eq('id', debtId)
        .single()
        
      const realCurrentDebtAmount = currentDebtData?.current_amount || currentDebtAmount

      // 3. Reduz o valor exato pago do montante da dívida
      const newAmount = Math.max(0, realCurrentDebtAmount - amount)
      
      const { data: debtData, error: debtError } = await supabase
        .from('debts')
        .update({ 
          current_amount: newAmount,
          status: newAmount <= 0 ? 'quitada' : undefined 
        })
        .eq('id', debtId)
        .select()
        .single()

      if (debtError) throw debtError

      // 3. Realocação: apaga as parcelas em aberto restantes e recria com o novo saldo exato
      if (newAmount > 0) {
        await supabase
          .from('transactions')
          .delete()
          .eq('installment_group_id', debtId)
          .eq('status', 'em_aberto')

        await generateInstallmentTransactions(debtData, debtData.user_id)
      }

      return { debt: debtData, isPaidOff: newAmount <= 0 }
    },
    onSuccess: (data) => {
      if (data.isPaidOff) {
        toast.success('Dívida quitada com sucesso! Parabéns!')
      } else {
        toast.success('Pagamento registrado e próximas parcelas realocadas!')
      }
      invalidateFinanceData(queryClient)
    },
    onError: (error) => {
      toast.error(`Erro ao registrar pagamento: ${error.message}`)
    },
  })
}
